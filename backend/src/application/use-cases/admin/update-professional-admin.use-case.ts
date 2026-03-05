import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'

type UpdateProfessionalAdminInput = {
  professionalId: string
  name?: string
  email?: string
  phoneNumber?: string
  professionalType?: string
  evolutionInstanceName?: string
  evolutionApiKey?: string
  specialty?: string
  consultationFeeCents?: number
  timezone?: string
}

export async function updateProfessionalAdmin(input: UpdateProfessionalAdminInput): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: input.professionalId },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  if (input.email && input.email !== professional.email) {
    const existing = await prisma.professional.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new AppError('Email já está em uso', 409)
    }
  }

  if (input.evolutionInstanceName && input.evolutionInstanceName !== professional.evolutionInstanceName) {
    const existing = await prisma.professional.findUnique({
      where: { evolutionInstanceName: input.evolutionInstanceName },
    })
    if (existing) {
      throw new AppError('Instância Evolution já está em uso', 409)
    }
  }

  await prisma.professional.update({
    where: { id: input.professionalId },
    data: {
      ...(input.name != null && { name: input.name }),
      ...(input.email != null && { email: input.email }),
      ...(input.phoneNumber != null && { phoneNumber: input.phoneNumber }),
      ...(input.professionalType != null && { professionalType: input.professionalType }),
      ...(input.evolutionInstanceName != null && { evolutionInstanceName: input.evolutionInstanceName }),
      ...(input.evolutionApiKey != null && { evolutionApiKey: input.evolutionApiKey }),
      ...(input.specialty != null && { specialty: input.specialty }),
      ...(input.consultationFeeCents != null && { consultationFeeCents: input.consultationFeeCents }),
      ...(input.timezone != null && { timezone: input.timezone }),
    },
  })
}
