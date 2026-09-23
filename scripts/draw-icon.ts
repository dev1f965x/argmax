import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

/**
 * Draws the app's icon at the size Tauri's generator wants, and leaves it for
 * `npx tauri icon` to cut into every format.
 *
 *   npm run art:icon   → src-tauri/icons/source.png
 */
const SIZE = 1024;
const OUT = "src-tauri/icons";

/** Three options; one of them lights up. The mark is the app in one glance. */
const mark = `
<!doctype html>
<html>
  <body style="margin:0">
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="9" fill="#0f1115" />
      <rect x="9" y="9" width="22" height="6" rx="3" fill="#2c3242" />
      <rect x="9" y="17" width="22" height="6" rx="3" fill="#7c9cff" />
      <rect x="9" y="25" width="22" height="6" rx="3" fill="#2c3242" />
    </svg>
  </body>
</html>`;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await page.setContent(mark);
await page.locator("svg").screenshot({ path: `${OUT}/source.png`, omitBackground: true });
await browser.close();

console.log(`${OUT}/source.png`);
