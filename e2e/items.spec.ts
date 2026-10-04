import { expect, test } from "@playwright/test";
import { createList } from "./support.ts";

test("items can be added, edited, removed, and restored with the keyboard, and stay after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await createList(page, "Lunch");

  const add = page.getByRole("textbox", { name: "New item" });
  await add.fill("Ramen");
  await add.press("Enter");
  await add.fill("Sushi");
  await add.press("Enter");

  await page.getByRole("button", { name: "Edit “Ramen”" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("textbox", { name: "Item text" }).fill("Udon");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Remove “Sushi”" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Undo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listitem")).toHaveText(["Sushi", "Udon"]);
  await page.getByRole("button", { name: "Remove “Sushi”" }).focus();
  await page.keyboard.press("Enter");

  await page.reload();

  await expect(page.getByRole("listitem")).toHaveText(["Udon"]);
  await expect(page.getByText("1 item", { exact: true })).toBeVisible();
  // Undo does not survive a reload.
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
});
