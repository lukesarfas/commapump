/**
 * Accessibility (SPEC §4.3, §7). Runs @axe-core/playwright against the loaded
 * full site and fails on any serious/critical violation. Scoped to the desktop
 * project (one analysis is enough; the same DOM serves mobile).
 */
import AxeBuilder from "@axe-core/playwright";
import { test, expect, waitForStage } from "./fixtures";

test.describe("axe-core accessibility", () => {
  test.skip(({ isMobile }) => !!isMobile, "run axe once, on desktop");

  test("no serious or critical violations on '/'", async ({ page }) => {
    await page.goto("/");
    await waitForStage(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // surface a readable summary if anything fails
    const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join("\n");
    expect(blocking, summary || "no serious/critical violations").toEqual([]);
  });
});
