// Named import: the package types its ESM entry with the CJS declaration file,
// so a default import fails under nodenext resolution.
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openWithStorage, storedState } from "./support.ts";

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
