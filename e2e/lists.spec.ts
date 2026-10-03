import { expect, test } from "@playwright/test";

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
  await page.evaluate(() => localStorage.setItem("argmax", "{not json"));
  await page.reload();

  await expect(page.getByRole("alert")).toContainText(
    "Saved lists couldn’t be read",
  );
  await expect(
    page.getByRole("textbox", { name: "New list name" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("argmax"))).toBe(
    "{not json",
  );

  await page.getByRole("button", { name: "Delete saved data" }).click();
  await page.getByRole("button", { name: "Delete data" }).click();

  await expect(page.getByRole("status")).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("argmax"))).toBeNull();
});
