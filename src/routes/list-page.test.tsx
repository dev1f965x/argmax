import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ListsProvider } from "@/components/lists-provider";
import type { Context } from "@/lib/lists";
import {
  createRepository,
  limits,
  type StoredState,
  storageKey,
} from "@/lib/storage";
import { memoryStorage } from "@/test/memory-storage";
import { ListPage } from "./list-page";
import { RootLayout } from "./root-layout";

function testContext(): Context {
  let id = 0;
  return {
    newId: () => {
      id += 1;
      return `new-${id}`;
    },
    now: () => new Date("2026-10-03T00:00:00.000Z"),
  };
}

function storedList(items: string[]): string {
  const state: StoredState = {
    schemaVersion: 1,
    lists: [
      {
        id: "lunch",
        name: "Lunch",
        items: items.map((text, index) => ({ id: `item-${index}`, text })),
        createdAt: "2026-10-03T00:00:00.000Z",
        updatedAt: "2026-10-03T00:00:00.000Z",
      },
    ],
  };
  return JSON.stringify(state);
}

function renderList(items: string[], path = "/lists/lunch") {
  const { storage, data } = memoryStorage({ [storageKey]: storedList(items) });
  const router = createMemoryRouter(
    [
      {
        Component: RootLayout,
        children: [
          { index: true, element: <h1>Lists</h1> },
          { path: "lists/:id", Component: ListPage },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <ListsProvider
      repository={createRepository(() => storage)}
      context={testContext()}
    >
      <RouterProvider router={router} />
    </ListsProvider>,
  );
  const storedItems = () =>
    JSON.parse(data.get(storageKey) ?? "").lists[0].items.map(
      (item: { text: string }) => item.text,
    );
  return { user: userEvent.setup(), storedItems };
}

const addField = () => screen.getByRole("textbox", { name: "Add an item" });
const rows = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((row) => row.textContent);

describe("ListPage", () => {
  it("shows the list name, item count, and an empty state", () => {
    renderList([]);

    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("This list is empty")).toBeInTheDocument();
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

  it("replaces the add field with a message at the item limit", () => {
    renderList(
      Array.from({ length: limits.itemsPerList }, (_, index) => `${index}`),
    );

    expect(
      screen.queryByRole("textbox", { name: "Add an item" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This list has 1,000 items, the maximum. Remove an item to add another.",
      ),
    ).toBeInTheDocument();
  });

  it("edits an item with the keyboard and returns focus to its Edit button", async () => {
    const { user, storedItems } = renderList(["Ramen", "Sushi"]);

    screen.getByRole("button", { name: "Edit “Ramen”" }).focus();
    await user.keyboard("{Enter}");
    const field = screen.getByRole("textbox", { name: "Edit item" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue("Ramen");

    await user.keyboard("{Control>}a{/Control}Udon{Enter}");

    expect(storedItems()).toEqual(["Udon", "Sushi"]);
    expect(screen.getByRole("button", { name: "Edit “Udon”" })).toHaveFocus();
    expect(screen.getByText("Saved “Udon”.")).toBeInTheDocument();
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
      screen.getByRole("textbox", { name: "Edit item" }),
      `${"x".repeat(limits.textLength)}{Enter}`,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 100 characters or fewer.",
    );
    expect(screen.getByRole("textbox", { name: "Edit item" })).toBeVisible();
    expect(storedItems()).toEqual(["Ramen"]);
  });

  it("after a removal, focuses the next row's Edit button, then the add field", async () => {
    const { user, storedItems } = renderList(["Ramen", "Sushi"]);

    // Newest first: Sushi is shown above Ramen.
    await user.click(screen.getByRole("button", { name: "Remove “Sushi”" }));
    expect(storedItems()).toEqual(["Ramen"]);
    expect(screen.getByText("Removed “Sushi”.")).toBeInTheDocument();
    // Edit, not Remove, so pressing Enter again cannot remove another item.
    expect(screen.getByRole("button", { name: "Edit “Ramen”" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove “Ramen”" }));
    expect(storedItems()).toEqual([]);
    expect(addField()).toHaveFocus();
    expect(screen.getByText("This list is empty")).toBeInTheDocument();
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

  it("moves focus to the limit message when the last allowed item is added", async () => {
    const { user } = renderList(
      Array.from({ length: limits.itemsPerList - 1 }, (_, index) => `${index}`),
    );

    await user.type(addField(), "Last{Enter}");

    expect(
      screen.getByText(/^This list has 1,000 items/, { selector: "p" }),
    ).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Added “Last”. This list has 1,000 items, the maximum.",
    );
  });

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
});
