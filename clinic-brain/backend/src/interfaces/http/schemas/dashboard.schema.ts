import { z } from 'zod'
import {
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_REPORT_CONFIG,
  type DashboardConfig,
  type ReportConfig,
} from '../../../application/services/analytics/analytics.types'

const dashboardConfigSchema = z.object({
  inactivityMonths: z.number().int().min(1).max(24).optional(),
  topLimit: z.number().int().min(1).max(100).optional(),
  defaultPeriodDays: z.number().int().min(1).max(365).optional(),
  enabledWidgets: z.array(z.string()).optional(),
  enabledChartTypes: z.array(z.string()).optional(),
})

const reportConfigSchema = z.object({
  defaultPeriodDays: z.number().int().min(1).max(365).optional(),
  inactivityMonthsOptions: z.array(z.number().int().min(1).max(24)).optional(),
  topLimitOptions: z.array(z.number().int().min(1).max(100)).optional(),
  enabledReports: z.array(z.string()).optional(),
})

export const updateDashboardConfigSchema = dashboardConfigSchema.partial()

export const updateReportConfigSchema = reportConfigSchema.partial()

export function normalizeDashboardConfig(input: unknown): DashboardConfig {
  const parsed = dashboardConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { ...DEFAULT_DASHBOARD_CONFIG }
  }
  return {
    ...DEFAULT_DASHBOARD_CONFIG,
    ...parsed.data,
  }
}

export function normalizeReportConfig(input: unknown): ReportConfig {
  const parsed = reportConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { ...DEFAULT_REPORT_CONFIG }
  }
  return {
    ...DEFAULT_REPORT_CONFIG,
    ...parsed.data,
  }
}
