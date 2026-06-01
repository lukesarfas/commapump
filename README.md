# CommaPump

An interactive explainer + playground for the **comma pump** (syntonic comma
drift): play a chord loop that's perfectly in tune — every fifth and third a pure
whole-number ratio — and the key sinks by a syntonic comma (81/80 ≈ 21.5¢) every
cycle. Featured on [luke.sarfas.com](https://luke.sarfas.com) as a remote applet.

Status: **v1.0 — production-hardened.** Crash-proof on every launch, accessible
(WCAG 2.1 AA target), secured (strict CSP, hashed inline applet script),
cost-protected, and covered by unit + E2E tests in CI. See
[CHANGELOG.md](./CHANGELOG.md).

## The idea

- In **just intonation**, the progression I–vi–ii–V–I doesn't return home: the
  held D is the minor whole tone 10/9, and reusing it as the fifth of G drags the
  returning C down by exactly 81/80. It drifts **down** ~21.5¢ per cycle.
- The fifths chain C–G–D–A–E, closed by a pure major third, lands a comma
  **sharp** — fifths and thirds simply don't agree.
- **Equal temperament** tempers the comma out (the two whole tones fuse), so a
  piano never drifts. The playground lets you flip JI ⇄ ET and hear it.
- Historically demonstrated by Giovanni Battista Benedetti (written c.1563,
  published 1585) in two-voice pieces for Cipriano de Rore.

## Stack

- **Astro** static site (`build.format: directory`).
- **Pure TypeScript tuning engine** (`src/core/`) — exact 5-limit monzo math over
  BigInt; no DOM, no AudioContext; unit-tested with Vitest. This is the single
  source of truth every visualization and the audio engine read from.
- **Raw Web Audio API** + a look-ahead scheduler for sample-accurate, exact-ratio
  synthesis (no Tone.js — we need arbitrary JI ratios and a tiny bundle).
- **SVG + Canvas** for four synced visualizations (lattice walk · drift ribbon ·
  spiral of fifths · piano-roll + cents meter).
- **abcjs** for engraved notation on the full site (lazy; excluded from the applet).
- Design tokens **vendored** from `@sarfas/ui`.

## Develop

```sh
npm ci             # reproducible install from the lockfile
npm run dev        # http://localhost:4330 — full scroll-site + playground
npm test           # Vitest: verifies 81/80 = 21.506¢, drift per cycle, ratios
npm run build      # dist/ (full site) + site/ (manifest, preview, applet)
npx playwright test  # E2E: launch, no console errors, a11y, mobile, applet
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for conventions and the bar a change has
to clear.

## How it ships to luke.sarfas.com

`npm run build` produces `site/`:

```
site/manifest.json        # absolute GCS URLs for preview + applet (remote-applet contract)
site/preview.png          # 1600×900 hero
site/applet/index.html    # self-contained embeddable demo, ≤200 KB gzip (size-checked)
```

`.github/workflows/publish-applet.yml` rsyncs `site/` to
`gs://luke-sarfas-applets/commapump/` and pings the hub to rebuild. The hub
registers it with one line in `apps/luke.sarfas.com/src/data/projects.json`:

```json
{ "slug": "commapump", "manifestUrl": "https://storage.googleapis.com/luke-sarfas-applets/commapump/manifest.json" }
```

## Deploy

The applet (embedded by the hub) and the full scroll-story site live in the same
public bucket, at separate paths:

```sh
npm run deploy:applet   # build + rsync site/ → gs://luke-sarfas-applets/commapump/
npm run deploy:site     # build full site (GCS base) + rsync dist/ → .../commapump-site/
```

`deploy:site` is a stopgap until `commapump.sarfas.com` (or a Firebase target) is
wired up; it builds with `SITE_BASE` so assets resolve under the bucket subpath.
Once a real host exists, drop `SITE_BASE`, deploy there, and repoint
`manifest.base.json`'s `links.site`. Full deploy, applet-contract, and
custom-domain steps are in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Documentation

- [docs/SPEC.md](./docs/SPEC.md) — product & engineering spec (source of truth).
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — engine → audio → transport →
  viz → site/applet data flow and the disjoint-ownership rationale.
- [SECURITY.md](./SECURITY.md) — threat model, CSP, dependency hygiene, and
  responsible disclosure.
- [docs/COST.md](./docs/COST.md) — GCS egress model, Cache-Control, CDN guide,
  and the $5 billing budget.
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — build, deploy, the applet contract,
  and the custom-domain path.
- [docs/MARKETING.md](./docs/MARKETING.md) — positioning, taglines, launch copy,
  and the OG image note.
- [CONTRIBUTING.md](./CONTRIBUTING.md) · [CHANGELOG.md](./CHANGELOG.md)

## Layout

```
src/core/      pure tuning engine (tuning/ + model/)   ← tested, framework-free
src/audio/     Web Audio scheduler + synth voices
src/transport/ single TransportState observable
src/viz/       the four visualizations
src/embed/     the self-contained applet entry
src/pages/     index.astro (full site)
scripts/       build-applet · make-manifest · make-preview · size-check
```
