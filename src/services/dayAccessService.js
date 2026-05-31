function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(from, to) {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.floor((b - a) / (1000 * 60 * 60 * 24))
}

function getEffectiveDayIndex(session, progress) {
  if (session.status === 'completed') return 22

  const started = startOfDay(new Date(progress.startedAt))
  const today = startOfDay(new Date())
  const elapsed = daysBetween(started, today) + (progress.simulatedDaysOffset || 0)
  return progress.startDay + elapsed
}

function getCurrentActiveDay(session, progress) {
  if (!session) return null
  if (session.status === 'completed') return 21
  return Math.min(getEffectiveDayIndex(session, progress), 21)
}

function getDayStatus(dayId, session, progress) {
  if (!session) return 'locked'

  const completedDays = progress.completedDays || []
  const startDay = progress.startDay || 1
  const currentDay = Math.min(getEffectiveDayIndex(session, progress), 21)

  if (dayId < startDay || dayId > currentDay) return 'locked'
  if (completedDays.includes(dayId)) return 'completed'
  if (dayId === currentDay && session.status !== 'completed') return 'active'
  return 'available'
}

function canAccessDay(dayId, session, progress) {
  return getDayStatus(dayId, session, progress) !== 'locked'
}

module.exports = {
  getEffectiveDayIndex,
  getCurrentActiveDay,
  getDayStatus,
  canAccessDay,
}
