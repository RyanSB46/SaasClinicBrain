import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireAdmin } from '../middlewares/admin-auth.middleware'
import { validateBody } from '../middlewares/validate-body.middleware'
import {
  createProfessionalAdminSchema,
  updateProfessionalAdminSchema,
  updateProfessionalCredentialsAdminSchema,
  updateProfessionalFeaturesAdminSchema,
  toggleProfessionalActiveAdminSchema,
  createStaffAdminSchema,
  updateStaffAdminSchema,
} from '../schemas/admin.schema'
import { listProfessionalsAdmin } from '../../../application/use-cases/admin/list-professionals-admin.use-case'
import { createProfessionalAdmin } from '../../../application/use-cases/admin/create-professional-admin.use-case'
import { getProfessionalAdmin } from '../../../application/use-cases/admin/get-professional-admin.use-case'
import { updateProfessionalAdmin } from '../../../application/use-cases/admin/update-professional-admin.use-case'
import { updateProfessionalCredentialsAdmin } from '../../../application/use-cases/admin/update-professional-credentials-admin.use-case'
import { resetProfessionalAdmin } from '../../../application/use-cases/admin/reset-professional-admin.use-case'
import { updateProfessionalFeaturesAdmin } from '../../../application/use-cases/admin/update-professional-features-admin.use-case'
import { toggleProfessionalActiveAdmin } from '../../../application/use-cases/admin/toggle-professional-active-admin.use-case'
import { createStaffAdmin } from '../../../application/use-cases/admin/create-staff-admin.use-case'
import { updateStaffAdmin } from '../../../application/use-cases/admin/update-staff-admin.use-case'
import { deleteStaffAdmin } from '../../../application/use-cases/admin/delete-staff-admin.use-case'

export const adminRoutes = Router()

adminRoutes.use(authMiddleware, requireAdmin)

adminRoutes.get('/professionals', async (request, response, next) => {
  try {
    const list = await listProfessionalsAdmin()
    return response.json(list)
  } catch (error) {
    return next(error)
  }
})

adminRoutes.post(
  '/professionals',
  validateBody(createProfessionalAdminSchema),
  async (request, response, next) => {
    try {
      const result = await createProfessionalAdmin(request.body)
      return response.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.get('/professionals/:id', async (request, response, next) => {
  try {
    const id = String(request.params.id)
    const result = await getProfessionalAdmin(id)
    return response.json(result)
  } catch (error) {
    return next(error)
  }
})

adminRoutes.patch(
  '/professionals/:id',
  validateBody(updateProfessionalAdminSchema),
  async (request, response, next) => {
    try {
      const id = String(request.params.id)
      await updateProfessionalAdmin({ professionalId: id, ...request.body })
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.patch(
  '/professionals/:id/credentials',
  validateBody(updateProfessionalCredentialsAdminSchema),
  async (request, response, next) => {
    try {
      const id = String(request.params.id)
      await updateProfessionalCredentialsAdmin({ professionalId: id, ...request.body })
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.post('/professionals/:id/reset', async (request, response, next) => {
  try {
    const id = String(request.params.id)
    await resetProfessionalAdmin(id)
    return response.status(204).send()
  } catch (error) {
    return next(error)
  }
})

adminRoutes.patch(
  '/professionals/:id/features',
  validateBody(updateProfessionalFeaturesAdminSchema),
  async (request, response, next) => {
    try {
      const id = String(request.params.id)
      await updateProfessionalFeaturesAdmin({ professionalId: id, features: request.body })
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.patch(
  '/professionals/:id/active',
  validateBody(toggleProfessionalActiveAdminSchema),
  async (request, response, next) => {
    try {
      const id = String(request.params.id)
      const { isActive } = request.body as { isActive: boolean }
      await toggleProfessionalActiveAdmin(id, isActive)
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.post(
  '/professionals/:id/staff',
  validateBody(createStaffAdminSchema),
  async (request, response, next) => {
    try {
      const id = String(request.params.id)
      const result = await createStaffAdmin({ professionalId: id, ...request.body })
      return response.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.patch(
  '/professionals/:professionalId/staff/:staffId',
  validateBody(updateStaffAdminSchema),
  async (request, response, next) => {
    try {
      const professionalId = String(request.params.professionalId)
      const staffId = String(request.params.staffId)
      await updateStaffAdmin({ professionalId, staffId, ...request.body })
      return response.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
)

adminRoutes.delete('/professionals/:professionalId/staff/:staffId', async (request, response, next) => {
  try {
    const professionalId = String(request.params.professionalId)
    const staffId = String(request.params.staffId)
    await deleteStaffAdmin(professionalId, staffId)
    return response.status(204).send()
  } catch (error) {
    return next(error)
  }
})
