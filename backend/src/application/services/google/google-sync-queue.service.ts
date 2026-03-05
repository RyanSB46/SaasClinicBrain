import { GoogleSyncAction, GoogleSyncStatus } from '@prisma/client'
import { env } from '../../../infra/config/env'
import { prisma } from '../../../infra/database/prisma/client'
import { deleteGoogleEventForAppointment, upsertGoogleEventForAppointment } from './google-calendar.service'

let queueInterval: NodeJS.Timeout | null = null
let cycleRunning = false

function computeNextRetry(attempts: number): Date {
  const seconds = Math.min(60 * 30, 30 * 2 ** Math.max(0, attempts))
  return new Date(Date.now() + seconds * 1000)
}

export async function enqueueGoogleSyncJob(input: {
  professionalId: string
  appointmentId: string
  action: GoogleSyncAction
}) {
  if (!env.GOOGLE_SYNC_ENABLED) {
    return
  }

  await prisma.googleCalendarSyncJob.create({
    data: {
      professionalId: input.professionalId,
      appointmentId: input.appointmentId,
      action: input.action,
      status: GoogleSyncStatus.PENDING,
      attempts: 0,
      nextAttemptAt: new Date(),
    },
  })
}

async function processOneJob(jobId: string): Promise<void> {
  const job = await prisma.googleCalendarSyncJob.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return
  }

  try {
    if (job.action === GoogleSyncAction.UPSERT) {
      await upsertGoogleEventForAppointment(job.appointmentId)
    } else {
      await deleteGoogleEventForAppointment(job.appointmentId)
    }

    await prisma.googleCalendarSyncJob.update({
      where: { id: job.id },
      data: {
        status: GoogleSyncStatus.SUCCESS,
        lastError: null,
      },
    })
  } catch (error) {
    const nextAttempts = job.attempts + 1
    const shouldFail = nextAttempts >= env.GOOGLE_SYNC_MAX_ATTEMPTS
    const message = error instanceof Error ? error.message : 'Falha desconhecida no sync Google'

    await prisma.googleCalendarSyncJob.update({
      where: { id: job.id },
      data: {
        attempts: nextAttempts,
        status: shouldFail ? GoogleSyncStatus.FAILED : GoogleSyncStatus.RETRY,
        nextAttemptAt: shouldFail ? job.nextAttemptAt : computeNextRetry(nextAttempts),
        lastError: message.slice(0, 1500),
      },
    })
  }
}

export async function runGoogleSyncCycle(): Promise<void> {
  if (!env.GOOGLE_SYNC_ENABLED || cycleRunning) {
    return
  }

  cycleRunning = true

  try {
    const now = new Date()
    const jobs = await prisma.googleCalendarSyncJob.findMany({
      where: {
        status: {
          in: [GoogleSyncStatus.PENDING, GoogleSyncStatus.RETRY],
        },
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: env.GOOGLE_SYNC_BATCH_SIZE,
      select: {
        id: true,
      },
    })

    for (const job of jobs) {
      const claim = await prisma.googleCalendarSyncJob.updateMany({
        where: {
          id: job.id,
          status: {
            in: [GoogleSyncStatus.PENDING, GoogleSyncStatus.RETRY],
          },
        },
        data: {
          status: GoogleSyncStatus.PROCESSING,
        },
      })

      if (claim.count === 0) {
        continue
      }

      await processOneJob(job.id)
    }
  } finally {
    cycleRunning = false
  }
}

export function startGoogleSyncWorker() {
  if (!env.GOOGLE_SYNC_ENABLED || queueInterval) {
    return
  }

  queueInterval = setInterval(() => {
    void runGoogleSyncCycle().catch((error) => {
      console.error('Falha no ciclo de sync Google:', error)
    })
  }, env.GOOGLE_SYNC_CHECK_INTERVAL_MS)

  void runGoogleSyncCycle().catch((error) => {
    console.error('Falha na execução inicial de sync Google:', error)
  })
}

export function stopGoogleSyncWorker() {
  if (!queueInterval) {
    return
  }

  clearInterval(queueInterval)
  queueInterval = null
}
