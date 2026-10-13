# Sakhi — cycle tracker PWA

Period tracking, predictions, reminders and women's health education. React + Vite PWA on Supabase (Mumbai region).

## Setup

1. **Supabase project** — create one in region **South Asia (Mumbai) `ap-south-1`** (data stays in India, matching the consent screen).
2. **Schema** — `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. **Auth** — Authentication → Email templates → *Magic Link*: put `{{ .Token }}` in the body so users get a code (the app signs in with an email OTP code, not a link). Set up custom SMTP before launch; the built-in sender is rate-limited.
4. **VAPID keys** — `npx web-push generate-vapid-keys`.
5. **`.env.local`**
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_KEY=<publishable/anon key>
   VITE_VAPID_PUBLIC_KEY=<vapid public key>
   ```
6. **Reminder function**
   ```
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@domain CRON_SECRET=<random string>
   npx supabase functions deploy send-reminders --no-verify-jwt
   ```
7. **Hourly cron** — enable `pg_cron` and `pg_net` extensions, then in the SQL editor:
   ```sql
   select cron.schedule('send-reminders', '0 * * * *', $$
     select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
     ) $$);
   ```

## Commands

- `npm run dev` — dev server
- `npm test` — prediction/insight logic tests
- `npm run build` — production build (deploy `dist/` to any static host with SPA fallback to `index.html`)

## Before public launch

- Replace `GRIEVANCE_EMAIL` in `src/pages/Consent.tsx` with a real grievance contact (DPDP Act).
- Publish a privacy policy and link it from the consent screen.
- Get the articles in `src/content/` reviewed by a gynaecologist, then update the disclaimer in `src/pages/Learn.tsx`.
- Under-18 users are blocked; supporting them needs verifiable parental consent under DPDP.
