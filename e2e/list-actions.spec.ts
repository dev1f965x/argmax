import { expect, test } from "@playwright/test";

test("a list can be renamed and deleted from its actions menu", async ({
  page,
}) => {
  // Records every page heading, to prove "Page not found" never flashes
  // between deleting a list and showing the Lists screen.
  await page.addInitScript(() => {
    const headings: string[] = [];
    Object.assign(window, { headings });
    new MutationObserver(() => {
      const heading = document.querySelector("h1")?.textContent;
      if (heading && headings.at(-1) !== heading) headings.push(heading);
    }).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /Lunch/ }).click();

  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Rename" }).fill("Dinner");
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
  const headings = await page.evaluate(
    () => (window as unknown as { headings: string[] }).headings,
  );
  expect(headings).toEqual(["Dinner", "Lists"]);
  await page.reload();
  await expect(page.getByText("No lists yet")).toBeVisible();
  await expect(page.getByText("Deleted “Dinner”.")).toHaveCount(0);
});
