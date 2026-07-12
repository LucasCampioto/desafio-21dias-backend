const config = require('../config')

const AGENTS_TIMEOUT_MS = Number(process.env.AGENTS_TIMEOUT_MS) || 110_000

async function agentsFetch(path, options = {}) {
  const url = `${config.agentsUrl}${path}`
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': config.agentsApiKey,
    ...options.headers,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AGENTS_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      let detail = text
      try {
        const parsed = JSON.parse(text)
        detail = parsed.detail || parsed.error || parsed.message || text
        if (Array.isArray(detail)) {
          detail = detail.map((item) => item.msg || JSON.stringify(item)).join('; ')
        }
      } catch {
        // body não-JSON (HTML da Vercel etc.)
      }
      const err = new Error(`Agents service error: ${response.status} ${detail}`)
      err.status = response.status >= 500 ? 502 : response.status
      throw err
    }

    return response
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(
        'O serviço de IA demorou demais para responder. Tente novamente em alguns segundos.',
      )
      timeoutErr.status = 504
      throw timeoutErr
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
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
