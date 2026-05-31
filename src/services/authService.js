const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const config = require('../config')

function createToken(userId) {
  return jwt.sign({ userId: userId.toString() }, config.jwtSecret, { expiresIn: '30d' })
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    muralPresenceEnabled: user.muralPresenceEnabled !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function signup(name, email, password) {
  const db = getDb()
  const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
  if (existing) {
    const err = new Error('E-mail já cadastrado')
    err.status = 409
    throw err
  }

  const now = new Date()
  const passwordHash = await bcrypt.hash(password, 10)

  const result = await db.collection('users').insertOne({
    name,
    email: email.toLowerCase(),
    passwordHash,
    muralPresenceEnabled: true,
    createdAt: now,
    updatedAt: now,
  })

  const user = { _id: result.insertedId, name, email: email.toLowerCase(), createdAt: now, updatedAt: now }
  const token = createToken(result.insertedId)

  return { user: sanitizeUser(user), token }
}

async function login(email, password) {
  const db = getDb()
  const user = await db.collection('users').findOne({ email: email.toLowerCase() })
  if (!user) {
    const err = new Error('Credenciais inválidas')
    err.status = 401
    throw err
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const err = new Error('Credenciais inválidas')
    err.status = 401
    throw err
  }

  const token = createToken(user._id)
  return { user: sanitizeUser(user), token }
}

async function getUserById(userId) {
  const db = getDb()
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    const err = new Error('Usuário não encontrado')
    err.status = 404
    throw err
  }
  return sanitizeUser(user)
}

async function updateProfile(userId, updates) {
  const db = getDb()
  const allowed = {}
  if (updates.name) allowed.name = updates.name
  if (updates.email) allowed.email = updates.email.toLowerCase()
  if (typeof updates.muralPresenceEnabled === 'boolean') {
    allowed.muralPresenceEnabled = updates.muralPresenceEnabled
  }

  if (Object.keys(allowed).length === 0) {
    return getUserById(userId)
  }

  allowed.updatedAt = new Date()

  const result = await db.collection('users').findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: allowed },
    { returnDocument: 'after' }
  )

  if (!result) {
    const err = new Error('Usuário não encontrado')
    err.status = 404
    throw err
  }

  return sanitizeUser(result)
}

module.exports = { signup, login, getUserById, updateProfile, createToken }
