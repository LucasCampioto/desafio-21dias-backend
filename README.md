# Quantum Journal — Backend

API Node.js (Express + MongoDB) para o Quantum Journal. Source of truth para auth, sessões, respostas dos dias, mural e proxy para o serviço de agentes IA.

## Requisitos

- Node.js 18+
- MongoDB rodando localmente ou remoto

## Setup

```bash
cd desafio-21dias-backend
npm install
cp .env.example .env
# Edite .env com MONGODB_URI, JWT_SECRET e AGENTS_API_KEY
npm run dev
```

O servidor sobe em `http://localhost:3000`.

## Deploy na Vercel

Configuração pronta: `vercel.json` (rewrite → `/api`) e `api/index.js` exporta o app Express diretamente (sem `serverless-http`).

Guia completo (3 projetos + envs): [`../DEPLOY-VERCEL.md`](../DEPLOY-VERCEL.md)

### Variáveis obrigatórias (Production)

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | URI do MongoDB Atlas (`mongodb+srv://...`) — **não** use `localhost` |
| `JWT_SECRET` | Segredo longo e aleatório — **não** use o default `dev-secret-change-in-production` |
| `AGENTS_URL` | URL do deploy agents (ex.: `https://seu-agents.vercel.app`) |
| `AGENTS_API_KEY` | Mesma chave configurada no projeto agents |
| `CORS_ORIGIN` | URL **exata** do frontend, sem barra final (ex.: `https://desafio-21dias.vercel.app`). Várias origens: separar por vírgula. Wildcard para previews: `https://*.vercel.app` |
| `CORS_ALLOW_VERCEL_PREVIEWS` | Opcional: `true` para aceitar qualquer origem `https://*.vercel.app` (branch previews) |

### MongoDB Atlas

Em **Network Access**, permita `0.0.0.0/0` (ou IPs da Vercel) para o cluster aceitar conexões serverless.

### Teste após deploy

1. `GET https://SEU-BACKEND.vercel.app/health` → `{"status":"ok","env":"vercel"}` (sem Mongo)
2. Depois teste login ou outra rota que use o banco

O endpoint `/health` responde antes de conectar ao MongoDB; falhas de env ou Atlas aparecem nas demais rotas com JSON de erro (timeout ~5s na Vercel).

### CORS em produção

Se o browser mostra **CORS error** no Network tab:

1. Confirme `CORS_ORIGIN` na Vercel = URL exata do frontend (ex.: `https://desafio-21dias.vercel.app`)
2. Confirme `VITE_API_URL` no frontend = URL do backend sem barra (ex.: `https://desafio-21dias-backend.vercel.app`)
3. Para branch previews, adicione `https://*.vercel.app` em `CORS_ORIGIN` ou defina `CORS_ALLOW_VERCEL_PREVIEWS=true`
4. Origens rejeitadas são logadas com `[CORS] Origin rejected:` nos logs da Vercel

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: 3000) |
| `MONGODB_URI` | Connection string MongoDB |
| `JWT_SECRET` | Segredo para tokens JWT |
| `AGENTS_URL` | URL do serviço FastAPI de agentes |
| `AGENTS_API_KEY` | Chave compartilhada backend ↔ agents |
| `CORS_ORIGIN` | Origem permitida do frontend (URL exata, sem barra final; vírgula para várias; `https://*.vercel.app` para wildcard) |
| `CORS_ALLOW_VERCEL_PREVIEWS` | Se `true`, aceita qualquer subdomínio `*.vercel.app` |

## Endpoints

### Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/signup` | Cadastro |
| POST | `/auth/login` | Login → JWT |
| GET | `/auth/me` | Perfil (requer JWT) |
| PATCH | `/auth/me` | Atualizar perfil |

### Sessões

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/sessions` | Histórico de campanhas |
| POST | `/sessions` | Iniciar campanha (`startDay`) |
| GET | `/sessions/active` | Sessão ativa |
| GET | `/sessions/:id/progress` | Progresso + status dos dias |

### Dias

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/sessions/:id/days/:dayId/answers` | Respostas do dia |
| PUT | `/sessions/:id/days/:dayId/answers` | Salvar respostas |
| POST | `/sessions/:id/days/:dayId/complete` | Marcar dia completo → AnalyzeDay + métricas |

### Mural

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/mural/cards` | Listar cards |
| POST | `/mural/cards` | Criar card |
| PUT | `/mural/cards/:id` | Atualizar card |
| DELETE | `/mural/cards/:id` | Remover card |

### Assistente & Evolução

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/assistant/chat` | Proxy para Aurora |
| GET | `/evolution/insights` | Relatório de evolução (cache 24h) |

## Autenticação

Envie o JWT no header:

```
Authorization: Bearer <token>
```

## Fluxo day.complete

Ao chamar `POST /sessions/:id/days/:dayId/complete`:

1. Atualiza `session_progress.completedDays`
2. Chama `POST /internal/analyze-day` no serviço de agentes
3. Agrega `session_metrics` via `metricsService`
4. Se 21 dias completos, marca sessão como `completed`

## Seed — simular 2 jornadas para testar agentes

Script que cria um usuário de teste com **2 campanhas completas (21 dias cada)**, respostas realistas em português e evolução emocional da campanha 1 (cética/ansiosa) para a campanha 2 (mais consciente/motivada).

**Pré-requisitos:** MongoDB + backend `.env` configurado. Para análise IA completa, suba também o serviço de agents (`:8000`) com `OPENAI_API_KEY`.

```bash
# Com AnalyzeDay + Analista (recomendado — ~42 chamadas OpenAI)
npm run seed:journeys

# Recriar do zero (apaga dados anteriores do usuário seed)
npm run seed:journeys -- --reset

# Sem IA (rápido — só respostas e progresso no MongoDB)
npm run seed:journeys -- --skip-agents

# Mais lento entre dias (evitar rate limit OpenAI)
npm run seed:journeys -- --delay=1000
```

**Credenciais padrão após o seed:**

| Campo | Valor |
|-------|-------|
| E-mail | `seed@quantum.journal` |
| Senha | `seed123456` |

**O que testar no frontend:**

- `/assistente` — Aurora com contexto das jornadas
- `/evolucao` — Analista com comparativo entre campanhas
- `/jornada` — histórico das 2 campanhas

Arquivos: `scripts/seed-journeys.js` e `scripts/data/journeyAnswers.js`

## Estrutura

```
src/
├── server.js
├── config.js
├── adapters/mongo.js
├── middleware/
├── routes/
├── services/
└── content/days.json
```
