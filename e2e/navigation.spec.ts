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

test("each screen has its own title, and navigation moves focus to the new heading", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Lists – Argmax");
  await page.getByRole("textbox", { name: "New list name" }).fill("Lunch");
  await page.keyboard.press("Enter");

  await page.getByRole("link", { name: /Lunch/ }).click();
  await expect(page).toHaveTitle("Lunch – Argmax");
  await expect(page.getByRole("heading", { name: "Lunch" })).toBeFocused();

  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveTitle("Privacy policy – Argmax");
  await expect(
    page.getByRole("heading", { name: "Privacy policy" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page).toHaveTitle("개인정보 처리방침 – Argmax");

  await page.goBack();
  await expect(page).toHaveTitle("Lunch – Argmax");
  await expect(page.getByRole("heading", { name: "Lunch" })).toBeFocused();
  await page.goBack();
  await expect(page).toHaveTitle("목록 – Argmax");
  await expect(page.getByRole("heading", { name: "목록" })).toBeFocused();
});

test("a new screen starts at the top, and Back restores the scroll position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 500 });
  await page.goto("/");
  await page.evaluate(() => {
    const lists = Array.from({ length: 30 }, (_, index) => ({
      id: `l${index}`,
      name: `List ${index}`,
      items: [],
      createdAt: "2026-10-04T00:00:00.000Z",
      updatedAt: "2026-10-04T00:00:00.000Z",
    }));
    localStorage.setItem("argmax", JSON.stringify({ schemaVersion: 1, lists }));
  });
  await page.reload();

  await page.getByRole("link", { name: /List 0/ }).scrollIntoViewIfNeeded();
  const listsScroll = await page.evaluate(() => window.scrollY);
  expect(listsScroll).toBeGreaterThan(0);

  await page.getByRole("link", { name: /List 0/ }).click();
  await expect(page.getByRole("heading", { name: "List 0" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Lists" })).toBeAttached();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(listsScroll);
});
