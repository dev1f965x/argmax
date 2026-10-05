import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { storageKey } from "./support.ts";

test("a created list opens, stays after a reload, and appears on Lists", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: "Lunch" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "New item" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lunch" })).toBeVisible();

  await page.getByRole("link", { name: "All lists" }).click();
  await expect(page.getByRole("link", { name: /Lunch/ })).toContainText(
    "0 items",
  );
});

test("invalid stored data is kept until the user deletes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{not json"),
    storageKey,
  );
  await page.reload();

  await expect(page.getByText("Saved lists couldn’t be read")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "New list name" }),
  ).toBeDisabled();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe("{not json");

  await page.getByRole("button", { name: "Delete data" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete data" })
    .click();

  await expect(page.getByText(/Deleted the saved data/)).toBeFocused();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

const detail =
  "Clearing browser data deletes them, and other devices don’t show them.";

test("the storage note shows its details on hover", async ({ page }) => {
  await page.goto("/");
  const note = page.getByRole("button", {
    name: "Lists are saved only in this browser.",
  });
  await note.hover();
  await expect(page.getByText(detail)).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  // A best-practice rule outside the WCAG tags: the popup dialog is named.
  const named = await new AxeBuilder({ page })
    .withRules(["aria-dialog-name"])
    .analyze();
  expect(named.violations).toEqual([]);

  await page.mouse.move(0, 0);
  await expect(page.getByText(detail)).toBeHidden();
});

test.describe("on a phone with touch", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test("tapping the storage note shows its details", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Lists are saved only in this browser." })
      .tap();
    await expect(page.getByText(detail)).toBeVisible();

    // Tapping elsewhere closes it, without a hover race reopening it.
    await page.getByRole("heading", { name: "Lists" }).tap();
    await expect(page.getByText(detail)).toBeHidden();
  });
});
