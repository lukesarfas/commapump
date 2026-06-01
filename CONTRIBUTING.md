# Contributing

CommaPump is a small, dependency-light static site with one job: teach the
syntonic comma pump correctly and make it audible. Contributions that keep it
correct, fast, accessible, and tiny are welcome. This guide covers setup,
conventions, the file-ownership map, and the bar a change has to clear.

Start with [docs/SPEC.md](./docs/SPEC.md) (what "done" means) and
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (how the layers fit).

## Setup

Node ≥ 20 (see `.nvmrc`).

```sh
npm ci             # reproducible install from the lockfile
npm run dev        # http://localhost:4330 — full scroll-site + playground
npm test           # Vitest: engine correctness (cents, drift, ratios)
npm run build      # dist/ (full site) + site/ (manifest, preview, applet)
npm run typecheck  # astro check + tsc --noEmit
```

For end-to-end checks:

```sh
npx playwright install --with-deps chromium
npx playwright test   # launch, no-console-error, visibility, a11y, mobile
```

## Conventions

Match the existing style — it is intentional:

- **Comments are sparse and intent-only.** Explain *why*, not *what*. Most files
  open with a short block comment stating the file's job; inside, comment the
  non-obvious decision, not the obvious line.
- **Plain CSS + vendored design tokens.** No CSS-in-JS, no utility framework.
  Tokens in `src/styles/tokens.css` are vendored from `@sarfas/ui` and kept in
  sync manually; treat them as the palette, don't hard-code colors.
- **The tuning engine stays dependency-free.** `src/core/` imports nothing,
  touches no DOM and no `AudioContext`, and is the single source of truth. Don't
  add runtime dependencies to it. Exact math uses BigInt monzos — keep pitch
  truth exact, not floating-point-approximate.
- **No heavyweight UI framework.** Astro + small hand-written islands. A
  framework would break the ≤200 KB applet budget and couple exact audio timing
  to a render lifecycle. This is a hard constraint, not a preference.
- **Raw Web Audio**, not Tone.js or similar — we need arbitrary JI ratios and a
  tiny bundle.
- **No emoji headers** in docs or code; plain, factual prose.
- **No inline event handlers** (`onclick=` etc.) — they would force a looser CSP.
  Wire events in script.

## File ownership (keep changes within a region)

SPEC §8 partitions the tree into disjoint, conflict-free regions. When you touch
code, stay inside the relevant region so changes compose cleanly:

| Region | Paths |
| --- | --- |
| Foundation | `package.json`, lockfile, `*.config.*`, `tsconfig.json`, `.github/**`, `playwright.config.ts`, deploy scripts |
| UI-app | `src/components/**`, `src/pages/**`, `src/layouts/**`, `src/styles/**` |
| UI-engine | `src/audio/**`, `src/transport/**`, `src/viz/**`, `src/core/**`, `src/site/**`, `src/embed/**` |
| Tests | `tests/**` |
| Docs | top-level `*.md` (except `docs/SPEC.md`) and `docs/**` |

`docs/SPEC.md` is the source of truth and is edited deliberately, not as a
side effect of other work.

## The bar a change has to clear

A change is mergeable when:

1. **It builds.** `npm run build` succeeds — which means the applet still fits
   under 200 KB gzip (`scripts/size-check.mjs` enforces it).
2. **Unit tests pass.** `npm test` (Vitest). Engine changes need tests proving
   the math (cents, drift direction/magnitude, ET mapping, schedule integrity).
3. **E2E passes.** Playwright: the page loads with no console errors, required
   regions are visible, interactions don't throw, the applet loads standalone,
   the mobile viewport doesn't overflow, and `prefers-reduced-motion` is honored.
4. **Accessibility holds.** No serious/critical axe-core violations; full
   keyboard operation; visible focus; correct roles/labels. (WCAG 2.1 AA target.)
5. **The core claim stays true.** Anything touching the engine must preserve the
   provable result: the classic pump drifts **down** one syntonic comma
   (−21.5¢) per cycle.

CI (`.github/workflows/ci.yml`) runs build + Vitest + Playwright on every push and
PR; a green run is required.

## Commits & PRs

- Keep commits focused and messages descriptive.
- Note any user-facing change in [CHANGELOG.md](./CHANGELOG.md) under
  `Unreleased`, following [Keep a Changelog](https://keepachangelog.com/).
- Don't commit build output (`dist/`, generated `site/` assets) unless a deploy
  flow requires it.

## Reporting issues

- Bugs / features: open a GitHub issue with repro steps (and the URL or example
  progression involved).
- **Security issues: do not open a public issue.** Email
  lukesarfas@icloud.com — see [SECURITY.md](./SECURITY.md).
