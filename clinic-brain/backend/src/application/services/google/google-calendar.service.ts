import { AppointmentMode, AppointmentStatus } from '@prisma/client'
import { google } from 'googleapis'
import { prisma } from '../../../infra/database/prisma/client'
import { AppError } from '../../errors/app-error'
import { getAuthorizedGoogleOAuthClient } from './google-oauth.service'

function resolveMeetingUrl(event: { hangoutLink?: string | null; conferenceData?: { entryPoints?: Array<{ uri?: string | null }> } }): string | null {
  if (event.hangoutLink) {
    return event.hangoutLink
  }

  const entryPoints = event.conferenceData?.entryPoints ?? []
  const video = entryPoints.find((entry) => entry.uri && entry.uri.includes('meet.google.com'))
  return video?.uri ?? null
}

async function fetchAppointmentContext(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      professional: {
        include: {
          settings: true,
        },
      },
      googleEventMapping: true,
    },
  })

  if (!appointment) {
    throw new AppError('Agendamento não encontrado para sincronização Google', 404)
  }

  return appointment
}

export async function upsertGoogleEventForAppointment(appointmentId: string): Promise<void> {
  const appointment = await fetchAppointmentContext(appointmentId)
  const settings = appointment.professional.settings

  if (!settings?.googleCalendarEnabled) {
    return
  }

  if (!appointment.professional.googleConnectedAt || !appointment.professional.googleAccessTokenEnc) {
    throw new AppError('Conta Google não conectada para este profissional', 400)
  }

  if (appointment.status === AppointmentStatus.CANCELADO || appointment.status === AppointmentStatus.REMARCADO) {
    await deleteGoogleEventForAppointment(appointmentId)
    return
  }

  const oauthClient = await getAuthorizedGoogleOAuthClient(appointment.professionalId)
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient })
  const calendarId = appointment.professional.googleCalendarId ?? 'primary'

  const shouldCreateMeet = settings.googleMeetEnabled && appointment.mode === AppointmentMode.REMOTO
  const shouldSendInvite = settings.googleSendInviteToPatient && Boolean(appointment.patient.email)

  const eventBody: Record<string, unknown> = {
    summary: `Consulta - ${appointment.patient.name}`,
    description: appointment.notes
      ? `Consulta ClinicBrain.\n\nObservações: ${appointment.notes}`
      : 'Consulta ClinicBrain.',
    start: {
      dateTime: appointment.startsAt.toISOString(),
      timeZone: appointment.professional.timezone,
    },
    end: {
      dateTime: appointment.endsAt.toISOString(),
      timeZone: appointment.professional.timezone,
    },
  }

  if (shouldSendInvite && appointment.patient.email) {
    eventBody.attendees = [{ email: appointment.patient.email }]
  }

  if (shouldCreateMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `clinicbrain-${appointment.id}`,
      },
    }
  }

  if (appointment.googleEventMapping) {
    const updated = await calendarApi.events.patch({
      calendarId,
      eventId: appointment.googleEventMapping.googleEventId,
      requestBody: eventBody,
      conferenceDataVersion: shouldCreateMeet ? 1 : 0,
      sendUpdates: shouldSendInvite ? 'all' : 'none',
    })

    const meetingUrl = resolveMeetingUrl({
      hangoutLink: updated.data.hangoutLink ?? null,
      conferenceData: updated.data.conferenceData
        ? {
            entryPoints: (updated.data.conferenceData.entryPoints ?? []).map((entry) => ({
              uri: entry.uri ?? null,
            })),
          }
        : undefined,
    })

    await prisma.googleCalendarEventMapping.update({
      where: { appointmentId: appointment.id },
      data: {
        meetingUrl,
      },
    })
    return
  }

  const created = await calendarApi.events.insert({
    calendarId,
    requestBody: eventBody,
    conferenceDataVersion: shouldCreateMeet ? 1 : 0,
    sendUpdates: shouldSendInvite ? 'all' : 'none',
  })

  if (!created.data.id) {
    throw new AppError('Google Calendar não retornou ID do evento criado', 502)
  }

  const meetingUrl = resolveMeetingUrl({
    hangoutLink: created.data.hangoutLink ?? null,
    conferenceData: created.data.conferenceData
      ? {
          entryPoints: (created.data.conferenceData.entryPoints ?? []).map((entry) => ({
            uri: entry.uri ?? null,
          })),
        }
      : undefined,
  })

  await prisma.googleCalendarEventMapping.upsert({
    where: { appointmentId: appointment.id },
    update: {
      googleEventId: created.data.id,
      meetingUrl,
      professionalId: appointment.professionalId,
    },
    create: {
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      googleEventId: created.data.id,
      meetingUrl,
    },
  })
}

export async function deleteGoogleEventForAppointment(appointmentId: string): Promise<void> {
  const appointment = await fetchAppointmentContext(appointmentId)
  const mapping = appointment.googleEventMapping

  if (!mapping) {
    return
  }

  const professional = appointment.professional
  if (!professional.googleConnectedAt || !professional.googleAccessTokenEnc) {
    await prisma.googleCalendarEventMapping.delete({
      where: { appointmentId: appointment.id },
    })
    return
  }

  const oauthClient = await getAuthorizedGoogleOAuthClient(professional.id)
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient })
  const calendarId = professional.googleCalendarId ?? 'primary'

  try {
    await calendarApi.events.delete({
      calendarId,
      eventId: mapping.googleEventId,
      sendUpdates: 'none',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('404')) {
      throw error
    }
  }

  await prisma.googleCalendarEventMapping.delete({
    where: { appointmentId: appointment.id },
  })
}
