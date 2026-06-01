/**
 * The circle of fifths that won't close. Notes are placed around the circle by
 * their position in the cycle of fifths; just-intonation tuning nudges each one
 * off its mark, and successive loops spiral outward — so after a full lap you
 * arrive a comma short of where you began, instead of meeting the start. Equal
 * temperament snaps every note onto its mark and the loop closes.
 */

import type { Viz, VizState } from "./types";
import { svg, chordRoots, noteCents, activeNotes } from "./util";

const W = 1000;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const R0 = 110;
const RING = 30;
const COF = ["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"];

function fifthsIndex(midiNominal: number): number {
  return ((((midiNominal - 60) * 7) % 12) + 12) % 12;
}

export class SpiralViz implements Viz {
  readonly id = "spiral";
  readonly label = "Circle of fifths";
  readonly howToRead =
    "Each note sits at its place in the cycle of fifths (C at twelve o’clock). Just tuning nudges it off the mark and each loop spirals out a ring — so the path arrives a comma short of home instead of closing.";
  private root: SVGElement | null = null;

  mount(host: HTMLElement): void {
    this.root = svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Circle of fifths spiral: each loop rings outward and the tonic rotates off twelve o'clock, so the loop never closes.",
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

    // clock marks + labels
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const lx = CX + Math.sin(a) * (outer + 24);
      const ly = CY - Math.cos(a) * (outer + 24);
      g.append(svg("text", { x: lx, y: ly, fill: i === 0 ? "var(--et)" : "var(--muted)", "font-size": 13, "text-anchor": "middle", "dominant-baseline": "middle", opacity: i === 0 ? 0.95 : 0.5 }, COF[i]));
      g.append(svg("line", { x1: CX + Math.sin(a) * (R0 - 14), y1: CY - Math.cos(a) * (R0 - 14), x2: CX + Math.sin(a) * outer, y2: CY - Math.cos(a) * outer, stroke: "var(--fg)", "stroke-width": 1, opacity: 0.05 }));
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

    // mark the start
    if (pos.length) {
      g.append(svg("text", { x: pos[0].x, y: pos[0].y - 14, fill: "var(--et)", "font-size": 12, "text-anchor": "middle" }, "start (C)"));
    }

    // the gap: distance between where we ended and where we began
    if (pos.length > 1) {
      const a = pos[0];
      const b = pos[pos.length - 1];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      const driftCents = noteCents(roots[roots.length - 1], state.tuning);
      if (gap > 6) {
        g.append(svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "var(--drift-down)", "stroke-width": 1.5, "stroke-dasharray": "3 4" }));
        g.append(svg("text", { x: CX, y: H - 24, fill: "var(--drift-down)", "font-size": 13, "text-anchor": "middle" }, `the loop misses home by ${Math.abs(driftCents).toFixed(1)}¢`));
      } else {
        g.append(svg("text", { x: CX, y: H - 24, fill: "var(--et)", "font-size": 13, "text-anchor": "middle" }, "the loop closes — equal temperament tempers the comma out"));
      }
    }

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}
