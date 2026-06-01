/**
 * Chords as a root plus a set of just intervals stacked above it.
 */

import { addMonzo, type Monzo } from "../tuning/primes";
import { JI } from "../tuning/ji";

export type ChordQuality = "maj" | "min" | "maj7" | "min7" | "dom7" | "single";

/** Just intervals above the root for each quality. */
export const CHORD_INTERVALS: Record<ChordQuality, Monzo[]> = {
  single: [JI.unison],
  maj: [JI.unison, JI.M3, JI.P5],
  min: [JI.unison, JI.m3, JI.P5],
  maj7: [JI.unison, JI.M3, JI.P5, JI.M7],
  min7: [JI.unison, JI.m3, JI.P5, JI.m7],
  dom7: [JI.unison, JI.M3, JI.P5, JI.m7],
};

/** Equal-tempered semitone offsets above the nominal root for each quality. */
export const CHORD_ET_OFFSETS: Record<ChordQuality, number[]> = {
  single: [0],
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};

export interface Chord {
  /** absolute root monzo, relative to the cycle-start tonic */
  rootMonzo: Monzo;
  quality: ChordQuality;
  nominalRootMidi: number;
  degree: string;
}

/** Absolute monzos of every chord tone. */
export function chordNoteMonzos(chord: Chord): Monzo[] {
  return CHORD_INTERVALS[chord.quality].map((iv) => addMonzo(chord.rootMonzo, iv));
}

/** Nominal ET MIDI note of every chord tone. */
export function chordNoteMidis(chord: Chord): number[] {
  return CHORD_ET_OFFSETS[chord.quality].map((semi) => chord.nominalRootMidi + semi);
}
