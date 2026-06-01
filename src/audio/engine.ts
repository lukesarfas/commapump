/**
 * Ties the schedule, the look-ahead clock, and the voices to the transport
 * store. The store is the source of truth; the engine is the only thing that
 * actually makes sound and the only authority on the live playhead position.
 */

import type { ScheduleResult, ScheduledNote } from "../core/index";
import type { TransportStore, TuningMode } from "../transport/store";
import { getAudioContext, unlockAudio } from "./context";
import { createMaster, type Master } from "./master";
import { createVoice, type Voice } from "./voice";
import { Scheduler } from "./scheduler";

interface ActiveVoice {
  voice: Voice;
  note: ScheduledNote;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: Master | null = null;
  private scheduler: Scheduler | null = null;
  private result: ScheduleResult | null = null;
  private active = new Set<ActiveVoice>();

  constructor(private store: TransportStore) {}

  load(result: ScheduleResult): void {
    this.result = result;
    this.scheduler?.load(result.notes, result.totalBeats);
    this.store.set({ totalBeats: result.totalBeats });
    if (this.store.get().beat > result.totalBeats) this.store.setBeat(0);
  }

  /** Warm up the AudioContext inside a user gesture so later autoplay works. */
  async unlock(): Promise<void> {
    this.ensure();
    await unlockAudio();
  }

  /** Live playhead (beats) — scheduler clock while playing, stored beat otherwise. */
  getBeat(): number {
    if (this.scheduler?.isRunning) return Math.min(this.scheduler.currentBeat(), this.result?.totalBeats ?? 0);
    return this.store.get().beat;
  }

  async play(): Promise<void> {
    if (!this.result) return;
    this.ensure();
    await unlockAudio();
    const bps = this.store.get().bpm / 60;
    this.scheduler!.bps = bps;
    this.scheduler!.load(this.result.notes, this.result.totalBeats);
    const from = this.store.get().beat >= this.result.totalBeats ? 0 : this.store.get().beat;
    this.scheduler!.start(from);
    this.store.set({ playing: true });
  }

  pause(): void {
    const beat = this.getBeat();
    this.scheduler?.stop();
    this.releaseAll();
    this.store.setBeat(beat);
    this.store.set({ playing: false });
  }

  toggle(): void {
    if (this.store.get().playing) this.pause();
    else void this.play();
  }

  seek(beat: number): void {
    const clamped = Math.max(0, Math.min(beat, this.result?.totalBeats ?? 0));
    const wasPlaying = this.store.get().playing;
    this.scheduler?.stop();
    this.releaseAll();
    this.store.setBeat(clamped);
    if (wasPlaying) this.scheduler!.start(clamped);
    else this.store.set({ beat: clamped });
  }

  setTuning(mode: TuningMode): void {
    this.store.set({ tuning: mode });
    const now = this.ctx?.currentTime ?? 0;
    for (const a of this.active) {
      a.voice.setFreq(mode === "JI" ? a.note.freqJI : a.note.freqET, now);
    }
  }

  setTempo(bpm: number): void {
    this.store.set({ bpm });
    if (this.scheduler && this.store.get().playing) this.seek(this.getBeat());
  }

  dispose(): void {
    this.scheduler?.stop();
    this.releaseAll();
  }

  private ensure(): void {
    if (this.ctx) return;
    this.ctx = getAudioContext();
    this.master = createMaster(this.ctx);
    this.scheduler = new Scheduler({
      ctx: this.ctx,
      bps: this.store.get().bpm / 60,
      onSchedule: this.handleSchedule,
      onEnd: this.handleEnd,
    });
    if (this.result) this.scheduler.load(this.result.notes, this.result.totalBeats);
  }

  private handleSchedule = (note: ScheduledNote, when: number): void => {
    if (!this.ctx || !this.master) return;
    const bps = this.store.get().bpm / 60;
    const freq = this.store.get().tuning === "JI" ? note.freqJI : note.freqET;
    const durSec = note.durBeats / bps;
    const voice = createVoice(this.ctx, this.master.input, freq, when, durSec);
    const entry: ActiveVoice = { voice, note };
    this.active.add(entry);
    const ttlMs = (when - this.ctx.currentTime + durSec + 0.3) * 1000;
    setTimeout(() => this.active.delete(entry), Math.max(0, ttlMs));
  };

  private handleEnd = (): void => {
    this.store.set({ playing: false });
  };

  private releaseAll(): void {
    const now = this.ctx?.currentTime ?? 0;
    for (const a of this.active) a.voice.release(now);
    this.active.clear();
  }
}
