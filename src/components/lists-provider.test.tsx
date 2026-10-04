import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { type Context, createList } from "@/lib/lists";
import { createRepository, emptyState, storageKey } from "@/lib/storage";
import { ListsPage } from "@/routes/lists-page";
import { memoryStorage } from "@/test/memory-storage";
import { ListsProvider, useLists } from "./lists-provider";

function testContext(prefix: string): Context {
  let id = 0;
  return {
    newId: () => {
      id += 1;
      return `${prefix}-${id}`;
    },
    now: () => new Date("2026-10-04T00:00:00.000Z"),
  };
}

type Lists = ReturnType<typeof useLists>;

/** Renders one "tab": a provider over the shared storage, exposing its value. */
function renderTab(storage: Storage, name: string) {
  const tab: { current: Lists | null } = { current: null };
  function Probe() {
    tab.current = useLists();
    return (
      <ul aria-label={name}>
        {tab.current.state.lists.map((list) => (
          <li key={list.id}>{list.name}</li>
        ))}
      </ul>
    );
  }
  render(
    <ListsProvider
      repository={createRepository(() => storage)}
      context={testContext(name)}
    >
      <Probe />
    </ListsProvider>,
  );
  const value = () => {
    if (!tab.current) throw new Error("Tab not rendered");
    return tab.current;
  };
  const names = () =>
    Array.from(
      screen.getByRole("list", { name }).querySelectorAll("li"),
      (item) => item.textContent,
    );
  const create = (listName: string) =>
    act(() =>
      value().change((state, context) => createList(state, listName, context)),
    );
  return { value, names, create };
}

/** What the browser fires in other tabs after a tab writes to localStorage. */
function storageEvent(key: string | null = storageKey) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
}

const storedNames = (data: Map<string, string>) =>
  JSON.parse(data.get(storageKey) ?? "").lists.map(
    (list: { name: string }) => list.name,
  );

describe("ListsProvider across tabs", () => {
  it("builds each change on the latest stored state, so no tab overwrites another", () => {
    const { storage, data } = memoryStorage();
    const a = renderTab(storage, "A");
    const b = renderTab(storage, "B");

    a.create("From A");
    // B has not received the storage event yet.
    b.create("From B");

    expect(storedNames(data)).toEqual(["From A", "From B"]);
    expect(b.names()).toEqual(["From A", "From B"]);
  });

  it("shows another tab's save when the storage event arrives", () => {
    const { storage } = memoryStorage();
    const a = renderTab(storage, "A");
    const b = renderTab(storage, "B");

    a.create("From A");
    expect(b.names()).toEqual([]);
    storageEvent();

    expect(b.names()).toEqual(["From A"]);
  });

  it("ignores storage events for other keys", () => {
    const { storage } = memoryStorage();
    const a = renderTab(storage, "A");
    const b = renderTab(storage, "B");

    a.create("From A");
    storageEvent("argmax:locale");

    expect(b.names()).toEqual([]);
  });

  it("shows an empty state when another tab clears all site data", () => {
    const { storage, data } = memoryStorage();
    const a = renderTab(storage, "A");
    a.create("From A");

    data.clear();
    storageEvent(null);

    expect(a.names()).toEqual([]);
    expect(a.value().issue).toBeNull();
  });

  it("keeps invalid data from another tab and turns editing off, then recovers", () => {
    const { storage, data } = memoryStorage();
    const b = renderTab(storage, "B");
    b.create("Mine");

    data.set(storageKey, "{not json");
    storageEvent();

    expect(b.value().issue).toEqual({ kind: "invalid", raw: "{not json" });
    expect(b.value().editable).toBe(false);
    expect(b.names()).toEqual([]);
    let attempt: unknown;
    act(() => {
      attempt = b.value().change((state) => ({ ok: true, state }));
    });
    expect(attempt).toEqual({ ok: false, error: "read-only" });
    expect(data.get(storageKey)).toBe("{not json");

    // Another tab deletes the invalid data.
    data.delete(storageKey);
    storageEvent();
    expect(b.value().issue).toBeNull();
    expect(b.value().editable).toBe(true);
  });

  it("keeps unsaved changes when saving failed, instead of replacing them with another tab's state", () => {
    const { storage, data, failures } = memoryStorage();
    const b = renderTab(storage, "B");
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");
    b.create("Unsaved");
    expect(b.value().issue).toEqual({ kind: "full" });

    data.set(storageKey, JSON.stringify(emptyState));
    storageEvent();

    expect(b.names()).toEqual(["Unsaved"]);
  });

  it("keeps text being typed when another tab saves", async () => {
    const { storage } = memoryStorage();
    const a = renderTab(storage, "A");
    const router = createMemoryRouter([{ path: "/", Component: ListsPage }]);
    render(
      <ListsProvider repository={createRepository(() => storage)}>
        <RouterProvider router={router} />
      </ListsProvider>,
    );
    const user = userEvent.setup();
    const field = screen.getByRole("textbox", { name: "New list name" });

    await user.type(field, "Half-typed");
    a.create("From A");
    storageEvent();

    expect(screen.getByRole("link", { name: /From A/ })).toBeInTheDocument();
    expect(field).toHaveValue("Half-typed");
  });

  it("follows another tab that replaces invalid data, so nothing it creates is discarded here", () => {
    const { storage, data } = memoryStorage({ [storageKey]: "{bad" });
    const a = renderTab(storage, "A");
    expect(a.value().issue?.kind).toBe("invalid");

    // Tab B deletes the invalid data and creates a list.
    data.set(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        lists: [
          {
            id: "fresh",
            name: "Fresh",
            items: [],
            createdAt: "2026-10-04T00:00:00.000Z",
            updatedAt: "2026-10-04T00:00:00.000Z",
          },
        ],
      }),
    );
    storageEvent();

    expect(a.value().issue).toBeNull();
    expect(a.value().editable).toBe(true);
    expect(a.names()).toEqual(["Fresh"]);
  });

  it("saves again after a read that failed once", () => {
    const { storage, data, failures } = memoryStorage();
    const a = renderTab(storage, "A");
    failures.get = new Error("read failed");
    a.create("While failing");
    expect(a.value().issue).toEqual({ kind: "unavailable" });

    failures.get = undefined;
    a.create("After recovery");

    expect(a.value().issue).toBeNull();
    expect(storedNames(data)).toEqual(["While failing", "After recovery"]);
  });
});
