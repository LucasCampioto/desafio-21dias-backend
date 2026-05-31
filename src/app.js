const express = require('express')
const cors = require('cors')
const config = require('./config')
const { connectMongo } = require('./adapters/mongo')
const { errorHandler } = require('./middleware/errorHandler')
const { buildCorsOptions, attachCorsOrigin } = require('./cors')

const authRoutes = require('./routes/auth')
const sessionsRoutes = require('./routes/sessions')
const daysRoutes = require('./routes/days')
const muralRoutes = require('./routes/mural')
const assistantRoutes = require('./routes/assistant')
const evolutionRoutes = require('./routes/evolution')

/** Vercel rewrite para /api — normaliza path para rotas Express na raiz. */
function stripApiPrefix(req, res, next) {
  const url = req.url || ''
  if (url === '/api' || url === '/api/') {
    req.url = '/'
  } else if (url.startsWith('/api/')) {
    req.url = url.slice(4) || '/'
  }
  next()
}

function validateVercelEnv() {
  if (!process.env.VERCEL) return

  if (!config.jwtSecret || config.jwtSecret === 'dev-secret-change-in-production') {
    throw new Error(
      'JWT_SECRET inválido ou ausente. Configure um segredo forte nas envs da Vercel.',
    )
  }
}

async function ensureMongoConnected(req, res, next) {
  if (req.method === 'OPTIONS') {
    next()
    return
  }

  try {
    await connectMongo()
    next()
  } catch (err) {
    next(err)
  }
}

function createApp() {
  validateVercelEnv()

  const app = express()

  app.use(stripApiPrefix)
  app.use(cors(buildCorsOptions(config)))
  app.use(attachCorsOrigin(config))
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.VERCEL ? 'vercel' : 'local' })
  })

  app.use(ensureMongoConnected)

  app.use('/auth', authRoutes)
  app.use('/sessions', sessionsRoutes)
  app.use('/sessions/:id/days', daysRoutes)
  app.use('/mural', muralRoutes)
  app.use('/assistant', assistantRoutes)
  app.use('/evolution', evolutionRoutes)

  app.use(errorHandler)

  return app
}

module.exports = { createApp }
