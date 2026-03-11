import { InteractionType } from '@prisma/client'
import { Router } from 'express'
import { AppError } from '../../../application/errors/app-error'
import {
  parsePatientRequestPayload,
  processPatientRequestReview,
} from '../../../application/use-cases/patient-requests/process-patient-request-review.use-case'
import { subscribePatientRequestsUpdates } from '../../../application/services/patient-requests-events.service'
import { prisma } from '../../../infra/database/prisma/client'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireProfessionalFeature } from '../middlewares/professional-feature.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import { validateBody } from '../middlewares/validate-body.middleware'
import { reviewPatientRequestSchema } from '../schemas/patient-request.schema'

type PatientRequestPayload = {
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
}

function parsePayload(messageText: string): PatientRequestPayload | null {
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

function buildPatientReviewMessage(input: {
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

export const patientRequestsRoutes = Router()

patientRequestsRoutes.use(
  '/patient-requests',
  authMiddleware,
  tenantScopeMiddleware,
  requireProfessionalFeature('requestsEnabled'),
)

patientRequestsRoutes.get('/patient-requests/stream', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache')
    response.setHeader('Connection', 'keep-alive')
    response.flushHeaders()

    const unsubscribe = subscribePatientRequestsUpdates(professionalId, () => {
      try {
        response.write(`data: ${JSON.stringify({ type: 'update' })}\n\n`)
      } catch {
        // client disconnected
      }
    })

    request.on('close', () => {
      unsubscribe()
    })
  } catch (error) {
    return next(error)
  }
})

patientRequestsRoutes.get('/patient-requests/pending', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const interactions = await prisma.interaction.findMany({
      where: {
        professionalId,
        messageType: InteractionType.PACIENTE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 300,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    })

    const requests = interactions
      .map((interaction) => {
        const payload = parsePatientRequestPayload(interaction.messageText)

        if (!payload || payload.status !== 'PENDING_PROFESSIONAL_APPROVAL') {
          return null
        }

        return {
          id: interaction.id,
          createdAt: interaction.createdAt,
          patient: interaction.patient,
          payload,
        }
      })
      .filter(Boolean)

    return response.status(200).json(requests)
  } catch (error) {
    return next(error)
  }
})

patientRequestsRoutes.get('/patient-requests/recent', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const interactions = await prisma.interaction.findMany({
      where: {
        professionalId,
        messageType: InteractionType.PACIENTE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    })

    const recent = interactions
      .map((interaction) => {
        const payload = parsePatientRequestPayload(interaction.messageText)

        if (!payload || payload.status === 'PENDING_PROFESSIONAL_APPROVAL') {
          return null
        }

        return {
          id: interaction.id,
          createdAt: interaction.createdAt,
          patient: interaction.patient,
          payload,
        }
      })
      .filter(Boolean)
      .slice(0, 20)

    return response.status(200).json(recent)
  } catch (error) {
    return next(error)
  }
})

patientRequestsRoutes.post(
  '/patient-requests/:id/review',
  validateBody(reviewPatientRequestSchema),
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      const requestId = String(request.params.id)
      const { action, reason } = request.body as { action: 'APPROVE' | 'REJECT'; reason?: string }

      const result = await processPatientRequestReview({
        professionalId,
        interactionId: requestId,
        action,
        reviewedVia: 'PANEL',
        reason,
      })

      return response.status(200).json({
        requestId,
        status: result.status,
        deliveryWarning: result.deliveryWarning,
      })
    } catch (error) {
      return next(error)
    }
  },
)
