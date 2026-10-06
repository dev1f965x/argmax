import {
  act,
  getDefaultNormalizer,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tracker } from "@/lib/analytics";
import { limits, storageKey } from "@/lib/storage";
import { renderApp, storedState } from "@/test/fixtures";
import { memoryStorage } from "@/test/memory-storage";

const named = (names: string[]) => names.map((name) => ({ name }));

const nameField = () => screen.getByRole("textbox", { name: "New list name" });
const createButton = () => screen.getByRole("button", { name: "Create" });
const itemField = () => screen.getByRole("textbox", { name: "New item" });

describe("ListsPage", () => {
  it("confirms a created list by its name as saved, with a tab as a space", async () => {
    const { user } = renderApp();

    await user.click(nameField());
    await user.paste("Late\tlunch");
    await user.keyboard("{Enter}");

    expect(
      // The default matcher would collapse a tab into a space.
      await screen.findByText("Created “Late lunch”.", {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeInTheDocument();
  });

  it("explains what to do first and where lists are stored, with details on request", async () => {
    const { user } = renderApp();

    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
    expect(screen.getByText("No lists yet")).toBeInTheDocument();
    const note = screen.getByRole("button", {
      name: "Lists are saved only in this browser.",
    });
    expect(
      screen.queryByText(/^Clearing browser data/),
    ).not.toBeInTheDocument();

    // Tapping or Enter opens the details too; phones have no hover.
    await user.click(note);
    expect(
      await screen.findByText(
        "Clearing browser data deletes them, and other devices don’t show them.",
      ),
    ).toBeInTheDocument();
  });

  it("reports list_created for a created list, and nothing for a rejected name", async () => {
    const listCreated = vi.spyOn(tracker, "listCreated");
    const { user } = renderApp();

    await user.type(nameField(), "{Enter}");
    expect(listCreated).not.toHaveBeenCalled();
    await user.type(nameField(), "Lunch{Enter}");
    // No list from an earlier visit is stored, so this is a first visit.
    expect(listCreated).toHaveBeenCalledExactlyOnceWith(true);
    listCreated.mockRestore();
  });

  it("creates a list with a trimmed name and opens it, ready for the first item", async () => {
    const { user, data, router } = renderApp();

    await user.type(nameField(), "  Lunch {Enter}");

    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
    expect(itemField()).toHaveFocus();
    expect(screen.getByText("Created “Lunch”.")).toBeInTheDocument();
    expect(JSON.parse(data.get(storageKey) ?? "").lists[0].name).toBe("Lunch");

    // The confirmation and the focus move are not repeated on Back and Forward.
    await act(() => router.navigate(-1));
    expect(screen.getByRole("link", { name: /Lunch/ })).toHaveTextContent(
      "0 items",
    );
    await act(() => router.navigate(1));
    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
    expect(screen.queryByText("Created “Lunch”.")).not.toBeInTheDocument();
    expect(itemField()).not.toHaveFocus();
  });

  it("shows the newest list first", () => {
    renderApp({ stored: storedState(named(["Older", "Newer"])) });

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
      const { user, data } = renderApp();

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
    const { user } = renderApp();

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
    renderApp({ stored: storedState(named(names)) });

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "You have 100 lists, the maximum. Delete a list to create a new one.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the last allowed list, and Lists then shows the limit message", async () => {
    const names = Array.from(
      { length: limits.lists - 1 },
      (_, index) => `List ${index}`,
    );
    const { user } = renderApp({ stored: storedState(named(names)) });

    await user.type(nameField(), "Last{Enter}");
    expect(screen.getByRole("heading", { name: "Last" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "All lists" }));

    expect(
      screen.queryByRole("textbox", { name: "New list name" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/^You have 100 lists, the maximum/),
    ).toBeInTheDocument();
  });

  it("warns when storage is blocked and keeps working for the session", async () => {
    const memory = memoryStorage();
    memory.failures.get = new DOMException("Access denied", "SecurityError");
    memory.failures.set = memory.failures.get;
    const { user } = renderApp({ storage: memory });

    expect(screen.getByText("Lists can’t be saved")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.type(nameField(), "Lunch{Enter}");
    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
    // The failed save repeats the known problem, so it does not interrupt.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("alerts each time saving fails after storage worked in between", async () => {
    const { user, failures } = renderApp();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");

    await user.type(nameField(), "One{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
    failures.set = undefined;
    await user.type(itemField(), "Two{Enter}");
    expect(screen.queryByText("Lists can’t be saved")).not.toBeInTheDocument();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");
    await user.type(itemField(), "Three{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
  });

  it("warns when storage is full", async () => {
    const { user, failures } = renderApp();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");

    await user.type(nameField(), "Lunch{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage in this browser is full",
    );
    expect(screen.getByRole("heading", { name: "Lunch" })).toBeInTheDocument();
  });

  describe("with invalid stored data", () => {
    const raw = '{"schemaVersion":2}';

    it("keeps the data, turns editing off, and offers recovery", () => {
      renderApp({ stored: raw });

      expect(
        screen.getByText("Saved lists couldn’t be read"),
      ).toBeInTheDocument();
      expect(nameField()).toBeDisabled();
      expect(createButton()).toBeDisabled();
      expect(screen.queryByText("No lists yet")).not.toBeInTheDocument();
    });

    it("copies the raw data", async () => {
      const { user } = renderApp({ stored: raw });

      await user.click(screen.getByRole("button", { name: "Copy data" }));

      expect(await navigator.clipboard.readText()).toBe(raw);
      expect(screen.getByText("Copied the saved data.")).toBeInTheDocument();
    });

    it("does not bring the deleted-data confirmation back after a later storage problem", async () => {
      const { user, failures } = renderApp({ stored: raw });
      await user.click(screen.getByRole("button", { name: "Delete data" }));
      await user.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Delete data",
        }),
      );

      failures.set = new DOMException("Quota exceeded", "QuotaExceededError");
      await user.type(nameField(), "One{Enter}");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Storage in this browser is full",
      );
      failures.set = undefined;
      await user.type(itemField(), "Two{Enter}");

      expect(
        screen.queryByText(/Deleted the saved data/),
      ).not.toBeInTheDocument();
      expect(itemField()).toHaveFocus();
    });

    it("deletes the data only after confirmation", async () => {
      const { user, data } = renderApp({ stored: raw });

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
      expect(
        screen.getByRole("heading", { name: "Lunch" }),
      ).toBeInTheDocument();
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
