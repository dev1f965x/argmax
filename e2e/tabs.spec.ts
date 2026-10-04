import { expect, test } from "@playwright/test";
import { createList } from "./support.ts";

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
