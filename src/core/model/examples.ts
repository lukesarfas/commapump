/**
 * The canonical examples — every ratio verified (see tests/tuning.test.ts).
 *
 * Each progression is authored as a chain of *root motions* by pure intervals;
 * the drift is whatever those pure steps add up to, never hand-tuned.
 */

import { MOTION } from "../tuning/ji";
import type { Progression } from "./progression";

/**
 * B · The famous pump — I–vi–ii–V–I (C–Am–Dm–G–C).
 * Every chord pure; the held D (10/9) reused as the fifth of G drags the
 * returning C down by exactly 81/80. Drifts DOWN ~21.5¢ per cycle.
 */
export const PUMP_IVIIVI: Progression = {
  id: "pump-i-vi-ii-v-i",
  name: "I–vi–ii–V–I",
  blurb: "C – Am – Dm – G – C, every chord justly tuned.",
  kind: "chordal",
  defaultCycles: 3,
  teaching:
    "Every chord is perfectly in tune, yet “home” sinks by one syntonic comma each time around.",
  steps: [
    { degree: "I", quality: "maj", rootMotion: MOTION.none, nominalRootMidi: 60 },
    { degree: "vi", quality: "min", rootMotion: MOTION.up_M6, nominalRootMidi: 57 },
    { degree: "ii", quality: "min", rootMotion: MOTION.down_P5, nominalRootMidi: 62 },
    { degree: "V", quality: "maj", rootMotion: MOTION.up_P4, nominalRootMidi: 55 },
    { degree: "I", quality: "maj", rootMotion: MOTION.down_P5, nominalRootMidi: 60 },
  ],
};

/**
 * C · The fifths chain — C–G–D–A–E then home by a pure major third.
 * Four pure fifths overshoot the pure third; the home C lands a comma SHARP.
 */
export const FIFTHS_CHAIN: Progression = {
  id: "fifths-chain",
  name: "C–G–D–A–E–C",
  blurb: "Four pure fifths up, then a pure major third back home.",
  kind: "melodic",
  defaultCycles: 1,
  teaching:
    "Stack pure fifths and you overshoot the pure third by a comma — fifths and thirds simply don’t agree.",
  steps: [
    { degree: "C", quality: "single", rootMotion: MOTION.none, nominalRootMidi: 60, beats: 1 },
    { degree: "G", quality: "single", rootMotion: MOTION.up_P5, nominalRootMidi: 67, beats: 1 },
    { degree: "D", quality: "single", rootMotion: MOTION.up_P5, nominalRootMidi: 62, beats: 1 },
    { degree: "A", quality: "single", rootMotion: MOTION.up_P5, nominalRootMidi: 69, beats: 1 },
    { degree: "E", quality: "single", rootMotion: MOTION.up_P5, nominalRootMidi: 64, beats: 1 },
    { degree: "C", quality: "single", rootMotion: MOTION.down_M3, nominalRootMidi: 60, beats: 2 },
  ],
};

/**
 * A · The wandering D. Over a sense of C, the note D has two pure identities a
 * comma apart: the major whole tone 9/8 and the minor whole tone 10/9. The line
 * returns home (no net drift) — the point is the gap between the two D's.
 */
export const WANDERING_D: Progression = {
  id: "wandering-d",
  name: "The wandering D",
  blurb: "One note name, two pure pitches — 9/8 and 10/9, a comma apart.",
  kind: "melodic",
  defaultCycles: 1,
  teaching: "One note name, two pitches: D is the major whole tone 9/8 when it's the fifth of G, but the minor whole tone 10/9 when it's the root of the ii chord (a pure fifth below the held A) — 81/80 apart.",
  steps: [
    // 10/9 first (the D the ii chord wants), then 9/8 (the D the G chord wants),
    // matching the walkthrough. Net motion is zero — the line returns to C.
    { degree: "C", quality: "single", rootMotion: MOTION.none, nominalRootMidi: 60, beats: 1 },
    { degree: "D 10/9", quality: "single", rootMotion: MOTION.up_M2min, nominalRootMidi: 62, beats: 1 },
    { degree: "C", quality: "single", rootMotion: MOTION.down_M2min, nominalRootMidi: 60, beats: 1 },
    { degree: "D 9/8", quality: "single", rootMotion: MOTION.up_M2, nominalRootMidi: 62, beats: 1 },
    { degree: "C", quality: "single", rootMotion: MOTION.down_M2, nominalRootMidi: 60, beats: 2 },
  ],
};

export const EXAMPLES: Progression[] = [WANDERING_D, PUMP_IVIIVI, FIFTHS_CHAIN];

export function exampleById(id: string): Progression | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
