const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { generatePresenceMessages } = require('./agentsClient')
const {
  buildPresenceInput,
  pickFallbackSlot,
  emptyJourneySlot,
  validateAiSlot,
  sourceKey,
} = require('./presenceInputBuilder')
const { TIMEZONE, buildSlotTimes, spDateKey } = require('./presenceTime')

const PERIODS = ['morning', 'afternoon', 'evening']
const PERIOD_RANK = { morning: 0, afternoon: 1, evening: 2 }

function mapActiveSlot(slot) {
  return {
    slotId: slot.slotId,
    period: slot.period,
    title: slot.title,
    body: slot.body,
    quote: slot.quote,
    source: slot.source,
    startAt: slot.startAt,
    endAt: slot.endAt,
  }
}

async function isPresenceEnabled(userId) {
  const db = getDb()
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { muralPresenceEnabled: 1 } }
  )
  if (!user) return true
  return user.muralPresenceEnabled !== false
}

function mergeSlotWithTimes(period, content, times, dateKey) {
  const slotId = `${dateKey}-${period}`
  return {
    slotId,
    period,
    startAt: times[period].startAt,
    endAt: times[period].endAt,
    title: content.title,
    body: content.body,
    quote: content.quote ?? '',
    source: content.source ?? { type: 'unknown' },
  }
}

function buildSlotsFromAi(aiSlots, input, times, dateKey) {
  const used = new Set()
  const result = []

  for (const period of PERIODS) {
    const aiSlot = (aiSlots ?? []).find((s) => s.period === period)
    let content = null

    if (aiSlot && validateAiSlot(aiSlot, input.candidates)) {
      content = {
        period,
        title: aiSlot.title,
        body: aiSlot.body,
        quote: aiSlot.quote,
        source: aiSlot.source,
      }
    } else if (input.hasJourney) {
      content = pickFallbackSlot(period, input.candidates, used) ?? emptyJourneySlot(period)
    } else {
      content = emptyJourneySlot(period)
    }

    if (content?.source) used.add(sourceKey(content.source))
    result.push(mergeSlotWithTimes(period, content, times, dateKey))
  }

  return result
}

function buildFallbackSlots(input, times, dateKey) {
  const used = new Set()
  return PERIODS.map((period) => {
    const content = input.hasJourney
      ? pickFallbackSlot(period, input.candidates, used) ?? emptyJourneySlot(period)
      : emptyJourneySlot(period)
    if (content?.source) used.add(sourceKey(content.source))
    return mergeSlotWithTimes(period, content, times, dateKey)
  })
}

async function ensureDailyReminders(userId, now = new Date()) {
  const dateKey = spDateKey(now)
  const db = getDb()

  const existing = await db.collection('user_daily_reminders').findOne({
    userId: new ObjectId(userId),
    date: dateKey,
  })

  if (existing) return existing

  const input = await buildPresenceInput(userId, dateKey)
  const times = buildSlotTimes(userId, dateKey)

  let slots = []

  if (input.candidates.length > 0) {
    try {
      const aiResponse = await generatePresenceMessages(input)
      slots = buildSlotsFromAi(aiResponse?.slots, input, times, dateKey)
    } catch {
      slots = buildFallbackSlots(input, times, dateKey)
    }
  } else {
    slots = buildFallbackSlots(input, times, dateKey)
  }

  const doc = {
    userId: new ObjectId(userId),
    date: dateKey,
    timezone: TIMEZONE,
    sessionId: input.sessionId ? new ObjectId(input.sessionId) : null,
    slots,
    generatedAt: now,
  }

  await db.collection('user_daily_reminders').insertOne(doc)
  return doc
}

function findActiveSlots(doc, now) {
  if (!doc?.slots?.length) return []
  const ts = now.getTime()
  return doc.slots.filter((s) => {
    const start = new Date(s.startAt).getTime()
    const end = new Date(s.endAt).getTime()
    return ts >= start && ts < end
  })
}

/** When slots overlap (e.g. after manual QA edits), prefer the latest period of the day. */
function pickBestActiveSlot(activeSlots) {
  if (!activeSlots.length) return null
  return [...activeSlots].sort((a, b) => PERIOD_RANK[b.period] - PERIOD_RANK[a.period])[0]
}

function findActiveSlot(doc, now) {
  return pickBestActiveSlot(findActiveSlots(doc, now))
}

function findNextSlot(doc, now) {
  if (!doc?.slots?.length) return null
  const ts = now.getTime()
  const upcoming = doc.slots
    .filter((s) => new Date(s.startAt).getTime() > ts)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  return upcoming[0] ?? null
}

async function getActivePresence(userId, now = new Date()) {
  const enabled = await isPresenceEnabled(userId)
  if (!enabled) {
    return { active: null, nextSlotAt: null, enabled: false }
  }

  const doc = await ensureDailyReminders(userId, now)
  const activeSlots = findActiveSlots(doc, now)
  const active = pickBestActiveSlot(activeSlots)
  const next = findNextSlot(doc, now)

  return {
    enabled: true,
    active: active ? mapActiveSlot(active) : null,
    activeSlots: activeSlots.map(mapActiveSlot),
    nextSlotAt: next?.startAt ?? null,
  }
}

module.exports = {
  ensureDailyReminders,
  getActivePresence,
  isPresenceEnabled,
  findActiveSlots,
  pickBestActiveSlot,
}
