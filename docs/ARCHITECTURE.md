# Architecture

CommaPump is a static site with one pure idea at its core — the syntonic comma
pump — and a deliberately layered design that keeps that idea correct, fast, and
embeddable. This document explains the data flow (engine → audio → transport →
viz → site/applet) and why the source tree is partitioned the way it is.

For the product definition and the quality/security/cost bars, see
[SPEC.md](./SPEC.md). This document is descriptive: it explains how the code is
shaped, not what "done" means.

## The shape in one sentence

A dependency-free tuning engine computes an exact schedule of notes; the audio
engine turns that schedule into sound on a sample-accurate clock; a single
transport store holds the shared playback state; four visualizations read the
same schedule and the same playhead and paint; and two thin shells — the full
site and the embeddable applet — wire those layers to markup.

```
                       src/core  (pure, BigInt monzos, no DOM, no audio)
                          │  schedule(progression) → ScheduleResult
                          │  (notes carry BOTH freqJI and freqET)
          ┌───────────────┴───────────────┐
          ▼                               ▼
   src/audio  (Web Audio +          src/viz  (4 vizzes on one
   look-ahead scheduler) ──┐        rAF loop, read-only) ──┐
          │                │                               │
          │   getBeat()    │  live playhead (beats)        │
          ▼                ▼                               ▼
                  src/transport/store  (one TransportStore)
                  - discrete state via subscribe(): play/pause, tuning, bpm
                  - hot playhead via setBeat()/getBeat(): no notify, rAF-read
                          ▲                               ▲
          ┌───────────────┴───────────────┐               │
          ▼                               ▼               │
   src/site/lab.ts                 src/embed/main.ts ──────┘
   (full scroll-story +            (self-contained applet entry,
    playground island)             inlined into one HTML document)
          │                               │
          ▼                               ▼
   src/pages/index.astro           src/embed/template.html
   → dist/ (full static site)      → site/applet/index.html (≤200 KB gzip)
```

## The layers

### `src/core/` — the tuning engine (single source of truth)

Pure TypeScript. No DOM, no `AudioContext`, no globals — it imports cleanly into
Node for Vitest, into the audio layer, and into every visualization. It is the
one authority on what is true, so nothing downstream can disagree about pitch.

- `tuning/` — exact 5-limit interval math on **BigInt monzos** (a pitch is a
  vector of prime exponents `[2,3,5]`). `ratio.ts`, `primes.ts`, `ji.ts`,
  `et.ts`, `comma.ts`, `pitch.ts`. The syntonic comma is `2^-4 · 3^4 · 5^-1`
  (81/80, 21.506¢) — computed, not hard-coded as a float.
- `model/` — musical structure: `chord.ts`, `progression.ts`, `examples.ts`, and
  `schedule.ts`. `schedule(progression, { cycles })` flattens a chord loop into a
  timeline of `ScheduledNote`s.

The critical design choice lives in `schedule.ts`: **every scheduled note carries
both its exact just frequency (`freqJI`) and its equal-tempered frequency
(`freqET`)**, plus everything the visualizations need (lattice coordinate, cents
vs. ET, cycle index, whether it is a cycle tonic). Because both tunings and all
the visual data are precomputed in one artifact (`ScheduleResult`), the audio
engine and the four visualizations physically cannot fall out of sync — a JI⇄ET
flip is a choice of which number to read, never a recomputation that might drift.

`ScheduleResult.driftPerCycleCents` is the headline claim, computed exactly:
−21.5¢ for the classic I–vi–ii–V–I pump.

### `src/audio/` — synthesis and timing

Raw Web Audio API, no Tone.js. We need arbitrary just-intonation ratios and a
tiny bundle, both of which a general-purpose audio library would cost us.

- `context.ts` — the shared `AudioContext` and gesture-gated unlock.
- `master.ts` / `voice.ts` — output bus and per-note synth voices.
- `scheduler.ts` — the "Tale of Two Clocks" look-ahead scheduler. A coarse
  `setTimeout` loop (~25 ms) hands the audio clock any notes inside a 100 ms
  horizon at sample-accurate times. Audio timing never depends on the (jankable)
  animation frame.
- `engine.ts` — `AudioEngine` ties the schedule, the clock, and the voices to
  the transport store. It is the only thing that makes sound and **the only
  authority on the live playhead** (`getBeat()`): the scheduler's clock while
  playing, the stored beat otherwise.

Tuning changes are cheap and live: `setTuning()` ramps active voices from
`freqJI` to `freqET` (or back) without rescheduling, because both frequencies are
already on every note.

### `src/transport/` — the shared state

A single `TransportStore` (`store.ts`) is the source of truth for playback. It
has two deliberately different update paths:

- **Discrete** state — `playing`, `tuning`, `bpm`, `progressionId`, `cycles` —
  changes through `set()`, which notifies subscribers. UI reflects state by
  subscribing.
- **Hot** state — the continuous `beat` playhead — changes through `setBeat()`,
  which does **not** notify. Visualizations read it directly each animation frame
  via `getBeat()`. This keeps the per-frame path allocation-free and avoids
  firing a subscriber storm 60 times a second.

Audio owns time; the store merely holds the latest reading so a paused or
offscreen frame still knows where the playhead is.

### `src/viz/` — the four visualizations

Read-only consumers of `ScheduleResult` and the playhead. `stage.ts` owns the
single `requestAnimationFrame` loop and the current visualization; each viz
implements the small `Viz` interface (`mount`/`draw`/`resize`/`destroy`) from
`types.ts`.

- `tonnetz.ts` — just-intonation lattice walk (SVG).
- `ribbon.ts` — the drift ribbon, stacking each cycle's tonic (SVG).
- `spiral.ts` — a circle of fifths that won't close (SVG).
- `pianoroll.ts` — piano-roll with a live cents meter (Canvas, sized to DPR).

The loop reads the playhead from the audio engine and paints; it never writes
audio. Dropped frames degrade the picture, never the sound. The stage honors
`prefers-reduced-motion` by drawing static frames instead of animating.

### `src/site/` and `src/embed/` — the two shells

Both are thin: they instantiate one engine, one store, one stage, and wire DOM.

- `src/site/lab.ts` is the full-site island. It is driven two ways at once — the
  scroll-story activates scenes (via `IntersectionObserver`) as they cross the
  viewport center, and the playground controls drive it by hand. Both write to
  the *same* transport store, so they never disagree. `notation.ts` lazy-loads
  abcjs for engraved notation (full site only).
- `src/embed/main.ts` is the applet entry: the full thing in miniature —
  synthesis, all four visualizations on one playhead, and a JI⇄ET toggle — built
  and inlined by `scripts/build-applet.mjs` into a single self-contained
  `site/applet/index.html` (no external requests, ≤200 KB gzip).

## Two build outputs from one source

- **Full site** → `astro build` → `dist/`. Astro emits hashed external scripts
  (no inline handlers); abcjs is lazy and full-site only.
- **Applet** → `scripts/build-applet.mjs` bundles `src/embed/main.ts` with
  esbuild, inlines the JS and CSS into `src/embed/template.html`, and writes
  `site/applet/index.html`. The build computes the sha256 of the single inlined
  script and pins it into the template's CSP (`__APPLET_SCRIPT_HASH__`), so the
  strict policy admits exactly that script with no `unsafe-inline`.
  `scripts/size-check.mjs` fails the build if the gzipped applet exceeds 200 KB.

The applet and the full site ship to separate paths in the same public bucket;
see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Why the tree is partitioned this way

The directory boundaries are not cosmetic — they are the design, for three
reasons.

**Correctness flows one direction.** `core` depends on nothing; `audio` and `viz`
depend only on `core` and `transport`; the shells depend on everything below.
Nothing below the engine can introduce a tuning error, and because the engine is
DOM- and audio-free, it is unit-testable in Node (Vitest) in isolation. The hard,
provable part of the product — that the key really sinks one comma per cycle — is
quarantined where it can be verified directly.

**The applet budget is structural, not a diet.** Keeping the engine
dependency-free and synthesis on raw Web Audio is what makes a self-contained
≤200 KB applet possible. A heavyweight UI framework or a general audio library
would blow the budget and, worse, would couple exact timing to a render
lifecycle. The layering is what lets the same `core`/`audio`/`viz`/`transport`
code power both the rich full site and the tiny embed.

**Disjoint ownership enables conflict-free parallel work.** SPEC §8 assigns each
source region to exactly one workstream — UI-app owns `src/components`,
`src/pages`, `src/layouts`, `src/styles`; UI-engine owns `src/audio`,
`src/transport`, `src/viz`, `src/core`, `src/site`, `src/embed`; Tests own
`tests/`; Docs own top-level `*.md` and `docs/`. Because the boundaries are real
and non-overlapping, several agents (or people) can build in parallel and the
merged tree is coherent without worktree merges. The architecture and the process
share the same seams.
