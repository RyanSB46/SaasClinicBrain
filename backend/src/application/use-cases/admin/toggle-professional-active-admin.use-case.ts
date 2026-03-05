import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'

export async function toggleProfessionalActiveAdmin(
  professionalId: string,
  isActive: boolean,
): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  await prisma.professional.update({
    where: { id: professionalId },
    data: { isActive },
  })
}
