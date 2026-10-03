import { expect, test } from "@playwright/test";

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
  await page.getByRole("link", { name: "개인정보" }).click();
  await expect(page.getByRole("heading", { name: "개인정보" })).toBeVisible();
  await page.goto("/missing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(violations).toEqual([]);
});

test("the footer links to the generated third-party notices", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page
    .getByRole("link", { name: "Open source licenses" })
    .getAttribute("href");
  const notices = await request.get(href ?? "");
  expect(notices.ok()).toBe(true);
  const text = await notices.text();
  expect(text).toContain("pretendard 1.3.9");
  expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
  expect(text).toMatch(/^tailwindcss /m);
});
