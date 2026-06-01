# Changelog

All notable changes to CommaPump are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Per-example explanations.** Each example (the pump, the wandering D, the
  fifths chain) now shows what it demonstrates in the lab caption — its name and a
  one-line teaching point — above the per-view "how to read this" note.

### Changed

- **Cents labels on the notes.** The pitch roll's cents read-outs now sit centred
  on each note and flash as it's struck (and the note flashes white), instead of
  floating to the right where they collided with other notes and the drift label.
- **Balanced story layout.** The sticky lab is vertically centred to line up with
  the prose beside it, and the prose got larger type — fixing the top-aligned-lab /
  centred-text mismatch that left big empty gaps.

- **Continuous-pitch roll.** The piano-roll was rebuilt so the vertical axis is
  real pitch in cents, not snapped semitone rows (the standard way microtonal
  pitch is shown — cf. XenRoll, Reaper custom rolls). Notes sit at their true
  height off a faint equal-tempered grid; a tonic trail draws the drift staircase
  across the whole timeline (labeled with the cumulative cents, e.g. "home drifts
  86¢ flat"); per-note labels give exact deviations; and switching to ET glides
  every note onto the grid — the comma tempered away on screen.

- **Clearer visualizations.** Each view now carries a one-line "how to read this"
  caption (full site and applet). The Tonnetz draws chords as triad triangles
  tumbling across the lattice with labeled axes and a "same C, a comma away"
  callout; the drift ribbon gained a cents scale, a "one piano key" reference,
  and a live "the key is N¢ flat" readout; the spiral labels the start and
  measures the gap in cents; the piano-roll meter became a labeled tuner with a
  ±cents scale.

### Removed

- **Publish + Dependabot workflows.** Dropped `.github/workflows/publish-applet.yml`
  (needed a GCS service-account secret that was never provisioned, so every run
  failed) and `.github/dependabot.yml` (auto-update PR churn). This is a solo
  project: deploys are manual (`npm run deploy:*`) and dependencies are reviewed
  by hand. `ci.yml` (build + unit + E2E) stays.

### Fixed

- **Invisible engraving.** The abcjs notation on the "On the page" section was
  inheriting the dark theme's light text colour onto its cream paper, rendering
  near-white-on-white. Its ink is now forced dark, so the scores are legible.
- **Wrong cents labels (−1258¢).** The pitch roll measured each note's deviation
  against a nominal note in the wrong octave (the JI voice was parked in a fixed
  register while its name was assigned a different octave), so non-tonic chords
  showed nonsensical values like "D −1258.7¢". Each tone is now voiced near the
  very note it is named after, so cents read as true small deviations (e.g.
  "D −17.6¢") and equal temperament no longer jumps those chords an octave.
- **Stale-cache bug.** GCS entry documents (HTML, applet, manifest) had silently
  inherited GCS's 1-hour default `Cache-Control` because the deploy glob missed
  root-level files. Entry documents now ship `no-cache` (always revalidate via
  ETag); only content-hashed `_astro` assets stay `immutable`. The deploy scripts
  were corrected so it can't recur.

## [1.0.0] — 2026-06-01

Production hardening. The explainer became shippable: crash-proof on every
launch, accessible, secured, cost-protected, fully documented, and
marketing-ready.

### Added

- **Launch reliability & crash-proofing.** Feature detection for Web Audio,
  Canvas 2D, and IntersectionObserver; per-visualization and per-audio error
  isolation so a single failure never blanks the page; SSR hero for guaranteed
  first paint even without JS.
- **Accessibility (WCAG 2.1 AA target).** Full keyboard operation, visible focus,
  correct roles/labels/`aria-pressed`/tablist semantics, `aria-live` drift
  announcements, `prefers-reduced-motion` support (no autoplay/animation, static
  frames, audio still available), and non-color cues.
- **Security.** Strict `<meta>` Content-Security-Policy on every document
  (`default-src 'none'`, no `unsafe-inline` for scripts; `style-src` uses
  `'unsafe-inline'` for Astro-scoped and abcjs-injected inline `<style>`); the
  applet's single inlined script is pinned by sha256 computed at build time;
  `SECURITY.md` with threat model and responsible-disclosure contact; Dependabot
  for npm + Actions; `npm ci` in CI.
- **Cost protections.** Two-tier Cache-Control on deploy (immutable hashed assets,
  short-lived HTML/manifest); `docs/COST.md` documenting the egress model,
  expected cents/month, the CDN guide, and a $5 billing budget with 50/90/100%
  alerts.
- **Testing.** Playwright E2E (desktop Chromium + mobile) covering launch,
  no-console-errors, visibility, interaction, standalone applet, mobile viewport,
  and reduced-motion; `@axe-core/playwright` accessibility checks; CI workflow
  running build + unit + E2E + applet size-check on every push/PR.
- **Performance.** rAF render loop pauses when the lab is offscreen or the tab is
  hidden; abcjs made lazy and full-site only; Canvas sized to device pixel ratio;
  applet first-paint budget enforced at ≤200 KB gzip.
- **Documentation & marketing.** `docs/ARCHITECTURE.md`, `SECURITY.md`,
  `docs/COST.md`, `docs/DEPLOYMENT.md`, `CONTRIBUTING.md`, this changelog,
  `docs/MARKETING.md` (positioning, taglines, launch copy, OG image note), and a
  refreshed `README.md`. Real OG/preview metadata and 1600×900 preview image.

### Changed

- README refreshed to reflect the production-ready state and link the full doc
  set.

## [0.1.0] — 2026-05

Initial implementation: the idea, working end to end.

### Added

- **Pure 5-limit tuning engine** (`src/core/`): exact interval math over BigInt
  monzos — ratios, primes, just intonation, equal temperament, the syntonic and
  Pythagorean commas, chords, progressions, and `schedule()`, which flattens a
  chord loop into a timeline of notes each carrying both its just and
  equal-tempered frequency. Vitest-verified (cents, drift per cycle, ratios).
- **Audio engine** (`src/audio/`): raw Web Audio synthesis with a look-ahead
  ("Tale of Two Clocks") scheduler for sample-accurate, exact-ratio playback;
  live JI⇄ET tuning swaps without rescheduling.
- **Transport** (`src/transport/`): a single `TransportStore` shared by audio and
  visuals, with a notifying discrete-state path and a silent hot playhead path.
- **Four synced visualizations** (`src/viz/`): just-intonation lattice walk,
  drift ribbon, a circle of fifths that won't close, and a piano-roll with a live
  cents meter — all reading one schedule on one playhead.
- **Full site** (`src/site/`, `src/pages/`): scroll-driven story plus a free
  playground, both driving the same store; lazy abcjs notation.
- **Embeddable applet** (`src/embed/`): the whole thing in miniature, bundled and
  inlined into a single self-contained `site/applet/index.html`.
- **Remote-applet contract**: `manifest.json` / `preview.png` generation, the
  publish-to-GCS workflow, and the size-check budget gate.
- `docs/SPEC.md`, initial `README.md`, and MIT `LICENSE`.

[Unreleased]: https://github.com/lukesarfas/commapump/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lukesarfas/commapump/releases/tag/v1.0.0
[0.1.0]: https://github.com/lukesarfas/commapump/releases/tag/v0.1.0
