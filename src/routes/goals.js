const express = require('express')
const goalsService = require('../services/goalsService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const goals = await goalsService.getGoals(req.userId)
    res.json({ goals })
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
    const { done, text } = req.body || {}
    const goal = await goalsService.updateGoal(req.userId, req.params.id, { done, text })
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
