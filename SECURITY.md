# Security Policy

CommaPump is a static, no-backend website: pre-built HTML, CSS, JavaScript, an
SVG favicon, and a PNG preview, served from object storage behind a CDN. There is
no server logic, no database, no authentication, no user input that is persisted,
and no secrets in the deployed artifacts. The attack surface is correspondingly
small — but "small" is not "none," so this document states the threat model and
the controls we apply.

## Reporting a vulnerability

Please report security issues privately to **lukesarfas@icloud.com**. Include the
affected URL or file, a description, and (if possible) reproduction steps.

- Do not open a public GitHub issue for an unfixed vulnerability.
- We aim to acknowledge reports within a few days. As a personal portfolio
  project there is no formal SLA or bounty, but credible reports are taken
  seriously and credited if you wish.
- Good-faith research is welcome. Please do not run automated load/DoS tests
  against the hosting origin, and do not access data that is not yours (there
  isn't any user data to access).

## Threat model

What an attacker could plausibly target, and why each is low-risk here:

- **Server compromise / data theft.** There is no server and no user data. The
  only "backend" is object storage serving public, read-only files.
- **Injection (SQL, command, etc.).** No backend, no database, no shell. Nothing
  to inject into.
- **Stored/reflected XSS.** No user input is stored or reflected; pages are
  pre-rendered. The residual risk is a supply-chain script (see below), which the
  Content-Security-Policy is designed to contain.
- **Supply chain.** A compromised dependency could inject code at build time.
  This is the most realistic threat for a static site, and the bulk of our
  controls (CSP, lockfile, `npm ci`, Dependabot, no inline handlers) target it.
- **Embedding / clickjacking.** The applet is meant to be iframed by the hub
  (luke.sarfas.com). Framing controls are owned by the hub — see below.
- **Cost / availability abuse.** A traffic spike cannot trigger runaway cost
  (there is no compute or per-request billing); see [COST.md](./docs/COST.md) for
  the bounded worst case and the billing budget.

## Content-Security-Policy

Every HTML document — the full site and the applet — carries a strict CSP via
`<meta http-equiv="Content-Security-Policy">` (SPEC §5). The two documents ship
slightly different policies, reproduced here exactly as built.

**Full site** (`src/layouts/Base.astro`):

```
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
base-uri 'none';
form-action 'none';
object-src 'none';
```

**Applet** (`src/embed/template.html`, after the build pins the script hash):

```
default-src 'none';
script-src 'sha256-…';
style-src 'unsafe-inline';
img-src 'self' data:;
base-uri 'none';
form-action 'none';
object-src 'none';
```

- **`default-src 'none'`** denies everything not explicitly allowed. The applet
  has no `connect-src`, `font-src`, or `script-src 'self'` directive: it inherits
  the `'none'` default, so network calls (`connect-src`) and font loads are
  denied outright and the only script that may run is the hash-pinned inline one.
- **Full site.** Astro emits hashed *external* scripts and no inline event
  handlers, so `script-src 'self'` covers them. abcjs is bundled/served from the
  same origin (lazy, full-site only) — no third-party script origins.
- **Applet.** The applet is one self-contained document with exactly one inlined
  `<script>`. Instead of `unsafe-inline` for scripts, `scripts/build-applet.mjs`
  computes the **sha256 of that exact script text** and pins it into the CSP via
  the `__APPLET_SCRIPT_HASH__` token (the build logs the pinned
  `sha256-…`). If the script changes, the hash changes; an injected script
  without a matching hash is refused.
- **No network calls.** The applet declares no `connect-src` and inherits
  `default-src 'none'`, and it references no third-party origins, so it makes no
  external requests at all — it paints from a single document.
- **No `unsafe-inline` for scripts.** Neither policy allows inline scripts: the
  full site relies on `script-src 'self'` (hashed external Astro bundles) and the
  applet on a single `sha256-…` hash. `style-src` *does* use `'unsafe-inline'`,
  because Astro inlines scoped component `<style>` blocks and abcjs injects inline
  `<style>` into the engraved SVG at runtime — those cannot be enumerated by hash
  ahead of time. SPEC §5 only forbids `unsafe-inline` for `script-src`.

### What `<meta>` CSP cannot do — and who covers it

`frame-ancestors` and `sandbox` are **not honored** in a `<meta>` CSP; they only
take effect as real HTTP response headers. CommaPump is served from object
storage and does not set them itself. Therefore:

> **The hub (luke.sarfas.com) controls iframe sandboxing and frame-ancestors.**
> The applet is embedded by the hub inside a sandboxed `<iframe>`, and the hub is
> responsible for the `sandbox` attribute and any `frame-ancestors` / framing
> restrictions on its own pages. The applet is written to behave correctly under
> a restrictive sandbox: audio is gated behind an explicit play gesture (the hub
> grants no autoplay), and it makes no cross-origin requests.

If you want framing protection on a custom-domain deployment of the full site,
set `X-Frame-Options` / `frame-ancestors` as response headers at the CDN or host
layer (Firebase Hosting / Cloudflare both support custom headers); a `<meta>` tag
will not suffice.

## Dependency hygiene & supply chain

- **Lockfile committed.** `package-lock.json` is in the repo; CI installs with
  **`npm ci`** (exact, reproducible, lockfile-respecting) — never `npm install`
  in CI.
- **Dependabot.** `.github/dependabot.yml` opens weekly grouped PRs for npm
  dependencies and GitHub Actions pins, keeping us current on security patches
  with low PR noise.
- **Minimal dependency footprint.** Runtime deps are `astro` and `abcjs`; the
  build uses `esbuild`, and tests use Vitest / Playwright / axe-core. The tuning
  engine itself is dependency-free. The applet ships **zero** third-party runtime
  scripts.
- **`npm audit`.** CI runs `npm audit --omit=dev --audit-level=high` on every
  push/PR (`.github/workflows/ci.yml`), failing the build on any high/critical
  advisory in the **production** dependency tree — the only code that ships.
  Because the build is static and most dev dependencies are build-time-only, a
  finding in a build-time-only package generally has no exploitable path in the
  deployed artifact; any such case is evaluated and documented (below) rather
  than ignored.
- **No inline event handlers** anywhere; Astro and the applet template avoid
  `onclick=`-style attributes so the CSP can stay strict.

### Known advisories (documented exceptions)

`npm audit` (full tree, including dev deps) currently reports advisories that can
only be cleared by breaking-major upgrades that would break the build or the
dependency-free / ≤200 KB-applet invariants. Each has no exploitable path in
what we ship or run, so per the policy above they are documented, not silenced.
Production-only audit (`npm audit --omit=dev --audit-level=high`) is clean.

- **`astro` — GHSA-j687-52p2-xcff** (XSS in `define:vars` via incomplete
  `</script>` sanitization) **and GHSA-xr5h-phrj-8vxv** (server-island encrypted
  parameter replay). Both moderate; first patched in **astro 6.1.6**, a breaking
  major from our pinned `astro@5.x`. Not reachable: the codebase uses **no**
  `define:vars` (`grep -rn "define:vars" src/` → none) and **no server islands**
  (`grep -rn "server:defer" src/` → none; default static output, no SSR
  adapter), so neither code path exists in the built site. Re-evaluate when
  upgrading to Astro 6.
- **`vitest` — GHSA-5xrq-8626-4rwp** (critical: when the **Vitest UI server** is
  listening, an arbitrary file can be read/executed). First patched in **vitest
  4.1.0**, a breaking major from `vitest@2.x`. Not reachable: vitest is a
  test-only devDep, the **Vitest UI server is never started** — CI and local runs
  use `vitest run` (no `--ui`, no listening server) — so the vulnerable surface
  is never exposed. The unrelated moderate RCE advisory (GHSA-9crc-q9x8-hgqq) is
  already remediated by pinning **vitest 2.1.9**.
- **`esbuild`/`vite`/`vite-node` — GHSA-67mh-4wv8-2f99** (moderate: the esbuild
  dev server lets any site read responses). First patched in **esbuild 0.25.0**.
  Our direct devDep is bumped to **esbuild ^0.25.x** (the only esbuild that runs
  in our build, via `scripts/build-applet.mjs`, which uses the build API, not a
  dev server). The remaining flagged copies are **transitively pinned inside
  vitest 2.x** (`vite`/`vite-node`'s bundled esbuild) and only matter if that
  dev server is started, which we never do. They clear when vitest moves to 4.x.

## Secrets & deployment

- **No secrets in the repo or in the deployed bundle.** The site is fully public,
  read-only content.
- Deployment uses the operator's own `gcloud` credentials (or, in CI, a scoped
  service-account key / Workload Identity for the publisher) — see
  [DEPLOYMENT.md](./docs/DEPLOYMENT.md). The CI publisher key is the only
  credential involved and is stored as a GitHub Actions secret
  (`APPLETS_PUBLISHER_KEY`), scoped to writing the applets bucket.
- Because there are no application secrets, there is nothing to leak through the
  client; the client is the whole application.
