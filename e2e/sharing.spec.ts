import { deflateRawSync } from "node:zlib";
import { expect, type Page, type Request, test } from "@playwright/test";
import {
  captureReports,
  openWithStorage,
  production,
  recordClipboard,
  serveProductionLocally,
  sharedFragment,
  storageKey,
  storedState,
} from "./support.ts";

const lunch = storedState([
  {
    id: "lunch",
    name: "Lunch",
    items: ["Ramen", "Sushi", "Pho"],
    weights: [1, 3, 1],
  },
]);

async function copyShareLink(page: Page): Promise<string> {
  const copied = await recordClipboard(page);
  await openWithStorage(page, lunch, "/lists/lunch");
  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("menuitem", { name: "Share" }).click();
  const dialog = page.getByRole("dialog", { name: "Share “Lunch”" });
  await expect(dialog).toContainText(
    "Anyone with the link can see the list name and items.",
  );
  await dialog.getByRole("button", { name: "Copy link" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Copied the link.").first()).toBeVisible();
  const [link] = await copied();
  if (!link) throw new Error("Nothing was copied");
  return link;
}

test("a copied link opens the list read-only, and adding it opens a copy in place of the link", async ({
  page,
  browser,
}) => {
  const link = await copyShareLink(page);
  expect(link).toMatch(
    /^http:\/\/127\.0\.0\.1:4173\/shared#1\.[A-Za-z0-9_-]+$/,
  );

  // The recipient: another browser profile with no lists.
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.goto("/");
  await recipient.goto(link);
  await expect(
    recipient.getByRole("heading", { level: 1, name: "Shared list" }),
  ).toBeVisible();
  await expect(recipient).toHaveTitle("Shared list – Argmax");
  await expect(recipient.getByRole("heading", { level: 2 })).toHaveText(
    "Lunch",
  );
  await expect(recipient.getByRole("listitem")).toHaveText([
    "PhoChance 20%",
    "SushiChance 60%Weight ×3",
    "RamenChance 20%",
  ]);
  expect(
    await recipient.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();

  await recipient.getByRole("button", { name: "Add this list" }).click();
  await expect(recipient).toHaveURL(/\/lists\/[0-9a-f-]{36}$/);
  expect(await recipient.evaluate(() => window.location.hash)).toBe("");
  await expect(recipient.getByText("Added “Lunch”.").first()).toBeVisible();
  await expect(recipient.getByRole("heading", { level: 1 })).toHaveText(
    "Lunch",
  );
  await expect(recipient.getByText("Weight ×3")).toBeVisible();

  // Back skips the link, whose history entry the list replaced.
  await recipient.goBack();
  await expect(recipient).toHaveURL("http://127.0.0.1:4173/");
  expect(await recipient.evaluate(() => window.location.hash)).toBe("");
  await expect(recipient.getByRole("link", { name: /Lunch/ })).toBeVisible();
  await context.close();
});

test.describe("on the production address", () => {
  test.use({ baseURL: production, reducedMotion: "reduce" });

  test("no request carries the fragment or the list, and reports hold fixed values only", async ({
    page,
  }) => {
    await serveProductionLocally(page);
    const reports = await captureReports(page);
    const requests: Request[] = [];
    page.on("request", (request) => requests.push(request));
    const secret = storedState([
      { id: "secret", name: "Secret lunch", items: ["Secret ramen"] },
    ]);
    const copied = await recordClipboard(page);

    await openWithStorage(page, secret, "/lists/secret");
    await page.getByRole("button", { name: "List actions" }).click();
    await page.getByRole("menuitem", { name: "Share" }).click();
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByText("Copied the link.").first()).toBeVisible();
    const [link] = await copied();
    if (!link) throw new Error("Nothing was copied");
    const data = link.slice(link.indexOf("#") + 3);
    expect(data.length).toBeGreaterThan(10);

    // A new visit through the link: view, a footer link and back, then add.
    await page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await page.goto(link);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Secret lunch",
    );
    await page.getByRole("link", { name: "Privacy policy" }).click();
    await expect(
      page.getByRole("heading", { name: "Privacy policy" }),
    ).toBeVisible();
    await page.goBack();
    await page.getByRole("button", { name: "Add this list" }).click();
    await expect(page.getByText("Added “Secret lunch”.").first()).toBeVisible();
    await page.getByRole("link", { name: "Licenses" }).click();
    await page.waitForLoadState();

    expect(requests.length).toBeGreaterThan(5);
    for (const request of requests) {
      const sent = [
        request.url(),
        request.postData() ?? "",
        ...Object.values(await request.allHeaders()),
      ].join("\n");
      expect(sent, request.url()).not.toContain(data.slice(0, 16));
      expect(sent, request.url()).not.toContain("Secret");
    }
    expect(reports.map(({ payload }) => payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/lists/:id",
          name: "list_shared",
          data: { method: "copy" },
        }),
        expect.objectContaining({ url: "/shared", title: "Shared list" }),
        expect.objectContaining({
          url: "/shared",
          name: "list_added_from_link",
        }),
      ]),
    );
    const added = reports.find(
      ({ payload }) => payload.name === "list_added_from_link",
    );
    expect(added?.payload).not.toHaveProperty("data");
    expect(JSON.stringify(reports)).not.toContain("Secret");
  });
});

test.describe("on the production address, double-clicking Add", () => {
  test.use({ baseURL: production });

  test("saves the list once and reports it once", async ({ page }) => {
    await serveProductionLocally(page);
    const reports = await captureReports(page);
    await page.goto(`/shared#${sharedFragment("Lunch", [["Ramen", 1]])}`);

    await page.getByRole("button", { name: "Add this list" }).dblclick();
    await expect(page).toHaveURL(/\/lists\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Added “Lunch”.").first()).toBeVisible();

    const lists = await page.evaluate(
      (key) =>
        (JSON.parse(localStorage.getItem(key) ?? "{}") as { lists: unknown[] })
          .lists,
      storageKey,
    );
    expect(lists).toHaveLength(1);
    await expect
      .poll(
        () =>
          reports.filter(
            ({ payload }) => payload.name === "list_added_from_link",
          ).length,
      )
      .toBe(1);
    // No second report follows once the page has settled.
    await page.waitForLoadState("networkidle");
    expect(
      reports.filter(({ payload }) => payload.name === "list_added_from_link"),
    ).toHaveLength(1);
  });
});

test("link text renders as text: no markup, scripts, links, or CSP violations", async ({
  page,
}) => {
  const problems: string[] = [];
  page.on("dialog", (dialog) => {
    problems.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  const consoleTexts: string[] = [];
  page.on("console", (message) => consoleTexts.push(message.text()));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective}`,
      );
    });
  });
  const payloads = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "https://evil.example/login",
    "010-1234-5678",
  ];

  await page.goto(
    `/shared#${sharedFragment(
      "<b>Bold</b>",
      payloads.map((text) => [text, 1]),
    )}`,
  );
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    "<b>Bold</b>",
  );
  for (const text of payloads)
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Shared list – Argmax");
  expect(await page.locator("main img, main script, main b").count()).toBe(0);
  const hrefs = await page
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(
    hrefs.filter((href) => /evil|javascript|tel:/.test(href ?? "")),
  ).toEqual([]);

  // A broken link logs only a fixed reason.
  const broken = sharedFragment("Secret lunch", [["Secret ramen", 1]]);
  await page.goto(`/shared#${broken.slice(0, -5)}`);
  await expect(
    page.getByRole("heading", { name: "This link can’t be opened" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("This link can’t be opened – Argmax");

  expect(problems).toEqual([]);
  expect(consoleTexts.filter((text) => /Content Security/.test(text))).toEqual(
    [],
  );
  const logged = consoleTexts.join("\n");
  for (const text of [...payloads, "Bold", "Secret", broken.slice(2, 18)])
    expect(logged).not.toContain(text);
});

test("a deflate bomb under the fragment cap is stopped in small steps", async ({
  page,
}) => {
  // 40 MB of zeros compress to about 40 KB, under the 64 KB fragment cap.
  const fragment = `1.${deflateRawSync(Buffer.alloc(40 * 1024 * 1024)).toString("base64url")}`;
  expect(fragment.length).toBeLessThan(64 * 1024);
  await page.addInitScript(() => {
    const Original = DecompressionStream;
    const seen = { input: 0, largestOutput: 0 };
    Object.defineProperty(window, "decompression", { value: seen });
    // Records how much input the decompressor takes and the largest piece of
    // output it hands back, without changing what it does.
    window.DecompressionStream = class {
      readable: ReadableStream<Uint8Array<ArrayBuffer>>;
      writable: WritableStream<Uint8Array<ArrayBuffer>>;
      constructor(format: CompressionFormat) {
        const inner = new Original(format);
        const writer = inner.writable.getWriter();
        this.writable = new WritableStream<Uint8Array<ArrayBuffer>>({
          write(chunk) {
            seen.input += chunk.length;
            return writer.write(chunk);
          },
          close: () => writer.close(),
          abort: (reason) => writer.abort(reason),
        });
        this.readable = inner.readable.pipeThrough(
          new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>(
            {
              transform(chunk, controller) {
                seen.largestOutput = Math.max(seen.largestOutput, chunk.length);
                controller.enqueue(chunk);
              },
            },
          ),
        );
      }
    };
  });

  await page.goto(`/shared#${fragment}`);
  await expect(
    page.getByRole("heading", { name: "This link can’t be opened" }),
  ).toBeVisible();
  const seen = await page.evaluate(
    () =>
      Reflect.get(window, "decompression") as {
        input: number;
        largestOutput: number;
      },
  );
  const compressedBytes = (fragment.length - 2) * 0.75;
  // Measured: about 2 KB of input; output pieces of 16 to 264 KB.
  expect(seen.input).toBeLessThan(compressedBytes / 4);
  expect(seen.largestOutput).toBeLessThan(1024 * 1024);
});

test("in a messenger's in-app browser, Copy link copies this page's link", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.8.1",
  });
  const page = await context.newPage();
  const copied = await recordClipboard(page);
  await page.goto(`/shared#${sharedFragment("Lunch", [["Ramen", 1]])}`);

  await expect(
    page.getByText(
      "Lists added in this app don’t show in your phone’s browser",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Copied the link.")).toBeVisible();
  expect(await copied()).toEqual([page.url()]);
  await context.close();
});

test("a link from a newer version asks to reload", async ({ page }) => {
  const fragment = sharedFragment("Lunch", [["Ramen", 1]]);
  await page.goto(`/shared#2${fragment.slice(1)}`);
  await expect(
    page.getByRole("heading", { name: "This link needs a newer version" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(
    page.getByRole("heading", { name: "This link needs a newer version" }),
  ).toBeVisible();
});

test("at 360 px, text with stacked marks is clipped to its own row, clear of the controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  // 15 marks on each letter stay under the 1,600-unit cap, so none are
  // dropped. The test browsers' fonts draw such marks on top of one another,
  // so no pixels would show an overlap here; with fonts that stack them (as
  // on many phones) a character can tower over its neighbors. The test
  // checks the guard instead: every piece of link text clips its drawing to
  // its own box, and that box stays inside its row.
  const zalgo = Array.from(
    { length: 40 },
    () => `z${"\u0301\u0316\u0336".repeat(5)}`,
  ).join("");
  await page.goto(
    `/shared#${sharedFragment(zalgo, [
      ["Ramen", 1],
      [zalgo, 2],
      ["Sushi", 1],
    ])}`,
  );
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(3);

  const texts = [
    page.getByRole("heading", { level: 2 }),
    ...(await rows.all()).map((row) => row.locator("span").first()),
  ];
  for (const text of texts) {
    expect(
      await text.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.overflowX, style.overflowY];
      }),
    ).toEqual(["clip", "clip"]);
  }
  const middle = rows.nth(1);
  const row = await middle.boundingBox();
  const text = await middle.locator("span").first().boundingBox();
  const badge = await middle.getByText("×2").boundingBox();
  if (!row || !text || !badge) throw new Error("Row not laid out");
  expect(text.y).toBeGreaterThanOrEqual(row.y);
  expect(text.y + text.height).toBeLessThanOrEqual(row.y + row.height);
  // The text ends before the weight badge starts.
  expect(text.x + text.width).toBeLessThanOrEqual(badge.x);

  // The fixed bar is opaque and stacked above the rows that scroll under it.
  const bar = page.getByRole("button", { name: "Add this list" }).locator("..");
  expect(
    await bar.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.position,
        style.backgroundColor.includes("/") ? "translucent" : "opaque",
        Number(style.zIndex) > 0,
      ];
    }),
  ).toEqual(["fixed", "opaque", true]);
});

test("two tabs open on shared links both keep their lists when both are added", async ({
  context,
}) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto(`/shared#${sharedFragment("From A", [["Ramen", 1]])}`);
  await b.goto(`/shared#${sharedFragment("From B", [["Sushi", 2]])}`);
  const addA = a.getByRole("button", { name: "Add this list" });
  const addB = b.getByRole("button", { name: "Add this list" });
  await expect(addA).toBeVisible();
  await expect(addB).toBeVisible();

  // One right after the other, as fast as a person can switch tabs; B's
  // change starts from the stored state, which already holds A's list.
  // (Two writes within the same few milliseconds are a documented limit of
  // ListsProvider, which no person can trigger.)
  await addA.click();
  await addB.click();
  await expect(a.getByRole("heading", { level: 1 })).toHaveText("From A");
  await expect(b.getByRole("heading", { level: 1 })).toHaveText("From B");

  await a.goto("/");
  await expect(a.getByRole("link", { name: /From/ })).toHaveText([
    /From B|From A/,
    /From B|From A/,
  ]);
  const names = await a.evaluate(
    (key) =>
      (
        JSON.parse(localStorage.getItem(key) ?? "{}") as {
          lists: { name: string }[];
        }
      ).lists.map((list) => list.name),
    storageKey,
  );
  expect(names.sort()).toEqual(["From A", "From B"]);
});
