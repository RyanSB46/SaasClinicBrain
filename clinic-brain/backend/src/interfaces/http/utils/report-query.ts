import type { ReportFilters } from '../../../application/services/analytics/analytics.types'

export function parseDateParam(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null
  }
  const value = new Date(raw)
  if (Number.isNaN(value.getTime())) {
    return null
  }
  return value
}

export function parseReportFiltersFromQuery(query: Record<string, unknown>): ReportFilters {
  const from = parseDateParam(query.from)
  const to = parseDateParam(query.to)

  const limitRaw = query.limit
  const limit =
    typeof limitRaw === 'string' && /^\d+$/.test(limitRaw) ? parseInt(limitRaw, 10) : undefined

  const monthsRaw = query.inactivityMonths
  const inactivityMonths =
    typeof monthsRaw === 'string' && /^\d+$/.test(monthsRaw) ? parseInt(monthsRaw, 10) : undefined

  const minCancellationsRaw = query.minCancellations
  const minCancellations =
    typeof minCancellationsRaw === 'string' && /^\d+$/.test(minCancellationsRaw)
      ? parseInt(minCancellationsRaw, 10)
      : undefined

  const minReschedulesRaw = query.minReschedules
  const minReschedules =
    typeof minReschedulesRaw === 'string' && /^\d+$/.test(minReschedulesRaw)
      ? parseInt(minReschedulesRaw, 10)
      : undefined

  const patientId = typeof query.patientId === 'string' ? query.patientId : undefined
  const patientName = typeof query.patientName === 'string' ? query.patientName : undefined
  const patientStatus =
    query.patientStatus === 'ATIVO' || query.patientStatus === 'INATIVO'
      ? query.patientStatus
      : undefined

  return {
    from: from ?? undefined,
    to: to ?? undefined,
    limit,
    inactivityMonths,
    minCancellations,
    minReschedules,
    patientId,
    patientName,
    patientStatus,
  }
}
