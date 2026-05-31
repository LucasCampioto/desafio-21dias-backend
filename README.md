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

Configuração pronta: `vercel.json`, `api/index.js` (serverless) e `src/app.js`.

Guia completo (3 projetos + envs): [`../DEPLOY-VERCEL.md`](../DEPLOY-VERCEL.md)

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: 3000) |
| `MONGODB_URI` | Connection string MongoDB |
| `JWT_SECRET` | Segredo para tokens JWT |
| `AGENTS_URL` | URL do serviço FastAPI de agentes |
| `AGENTS_API_KEY` | Chave compartilhada backend ↔ agents |
| `CORS_ORIGIN` | Origem permitida do frontend |

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
