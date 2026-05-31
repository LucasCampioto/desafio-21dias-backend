#!/usr/bin/env node
/**
 * Força um slot de presença ativo agora (QA local).
 * Expira períodos anteriores e evita sobreposição.
 * Uso: node scripts/dev-presence-now.js [email|userId] [morning|afternoon|evening]
 */

require('dotenv').config()

const { ObjectId } = require('mongodb')
const { connectMongo, getDb, closeMongo } = require('../src/adapters/mongo')
const { ensureDailyReminders, getActivePresence } = require('../src/services/presenceService')
const { spDateKey } = require('../src/services/presenceTime')

const PERIOD_ORDER = ['morning', 'afternoon', 'evening']

async function resolveUserId(arg) {
  if (!arg) return null
  const db = getDb()
  if (ObjectId.isValid(arg)) return arg
  const user = await db.collection('users').findOne({ email: arg.toLowerCase() })
  return user?._id?.toString() ?? null
}

function applyForcedPeriod(slots, period, now) {
  const forcedIndex = PERIOD_ORDER.indexOf(period)
  const startAt = now
  const endAt = new Date(now.getTime() + 60 * 60 * 1000)
  const pastStart = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const pastEnd = new Date(now.getTime() - 60 * 1000)

  return slots.map((slot) => {
    const slotIndex = PERIOD_ORDER.indexOf(slot.period)

    if (slot.period === period) {
      return { ...slot, startAt, endAt }
    }

    if (slotIndex < forcedIndex) {
      return { ...slot, startAt: pastStart, endAt: pastEnd }
    }

    return slot
  })
}

async function main() {
  const userArg = process.argv[2] ?? 'seed@quantum.journal'
  const period = process.argv[3] ?? 'morning'
  const validPeriods = ['morning', 'afternoon', 'evening']

  if (!validPeriods.includes(period)) {
    console.error('Período inválido. Use: morning, afternoon ou evening')
    process.exit(1)
  }

  await connectMongo()
  const userId = await resolveUserId(userArg)

  if (!userId) {
    console.error('Usuário não encontrado:', userArg)
    process.exit(1)
  }

  const now = new Date()
  const dateKey = spDateKey(now)
  const db = getDb()

  await db.collection('user_daily_reminders').deleteOne({
    userId: new ObjectId(userId),
    date: dateKey,
  })

  const doc = await ensureDailyReminders(userId, now)
  const slots = applyForcedPeriod(doc.slots ?? [], period, now)

  await db.collection('user_daily_reminders').updateOne(
    { userId: new ObjectId(userId), date: dateKey },
    { $set: { slots } },
  )

  const presence = await getActivePresence(userId, now)

  console.log(`Slot forçado: ${period} (${dateKey}, fuso America/Sao_Paulo)`)
  console.log('Se você fechou um banner antes, abra aba anônima ou limpe sessionStorage.')
  console.log(JSON.stringify(presence, null, 2))
  await closeMongo()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
