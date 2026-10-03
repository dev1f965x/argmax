import { describe, expect, it } from "vitest";
import { memoryStorage } from "@/test/memory-storage";
import {
  characterCount,
  createRepository,
  emptyState,
  limits,
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
});
