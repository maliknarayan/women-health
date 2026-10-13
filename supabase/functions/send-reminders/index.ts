import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const PERIOD_REMINDER_HOUR = 9
// wording stays vague on purpose — notifications show on lock screens
const PILL = { title: 'Sakhi', body: 'Your daily reminder.' }
const PERIOD = { title: 'Sakhi', body: 'Heads up — take a look at your calendar.' }

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

// runs hourly from pg_cron; each user is checked against their own local hour
Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  const { data: profiles, error } = await db
    .from('profiles')
    .select('tz, next_period, period_reminder_days, pill_reminder_hour, push_subscriptions(endpoint, subscription)')
    .or('period_reminder_days.not.is.null,pill_reminder_hour.not.is.null')
  if (error) return new Response(error.message, { status: 500 })

  const now = new Date()
  let sent = 0
  for (const p of profiles) {
    const date = now.toLocaleDateString('en-CA', { timeZone: p.tz })
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: p.tz, hour: 'numeric', hourCycle: 'h23' }).format(now))

    const messages = []
    if (p.pill_reminder_hour === hour) messages.push(PILL)
    if (p.period_reminder_days !== null && p.next_period && hour === PERIOD_REMINDER_HOUR && daysBetween(date, p.next_period) === p.period_reminder_days) {
      messages.push(PERIOD)
    }

    for (const message of messages) {
      for (const s of p.push_subscriptions) {
        try {
          await webpush.sendNotification(s.subscription, JSON.stringify(message))
          sent++
        } catch (e) {
          // subscription revoked or expired on the device
          if ([404, 410].includes((e as { statusCode?: number }).statusCode ?? 0)) {
            await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          }
        }
      }
    }
  }
  return Response.json({ sent })
})
