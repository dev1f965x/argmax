// Named import: the package types its ESM entry with the CJS declaration file,
// so a default import fails under nodenext resolution.
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  openWithStorage,
  recordClipboard,
  sharedFragment,
  storedState,
} from "./support.ts";

const paths = ["/", "/lists/example", "/privacy", "/missing"];

for (const locale of ["en-US", "ko-KR"]) {
  test.describe(locale, () => {
    test.use({ locale });

    for (const path of paths) {
      test(`${path} has no detectable WCAG 2.2 AA violations`, async ({
        page,
      }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });
}

// States that only exist with stored data, checked in English and Korean.
const storedStates = [
  {
    name: "a list",
    value: storedState([
      { id: "lunch", name: "Lunch", items: ["Ramen", "Sushi"] },
    ]),
  },
  { name: "invalid data", value: "{not json" },
  {
    name: "data from a newer version",
    value: JSON.stringify({ schemaVersion: 3, lists: [] }),
  },
];

for (const locale of ["en-US", "ko-KR"]) {
  test.describe(`${locale} with stored data`, () => {
    test.use({ locale });

    for (const { name, value } of storedStates) {
      test(`/ with ${name} has no detectable WCAG 2.2 AA violations`, async ({
        page,
      }) => {
        await openWithStorage(page, value);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }

    test("/lists/lunch while editing with an error has no detectable WCAG 2.2 AA violations", async ({
      page,
    }) => {
      await openWithStorage(page, storedStates[0]?.value ?? "", "/lists/lunch");
      const row = page.getByRole("listitem").first();
      await row.getByRole("button").first().click();
      await row.getByRole("textbox").fill("");
      await row.getByRole("textbox").press("Enter");
      await expect(page.getByRole("alert")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    for (const { name, viewport } of [
      { name: "phone", viewport: { width: 360, height: 740 } },
      { name: "desktop", viewport: { width: 1280, height: 800 } },
    ]) {
      test(`/lists/lunch with weights, chances, and a weight at its maximum on a ${name} has no detectable WCAG 2.2 AA violations`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await openWithStorage(
          page,
          storedState([
            {
              id: "lunch",
              name: "Lunch",
              items: ["Ramen", "Sushi", "Pho"],
              weights: [2, 1, 1],
            },
          ]),
          "/lists/lunch",
        );
        // The switch thumb slides; contrast is measured once it has settled.
        const analyze = async () => {
          await page.waitForFunction(
            () => document.getAnimations().length === 0,
          );
          return new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
        };

        await page.getByRole("switch").click();
        await expect(page.getByRole("switch")).toBeChecked();
        expect((await analyze()).violations).toEqual([]);

        const row = page.getByRole("listitem").first();
        await row.getByRole("button").first().click();
        await page.getByRole("spinbutton").press("ArrowUp");
        await page.getByRole("spinbutton").press("ArrowUp");
        await expect(page.getByRole("spinbutton")).toHaveAttribute(
          "aria-valuenow",
          "3",
        );
        expect((await analyze()).violations).toEqual([]);
      });
    }

    test("/lists/lunch with the menu and the delete dialog open has no detectable WCAG 2.2 AA violations", async ({
      page,
    }) => {
      await openWithStorage(page, storedStates[0]?.value ?? "", "/lists/lunch");
      // Menus and dialogs fade; contrast is measured once they have settled.
      const analyze = async () => {
        await page.waitForFunction(() => document.getAnimations().length === 0);
        return new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
      };

      await page
        .getByRole("button")
        .filter({ has: page.locator("svg.lucide-ellipsis") })
        .click();
      await expect(page.getByRole("menu")).toBeVisible();
      expect((await analyze()).violations).toEqual([]);

      await page.getByRole("menuitem").last().click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(page.getByRole("menu")).toBeHidden();
      expect((await analyze()).violations).toEqual([]);
    });
  });
}

const lunchLink = `/shared#${sharedFragment("Lunch", [
  ["Ramen", 1],
  ["Sushi", 3],
  ["Pho", 1],
])}`;
const kakao =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.8.1";
const fullStorage = storedState(
  Array.from({ length: 100 }, (_, index) => ({
    id: `list-${index}`,
    name: `List ${index}`,
  })),
);

const sharedStates: {
  name: string;
  path: string;
  stored?: string;
  userAgent?: string;
}[] = [
  { name: "a shared list", path: lunchLink },
  {
    name: "a shared list with no items",
    path: `/shared#${sharedFragment("Lunch", [])}`,
  },
  {
    name: "a shared list at the list limit",
    path: lunchLink,
    stored: fullStorage,
  },
  {
    name: "a shared list in an in-app browser",
    path: lunchLink,
    userAgent: kakao,
  },
  { name: "a broken link", path: "/shared#1.AAAA" },
  {
    name: "a link from a newer version",
    path: `/shared#2${lunchLink.slice(9)}`,
  },
];

const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const locale of ["en-US", "ko-KR"]) {
  for (const { name, viewport } of [
    { name: "phone", viewport: { width: 360, height: 740 } },
    { name: "desktop", viewport: { width: 1280, height: 800 } },
  ]) {
    test.describe(`${locale} on a ${name}, sharing`, () => {
      test.use({ locale, viewport });

      for (const state of sharedStates) {
        test(`${state.name} has no detectable WCAG 2.2 AA violations`, async ({
          browser,
        }) => {
          const context = await browser.newContext({
            locale,
            viewport,
            userAgent: state.userAgent,
          });
          const page = await context.newPage();
          if (state.stored)
            await openWithStorage(page, state.stored, state.path);
          else await page.goto(state.path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          const results = await new AxeBuilder({ page })
            .withTags(wcag)
            .analyze();
          expect(results.violations).toEqual([]);
          await context.close();
        });
      }

      test("the share dialog, its long-link warning, and a failed copy have no detectable WCAG 2.2 AA violations", async ({
        page,
      }) => {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "clipboard", {
            value: {
              writeText: () =>
                Promise.reject(new DOMException("Denied", "NotAllowedError")),
            },
          });
        });
        // Distinct syllables, so the link stays over 2,000 characters.
        const items = Array.from({ length: 120 }, (_, index) =>
          Array.from({ length: 8 }, (_, offset) =>
            String.fromCharCode(
              0xac00 + ((index * 997 + offset * 7919) % 11_172),
            ),
          ).join(""),
        );
        await openWithStorage(
          page,
          storedState([{ id: "lunch", name: "Lunch", items }]),
          "/lists/lunch",
        );
        const analyze = async () => {
          await page.waitForFunction(
            () => document.getAnimations().length === 0,
          );
          return new AxeBuilder({ page }).withTags(wcag).analyze();
        };
        await page
          .getByRole("button")
          .filter({ has: page.locator("svg.lucide-ellipsis") })
          .click();
        await page.getByRole("menuitem").nth(1).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.locator("svg.lucide-triangle-alert")).toBeVisible();
        expect((await analyze()).violations).toEqual([]);

        await dialog.getByRole("button").last().click();
        await expect(dialog.getByRole("textbox")).toBeFocused();
        expect((await analyze()).violations).toEqual([]);
      });

      test("the copied-link snackbar has no detectable WCAG 2.2 AA violations", async ({
        page,
      }) => {
        await recordClipboard(page);
        await openWithStorage(
          page,
          storedState([{ id: "lunch", name: "Lunch", items: ["Ramen"] }]),
          "/lists/lunch",
        );
        await page
          .getByRole("button")
          .filter({ has: page.locator("svg.lucide-ellipsis") })
          .click();
        await page.getByRole("menuitem").nth(1).click();
        await page.getByRole("dialog").getByRole("button").last().click();
        await expect(page.getByRole("dialog")).toBeHidden();
        await page.waitForFunction(() => document.getAnimations().length === 0);
        const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
        expect(results.violations).toEqual([]);
      });
    });
  }
}
