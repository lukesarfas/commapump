/**
 * Engraved notation for the worked examples. abcjs is heavy (~250 KB), so it is
 * dynamically imported here and only on the full site — never in the applet.
 */

async function renderNotation(): Promise<void> {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-abc]"));
  if (!targets.length) return;
  try {
    const abcjs = await import("abcjs");
    for (const el of targets) {
      abcjs.renderAbc(el, el.dataset.abc ?? "", {
        responsive: "resize",
        add_classes: true,
        paddingleft: 0,
        paddingright: 0,
        paddingtop: 4,
        paddingbottom: 4,
      });
    }
  } catch {
    /* notation is an enhancement; ignore failures */
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderNotation);
else void renderNotation();
