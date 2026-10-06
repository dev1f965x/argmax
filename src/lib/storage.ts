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
const controlWhitespace = /[\t\n\v\f\r\u0085\u2028\u2029]/g;

/**
 * Combining marks kept per character when text is over the unit cap. The
 * longest stacks in real text stay well below it: Thai and Vietnamese use up
 * to 3, a Devanagari conjunct with a vowel sign and anusvara about 5, and a
 * Tibetan Sanskrit stack about 6. UAX #15's stream-safe limit of 30 would
 * still let one character tower over its neighbors.
 */
const maxMarksPerCharacter = 8;
const combiningMark = /\p{M}/u;

/** Drops the marks after the first maxMarksPerCharacter in each character. */
function capMarks(text: string): string {
  return Array.from(graphemes.segment(text), ({ segment }) => {
    let marks = 0;
    let kept = "";
    for (const codePoint of segment) {
      if (combiningMark.test(codePoint) && ++marks > maxMarksPerCharacter)
        continue;
      kept += codePoint;
    }
    return kept;
  }).join("");
}

/**
 * Turns line breaks and tabs into spaces, removes the other characters stored
 * text may not contain, normalizes to NFC, and trims. Text still over the unit
 * cap loses the marks stacked beyond maxMarksPerCharacter, which only abusive
 * text has. Entered text and text saved by 0.1.0, which allowed all of these,
 * both pass through here; the result may still be too long for the schema.
 */
export function cleanText(input: string): string {
  const cleaned = input
    .replace(controlWhitespace, " ")
    .replace(disallowedCharacters, "")
    .normalize("NFC")
    .trim();
  if (cleaned.length <= maxTextCodeUnits) return cleaned;
  // Still NFC and trimmed: a mark can only block the composition of marks
  // after it, and every character keeps its first code point.
  return capMarks(cleaned);
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

/**
 * Stored text is saved trimmed and NFC-normalized, so the same rule validates
 * it on load. Lists from share links are held to it as well.
 */
export const storedTextSchema = z
  .string()
  .refine(hasOnlyAllowedCharacters, "disallowed characters")
  .refine(isNormalized, "not normalized")
  .refine((value) => !isBlank(value), "empty")
  .refine(withinTextLimit, "too long");

/** The schema version this app writes. */
const currentSchemaVersion = 2;

/**
 * Item weights stored in version 2 (FR12). The UI limits a weight to the
 * number of items in its list, but storage allows up to the item limit, so
 * removing items never makes the stored weights of the others invalid.
 */
export const weightRange = { min: 1, max: limits.itemsPerList } as const;

const itemSchemaV1 = z.object({
  id: z.string().min(1),
  text: storedTextSchema,
});

const itemSchema = itemSchemaV1.extend({
  weight: z.int().min(weightRange.min).max(weightRange.max),
});

function listSchemaOf<Item extends z.ZodType<{ id: string }>>(item: Item) {
  return z.object({
    id: z.string().min(1),
    name: storedTextSchema,
    items: z
      .array(item)
      .max(limits.itemsPerList)
      .refine(hasUniqueIds, "duplicate item ids"),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  });
}

/** Version 1, written by 0.1.0; read only to migrate it. */
const storedStateSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  lists: z
    .array(listSchemaOf(itemSchemaV1))
    .max(limits.lists)
    .refine(hasUniqueIds, "duplicate list ids"),
});

const storedStateSchema = z.object({
  schemaVersion: z.literal(currentSchemaVersion),
  lists: z
    .array(listSchemaOf(itemSchema))
    .max(limits.lists)
    .refine(hasUniqueIds, "duplicate list ids"),
});

/** Reads only the version, so data from a newer app can be told apart from damaged data. */
const versionSchema = z.looseObject({ schemaVersion: z.int().positive() });

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
 * drops items left blank, so version 1 data saved under 0.1.0's looser text
 * rules still loads. Only version 1 is repaired: version 2 is written by an
 * app that validates before saving, so text it rejects means damaged data.
 * Text 0.1.0 would not have saved (untrimmed or not NFC) is not data it
 * wrote, so it is left unchanged and the data stays read-only. A list whose
 * name is left blank is not dropped and gets no invented name, so the strict
 * schema rejects the data and it stays read-only, as before. Returns the
 * input itself when its shape is unknown or nothing changes.
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
export type List = StoredState["lists"][number];
export type StoredState = z.infer<typeof storedStateSchema>;
type StoredStateV1 = z.infer<typeof storedStateSchemaV1>;

export const emptyState: StoredState = {
  schemaVersion: currentSchemaVersion,
  lists: [],
};

/**
 * Turns 0.1.0 data into version 2 without loss: every item gets weight 1,
 * the equal chance it had in 0.1.0, and duplicates stay separate items.
 */
export function migrateV1(state: StoredStateV1): StoredState {
  return {
    schemaVersion: currentSchemaVersion,
    lists: state.lists.map((list) => ({
      ...list,
      items: list.items.map((item) => ({ ...item, weight: 1 })),
    })),
  };
}

/** Validates parsed JSON of any known version and returns it as the current version. */
function readState(
  parsed: unknown,
): { success: true; data: StoredState } | { success: false; error: unknown } {
  const version = versionSchema.safeParse(parsed);
  if (version.success && version.data.schemaVersion === 1) {
    // Valid data skips the repair, which only text 0.1.0 could have saved needs.
    let v1 = storedStateSchemaV1.safeParse(parsed);
    if (!v1.success) v1 = storedStateSchemaV1.safeParse(repairState(parsed));
    return v1.success ? { success: true, data: migrateV1(v1.data) } : v1;
  }
  return storedStateSchema.safeParse(parsed);
}

export type LoadResult =
  | { status: "ok"; state: StoredState }
  | { status: "invalid"; raw: string; cause: unknown }
  /** Saved by a later version of the app, which this one must not overwrite. */
  | { status: "newer"; raw: string }
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
    const version = versionSchema.safeParse(parsed);
    if (version.success && version.data.schemaVersion > currentSchemaVersion) {
      mode = "read-only";
      return { status: "newer", raw };
    }
    // A repaired or migrated state is not written here, so a 0.1.0 tab still
    // open reads the data until the next change saves it as version 2.
    const result = readState(parsed);
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
