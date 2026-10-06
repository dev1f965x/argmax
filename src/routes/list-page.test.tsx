import {
  getDefaultNormalizer,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { tracker } from "@/lib/analytics";
import { showChancesStorageKey } from "@/lib/preferences";
import { decodeSharedList } from "@/lib/share-link";
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
    // The count comes later in the DOM; the heading still leads to it.
    expect(
      screen.getByRole("heading", { name: "Lunch" }),
    ).toHaveAccessibleDescription("0 items");

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
    // Named by its visible label, with no group repeating the name.
    expect(screen.queryByRole("group", { name: "Weight" })).toBeNull();
    await user.click(screen.getByText("Weight"));
    expect(weightField()).toHaveFocus();
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

  it("shows the clamped weight that Save will use after Enter", async () => {
    const { user, stored } = renderWeighted(["A", "B", "C"], [1, 1, 1]);

    await user.click(screen.getByRole("button", { name: "Edit “A”" }));
    // An empty text keeps the editor open, so the weight field stays visible.
    await user.clear(screen.getByRole("textbox", { name: "Item text" }));
    await user.clear(weightField());
    await user.type(weightField(), "10{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter an item.");
    expect(weightField()).toHaveValue("3");
    expect(weightField()).toHaveAttribute("aria-valuetext", "×3");

    await user.type(screen.getByRole("textbox", { name: "Item text" }), "A");
    await user.clear(weightField());
    await user.type(weightField(), "10{Enter}");
    expect(stored()).toEqual([
      ["A", 3],
      ["B", 1],
      ["C", 1],
    ]);
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
    expect(row("B")).toHaveTextContent("BChance >99%");
    expect(row("B")).toHaveTextContent("Weight ×150");
    // The signs are shown, and spelled out for screen readers instead.
    for (const [text, visible, spoken] of [
      ["A", "Chance <1%", "Chance under 1%"],
      ["B", "Chance >99%", "Chance over 99%"],
    ] as const) {
      const cells = within(row(text) ?? document.body);
      expect(cells.getByText(visible)).toHaveAttribute("aria-hidden", "true");
      expect(cells.getByText(spoken)).toHaveClass("sr-only");
    }
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
      // Named by its visible label alone, with no group repeating it.
      expect(screen.queryByRole("group", { name: "비중" })).toBeNull();
      const field = screen.getByRole("spinbutton", { name: "비중" });
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
      expect(row("B")).toHaveTextContent("B확률 >99%");
      expect(
        within(row("A") ?? document.body).getByText("확률 1% 미만"),
      ).toHaveClass("sr-only");
      expect(
        within(row("B") ?? document.body).getByText("확률 99% 초과"),
      ).toHaveClass("sr-only");
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

describe("ListPage sharing", () => {
  const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");
  const originalCanShare = Object.getOwnPropertyDescriptor(
    navigator,
    "canShare",
  );

  afterEach(() => {
    for (const [name, descriptor] of [
      ["share", originalShare],
      ["canShare", originalCanShare],
    ] as const) {
      if (descriptor) Object.defineProperty(navigator, name, descriptor);
      else Reflect.deleteProperty(navigator, name);
    }
    vi.restoreAllMocks();
  });

  /** Gives the browser a share sheet that behaves as `share` says. */
  function withShareSheet(share: (data: ShareData) => Promise<void>) {
    const spy = vi.fn(share);
    Object.defineProperty(navigator, "share", {
      value: spy,
      configurable: true,
    });
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    return spy;
  }

  async function openShareDialog(items = ["Ramen", "Sushi"]) {
    const rendered = renderList(items);
    await rendered.user.click(
      screen.getByRole("button", { name: "List actions" }),
    );
    await rendered.user.click(
      await screen.findByRole("menuitem", { name: "Share" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Share “Lunch”",
    });
    return { ...rendered, dialog };
  }

  it("lists Rename, Share, and Delete list, with Delete list set apart", async () => {
    const { user } = renderList(["Ramen"]);
    await user.click(screen.getByRole("button", { name: "List actions" }));
    const menu = await screen.findByRole("menu");

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Rename", "Share", "Delete list"]);
    const separator = within(menu).getByRole("separator");
    expect(
      separator.compareDocumentPosition(
        within(menu).getByRole("menuitem", { name: "Delete list" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("says that anyone with the link can see the list", async () => {
    const { dialog } = await openShareDialog();
    expect(dialog).toHaveAccessibleDescription(
      "Anyone with the link can see the list name and items. Later changes aren’t included.",
    );
    expect(
      within(dialog).queryByText(
        "This link is long, so some messengers may cut it off.",
      ),
    ).not.toBeInTheDocument();
  });

  it("hands only the link and the list name to the share sheet", async () => {
    const share = withShareSheet(() => Promise.resolve());
    const listShared = vi.spyOn(tracker, "listShared");
    const { user, dialog } = await openShareDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Share link" }),
    );

    expect(share).toHaveBeenCalledOnce();
    const data = share.mock.calls[0]?.[0];
    expect(Object.keys(data ?? {}).sort()).toEqual(["title", "url"]);
    expect(data?.title).toBe("Lunch");
    const url = new URL(data?.url ?? "");
    expect(url.pathname).toBe("/shared");
    expect(await decodeSharedList(url.hash.slice(1))).toEqual({
      status: "ok",
      list: {
        name: "Lunch",
        items: [
          { text: "Ramen", weight: 1 },
          { text: "Sushi", weight: 1 },
        ],
      },
    });
    expect(listShared).toHaveBeenCalledExactlyOnceWith("share");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Copied the link.")).not.toBeInTheDocument();
  });

  it("treats a closed share sheet as a cancel: no copy, no message, no event", async () => {
    withShareSheet(() =>
      Promise.reject(new DOMException("Share canceled", "AbortError")),
    );
    const listShared = vi.spyOn(tracker, "listShared");
    const { user, dialog } = await openShareDialog();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    await user.click(
      within(dialog).getByRole("button", { name: "Share link" }),
    );

    expect(writeText).not.toHaveBeenCalled();
    expect(listShared).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("copies the link when the share sheet fails for another reason", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    withShareSheet(() =>
      Promise.reject(new DOMException("Not allowed", "NotAllowedError")),
    );
    const listShared = vi.spyOn(tracker, "listShared");
    const { user, dialog } = await openShareDialog();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    await user.click(
      within(dialog).getByRole("button", { name: "Share link" }),
    );

    expect(writeText).toHaveBeenCalledOnce();
    expect(listShared).toHaveBeenCalledExactlyOnceWith("copy");
  });

  it("copies the link without a share sheet and confirms it in a snackbar", async () => {
    const listShared = vi.spyOn(tracker, "listShared");
    const { user, dialog } = await openShareDialog();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledOnce();
    const url = new URL(writeText.mock.calls[0]?.[0] ?? "");
    expect(url.pathname).toBe("/shared");
    expect(url.hash).toMatch(/^#1\.[A-Za-z0-9_-]+$/);
    expect(listShared).toHaveBeenCalledExactlyOnceWith("copy");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    // In the snackbar, without an action, and announced.
    expect(screen.getAllByText("Copied the link.")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List actions" })).toHaveFocus();
  });

  it("keeps the dialog open with the link selected when copying fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const listShared = vi.spyOn(tracker, "listShared");
    const { user, dialog } = await openShareDialog();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );

    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Couldn’t copy. Select the link and copy it.",
    );
    const field = within(dialog).getByRole<HTMLTextAreaElement>("textbox", {
      name: "Link",
    });
    expect(field).toHaveAttribute("readonly");
    expect(field.value).toMatch(/\/shared#1\.[A-Za-z0-9_-]+$/);
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(field.value.length);
    expect(listShared).not.toHaveBeenCalled();
    expect(screen.queryByText("Copied the link.")).not.toBeInTheDocument();
  });

  it("warns that a link over 2,000 characters may be cut, and still offers it", async () => {
    // Distinct syllables, so the list does not compress below the limit.
    const items = Array.from({ length: 120 }, (_, index) =>
      Array.from({ length: 8 }, (_, offset) =>
        String.fromCharCode(0xac00 + ((index * 997 + offset * 7919) % 11_172)),
      ).join(""),
    );
    const { user, dialog } = await openShareDialog(items);
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    expect(
      within(dialog).getByText(
        "This link is long, so some messengers may cut it off.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));
    expect(writeText.mock.calls[0]?.[0].length).toBeGreaterThan(2_000);
  });

  it("names the share steps in Korean", async () => {
    await i18n.changeLanguage("ko");
    try {
      const { user } = renderList(["라멘"]);
      await user.click(screen.getByRole("button", { name: "목록 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "공유" }));
      const dialog = await screen.findByRole("dialog", {
        name: "“Lunch” 공유",
      });
      expect(dialog).toHaveAccessibleDescription(
        "링크를 받은 사람은 누구나 목록 이름과 항목을 볼 수 있습니다. 나중에 변경한 내용은 반영되지 않습니다.",
      );
      expect(
        within(dialog).getByRole("button", { name: "링크 복사" }),
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
