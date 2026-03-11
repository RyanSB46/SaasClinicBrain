export type ProfessionalFeatureKey =
  | 'dashboardEnabled'
  | 'agendaEnabled'
  | 'manualActionEnabled'
  | 'patientsEnabled'
  | 'reportsEnabled'
  | 'requestsEnabled'
  | 'settingsEnabled'
  | 'patientPortalEnabled'
  | 'webhookEnabled'
  | 'googleCalendarEnabled'
  | 'googleMeetEnabled'
  | 'googleSendInviteToPatient'

export type ProfessionalFeatureFlags = Record<ProfessionalFeatureKey, boolean>

/** Template padrão para mensagem de boas-vindas. Use {{nome}} para o nome do profissional. */
export const DEFAULT_WELCOME_MESSAGE_TEMPLATE =
  'Olá, sou assistente de {{nome}}. Como posso ajudar?'

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

export const PROFESSIONAL_FEATURE_FLAGS_SELECT = {
  dashboardEnabled: true,
  agendaEnabled: true,
  manualActionEnabled: true,
  patientsEnabled: true,
  reportsEnabled: true,
  requestsEnabled: true,
  settingsEnabled: true,
  patientPortalEnabled: true,
  webhookEnabled: true,
  googleCalendarEnabled: true,
  googleMeetEnabled: true,
  googleSendInviteToPatient: true,
} as const

export function normalizeProfessionalFeatureFlags(
  input?: Partial<ProfessionalFeatureFlags> | null,
): ProfessionalFeatureFlags {
  return {
    dashboardEnabled: input?.dashboardEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.dashboardEnabled,
    agendaEnabled: input?.agendaEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.agendaEnabled,
    manualActionEnabled: input?.manualActionEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.manualActionEnabled,
    patientsEnabled: input?.patientsEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.patientsEnabled,
    reportsEnabled: input?.reportsEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.reportsEnabled,
    requestsEnabled: input?.requestsEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.requestsEnabled,
    settingsEnabled: input?.settingsEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.settingsEnabled,
    patientPortalEnabled: input?.patientPortalEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.patientPortalEnabled,
    webhookEnabled: input?.webhookEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.webhookEnabled,
    googleCalendarEnabled:
      input?.googleCalendarEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.googleCalendarEnabled,
    googleMeetEnabled: input?.googleMeetEnabled ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.googleMeetEnabled,
    googleSendInviteToPatient:
      input?.googleSendInviteToPatient ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS.googleSendInviteToPatient,
  }
}
