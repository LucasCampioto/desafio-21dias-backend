#!/usr/bin/env node
/**
 * Re-agrega session_metrics com percentuais normalizados (útil após atualização de métricas).
 * Uso: node scripts/refresh-metrics.js [userId|email]
 */

require('dotenv').config()

const { ObjectId } = require('mongodb')
const { connectMongo, getDb, closeMongo } = require('../src/adapters/mongo')
const { aggregateSession } = require('../src/services/metricsService')

async function resolveUserId(arg) {
  if (!arg) return null
  const db = getDb()
  if (ObjectId.isValid(arg)) return arg
  const user = await db.collection('users').findOne({ email: arg.toLowerCase() })
  return user?._id?.toString() ?? null
}

async function main() {
  const arg = process.argv[2]
  await connectMongo()
  const db = getDb()

  let userIds = []
  if (arg) {
    const userId = await resolveUserId(arg)
    if (!userId) {
      console.error('Usuário não encontrado:', arg)
      process.exit(1)
    }
    userIds = [userId]
  } else {
    const metrics = await db.collection('session_metrics').distinct('userId')
    userIds = metrics.map((id) => id.toString())
  }

  for (const userId of userIds) {
    const sessions = await db
      .collection('session_metrics')
      .find({ userId: new ObjectId(userId) })
      .project({ sessionId: 1 })
      .toArray()

    console.log(`Usuário ${userId}: ${sessions.length} campanha(s)`)
    for (const row of sessions) {
      await aggregateSession(userId, row.sessionId.toString())
      console.log(`  ✓ ${row.sessionId}`)
    }

    await db.collection('evolution_reports').deleteOne({ userId: new ObjectId(userId) })
    console.log('  Cache evolution_reports limpo (regenera ao abrir /evolucao)')
  }

  await closeMongo()
  console.log('Concluído.')
}

main().catch(async (err) => {
  console.error(err.message)
  await closeMongo()
  process.exit(1)
})
