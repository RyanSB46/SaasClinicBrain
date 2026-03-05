import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { hashPassword } from '../../../infra/security/password'

type UpdateStaffAdminInput = {
  professionalId: string
  staffId: string
  name?: string
  email?: string
  password?: string
  isActive?: boolean
}

export async function updateStaffAdmin(input: UpdateStaffAdminInput): Promise<void> {
  const staff = await prisma.professionalStaff.findUnique({
    where: { id: input.staffId },
  })

  if (!staff || staff.professionalId !== input.professionalId) {
    throw new AppError('Funcionário não encontrado', 404)
  }

  if (input.email && input.email !== staff.email) {
    const existing = await prisma.professionalStaff.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new AppError('Email já está em uso', 409)
    }
  }

  const data: Record<string, unknown> = {}
  if (input.name != null) data.name = input.name
  if (input.email != null) data.email = input.email
  if (input.isActive != null) data.isActive = input.isActive
  if (input.password && input.password.length >= 8) {
    data.passwordHash = await hashPassword(input.password)
  }

  if (Object.keys(data).length > 0) {
    await prisma.professionalStaff.update({
      where: { id: input.staffId },
      data,
    })
  }
}
