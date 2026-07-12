const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { getSessionById, getSessionProgress, completeSession } = require('./sessionService')
const { canAccessDay, isJourneyComplete } = require('./dayAccessService')
const { analyzeDay } = require('./agentsClient')
const { aggregateSession } = require('./metricsService')

async function getDayAnswers(userId, sessionId, dayId) {
  const session = await getSessionById(userId, sessionId)
  const progress = await getSessionProgress(userId, sessionId)

  if (!canAccessDay(Number(dayId), session, progress)) {
    const err = new Error('Dia bloqueado')
    err.status = 403
    throw err
  }

  const db = getDb()
  const doc = await db.collection('day_answers').findOne({
    sessionId: new ObjectId(sessionId),
    dayId: Number(dayId),
  })

  return doc?.answers || {}
}

async function saveDayAnswers(userId, sessionId, dayId, answers) {
  const session = await getSessionById(userId, sessionId)
  const progress = await getSessionProgress(userId, sessionId)

  if (!canAccessDay(Number(dayId), session, progress)) {
    const err = new Error('Dia bloqueado')
    err.status = 403
    throw err
  }

  const db = getDb()
  const now = new Date()
  const filter = {
    sessionId: new ObjectId(sessionId),
    userId: new ObjectId(userId),
    dayId: Number(dayId),
  }

  await db.collection('day_answers').updateOne(
    filter,
    { $set: { answers, updatedAt: now }, $setOnInsert: filter },
    { upsert: true },
  )

  return answers
}

async function markDayComplete(userId, sessionId, dayId) {
  const session = await getSessionById(userId, sessionId)
  const progress = await getSessionProgress(userId, sessionId)
  const numericDayId = Number(dayId)

  if (!canAccessDay(numericDayId, session, progress)) {
    const err = new Error('Dia bloqueado')
    err.status = 403
    throw err
  }

  const db = getDb()
  const completedDays = progress.completedDays || []

  if (!completedDays.includes(numericDayId)) {
    const updated = [...completedDays, numericDayId].sort((a, b) => a - b)
    await db.collection('session_progress').updateOne(
      { sessionId: new ObjectId(sessionId) },
      { $set: { completedDays: updated } },
    )
    progress.completedDays = updated
  }

  // AnalyzeDay pode falhar; métricas devem ser agregadas mesmo assim.
  try {
    await analyzeDay(userId, sessionId, numericDayId)
  } catch (err) {
    console.error('Erro ao analisar dia:', err.message)
  }

  try {
    await aggregateSession(userId, sessionId)
  } catch (err) {
    console.error('Erro ao agregar métricas:', err.message)
  }

  if (isJourneyComplete(progress)) {
    await completeSession(sessionId)
  }

  return { completedDays: progress.completedDays }
}

module.exports = { getDayAnswers, saveDayAnswers, markDayComplete }
