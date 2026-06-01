/**
 * 5-limit monzos (prime-factor vectors).
 *
 * Every 5-limit just-intonation interval is 2^e2 · 3^e3 · 5^e5. Representing a
 * pitch as the exponent triple [e2, e3, e5] makes interval arithmetic exact and
 * additive (stacking intervals = adding vectors), and it hands us the Tonnetz
 * lattice for free: the fifths axis is e3, the thirds axis is e5. The octave
 * (e2) is the only thing that moves a pitch without changing its lattice node —
 * which is exactly why the comma pump can "return to C" yet land somewhere new.
 */

import { rational, mul, powRat, toCents, type Rational } from "./ratio";

/** [exponent of 2, exponent of 3, exponent of 5] */
export type Monzo = readonly [number, number, number];

export function monzo(e2: number, e3: number, e5: number): Monzo {
  return [e2, e3, e5];
}

export function addMonzo(a: Monzo, b: Monzo): Monzo {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subMonzo(a: Monzo, b: Monzo): Monzo {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaleMonzo(a: Monzo, k: number): Monzo {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function eqMonzo(a: Monzo, b: Monzo): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function monzoToRational(m: Monzo): Rational {
  let r = rational(1n);
  r = mul(r, powRat(rational(2n), m[0]));
  r = mul(r, powRat(rational(3n), m[1]));
  r = mul(r, powRat(rational(5n), m[2]));
  return r;
}

/** Cents of a monzo relative to 1/1. */
export function centsOf(m: Monzo): number {
  // Cheap, exact-enough closed form avoids building a huge Rational.
  return 1200 * (m[0] + m[1] * Math.log2(3) + m[2] * Math.log2(5));
}

/** Sanity check: closed-form cents must equal the rational route. */
export function centsViaRational(m: Monzo): number {
  return toCents(monzoToRational(m));
}

/** Octave-reduce to the pitch class in [1, 2) by adjusting only e2. */
export function octaveReduce(m: Monzo): Monzo {
  const log2 = centsOf(m) / 1200;
  const oct = Math.floor(log2);
  return [m[0] - oct, m[1], m[2]];
}

/**
 * Place a pitch in a register by shifting whole octaves (changing only e2, so
 * the comma in e3/e5 is preserved). Returns a monzo whose frequency sits within
 * a tritone of `targetMidi` (relative to the reference C = MIDI 60 at 1/1).
 */
export function placeNearMidi(m: Monzo, targetMidi: number, refCMidi = 60): Monzo {
  const pitchMidi = refCMidi + centsOf(m) / 100;
  const shift = Math.round((targetMidi - pitchMidi) / 12);
  return [m[0] + shift, m[1], m[2]];
}

/** Tonnetz lattice coordinate: x = fifths (e3), y = thirds (e5). */
export function latticeCoord(m: Monzo): { x: number; y: number } {
  return { x: m[1], y: m[2] };
}
