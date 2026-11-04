const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')

const KINDS = new Set(['do', 'avoid'])
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT = 160

function httpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

function isoDateUTC(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseISODateUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function isRealISODate(iso) {
  if (!WEEK_RE.test(iso)) return false
  return isoDateUTC(parseISODateUTC(iso)) === iso
}

function mondayOnOrBefore(iso) {
  const date = parseISODateUTC(iso)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return isoDateUTC(date)
}

function currentWeekStart() {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return mondayOnOrBefore(iso)
}

function weekStartFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return currentWeekStart()
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  return mondayOnOrBefore(iso)
}

function assertWeekStart(value) {
  if (!isRealISODate(value) || parseISODateUTC(value).getUTCDay() !== 1) {
    throw httpError('Semana inválida. Use a segunda-feira no formato AAAA-MM-DD.', 400)
  }
  return value
}

function normalizeDueDate(value) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !isRealISODate(value)) {
    throw httpError('Data inválida. Use o formato AAAA-MM-DD.', 400)
  }
  return value
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

function resolveWeekStart(goal) {
  if (typeof goal.weekStart === 'string' && isRealISODate(goal.weekStart)) {
    return mondayOnOrBefore(goal.weekStart)
  }
  return weekStartFromDate(goal.createdAt)
}

function formatGoal(goal) {
  return {
    id: goal._id.toString(),
    weekStart: resolveWeekStart(goal),
    dueDate: typeof goal.dueDate === 'string' && isRealISODate(goal.dueDate) ? goal.dueDate : null,
    kind: goal.kind === 'avoid' ? 'avoid' : 'do',
    text: goal.text,
    done: isDone(goal),
    createdAt: goal.createdAt,
  }
}

function sortGoals(goals) {
  return [...goals].sort((a, b) => {
    const aDate = a.dueDate || '9999-99-99'
    const bDate = b.dueDate || '9999-99-99'
    if (aDate !== bDate) return aDate < bDate ? -1 : 1
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return aCreated - bCreated
  })
}

function summarizeWeeks(goals) {
  const byWeek = new Map()

  for (const goal of goals) {
    const weekStart = resolveWeekStart(goal)
    const done = isDone(goal)
    const kind = goal.kind === 'avoid' ? 'avoid' : 'do'
    const current = byWeek.get(weekStart) || {
      weekStart,
      total: 0,
      done: 0,
      doTotal: 0,
      doDone: 0,
      avoidTotal: 0,
      avoidDone: 0,
    }

    current.total += 1
    if (done) current.done += 1
    if (kind === 'do') {
      current.doTotal += 1
      if (done) current.doDone += 1
    } else {
      current.avoidTotal += 1
      if (done) current.avoidDone += 1
    }

    byWeek.set(weekStart, current)
  }

  return [...byWeek.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
}

async function backfillMissingWeekStarts(userId, goals) {
  const missing = goals.filter((goal) => !goal.weekStart)
  if (missing.length === 0) return goals

  const db = getDb()
  await Promise.all(
    missing.map((goal) =>
      db.collection('weekly_goals').updateOne(
        { _id: goal._id, userId },
        { $set: { weekStart: resolveWeekStart(goal) } },
      ),
    ),
  )

  return goals.map((goal) =>
    goal.weekStart ? goal : { ...goal, weekStart: resolveWeekStart(goal) },
  )
}

async function getGoals(userId, weekStartInput) {
  const current = currentWeekStart()
  const weekStart = weekStartInput ? assertWeekStart(weekStartInput) : null
  const db = getDb()
  const ownerId = toUserId(userId)

  const allGoals = await db
    .collection('weekly_goals')
    .find({ userId: ownerId })
    .sort({ createdAt: 1 })
    .toArray()

  const normalized = await backfillMissingWeekStarts(ownerId, allGoals)
  const weeks = summarizeWeeks(normalized)
  const filtered = weekStart
    ? normalized.filter((goal) => resolveWeekStart(goal) === weekStart)
    : normalized

  return {
    currentWeekStart: current,
    weekStart: weekStart || current,
    goals: sortGoals(filtered).map(formatGoal),
    weeks,
  }
}

async function createGoal(userId, { text, kind, weekStart, dueDate }) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw httpError('Escreva a meta antes de adicionar.', 400)
  if (trimmed.length > MAX_TEXT) throw httpError('A meta precisa ter no máximo 160 caracteres.', 400)
  if (!KINDS.has(kind)) throw httpError('Tipo de meta inválido.', 400)

  const normalizedDueDate = dueDate === undefined ? null : normalizeDueDate(dueDate)
  const resolvedWeekStart = assertWeekStart(
    weekStart || (normalizedDueDate ? mondayOnOrBefore(normalizedDueDate) : currentWeekStart()),
  )

  const doc = {
    userId: toUserId(userId),
    weekStart: resolvedWeekStart,
    dueDate: normalizedDueDate,
    kind,
    text: trimmed,
    done: false,
    createdAt: new Date(),
  }

  const db = getDb()
  const result = await db.collection('weekly_goals').insertOne(doc)
  return formatGoal({ _id: result.insertedId, ...doc })
}

async function updateGoal(userId, goalId, { text, done, weekStart, dueDate }) {
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

  if (dueDate !== undefined) {
    updates.dueDate = normalizeDueDate(dueDate)
    if (updates.dueDate && weekStart === undefined) {
      updates.weekStart = mondayOnOrBefore(updates.dueDate)
    }
  }

  if (weekStart !== undefined) {
    updates.weekStart = assertWeekStart(weekStart)
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
