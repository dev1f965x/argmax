import { expect, test } from "@playwright/test";
import { createList } from "./support.ts";

test("responses carry the security headers", async ({ request }) => {
  for (const path of ["/", "/lists/example", "/privacy"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain(
      "default-src 'self'",
    );
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers["content-security-policy"], path).toContain(
      "connect-src 'self' https://cloud.umami.is;",
    );
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["cross-origin-opener-policy"], path).toBe("same-origin");
  }
});

test("the app runs without Content Security Policy violations", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text()))
      violations.push(message.text());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "한국어" }).click();
  await page.getByRole("link", { name: "개인정보 처리방침" }).click();
  await expect(
    page.getByRole("heading", { name: "개인정보 처리방침" }),
  ).toBeVisible();
  await page.goto("/missing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The List screen: menus, dialogs, and the pick bar, which sets its height
  // as a CSS variable from script.
  await page.goto("/");
  await page.getByRole("textbox", { name: "새 목록 이름" }).fill("점심");
  await page.keyboard.press("Enter");
  await page.getByRole("textbox", { name: "새 항목" }).fill("라멘");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "뽑기", exact: true }).click();
  await expect(page.getByRole("button", { name: "다시 뽑기" })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole("button", { name: "목록 메뉴" }).click();
  await page.getByRole("menuitem", { name: "목록 삭제" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  expect(violations).toEqual([]);
});

test("the footer links to the generated third-party notices", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page
    .getByRole("link", { name: "Licenses" })
    .getAttribute("href");
  const notices = await request.get(href ?? "");
  expect(notices.ok()).toBe(true);
  const text = await notices.text();
  expect(text).toContain("pretendard 1.3.9");
  expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
  expect(text).toMatch(/^tailwindcss /m);
});

test("no usage events leave a non-production site", async ({ page }) => {
  const reports: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("umami")) reports.push(request.url());
  });

  await page.goto("/");
  await createList(page, "Lunch");
  await page.getByRole("textbox", { name: "New item" }).fill("Ramen");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Pick", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pick again" })).toBeVisible();

  expect(reports).toEqual([]);
});
