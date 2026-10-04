import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ListsProvider } from "@/components/lists-provider";
import { tracker } from "@/lib/analytics";
import type { Context } from "@/lib/lists";
import {
  createRepository,
  limits,
  type StoredState,
  storageKey,
} from "@/lib/storage";
import { memoryStorage } from "@/test/memory-storage";
import { ListPage } from "./list-page";
import { ListsPage } from "./lists-page";
import { RootLayout } from "./root-layout";

function testContext(): Context {
  let id = 0;
  return {
    newId: () => {
      id += 1;
      return `id-${id}`;
    },
    now: () => new Date("2026-10-03T00:00:00.000Z"),
  };
}

function stateWith(names: string[]): string {
  const state: StoredState = {
    schemaVersion: 1,
    lists: names.map((name, index) => ({
      id: `list-${index}`,
      name,
      items: [],
      createdAt: "2026-10-03T00:00:00.000Z",
      updatedAt: "2026-10-03T00:00:00.000Z",
    })),
  };
  return JSON.stringify(state);
}

function renderApp(storage: Storage) {
  const router = createMemoryRouter([
    {
      Component: RootLayout,
      children: [
        { index: true, Component: ListsPage },
        { path: "lists/:id", Component: ListPage },
      ],
    },
  ]);
  render(
    <ListsProvider
      repository={createRepository(() => storage)}
      context={testContext()}
    >
      <RouterProvider router={router} />
    </ListsProvider>,
  );
  return { user: userEvent.setup() };
}

const nameField = () => screen.getByRole("textbox", { name: "New list name" });
const createButton = () => screen.getByRole("button", { name: "Create" });

describe("ListsPage", () => {
  it("explains what to do first and where lists are stored", () => {
    renderApp(memoryStorage().storage);

    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
    expect(screen.getByText("No lists yet")).toBeInTheDocument();
    expect(screen.getByText(/saved only in this browser/)).toBeInTheDocument();
  });

  it("reports list_created for a created list, and nothing for a rejected name", async () => {
    const listCreated = vi.spyOn(tracker, "listCreated");
    const { user } = renderApp(memoryStorage().storage);

    await user.type(nameField(), "{Enter}");
    expect(listCreated).not.toHaveBeenCalled();
    await user.type(nameField(), "Lunch{Enter}");
    expect(listCreated).toHaveBeenCalledOnce();
    listCreated.mockRestore();
  });

  it("creates a list with a trimmed name, saves it, and links to it", async () => {
    const { storage, data } = memoryStorage();
    const { user } = renderApp(storage);

    await user.type(nameField(), "  Lunch {Enter}");

    const link = screen.getByRole("link", { name: /Lunch/ });
    expect(link).toHaveTextContent("No items yet");
    expect(nameField()).toHaveValue("");
    expect(nameField()).toHaveFocus();
    expect(JSON.parse(data.get(storageKey) ?? "").lists[0].name).toBe("Lunch");
    expect(screen.getByText("Created “Lunch”.")).toBeInTheDocument();

    await user.click(link);
    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
  });

  it("shows the newest list first", async () => {
    const { user } = renderApp(
      memoryStorage({ [storageKey]: stateWith(["Older"]) }).storage,
    );

    await user.type(nameField(), "Newer{Enter}");

    const names = within(screen.getByRole("list"))
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual([
      expect.stringContaining("Newer"),
      expect.stringContaining("Older"),
    ]);
  });

  it.each([
    ["an empty name", "", "Enter a list name."],
    ["a whitespace-only name", "   ", "Enter a list name."],
    [
      "a name over 100 characters",
      "x".repeat(limits.textLength + 1),
      "Use 100 characters or fewer.",
    ],
  ])(
    "rejects %s with a message linked to the field",
    async (_, input, message) => {
      const { storage, data } = memoryStorage();
      const { user } = renderApp(storage);

      if (input) await user.type(nameField(), input);
      await user.click(createButton());

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(nameField()).toHaveAttribute("aria-invalid", "true");
      expect(nameField()).toHaveAccessibleDescription(message);
      expect(nameField()).toHaveFocus();
      expect(data.has(storageKey)).toBe(false);
    },
  );

  it("announces an error again when Enter is pressed twice, and clears it on typing", async () => {
    const { user } = renderApp(memoryStorage().storage);

    await user.type(nameField(), "{Enter}");
    const first = screen.getByRole("alert");
    await user.type(nameField(), "{Enter}");

    // A new alert element is what makes screen readers announce it again.
    expect(screen.getByRole("alert")).not.toBe(first);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a list name.");

    await user.type(nameField(), "L");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(nameField()).toHaveAttribute("aria-invalid", "false");
  });

  it("replaces the form with a message at the list limit", () => {
    const names = Array.from(
      { length: limits.lists },
      (_, index) => `List ${index}`,
    );
    renderApp(memoryStorage({ [storageKey]: stateWith(names) }).storage);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "You have 100 lists, the maximum. Delete a list to create a new one.",
      ),
    ).toBeInTheDocument();
  });

  it("announces creating the last list after the limit message replaces the form", async () => {
    const names = Array.from(
      { length: limits.lists - 1 },
      (_, index) => `List ${index}`,
    );
    const { user } = renderApp(
      memoryStorage({ [storageKey]: stateWith(names) }).storage,
    );

    await user.type(nameField(), "Last{Enter}");

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Created “Last”. You have 100 lists, the maximum.",
    );
    expect(
      screen.getByText(/^You have 100 lists, the maximum/, { selector: "p" }),
    ).toHaveFocus();
  });

  it("warns when storage is blocked and keeps working for the session", async () => {
    const { storage, failures } = memoryStorage();
    failures.get = new DOMException("Access denied", "SecurityError");
    failures.set = failures.get;
    const { user } = renderApp(storage);

    expect(screen.getByText("Lists can’t be saved")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.type(nameField(), "Lunch{Enter}");
    expect(screen.getByRole("link", { name: /Lunch/ })).toBeInTheDocument();
    // The failed save repeats the known problem, so it does not interrupt.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("alerts each time saving fails after storage worked in between", async () => {
    const { storage, failures } = memoryStorage();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");
    const repository = createRepository(() => storage);
    const router = createMemoryRouter([
      {
        Component: RootLayout,
        children: [{ index: true, Component: ListsPage }],
      },
    ]);
    render(
      <ListsProvider repository={repository} context={testContext()}>
        <RouterProvider router={router} />
      </ListsProvider>,
    );
    const user = userEvent.setup();

    await user.type(nameField(), "One{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
    failures.set = undefined;
    await user.type(nameField(), "Two{Enter}");
    expect(screen.queryByText("Lists can’t be saved")).not.toBeInTheDocument();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");
    await user.type(nameField(), "Three{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
  });

  it("warns when storage is full", async () => {
    const { storage, failures } = memoryStorage();
    const { user } = renderApp(storage);
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");

    await user.type(nameField(), "Lunch{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
    expect(screen.getByRole("link", { name: /Lunch/ })).toBeInTheDocument();
  });

  describe("with invalid stored data", () => {
    const raw = '{"schemaVersion":2}';

    it("keeps the data, turns editing off, and offers recovery", () => {
      renderApp(memoryStorage({ [storageKey]: raw }).storage);

      expect(
        screen.getByText("Saved lists couldn’t be read"),
      ).toBeInTheDocument();
      expect(nameField()).toBeDisabled();
      expect(createButton()).toBeDisabled();
      expect(screen.queryByText("No lists yet")).not.toBeInTheDocument();
    });

    it("copies the raw data", async () => {
      const { user } = renderApp(memoryStorage({ [storageKey]: raw }).storage);

      await user.click(screen.getByRole("button", { name: "Copy data" }));

      expect(await navigator.clipboard.readText()).toBe(raw);
      expect(screen.getByText("Copied the saved data.")).toBeInTheDocument();
    });

    it("deletes the data only after confirmation", async () => {
      const { storage, data } = memoryStorage({ [storageKey]: raw });
      const { user } = renderApp(storage);

      await user.click(screen.getByRole("button", { name: "Delete data" }));
      await user.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Cancel",
        }),
      );
      expect(data.get(storageKey)).toBe(raw);

      await user.click(screen.getByRole("button", { name: "Delete data" }));
      await user.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Delete data",
        }),
      );

      expect(data.has(storageKey)).toBe(false);
      expect(screen.getByText(/Deleted the saved data/)).toHaveFocus();

      expect(nameField()).toBeEnabled();

      await user.type(nameField(), "Lunch{Enter}");
      await user.click(screen.getByRole("link", { name: /Lunch/ }));
      expect(
        screen.queryByText(/Deleted the saved data/),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("link", { name: "All lists" }));
      expect(
        screen.queryByText(/Deleted the saved data/),
      ).not.toBeInTheDocument();
      expect(nameField()).toBeInTheDocument();
    });
  });
});
