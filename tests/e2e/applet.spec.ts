/**
 * Standalone applet (SPEC §4.1, §7). The embeddable applet must load from a bare
 * file:// URL (the hub iframes it with no server), render its stage and controls,
 * and log no console errors. Mirrors the full-site interaction guard in miniature.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect, expectNoPageErrors } from "./fixtures";

// Resolve relative to the repo root so this works on any checkout (CI included),
// not just one machine. `npm run build` writes the applet here before tests run.
const APPLET_URL = pathToFileURL(path.resolve(process.cwd(), "site/applet/index.html")).href;

async function waitForAppletStage(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(() => {
    const host = document.querySelector("#stage");
    return Boolean(host?.querySelector("svg") || host?.querySelector("canvas"));
  }, { timeout: 15000 });
}

test.describe("standalone applet (file://)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APPLET_URL);
    await waitForAppletStage(page);
  });

  test("stage and controls are visible", async ({ page }) => {
    await expect(page.locator("#stage")).toBeVisible();
    await expect(page.locator("#play")).toBeVisible();
    await expect(page.locator("#mode")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(4);
  });

  test("Play toggles and the tuning mode flips without throwing", async ({ page, errors }) => {
    const play = page.locator("#play");
    await play.click();
    await expect(play).toContainText("Pause");
    const mode = page.locator("#mode");
    await mode.click();
    await expect(mode).toHaveText("Equal temperament");
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    expectNoPageErrors(errors);
  });

  test("no console errors or uncaught exceptions", async ({ page, errors }) => {
    await page.waitForTimeout(300);
    expectNoPageErrors(errors);
  });
});
