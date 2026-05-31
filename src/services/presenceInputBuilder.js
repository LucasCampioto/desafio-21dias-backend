const fs = require('fs')
const path = require('path')
const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { resolveSessionFallbackId } = require('./sessionService')

const DAYS_PATH = path.join(__dirname, '../content/days.json')
const MAX_QUOTE = 180

const PERIOD_FIELDS = {
  morning: ['declaration', 'focus', 'intro'],
  afternoon: [
    'financial_commitment',
    'behavior_commitment',
    'financial_decision',
    'financial_patterns',
    'clarity_question',
  ],
  evening: [
    'new_life',
    'gratitude',
    'gratitude_financial',
    'impact_loved',
    'god_quality',
    'reality_14_days',
  ],
}

let daysCache = null

function loadDays() {
  if (!daysCache) {
    daysCache = JSON.parse(fs.readFileSync(DAYS_PATH, 'utf8'))
  }
  return daysCache
}

function getDayById(dayId) {
  return loadDays().find((d) => d.id === Number(dayId)) ?? null
}

function normalizeText(raw) {
  if (raw == null) return ''
  if (Array.isArray(raw)) return raw.filter(Boolean).join('; ')
  return String(raw).replace(/\s+/g, ' ').trim()
}

function shortQuote(text, max = MAX_QUOTE) {
  const t = normalizeText(text)
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function sourceKey(source) {
  if (!source) return ''
  if (source.type === 'mural_card') return `mural:${source.cardId}`
  if (source.type === 'metrics') return `metrics:${source.field ?? 'arc'}`
  if (source.type === 'day_meta') return `day_meta:${source.dayId}:${source.field}`
  return `day:${source.dayId}:${source.fieldId ?? 'answers'}`
}

function hashShuffle(items, seed) {
  return [...items]
    .map((item, idx) => ({
      item,
      order: hashString(`${seed}:${idx}:${sourceKey(item.source)}`),
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item)
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0
  }
  return h
}

async function getRecentUsedSources(userId, days = 14) {
  const db = getDb()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const docs = await db
    .collection('user_daily_reminders')
    .find({ userId: new ObjectId(userId), generatedAt: { $gte: since } })
    .project({ slots: 1 })
    .toArray()

  const used = new Set()
  for (const doc of docs) {
    for (const slot of doc.slots ?? []) {
      if (slot.source) used.add(sourceKey(slot.source))
    }
  }
  return used
}

async function buildPresenceInput(userId, dateKey) {
  const sessionId = await resolveSessionFallbackId(userId)
  if (!sessionId) {
    return { userId, dateKey, sessionId: null, candidates: [], hasJourney: false }
  }

  const db = getDb()
  const usedSources = await getRecentUsedSources(userId)

  const answers = await db
    .collection('day_answers')
    .find({ userId: new ObjectId(userId), sessionId: new ObjectId(sessionId) })
    .sort({ dayId: -1 })
    .toArray()

  const muralCards = await db
    .collection('mural_cards')
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(10)
    .toArray()

  const metrics = await db.collection('session_metrics').findOne({
    userId: new ObjectId(userId),
    sessionId: new ObjectId(sessionId),
  })

  const candidates = []

  for (const doc of answers) {
    const dayId = doc.dayId
    const dayMeta = getDayById(dayId)
    const answersMap = doc.answers ?? {}

    if (dayMeta?.declaration) {
      candidates.push({
        candidateId: `day_meta_${dayId}_declaration`,
        period: 'morning',
        quote: shortQuote(dayMeta.declaration),
        label: `Declaração — dia ${dayId}`,
        source: { type: 'day_meta', dayId, field: 'declaration' },
      })
    }

    if (dayMeta?.focus) {
      candidates.push({
        candidateId: `day_meta_${dayId}_focus`,
        period: 'morning',
        quote: shortQuote(dayMeta.focus),
        label: `Foco — dia ${dayId}`,
        source: { type: 'day_meta', dayId, field: 'focus' },
      })
    }

    for (const [fieldId, raw] of Object.entries(answersMap)) {
      const quote = shortQuote(raw)
      if (quote.length < 12) continue

      const fieldLower = fieldId.toLowerCase()
      let period = 'morning'
      if (PERIOD_FIELDS.afternoon.some((f) => fieldLower.includes(f.replace(/_/g, '')) || fieldLower.includes(f))) {
        period = 'afternoon'
      } else if (
        PERIOD_FIELDS.evening.some((f) => fieldLower.includes(f.replace(/_/g, '')) || fieldLower.includes(f))
      ) {
        period = 'evening'
      } else if (fieldLower.includes('financial') || fieldLower.includes('money')) {
        period = 'afternoon'
      }

      candidates.push({
        candidateId: `day_${dayId}_${fieldId}`,
        period,
        quote,
        label: `Dia ${dayId} — ${fieldId}`,
        source: { type: 'day_answer', dayId, fieldId },
      })
    }
  }

  for (const card of muralCards) {
    const quote = shortQuote(card.text)
    if (quote.length < 8) continue
    candidates.push({
      candidateId: `mural_${card._id.toString()}`,
      period: 'evening',
      quote,
      label: 'Mural',
      source: { type: 'mural_card', cardId: card._id.toString() },
    })
  }

  const arc = metrics?.campaignArc
  if (arc?.start && arc?.end) {
    const startPos = arc.start.positivePct ?? 0
    const endPos = arc.end.positivePct ?? 0
    if (endPos > startPos) {
      candidates.push({
        candidateId: 'metrics_arc',
        period: 'evening',
        quote: `Positividade na jornada: ${Math.round(startPos)}% → ${Math.round(endPos)}%`,
        label: 'Evolução emocional',
        source: { type: 'metrics', field: 'campaignArc' },
      })
    }
  }

  const filtered = candidates.filter((c) => !usedSources.has(sourceKey(c.source)))
  const shuffled = hashShuffle(filtered.length ? filtered : candidates, `${userId}:${dateKey}`)

  return {
    userId,
    dateKey,
    sessionId,
    hasJourney: answers.length > 0 || muralCards.length > 0,
    candidates: shuffled.slice(0, 15),
  }
}

function pickFallbackSlot(period, candidates, usedInDay) {
  const pool = candidates.filter((c) => c.period === period && !usedInDay.has(sourceKey(c.source)))
  const pick = pool[0] ?? candidates.find((c) => !usedInDay.has(sourceKey(c.source)))
  if (!pick) return null

  const templates = {
    morning: (q) => ({
      title: 'O que você já escolheu',
      body: `Você registrou: "${q}" — isso ainda faz parte de quem você está se tornando.`,
    }),
    afternoon: (q) => ({
      title: 'Seu compromisso',
      body: `Lembre do que você escreveu: "${q}" — um passo pequeno hoje já conta.`,
    }),
    evening: (q) => ({
      title: 'Quem você está se tornando',
      body: `Antes de encerrar o dia, lembre: "${q}"`,
    }),
  }

  const t = templates[period](pick.quote)
  return {
    period,
    title: t.title,
    body: t.body,
    quote: pick.quote,
    source: pick.source,
  }
}

function emptyJourneySlot(period) {
  const copy = {
    morning: {
      title: 'Sua jornada te espera',
      body: 'Quando você registrar os exercícios, poderei te lembrar — com suas palavras — quem você está se tornando.',
    },
    afternoon: {
      title: 'Um passo de cada vez',
      body: 'Complete mais um dia da jornada para que eu possa trazer de volta o que você mesma escreveu.',
    },
    evening: {
      title: 'Presença',
      body: 'Suas reflexões da jornada viram lembretes aqui. Comece ou retome quando fizer sentido.',
    },
  }
  return {
    period,
    title: copy[period].title,
    body: copy[period].body,
    quote: '',
    source: { type: 'empty' },
  }
}

function validateAiSlot(slot, candidates) {
  if (!slot?.quote || !slot?.body) return false
  const quote = normalizeText(slot.quote)
  const match = candidates.some((c) => normalizeText(c.quote).includes(quote) || quote.includes(normalizeText(c.quote)))
  if (!match) return false
  if (slot.source?.type === 'day_answer') {
    return candidates.some(
      (c) =>
        c.source?.type === 'day_answer' &&
        c.source.dayId === slot.source.dayId &&
        c.source.fieldId === slot.source.fieldId
    )
  }
  return true
}

module.exports = {
  buildPresenceInput,
  pickFallbackSlot,
  emptyJourneySlot,
  validateAiSlot,
  sourceKey,
  shortQuote,
}
