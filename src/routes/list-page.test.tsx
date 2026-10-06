import {
  getDefaultNormalizer,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { showChancesStorageKey } from "@/lib/preferences";
import { limits, storageKey } from "@/lib/storage";
import { renderApp, storedState } from "@/test/fixtures";

// These take about 2 s alone in jsdom (1,000 rows) and exceeded the 5 s default
// on a busy machine; 10 s keeps headroom without hiding a real slowdown.
const fullList = { timeout: 10_000 };

function renderList(
  items: string[],
  path = "/lists/lunch",
  history: string[] = [],
) {
  const { user, router, data } = renderApp({
    path,
    history,
    stored: storedState([{ id: "lunch", name: "Lunch", items }]),
  });
  const storedLists = () =>
    JSON.parse(data.get(storageKey) ?? "").lists as {
      name: string;
    }[];
  const storedItems = () =>
    JSON.parse(data.get(storageKey) ?? "").lists[0].items.map(
      (item: { text: string }) => item.text,
    );
  return { user, storedItems, storedLists, router };
}

const addField = () => screen.getByRole("textbox", { name: "New item" });
const rows = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((row) => row.textContent);

describe("ListPage", () => {
  it.each([
    ["picking", "Pick"],
    ["opening the list menu", "List actions"],
    ["editing a row", "Edit “B”"],
  ])("ends the Undo offer on %s", async (_, name) => {
    const { user } = renderList(["A", "B", "C"]);

    await user.click(screen.getByRole("button", { name: "Remove “A”" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name }));

    // The menu opens after the click event, not within it.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Undo" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("offers Undo after removing an item until the next change", async () => {
    const { user, storedItems } = renderList(["A", "B", "C"]);

    await user.click(screen.getByRole("button", { name: "Remove “A”" }));
    expect(storedItems()).toEqual(["B", "C"]);
    await user.click(screen.getByRole("button", { name: "Undo" }));

    // Back in its place (shown newest first), with focus on its Edit button.
    expect(rows()).toEqual(["C", "B", "A"]);
    expect(storedItems()).toEqual(["A", "B", "C"]);
    expect(screen.getByRole("button", { name: "Edit “A”" })).toHaveFocus();
    expect(screen.getByText("Restored “A”.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove “A”" }));
    await user.type(addField(), "D{Enter}");
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
  });

  it("restores a removed item's weight with Undo", async () => {
    const { user, data } = renderApp({
      path: "/lists/lunch",
      stored: storedState([
        { id: "lunch", name: "Lunch", items: ["A", "B"], weights: [3, 2] },
      ]),
    });
    const weights = () =>
      JSON.parse(data.get(storageKey) ?? "").lists[0].items.map(
        (item: { text: string; weight: number }) => [item.text, item.weight],
      );

    await user.click(screen.getByRole("button", { name: "Remove “A”" }));
    expect(weights()).toEqual([["B", 2]]);
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(weights()).toEqual([
      ["A", 3],
      ["B", 2],
    ]);
  });

  it("shows the list name and item count, and no list while it is empty", () => {
    renderList([]);

    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the not found page for an unknown list", () => {
    renderList([], "/lists/missing");
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("adds a trimmed item first, allows duplicates, and announces it", async () => {
    const { user, storedItems } = renderList(["Ramen"]);

    await user.type(addField(), "  Sushi {Enter}");
    await user.type(addField(), "Sushi{Enter}");

    expect(rows()).toEqual(["Sushi", "Sushi", "Ramen"]);
    expect(storedItems()).toEqual(["Ramen", "Sushi", "Sushi"]);
    expect(addField()).toHaveValue("");
    expect(addField()).toHaveFocus();
    expect(screen.getByText("Added “Sushi”.")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it.each([
    ["an empty item", "{Enter}", "Enter an item."],
    ["a whitespace-only item", "   {Enter}", "Enter an item."],
    [
      "an item over 100 characters",
      `${"x".repeat(limits.textLength + 1)}{Enter}`,
      "Use 100 characters or fewer.",
    ],
  ])("rejects %s with a message", async (_, keys, message) => {
    const { user, storedItems } = renderList(["Ramen"]);

    await user.type(addField(), keys);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(addField()).toHaveAccessibleDescription(message);
    expect(storedItems()).toEqual(["Ramen"]);
  });

  it(
    "replaces the add field with a message at the item limit",
    fullList,
    () => {
      renderList(
        Array.from({ length: limits.itemsPerList }, (_, index) => `${index}`),
      );

      expect(
        screen.queryByRole("textbox", { name: "New item" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "This list has 1,000 items, the maximum. Remove an item to add another.",
        ),
      ).toBeInTheDocument();
    },
  );

  it("edits an item with the keyboard and returns focus to its Edit button", async () => {
    const { user, storedItems } = renderList(["Ramen", "Sushi"]);

    screen.getByRole("button", { name: "Edit “Ramen”" }).focus();
    await user.keyboard("{Enter}");
    const field = screen.getByRole("textbox", { name: "Item text" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue("Ramen");

    await user.keyboard("{Control>}a{/Control}Udon{Enter}");

    expect(storedItems()).toEqual(["Udon", "Sushi"]);
    expect(screen.getByRole("button", { name: "Edit “Udon”" })).toHaveFocus();
    expect(screen.getByText("Saved “Udon”.")).toBeInTheDocument();
  });

  it("announces pasted text as saved, with a tab as a space", async () => {
    // The default matcher would collapse a tab into a space.
    const exact = {
      normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
    };
    const { user, storedItems, storedLists } = renderList(["Ramen"]);

    await user.click(addField());
    await user.paste("Fried\trice");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Added “Fried rice”.", exact)).toBeInTheDocument();

    screen.getByRole("button", { name: "Edit “Ramen”" }).focus();
    await user.keyboard("{Enter}{Control>}a{/Control}");
    await user.paste("Ramen\tbowl");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Saved “Ramen bowl”.", exact)).toBeInTheDocument();
    expect(storedItems()).toEqual(["Ramen bowl", "Fried rice"]);

    screen.getByRole("button", { name: "List actions" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    await user.keyboard("{Control>}a{/Control}");
    await user.paste("Late\tlunch");
    await user.keyboard("{Enter}");
    expect(
      screen.getByText("Renamed the list to “Late lunch”.", exact),
    ).toBeInTheDocument();
    expect(storedLists()[0]?.name).toBe("Late lunch");
  });

  it("cancels an edit with Escape without changing the item", async () => {
    const { user, storedItems } = renderList(["Ramen"]);

    await user.click(screen.getByRole("button", { name: "Edit “Ramen”" }));
    await user.keyboard("{Control>}a{/Control}Udon{Escape}");

    expect(storedItems()).toEqual(["Ramen"]);
    expect(screen.getByRole("button", { name: "Edit “Ramen”" })).toHaveFocus();
  });

  it("keeps the edit open with a message for an over-long item", async () => {
    const { user, storedItems } = renderList(["Ramen"]);

    await user.click(screen.getByRole("button", { name: "Edit “Ramen”" }));
    await user.type(
      screen.getByRole("textbox", { name: "Item text" }),
      `${"x".repeat(limits.textLength)}{Enter}`,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 100 characters or fewer.",
    );
    expect(screen.getByRole("textbox", { name: "Item text" })).toBeVisible();
    expect(storedItems()).toEqual(["Ramen"]);
  });

  it("after a removal, focuses the next row's Edit button, then the add field", async () => {
    const { user, storedItems } = renderList(["Ramen", "Sushi"]);

    // Newest first: Sushi is shown above Ramen.
    await user.click(screen.getByRole("button", { name: "Remove “Sushi”" }));
    expect(storedItems()).toEqual(["Ramen"]);
    // Announced, and shown next to Undo.
    expect(screen.getAllByText("Removed “Sushi”.")).toHaveLength(2);
    // Edit, not Remove, so pressing Enter again cannot remove another item.
    expect(screen.getByRole("button", { name: "Edit “Ramen”" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove “Ramen”" }));
    expect(storedItems()).toEqual([]);
    expect(addField()).toHaveFocus();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("focuses the previous row after removing the bottom row", async () => {
    const { user } = renderList(["Ramen", "Sushi"]);

    await user.click(screen.getByRole("button", { name: "Remove “Ramen”" }));

    expect(screen.getByRole("button", { name: "Edit “Sushi”" })).toHaveFocus();
  });

  it("skips a row being edited when moving focus after a removal", async () => {
    // Shown newest first: C, B, A.
    const { user } = renderList(["A", "B", "C"]);

    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    await user.click(screen.getByRole("button", { name: "Remove “C”" }));

    expect(screen.getByRole("button", { name: "Edit “A”" })).toHaveFocus();
  });

  it(
    "moves focus to the limit message when the last allowed item is added",
    fullList,
    async () => {
      const { user } = renderList(
        Array.from(
          { length: limits.itemsPerList - 1 },
          (_, index) => `${index}`,
        ),
      );

      await user.type(addField(), "Last{Enter}");

      expect(
        screen.getByText(/^This list has 1,000 items/, { selector: "p" }),
      ).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Added “Last”. This list has 1,000 items, the maximum.",
      );
    },
  );

  it("announces a repeated error and a repeated addition again", async () => {
    const { user } = renderList([]);

    await user.type(addField(), "{Enter}");
    const firstAlert = screen.getByRole("alert");
    await user.type(addField(), "{Enter}");
    expect(screen.getByRole("alert")).not.toBe(firstAlert);

    await user.type(addField(), "Ramen{Enter}");
    const firstMessage = screen.getByText("Added “Ramen”.");
    await user.type(addField(), "Ramen{Enter}");
    // A new element is what makes screen readers read the same text again.
    expect(screen.getByText("Added “Ramen”.")).not.toBe(firstMessage);
  });

  describe("list actions", () => {
    const actions = () => screen.getByRole("button", { name: "List actions" });

    it("renames the list with the keyboard and returns focus to List actions", async () => {
      const { user, storedLists } = renderList(["Ramen"]);

      actions().focus();
      await user.keyboard("{Enter}");
      await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
      const field = screen.getByRole("textbox", { name: "Rename" });
      expect(field).toHaveFocus();
      expect(field).toHaveValue("Lunch");

      await user.keyboard("{Control>}a{/Control}  Dinner {Enter}");

      expect(storedLists()[0]?.name).toBe("Dinner");
      expect(screen.getByRole("heading", { name: "Dinner" })).toBeVisible();
      expect(actions()).toHaveFocus();
      expect(
        screen.getByText("Renamed the list to “Dinner”."),
      ).toBeInTheDocument();
    });

    it("rejects an empty name and cancels with Escape", async () => {
      const { user, storedLists } = renderList([]);

      await user.click(actions());
      await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
      await user.keyboard("{Control>}a{/Control}{Backspace}{Enter}");
      expect(screen.getByRole("alert")).toHaveTextContent("Enter a list name.");
      // The page keeps its heading while the title is a field.
      expect(
        screen.getByRole("heading", { name: "Lunch" }),
      ).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(storedLists()[0]?.name).toBe("Lunch");
      expect(actions()).toHaveFocus();
    });

    it("asks before deleting, stating the item count, and keeps the list on Cancel", async () => {
      const { user, storedLists } = renderList(["Ramen", "Sushi"]);

      await user.click(actions());
      await user.click(
        await screen.findByRole("menuitem", { name: "Delete list" }),
      );
      const dialog = await screen.findByRole("alertdialog", {
        name: "Delete “Lunch”?",
      });
      expect(dialog).toHaveTextContent(
        "This also deletes 2 items. You can’t undo this.",
      );

      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(storedLists()).toHaveLength(1);
      await waitFor(() => expect(actions()).toHaveFocus());
    });

    it("deletes the list, returns to the Lists screen, and confirms with focus", async () => {
      const { user, storedLists, router } = renderList([], "/lists/lunch", [
        "/",
      ]);

      await user.click(actions());
      await user.click(
        await screen.findByRole("menuitem", { name: "Delete list" }),
      );
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("You can’t undo this.");
      await user.click(
        within(dialog).getByRole("button", { name: "Delete list" }),
      );

      expect(storedLists()).toEqual([]);
      expect(router.state.location.pathname).toBe("/");
      expect(
        screen.getByRole("heading", { name: "Lists" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Deleted “Lunch”.")).toHaveFocus();
      // The history entry is cleared, so a reload or Back does not repeat it.
      expect(router.state.location.state).toBeNull();

      // The deleted list's entry was replaced, so Back goes to the earlier page.
      await router.navigate(-1);
      expect(router.state.location.pathname).toBe("/");
    });
  });
});

describe("ListPage weights", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function renderWeighted(items: string[], weights: number[]) {
    const { user, data } = renderApp({
      path: "/lists/lunch",
      stored: storedState([{ id: "lunch", name: "Lunch", items, weights }]),
    });
    const stored = () =>
      (
        JSON.parse(data.get(storageKey) ?? "").lists[0].items as {
          text: string;
          weight: number;
        }[]
      ).map((item) => [item.text, item.weight]);
    return { user, stored };
  }

  const weightField = () => screen.getByRole("spinbutton", { name: "Weight" });
  const decrease = () =>
    screen.getByRole("button", { name: "Decrease weight" });
  const increase = () =>
    screen.getByRole("button", { name: "Increase weight" });
  const row = (text: string) =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .find((item) =>
        item.firstElementChild?.firstElementChild?.textContent?.startsWith(
          text,
        ),
      );

  it("raises a weight with + and saves it with the text in one change", async () => {
    const { user, stored } = renderWeighted(["A", "B", "C"], [1, 1, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    expect(screen.getByRole("group", { name: "Weight" })).toContainElement(
      weightField(),
    );
    expect(weightField()).toHaveAttribute("aria-valuetext", "×1");
    await user.click(increase());
    await user.click(increase());
    expect(weightField()).toHaveAttribute("aria-valuetext", "×3");
    await user.click(screen.getByRole("textbox", { name: "Item text" }));
    await user.keyboard("{Control>}a{/Control}Udon");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(stored()).toEqual([
      ["A", 1],
      ["Udon", 3],
      ["C", 1],
    ]);
    // One announcement names both changes.
    expect(
      screen.getByText("Saved “Udon” with weight ×3."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Saved “Udon”.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit “Udon”" })).toHaveFocus();
  });

  it("lowers a weight with the arrow keys and saves with Enter", async () => {
    const { user, stored } = renderWeighted(["A", "B", "C"], [1, 3, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    await user.click(weightField());
    await user.keyboard("{ArrowDown}");
    expect(weightField()).toHaveAttribute("aria-valuetext", "×2");
    await user.keyboard("{Enter}");

    expect(stored()).toEqual([
      ["A", 1],
      ["B", 2],
      ["C", 1],
    ]);
    expect(screen.getByText("Saved “B” with weight ×2.")).toBeInTheDocument();
  });

  it("keeps the weight between 1 and the item count", async () => {
    const { user } = renderWeighted(["A", "B", "C"], [1, 1, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “A”" }));
    expect(weightField()).toHaveAttribute("aria-valuemin", "1");
    expect(weightField()).toHaveAttribute("aria-valuemax", "3");
    expect(decrease()).toBeDisabled();
    expect(increase()).toBeEnabled();

    await user.click(increase());
    await user.click(increase());
    expect(weightField()).toHaveAttribute("aria-valuetext", "×3");
    expect(increase()).toBeDisabled();
    expect(decrease()).toBeEnabled();

    // Typed values are clamped to the range when the field is left.
    await user.clear(weightField());
    await user.type(weightField(), "9");
    await user.tab();
    expect(weightField()).toHaveAttribute("aria-valuetext", "×3");
  });

  it("shows a weight above the item count and only lets it be lowered", async () => {
    // Left by removing items: 5 is above the 2 items now in the list.
    const { user, stored } = renderWeighted(["A", "B"], [5, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “A”" }));
    expect(weightField()).toHaveAttribute("aria-valuetext", "×5");
    expect(increase()).toBeDisabled();
    await user.click(decrease());
    expect(weightField()).toHaveAttribute("aria-valuetext", "×4");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(stored()).toEqual([
      ["A", 4],
      ["B", 1],
    ]);
  });

  it("saves text alone without touching a weight above the item count", async () => {
    const { user, stored } = renderWeighted(["A", "B"], [5, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “A”" }));
    await user.keyboard("{Control>}a{/Control}Udon{Enter}");

    expect(stored()).toEqual([
      ["Udon", 5],
      ["B", 1],
    ]);
    expect(screen.getByText("Saved “Udon”.")).toBeInTheDocument();
  });

  it.each([
    ["Cancel", "cancel"],
    ["Escape in the weight field", "escape"],
  ])("discards a changed weight on %s", async (_, how) => {
    const { user, stored } = renderWeighted(["A", "B"], [1, 2]);

    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    await user.click(decrease());
    if (how === "escape") {
      await user.click(weightField());
      await user.keyboard("{Escape}");
    } else {
      await user.click(screen.getByRole("button", { name: "Cancel" }));
    }

    expect(stored()).toEqual([
      ["A", 1],
      ["B", 2],
    ]);
    expect(screen.getByRole("button", { name: "Edit “B”" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    expect(weightField()).toHaveAttribute("aria-valuetext", "×2");
  });

  it("shows the weight field disabled at ×1 when the list has one item", async () => {
    const { user } = renderWeighted(["A"], [1]);

    await user.click(screen.getByRole("button", { name: "Edit “A”" }));
    expect(weightField()).toBeDisabled();
    expect(weightField()).toHaveAttribute("aria-valuetext", "×1");
    expect(decrease()).toBeDisabled();
    expect(increase()).toBeDisabled();
  });

  it("shows a ×N badge, read with its label, only on weights other than 1", () => {
    renderWeighted(["A", "B"], [1, 2]);

    expect(row("B")).toHaveTextContent("BWeight ×2");
    expect(row("A")).toHaveTextContent(/^A$/);
  });

  it("shows chances only after the switch is turned on, and remembers it", async () => {
    const { user } = renderWeighted(["A", "B", "C"], [1, 1, 2]);
    const toggle = screen.getByRole("switch", { name: "Show chances" });

    expect(toggle).not.toBeChecked();
    expect(screen.queryByText(/^Chance/)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(localStorage.getItem(showChancesStorageKey)).toBe("true");
    expect(row("A")).toHaveTextContent("AChance 25%");
    expect(row("B")).toHaveTextContent("BChance 25%");
    expect(row("C")).toHaveTextContent("CChance 50%Weight ×2");

    // The label text also toggles it, as a larger target than the track.
    await user.click(screen.getByText("Show chances"));
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(showChancesStorageKey)).toBe("false");
    expect(screen.queryByText(/^Chance/)).not.toBeInTheDocument();
  });

  it("starts with chances shown when this browser saved the switch on", () => {
    localStorage.setItem(showChancesStorageKey, "true");
    renderWeighted(["A", "B"], [1, 150]);

    expect(screen.getByRole("switch", { name: "Show chances" })).toBeChecked();
    expect(row("A")).toHaveTextContent("AChance <1%");
    expect(row("B")).toHaveTextContent("BChance >99%Weight ×150");
  });

  it("keeps the switch working for this visit when it cannot be saved", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { user } = renderWeighted(["A", "B"], [1, 1]);

    await user.click(screen.getByRole("switch", { name: "Show chances" }));

    expect(screen.getByRole("switch", { name: "Show chances" })).toBeChecked();
    expect(row("A")).toHaveTextContent("AChance 50%");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("names the weight controls and chances in Korean", async () => {
    await i18n.changeLanguage("ko");
    try {
      const { user, stored } = renderWeighted(["A", "B"], [1, 2]);

      await user.click(screen.getByRole("switch", { name: "확률 보기" }));
      expect(row("B")).toHaveTextContent("B확률 67%비중 ×2");
      await user.click(screen.getByRole("button", { name: "“B” 수정" }));
      expect(screen.getByRole("group", { name: "비중" })).toBeInTheDocument();
      const field = screen.getByRole("spinbutton", { name: "뽑힐 비중" });
      expect(field).toHaveAttribute("aria-valuetext", "×2");
      expect(field).not.toHaveAttribute("aria-roledescription");
      expect(
        screen.getByRole("button", { name: "비중 늘리기" }),
      ).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "비중 줄이기" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(stored()).toEqual([
        ["A", 1],
        ["B", 1],
      ]);
      expect(
        screen.getByText("“B” 항목을 저장했습니다. 비중: ×1"),
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("reads 100% only for a single item", () => {
    localStorage.setItem(showChancesStorageKey, "true");
    renderWeighted(["A"], [3]);

    expect(row("A")).toHaveTextContent("AChance 100%Weight ×3");
  });

  it("reads >99% for a near-certain item in Korean too", async () => {
    localStorage.setItem(showChancesStorageKey, "true");
    await i18n.changeLanguage("ko");
    try {
      renderWeighted(["A", "B"], [1, 999]);
      expect(row("A")).toHaveTextContent("A확률 <1%");
      expect(row("B")).toHaveTextContent("B확률 >99%비중 ×999");
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("updates chances when a weight changes", async () => {
    localStorage.setItem(showChancesStorageKey, "true");
    const { user } = renderWeighted(["A", "B"], [1, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “B”" }));
    await user.click(increase());
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(row("A")).toHaveTextContent("AChance 33%");
    expect(row("B")).toHaveTextContent("BChance 67%Weight ×2");
  });
});
