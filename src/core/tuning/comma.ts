/**
 * Commas — the small leftovers that make pure tuning inconsistent.
 *
 * The syntonic comma (81/80, ~21.5¢) is the gap between four pure fifths and a
 * pure major third — the one the triadic "pump" accumulates. The Pythagorean
 * comma (twelve fifths vs seven octaves, ~23.5¢) is a different beast; we keep
 * it here only to contrast, never to conflate.
 */

import { monzo, centsOf, subMonzo, type Monzo } from "./primes";

/** 81/80 = 2^-4 · 3^4 · 5^-1 */
export const SYNTONIC_COMMA: Monzo = monzo(-4, 4, -1);

/** 531441/524288 = (3/2)^12 / 2^7 = 3^12 / 2^19 */
export const PYTHAGOREAN_COMMA: Monzo = monzo(-19, 12, 0);

/** ~1.954¢ — the tiny difference between the two commas above. */
export const SCHISMA: Monzo = subMonzo(PYTHAGOREAN_COMMA, SYNTONIC_COMMA);

export const SYNTONIC_COMMA_CENTS = centsOf(SYNTONIC_COMMA); // 21.506¢
export const PYTHAGOREAN_COMMA_CENTS = centsOf(PYTHAGOREAN_COMMA); // 23.460¢

/** Signed cents of drift from a start pitch to an end pitch (both monzos). */
export function driftCents(start: Monzo, end: Monzo): number {
  return centsOf(subMonzo(end, start));
}

/** How many syntonic commas (signed, possibly fractional) separate two pitches. */
export function commasBetween(start: Monzo, end: Monzo): number {
  return driftCents(start, end) / SYNTONIC_COMMA_CENTS;
}
