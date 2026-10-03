import { describe, expect, it } from "vitest";
import {
  createRepository,
  emptyState,
  limits,
  type StoredState,
  storageKey,
} from "./storage";

/** In-memory Storage whose methods can be made to throw. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const failures: { get?: Error; set?: Error } = {};
  const storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    getItem(key: string) {
      if (failures.get) throw failures.get;
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failures.set) throw failures.set;
      data.set(key, value);
    },
  } satisfies Storage;
  return { storage, data, failures };
}

const validState: StoredState = {
  schemaVersion: 1,
  lists: [
    {
      id: "list-1",
      name: "Lunch",
      items: [{ id: "item-1", text: "Ramen" }],
      createdAt: "2026-10-03T00:00:00.000Z",
      updatedAt: "2026-10-03T00:00:00.000Z",
    },
  ],
};

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
    expect(repository.save(validState)).toEqual({ ok: true });
    expect(JSON.parse(data.get(storageKey) ?? "")).toEqual(validState);
    expect(createRepository(() => storage).load()).toEqual({
      status: "ok",
      state: validState,
    });
  });

  it.each([
    ["malformed JSON", "{not json"],
    [
      "an unknown schema version",
      JSON.stringify({ ...validState, schemaVersion: 2 }),
    ],
    ["a missing field", JSON.stringify({ schemaVersion: 1 })],
    [
      "an empty list name",
      JSON.stringify({
        ...validState,
        lists: [{ ...validState.lists[0], name: "  " }],
      }),
    ],
    [
      "too many items",
      JSON.stringify({
        ...validState,
        lists: [
          {
            ...validState.lists[0],
            items: Array.from({ length: limits.itemsPerList + 1 }, (_, i) => ({
              id: `i${i}`,
              text: "x",
            })),
          },
        ],
      }),
    ],
  ])("reports %s as invalid and never overwrites it", (_, raw) => {
    const { storage, data } = memoryStorage({ [storageKey]: raw });
    const repository = createRepository(() => storage);

    expect(repository.load()).toEqual({ status: "invalid", raw });
    expect(repository.save(emptyState)).toEqual({
      ok: false,
      reason: "read-only",
    });
    expect(data.get(storageKey)).toBe(raw);
  });

  it("reports blocked storage as unavailable on load and save", () => {
    const blocked = () => {
      throw new DOMException("Access denied", "SecurityError");
    };
    const repository = createRepository(blocked);
    expect(repository.load()).toEqual({ status: "unavailable" });
    expect(repository.save(validState)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports a failing read as unavailable but still allows saving", () => {
    const { storage, failures, data } = memoryStorage();
    failures.get = new Error("read failed");
    const repository = createRepository(() => storage);
    expect(repository.load()).toEqual({ status: "unavailable" });
    expect(repository.save(validState)).toEqual({ ok: true });
    expect(data.has(storageKey)).toBe(true);
  });

  it("reports a full storage and keeps the previous value", () => {
    const { storage, failures, data } = memoryStorage({
      [storageKey]: JSON.stringify(emptyState),
    });
    const repository = createRepository(() => storage);
    repository.load();
    failures.set = new DOMException("Quota exceeded", "QuotaExceededError");

    expect(repository.save(validState)).toEqual({ ok: false, reason: "full" });
    expect(data.get(storageKey)).toBe(JSON.stringify(emptyState));
  });

  it("reports other write errors as unavailable", () => {
    const { storage, failures } = memoryStorage();
    failures.set = new Error("write failed");
    expect(createRepository(() => storage).save(validState)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
