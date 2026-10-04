import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { openWithStorage, storedState } from "./support.ts";

const items = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);

const openList = (page: Page) =>
  openWithStorage(
    page,
    storedState([{ id: "lunch", name: "Lunch", items }]),
    "/lists/lunch",
  );

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

test.describe("on a phone in landscape", () => {
  test.use({ viewport: { width: 740, height: 360 } });

  test("a long result that scrolls in the pick bar passes the accessibility check", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWithStorage(
      page,
      // 100 wide letters wrap to more lines than the capped area holds.
      storedState([{ id: "long", name: "Long", items: ["W".repeat(100)] }]),
      "/lists/long",
    );
    await page.getByRole("button", { name: "Pick", exact: true }).click();
    const result = page.getByText("Picked", { exact: true }).locator("..");
    await expect(result).toBeVisible();
    expect(
      await result.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test("on a phone, keyboard focus is never hidden behind the pick bar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openWithStorage(
    page,
    storedState([{ id: "lunch", name: "Lunch", items }]),
    "/lists/lunch",
  );
  const bar = page.getByRole("region", { name: "Pick result" });
  await page.getByRole("textbox", { name: "New item" }).focus();
  // Edit and Remove for every item, then Pick.
  for (let stop = 0; stop < items.length * 2 + 1; stop += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const box = document.activeElement?.getBoundingClientRect();
      return { name: document.activeElement?.ariaLabel, bottom: box?.bottom };
    });
    const barTop = (await bar.boundingBox())?.y ?? 0;
    if ((await bar.locator(":focus").count()) > 0) continue;
    expect(focused.bottom, `${focused.name} is covered`).toBeLessThanOrEqual(
      barTop,
    );
  }
});

test("on desktop, Tab reaches Pick right after the list's actions", async ({
  page,
}) => {
  await openWithStorage(
    page,
    storedState([{ id: "lunch", name: "Lunch", items }]),
    "/lists/lunch",
  );
  await page.getByRole("button", { name: "List actions" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Pick", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "New item" })).toBeFocused();
});
