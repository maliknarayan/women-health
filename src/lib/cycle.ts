export type Cycle = { id: number; start_date: string; end_date: string | null }

export type Prediction = {
  cycleLength: number
  periodLength: number
  nextStart: string
  earliest: string
  latest: string
  ovulation: string
  fertileStart: string
  fertileEnd: string
  daysLate: number
}

export type Insight = { id: string; text: string; article: string }

const DAY = 86_400_000
const DEFAULT_CYCLE = 28
const DEFAULT_PERIOD = 5
const WINDOW = 6

// dates are YYYY-MM-DD strings; math done in UTC so DST never shifts a day
const toTime = (s: string) => Date.parse(s + 'T00:00:00Z')
export const addDays = (s: string, n: number) => new Date(toTime(s) + n * DAY).toISOString().slice(0, 10)
export const diffDays = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY)
export const today = () => new Date().toLocaleDateString('en-CA')
export const formatDate = (s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(toTime(s)).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })

const avg = (xs: number[], fallback: number) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : fallback

export function analyse(cycles: Cycle[], on = today()): { prediction: Prediction | null; insights: Insight[] } {
  const sorted = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (!sorted.length) return { prediction: null, insights: [] }

  const lengths = sorted.slice(1).map((c, i) => diffDays(sorted[i].start_date, c.start_date)).slice(-WINDOW)
  const periods = sorted
    .filter((c) => c.end_date)
    .map((c) => diffDays(c.start_date, c.end_date!) + 1)
    .slice(-WINDOW)

  const cycleLength = avg(lengths, DEFAULT_CYCLE)
  const periodLength = avg(periods, DEFAULT_PERIOD)
  const last = sorted.at(-1)!.start_date
  const nextStart = addDays(last, cycleLength)
  const ovulation = addDays(nextStart, -14)
  const hasRange = lengths.length >= 2

  const prediction: Prediction = {
    cycleLength,
    periodLength,
    nextStart,
    earliest: hasRange ? addDays(last, Math.min(...lengths)) : nextStart,
    latest: hasRange ? addDays(last, Math.max(...lengths)) : nextStart,
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    daysLate: Math.max(0, diffDays(nextStart, on)),
  }

  const insights: Insight[] = []
  if (diffDays(last, on) > 90) {
    insights.push({ id: 'missed', text: 'No period logged in over 90 days. Rule out pregnancy and see a doctor.', article: 'pcos' })
  }
  if (lengths.some((l) => l > 35)) {
    insights.push({ id: 'long', text: 'Some cycles are longer than 35 days. Long cycles can be a sign of PCOS or thyroid issues.', article: 'pcos' })
  }
  if (lengths.some((l) => l < 21)) {
    insights.push({ id: 'short', text: 'Some cycles are shorter than 21 days. Worth mentioning to a doctor.', article: 'cycle-basics' })
  }
  if (lengths.length >= 3 && Math.max(...lengths) - Math.min(...lengths) > 9) {
    insights.push({ id: 'irregular', text: 'Your cycle length varies by more than 9 days. Predictions will be less accurate.', article: 'pcos' })
  }
  if (periods.some((p) => p > 7)) {
    insights.push({ id: 'long-period', text: 'Some periods lasted more than 7 days. Long or heavy bleeding can cause anaemia.', article: 'anaemia' })
  }

  return { prediction, insights }
}
