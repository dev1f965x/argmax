import { expect, test } from "@playwright/test";

test("an unknown path shows the not found page and links back to lists", async ({
  page,
}) => {
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to lists" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
});
