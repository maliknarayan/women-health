import { useState } from 'react'
import type { SaveProfile } from '../App'
import { enablePush, pushSupported } from '../lib/push'
import { supabase, type Profile } from '../lib/supabase'

async function exportData(profile: Profile) {
  const { data: cycles, error } = await supabase.from('cycles').select('start_date, end_date').order('start_date')
  if (error) throw error
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile, cycles }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'sakhi-data.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function deleteAccount() {
  if (!confirm('Permanently delete your account and all your data? This cannot be undone.')) return
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  await supabase.auth.signOut({ scope: 'local' })
}

export default function Settings({ profile, saveProfile }: { profile: Profile; saveProfile: SaveProfile }) {
  const [status, setStatus] = useState('')

  const run = (fn: () => Promise<unknown>, done = '') => async () => {
    setStatus('')
    try {
      await fn()
      setStatus(done)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  const setReminder = (key: 'period_reminder_days' | 'pill_reminder_hour', value: string) =>
    run(() => saveProfile({ [key]: value === '' ? null : Number(value), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), 'Saved.')()

  return (
    <>
      <h1>Settings</h1>

      <section className="card stack">
        <h2>Reminders</h2>
        {pushSupported() ? (
          <button type="button" onClick={run(enablePush, 'Notifications enabled on this device.')}>Enable notifications on this device</button>
        ) : (
          <p className="muted">On iPhone, first add Sakhi to your Home Screen (Share → Add to Home Screen), then open it from there.</p>
        )}
        <label>
          Remind me before my period
          <select value={profile.period_reminder_days ?? ''} onChange={(e) => setReminder('period_reminder_days', e.target.value)}>
            <option value="">Off</option>
            {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'} before</option>)}
          </select>
        </label>
        <label>
          Daily pill reminder
          <select value={profile.pill_reminder_hour ?? ''} onChange={(e) => setReminder('pill_reminder_hour', e.target.value)}>
            <option value="">Off</option>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </label>
        <p className="muted small">Notifications use discreet wording so nothing private shows on your lock screen.</p>
      </section>

      <section className="card stack">
        <h2>Your data</h2>
        <button type="button" onClick={run(() => exportData(profile))}>Download my data</button>
        <button type="button" className="danger" onClick={run(deleteAccount)}>Delete account and all data</button>
      </section>

      {status && <p role="status">{status}</p>}
      <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </>
  )
}
