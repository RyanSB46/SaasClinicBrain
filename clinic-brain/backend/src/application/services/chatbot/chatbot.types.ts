/**
 * Tipos do chatbot.
 * Arquitetura modular preparada para upgrade com IA.
 */

export type ChatbotConversationState =
  | 'INITIAL'
  | 'NEW_PATIENT_INITIAL'
  | 'NEW_PATIENT_ACTIVE'
  | 'MAIN_MENU'
  | 'SERVICES_MENU'
  | 'ATTENDANT'
  | 'CLOSED'

export type ChatbotIntent =
  | 'MARCAR'
  | 'REMARCAR'
  | 'CANCELAR'
  | 'FALAR_PROFISSIONAL'
  | 'MENU'
  | 'INFO_HORARIOS'
  | 'INFO_PRECOS'
  | 'INFO_PLANOS'
  | 'INFO_TIPOS_ATENDIMENTO'
  | 'ENCERRAR'
  | 'UNKNOWN'

export type PatientType = 'NEW' | 'EXISTING'

export type ChatbotMetadata = {
  lastUnsupportedMessageAt?: string // ISO
  lastNoContextAt?: string
  lastLinksSentAt?: string
  lastProfessionalHandoffAt?: string
}

export type RulesEngineInput = {
  intent: ChatbotIntent
  currentState: ChatbotConversationState
  patientType: PatientType
  patientName?: string // dois primeiros nomes para saudação
  professionalName: string
  bookingUrl: string
  isNewDay: boolean
  hoursSinceProfessionalHandoff?: number
  metadata: ChatbotMetadata
}

export type RulesEngineOutput = {
  responseMessage: string
  nextState: ChatbotConversationState
  shouldEnd: boolean
  shouldStaySilent: boolean
  updateMetadata?: Partial<ChatbotMetadata>
}
