import { expect, test } from "@playwright/test";
import { openApp, stored } from "./app";

const lunch = {
  id: "1",
  name: "점심 메뉴",
  options: [
    { id: "a", name: "국밥" },
    { id: "b", name: "파스타" },
  ],
};

test("a first visit asks for a topic, and takes one", async ({ page }) => {
  await openApp(page);
  await expect(page.getByText("주제가 없습니다")).toBeVisible();

  await page.getByRole("button", { name: "주제 추가" }).click();
  await page.getByLabel("주제 이름").fill("주말 게임");
  await page.getByRole("button", { name: "추가" }).click();

  await expect(page.getByRole("heading", { name: "주말 게임" })).toBeVisible();
  await expect.poll(() => stored(page)).toMatchObject([{ name: "주말 게임", options: [] }]);
});

test("options are added, counted, and picked from", async ({ page }) => {
  await openApp(page, [{ id: "1", name: "점심 메뉴", options: [] }]);

  for (const option of ["국밥", "파스타", "카레"]) {
    await page.getByLabel("후보 이름").fill(option);
    await page.getByRole("button", { name: "추가", exact: true }).click();
  }
  await expect(page.getByText("3개")).toBeVisible();

  await page.getByRole("button", { name: "선택" }).click();

  const result = page.locator(".result");
  await expect(result).toBeVisible();
  await expect(result.locator(".result__name")).toHaveText(/국밥|파스타|카레/);
});

test("topics are kept, and the one last opened comes back", async ({ page }) => {
  await openApp(page, [lunch]);

  await page.reload();

  await expect(page.getByRole("heading", { name: "점심 메뉴" })).toBeVisible();
  await expect(page.getByText("국밥")).toBeVisible();
});

test("a removed topic can be brought back", async ({ page }) => {
  await openApp(page, [lunch]);
  page.on("dialog", (dialog) => dialog.accept());

  await page.getByRole("button", { name: "주제 삭제" }).click();
  await expect(page.getByText("주제가 없습니다")).toBeVisible();

  await page.getByRole("button", { name: "실행 취소" }).click();

  await expect(page.getByRole("heading", { name: "점심 메뉴" })).toBeVisible();
  await expect.poll(() => stored(page)).toMatchObject([{ name: "점심 메뉴" }]);
});

test("two topics keep their own options", async ({ page }) => {
  await openApp(page, [
    lunch,
    { id: "2", name: "주말 게임", options: [{ id: "c", name: "발라트로" }] },
  ]);

  await page.getByRole("button", { name: "주말 게임" }).click();

  await expect(page.getByText("발라트로")).toBeVisible();
  await expect(page.getByText("국밥")).toBeHidden();
});
