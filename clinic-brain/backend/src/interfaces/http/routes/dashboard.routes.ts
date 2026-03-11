import { AppointmentStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../../infra/database/prisma/client'
import {
  getAgendaOccupancy,
  getAppointmentsByMode,
  getAverageConsultationMinutes,
  getInteractionsSummary,
  getLoyaltyRate,
  getPatientsInactive,
  getPatientsNew,
  getPatientsTopConsultations,
  getReactivationRate,
  getRescheduleRate,
} from '../../../application/services/analytics/analytics.service'
import {
  DEFAULT_DASHBOARD_CONFIG,
  type DashboardConfig,
} from '../../../application/services/analytics/analytics.types'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireProfessionalFeature } from '../middlewares/professional-feature.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import { parseReportFiltersFromQuery } from '../utils/report-query'

export const dashboardRoutes = Router()

dashboardRoutes.use('/dashboard', authMiddleware, tenantScopeMiddleware, requireProfessionalFeature('dashboardEnabled'))

function getDashboardConfig(settings: { dashboardConfig: unknown } | null): DashboardConfig {
  if (!settings?.dashboardConfig || typeof settings.dashboardConfig !== 'object') {
    return { ...DEFAULT_DASHBOARD_CONFIG }
  }
  const raw = settings.dashboardConfig as Record<string, unknown>
  return {
    inactivityMonths:
      typeof raw.inactivityMonths === 'number' ? raw.inactivityMonths : DEFAULT_DASHBOARD_CONFIG.inactivityMonths,
    topLimit: typeof raw.topLimit === 'number' ? raw.topLimit : DEFAULT_DASHBOARD_CONFIG.topLimit,
    defaultPeriodDays:
      typeof raw.defaultPeriodDays === 'number'
        ? raw.defaultPeriodDays
        : DEFAULT_DASHBOARD_CONFIG.defaultPeriodDays,
    enabledWidgets: Array.isArray(raw.enabledWidgets)
      ? raw.enabledWidgets.filter((w) => typeof w === 'string')
      : DEFAULT_DASHBOARD_CONFIG.enabledWidgets,
  }
}

dashboardRoutes.get('/dashboard/overview', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const from = filters.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const to = filters.to ?? now

    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true },
    })
    const config = getDashboardConfig(settings)
    const enabled = new Set(config.enabledWidgets ?? DEFAULT_DASHBOARD_CONFIG.enabledWidgets ?? [])

    const reportFilters = {
      ...filters,
      from,
      to,
    }

    const [baseMetrics, patientsInactive, patientsTopConsultations, patientsNew, reactivationRate, loyaltyRate, rescheduleRate, interactionsSummary, agendaOccupancy, appointmentsByMode, averageConsultation] =
      await Promise.all([
        Promise.all([
          prisma.patient.count({ where: { professionalId } }),
          prisma.patient.count({ where: { professionalId, status: 'ATIVO' } }),
          prisma.appointment.count({
            where: {
              professionalId,
              startsAt: { gte: monthStart, lt: monthEnd },
            },
          }),
          prisma.appointment.count({
            where: {
              professionalId,
              status: { in: [AppointmentStatus.AGENDADO, AppointmentStatus.CONFIRMADO] },
              startsAt: { gte: now },
            },
          }),
          prisma.appointment.count({
            where: {
              professionalId,
              status: AppointmentStatus.CANCELADO,
              startsAt: { gte: monthStart, lt: monthEnd },
            },
          }),
        ]),
        enabled.has('patientsInactive')
          ? getPatientsInactive(professionalId, reportFilters, config)
          : Promise.resolve([]),
        enabled.has('patientsTopConsultations')
          ? getPatientsTopConsultations(professionalId, reportFilters, config)
          : Promise.resolve([]),
        enabled.has('patientsNew') ? getPatientsNew(professionalId, reportFilters, config) : Promise.resolve([]),
        enabled.has('reactivationRate')
          ? getReactivationRate(professionalId, reportFilters, config)
          : Promise.resolve(null),
        enabled.has('loyaltyRate') ? getLoyaltyRate(professionalId, reportFilters, config) : Promise.resolve(null),
        enabled.has('rescheduleRate')
          ? getRescheduleRate(professionalId, reportFilters, config)
          : Promise.resolve(null),
        enabled.has('interactionsSummary')
          ? getInteractionsSummary(professionalId, reportFilters, config)
          : Promise.resolve(null),
        enabled.has('agendaOccupancy')
          ? getAgendaOccupancy(professionalId, reportFilters, config)
          : Promise.resolve(null),
        enabled.has('appointmentsByMode')
          ? getAppointmentsByMode(professionalId, reportFilters, config)
          : Promise.resolve(null),
        enabled.has('averageConsultationMinutes')
          ? getAverageConsultationMinutes(professionalId, reportFilters, config)
          : Promise.resolve(null),
      ])

    const [totalPatients, activePatients, monthAppointments, upcomingAppointments, canceledAppointments] =
      baseMetrics

    const overview: Record<string, unknown> = {
      totalPatients,
      activePatients,
      monthAppointments,
      upcomingAppointments,
      canceledAppointments,
      config: {
        inactivityMonths: config.inactivityMonths,
        topLimit: config.topLimit,
        defaultPeriodDays: config.defaultPeriodDays,
      },
    }

    if (enabled.has('patientsInactive') && patientsInactive.length > 0) {
      overview.patientsInactive = patientsInactive.slice(0, config.topLimit ?? 10)
      overview.patientsInactiveCount = patientsInactive.length
    }
    if (enabled.has('patientsTopConsultations') && patientsTopConsultations.length > 0) {
      overview.patientsTopConsultations = patientsTopConsultations
    }
    if (enabled.has('patientsNew') && patientsNew.length > 0) {
      overview.patientsNew = patientsNew.slice(0, config.topLimit ?? 10)
      overview.patientsNewCount = patientsNew.length
    }
    if (enabled.has('reactivationRate') && reactivationRate) {
      overview.reactivationRate = reactivationRate
    }
    if (enabled.has('loyaltyRate') && loyaltyRate) {
      overview.loyaltyRate = loyaltyRate
    }
    if (enabled.has('rescheduleRate') && rescheduleRate) {
      overview.rescheduleRate = rescheduleRate
    }
    if (enabled.has('interactionsSummary') && interactionsSummary) {
      overview.interactionsSummary = interactionsSummary
    }
    if (enabled.has('agendaOccupancy') && agendaOccupancy) {
      overview.agendaOccupancy = agendaOccupancy
    }
    if (enabled.has('appointmentsByMode') && appointmentsByMode) {
      overview.appointmentsByMode = appointmentsByMode
    }
    if (enabled.has('averageConsultationMinutes') && averageConsultation) {
      overview.averageConsultationMinutes = averageConsultation
    }

    overview.period = { from: from.toISOString(), to: to.toISOString() }

    return response.status(200).json(overview)
  } catch (error) {
    return next(error)
  }
})
