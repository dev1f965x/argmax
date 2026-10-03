import { describe, expect, it } from "vitest";
import { detectLocale, localeStorageKey, storeLocale } from "./locale";

const storageWith = (value: string | null) => ({ getItem: () => value });
const blockedStorage = {
  getItem: () => {
    throw new DOMException("Blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("Full", "QuotaExceededError");
  },
};

describe("detectLocale", () => {
  it("uses a stored choice over the browser language", () => {
    expect(detectLocale(storageWith("ko"), ["en-US"])).toBe("ko");
  });

  it("ignores an unsupported stored value", () => {
    expect(detectLocale(storageWith("fr"), ["ko-KR"])).toBe("ko");
  });

  it("uses the first supported browser language", () => {
    expect(detectLocale(storageWith(null), ["ja-JP", "ko-KR", "en-US"])).toBe(
      "ko",
    );
    expect(detectLocale(storageWith(null), ["EN-gb"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(detectLocale(storageWith(null), ["ja-JP"])).toBe("en");
    expect(detectLocale(undefined, [])).toBe("en");
  });

  it("follows the browser when storage is blocked", () => {
    expect(detectLocale(blockedStorage, ["ko"])).toBe("ko");
  });
});

describe("storeLocale", () => {
  it("saves the choice under the documented key", () => {
    const saved = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => void saved.set(key, value),
    };

    expect(storeLocale(storage, "ko")).toBe(true);
    expect(saved.get(localeStorageKey)).toBe("ko");
  });

  it("reports when the choice cannot be saved", () => {
    expect(storeLocale(blockedStorage, "ko")).toBe(false);
    expect(storeLocale(undefined, "ko")).toBe(false);
  });
});
