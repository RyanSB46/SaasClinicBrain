import { InteractionType } from '@prisma/client'
import { AppError } from '../../errors/app-error'
import { sendEvolutionMessage } from '../../services/evolution/send-evolution-message.service'
import { notifyPatientRequestsUpdated } from '../../services/patient-requests-events.service'
import { createAppointment } from '../appointments/create-appointment.use-case'
import { rescheduleAppointment } from '../appointments/reschedule-appointment.use-case'
import { prisma } from '../../../infra/database/prisma/client'

export type PatientRequestPayload = {
  type: 'BOOK_REQUEST' | 'RESCHEDULE_REQUEST'
  status: 'PENDING_PROFESSIONAL_APPROVAL' | 'APPROVED' | 'REJECTED'
  source: 'PATIENT_PORTAL'
  startsAt?: string
  endsAt?: string
  appointmentId?: string
  currentStartsAt?: string
  currentEndsAt?: string
  requestedStartsAt?: string
  requestedEndsAt?: string
  reviewedAt?: string
  reviewReason?: string
  reviewedVia?: 'PANEL' | 'WHATSAPP'
}

export function parsePatientRequestPayload(messageText: string): PatientRequestPayload | null {
  try {
    const parsed = JSON.parse(messageText) as Partial<PatientRequestPayload>

    if (
      (parsed.type === 'BOOK_REQUEST' || parsed.type === 'RESCHEDULE_REQUEST') &&
      parsed.status &&
      parsed.source === 'PATIENT_PORTAL'
    ) {
      return parsed as PatientRequestPayload
    }

    return null
  } catch {
    return null
  }
}

export function buildPatientReviewMessage(input: {
  action: 'APPROVE' | 'REJECT'
  requestType: 'BOOK_REQUEST' | 'RESCHEDULE_REQUEST'
  reason?: string
}): string {
  const requestLabel = input.requestType === 'BOOK_REQUEST' ? 'agendamento' : 'remarcação'
  const statusLabel = input.action === 'APPROVE' ? 'aprovada' : 'rejeitada'
  const reason = input.reason?.trim()
  const reasonText = reason ? `\nMotivo: ${reason}` : ''

  return `Sua solicitação de ${requestLabel} foi ${statusLabel} pela profissional.${reasonText}`
}

export type ProcessPatientRequestReviewInput = {
  professionalId: string
  interactionId: string
  action: 'APPROVE' | 'REJECT'
  reviewedVia: 'PANEL' | 'WHATSAPP'
  reason?: string
}

export type ProcessPatientRequestReviewResult = {
  status: 'APPROVED' | 'REJECTED'
  deliveryWarning?: string
}

export async function processPatientRequestReview(
  input: ProcessPatientRequestReviewInput,
): Promise<ProcessPatientRequestReviewResult> {
  const { professionalId, interactionId, action, reviewedVia, reason } = input

  const interaction = await prisma.interaction.findFirst({
    where: {
      id: interactionId,
      professionalId,
      messageType: InteractionType.PACIENTE,
    },
    select: {
      id: true,
      patientId: true,
      messageText: true,
      patient: {
        select: {
          phoneNumber: true,
        },
      },
    },
  })

  if (!interaction) {
    throw new AppError('Solicitação não encontrada', 404)
  }

  const payload = parsePatientRequestPayload(interaction.messageText)

  if (!payload || payload.status !== 'PENDING_PROFESSIONAL_APPROVAL') {
    throw new AppError('Solicitação já processada ou inválida', 400)
  }

  if (!interaction.patientId) {
    throw new AppError('Solicitação sem paciente vinculado', 400)
  }

  if (action === 'APPROVE') {
    if (payload.type === 'BOOK_REQUEST') {
      if (!payload.startsAt || !payload.endsAt) {
        throw new AppError('Dados da solicitação de agendamento inválidos', 400)
      }

      await createAppointment({
        professionalId,
        patientId: interaction.patientId,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        notes: 'Solicitação aprovada no portal do paciente',
      })
    } else {
      if (!payload.appointmentId || !payload.requestedStartsAt || !payload.requestedEndsAt) {
        throw new AppError('Dados da solicitação de remarcação inválidos', 400)
      }

      await rescheduleAppointment({
        professionalId,
        appointmentId: payload.appointmentId,
        startsAt: payload.requestedStartsAt,
        endsAt: payload.requestedEndsAt,
      })
    }
  }

  const reviewedPayload: PatientRequestPayload = {
    ...payload,
    status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    reviewedAt: new Date().toISOString(),
    reviewReason: reason?.trim() || undefined,
    reviewedVia,
  }

  const notificationText = buildPatientReviewMessage({
    action,
    requestType: payload.type,
    reason,
  })

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      evolutionInstanceName: true,
      evolutionApiKey: true,
    },
  })

  await prisma.$transaction([
    prisma.interaction.update({
      where: { id: interaction.id },
      data: {
        messageText: JSON.stringify(reviewedPayload),
      },
    }),
    prisma.interaction.create({
      data: {
        professionalId,
        patientId: interaction.patientId,
        messageType: InteractionType.BOT,
        messageText: notificationText,
      },
    }),
  ])

  let deliveryWarning: string | undefined

  try {
    await sendEvolutionMessage({
      phoneNumber: interaction.patient?.phoneNumber ?? '',
      text: notificationText,
      instanceName: professional?.evolutionInstanceName ?? undefined,
      apiKey: professional?.evolutionApiKey ?? undefined,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    deliveryWarning =
      'Solicitação processada, mas a mensagem de WhatsApp não pôde ser enviada no ambiente local.'
  }

  notifyPatientRequestsUpdated(professionalId)

  return {
    status: reviewedPayload.status as 'APPROVED' | 'REJECTED',
    deliveryWarning,
  }
}
