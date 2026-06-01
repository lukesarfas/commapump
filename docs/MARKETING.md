# Marketing one-pager

Positioning, copy, and launch material for CommaPump. The product is an
interactive explainer + playground for the syntonic comma pump: a chord loop
tuned in pure just intonation that audibly and visibly drifts out of tune,
sinking one comma per cycle. It is a portfolio piece — the marketing goal is to
make a surprising idea land in ten seconds and to show engineering range.

## Positioning

**What it is.** A web page where you press Play on a chord loop that is *perfectly*
in tune — every fifth and third a pure whole-number ratio — and hear the whole
thing slide flat. One syntonic comma (81/80, ~21.5¢) lower every cycle. A
scroll-driven story explains why, four synced visualizations show it from four
angles, and then it hands you a playground.

**Why it's interesting.** It's a real, counterintuitive consequence of just
intonation — "pure tuning doesn't come home" — that you can usually only read
about. Here you *hear* it, exactly synthesized in the browser, and flip to equal
temperament to hear the drift vanish. It's the rare music-theory demo that is
both provably correct and immediately visceral.

**Who it's for.** Curious musicians and music-theory students; audio and dataviz
people; and hiring managers reading it as a portfolio piece. No login, no
tracking, no user data.

**Why it's credible (the engineering story).** Exact 5-limit math on BigInt
monzos as the single source of truth; raw Web Audio with a sample-accurate
look-ahead scheduler; a dependency-free engine; four visualizations on one
playhead; a self-contained ≤200 KB embeddable applet; accessible, crash-proof,
and served for cents a month. The polish *is* the pitch.

## Taglines

Primary (in the manifest and meta):

> **Hear just-intonation music drift out of tune.**

Alternates, by emphasis:

- "Perfectly in tune. Won't come home." — the paradox
- "The chord loop that sinks a comma every cycle." — the mechanism
- "Pure tuning, drifting flat — hear the syntonic comma pump." — descriptive
- "Just intonation, caught in the act of falling." — evocative
- "Press Play. Listen to math leave the room." — playful
- "The 21.5-cent problem you can finally hear." — specific/curiosity

## Social / launch copy

**One-liner (link preview / bio):**
Press Play on a chord loop that's perfectly in tune — and hear it sink a comma
every cycle. An interactive explainer of the syntonic comma pump.

**Short post (X / Mastodon / LinkedIn):**
Just intonation has a dirty secret: a chord loop where every interval is *pure*
doesn't come home — it drifts flat by a syntonic comma (~21.5¢) every cycle.
I built a thing where you can hear it, see it four ways, then flip to equal
temperament and watch the drift disappear. Exact in-browser synthesis, no
dependencies. [link]

**Longer post / blog intro:**
Tune a I–vi–ii–V–I progression in perfect just intonation — every fifth a clean
3:2, every major third a clean 5:4 — and something strange happens: the "home"
chord you return to is a hair flat. Do it again and it's flatter. The held D is
the minor whole tone (10/9), and reusing it as the fifth of G drags the returning
C down by exactly 81/80. Equal temperament hides this by fusing the two whole
tones; just intonation can't. CommaPump lets you hear the drift, watch it on a
just-intonation lattice, a drift ribbon, a circle of fifths that won't close, and
a live cents meter — then play with it yourself. Built with an exact BigInt
tuning engine and raw Web Audio. [link]

**Hub / portfolio card blurb (from the manifest):**
An interactive explainer and playground for the syntonic comma pump. Play a chord
loop that's perfectly in tune and watch (and hear) the key sink by a comma each
cycle, across four synced visualizations.

## Historical hook (optional, for depth)

The drift was demonstrated by Giovanni Battista Benedetti (written c.1563,
published 1585) in two short two-voice pieces written to make the problem audible
for Cipriano de Rore. A 450-year-old "bug report" you can now run in a browser.

## OG / preview image

- The Open Graph / Twitter image is `preview.png`, **1600×900** (16:9), served
  from the deploy and referenced by `og:image` (width/height 1600×900,
  `summary_large_image` card) via `src/components/ui/MetaTags.astro`.
- Alt text: "The comma pump visualized on a just-intonation lattice."
- **Current state:** `scripts/make-preview.mjs` renders an intentional
  placeholder — a descending staircase, each step one comma lower, on the dark
  warm-navy ground, in the signature amber (`#f0b54a`). It encodes the motif (the
  tonic sinking per cycle) with a dependency-free PNG encoder.
- **Recommended upgrade:** replace the placeholder with a real captured frame of
  the drift ribbon or the lattice walk mid-drift — the actual product, in the
  signature palette, with the "−21.5¢ / cycle" readout visible. Keep it dark,
  high-contrast, and legible as a small card; the headline visual should read at
  thumbnail size. The 1600×900 contract and the `og:*` metadata don't change.

## Brand notes

- **Signature color:** amber `#f0b54a` (`accent` in the manifest) on a dark warm
  navy. Cool teal marks equal temperament; warm tones mark downward drift.
- **Voice:** precise, a little playful, never breathless. Lead with the surprise,
  back it with the exact number. No emoji headers.
- **Name:** CommaPump (one word, camel). The "pump" is the technical term for the
  comma accumulating around a progression — lean into it.
