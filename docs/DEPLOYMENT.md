# Deployment — Traffic Discipline Bangladesh

```
Frontend  → Vercel
Database  → Supabase PostgreSQL
Storage   → Supabase Storage
Maps      → OpenStreetMap + Leaflet (no key, no separate deployment)
```

## 1. Database — Supabase PostgreSQL

1. Create a Supabase project at [supabase.com](https://supabase.com) (choose a region close to
   Bangladesh — Supabase's `ap-southeast-1` (Singapore) is the nearest current option).
2. In the SQL editor, run every file in `supabase/` **in the exact order** listed in the main
   [`README.md`](../README.md#getting-started) — this is the single most common way to break a
   fresh deploy, since two of the migrations (`002a_status_enum.sql`,
   `005a_notification_channel_enum.sql`) must run as their own standalone statement batch.
3. Under **Authentication → URL Configuration**, set the Site URL and Redirect URLs to your
   production domain (used for auth email links).
4. Under **Authentication → Providers → Email**, consider enabling CAPTCHA (hCaptcha) for
   `/register` and `/login` — this app's own honeypot + timing check on the *report* endpoint
   doesn't cover the auth endpoints (see `docs/SECURITY_AUDIT.md` §4).
5. Under **Database → Connection Pooling**, copy the **pooled** connection string (port 6543,
   PgBouncer) — not the direct connection — for use in `DATABASE_URL` if you add any tooling that
   connects directly (the app itself uses the Supabase client libraries, which handle this
   correctly over HTTPS regardless).

## 2. Storage — Supabase Storage

The `report-evidence` bucket and its policies are created by `supabase/rls.sql` — nothing extra
to configure in the dashboard. Confirm after running the migrations:

- **Storage → Buckets → report-evidence** exists and is marked **private** (not public).
- **Storage → Policies** shows the `evidence bucket: *` policies from `rls.sql`.

## 3. Frontend — Vercel

1. Import the repository into Vercel (framework preset: Next.js — auto-detected).
2. Set environment variables (**Project Settings → Environment Variables**) from `.env.example`:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same page — mark **Sensitive**, never exposed client-side |
   | `NEXT_PUBLIC_SITE_URL` | Yes | Your production domain |
   | `NEXT_PUBLIC_REPORT_PREFIX` | No | Defaults to `TDB` |
   | `ANTHROPIC_API_KEY` | No | Enables AI case summary/category suggestion in the officer console |
   | `EMAIL_PROVIDER_API_KEY` | No | Wire up `src/lib/notifications/email.ts` to a real provider first |
   | `SMS_PROVIDER_API_KEY` | No | Wire up `src/lib/notifications/sms.ts` to a real provider first |
   | `NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY` / `PUSH_VAPID_PRIVATE_KEY` | No | Generate via `npx web-push generate-vapid-keys`; wire up `src/lib/notifications/push.ts` |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Strongly recommended | Without this, rate limiting is in-memory per serverless instance, not shared — see `docs/SECURITY_AUDIT.md` §3.3 |

3. Deploy. Vercel runs `npm run build`, which includes Next.js's type-check and lint pass.
4. Set your custom domain under **Project Settings → Domains**, and update
   `NEXT_PUBLIC_SITE_URL` and the Supabase Auth redirect URLs to match.

## 4. First-run setup

Once deployed, create the first `super_admin` account by signing up normally through `/register`
and then promoting it via the Supabase SQL editor — see
[`README.md`](../README.md#4-create-demo-officerAdmin-accounts) for the exact statement. Every
further role change can then go through `/admin/officers` in the app.

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every push/PR: install → typecheck → automated test suite
(`npm test`) → production build. Treat a red CI run as a hard blocker before merging — the build
step alone catches the majority of Next.js server/client boundary mistakes that `tsc` misses.

## 6. Post-deploy verification checklist

- [ ] Submit a real anonymous report end-to-end (with a photo) and confirm it appears in
      `/officer` for a test officer account.
- [ ] Confirm the report code + tracking token combination works on `/track`.
- [ ] Confirm `/insights` and `/map` load without authentication (open in a private/incognito
      window).
- [ ] Verify a signed evidence URL actually expires after 5 minutes (re-request the same URL
      after that window and confirm it 403s).
- [ ] Run through the RLS test matrix in `docs/SECURITY_AUDIT.md` §3.1 against the live database.
- [ ] Confirm rate limiting actually blocks a 6th rapid report submission (§3.3 in the same doc).
