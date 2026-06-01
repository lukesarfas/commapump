/**
 * Drift ribbon — a vertical pitch axis measured in cents from the start. Every
 * time the loop returns "home", the tonic sits one syntonic comma lower, so the
 * line walks downstairs. A faint "one piano key" marker shows how the small
 * commas add up toward a whole semitone.
 */

import type { Viz, VizState } from "./types";
import { svg, homes, noteCents } from "./util";

const W = 1000;
const H = 560;
const PAD_X = 110;
const PAD_TOP = 52;
const PAD_BOTTOM = 60;
const COMMA = 21.506;

export class RibbonViz implements Viz {
  readonly id = "ribbon";
  readonly label = "Drift ribbon";
  readonly howToRead =
    "Height is pitch, in cents from where you started. Each step down is one return home — and each is one syntonic comma (about a fifth of a piano key) lower than the last.";
  private root: SVGElement | null = null;

  mount(host: HTMLElement): void {
    this.root = svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Drift ribbon: a vertical cents axis where each home arrival sits one syntonic comma lower than the last.",
    });
    host.replaceChildren(this.root);
  }

  draw(state: VizState): void {
    if (!this.root) return;
    const pts = homes(state.result).map((n, i) => ({
      cents: noteCents(n, state.tuning),
      reached: state.beat >= n.startBeat - 1e-6,
      i,
    }));

    const lo = Math.min(0, ...pts.map((p) => p.cents)) - 12;
    const hi = 12;
    const y = (c: number) => PAD_TOP + ((hi - c) / (hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);
    const stepW = (W - PAD_X * 2) / Math.max(1, pts.length - 1);
    const x = (i: number) => PAD_X + i * stepW;

    const g = svg("g");
    g.append(svg("title", {}, "Each loop sinks the tonic by one syntonic comma."));

    // axis label
    g.append(svg("text", { x: 22, y: PAD_TOP - 22, fill: "var(--muted)", "font-size": 12 }, "pitch (cents below start)"));

    // comma gridlines + a "one piano key" marker
    for (let k = 0; k * COMMA < hi - lo; k++) {
      const c = -k * COMMA;
      if (c < lo) break;
      g.append(svg("line", { x1: PAD_X - 10, x2: W - PAD_X, y1: y(c), y2: y(c), stroke: "var(--fg)", "stroke-width": 1, opacity: k === 0 ? 0 : 0.06 }));
      if (k > 0) g.append(svg("text", { x: PAD_X - 16, y: y(c) + 4, fill: "var(--muted)", "font-size": 10, "text-anchor": "end", opacity: 0.6 }, `${c.toFixed(0)}`));
    }
    if (lo <= -100) {
      g.append(svg("line", { x1: PAD_X - 10, x2: W - PAD_X, y1: y(-100), y2: y(-100), stroke: "var(--drift-down)", "stroke-width": 1, "stroke-dasharray": "5 5", opacity: 0.7 }));
      g.append(svg("text", { x: W - PAD_X, y: y(-100) - 6, fill: "var(--drift-down)", "font-size": 11, "text-anchor": "end" }, "one piano key (−100¢)"));
    }

    // zero (in-tune) reference
    g.append(svg("line", { x1: PAD_X - 10, x2: W - PAD_X, y1: y(0), y2: y(0), stroke: "var(--et)", "stroke-width": 1.5, "stroke-dasharray": "4 5", opacity: 0.7 }));
    g.append(svg("text", { x: W - PAD_X, y: y(0) - 6, fill: "var(--et)", "font-size": 12, "text-anchor": "end" }, "in tune · 0¢"));

    // staircase
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.cents).toFixed(1)}`).join(" ");
    g.append(svg("path", { d, fill: "none", stroke: "var(--signature)", "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.6 }));

    for (const p of pts) {
      const fill = p.reached ? "var(--signature)" : "color-mix(in oklab, var(--signature) 30%, transparent)";
      g.append(svg("circle", { cx: x(p.i), cy: y(p.cents), r: p.reached ? 7 : 5, fill }));
      g.append(svg("text", { x: x(p.i), y: y(p.cents) + 24, fill: "var(--fg)", "font-size": 12, "text-anchor": "middle", "font-variant-numeric": "tabular-nums" }, `${p.cents.toFixed(1)}¢`));
      g.append(svg("text", { x: x(p.i), y: y(p.cents) - 13, fill: "var(--muted)", "font-size": 11, "text-anchor": "middle" }, p.i === 0 ? "start" : `loop ${p.i}`));
    }

    // live readout: where the key sits right now
    const reached = pts.filter((p) => p.reached);
    const current = reached.length ? reached[reached.length - 1] : pts[0];
    if (current) {
      g.append(svg("circle", { cx: x(current.i), cy: y(current.cents), r: 10, fill: "none", stroke: "var(--fg)", "stroke-width": 2, opacity: 0.85 }));
      const flat = current.cents < -0.5;
      g.append(svg("text", { x: W - 24, y: PAD_TOP - 22, fill: flat ? "var(--drift-down)" : "var(--et)", "font-size": 15, "text-anchor": "end", "font-weight": 600 }, flat ? `the key is ${Math.abs(current.cents).toFixed(1)}¢ flat` : "in tune"));
    }

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}
