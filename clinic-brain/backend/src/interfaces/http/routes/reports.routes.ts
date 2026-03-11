import { AppointmentStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../../infra/database/prisma/client'
import {
  getAgendaOccupancy,
  getAppointmentsByMode,
  getAppointmentsBySchedule,
  getAverageConsultationMinutes,
  getInteractionsSummary,
  getLoyaltyRate,
  getPatientsCancellations,
  getPatientsInactive,
  getPatientsNew,
  getPatientsReschedules,
  getPatientsTopConsultations,
  getPatientsTopInteractions,
  getReactivationRate,
  getRescheduleRate,
} from '../../../application/services/analytics/analytics.service'
import { DEFAULT_DASHBOARD_CONFIG, DEFAULT_REPORT_CONFIG } from '../../../application/services/analytics/analytics.types'
import type { DashboardConfig } from '../../../application/services/analytics/analytics.types'
import { AppError } from '../../../application/errors/app-error'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireProfessionalFeature } from '../middlewares/professional-feature.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import { parseDateParam, parseReportFiltersFromQuery } from '../utils/report-query'

function startOfCurrentMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function startOfNextMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

export const reportsRoutes = Router()

reportsRoutes.use('/reports', authMiddleware, tenantScopeMiddleware, requireProfessionalFeature('reportsEnabled'))

function getReportConfig(settings: { reportConfig: unknown; dashboardConfig?: unknown } | null): DashboardConfig {
  const dashRaw =
    settings?.dashboardConfig && typeof settings.dashboardConfig === 'object'
      ? (settings.dashboardConfig as Record<string, unknown>)
      : null
  const reportRaw =
    settings?.reportConfig && typeof settings.reportConfig === 'object'
      ? (settings.reportConfig as Record<string, unknown>)
      : null
  return {
    inactivityMonths:
      (typeof reportRaw?.inactivityMonths === 'number' ? reportRaw.inactivityMonths : null) ??
      (typeof dashRaw?.inactivityMonths === 'number' ? dashRaw.inactivityMonths : null) ??
      DEFAULT_DASHBOARD_CONFIG.inactivityMonths,
    topLimit:
      (typeof reportRaw?.topLimit === 'number' ? reportRaw.topLimit : null) ??
      (typeof dashRaw?.topLimit === 'number' ? dashRaw.topLimit : null) ??
      DEFAULT_DASHBOARD_CONFIG.topLimit,
    defaultPeriodDays:
      (typeof reportRaw?.defaultPeriodDays === 'number' ? reportRaw.defaultPeriodDays : null) ??
      (typeof dashRaw?.defaultPeriodDays === 'number' ? dashRaw.defaultPeriodDays : null) ??
      DEFAULT_REPORT_CONFIG.defaultPeriodDays ??
      DEFAULT_DASHBOARD_CONFIG.defaultPeriodDays,
  }
}

reportsRoutes.get('/reports/monthly', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const from = parseDateParam(request.query.from) ?? startOfCurrentMonth()
    const to = parseDateParam(request.query.to) ?? startOfNextMonth()

    if (to <= from) {
      return response.status(400).json({
        message: 'O período informado é inválido. O campo "Até" deve ser maior que o campo "De".',
      })
    }

    const [professional, totalConsultations, confirmed, canceled, missed, activePatients, inactivePatients, appointments] =
      await Promise.all([
        prisma.professional.findUnique({
          where: {
            id: professionalId,
          },
          select: {
            consultationFeeCents: true,
          },
        }),
        prisma.appointment.count({
          where: {
            professionalId,
            startsAt: {
              gte: from,
              lt: to,
            },
          },
        }),
        prisma.appointment.count({
          where: {
            professionalId,
            status: AppointmentStatus.CONFIRMADO,
            startsAt: {
              gte: from,
              lt: to,
            },
          },
        }),
        prisma.appointment.count({
          where: {
            professionalId,
            status: AppointmentStatus.CANCELADO,
            startsAt: {
              gte: from,
              lt: to,
            },
          },
        }),
        prisma.appointment.count({
          where: {
            professionalId,
            status: AppointmentStatus.FALTOU,
            startsAt: {
              gte: from,
              lt: to,
            },
          },
        }),
        prisma.patient.count({
          where: {
            professionalId,
            status: 'ATIVO',
          },
        }),
        prisma.patient.count({
          where: {
            professionalId,
            status: 'INATIVO',
          },
        }),
        prisma.appointment.findMany({
          where: {
            professionalId,
            startsAt: {
              gte: from,
              lt: to,
            },
          },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            notes: true,
            patient: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: {
            startsAt: 'asc',
          },
        }),
      ])

    const attendanceRate = totalConsultations > 0 ? Number(((confirmed / totalConsultations) * 100).toFixed(2)) : 0

    const consultationFeeCents = professional?.consultationFeeCents ?? 0
    const estimatedRevenueCents = confirmed * consultationFeeCents

    const summaryByStatus = {
      AGENDADO: 0,
      CONFIRMADO: 0,
      CANCELADO: 0,
      FALTOU: 0,
      REMARCADO: 0,
    }

    for (const appointment of appointments) {
      summaryByStatus[appointment.status] += 1
    }

    const detailedAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        phoneNumber: appointment.patient.phoneNumber,
      },
    }))

    return response.status(200).json({
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totalConsultations,
      confirmed,
      canceled,
      missed,
      attendanceRate,
      estimatedRevenueCents,
      activePatients,
      inactivePatients,
      summaryByStatus,
      detailedAppointments,
    })
  } catch (error) {
    return next(error)
  }
})

async function ensureValidPeriod(
  from: Date | undefined,
  to: Date | undefined,
  defaultDays: number,
): Promise<{ from: Date; to: Date }> {
  const now = new Date()
  const fallbackFrom = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000)
  const f = from ?? fallbackFrom
  const t = to ?? now
  if (t <= f) {
    throw new AppError('Período inválido. O campo "Até" deve ser maior que o campo "De".', 400)
  }
  return { from: f, to: t }
}

reportsRoutes.get('/reports/patients-inactive', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsInactive(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/patients-top-consultations', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsTopConsultations(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/patients-cancellations', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsCancellations(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/patients-reschedules', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsReschedules(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/patients-new', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsNew(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/reactivation-rate', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getReactivationRate(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/loyalty-rate', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getLoyaltyRate(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/reschedule-rate', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getRescheduleRate(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/appointments-by-schedule', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getAppointmentsBySchedule(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ slots: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/interactions', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getInteractionsSummary(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/patients-top-interactions', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getPatientsTopInteractions(professionalId, { ...filters, from, to }, config)
    return response.status(200).json({ patients: data, period: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/agenda-occupancy', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getAgendaOccupancy(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/appointments-by-mode', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getAppointmentsByMode(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})

reportsRoutes.get('/reports/average-consultation-duration', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const filters = parseReportFiltersFromQuery(request.query as Record<string, unknown>)
    const settings = await prisma.settings.findUnique({
      where: { professionalId },
      select: { dashboardConfig: true, reportConfig: true },
    })
    const config = getReportConfig(settings)
    const { from, to } = await ensureValidPeriod(
      filters.from,
      filters.to,
      config.defaultPeriodDays ?? 30,
    )
    const data = await getAverageConsultationMinutes(professionalId, { ...filters, from, to }, config)
    return response.status(200).json(data)
  } catch (error) {
    return next(error)
  }
})
