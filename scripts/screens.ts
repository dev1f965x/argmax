import { mkdirSync, rmSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { createServer } from "vite";

/**
 * Photographs every state of the app, for design review and the README.
 *
 * The same page runs in a browser tab, in the Windows window, and in the Android app, so
 * one set of shots covers all three — at a phone's width, and at a desktop window's.
 *
 *   npm run screens        → screens/*.png
 */
const PHONE = { width: 420, height: 780 };
const DESKTOP = { width: 760, height: 720 };
const PORT = 1430;
const OUT = "screens";

interface Shot {
  name: string;
  topics?: unknown[];
  act?: (page: Page) => Promise<void>;
  viewport?: { width: number; height: number };
}

const lunch = {
  id: "1",
  name: "점심 메뉴",
  options: [
    { id: "a", name: "국밥" },
    { id: "b", name: "파스타" },
    { id: "c", name: "김치찌개" },
    { id: "d", name: "샐러드" },
  ],
};

const games = {
  id: "2",
  name: "주말 게임",
  options: [
    { id: "e", name: "발라트로" },
    { id: "f", name: "하스스톤" },
  ],
};

const pick = (page: Page) => page.getByRole("button", { name: "고르기" }).click();

const SHOTS: Shot[] = [
  { name: "empty" },
  { name: "topic-new", act: (page) => page.getByRole("button", { name: "주제 만들기" }).click() },
  { name: "options-empty", topics: [{ id: "1", name: "점심 메뉴", options: [] }] },
  { name: "options", topics: [lunch, games] },
  { name: "picked", topics: [lunch, games], act: pick },
  {
    name: "renaming",
    topics: [lunch, games],
    act: (page) => page.getByRole("heading", { name: "점심 메뉴" }).click(),
  },
  { name: "desktop-options", topics: [lunch, games], viewport: DESKTOP },
  { name: "desktop-picked", topics: [lunch, games], act: pick, viewport: DESKTOP },
];

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    server: { port: PORT, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  // Headless Chromium hides scrollbars; the real window has one, and it takes room.
  const browser = await chromium.launch({
    channel: "msedge",
    ignoreDefaultArgs: ["--hide-scrollbars"],
  });

  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage({
        viewport: shot.viewport ?? PHONE,
        deviceScaleFactor: 2,
      });
      await page.addInitScript(
        (stored) => window.localStorage.setItem("argmax.topics", JSON.stringify(stored)),
        shot.topics ?? [],
      );
      await page.goto(`http://localhost:${PORT}`);
      await page.getByRole("heading", { name: "argmax", level: 1 }).waitFor();
      await shot.act?.(page);
      // Park the pointer where nothing reacts to it, so no hover state is photographed.
      await page.mouse.move(1, (shot.viewport ?? PHONE).height - 1);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${shot.name}.png` });
      await page.close();
      console.log(`${OUT}/${shot.name}.png`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
