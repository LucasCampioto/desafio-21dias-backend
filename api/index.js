const serverless = require('serverless-http')
const { createApp } = require('../src/app')

let handler = null
let initError = null

async function getHandler() {
  if (initError) throw initError
  if (handler) return handler

  try {
    const app = await createApp()
    handler = serverless(app, {
      binary: ['image/*', 'application/octet-stream'],
    })
    return handler
  } catch (err) {
    initError = err
    console.error('Falha ao iniciar backend:', err)
    throw err
  }
}

module.exports = async (req, res) => {
  try {
    const fn = await getHandler()
    return fn(req, res)
  } catch (err) {
    console.error('FUNCTION_INVOCATION_FAILED:', err)
    res.status(500).json({
      error: err.message || 'Erro ao iniciar o servidor',
      hint: 'Verifique MONGODB_URI, JWT_SECRET e logs na Vercel.',
    })
  }
}
