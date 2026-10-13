import { useState, type FormEvent } from 'react'

const GRIEVANCE_EMAIL = 'privacy@example.com'

export default function Consent({ onAccept }: { onAccept: () => Promise<void> }) {
  const [adult, setAdult] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await onAccept()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="center">
      <form className="card narrow stack" onSubmit={submit}>
        <h1>Before you start</h1>
        <p>Sakhi handles your health data. Here is exactly what happens to it.</p>
        <ul className="plain">
          <li><b>What we collect:</b> your email, your period dates and your reminder settings.</li>
          <li><b>Why:</b> only to predict your cycle, show insights and send reminders you turn on.</li>
          <li><b>Where:</b> stored in India (Mumbai), encrypted at rest.</li>
          <li><b>Never:</b> sold, shared with advertisers, or used to train AI.</li>
          <li><b>Your control:</b> export or permanently delete everything from Settings at any time. Deleting withdraws your consent.</li>
        </ul>
        <p className="muted small">
          Predictions are estimates, not medical advice, and must not be used as contraception. Questions or
          complaints: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>
        </p>
        <label className="check">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> I am 18 or older
        </label>
        <label className="check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I agree to Sakhi
          processing my health data as described above
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button disabled={!adult || !agreed}>Continue</button>
      </form>
    </main>
  )
}
