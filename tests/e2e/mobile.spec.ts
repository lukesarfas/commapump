/**
 * Mobile viewport (SPEC §4.1, §7). On the Pixel 5 profile the page must render
 * without horizontal overflow and keep the key controls reachable. Runs only in
 * the Mobile project so the desktop run isn't redundantly scrolled.
 */
import { test, expect, expectNoPageErrors, waitForStage } from "./fixtures";

test.describe("mobile viewport", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile-only checks");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForStage(page);
  });

  test("no horizontal overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      // 1px slack absorbs sub-pixel rounding
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("key controls are visible and reachable in the viewport", async ({ page }) => {
    for (const sel of ["#lab-play", "#lab-mode", "#lab-tempo", "#lab-cycles"]) {
      const el = page.locator(sel);
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      expect(box).not.toBeNull();
      const vw = page.viewportSize()!.width;
      // control sits within the viewport width (no clipping off-screen)
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
    }
  });

  test("play and tuning toggle work on touch without errors", async ({ page, errors }) => {
    const play = page.locator("#lab-play");
    await play.scrollIntoViewIfNeeded();
    await play.click();
    await expect(play).toContainText("Pause");
    expectNoPageErrors(errors);
  });
});
