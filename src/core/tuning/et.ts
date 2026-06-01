/**
 * 12-tone equal temperament — the control case.
 *
 * In 12-TET the octave is split into twelve equal 100¢ steps, which *tempers
 * out* the syntonic comma: the two just whole tones (9/8 and 10/9) collapse to
 * one 200¢ note, so nothing can drift. This module renders the same notes the
 * "piano" way and measures how far a just pitch sits from its nearest ET note.
 */

export const A4_HZ = 440;
export const A4_MIDI = 69;

export function midiToFreq(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function freqToNearestMidi(freq: number): number {
  return Math.round(A4_MIDI + 12 * Math.log2(freq / A4_HZ));
}

/** Cents a frequency deviates from a given (or nearest) ET note. */
export function centsDeviation(freq: number, refMidi?: number): number {
  const midi = refMidi ?? freqToNearestMidi(freq);
  return 1200 * Math.log2(freq / midiToFreq(midi));
}
