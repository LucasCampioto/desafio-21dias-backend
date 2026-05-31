const express = require('express')
const sessionService = require('../services/sessionService')
const { chatWithAurora } = require('../services/agentsClient')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.post('/chat', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body
    if (!message) {
      return res.status(400).json({ error: 'message é obrigatório' })
    }

    let activeSessionId = sessionId
    if (!activeSessionId) {
      const active = await sessionService.getActiveSession(req.userId)
      activeSessionId = active?.id || null
      if (!activeSessionId) {
        activeSessionId = await sessionService.resolveSessionFallbackId(req.userId)
      }
    }

    const result = await chatWithAurora(req.userId, activeSessionId, message)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router
