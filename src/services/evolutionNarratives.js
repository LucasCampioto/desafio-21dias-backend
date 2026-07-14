/**
 * Narrativas em linguagem natural para a tela de Evolução,
 * ancoradas em trechos reais dos exercícios / sinais.
 */

function clipExcerpt(text, max = 150) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trim()}…`
}

function scorePolarity(scores) {
  if (!scores) return 0
  return (scores.positive || 0) - (scores.negative || 0)
}

function collectExcerptsFromAnswers(answerDocs, helpers) {
  const { unwrapAnswersBlob, weekFromDayId, scoreAnswerText } = helpers
  const excerpts = []

  for (const doc of answerDocs || []) {
    const answers = unwrapAnswersBlob(doc.answers || {})
    const dayId = Number(doc.dayId) || 0
    const week = Number(weekFromDayId(dayId))

    for (const value of Object.values(answers)) {
      const texts = Array.isArray(value) ? value : [value]
      for (const raw of texts) {
        if (typeof raw !== 'string' || raw.trim().length < 24) continue
        const scores = scoreAnswerText(raw)
        if (!scores) continue
        const polarityScore = scorePolarity(scores)
        let polarity = 'neutral'
        if (polarityScore >= 0.12) polarity = 'positive'
        else if (polarityScore <= -0.12) polarity = 'negative'
        else continue

        excerpts.push({
          dayId,
          week,
          polarity,
          score: Math.abs(polarityScore),
          text: clipExcerpt(raw),
          source: 'answer',
        })
      }
    }
  }

  return excerpts
}

function collectExcerptsFromSignals(signalDocs, helpers) {
  const { weekFromDayId, normalizeEmotionScores } = helpers
  const excerpts = []

  for (const signal of signalDocs || []) {
    const dayId = Number(signal.dayId) || 0
    const week = Number(signal.week || weekFromDayId(dayId))
    const scores = normalizeEmotionScores(signal.fieldSignals?.emotions?.scores || {})
    const polarityScore = scorePolarity(scores)
    const themes = signal.fieldSignals?.thoughts_recurring?.themes || []
    const tone = String(signal.fieldSignals?.thoughts_recurring?.tone || '').toLowerCase()
    const dominant = signal.fieldSignals?.emotions?.dominant || []

    let polarity = 'neutral'
    if (polarityScore >= 0.2 || tone.includes('positiv')) polarity = 'positive'
    else if (polarityScore <= -0.2 || tone.includes('negativ')) polarity = 'negative'
    else continue

    const themeText = Array.isArray(themes) ? themes.filter(Boolean).slice(0, 4).join(', ') : ''
    const emotionText = Array.isArray(dominant) ? dominant.filter(Boolean).slice(0, 3).join(', ') : ''
    const parts = []
    if (themeText) parts.push(`temas: ${themeText}`)
    if (emotionText) parts.push(`sentimentos: ${emotionText}`)
    if (!parts.length) continue

    excerpts.push({
      dayId,
      week,
      polarity,
      score: Math.abs(polarityScore),
      text: clipExcerpt(`Dia ${dayId} — ${parts.join('; ')}`),
      source: 'signal',
    })
  }

  return excerpts
}

function pickExcerpt(excerpts, { polarity, weeks, preferLater = false } = {}) {
  let pool = (excerpts || []).slice()
  if (polarity) pool = pool.filter((e) => e.polarity === polarity)
  if (weeks?.length) {
    const set = new Set(weeks.map(Number))
    const filtered = pool.filter((e) => set.has(Number(e.week)))
    if (filtered.length) pool = filtered
  }
  if (!pool.length) return null

  pool.sort((a, b) => {
    const sourceRank = (item) => (item.source === 'answer' ? 1 : 0)
    const bySource = sourceRank(b) - sourceRank(a)
    if (bySource !== 0) return bySource
    if (b.score !== a.score) return b.score - a.score
    if (preferLater) return (b.dayId || 0) - (a.dayId || 0)
    return (a.dayId || 0) - (b.dayId || 0)
  })
  return pool[0]
}

function quote(excerpt) {
  if (!excerpt?.text) return null
  return `“${excerpt.text}”`
}

function softChangeLabel(change) {
  switch (change) {
    case 'improved':
      return 'ficou mais leve'
    case 'worsened':
      return 'ficou mais pesado'
    case 'mixed_improved':
      return 'teve altos e baixos, com uma leve melhora'
    case 'mixed_worsened':
      return 'teve altos e baixos, com um pouco mais de peso'
    case 'stable':
      return 'seguiu bem parecida'
    default:
      return 'ainda não tem contraste suficiente'
  }
}

function softBadge(change) {
  switch (change) {
    case 'improved':
      return 'Mais leve'
    case 'worsened':
      return 'Mais peso'
    case 'mixed_improved':
      return 'Altos e baixos ↑'
    case 'mixed_worsened':
      return 'Altos e baixos ↓'
    case 'stable':
      return 'Parecida'
    default:
      return 'Em construção'
  }
}

function buildWithinNarrative(campaign, excerpts, helpers) {
  const { snapshotDelta, classifyChange } = helpers
  const delta = snapshotDelta(campaign.start, campaign.end)
  const change = classifyChange(delta)
  const startWeek = campaign.startWeek
  const endWeek = campaign.endWeek

  const earlyPos = pickExcerpt(excerpts, {
    polarity: 'positive',
    weeks: startWeek ? [startWeek] : [1, 2],
  })
  const earlyNeg = pickExcerpt(excerpts, {
    polarity: 'negative',
    weeks: startWeek ? [startWeek] : [1, 2],
  })
  const latePos = pickExcerpt(excerpts, {
    polarity: 'positive',
    weeks: endWeek ? [endWeek] : [2, 3],
    preferLater: true,
  })
  const lateNeg = pickExcerpt(excerpts, {
    polarity: 'negative',
    weeks: endWeek ? [endWeek] : [2, 3],
    preferLater: true,
  })

  const anyPos = pickExcerpt(excerpts, { polarity: 'positive', preferLater: true })
  const anyNeg = pickExcerpt(excerpts, { polarity: 'negative' })

  const parts = []
  parts.push(`Na ${campaign.label}, o clima emocional ${softChangeLabel(change)}.`)

  if (change === 'improved' || change === 'mixed_improved') {
    const bright = latePos || anyPos
    const shadow = earlyNeg || anyNeg
    if (bright) {
      parts.push(
        `Mais à frente, você escreveu ${quote(bright)} — dá para sentir mais abertura e leveza.`,
      )
    }
    if (shadow) {
      parts.push(
        `No começo ainda aparecia um tom mais carregado, como em ${quote(shadow)}.`,
      )
    }
  } else if (change === 'worsened' || change === 'mixed_worsened') {
    const weight = lateNeg || anyNeg
    const light = earlyPos || anyPos
    if (light) {
      parts.push(`No início havia mais fôlego, com trechos como ${quote(light)}.`)
    }
    if (weight) {
      parts.push(
        `Depois, o texto ficou mais tenso: ${quote(weight)}. Esse contraste ajuda a entender o peso que apareceu.`,
      )
    }
  } else {
    const sample = anyPos || anyNeg || earlyPos || earlyNeg
    if (sample) {
      parts.push(`Ao longo da campanha, o tom ficou próximo de trechos como ${quote(sample)}.`)
    } else {
      parts.push(
        'Conforme você for registrando mais dias, fica mais fácil ler os matizes dessa jornada.',
      )
    }
  }

  return {
    change,
    badge: softBadge(change),
    delta,
    excerpts: {
      positive: latePos || anyPos || null,
      negative: lateNeg || earlyNeg || anyNeg || null,
    },
    narrative: parts.join(' '),
  }
}

function buildCrossStory(baseline, current, baselineExcerpts, currentExcerpts, helpers) {
  const { snapshotDelta, classifyChange } = helpers
  const endVsEnd = snapshotDelta(baseline.end, current.end)
  const startVsStart = snapshotDelta(baseline.start, current.start)
  const change = classifyChange(endVsEnd || startVsStart)

  const currentPos = pickExcerpt(currentExcerpts, { polarity: 'positive', preferLater: true })
  const currentNeg = pickExcerpt(currentExcerpts, { polarity: 'negative', preferLater: true })
  const baselinePos = pickExcerpt(baselineExcerpts, { polarity: 'positive' })
  const baselineNeg = pickExcerpt(baselineExcerpts, { polarity: 'negative' })

  const paragraphs = []

  if (change === 'improved' || change === 'mixed_improved') {
    paragraphs.push(
      `Comparando a ${baseline.label} com a ${current.label}, você chegou a um lugar mais positivo.`,
    )
    if (currentPos && baselineNeg) {
      paragraphs.push(
        `Na ${current.label}, trechos como ${quote(currentPos)} mostram uma positividade que quase não aparecia na ${baseline.label}, onde ainda surgia ${quote(baselineNeg)}.`,
      )
    } else if (currentPos && baselinePos) {
      paragraphs.push(
        `Na ${current.label}, a positividade fica mais nítida em ${quote(currentPos)}. Na ${baseline.label}, o tom positivo era outro — mais contido —, como em ${quote(baselinePos)}.`,
      )
    } else if (currentPos) {
      paragraphs.push(`Um exemplo claro dessa leveza na ${current.label} é: ${quote(currentPos)}.`)
    }
    if (currentNeg) {
      paragraphs.push(`Ainda assim, vale notar um ponto que pediu cuidado: ${quote(currentNeg)}.`)
    }
  } else if (change === 'worsened' || change === 'mixed_worsened') {
    paragraphs.push(
      `Entre a ${baseline.label} e a ${current.label}, o clima ficou um pouco mais pesado.`,
    )
    if (currentNeg && baselinePos) {
      paragraphs.push(
        `Na ${current.label} aparece ${quote(currentNeg)}, bem diferente da ${baseline.label}, onde ainda havia fôlego em ${quote(baselinePos)}.`,
      )
    } else if (currentNeg) {
      paragraphs.push(`Um trecho que ilustra esse peso: ${quote(currentNeg)}.`)
    }
  } else {
    paragraphs.push(
      `Entre a ${baseline.label} e a ${current.label}, o tom emocional ficou parecido — a história mudou de cenário, mas a temperatura se manteve próxima.`,
    )
    if (currentPos || baselinePos) {
      paragraphs.push(`Você continua tocando notas como ${quote(currentPos || baselinePos)}.`)
    }
  }

  return {
    change,
    badge: softBadge(change),
    paragraphs,
    excerpts: {
      baselinePositive: baselinePos,
      baselineNegative: baselineNeg,
      currentPositive: currentPos,
      currentNegative: currentNeg,
    },
  }
}

module.exports = {
  collectExcerptsFromAnswers,
  collectExcerptsFromSignals,
  buildWithinNarrative,
  buildCrossStory,
  softBadge,
}
