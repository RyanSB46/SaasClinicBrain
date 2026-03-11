/**
 * Parser de intenções do usuário.
 * Pode ser substituído por LLM no futuro.
 */

import type { ChatbotIntent } from './chatbot.types'

function normalizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Identifica a intenção do usuário a partir da mensagem.
 */
export function parseIntent(userInput: string): ChatbotIntent {
  const normalized = normalizeInput(userInput)

  if (normalized === 'menu') return 'MENU'
  if (normalized === 'encerrar' || normalized === 'sair' || normalized === '0') return 'ENCERRAR'

  // Ordem importa: cancelar/remarcar antes de marcar
  if (normalized.includes('cancelar')) return 'CANCELAR'
  if (normalized.includes('remarcar')) return 'REMARCAR'

  if (
    normalized.includes('marcar') ||
    normalized.includes('agendar') ||
    (normalized.includes('consulta') && !normalized.includes('cancelar'))
  ) {
    return 'MARCAR'
  }

  if (
    normalized.includes('doutor') ||
    normalized.includes('doutora') ||
    normalized.includes('atendente') ||
    normalized.includes('humano') ||
    normalized.includes('pessoa') ||
    normalized.includes('falar') ||
    normalized.includes('conversar') ||
    normalized === '4'
  ) {
    return 'FALAR_PROFISSIONAL'
  }

  // Fase 1 - informações (paciente novo)
  if (
    normalized.includes('horario') ||
    normalized.includes('horário') ||
    normalized.includes('atendimento') ||
    normalized.includes('funciona') ||
    normalized.includes('abre') ||
    normalized.includes('fecha')
  ) {
    return 'INFO_HORARIOS'
  }

  if (
    normalized.includes('preco') ||
    normalized.includes('preço') ||
    normalized.includes('valor') ||
    normalized.includes('custa') ||
    normalized.includes('cobr')
  ) {
    return 'INFO_PRECOS'
  }

  if (
    normalized.includes('plano') ||
    normalized.includes('pacote') ||
    normalized.includes('kit') ||
    normalized.includes('consultas')
  ) {
    return 'INFO_PLANOS'
  }

  if (
    normalized.includes('presencial') ||
    normalized.includes('online') ||
    normalized.includes('remoto') ||
    normalized.includes('tipo')
  ) {
    return 'INFO_TIPOS_ATENDIMENTO'
  }

  if (normalized === '1') return 'MARCAR'
  if (normalized === '2') return 'REMARCAR'
  if (normalized === '3') return 'CANCELAR'

  return 'UNKNOWN'
}
