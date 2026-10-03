import { z } from "zod";

export const storageKey = "argmax";

/** Product limits from FR11. */
export const limits = {
  textLength: 100,
  itemsPerList: 1_000,
  lists: 100,
} as const;

/** Counts characters as users see them, so emoji and Hangul count as one each. */
export function characterCount(text: string): number {
  return Array.from(text).length;
}

const text = z
  .string()
  .refine((value) => value.trim().length > 0, "empty")
  .refine((value) => characterCount(value) <= limits.textLength, "too long");

const itemSchema = z.object({
  id: z.string().min(1),
  text,
});

const listSchema = z.object({
  id: z.string().min(1),
  name: text,
  items: z.array(itemSchema).max(limits.itemsPerList),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const storedStateSchema = z.object({
  schemaVersion: z.literal(1),
  lists: z.array(listSchema).max(limits.lists),
});

export type Item = z.infer<typeof itemSchema>;
export type List = z.infer<typeof listSchema>;
export type StoredState = z.infer<typeof storedStateSchema>;

export const emptyState: StoredState = { schemaVersion: 1, lists: [] };

export type LoadResult =
  | { status: "ok"; state: StoredState }
  | { status: "invalid"; raw: string }
  | { status: "unavailable" };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "full" | "read-only" };

/**
 * Reads and writes the app state in one localStorage entry.
 *
 * After a load finds invalid data, saving is refused so the raw data is never
 * overwritten; the user keeps a chance to recover it.
 */
export function createRepository(getStorage: () => Storage) {
  // Set once invalid data is found, so it is never overwritten.
  let preservesInvalidData = false;

  function load(): LoadResult {
    let raw: string | null;
    try {
      raw = getStorage().getItem(storageKey);
    } catch {
      return { status: "unavailable" };
    }
    if (raw === null) return { status: "ok", state: emptyState };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      preservesInvalidData = true;
      return { status: "invalid", raw };
    }
    const result = storedStateSchema.safeParse(parsed);
    if (!result.success) {
      preservesInvalidData = true;
      return { status: "invalid", raw };
    }
    return { status: "ok", state: result.data };
  }

  function save(state: StoredState): SaveResult {
    if (preservesInvalidData) return { ok: false, reason: "read-only" };
    try {
      getStorage().setItem(storageKey, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: isQuotaExceeded(error) ? "full" : "unavailable",
      };
    }
  }

  return { load, save };
}

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  );
}

/** Returns window.localStorage, which throws when the browser blocks site data. */
export function browserStorage(): Storage {
  return window.localStorage;
}
