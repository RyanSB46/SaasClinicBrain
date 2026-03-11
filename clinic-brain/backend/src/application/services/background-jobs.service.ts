/**
 * Módulo centralizado de background jobs.
 *
 * Orquestra o lifecycle dos jobs em processo (lembretes, sync Google).
 * Preparado para futura migração para BullMQ/Redis quando escalar.
 */

import { startAppointmentReminderScheduler, stopAppointmentReminderScheduler } from './reminders/appointment-reminder-jobs.service'
import { startGoogleSyncWorker, stopGoogleSyncWorker } from './google/google-sync-queue.service'

export function startBackgroundJobs(): void {
  startAppointmentReminderScheduler()
  startGoogleSyncWorker()
}

export function stopBackgroundJobs(): void {
  stopAppointmentReminderScheduler()
  stopGoogleSyncWorker()
}
