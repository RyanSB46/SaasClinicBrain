import { app } from './app'
import { env } from '../../infra/config/env'
import { startAppointmentReminderScheduler } from '../../application/services/reminders/appointment-reminder-jobs.service'
import { startGoogleSyncWorker } from '../../application/services/google/google-sync-queue.service'

app.listen(env.PORT, () => {
  startAppointmentReminderScheduler()
  startGoogleSyncWorker()
  console.log(`Backend running on http://localhost:${env.PORT}${env.API_PREFIX}`)
})
