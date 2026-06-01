/**
 * Exact rational arithmetic over BigInt.
 *
 * Just-intonation ratios are exact fractions; doing the math in floating point
 * would let a syntonic comma (81/80) blur into rounding noise. We keep ratios
 * exact and only collapse to a JS `number` at the audio boundary.
 */

export interface Rational {
  /** numerator (sign carried here; denominator is always positive) */
  readonly n: bigint;
  /** denominator, always > 0 */
  readonly d: bigint;
}

export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Construct a reduced rational. */
export function rational(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new Error("rational: denominator is zero");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}

export function mul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

export function div(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d, a.d * b.n);
}

/** Integer power (supports negative exponents via reciprocal). */
export function powRat(a: Rational, e: number): Rational {
  if (!Number.isInteger(e)) throw new Error("powRat: integer exponent only");
  if (e === 0) return rational(1n);
  const base = e < 0 ? rational(a.d, a.n) : a;
  let out = rational(1n);
  for (let i = 0; i < Math.abs(e); i++) out = mul(out, base);
  return out;
}

/** log2 of a possibly-huge bigint, accurate to ~52 bits. */
function log2Big(x: bigint): number {
  if (x <= 0n) throw new Error("log2Big: non-positive");
  const bits = x.toString(2).length;
  const shift = BigInt(Math.max(0, bits - 53));
  const top = Number(x >> shift);
  return Math.log2(top) + Number(shift);
}

/** log2(n/d), robust for very large numerators/denominators. */
export function log2Rational(r: Rational): number {
  return log2Big(r.n) - log2Big(r.d);
}

/** Cents = 1200·log2(ratio). The octave is 1200¢. */
export function toCents(r: Rational): number {
  return 1200 * log2Rational(r);
}

/** Collapse to a float multiplier (robust even when n/d overflow Number). */
export function toNumber(r: Rational): number {
  if (r.n < 9_007_199_254_740_992n && r.d < 9_007_199_254_740_992n) {
    return Number(r.n) / Number(r.d);
  }
  return Math.pow(2, log2Rational(r));
}

export function ratioString(r: Rational): string {
  return `${r.n}/${r.d}`;
}

export function equals(a: Rational, b: Rational): boolean {
  return a.n === b.n && a.d === b.d;
}
