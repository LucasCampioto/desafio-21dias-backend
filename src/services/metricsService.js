const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { getSessionsHistory } = require('./sessionService')

function roundPct(value) {
  return Math.round(Math.max(0, Math.min(100, value)))
}

/** Converte métricas antigas (soma) para percentual médio por dia. */
function normalizeLegacyWeek(weekData) {
  if (!weekData) return null

  const dayCount = weekData.dayCount || 7
  const looksLegacy =
    (weekData.negative ?? 0) > 1 ||
    (weekData.positive ?? 0) > 1 ||
    weekData.negativePct == null

  if (!looksLegacy) {
    return {
      negativePct: weekData.negativePct ?? 0,
      positivePct: weekData.positivePct ?? 0,
      neutralPct: weekData.neutralPct ?? 0,
      destructiveAvg: weekData.destructiveAvg ?? 0,
      dayCount,
    }
  }

  const count = dayCount || 1
  return {
    negativePct: roundPct(((weekData.negative ?? 0) / count) * 100),
    positivePct: roundPct(((weekData.positive ?? 0) / count) * 100),
    neutralPct: roundPct(((weekData.neutral ?? 0) / count) * 100),
    destructiveAvg: weekData.destructiveAvg ?? 0,
    dayCount: count,
  }
}

function sentimentSnapshot(weekData) {
  const week = normalizeLegacyWeek(weekData)
  if (!week) return null
  return {
    negativePct: week.negativePct,
    positivePct: week.positivePct,
    neutralPct: week.neutralPct,
  }
}

function buildCampaignArc(byWeek) {
  const start = sentimentSnapshot(byWeek['1'])
  const end =
    sentimentSnapshot(byWeek['3']) ||
    sentimentSnapshot(byWeek['2']) ||
    sentimentSnapshot(byWeek['1'])

  return { start, end }
}

function computeOverallTone(byWeek) {
  const weeks = Object.values(byWeek).map(normalizeLegacyWeek).filter(Boolean)
  if (weeks.length === 0) return 'neutral'

  const totals = weeks.reduce(
    (acc, w) => ({
      negative: acc.negative + w.negativePct,
      positive: acc.positive + w.positivePct,
    }),
    { negative: 0, positive: 0 }
  )

  if (totals.positive > totals.negative) return 'positive'
  if (totals.negative > totals.positive) return 'negative'
  return 'neutral'
}

function aggregateSignals(signals) {
  const byWeek = {}

  for (const signal of signals) {
    const weekKey = String(signal.week || 1)
    if (!byWeek[weekKey]) {
      byWeek[weekKey] = {
        negativeSum: 0,
        positiveSum: 0,
        neutralSum: 0,
        destructiveSum: 0,
        dayCount: 0,
      }
    }

    const week = byWeek[weekKey]
    const emotions = signal.fieldSignals?.emotions?.scores || {}
    week.negativeSum += emotions.negative || 0
    week.positiveSum += emotions.positive || 0
    week.neutralSum += emotions.neutral || 0
    week.dayCount += 1

    const destructive = signal.fieldSignals?.thoughts_recurring?.destructiveCount
    if (typeof destructive === 'number') {
      week.destructiveSum += destructive
    }
  }

  const result = {}
  for (const [weekKey, data] of Object.entries(byWeek)) {
    const count = data.dayCount || 1
    result[weekKey] = {
      negativePct: roundPct((data.negativeSum / count) * 100),
      positivePct: roundPct((data.positiveSum / count) * 100),
      neutralPct: roundPct((data.neutralSum / count) * 100),
      destructiveAvg: count > 0 ? Math.round((data.destructiveSum / count) * 10) / 10 : 0,
      dayCount: count,
    }
  }

  return result
}

async function aggregateSession(userId, sessionId) {
  const db = getDb()
  const signals = await db
    .collection('day_signals')
    .find({ sessionId: new ObjectId(sessionId) })
    .toArray()

  const progress = await db.collection('session_progress').findOne({
    sessionId: new ObjectId(sessionId),
  })

  const history = await getSessionsHistory(userId)
  const sessionIndex = history.findIndex((s) => s.id === sessionId)
  const sessionNumber = sessionIndex >= 0 ? history.length - sessionIndex : 1
  const sessionMeta = history.find((s) => s.id === sessionId)

  const byWeek = aggregateSignals(signals)
  const campaignArc = buildCampaignArc(byWeek)
  const overallTone = computeOverallTone(byWeek)
  const completedDays = progress?.completedDays || []
  const now = new Date()

  const doc = {
    userId: new ObjectId(userId),
    sessionId: new ObjectId(sessionId),
    sessionNumber,
    sessionLabel: sessionMeta?.label || `Jornada ${sessionNumber}`,
    byWeek,
    campaignArc,
    overallTone,
    completedDays,
    updatedAt: now,
  }

  await db.collection('session_metrics').updateOne(
    { sessionId: new ObjectId(sessionId) },
    { $set: doc },
    { upsert: true }
  )

  return doc
}

async function getEvolutionChartData(userId) {
  const db = getDb()
  const metrics = await db
    .collection('session_metrics')
    .find({ userId: new ObjectId(userId) })
    .sort({ sessionNumber: 1 })
    .toArray()

  return metrics
    .map((doc) => {
      const byWeek = doc.byWeek || {}
      const campaignArc = doc.campaignArc || buildCampaignArc(byWeek)

      return {
        sessionId: doc.sessionId.toString(),
        sessionNumber: doc.sessionNumber,
        label: doc.sessionLabel || `Jornada ${doc.sessionNumber}`,
        overallTone: doc.overallTone,
        start: campaignArc.start,
        end: campaignArc.end,
        byWeek: Object.fromEntries(
          Object.entries(byWeek).map(([week, data]) => [week, normalizeLegacyWeek(data)])
        ),
      }
    })
    .filter((campaign) => campaign.start && campaign.end)
}

module.exports = {
  aggregateSession,
  aggregateSignals,
  computeOverallTone,
  normalizeLegacyWeek,
  buildCampaignArc,
  getEvolutionChartData,
}
