import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    // email code instead of magic link: a link opens the browser, not the installed PWA
    const { error } = sent
      ? await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
      : await supabase.auth.signInWithOtp({ email })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="center">
      <section className="card narrow">
        <h1>Sakhi</h1>
        <p className="muted">Track your cycle, get gentle reminders, and understand your body.</p>
        <form onSubmit={submit} className="stack">
          <label>
            Email
            <input type="email" required autoComplete="email" value={email} disabled={sent} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {sent && (
            <label>
              Code sent to your email
              <input inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
          )}
          {error && <p role="alert" className="error">{error}</p>}
          <button disabled={busy}>{sent ? 'Verify' : 'Send code'}</button>
          {sent && (
            <button type="button" className="link" onClick={() => { setSent(false); setCode('') }}>
              Use a different email
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
