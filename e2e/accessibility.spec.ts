// Named import: the package types its ESM entry with the CJS declaration file,
// so a default import fails under nodenext resolution.
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
    value: JSON.stringify({
      schemaVersion: 1,
      lists: [
        {
          id: "lunch",
          name: "Lunch",
          items: [],
          createdAt: "2026-10-03T00:00:00.000Z",
          updatedAt: "2026-10-03T00:00:00.000Z",
        },
      ],
    }),
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
        await page.goto("/");
        await page.evaluate(
          (stored) => localStorage.setItem("argmax", stored),
          value,
        );
        await page.reload();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });
}
