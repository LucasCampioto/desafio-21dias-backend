const express = require('express')
const goalsService = require('../services/goalsService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const data = await goalsService.getGoals(req.userId, req.query.weekStart)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const goal = await goalsService.createGoal(req.userId, req.body || {})
    res.status(201).json(goal)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { done, text, weekStart, dueDate } = req.body || {}
    const goal = await goalsService.updateGoal(req.userId, req.params.id, {
      done,
      text,
      weekStart,
      dueDate,
    })
    res.json(goal)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await goalsService.deleteGoal(req.userId, req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
