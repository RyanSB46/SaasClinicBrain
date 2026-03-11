import { InteractionType } from '@prisma/client'
import { prisma } from '../../../infra/database/prisma/client'
import { env } from '../../../infra/config/env'
import { handleChatbotMessage } from '../chatbot/message-handler'
import type { ChatbotMetadata } from '../chatbot/chatbot.types'
import { processPatientRequestReview } from '../../use-cases/patient-requests/process-patient-request-review.use-case'
import { notifyPatientRequestsUpdated } from '../patient-requests-events.service'
import { sendEvolutionMessage } from './send-evolution-message.service'
import {
  DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
  PROFESSIONAL_FEATURE_FLAGS_SELECT,
} from '../../../interfaces/http/features/professional-features'

type ParsedTextEvent = {
  phoneNumber: string
  text: string
  messageId: string
}

type ProcessEvolutionWebhookResult = {
  ignored: boolean
  reason?: string
  payload?: ParsedTextEvent
  duplicate?: boolean
  responseSent?: boolean
}

type ResolvedProfessionalContext = {
  id: string
  name: string
  evolutionInstanceName: string | null
  evolutionApiKey: string | null
}

type JsonObject = Record<string, unknown>

/** Evita processar a mesma mensagem duas vezes (Evolution pode enviar eventos duplicados com IDs diferentes). */
const recentProcessedKeys = new Map<string, number>()
const DEDUP_WINDOW_MS = 20000

function dedupKey(professionalId: string, phoneNumber: string, text: string): string {
  const normalized = text.trim().toLowerCase().slice(0, 200)
  return `${professionalId}:${phoneNumber}:${normalized}`
}

function isRecentDuplicate(key: string): boolean {
  const now = Date.now()
  const last = recentProcessedKeys.get(key)
  if (last && now - last < DEDUP_WINDOW_MS) return true
  return false
}

function markProcessed(key: string): void {
  const now = Date.now()
  recentProcessedKeys.set(key, now)
  if (recentProcessedKeys.size > 500) {
    for (const [k, t] of recentProcessedKeys.entries()) {
      if (now - t > DEDUP_WINDOW_MS) recentProcessedKeys.delete(k)
    }
  }
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current: unknown = source

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as JsonObject)[key]
  }

  return current
}

function getFirstString(source: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const value = getNestedValue(source, path)

    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  return null
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function extractPhoneNumber(payload: unknown): string | null {
  const candidate = getFirstString(payload, [
    ['data', 'key', 'remoteJid'],
    ['data', 'key', 'participant'],
    ['data', 'sender'],
    ['sender'],
    ['data', 'from'],
    ['from'],
    ['phone'],
    ['data', 'phone'],
    ['data', 'number'],
    ['number'],
  ])

  if (candidate) {
    const cleaned = onlyDigits(candidate)

    if (cleaned.length >= 10) {
      return cleaned
    }
  }

  return null
}

function extractTextMessage(payload: unknown): string | null {
  const candidate = getFirstString(payload, [
    ['data', 'message', 'conversation'],
    ['data', 'message', 'extendedTextMessage', 'text'],
    ['data', 'message', 'imageMessage', 'caption'],
    ['message', 'conversation'],
    ['message', 'extendedTextMessage', 'text'],
    ['data', 'text'],
    ['text'],
  ])

  if (candidate && candidate.trim().length > 0) {
    return candidate.trim()
  }

  return null
}

function extractMessageId(payload: unknown): string {
  const value =
    getNestedValue(payload, ['data', 'key', 'id']) ??
    getNestedValue(payload, ['data', 'id']) ??
    getNestedValue(payload, ['id']) ??
    `msg_${Date.now().toString()}`

  return String(value)
}

function extractInstanceName(payload: unknown): string | null {
  const candidate = getFirstString(payload, [
    ['instance'],
    ['instanceName'],
    ['data', 'instance'],
    ['data', 'instanceName'],
    ['sender', 'instance'],
    ['data', 'sender', 'instance'],
  ])

  if (!candidate) {
    return null
  }

  return candidate.trim()
}

/** Qualquer evento de mensagem (texto, áudio, imagem, etc.). */
function isAnyMessageEvent(payload: unknown): boolean {
  const event = String(getNestedValue(payload, ['event']) ?? '').toLowerCase()
  return event.includes('message') || event.includes('messages')
}

function isSupportedTextEvent(payload: unknown): boolean {
  const messageType = String(
    getNestedValue(payload, ['data', 'messageType']) ?? getNestedValue(payload, ['type']) ?? '',
  ).toLowerCase()

  return (
    messageType.includes('conversation') ||
    messageType.includes('text') ||
    messageType.includes('extendedtextmessage')
  )
}

function isOutgoingMessage(payload: unknown): boolean {
  const fromMe = getNestedValue(payload, ['data', 'key', 'fromMe']) ?? getNestedValue(payload, ['fromMe'])

  return fromMe === true
}

function parseChatbotMetadata(value: unknown): ChatbotMetadata {
  if (!value || typeof value !== 'object') return {}
  const obj = value as Record<string, unknown>
  const meta: ChatbotMetadata = {}
  if (typeof obj.lastUnsupportedMessageAt === 'string')
    meta.lastUnsupportedMessageAt = obj.lastUnsupportedMessageAt
  return meta
}

function interpolateWelcomeMessage(
  welcomeMessage: string | null,
  professionalName: string,
): string | null {
  if (!welcomeMessage || typeof welcomeMessage !== 'string' || welcomeMessage.trim().length === 0) {
    return null
  }

  let result = welcomeMessage
    .replace(/\{\{nome\}\}/gi, professionalName)
    .replace(/\{\{professionalName\}\}/gi, professionalName)
    .replace(/\{\{name\}\}/gi, professionalName)

  // Fallback: mensagens antigas com "Dra. Ana" ou "Doutora Ana" fixas
  result = result
    .replace(/\bda\s+Dra\.\s*Ana\s+Silva\b/gi, `de ${professionalName}`)
    .replace(/\bda\s+Doutora\s*Ana\s+Silva\b/gi, `de ${professionalName}`)
    .replace(/\bda\s+Dra\.\s*Ana\b/gi, `de ${professionalName}`)
    .replace(/\bda\s+Doutora\s*Ana\b/gi, `de ${professionalName}`)
    .replace(/\bdo\s+Dr\.\s*Ana\b/gi, `de ${professionalName}`)
    .replace(/\bDra\.\s*Ana\s+Silva\b/gi, professionalName)
    .replace(/\bDoutora\s*Ana\s+Silva\b/gi, professionalName)
    .replace(/\bDra\.\s*Ana\b/gi, professionalName)
    .replace(/\bDoutora\s*Ana\b/gi, professionalName)
    .replace(/\bDr\.\s*Ana\b/gi, professionalName)

  // Qualquer placeholder {{...}} restante é substituído pelo nome (ex: {{RyanSenna}})
  result = result.replace(/\{\{[^}]*\}\}/g, professionalName)

  return result.trim()
}

async function resolveProfessionalContext(
  payload: unknown,
  phoneNumber: string,
): Promise<ResolvedProfessionalContext | null> {
  const explicitProfessionalId =
    getNestedValue(payload, ['professionalId']) ?? getNestedValue(payload, ['data', 'professionalId'])

  if (typeof explicitProfessionalId === 'string' && explicitProfessionalId.length > 0) {
    const professional = await prisma.professional.findUnique({
      where: {
        id: explicitProfessionalId,
      },
      select: {
        id: true,
        name: true,
        evolutionInstanceName: true,
        evolutionApiKey: true,
      },
    })

    if (professional) {
      return professional
    }
  }

  const instanceNameFromPayload = extractInstanceName(payload)
  const instanceName = instanceNameFromPayload ?? env.EVOLUTION_INSTANCE

  if (instanceName) {
    const professionalByInstance = await prisma.professional.findFirst({
      where: {
        evolutionInstanceName: instanceName,
      },
      select: {
        id: true,
        name: true,
        evolutionInstanceName: true,
        evolutionApiKey: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (professionalByInstance) {
      return professionalByInstance
    }
  }

  // Busca por paciente: prioriza profissional com instância Evolution (consistência)
  const instanceForPatient = instanceNameFromPayload ?? env.EVOLUTION_INSTANCE
  const patient = await prisma.patient.findFirst({
    where: instanceForPatient
      ? {
          phoneNumber,
          professional: {
            evolutionInstanceName: instanceForPatient,
          },
        }
      : { phoneNumber },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      professionalId: true,
    },
  })

  if (patient) {
    const professional = await prisma.professional.findUnique({
      where: {
        id: patient.professionalId,
      },
      select: {
        id: true,
        name: true,
        evolutionInstanceName: true,
        evolutionApiKey: true,
      },
    })

    if (professional) {
      return professional
    }
  }

  const professionals = await prisma.professional.findMany({
    select: {
      id: true,
      name: true,
      evolutionInstanceName: true,
      evolutionApiKey: true,
    },
    take: 2,
  })

  if (professionals.length === 1) {
    return professionals[0]
  }

  return null
}

export async function processEvolutionWebhook(payload: unknown): Promise<ProcessEvolutionWebhookResult> {
  const body = payload

  if (isOutgoingMessage(body)) {
    return {
      ignored: true,
      reason: 'Mensagem de saída ignorada',
    }
  }

  if (!isAnyMessageEvent(body)) {
    return {
      ignored: true,
      reason: 'Evento não suportado',
    }
  }

  const phoneNumber = extractPhoneNumber(body)
  const text = extractTextMessage(body)

  if (!phoneNumber) {
    return {
      ignored: true,
      reason: 'Evento sem número de telefone',
    }
  }

  const hasTextContent = Boolean(text && text.trim().length > 0)
  const normalizedText = (text ?? '').trim().toUpperCase()

  if (hasTextContent && (normalizedText === 'CONFIRMAR' || normalizedText === 'NEGAR')) {
    const phoneDigits = onlyDigits(phoneNumber)
    const professionalsWithPhone = await prisma.professional.findMany({
      where: { phoneNumber: { not: null } },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        evolutionInstanceName: true,
        evolutionApiKey: true,
      },
    })
    const pro = professionalsWithPhone.find(
      (p) => onlyDigits(p.phoneNumber ?? '') === phoneDigits,
    )

    if (pro && onlyDigits(pro.phoneNumber ?? '') === phoneDigits) {
      const pendingReschedule = await prisma.interaction.findFirst({
        where: {
          professionalId: pro.id,
          messageType: InteractionType.PACIENTE,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, messageText: true },
      })

      const toProcess = pendingReschedule
        ? (() => {
            try {
              const p = JSON.parse(pendingReschedule.messageText) as { type?: string; status?: string }
              return p.type === 'RESCHEDULE_REQUEST' && p.status === 'PENDING_PROFESSIONAL_APPROVAL'
                ? pendingReschedule
                : null
            } catch {
              return null
            }
          })()
        : null

      if (!toProcess) {
        const allInteractions = await prisma.interaction.findMany({
          where: { professionalId: pro.id, messageType: InteractionType.PACIENTE },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, messageText: true },
        })
        const found = allInteractions.find((i) => {
          try {
            const p = JSON.parse(i.messageText) as { type?: string; status?: string }
            return p.type === 'RESCHEDULE_REQUEST' && p.status === 'PENDING_PROFESSIONAL_APPROVAL'
          } catch {
            return false
          }
        })
        if (found) {
          try {
            const result = await processPatientRequestReview({
              professionalId: pro.id,
              interactionId: found.id,
              action: normalizedText === 'CONFIRMAR' ? 'APPROVE' : 'REJECT',
              reviewedVia: 'WHATSAPP',
            })
            notifyPatientRequestsUpdated(pro.id)
            const msg =
              result.status === 'APPROVED'
                ? '✅ Remarcação aprovada via WhatsApp.'
                : '❌ Remarcação recusada via WhatsApp.'
            await sendEvolutionMessage({
              phoneNumber: pro.phoneNumber!,
              text: msg,
              instanceName: pro.evolutionInstanceName ?? undefined,
              apiKey: pro.evolutionApiKey ?? undefined,
            })
            return {
              ignored: false,
              payload: {
                phoneNumber,
                text: text!,
                messageId: extractMessageId(body),
              },
            }
          } catch {
            /* fall through to normal flow */
          }
        }
      } else {
        try {
          const result = await processPatientRequestReview({
            professionalId: pro.id,
            interactionId: toProcess.id,
            action: normalizedText === 'CONFIRMAR' ? 'APPROVE' : 'REJECT',
            reviewedVia: 'WHATSAPP',
          })
          notifyPatientRequestsUpdated(pro.id)
          const msg =
            result.status === 'APPROVED'
              ? '✅ Remarcação aprovada via WhatsApp.'
              : '❌ Remarcação recusada via WhatsApp.'
          await sendEvolutionMessage({
            phoneNumber: pro.phoneNumber!,
            text: msg,
            instanceName: pro.evolutionInstanceName ?? undefined,
            apiKey: pro.evolutionApiKey ?? undefined,
          })
          return {
            ignored: false,
            payload: {
              phoneNumber,
              text: text!,
              messageId: extractMessageId(body),
            },
          }
        } catch {
          /* fall through to normal flow */
        }
      }
    }
  }

  const messageId = extractMessageId(body)
  const professionalContext = await resolveProfessionalContext(body, phoneNumber)

  if (!professionalContext) {
    return {
      ignored: true,
      reason: 'Profissional não identificado para este evento',
      payload: {
        phoneNumber,
        text: text ?? '[mídia]',
        messageId,
      },
    }
  }

  const professionalId = professionalContext.id
  const settings = await prisma.settings.findUnique({
    where: { professionalId },
    select: { webhookEnabled: true },
  })
  const webhookEnabled = settings?.webhookEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.webhookEnabled

  if (!webhookEnabled) {
    return {
      ignored: true,
      reason: 'Webhook desativado para este profissional',
      payload: {
        phoneNumber,
        text: text ?? '[mídia]',
        messageId,
      },
    }
  }

  const existingInteraction = await prisma.interaction.findFirst({
    where: { professionalId, externalMessageId: messageId },
    select: { id: true },
  })
  if (existingInteraction) {
    return {
      ignored: true,
      reason: 'Evento duplicado já processado',
      duplicate: true,
      payload: { phoneNumber, text: text ?? '[mídia]', messageId },
    }
  }

  if (!hasTextContent) {
    const session = await prisma.whatsappSession.findUnique({
      where: {
        professionalId_phoneNumber: { professionalId, phoneNumber },
      },
      select: { chatbotMetadata: true, lastMessageAt: true },
    })
    const metadata = parseChatbotMetadata(session?.chatbotMetadata ?? null)
    if (metadata.lastUnsupportedMessageAt) {
      return {
        ignored: false,
        payload: { phoneNumber, text: '[mídia]', messageId },
        responseSent: false,
      }
    }
    const unsupportedMsg = 'No momento consigo responder apenas mensagens de texto.'
    const patient = await prisma.patient.findFirst({
      where: { professionalId, phoneNumber },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    const newMetadata = {
      ...(session?.chatbotMetadata as object | null ?? {}),
      lastUnsupportedMessageAt: new Date().toISOString(),
    }
    await prisma.$transaction(async (tx) => {
      await tx.interaction.create({
        data: {
          professionalId,
          patientId: patient?.id,
          messageText: '[mídia não suportada]',
          messageType: InteractionType.PACIENTE,
          externalMessageId: messageId,
        },
      })
      await tx.whatsappSession.upsert({
        where: {
          professionalId_phoneNumber: { professionalId, phoneNumber },
        },
        update: {
          lastMessageAt: new Date(),
          chatbotMetadata: newMetadata,
        },
        create: {
          professionalId,
          phoneNumber,
          lastMessageAt: new Date(),
          chatbotMetadata: newMetadata,
        },
      })
      await tx.interaction.create({
        data: {
          professionalId,
          patientId: patient?.id,
          messageText: unsupportedMsg,
          messageType: InteractionType.BOT,
        },
      })
    })
    await sendEvolutionMessage({
      phoneNumber,
      text: unsupportedMsg,
      instanceName: professionalContext.evolutionInstanceName ?? undefined,
      apiKey: professionalContext.evolutionApiKey ?? undefined,
    })
    return {
      ignored: false,
      payload: { phoneNumber, text: '[mídia]', messageId },
      responseSent: true,
    }
  }

  const dedupKeyValue = dedupKey(professionalId, phoneNumber, text!)
  if (isRecentDuplicate(dedupKeyValue)) {
    return {
      ignored: true,
      reason: 'Mensagem duplicada (mesmo conteúdo recente)',
      duplicate: true,
      payload: { phoneNumber, text: text!, messageId },
    }
  }
  markProcessed(dedupKeyValue)

  const professionalSlug = professionalContext.evolutionInstanceName ?? professionalContext.id
  const baseUrl = env.BOOKING_SITE_URL.replace(/\/$/, '')
  const bookingUrl = `${baseUrl}/p/${encodeURIComponent(professionalSlug)}`

  const { responseSent } = await handleChatbotMessage(
    {
      professionalId,
      professionalName: professionalContext.name,
      phoneNumber,
      text: text!,
      messageId,
      bookingUrl,
    },
    {
      prisma,
      sendMessage: async (params) => {
        await sendEvolutionMessage({
          phoneNumber: params.phoneNumber,
          text: params.text,
          instanceName: params.instanceName,
          apiKey: params.apiKey,
        })
      },
      getProfessionalContext: async (profId) => {
        const p = await prisma.professional.findUnique({
          where: { id: profId },
          select: { evolutionInstanceName: true, evolutionApiKey: true },
        })
        return p
      },
    },
  )

  return {
    ignored: false,
    payload: { phoneNumber, text: text!, messageId },
    responseSent,
  }
}
