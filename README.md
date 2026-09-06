# Traffic Discipline Bangladesh

Milestone 1 (Foundation + Citizen Reporting), Milestone 2 (Officer + Admin Case Management),
Milestone 3 (Traffic Map + Analytics + Public Dashboard), and Milestone 4 (Advanced Features +
Production Readiness). Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui, backed by
Supabase (Postgres + Auth + Storage), with OpenStreetMap/Leaflet for maps, Recharts for
analytics, and an optional Claude API integration for AI decision support.

## What's included

### Milestone 1 — Foundation + Citizen Reporting
- **Auth & roles** — Supabase Auth with a `profiles` table driving a 4-tier role system
  (`citizen`, `officer`, `admin`, `super_admin`), enforced by both middleware route guards and
  Postgres RLS.
- **Citizen reporting flow** — a 7-step wizard: reporting mode → violation category → photo/video
  evidence → GPS/map location → vehicle info → description → review → submit. Ends with a
  `TDB-2026-XXXXXX` report code and a secret tracking token.
- **Anonymous reporting** — enforced at the database layer (a `check` constraint), not just the
  UI: anonymous reports can never carry a name, phone, email, or NID.
- **Special illegal bus/passenger pickup-drop-off flow** — its own fields (route name, how long
  it blocked traffic) that appear only for that category.
- **Report tracking** — a public `/track` page that looks a report up by code + token via a
  `SECURITY DEFINER` RPC, so the code alone (which might end up in a screenshot) isn't enough.
- **Citizen dashboard** — a signed-in citizen's own reports and notifications.

### Milestone 2 — Officer + Admin Case Management
- **Officer console** (`/officer`) — a new-reports queue and a "my cases" queue, each report
  opening onto a full case-detail page: claim/release, verify, reject (reason required), mark
  duplicate (by original report code), flag as spam/suspicious, add append-only official notes,
  change status along a guided workflow, set priority, view vehicle info and the GPS location on
  an OpenStreetMap/Leaflet map, and open evidence through short-lived signed links.
- **Status workflow** — `submitted → received → under_review → evidence_verification → verified
  → assigned → action_recommended → action_taken → closed`, with `rejected` and `duplicate` as
  terminal side-branches reachable from most points. Officers are guided by a transition map;
  admins can force a non-standard transition when correcting a mistake.
- **Admin console** (`/admin`) — overview dashboard (status/district counts, recent activity),
  a filterable all-reports table, an unassigned-reports assignment queue, officer management
  (role changes, activate/deactivate), citizen management, violation-category CRUD, a traffic-rule
  reference library (fine amounts, legal citations) tied to categories, and a spam/suspicious
  report review queue that can confirm-and-reject or dismiss a flag.
- **Case history & audit trail** — every status transition is automatically logged
  (`report_status_history`) with the real acting user, not just whoever the case happens to be
  assigned to. Every privileged action across officer and admin actions additionally writes an
  immutable `audit_logs` row (actor, action, entity, metadata).

### Milestone 3 — Traffic Map + Analytics + Public Dashboard
- **Public dashboard** (`/insights`) — total reports, verified reports, reports this week/month,
  a common-violations chart, vehicle-type statistics, and bus-related/illegal-stopping callouts.
  No sign-in required; backed entirely by aggregate `jsonb` from a single SECURITY DEFINER RPC.
- **Traffic map** (`/map`) — OpenStreetMap/Leaflet map with two views: individual verified
  violation points (colored by category) and geographic hotspots (grid-clustered, sized/colored
  by risk level, with quick filters for illegal bus stopping, illegal parking, and red-light
  violations specifically, plus a general "all categories" hotspot view).
- **Hotspot system** — verified reports are clustered into ~275m grid cells; each cluster below a
  minimum size (3) is never surfaced at all, so a single confirmed incident can't be
  de-anonymized as a "hotspot." Each hotspot reports a risk level (low/medium/high by volume
  thresholds) and its top violation categories, matching the brief's Farmgate example format.
- **Admin analytics** (`/admin/analytics`) — filterable by date range, district, location/
  landmark, violation category, vehicle type, and status, with daily/weekly/monthly report trend
  charts, a violation-category distribution chart, a verified-vs-rejected breakdown, and dedicated
  bus-violation and illegal-stopping trend lines.

### Milestone 4 — Advanced Features + Production Readiness
- **Advanced reporting** — all implemented as Postgres triggers, so they apply no matter which
  client submits a report:
  - **Duplicate detection**: new reports are automatically compared against nearby (same
    category, ~165m grid, within 48h) existing reports, and evidence files are compared by exact
    SHA-256 hash across *all* reports. Matches are queued in `report_duplicate_suggestions` for
    an officer to confirm or dismiss — nothing is auto-marked a duplicate.
  - **Report quality scoring**: a transparent, rule-based 0–100 completeness score (evidence
    present, GPS precision, plate provided, description length) shown on the case-detail header —
    a signal for prioritization, never a validity judgment.
  - **Suspicious activity detection**: conservative heuristics (rapid-fire submissions from one
    identity, repeated reports against one plate, very low-effort reports) auto-create a
    `spam_flags` entry for the existing admin spam-review queue — always for human review, never
    auto-rejected.
  - **Report prioritization**: initial priority is auto-derived from the violation category's
    severity at submission time; officers/admins can still override it manually at any point
    (unchanged from Milestone 2).
- **AI-assisted features** (`src/lib/ai/`) — see the dedicated section below for what's genuinely
  live vs. architecturally prepared.
- **Notifications** — email, SMS, and Web Push provider abstractions
  (`src/lib/notifications/{email,sms,push}.ts`), each logging instead of failing when unconfigured.
  Wired into every report status change: a registered citizen gets an in-app notification (shown
  on `/dashboard`), plus best-effort email/SMS/push if contact info or an active push subscription
  exists. The citizen-facing tracker (`/track`, `/dashboard`) shows the simplified 5-stage view —
  Report Submitted → Under Review → Verified → Action Taken → Closed — collapsing the more
  granular internal officer workflow.
- **Traffic education** (`/education`) — nine bilingual (Bangla + English) topics: Bangladesh
  traffic rules, road signs, traffic signals, lane discipline, bus stopping rules, parking rules,
  pedestrian safety, motorcycle safety, and helmet/seatbelt education, each with a live
  English/Bangla toggle.
- **Production security & readiness** — see `docs/SECURITY_AUDIT.md`,
  `docs/PRODUCTION_READINESS.md`, and `docs/DEPLOYMENT.md`. A real automated test suite
  (`npm test`, Vitest) covers file-upload IDOR protection, rate limiting, the status-workflow
  transition graph, and analytics bucketing — including a genuine path-traversal bug this audit
  pass found and fixed in evidence file-path validation (details in the security audit doc).

### AI-assisted features — what's real vs. prepared

Per the brief: **AI only ever provides decision support here — no code path lets an AI output
declare a violation legally proven or trigger any status change, category change, or penalty
without an explicit, separate human action.**

**Genuinely implemented today** (optional — degrades to a clear "not configured" message without
`ANTHROPIC_API_KEY`):
- **Officer report summarization** — a neutral 3–4 sentence summary of a case's description +
  notes, via the Claude API (`src/lib/ai/report-ai.ts`). Shown with an explicit disclaimer, cached
  on the report row so it's not regenerated on every view.
- **Report categorization suggestion** — suggests which existing violation category best fits a
  report's free-text description. An officer must explicitly click "Apply" to actually change the
  report's category (`recategorizeReport`) — the suggestion alone never touches `category_id`.
- **Duplicate image detection (exact match)** — SHA-256 file hashing, computed client-side and
  compared server-side (`src/lib/file-hash.ts`, `report_evidence.file_hash`) — genuinely live,
  not a stub.

**Prepared architecture, not live models** (`src/lib/ai/vision.ts`) — this environment has no
vision-model API access to wire up honestly, so these are typed interfaces + doc comments on
exactly what a production implementation should call, rather than a faked result:
- Vehicle detection, bus/car/CNG classification, image-based violation classification, and plate
  OCR. Each function returns a `{ status: "not_configured" }` result today; swapping in a real
  provider (a cloud vision API, a self-hosted model, or Tesseract.js for OCR) means implementing
  the body of one function, with no other application code needing to change.

## Security

- **Role-based authorization, in two layers.** Postgres RLS is the ground truth (a compromised
  server action still can't do more than the database allows), and every server action also
  calls `requireRole()` (`src/lib/authz.ts`) before doing any work, so failures surface as a
  clean message instead of a generic "permission denied."
- **IDOR protection.** The Milestone 1 blanket "any staff can update any report" policy was
  intentionally narrowed in Migration 002: an officer may only update a report that's unassigned
  or assigned to them (admins can update any report). Evidence signed-URL requests validate that
  the requested storage path actually belongs to the report id it claims (`isPathForReport` in
  `src/lib/file-validation.ts`), and the `report_notes`/`audit_logs` tables are staff-only with
  no citizen-facing read path at all.
- **Secure evidence storage.** The `report-evidence` bucket is private with no public or anon
  read policy. Evidence is only ever reachable through `getEvidenceSignedUrl()`
  (`src/app/officer/actions.ts`), which re-checks the caller's role on every call and mints a
  5-minute signed URL — nothing is cached server-side, and no long-lived link is ever generated.
- **File validation.** The upload step restricts type/size client-side for UX, but
  `attachEvidence()` re-validates MIME type, file size, and storage path server-side
  (`src/lib/file-validation.ts`) — a tampered client request is rejected the same as a bad one
  from the UI.
- **Audit logs.** `audit_logs` is append-only: insertable only as yourself
  (`actor_id = auth.uid()`, enforced by RLS) and never updatable or deletable through the API.
- **Privilege-escalation guard.** A Postgres trigger (`enforce_role_change_authority`) blocks
  anyone from changing their own role, and blocks a regular `admin` from granting `admin` or
  `super_admin` — only a `super_admin` can do that, independent of whatever the application layer
  checks.
- **Rate limiting.** Sliding-window limits on report submission, evidence upload, anonymous
  tracking lookups, and officer/admin actions (`src/lib/rate-limit.ts`) — Upstash Redis in
  production, in-memory fallback locally.
- **Anti-spam.** A honeypot field on report submission, hashed IPs (never raw — see
  `submitted_ip_hash`), and a full spam-flag review workflow (`spam_flags`) an officer can raise
  and an admin resolves.
- **XSS / SQL injection.** All database access goes through the parameterized Supabase client —
  no raw SQL string interpolation anywhere in application code. User-generated text (report
  descriptions, officer notes) is rendered as plain React text, never through
  `dangerouslySetInnerHTML`, so it's auto-escaped.
- **Secure sessions.** Auth cookies are managed entirely by `@supabase/ssr`
  (`src/lib/supabase/{client,server,middleware}.ts`) — httpOnly, refreshed on every request by
  `src/middleware.ts`, never touched or read directly by application code.
- **No anonymous reporter identity, anywhere.** This isn't just a UI convention — see "Notes on
  the anonymous-reporting guarantee" below. The officer/admin UI never has contact fields to
  display for an anonymous report because the database physically cannot contain them.
- **Public data stays aggregate or sanitized, never raw.** `anon` has no SELECT grant on
  `reports` at all — none of Milestone 3's public surfaces (dashboard, map, hotspots) query the
  table directly. They go through three narrow SECURITY DEFINER functions
  (`supabase/004_public_analytics.sql`) that: only ever count/show statuses meaning "an officer
  confirmed this" (never a raw unverified allegation); strip every identifying field (reporter,
  plate, description, officer notes — categories/district/date only); round returned coordinates
  (~11m for map points, ~275m grid cells for hotspots) rather than the exact submitted GPS pin;
  and require a minimum cluster size before a hotspot is returned at all, so a single confirmed
  incident is never distinguishable on the public map as a "hotspot."

## Getting started

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a new project, then in the SQL editor run each
file below **in this exact order, as separate statement batches** (paste and run one file, wait
for it to finish, then move to the next — don't paste multiple files into one query):

```
1. supabase/schema.sql
2. supabase/rls.sql
3. supabase/seed.sql                          (optional — Milestone 1 demo categories + reports)
4. supabase/002a_status_enum.sql              (must run alone — see note below)
5. supabase/002_case_management.sql
6. supabase/002_case_management_rls.sql
7. supabase/003_seed_case_management.sql      (optional — demo traffic rule library)
8. supabase/004_public_analytics.sql
9. supabase/005a_notification_channel_enum.sql (must run alone — same reason as #4)
10. supabase/005_advanced_features.sql
11. supabase/005_advanced_features_rls.sql
12. supabase/006_anonymous_submission_fix.sql
13. supabase/007_profile_self_service.sql
14. supabase/008_resolution_summary.sql
```

**Why `002a`/`005a` have to run by themselves:** each adds new values to a Postgres enum
(`report_status`; `notification_channel`). Postgres does not allow a newly-added enum value to be
referenced by other statements in the same transaction that added it — so if you paste one of
these together with the migration that follows it, the run fails partway through. Running each
as its own query first, letting it commit, and then running the next file separately avoids this
entirely. The Supabase SQL editor runs each pasted query as one transaction, so "one file per
run" is the simplest way to get this right.

This also creates a private `report-evidence` storage bucket via `rls.sql`.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API** in your Supabase dashboard, and `SUPABASE_SERVICE_ROLE_KEY` (keep this
one server-only — never expose it to the client, never commit it).

### 3. Install and run

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000.

### 4. Create demo officer/admin accounts

Sign up normally through `/register` (this creates a `citizen` profile), then promote the
account from the Supabase SQL editor. The very first admin has to be created this way, since
`/admin/officers` (the in-app way to change roles) requires an existing admin to use it:

```sql
-- Make someone a super_admin (only super_admin can grant admin/super_admin afterward)
update public.profiles set role = 'super_admin' where id = '<their auth.users id>';

-- Make someone an officer
update public.profiles set role = 'officer' where id = '<their auth.users id>';
```

Find a user's id under **Authentication → Users** in the Supabase dashboard, or:

```sql
select id, email from auth.users where email = 'someone@example.com';
```

Once you have a super_admin, every further role change can go through `/admin/officers` in the
app instead of SQL.

## Project structure

```
src/
  app/
    page.tsx                  Homepage
    report/                   Citizen report wizard + server actions
    track/                    Anonymous report tracking
    (auth)/login, register/   Auth pages + server actions
    dashboard/                Citizen dashboard (role: citizen+)
    insights/                 Public dashboard — aggregate stats, no auth required
    map/                      Public traffic map — points + hotspots, no auth required
    education/                Bilingual traffic education content, no auth required
    officer/
      page.tsx                Officer console — new/assigned queues
      reports/[id]/           Case detail page
      actions.ts              Case-management server actions (verify, reject, assign, notes…)
    admin/
      layout.tsx              Admin nav shell
      page.tsx                 Overview (status/district counts, recent activity)
      reports/                 All reports, filterable
      assignments/             Unassigned-report queue with quick-assign
      officers/, citizens/     Role & account-status management
      categories/, rules/      Violation category CRUD, traffic rule library CRUD
      spam/                    Suspicious-report review queue
      analytics/                Filterable trend/distribution charts
      actions.ts               Admin server actions
    dashboard/
      push-actions.ts           Push-subscription server actions
  components/
    ui/                       shadcn/ui primitives
    site/                     Navbar, footer, admin nav
    report/                   Citizen wizard steps
    case/                     Officer/admin case-detail UI, status/priority badges, AI-assist card
    admin/                    Role-row, quick-assign, category/rule managers, spam buttons, analytics charts
    insights/                 Public dashboard charts
    education/                Bilingual topic viewer
    dashboard/                Push-notification opt-in toggle
    map/                      Leaflet location picker (citizen) + public map (points/hotspots)
  lib/
    supabase/                 Browser/server/middleware Supabase clients
    types.ts                  Shared domain types, status workflow map, citizen-stage mapping, public-analytics payload types
    authz.ts                  Server-action role-authorization helper
    audit.ts                  Audit-log write helper
    file-validation.ts        Server-side evidence file validation (type/size/path — IDOR-tested)
    file-hash.ts               Client-side SHA-256 hashing for duplicate-image detection
    analytics.ts              Daily/weekly/monthly trend-bucketing helpers
    education-content.ts      Bilingual traffic education content
    violations.ts             Client-side category fallback list
    rate-limit.ts             Sliding-window rate limiter
    ai/                        AI decision-support modules (see AI section above)
    notifications/             Email/SMS/push provider abstractions + status-change dispatcher
  middleware.ts                Session refresh + role-based route guards
supabase/
  schema.sql                          M1 — tables, enums, triggers, ID generators
  rls.sql                             M1 — Row Level Security + storage policies
  seed.sql                            M1 — demo categories + sample reports
  002a_status_enum.sql                M2 — new workflow status values (run alone)
  002_case_management.sql             M2 — priority, notes, audit logs, traffic rules, spam
  002_case_management_rls.sql         M2 — RLS for new tables, IDOR fix, privilege-escalation guard
  003_seed_case_management.sql        M2 — demo traffic rule library
  004_public_analytics.sql            M3 — public dashboard/map/hotspot SECURITY DEFINER RPCs
  005a_notification_channel_enum.sql  M4 — adds 'push' to notification_channel (run alone)
  005_advanced_features.sql           M4 — duplicate detection, quality scoring, suspicious-activity flags, push subs
  005_advanced_features_rls.sql       M4 — RLS for duplicate suggestions + push subscriptions
  006_anonymous_submission_fix.sql    M4 — SECURITY DEFINER fixes for anonymous report/evidence insert
  007_profile_self_service.sql        M4 — profile "address" field + public "avatars" storage bucket
  008_resolution_summary.sql          M4 — citizen-facing "what action was taken" field
docs/
  SECURITY_AUDIT.md                   Findings (incl. a real fix), reviewed items, live-test matrix
  PRODUCTION_READINESS.md             Accessibility / mobile / performance — done vs. needs live testing
  DEPLOYMENT.md                       Vercel + Supabase step-by-step deployment guide
tests/                                 Vitest unit tests — file validation, rate limiting, status workflow, analytics
```

## Testing

```bash
npm test          # Vitest — file validation (incl. IDOR/path-traversal), rate limiting,
                   # status-workflow transition graph, analytics trend bucketing
npx tsc --noEmit   # Type-check
npm run build      # Full production build (also type-checks and lints)
```

Automated tests cover everything expressible as pure logic. RLS policies, live rate limiting
under concurrency, and file-upload behavior against real Supabase Storage need a deployed project
to test — see `docs/SECURITY_AUDIT.md` §3 for the exact test matrix, and
`.github/workflows/ci.yml` for what runs automatically on every push.

## Notes on the anonymous-reporting guarantee

This isn't just a UI convention — it's enforced several ways:

1. The `reports` table has `constraint anonymous_has_no_contact_info` — an anonymous row can
   never have `contact_name`, `contact_phone`, `contact_email`, or `reporter_id` set.
2. The report wizard never renders contact fields unless `mode = 'registered'` **and** the user
   is signed in.
3. The server action (`src/app/report/actions.ts`) strips contact fields server-side for any
   `mode: 'anonymous'` submission regardless of what the client sends.
4. The officer/admin case-detail UI has no contact-info fields to render at all, for either
   anonymous or registered reports — officers work a case through its report code and case
   notes, never a citizen's personal details. The `reports_officer_safe` view
   (`002_case_management_rls.sql`) formalizes this as a second line of defense against a future
   column addition accidentally reintroducing identifying data into a list/API response.

## What's next (Milestone 5)

Wiring up a real email/SMS/push provider in place of the logging stubs, a live vision-model
provider behind `src/lib/ai/vision.ts`, moving rate limiting to Upstash Redis in production, the
pgTAP RLS test suite against a deployed database, and the live-deployment verification pass in
`docs/DEPLOYMENT.md` §6 and `docs/SECURITY_AUDIT.md` §3.
