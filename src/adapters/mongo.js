const { MongoClient } = require('mongodb')
const config = require('../config')

let client = null
let db = null

async function connectMongo() {
  if (db) return db

  client = new MongoClient(config.mongodbUri)
  await client.connect()
  db = client.db()

  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('sessions').createIndex({ userId: 1, status: 1 })
  await db.collection('session_progress').createIndex({ sessionId: 1 }, { unique: true })
  await db.collection('day_answers').createIndex({ sessionId: 1, dayId: 1 }, { unique: true })
  await db.collection('mural_cards').createIndex({ userId: 1 })
  await db.collection('day_signals').createIndex({ sessionId: 1, dayId: 1 }, { unique: true })
  await db.collection('session_metrics').createIndex({ sessionId: 1 }, { unique: true })
  await db.collection('evolution_reports').createIndex({ userId: 1 }, { unique: true })
  await db.collection('user_daily_reminders').createIndex({ userId: 1, date: 1 }, { unique: true })

  return db
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB não conectado. Chame connectMongo() primeiro.')
  }
  return db
}

async function closeMongo() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

module.exports = { connectMongo, getDb, closeMongo }
