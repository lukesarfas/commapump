/**
 * A progression as a chain of exact root motions.
 *
 * Instead of hard-coding each root's frequency, we describe how the root *moves*
 * from one chord to the next as a pure interval (the common-tone voice-leading
 * that a singer or a string quartet would actually follow). Sum the motions
 * around one loop and — if the loop is a comma pump — you land not on 1/1 but on
 * a syntonic comma away. That residue is `cycleDriftMonzo`, computed, not assumed.
 */

import { addMonzo, centsOf, type Monzo } from "../tuning/primes";
import type { Chord, ChordQuality } from "./chord";

export interface StepSpec {
  degree: string;
  quality: ChordQuality;
  /** root motion from the previous root (from 1/1 for the first step) */
  rootMotion: Monzo;
  /** nominal ET root note (MIDI) */
  nominalRootMidi: number;
  /** beats this chord/note lasts (default 1) */
  beats?: number;
}

export interface Progression {
  id: string;
  name: string;
  blurb: string;
  kind: "chordal" | "melodic";
  /** one cycle of steps; for the pump the last step is the (drifted) resolution */
  steps: StepSpec[];
  /** how many cycles to play by default */
  defaultCycles: number;
  teaching: string;
}

/** Roots of one cycle's chords, starting from `offset` (the cycle's tonic). */
export function buildChords(steps: StepSpec[], offset: Monzo = [0, 0, 0]): Chord[] {
  const chords: Chord[] = [];
  let root: Monzo = offset;
  for (const s of steps) {
    root = addMonzo(root, s.rootMotion);
    chords.push({
      rootMonzo: root,
      quality: s.quality,
      nominalRootMidi: s.nominalRootMidi,
      degree: s.degree,
    });
  }
  return chords;
}

/** Net pitch shift after one cycle = sum of all root motions. */
export function cycleDriftMonzo(steps: StepSpec[]): Monzo {
  return steps.reduce<Monzo>((acc, s) => addMonzo(acc, s.rootMotion), [0, 0, 0]);
}

/** Drift per cycle in cents, folded to the nearest octave (signed). */
export function cycleDriftCents(steps: StepSpec[]): number {
  return centsNearZero(centsOf(cycleDriftMonzo(steps)));
}

/** Fold cents into (-600, 600] so a comma reads as ±21.5, not +1178.5. */
export function centsNearZero(c: number): number {
  let x = ((c % 1200) + 1200) % 1200;
  if (x > 600) x -= 1200;
  return x;
}
