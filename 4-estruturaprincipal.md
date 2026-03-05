

---

# 📘 RELATÓRIO TÉCNICO

## Sistema SaaS de Gestão Inteligente para Profissionais de Saúde Mental

---

# 1️⃣ VISÃO ESTRATÉGICA DO PRODUTO

## 🎯 Objetivo

Construir um **SaaS verticalizado** para:

* Psicanalistas
* Psicólogas
* Psiquiatras
* Clínicas pequenas

Com foco em:

* Redução de faltas
* Automação de confirmações
* Organização de agenda
* Centralização de dados
* Relatórios estratégicos
* Integração WhatsApp + Web

---

# 2️⃣ PROBLEMA REAL QUE ESTAMOS RESOLVENDO

## 🔴 Cenário Atual

Profissionais utilizam:

* WhatsApp manual
* Agenda física ou Google Agenda
* Confirmações manuais
* Planilhas financeiras isoladas

### Impactos:

* 15–30% de faltas
* Perda financeira recorrente
* Estresse operacional
* Desorganização
* Falta de métricas

---

# 3️⃣ PROPOSTA DE SOLUÇÃO

Criar um sistema com três pilares:

### 🧠 Pilar 1 – Motor de Agenda

Controle absoluto de horários.

### 💬 Pilar 2 – Motor de Comunicação

Automação inteligente via WhatsApp.

### 📊 Pilar 3 – Motor de Gestão

Relatórios e visão estratégica.

---

# 4️⃣ ARQUITETURA GERAL DO SISTEMA

## Modelo: SaaS Multi-Tenant (Banco Compartilhado)

Um único sistema.
Vários profissionais.
Dados isolados por identificação.

---

# 5️⃣ ESTRUTURA TÉCNICA

## 🏗️ Camadas do Sistema

### 🔹 1. Frontend (React)

Responsável por:

* Login do profissional
* Painel de agenda
* Visualização de pacientes
* Relatórios
* Configurações
* Calendário interativo
* Configuração de horários

---

### 🔹 2. Backend (Node.js)

Responsável por:

* API REST
* Autenticação
* Regras de negócio
* Integração Evolution API
* Cron jobs (lembretes)
* Controle de estados
* Segurança
* Validação

---

### 🔹 3. Banco de Dados (PostgreSQL)

Banco único.
Isolamento por `profissional_id`.

---

# 6️⃣ MODELAGEM DE DADOS (ESTRUTURA LÓGICA)

## 📌 Tabela: profissionais

* id
* nome
* email
* senha_hash
* telefone
* especialidade
* valor_consulta
* horario_inicio
* horario_fim
* dias_ativos
* ativo
* criado_em

---

## 📌 Tabela: pacientes

* id
* profissional_id
* nome
* telefone
* primeira_consulta
* status (ativo/inativo)
* criado_em

---

## 📌 Tabela: agendamentos

* id
* profissional_id
* paciente_id
* data
* horario
* status (agendado, confirmado, cancelado, faltou)
* criado_em
* confirmado_em
* cancelado_em
* remarcado_de

---

## 📌 Tabela: interacoes

* id
* profissional_id
* paciente_id
* mensagem
* tipo (bot/humano)
* criado_em

---

## 📌 Tabela: configuracoes

* id
* profissional_id
* mensagem_boas_vindas
* mensagem_confirmacao
* politica_cancelamento
* lembrete_ativo (boolean)
* lembrete_2h_ativo (boolean)

---

# 7️⃣ LÓGICA MULTI-TENANT

Todos os registros possuem:

```
profissional_id
```

No backend:

Quando o profissional loga:

* O sistema identifica seu ID
* Toda query ao banco é filtrada por esse ID
* Nenhum dado de outro profissional é acessível

Isolamento lógico.

---

# 8️⃣ AUTENTICAÇÃO

Modelo:

* Login por email e senha
* Senha com hash seguro (bcrypt)
* JWT para autenticação
* Middleware de validação

Somente:

* Você (super admin)
* Profissionais cadastrados

Sem secretárias.
Sem múltiplos níveis de acesso.

---

# 9️⃣ FLUXO DO PACIENTE

## 📲 Via WhatsApp

1. Paciente envia mensagem
2. Sistema identifica profissional pelo número
3. Identifica paciente pelo telefone
4. Detecta intenção
5. Pode enviar link web para marcação
6. Agenda consulta
7. Salva no banco

---

## 🌐 Via Link Web

1. Paciente acessa link personalizado
2. Escolhe data
3. Visualiza horários disponíveis
4. Confirma
5. Backend valida disponibilidade
6. Salva agendamento
7. Dispara confirmação via WhatsApp

---

# 🔟 MOTOR DE DISPONIBILIDADE

Regras:

* Horários fixos configuráveis
* Dias bloqueados
* Horários já ocupados
* Impede conflito de agenda
* Reserva temporária antes da confirmação final

---

# 1️⃣1️⃣ MOTOR DE CONFIRMAÇÃO AUTOMÁTICA

Cron jobs rodando no backend:

### 📅 1 dia antes – 08:00

Mensagem automática de confirmação.

### ⏰ 2 horas antes

Lembrete final.

Resposta do paciente altera status.

---

# 1️⃣2️⃣ SISTEMA DE ESTADOS DO AGENDAMENTO

Estados possíveis:

* agendado
* confirmado
* cancelado
* faltou
* remarcado

Mudança de estado gera histórico.

---

# 1️⃣3️⃣ RELATÓRIOS

Mensal:

* Total consultas
* Confirmadas
* Canceladas
* Faltas
* Receita estimada
* Taxa de comparecimento

Semanal:

* Resumo automático

Indicadores estratégicos:

* Pacientes com risco de evasão
* Frequência média
* Dias mais cheios

---

# 1️⃣4️⃣ PAINEL SUPER ADMIN (SEU)

Você poderá:

* Criar profissional
* Ativar/desativar
* Ver métricas globais
* Monitorar instâncias WhatsApp
* Resetar senha
* Ver uso geral do sistema

---

# 1️⃣5️⃣ INFRAESTRUTURA

## Desenvolvimento:

* Localhost
* PostgreSQL local

## Produção:

* VPS (DigitalOcean / Google)
* Node rodando via PM2 ou Docker
* PostgreSQL na VPS ou serviço gerenciado
* HTTPS com SSL

---

# 1️⃣6️⃣ SEGURANÇA

* Hash de senha
* HTTPS obrigatório
* Validação de input
* Proteção contra SQL injection
* Backup automático diário
* Logs de auditoria

---

# 1️⃣7️⃣ ESCALABILIDADE FUTURA

Preparado para:

* Planos pagos
* Subdomínios por cliente
* Integração com pagamento
* Dashboard financeiro
* Exportação de relatórios
* App mobile

---

# 1️⃣8️⃣ RISCOS TÉCNICOS

* Falha na integração WhatsApp
* Conflito de agendamento simultâneo
* Sobrecarga de VPS
* Vazamento de dados se mal configurado

Mitigação:

* Logs
* Monitoramento
* Backup
* Testes de concorrência

---

# 1️⃣9️⃣ FILOSOFIA DO PRODUTO

Esse sistema não é:

❌ Um chatbot
❌ Um agendador simples

É:

✅ Um sistema de organização clínica
✅ Um redutor de caos
✅ Um motor de previsibilidade financeira
✅ Um SaaS verticalizado

---

# 🔥 CONCLUSÃO ESTRATÉGICA

Você está construindo:

Um SaaS multi-tenant,
Baseado em Node + PostgreSQL,
Com autenticação individual,
Automação via WhatsApp,
Painel web,
Relatórios estratégicos,
Arquitetura escalável.

Isso já é arquitetura de produto real.

