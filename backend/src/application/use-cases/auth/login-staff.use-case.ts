import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { comparePassword } from '../../../infra/security/password'
import { signAccessToken } from '../../../infra/security/jwt'

type LoginStaffInput = {
  email: string
  password: string
}

type LoginStaffResult = {
  accessToken: string
  professional: {
    id: string
    name: string
    email: string
  }
  staff: {
    id: string
    name: string
    email: string
  }
}

export async function loginStaff(input: LoginStaffInput): Promise<LoginStaffResult> {
  const staff = await prisma.professionalStaff.findUnique({
    where: { email: input.email },
    include: { professional: true },
  })

  if (!staff || !staff.isActive) {
    throw new AppError('Email ou senha inválidos', 401)
  }

  if (!staff.professional.isActive) {
    throw new AppError('Profissional vinculado está inativo. Entre em contato com o suporte.', 403)
  }

  const passwordMatches = await comparePassword(input.password, staff.passwordHash)
  if (!passwordMatches) {
    throw new AppError('Email ou senha inválidos', 401)
  }

  const accessToken = signAccessToken({
    sub: staff.id,
    email: staff.email,
    role: 'STAFF',
    professionalId: staff.professionalId,
  })

  return {
    accessToken,
    professional: {
      id: staff.professional.id,
      name: staff.professional.name,
      email: staff.professional.email,
    },
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
    },
  }
}
