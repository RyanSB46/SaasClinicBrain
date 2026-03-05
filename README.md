# 🏥 Clinic Brain

SaaS de gestão clínica para profissionais de saúde mental — psicanalistas, psicólogos e terapeutas.

Sistema completo com agenda, integração WhatsApp, portal do paciente e relatórios mensais.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral de consultas, pacientes e indicadores |
| **Agenda** | Agendamento, remarcação, cancelamento e bloqueio de horários |
| **Pacientes** | Cadastro e histórico por profissional |
| **Relatórios** | Relatórios mensais (PDF/Excel), taxa de comparecimento, receita |
| **Portal do Paciente** | Link público para o paciente ver horários e agendar |
| **WhatsApp** | Integração via Evolution API — confirmações e lembretes automáticos |
| **Google Calendar** | Sincronização de agenda com Google Calendar e Meet |
| **Admin** | Painel administrativo para gestão de profissionais e equipe |

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | React 19, Vite, TanStack Query |
| **Banco** | PostgreSQL + Prisma ORM |
| **Integrações** | Evolution API (WhatsApp), Google OAuth 2.0 |

---

## 📁 Estrutura do Projeto

```
clinic-brain/
├── backend/          # API REST (Express + Prisma)
├── frontend/         # Interface React
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Como rodar

### Pré-requisitos

- Node.js 18+
- PostgreSQL ou Docker
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) (para WhatsApp)

### 1. Clone e instale dependências

```bash
git clone https://github.com/SEU_USUARIO/SaasClinicBrain.git
cd SaasClinicBrain/clinic-brain
npm install
```

### 2. Suba o PostgreSQL (Docker)

```bash
docker-compose up -d
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com:

- `DATABASE_URL` — conexão PostgreSQL
- `JWT_SECRET` — chave para tokens (mín. 32 caracteres)
- `WEBHOOK_API_KEY` — chave do webhook Evolution
- `EVOLUTION_URL` e `EVOLUTION_API_KEY` — URL e API Key da Evolution
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — para integração Google (opcional)

### 4. Migre o banco e rode o seed

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 5. Inicie backend e frontend

```bash
# Na raiz clinic-brain
npm run dev:backend   # Backend em http://localhost:3000
npm run dev:frontend # Frontend em http://localhost:5173
```

---

## 🧪 Testes

```bash
cd clinic-brain/backend
npm test
```

---

## 📄 Licença

MIT
