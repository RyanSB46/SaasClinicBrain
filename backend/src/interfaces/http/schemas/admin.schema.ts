import { z } from 'zod'

export const createProfessionalAdminSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phoneNumber: z.string().min(8).max(20).optional(),
  professionalType: z.string().max(60).optional(),
  evolutionInstanceName: z.string().max(80).optional(),
  evolutionApiKey: z.string().max(256).optional(),
  specialty: z.string().max(120).optional(),
  consultationFeeCents: z.number().int().min(0).optional(),
  timezone: z.string().max(60).optional(),
})

export const updateProfessionalAdminSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(8).max(20).optional().nullable(),
  professionalType: z.string().max(60).optional().nullable(),
  evolutionInstanceName: z.string().max(80).optional().nullable(),
  evolutionApiKey: z.string().max(256).optional().nullable(),
  specialty: z.string().max(120).optional().nullable(),
  consultationFeeCents: z.number().int().min(0).optional().nullable(),
  timezone: z.string().max(60).optional(),
})

export const updateProfessionalCredentialsAdminSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
})

export const updateProfessionalFeaturesAdminSchema = z.object({
  dashboardEnabled: z.boolean().optional(),
  agendaEnabled: z.boolean().optional(),
  manualActionEnabled: z.boolean().optional(),
  patientsEnabled: z.boolean().optional(),
  reportsEnabled: z.boolean().optional(),
  requestsEnabled: z.boolean().optional(),
  settingsEnabled: z.boolean().optional(),
  patientPortalEnabled: z.boolean().optional(),
  webhookEnabled: z.boolean().optional(),
  googleCalendarEnabled: z.boolean().optional(),
  googleMeetEnabled: z.boolean().optional(),
  googleSendInviteToPatient: z.boolean().optional(),
})

export const toggleProfessionalActiveAdminSchema = z.object({
  isActive: z.boolean(),
})

export const createStaffAdminSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const updateStaffAdminSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  isActive: z.boolean().optional(),
})
