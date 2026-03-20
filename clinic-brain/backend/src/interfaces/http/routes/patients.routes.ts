import { Router } from 'express'
import { prisma } from '../../../infra/database/prisma/client'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireProfessionalFeature } from '../middlewares/professional-feature.middleware'
import { tenantScopeMiddleware } from '../middlewares/tenant-scope.middleware'
import { validateBody } from '../middlewares/validate-body.middleware'
import { createPatientSchema, updatePatientSchema } from '../schemas/patient.schema'

export const patientsRoutes = Router()

patientsRoutes.use('/patients', authMiddleware, tenantScopeMiddleware, requireProfessionalFeature('patientsEnabled'))

const patientSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  email: true,
  cpf: true,
  notes: true,
  status: true,
  createdAt: true,
} as const

patientsRoutes.get('/patients', async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string

    const patients = await prisma.patient.findMany({
      where: {
        professionalId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: patientSelect,
    })

    return response.status(200).json(patients)
  } catch (error) {
    return next(error)
  }
})

patientsRoutes.post('/patients', validateBody(createPatientSchema), async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const body = request.body as { name: string; phoneNumber: string; email?: string; cpf?: string; notes?: string }

    const patient = await prisma.patient.create({
      data: {
        professionalId,
        name: body.name,
        phoneNumber: String(body.phoneNumber).replace(/\D/g, ''),
        email: body.email || null,
        cpf: body.cpf?.replace(/\D/g, '') || null,
        notes: body.notes || null,
        status: 'ATIVO',
      },
      select: patientSelect,
    })

    return response.status(201).json(patient)
  } catch (error) {
    return next(error)
  }
})

patientsRoutes.patch('/patients/:id', validateBody(updatePatientSchema), async (request, response, next) => {
  try {
    const professionalId = request.professionalId as string
    const patientId = String(request.params.id)
    const body = request.body as Partial<{
      name: string
      phoneNumber: string
      email: string
      cpf: string
      notes: string
      status: 'ATIVO' | 'INATIVO'
    }>

    const patient = await prisma.patient.updateMany({
      where: {
        id: patientId,
        professionalId,
      },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.phoneNumber != null && { phoneNumber: String(body.phoneNumber).replace(/\D/g, '') }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.cpf !== undefined && { cpf: body.cpf?.replace(/\D/g, '') || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.status != null && { status: body.status }),
      },
    })

    if (patient.count === 0) {
      return response.status(404).json({ message: 'Paciente não encontrado' })
    }

    const updated = await prisma.patient.findFirst({
      where: { id: patientId, professionalId },
      select: patientSelect,
    })

    return response.status(200).json(updated)
  } catch (error) {
    return next(error)
  }
})
