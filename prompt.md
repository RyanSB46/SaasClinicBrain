
**Como usar**
- Rode 1 prompt por vez, em ordem.
- Só avance quando o anterior estiver com critérios de aceite cumpridos.
- Peça sempre: “aplique alterações nos arquivos, não só explique”.

**Prompt 0 — Regras do agente (cole antes de tudo)**
```txt
Você é um arquiteto e desenvolvedor sênior. Quero implementação real, não protótipo.
Regras:
1) Faça mudanças diretamente nos arquivos.
2) Sempre mostre: plano curto, alterações feitas, comandos para rodar, e checklist de aceite.
3) Não invente features fora do escopo.
4) Código limpo, modular, com tratamento de erro e logs estruturados.
5) Segurança mínima obrigatória: validação de input, variáveis de ambiente, senhas com hash, JWT, rate limit básico.
6) Multi-tenant obrigatório via profissional_id em todas as consultas.
7) Se faltar contexto, assuma a opção mais simples e siga.
```

**Prompt 1 — Scaffold do projeto (backend + frontend)**
```txt
Crie o scaffold inicial do sistema SaaS para gestão clínica com:
- backend Node.js + TypeScript + Express
- frontend React + TypeScript + Vite
- PostgreSQL
- Prisma (ou Drizzle, escolha 1 e mantenha padrão)
- Docker Compose para banco
- ESLint + Prettier
- Estrutura por camadas (domain/application/infra/interfaces)
- .env.example completo

Entregue:
1) Estrutura de pastas final
2) Arquivos criados
3) Comandos para subir ambiente local
4) Critérios de aceite para confirmar que a base está pronta
```

**Prompt 2 — Modelagem de dados e migrations**
```txt
Implemente modelagem inicial com migrations para:
- profissionais
- pacientes
- agendamentos
- interacoes
- configuracoes
- sessoes_whatsapp (ou conversations)

Regras:
- Todas as tabelas de negócio com profissional_id quando aplicável
- Índices para consultas frequentes
- Constraint para evitar conflito de horário por profissional
- Campos created_at/updated_at
- Soft delete só se realmente necessário (se não, não usar)

Entregue seed mínima para testes locais.
```

**Prompt 3 — Autenticação e autorização**
```txt
Implemente autenticação completa:
- cadastro/login de profissional
- hash de senha com bcrypt
- JWT access token
- middleware auth
- middleware tenantScope (injeta profissional_id do token)
- validação de payload (Zod ou Joi, escolha 1)

Crie rotas:
- POST /auth/register
- POST /auth/login
- GET /auth/me

Inclua exemplos de request/response.
```

**Prompt 4 — Núcleo de agenda com concorrência**
```txt
Implemente módulo de agenda com regras:
- criar agendamento
- remarcar
- cancelar
- confirmar presença
- impedir dois pacientes no mesmo slot do mesmo profissional
- status: agendado, confirmado, cancelado, faltou, remarcado

Exigir transação para operações críticas e tratamento de concorrência.
Crie testes de serviço para cenário de corrida (duas tentativas no mesmo horário).
```

**Prompt 5 — Integração Evolution API + webhook**
```txt
Implemente integração WhatsApp via Evolution API:
- cliente HTTP com timeout, retry simples e tratamento de erro
- endpoint POST /webhook/evolution
- validação de webhook api key
- ignorar eventos que não sejam mensagem de texto
- extração de número, texto e messageId
- persistência da interação

Separar responsabilidades:
- rota só delega
- serviço processa
- client envia mensagem
```

**Prompt 6 — Máquina de estados da conversa**
```txt
Crie state machine pura (sem dependência de Express/DB):
Estados iniciais:
- INITIAL
- MAIN_MENU
- SERVICES_MENU
- ATTENDANT
- CLOSED

Entradas inválidas devem manter estado e responder ajuda.
A máquina deve retornar:
- nextState
- responseMessage
- shouldEnd

Conecte ao processador de mensagens e persista estado da sessão.
```

**Prompt 7 — Jobs automáticos (confirmação D-1 e lembrete 2h)**
```txt
Implemente agendadores (cron) no backend:
- D-1 às 08:00: solicitar confirmação
- 2h antes: lembrete final

Regras:
- respeitar timezone configurável por profissional (ou timezone global no MVP)
- registrar envio e resposta
- idempotência para evitar mensagens duplicadas
```

**Prompt 8 — Frontend MVP profissional**
```txt
Implemente frontend MVP com:
- login
- dashboard com métricas básicas
- agenda (lista + calendário simples)
- pacientes (cadastro e listagem)
- configurações de mensagens padrão

Requisitos:
- React Query para dados
- formulário com validação
- estado de loading/erro vazio bem tratado
- sem UI exagerada; foco funcional
```

**Prompt 9 — Relatórios essenciais**
```txt
Implemente relatórios mensais:
- total de consultas
- confirmadas
- canceladas
- faltas
- taxa de comparecimento
- receita estimada
- pacientes ativos/inativos

Criar endpoint de relatório e tela no frontend com filtros por período.
```

**Prompt 10 — Segurança e observabilidade mínimas**
```txt
Aplique hardening do MVP:
- helmet/cors/rate limit
- logs estruturados com requestId
- tratamento global de erros
- health check e readiness
- política de secrets (.env.example + validação de env ao iniciar)

Inclua checklist de segurança para ambiente local e VPS.
```

**Prompt 11 — Testes e validação final**
```txt
Crie suíte mínima de testes:
- unit: state machine e regras de agenda
- integração: auth, agendamento e webhook
- script de teste local (npm run test)

Depois, rode validação final e entregue:
1) checklist de funcionalidades implementadas
2) gaps restantes
3) próximos 7 dias de evolução técnica
```

**Prompt 12 — Preparação de deploy (sem subir ainda)**
```txt
Prepare o projeto para deploy em VPS:
- Dockerfiles backend/frontend
- docker-compose de produção base
- Nginx reverse proxy
- variáveis de ambiente por ambiente
- script de backup PostgreSQL
- guia de restore

Não fazer deploy real agora, apenas deixar pronto e documentado.
```

