/**
 * 5-limit just-intonation interval table (as monzos above a root).
 *
 * Every value is verified against the canonical ratio in the comment.
 */

import { monzo, type Monzo } from "./primes";

export const JI = {
  unison: monzo(0, 0, 0), //  1/1     0.000¢
  octave: monzo(1, 0, 0), //  2/1   1200.000¢
  P5: monzo(-1, 1, 0), //     3/2    701.955¢  perfect fifth
  P4: monzo(2, -1, 0), //     4/3    498.045¢  perfect fourth
  M3: monzo(-2, 0, 1), //     5/4    386.314¢  just major third
  m3: monzo(1, 1, -1), //     6/5    315.641¢  just minor third
  M6: monzo(0, -1, 1), //     5/3    884.359¢  just major sixth
  m6: monzo(3, 0, -1), //     8/5    813.686¢  just minor sixth
  M2: monzo(-3, 2, 0), //     9/8    203.910¢  major whole tone
  m2tone: monzo(1, -2, 1), // 10/9   182.404¢  minor whole tone
  M7: monzo(-3, 1, 1), //    15/8   1088.269¢  just major seventh
  m7: monzo(0, 2, -1), //     9/5    1017.596¢  just minor seventh (5-limit)
  dim5: monzo(-5, 0, 2), //  25/18   568.717¢  (playground)
} as const;

/** Root motions used to build progressions, as exact monzos. */
export const MOTION = {
  none: JI.unison, //          stay
  up_P5: monzo(-1, 1, 0), //   3/2   up a fifth
  down_P5: monzo(1, -1, 0), // 2/3   down a fifth
  up_P4: monzo(2, -1, 0), //   4/3   up a fourth
  down_P4: monzo(-2, 1, 0), // 3/4   down a fourth
  up_M3: monzo(-2, 0, 1), //   5/4   up a major third
  down_M3: monzo(2, 0, -1), // 4/5   down a major third
  up_M6: monzo(0, -1, 1), //   5/3   up a major sixth
  down_m3: monzo(-1, -1, 1), // 5/6  down a minor third
  up_M2: monzo(-3, 2, 0), //   9/8   up a major whole tone
  down_M2: monzo(3, -2, 0), // 8/9   down a major whole tone
  up_M2min: monzo(1, -2, 1), // 10/9 up a minor whole tone
  down_M2min: monzo(-1, 2, -1), // 9/10 down a minor whole tone
} as const;
