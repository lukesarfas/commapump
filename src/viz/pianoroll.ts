/**
 * Piano-roll + live cents meter (Canvas). The notes scroll under a playhead; the
 * meter on the right shows, in real time, how far each sounding note sits from
 * equal temperament — flat-lining at zero in ET, spread out in just intonation.
 */

import type { Viz, VizState } from "./types";
import { activeNotes, noteCents, pitchName } from "./util";

const PALETTE = ["#f0b54a", "#e0875a", "#6fc3d6", "#c9a25e", "#d98f6a"];
const FG = "#f3f1ea";
const MUTED = "#9b958a";
const ET = "#6fc3d6";
const METER_RANGE = 30; // cents shown each side of centre

export class PianoRollViz implements Viz {
  readonly id = "pianoroll";
  readonly label = "Piano-roll + meter";
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  mount(host: HTMLElement): void {
    this.host = host;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.ctx = this.canvas.getContext("2d");
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

    const meterW = Math.max(150, w * 0.26);
    const rollW = w - meterW;
    const padL = 44;
    const padTop = 16;
    const padBottom = 24;
    const plotW = rollW - padL - 12;
    const plotH = h - padTop - padBottom;

    const notes = state.result.notes;
    const total = state.result.totalBeats || 1;
    const midis = notes.map((n) => n.midiNominal);
    const minM = Math.min(...midis) - 1;
    const maxM = Math.max(...midis) + 1;
    const rows = Math.max(1, maxM - minM);
    const x = (beat: number) => padL + (beat / total) * plotW;
    const y = (m: number) => padTop + ((maxM - m) / rows) * plotH;
    const rowH = plotH / rows;

    // row guides + names
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let m = Math.ceil(minM); m <= Math.floor(maxM); m++) {
      const yy = y(m);
      ctx.strokeStyle = "rgba(243,241,234,0.05)";
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      if (m % 12 === 0 || [0, 2, 4, 5, 7, 9, 11].includes(((m % 12) + 12) % 12)) {
        ctx.fillStyle = MUTED;
        ctx.fillText(pitchName(m), 8, yy);
      }
    }

    // notes
    const active = new Set(activeNotes(state.result, state.beat).map((n) => `${n.chordIndex}:${n.voiceId}`));
    for (const n of notes) {
      const nx = x(n.startBeat);
      const nw = Math.max(3, (n.durBeats / total) * plotW - 2);
      const ny = y(n.midiNominal) - rowH * 0.36;
      const nh = rowH * 0.72;
      const on = active.has(`${n.chordIndex}:${n.voiceId}`);
      ctx.fillStyle = PALETTE[n.voiceId % PALETTE.length];
      ctx.globalAlpha = on ? 1 : 0.4;
      roundRect(ctx, nx, ny, nw, nh, 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // playhead
    const px = x(state.beat);
    ctx.strokeStyle = FG;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(px, padTop - 6);
    ctx.lineTo(px, padTop + plotH + 6);
    ctx.stroke();
    ctx.globalAlpha = 1;

    this.drawMeter(ctx, rollW, padTop, meterW, h - padTop - padBottom, state);
  }

  private drawMeter(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, state: VizState): void {
    const cx = x0 + w / 2;
    ctx.strokeStyle = "rgba(243,241,234,0.12)";
    ctx.strokeRect(x0 + 8, y0, w - 16, h);

    // centre (in-tune) line
    ctx.strokeStyle = ET;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, y0 + 6);
    ctx.lineTo(cx, y0 + h - 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = MUTED;
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ET", cx, y0 + h - 4);

    const active = activeNotes(state.result, state.beat);
    const halfW = (w - 28) / 2;
    const barH = Math.min(22, (h - 30) / Math.max(1, active.length) - 6);
    ctx.textAlign = "left";
    active.forEach((n, i) => {
      const cents = noteCents(n, state.tuning);
      const by = y0 + 14 + i * (barH + 8);
      const len = (Math.max(-METER_RANGE, Math.min(METER_RANGE, cents)) / METER_RANGE) * halfW;
      ctx.fillStyle = cents < -0.5 ? "#e08a6a" : cents > 0.5 ? "#88c891" : ET;
      const bx = len >= 0 ? cx : cx + len;
      roundRect(ctx, bx, by, Math.max(2, Math.abs(len)), barH, 3);
      ctx.fill();
      ctx.fillStyle = FG;
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${pitchName(n.midiNominal)} ${cents >= 0 ? "+" : ""}${cents.toFixed(1)}¢`, x0 + 14, by + barH / 2 + 4);
    });
    ctx.textAlign = "left";
  }

  resize(): void {}
  destroy(): void {
    this.host = null;
    this.canvas = null;
    this.ctx = null;
  }
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
