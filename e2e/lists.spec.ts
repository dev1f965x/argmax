import { expect, test } from "@playwright/test";
import { storageKey } from "./support.ts";

test("a created list stays after a reload and opens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.getByRole("button", { name: "Create" }).click();

  await page.reload();

  const link = page.getByRole("link", { name: /Lunch/ });
  await expect(link).toContainText("0 items");
  await link.click();
  await expect(page.getByRole("heading", { name: "Lunch" })).toBeVisible();
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
