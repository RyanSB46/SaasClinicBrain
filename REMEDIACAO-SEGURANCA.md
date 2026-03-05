# 🔐 Guia de Remediação de Dados Confidenciais no GitHub

## ✅ Verificação inicial (o que JÁ está no histórico)

Na análise do histórico, estes arquivos **não** aparecem como commitados:
- `clinic-brain/.env` (apenas `.env.example` foi commitado)
- `5-dadosconexoes.md`
- `*.client_secret*.json`

Se você tem certeza de que esses arquivos nunca foram commitados, pode **pular o Passo 2** (remoção do histórico) e ir direto para:
1. Adicionar o `.gitignore` (Passo 1)
2. Rotacionar credenciais por precaução (Passo 3), se fizer sentido

---

## O que pode ter sido exposto

Com base na análise do repositório:

| Arquivo / Local | Risco | Observação |
|-----------------|-------|------------|
| `clinic-brain/.env.example` | Baixo | Template com placeholders (`change_me_...`). Se você colou valores reais e commitou, **troque tudo**. |
| `clinic-brain/backend/prisma/seed.ts` | Médio | Contém números de telefone. Use dados fictícios em produção (ex: 5527999990001, 5527999990002). |
| `clinic-brain/docker-compose.yml` | Baixo | Senha `postgres` – aceitável para dev local, mas troque em produção. |
| `5-dadosconexoes.md` | Alto | Se foi commitado com conexões reais, **remova e rotacione**. |
| Arquivos `*.client_secret*.json` | Alto | Credenciais do Google – **nunca** devem estar no repositório. |
| `.env` (raiz ou clinic-brain) | Crítico | Se commitou `.env` com valores reais, **remova do histórico e rotacione tudo**. |

---

## Passo 1: Garantir que não vai acontecer de novo ✅

O `.gitignore` foi atualizado. Agora **adicione e commite** o novo `.gitignore`:

```bash
git add .gitignore clinic-brain/.gitignore
git status   # conferir
git commit -m "fix: adiciona arquivos sensíveis ao gitignore"
```

**Não faça push ainda** – conclua a remediação antes.

---

## Passo 2: Remover arquivos sensíveis do histórico do Git

Depois de commitado, o Git guarda histórico. Para remover arquivos sensíveis de **todo o histórico**, use uma das opções abaixo.

### Opção A: git-filter-repo (recomendado)

1. Instale: https://github.com/newren/git-filter-repo  
   - No Windows: `pip install git-filter-repo` ou baixe o .exe

2. Faça backup:
   ```bash
   cd "c:\Users\ryans\Documents\Automações com scripts\automation\psicanalistaautomation"
   git clone . ../psicanalistaautomation-backup
   ```

3. Remova os arquivos do histórico (ajuste se necessário):
   ```bash
   git filter-repo --path clinic-brain/.env --invert-paths
   git filter-repo --path 5-dadosconexoes.md --invert-paths
   git filter-repo --path-glob "*.client_secret*.json" --invert-paths
   ```

4. Se o `.env` nunca foi commitado, pule essa parte. Confira antes:
   ```bash
   git log --all --full-history -- clinic-brain/.env
   ```

### Opção B: BFG Repo-Cleaner

1. Baixe: https://rtyley.github.io/bfg-repo-cleaner/

2. Remova arquivos:
   ```bash
   java -jar bfg.jar --delete-files .env
   java -jar bfg.jar --delete-files "*.client_secret*.json"
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```

### Após limpar o histórico

O histórico local será reescrito. Se o repositório está no GitHub:

```bash
git push origin --force --all
git push origin --force --tags
```

Importante: avise quem tiver clonado o repositório para refazer o clone (o histórico antigo não será mais compatível).

---

## Passo 3: Rotacionar credenciais

Mesmo que o `.env` não tenha sido commitado, é prudente rotacionar se houver suspeita de exposição.

### O que trocar

| Credencial | Onde alterar |
|------------|--------------|
| `JWT_SECRET` | Novo valor de 32+ caracteres no `.env` |
| `WEBHOOK_API_KEY` | Evolution API e `.env` |
| `EVOLUTION_API_KEY` | Evolution API e `.env` |
| `DATABASE_URL` | Senha do PostgreSQL |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| Tokens OAuth do Google | Desvincular app e reconectar |
| Senhas de admin/profissionais | Criar novos usuários ou resetar senhas |

### Google Cloud

1. Acesse https://console.cloud.google.com/
2. APIs e Serviços → Credenciais
3. Gere novo Client Secret
4. Revogue o antigo se possível
5. Atualize o `.env` local

---

## ✅ Correções aplicadas automaticamente

Já foram feitas as seguintes alterações no código:

- **seed.ts / seed.js**: Telefones trocados para 5527999990001, 5527999990002, 5527999990003 (fictícios). Senhas: `SeedDev@123` (profissional) e `SeedAdmin@123` (admin).
- **auth-examples.md**: `Senha@12345` → `sua_senha_segura_aqui`.
- **webhook-evolution.md**: Telefone de exemplo → 5527999990001.
- **login-page.tsx**: Valores padrão do formulário atualizados para os do seed.
- **Testes**: Senhas trocadas para `TestProf@123456` e `TestAdmin@123`.
- **.gitignore**: Atualizado para cobrir `.env`, credenciais, `5-dadosconexoes.md`, etc.

### Remover do histórico do Git (opcional, recomendado)

Os dados antigos ainda existem no histórico de commits. Para removê-los:

1. Instale: `pip install git-filter-repo` (ou `py -m pip install git-filter-repo`)
2. Faça backup: `git clone . ../psicanalistaautomation-backup`
3. Execute: `git filter-repo --replace-text scripts/replacements-para-histórico.txt`
4. Force push: `git push origin --force --all`

O arquivo `scripts/replacements-para-histórico.txt` contém os mapeamentos necessários.

---

## Passo 4: Conferência final

Antes de fazer push:

```bash
git status
git log --oneline -3
```

Confira se:
- [ ] O `.gitignore` está commitado
- [ ] Nenhum `.env` real está staged
- [ ] Nenhum `*client_secret*` ou `5-dadosconexoes.md` está no repositório
- [ ] As credenciais foram rotacionadas conforme necessário

---

## Observação sobre o seed.ts

O `seed.ts` contém números de telefone de teste. Para reduzir risco:

- Use números fictícios (ex: 5527999990001)
- Ou mova dados sensíveis para variáveis de ambiente e carregue via `process.env`

Se quiser, podemos ajustar o seed para usar dados fictícios.
