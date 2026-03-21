/**
 * Espelha as regras em `backend/.../appointments.routes.ts` (manual + slots).
 * Manter sincronizado ao alterar o backend.
 */
export const AGENDA_SLOT_DURATION_MINUTES = 50
export const AGENDA_SLOT_START_HOUR = 8
/** Hora exclusiva: último início permitido é END - 1 (ex.: 17:00 para slot de 50 min até antes das 18:00). */
export const AGENDA_SLOT_END_HOUR = 18

export function getManualSlotHourOptions(): string[] {
  const out: string[] = []
  for (let h = AGENDA_SLOT_START_HOUR; h < AGENDA_SLOT_END_HOUR; h += 1) {
    out.push(`${String(h).padStart(2, '0')}:00`)
  }
  return out
}

export function getAgendaRulesShortLabel(): string {
  const lastStart = AGENDA_SLOT_END_HOUR - 1
  return `Segunda a sexta, início em hora cheia entre ${String(AGENDA_SLOT_START_HOUR).padStart(2, '0')}:00 e ${String(lastStart).padStart(2, '0')}:00, ${AGENDA_SLOT_DURATION_MINUTES} min por consulta.`
}
