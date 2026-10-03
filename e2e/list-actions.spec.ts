import { expect, test } from "@playwright/test";

test("a list can be renamed and deleted from its actions menu", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /Lunch/ }).click();

  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "List name" }).fill("Dinner");
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dinner" })).toBeVisible();

  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("menuitem", { name: "Delete list" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete list" })
    .click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Deleted “Dinner”.")).toBeFocused();
  await page.reload();
  await expect(page.getByText("No lists yet")).toBeVisible();
  await expect(page.getByText("Deleted “Dinner”.")).toHaveCount(0);
});
