const { MongoClient } = require('mongodb')
const config = require('../config')

const globalCache = global

let client = null
let db = null
let connectPromise = null

async function ensureIndexes(database) {
  try {
    await database.collection('users').createIndex({ email: 1 }, { unique: true })
    await database.collection('sessions').createIndex({ userId: 1, status: 1 })
    await database.collection('session_progress').createIndex({ sessionId: 1 }, { unique: true })
    await database.collection('day_answers').createIndex({ sessionId: 1, dayId: 1 }, { unique: true })
    await database.collection('mural_cards').createIndex({ userId: 1 })
    await database.collection('day_signals').createIndex({ sessionId: 1, dayId: 1 }, { unique: true })
    await database.collection('session_metrics').createIndex({ sessionId: 1 }, { unique: true })
    await database.collection('evolution_reports').createIndex({ userId: 1 }, { unique: true })
    await database.collection('user_daily_reminders').createIndex({ userId: 1, date: 1 }, { unique: true })
  } catch (err) {
    console.warn('ensureIndexes:', err.message)
  }
}

async function connectMongo() {
  if (db) return db

  if (globalCache.__qjMongoDb) {
    db = globalCache.__qjMongoDb
    client = globalCache.__qjMongoClient
    return db
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      if (process.env.VERCEL && (!config.mongodbUri || config.mongodbUri.includes('localhost'))) {
        throw new Error(
          'MONGODB_URI inválida ou ausente. Configure a URI do MongoDB Atlas nas envs da Vercel.',
        )
      }

      const mongoClient = new MongoClient(config.mongodbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      })

      await mongoClient.connect()
      const database = mongoClient.db()

      await ensureIndexes(database)

      client = mongoClient
      db = database
      globalCache.__qjMongoClient = mongoClient
      globalCache.__qjMongoDb = database

      return database
    })().catch((err) => {
      connectPromise = null
      throw err
    })
  }

  return connectPromise
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
    connectPromise = null
    globalCache.__qjMongoClient = null
    globalCache.__qjMongoDb = null
  }
}

module.exports = { connectMongo, getDb, closeMongo }
