/**
 * Interaction (SPEC §4.1, §7). Clicking Play must not throw, the tuning toggle
 * must flip state, and every visualization must render non-empty content when
 * selected. Audio is gated behind a gesture; we only assert state changes and
 * stage paint, never that sound comes out.
 */
import { test, expect, expectNoPageErrors, waitForStage, stageContentSize } from "./fixtures";

test.describe("interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForStage(page);
  });

  test("clicking Play does not throw and toggles the label", async ({ page, errors }) => {
    const play = page.locator("#lab-play");
    await expect(play).toContainText("Play");
    await play.click();
    await expect(play).toContainText("Pause");
    await play.click();
    await expect(play).toContainText("Play");
    expectNoPageErrors(errors);
  });

  test("the tuning toggle flips JI⇄ET and updates aria-pressed", async ({ page }) => {
    const mode = page.locator("#lab-mode");
    await expect(mode).toHaveText("Just intonation");
    await expect(mode).toHaveAttribute("aria-pressed", "false");
    await mode.click();
    await expect(mode).toHaveText("Equal temperament");
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    await mode.click();
    await expect(mode).toHaveText("Just intonation");
    await expect(mode).toHaveAttribute("aria-pressed", "false");
  });

  test("each visualization renders non-empty content when selected", async ({ page, errors }) => {
    const tabs = page.getByRole("tab");
    const count = await tabs.count();
    expect(count).toBe(4);
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await page.waitForFunction(() => {
        const host = document.querySelector("#lab-stage");
        return Boolean(host?.querySelector("svg") || host?.querySelector("canvas"));
      });
      // give the rAF loop a frame or two to paint
      await page.waitForTimeout(120);
      const size = await stageContentSize(page);
      expect(size, `viz #${i} should paint content`).toBeGreaterThan(0);
    }
    expectNoPageErrors(errors);
  });

  test("picking a playground example marks it pressed and keeps the stage drawn", async ({
    page,
    errors,
  }) => {
    const chips = page.locator("#lab-examples .chip");
    await expect(chips).toHaveCount(3);
    const fifths = chips.filter({ hasText: "C–G–D–A–E–C" });
    await fifths.click();
    await expect(fifths).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(120);
    expect(await stageContentSize(page)).toBeGreaterThan(0);
    expectNoPageErrors(errors);
  });
});
