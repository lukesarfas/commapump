/**
 * Flatten a progression into a timeline of notes, each carrying BOTH its exact
 * just frequency and its equal-tempered frequency, plus everything the four
 * visualizations need (lattice node, cents-vs-ET, cycle index). This is the one
 * artifact the audio engine and every visualization read from, so they can never
 * disagree about what is playing.
 */

import {
  addMonzo,
  centsOf,
  latticeCoord,
  placeNearMidi,
  type Monzo,
} from "../tuning/primes";
import { monzoToRational } from "../tuning/primes";
import { toNumber } from "../tuning/ratio";
import { REFERENCE_C_HZ } from "../tuning/pitch";
import { midiToFreq } from "../tuning/et";
import {
  CHORD_ET_OFFSETS,
  CHORD_INTERVALS,
  type Chord,
} from "./chord";
import {
  buildChords,
  cycleDriftMonzo,
  centsNearZero,
  type Progression,
} from "./progression";

/** Where the lowest chord tone (root) is parked, in MIDI, before drift. */
const ROOT_REGISTER_MIDI = 55;

export interface ScheduledNote {
  startBeat: number;
  durBeats: number;
  /** absolute JI monzo (octave-placed), relative to the reference C */
  monzo: Monzo;
  freqJI: number;
  freqET: number;
  midiNominal: number;
  /** how far the just pitch sits from its nominal ET note (the meter value) */
  centsVsET: number;
  /** Tonnetz coordinate (independent of octave) */
  lattice: { x: number; y: number };
  voiceId: number;
  chordIndex: number;
  cycle: number;
  degree: string;
  /** true for the root of a cycle's opening tonic (drives the drift ribbon) */
  isCycleTonic: boolean;
}

export interface ScheduleResult {
  notes: ScheduledNote[];
  totalBeats: number;
  /** signed cents the tonic moves each cycle (−21.5 for the classic pump) */
  driftPerCycleCents: number;
  cycles: number;
}

export interface ScheduleOptions {
  cycles?: number;
}

export function schedule(prog: Progression, opts: ScheduleOptions = {}): ScheduleResult {
  const cycles = opts.cycles ?? prog.defaultCycles;
  const drift = cycleDriftMonzo(prog.steps);
  const driftPerCycleCents = centsNearZero(centsOf(drift));

  const notes: ScheduledNote[] = [];
  let beat = 0;
  let chordIndex = 0;

  for (let c = 0; c < cycles; c++) {
    const offset = scaleMonzoInt(drift, c);
    const chords = buildChords(prog.steps, offset);

    // After the first cycle, the opening tonic equals the previous cycle's
    // resolution — don't re-strike it, just continue from the second chord.
    const startStep = c === 0 ? 0 : 1;

    for (let i = startStep; i < chords.length; i++) {
      const chord = chords[i];
      const step = prog.steps[i];
      const dur = step.beats ?? 1;
      // Mark every arrival "home" (the I): the very first downbeat, plus each
      // cycle's resolution. These are the points the drift ribbon stacks.
      const isCycleTonic = (c === 0 && i === 0) || i === chords.length - 1;
      emitChord(notes, chord, beat, dur, c, chordIndex, isCycleTonic);
      beat += dur;
      chordIndex++;
    }
  }

  return { notes, totalBeats: beat, driftPerCycleCents, cycles };
}

function emitChord(
  out: ScheduledNote[],
  chord: Chord,
  startBeat: number,
  durBeats: number,
  cycle: number,
  chordIndex: number,
  isCycleTonic: boolean,
): void {
  const intervals = CHORD_INTERVALS[chord.quality];
  const etOffsets = CHORD_ET_OFFSETS[chord.quality];

  intervals.forEach((iv, voiceId) => {
    const toneMonzo = addMonzo(chord.rootMonzo, iv);
    // Park near the nominal (non-drifting) target so the comma drift — which is
    // far smaller than an octave — is preserved rather than octave-snapped away.
    const targetMidi = ROOT_REGISTER_MIDI + etOffsets[voiceId];
    const placed = placeNearMidi(toneMonzo, targetMidi);

    const freqJI = REFERENCE_C_HZ * toNumber(monzoToRational(placed));
    const midiNominal = chord.nominalRootMidi + etOffsets[voiceId];
    const freqET = midiToFreq(midiNominal);
    const centsVsET = 1200 * Math.log2(freqJI / freqET);

    out.push({
      startBeat,
      durBeats,
      monzo: placed,
      freqJI,
      freqET,
      midiNominal,
      centsVsET,
      lattice: latticeCoord(placed),
      voiceId,
      chordIndex,
      cycle,
      degree: chord.degree,
      isCycleTonic: isCycleTonic && voiceId === 0,
    });
  });
}

function scaleMonzoInt(m: Monzo, k: number): Monzo {
  return [m[0] * k, m[1] * k, m[2] * k];
}
