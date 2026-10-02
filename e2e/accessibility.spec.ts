// Named import: the package types its ESM entry with the CJS declaration file,
// so a default import fails under nodenext resolution.
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = ["/", "/lists/example", "/missing"];

for (const path of paths) {
  test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
