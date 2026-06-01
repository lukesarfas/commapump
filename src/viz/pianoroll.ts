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
  readonly howToRead =
    "Left: the notes as they play, time → and pitch ↑. Right: a tuner needle for each sounding note — how far it sits from a piano (equal temperament). In just intonation the needles spread out; in ET they all sit at zero.";
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  mount(host: HTMLElement): void {
    this.host = host;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    // Parity with the SVG vizzes (role="img" + aria-label) so the active tabpanel
    // never holds an unlabeled graphic (SPEC §4.3).
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute(
      "aria-label",
      "Piano-roll with a live cents meter: each sounding note plotted against time, its distance from equal temperament read out on the right.",
    );
    this.ctx = this.canvas.getContext("2d");
    // On a host without Canvas 2D (capabilities().canvas2d === false) getContext
    // returns null; show a short message rather than an empty canvas so the stage
    // never silently blanks — the other (SVG) tabs still work. SPEC §4.2.
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
    const halfW = (w - 28) / 2;
    const headerH = 40;

    // header: what the needle measures
    ctx.fillStyle = MUTED;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tuner — cents vs a piano", cx, y0 + 13);

    // scale ticks at ±10/20/30
    ctx.strokeStyle = "rgba(243,241,234,0.10)";
    ctx.fillStyle = MUTED;
    ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
    for (let c = -30; c <= 30; c += 10) {
      const tx = cx + (c / METER_RANGE) * halfW;
      ctx.globalAlpha = c === 0 ? 0.5 : 0.25;
      ctx.beginPath();
      ctx.moveTo(tx, y0 + headerH - 8);
      ctx.lineTo(tx, y0 + h - 6);
      ctx.strokeStyle = c === 0 ? ET : "rgba(243,241,234,0.12)";
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (c !== 0) ctx.fillText(`${c > 0 ? "+" : ""}${c}`, tx, y0 + headerH - 12);
    }
    ctx.fillStyle = ET;
    ctx.fillText("0", cx, y0 + headerH - 12);

    // a needle per sounding note
    const active = activeNotes(state.result, state.beat);
    const slotH = Math.min(34, (h - headerH - 8) / Math.max(1, active.length));
    const barH = Math.min(20, slotH - 12);
    ctx.textAlign = "left";
    active.forEach((n, i) => {
      const cents = noteCents(n, state.tuning);
      const by = y0 + headerH + i * slotH + 4;
      const len = (Math.max(-METER_RANGE, Math.min(METER_RANGE, cents)) / METER_RANGE) * halfW;
      const colour = cents < -0.5 ? "#e08a6a" : cents > 0.5 ? "#88c891" : ET;
      // bar from centre
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.85;
      const bx = len >= 0 ? cx : cx + len;
      roundRect(ctx, bx, by, Math.max(2, Math.abs(len)), barH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      // label: note name + signed cents
      ctx.fillStyle = FG;
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${pitchName(n.midiNominal)}`, x0 + 14, by + barH / 2 + 4);
      ctx.textAlign = "right";
      ctx.fillStyle = colour;
      ctx.fillText(`${cents >= 0 ? "+" : ""}${cents.toFixed(1)}¢`, x0 + w - 14, by + barH / 2 + 4);
      ctx.textAlign = "left";
    });
  }

  resize(): void {}
  destroy(): void {
    this.host = null;
    this.canvas = null;
    this.ctx = null;
  }
}

/**
 * A non-blank message for hosts where a 2D canvas context can't be obtained.
 * Styled inline (no class dependency) so it stays legible and centred on both
 * the full site and the applet without reaching into either surface's CSS.
 */
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
