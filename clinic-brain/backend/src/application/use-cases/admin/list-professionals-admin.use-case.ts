import { prisma } from '../../../infra/database/prisma/client'

export type ProfessionalListItem = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  patientsCount: number
  appointmentsCount: number
  staffCount: number
}

export async function listProfessionalsAdmin(): Promise<ProfessionalListItem[]> {
  const professionals = await prisma.professional.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          patients: true,
          appointments: true,
          staff: true,
        },
      },
    },
  })

  return professionals.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    patientsCount: p._count.patients,
    appointmentsCount: p._count.appointments,
    staffCount: p._count.staff,
  }))
}
