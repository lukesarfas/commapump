# CommaPump

An interactive explainer + playground for the **comma pump** (syntonic comma
drift): play a chord loop that's perfectly in tune — every fifth and third a pure
whole-number ratio — and the key sinks by a syntonic comma (81/80 ≈ 21.5¢) every
cycle. Featured on [luke.sarfas.com](https://luke.sarfas.com) as a remote applet.

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
npm install
npm run dev        # http://localhost:4330 — full scroll-site + playground
npm test           # Vitest: verifies 81/80 = 21.506¢, drift per cycle, ratios
npm run build      # dist/ (full site) + site/ (manifest, preview, applet)
```

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

## Layout

```
src/core/      pure tuning engine (tuning/ + model/)   ← tested, framework-free
src/audio/     Web Audio scheduler + synth voices       (in progress)
src/transport/ single TransportState observable         (in progress)
src/viz/       the four visualizations                  (in progress)
src/embed/     the self-contained applet entry
src/pages/     index.astro (full site)
scripts/       build-applet · make-manifest · make-preview · size-check
```
