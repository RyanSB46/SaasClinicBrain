## 🔐 DADOS DE CONEXÃO - CLINIC BRAIN

### **EVOLUTION API**
- **URL**: `http://localhost:8080`
- **API Key**: `7A8DC595661D-4A82-9865-19D014260716`
- **Instância**: `automation`
- **Webhook API Key**: `418082B77972-490F-AE60-7DAD9763DC4C`

---

### **NODE.JS BACKEND**
- **URL**: `http://localhost:3000`
- **Webhook padrão (fixo no Evolution)**: `http://localhost:3000/webhook`
- **Webhook legado (compatibilidade interna)**: `http://localhost:3000/api/webhook/evolution`
- **Health Check**: `http://localhost:3000/health`
- **Porta**: `3000`

---

### **POSTGRESQL**
- **Host**: `localhost`
- **Porta**: `5454`
- **Usuário**: `postgres`
- **Senha**: `ryan113355`
- **Banco de Dados**: `clinic_brain`
- **Connection String (completa)**: 
  ```
  postgresql://postgres:ryan113355@localhost:5454/clinic_brain
  ```

---

### **VARIÁVEIS DE AMBIENTE (.env)**
```
PORT=3000
EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=7A8DC595661D-4A82-9865-19D014260716
EVOLUTION_INSTANCE=automation
WEBHOOK_API_KEY=418082B77972-490F-AE60-7DAD9763DC4C
SESSION_TIMEOUT_MINUTES=120
DATABASE_URL=postgresql://postgres:ryan113355@localhost:5454/clinic_brain
```

---

### **TELEFONE TESTADO**
- **Número da doutora (psicanalista)**: `5527981017804`
- **Número do paciente de teste**: `5527996087528`
- **Status**: ✅ Conectado e testado com fluxo completo

---

### **WORKSPACE**
- **Caminho**: `C:\Users\ryans\Documents\Automações com scripts\automation\psicanalistaautomation`
- **Projeto**: clinic-brain