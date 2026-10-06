import { describe, expect, it } from "vitest";
import {
  readShowChances,
  showChancesStorageKey,
  storeShowChances,
} from "./preferences";

const storageWith = (value: string | null) => ({ getItem: () => value });
const blockedStorage = {
  getItem: () => {
    throw new DOMException("Blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("Full", "QuotaExceededError");
  },
};

describe("readShowChances", () => {
  it("is off by default", () => {
    expect(readShowChances(storageWith(null))).toBe(false);
    expect(readShowChances(undefined)).toBe(false);
  });

  it("is on only when saved on", () => {
    expect(readShowChances(storageWith("true"))).toBe(true);
    expect(readShowChances(storageWith("false"))).toBe(false);
    expect(readShowChances(storageWith("yes"))).toBe(false);
  });

  it("is off when storage is blocked", () => {
    expect(readShowChances(blockedStorage)).toBe(false);
  });
});

describe("storeShowChances", () => {
  it("saves the choice under its own key", () => {
    const saved = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => void saved.set(key, value),
    };

    expect(storeShowChances(storage, true)).toBe(true);
    expect(saved.get(showChancesStorageKey)).toBe("true");
    expect(storeShowChances(storage, false)).toBe(true);
    expect(saved.get(showChancesStorageKey)).toBe("false");
  });

  it("reports when the choice cannot be saved", () => {
    expect(storeShowChances(blockedStorage, true)).toBe(false);
    expect(storeShowChances(undefined, true)).toBe(false);
  });
});
