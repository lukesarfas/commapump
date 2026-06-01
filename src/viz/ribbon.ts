/** Drift ribbon — a vertical cents axis; each "home" arrival sits one comma lower. */

import type { Viz, VizState } from "./types";
import { svg, homes, noteCents } from "./util";

const W = 1000;
const H = 560;
const PAD_X = 96;
const PAD_TOP = 48;
const PAD_BOTTOM = 56;

export class RibbonViz implements Viz {
  readonly id = "ribbon";
  readonly label = "Drift ribbon";
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

    const lo = Math.min(0, ...pts.map((p) => p.cents)) - 8;
    const hi = 8;
    const y = (c: number) => PAD_TOP + ((hi - c) / (hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);
    const stepW = (W - PAD_X * 2) / Math.max(1, pts.length - 1);
    const x = (i: number) => PAD_X + i * stepW;

    const g = svg("g");
    g.append(svg("title", {}, "Each loop sinks the tonic by one syntonic comma."));

    // zero (in-tune) reference
    g.append(svg("line", { x1: PAD_X, x2: W - PAD_X, y1: y(0), y2: y(0), stroke: "var(--et)", "stroke-width": 1, "stroke-dasharray": "4 5", opacity: 0.6 }));
    g.append(svg("text", { x: PAD_X, y: y(0) - 10, fill: "var(--et)", "font-size": 13, opacity: 0.85 }, "in tune · 0¢"));

    // staircase
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.cents).toFixed(1)}`).join(" ");
    g.append(svg("path", { d, fill: "none", stroke: "var(--signature)", "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.55 }));

    for (const p of pts) {
      const fill = p.reached ? "var(--signature)" : "color-mix(in oklab, var(--signature) 35%, transparent)";
      g.append(svg("circle", { cx: x(p.i), cy: y(p.cents), r: p.reached ? 7 : 5, fill }));
      g.append(svg("text", { x: x(p.i), y: y(p.cents) + 26, fill: "var(--fg)", "font-size": 13, "text-anchor": "middle", "font-variant-numeric": "tabular-nums" }, `${p.cents.toFixed(1)}¢`));
      g.append(svg("text", { x: x(p.i), y: y(p.cents) - 14, fill: "var(--muted)", "font-size": 12, "text-anchor": "middle" }, p.i === 0 ? "start" : `loop ${p.i}`));
    }

    this.root.replaceChildren(g);
  }

  resize(): void {}
  destroy(): void {
    this.root = null;
  }
}
