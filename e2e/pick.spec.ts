import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const items = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);

async function openList(page: Page) {
  await page.goto("/");
  await page.evaluate((texts) => {
    localStorage.setItem(
      "argmax",
      JSON.stringify({
        schemaVersion: 1,
        lists: [
          {
            id: "lunch",
            name: "Lunch",
            items: texts.map((text, index) => ({ id: `i${index}`, text })),
            createdAt: "2026-10-04T00:00:00.000Z",
            updatedAt: "2026-10-04T00:00:00.000Z",
          },
        ],
      }),
    );
  }, items);
  await page.goto("/lists/lunch");
}

test("picks an item, announces it, and passes the accessibility check", async ({
  page,
}) => {
  await openList(page);
  await page.getByRole("button", { name: "Pick", exact: true }).click();

  // The result appears after the short cycle and is one of the list's items.
  await expect(page.getByRole("status")).toContainText("Picked “", {
    timeout: 2_000,
  });
  const announced = await page.getByRole("status").textContent();
  expect(items.some((item) => announced?.includes(`“${item}”`))).toBe(true);
  await expect(page.getByRole("button", { name: "Pick again" })).toBeVisible();

  await page.waitForFunction(() => document.getAnimations().length === 0);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("shows the result at once when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openList(page);
  await page.getByRole("button", { name: "Pick", exact: true }).click();

  // No cycling: the announcement is there on the next check.
  await expect(page.getByRole("status")).toContainText("Picked “", {
    timeout: 100,
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("the fixed pick bar never covers the last item or the footer", async ({
    page,
  }) => {
    await openList(page);
    await page.getByRole("button", { name: "Pick", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pick again" }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const bar = await page
      .getByRole("region", { name: "Pick result" })
      .boundingBox();
    const footer = await page.getByRole("contentinfo").boundingBox();
    expect(bar).not.toBeNull();
    expect(footer).not.toBeNull();
    if (bar && footer)
      expect(footer.y + footer.height).toBeLessThanOrEqual(bar.y + 1);
  });
});
