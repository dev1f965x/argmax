import { z } from "zod";

export const storageKey = "argmax";

/** Product limits from FR11. */
export const limits = {
  textLength: 100,
  itemsPerList: 1_000,
  lists: 100,
} as const;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Counts characters as users see them: a Hangul syllable, an emoji sequence, or
 * a letter with combining marks counts once. Text is normalized to NFC first, so
 * decomposed Hangul pasted from some systems is not counted per jamo.
 */
export function characterCount(text: string): number {
  return Array.from(graphemes.segment(text.normalize("NFC"))).length;
}

/** Stored text is saved trimmed and NFC-normalized, so the same rule validates it on load. */
const text = z
  .string()
  .refine((value) => value === value.trim().normalize("NFC"), "not normalized")
  .refine((value) => value.length > 0, "empty")
  .refine((value) => characterCount(value) <= limits.textLength, "too long");

const itemSchema = z.object({
  id: z.string().min(1),
  text,
});

const listSchema = z.object({
  id: z.string().min(1),
  name: text,
  items: z
    .array(itemSchema)
    .max(limits.itemsPerList)
    .refine((items) => hasUniqueIds(items), "duplicate item ids"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const storedStateSchema = z.object({
  schemaVersion: z.literal(1),
  lists: z
    .array(listSchema)
    .max(limits.lists)
    .refine((lists) => hasUniqueIds(lists), "duplicate list ids"),
});

function hasUniqueIds(entries: { id: string }[]): boolean {
  return new Set(entries.map((entry) => entry.id)).size === entries.length;
}

export type Item = z.infer<typeof itemSchema>;
export type List = z.infer<typeof listSchema>;
export type StoredState = z.infer<typeof storedStateSchema>;

export const emptyState: StoredState = { schemaVersion: 1, lists: [] };

export type LoadResult =
  | { status: "ok"; state: StoredState }
  | { status: "invalid"; raw: string; cause: unknown }
  | { status: "unavailable"; cause: unknown };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "full"; cause: unknown }
  | { ok: false; reason: "read-only" | "not-loaded" };

type Mode = "unloaded" | "writable" | "read-only";

/**
 * Reads and writes the app state in one localStorage entry.
 *
 * Saving is allowed only after a successful load. Saving before a load, or after
 * a failed read, could replace data the app never saw; after a load finds invalid
 * data, saving is refused so the raw value stays recoverable.
 */
export function createRepository(getStorage: () => Storage) {
  let mode: Mode = "unloaded";

  function load(): LoadResult {
    let raw: string | null;
    try {
      raw = getStorage().getItem(storageKey);
    } catch (cause) {
      mode = "unloaded";
      return { status: "unavailable", cause };
    }
    if (raw === null) {
      mode = "writable";
      return { status: "ok", state: emptyState };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      mode = "read-only";
      return { status: "invalid", raw, cause };
    }
    const result = storedStateSchema.safeParse(parsed);
    if (!result.success) {
      mode = "read-only";
      return { status: "invalid", raw, cause: result.error };
    }
    mode = "writable";
    return { status: "ok", state: result.data };
  }

  function save(state: StoredState): SaveResult {
    if (mode === "unloaded") return { ok: false, reason: "not-loaded" };
    if (mode === "read-only") return { ok: false, reason: "read-only" };
    try {
      getStorage().setItem(storageKey, JSON.stringify(state));
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        reason: isQuotaExceeded(cause) ? "full" : "unavailable",
        cause,
      };
    }
  }

  return { load, save };
}

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    // Older Safari reports code 22 and older Firefox its own name instead of QuotaExceededError.
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22)
  );
}

/** Returns window.localStorage, which throws when the browser blocks site data. */
export function browserStorage(): Storage {
  return window.localStorage;
}
