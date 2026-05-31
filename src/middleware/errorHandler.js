const { applyCorsHeaders } = require('../cors')

function errorHandler(err, req, res, next) {
  console.error(err)

  const status = err.status || 500
  const message = err.message || 'Erro interno do servidor'

  applyCorsHeaders(req, res)
  res.status(status).json({ error: message })
}

module.exports = { errorHandler }
