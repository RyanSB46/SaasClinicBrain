import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import { hashPassword } from '../../../infra/security/password'

type CreateProfessionalAdminInput = {
  name: string
  email: string
  password: string
  phoneNumber?: string
  professionalType?: string
  evolutionInstanceName?: string
  evolutionApiKey?: string
  specialty?: string
  consultationFeeCents?: number
  timezone?: string
}

type CreateProfessionalAdminResult = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

export async function createProfessionalAdmin(
  input: CreateProfessionalAdminInput,
): Promise<CreateProfessionalAdminResult> {
  const existing = await prisma.professional.findUnique({
    where: { email: input.email },
  })

  if (existing) {
    throw new AppError('Email já está em uso por outro profissional', 409)
  }

  if (input.evolutionInstanceName) {
    const existingInstance = await prisma.professional.findUnique({
      where: { evolutionInstanceName: input.evolutionInstanceName },
    })
    if (existingInstance) {
      throw new AppError('Instância Evolution já está em uso por outro profissional', 409)
    }
  }

  const passwordHash = await hashPassword(input.password)

  const professional = await prisma.professional.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phoneNumber: input.phoneNumber,
      professionalType: input.professionalType,
      evolutionInstanceName: input.evolutionInstanceName,
      evolutionApiKey: input.evolutionApiKey,
      specialty: input.specialty,
      consultationFeeCents: input.consultationFeeCents,
      timezone: input.timezone ?? 'America/Sao_Paulo',
    },
  })

  await prisma.settings.create({
    data: {
      professionalId: professional.id,
    },
  })

  return {
    id: professional.id,
    name: professional.name,
    email: professional.email,
    isActive: professional.isActive,
    createdAt: professional.createdAt.toISOString(),
  }
}
