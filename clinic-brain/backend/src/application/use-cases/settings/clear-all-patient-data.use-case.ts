import { prisma } from '../../../infra/database/prisma/client'

/**
 * Remove todos os dados relacionados a pacientes do profissional.
 * Útil para simular cenários: paciente novo vs paciente com histórico.
 *
 * Ordem de exclusão respeitando FKs:
 * - GoogleCalendarSyncJob
 * - GoogleCalendarEventMapping
 * - Interaction
 * - Appointment
 * - WhatsappSession
 * - Patient
 */
export async function clearAllPatientData(professionalId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.googleCalendarSyncJob.deleteMany({ where: { professionalId } })
    await tx.googleCalendarEventMapping.deleteMany({ where: { professionalId } })
    await tx.interaction.deleteMany({ where: { professionalId } })
    await tx.appointment.deleteMany({ where: { professionalId } })
    await tx.whatsappSession.deleteMany({ where: { professionalId } })
    await tx.patient.deleteMany({ where: { professionalId } })
  })
}
