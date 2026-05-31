const express = require('express')
const muralService = require('../services/muralService')
const { getActivePresence } = require('../services/presenceService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.get('/presence', async (req, res, next) => {
  try {
    const data = await getActivePresence(req.userId)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/cards', async (req, res, next) => {
  try {
    const cards = await muralService.getMuralCards(req.userId)
    res.json(cards)
  } catch (err) {
    next(err)
  }
})

router.post('/cards', async (req, res, next) => {
  try {
    const { text } = req.body
    const card = await muralService.createCard(req.userId, text)
    res.status(201).json(card)
  } catch (err) {
    next(err)
  }
})

router.put('/cards/:id', async (req, res, next) => {
  try {
    const card = await muralService.updateCard(req.userId, req.params.id, req.body)
    res.json(card)
  } catch (err) {
    next(err)
  }
})

router.delete('/cards/:id', async (req, res, next) => {
  try {
    await muralService.deleteCard(req.userId, req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
