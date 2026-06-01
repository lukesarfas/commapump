# CommaPump — Product & Engineering Specification

Status: v1.0 (production-hardening). Owner: Luke Sarfas. This is the source of
truth for what "done and shippable" means for CommaPump.

## 1. Product

CommaPump is an interactive explainer and playground for the **comma pump**
(syntonic comma drift): a chord loop tuned in pure just intonation that audibly
and visibly drifts out of tune — sinking one syntonic comma (81/80 ≈ 21.5¢) per
cycle. It teaches a real, surprising consequence of just intonation through a
scroll-driven narrative backed by exact in-browser synthesis and four synced
visualizations, then opens into a free playground.

**Audience.** Curious musicians, music-theory students, audio/dataviz nerds, and
hiring managers viewing it as a portfolio piece. No login, no user data.

**Surfaces.**
- Full site (scroll-story + playground), hosted static.
- Embeddable applet (`applet/index.html`), a self-contained ≤200 KB demo iframed
  by luke.sarfas.com.

**Success bar.** The page loads and is fully usable on every build, never blanks
or throws on launch, all UI is visible and reachable by keyboard, audio is gated
behind a clear gesture, and the core claim (drift down a comma per cycle) is
provably correct and audible.

## 2. Scope & non-goals

In scope for v1.0: crash-proof launch, accessibility (WCAG 2.1 AA target),
security hardening appropriate to a static no-backend site, cost protections for
static hosting, full documentation, automated UI/UX testing, and marketing-ready
polish (real preview image, OG metadata, landing copy).

Non-goals: user accounts, backends/APIs, persistence, monetization, embedded
copyrighted reference recordings (link out only), a native app, or rewriting the
dependency-free engine in a heavyweight UI framework (it would break the applet
budget and the exact-timing design).

## 3. Architecture (unchanged core)

- **Astro** static site; `build.format: directory`; configurable `SITE_BASE`.
- **`src/core/`** — pure, dependency-free 5-limit tuning engine (BigInt monzos),
  the single source of truth; Vitest-verified. No DOM, no AudioContext.
- **`src/audio/`** — raw Web Audio + look-ahead scheduler; exact-ratio synthesis.
- **`src/transport/`** — one `TransportState` observable.
- **`src/viz/`** — four visualizations (SVG ×3, Canvas ×1) on one playhead.
- **`src/site/` + `src/embed/`** — full-site island and the inlined applet entry.
- Ships to `gs://luke-sarfas-applets/commapump/` (applet) and `…/commapump-site/`
  (full site); registered on luke.sarfas.com via the applet contract.

## 4. Quality bar (industry standard)

1. **Launch reliability.** No uncaught exceptions or console errors on load.
   Every required UI region renders and is visible. Verified by Playwright E2E in
   CI on every build.
2. **Robustness / crash-proofing.** Feature-detect Web Audio, Canvas 2D, and
   IntersectionObserver. Any single visualization or audio failure is isolated
   (try/catch around mount/draw) and never blanks the page. SSR hero guarantees
   first-paint content even with JS disabled or failed.
3. **Accessibility (WCAG 2.1 AA target).** Full keyboard operation; visible focus;
   correct roles/labels/`aria-pressed`/tablist semantics; `prefers-reduced-motion`
   honored (no autoplay/animation, static frames, audio still available);
   `aria-live` drift announcements; contrast ≥ 4.5:1; non-color cues; respects
   single-tap alternatives to any gesture. Verified with `@axe-core/playwright`.
4. **Performance.** rAF render loop pauses when the lab is offscreen or the tab is
   hidden. Applet first paint ≤ 200 KB gzip (enforced). abcjs lazy + full-site
   only. No layout thrash; Canvas sized to DPR.
5. **Security.** See §5. **Cost.** See §6.
6. **Tests.** Unit (Vitest, engine correctness) + E2E (Playwright: launch, no
   errors, visibility, interaction, applet standalone, mobile viewport, a11y).
7. **Docs.** SPEC, ARCHITECTURE, SECURITY, COST, DEPLOYMENT, CONTRIBUTING,
   CHANGELOG, README, and marketing copy.

## 5. Security model (static, no backend)

Threat surface is small: static assets, no server logic, no user input persisted,
no secrets. Still:
- **CSP** via `<meta http-equiv="Content-Security-Policy">` on every HTML document
  (full site + applet). Hash-based for any inlined script (the applet inlines one
  module; compute its sha256 and pin it — no `unsafe-inline`). `default-src
  'none'`; allow `script-src` self + hashes; `style-src` self + hashed/inline-hash;
  `img-src 'self' data:`; `connect-src 'self'`; `base-uri 'none'`;
  `form-action 'none'`; `object-src 'none'`. (Note: `frame-ancestors`/`sandbox`
  are not honored in meta — document that the hub controls iframe sandboxing.)
- **No inline event handlers**; Astro emits hashed external scripts. The applet's
  single inlined script is pinned by hash.
- **Dependency hygiene.** `npm audit` clean (or documented, with no exploitable
  path for a static build-time-only dep). Updates reviewed manually (`npm
  outdated`/`npm audit`) — no automated update PRs on this solo project.
- **Supply chain.** Lockfile committed; CI uses `npm ci`.
- **No secrets in repo.** Deploy uses the operator's `gcloud`/Workload Identity.
- **Disclosure.** `SECURITY.md` with a contact and policy.

## 6. Cost & price protections (static hosting)

The only meaningful cost is **GCS egress**; storage is a few hundred KB.
- **Cache-Control** on upload: immutable hashed assets (`/_astro/**`, the applet
  bundle) → `public, max-age=31536000, immutable`; HTML/manifest → short
  (`max-age=300`). Cuts repeat egress and improves perf.
- **CDN.** Document fronting the bucket with Cloud CDN or Cloudflare (free tier)
  to serve from edge cache at far lower egress, with a one-time setup guide.
- **Budget alert.** Document creating a Cloud Billing budget (e.g. $5/mo) with
  email alerts at 50/90/100% so cost can never silently run away.
- **No runaway vectors.** No compute, no per-request billing, no autoscaling, no
  egress amplification. Worst case (viral spike) is bounded and documented; the
  CDN guide caps origin egress.
- `COST.md` documents the model, expected cost (cents/month at portfolio
  traffic), the cache/CDN/budget setup, and the worst-case bound.

## 7. Testing strategy

- **Unit (Vitest).** Engine correctness (existing 24 + additions): cents, drift
  direction/magnitude per example, ET mapping, schedule integrity.
- **E2E (Playwright, Chromium + mobile viewport).** A console-error/pageerror
  fixture fails any test that logs errors. Assert with web-first `toBeVisible`,
  role/label/test-id locators:
  - Full site loads; hero, lab stage, all scenes, tabs, transport, playground,
    notation, glossary visible. No console errors.
  - Clicking Play does not throw; tuning toggle and viz tabs update state.
  - Each visualization renders non-empty content when selected.
  - Applet `index.html` loads standalone (file://) with no console errors and
    renders its stage + controls.
  - Mobile viewport (≤ 480px) renders without overflow/overlap of key controls.
  - `prefers-reduced-motion` path does not autoplay and still shows content.
  - axe-core: no serious/critical accessibility violations.
- **CI.** GitHub Actions on push/PR: `npm ci`, build, vitest, playwright (browsers
  installed), applet size-check. Green required.

## 8. Agent workstreams & file ownership (disjoint, conflict-free)

Parallel agents own non-overlapping paths so the merged tree is coherent without
worktree merges:
- **Foundation** (first, sequential): `package.json`, lockfile, `*.config.*`,
  `tsconfig.json`, `.github/workflows/ci.yml`, `playwright.config.ts`, `.editorconfig`,
  deploy scripts (Cache-Control). Installs deps; leaves the tree
  building green.
- **UI-app**: `src/components/**`, `src/pages/**`, `src/layouts/**`,
  `src/styles/**` — visible UI, a11y, responsive, CSP meta in layouts, crash-proof
  islands, loading/error states, microcopy.
- **UI-engine**: `src/audio/**`, `src/transport/**`, `src/viz/**`, `src/core/**`,
  `src/site/**`, `src/embed/**` — robustness/guards, feature detection, rAF
  visibility pausing, applet CSP/sandbox-aware markup, error isolation.
- **Tests**: `tests/**` — Vitest additions + Playwright E2E + axe.
- **Docs**: top-level `*.md` except `SPEC.md` (this file), and `docs/**` —
  ARCHITECTURE, SECURITY, COST, DEPLOYMENT, CONTRIBUTING, CHANGELOG, README
  refresh, marketing one-pager.

Build agents are write-only on their paths (no `npm`/`git`/`astro build`).
Integration and the audit/fix passes own verification (build, unit, E2E, fixes).

## 9. Audit acceptance criteria (≥3 passes)

Each pass: parallel read-only reviewers across {launch/crash, security, a11y/UX,
code quality/perf, docs/cost/marketing} produce findings with severity. A finding
is **blocking** if high or medium. A fix step resolves all blocking findings and
re-verifies green (build + unit + E2E). Loop until a pass yields zero blocking
findings AND at least three passes have run (cap 6). Ship only when green.
