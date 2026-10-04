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
