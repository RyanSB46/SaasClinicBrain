# Banco de Dados - Clinic Brain (exemplo)

Copie para `DATABASE.md` e preencha com suas credenciais locais. **Nunca commite DATABASE.md.**

## Credenciais (ambiente de desenvolvimento)

| Campo | Valor |
|-------|-------|
| **Host** | localhost |
| **Porta** | 5454 |
| **Banco** | clinic_brain |
| **Usuário** | postgres |
| **Senha** | _sua_senha_ |

## Connection string

```
postgresql://postgres:_sua_senha_@localhost:5454/clinic_brain
```

## Docker

```bash
cd clinic-brain
docker compose up -d
```

## Logins de teste (após seed)

| Tipo | Email | Senha |
|------|-------|-------|
| Admin técnico | _seu_email_ | _sua_senha_ |
| Profissional Chopper | chopper@clinicbrain.local | _senha_do_seed_ |
