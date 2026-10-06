import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openWithStorage, storageKey, storedStateV1 } from "./support.ts";

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

test("lists saved by 0.1.0 show and pick, and are saved as version 2 only on a change", async ({
  page,
}) => {
  const v1 = storedStateV1([
    { id: "lunch", name: "Lunch", items: ["Ramen", "Ramen", "Udon"] },
  ]);
  await openWithStorage(page, v1);
  const stored = () =>
    page.evaluate((key) => localStorage.getItem(key), storageKey);

  await page.getByRole("link", { name: /Lunch/ }).click();
  await expect(page.getByText("3 items")).toBeVisible();
  await page.getByRole("button", { name: "Pick", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    /Picked “(Ramen|Udon)”/,
    {
      timeout: 2_000,
    },
  );
  expect(await stored()).toBe(v1);

  await page.getByRole("textbox", { name: "New item" }).fill("Soba");
  await page.keyboard.press("Enter");
  await expect(page.getByText("4 items")).toBeVisible();
  const saved = JSON.parse((await stored()) ?? "");
  expect(saved.schemaVersion).toBe(2);
  expect(
    saved.lists[0].items.map((item: { text: string; weight: number }) => [
      item.text,
      item.weight,
    ]),
  ).toEqual([
    ["Ramen", 1],
    ["Ramen", 1],
    ["Udon", 1],
    ["Soba", 1],
  ]);
});

test("data from a newer version asks for a reload and is never changed", async ({
  page,
}) => {
  const newer = JSON.stringify({ schemaVersion: 3, lists: [] });
  await openWithStorage(page, newer);

  const title = page.getByText("Lists can’t be edited in this tab");
  await expect(title).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "New list name" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Copy data" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete data" }),
  ).not.toBeAttached();

  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Reload" }).click(),
  ]);
  await expect(title).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(newer);
});
