import { clearAccessToken, getValidAccessToken, notifySessionExpired } from '../../shared/auth/token-storage'

export type AuthLoginResult = {
  accessToken: string
  professional: {
    id: string
    name: string
    email: string
  }
}

export type AdminLoginResult = {
  accessToken: string
  admin: {
    id: string
    name: string
    email: string
  }
}

export type DashboardOverview = {
  totalPatients: number
  activePatients: number
  monthAppointments: number
  upcomingAppointments: number
  canceledAppointments: number
  config?: { inactivityMonths?: number; topLimit?: number; defaultPeriodDays?: number }
  patientsInactive?: Array<{
    id: string
    name: string
    phoneNumber: string
    status: 'ATIVO' | 'INATIVO'
    lastConsultationAt: string | null
    daysSinceLastConsultation: number | null
  }>
  patientsInactiveCount?: number
  patientsTopConsultations?: Array<{ id: string; name: string; phoneNumber: string; consultationCount: number }>
  patientsNew?: Array<{
    id: string
    name: string
    phoneNumber: string
    firstConsultationAt: string | null
    createdAt: string
  }>
  patientsNewCount?: number
  reactivationRate?: {
    totalInactive: number
    totalReturned: number
    reactivationRatePercent: number
    period: { from: string; to: string }
    inactivityMonths: number
  }
  loyaltyRate?: {
    totalConsultations: number
    loyalPatientsCount: number
    loyaltyRatePercent: number
    period: { from: string; to: string }
  }
  rescheduleRate?: {
    totalAppointments: number
    rescheduledCount: number
    rescheduleRatePercent: number
    period: { from: string; to: string }
  }
  interactionsSummary?: {
    byType: { BOT: number; HUMANO: number; PACIENTE: number }
    total: number
    period: { from: string; to: string }
  }
  agendaOccupancy?: {
    realizedAppointments: number
    totalAppointments: number
    occupancyRatePercent: number
    period: { from: string; to: string }
  }
  appointmentsByMode?: {
    byMode: { PRESENCIAL: number; REMOTO: number }
    total: number
    period: { from: string; to: string }
  }
  averageConsultationMinutes?: {
    averageMinutes: number
    appointmentCount: number
    period: { from: string; to: string }
  }
  period?: { from: string; to: string }
}

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

export type ReportFiltersParams = {
  from?: string
  to?: string
  limit?: number
  inactivityMonths?: number
  minCancellations?: number
  minReschedules?: number
}

export type AppointmentListItem = {
  id: string
  patientId: string
  startsAt: string
  endsAt: string
  mode: 'PRESENCIAL' | 'REMOTO'
  meetingUrl?: string | null
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
  notes?: string | null
  createdAt: string
  updatedAt: string
  rescheduledFromId?: string | null
  rescheduledFrom?: {
    id: string
    startsAt: string
    endsAt: string
    createdAt: string
  } | null
  rescheduledTo: Array<{
    id: string
    startsAt: string
    endsAt: string
    createdAt: string
  }>
  patient: {
    id: string
    name: string
    phoneNumber: string
  }
}

export type PatientListItem = {
  id: string
  name: string
  phoneNumber: string
  email?: string | null
  status: 'ATIVO' | 'INATIVO'
  createdAt: string
}

export type SettingsMessages = {
  welcomeMessage: string
  confirmationMessage: string
  cancellationPolicy: string
  reminderD1Enabled: boolean
  reminder2hEnabled: boolean
}

export type ProfessionalFeatureFlags = {
  dashboardEnabled: boolean
  agendaEnabled: boolean
  manualActionEnabled: boolean
  patientsEnabled: boolean
  reportsEnabled: boolean
  requestsEnabled: boolean
  settingsEnabled: boolean
  patientPortalEnabled: boolean
  webhookEnabled: boolean
  googleCalendarEnabled: boolean
  googleMeetEnabled: boolean
  googleSendInviteToPatient: boolean
}

export const DEFAULT_PROFESSIONAL_FEATURE_FLAGS: ProfessionalFeatureFlags = {
  dashboardEnabled: true,
  agendaEnabled: true,
  manualActionEnabled: true,
  patientsEnabled: true,
  reportsEnabled: true,
  requestsEnabled: true,
  settingsEnabled: true,
  patientPortalEnabled: true,
  webhookEnabled: true,
  googleCalendarEnabled: false,
  googleMeetEnabled: false,
  googleSendInviteToPatient: false,
}

export type MonthlyReport = {
  period: {
    from: string
    to: string
  }
  totalConsultations: number
  confirmed: number
  canceled: number
  missed: number
  attendanceRate: number
  estimatedRevenueCents: number
  activePatients: number
  inactivePatients: number
  summaryByStatus: {
    AGENDADO: number
    CONFIRMADO: number
    CANCELADO: number
    FALTOU: number
    REMARCADO: number
  }
  detailedAppointments: Array<{
    id: string
    startsAt: string
    endsAt: string
    status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
    notes?: string | null
    patient: {
      id: string
      name: string
      phoneNumber: string
    }
  }>
}

export type PendingPatientRequest = {
  id: string
  createdAt: string
  patient: {
    id: string
    name: string
    phoneNumber: string
  } | null
  payload: {
    type: 'BOOK_REQUEST' | 'RESCHEDULE_REQUEST'
    status: 'PENDING_PROFESSIONAL_APPROVAL'
    startsAt?: string
    endsAt?: string
    appointmentId?: string
    currentStartsAt?: string
    currentEndsAt?: string
    requestedStartsAt?: string
    requestedEndsAt?: string
  }
}

export type RecentPatientRequest = {
  id: string
  createdAt: string
  patient: {
    id: string
    name: string
    phoneNumber: string
  } | null
  payload: {
    type: 'BOOK_REQUEST' | 'RESCHEDULE_REQUEST'
    status: 'APPROVED' | 'REJECTED'
    reviewedAt?: string
    reviewReason?: string
    reviewedVia?: 'PANEL' | 'WHATSAPP'
    startsAt?: string
    endsAt?: string
    appointmentId?: string
    currentStartsAt?: string
    currentEndsAt?: string
    requestedStartsAt?: string
    requestedEndsAt?: string
  }
}

export type PatientPortalAuthResult = {
  accessToken: string
  patient: {
    id: string
    name: string
    phoneNumber: string
  }
  professional: {
    id: string
    name: string
    slug: string
  }
}

export type PatientPortalAvailability = {
  month: number
  year: number
  slotDurationMinutes: number
  slotIntervalMinutes: number
  slots: Array<{
    startsAt: string
    endsAt: string
  }>
  slotsByDay: Record<
    string,
    Array<{
      startsAt: string
      endsAt: string
    }>
  >
  availableDays: string[]
}

export type PatientPortalAppointment = {
  id: string
  startsAt: string
  endsAt: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
}

export type ManualAppointmentActionInput = {
  action: 'BOOK' | 'RESCHEDULE' | 'CANCEL'
  appointmentId?: string
  patient: {
    name: string
    phoneNumber: string
    email?: string
  }
  startsAt?: string
  endsAt?: string
  mode?: 'PRESENCIAL' | 'REMOTO'
  reason?: string
  notes?: string
  message?: string
}

export type ManualAppointmentActionResult = {
  action: 'BOOK' | 'RESCHEDULE' | 'CANCEL'
  message: string
  deliveryWarning?: string
  appointmentId?: string
  oldAppointmentId?: string
  newAppointmentId?: string
  status?: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
}

function resolveApiBaseUrl(): string {
  const explicitApiUrl = import.meta.env.VITE_API_URL

  if (explicitApiUrl && explicitApiUrl.trim().length > 0) {
    return explicitApiUrl
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    return `${protocol}://${window.location.hostname}:3000/api`
  }

  return 'http://localhost:3000/api'
}

const apiBaseUrl = resolveApiBaseUrl()

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type AvailabilityBlockItem = {
  id: string
  startsAt: string
  endsAt: string
  reason?: string | null
  createdAt: string
}

export type CreateAvailabilityBlocksInput = {
  fromDate: string
  toDate: string
  startTime: string
  endTime: string
  weekdays?: number[]
  reason?: string
}

async function apiRequest<TResponse>(
  path: string,
  method: RequestMethod,
  body?: Record<string, unknown>,
  requiresAuth = true,
): Promise<TResponse> {
  const token = requiresAuth ? getValidAccessToken() : null
  if (requiresAuth && !token) {
    clearAccessToken()
    notifySessionExpired()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (requiresAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    clearAccessToken()
    notifySessionExpired()
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(data?.message ?? 'Falha ao processar requisição')
    }

    const text = (await response.text().catch(() => '')).trim()
    throw new Error(text || 'Falha ao processar requisição')
  }

  return response.json() as Promise<TResponse>
}

export function login(email: string, password: string) {
  return apiRequest<AuthLoginResult>('/auth/login', 'POST', { email, password }, false)
}

export function loginAdmin(email: string, password: string) {
  return apiRequest<AdminLoginResult>('/auth/admin/login', 'POST', { email, password }, false)
}

export type StaffLoginResult = {
  accessToken: string
  professional: { id: string; name: string; email: string }
  staff: { id: string; name: string; email: string }
}

export function loginStaff(email: string, password: string) {
  return apiRequest<StaffLoginResult>('/auth/staff/login', 'POST', { email, password }, false)
}

// Admin API
export type AdminProfessionalListItem = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  patientsCount: number
  appointmentsCount: number
  staffCount: number
}

export type AdminProfessionalDetail = {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  professionalType: string | null
  evolutionInstanceName: string | null
  specialty: string | null
  consultationFeeCents: number | null
  timezone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  settings: {
    welcomeMessage: string | null
    confirmationMessage: string | null
    cancellationPolicy: string | null
    reminderD1Enabled: boolean
    reminder2hEnabled: boolean
    timezone: string
    features: ProfessionalFeatureFlags
  } | null
  staff: Array<{
    id: string
    name: string
    email: string
    isActive: boolean
    createdAt: string
  }>
  stats: {
    patientsCount: number
    appointmentsCount: number
  }
}

export function fetchAdminProfessionals() {
  return apiRequest<AdminProfessionalListItem[]>('/admin/professionals', 'GET')
}

export function fetchAdminProfessional(id: string) {
  return apiRequest<AdminProfessionalDetail>(`/admin/professionals/${id}`, 'GET')
}

export function createAdminProfessional(input: {
  name: string
  email: string
  password: string
  phoneNumber?: string
  professionalType?: string
  evolutionInstanceName?: string
  evolutionApiKey?: string
  specialty?: string
  consultationFeeCents?: number
  timezone?: string
}) {
  return apiRequest<AdminProfessionalListItem>('/admin/professionals', 'POST', input)
}

async function apiRequestNoContent(
  path: string,
  method: 'PATCH' | 'POST' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<void> {
  const token = getValidAccessToken()
  if (!token) {
    clearAccessToken()
    notifySessionExpired()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401) {
    clearAccessToken()
    notifySessionExpired()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(data?.message ?? 'Falha ao processar requisição')
  }
}

export function updateAdminProfessional(id: string, input: Record<string, unknown>) {
  return apiRequestNoContent(`/admin/professionals/${id}`, 'PATCH', input)
}

export function updateAdminProfessionalCredentials(id: string, input: { email?: string; password?: string }) {
  return apiRequestNoContent(`/admin/professionals/${id}/credentials`, 'PATCH', input)
}

export function resetAdminProfessional(id: string) {
  return apiRequestNoContent(`/admin/professionals/${id}/reset`, 'POST')
}

export function updateAdminProfessionalFeatures(id: string, features: Partial<ProfessionalFeatureFlags>) {
  return apiRequestNoContent(`/admin/professionals/${id}/features`, 'PATCH', features)
}

export function toggleAdminProfessionalActive(id: string, isActive: boolean) {
  return apiRequestNoContent(`/admin/professionals/${id}/active`, 'PATCH', { isActive })
}

export function createAdminStaff(professionalId: string, input: { name: string; email: string; password: string }) {
  return apiRequest<AdminProfessionalDetail['staff'][0]>(
    `/admin/professionals/${professionalId}/staff`,
    'POST',
    input,
  )
}

export function updateAdminStaff(
  professionalId: string,
  staffId: string,
  input: { name?: string; email?: string; password?: string; isActive?: boolean },
) {
  return apiRequestNoContent(
    `/admin/professionals/${professionalId}/staff/${staffId}`,
    'PATCH',
    input,
  )
}

export function deleteAdminStaff(professionalId: string, staffId: string) {
  return apiRequestNoContent(`/admin/professionals/${professionalId}/staff/${staffId}`, 'DELETE')
}

export function fetchDashboardOverview(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<DashboardOverview>(`/dashboard/overview${search ? `?${search}` : ''}`, 'GET')
}

export function fetchDashboardConfig() {
  return apiRequest<DashboardConfig>('/settings/dashboard-config', 'GET')
}

export function updateDashboardConfig(config: Partial<DashboardConfig>) {
  return apiRequest<DashboardConfig>('/settings/dashboard-config', 'PUT', config)
}

export function fetchReportConfig() {
  return apiRequest<ReportConfig>('/settings/report-config', 'GET')
}

export function updateReportConfig(config: Partial<ReportConfig>) {
  return apiRequest<ReportConfig>('/settings/report-config', 'PUT', config)
}

export function fetchPatientsInactive(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{ patients: DashboardOverview['patientsInactive']; period: { from: string; to: string } }>(
    `/reports/patients-inactive${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchPatientsTopConsultations(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    patients: NonNullable<DashboardOverview['patientsTopConsultations']>
    period: { from: string; to: string }
  }>(`/reports/patients-top-consultations${search ? `?${search}` : ''}`, 'GET')
}

export function fetchPatientsCancellations(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    patients: Array<{ id: string; name: string; phoneNumber: string; cancellationCount: number }>
    period: { from: string; to: string }
  }>(`/reports/patients-cancellations${search ? `?${search}` : ''}`, 'GET')
}

export function fetchPatientsReschedules(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    patients: Array<{ id: string; name: string; phoneNumber: string; rescheduleCount: number }>
    period: { from: string; to: string }
  }>(`/reports/patients-reschedules${search ? `?${search}` : ''}`, 'GET')
}

export function fetchPatientsNew(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    patients: NonNullable<DashboardOverview['patientsNew']>
    period: { from: string; to: string }
  }>(`/reports/patients-new${search ? `?${search}` : ''}`, 'GET')
}

export function fetchReactivationRate(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['reactivationRate']>>(
    `/reports/reactivation-rate${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchLoyaltyRate(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['loyaltyRate']>>(
    `/reports/loyalty-rate${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchRescheduleRate(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['rescheduleRate']>>(
    `/reports/reschedule-rate${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchAppointmentsBySchedule(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    slots: Array<{ weekday: number; weekdayLabel: string; hour: number; hourLabel: string; count: number }>
    period: { from: string; to: string }
  }>(`/reports/appointments-by-schedule${search ? `?${search}` : ''}`, 'GET')
}

export function fetchInteractionsReport(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['interactionsSummary']>>(
    `/reports/interactions${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchPatientsTopInteractions(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<{
    patients: Array<{ id: string; name: string; phoneNumber: string; interactionCount: number }>
    period: { from: string; to: string }
  }>(`/reports/patients-top-interactions${search ? `?${search}` : ''}`, 'GET')
}

export function fetchAgendaOccupancy(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['agendaOccupancy']>>(
    `/reports/agenda-occupancy${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchAppointmentsByMode(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['appointmentsByMode']>>(
    `/reports/appointments-by-mode${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchAverageConsultationDuration(params?: ReportFiltersParams) {
  const search = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return apiRequest<NonNullable<DashboardOverview['averageConsultationMinutes']>>(
    `/reports/average-consultation-duration${search ? `?${search}` : ''}`,
    'GET',
  )
}

export function fetchAppointments() {
  return apiRequest<AppointmentListItem[]>('/appointments', 'GET')
}

export function fetchAvailabilityBlocks(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) {
    params.set('from', from)
  }
  if (to) {
    params.set('to', to)
  }

  const query = params.toString()
  return apiRequest<AvailabilityBlockItem[]>(`/appointments/availability-blocks${query ? `?${query}` : ''}`, 'GET')
}

export function createAvailabilityBlocks(input: CreateAvailabilityBlocksInput) {
  return apiRequest<{ message: string; blocks: AvailabilityBlockItem[] }>('/appointments/availability-blocks', 'POST', input)
}

export function deleteAvailabilityBlock(blockId: string) {
  return apiRequest<{ message: string }>(`/appointments/availability-blocks/${blockId}`, 'DELETE')
}

export function executeManualAppointmentAction(input: ManualAppointmentActionInput) {
  return apiRequest<ManualAppointmentActionResult>('/appointments/manual-action', 'POST', input)
}

export function fetchPatients() {
  return apiRequest<PatientListItem[]>('/patients', 'GET')
}

export function createPatient(input: { name: string; phoneNumber: string; email?: string }) {
  return apiRequest<PatientListItem>('/patients', 'POST', input)
}

export function fetchSettingsMessages() {
  return apiRequest<SettingsMessages>('/settings/messages', 'GET')
}

export function fetchSettingsFeatures() {
  return apiRequest<ProfessionalFeatureFlags>('/settings/features', 'GET')
}

export type GoogleIntegrationStatus = {
  connected: boolean
  connectedAt: string | null
  calendarId: string | null
  tokenExpiresAt: string | null
  flags: {
    googleCalendarEnabled: boolean
    googleMeetEnabled: boolean
    googleSendInviteToPatient: boolean
  }
}

export function fetchGoogleIntegrationStatus() {
  return apiRequest<GoogleIntegrationStatus>('/integrations/google/status', 'GET')
}

export function fetchGoogleConnectUrl() {
  return apiRequest<{ connectUrl: string }>('/integrations/google/connect', 'GET')
}

export function disconnectGoogleIntegration() {
  return apiRequestNoContent('/integrations/google/disconnect', 'POST')
}

export function clearAllPatientData(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/settings/clear-patients-data', 'POST', {})
}

export function updateSettingsMessages(input: {
  welcomeMessage: string
  confirmationMessage: string
  cancellationPolicy: string
}) {
  return apiRequest<SettingsMessages>('/settings/messages', 'PUT', input)
}

export function updateSettingsFeatures(input: Partial<ProfessionalFeatureFlags>) {
  return apiRequest<ProfessionalFeatureFlags>('/settings/features', 'PUT', input)
}

export function fetchMonthlyReport(from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return apiRequest<MonthlyReport>(`/reports/monthly?${query.toString()}`, 'GET')
}

export function fetchPendingPatientRequests() {
  return apiRequest<PendingPatientRequest[]>('/patient-requests/pending', 'GET')
}

export function fetchRecentPatientRequests() {
  return apiRequest<RecentPatientRequest[]>('/patient-requests/recent', 'GET')
}

/** Inscreve em atualizações em tempo real das solicitações. Chama onUpdate quando houver mudança. Retorna função para cancelar. */
export function subscribeToPatientRequestsStream(onUpdate: () => void): () => void {
  const token = getValidAccessToken()
  if (!token) return () => {}

  const url = `${resolveApiBaseUrl()}/patient-requests/stream`
  const controller = new AbortController()

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) onUpdate()
        }
      }
    })
    .catch(() => {})

  return () => controller.abort()
}

export function reviewPatientRequest(input: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) {
  return apiRequest<{ requestId: string; status: 'APPROVED' | 'REJECTED'; deliveryWarning?: string }>(
    `/patient-requests/${input.id}/review`,
    'POST',
    {
      action: input.action,
      reason: input.reason,
    },
  )
}

async function patientPortalRequest<TResponse>(
  path: string,
  method: RequestMethod,
  body?: Record<string, unknown>,
  accessToken?: string,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    throw new Error('Sessão expirada no portal. Solicite um novo código de acesso.')
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(data?.message ?? 'Falha ao processar requisição')
    }

    const text = (await response.text().catch(() => '')).trim()
    throw new Error(text || 'Falha ao processar requisição')
  }

  return response.json() as Promise<TResponse>
}

export function requestPatientOtpCode(input: {
  professionalSlug: string
  fullName: string
  phoneNumber: string
}) {
  return patientPortalRequest<{ message: string; expiresInSeconds: number; devCode?: string; deliveryWarning?: string }>(
    '/public/patients/auth/request-code',
    'POST',
    input,
  )
}

export function verifyPatientOtpCode(input: {
  professionalSlug: string
  phoneNumber: string
  code: string
}) {
  return patientPortalRequest<PatientPortalAuthResult>('/public/patients/auth/verify-code', 'POST', input)
}

export function fetchPatientPortalAvailability(accessToken: string, month: number, year: number) {
  return patientPortalRequest<PatientPortalAvailability>(
    `/public/patients/availability?month=${month}&year=${year}`,
    'GET',
    undefined,
    accessToken,
  )
}

export function fetchPatientPortalAppointments(accessToken: string) {
  return patientPortalRequest<PatientPortalAppointment[]>('/public/patients/appointments', 'GET', undefined, accessToken)
}

export function createPatientBooking(
  accessToken: string,
  input: {
    startsAt: string
    endsAt: string
    mode?: 'PRESENCIAL' | 'REMOTO'
  },
) {
  return patientPortalRequest<{ message: string; appointmentId: string }>('/public/patients/bookings', 'POST', input, accessToken)
}

export function reschedulePatientActiveAppointment(
  accessToken: string,
  input: {
    startsAt: string
    endsAt: string
  },
) {
  return patientPortalRequest<{ message: string; requestId: string; deliveryWarning?: string }>(
    '/public/patients/reschedule-active',
    'POST',
    input,
    accessToken,
  )
}

export function cancelPatientAppointment(
  accessToken: string,
  input: {
    appointmentId: string
    reason?: string
  },
) {
  return patientPortalRequest<{
    appointmentId: string
    status: 'CANCELADO'
    message: string
    deliveryWarning?: string
  }>('/public/patients/cancel-appointment', 'POST', input, accessToken)
}
