const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')

const KINDS = new Set(['do', 'avoid'])
const MAX_TEXT = 160

function httpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

function toUserId(userId) {
  if (!ObjectId.isValid(userId)) throw httpError('Usuário inválido', 401)
  return new ObjectId(userId)
}

function toGoalId(goalId) {
  if (!ObjectId.isValid(goalId)) throw httpError('Meta não encontrada', 404)
  return new ObjectId(goalId)
}

function isDone(goal) {
  if (typeof goal.done === 'boolean') return goal.done
  return Array.isArray(goal.checks) && goal.checks.some(Boolean)
}

function formatGoal(goal) {
  return {
    id: goal._id.toString(),
    kind: goal.kind === 'avoid' ? 'avoid' : 'do',
    text: goal.text,
    done: isDone(goal),
  }
}

async function getGoals(userId) {
  const db = getDb()
  const goals = await db
    .collection('weekly_goals')
    .find({ userId: toUserId(userId) })
    .sort({ createdAt: 1 })
    .toArray()

  return goals.map(formatGoal)
}

async function createGoal(userId, { text, kind }) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw httpError('Escreva a meta antes de adicionar.', 400)
  if (trimmed.length > MAX_TEXT) throw httpError('A meta precisa ter no máximo 160 caracteres.', 400)
  if (!KINDS.has(kind)) throw httpError('Tipo de meta inválido.', 400)

  const doc = {
    userId: toUserId(userId),
    kind,
    text: trimmed,
    done: false,
    createdAt: new Date(),
  }

  const db = getDb()
  const result = await db.collection('weekly_goals').insertOne(doc)
  return formatGoal({ _id: result.insertedId, ...doc })
}

async function updateGoal(userId, goalId, { text, done }) {
  const updates = {}

  if (done !== undefined) {
    if (typeof done !== 'boolean') throw httpError('Informe se a meta foi concluída.', 400)
    updates.done = done
  }

  if (text !== undefined) {
    const trimmed = typeof text === 'string' ? text.trim() : ''
    if (!trimmed) throw httpError('Escreva a meta antes de salvar.', 400)
    if (trimmed.length > MAX_TEXT) throw httpError('A meta precisa ter no máximo 160 caracteres.', 400)
    updates.text = trimmed
  }

  if (Object.keys(updates).length === 0) throw httpError('Nada para atualizar.', 400)

  const db = getDb()
  const goal = await db.collection('weekly_goals').findOne({
    _id: toGoalId(goalId),
    userId: toUserId(userId),
  })

  if (!goal) throw httpError('Meta não encontrada', 404)

  await db.collection('weekly_goals').updateOne({ _id: goal._id }, { $set: updates })
  return formatGoal({ ...goal, ...updates })
}

async function deleteGoal(userId, goalId) {
  const db = getDb()
  const result = await db.collection('weekly_goals').deleteOne({
    _id: toGoalId(goalId),
    userId: toUserId(userId),
  })

  if (result.deletedCount === 0) throw httpError('Meta não encontrada', 404)
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
}
