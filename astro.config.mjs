import { defineConfig } from "astro/config";

// CommaPump — standalone static site. The full scroll-story + playground builds
// to dist/ for the marketing host; the embeddable applet is assembled separately
// by scripts/build-applet.mjs into site/applet/index.html (≤200 KB, self-contained).
export default defineConfig({
  site: "https://commapump.sarfas.com",
  build: {
    format: "directory",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
});
