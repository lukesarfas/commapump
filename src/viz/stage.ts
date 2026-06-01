/**
 * Mounts the visualizations and runs the single animation-frame loop. Audio owns
 * time; this loop only reads the playhead (via getBeat) and paints — so dropped
 * frames never disturb the sound.
 *
 * Every mount/draw is isolated in try/catch: a single visualization throwing logs
 * once and is skipped, never blanking the page or flooding the console. The loop
 * also parks itself when the lab host scrolls offscreen, the tab is hidden, or
 * playback is paused — a static picture isn't repainted every frame. Discrete
 * changes (play/pause, tuning, tab, example) repaint once via the store
 * subscription and show()/setResult(), so a paused-but-visible lab idles at 0 CPU
 * (the steady state under prefers-reduced-motion) without ever going blank.
 */

import type { ScheduleResult } from "../core/index";
import type { TransportStore } from "../transport/store";
import { capabilities } from "../transport/capabilities";
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
  private reduced = matchReduced();
  private running = false;
  /** When the host is scrolled out of view we stop painting. */
  private onscreen = true;
  /** Vizzes that have thrown once; we stop calling them. */
  private broken = new Set<string>();
  private observer: IntersectionObserver | null = null;
  private onVisibility = (): void => this.sync();
  private unsubscribe: (() => void) | null = null;

  constructor(opts: StageOptions) {
    this.host = opts.host;
    this.store = opts.store;
    this.getBeat = opts.getBeat;
    this.result = opts.result;
    this.vizzes = opts.vizzes ?? allVizzes();
    this.current = this.vizzes[0];
    this.safeMount(this.current);
    this.watchVisibility();
    // Discrete store changes (play/pause, tuning, tempo, example) drive the loop:
    // starting playback runs the rAF loop, pausing parks it after one fresh frame
    // so the final static picture is correct without continued repainting.
    this.unsubscribe = this.store.subscribe((s) => this.onStoreChange(s.playing));
  }

  /** React to a discrete store change: sync the loop, and when paused repaint once. */
  private onStoreChange(playing: boolean): void {
    this.sync();
    // While paused, a discrete change (tuning toggle, tempo) won't be picked up by
    // the parked loop — paint a single frame so the static picture stays current.
    if (!playing) this.paint();
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
    this.safeMount(next);
    // mount() only installs an empty shell; paint one fresh frame now so a tab
    // switch renders immediately even while the rAF loop is parked (paused).
    this.paint();
  }

  setResult(result: ScheduleResult): void {
    this.result = result;
    // A new progression/example must render at once even while paused.
    this.paint();
  }

  start(): void {
    this.running = true;
    this.sync();
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Tear down observers/listeners so a re-init doesn't leak. */
  destroy(): void {
    this.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.observer?.disconnect();
    this.observer = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
    for (const v of this.vizzes) {
      try {
        v.destroy();
      } catch {
        /* ignore */
      }
    }
  }

  private safeMount(viz: Viz): void {
    try {
      viz.mount(this.host);
    } catch (err) {
      this.markBroken(viz, "mount", err);
    }
  }

  private markBroken(viz: Viz, phase: string, err: unknown): void {
    if (!this.broken.has(viz.id)) {
      this.broken.add(viz.id);
      console.warn(`CommaPump: visualization "${viz.id}" ${phase} failed; skipping it.`, err);
    }
  }

  private schedule(): void {
    if (this.raf) return;
    const frame = (): void => {
      this.raf = 0;
      this.paint();
      if (this.shouldRun()) this.schedule();
    };
    this.raf = requestAnimationFrame(frame);
  }

  private paint(): void {
    const s = this.store.get();
    const beat = s.playing ? this.getBeat() : s.beat;
    if (s.playing) this.store.setBeat(beat);
    const viz = this.current;
    if (this.broken.has(viz.id)) return;
    const state: VizState = { result: this.result, beat, tuning: s.tuning, reducedMotion: this.reduced };
    try {
      viz.draw(state);
    } catch (err) {
      this.markBroken(viz, "draw", err);
    }
  }

  /** The loop runs only while started, playing, onscreen, and the tab is visible. */
  private shouldRun(): boolean {
    const hidden = typeof document !== "undefined" && document.hidden;
    return this.running && this.store.get().playing && this.onscreen && !hidden;
  }

  /** Re-evaluate run conditions and start or park the loop accordingly. */
  private sync(): void {
    if (this.shouldRun()) this.schedule();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private watchVisibility(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    // Pause when the lab scrolls offscreen. Without IntersectionObserver we
    // stay "onscreen" and rely solely on the visibility (tab-hidden) signal.
    if (capabilities().intersectionObserver) {
      try {
        this.observer = new IntersectionObserver(
          (entries) => {
            const e = entries[entries.length - 1];
            if (e) {
              this.onscreen = e.isIntersecting;
              this.sync();
            }
          },
          { threshold: 0 },
        );
        this.observer.observe(this.host);
      } catch {
        this.observer = null;
        this.onscreen = true;
      }
    }
  }
}

function matchReduced(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
