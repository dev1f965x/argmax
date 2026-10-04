import { describe, expect, it } from "vitest";
import { testContext } from "@/test/fixtures";
import {
  addItem,
  createList,
  deleteList,
  editItem,
  removeItem,
  renameList,
  validateText,
} from "./lists";
import { emptyState, limits, type StoredState } from "./storage";

function mustOk<E>(
  result: { ok: true; state: StoredState } | { ok: false; error: E },
): StoredState {
  if (!result.ok)
    throw new Error(`Expected success, got ${String(result.error)}`);
  return result.state;
}

const hundred = "가".repeat(limits.textLength);

describe("validateText", () => {
  it("trims surrounding whitespace", () => {
    expect(validateText("  Lunch  ")).toEqual({ ok: true, value: "Lunch" });
  });

  it.each(["", "   ", "\n\t"])("rejects %j as empty", (input) => {
    expect(validateText(input)).toEqual({ ok: false, error: "empty" });
  });

  it("accepts 100 characters and rejects 101, counting Hangul and emoji as one", () => {
    expect(validateText(hundred).ok).toBe(true);
    expect(validateText(`${hundred}가`)).toEqual({
      ok: false,
      error: "too-long",
    });
    expect(validateText("🍜".repeat(limits.textLength)).ok).toBe(true);
    expect(validateText("🍜".repeat(limits.textLength + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });
});

describe("validateText normalization", () => {
  it("stores decomposed Hangul in composed form and counts a family emoji once", () => {
    expect(validateText("점심".normalize("NFD"))).toEqual({
      ok: true,
      value: "점심",
    });
    expect(validateText("👨‍👩‍👧‍👦".repeat(limits.textLength)).ok).toBe(true);
  });
});

describe("lists", () => {
  it("creates a list with trimmed name and timestamps, without changing the input state", () => {
    const state = mustOk(createList(emptyState, "  Lunch ", testContext()));
    expect(state.lists).toEqual([
      {
        id: "id-1",
        name: "Lunch",
        items: [],
        createdAt: "2026-10-04T00:00:01.000Z",
        updatedAt: "2026-10-04T00:00:01.000Z",
      },
    ]);
    expect(emptyState.lists).toEqual([]);
  });

  it("rejects an empty name", () => {
    expect(createList(emptyState, " ", testContext())).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("allows 100 lists and rejects the 101st", () => {
    const context = testContext();
    let state = emptyState;
    for (let i = 0; i < limits.lists; i += 1)
      state = mustOk(createList(state, `List ${i}`, context));
    expect(state.lists).toHaveLength(limits.lists);
    expect(createList(state, "One more", context)).toEqual({
      ok: false,
      error: "list-limit",
    });
  });

  it("renames a list and updates its timestamp", () => {
    const context = testContext();
    const created = mustOk(createList(emptyState, "Lunch", context));
    const renamed = mustOk(renameList(created, "id-1", "Dinner", context));
    expect(renamed.lists[0]?.name).toBe("Dinner");
    expect(renamed.lists[0]?.updatedAt).not.toBe(created.lists[0]?.updatedAt);
    expect(renameList(created, "id-1", "", context)).toEqual({
      ok: false,
      error: "empty",
    });
    expect(renameList(created, "missing", "Dinner", context)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("keeps the timestamp when a list is renamed to the same name", () => {
    const context = testContext();
    const created = mustOk(createList(emptyState, "Lunch", context));
    expect(mustOk(renameList(created, "id-1", " Lunch ", context))).toBe(
      created,
    );
  });

  it("deletes a list", () => {
    const created = mustOk(createList(emptyState, "Lunch", testContext()));
    expect(mustOk(deleteList(created, "id-1")).lists).toEqual([]);
    expect(deleteList(created, "missing")).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});

describe("items", () => {
  function withList() {
    const context = testContext();
    return { context, state: mustOk(createList(emptyState, "Lunch", context)) };
  }

  it("adds items, allowing duplicates", () => {
    const { context, state } = withList();
    const once = mustOk(addItem(state, "id-1", "Ramen", context));
    const twice = mustOk(addItem(once, "id-1", " Ramen ", context));
    expect(twice.lists[0]?.items.map((item) => item.text)).toEqual([
      "Ramen",
      "Ramen",
    ]);
  });

  it("rejects empty or over-long items and unknown lists", () => {
    const { context, state } = withList();
    expect(addItem(state, "id-1", "  ", context)).toEqual({
      ok: false,
      error: "empty",
    });
    expect(addItem(state, "id-1", `${hundred}x`, context)).toEqual({
      ok: false,
      error: "too-long",
    });
    expect(addItem(state, "missing", "Ramen", context)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("allows 1,000 items and rejects the 1,001st", () => {
    const { context, state: start } = withList();
    let state = start;
    for (let i = 0; i < limits.itemsPerList; i += 1)
      state = mustOk(addItem(state, "id-1", `Item ${i}`, context));
    expect(state.lists[0]?.items).toHaveLength(limits.itemsPerList);
    expect(addItem(state, "id-1", "One more", context)).toEqual({
      ok: false,
      error: "item-limit",
    });
  });

  it("edits and removes an item", () => {
    const { context, state } = withList();
    const added = mustOk(addItem(state, "id-1", "Ramen", context));
    const edited = mustOk(editItem(added, "id-1", "id-2", "Udon", context));
    expect(edited.lists[0]?.items).toEqual([{ id: "id-2", text: "Udon" }]);
    expect(editItem(added, "id-1", "id-2", " ", context)).toEqual({
      ok: false,
      error: "empty",
    });
    expect(editItem(added, "id-1", "missing", "Udon", context)).toEqual({
      ok: false,
      error: "not-found",
    });

    expect(
      mustOk(removeItem(edited, "id-1", "id-2", context)).lists[0]?.items,
    ).toEqual([]);
    expect(removeItem(edited, "id-1", "missing", context)).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});
