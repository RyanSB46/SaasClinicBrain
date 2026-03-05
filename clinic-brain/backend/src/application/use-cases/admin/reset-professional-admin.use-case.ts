import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'

/**
 * Reseta os dados operacionais do profissional, mantendo:
 * - Profissional (cadastro)
 * - Settings (configurações)
 * - Pacientes
 *
 * Remove:
 * - Agendamentos
 * - Sessões WhatsApp
 * - Bloqueios de disponibilidade
 * - Interações
 */
export async function resetProfessionalAdmin(professionalId: string): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  await prisma.$transaction([
    prisma.interaction.deleteMany({ where: { professionalId } }),
    prisma.whatsappSession.deleteMany({ where: { professionalId } }),
    prisma.professionalAvailabilityBlock.deleteMany({ where: { professionalId } }),
    prisma.appointment.deleteMany({ where: { professionalId } }),
  ])
}
