/**
 * Look-ahead scheduler — the "Tale of Two Clocks" pattern. A coarse setTimeout
 * loop wakes ~every 25ms and hands the audio clock any notes that fall inside a
 * 100ms horizon, scheduled at sample-accurate times. Audio timing never depends
 * on the (jankable) animation frame; visuals follow this clock, not the reverse.
 */

import type { ScheduledNote } from "../core/index";

export interface SchedulerOptions {
  ctx: AudioContext;
  bps: number;
  onSchedule: (note: ScheduledNote, when: number) => void;
  onEnd?: () => void;
}

const LOOKAHEAD_MS = 25;
const HORIZON_S = 0.1;
const START_DELAY_S = 0.06;

export class Scheduler {
  bps: number;
  private notes: ScheduledNote[] = [];
  private totalBeats = 0;
  private idx = 0;
  private startCtxTime = 0;
  private startBeat = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private opts: SchedulerOptions) {
    this.bps = opts.bps;
  }

  load(notes: ScheduledNote[], totalBeats: number): void {
    this.notes = [...notes].sort((a, b) => a.startBeat - b.startBeat);
    this.totalBeats = totalBeats;
  }

  get isRunning(): boolean {
    return this.running;
  }

  currentBeat(): number {
    if (!this.running) return this.startBeat;
    return this.startBeat + (this.opts.ctx.currentTime - this.startCtxTime) * this.bps;
  }

  start(fromBeat: number): void {
    this.startBeat = fromBeat;
    this.startCtxTime = this.opts.ctx.currentTime + START_DELAY_S;
    this.idx = this.notes.findIndex((n) => n.startBeat >= fromBeat - 1e-6);
    if (this.idx < 0) this.idx = this.notes.length;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private beatToTime(beat: number): number {
    return this.startCtxTime + (beat - this.startBeat) / this.bps;
  }

  private tick = (): void => {
    if (!this.running) return;
    const horizon = this.opts.ctx.currentTime + HORIZON_S;

    while (this.idx < this.notes.length) {
      const note = this.notes[this.idx];
      const when = this.beatToTime(note.startBeat);
      if (when > horizon) break;
      this.opts.onSchedule(note, Math.max(when, this.opts.ctx.currentTime));
      this.idx++;
    }

    if (this.idx >= this.notes.length && this.currentBeat() >= this.totalBeats) {
      this.stop();
      this.opts.onEnd?.();
      return;
    }
    this.timer = setTimeout(this.tick, LOOKAHEAD_MS);
  };
}
