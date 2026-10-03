import { expect, test } from "@playwright/test";

test.describe("with a Korean browser", () => {
  test.use({ locale: "ko-KR" });

  test("starts in Korean", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "목록" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  });

  test("keeps a chosen language after a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();

    await page.reload();

    await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
