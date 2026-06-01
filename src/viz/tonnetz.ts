/**
 * Tonnetz lattice walk. Move right = up a pure fifth; move up = up a pure major
 * third. Each triad is a little triangle of three neighbouring notes, so the
 * progression is a chain of triangles tumbling across the grid. In just
 * intonation the chain ends on a *different* "C" node than it started — that
 * offset is the comma, made spatial. Equal temperament folds the grid so it
 * lands home.
 */

import type { Viz, VizState } from "./types";
import type { ScheduledNote } from "../core/index";
import { svg, chords, latticeET, activeNotes, type Chord } from "./util";

const W = 1000;
const H = 560;
const PAD = 70;
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

function nodeName(x: number, y: number): string {
  return NAMES[(((7 * x + 4 * y) % 12) + 12) % 12]; // fifth = 7 semitones, third = 4
}

export class TonnetzViz implements Viz {
  readonly id = "tonnetz";
  readonly label = "Lattice walk";
  readonly howToRead =
    "Right is a pure fifth, up is a pure major third. Each chord is a triangle; the progression tumbles across the grid. Watch where the final “C” lands — in just intonation it’s one node short of home.";
  private root: SVGElement | null = null;

  mount(host: HTMLElement): void {
    this.root = svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Tonnetz lattice walk: each chord is a triangle of pure fifths and thirds; the progression's path does not return to the node it started on.",
    });
    host.replaceChildren(this.root);
  }

  draw(state: VizState): void {
    if (!this.root) return;
    const cs = chords(state.result);
    const coordOf = (n: ScheduledNote) =>
      state.tuning === "JI" ? { x: n.lattice.x, y: n.lattice.y } : latticeET(n.lattice.x, n.lattice.y);

    const all = cs.flatMap((c) => c.notes.map(coordOf));
    const minX = Math.min(...all.map((p) => p.x)) - 1;
    const maxX = Math.max(...all.map((p) => p.x)) + 1;
    const minY = Math.min(...all.map((p) => p.y)) - 1;
    const maxY = Math.max(...all.map((p) => p.y)) + 1;
    const cellW = (W - PAD * 2) / Math.max(1, maxX - minX);
    const cellH = (H - PAD * 2 - 14) / Math.max(1, maxY - minY);
    const sx = (x: number) => PAD + (x - minX) * cellW;
    const sy = (y: number) => H - PAD - (y - minY) * cellH;

    const activeChord = activeNotes(state.result, state.beat)[0]?.chordIndex ?? -1;
    const g = svg("g");
    g.append(svg("title", {}, "The walk through the just-intonation lattice — it doesn't return to the node it left."));

    // background grid: nodes + note names
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        g.append(svg("circle", { cx: sx(x), cy: sy(y), r: 2.5, fill: "var(--fg)", opacity: 0.12 }));
        g.append(svg("text", { x: sx(x), y: sy(y) - 7, fill: "var(--muted)", "font-size": 10, "text-anchor": "middle", opacity: 0.45 }, nodeName(x, y)));
      }
    }

    // axis hints
    g.append(svg("text", { x: W - PAD + 4, y: H - PAD + 4, fill: "var(--muted)", "font-size": 12 }, "fifths →"));
    g.append(svg("text", { x: PAD - 50, y: PAD - 4, fill: "var(--muted)", "font-size": 12 }, "thirds ↑"));

    // triad triangles (root–third–fifth), faint, the active one lit
    for (const c of cs) {
      const tri = c.notes.slice(0, 3).map(coordOf);
      if (tri.length < 3) continue;
      const isActive = c.chordIndex === activeChord;
      const pts = tri.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
      g.append(svg("polygon", {
        points: pts,
        fill: "var(--signature)",
        "fill-opacity": isActive ? 0.28 : 0.07,
        stroke: isActive ? "var(--signature)" : "none",
        "stroke-width": isActive ? 2 : 0,
        "stroke-linejoin": "round",
      }));
    }

    // path through the chord roots, in order
    const rootPts = cs.map((c) => coordOf(c.notes[0]));
    const d = rootPts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
    g.append(svg("path", { d, fill: "none", stroke: "var(--signature)", "stroke-width": 2, "stroke-linejoin": "round", opacity: 0.7, "stroke-dasharray": "1 6", "stroke-linecap": "round" }));

    // root markers + the active chord's labels
    rootPts.forEach((p, i) => {
      const c = cs[i];
      const isActive = c.chordIndex === activeChord;
      const isStart = i === 0;
      const fill = isStart ? "var(--et)" : "var(--signature)";
      g.append(svg("circle", { cx: sx(p.x), cy: sy(p.y), r: isActive ? 9 : 6, fill, opacity: isActive ? 1 : 0.85 }));
      if (isActive) labelChord(g, c, coordOf, sx, sy);
    });

    // start vs end: in JI they differ by a comma — call it out
    drawDriftCallout(g, cs, coordOf, sx, sy, state.tuning);

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}

function labelChord(g: SVGElement, c: Chord, coordOf: (n: ScheduledNote) => { x: number; y: number }, sx: (x: number) => number, sy: (y: number) => number): void {
  const r = coordOf(c.notes[0]);
  g.append(svg("text", { x: sx(r.x), y: sy(r.y) + 24, fill: "var(--fg)", "font-size": 14, "text-anchor": "middle", "font-weight": 600 }, c.degree));
}

function drawDriftCallout(
  g: SVGElement,
  cs: Chord[],
  coordOf: (n: ScheduledNote) => { x: number; y: number },
  sx: (x: number) => number,
  sy: (y: number) => number,
  tuning: string,
): void {
  if (cs.length < 2) return;
  const a = coordOf(cs[0].notes[0]);
  const b = coordOf(cs[cs.length - 1].notes[0]);
  if (a.x === b.x && a.y === b.y) {
    g.append(svg("text", { x: sx(a.x), y: sy(a.y) - 20, fill: "var(--et)", "font-size": 12, "text-anchor": "middle" }, "back home ✓"));
    return;
  }
  g.append(svg("line", { x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y), stroke: "var(--drift-down)", "stroke-width": 1.5, "stroke-dasharray": "3 4" }));
  const mx = (sx(a.x) + sx(b.x)) / 2;
  const my = (sy(a.y) + sy(b.y)) / 2 - 8;
  g.append(svg("text", { x: mx, y: my, fill: "var(--drift-down)", "font-size": 12, "text-anchor": "middle" }, tuning === "JI" ? "same “C” — a comma away" : "off by a comma"));
}
