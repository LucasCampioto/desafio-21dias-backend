const TIMEZONE = 'America/Sao_Paulo'
const SP_OFFSET = '-03:00'

const PERIOD_WINDOWS = {
  morning: { startHour: 6, endHour: 10 },
  afternoon: { startHour: 12, endHour: 16 },
  evening: { startHour: 18, endHour: 22 },
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0
  }
  return h
}

function spDateKey(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

function spNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '0'
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

function slotStartIso(userId, dateKey, period) {
  const window = PERIOD_WINDOWS[period]
  const windowMinutes = (window.endHour - window.startHour) * 60
  const offset = hashString(`${userId}:${dateKey}:${period}`) % windowMinutes
  const totalMinutes = window.startHour * 60 + offset
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${dateKey}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00${SP_OFFSET}`
}

function addHoursIso(isoStart, hours) {
  const start = new Date(isoStart)
  return new Date(start.getTime() + hours * 60 * 60 * 1000)
}

function buildSlotTimes(userId, dateKey) {
  const slots = {}
  for (const period of Object.keys(PERIOD_WINDOWS)) {
    const startAt = slotStartIso(userId, dateKey, period)
    slots[period] = {
      startAt: new Date(startAt),
      endAt: addHoursIso(startAt, 1),
    }
  }
  return slots
}

module.exports = {
  TIMEZONE,
  PERIOD_WINDOWS,
  spDateKey,
  spNowParts,
  buildSlotTimes,
}
