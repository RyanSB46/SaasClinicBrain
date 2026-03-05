import { createHmac, randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { env } from '../../../infra/config/env'
import { decryptSecret, encryptSecret } from '../../../infra/security/encryption'

type GoogleStatePayload = {
  professionalId: string
  nonce: string
  ts: number
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

const refreshLocks = new Map<string, Promise<void>>()

function ensureGoogleIntegrationConfigured() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new AppError('Integração Google não configurada no servidor', 503)
  }
}

function buildOAuthClient() {
  ensureGoogleIntegrationConfigured()
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_OAUTH_REDIRECT_URI,
  )
}

function signState(payload: GoogleStatePayload): string {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = createHmac('sha256', env.JWT_SECRET).update(raw).digest('base64url')
  return `${raw}.${signature}`
}

function verifyState(state: string): GoogleStatePayload {
  const [raw, signature] = state.split('.')
  if (!raw || !signature) {
    throw new AppError('State OAuth inválido', 400)
  }

  const expected = createHmac('sha256', env.JWT_SECRET).update(raw).digest('base64url')
  if (expected !== signature) {
    throw new AppError('Assinatura OAuth inválida', 400)
  }

  const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as GoogleStatePayload
  if (!parsed.professionalId || !parsed.ts) {
    throw new AppError('State OAuth inválido', 400)
  }

  // 15 minutes max callback window
  if (Date.now() - parsed.ts > 15 * 60 * 1000) {
    throw new AppError('State OAuth expirado', 400)
  }

  return parsed
}

export function buildGoogleConnectUrl(professionalId: string): string {
  const oauthClient = buildOAuthClient()
  const state = signState({
    professionalId,
    nonce: randomUUID(),
    ts: Date.now(),
  })

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    state,
  })
}

export async function handleGoogleOAuthCallback(code: string, state: string): Promise<string> {
  const payload = verifyState(state)
  const oauthClient = buildOAuthClient()

  const { tokens } = await oauthClient.getToken(code)
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new AppError('OAuth do Google não retornou tokens completos', 400)
  }

  oauthClient.setCredentials(tokens)
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient })
  const calendarList = await calendarApi.calendarList.list({ maxResults: 1 })
  const primaryCalendarId = calendarList.data.items?.[0]?.id ?? 'primary'

  await prisma.professional.update({
    where: { id: payload.professionalId },
    data: {
      googleAccessTokenEnc: encryptSecret(tokens.access_token),
      googleRefreshTokenEnc: encryptSecret(tokens.refresh_token),
      googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleCalendarId: primaryCalendarId,
      googleConnectedAt: new Date(),
    },
  })

  return payload.professionalId
}

export async function disconnectGoogleIntegration(professionalId: string): Promise<void> {
  await prisma.$transaction([
    prisma.googleCalendarEventMapping.deleteMany({
      where: { professionalId },
    }),
    prisma.googleCalendarSyncJob.deleteMany({
      where: { professionalId },
    }),
    prisma.professional.update({
      where: { id: professionalId },
      data: {
        googleAccessTokenEnc: null,
        googleRefreshTokenEnc: null,
        googleTokenExpiresAt: null,
        googleCalendarId: null,
        googleConnectedAt: null,
      },
    }),
  ])
}

export async function getGoogleIntegrationStatus(professionalId: string) {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      googleConnectedAt: true,
      googleCalendarId: true,
      googleTokenExpiresAt: true,
      settings: {
        select: {
          googleCalendarEnabled: true,
          googleMeetEnabled: true,
          googleSendInviteToPatient: true,
        },
      },
    },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  return {
    connected: Boolean(professional.googleConnectedAt),
    connectedAt: professional.googleConnectedAt,
    calendarId: professional.googleCalendarId,
    tokenExpiresAt: professional.googleTokenExpiresAt,
    flags: professional.settings
      ? {
          googleCalendarEnabled: professional.settings.googleCalendarEnabled,
          googleMeetEnabled: professional.settings.googleMeetEnabled,
          googleSendInviteToPatient: professional.settings.googleSendInviteToPatient,
        }
      : {
          googleCalendarEnabled: false,
          googleMeetEnabled: false,
          googleSendInviteToPatient: false,
        },
  }
}

async function refreshProfessionalToken(professionalId: string): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      googleRefreshTokenEnc: true,
    },
  })

  if (!professional?.googleRefreshTokenEnc) {
    throw new AppError('Refresh token do Google não encontrado', 400)
  }

  const oauthClient = buildOAuthClient()
  oauthClient.setCredentials({
    refresh_token: decryptSecret(professional.googleRefreshTokenEnc),
  })

  const refreshResult = await oauthClient.refreshAccessToken()
  const credentials = refreshResult.credentials

  if (!credentials.access_token) {
    throw new AppError('Não foi possível renovar token do Google', 400)
  }

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      googleAccessTokenEnc: encryptSecret(credentials.access_token),
      googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      ...(credentials.refresh_token
        ? {
            googleRefreshTokenEnc: encryptSecret(credentials.refresh_token),
          }
        : {}),
    },
  })
}

export async function getAuthorizedGoogleOAuthClient(professionalId: string) {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      googleAccessTokenEnc: true,
      googleRefreshTokenEnc: true,
      googleTokenExpiresAt: true,
    },
  })

  if (!professional?.googleAccessTokenEnc || !professional.googleRefreshTokenEnc) {
    throw new AppError('Google Calendar não está conectado para este profissional', 400)
  }

  const expiresAt = professional.googleTokenExpiresAt?.getTime() ?? 0
  const shouldRefresh = !expiresAt || expiresAt <= Date.now() + 60 * 1000

  if (shouldRefresh) {
    const currentLock = refreshLocks.get(professionalId)
    if (currentLock) {
      await currentLock
    } else {
      const refreshPromise = refreshProfessionalToken(professionalId)
      refreshLocks.set(professionalId, refreshPromise)
      try {
        await refreshPromise
      } finally {
        refreshLocks.delete(professionalId)
      }
    }
  }

  const refreshed = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      googleAccessTokenEnc: true,
      googleRefreshTokenEnc: true,
    },
  })

  if (!refreshed?.googleAccessTokenEnc || !refreshed.googleRefreshTokenEnc) {
    throw new AppError('Google Calendar não está conectado para este profissional', 400)
  }

  const oauthClient = buildOAuthClient()
  oauthClient.setCredentials({
    access_token: decryptSecret(refreshed.googleAccessTokenEnc),
    refresh_token: decryptSecret(refreshed.googleRefreshTokenEnc),
  })

  return oauthClient
}
