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

  // --- Seed Chopper: dados simulados para testes ---
  await seedChopperData(prisma, passwordHash)

  console.log('Seed concluída com dados mínimos.')
}

const CHOPPER_PATIENTS = [
  { name: 'Maria Fernanda Santos', phone: '5527999123001', email: 'maria.fernanda.santos@email-teste.com' },
  { name: 'João Pedro Oliveira', phone: '5527999123002', email: 'joao.pedro.oliveira@email-teste.com' },
  { name: 'Ana Carolina Lima', phone: '5527999123003', email: 'ana.carolina.lima@email-teste.com' },
  { name: 'Carlos Eduardo Souza', phone: '5527999123004', email: 'carlos.eduardo.souza@email-teste.com' },
  { name: 'Fernanda Costa Rodrigues', phone: '5527999123005', email: 'fernanda.costa.rodrigues@email-teste.com' },
  { name: 'Ricardo Almeida Pereira', phone: '5527999123006', email: 'ricardo.almeida.pereira@email-teste.com' },
  { name: 'Juliana Martins Ferreira', phone: '5527999123007', email: 'juliana.martins.ferreira@email-teste.com' },
  { name: 'Bruno Henrique Silva', phone: '5527999123008', email: 'bruno.henrique.silva@email-teste.com' },
  { name: 'Patrícia Gomes Barbosa', phone: '5527999123009', email: 'patricia.gomes.barbosa@email-teste.com' },
  { name: 'Lucas Mendes Carvalho', phone: '5527999123010', email: 'lucas.mendes.carvalho@email-teste.com' },
  { name: 'Amanda Ribeiro Nascimento', phone: '5527999123011', email: 'amanda.ribeiro.nascimento@email-teste.com' },
  { name: 'Roberto Castro Dias', phone: '5527999123012', email: 'roberto.castro.dias@email-teste.com' },
  { name: 'Camila Teixeira Moreira', phone: '5527999123013', email: 'camila.teixeira.moreira@email-teste.com' },
  { name: 'Diego Fernandes Rocha', phone: '5527999123014', email: 'diego.fernandes.rocha@email-teste.com' },
  { name: 'Larissa Pinto Cardoso', phone: '5527999123015', email: 'larissa.pinto.cardoso@email-teste.com' },
  { name: 'Thiago Araújo Correia', phone: '5527999123016', email: 'thiago.araujo.correia@email-teste.com' },
  { name: 'Mariana Andrade Freitas', phone: '5527999123017', email: 'mariana.andrade.freitas@email-teste.com' },
  { name: 'Felipe Nunes Machado', phone: '5527999123018', email: 'felipe.nunes.machado@email-teste.com' },
  { name: 'Beatriz Cavalcanti Lopes', phone: '5527999123019', email: 'beatriz.cavalcanti.lopes@email-teste.com' },
  { name: 'Gabriel Monteiro Azevedo', phone: '5527999123020', email: 'gabriel.monteiro.azevedo@email-teste.com' },
  { name: 'Isabela Vasconcelos Melo', phone: '5527999123021', email: 'isabela.vasconcelos.melo@email-teste.com' },
  { name: 'Rafael Campos Brito', phone: '5527999123022', email: 'rafael.campos.brito@email-teste.com' },
  { name: 'Letícia Farias Cunha', phone: '5527999123023', email: 'leticia.farias.cunha@email-teste.com' },
  { name: 'Vinícius Barros Reis', phone: '5527999123024', email: 'vinicius.barros.reis@email-teste.com' },
  { name: 'Natália Coelho Miranda', phone: '5527999123025', email: 'natalia.coelho.miranda@email-teste.com' },
]

const APPOINTMENT_NOTES = [
  'Paciente em acompanhamento regular. Evolução positiva.',
  'Retorno para avaliação do tratamento. Sem queixas adicionais.',
  'Primeira consulta. Anamnese completa realizada.',
  'Paciente relatou melhora significativa nos últimos dias.',
  'Solicitou encaminhamento para exame complementar.',
  'Consulta de acompanhamento. Manter conduta atual.',
  'Paciente com dúvidas sobre medicação. Esclarecimentos realizados.',
  'Retorno pós-exames. Resultados dentro da normalidade.',
  'Paciente ansioso. Técnicas de relaxamento orientadas.',
  'Consulta remota por preferência do paciente.',
  'Avaliação de evolução. Progresso satisfatório.',
  'Paciente solicitou remarcação da próxima consulta.',
  'Orientação sobre hábitos de vida e sono.',
  'Discussão sobre adesão ao tratamento.',
  'Consulta de rotina. Sem intercorrências.',
]

async function seedChopperData(prisma: PrismaClient, passwordHash: string) {
  let chopper = await prisma.professional.findFirst({
    where: { name: { equals: 'Chopper', mode: 'insensitive' } },
  })
  if (!chopper) {
    chopper = await prisma.professional.upsert({
      where: { email: 'chopper@clinicbrain.local' },
      update: { name: 'Chopper' },
      create: {
        name: 'Chopper',
        email: 'chopper@clinicbrain.local',
        passwordHash,
        professionalType: 'MÉDICO',
        specialty: 'Clínico Geral',
        consultationFeeCents: 20000,
        timezone: 'America/Sao_Paulo',
      },
    })
  }

  await prisma.interaction.deleteMany({ where: { professionalId: chopper.id } })
  await prisma.appointment.deleteMany({ where: { professionalId: chopper.id } })
  await prisma.whatsappSession.deleteMany({ where: { professionalId: chopper.id } })
  await prisma.professionalAvailabilityBlock.deleteMany({ where: { professionalId: chopper.id } })
  await prisma.patient.deleteMany({ where: { professionalId: chopper.id } })

  await prisma.settings.upsert({
    where: { professionalId: chopper.id },
    update: {
      welcomeMessage:
        'Olá! Sou a assistente do Dr. Chopper. Posso ajudar com agendamentos, confirmações e dúvidas. Como posso ajudar?',
      confirmationMessage:
        'Sua consulta com o Dr. Chopper está agendada. Por favor, confirme sua presença respondendo SIM.',
      cancellationPolicy:
        'Cancelamentos devem ser feitos com no mínimo 24h de antecedência. Reagendamentos podem ser solicitados pelo WhatsApp.',
      reminderD1Enabled: true,
      reminder2hEnabled: true,
    },
    create: {
      professionalId: chopper.id,
      welcomeMessage:
        'Olá! Sou a assistente do Dr. Chopper. Posso ajudar com agendamentos, confirmações e dúvidas. Como posso ajudar?',
      confirmationMessage:
        'Sua consulta com o Dr. Chopper está agendada. Por favor, confirme sua presença respondendo SIM.',
      cancellationPolicy:
        'Cancelamentos devem ser feitos com no mínimo 24h de antecedência. Reagendamentos podem ser solicitados pelo WhatsApp.',
      reminderD1Enabled: true,
      reminder2hEnabled: true,
    },
  })

  const patients: { id: string; name: string; phoneNumber: string; status: 'ATIVO' | 'INATIVO' }[] = []
  for (let i = 0; i < CHOPPER_PATIENTS.length; i++) {
    const p = CHOPPER_PATIENTS[i]
    const isInactive = i >= 20
    const patient = await prisma.patient.upsert({
      where: {
        professionalId_phoneNumber: { professionalId: chopper.id, phoneNumber: p.phone },
      },
      update: { name: p.name, email: p.email, status: isInactive ? 'INATIVO' : 'ATIVO' },
      create: {
        professionalId: chopper.id,
        name: p.name,
        phoneNumber: p.phone,
        email: p.email,
        status: isInactive ? 'INATIVO' : 'ATIVO',
        firstConsultationAt: new Date(2025, 0, 15 + (i % 20)),
      },
    })
    patients.push({ id: patient.id, name: patient.name, phoneNumber: patient.phoneNumber, status: patient.status })
  }

  const appointments: { id: string; patientId: string; startsAt: Date; status: string }[] = []
  const statuses = ['CONFIRMADO', 'CONFIRMADO', 'CONFIRMADO', 'FALTOU', 'CANCELADO', 'REMARCADO', 'AGENDADO'] as const
  const modes = ['PRESENCIAL', 'PRESENCIAL', 'REMOTO'] as const
  const slotMinutes = 50

  const usedSlots = new Set<string>()
  function slotKey(month: number, day: number, hour: number) {
    return `${month}-${day}-${hour}`
  }

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(2026, month + 1, 0).getDate()
    const appointmentsPerMonth = 15 + Math.floor(Math.random() * 20)
    for (let a = 0; a < appointmentsPerMonth; a++) {
      let day: number
      let hour: number
      let attempts = 0
      do {
        day = 1 + Math.floor(Math.random() * (daysInMonth - 1))
        hour = 8 + Math.floor(Math.random() * 9)
        attempts++
      } while (usedSlots.has(slotKey(month, day, hour)) && attempts < 100)
      usedSlots.add(slotKey(month, day, hour))

      const patientIdx = Math.floor(Math.random() * patients.length)
      const patient = patients[patientIdx]
      const startsAt = new Date(2026, month, day, hour, 0, 0, 0)
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60 * 1000)
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const mode = modes[Math.floor(Math.random() * modes.length)]
      const notes = APPOINTMENT_NOTES[Math.floor(Math.random() * APPOINTMENT_NOTES.length)]

      const apt = await prisma.appointment.create({
        data: {
          professionalId: chopper.id,
          patientId: patient.id,
          startsAt,
          endsAt,
          status,
          mode,
          notes,
        },
      })
      appointments.push({
        id: apt.id,
        patientId: patient.id,
        startsAt,
        status: apt.status,
      })
    }
  }

  for (const p of patients.slice(0, 15)) {
    await prisma.whatsappSession.upsert({
      where: {
        professionalId_phoneNumber: { professionalId: chopper.id, phoneNumber: p.phoneNumber },
      },
      update: { lastMessageAt: new Date(), isActive: true },
      create: {
        professionalId: chopper.id,
        phoneNumber: p.phoneNumber,
        currentState: 'INITIAL',
        isActive: true,
        lastMessageAt: new Date(),
      },
    })
  }

  const botMessages = [
    'Olá! Como posso ajudar com seu agendamento?',
    'Sua consulta foi confirmada. Até breve!',
    'Lembrete: sua consulta é amanhã às 14h.',
    'Você gostaria de remarcar sua consulta?',
    'Obrigada pela confirmação. Até a próxima!',
  ]
  const humanMessages = [
    'Bom dia! Segue o encaminhamento solicitado.',
    'Paciente, por favor confirme sua presença para amanhã.',
    'Consulta remarcada com sucesso.',
  ]
  const patientMessages = [
    'Olá, gostaria de agendar uma consulta.',
    'Posso confirmar minha consulta de amanhã?',
    'Preciso remarcar, pode ser na próxima semana?',
  ]

  for (let i = 0; i < 30; i++) {
    const patient = patients[i % patients.length]
    const apt = appointments[Math.floor(Math.random() * Math.min(appointments.length, 50))]
    const types = ['BOT', 'BOT', 'HUMANO', 'PACIENTE'] as const
    const type = types[Math.floor(Math.random() * types.length)]
    let msg = ''
    if (type === 'BOT') msg = botMessages[Math.floor(Math.random() * botMessages.length)]
    else if (type === 'HUMANO') msg = humanMessages[Math.floor(Math.random() * humanMessages.length)]
    else msg = patientMessages[Math.floor(Math.random() * patientMessages.length)]

    const createdAt = new Date(2026, Math.floor(i / 3) % 12, (i % 28) + 1, 10 + (i % 8), 0, 0)
    await prisma.interaction.create({
      data: {
        professionalId: chopper.id,
        patientId: patient.id,
        appointmentId: apt?.id ?? null,
        messageText: msg,
        messageType: type,
        externalMessageId: `chopper-seed-msg-${i}-${Date.now()}`,
      },
    })
  }

  const pendingRequestPayload = JSON.stringify({
    type: 'BOOK_REQUEST',
    status: 'PENDING_PROFESSIONAL_APPROVAL',
    source: 'PATIENT_PORTAL',
    startsAt: '2026-04-15T14:00:00.000Z',
    endsAt: '2026-04-15T14:50:00.000Z',
  })
  const approvedPayload = JSON.stringify({
    type: 'RESCHEDULE_REQUEST',
    status: 'APPROVED',
    source: 'PATIENT_PORTAL',
    appointmentId: appointments[0]?.id,
    currentStartsAt: '2026-03-10T10:00:00.000Z',
    currentEndsAt: '2026-03-10T10:50:00.000Z',
    requestedStartsAt: '2026-03-12T14:00:00.000Z',
    requestedEndsAt: '2026-03-12T14:50:00.000Z',
    reviewedAt: new Date().toISOString(),
    reviewedVia: 'PANEL',
  })

  await prisma.interaction.create({
    data: {
      professionalId: chopper.id,
      patientId: patients[0].id,
      messageText: pendingRequestPayload,
      messageType: 'PACIENTE',
      externalMessageId: `chopper-pending-req-${Date.now()}`,
    },
  })
  await prisma.interaction.create({
    data: {
      professionalId: chopper.id,
      patientId: patients[1].id,
      messageText: approvedPayload,
      messageType: 'PACIENTE',
      externalMessageId: `chopper-approved-req-${Date.now()}`,
    },
  })

  for (let m = 0; m < 12; m++) {
    const start = new Date(2026, m, 1, 8, 0, 0)
    const end = new Date(2026, m, 1, 12, 0, 0)
    await prisma.professionalAvailabilityBlock.create({
      data: {
        professionalId: chopper.id,
        startsAt: start,
        endsAt: end,
        reason: m % 3 === 0 ? 'Reunião administrativa' : 'Bloqueio de agenda',
      },
    })
  }

  console.log('Seed Chopper: dados simulados criados (pacientes, consultas, interações, agenda 2026).')
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
