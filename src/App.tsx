import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { supabase, type Profile } from './lib/supabase'
import Auth from './pages/Auth'
import Consent from './pages/Consent'
import Home from './pages/Home'
import { Article, LearnList } from './pages/Learn'
import Settings from './pages/Settings'

export type SaveProfile = (patch: Partial<Profile>) => Promise<void>

async function loadProfile(id: string) {
  await supabase.from('profiles').upsert({ id }, { onConflict: 'id', ignoreDuplicates: true })
  const { data, error } = await supabase.from('profiles').select().eq('id', id).single()
  if (error) throw error
  return data as Profile
}

export default function App() {
  const [session, setSession] = useState<Session | null>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userId) loadProfile(userId).then(setProfile, (e: Error) => setError(e.message))
  }, [userId])

  const saveProfile: SaveProfile = async (patch) => {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId!).select().single()
    if (error) throw error
    setProfile(data as Profile)
  }

  if (error) return <main className="center"><p role="alert" className="error">{error}</p></main>
  if (session === undefined || (session && profile?.id !== userId)) return <main className="center"><p className="muted">Loading…</p></main>
  if (!session) return <Auth />
  if (!profile!.consented_at) return <Consent onAccept={() => saveProfile({ consented_at: new Date().toISOString() })} />

  return (
    <BrowserRouter>
      <header className="topbar">
        <strong className="brand">Sakhi</strong>
        <nav>
          <NavLink to="/" end>Cycle</NavLink>
          <NavLink to="/learn">Learn</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home profile={profile!} saveProfile={saveProfile} />} />
          <Route path="/learn" element={<LearnList />} />
          <Route path="/learn/:slug" element={<Article />} />
          <Route path="/settings" element={<Settings profile={profile!} saveProfile={saveProfile} />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
