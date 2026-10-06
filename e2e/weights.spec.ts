import { expect, type Page, test } from "@playwright/test";
import { openWithStorage, storedState } from "./support.ts";

const lunch = storedState([
  { id: "lunch", name: "Lunch", items: ["Ramen", "Sushi", "Pho"] },
]);

const item = (page: Page, text: string) =>
  page.getByRole("listitem").filter({ hasText: text });

for (const { name, viewport } of [
  { name: "phone", viewport: { width: 360, height: 740 } },
  { name: "desktop", viewport: { width: 1280, height: 800 } },
]) {
  test.describe(name, () => {
    test.use({ viewport });

    test("a weight shows as a badge and in the chances, and both stay after a reload", async ({
      page,
    }) => {
      await openWithStorage(page, lunch, "/lists/lunch");
      const chancesSwitch = page.getByRole("switch", { name: "Show chances" });
      await expect(chancesSwitch).not.toBeChecked();
      await expect(page.getByText(/^Chance/)).toHaveCount(0);

      await page.getByRole("button", { name: "Edit “Sushi”" }).click();
      const increase = page.getByRole("button", { name: "Increase weight" });
      await increase.click();
      await increase.click();
      // Three items, so ×3 is the most.
      await expect(increase).toBeDisabled();
      await page.getByRole("button", { name: "Save" }).click();

      await expect(item(page, "Sushi")).toContainText("Weight ×3");
      await expect(item(page, "Ramen")).not.toContainText("×");
      await chancesSwitch.click();
      await expect(chancesSwitch).toBeChecked();
      await expect(item(page, "Sushi")).toContainText("Chance 60%");
      await expect(item(page, "Ramen")).toContainText("Chance 20%");

      await page.reload();
      await expect(chancesSwitch).toBeChecked();
      await expect(item(page, "Sushi")).toContainText("Chance 60%");
      await expect(item(page, "Sushi")).toContainText("Weight ×3");
    });
  });
}

test("a weight can be set with the keyboard alone", async ({ page }) => {
  await openWithStorage(page, lunch, "/lists/lunch");

  await page.getByRole("button", { name: "Edit “Pho”" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Item text" })).toBeFocused();
  await page.keyboard.press("Tab");
  const weight = page.getByRole("spinbutton", { name: "Weight" });
  await expect(weight).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(weight).toHaveAttribute("aria-valuetext", "×2");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "Edit “Pho”" })).toBeFocused();
  await expect(item(page, "Pho")).toContainText("Weight ×2");
  // The switch is reached with Tab and toggled with Space.
  await page.getByRole("switch", { name: "Show chances" }).focus();
  await page.keyboard.press("Space");
  await expect(item(page, "Pho")).toContainText("Chance 50%");
});
