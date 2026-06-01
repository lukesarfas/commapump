import { describe, it, expect } from "vitest";
import {
  monzo,
  addMonzo,
  subMonzo,
  monzoToRational,
  octaveReduce,
  centsOf,
  // et
  midiToFreq,
  freqToNearestMidi,
  centsDeviation,
  // ji
  JI,
  // pitch
  REFERENCE_C_HZ,
  jiFreq,
  etFreq,
  jiVsEtCents,
  // ratio
  rational,
  // comma
  SYNTONIC_COMMA,
  SYNTONIC_COMMA_CENTS,
  // model
  schedule,
  cycleDriftMonzo,
  cycleDriftCents,
  WANDERING_D,
  PUMP_IVIIVI,
  FIFTHS_CHAIN,
} from "../src/core/index";

// ---- ET nearest-note mapping & cents deviation -----------------------------
// These guard the meter: a just pitch must map to the right piano key and read
// the correct signed deviation from it.
describe("ET nearest-note mapping", () => {
  it("snaps an exact ET frequency to its own MIDI note (deviation 0)", () => {
    for (const m of [48, 55, 60, 64, 67, 69, 72]) {
      expect(freqToNearestMidi(midiToFreq(m))).toBe(m);
      expect(centsDeviation(midiToFreq(m))).toBeCloseTo(0, 9);
    }
  });
  it("rounds to the nearer note across the 50¢ boundary", () => {
    const c4 = midiToFreq(60);
    // +49¢ stays C; +51¢ rolls up to C#.
    expect(freqToNearestMidi(c4 * Math.pow(2, 49 / 1200))).toBe(60);
    expect(freqToNearestMidi(c4 * Math.pow(2, 51 / 1200))).toBe(61);
  });
  it("reports the signed deviation from the nearest note", () => {
    const sharp = midiToFreq(60) * Math.pow(2, 20 / 1200);
    expect(centsDeviation(sharp)).toBeCloseTo(20, 6);
    const flat = midiToFreq(60) * Math.pow(2, -15 / 1200);
    expect(centsDeviation(flat)).toBeCloseTo(-15, 6);
  });
  it("measures deviation against an explicitly supplied reference note", () => {
    // The just M3 above C is ~13.7¢ flat of the ET E, regardless of which note
    // it would otherwise snap to.
    const jiE = REFERENCE_C_HZ * (5 / 4);
    expect(centsDeviation(jiE, 64)).toBeCloseTo(-13.686, 2);
  });
});

// ---- JI vs ET frequency selection ------------------------------------------
describe("JI vs ET frequency selection", () => {
  it("agrees at the reference C (1/1 = MIDI 60)", () => {
    const c = { monzo: JI.unison, midiNominal: 60, name: "C" };
    expect(jiFreq(c)).toBeCloseTo(REFERENCE_C_HZ, 9);
    expect(etFreq(c)).toBeCloseTo(REFERENCE_C_HZ, 9);
    expect(jiVsEtCents(c)).toBeCloseTo(0, 9);
  });
  it("derives the just frequency from the exact ratio, not the ET grid", () => {
    const g = { monzo: JI.P5, midiNominal: 67, name: "G" };
    expect(jiFreq(g)).toBeCloseTo(REFERENCE_C_HZ * 1.5, 9);
    // the pure fifth sits ~1.955¢ sharp of the tempered G7
    expect(jiVsEtCents(g)).toBeCloseTo(1.955, 2);
  });
  it("the pure minor third reads ~15.6¢ sharp of its ET nominal", () => {
    // 6/5 = 315.641¢ vs the 300¢ ET minor third → +15.641¢
    const eb = { monzo: JI.m3, midiNominal: 63, name: "Eb" };
    expect(jiVsEtCents(eb)).toBeCloseTo(15.641, 2);
  });
  it("the scheduler carries both freqJI and freqET, and they differ in JI", () => {
    const { notes } = schedule(PUMP_IVIIVI, { cycles: 1 });
    // a just major third somewhere in the run must be flat of its ET twin
    const thirds = notes.filter((n) => Math.abs(n.centsVsET + 13.686) < 0.5);
    expect(thirds.length).toBeGreaterThan(0);
    for (const n of thirds) expect(n.freqJI).toBeLessThan(n.freqET);
  });
});

// ---- the wandering-D two-D 81/80 gap ---------------------------------------
describe("the wandering D — two D's a syntonic comma apart", () => {
  it("hits both 9/8 (major whole tone) and 10/9 (minor whole tone), in either order", () => {
    // The two D's are the cumulative pitches after step 1 and after step 3.
    const dFirst = WANDERING_D.steps.slice(0, 2).reduce((acc, s) => addMonzo(acc, s.rootMotion), monzo(0, 0, 0));
    const dSecond = WANDERING_D.steps.slice(0, 4).reduce((acc, s) => addMonzo(acc, s.rootMotion), monzo(0, 0, 0));
    const ds = [dFirst, dSecond].map((m) => monzoToRational(octaveReduce(m)));
    const has = (n: bigint, d: bigint) => ds.some((r) => r.n === n && r.d === d);
    expect(has(9n, 8n)).toBe(true);
    expect(has(10n, 9n)).toBe(true);
  });
  it("the gap between the two D's is exactly the syntonic comma (81/80)", () => {
    const gap = subMonzo(JI.M2, JI.m2tone); // 9/8 ÷ 10/9
    expect(gap).toEqual(SYNTONIC_COMMA);
    expect(monzoToRational(gap)).toEqual(rational(81n, 80n));
    expect(centsOf(gap)).toBeCloseTo(SYNTONIC_COMMA_CENTS, 9);
    expect(centsOf(gap)).toBeCloseTo(21.506, 3);
  });
  it("returns home with no net drift (the point is the gap, not the slide)", () => {
    expect(cycleDriftCents(WANDERING_D.steps)).toBeCloseTo(0, 9);
    expect(cycleDriftMonzo(WANDERING_D.steps)).toEqual(monzo(0, 0, 0));
  });
});

// ---- the fifths chain landing +21.5¢ ---------------------------------------
describe("the fifths chain lands a comma sharp", () => {
  it("the E after four pure fifths is the Pythagorean ditone 81/64", () => {
    const e = FIFTHS_CHAIN.steps
      .slice(0, 5)
      .reduce((acc, s) => addMonzo(acc, s.rootMotion), monzo(0, 0, 0));
    expect(monzoToRational(octaveReduce(e))).toEqual(rational(81n, 64n));
  });
  it("stepping home by a pure major third overshoots by +81/80", () => {
    const drift = cycleDriftMonzo(FIFTHS_CHAIN.steps);
    // net = (3/2)^4 · (4/5) octave-folded = 81/80 (up a comma)
    expect(monzoToRational(octaveReduce(drift))).toEqual(rational(81n, 80n));
    expect(cycleDriftCents(FIFTHS_CHAIN.steps)).toBeCloseTo(21.506, 3);
    expect(cycleDriftCents(FIFTHS_CHAIN.steps)).toBeGreaterThan(0);
  });
  it("the pump and the fifths chain drift opposite directions, same magnitude", () => {
    const down = cycleDriftCents(PUMP_IVIIVI.steps);
    const up = cycleDriftCents(FIFTHS_CHAIN.steps);
    expect(down).toBeCloseTo(-up, 3);
    expect(Math.abs(down)).toBeCloseTo(SYNTONIC_COMMA_CENTS, 3);
  });
});

// ---- schedule cumulative drift ---------------------------------------------
describe("schedule cumulative drift", () => {
  it("stacks the comma linearly across N cycles at each home", () => {
    const N = 6;
    const { notes, driftPerCycleCents } = schedule(PUMP_IVIIVI, { cycles: N });
    expect(driftPerCycleCents).toBeCloseTo(-21.506, 3);
    const homes = notes.filter((n) => n.isCycleTonic).map((n) => n.centsVsET);
    // one opening tonic + one resolution per cycle
    expect(homes.length).toBe(N + 1);
    homes.forEach((c, i) => {
      expect(c).toBeCloseTo(-21.506 * i, 1);
    });
    // after six loops we have lost nearly a whole semitone
    expect(homes[N]).toBeCloseTo(-129.03, 1);
  });
  it("never re-strikes the seam: each cycle continues from the prior resolution", () => {
    const { notes } = schedule(PUMP_IVIIVI, { cycles: 3 });
    // chordIndex is strictly increasing and contiguous across cycle boundaries
    const indices = [...new Set(notes.map((n) => n.chordIndex))].sort((a, b) => a - b);
    indices.forEach((idx, i) => expect(idx).toBe(i));
  });
  it("ET schedule of the same progression accumulates zero drift", () => {
    // The schedule itself is tuning-agnostic (it carries both freqs); but the
    // ET *rendering* (freqET) at every home is the same nominal pitch, proving
    // the comma is tempered out on the piano grid.
    const { notes } = schedule(PUMP_IVIIVI, { cycles: 4 });
    const homeET = notes.filter((n) => n.isCycleTonic).map((n) => n.freqET);
    for (const f of homeET) expect(f).toBeCloseTo(homeET[0], 9);
  });
  it("totalBeats equals the summed step durations across all cycles", () => {
    const cycles = 3;
    const { totalBeats } = schedule(PUMP_IVIIVI, { cycles });
    const perCycle = PUMP_IVIIVI.steps.reduce((a, s) => a + (s.beats ?? 1), 0);
    const firstStep = PUMP_IVIIVI.steps[0].beats ?? 1;
    // first cycle plays all steps; later cycles skip the re-struck opening tonic
    const expected = perCycle + (cycles - 1) * (perCycle - firstStep);
    expect(totalBeats).toBe(expected);
  });
  it("defaults to the progression's own cycle count when none is given", () => {
    const def = schedule(PUMP_IVIIVI);
    expect(def.cycles).toBe(PUMP_IVIIVI.defaultCycles);
  });
});
