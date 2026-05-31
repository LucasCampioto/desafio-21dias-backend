const config = require('../config')

async function agentsFetch(path, options = {}) {
  const url = `${config.agentsUrl}${path}`
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': config.agentsApiKey,
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    const text = await response.text()
    const err = new Error(`Agents service error: ${response.status} ${text}`)
    err.status = response.status
    throw err
  }

  return response
}

async function analyzeDay(userId, sessionId, dayId) {
  const response = await agentsFetch('/internal/analyze-day', {
    method: 'POST',
    body: JSON.stringify({ userId, sessionId, dayId }),
  })
  return response.json()
}

async function chatWithAurora(userId, sessionId, message) {
  const payload = { userId, message }
  if (sessionId) payload.sessionId = sessionId

  const response = await agentsFetch('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.json()
}

async function generateEvolutionReport(userId) {
  const response = await agentsFetch('/evolution/generate', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  return response.json()
}

async function generatePresenceMessages(presenceInput) {
  const response = await agentsFetch('/internal/presence/generate', {
    method: 'POST',
    body: JSON.stringify(presenceInput),
  })
  return response.json()
}

module.exports = { analyzeDay, chatWithAurora, generateEvolutionReport, generatePresenceMessages }
