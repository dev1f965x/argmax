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
