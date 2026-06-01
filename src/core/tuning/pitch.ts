/**
 * A sounding pitch: an exact just-intonation monzo (relative to the reference
 * C = 1/1) plus the nominal 12-TET note it "spells as" (for the ET rendering
 * and the cents meter).
 */

import { centsOf, monzoToRational, type Monzo } from "./primes";
import { toNumber } from "./ratio";
import { midiToFreq } from "./et";

/** Reference: 1/1 is middle C (MIDI 60), tuned so ET and JI agree there. */
export const REFERENCE_C_MIDI = 60;
export const REFERENCE_C_HZ = midiToFreq(REFERENCE_C_MIDI); // 261.6256 Hz

export interface Pitch {
  /** absolute JI ratio (as a monzo) relative to the reference C */
  readonly monzo: Monzo;
  /** nominal 12-TET MIDI note (drives ET render + nearest-note for the meter) */
  readonly midiNominal: number;
  /** letter name, e.g. "C", "E", "G" */
  readonly name: string;
}

/** Just frequency, anchored so 1/1 = reference C. */
export function jiFreq(p: Pitch, refHz = REFERENCE_C_HZ): number {
  return refHz * toNumber(monzoToRational(p.monzo));
}

/** Equal-tempered frequency of the nominal note. */
export function etFreq(p: Pitch): number {
  return midiToFreq(p.midiNominal);
}

/** Cents of the just pitch relative to the reference C. */
export function jiCents(p: Pitch): number {
  return centsOf(p.monzo);
}

/** How far the just pitch sits from its nominal ET note — what the meter shows. */
export function jiVsEtCents(p: Pitch, refHz = REFERENCE_C_HZ): number {
  return 1200 * Math.log2(jiFreq(p, refHz) / etFreq(p));
}
