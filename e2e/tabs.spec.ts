import { expect, type Page, test } from "@playwright/test";

async function createList(page: Page, name: string) {
  await page.getByRole("textbox", { name: "New list name" }).fill(name);
  await page.keyboard.press("Enter");
}

test("two tabs show each other's lists and never overwrite them", async ({
  context,
}) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/");
  await b.goto("/");

  await createList(a, "From A");
  // The browser's storage event updates the other tab without a reload.
  await expect(b.getByRole("link", { name: /From A/ })).toBeVisible();

  await createList(b, "From B");
  await expect(a.getByRole("link", { name: /From B/ })).toBeVisible();

  await a.reload();
  await expect(a.getByRole("link")).toContainText(["From B", "From A"]);
});
