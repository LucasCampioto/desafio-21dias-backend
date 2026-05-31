const express = require('express')
const sessionService = require('../services/sessionService')
const { getCurrentActiveDay, getDayStatus } = require('../services/dayAccessService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const sessions = await sessionService.getSessionsHistory(req.userId)
    res.json(sessions)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { startDay } = req.body
    const session = await sessionService.createSession(req.userId, startDay)
    res.status(201).json(session)
  } catch (err) {
    next(err)
  }
})

router.get('/active', async (req, res, next) => {
  try {
    const session = await sessionService.getActiveSession(req.userId)
    res.json(session)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await sessionService.deleteSession(req.userId, req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.get('/:id/progress', async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.userId, req.params.id)
    const progress = await sessionService.getSessionProgress(req.userId, req.params.id)
    const currentDay = getCurrentActiveDay(session, progress)

    const dayStatuses = {}
    for (let dayId = 1; dayId <= 21; dayId++) {
      dayStatuses[dayId] = getDayStatus(dayId, session, progress)
    }

    res.json({
      ...progress,
      currentDay,
      dayStatuses,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
