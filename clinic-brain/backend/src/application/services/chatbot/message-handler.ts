/**
 * Orquestrador do chatbot.
 * Conecta intent-parser, rules-engine e persistência.
 */

import { InteractionType } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { parseIntent } from './intent-parser'
import { runRulesEngine } from './rules-engine'
import { getFirstTwoNames } from './utils'
import type { ChatbotConversationState, ChatbotMetadata } from './chatbot.types'

type MessageHandlerInput = {
  professionalId: string
  professionalName: string
  phoneNumber: string
  text: string
  messageId: string
  bookingUrl: string
}

type MessageHandlerDeps = {
  prisma: PrismaClient
  sendMessage: (params: {
    phoneNumber: string
    text: string
    instanceName?: string
    apiKey?: string
  }) => Promise<void>
  getProfessionalContext: (professionalId: string) => Promise<{
    evolutionInstanceName: string | null
    evolutionApiKey: string | null
  } | null>
}

function parseChatbotState(value: string | null | undefined): ChatbotConversationState {
  const valid: ChatbotConversationState[] = [
    'INITIAL',
    'NEW_PATIENT_INITIAL',
    'NEW_PATIENT_ACTIVE',
    'MAIN_MENU',
    'SERVICES_MENU',
    'ATTENDANT',
    'CLOSED',
  ]
  if (value && valid.includes(value as ChatbotConversationState)) {
    return value as ChatbotConversationState
  }
  return 'INITIAL'
}

function parseMetadata(value: unknown): ChatbotMetadata {
  if (!value || typeof value !== 'object') return {}
  const obj = value as Record<string, unknown>
  const meta: ChatbotMetadata = {}
  if (typeof obj.lastUnsupportedMessageAt === 'string')
    meta.lastUnsupportedMessageAt = obj.lastUnsupportedMessageAt
  if (typeof obj.lastNoContextAt === 'string')
    meta.lastNoContextAt = obj.lastNoContextAt
  if (typeof obj.lastLinksSentAt === 'string')
    meta.lastLinksSentAt = obj.lastLinksSentAt
  if (typeof obj.lastProfessionalHandoffAt === 'string')
    meta.lastProfessionalHandoffAt = obj.lastProfessionalHandoffAt
  return meta
}

function isSameDay(a: Date | null, b: Date): boolean {
  if (!a) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export async function handleChatbotMessage(
  input: MessageHandlerInput,
  deps: MessageHandlerDeps,
): Promise<{ responseSent: boolean }> {
  const { prisma, sendMessage, getProfessionalContext } = deps
  const now = new Date()

  const patient = await prisma.patient.findFirst({
    where: {
      professionalId: input.professionalId,
      phoneNumber: input.phoneNumber,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })

  const session = await prisma.whatsappSession.findUnique({
    where: {
      professionalId_phoneNumber: {
        professionalId: input.professionalId,
        phoneNumber: input.phoneNumber,
      },
    },
    select: {
      currentState: true,
      lastMessageAt: true,
      chatbotMetadata: true,
    },
  })

  let metadata = parseMetadata(session?.chatbotMetadata ?? null)
  const currentState = parseChatbotState(session?.currentState)
  const lastMessageAt = session?.lastMessageAt ?? null
  const isNewDay = !isSameDay(lastMessageAt, now)
  if (isNewDay) {
    metadata = {}
  }

  let hoursSinceProfessionalHandoff: number | undefined
  if (metadata.lastProfessionalHandoffAt) {
    const handoff = new Date(metadata.lastProfessionalHandoffAt)
    hoursSinceProfessionalHandoff = (now.getTime() - handoff.getTime()) / (1000 * 60 * 60)
  }

  const patientType = patient ? 'EXISTING' : 'NEW'
  const patientName = patient ? getFirstTwoNames(patient.name) : undefined

  const intent = parseIntent(input.text)

  const professionalContext = await getProfessionalContext(input.professionalId)
  let professionalInConsult: boolean | undefined
  if (intent === 'FALAR_PROFISSIONAL') {
    const activeAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: input.professionalId,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: { id: true },
    })
    professionalInConsult = !!activeAppointment
  }

  const output = runRulesEngine(
    {
      intent,
      currentState,
      patientType,
      patientName,
      professionalName: input.professionalName,
      bookingUrl: input.bookingUrl,
      isNewDay,
      hoursSinceProfessionalHandoff,
      metadata,
    },
    professionalInConsult,
  )

  const nextMetadata = {
    ...metadata,
    ...output.updateMetadata,
  }

  const nextState = output.nextState
  const shouldPersistPatientMessage = true
  const shouldPersistBotMessage = !output.shouldStaySilent && output.responseMessage.length > 0

  await prisma.$transaction(async (tx) => {
    await tx.interaction.create({
      data: {
        professionalId: input.professionalId,
        patientId: patient?.id,
        messageText: input.text,
        messageType: InteractionType.PACIENTE,
        externalMessageId: input.messageId,
      },
    })

    await tx.whatsappSession.upsert({
      where: {
        professionalId_phoneNumber: {
          professionalId: input.professionalId,
          phoneNumber: input.phoneNumber,
        },
      },
      update: {
        currentState: nextState,
        isActive: !output.shouldEnd,
        lastMessageAt: now,
        chatbotMetadata: nextMetadata as object,
      },
      create: {
        professionalId: input.professionalId,
        phoneNumber: input.phoneNumber,
        currentState: nextState,
        isActive: !output.shouldEnd,
        lastMessageAt: now,
        chatbotMetadata: nextMetadata as object,
      },
    })

    if (shouldPersistBotMessage) {
      await tx.interaction.create({
        data: {
          professionalId: input.professionalId,
          patientId: patient?.id,
          messageText: output.responseMessage,
          messageType: InteractionType.BOT,
        },
      })
    }
  })

  if (!output.shouldStaySilent && output.responseMessage.length > 0) {
    const ctx = await getProfessionalContext(input.professionalId)
    await sendMessage({
      phoneNumber: input.phoneNumber,
      text: output.responseMessage,
      instanceName: ctx?.evolutionInstanceName ?? undefined,
      apiKey: ctx?.evolutionApiKey ?? undefined,
    })
    return { responseSent: true }
  }

  return { responseSent: false }
}
