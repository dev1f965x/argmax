import {
  getDefaultNormalizer,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
