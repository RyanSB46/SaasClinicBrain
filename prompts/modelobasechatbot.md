Você está trabalhando no backend de um SaaS chamado **ClinicBrain**, um sistema multi-tenant para profissionais de saúde que inclui agendamento, portal do paciente e automação via WhatsApp.

Stack atual do projeto:

* Backend: Node.js + TypeScript
* Frontend: React + Vite
* Banco de dados: PostgreSQL com Prisma
* Sistema multi-tenant baseado em `professionalId`
* Integração WhatsApp já existente
* Sistema de agendamentos já implementado
* Cada paciente é identificado principalmente pelo **telefone**

O objetivo agora é implementar **um chatbot de atendimento inicial via WhatsApp**, com comportamento previsível e organizado. O chatbot **não é um agente de IA**, é um **bot de fluxo controlado**, usado apenas para resolver interações simples.

O chatbot deve ser educado, eficiente e não intrusivo.

---

# OBJETIVO DO CHATBOT

O chatbot deve:

1. Receber mensagens do WhatsApp
2. Identificar o paciente pelo número de telefone
3. Determinar se é:

   * Paciente novo
   * Paciente existente
4. Iniciar interação apropriada
5. Resolver tarefas simples como:

   * Marcar consulta
   * Remarcar consulta
   * Cancelar consulta
   * Encaminhar para o profissional
6. Encerrar a interação quando não puder ajudar

O chatbot **não deve insistir, nem responder excessivamente**.

---

# IDENTIFICAÇÃO DO PACIENTE

O número do WhatsApp é usado para buscar no banco:

```
Patient.phone
```

Cenários:

### Paciente novo

Nenhum paciente encontrado com aquele telefone.

### Paciente existente

Paciente encontrado no banco.

---

# REGRA DE NOME DO PACIENTE

Quando um paciente for cadastrado:

Salvar o nome completo.

Para saudações, usar **apenas os dois primeiros nomes**.

Exemplo:

Nome completo:

```
Ryan Gosling Senna
```

Saudação:

```
Ryan Gosling
```

Função necessária:

```
getFirstTwoNames(fullName)
```

---

# RESET DE CONVERSA POR DIA

A conversa deve ser reiniciada **a cada novo dia**.

Exemplo:

Paciente conversou hoje → fluxo normal.

Paciente envia mensagem amanhã → o bot **não continua o fluxo antigo**.

Ele reinicia do começo.

Implementar verificação baseada em:

```
lastInteractionDate
```

Se a data for diferente do dia atual → reiniciar fluxo.

---

# PACIENTE NOVO – FLUXO

Quando um paciente entra em contato pela primeira vez:

O bot deve:

1. Fazer saudação neutra
2. Apresentar brevemente o profissional
3. Perguntar como pode ajudar

Exemplo de estrutura:

Mensagem 1:
"Olá! Seja bem-vindo ao atendimento da Dra. [Nome]."

Mensagem 2:
"Ela pode estar em atendimento no momento, mas estou aqui para ajudar com algumas informações."

Mensagem 3:
"O que você gostaria de saber?"

---

## FASE 1 – INFORMAÇÕES

O bot pode responder perguntas simples sobre:

* horários de atendimento
* tipos de atendimento
* preços
* planos de consulta

Exemplo de plano:

```
Consulta individual: R$150
Plano com 5 consultas: R$550
```

O bot pode fornecer essas informações.

---

## FASE 2 – TRANSFERÊNCIA PARA PROFISSIONAL

Depois de fornecer informações básicas, o bot deve oferecer falar com o profissional.

Exemplo:

"O profissional pode iniciar a conversa assim que estiver disponível."

Se o paciente pedir para falar com o profissional:

Encerrar automação.

---

# PACIENTE EXISTENTE

Se o número já estiver cadastrado:

Saudar pelo nome.

Exemplo:

```
Olá Pedro Farias, tudo bem?
Como posso ajudar hoje?
```

Oferecer opções principais:

1️⃣ Marcar consulta
2️⃣ Remarcar consulta
3️⃣ Cancelar consulta
4️⃣ Falar com o profissional

---

# MARCAR / REMARCAR / CANCELAR

O chatbot **não faz o agendamento diretamente**.

Ele envia o link do portal.

Exemplo:

```
Para realizar isso, utilize o link abaixo:
[link de agendamento]
```

Depois disso:

Se o paciente continuar enviando mensagens, o bot **não deve insistir**.

---

# FALAR COM O PROFISSIONAL

Dois comportamentos possíveis:

### V1 – Inteligente

Bot coleta contexto.

Pergunta:

"Pode me explicar brevemente o que você gostaria de conversar?"

Depois envia ao profissional.

### V2 – Simples

Bot apenas informa:

"O profissional foi avisado e responderá assim que estiver disponível."

---

# DETECÇÃO DE AGENDA DO PROFISSIONAL

O bot pode consultar o banco:

```
Appointments
```

Se houver consulta ativa no horário atual:

Responder:

```
O profissional está em atendimento no momento.
```

Caso contrário:

```
O profissional pode estar ocupado com outras atividades.
```

---

# REATIVAÇÃO DA CONVERSA

Se o paciente voltar após falar com o profissional:

### Se passou mais de 2 horas

O bot reinicia interação:

```
Como posso ajudar novamente?
```

### Se menos de 2 horas

Paciente pode continuar conversa normalmente.

---

# COMANDO MENU

Se o paciente estiver em uma conversa com o profissional e quiser voltar para o menu:

Ele pode digitar:

```
MENU
```

O bot reinicia o fluxo principal.

---

# TIPOS DE MENSAGEM NÃO SUPORTADOS

O bot não deve tentar interpretar:

* áudio
* imagem
* vídeo
* figurinha
* documento

Responder apenas uma vez:

```
No momento consigo responder apenas mensagens de texto.
```

Se continuar recebendo esses tipos, ficar em silêncio.

---

# DETECÇÃO DE CONVERSA SEM CONTEXTO

Se o bot não entender a intenção do usuário:

Responder educadamente uma única vez.

Exemplo:

```
Desculpe, não consegui entender sua solicitação.
```

Se continuar sem contexto → não responder.

---

# COMPORTAMENTO DO BOT

O bot deve ser:

* educado
* curto
* objetivo
* não insistente

Evitar múltiplas mensagens desnecessárias.

Se não puder ajudar → encerrar interação.

---

# PREPARAÇÃO PARA IA FUTURA

A arquitetura do chatbot deve permitir substituição futura por:

* LLM
* agente conversacional
* respostas por áudio
* voz do profissional

Portanto, separar:

```
chatbot_rules_engine
chatbot_message_handler
chatbot_intent_parser
```

---

# RESULTADO ESPERADO

Criar uma arquitetura de chatbot baseada em regras que:

* identifique o paciente
* aplique fluxo correto
* reinicie conversas diariamente
* encaminhe para o profissional quando necessário
* resolva apenas tarefas simples
* não seja irritante ou invasivo
