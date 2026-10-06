/**
 * Display preferences kept in this browser next to the lists, each under its
 * own key so a damaged or blocked preference never affects the lists.
 */

/** Returns localStorage, or undefined when the browser blocks site data. */
export function localStorageIfAllowed(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    // Accessing localStorage throws when the browser blocks site data.
    return undefined;
  }
}

export const showChancesStorageKey = "argmax:showChances";

/** Off unless this browser saved it on (FR14); unreadable storage means off. */
export function readShowChances(
  storage: Pick<Storage, "getItem"> | undefined,
): boolean {
  try {
    return storage?.getItem(showChancesStorageKey) === "true";
  } catch {
    return false;
  }
}

/** Returns false when the choice could not be saved, so it lasts only for this visit. */
export function storeShowChances(
  storage: Pick<Storage, "setItem"> | undefined,
  show: boolean,
): boolean {
  try {
    storage?.setItem(showChancesStorageKey, String(show));
    return storage !== undefined;
  } catch {
    return false;
  }
}
