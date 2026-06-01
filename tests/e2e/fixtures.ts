/**
 * Shared E2E fixtures. The `page` is wrapped so every test collects console
 * errors and uncaught page errors; an `afterEach`-style assertion (called via
 * `expectNoPageErrors`) fails any test whose log is non-empty. This is the
 * "launch reliability" guard from SPEC §4.1 / §7 — the page must never throw or
 * log on load or interaction.
 */
import { test as base, expect, type Page } from "@playwright/test";

export interface PageErrors {
  console: string[];
  pageerror: string[];
}

// Benign noise we never want to flag: a failed favicon, abcjs/CDN-less notation,
// and AudioContext autoplay warnings that the browser emits as info, not errors.
const IGNORE = [
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404/i,
  /AudioContext was not allowed to start/i,
  /The AudioContext was not allowed to start/i,
];

function ignored(text: string): boolean {
  return IGNORE.some((re) => re.test(text));
}

export const test = base.extend<{ errors: PageErrors }>({
  errors: async ({ page }, use) => {
    const errors: PageErrors = { console: [], pageerror: [] };
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ignored(text)) errors.console.push(text);
      }
    });
    page.on("pageerror", (err) => {
      const text = err.message ?? String(err);
      if (!ignored(text)) errors.pageerror.push(text);
    });
    await use(errors);
  },
});

export { expect };

/** Assert no console errors / uncaught exceptions were collected. */
export function expectNoPageErrors(errors: PageErrors): void {
  expect(errors.pageerror, "uncaught page errors").toEqual([]);
  expect(errors.console, "console errors").toEqual([]);
}

/** Wait for the lab to mount and paint at least one viz frame. */
export async function waitForStage(page: Page, stageSel = "#lab-stage"): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const host = document.querySelector(sel);
      if (!host) return false;
      const svg = host.querySelector("svg");
      const canvas = host.querySelector("canvas");
      return Boolean(svg || canvas);
    },
    stageSel,
    { timeout: 15000 },
  );
}

/** Measure how much non-empty visual content the stage currently holds. */
export async function stageContentSize(page: Page, stageSel = "#lab-stage"): Promise<number> {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel);
    if (!host) return 0;
    const svg = host.querySelector("svg");
    if (svg) {
      // count painted primitives, not just the root element
      return svg.querySelectorAll("path, circle, rect, line, text, polyline, polygon, g").length;
    }
    const canvas = host.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0 || canvas.height === 0) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // any non-transparent pixel counts the canvas as "drawn"
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return canvas.width;
      return 0;
    }
    return 0;
  }, stageSel);
}
