import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListsProvider } from "@/components/lists-provider";
import { tracker } from "@/lib/analytics";
import { createRepository, type StoredState, storageKey } from "@/lib/storage";
import { ListPage } from "@/routes/list-page";
import { RootLayout } from "@/routes/root-layout";
import { memoryStorage } from "@/test/memory-storage";

function renderList(items: string[], createdAt = "2026-10-04T00:00:00.000Z") {
  const state: StoredState = {
    schemaVersion: 1,
    lists: [
      {
        id: "lunch",
        name: "Lunch",
        items: items.map((text, index) => ({ id: `item-${index}`, text })),
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
  const { storage, data } = memoryStorage({
    [storageKey]: JSON.stringify(state),
  });
  const router = createMemoryRouter(
    [
      {
        Component: RootLayout,
        children: [{ path: "lists/:id", Component: ListPage }],
      },
    ],
    { initialEntries: ["/lists/lunch"] },
  );
  render(
    <ListsProvider repository={createRepository(() => storage)}>
      <RouterProvider router={router} />
    </ListsProvider>,
  );
  return { data };
}

/** Makes crypto.getRandomValues return the given values in order. */
function randomValues(...values: number[]) {
  const queue = [...values];
  return vi
    .spyOn(crypto, "getRandomValues")
    .mockImplementation(<T extends ArrayBufferView | null>(buffer: T): T => {
      if (buffer instanceof Uint32Array) buffer[0] = queue.shift() ?? 0;
      return buffer;
    });
}

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) satisfies MediaQueryList,
  );
}

const pickButton = () => screen.getByRole("button", { name: /^Pick/ });
const result = () => screen.getByText("Picked").nextElementSibling;

describe("PickPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is unavailable for an empty list and says why", () => {
    renderList([]);

    expect(pickButton()).toHaveAttribute("aria-disabled", "true");
    expect(pickButton()).toHaveAccessibleDescription("Add an item to pick.");
    fireEvent.click(pickButton());
    expect(screen.queryByText("Picked")).not.toBeInTheDocument();
  });

  it("reports a settled pick with earlier_visit, without the item", async () => {
    reduceMotion(true);
    const pick = vi.spyOn(tracker, "pick");
    // The stored list was created before this test run started the visit.
    renderList(["Ramen"]);

    await userEvent.click(pickButton());

    expect(pick).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("reports earlier_visit false for a list created during this visit", async () => {
    reduceMotion(true);
    const pick = vi.spyOn(tracker, "pick");
    renderList(["Ramen"], new Date(Date.now() + 60_000).toISOString());

    await userEvent.click(pickButton());

    expect(pick).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("picks with the fair algorithm, shows and announces the result, and offers Pick again", async () => {
    reduceMotion(true);
    // Items are shown newest first, so index 1 of [C, B, A] is B.
    randomValues(1);
    renderList(["A", "B", "C"]);

    await userEvent.click(pickButton());

    expect(result()).toHaveTextContent("B");
    expect(screen.getByRole("status")).toHaveTextContent("Picked “B”.");
    expect(pickButton()).toHaveAccessibleName("Pick again");
    expect(pickButton()).toHaveFocus();
  });

  it("cycles names for about 600 ms before settling, and announces only the result", async () => {
    reduceMotion(false);
    vi.useFakeTimers();
    // First value decides the result (C); the rest only drive the cycling display.
    randomValues(0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1);
    renderList(["A", "B", "C"]);

    // fireEvent, because userEvent waits on timers that are faked here.
    fireEvent.click(pickButton());
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("status")).toHaveTextContent("");
    // A second press while cycling does not start another pick.
    fireEvent.click(pickButton());

    act(() => vi.advanceTimersByTime(300));
    expect(result()).toHaveTextContent("C");
    expect(screen.getByRole("status")).toHaveTextContent("Picked “C”.");
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(11);
  });

  it("follows an edit to the picked item and clears when it is removed", async () => {
    reduceMotion(true);
    randomValues(0);
    renderList(["Ramen"]);
    const user = userEvent.setup();

    await user.click(pickButton());
    expect(result()).toHaveTextContent("Ramen");

    await user.click(screen.getByRole("button", { name: "Edit “Ramen”" }));
    await user.keyboard("{Control>}a{/Control}Udon{Enter}");
    expect(result()).toHaveTextContent("Udon");

    await user.click(screen.getByRole("button", { name: "Remove “Udon”" }));
    expect(screen.queryByText("Picked")).not.toBeInTheDocument();
    expect(pickButton()).toHaveAccessibleName("Pick");
  });

  it("announces nothing and keeps focus when another tab removes every item during the cycle", () => {
    reduceMotion(false);
    vi.useFakeTimers();
    const { data } = renderList(["A", "B"]);
    pickButton().focus();

    fireEvent.click(pickButton());
    act(() => vi.advanceTimersByTime(200));
    data.set(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        lists: [
          {
            id: "lunch",
            name: "Lunch",
            items: [],
            createdAt: "2026-10-04T00:00:00.000Z",
            updatedAt: "2026-10-04T00:00:00.000Z",
          },
        ],
      }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    });
    act(() => vi.advanceTimersByTime(600));

    expect(screen.queryByText("Picked")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(pickButton()).toHaveFocus();
    expect(pickButton()).toHaveAttribute("aria-disabled", "true");
  });
});
