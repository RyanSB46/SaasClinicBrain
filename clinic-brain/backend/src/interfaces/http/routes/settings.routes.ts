import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { AppError } from '../../../application/errors/app-error'
import { clearAllPatientData } from '../../../application/use-cases/settings/clear-all-patient-data.use-case'
import { env } from '../../../infra/config/env'
import { prisma } from '../../../infra/database/prisma/client'
import { authMiddleware } from '../middlewares/auth.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import { validateBody } from '../middlewares/validate-body.middleware'
import {
  DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
  DEFAULT_WELCOME_MESSAGE_TEMPLATE,
  normalizeProfessionalFeatureFlags,
  PROFESSIONAL_FEATURE_FLAGS_SELECT,
} from '../features/professional-features'
import {
  normalizeDashboardConfig,
  normalizeReportConfig,
  updateDashboardConfigSchema,
  updateReportConfigSchema,
} from '../schemas/dashboard.schema'
import { updateSettingsFeaturesSchema, updateSettingsSchema } from '../schemas/settings.schema'

export const settingsRoutes = Router()

settingsRoutes.use('/settings', authMiddleware, tenantScopeMiddleware)

function isClearPatientsAllowed(professionalEmail: string): boolean {
  const allowed = env.CLEAR_PATIENTS_ALLOWED_EMAILS?.trim()
  if (!allowed) {
    return env.NODE_ENV === 'development'
  }
  const emails = allowed.split(',').map((e) => e.trim().toLowerCase())
  return emails.includes(professionalEmail.toLowerCase())
}

settingsRoutes.get('/settings/messages', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const settings = await prisma.settings.findUnique({
      where: {
        professionalId,
      },
      select: {
        welcomeMessage: true,
        confirmationMessage: true,
        cancellationPolicy: true,
        reminderD1Enabled: true,
        reminder2hEnabled: true,
      },
    })

    if (!settings) {
      return response.status(200).json({
        welcomeMessage: DEFAULT_WELCOME_MESSAGE_TEMPLATE,
        confirmationMessage: '',
        cancellationPolicy: '',
        reminderD1Enabled: true,
        reminder2hEnabled: true,
        ...DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
      })
    }

    const welcomeMessage =
      settings.welcomeMessage?.trim() || DEFAULT_WELCOME_MESSAGE_TEMPLATE

    return response.status(200).json({
      ...settings,
      welcomeMessage,
    })
  } catch (error) {
    return next(error)
  }
})

settingsRoutes.put('/settings/messages', validateBody(updateSettingsSchema), async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const settings = await prisma.settings.upsert({
      where: {
        professionalId,
      },
      update: {
        welcomeMessage: request.body.welcomeMessage ?? null,
        confirmationMessage: request.body.confirmationMessage ?? null,
        cancellationPolicy: request.body.cancellationPolicy ?? null,
      },
      create: {
        professionalId,
        welcomeMessage: request.body.welcomeMessage ?? null,
        confirmationMessage: request.body.confirmationMessage ?? null,
        cancellationPolicy: request.body.cancellationPolicy ?? null,
      },
      select: {
        welcomeMessage: true,
        confirmationMessage: true,
        cancellationPolicy: true,
        reminderD1Enabled: true,
        reminder2hEnabled: true,
      },
    })

    return response.status(200).json(settings)
  } catch (error) {
    return next(error)
  }
})

settingsRoutes.get('/settings/features', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const settings = await prisma.settings.findUnique({
      where: {
        professionalId,
      },
      select: PROFESSIONAL_FEATURE_FLAGS_SELECT,
    })

    return response.status(200).json(normalizeProfessionalFeatureFlags(settings))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      return response.status(200).json(DEFAULT_PROFESSIONAL_FEATURE_FLAGS)
    }

    return next(error)
  }
})

settingsRoutes.put('/settings/features', validateBody(updateSettingsFeaturesSchema), async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const currentSettings = await prisma.settings.findUnique({
      where: {
        professionalId,
      },
      select: PROFESSIONAL_FEATURE_FLAGS_SELECT,
    })

    const nextFeatures = normalizeProfessionalFeatureFlags({
      ...currentSettings,
      ...request.body,
    })

    const updated = await prisma.settings.upsert({
      where: {
        professionalId,
      },
      update: {
        ...nextFeatures,
      },
      create: {
        professionalId,
        ...nextFeatures,
      },
      select: PROFESSIONAL_FEATURE_FLAGS_SELECT,
    })

    return response.status(200).json(updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      return response.status(503).json({
        message: 'Feature flags indisponíveis até aplicar as migrações mais recentes do banco.',
      })
    }

    return next(error)
  }
})

settingsRoutes.get('/settings/dashboard-config', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true },
    })
    const config = normalizeDashboardConfig(settings?.dashboardConfig ?? null)
    return response.status(200).json(config)
  } catch (error) {
    return next(error)
  }
})

settingsRoutes.put(
  '/settings/dashboard-config',
  validateBody(updateDashboardConfigSchema),
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      const current = await prisma.settings.findUnique({
        where: { professionalId },
        select: { dashboardConfig: true },
      })
      const merged = normalizeDashboardConfig({
        ...(current?.dashboardConfig as object | undefined),
        ...request.body,
      })
      await prisma.settings.upsert({
        where: { professionalId },
        update: { dashboardConfig: merged as object },
        create: { professionalId, dashboardConfig: merged as object },
      })
      return response.status(200).json(merged)
    } catch (error) {
      return next(error)
    }
  },
)

settingsRoutes.get('/settings/report-config', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { reportConfig: true },
    })
    const config = normalizeReportConfig(settings?.reportConfig ?? null)
    return response.status(200).json(config)
  } catch (error) {
    return next(error)
  }
})

settingsRoutes.put(
  '/settings/report-config',
  validateBody(updateReportConfigSchema),
  async (request, response, next) => {
    try {
      const professionalId = request.professionalId as string
      const current = await prisma.settings.findUnique({
        where: { professionalId },
        select: { reportConfig: true },
      })
      const merged = normalizeReportConfig({
        ...(current?.reportConfig as object | undefined),
        ...request.body,
      })
      await prisma.settings.upsert({
        where: { professionalId },
        update: { reportConfig: merged as object },
        create: { professionalId, reportConfig: merged as object },
      })
      return response.status(200).json(merged)
    } catch (error) {
      return next(error)
    }
  },
)

settingsRoutes.post('/settings/clear-patients-data', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { email: true },
    })

    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }

    if (!isClearPatientsAllowed(professional.email)) {
      throw new AppError('Esta ação não está disponível para sua conta.', 403)
    }

    await clearAllPatientData(professionalId)

    return response.status(200).json({
      message: 'Dados de pacientes removidos com sucesso.',
    })
  } catch (error) {
    return next(error)
  }
})
