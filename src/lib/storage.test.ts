import { describe, expect, it } from "vitest";
import { memoryStorage } from "@/test/memory-storage";
import {
  characterCount,
  createRepository,
  emptyState,
  limits,
  repairState,
  type StoredState,
  storageKey,
} from "./storage";

const list = {
  id: "list-1",
  name: "Lunch",
  items: [{ id: "item-1", text: "Ramen" }],
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
};
const validState: StoredState = { schemaVersion: 1, lists: [list] };

const stored = (state: unknown) => JSON.stringify(state);

describe("characterCount", () => {
  it.each([
    ["Hangul syllables", "점심", 2],
    ["decomposed Hangul (NFD)", "점심".normalize("NFD"), 2],
    ["a family emoji sequence", "👨‍👩‍👧‍👦", 1],
    ["a flag", "🇰🇷", 1],
    ["Latin letters", "Lunch", 5],
  ])("counts %s as users see them", (_, text, expected) => {
    expect(characterCount(text)).toBe(expected);
  });
});

describe("createRepository", () => {
  it("returns an empty state when nothing is stored", () => {
    const { storage } = memoryStorage();
    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: emptyState,
    });
  });

  it("saves and loads the state under the argmax key", () => {
    const { storage, data } = memoryStorage();
    const repository = createRepository(() => storage);
    repository.load();
    expect(repository.save(validState)).toEqual({ ok: true });
    expect(JSON.parse(data.get(storageKey) ?? "")).toEqual(validState);
    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: validState,
    });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["an unknown schema version", stored({ ...validState, schemaVersion: 2 })],
    ["a missing field", stored({ schemaVersion: 1 })],
    [
      "an empty list name",
      stored({ ...validState, lists: [{ ...list, name: "  " }] }),
    ],
    [
      "an empty name",
      stored({ ...validState, lists: [{ ...list, name: "" }] }),
    ],
    [
      "decomposed (NFD) text",
      stored({
        ...validState,
        lists: [{ ...list, name: "점심".normalize("NFD") }],
      }),
    ],
    [
      "untrimmed text",
      stored({ ...validState, lists: [{ ...list, name: " Lunch" }] }),
    ],
    [
      "an over-long item",
      stored({
        ...validState,
        lists: [{ ...list, items: [{ id: "i", text: "x".repeat(101) }] }],
      }),
    ],
    [
      "too many items",
      stored({
        ...validState,
        lists: [
          {
            ...list,
            items: Array.from({ length: limits.itemsPerList + 1 }, (_, i) => ({
              id: `i${i}`,
              text: "x",
            })),
          },
        ],
      }),
    ],
    [
      "too many lists",
      stored({
        ...validState,
        lists: Array.from({ length: limits.lists + 1 }, (_, i) => ({
          ...list,
          id: `l${i}`,
        })),
      }),
    ],
    ["duplicate list ids", stored({ ...validState, lists: [list, list] })],
    [
      "duplicate item ids",
      stored({
        ...validState,
        lists: [{ ...list, items: [list.items[0], list.items[0]] }],
      }),
    ],
    [
      "a date without a time zone",
      stored({
        ...validState,
        lists: [{ ...list, createdAt: "2026-10-03T00:00:00" }],
      }),
    ],
  ])("reports %s as invalid and never overwrites it", (_, raw) => {
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    const repository = createRepository(() => storage);

    expect(repository.load()).toMatchObject({ status: "invalid", raw });
    expect(repository.save(emptyState)).toEqual({
      ok: false,
      reason: "read-only",
    });
    expect(data.get(storageKey)).toBe(raw);
  });

  it("accepts the maximum sizes", () => {
    const full: StoredState = {
      schemaVersion: 1,
      lists: Array.from({ length: limits.lists }, (_, i) => ({
        ...list,
        id: `l${i}`,
        name: "가".repeat(limits.textLength),
      })),
    };
    const { storage } = memoryStorage({ [storageKey]: stored(full) });
    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: full,
    });
  });

  it("refuses to save before a load, so unseen data is never replaced", () => {
    const raw = "{not json";
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    expect(createRepository(() => storage).save(emptyState)).toEqual({
      ok: false,
      reason: "not-loaded",
    });
    expect(data.get(storageKey)).toBe(raw);
  });

  it("refuses to save after a failed read, and allows it after a later successful read", () => {
    const { storage, failures, data } = memoryStorage({
      [storageKey]: stored(validState),
    });
    const repository = createRepository(() => storage);
    failures.get = new Error("read failed");

    expect(repository.load()).toMatchObject({
      status: "unavailable",
      cause: failures.get,
    });
    expect(repository.save(emptyState)).toEqual({
      ok: false,
      reason: "not-loaded",
    });
    expect(data.get(storageKey)).toBe(stored(validState));

    failures.get = undefined;
    expect(repository.load()).toEqual({ status: "ok", state: validState });
    expect(repository.save(emptyState)).toEqual({ ok: true });
  });

  it("reports blocked storage as unavailable", () => {
    const denied = new DOMException("Access denied", "SecurityError");
    const repository = createRepository(() => {
      throw denied;
    });
    expect(repository.load()).toEqual({ status: "unavailable", cause: denied });
    expect(repository.save(validState)).toEqual({
      ok: false,
      reason: "not-loaded",
    });
  });

  /** Older Safari reports quota errors only through the legacy code 22. */
  function legacyQuotaError(): DOMException {
    const error = new DOMException("Quota exceeded", "UnknownError");
    Object.defineProperty(error, "code", { value: 22 });
    return error;
  }

  it.each([
    [
      "QuotaExceededError",
      () => new DOMException("Quota exceeded", "QuotaExceededError"),
    ],
    [
      "the Firefox legacy name",
      () => new DOMException("Quota reached", "NS_ERROR_DOM_QUOTA_REACHED"),
    ],
    ["the legacy code 22", legacyQuotaError],
  ])(
    "reports a full storage from %s and keeps the previous value",
    (_, makeError) => {
      const { storage, failures, data } = memoryStorage({
        [storageKey]: stored(emptyState),
      });
      const repository = createRepository(() => storage);
      repository.load();
      const error = makeError();
      failures.set = error;

      expect(repository.save(validState)).toEqual({
        ok: false,
        reason: "full",
        cause: error,
      });
      expect(data.get(storageKey)).toBe(stored(emptyState));
    },
  );

  it("reports other write errors as unavailable", () => {
    const { storage, failures } = memoryStorage();
    const repository = createRepository(() => storage);
    repository.load();
    failures.set = new Error("write failed");
    expect(repository.save(validState)).toEqual({
      ok: false,
      reason: "unavailable",
      cause: failures.set,
    });
  });

  it("deletes invalid data on reset and allows saving again", () => {
    const { storage, data } = memoryStorage({ [storageKey]: "{not json" });
    const repository = createRepository(() => storage);
    repository.load();

    expect(repository.reset()).toEqual({ ok: true });
    expect(data.has(storageKey)).toBe(false);
    expect(repository.save(validState)).toEqual({ ok: true });
  });

  it("keeps refusing saves when reset fails", () => {
    const { storage, failures, data } = memoryStorage({
      [storageKey]: "{not json",
    });
    const repository = createRepository(() => storage);
    repository.load();
    failures.remove = new Error("remove failed");

    expect(repository.reset()).toEqual({ ok: false, cause: failures.remove });
    expect(repository.save(validState)).toEqual({
      ok: false,
      reason: "read-only",
    });
    expect(data.get(storageKey)).toBe("{not json");
  });

  it("reuses the parsed state while the stored value is unchanged", () => {
    const { storage, data } = memoryStorage({
      [storageKey]: stored(validState),
    });
    const repository = createRepository(() => storage);
    const stateOf = (result: ReturnType<typeof repository.load>) =>
      result.status === "ok" ? result.state : null;

    const first = stateOf(repository.load());
    expect(stateOf(repository.load())).toBe(first);

    // A changed value is parsed again.
    data.set(storageKey, stored({ ...validState, lists: [] }));
    const changed = stateOf(repository.load());
    expect(changed).not.toBe(first);
    expect(changed?.lists).toEqual([]);
  });
});

describe("stored text", () => {
  const withItem = (text: string): StoredState => ({
    ...validState,
    lists: [{ ...list, items: [{ id: "item-1", text }] }],
  });
  const loads = (text: string) => {
    const { storage } = memoryStorage({ [storageKey]: stored(withItem(text)) });
    return createRepository(() => storage).load().status;
  };
  // Loading repairs text 0.1.0 could have saved, so the schema's own rules
  // are checked through save(), which validates without repairing.
  const saves = (text: string) => {
    const { storage } = memoryStorage();
    const repository = createRepository(() => storage);
    repository.load();
    return repository.save(withItem(text)).ok;
  };

  // One base letter with combining marks is one grapheme however many follow;
  // "x" has no precomposed form, so NFC leaves the marks as they are.
  const markBomb = `x${"\u0301".repeat(5_000)}`;

  it("caps text at 1,600 UTF-16 units even within 100 characters", () => {
    expect(saves(`x${"\u0301".repeat(1_599)}`)).toBe(true);
    expect(saves(`x${"\u0301".repeat(1_600)}`)).toBe(false);
    expect(characterCount(markBomb)).toBe(1);
    expect(saves(markBomb)).toBe(false);
  });

  it("keeps text invalid on load when dropping marks cannot bring it under the cap", () => {
    // An emoji ZWJ chain is one character of any length without a single mark.
    const chain = `👨${"\u200D👨".repeat(600)}`;
    expect(characterCount(chain)).toBe(1);
    expect(loads(chain)).toBe("invalid");
  });

  it.each([
    ["a lone high surrogate", "a\uD800b"],
    ["a lone low surrogate", "a\uDC00b"],
    ["a NUL character", "a\u0000b"],
    ["a tab", "a\tb"],
    ["DEL", "a\u007Fb"],
    ["a C1 control", "a\u0085b"],
    ["another C1 control", "a\u009Fb"],
    ...[
      0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066,
      0x2067, 0x2068, 0x2069,
    ].map((code): [string, string] => [
      `the bidi control U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
      `a${String.fromCharCode(code)}b`,
    ]),
  ])("rejects %s in stored text", (_, text) => {
    expect(saves(text)).toBe(false);
  });

  it.each([
    ["a zero-width space", "\u200B"],
    ["a word joiner and a byte order mark", "\u2060\uFEFF"],
    ["a zero-width joiner", "\u200D"],
    ["the Hangul filler", "\u3164"],
  ])("rejects stored text made only of %s", (_, text) => {
    expect(saves(text)).toBe(false);
  });

  it("accepts 100 of the longest standard emoji sequences", () => {
    const kiss = "👩🏻‍❤️‍💋‍👨🏼";
    expect(kiss.length).toBe(15);
    expect(loads(kiss.repeat(limits.textLength))).toBe("ok");
  });

  it.each([
    ["a family emoji (ZWJ sequence)", "👨‍👩‍👧‍👦"],
    ["a flag", "🇰🇷"],
    ["Hangul compatibility jamo", "ㄱㄴㄷ"],
    ["old Hangul as conjoining jamo, which NFC keeps", "\u1100\u119E"],
    ["a zero-width non-joiner between letters", "می\u200Cخواهم"],
    ["Arabic", "غداء"],
    ["a combining mark on a letter", "e\u0301".normalize("NFC")],
  ])("accepts %s", (_, text) => {
    expect(loads(text)).toBe("ok");
  });

  it("refuses to save an invalid state and leaves storage byte-identical", () => {
    const raw = stored(validState);
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    const repository = createRepository(() => storage);
    repository.load();

    for (const text of [markBomb, "a\u202Eb", "\u200B", " Lunch"]) {
      expect(repository.save(withItem(text))).toMatchObject({
        ok: false,
        reason: "invalid",
      });
      expect(data.get(storageKey)).toBe(raw);
    }
    // The refusal does not lock the store: a valid state still saves.
    expect(repository.save(emptyState)).toEqual({ ok: true });
  });
});

describe("repairing text saved by 0.1.0", () => {
  // 0.1.0 only trimmed and normalized, so any of these could be stored.
  const legacy = {
    ...validState,
    lists: [
      {
        ...list,
        name: "Lunch\u202E",
        items: [
          { id: "item-1", text: "Fried\trice" },
          { id: "item-2", text: "\u200B" },
          { id: "item-3", text: "Ramen\u2066" },
          { id: "item-4", text: "Gyoza\uD800" },
        ],
      },
    ],
  };
  const repaired: StoredState = {
    ...validState,
    lists: [
      {
        ...list,
        name: "Lunch",
        items: [
          { id: "item-1", text: "Fried rice" },
          { id: "item-3", text: "Ramen" },
          { id: "item-4", text: "Gyoza" },
        ],
      },
    ],
  };

  it("cleans text and drops items left blank", () => {
    expect(repairState(legacy)).toEqual(repaired);
  });

  it("shortens a character stacked past the unit cap so it loads", () => {
    // 0.1.0 saved NFC text, which composes the first mark into "á".
    const stacked = `a${"\u0301".repeat(1_700)}`.normalize("NFC");
    const raw = stored({
      ...validState,
      lists: [{ ...list, items: [{ id: "item-1", text: stacked }] }],
    });
    const { storage, data } = memoryStorage({ [storageKey]: raw });

    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: {
        ...validState,
        lists: [
          {
            ...list,
            items: [{ id: "item-1", text: `\u00E1${"\u0301".repeat(8)}` }],
          },
        ],
      },
    });
    expect(data.get(storageKey)).toBe(raw);
  });

  it("returns valid data and data of an unknown shape as they are", () => {
    expect(repairState(validState)).toBe(validState);
    const unknown = { schemaVersion: 1, lists: "none" };
    expect(repairState(unknown)).toBe(unknown);
  });

  it("loads repaired data without writing it, and the next save writes it", () => {
    const raw = stored(legacy);
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    const repository = createRepository(() => storage);

    expect(repository.load()).toEqual({ status: "ok", state: repaired });
    expect(data.get(storageKey)).toBe(raw);
    // The unchanged raw value is served from the cache, still repaired.
    expect(repository.load()).toEqual({ status: "ok", state: repaired });

    expect(repository.save(repaired)).toEqual({ ok: true });
    expect(JSON.parse(data.get(storageKey) ?? "")).toEqual(repaired);
  });

  it("does not rewrite valid data on load", () => {
    const raw = stored(validState);
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: validState,
    });
    expect(data.get(storageKey)).toBe(raw);
  });

  it.each([
    ["a list name left blank", { ...list, name: "\u200B\u202E" }],
    [
      "an item still too long",
      { ...list, items: [{ id: "i", text: `${"x".repeat(101)}\t` }] },
    ],
  ])("keeps data with %s read-only and unchanged", (_, broken) => {
    const raw = stored({ ...validState, lists: [broken] });
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    const repository = createRepository(() => storage);

    expect(repository.load()).toMatchObject({ status: "invalid", raw });
    expect(repository.save(emptyState)).toEqual({
      ok: false,
      reason: "read-only",
    });
    expect(data.get(storageKey)).toBe(raw);
  });
});
