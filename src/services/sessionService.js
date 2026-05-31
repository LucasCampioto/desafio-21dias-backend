const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')

function weekLabelForStartDay(startDay) {
  if (startDay === 1) return 'Semana 1 — Observação'
  if (startDay === 8) return 'Semana 2 — Propósito Claro'
  return 'Semana 3 — Nova Identidade'
}

function formatSession(session) {
  return {
    id: session._id.toString(),
    startDay: session.startDay,
    createdAt: session.createdAt,
    status: session.status,
    label: session.label,
    weekLabel: session.weekLabel,
    completedAt: session.completedAt || null,
  }
}

async function getSessionsHistory(userId) {
  const db = getDb()
  const sessions = await db
    .collection('sessions')
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray()

  return sessions.map(formatSession)
}

async function getActiveSession(userId) {
  const db = getDb()
  const session = await db.collection('sessions').findOne({
    userId: new ObjectId(userId),
    status: 'active',
  })

  return session ? formatSession(session) : null
}

/** When nothing is active, pick a session for Aurora: newest completed first, else most recent overall. */
async function resolveSessionFallbackId(userId) {
  const history = await getSessionsHistory(userId)
  if (!history.length) return null
  const preferred = history.find((s) => s.status === 'completed') ?? history[0]
  return preferred?.id ?? null
}

async function getSessionById(userId, sessionId) {
  const db = getDb()
  const session = await db.collection('sessions').findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  })

  if (!session) {
    const err = new Error('Sessão não encontrada')
    err.status = 404
    throw err
  }

  return session
}

async function getSessionProgress(userId, sessionId) {
  await getSessionById(userId, sessionId)

  const db = getDb()
  const progress = await db.collection('session_progress').findOne({
    sessionId: new ObjectId(sessionId),
  })

  if (!progress) {
    const err = new Error('Progresso não encontrado')
    err.status = 404
    throw err
  }

  return {
    startDay: progress.startDay,
    startedAt: progress.startedAt,
    completedDays: progress.completedDays || [],
    simulatedDaysOffset: progress.simulatedDaysOffset || 0,
  }
}

async function completeSession(sessionId) {
  const db = getDb()
  await db.collection('sessions').updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: { status: 'completed', completedAt: new Date() } }
  )
}

async function createSession(userId, startDay = 1) {
  const db = getDb()
  const active = await getActiveSession(userId)

  if (active) {
    const progress = await getSessionProgress(userId, active.id)
    if (progress.completedDays.length >= 21) {
      await completeSession(active.id)
    }
  }

  const history = await getSessionsHistory(userId)
  const sessionNumber = history.length + 1
  const now = new Date()
  const parsedStartDay = Number(startDay) || 1

  const sessionDoc = {
    userId: new ObjectId(userId),
    label: `Jornada ${sessionNumber}`,
    startDay: parsedStartDay,
    status: 'active',
    weekLabel: weekLabelForStartDay(parsedStartDay),
    createdAt: now,
    completedAt: null,
  }

  const result = await db.collection('sessions').insertOne(sessionDoc)
  const sessionId = result.insertedId

  await db.collection('session_progress').insertOne({
    sessionId,
    userId: new ObjectId(userId),
    startDay: parsedStartDay,
    startedAt: now,
    completedDays: [],
    simulatedDaysOffset: 0,
  })

  return formatSession({ ...sessionDoc, _id: sessionId })
}

async function deleteSession(userId, sessionId) {
  await getSessionById(userId, sessionId)

  const db = getDb()
  const sessionObjectId = new ObjectId(sessionId)

  await Promise.all([
    db.collection('day_answers').deleteMany({ sessionId: sessionObjectId }),
    db.collection('day_signals').deleteMany({ sessionId: sessionObjectId }),
    db.collection('session_metrics').deleteMany({ sessionId: sessionObjectId }),
    db.collection('session_progress').deleteOne({ sessionId: sessionObjectId }),
    db.collection('sessions').deleteOne({ _id: sessionObjectId, userId: new ObjectId(userId) }),
  ])
}

module.exports = {
  getSessionsHistory,
  getActiveSession,
  resolveSessionFallbackId,
  getSessionById,
  getSessionProgress,
  createSession,
  completeSession,
  deleteSession,
  formatSession,
}
