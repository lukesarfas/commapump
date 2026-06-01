/**
 * Mounts the visualizations and runs the single animation-frame loop. Audio owns
 * time; this loop only reads the playhead (via getBeat) and paints — so dropped
 * frames never disturb the sound.
 */

import type { ScheduleResult } from "../core/index";
import type { TransportStore } from "../transport/store";
import type { Viz, VizState } from "./types";
import { RibbonViz } from "./ribbon";
import { TonnetzViz } from "./tonnetz";
import { SpiralViz } from "./spiral";
import { PianoRollViz } from "./pianoroll";

export function allVizzes(): Viz[] {
  return [new TonnetzViz(), new RibbonViz(), new SpiralViz(), new PianoRollViz()];
}

export interface StageOptions {
  host: HTMLElement;
  store: TransportStore;
  getBeat: () => number;
  result: ScheduleResult;
  vizzes?: Viz[];
}

export class Stage {
  private host: HTMLElement;
  private store: TransportStore;
  private getBeat: () => number;
  private result: ScheduleResult;
  private vizzes: Viz[];
  private current: Viz;
  private raf = 0;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(opts: StageOptions) {
    this.host = opts.host;
    this.store = opts.store;
    this.getBeat = opts.getBeat;
    this.result = opts.result;
    this.vizzes = opts.vizzes ?? allVizzes();
    this.current = this.vizzes[0];
    this.current.mount(this.host);
  }

  list(): Viz[] {
    return this.vizzes;
  }

  currentId(): string {
    return this.current.id;
  }

  show(id: string): void {
    const next = this.vizzes.find((v) => v.id === id);
    if (!next || next === this.current) return;
    this.current = next;
    this.current.mount(this.host);
  }

  setResult(result: ScheduleResult): void {
    this.result = result;
  }

  start(): void {
    if (this.raf) return;
    const frame = (): void => {
      const s = this.store.get();
      const beat = s.playing ? this.getBeat() : s.beat;
      if (s.playing) this.store.setBeat(beat);
      const state: VizState = { result: this.result, beat, tuning: s.tuning, reducedMotion: this.reduced };
      this.current.draw(state);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
