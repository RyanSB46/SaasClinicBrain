📄 DOCUMENTO TÉCNICO – IMPLEMENTAÇÃO LOCAL REAL
🎯 Objetivo

Construir sistema de automação WhatsApp:

Rodando localmente no Windows

Evolution API rodando via Docker (porta 8080)

Backend Node rodando local (porta 3000)

Webhook real

Mensagem real

Fluxo real

Persistência real

Arquitetura escalável

Sem simulação.

🌐 Arquitetura Local Final
WhatsApp (seu número)
        ↓
Evolution API (Docker :8080)
        ↓ (Webhook)
Node Backend (localhost:3000)
        ↓
State Machine (core)
        ↓
Services
        ↓
Evolution Client (HTTP)
        ↓
WhatsApp

🔐 Configurações Confirmadas

Evolution rodando em: http://localhost:8080

Instância criada

API Key disponível

Node rodará em: http://localhost:3000

📁 Estrutura Arquitetural Obrigatória

O Copilot deve criar exatamente essa estrutura:

clinic-brain/
│
├── src/
│   ├── core/
│   │   └── stateMachine.js
│   │
│   ├── application/
│   │   └── messageProcessor.js
│   │
│   ├── services/
│   │   └── conversationService.js
│   │
│   ├── infra/
│   │   ├── evolutionClient.js
│   │   └── databaseClient.js
│   │
│   ├── routes/
│   │   └── webhook.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
└── package.json


Nenhuma lógica deve ficar dentro da rota.

Webhook apenas delega.

⚙️ Variáveis de Ambiente (.env)

Obrigatórias:

PORT=3000

EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=SUA_API_KEY_AQUI
EVOLUTION_INSTANCE=NOME_DA_INSTANCIA

DATABASE_URL=postgres://...

🔁 FLUXO REAL DE OPERAÇÃO
1️⃣ Usuário envia mensagem no WhatsApp

Evolution recebe.

2️⃣ Evolution dispara webhook

POST para:

http://host.docker.internal:3000/webhook


(Se não funcionar, usar ngrok.)

3️⃣ Webhook recebe payload

Webhook deve:

Validar payload

Extrair:

número

mensagem

messageId

Chamar application/messageProcessor

Webhook NÃO deve conter lógica.

4️⃣ messageProcessor

Responsável por:

Buscar sessão no banco

Se não existir → criar

Enviar dados para stateMachine

Receber próxima resposta

Atualizar sessão

Solicitar envio de mensagem via evolutionClient

5️⃣ stateMachine (Cérebro puro)

Não pode depender de:

Express

Banco

Evolution

Deve apenas:

Receber:

{
  currentState,
  inputMessage
}


Retornar:

{
  nextState,
  responseMessage,
  shouldEnd
}

6️⃣ evolutionClient

Responsável por:

POST para:

/message/sendText/{instance}


Com:

{
  number,
  text
}


Sempre usando:

EVOLUTION_URL

EVOLUTION_API_KEY

🧠 Máquina de Estados – Modelo Inicial

Estados obrigatórios:

INITIAL
MAIN_MENU
SERVICES_MENU
ATTENDANT
CLOSED


Transições:

INITIAL → MAIN_MENU
MAIN_MENU + "1" → SERVICES_MENU
MAIN_MENU + "2" → ATTENDANT
MAIN_MENU + "3" → CLOSED

SERVICES_MENU + "A" → CLOSED
SERVICES_MENU + "B" → CLOSED

Qualquer entrada inválida → repetir estado atual

🗄 Persistência (Obrigatório)

Tabela:

conversations


Campos:

id

phone_number

current_state

created_at

updated_at

is_active

Nunca usar memória global.

🧪 Teste Real Esperado

Você envia "oi"

Backend cria sessão

StateMachine retorna menu

Você recebe menu no WhatsApp

Você envia "1"

Recebe submenu

Você envia "A"

Fluxo encerra

Tudo local.

🚨 Validações Obrigatórias

Copilot deve garantir:

Try/catch em todas integrações externas

Logs estruturados

Validação de payload

Não permitir crash do servidor

Timeout de sessão (futuro cron)

🔐 Segurança Mínima

Webhook deve:

Validar API Key no header (se configurado)

Ignorar mensagens de status (somente mensagens de texto)

🐳 Integração Docker ↔ Node

Webhook da Evolution deve apontar para:

http://host.docker.internal:3000/webhook


Se erro:

Alternativa:

Instalar ngrok

Expor 3000

Colocar URL pública na Evolution

🚀 Objetivo Final Local

Você deve conseguir:

Enviar mensagem real

Receber resposta automática real

Ver estado mudar no banco

Ver logs no terminal

Sem subir nada na nuvem.

🧠 Preparação para VPS (Depois)

Quando subir no Google Cloud:

Subir Node

Subir PostgreSQL

Subir Evolution

Alterar .env

Atualizar webhook

Nenhuma mudança estrutural necessária.

🎯 Resumo Estratégico

Você está construindo:

Sistema real

Ambiente real

Integração real

Arquitetura limpa

Escalável

Pronto para IA futura

Sem protótipo fraco.
