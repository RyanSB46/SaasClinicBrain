import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Senhas apenas para ambiente de desenvolvimento - NUNCA use em produção
  const passwordHash = await bcrypt.hash('SeedDev@123', 10)
  const adminPasswordHash = await bcrypt.hash('1133557799', 10)

  // Remove admin antigo se existir (migração de credenciais)
  await prisma.adminUser.deleteMany({
    where: { email: 'admin.tecnico@clinicbrain.local' },
  })

  await prisma.adminUser.upsert({
    where: { email: 'ryansb@gmail.com' },
    update: {
      name: 'Admin Técnico',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      name: 'Admin Técnico',
      email: 'ryansb@gmail.com',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  })

  // Remove instância de ana.silva se existir (para Ryan usar "automation")
  await prisma.professional.updateMany({
    where: { email: 'ana.silva@clinicbrain.local' },
    data: { evolutionInstanceName: null },
  })

  // Corrige Settings antigos com "Dra. Ana" ou "Doutora Ana" fixos
  const oldWelcomeSettings = await prisma.settings.findMany({
    where: {
      OR: [
        { welcomeMessage: { contains: 'Dra. Ana' } },
        { welcomeMessage: { contains: 'Doutora Ana' } },
      ],
    },
  })
  for (const s of oldWelcomeSettings) {
    await prisma.settings.update({
      where: { id: s.id },
      data: { welcomeMessage: 'Olá, sou assistente de {{nome}}. Como posso ajudar?' },
    })
  }

  const professional = await prisma.professional.upsert({
    where: { email: 'ryansb@gmail.com' },
    update: {
      name: 'Ryan',
      passwordHash: adminPasswordHash,
      phoneNumber: '5527981017804',
      professionalType: 'PSICÓLOGO',
      evolutionInstanceName: 'automation',
      specialty: 'Psicologia',
      consultationFeeCents: 15000,
      timezone: 'America/Sao_Paulo',
    },
    create: {
      name: 'Ryan',
      email: 'ryansb@gmail.com',
      passwordHash: adminPasswordHash,
      phoneNumber: '5527981017804',
      professionalType: 'PSICÓLOGO',
      evolutionInstanceName: 'automation',
      specialty: 'Psicologia',
      consultationFeeCents: 15000,
      timezone: 'America/Sao_Paulo',
    },
  })

  const patient = await prisma.patient.upsert({
    where: {
      professionalId_phoneNumber: {
        professionalId: professional.id,
        phoneNumber: '5527999990002',
      },
    },
    update: {
      name: 'Paciente Teste',
      status: 'ATIVO',
    },
    create: {
      professionalId: professional.id,
      name: 'Paciente Teste',
      phoneNumber: '5527999990002',
      email: 'paciente.teste@clinicbrain.local',
      firstConsultationAt: new Date(),
      status: 'ATIVO',
    },
  })

  const legacyPatient = await prisma.patient.findFirst({
    where: {
      professionalId: professional.id,
      phoneNumber: '5527999990003',
    },
    select: {
      id: true,
    },
  })

  if (legacyPatient && legacyPatient.id !== patient.id) {
    await prisma.appointment.updateMany({
      where: {
        patientId: legacyPatient.id,
      },
      data: {
        patientId: patient.id,
      },
    })

    await prisma.interaction.updateMany({
      where: {
        patientId: legacyPatient.id,
      },
      data: {
        patientId: patient.id,
      },
    })

    await prisma.whatsappSession.deleteMany({
      where: {
        professionalId: professional.id,
        phoneNumber: '5527999990003',
      },
    })

    await prisma.patient.delete({
      where: {
        id: legacyPatient.id,
      },
    })
  }

  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + 1)
  startsAt.setHours(15, 0, 0, 0)

  const endsAt = new Date(startsAt)
  endsAt.setMinutes(endsAt.getMinutes() + 50)

  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      professionalId: professional.id,
      startsAt,
      endsAt,
    },
  })

  const appointment =
    existingAppointment ??
    (await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        patientId: patient.id,
        startsAt,
        endsAt,
        status: 'AGENDADO',
        notes: 'Consulta inicial de teste',
      },
    }))

  // Corrige Settings antigos com "Dra. Ana" ou "Doutora Ana" em qualquer profissional
  await prisma.settings.updateMany({
    where: {
      OR: [
        { welcomeMessage: { contains: 'Dra. Ana' } },
        { welcomeMessage: { contains: 'Doutora Ana' } },
      ],
    },
    data: {
      welcomeMessage: 'Olá, sou assistente de {{nome}}. Como posso ajudar?',
    },
  })

  await prisma.settings.upsert({
    where: { professionalId: professional.id },
    update: {
      welcomeMessage: 'Olá, sou assistente de {{nome}}. Como posso ajudar?',
      confirmationMessage: 'Você confirma sua consulta?',
      cancellationPolicy: 'Cancelamentos com 24h de antecedência.',
      reminderD1Enabled: true,
      reminder2hEnabled: true,
    },
    create: {
      professionalId: professional.id,
      welcomeMessage: 'Olá, sou assistente de {{nome}}. Como posso ajudar?',
      confirmationMessage: 'Você confirma sua consulta?',
      cancellationPolicy: 'Cancelamentos com 24h de antecedência.',
      reminderD1Enabled: true,
      reminder2hEnabled: true,
    },
  })

  await prisma.whatsappSession.upsert({
    where: {
      professionalId_phoneNumber: {
        professionalId: professional.id,
        phoneNumber: patient.phoneNumber,
      },
    },
    update: {
      currentState: 'INITIAL',
      isActive: true,
      lastMessageAt: new Date(),
    },
    create: {
      professionalId: professional.id,
      phoneNumber: patient.phoneNumber,
      currentState: 'INITIAL',
      isActive: true,
      lastMessageAt: new Date(),
    },
  })

  const existingInteraction = await prisma.interaction.findFirst({
    where: {
      professionalId: professional.id,
      externalMessageId: 'seed-message-001',
    },
  })

  if (!existingInteraction) {
    await prisma.interaction.create({
      data: {
        professionalId: professional.id,
        patientId: patient.id,
        appointmentId: appointment.id,
        messageText: 'Mensagem inicial de teste para validação local.',
        messageType: 'BOT',
        externalMessageId: 'seed-message-001',
      },
    })
  }

  console.log('Seed concluída com dados mínimos.')
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
