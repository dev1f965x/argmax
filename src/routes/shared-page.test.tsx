import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { tracker } from "@/lib/analytics";
import { encodeSharedList, type SharedList } from "@/lib/share-link";
import { limits, storageKey } from "@/lib/storage";
import { renderApp, storedState } from "@/test/fixtures";

const lunch: SharedList = {
  name: "Lunch",
  // Stored order, oldest first; the screen shows newest first.
  items: [
    { text: "Ramen", weight: 1 },
    { text: "Sushi", weight: 3 },
  ],
};

async function openLink(
  list: SharedList,
  options: { stored?: string; history?: string[] } = {},
) {
  const fragment = (await encodeSharedList(list)).fragment;
  const rendered = renderApp({
    path: `/shared#${fragment}`,
    history: options.history ?? ["/"],
    stored: options.stored,
  });
  return { ...rendered, fragment };
}

// Decoding is asynchronous, and the first render of a test file is slow on
// a busy machine.
const addButton = () =>
  screen.findByRole("button", { name: "Add this list" }, { timeout: 5_000 });

afterEach(async () => {
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
});

describe("SharedPage", () => {
  it("shows the list read-only, newest first, with weights and chances, and saves nothing", async () => {
    const { data } = await openLink(lunch);

    expect(await addButton()).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Shared list" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Lunch" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(
      screen.getAllByText("Made by the sender. Saved only when you add it."),
    ).not.toHaveLength(0);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "SushiChance 75%Weight ×3",
      "RamenChance 25%",
    ]);
    // Read-only: no edit or remove controls in the rows.
    expect(within(screen.getByRole("list")).queryAllByRole("button")).toEqual(
      [],
    );
    expect(data.has(storageKey)).toBe(false);
  });

  it("hides chances when every weight is 1", async () => {
    await openLink({
      name: "Lunch",
      items: [
        { text: "Ramen", weight: 1 },
        { text: "Sushi", weight: 1 },
      ],
    });
    await addButton();
    expect(screen.queryByText(/Chance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it("moves focus to its heading after a navigation, once the link is read", async () => {
    const fragment = (await encodeSharedList(lunch)).fragment;
    const { router } = renderApp({ path: "/privacy" });

    await act(() => router.navigate(`/shared#${fragment}`));

    expect(await addButton()).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Shared list" }),
      ).toHaveFocus(),
    );
  });

  it("leaves out the footer on phones only while the list and its bar are shown", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await openLink(lunch);
    await addButton();
    await waitFor(() =>
      expect(screen.getByRole("contentinfo")).toHaveClass("hidden"),
    );

    renderApp({ path: "/shared#1.AAAA" });
    await screen.findByRole("heading", { name: "This link can’t be opened" });
    const footers = screen.getAllByRole("contentinfo");
    expect(footers.at(-1)).not.toHaveClass("hidden");
  });

  it("keeps the document title fixed and never names the list in it", async () => {
    await openLink({ name: "Secret plans", items: [] });
    await addButton();
    expect(document.title).toBe("Shared list – Argmax");
  });

  it("adds a copy, opens it in place of the link, and confirms it without Undo", async () => {
    const existing = storedState([
      { id: "dinner", name: "Lunch", items: ["Pasta"] },
    ]);
    const listAdded = vi.spyOn(tracker, "listAddedFromLink");
    const { user, router, data } = await openLink(lunch, {
      stored: existing,
      history: ["/", "/privacy"],
    });

    await user.click(await addButton());

    const saved = JSON.parse(data.get(storageKey) ?? "");
    // The existing list with the same name is untouched, and the copy is separate.
    expect(JSON.stringify(saved.lists[0])).toBe(
      JSON.stringify(JSON.parse(existing).lists[0]),
    );
    expect(saved.lists).toHaveLength(2);
    const added = saved.lists[1];
    expect(added).toMatchObject({
      name: "Lunch",
      items: [
        { text: "Ramen", weight: 1 },
        { text: "Sushi", weight: 3 },
      ],
    });
    expect(added.id).not.toBe("dinner");

    expect(router.state.location.pathname).toBe(`/lists/${added.id}`);
    expect(router.state.location.hash).toBe("");
    expect(router.state.historyAction).toBe("REPLACE");
    // Shown in the snackbar and announced through the live region.
    expect(screen.getAllByText("Added “Lunch”.")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Added “Lunch”.");
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(listAdded).toHaveBeenCalledExactlyOnceWith();

    // Back skips the link: its history entry was replaced.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/privacy");
    expect(router.state.location.hash).toBe("");
  });

  it("adds a list with no items", async () => {
    const { user, data } = await openLink({ name: "Empty", items: [] });
    expect(await screen.findByText("0 items")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(await addButton());
    expect(JSON.parse(data.get(storageKey) ?? "").lists).toMatchObject([
      { name: "Empty", items: [] },
    ]);
  });

  it("does not add a 101st list and says why", async () => {
    const full = storedState(
      Array.from({ length: limits.lists }, (_, index) => ({
        id: `list-${index}`,
        name: `List ${index}`,
      })),
    );
    const { user, data, router } = await openLink(lunch, { stored: full });

    const button = await addButton();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(
      "You have 100 lists, the maximum. Delete one to add this list.",
    );
    await user.click(button);
    expect(data.get(storageKey)).toBe(full);
    expect(router.state.location.pathname).toBe("/shared");
  });

  it("renders link text as plain text, never as links", async () => {
    const payloads = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "javascript:alert(1)",
      "https://evil.example/login",
      "010-1234-5678",
    ];
    await openLink({
      name: "https://evil.example",
      items: payloads.map((text) => ({ text, weight: 1 })),
    });
    await addButton();

    for (const text of payloads)
      expect(screen.getByText(text).tagName).toBe("SPAN");
    // The only link on the screen is All lists (plus the header and footer).
    const hrefs = Array.from(document.querySelectorAll("a"), (link) =>
      link.getAttribute("href"),
    );
    expect(hrefs.some((href) => href?.includes("evil"))).toBe(false);
    expect(hrefs.some((href) => href?.startsWith("javascript"))).toBe(false);
    expect(document.querySelector("img, script:not([src])")).toBeNull();
  });

  it("explains a broken link without logging its content", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { fragment } = await openLink(lunch);
    // Cut off, as a messenger might.
    const cut = fragment.slice(0, -6);
    const { router } = renderApp({ path: `/shared#${cut}` });

    expect(
      await screen.findByRole("heading", { name: "This link can’t be opened" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It may have been cut off when it was sent. Ask the sender to share it again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to lists" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(router.state.location.pathname).toBe("/shared");
    expect(warn).toHaveBeenCalled();
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(cut.slice(2, 12));
    expect(logged).not.toContain("Ramen");
  });

  it("shows the broken-link message without a fragment", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    renderApp({ path: "/shared" });
    expect(
      await screen.findByRole("heading", { name: "This link can’t be opened" }),
    ).toBeInTheDocument();
  });

  it("asks to reload for a link from a newer version", async () => {
    const { fragment } = await openLink(lunch);
    renderApp({ path: `/shared#2${fragment.slice(1)}` });

    expect(
      await screen.findByRole("heading", {
        name: "This link needs a newer version",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reload the page to open it with the latest Argmax."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("is in Korean for a Korean reader, with the fixed title", async () => {
    await i18n.changeLanguage("ko");
    await openLink(lunch);

    expect(
      await screen.findByRole("button", { name: "이 목록 추가" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "공유받은 목록" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("공유받은 목록 – Argmax");
    expect(
      screen.getAllByText("보낸 사람이 만든 목록입니다. 추가해야 저장됩니다."),
    ).not.toHaveLength(0);
  });
});

describe("SharedPage in a messenger's in-app browser", () => {
  const kakao =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.8.1";

  it("suggests opening the link in the phone's browser and copies it", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(kakao);
    const { user, fragment } = await openLink(lunch);
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    await addButton();
    expect(
      screen.getAllByText(
        "Lists added in this app don’t show in your phone’s browser",
      ),
    ).not.toHaveLength(0);
    await user.click(
      screen.getAllByRole("button", { name: "Copy link" })[0] as HTMLElement,
    );

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/shared#${fragment}`,
    );
    expect(await screen.findAllByText("Copied the link.")).not.toHaveLength(0);
  });

  it("shows the link to copy by hand when copying fails", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(kakao);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { user, fragment } = await openLink(lunch);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );

    await addButton();
    await user.click(
      screen.getAllByRole("button", { name: "Copy link" })[0] as HTMLElement,
    );

    expect(
      (await screen.findAllByRole("alert", { hidden: true })).some(
        (alert) =>
          alert.textContent === "Couldn’t copy. Select the link and copy it.",
      ),
    ).toBe(true);
    const fields = screen.getAllByRole("textbox", {
      name: "Link",
      hidden: true,
    });
    for (const field of fields)
      expect(field).toHaveValue(`${window.location.origin}/shared#${fragment}`);
  });

  it("can still add the list", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(kakao);
    const { user, data } = await openLink(lunch);
    await user.click(await addButton());
    await waitFor(() => expect(data.has(storageKey)).toBe(true));
  });

  it("shows no notice in a regular browser", async () => {
    await openLink(lunch);
    await addButton();
    expect(
      screen.queryByText(
        "Lists added in this app don’t show in your phone’s browser",
      ),
    ).not.toBeInTheDocument();
  });
});
