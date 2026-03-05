import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { hashPassword } from '../../../infra/security/password'

type UpdateProfessionalCredentialsInput = {
  professionalId: string
  email?: string
  password?: string
}

export async function updateProfessionalCredentialsAdmin(
  input: UpdateProfessionalCredentialsInput,
): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: input.professionalId },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  const data: { email?: string; passwordHash?: string } = {}

  if (input.email && input.email !== professional.email) {
    const existing = await prisma.professional.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new AppError('Email já está em uso', 409)
    }
    data.email = input.email
  }

  if (input.password && input.password.length >= 8) {
    data.passwordHash = await hashPassword(input.password)
  }

  if (Object.keys(data).length === 0) {
    return
  }

  await prisma.professional.update({
    where: { id: input.professionalId },
    data,
  })
}
