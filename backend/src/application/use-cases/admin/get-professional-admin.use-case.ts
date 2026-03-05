import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import type { ProfessionalFeatureFlags } from '../../../interfaces/http/features/professional-features'
import {
  DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
  normalizeProfessionalFeatureFlags,
} from '../../../interfaces/http/features/professional-features'

export type ProfessionalDetailAdmin = {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  professionalType: string | null
  evolutionInstanceName: string | null
  specialty: string | null
  consultationFeeCents: number | null
  timezone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  settings: {
    welcomeMessage: string | null
    confirmationMessage: string | null
    cancellationPolicy: string | null
    reminderD1Enabled: boolean
    reminder2hEnabled: boolean
    timezone: string
    features: ProfessionalFeatureFlags
  } | null
  staff: Array<{
    id: string
    name: string
    email: string
    isActive: boolean
    createdAt: string
  }>
  stats: {
    patientsCount: number
    appointmentsCount: number
  }
}

export async function getProfessionalAdmin(professionalId: string): Promise<ProfessionalDetailAdmin> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: {
      settings: true,
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          patients: true,
          appointments: true,
        },
      },
    },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  const features = professional.settings
    ? normalizeProfessionalFeatureFlags(professional.settings)
    : DEFAULT_PROFESSIONAL_FEATURE_FLAGS

  return {
    id: professional.id,
    name: professional.name,
    email: professional.email,
    phoneNumber: professional.phoneNumber,
    professionalType: professional.professionalType,
    evolutionInstanceName: professional.evolutionInstanceName,
    specialty: professional.specialty,
    consultationFeeCents: professional.consultationFeeCents,
    timezone: professional.timezone,
    isActive: professional.isActive,
    createdAt: professional.createdAt.toISOString(),
    updatedAt: professional.updatedAt.toISOString(),
    settings: professional.settings
      ? {
          welcomeMessage: professional.settings.welcomeMessage,
          confirmationMessage: professional.settings.confirmationMessage,
          cancellationPolicy: professional.settings.cancellationPolicy,
          reminderD1Enabled: professional.settings.reminderD1Enabled,
          reminder2hEnabled: professional.settings.reminder2hEnabled,
          timezone: professional.settings.timezone,
          features,
        }
      : null,
    staff: professional.staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
    })),
    stats: {
      patientsCount: professional._count.patients,
      appointmentsCount: professional._count.appointments,
    },
  }
}
