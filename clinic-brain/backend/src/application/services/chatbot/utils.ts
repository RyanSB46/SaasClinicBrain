/**
 * Utilitários do chatbot.
 * Prepara para substituição futura por LLM/agente.
 */

/**
 * Extrai os dois primeiros nomes para saudação.
 * Exemplo: "Ryan Gosling Senna" → "Ryan Gosling"
 */
export function getFirstTwoNames(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return ''
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1]}`
}
