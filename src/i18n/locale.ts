export const locales = ["en", "ko"] as const;
export type Locale = (typeof locales)[number];

export const localeStorageKey = "argmax:locale";
const fallbackLocale: Locale = "en";

function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

/** A stored choice wins; otherwise the first supported browser language. */
export function detectLocale(
  storage: Pick<Storage, "getItem"> | undefined,
  languages: readonly string[],
): Locale {
  const stored = readStoredLocale(storage);
  if (stored) return stored;

  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return fallbackLocale;
}

function readStoredLocale(
  storage: Pick<Storage, "getItem"> | undefined,
): Locale | undefined {
  try {
    const value = storage?.getItem(localeStorageKey);
    return isLocale(value) ? value : undefined;
  } catch {
    // Storage can throw when blocked by the browser; the language then follows the browser.
    return undefined;
  }
}

/** Returns false when the choice could not be saved, so it lasts only for this visit. */
export function storeLocale(
  storage: Pick<Storage, "setItem"> | undefined,
  locale: Locale,
): boolean {
  try {
    storage?.setItem(localeStorageKey, locale);
    return storage !== undefined;
  } catch {
    return false;
  }
}
