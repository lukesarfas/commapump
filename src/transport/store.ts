/**
 * The single source of truth shared by audio and every visualization.
 *
 * Discrete changes (play/pause, tuning, tempo, which progression) notify
 * subscribers. The playhead `beat` updates many times per second, so it has a
 * silent fast path (`setBeat`) that visualizations read each animation frame
 * rather than subscribing to — keeping the hot loop allocation-free.
 */

export type TuningMode = "JI" | "ET";

export interface TransportState {
  playing: boolean;
  /** continuous playhead position, in beats */
  beat: number;
  totalBeats: number;
  tuning: TuningMode;
  bpm: number;
  progressionId: string;
  cycles: number;
}

type Listener = (s: TransportState) => void;

const DEFAULTS: TransportState = {
  playing: false,
  beat: 0,
  totalBeats: 0,
  tuning: "JI",
  bpm: 92,
  progressionId: "",
  cycles: 3,
};

export class TransportStore {
  private state: TransportState;
  private listeners = new Set<Listener>();

  constructor(initial: Partial<TransportState> = {}) {
    this.state = { ...DEFAULTS, ...initial };
  }

  get(): TransportState {
    return this.state;
  }

  /** Discrete update — notifies subscribers. */
  set(patch: Partial<TransportState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  /** Hot-path playhead update — does NOT notify (read directly in rAF). */
  setBeat(beat: number): void {
    this.state = { ...this.state, beat };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }
}
