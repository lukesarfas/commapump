/**
 * The circle of fifths that won't close. Roots are placed by their position in
 * the circle of fifths; each cycle spirals outward a ring, and the just-tuning
 * deviation rotates the tonic off the 12-o'clock mark — so the loop never quite
 * meets itself. In equal temperament the deviation is zero and it closes.
 */

import type { Viz, VizState } from "./types";
import { svg, chordRoots, noteCents, activeNotes } from "./util";

const W = 1000;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const R0 = 120;
const RING = 26;
const COF = ["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"];

function fifthsIndex(midiNominal: number): number {
  return ((((midiNominal - 60) * 7) % 12) + 12) % 12;
}

export class SpiralViz implements Viz {
  readonly id = "spiral";
  readonly label = "Circle of fifths";
  private root: SVGElement | null = null;

  mount(host: HTMLElement): void {
    this.root = svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Circle of fifths spiral: each cycle rings outward and the tonic rotates off twelve o'clock, so the loop never closes.",
    });
    host.replaceChildren(this.root);
  }

  draw(state: VizState): void {
    if (!this.root) return;
    const roots = chordRoots(state.result);
    const maxCycle = Math.max(0, ...roots.map((n) => n.cycle));
    const outer = R0 + (maxCycle + 1) * RING;

    const g = svg("g");
    g.append(svg("title", {}, "Walking by fifths spirals outward; in just intonation it never closes the loop."));

    // faint fifth ticks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = CX + Math.sin(a) * (outer + 22);
      const y = CY - Math.cos(a) * (outer + 22);
      g.append(svg("text", { x, y, fill: "var(--muted)", "font-size": 12, "text-anchor": "middle", "dominant-baseline": "middle" }, COF[i]));
      g.append(svg("line", { x1: CX + Math.sin(a) * R0 * 0.7, y1: CY - Math.cos(a) * R0 * 0.7, x2: CX + Math.sin(a) * outer, y2: CY - Math.cos(a) * outer, stroke: "var(--fg)", "stroke-width": 1, opacity: 0.06 }));
    }

    const active = new Set(activeNotes(state.result, state.beat).map((n) => n.chordIndex));
    const pos = roots.map((n) => {
      const a = (fifthsIndex(n.midiNominal) / 12) * Math.PI * 2 + (noteCents(n, state.tuning) / 1200) * Math.PI * 2;
      const r = R0 + n.cycle * RING;
      return { x: CX + Math.sin(a) * r, y: CY - Math.cos(a) * r, n };
    });

    const d = pos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    g.append(svg("path", { d, fill: "none", stroke: "var(--signature)", "stroke-width": 2.5, "stroke-linejoin": "round", opacity: 0.85 }));

    pos.forEach((p, i) => {
      const isActive = active.has(p.n.chordIndex);
      g.append(svg("circle", { cx: p.x, cy: p.y, r: isActive ? 9 : 5.5, fill: i === 0 ? "var(--et)" : "var(--signature)", opacity: isActive ? 1 : 0.85 }));
    });

    // gap callout between first and last point
    if (pos.length > 1) {
      const a = pos[0];
      const b = pos[pos.length - 1];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      if (gap > 6) {
        g.append(svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "var(--drift-down)", "stroke-width": 1.5, "stroke-dasharray": "3 4" }));
        g.append(svg("text", { x: (a.x + b.x) / 2 + 10, y: (a.y + b.y) / 2, fill: "var(--drift-down)", "font-size": 12 }, "the comma gap"));
      }
    }

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}
