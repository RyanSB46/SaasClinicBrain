import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'

export async function deleteStaffAdmin(professionalId: string, staffId: string): Promise<void> {
  const staff = await prisma.professionalStaff.findUnique({
    where: { id: staffId },
  })

  if (!staff || staff.professionalId !== professionalId) {
    throw new AppError('Funcionário não encontrado', 404)
  }

  await prisma.professionalStaff.delete({
    where: { id: staffId },
  })
}
