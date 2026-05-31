const express = require('express')
const dayService = require('../services/dayService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router({ mergeParams: true })

router.use(authMiddleware)

router.get('/:dayId/answers', async (req, res, next) => {
  try {
    const answers = await dayService.getDayAnswers(req.userId, req.params.id, req.params.dayId)
    res.json(answers)
  } catch (err) {
    next(err)
  }
})

router.put('/:dayId/answers', async (req, res, next) => {
  try {
    const answers = await dayService.saveDayAnswers(
      req.userId,
      req.params.id,
      req.params.dayId,
      req.body
    )
    res.json(answers)
  } catch (err) {
    next(err)
  }
})

router.post('/:dayId/complete', async (req, res, next) => {
  try {
    const result = await dayService.markDayComplete(req.userId, req.params.id, req.params.dayId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router
