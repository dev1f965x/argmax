import { expect, test } from "@playwright/test";

test("items can be added, edited, and removed with the keyboard, and stay after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /Lunch/ }).click();

  const add = page.getByRole("textbox", { name: "Add an item" });
  await add.fill("Ramen");
  await add.press("Enter");
  await add.fill("Sushi");
  await add.press("Enter");

  await page.getByRole("button", { name: "Edit “Ramen”" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("textbox", { name: "Edit item" }).fill("Udon");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Remove “Sushi”" }).focus();
  await page.keyboard.press("Enter");

  await page.reload();

  await expect(page.getByRole("listitem")).toHaveText(["Udon"]);
  await expect(page.getByText("1 item", { exact: true })).toBeVisible();
});
