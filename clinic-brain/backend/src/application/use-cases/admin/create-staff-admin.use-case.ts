import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { hashPassword } from '../../../infra/security/password'

type CreateStaffAdminInput = {
  professionalId: string
  name: string
  email: string
  password: string
}

type CreateStaffAdminResult = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

export async function createStaffAdmin(input: CreateStaffAdminInput): Promise<CreateStaffAdminResult> {
  const professional = await prisma.professional.findUnique({
    where: { id: input.professionalId },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  const existing = await prisma.professionalStaff.findUnique({
    where: { email: input.email },
  })

  if (existing) {
    throw new AppError('Email já está em uso por outro funcionário', 409)
  }

  const passwordHash = await hashPassword(input.password)

  const staff = await prisma.professionalStaff.create({
    data: {
      professionalId: input.professionalId,
      name: input.name,
      email: input.email,
      passwordHash,
    },
  })

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
  }
}
