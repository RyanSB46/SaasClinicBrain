import { AppointmentMode, AppointmentStatus, InteractionType } from '@prisma/client'
import { prisma } from '../../../infra/database/prisma/client'
import type {
  AppointmentsByModeResult,
  DashboardConfig,
  PatientWithCancellationCount,
  PatientWithConsultationCount,
  PatientWithInteractionCount,
  PatientWithLastConsultation,
  PatientWithRescheduleCount,
  PatientNewItem,
  ReportFilters,
  ScheduleSlot,
  InteractionsByType,
} from './analytics.types'
import { DEFAULT_DASHBOARD_CONFIG } from './analytics.types'

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

function parseFilters(filters: ReportFilters, config?: DashboardConfig): { from: Date; to: Date } {
  const now = new Date()
  const defaultDays = config?.defaultPeriodDays ?? DEFAULT_DASHBOARD_CONFIG.defaultPeriodDays ?? 30
  const from = filters.from ?? new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000)
  const to = filters.to ?? new Date(now.getTime())
  return { from, to }
}

export async function getPatientsInactive(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const months = filters.inactivityMonths ?? config?.inactivityMonths ?? 2
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setHours(0, 0, 0, 0)

  const completedStatuses: AppointmentStatus[] = ['CONFIRMADO', 'FALTOU']

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: completedStatuses },
      startsAt: { lt: cutoff },
    },
    select: {
      patientId: true,
      startsAt: true,
    },
    orderBy: { startsAt: 'desc' },
  })

  const lastByPatient = new Map<string, Date>()
  for (const a of appointments) {
    if (a.patientId && !lastByPatient.has(a.patientId)) {
      lastByPatient.set(a.patientId, a.startsAt)
    }
  }

  const allPatients = await prisma.patient.findMany({
    where: { professionalId },
    select: { id: true, name: true, phoneNumber: true, status: true },
  })

  const result: PatientWithLastConsultation[] = []
  const cutoffTime = cutoff.getTime()
  for (const p of allPatients) {
    const last = lastByPatient.get(p.id)
    if (!last) {
      result.push({
        id: p.id,
        name: p.name,
        phoneNumber: p.phoneNumber,
        status: p.status,
        lastConsultationAt: null,
        daysSinceLastConsultation: null,
      })
      continue
    }
    if (last.getTime() < cutoffTime) {
      const daysSince = Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000))
      result.push({
        id: p.id,
        name: p.name,
        phoneNumber: p.phoneNumber,
        status: p.status,
        lastConsultationAt: last.toISOString(),
        daysSinceLastConsultation: daysSince,
      })
    }
  }

  result.sort((a, b) => {
    const aDays = a.daysSinceLastConsultation ?? 0
    const bDays = b.daysSinceLastConsultation ?? 0
    return bDays - aDays
  })

  return result
}

export async function getPatientsTopConsultations(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const limit = filters.limit ?? config?.topLimit ?? 10

  const completed = await prisma.appointment.groupBy({
    by: ['patientId'],
    where: {
      professionalId,
      status: { in: ['CONFIRMADO', 'FALTOU'] },
      startsAt: { gte: from, lt: to },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  const patientIds = completed.map((c) => c.patientId).filter(Boolean) as string[]
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, phoneNumber: true },
  })
  const byId = new Map(patients.map((p) => [p.id, p]))

  const result: PatientWithConsultationCount[] = completed
    .filter((c) => c.patientId)
    .map((c) => {
      const p = byId.get(c.patientId!)
      return p
        ? {
            id: p.id,
            name: p.name,
            phoneNumber: p.phoneNumber,
            consultationCount: c._count.id,
          }
        : null
    })
    .filter(Boolean) as PatientWithConsultationCount[]

  return result
}

export async function getPatientsCancellations(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const minCancellations = filters.minCancellations ?? 1

  const canceled = await prisma.appointment.groupBy({
    by: ['patientId'],
    where: {
      professionalId,
      status: 'CANCELADO',
      startsAt: { gte: from, lt: to },
    },
    _count: { id: true },
  })

  const filtered = canceled.filter((c) => c._count.id >= minCancellations && c.patientId)
  const patientIds = filtered.map((c) => c.patientId!)
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, phoneNumber: true },
  })
  const byId = new Map(patients.map((p) => [p.id, p]))

  const result: PatientWithCancellationCount[] = filtered
    .map((c) => {
      const p = byId.get(c.patientId!)
      return p
        ? {
            id: p.id,
            name: p.name,
            phoneNumber: p.phoneNumber,
            cancellationCount: c._count.id,
          }
        : null
    })
    .filter(Boolean) as PatientWithCancellationCount[]

  result.sort((a, b) => b.cancellationCount - a.cancellationCount)
  return result
}

export async function getPatientsReschedules(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const minReschedules = filters.minReschedules ?? 1

  const rescheduled = await prisma.appointment.findMany({
    where: {
      professionalId,
      rescheduledFromId: { not: null },
      startsAt: { gte: from, lt: to },
    },
    select: {
      patientId: true,
    },
  })

  const countByPatient = new Map<string, number>()
  for (const a of rescheduled) {
    if (a.patientId) {
      countByPatient.set(a.patientId, (countByPatient.get(a.patientId) ?? 0) + 1)
    }
  }

  const filtered = [...countByPatient.entries()].filter(([, c]) => c >= minReschedules)
  const patientIds = filtered.map(([id]) => id)
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, phoneNumber: true },
  })
  const byId = new Map(patients.map((p) => [p.id, p]))

  const result: PatientWithRescheduleCount[] = filtered
    .map(([patientId, count]) => {
      const p = byId.get(patientId)
      return p ? { ...p, rescheduleCount: count } : null
    })
    .filter(Boolean) as PatientWithRescheduleCount[]

  result.sort((a, b) => b.rescheduleCount - a.rescheduleCount)
  return result
}

export async function getPatientsNew(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const patients = await prisma.patient.findMany({
    where: {
      professionalId,
      createdAt: { gte: from, lt: to },
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      firstConsultationAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return patients.map((p) => ({
    id: p.id,
    name: p.name,
    phoneNumber: p.phoneNumber,
    firstConsultationAt: p.firstConsultationAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  })) as PatientNewItem[]
}

export async function getReactivationRate(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const inactivityMonths = filters.inactivityMonths ?? config?.inactivityMonths ?? 2

  const cutoffBefore = new Date(from)
  cutoffBefore.setMonth(cutoffBefore.getMonth() - inactivityMonths)

  const completedStatuses: AppointmentStatus[] = ['CONFIRMADO', 'FALTOU']

  const inactiveBefore = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: completedStatuses },
      startsAt: { lt: cutoffBefore },
    },
    distinct: ['patientId'],
    select: { patientId: true },
  })
  const inactiveIds = new Set(inactiveBefore.map((a) => a.patientId).filter(Boolean) as string[])

  const returnedInPeriod = await prisma.appointment.findMany({
    where: {
      professionalId,
      patientId: { in: [...inactiveIds] },
      status: { in: completedStatuses },
      startsAt: { gte: from, lt: to },
    },
    distinct: ['patientId'],
    select: { patientId: true },
  })
  const returnedIds = new Set(returnedInPeriod.map((a) => a.patientId).filter(Boolean) as string[])

  const totalInactive = inactiveIds.size
  const totalReturned = returnedIds.size
  const rate = totalInactive > 0 ? Number(((totalReturned / totalInactive) * 100).toFixed(2)) : 0

  return {
    totalInactive,
    totalReturned,
    reactivationRatePercent: rate,
    period: { from: from.toISOString(), to: to.toISOString() },
    inactivityMonths,
  }
}

export async function getLoyaltyRate(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const completedStatuses: AppointmentStatus[] = ['CONFIRMADO', 'FALTOU']

  const totalAppointments = await prisma.appointment.count({
    where: {
      professionalId,
      status: { in: completedStatuses },
      startsAt: { gte: from, lt: to },
    },
  })

  const patientsWith2Plus = await prisma.appointment.groupBy({
    by: ['patientId'],
    where: {
      professionalId,
      status: { in: completedStatuses },
      startsAt: { gte: from, lt: to },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 2 } } },
  })

  const loyalPatients = patientsWith2Plus.length
  const rate = totalAppointments > 0 ? Number(((loyalPatients / totalAppointments) * 100).toFixed(2)) : 0

  return {
    totalConsultations: totalAppointments,
    loyalPatientsCount: loyalPatients,
    loyaltyRatePercent: rate,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}

export async function getRescheduleRate(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const [totalAppointments, rescheduledCount] = await Promise.all([
    prisma.appointment.count({
      where: {
        professionalId,
        startsAt: { gte: from, lt: to },
      },
    }),
    prisma.appointment.count({
      where: {
        professionalId,
        rescheduledFromId: { not: null },
        startsAt: { gte: from, lt: to },
      },
    }),
  ])

  const rate = totalAppointments > 0 ? Number(((rescheduledCount / totalAppointments) * 100).toFixed(2)) : 0

  return {
    totalAppointments,
    rescheduledCount,
    rescheduleRatePercent: rate,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}

export async function getAppointmentsBySchedule(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: ['CONFIRMADO', 'FALTOU'] },
      startsAt: { gte: from, lt: to },
    },
    select: { startsAt: true },
  })

  const bySlot = new Map<string, number>()
  for (const a of appointments) {
    const d = new Date(a.startsAt)
    const weekday = d.getDay()
    const hour = d.getHours()
    const key = `${weekday}-${hour}`
    bySlot.set(key, (bySlot.get(key) ?? 0) + 1)
  }

  const result: ScheduleSlot[] = []
  for (const [key, count] of bySlot) {
    const [wd, hr] = key.split('-').map(Number)
    result.push({
      weekday: wd,
      weekdayLabel: WEEKDAY_LABELS[wd] ?? '',
      hour: hr,
      hourLabel: `${hr}:00`,
      count,
    })
  }
  result.sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday
    return a.hour - b.hour
  })

  return result
}

export async function getInteractionsSummary(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const grouped = await prisma.interaction.groupBy({
    by: ['messageType'],
    where: {
      professionalId,
      createdAt: { gte: from, lt: to },
    },
    _count: { id: true },
  })

  const result: InteractionsByType = {
    BOT: 0,
    HUMANO: 0,
    PACIENTE: 0,
  }
  for (const g of grouped) {
    if (g.messageType in result) {
      result[g.messageType as keyof InteractionsByType] = g._count.id
    }
  }

  const total = Object.values(result).reduce((a, b) => a + b, 0)

  return {
    byType: result,
    total,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}

export async function getPatientsTopInteractions(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)
  const limit = filters.limit ?? config?.topLimit ?? 10

  const grouped = await prisma.interaction.groupBy({
    by: ['patientId'],
    where: {
      professionalId,
      createdAt: { gte: from, lt: to },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  const patientIds = grouped.map((g) => g.patientId).filter(Boolean) as string[]
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, phoneNumber: true },
  })
  const byId = new Map(patients.map((p) => [p.id, p]))

  return grouped
    .filter((g) => g.patientId && g._count)
    .map((g) => {
      const p = byId.get(g.patientId!)
      const count = (g._count as { id: number })?.id ?? 0
      return p ? { ...p, interactionCount: count } : null
    })
    .filter(Boolean) as PatientWithInteractionCount[]
}

export async function getAgendaOccupancy(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const [realized, total] = await Promise.all([
    prisma.appointment.count({
      where: {
        professionalId,
        status: { in: ['CONFIRMADO', 'FALTOU'] },
        startsAt: { gte: from, lt: to },
      },
    }),
    prisma.appointment.count({
      where: {
        professionalId,
        startsAt: { gte: from, lt: to },
      },
    }),
  ])

  const rate = total > 0 ? Number(((realized / total) * 100).toFixed(2)) : 0

  return {
    realizedAppointments: realized,
    totalAppointments: total,
    occupancyRatePercent: rate,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}

export async function getAppointmentsByMode(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const grouped = await prisma.appointment.groupBy({
    by: ['mode'],
    where: {
      professionalId,
      status: { in: ['CONFIRMADO', 'FALTOU'] },
      startsAt: { gte: from, lt: to },
    },
    _count: { id: true },
  })

  const result: AppointmentsByModeResult = {
    PRESENCIAL: 0,
    REMOTO: 0,
  }
  for (const g of grouped) {
    if (g.mode in result) {
      result[g.mode as keyof AppointmentsByModeResult] = g._count.id
    }
  }

  return {
    byMode: result,
    total: result.PRESENCIAL + result.REMOTO,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}

export async function getAverageConsultationMinutes(
  professionalId: string,
  filters: ReportFilters,
  config?: DashboardConfig,
) {
  const { from, to } = parseFilters(filters, config)

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: ['CONFIRMADO', 'FALTOU'] },
      startsAt: { gte: from, lt: to },
    },
    select: { startsAt: true, endsAt: true },
  })

  let totalMs = 0
  let count = 0
  for (const a of appointments) {
    const duration = a.endsAt.getTime() - a.startsAt.getTime()
    if (duration > 0) {
      totalMs += duration
      count++
    }
  }

  const averageMinutes = count > 0 ? Math.round(totalMs / count / (60 * 1000)) : 0

  return {
    averageMinutes,
    appointmentCount: count,
    period: { from: from.toISOString(), to: to.toISOString() },
  }
}
