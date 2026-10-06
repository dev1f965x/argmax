import { expect, type Page, test } from "@playwright/test";
import {
  captureReports,
  createList,
  production,
  serveProductionLocally,
} from "./support.ts";

test.use({ baseURL: production, reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await serveProductionLocally(page);
});

async function useTheApp(page: Page) {
  await page.goto("/");
  await createList(page, "Secret lunch");
  await page.getByRole("textbox", { name: "New item" }).fill("Secret ramen");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Pick", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pick again" })).toBeVisible();
}

test("production reports fixed screens and counts, never list content", async ({
  page,
}) => {
  const reports = await captureReports(page);
  await useTheApp(page);
  const listId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await expect.poll(() => reports.length).toBe(4);
  expect(reports.map(({ payload }) => payload)).toMatchObject([
    { url: "/", title: "Lists" },
    { url: "/", name: "list_created", data: { first_visit: true } },
    { url: "/lists/:id", title: "List" },
    { url: "/lists/:id", name: "pick", data: { earlier_visit: false } },
  ]);
  const sent = JSON.stringify(reports);
  expect(sent).not.toContain("Secret");
  expect(sent).not.toContain(listId);
});

test("nothing is reported when the browser sends Global Privacy Control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      get: () => true,
    });
  });
  const reports = await captureReports(page);
  await useTheApp(page);

  expect(reports).toEqual([]);
});
