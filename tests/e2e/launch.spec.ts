/**
 * Full-site launch (SPEC §4.1, §7). The page must load, log no errors, and have
 * every required region visible: hero, lab stage, all scenes, the viz tabs, the
 * transport, the playground controls, engraved notation, and the glossary.
 */
import { test, expect, expectNoPageErrors, waitForStage } from "./fixtures";

test.describe("full-site launch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForStage(page);
  });

  test("hero is visible with the headline and drift ribbon", async ({ page }) => {
    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("img")).toBeVisible(); // the SSR drift staircase
  });

  test("the lab stage is mounted and visible", async ({ page }) => {
    await expect(page.locator("#lab-stage")).toBeVisible();
  });

  test("every scroll-story scene is present", async ({ page }) => {
    const scenes = page.locator("[data-scene]");
    // 13 narrative scenes + the playground anchor
    await expect(scenes).toHaveCount(14);
    await expect(page.locator('[data-scene="hook"]')).toBeVisible();
    await expect(page.locator('[data-scene="playground-anchor"]')).toBeVisible();
  });

  test("the pitch-roll visualization is mounted (single view, no tab switcher)", async ({ page }) => {
    await expect(page.locator("#lab-stage canvas")).toBeVisible();
    // the tablist is hidden when there's only one visualization
    await expect(page.getByRole("tab")).toHaveCount(0);
  });

  test("the transport controls are visible", async ({ page }) => {
    await expect(page.locator("#lab-play")).toBeVisible();
    await expect(page.locator("#lab-mode")).toBeVisible();
  });

  test("the playground controls are visible", async ({ page }) => {
    await expect(page.locator("#lab-examples")).toBeVisible();
    await expect(page.locator("#lab-cycles")).toBeVisible();
    await expect(page.locator("#lab-tempo")).toBeVisible();
    // the example picker is populated by lab.ts
    await expect(page.locator("#lab-examples .chip")).toHaveCount(3);
  });

  test("the engraved notation targets are present", async ({ page }) => {
    const scores = page.locator("[data-abc]");
    await expect(scores).toHaveCount(2);
    await expect(scores.first()).toBeVisible();
  });

  test("the glossary is visible", async ({ page }) => {
    const glossary = page.locator("dl.glossary");
    await expect(glossary).toBeVisible();
    await expect(glossary.locator("dt").first()).toBeVisible();
  });

  test("no console errors or uncaught exceptions on load", async ({ page, errors }) => {
    await page.waitForTimeout(500); // let async notation import settle
    expectNoPageErrors(errors);
  });
});
