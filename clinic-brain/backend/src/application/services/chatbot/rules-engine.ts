/**
 * Motor de regras do chatbot.
 * Lógica de negócio isolada para fácil substituição por IA futura.
 */

import type {
  ChatbotConversationState,
  ChatbotIntent,
  RulesEngineInput,
  RulesEngineOutput,
} from './chatbot.types'

const MSG_UNSUPPORTED =
  'No momento consigo responder apenas mensagens de texto.'
const MSG_NO_CONTEXT = 'Desculpe, não consegui entender sua solicitação.'
const MSG_PROFESSIONAL_IN_CONSULT =
  'O profissional está em atendimento no momento.'
const MSG_PROFESSIONAL_BUSY =
  'O profissional pode estar ocupado com outras atividades.'

function mainMenuMessage(professionalName: string, patientName?: string): string {
  const greeting = patientName
    ? `Olá ${patientName}, tudo bem?`
    : 'Olá! Como posso ajudar?'
  return [
    greeting,
    'Escolha uma opção:',
    '1️⃣ Marcar consulta',
    '2️⃣ Remarcar consulta',
    '3️⃣ Cancelar consulta',
    '4️⃣ Falar com o profissional',
    '0️⃣ Encerrar conversa',
  ].join('\n')
}

function newPatientGreeting(professionalName: string): string {
  return [
    `Olá! Seja bem-vindo ao atendimento da Dra. ${professionalName}.`,
    'Ela pode estar em atendimento no momento, mas estou aqui para ajudar com algumas informações.',
    'O que você gostaria de saber?',
  ].join('\n')
}

function bookingLinkMessage(
  action: 'marcar' | 'remarcar' | 'cancelar',
  bookingUrl: string,
): string {
  const actionLabel = action === 'marcar' ? 'marcar' : action === 'remarcar' ? 'remarcar' : 'cancelar'
  return `Para ${actionLabel} consulta, utilize o link abaixo:\n${bookingUrl}`
}

function infoHorariosResponse(): string {
  return 'Os horários de atendimento podem variar. Entre em contato para mais detalhes ou acesse o link de agendamento para ver a disponibilidade em tempo real.'
}

function infoPrecosResponse(): string {
  return 'Os valores são definidos pela profissional. Exemplo: consulta individual R$150, plano com 5 consultas R$550 (R$110 cada). Consulte o link de agendamento para valores atualizados.'
}

function infoPlanosResponse(): string {
  return 'Temos planos de consultas disponíveis. Por exemplo: 5 consultas por R$550 (cada consulta sai por R$110). Acesse o link de agendamento para mais opções.'
}

function infoTiposAtendimentoResponse(): string {
  return 'O atendimento pode ser presencial ou remoto, conforme disponibilidade. Verifique as opções no link de agendamento.'
}

/**
 * Executa o motor de regras e retorna a resposta apropriada.
 */
export function runRulesEngine(
  input: RulesEngineInput,
  professionalInConsult?: boolean,
): RulesEngineOutput {
  const { intent, patientType, isNewDay } = input

  // Reset por dia: sempre volta ao início
  if (isNewDay) {
    if (patientType === 'NEW') {
      return {
        responseMessage: newPatientGreeting(input.professionalName),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    return {
      responseMessage: mainMenuMessage(
        input.professionalName,
        input.patientName,
      ),
      nextState: 'MAIN_MENU',
      shouldEnd: false,
      shouldStaySilent: false,
    }
  }

  // Paciente novo - fluxo inicial
  if (input.currentState === 'INITIAL' || input.currentState === 'NEW_PATIENT_INITIAL') {
    if (patientType === 'NEW') {
      return {
        responseMessage: newPatientGreeting(input.professionalName),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    return {
      responseMessage: mainMenuMessage(
        input.professionalName,
        input.patientName,
      ),
      nextState: 'MAIN_MENU',
      shouldEnd: false,
      shouldStaySilent: false,
    }
  }

  // NEW_PATIENT_ACTIVE - Fase 1 (info) e Fase 2 (transferir)
  if (input.currentState === 'NEW_PATIENT_ACTIVE') {
    if (intent === 'INFO_HORARIOS') {
      return {
        responseMessage: infoHorariosResponse(),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'INFO_PRECOS') {
      return {
        responseMessage: infoPrecosResponse(),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'INFO_PLANOS') {
      return {
        responseMessage: infoPlanosResponse(),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'INFO_TIPOS_ATENDIMENTO') {
      return {
        responseMessage: infoTiposAtendimentoResponse(),
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'FALAR_PROFISSIONAL' || intent === 'MARCAR') {
      const statusMsg =
        professionalInConsult === true
          ? MSG_PROFESSIONAL_IN_CONSULT
          : MSG_PROFESSIONAL_BUSY
      return {
        responseMessage: `O profissional foi avisado e responderá assim que estiver disponível.\n${statusMsg}`,
        nextState: 'ATTENDANT',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastProfessionalHandoffAt: new Date().toISOString() },
      }
    }
    if (intent === 'UNKNOWN') {
      if (input.metadata.lastNoContextAt) {
        return {
          responseMessage: '',
          nextState: 'NEW_PATIENT_ACTIVE',
          shouldEnd: false,
          shouldStaySilent: true,
        }
      }
      return {
        responseMessage: MSG_NO_CONTEXT,
        nextState: 'NEW_PATIENT_ACTIVE',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastNoContextAt: new Date().toISOString() },
      }
    }
  }

  // MAIN_MENU - paciente existente
  if (input.currentState === 'MAIN_MENU') {
    if (intent === 'MENU') {
      return {
        responseMessage: mainMenuMessage(
          input.professionalName,
          input.patientName,
        ),
        nextState: 'MAIN_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'MARCAR') {
      return {
        responseMessage: bookingLinkMessage('marcar', input.bookingUrl),
        nextState: 'SERVICES_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastLinksSentAt: new Date().toISOString() },
      }
    }
    if (intent === 'REMARCAR') {
      return {
        responseMessage: bookingLinkMessage('remarcar', input.bookingUrl),
        nextState: 'SERVICES_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastLinksSentAt: new Date().toISOString() },
      }
    }
    if (intent === 'CANCELAR') {
      return {
        responseMessage: bookingLinkMessage('cancelar', input.bookingUrl),
        nextState: 'SERVICES_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastLinksSentAt: new Date().toISOString() },
      }
    }
    if (intent === 'FALAR_PROFISSIONAL') {
      const statusMsg =
        professionalInConsult === true
          ? MSG_PROFESSIONAL_IN_CONSULT
          : MSG_PROFESSIONAL_BUSY
      return {
        responseMessage: `Perfeito. O profissional foi avisado e responderá assim que estiver disponível.\n${statusMsg}`,
        nextState: 'ATTENDANT',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastProfessionalHandoffAt: new Date().toISOString() },
      }
    }
    if (intent === 'ENCERRAR') {
      return {
        responseMessage: 'Conversa encerrada. Envie "menu" quando quiser retomar.',
        nextState: 'CLOSED',
        shouldEnd: true,
        shouldStaySilent: false,
      }
    }
    if (intent === 'UNKNOWN') {
      if (input.metadata.lastNoContextAt) {
        return {
          responseMessage: '',
          nextState: 'MAIN_MENU',
          shouldEnd: false,
          shouldStaySilent: true,
        }
      }
      return {
        responseMessage: `${MSG_NO_CONTEXT}\n\n${mainMenuMessage(input.professionalName, input.patientName)}`,
        nextState: 'MAIN_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastNoContextAt: new Date().toISOString() },
      }
    }
  }

  // SERVICES_MENU - link já enviado, não insistir em mensagens seguintes
  if (input.currentState === 'SERVICES_MENU') {
    if (input.metadata.lastLinksSentAt && intent === 'UNKNOWN') {
      return {
        responseMessage: '',
        nextState: 'SERVICES_MENU',
        shouldEnd: false,
        shouldStaySilent: true,
      }
    }
    if (intent === 'MENU') {
      return {
        responseMessage: mainMenuMessage(
          input.professionalName,
          input.patientName,
        ),
        nextState: 'MAIN_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    if (intent === 'FALAR_PROFISSIONAL') {
      const statusMsg =
        professionalInConsult === true
          ? MSG_PROFESSIONAL_IN_CONSULT
          : MSG_PROFESSIONAL_BUSY
      return {
        responseMessage: `O profissional foi avisado. ${statusMsg}`,
        nextState: 'ATTENDANT',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastProfessionalHandoffAt: new Date().toISOString() },
      }
    }
    if (intent === 'MARCAR' || intent === 'REMARCAR' || intent === 'CANCELAR') {
      const action =
        intent === 'MARCAR'
          ? 'marcar'
          : intent === 'REMARCAR'
            ? 'remarcar'
            : 'cancelar'
      return {
        responseMessage: bookingLinkMessage(action, input.bookingUrl),
        nextState: 'SERVICES_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
        updateMetadata: { lastLinksSentAt: new Date().toISOString() },
      }
    }
    return {
      responseMessage: '',
      nextState: 'SERVICES_MENU',
      shouldEnd: false,
      shouldStaySilent: true,
    }
  }

  // ATTENDANT - aguardando profissional
  if (input.currentState === 'ATTENDANT') {
    const hoursSince = input.hoursSinceProfessionalHandoff ?? 0

    if (intent === 'MENU') {
      return {
        responseMessage: mainMenuMessage(
          input.professionalName,
          input.patientName,
        ),
        nextState: 'MAIN_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }

    if (hoursSince >= 2 && intent === 'UNKNOWN') {
      return {
        responseMessage:
          'Como posso ajudar novamente?\n• Falar com o profissional (mesmo ou outro assunto)\n• Marcar/remarcar/cancelar consulta (digite MENU)',
        nextState: 'ATTENDANT',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }

    if (hoursSince < 2 && (intent === 'MARCAR' || intent === 'REMARCAR' || intent === 'CANCELAR')) {
      return {
        responseMessage: 'Digite MENU para voltar ao menu principal e escolher outra opção.',
        nextState: 'ATTENDANT',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }

    return {
      responseMessage: `Recebi sua mensagem e encaminhei para ${input.professionalName}. Envie "menu" para voltar ao menu principal.`,
      nextState: 'ATTENDANT',
      shouldEnd: false,
      shouldStaySilent: false,
    }
  }

  // CLOSED
  if (input.currentState === 'CLOSED') {
    if (intent === 'MENU' || intent === 'UNKNOWN') {
      return {
        responseMessage: mainMenuMessage(
          input.professionalName,
          input.patientName,
        ),
        nextState: 'MAIN_MENU',
        shouldEnd: false,
        shouldStaySilent: false,
      }
    }
    return {
      responseMessage: 'Conversa encerrada. Envie "menu" quando quiser retomar.',
      nextState: 'CLOSED',
      shouldEnd: true,
      shouldStaySilent: false,
    }
  }

  return {
    responseMessage: mainMenuMessage(
      input.professionalName,
      input.patientName,
    ),
    nextState: 'MAIN_MENU',
    shouldEnd: false,
    shouldStaySilent: false,
  }
}
