import type { AppointmentMode, AppointmentStatus, PatientStatus } from '@prisma/client'

export type DashboardConfig = {
  inactivityMonths?: number
  topLimit?: number
  defaultPeriodDays?: number
  enabledWidgets?: string[]
}

export type ReportConfig = {
  defaultPeriodDays?: number
  inactivityMonthsOptions?: number[]
  topLimitOptions?: number[]
  enabledReports?: string[]
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  inactivityMonths: 2,
  topLimit: 10,
  defaultPeriodDays: 30,
  enabledWidgets: [
    'totalPatients',
    'activePatients',
    'monthAppointments',
    'upcomingAppointments',
    'canceledAppointments',
    'patientsInactive',
    'patientsTopConsultations',
    'patientsNew',
    'reactivationRate',
    'loyaltyRate',
    'rescheduleRate',
    'interactionsSummary',
    'agendaOccupancy',
    'appointmentsByMode',
    'averageConsultationMinutes',
  ],
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  defaultPeriodDays: 30,
  inactivityMonthsOptions: [1, 2, 3, 5, 6, 12],
  topLimitOptions: [5, 10, 20, 50],
  enabledReports: [
    'patientsInactive',
    'patientsTopConsultations',
    'patientsCancellations',
    'patientsReschedules',
    'patientsNew',
    'reactivationRate',
    'loyaltyRate',
    'rescheduleRate',
    'appointmentsBySchedule',
    'interactions',
    'patientsTopInteractions',
    'agendaOccupancy',
    'appointmentsByMode',
    'averageConsultationDuration',
  ],
}

export type ReportFilters = {
  from?: Date
  to?: Date
  patientId?: string
  patientName?: string
  patientStatus?: PatientStatus
  limit?: number
  inactivityMonths?: number
  minCancellations?: number
  minReschedules?: number
}

export type PatientWithLastConsultation = {
  id: string
  name: string
  phoneNumber: string
  status: PatientStatus
  lastConsultationAt: string | null
  daysSinceLastConsultation: number | null
}

export type PatientWithConsultationCount = {
  id: string
  name: string
  phoneNumber: string
  consultationCount: number
}

export type PatientWithCancellationCount = {
  id: string
  name: string
  phoneNumber: string
  cancellationCount: number
}

export type PatientWithRescheduleCount = {
  id: string
  name: string
  phoneNumber: string
  rescheduleCount: number
}

export type PatientNewItem = {
  id: string
  name: string
  phoneNumber: string
  firstConsultationAt: string | null
  createdAt: string
}

export type PatientWithInteractionCount = {
  id: string
  name: string
  phoneNumber: string
  interactionCount: number
}

export type ScheduleSlot = {
  weekday: number
  weekdayLabel: string
  hour: number
  hourLabel: string
  count: number
}

export type InteractionsByType = {
  BOT: number
  HUMANO: number
  PACIENTE: number
}

export type AppointmentsByModeResult = {
  PRESENCIAL: number
  REMOTO: number
}
