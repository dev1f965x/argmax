import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tracker } from "@/lib/analytics";
import { storageKey } from "@/lib/storage";
import { renderApp, storedState } from "@/test/fixtures";

function renderList(items: string[], createdAt?: string) {
  return renderApp({
    path: "/lists/lunch",
    stored: storedState([{ id: "lunch", name: "Lunch", items, createdAt }]),
  });
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
// A shown result is the "Picked" label outside the hidden empty box.
const shownResult = () =>
  screen.queryByText("Picked", { ignore: "[aria-hidden='true'] *" });
const emptyBoxText = "Your pick appears here";

describe("PickPanel", () => {
  it("shows an empty result box before the first pick, hidden from screen readers", async () => {
    const user = userEvent.setup();
    renderList(["Ramen"]);

    expect(
      screen.getByText(emptyBoxText).closest("[aria-hidden='true']"),
    ).not.toBeNull();
    // Neither a dash nor the label stands in for a result any more.
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Picked")).not.toBeInTheDocument();

    await user.click(pickButton());
    expect(
      await screen.findByText("Ramen", { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(emptyBoxText)).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is unavailable for an empty list and says why", () => {
    renderList([]);

    expect(pickButton()).toHaveAttribute("aria-disabled", "true");
    expect(pickButton()).toHaveAccessibleDescription(
      "Add an item to pick from.",
    );
    // The reason is the only hint; the idle hint would ask for a pick that cannot happen.
    expect(screen.queryByText(/^Select Pick/)).not.toBeInTheDocument();
    fireEvent.click(pickButton());
    expect(shownResult()).not.toBeInTheDocument();
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

  it("picks by weight", async () => {
    reduceMotion(true);
    // Shown newest first, the weights of [C, B, A] are [3, 1, 1]: positions
    // 0-2 pick C, 3 picks B, and 4 picks A. Without weights, 2 and 4 would
    // pick A and B.
    randomValues(2, 4);
    renderApp({
      path: "/lists/lunch",
      stored: storedState([
        {
          id: "lunch",
          name: "Lunch",
          items: ["A", "B", "C"],
          weights: [1, 1, 3],
        },
      ]),
    });

    await userEvent.click(pickButton());
    expect(result()).toHaveTextContent("C");
    await userEvent.click(pickButton());
    expect(result()).toHaveTextContent("A");
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
    expect(shownResult()).not.toBeInTheDocument();
    expect(pickButton()).toHaveAccessibleName("Pick");
  });

  it("announces nothing and keeps focus when another tab removes every item during the cycle", () => {
    reduceMotion(false);
    vi.useFakeTimers();
    const { data } = renderList(["A", "B"]);
    pickButton().focus();

    fireEvent.click(pickButton());
    act(() => vi.advanceTimersByTime(200));
    data.set(storageKey, storedState([{ id: "lunch", name: "Lunch" }]));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    });
    act(() => vi.advanceTimersByTime(600));

    expect(shownResult()).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(pickButton()).toHaveFocus();
    expect(pickButton()).toHaveAttribute("aria-disabled", "true");
  });
});
