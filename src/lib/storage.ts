import { z } from "./zod";

export const storageKey = "argmax";

/** Product limits from FR11. */
export const limits = {
  textLength: 100,
  itemsPerList: 1_000,
  lists: 100,
} as const;

/**
 * A hard cap in UTF-16 units under the character limit. One grapheme can hold
 * any number of combining marks, so counting graphemes alone would let a single
 * "character" grow without bound. 16 units per character fit 100 of the
 * longest standard emoji sequences (15 units, such as a kiss with two skin
 * tones), so the 100-character promise holds for every visible character.
 */
const maxTextCodeUnits = 16 * limits.textLength;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Counts characters as users see them: a Hangul syllable (composed or written as
 * jamo), an emoji sequence, or a letter with combining marks counts once.
 */
export function characterCount(text: string): number {
  return Array.from(graphemes.segment(text)).length;
}

/** Text no longer than the limit in UTF-16 units cannot exceed it in characters. */
export function withinTextLimit(text: string): boolean {
  if (text.length > maxTextCodeUnits) return false;
  return (
    text.length <= limits.textLength ||
    characterCount(text) <= limits.textLength
  );
}

/**
 * Characters stored text may not contain: C0 and C1 controls, bidirectional
 * formatting controls, which can reorder the text around a name, and lone
 * surrogates, which are not valid Unicode. With the u flag a surrogate pair is
 * one code point outside the surrogate range, so only lone halves match; this
 * also avoids String.prototype.isWellFormed, which the ES2023 lib lacks.
 */
const disallowedCharacters =
  /[\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uD800-\uDFFF]/gu;

// Line breaks and tabs separate words, so they become spaces rather than
// being removed with the other control characters.
const controlWhitespace = /[\t\n\v\f\r\u0085]/g;

/**
 * Turns line breaks and tabs into spaces, removes the other characters stored
 * text may not contain, normalizes to NFC, and trims. Entered text and text
 * saved by 0.1.0, which allowed those characters, both pass through here.
 */
export function cleanText(input: string): string {
  return input
    .replace(controlWhitespace, " ")
    .replace(disallowedCharacters, "")
    .normalize("NFC")
    .trim();
}

// search() ignores the g flag's lastIndex, unlike test().
const hasOnlyAllowedCharacters = (text: string) =>
  text.search(disallowedCharacters) === -1;

const invisibleOnly = /^[\s\p{Default_Ignorable_Code_Point}]*$/u;

/**
 * True when nothing would show: only whitespace and default-ignorable
 * characters such as zero-width spaces and joiners. A joiner inside an emoji
 * sequence or between letters is fine; text made only of them is not.
 */
export function isBlank(text: string): boolean {
  return invisibleOnly.test(text);
}

const isNormalized = (value: string) => value === value.trim().normalize("NFC");

/** Stored text is saved trimmed and NFC-normalized, so the same rule validates it on load. */
const text = z
  .string()
  .refine(hasOnlyAllowedCharacters, "disallowed characters")
  .refine(isNormalized, "not normalized")
  .refine((value) => !isBlank(value), "empty")
  .refine(withinTextLimit, "too long");

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
    .refine(hasUniqueIds, "duplicate item ids"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const storedStateSchema = z.object({
  schemaVersion: z.literal(1),
  lists: z
    .array(listSchema)
    .max(limits.lists)
    .refine(hasUniqueIds, "duplicate list ids"),
});

function hasUniqueIds(entries: { id: string }[]): boolean {
  return new Set(entries.map((entry) => entry.id)).size === entries.length;
}

/**
 * The stored shape with only the fields that hold text checked, so text can be
 * repaired before the strict schema sees it. Other fields pass through as is.
 */
const repairableSchema = z.looseObject({
  lists: z.array(
    z.looseObject({
      name: z.string(),
      items: z.array(z.looseObject({ text: z.string() })),
    }),
  ),
});

/**
 * Cleans text 0.1.0 could have saved: it trimmed and normalized text and
 * checked nothing else. Anything else is left for the schema to reject.
 */
const repairText = (value: string) =>
  isNormalized(value) ? cleanText(value) : value;

/**
 * Cleans every list name and item text the way entered text is cleaned and
 * drops items left blank, so data saved under 0.1.0's looser text rules still
 * loads. Text 0.1.0 would not have saved (untrimmed or not NFC) is not data
 * it wrote, so it is left unchanged and the data stays read-only. A list whose name is left blank is not dropped and gets no invented
 * name, so the strict schema rejects the data and it stays read-only, as
 * before. Returns the input itself when its shape is unknown or nothing changes.
 */
export function repairState(parsed: unknown): unknown {
  const shape = repairableSchema.safeParse(parsed);
  if (!shape.success) return parsed;
  let changed = false;
  const lists = shape.data.lists.map((list) => {
    const name = repairText(list.name);
    const items = list.items.flatMap((item) => {
      const text = repairText(item.text);
      if (text !== item.text) changed = true;
      if (isBlank(text)) return [];
      return [{ ...item, text }];
    });
    if (name !== list.name || items.length !== list.items.length)
      changed = true;
    return { ...list, name, items };
  });
  return changed ? { ...shape.data, lists } : parsed;
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
  | { ok: false; reason: "invalid"; cause: z.ZodError }
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
  // The last valid raw value and its parsed state. Every change and every other
  // tab's save loads the store, so an unchanged value skips parsing it again.
  let cache: { raw: string; state: StoredState } | null = null;

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
    if (raw === cache?.raw) {
      mode = "writable";
      return { status: "ok", state: cache.state };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      mode = "read-only";
      return { status: "invalid", raw, cause };
    }
    // A repaired state is not written here; the next change saves it.
    const result = storedStateSchema.safeParse(repairState(parsed));
    if (!result.success) {
      mode = "read-only";
      return { status: "invalid", raw, cause: result.error };
    }
    mode = "writable";
    cache = { raw, state: result.data };
    return { status: "ok", state: result.data };
  }

  function save(state: StoredState): SaveResult {
    if (mode === "unloaded") return { ok: false, reason: "not-loaded" };
    if (mode === "read-only") return { ok: false, reason: "read-only" };
    // Every change goes through validateText, so this guards against a bug
    // writing data that the next load would reject and lock as read-only.
    const checked = storedStateSchema.safeParse(state);
    if (!checked.success)
      return { ok: false, reason: "invalid", cause: checked.error };
    try {
      const raw = JSON.stringify(state);
      getStorage().setItem(storageKey, raw);
      cache = { raw, state };
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        reason: isQuotaExceeded(cause) ? "full" : "unavailable",
        cause,
      };
    }
  }

  /**
   * Deletes the stored state, including invalid data the user chose to discard,
   * and allows saving again.
   */
  function reset(): { ok: true } | { ok: false; cause: unknown } {
    try {
      getStorage().removeItem(storageKey);
    } catch (cause) {
      return { ok: false, cause };
    }
    mode = "writable";
    return { ok: true };
  }

  return { load, save, reset };
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

export type Repository = ReturnType<typeof createRepository>;

/** Returns window.localStorage, which throws when the browser blocks site data. */
export function browserStorage(): Storage {
  return window.localStorage;
}
