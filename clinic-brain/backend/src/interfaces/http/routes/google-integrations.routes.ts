import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import {
  buildGoogleConnectUrl,
  disconnectGoogleIntegration,
  getGoogleIntegrationStatus,
  handleGoogleOAuthCallback,
} from '../../../application/services/google/google-oauth.service'
import { env } from '../../../infra/config/env'

export const googleIntegrationsRoutes = Router()

googleIntegrationsRoutes.get(
  '/integrations/google/connect',
  authMiddleware,
  tenantScopeMiddleware,
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      const connectUrl = buildGoogleConnectUrl(professionalId)
      return response.status(200).json({ connectUrl })
    } catch (error) {
      return next(error)
    }
  },
)

googleIntegrationsRoutes.get('/integrations/google/callback', async (request, response, next) => {
  try {
    const code = typeof request.query.code === 'string' ? request.query.code : ''
    const state = typeof request.query.state === 'string' ? request.query.state : ''

    if (!code || !state) {
      return response.redirect(env.GOOGLE_FRONTEND_ERROR_URL)
    }

    await handleGoogleOAuthCallback(code, state)
    return response.redirect(env.GOOGLE_FRONTEND_SUCCESS_URL)
  } catch (error) {
    return response.redirect(env.GOOGLE_FRONTEND_ERROR_URL)
  }
})

googleIntegrationsRoutes.get(
  '/integrations/google/status',
  authMiddleware,
  tenantScopeMiddleware,
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      const status = await getGoogleIntegrationStatus(professionalId)
      return response.status(200).json(status)
    } catch (error) {
      return next(error)
    }
  },
)

googleIntegrationsRoutes.post(
  '/integrations/google/disconnect',
  authMiddleware,
  tenantScopeMiddleware,
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      await disconnectGoogleIntegration(professionalId)
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)
