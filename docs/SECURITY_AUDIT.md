# Security Audit — Traffic Discipline Bangladesh

**Scope:** application code + database schema/RLS as of Milestone 4.
**Method:** manual code review + automated unit tests (`npm test`) against every access-control
and validation boundary that's expressible in code, since this environment has no live deployed
Supabase project to run dynamic penetration tests against. Where a check genuinely requires a
live database (RLS policy behavior under real Postgres roles, storage bucket policies, live rate
limiting under concurrent load), this document specifies the exact test to run post-deployment
and where in the codebase it's already been reasoned through statically.

---

## 1. Findings from this audit pass

### 1.1 Fixed: path-traversal gap in evidence file-path validation (High)

**Where:** `src/lib/file-validation.ts`, `isPathForReport()`.

**Before:** the check was `storagePath.startsWith(reportId + "/") && /^[\w./-]+$/.test(storagePath)`.
Both conditions individually look reasonable, but the character class in the second condition
permits `.` and `/`, which together permit `..` — so a path like
`"<report-id>/../<other-report-id>/secret.jpg"` satisfies *both* conditions: it starts with the
right prefix, and every character is in the allowed set. The `startsWith` prefix is meaningless
once `..` is allowed to walk back out of it.

**Impact if shipped:** a malicious client could call `attachEvidence()` or (more seriously)
`getEvidenceSignedUrl()` with a crafted path and potentially attach evidence to — or generate a
signed URL for — a file belonging to a different report, an IDOR on evidence content.

**Fix:** rewritten to split the path into exactly two segments, reject any input containing `..`
outright, and require the first segment to equal the report id exactly (not just be a prefix).
Covered by `tests/file-validation.test.ts` (`isPathForReport (IDOR guard)` describe block),
including an explicit path-traversal test case that would have failed against the old
implementation.

**Note:** the equivalent check inline in `getEvidenceSignedUrl()`
(`/^[0-9a-f-]{36}\/[\w.-]+$/i`) was independently reviewed and found *not* vulnerable to the same
issue — its character class for the UUID segment excludes `.` and `/`, so `..` can't be
constructed there. Fixed anyway for defense-in-depth and consistency, but this was not exploitable
via that code path.

### 1.2 No other high-severity findings in this pass

The remaining sections document what was reviewed and passed, plus what needs to be verified
against a live deployment (section 3).

---

## 2. Reviewed and passing

### 2.1 Row Level Security (static review)

Every table with citizen-, officer-, or admin-relevant data has RLS enabled
(`supabase/rls.sql`, `002_case_management_rls.sql`, `005_advanced_features_rls.sql`). Reviewed:

- **`reports`** — insert requires `mode = 'anonymous' AND reporter_id IS NULL` or
  `mode = 'registered' AND reporter_id = auth.uid()` (can't submit as someone else). Select is
  own-rows-only for citizens, all-rows for staff. **Update is intentionally narrower than select**
  (Migration 002): an officer may only update a report that is unassigned or assigned to them —
  this is the IDOR fix from Milestone 2, re-verified still in place. Admins can update any report.
- **`report_evidence`**, **`report_notes`**, **`report_status_history`**, **`audit_logs`** — all
  staff-only or owner-only reads, no citizen-facing read path for internal case-management data.
- **`spam_flags`**, **`report_duplicate_suggestions`** — staff-only; the automated triggers that
  insert into these tables run as the table owner (see 2.3), not as whatever citizen/anon session
  triggered the insert, so the absence of a citizen-facing INSERT policy is intentional and correct.
- **`push_subscriptions`** — a citizen can only see/create/delete their *own* subscription rows,
  and there is deliberately no staff-read policy at all — a push endpoint is a direct channel to
  someone's device and has no legitimate case-management use.
- **Public RPCs** (`get_public_dashboard_stats`, `get_public_violation_points`, `get_hotspots`,
  `get_report_by_token`) are `SECURITY DEFINER` functions granted to `anon`, deliberately used
  *instead of* any RLS policy that would let `anon` query `reports` directly — `anon` has zero
  grants on the base table. Reviewed each for column leakage (see `docs/SECURITY_AUDIT.md` §2.4).

**What needs live verification:** RLS policies can only be fully proven correct against a real
Postgres instance under real JWT claims. See §3.1 for the exact test matrix to run after deploying.

### 2.2 IDOR protection

- Evidence file paths: fixed in §1.1, tested in `tests/file-validation.test.ts`.
- Report mutation: officer update policy scoped to unassigned-or-own (§2.1).
- Signed URLs: `getEvidenceSignedUrl()` re-validates the caller's role on every call (never trusts
  a previously-rendered page) and validates the path shape before calling Supabase Storage.
- Duplicate-suggestion actions (`confirmDuplicateSuggestion`, `dismissDuplicateSuggestion`) load
  the suggestion row server-side and act on its own `report_id`/`candidate_report_id` — a caller
  can't point a suggestion id at an arbitrary report by passing extra parameters, since none are
  accepted.

### 2.3 Privilege boundaries

- `requireRole()` (`src/lib/authz.ts`) is called at the top of every officer/admin server action —
  a second, explicit check on top of RLS, so a broken/missing RLS policy wouldn't be the only
  thing standing between a citizen session and a staff-only action.
- `enforce_role_change_authority` (Postgres trigger, Migration 002) blocks self-role-changes and
  blocks a regular `admin` from granting `admin`/`super_admin` — enforced at the database level,
  independent of the application-layer check in `updateUserRole()`.
- Auto-flagging triggers (`detect_suspicious_activity`, `find_possible_duplicates`,
  `detect_duplicate_evidence`) are `SECURITY DEFINER` and owned by the migration-running role
  (table owner), so they can insert into staff-only tables (`spam_flags`,
  `report_duplicate_suggestions`) regardless of the triggering session's role — this is the same,
  standard Supabase pattern already used by `handle_new_auth_user()` in Milestone 1. Reviewed for
  scope: each only inserts rows tied to the report that fired the trigger, never touches arbitrary
  rows.

### 2.4 Public-data leakage review (Milestone 3 + 4)

Every function callable by `anon` was checked column-by-column for anything identifying:

| Function | Exposes | Explicitly excludes |
|---|---|---|
| `get_public_dashboard_stats` | counts, category names, vehicle types (aggregate) | everything row-level |
| `get_public_violation_points` | rounded (~11m) lat/lng, category, district, date | reporter, plate, description, notes |
| `get_hotspots` | grid-rounded (~275m) coordinates, category counts, min. cluster size 3 | same as above, plus: no single-incident hotspot ever returned |
| `get_report_by_token` | status, category, district, dates | reporter identity (there is none to leak — anonymous reports have no contact fields by DB constraint), officer_notes explicitly nulled in the function body even though the column exists |

### 2.5 File upload security

- **Type**: server-validated against a fixed MIME whitelist (`ACCEPTED_EVIDENCE_MIME_TYPES`),
  independent of the client-side check in the upload step (which is UX only).
- **Size**: server-validated against `MAX_EVIDENCE_FILE_SIZE_BYTES` (50MB).
- **Path**: fixed in §1.1.
- **Storage**: private bucket, no public/anon read policy; only reachable via short-lived (5 min)
  signed URLs minted after a role check.
- **Not implemented**: virus/malware scanning of uploaded files. Recommended before production:
  a storage-triggered scan (e.g. ClamAV via a Supabase Edge Function, or a provider-side scanning
  hook) before evidence is considered "clean" for officer viewing. Documented in §4.

### 2.6 Injection

- All database access goes through the parameterized Supabase client (`postgrest-js`) or
  parameterized RPC calls — no string-built SQL anywhere in application code.
- All user-generated text (descriptions, notes, AI summaries) is rendered as plain React text,
  never `dangerouslySetInnerHTML` — React's default escaping handles XSS for all of it. The one
  exception is the Leaflet map popup HTML in `public-map.tsx`, which is built from category
  names/districts (admin-controlled or fixed enum values, not raw user text) and additionally
  passes every interpolated value through `escapeHtml()` before insertion.
- Zod schemas validate every server-action input server-side (never trusting client-side
  validation alone) — see any file under `src/app/*/actions.ts`.

### 2.7 Session handling

- Auth cookies are managed entirely by `@supabase/ssr` — httpOnly, refreshed by
  `src/middleware.ts` on every request. No application code reads or writes the session cookie
  directly.
- `requireRole()` re-fetches the caller's profile (including `is_active`) on every server action
  call rather than trusting a cached role from an earlier request — a deactivated account is
  locked out immediately, not just at next login.

---

## 3. Tests to run against a live deployment

These require a real Supabase project and can't be executed in this sandboxed build environment.

### 3.1 RLS test matrix

For each role (anon, citizen, officer, admin, super_admin), attempt each of:
`SELECT`/`INSERT`/`UPDATE`/`DELETE` on `reports`, `report_evidence`, `report_notes`,
`audit_logs`, `spam_flags`, `push_subscriptions` — confirm the result matches
`supabase/*_rls.sql`. The Supabase CLI's `supabase test db` (pgTAP) is the recommended tool; a
starter suite structure:

```sql
-- supabase/tests/reports_rls.test.sql (example — not included, write against your deployed schema)
begin;
select plan(4);
-- as anon
set local role anon;
select is_empty('select 1 from reports', 'anon cannot read reports');
-- as citizen A, expect to see only their own rows
-- as officer, expect update on unassigned report to succeed
-- as officer, expect update on another officer's assigned report to fail
select * from finish();
rollback;
```

### 3.2 API/authorization testing

For each server action in `src/app/officer/actions.ts` and `src/app/admin/actions.ts`, call it
with a citizen session and confirm it returns `{ ok: false }` with an authz error rather than
succeeding or throwing an unhandled exception.

### 3.3 Rate-limit testing under real concurrency

The in-memory limiter (`src/lib/rate-limit.ts`) is correct for a single process but **not**
correct across multiple serverless instances — each cold start gets its own memory. Before
production traffic, configure `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and re-run the
scenario: fire 10 concurrent report submissions from the same identity and confirm exactly 5
succeed.

### 3.4 File-upload security testing

- Attempt to upload a `.php`/`.exe` renamed to `.jpg` — confirm rejection via magic-byte sniffing
  if you add it (not currently implemented — MIME type is currently trusted from the browser's
  `File.type`, which is spoofable; see §4 recommendation on content-sniffing).
- Attempt to upload a file just over 50MB — confirm rejection.
- Attempt to request a signed URL for a path under a different report id — confirm rejection
  (covered statically by `tests/file-validation.test.ts`, should be re-verified against live
  Storage).

### 3.5 Authentication testing

- Password reset flow, session expiry/refresh, and concurrent-session behavior all depend on
  Supabase Auth configuration (email templates, JWT expiry) set in the dashboard, not application
  code — verify these are configured before launch (see `docs/DEPLOYMENT.md`).

---

## 4. Recommendations before production launch

1. **Malware/content scanning on evidence uploads** — not implemented. MIME-type and size checks
   stop obviously wrong files, not a deliberately malicious payload disguised as a valid image.
2. **MIME-type sniffing, not just trusting `File.type`** — the browser-reported MIME type is
   client-supplied and spoofable. Consider validating actual file signatures (magic bytes)
   server-side before accepting an upload.
3. **Move rate limiting to Upstash Redis** (or equivalent) before launch — see §3.3.
4. **Enable Supabase's built-in abuse protection** (CAPTCHA on auth endpoints) in the dashboard
   for `/register` and `/login`, on top of this app's own honeypot + timing check on report
   submission.
5. **Run the pgTAP RLS suite (§3.1) in CI** against a disposable Supabase branch/preview database
   before every deploy, once one exists.
