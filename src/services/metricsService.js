const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { getSessionsHistory } = require('./sessionService')
const {
  collectExcerptsFromAnswers,
  collectExcerptsFromSignals,
  buildWithinNarrative,
  buildCrossStory,
} = require('./evolutionNarratives')

function roundPct(value) {
  return Math.round(Math.max(0, Math.min(100, value)))
}

/** Garante que neg+neu+pos = 100 após arredondamento. */
function normalizePctTrio(snapshot) {
  if (!snapshot) return null
  let negativePct = roundPct(snapshot.negativePct ?? 0)
  let neutralPct = roundPct(snapshot.neutralPct ?? 0)
  let positivePct = roundPct(snapshot.positivePct ?? 0)
  const sum = negativePct + neutralPct + positivePct
  if (sum <= 0) {
    return { negativePct: 0, neutralPct: 100, positivePct: 0 }
  }
  if (sum !== 100) {
    const ordered = [
      ['negativePct', negativePct],
      ['neutralPct', neutralPct],
      ['positivePct', positivePct],
    ].sort((a, b) => b[1] - a[1])
    const key = ordered[0][0]
    const diff = 100 - sum
    if (key === 'negativePct') negativePct += diff
    else if (key === 'neutralPct') neutralPct += diff
    else positivePct += diff
  }
  return { negativePct, neutralPct, positivePct }
}

function weekFromDayId(dayId) {
  const day = Number(dayId) || 1
  return String(Math.min(3, Math.max(1, Math.ceil(day / 7))))
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
  return normalizePctTrio({
    negativePct: week.negativePct,
    positivePct: week.positivePct,
    neutralPct: week.neutralPct,
  })
}

function sortedWeekKeys(byWeek) {
  return Object.keys(byWeek || {})
    .filter((k) => byWeek[k])
    .sort((a, b) => Number(a) - Number(b))
}

function buildCampaignArc(byWeek) {
  const keys = sortedWeekKeys(byWeek)
  if (!keys.length) {
    return { start: null, end: null, startWeek: null, endWeek: null }
  }

  const startWeek = keys[0]
  const endWeek = keys[keys.length - 1]
  return {
    start: sentimentSnapshot(byWeek[startWeek]),
    end: sentimentSnapshot(byWeek[endWeek]),
    startWeek: Number(startWeek),
    endWeek: Number(endWeek),
  }
}

function computeOverallTone(byWeek) {
  const weeks = Object.values(byWeek).map(normalizeLegacyWeek).filter(Boolean)
  if (weeks.length === 0) return 'neutral'

  const totals = weeks.reduce(
    (acc, w) => ({
      negative: acc.negative + w.negativePct,
      positive: acc.positive + w.positivePct,
    }),
    { negative: 0, positive: 0 },
  )

  if (totals.positive > totals.negative) return 'positive'
  if (totals.negative > totals.positive) return 'negative'
  return 'neutral'
}

/** Aceita scores 0–1 ou 0–100 e normaliza para 0–1. */
function normalizeEmotionScores(raw = {}) {
  let negative = Number(raw.negative) || 0
  let neutral = Number(raw.neutral) || 0
  let positive = Number(raw.positive) || 0
  const sum = negative + neutral + positive

  if (sum <= 0) {
    return { negative: 0, neutral: 1, positive: 0 }
  }

  // Modelos às vezes devolvem 0–100
  if (sum > 1.5) {
    negative /= 100
    neutral /= 100
    positive /= 100
  }

  const norm = negative + neutral + positive
  if (norm <= 0) {
    return { negative: 0, neutral: 1, positive: 0 }
  }

  return {
    negative: negative / norm,
    neutral: neutral / norm,
    positive: positive / norm,
  }
}

function aggregateSignals(signals) {
  const byWeek = {}

  for (const signal of signals) {
    const weekKey = String(signal.week || weekFromDayId(signal.dayId) || 1)
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
    const emotions = normalizeEmotionScores(signal.fieldSignals?.emotions?.scores || {})
    week.negativeSum += emotions.negative
    week.positiveSum += emotions.positive
    week.neutralSum += emotions.neutral
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

const POSITIVE_KW = [
  'gratid',
  'feliz',
  'paz',
  'calma',
  'esperanç',
  'esperanc',
  'amor',
  'melhor',
  'fortalec',
  'confianç',
  'confianc',
  'alegria',
  'leve',
  'orgulho',
  'prosper',
  'abundân',
  'abundan',
  'libert',
  'livre',
  'grato',
  'gratidão',
  'gratidao',
]
const NEGATIVE_KW = [
  'medo',
  'ansiedad',
  'triste',
  'culpa',
  'vergonha',
  'raiva',
  'irritad',
  'impulso ruim',
  'angúst',
  'angust',
  'solidão',
  'solidao',
  'cansaço',
  'cansaco',
  'fracasso',
  'vazio',
  'sofr',
  'desânim',
  'desanim',
  'preocup',
  'limitante',
]

function scoreAnswerText(text) {
  const lower = String(text || '').toLowerCase()
  if (!lower.trim()) return null

  let pos = 0
  let neg = 0
  for (const kw of POSITIVE_KW) {
    if (lower.includes(kw)) pos += 1
  }
  for (const kw of NEGATIVE_KW) {
    if (lower.includes(kw)) neg += 1
  }

  // Citar o medo/a crença dentro de um desejo de liberdade não deve pesar como negativo.
  if (
    neg > 0 &&
    /(libert|livre|superar|deixar de|soltar|sem medo|sem divida|sem dívida)/.test(lower)
  ) {
    pos += neg
    neg = 0
  }

  if (pos === 0 && neg === 0) {
    return { negative: 0.25, neutral: 0.5, positive: 0.25 }
  }

  // Frases de libertação / superação costumam citar o negativo sem serem negativas.
  if (pos > 0 && pos >= neg) {
    const positive = 0.55 + Math.min(0.35, pos * 0.08)
    const negative = Math.max(0.05, 0.35 - pos * 0.05)
    const neutral = Math.max(0.1, 1 - positive - negative)
    const norm = positive + negative + neutral
    return {
      negative: negative / norm,
      neutral: neutral / norm,
      positive: positive / norm,
    }
  }

  const total = pos + neg
  const positive = pos / total
  const negative = neg / total
  const neutral = Math.max(0.1, 1 - positive - negative)
  const norm = positive + negative + neutral
  return {
    negative: negative / norm,
    neutral: neutral / norm,
    positive: positive / norm,
  }
}

function unwrapAnswersBlob(answersBlob) {
  if (!answersBlob || typeof answersBlob !== 'object' || Array.isArray(answersBlob)) {
    return {}
  }

  // Alguns docs legados gravaram { answers: { campo: "texto" } } dentro do próprio campo answers.
  const nested = answersBlob.answers
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    Object.values(nested).every((v) => typeof v === 'string' || Array.isArray(v))
  ) {
    return nested
  }

  return answersBlob
}

/** Fallback determinístico quando AnalyzeDay ainda não gerou day_signals. */
function aggregateFromAnswers(answerDocs) {
  const byWeek = {}

  for (const doc of answerDocs || []) {
    const answers = unwrapAnswersBlob(doc.answers || {})
    const texts = Object.values(answers)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => typeof v === 'string' && v.trim())

    if (!texts.length) continue

    const scores = texts
      .map(scoreAnswerText)
      .filter(Boolean)
      .reduce(
        (acc, s) => ({
          negative: acc.negative + s.negative,
          neutral: acc.neutral + s.neutral,
          positive: acc.positive + s.positive,
          n: acc.n + 1,
        }),
        { negative: 0, neutral: 0, positive: 0, n: 0 },
      )

    if (!scores.n) continue

    const weekKey = weekFromDayId(doc.dayId)
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
    week.negativeSum += scores.negative / scores.n
    week.positiveSum += scores.positive / scores.n
    week.neutralSum += scores.neutral / scores.n
    week.dayCount += 1
  }

  const result = {}
  for (const [weekKey, data] of Object.entries(byWeek)) {
    const count = data.dayCount || 1
    result[weekKey] = {
      negativePct: roundPct((data.negativeSum / count) * 100),
      positivePct: roundPct((data.positiveSum / count) * 100),
      neutralPct: roundPct((data.neutralSum / count) * 100),
      destructiveAvg: 0,
      dayCount: count,
    }
  }

  return result
}

function snapshotDelta(from, to) {
  if (!from || !to) return null
  return {
    negativePct: Math.round((to.negativePct ?? 0) - (from.negativePct ?? 0)),
    positivePct: Math.round((to.positivePct ?? 0) - (from.positivePct ?? 0)),
    neutralPct: Math.round((to.neutralPct ?? 0) - (from.neutralPct ?? 0)),
  }
}

function classifyChange(delta) {
  if (!delta) return 'insufficient_data'
  const pos = delta.positivePct ?? 0
  const neg = delta.negativePct ?? 0
  if (pos >= 5 && neg <= 0) return 'improved'
  if (neg >= 5 && pos <= 0) return 'worsened'
  if (Math.abs(pos) < 5 && Math.abs(neg) < 5) return 'stable'
  if (pos > neg) return 'mixed_improved'
  if (neg > pos) return 'mixed_worsened'
  return 'stable'
}

const narrativeHelpers = {
  unwrapAnswersBlob,
  weekFromDayId,
  scoreAnswerText,
  normalizeEmotionScores,
  snapshotDelta,
  classifyChange,
}

function buildWithinCampaignInsight(campaign, excerpts = []) {
  const story = buildWithinNarrative(campaign, excerpts, narrativeHelpers)
  return {
    sessionId: campaign.sessionId,
    label: campaign.label,
    startWeek: campaign.startWeek,
    endWeek: campaign.endWeek,
    change: story.change,
    badge: story.badge,
    delta: story.delta,
    source: campaign.source,
    excerpts: story.excerpts,
    narrative: story.narrative,
  }
}

function buildCrossCampaignComparison(campaigns, excerptsBySession = {}) {
  const usable = (campaigns || []).filter((c) => c.start && c.end)
  if (usable.length < 2) {
    return {
      available: false,
      baseline: null,
      current: null,
      deltas: null,
      highlights: [],
      story: null,
      narratives: usable.length === 1
        ? [
            `Por enquanto a leitura cruza principalmente a ${usable[0].label}. Quando a outra jornada tiver mais registros emocionais, a comparação entre campanhas fica mais rica aqui.`,
          ]
        : [
            'Ainda não há duas campanhas com dados emocionais suficientes para comparar com cuidado.',
          ],
    }
  }

  const baseline = usable[0]
  const current = usable[usable.length - 1]
  const baselineExcerpts = excerptsBySession[baseline.sessionId] || []
  const currentExcerpts = excerptsBySession[current.sessionId] || []

  const startVsStart = snapshotDelta(baseline.start, current.start)
  const endVsEnd = snapshotDelta(baseline.end, current.end)
  const baselineEndVsCurrentStart = snapshotDelta(baseline.end, current.start)
  const story = buildCrossStory(
    baseline,
    current,
    baselineExcerpts,
    currentExcerpts,
    narrativeHelpers,
  )

  const highlights = [
    {
      metric: 'end_vs_end',
      title: `${baseline.label} e ${current.label}`,
      change: story.change,
      badge: story.badge,
      delta: endVsEnd,
      from: baseline.end,
      to: current.end,
      fromLabel: `Final de ${baseline.label}`,
      toLabel: `Agora em ${current.label}`,
    },
  ]

  return {
    available: true,
    baseline: {
      sessionId: baseline.sessionId,
      label: baseline.label,
      start: baseline.start,
      end: baseline.end,
      overallTone: baseline.overallTone,
    },
    current: {
      sessionId: current.sessionId,
      label: current.label,
      start: current.start,
      end: current.end,
      overallTone: current.overallTone,
    },
    deltas: {
      startVsStart,
      endVsEnd,
      baselineEndVsCurrentStart,
    },
    highlights,
    story,
    narratives: story.paragraphs,
  }
}

async function loadSessionExcerpts(userId, sessionId) {
  const db = getDb()
  const sid = new ObjectId(sessionId)
  const uid = new ObjectId(userId)
  const [answers, signals] = await Promise.all([
    db.collection('day_answers').find({ userId: uid, sessionId: sid }).toArray(),
    db.collection('day_signals').find({ userId: uid, sessionId: sid }).toArray(),
  ])

  return [
    ...collectExcerptsFromAnswers(answers, narrativeHelpers),
    ...collectExcerptsFromSignals(signals, narrativeHelpers),
  ]
}

async function invalidateEvolutionReportCache(userId) {
  const db = getDb()
  await db.collection('evolution_reports').deleteOne({ userId: new ObjectId(userId) })
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

  let byWeek = aggregateSignals(signals)
  let source = signals.length > 0 ? 'day_signals' : 'none'

  if (!Object.keys(byWeek).length) {
    const answers = await db
      .collection('day_answers')
      .find({ sessionId: new ObjectId(sessionId) })
      .toArray()
    byWeek = aggregateFromAnswers(answers)
    if (Object.keys(byWeek).length) {
      source = 'answers_heuristic'
    }
  }

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
    source,
    hasEmotionalData: Object.keys(byWeek).length > 0,
    updatedAt: now,
  }

  await db.collection('session_metrics').updateOne(
    { sessionId: new ObjectId(sessionId) },
    { $set: doc },
    { upsert: true },
  )

  try {
    await invalidateEvolutionReportCache(userId)
  } catch (err) {
    console.warn('invalidateEvolutionReportCache:', err.message)
  }

  return doc
}

async function ensureAllSessionMetrics(userId) {
  const db = getDb()
  const sessions = await db
    .collection('sessions')
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray()

  const existing = await db
    .collection('session_metrics')
    .find({ userId: new ObjectId(userId) })
    .toArray()

  const bySessionId = new Map(existing.map((m) => [m.sessionId.toString(), m]))

  for (const session of sessions) {
    const sid = session._id.toString()
    const current = bySessionId.get(sid)
    const needsRefresh =
      !current ||
      !current.hasEmotionalData ||
      current.source === 'none' ||
      !Object.keys(current.byWeek || {}).length ||
      // Placeholder antigo 40/30/30 idêntico início/fim
      (current.campaignArc?.start?.negativePct === 40 &&
        current.campaignArc?.start?.positivePct === 30 &&
        current.campaignArc?.end?.negativePct === 40 &&
        current.campaignArc?.end?.positivePct === 30) ||
      current.campaignArc?.start == null

    if (!needsRefresh) continue

    try {
      await aggregateSession(userId, sid)
    } catch (err) {
      console.warn('ensureAllSessionMetrics failed:', sid, err.message)
    }
  }
}

function mapCampaignDoc(doc) {
  const byWeek = doc.byWeek || {}
  const campaignArc = doc.campaignArc?.start
    ? doc.campaignArc
    : buildCampaignArc(byWeek)

  return {
    sessionId: doc.sessionId.toString(),
    sessionNumber: doc.sessionNumber,
    label: doc.sessionLabel || `Jornada ${doc.sessionNumber}`,
    overallTone: doc.overallTone,
    source: doc.source || (Object.keys(byWeek).length ? 'day_signals' : 'none'),
    hasEmotionalData: Boolean(doc.hasEmotionalData ?? (campaignArc.start && campaignArc.end)),
    start: campaignArc.start,
    end: campaignArc.end,
    startWeek: campaignArc.startWeek ?? null,
    endWeek: campaignArc.endWeek ?? null,
    byWeek: Object.fromEntries(
      Object.entries(byWeek).map(([week, data]) => [week, normalizeLegacyWeek(data)]),
    ),
  }
}

async function getEvolutionChartData(userId) {
  const db = getDb()
  await ensureAllSessionMetrics(userId)

  const metrics = await db
    .collection('session_metrics')
    .find({ userId: new ObjectId(userId) })
    .sort({ sessionNumber: 1 })
    .toArray()

  const campaigns = metrics
    .map(mapCampaignDoc)
    .filter((campaign) => campaign.start && campaign.end)

  const excerptsBySession = {}
  for (const campaign of campaigns) {
    try {
      excerptsBySession[campaign.sessionId] = await loadSessionExcerpts(
        userId,
        campaign.sessionId,
      )
    } catch (err) {
      console.warn('loadSessionExcerpts failed:', campaign.sessionId, err.message)
      excerptsBySession[campaign.sessionId] = []
    }
  }

  const withinCampaign = campaigns.map((campaign) =>
    buildWithinCampaignInsight(campaign, excerptsBySession[campaign.sessionId] || []),
  )
  const comparison = buildCrossCampaignComparison(campaigns, excerptsBySession)

  return { campaigns, withinCampaign, comparison }
}

module.exports = {
  aggregateSession,
  aggregateSignals,
  aggregateFromAnswers,
  computeOverallTone,
  normalizeLegacyWeek,
  buildCampaignArc,
  buildCrossCampaignComparison,
  getEvolutionChartData,
  ensureAllSessionMetrics,
}
