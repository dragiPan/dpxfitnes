# DPXFITNES — Coaching Platform

Online coaching platform for **dpxfitnes**: daily nutrition check-ins (numbers transferred from MyFitnessPal), training program builder with YouTube demos, meal plans, Google Calendar two-way sync, groups with message boards, and in-app + email notifications. English/Serbian, invite-only, black & white mobile-first UI.

**Stack:** React + TypeScript + Vite + Tailwind (frontend) · Supabase free tier (Postgres, Auth, Edge Functions) · Resend free tier (email) · Google Calendar API.

---

## 1. Run locally

```bash
npm install
cp .env.example .env   # fill in after step 2
npm run dev            # http://localhost:5173
```

## 2. Create the Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. **SQL Editor** → paste the whole of `supabase/migrations/001_schema.sql` → Run.
3. **Project Settings → API**: copy the *Project URL* and *anon public* key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. **Authentication → Sign In / Up**: turn **OFF** "Allow new users to sign up" (the platform is invite-only; invites still work).
5. **Authentication → URL Configuration**: set *Site URL* to your deployed URL (and add `http://localhost:5173` to *Redirect URLs* for development).

### Make yourself the coach

Sign in once (Google or email code — invite yourself first via the dashboard: Authentication → Users → Invite user, or temporarily re-enable signups). Then in the SQL editor:

```sql
update profiles set role = 'coach' where email = 'YOUR-EMAIL@gmail.com';
```

Everyone else stays `client`.

## 3. Google OAuth + Calendar

One Google Cloud project powers both login and calendar sync.

1. [console.cloud.google.com](https://console.cloud.google.com) → New project → **APIs & Services → Library** → enable **Google Calendar API**.
2. **OAuth consent screen**: External → fill in app name/support email. Add scopes: `calendar.readonly`, `calendar.events`. While the app is in *Testing* mode add your clients' emails as test users (up to 100 — plenty). Publishing/verification is only needed later if you outgrow that.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized redirect URI: `https://xxxx.supabase.co/auth/v1/callback` (from Supabase → Authentication → Providers → Google, it shows you the exact URL).
4. Supabase → **Authentication → Providers → Google**: paste the Client ID + Secret, enable.

Clients connect their calendar from the **Planner** page (one-time consent). Training sessions you schedule get pushed straight into their Google Calendar.

> **Important:** while the consent screen's publishing status is *Testing*, Google expires refresh tokens after **7 days**, so clients would have to reconnect their calendar weekly. Once the flow works, go to Google Auth Platform → **Audience** → **Publish app**. The app stays unverified (users see a one-time "unverified app" warning they can click through), but tokens stop expiring. Also note the consent screen shows your `*.supabase.co` domain instead of "DPX Fitnes" — that's cosmetic and only changes with Google verification or a custom auth domain.

## 4. Edge functions (invites, email, calendar)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:

```bash
supabase login
supabase link --project-ref xxxx          # your project ref
supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
  RESEND_API_KEY=... FROM_EMAIL="DPX Fitnes <notify@yourdomain.com>" \
  SITE_URL=https://your-deployed-app.com
supabase functions deploy invite-client
supabase functions deploy send-notification
supabase functions deploy google-calendar
```

- **Resend** (email): free account at [resend.com](https://resend.com) → API key. Without a custom domain you can use `onboarding@resend.dev` as `FROM_EMAIL` for testing.
- Auth emails (login codes, invites) are sent by Supabase itself and work out of the box.

## 5. Deploy the frontend (free)

Any static host works. Easiest:

- **Vercel**: import the repo → framework Vite → add the two `VITE_*` env vars → deploy.
- or **Firebase Hosting** / **Cloudflare Pages** — same idea: build command `npm run build`, output `dist/`.

Because it's a single-page app, all routes must be rewritten to `/index.html` — the included [vercel.json](vercel.json) handles this on Vercel; on Firebase set `"rewrites": [{ "source": "**", "destination": "/index.html" }]`.

After deploying, update Supabase *Site URL* / *Redirect URLs* and the `SITE_URL` secret. In **Redirect URLs**, use wildcard entries so OAuth can return to sub-pages like `/planner`:

```
https://your-app.vercel.app/**
http://localhost:5173/**
```

---

## How it fits together

| Area | Where |
| --- | --- |
| Database schema + row-level security | `supabase/migrations/001_schema.sql` |
| The 17 MyFitnessPal nutrients | `src/lib/nutrients.ts` |
| Translations (EN/SR) | `src/i18n/en.json`, `src/i18n/sr.json` |
| Client pages (check-in, program, meals, planner…) | `src/pages/client/` |
| Coach pages (clients, program builder, groups…) | `src/pages/coach/` |
| Edge functions | `supabase/functions/` |

### Roles

- **Coach (you):** invite clients, build/duplicate/assign programs, edit meal plans, set per-nutrient targets (visible only to you unless "show to client" — calories is shown as a grayed-out soft limit), see graphs/tables of every client's check-ins, weight and measurements, schedule training sessions (pushed to the client's Google Calendar), post announcements to groups or everyone.
- **Client:** daily check-in (MyFitnessPal totals + weight + optional measurements), view program and log sets/reps/weight, view meal plan, ask questions under any exercise or meal plan, connect Google Calendar, read the message board.

### Notifications

Every important event (new program, meal plan, session, announcement, comment, check-in) creates an in-app notification; the `send-notification` function also emails the recipient via Resend. Clients can only trigger notifications addressed to the coach.

### Free-tier fit

Supabase free tier: 500 MB database, 50k monthly active users, 500k edge-function calls — far beyond what a personal client roster needs. No video is hosted (YouTube embeds only), and there are no image uploads, so storage stays near zero.
