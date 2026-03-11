import { app } from './app'
import { env } from '../../infra/config/env'
import { startBackgroundJobs, stopBackgroundJobs } from '../../application/services/background-jobs.service'

const server = app.listen(env.PORT, '0.0.0.0', () => {
  startBackgroundJobs()
  console.log(`Backend running on http://localhost:${env.PORT}${env.API_PREFIX}`)
})

const SHUTDOWN_TIMEOUT_MS = 5000

function gracefulShutdown(signal: string): void {
  console.log(`${signal} received, shutting down gracefully...`)
  const forceExit = setTimeout(() => {
    console.warn('Shutdown timeout reached, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  server.close(() => {
    clearTimeout(forceExit)
    stopBackgroundJobs()
    console.log('Server closed. Background jobs stopped.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
