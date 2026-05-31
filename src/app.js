const express = require('express')
const cors = require('cors')
const config = require('./config')
const { connectMongo } = require('./adapters/mongo')
const { errorHandler } = require('./middleware/errorHandler')

const authRoutes = require('./routes/auth')
const sessionsRoutes = require('./routes/sessions')
const daysRoutes = require('./routes/days')
const muralRoutes = require('./routes/mural')
const assistantRoutes = require('./routes/assistant')
const evolutionRoutes = require('./routes/evolution')

function parseCorsOrigins() {
  return config.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function buildCorsOptions() {
  const allowedOrigins = parseCorsOrigins()

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  }
}

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

async function createApp() {
  await connectMongo()

  const app = express()

  app.use(stripApiPrefix)
  app.use(cors(buildCorsOptions()))
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.VERCEL ? 'vercel' : 'local' })
  })

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
