import { expect, type Page, test } from "@playwright/test";
import { createList } from "./support.ts";

// The browser opens the production address, but every request to it is
// answered by the local preview build (with its security headers), so the app
// runs exactly as in production. Requests to Umami are intercepted and
// inspected; nothing leaves the machine. (.dev is HTTPS-only in browsers, so
// mapping the hostname to the plain-HTTP preview is not an option.)
const production = "https://argmax.dev1f965x.workers.dev";

test.use({ baseURL: production, reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await page.route(`${production}/**`, async (route) => {
    const local = route
      .request()
      .url()
      .replace(production, "http://127.0.0.1:4173");
    await route.fulfill({ response: await route.fetch({ url: local }) });
  });
});

type Report = {
  payload: { url: string; title: string; name?: string; data?: object };
};

async function captureReports(page: Page): Promise<Report[]> {
  const reports: Report[] = [];
  await page.route("https://cloud.umami.is/**", async (route) => {
    reports.push(route.request().postDataJSON() as Report);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "{}",
    });
  });
  return reports;
}

async function useTheApp(page: Page) {
  await page.goto("/");
  await createList(page, "Secret lunch");
  await page.getByRole("link", { name: /Secret lunch/ }).click();
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
