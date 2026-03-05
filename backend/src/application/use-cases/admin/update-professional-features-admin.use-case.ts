import { AppError } from '../../errors/app-error'
import { prisma } from '../../../infra/database/prisma/client'
import type { ProfessionalFeatureFlags } from '../../../interfaces/http/features/professional-features'

type UpdateProfessionalFeaturesInput = {
  professionalId: string
  features: Partial<ProfessionalFeatureFlags>
}

export async function updateProfessionalFeaturesAdmin(
  input: UpdateProfessionalFeaturesInput,
): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: input.professionalId },
    include: { settings: true },
  })

  if (!professional) {
    throw new AppError('Profissional não encontrado', 404)
  }

  const settingsData: Record<string, boolean> = {}
  if (input.features.dashboardEnabled != null) settingsData.dashboardEnabled = input.features.dashboardEnabled
  if (input.features.agendaEnabled != null) settingsData.agendaEnabled = input.features.agendaEnabled
  if (input.features.manualActionEnabled != null)
    settingsData.manualActionEnabled = input.features.manualActionEnabled
  if (input.features.patientsEnabled != null) settingsData.patientsEnabled = input.features.patientsEnabled
  if (input.features.reportsEnabled != null) settingsData.reportsEnabled = input.features.reportsEnabled
  if (input.features.requestsEnabled != null) settingsData.requestsEnabled = input.features.requestsEnabled
  if (input.features.settingsEnabled != null) settingsData.settingsEnabled = input.features.settingsEnabled
  if (input.features.patientPortalEnabled != null)
    settingsData.patientPortalEnabled = input.features.patientPortalEnabled
  if (input.features.webhookEnabled != null) settingsData.webhookEnabled = input.features.webhookEnabled
  if (input.features.googleCalendarEnabled != null)
    settingsData.googleCalendarEnabled = input.features.googleCalendarEnabled
  if (input.features.googleMeetEnabled != null) settingsData.googleMeetEnabled = input.features.googleMeetEnabled
  if (input.features.googleSendInviteToPatient != null)
    settingsData.googleSendInviteToPatient = input.features.googleSendInviteToPatient

  if (Object.keys(settingsData).length === 0) {
    return
  }

  if (professional.settings) {
    await prisma.settings.update({
      where: { professionalId: input.professionalId },
      data: settingsData,
    })
  } else {
    await prisma.settings.create({
      data: {
        professionalId: input.professionalId,
        ...settingsData,
      },
    })
  }
}
