import { describe, it, expect } from "vitest";
import {
  // ratio
  rational,
  toCents,
  toNumber,
  ratioString,
  // primes
  monzo,
  addMonzo,
  subMonzo,
  centsOf,
  centsViaRational,
  monzoToRational,
  octaveReduce,
  latticeCoord,
  // ji
  JI,
  // et
  midiToFreq,
  centsDeviation,
  // comma
  SYNTONIC_COMMA,
  PYTHAGOREAN_COMMA,
  SYNTONIC_COMMA_CENTS,
  PYTHAGOREAN_COMMA_CENTS,
  driftCents,
  // pitch
  REFERENCE_C_HZ,
  jiVsEtCents,
  // model
  cycleDriftMonzo,
  cycleDriftCents,
  schedule,
  PUMP_IVIIVI,
  FIFTHS_CHAIN,
} from "../src/core/index";

describe("rational arithmetic", () => {
  it("reduces and stringifies", () => {
    expect(ratioString(rational(81n, 80n))).toBe("81/80");
    expect(ratioString(rational(162n, 160n))).toBe("81/80");
  });
  it("collapses to a float", () => {
    expect(toNumber(rational(3n, 2n))).toBeCloseTo(1.5, 12);
  });
});

describe("interval cents (verified table)", () => {
  const cases: [keyof typeof JI, string, number][] = [
    ["P5", "3/2", 701.955],
    ["P4", "4/3", 498.045],
    ["M3", "5/4", 386.314],
    ["m3", "6/5", 315.641],
    ["M6", "5/3", 884.359],
    ["M2", "9/8", 203.91],
    ["m2tone", "10/9", 182.404],
    ["M7", "15/8", 1088.269],
  ];
  for (const [name, ratio, cents] of cases) {
    it(`${name} = ${ratio} = ${cents}¢`, () => {
      expect(ratioString(monzoToRational(JI[name]))).toBe(ratio);
      expect(centsOf(JI[name])).toBeCloseTo(cents, 2);
      // closed-form cents must agree with the rational route
      expect(centsViaRational(JI[name])).toBeCloseTo(centsOf(JI[name]), 8);
    });
  }
});

describe("the syntonic comma", () => {
  it("is 81/80 ≈ 21.506¢", () => {
    expect(ratioString(monzoToRational(SYNTONIC_COMMA))).toBe("81/80");
    expect(SYNTONIC_COMMA_CENTS).toBeCloseTo(21.506, 3);
  });
  it("is four pure fifths minus two octaves, over a pure major third", () => {
    // (3/2)^4 = 81/16; drop two octaves → 81/64 (the Pythagorean ditone)
    const fourFifths = monzo(-4, 4, 0); // 81/16
    const ditone = subMonzo(fourFifths, monzo(2, 0, 0)); // 81/64
    expect(monzoToRational(ditone)).toEqual(rational(81n, 64n));
    // 81/64 ÷ 5/4 = 81/80 = the syntonic comma
    const gap = subMonzo(ditone, JI.M3);
    expect(gap).toEqual(SYNTONIC_COMMA);
  });
  it("is the gap between the two just whole tones (9/8 ÷ 10/9)", () => {
    expect(subMonzo(JI.M2, JI.m2tone)).toEqual(SYNTONIC_COMMA);
  });
  it("differs from the Pythagorean comma (they are NOT the same)", () => {
    expect(PYTHAGOREAN_COMMA_CENTS).toBeCloseTo(23.46, 2);
    expect(ratioString(monzoToRational(PYTHAGOREAN_COMMA))).toBe("531441/524288");
    // the schisma between them is ~1.954¢
    expect(PYTHAGOREAN_COMMA_CENTS - SYNTONIC_COMMA_CENTS).toBeCloseTo(1.954, 2);
  });
});

describe("octave reduction & lattice", () => {
  it("reduces 9/4 to the pitch class 9/8", () => {
    expect(monzoToRational(octaveReduce(monzo(-2, 2, 0)))).toEqual(rational(9n, 8n));
  });
  it("places a pitch on the Tonnetz by (fifths, thirds)", () => {
    expect(latticeCoord(JI.M3)).toEqual({ x: 0, y: 1 }); // a third = one step up the y axis
    expect(latticeCoord(JI.P5)).toEqual({ x: 1, y: 0 }); // a fifth = one step along x
  });
});

describe("equal temperament", () => {
  it("anchors middle C at ~261.63 Hz", () => {
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
    expect(REFERENCE_C_HZ).toBeCloseTo(261.6256, 3);
  });
  it("a just major third is ~13.7¢ flat of the ET third", () => {
    const e = { monzo: JI.M3, midiNominal: 64, name: "E" };
    expect(jiVsEtCents(e)).toBeCloseTo(-13.686, 2);
  });
  it("measures deviation from the nearest ET note", () => {
    expect(centsDeviation(midiToFreq(60))).toBeCloseTo(0, 6);
  });
});

describe("the comma pump (I–vi–ii–V–I)", () => {
  it("drifts DOWN exactly one syntonic comma (81/80) per cycle", () => {
    const drift = cycleDriftMonzo(PUMP_IVIIVI.steps);
    expect(drift).toEqual(monzo(4, -4, 1)); // = 80/81
    expect(monzoToRational(drift)).toEqual(rational(80n, 81n));
    expect(cycleDriftCents(PUMP_IVIIVI.steps)).toBeCloseTo(-21.506, 3);
  });
  it("the held D is the minor whole tone 10/9, not 9/8", () => {
    // ii root after I→vi→ii: 1 → 5/3 → 10/9
    const dRoot = addMonzo(addMonzo(JI.unison, JI.M6), monzo(1, -1, 0)); // up M6 then down P5
    expect(monzoToRational(dRoot)).toEqual(rational(10n, 9n));
  });
  it("accumulates over cycles: −21.5 / −43.0 / −64.5¢ at each home", () => {
    const { notes, driftPerCycleCents } = schedule(PUMP_IVIIVI, { cycles: 3 });
    expect(driftPerCycleCents).toBeCloseTo(-21.506, 3);
    const homes = notes.filter((n) => n.isCycleTonic).map((n) => n.centsVsET);
    expect(homes.length).toBe(4); // opening + 3 resolutions
    expect(homes[0]).toBeCloseTo(0, 3);
    expect(homes[1]).toBeCloseTo(-21.506, 2);
    expect(homes[2]).toBeCloseTo(-43.013, 2);
    expect(homes[3]).toBeCloseTo(-64.519, 2);
  });
});

describe("the fifths chain (C–G–D–A–E–C)", () => {
  it("lands a syntonic comma SHARP (+21.5¢)", () => {
    expect(cycleDriftCents(FIFTHS_CHAIN.steps)).toBeCloseTo(21.506, 3);
    // the E reached by four pure fifths is the Pythagorean ditone 81/64
    const e = FIFTHS_CHAIN.steps
      .slice(0, 5)
      .reduce((acc, s) => addMonzo(acc, s.rootMotion), monzo(0, 0, 0));
    expect(monzoToRational(octaveReduce(e))).toEqual(rational(81n, 64n));
  });
});

describe("schedule integrity", () => {
  it("produces notes with both JI and ET frequencies", () => {
    const { notes } = schedule(PUMP_IVIIVI, { cycles: 1 });
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(n.freqJI).toBeGreaterThan(20);
      expect(n.freqJI).toBeLessThan(20000);
      expect(n.freqET).toBeGreaterThan(20);
      expect(Number.isFinite(n.centsVsET)).toBe(true);
    }
  });
});
