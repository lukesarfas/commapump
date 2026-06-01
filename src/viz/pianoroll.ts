/**
 * Continuous-pitch roll (Canvas). Unlike a normal MIDI piano-roll, notes are NOT
 * snapped to semitone rows — the vertical axis is pitch in cents, so each note
 * sits at its true height. The faint horizontal lines are a piano's keys (equal
 * temperament); in just intonation the notes sit visibly *off* them (a pure
 * third ~14¢ low), and the tonic sinks further below its line every loop. Toggle
 * to equal temperament and every note glides onto the grid — the comma, tempered
 * away before your eyes.
 */

import type { Viz, VizState } from "./types";
import type { Monzo } from "../core/index";
import { subMonzo, octaveReduce, monzoToRational, ratioString } from "../core/index";
import { activeNotes, homes, pitchName } from "./util";

/** Exact ratio of a note relative to its chord root (the local anchor): "5/4", "3/2"… */
function ratioToRoot(noteMonzo: Monzo, rootMonzo: Monzo): string {
  return ratioString(monzoToRational(octaveReduce(subMonzo(noteMonzo, rootMonzo))));
}

const PALETTE = ["#f0b54a", "#e0875a", "#6fc3d6", "#c9a25e", "#d98f6a"];
const FG = "#f3f1ea";
const MUTED = "#9b958a";
const ET = "#6fc3d6";
const FLAT = "#e08a6a";
const PAD_L = 56;
const PAD_R = 18;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;
const NOTE_H = 9;

export class PianoRollViz implements Viz {
  readonly id = "pianoroll";
  readonly label = "Pitch roll";
  readonly howToRead =
    "Vertical axis is real pitch, not piano keys. Each note flashes its exact ratio from the anchor (the chord’s root: 1/1, 5/4, 3/2…) and how far it lands from a piano. The dashed line is the reference — the source of truth — and “home” drifts a comma below it every loop. Switch to ET and the notes glide onto the grid.";
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  /** eased 0 (just intonation) → 1 (equal temperament) for the glide animation */
  private tuneMix = 0;

  mount(host: HTMLElement): void {
    this.host = host;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute(
      "aria-label",
      "Continuous-pitch roll: notes plotted at their true pitch in cents against a faint equal-tempered grid; in just intonation they sit off the grid and the tonic drifts downward.",
    );
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      host.replaceChildren(fallback());
      return;
    }
    host.replaceChildren(this.canvas);
  }

  private fit(): { w: number; h: number } {
    const c = this.canvas!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || 800;
    const h = c.clientHeight || 448;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    this.ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  draw(state: VizState): void {
    if (!this.ctx) return;
    const { w, h } = this.fit();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // ease the JI↔ET glide (snap when reduced motion is requested)
    const target = state.tuning === "ET" ? 1 : 0;
    this.tuneMix = state.reducedMotion ? target : this.tuneMix + (target - this.tuneMix) * 0.16;
    if (Math.abs(this.tuneMix - target) < 0.002) this.tuneMix = target;
    const mix = this.tuneMix;

    const notes = state.result.notes;
    const total = state.result.totalBeats || 1;
    const plotW = w - PAD_L - PAD_R;
    const plotH = h - PAD_TOP - PAD_BOTTOM;

    // pitch range from the just-intonation positions (the widest extent), so the
    // view doesn't jump when tuning toggles.
    const absJI = notes.map((n) => n.midiNominal * 100 + n.centsVsET);
    const minC = Math.min(...absJI) - 70;
    const maxC = Math.max(...absJI) + 70;
    const yOf = (cents: number) => PAD_TOP + ((maxC - cents) / (maxC - minC)) * plotH;
    const xOf = (beat: number) => PAD_L + (beat / total) * plotW;
    const noteCents = (n: (typeof notes)[number]) => n.midiNominal * 100 + n.centsVsET * (1 - mix);

    // equal-tempered grid: a faint line + name at every semitone
    ctx.textBaseline = "middle";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    for (let s = Math.ceil(minC / 100); s <= Math.floor(maxC / 100); s++) {
      const yy = yOf(s * 100);
      const isC = ((s % 12) + 12) % 12 === 0;
      ctx.strokeStyle = isC ? "rgba(111,195,214,0.18)" : "rgba(243,241,234,0.07)";
      ctx.beginPath();
      ctx.moveTo(PAD_L, yy);
      ctx.lineTo(PAD_L + plotW, yy);
      ctx.stroke();
      ctx.fillStyle = isC ? ET : MUTED;
      ctx.fillText(pitchName(s), 10, yy);
    }

    // the tonic trail: connect every "home" arrival so the drift staircase is
    // visible across the whole timeline, even when paused.
    drawTonicTrail(ctx, state, mix, yOf, xOf, PAD_L, plotW);

    // notes at their true pitch — a bright flash on the beat each one is struck
    const FLASH = 1.1; // beats the onset flash lasts
    const flashOf = (n: (typeof notes)[number]): number => {
      const age = state.beat - n.startBeat;
      return state.playing && age >= -1e-6 && age < FLASH && age <= n.durBeats ? 1 - age / FLASH : 0;
    };
    const active = new Set(activeNotes(state.result, state.beat).map((n) => `${n.chordIndex}:${n.voiceId}`));
    for (const n of notes) {
      const nx = xOf(n.startBeat);
      const nw = Math.max(3, (n.durBeats / total) * plotW - 2);
      const ny = yOf(noteCents(n)) - NOTE_H / 2;
      const on = active.has(`${n.chordIndex}:${n.voiceId}`);
      ctx.fillStyle = PALETTE[n.voiceId % PALETTE.length];
      ctx.globalAlpha = on ? 1 : 0.4;
      roundRect(ctx, nx, ny, nw, NOTE_H, 3);
      ctx.fill();
      const fl = flashOf(n);
      if (fl > 0) {
        ctx.globalAlpha = fl * 0.6;
        ctx.fillStyle = "#fff";
        roundRect(ctx, nx, ny, nw, NOTE_H, 3);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // playhead
    const px = xOf(state.beat);
    ctx.strokeStyle = FG;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(px, PAD_TOP - 6);
    ctx.lineTo(px, PAD_TOP + plotH + 6);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Source of truth: every pitch is an exact ratio from an anchor. For chords
    // that anchor is the root (so the labels read 1/1, 5/4, 3/2…); for a melodic
    // line it's the opening reference note. The labels flash on each note as it's
    // struck (and stay up for the sounding chord while paused), so you can read
    // both the ratio that *defines* the note and where it lands versus a piano.
    const ref = notes.find((n) => n.chordIndex === 0 && n.voiceId === 0)?.monzo;
    const rootOf = new Map<number, Monzo>();
    const voiceCount = new Map<number, number>();
    for (const n of notes) {
      if (n.voiceId === 0) rootOf.set(n.chordIndex, n.monzo);
      voiceCount.set(n.chordIndex, (voiceCount.get(n.chordIndex) ?? 0) + 1);
    }
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const n of notes) {
      const fade = state.playing ? flashOf(n) : active.has(`${n.chordIndex}:${n.voiceId}`) ? 1 : 0;
      if (fade <= 0) continue;
      const dev = n.centsVsET * (1 - mix);
      const anchor = (voiceCount.get(n.chordIndex) ?? 1) <= 1 ? ref : rootOf.get(n.chordIndex);
      const ratio = anchor ? ratioToRoot(n.monzo, anchor) : "";
      const nx = xOf(n.startBeat);
      const nw = Math.max(3, (n.durBeats / total) * plotW - 2);
      const cx = Math.min(Math.max(nx + nw / 2, PAD_L + 34), w - 34);
      const y = yOf(noteCents(n)) - NOTE_H / 2 - 7 - (1 - fade) * 5;
      ctx.globalAlpha = Math.min(1, fade + 0.15);
      ctx.fillStyle = dev < -0.5 ? FLAT : dev > 0.5 ? "#88c891" : ET;
      ctx.fillText(`${ratio} · ${dev >= 0 ? "+" : ""}${dev.toFixed(1)}¢`, cx, y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  resize(): void {}
  destroy(): void {
    this.host = null;
    this.canvas = null;
    this.ctx = null;
  }
}

function drawTonicTrail(
  ctx: CanvasRenderingContext2D,
  state: VizState,
  mix: number,
  yOf: (c: number) => number,
  xOf: (b: number) => number,
  x0: number,
  plotW: number,
): void {
  const hs = homes(state.result);
  if (!hs.length) return;
  const pt = (n: (typeof hs)[number]) => ({
    x: xOf(n.startBeat),
    y: yOf(n.midiNominal * 100 + n.centsVsET * (1 - mix)),
    dev: n.centsVsET * (1 - mix),
    reached: state.beat >= n.startBeat - 1e-6,
  });
  const pts = hs.map(pt);

  // the reference line: the source of truth (1/1) — where an un-drifting tonic
  // would stay. Everything else is tuned in ratios; "home" is meant to land here.
  const cY = yOf(hs[0].midiNominal * 100);
  ctx.strokeStyle = "rgba(111,195,214,0.45)";
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(x0, cY);
  ctx.lineTo(x0 + plotW, cY);
  ctx.stroke();
  ctx.setLineDash([]);
  // Short tag at the RIGHT end so it never collides with the notes / flash labels
  // that cluster at the start of the line; the caption explains "source of truth".
  ctx.fillStyle = "#6fc3d6";
  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("1/1 · reference", x0 + plotW, cY - 8);
  ctx.textAlign = "left";

  // staircase through the tonic arrivals
  ctx.strokeStyle = "rgba(224,138,106,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const p of pts) {
    ctx.fillStyle = p.reached ? FLAT : "rgba(224,138,106,0.4)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.reached ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // label the cumulative drift at the last tonic — only when it actually drifts,
  // so a melodic line that returns home (or ET, which tempers the drift out)
  // doesn't add a colliding label on the reference line.
  const last = pts[pts.length - 1];
  const lastDev = last.dev;
  if (Math.abs(lastDev) > 0.5) {
    ctx.fillStyle = FLAT;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`home drifts ${Math.abs(lastDev).toFixed(1)}¢ ${lastDev < 0 ? "flat" : "sharp"} →`, Math.min(last.x - 8, x0 + plotW), last.y - 10);
  }
  ctx.textAlign = "left";
}

function fallback(): HTMLElement {
  const p = document.createElement("p");
  p.setAttribute("role", "note");
  p.style.cssText =
    "display:flex;width:100%;height:100%;margin:0;box-sizing:border-box;" +
    "align-items:center;justify-content:center;text-align:center;" +
    "padding:1.5rem;color:var(--muted,#9b958a);font:0.9rem/1.5 ui-sans-serif,system-ui,sans-serif;";
  p.textContent = "This visualization needs Canvas 2D, which isn't available here — try another tab.";
  return p;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
