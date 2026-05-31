const express = require('express')
const authService = require('../services/authService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email e password são obrigatórios' })
    }
    const result = await authService.signup(name, email, password)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email e password são obrigatórios' })
    }
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.userId)
    res.json(user)
  } catch (err) {
    next(err)
  }
})

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.userId, req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
})

module.exports = router
