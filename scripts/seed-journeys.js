#!/usr/bin/env node
/**
 * Simula 2 jornadas completas (21 dias) com respostas realistas e evolução entre campanhas.
 *
 * Pré-requisitos:
 *   - MongoDB rodando
 *   - Backend configurado (.env)
 *   - Serviço de agents rodando (:8000) com OPENAI_API_KEY — salvo --skip-agents
 *
 * Uso:
 *   node scripts/seed-journeys.js
 *   node scripts/seed-journeys.js --reset
 *   node scripts/seed-journeys.js --skip-agents
 *   node scripts/seed-journeys.js --delay=1000
 */

require('dotenv').config()

const { ObjectId } = require('mongodb')
const { connectMongo, getDb, closeMongo } = require('../src/adapters/mongo')
const authService = require('../src/services/authService')
const sessionService = require('../src/services/sessionService')
const dayService = require('../src/services/dayService')
const { aggregateSession } = require('../src/services/metricsService')
const { analyzeDay, generateEvolutionReport } = require('../src/services/agentsClient')
const { campaign1, campaign2 } = require('./data/journeyAnswers')

const DEFAULTS = {
  email: 'seed@quantum.journal',
  password: 'seed123456',
  name: 'Marina Seed',
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    reset: args.includes('--reset'),
    skipAgents: args.includes('--skip-agents'),
    email: getArgValue(args, '--email') || DEFAULTS.email,
    password: getArgValue(args, '--password') || DEFAULTS.password,
    name: getArgValue(args, '--name') || DEFAULTS.name,
    delay: Number(getArgValue(args, '--delay') || 300),
  }
}

function getArgValue(args, key) {
  const inline = args.find((a) => a.startsWith(`${key}=`))
  if (inline) return inline.split('=').slice(1).join('=')
  const index = args.indexOf(key)
  if (index >= 0 && args[index + 1]) return args[index + 1]
  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureSeedUser({ email, password, name, reset }) {
  const db = getDb()

  if (reset) {
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
    if (existing) {
      const userId = existing._id
      const sessions = await db
        .collection('sessions')
        .find({ userId })
        .project({ _id: 1 })
        .toArray()
      const sessionIds = sessions.map((s) => s._id)

      await db.collection('day_answers').deleteMany({ userId })
      await db.collection('day_signals').deleteMany({ userId })
      await db.collection('session_metrics').deleteMany({ userId })
      await db.collection('session_progress').deleteMany({ sessionId: { $in: sessionIds } })
      await db.collection('sessions').deleteMany({ userId })
      await db.collection('mural_cards').deleteMany({ userId })
      await db.collection('evolution_reports').deleteMany({ userId })
      await db.collection('users').deleteOne({ _id: userId })
      console.log('Dados anteriores do usuário seed removidos.')
    }
  }

  try {
    const result = await authService.signup(name, email, password)
    console.log(`Usuário criado: ${result.user.email}`)
    return result.user.id
  } catch (err) {
    if (err.status === 409) {
      const login = await authService.login(email, password)
      console.log(`Usuário existente: ${login.user.email}`)
      return login.user.id
    }
    throw err
  }
}

async function unlockDay(sessionId, dayId, startDay = 1) {
  const db = getDb()
  await db.collection('session_progress').updateOne(
    { sessionId: new ObjectId(sessionId) },
    {
      $set: {
        startedAt: new Date(),
        simulatedDaysOffset: Math.max(0, dayId - startDay),
      },
    }
  )
}

async function seedMuralCards(userId) {
  const db = getDb()
  const count = await db.collection('mural_cards').countDocuments({ userId: new ObjectId(userId) })
  if (count > 0) return

  await db.collection('mural_cards').insertMany([
    {
      userId: new ObjectId(userId),
      text: 'Eu sou abundante',
      color: '#D4F268',
      x: 40,
      y: 60,
      fontSize: 16,
    },
    {
      userId: new ObjectId(userId),
      text: 'Eu construo minha nova realidade',
      color: '#EBC8D6',
      x: 220,
      y: 120,
      fontSize: 18,
    },
  ])
  console.log('Mural seed: 2 cards criados.')
}

async function runCampaign(userId, campaignNumber, answersByDay, options) {
  console.log(`\n--- Campanha ${campaignNumber} ---`)

  const session = await sessionService.createSession(userId, 1)
  console.log(`Sessão criada: ${session.label} (${session.id})`)

  await unlockDay(session.id, 1, session.startDay)

  for (let dayId = 1; dayId <= 21; dayId++) {
    await unlockDay(session.id, dayId, session.startDay)

    const answers = answersByDay[dayId]
    if (!answers) {
      throw new Error(`Respostas ausentes para dia ${dayId} na campanha ${campaignNumber}`)
    }

    await dayService.saveDayAnswers(userId, session.id, dayId, answers)

    if (options.skipAgents) {
      const db = getDb()
      const progress = await sessionService.getSessionProgress(userId, session.id)
      const completedDays = progress.completedDays || []
      if (!completedDays.includes(dayId)) {
        completedDays.push(dayId)
        completedDays.sort((a, b) => a - b)
        await db.collection('session_progress').updateOne(
          { sessionId: new ObjectId(session.id) },
          { $set: { completedDays } }
        )
      }
      if (completedDays.length >= 21) {
        await sessionService.completeSession(session.id)
      }
    } else {
      await dayService.markDayComplete(userId, session.id, dayId)
    }

    process.stdout.write(`  Dia ${String(dayId).padStart(2, '0')}/21 ✓\n`)

    if (options.delay > 0 && !options.skipAgents) {
      await sleep(options.delay)
    }
  }

  if (options.skipAgents) {
    await aggregateSession(userId, session.id)
  }

  console.log(`Campanha ${campaignNumber} concluída.`)
  return session.id
}

async function main() {
  const options = parseArgs()

  console.log('Quantum Journal — seed de 2 jornadas')
  console.log(`Email: ${options.email}`)
  console.log(`Agents: ${options.skipAgents ? 'DESATIVADO (--skip-agents)' : 'ATIVO (AnalyzeDay + métricas)'}`)
  console.log(`Delay entre dias: ${options.delay}ms`)

  await connectMongo()
  const userId = await ensureSeedUser(options)
  await seedMuralCards(userId)

  const session1Id = await runCampaign(userId, 1, campaign1, options)
  const session2Id = await runCampaign(userId, 2, campaign2, options)

  if (!options.skipAgents) {
    console.log('\nGerando relatório de evolução (Analista)...')
    try {
      const report = await generateEvolutionReport(userId)
      console.log('Relatório gerado com sucesso.')
      if (report?.report?.crossCampaignInsights?.length) {
        console.log('Insights cross-campanha:', report.report.crossCampaignInsights.length)
      }
    } catch (err) {
      console.warn('Aviso: não foi possível gerar evolution report:', err.message)
    }
  }

  console.log('\n=== Seed concluído ===')
  console.log(`Login: ${options.email} / ${options.password}`)
  console.log(`Campanha 1 (cética):  ${session1Id}`)
  console.log(`Campanha 2 (evoluída): ${session2Id}`)
  console.log('\nTeste:')
  console.log('  - /assistente  → Aurora (chat)')
  console.log('  - /evolucao    → Analista (insights)')
  console.log('  - /jornada     → histórico de campanhas')

  await closeMongo()
}

main().catch(async (err) => {
  console.error('\nErro no seed:', err.message)
  try {
    await closeMongo()
  } catch {
    // ignore
  }
  process.exit(1)
})
