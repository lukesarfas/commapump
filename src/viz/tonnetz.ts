/**
 * Tonnetz lattice walk — fifths along x, pure major thirds along y. In just
 * intonation the progression's path does not return to the node it started on;
 * tempering the comma out (ET) collapses it back home. That gap is the drift,
 * made spatial.
 */

import type { Viz, VizState } from "./types";
import type { ScheduledNote } from "../core/index";
import { svg, chordRoots, latticeET, activeNotes } from "./util";

const W = 1000;
const H = 560;
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

function nodeName(x: number, y: number): string {
  // a fifth is 7 semitones, a major third is 4
  return NAMES[(((7 * x + 4 * y) % 12) + 12) % 12];
}

export class TonnetzViz implements Viz {
  readonly id = "tonnetz";
  readonly label = "Lattice walk";
  private root: SVGElement | null = null;

  mount(host: HTMLElement): void {
    this.root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    host.replaceChildren(this.root);
  }

  draw(state: VizState): void {
    if (!this.root) return;
    const roots = chordRoots(state.result);
    const coordOf = (n: ScheduledNote) =>
      state.tuning === "JI" ? { x: n.lattice.x, y: n.lattice.y } : latticeET(n.lattice.x, n.lattice.y);

    const pts = roots.map(coordOf);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 1;
    const maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1;
    const maxY = Math.max(...ys) + 1;

    const cols = maxX - minX;
    const rows = maxY - minY;
    const cellW = (W - 120) / Math.max(1, cols);
    const cellH = (H - 110) / Math.max(1, rows);
    const sx = (x: number) => 60 + (x - minX) * cellW;
    const sy = (y: number) => H - 60 - (y - minY) * cellH;

    const active = new Set(activeNotes(state.result, state.beat).map((n) => n.chordIndex));
    const g = svg("g");
    g.append(svg("title", {}, "The walk through the just-intonation lattice — it doesn't return to the node it left."));

    // lattice grid
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        g.append(svg("circle", { cx: sx(x), cy: sy(y), r: 3, fill: "var(--fg)", opacity: 0.14 }));
        g.append(svg("text", { x: sx(x), y: sy(y) - 8, fill: "var(--muted)", "font-size": 11, "text-anchor": "middle", opacity: 0.5 }, nodeName(x, y)));
      }
    }

    // path through the roots
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
    g.append(svg("path", { d, fill: "none", stroke: "var(--signature)", "stroke-width": 2.5, "stroke-linejoin": "round", opacity: 0.85 }));

    pts.forEach((p, i) => {
      const isActive = active.has(roots[i].chordIndex);
      const r = isActive ? 11 : 7;
      const fill = i === 0 ? "var(--et)" : "var(--signature)";
      g.append(svg("circle", { cx: sx(p.x), cy: sy(p.y), r, fill, opacity: isActive ? 1 : 0.85 }));
      g.append(svg("text", { x: sx(p.x), y: sy(p.y) + 22, fill: "var(--fg)", "font-size": 12, "text-anchor": "middle" }, roots[i].degree));
    });

    // start vs end marker when they differ (the visible drift)
    if (pts.length > 1) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (a.x !== b.x || a.y !== b.y) {
        g.append(svg("text", { x: sx(b.x), y: sy(b.y) - 18, fill: "var(--drift-down)", "font-size": 12, "text-anchor": "middle" }, "↯ a comma away"));
      }
    }

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}
