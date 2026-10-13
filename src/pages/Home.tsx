import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { SaveProfile } from '../App'
import Calendar, { type Mark } from '../components/Calendar'
import { addDays, analyse, diffDays, formatDate, today, type Cycle } from '../lib/cycle'
import { supabase, type Profile } from '../lib/supabase'

export default function Home({ profile, saveProfile }: { profile: Profile; saveProfile: SaveProfile }) {
  const [cycles, setCycles] = useState<Cycle[]>()
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')
  const now = today()

  const load = async () => {
    const { data, error } = await supabase.from('cycles').select('id, start_date, end_date').order('start_date', { ascending: false })
    if (error) setError(error.message)
    else setCycles(data)
  }
  useEffect(() => { load() }, [])

  const { prediction, insights } = useMemo(() => analyse(cycles ?? []), [cycles])
  const open = cycles?.[0] && !cycles[0].end_date ? cycles[0] : null

  // keep the server copy in sync so the reminder job knows when the next period is due
  const nextPeriod = prediction?.nextStart ?? null
  useEffect(() => {
    if (cycles && nextPeriod !== profile.next_period) saveProfile({ next_period: nextPeriod }).catch(() => {})
  }, [cycles, nextPeriod, profile.next_period, saveProfile])

  const marks = useMemo(() => {
    const m = new Map<string, Mark>()
    const fill = (from: string, days: number, mark: Mark) => {
      for (let i = 0; i < days; i++) if (!m.has(addDays(from, i))) m.set(addDays(from, i), mark)
    }
    if (!prediction) return m
    for (const c of cycles ?? []) {
      fill(c.start_date, c.end_date ? diffDays(c.start_date, c.end_date) + 1 : Math.min(prediction.periodLength, diffDays(c.start_date, now) + 1), 'period')
    }
    fill(prediction.nextStart, prediction.periodLength, 'predicted')
    fill(prediction.ovulation, 1, 'ovulation')
    fill(prediction.fertileStart, diffDays(prediction.fertileStart, prediction.fertileEnd) + 1, 'fertile')
    return m
  }, [cycles, prediction, now])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = open
      ? await supabase.from('cycles').update({ end_date: end }).eq('id', open.id)
      : await supabase.from('cycles').insert({ start_date: start, end_date: end || null })
    if (error) return setError(error.code === '23505' ? 'A period already starts on that date.' : error.message)
    setStart(now)
    setEnd('')
    load()
  }

  const remove = async (c: Cycle) => {
    if (!confirm(`Delete the period starting ${formatDate(c.start_date)}?`)) return
    const { error } = await supabase.from('cycles').delete().eq('id', c.id)
    if (error) setError(error.message)
    else load()
  }

  if (!cycles) return <p className="muted">{error || 'Loading…'}</p>

  const daysUntil = prediction ? diffDays(now, prediction.nextStart) : 0

  return (
    <>
      <h1 className="sr-only">Your cycle</h1>
      <section className="card hero">
        {!prediction ? (
          <p className="big">Log your last period to see predictions.</p>
        ) : prediction.daysLate > 0 ? (
          <>
            <p className="big">Period {prediction.daysLate} {prediction.daysLate === 1 ? 'day' : 'days'} late</p>
            <p>Expected {formatDate(prediction.nextStart)}. Stress, illness and travel can delay periods.</p>
          </>
        ) : (
          <>
            <p className="big">{daysUntil === 0 ? 'Period expected today' : `Next period in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}</p>
            <p>
              {prediction.earliest === prediction.latest
                ? `Around ${formatDate(prediction.nextStart)}`
                : `Likely between ${formatDate(prediction.earliest)} and ${formatDate(prediction.latest)}`}
              {` · ${prediction.cycleLength}-day cycle`}
            </p>
          </>
        )}
        {prediction && (
          <p className="small">
            Fertile window {formatDate(prediction.fertileStart)} – {formatDate(prediction.fertileEnd)}. Estimate only, not for contraception.
          </p>
        )}
      </section>

      <form className="card row" onSubmit={submit}>
        {open ? (
          <label>
            Period started {formatDate(open.start_date)}. Ended on
            <input type="date" required min={open.start_date} max={now} value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        ) : (
          <>
            <label>
              Period started
              <input type="date" required max={now} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              Ended <span className="muted">(optional)</span>
              <input type="date" min={start} max={now} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </>
        )}
        <button>{open ? 'Save end date' : 'Log period'}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}

      {insights.length > 0 && (
        <section className="card">
          <h2>Insights</h2>
          <ul className="plain">
            {insights.map((i) => (
              <li key={i.id}>
                {i.text} <Link to={`/learn/${i.article}`}>Learn more</Link>
              </li>
            ))}
          </ul>
          <p className="muted small">This is not a diagnosis. See a doctor if you are concerned.</p>
        </section>
      )}

      <Calendar marks={marks} />

      {cycles.length > 0 && (
        <section className="card">
          <h2>History</h2>
          <ul className="plain history">
            {cycles.map((c, i) => {
              const length = cycles[i - 1] ? diffDays(c.start_date, cycles[i - 1].start_date) : null
              return (
                <li key={c.id}>
                  <span>
                    {formatDate(c.start_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {c.end_date ? ` – ${formatDate(c.end_date)}` : ' (ongoing)'}
                    {length !== null && <span className="muted"> · {length}-day cycle</span>}
                  </span>
                  <button type="button" className="link" onClick={() => remove(c)}>Delete</button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
