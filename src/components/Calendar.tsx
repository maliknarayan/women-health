import { useState } from 'react'
import { addDays, diffDays, formatDate, today } from '../lib/cycle'

export type Mark = 'period' | 'predicted' | 'fertile' | 'ovulation'

const LABELS: Record<Mark, string> = { period: 'Period', predicted: 'Predicted period', fertile: 'Fertile window', ovulation: 'Likely ovulation' }

export default function Calendar({ marks }: { marks: Map<string, Mark> }) {
  const [month, setMonth] = useState(() => today().slice(0, 7))
  const first = `${month}-01`
  const nextFirst = `${addDays(first, 32).slice(0, 7)}-01`
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay()
  const now = today()

  const shift = (n: number) => {
    const d = new Date(`${first}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + n)
    setMonth(d.toISOString().slice(0, 7))
  }

  return (
    <section className="card">
      <div className="cal-head">
        <button type="button" className="icon" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
        <h2>{formatDate(first, { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="icon" aria-label="Next month" onClick={() => shift(1)}>›</button>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="dow" aria-hidden="true">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
        {Array.from({ length: diffDays(first, nextFirst) }, (_, i) => {
          const d = addDays(first, i)
          const mark = marks.get(d)
          return (
            <span key={d} className={`day ${mark ?? ''} ${d === now ? 'today' : ''}`} aria-label={`${formatDate(d)}${mark ? `, ${LABELS[mark]}` : ''}`}>
              {i + 1}
            </span>
          )
        })}
      </div>
      <ul className="legend">
        {(Object.keys(LABELS) as Mark[]).map((m) => <li key={m}><span className={`swatch ${m}`} />{LABELS[m]}</li>)}
      </ul>
    </section>
  )
}
