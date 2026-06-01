/**
 * Reduced motion (SPEC §4.3, §7). With prefers-reduced-motion the page must not
 * autoplay audio/animation, yet must still show all content and keep the lab
 * usable (single-tap Play still works). We assert the transport stays paused
 * after scenes scroll past — the path that would otherwise autoplay.
 */
import { test, expect, expectNoPageErrors, waitForStage } from "./fixtures";

test.use({ colorScheme: "dark" });

test.describe("prefers-reduced-motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForStage(page);
  });

  test("content still renders", async ({ page }) => {
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator("#lab-stage")).toBeVisible();
    await expect(page.locator("#lab-stage canvas")).toBeVisible();
  });

  test("does not autoplay when an autoplay scene scrolls into view", async ({ page }) => {
    const play = page.locator("#lab-play");
    await expect(play).toContainText("Play");
    // scroll the first autoplay scene ("hook") to the centre of the viewport
    await page.locator('[data-scene="accumulate"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    // still paused — reduced motion suppresses the autoplay branch in lab.ts
    await expect(play).toContainText("Play");
  });

  test("Play still works as a single-tap alternative", async ({ page, errors }) => {
    const play = page.locator("#lab-play");
    await play.click();
    await expect(play).toContainText("Pause");
    expectNoPageErrors(errors);
  });
});
