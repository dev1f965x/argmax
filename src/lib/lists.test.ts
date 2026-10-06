import { describe, expect, it } from "vitest";
import { testContext } from "@/test/fixtures";
import { memoryStorage } from "@/test/memory-storage";
import {
  addItem,
  createList,
  deleteList,
  editItem,
  removeItem,
  renameList,
  restoreItem,
  setItemWeight,
  validateText,
} from "./lists";
import {
  cleanText,
  createRepository,
  emptyState,
  limits,
  type StoredState,
} from "./storage";

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

describe("validateText with unsafe characters", () => {
  it.each([
    ["bidi controls", "a\u202Eb\u2066c\u061C", "abc"],
    ["C0 and C1 controls", "a\u0000b\u007Fc\u009F", "abc"],
    ["lone surrogates", "\uDC00a\uD800b", "ab"],
    [
      "line breaks and tabs, as spaces",
      "Fried\r\nrice\tbowl",
      "Fried  rice bowl",
    ],
  ])("removes %s", (_, input, value) => {
    expect(validateText(input)).toEqual({ ok: true, value });
  });

  it.each([
    "\u200B",
    "\u2060\uFEFF\u200D",
    " \u3164 ",
    "\u202E\u2066",
    "\uD800",
  ])("rejects %j as empty", (input) => {
    expect(validateText(input)).toEqual({ ok: false, error: "empty" });
  });

  it("keeps eight marks on one letter stacked with thousands", () => {
    expect(validateText(`x${"\u0301".repeat(5_000)}`)).toEqual({
      ok: true,
      value: `x${"\u0301".repeat(8)}`,
    });
  });

  it("keeps joiners inside emoji sequences and words", () => {
    expect(validateText("👨‍👩‍👧‍👦")).toEqual({ ok: true, value: "👨‍👩‍👧‍👦" });
    expect(validateText("می\u200Cخواهم")).toEqual({
      ok: true,
      value: "می\u200Cخواهم",
    });
  });

  /** Seeded so a failure reproduces (mulberry32). */
  function random(seed: number) {
    let state = seed;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  const pieces = [
    ..."a가ㄱ ",
    "\u1100\u1161\u11A8",
    "\u1100",
    "\u0301",
    "\u0300",
    "\u200B",
    "\u200C",
    "\u200D",
    "\u2060",
    "\uFEFF",
    "\u00AD",
    "\u3164",
    "\u00A0",
    "\u3000",
    "\t",
    "\n",
    "\r",
    "\u0000",
    "\u007F",
    "\u0085",
    "\u061C",
    "\u200E",
    "\u202E",
    "\u2066",
    "\u2069",
    "\uD800",
    "\uDC00",
    "😀",
    "\uFE0F",
    "🇰",
    "👨‍👩‍👧",
    "غ",
  ];

  function acceptedByStorage(text: string): boolean {
    const { storage } = memoryStorage();
    const repository = createRepository(() => storage);
    repository.load();
    const timestamp = "2026-10-06T00:00:00.000Z";
    return repository.save({
      schemaVersion: 2,
      lists: [
        {
          id: "list",
          name: text,
          items: [{ id: "item", text, weight: 1 }],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }).ok;
  }

  it("only returns text that the stored-data schema accepts", () => {
    const next = random(46);
    let accepted = 0;
    for (let run = 0; run < 2_000; run++) {
      const length = Math.floor(next() * 140);
      const input = Array.from(
        { length },
        () => pieces[Math.floor(next() * pieces.length)] ?? "",
      ).join("");
      const result = validateText(input);
      if (!result.ok) continue;
      accepted++;
      expect(acceptedByStorage(result.value), JSON.stringify(input)).toBe(true);
    }
    // Most inputs must pass, or the loop would prove little.
    expect(accepted).toBeGreaterThan(1_000);
  });

  it("turns every kind of line break into a space", () => {
    expect(validateText("a\u2028b\u2029c\u0085d\ve\ff")).toEqual({
      ok: true,
      value: "a b c d e f",
    });
  });

  it("cleans to the same text when run again, including over-long text", () => {
    const next = random(2028);
    // Mostly long stacks, so many inputs go over the cap.
    const withStacks = [
      ..."a가 ",
      "\u200D",
      "\t",
      "\u202E",
      "\uD800",
      "🇰",
      "\u0301".repeat(200),
      "\u0E49".repeat(300),
      " \u0301".repeat(100),
      "\u0F90\u0F71".repeat(150),
    ];
    let capped = 0;
    for (let run = 0; run < 1_000; run++) {
      const length = Math.floor(next() * 60);
      const input = Array.from(
        { length },
        () => withStacks[Math.floor(next() * withStacks.length)] ?? "",
      ).join("");
      const once = cleanText(input);
      if (input.length > 1_600) capped++;
      expect(cleanText(once), JSON.stringify(input)).toBe(once);
    }
    expect(capped).toBeGreaterThan(100);
  });
});

describe("cleanText over the unit cap", () => {
  it.each([
    ["Vietnamese", "Tiếng Việt ngữ"],
    ["decomposed Vietnamese", "Tiếng Việt ngữ".normalize("NFD")],
    ["Thai", "สวัสดี น้ำ ที่ ปั้น กี่"],
    ["Tibetan", "བསྒྲུབས་ཧཱུྃ་ཨོཾ་ཀྵྨྱཱྀ"],
    ["Devanagari", "क्ष्म्यं श्रीमान् स्त्र्यै"],
    ["emoji sequences", "👨‍👩‍👧‍👦👩🏻‍❤️‍💋‍👨🏼1️⃣🏴󠁧󠁢󠁳󠁣󠁴󠁿🇰🇷"],
  ])("leaves %s unchanged even over the cap", (_, sample) => {
    const text = `${sample} `.repeat(200).trim().normalize("NFC");
    expect(text.length).toBeGreaterThan(1_600);
    expect(cleanText(text)).toBe(text);
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

  it("adds items at weight 1, allowing duplicates", () => {
    const { context, state } = withList();
    const once = mustOk(addItem(state, "id-1", "Ramen", context));
    const twice = mustOk(addItem(once, "id-1", " Ramen ", context));
    expect(twice.lists[0]?.items).toEqual([
      { id: "id-2", text: "Ramen", weight: 1 },
      { id: "id-3", text: "Ramen", weight: 1 },
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
    expect(edited.lists[0]?.items).toEqual([
      { id: "id-2", text: "Udon", weight: 1 },
    ]);
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

  it("restores a removed item at its earlier position, once", () => {
    const { context, state } = withList();
    let full = state;
    for (const text of ["A", "B", "C"])
      full = mustOk(addItem(full, "id-1", text, context));
    const [, b] = full.lists[0]?.items ?? [];
    if (!b) throw new Error("fixture has no second item");
    const removed = mustOk(removeItem(full, "id-1", b.id, context));

    const restored = mustOk(restoreItem(removed, "id-1", b, 1, context));
    expect(restored.lists[0]?.items.map((item) => item.text)).toEqual([
      "A",
      "B",
      "C",
    ]);
    // Restoring again, as a second tab might, changes nothing.
    expect(mustOk(restoreItem(restored, "id-1", b, 1, context))).toBe(restored);
    expect(restoreItem(removed, "missing", b, 1, context)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("restores a removed item with its weight", () => {
    const { context, state } = withList();
    let added = state;
    for (const text of ["Ramen", "Udon", "Soba"])
      added = mustOk(addItem(added, "id-1", text, context));
    const weighted = mustOk(setItemWeight(added, "id-1", "id-2", 3, context));
    const [item] = weighted.lists[0]?.items ?? [];
    if (!item) throw new Error("fixture has no item");
    const removed = mustOk(removeItem(weighted, "id-1", item.id, context));

    expect(
      mustOk(restoreItem(removed, "id-1", item, 0, context)).lists[0]?.items[0],
    ).toEqual({ id: "id-2", text: "Ramen", weight: 3 });
  });
});

describe("item weights", () => {
  function withItems() {
    const context = testContext();
    let state = mustOk(createList(emptyState, "Lunch", context));
    for (const text of ["Ramen", "Udon"])
      state = mustOk(addItem(state, "id-1", text, context));
    return { context, state };
  }
  const weights = (state: StoredState) =>
    state.lists[0]?.items.map((item) => item.weight);

  it("sets one item's weight and the list's timestamp", () => {
    const { context, state } = withItems();
    const changed = mustOk(setItemWeight(state, "id-1", "id-3", 2, context));
    expect(weights(changed)).toEqual([1, 2]);
    expect(changed.lists[0]?.updatedAt).not.toBe(state.lists[0]?.updatedAt);
    expect(weights(state)).toEqual([1, 1]);
  });

  it("accepts 1 to the item count and rejects raising a weight above it", () => {
    const { context, state } = withItems();
    const high = mustOk(setItemWeight(state, "id-1", "id-2", 2, context));
    expect(weights(high)).toEqual([2, 1]);
    const low = mustOk(setItemWeight(high, "id-1", "id-2", 1, context));
    expect(weights(low)).toEqual([1, 1]);
    expect(setItemWeight(state, "id-1", "id-2", 3, context)).toEqual({
      ok: false,
      error: "invalid-weight",
    });
  });

  it("only lowers a stored weight left above the item count by removals", () => {
    const context = testContext();
    let state = mustOk(createList(emptyState, "Lunch", context));
    for (const text of ["Ramen", "Udon", "Soba", "Pho"])
      state = mustOk(addItem(state, "id-1", text, context));
    state = mustOk(setItemWeight(state, "id-1", "id-2", 4, context));
    for (const id of ["id-3", "id-4"])
      state = mustOk(removeItem(state, "id-1", id, context));
    // Two items left; Ramen keeps its stale weight 4.
    expect(weights(state)).toEqual([4, 1]);

    expect(setItemWeight(state, "id-1", "id-2", 5, context)).toEqual({
      ok: false,
      error: "invalid-weight",
    });
    // Saving the stale weight unchanged is a no-op, not an error.
    expect(mustOk(setItemWeight(state, "id-1", "id-2", 4, context))).toBe(
      state,
    );
    // Lower than before but still above the count.
    const lower = mustOk(setItemWeight(state, "id-1", "id-2", 3, context));
    expect(weights(lower)).toEqual([3, 1]);
    const within = mustOk(setItemWeight(lower, "id-1", "id-2", 1, context));
    expect(weights(within)).toEqual([1, 1]);
    // The other item cannot be raised past the count.
    expect(setItemWeight(state, "id-1", "id-5", 3, context)).toEqual({
      ok: false,
      error: "invalid-weight",
    });
  });

  it("keeps the state when the weight is unchanged", () => {
    const { context, state } = withItems();
    expect(mustOk(setItemWeight(state, "id-1", "id-2", 1, context))).toBe(
      state,
    );
  });

  it.each([0, -1, 1_001, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects weight %s",
    (weight) => {
      const { context, state } = withItems();
      expect(setItemWeight(state, "id-1", "id-2", weight, context)).toEqual({
        ok: false,
        error: "invalid-weight",
      });
    },
  );

  it("rejects unknown lists and items", () => {
    const { context, state } = withItems();
    expect(setItemWeight(state, "missing", "id-2", 2, context)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(setItemWeight(state, "id-1", "missing", 2, context)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("keeps the weight when the item's text is edited", () => {
    const { context, state } = withItems();
    const weighted = mustOk(setItemWeight(state, "id-1", "id-2", 2, context));
    const edited = mustOk(editItem(weighted, "id-1", "id-2", "Soba", context));
    expect(edited.lists[0]?.items[0]).toEqual({
      id: "id-2",
      text: "Soba",
      weight: 2,
    });
  });

  it("keeps the other weights when items are removed", () => {
    const { context, state } = withItems();
    const weighted = mustOk(setItemWeight(state, "id-1", "id-3", 2, context));
    const removed = mustOk(removeItem(weighted, "id-1", "id-2", context));
    // Weight 2 now exceeds the single item's UI maximum and is still stored.
    expect(weights(removed)).toEqual([2]);
  });
});
