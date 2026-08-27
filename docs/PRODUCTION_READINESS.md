# Production Readiness — Accessibility, Mobile, Performance

Complements `docs/SECURITY_AUDIT.md`. Same honesty rule applies: items are marked **Done** only
where a concrete code change was made and can be inspected in this repo; everything else is
marked **Needs live testing** with the exact check to run.

---

## Accessibility

### Done
- **Skip-to-content link** — every page's `Navbar` renders a visually-hidden "Skip to main
  content" link that becomes visible on keyboard focus and jumps to `#main-content`, which every
  top-level page's `<main>` element now carries as an id.
- **Keyboard focus visibility** — the shadcn/ui `Button`, `Input`, `Select`, and `Tabs` primitives
  all use Tailwind's `focus-visible:ring-2` pattern already, so tab-order navigation always shows
  a visible focus ring; nothing in this codebase suppresses the browser's default outline without
  replacing it.
- **Form labels** — every form input in the citizen wizard, auth pages, and admin forms uses the
  `<Label htmlFor>` / `<Input id>` pairing (via `src/components/ui/label.tsx`, a Radix
  `Label.Root`), not a bare placeholder standing in for a label.
- **Error announcements** — the two most consequential inline error messages (report submission
  failure, report tracking lookup failure) now carry `role="alert" aria-live="assertive"`, so a
  screen reader announces them immediately without the user needing to find them visually.
- **Image alt text** — the one raw `<img>` in the app (evidence file thumbnails during upload,
  `step-upload.tsx`) already sets `alt={f.name}`. All other imagery is either an SVG icon
  (decorative, from `lucide-react`, inherently accessible) or CSS background.
- **Color contrast** — the palette in `globals.css` was chosen against WCAG AA in mind: body text
  uses `--foreground` (near-black) on `--background` (near-white), and status/priority badges use
  solid fills with white or near-black text rather than low-contrast tints.
- **Reduced motion** — the app has no autoplaying animation, carousel, or parallax effect that
  would need a `prefers-reduced-motion` override; the only transitions are short (150–300ms)
  hover/focus color transitions on interactive elements.

### Needs live testing
- **Full screen-reader pass** (NVDA/VoiceOver) through the citizen report wizard end-to-end —
  static review confirms labels and roles are present, but only a live screen-reader session
  confirms the *experience* (step announcements, focus management between wizard steps) is good.
- **Automated audit** — run `npx @axe-core/cli <deployed-url>` (or the Lighthoude accessibility
  audit) against the deployed site for anything a static code review can't catch (e.g. computed
  contrast on gradient backgrounds, dynamic ARIA state on the Leaflet map markers).
- **Leaflet map keyboard/screen-reader access** — Leaflet's default marker/popup interaction is
  mouse/touch-first; the public traffic map (`/map`) and location picker (`/report`) should get a
  supplementary non-map data view (e.g. the hotspot list cards already rendered below the map on
  `/map` partially cover this) for users who can't operate the map itself.

---

## Mobile

### Done (by construction, throughout)
- Every page uses Tailwind responsive breakpoints (`sm:`/`md:`/`lg:`) rather than a separate
  mobile codebase — grids collapse to single-column, nav collapses behind a mobile menu button,
  filter bars wrap.
- The citizen report wizard's evidence upload step supports the mobile camera directly (native
  `<input type="file" accept="image/*,video/*">` behavior opens the camera app on mobile browsers).
- The GPS "Use my location" button in the location picker uses the browser Geolocation API, which
  is where it matters most — on a phone, at the actual violation site.
- Leaflet maps are touch-drag/pinch-zoom capable by default; no custom touch-handling was added
  or needed.
- Table-heavy admin pages (`/admin/reports`, `/admin/officers`, etc.) wrap their `<Table>` in a
  horizontally-scrollable container (`src/components/ui/table.tsx`) rather than overflowing the
  viewport, so they're usable (if not ideal) on a phone — these are expected to be used primarily
  on tablet/desktop by staff, per the brief's focus on citizen-facing mobile use.

### Needs live testing
- **Real-device pass** on at least one mid-range Android phone (the most common device profile in
  Bangladesh) and one iOS device, through the full citizen report flow, at actual mobile network
  speeds (throttled 3G/4G, not just a desktop browser's responsive mode).
- **Camera upload on iOS Safari** specifically — iOS has historically had quirks with
  `<input type="file" capture>` and HEIC image format; confirm HEIC photos either upload
  correctly or are converted, since `ACCEPTED_EVIDENCE_MIME_TYPES` in
  `src/lib/file-validation.ts` does not currently include `image/heic`.
- **Viewport meta / PWA installability** — confirm `next.config.mjs`'s default viewport handling
  is sufficient, or add an explicit manifest if "add to home screen" is desired for the citizen
  app (ties into the push-notification service worker already scaffolded in `public/sw.js`).

---

## Performance

### Done
- **ISR on the public dashboard** — `/insights` was switched from `force-dynamic` (a full DB
  round-trip on every request) to `export const revalidate = 60`, since aggregate public stats
  don't need per-request freshness. Getting this to actually take effect required a second fix:
  the page originally used the cookie-based Supabase server client, and calling `cookies()` from
  `next/headers` unconditionally forces a route into fully dynamic rendering in the Next.js App
  Router — silently overriding `revalidate` with no build warning. Since `/insights` never needs
  to know who's signed in (it calls a `SECURITY DEFINER` RPC granted to `anon`), it was switched
  to `createPublicClient()` (`src/lib/supabase/server.ts`), a cookie-free anon-key client built
  specifically so genuinely public pages can get real ISR. Confirmed in `next build`'s route
  table: `/insights` now prints as `○` (static/ISR) rather than `ƒ` (dynamic).
- **Dynamic imports for Leaflet everywhere** — every map component (`leaflet-map.tsx`,
  `public-map.tsx`) is loaded via `next/dynamic` with `ssr: false`, so the ~150KB Leaflet bundle
  never ships on pages that don't render a map, and never blocks server-side rendering.
- **Narrow RPCs over broad table scans** — the public map/hotspot/dashboard endpoints
  (`supabase/004_public_analytics.sql`) do their aggregation in Postgres and return only the
  small, pre-computed result the client needs, rather than shipping raw rows to the browser for
  client-side aggregation.
- **Indexes** on every foreign key and every column used in a `WHERE`/`ORDER BY` in a hot path —
  `reports.status`, `reports.priority`, `reports.district`, `reports(latitude, longitude)`,
  `report_evidence.file_hash`, `audit_logs(entity_type, entity_id, created_at)`, and more — see
  the `create index` statements throughout `supabase/schema.sql` and the Milestone 2–4 migrations.
- **Admin analytics caps its query** at 8,000 rows (`/admin/analytics`) rather than scanning the
  full table unbounded, with a documented comment noting the SQL-side aggregation upgrade path
  once report volume outgrows that.

### Needs live testing / recommended next steps
- **Supabase connection pooling** — confirm the deployed app uses Supabase's pooled connection
  string (PgBouncer, port 6543) rather than the direct connection, since serverless functions
  (Vercel) open a new connection per invocation and will exhaust direct connection limits quickly
  under real traffic.
- **Move admin analytics aggregation into SQL** once report volume is large enough that pulling
  8,000 rows to Node for `date-fns` bucketing becomes the bottleneck — the query shape in
  `src/app/admin/analytics/page.tsx` is written to make this a drop-in replacement (swap the
  `.select()` + JS bucketing for a `date_trunc`-based SQL aggregation) without touching the chart
  components.
- **Lighthouse pass** against the deployed homepage, report wizard, and public map — no synthetic
  performance testing has been run in this environment (no browser available), so bundle-size
  numbers from `next build`'s own output are the only performance signal available so far (see
  the route size table printed by `npm run build`).
- **Image optimization** for any future static imagery (currently the app has none beyond icons
  and user-uploaded evidence, which is intentionally never displayed at full resolution to the
  public — only to staff via signed URLs).
