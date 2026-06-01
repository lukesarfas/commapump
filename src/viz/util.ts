import type { ScheduleResult, ScheduledNote } from "../core/index";
import type { TuningMode } from "../transport/store";

const NS = "http://www.w3.org/2000/svg";

export function svg(name: string, attrs: Record<string, string | number> = {}, text?: string): SVGElement {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text != null) node.textContent = text;
  return node as SVGElement;
}

export function activeNotes(result: ScheduleResult, beat: number): ScheduledNote[] {
  return result.notes.filter((n) => beat >= n.startBeat - 1e-6 && beat < n.startBeat + n.durBeats - 1e-6);
}

export function noteCents(n: ScheduledNote, tuning: TuningMode): number {
  return tuning === "JI" ? n.centsVsET : 0;
}

/** One representative note (the root) per chord, in playing order. */
export function chordRoots(result: ScheduleResult): ScheduledNote[] {
  const seen = new Map<number, ScheduledNote>();
  for (const n of result.notes) {
    if (n.voiceId === 0 && !seen.has(n.chordIndex)) seen.set(n.chordIndex, n);
  }
  return [...seen.values()].sort((a, b) => a.chordIndex - b.chordIndex);
}

/** The tonic "home" arrivals (drives the drift ribbon). */
export function homes(result: ScheduleResult): ScheduledNote[] {
  return result.notes.filter((n) => n.isCycleTonic).sort((a, b) => a.startBeat - b.startBeat);
}

export interface Chord {
  chordIndex: number;
  degree: string;
  cycle: number;
  startBeat: number;
  notes: ScheduledNote[];
}

/** Group the timeline back into chords, in playing order, root first. */
export function chords(result: ScheduleResult): Chord[] {
  const map = new Map<number, ScheduledNote[]>();
  for (const n of result.notes) {
    const arr = map.get(n.chordIndex);
    if (arr) arr.push(n);
    else map.set(n.chordIndex, [n]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chordIndex, notes]) => {
      notes.sort((a, b) => a.voiceId - b.voiceId);
      const root = notes[0];
      return { chordIndex, degree: root.degree, cycle: root.cycle, startBeat: root.startBeat, notes };
    });
}

/**
 * Temper out the syntonic comma on the Tonnetz: points differing by the comma
 * lattice vector (4, −1) collapse to one node — so the ET walk returns home.
 */
export function latticeET(x: number, y: number): { x: number; y: number } {
  const k = Math.round((4 * x - y) / 17);
  return { x: x - 4 * k, y: y + k };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const PITCH_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export function pitchName(midiNominal: number): string {
  return PITCH_NAMES[((midiNominal % 12) + 12) % 12];
}
