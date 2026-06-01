import { defineConfig } from "astro/config";

// CommaPump — standalone static site. The full scroll-story + playground builds
// to dist/ for the marketing host; the embeddable applet is assembled separately
// by scripts/build-applet.mjs into site/applet/index.html (≤200 KB, self-contained).
export default defineConfig({
  site: "https://commapump.sarfas.com",
  // Served from the GCS applets bucket under a subpath until the custom domain
  // is wired up; SITE_BASE lets the build target that prefix. Defaults to root.
  base: process.env.SITE_BASE || "/",
  build: {
    format: "directory",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
});
