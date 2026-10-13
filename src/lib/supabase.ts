import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

export type Profile = {
  id: string
  consented_at: string | null
  next_period: string | null
  period_reminder_days: number | null
  pill_reminder_hour: number | null
  tz: string
}
