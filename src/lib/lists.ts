import {
  type Item,
  isBlank,
  type List,
  limits,
  removeDisallowedCharacters,
  type StoredState,
  withinTextLimit,
} from "./storage";

export type TextError = "empty" | "too-long";
export type ListError = TextError | "list-limit" | "not-found";
export type ItemError = TextError | "item-limit" | "not-found";

export type Result<E> =
  | { ok: true; state: StoredState }
  | { ok: false; error: E };

/** Ids and timestamps are injected so callers and tests control them. */
export interface Context {
  newId: () => string;
  now: () => Date;
}

export const browserContext: Context = {
  newId: () => crypto.randomUUID(),
  now: () => new Date(),
};

// Line breaks and tabs in pasted text separate words, so they become spaces
// rather than being removed with the other control characters.
const controlWhitespace = /[\t\n\v\f\r\u0085]/g;

/**
 * Turns line breaks and tabs into spaces and removes other control characters,
 * bidirectional controls, and lone surrogates, which pasted text can carry
 * unseen; then trims surrounding whitespace, normalizes to NFC, and rejects
 * empty, invisible, or over-long text (FR2, FR5, FR11). All stored text passes
 * through here, and its result always passes the stored-data schema.
 */
export function validateText(
  input: string,
): { ok: true; value: string } | { ok: false; error: TextError } {
  const value = removeDisallowedCharacters(
    input.replace(controlWhitespace, " "),
  )
    .normalize("NFC")
    .trim();
  if (isBlank(value)) return { ok: false, error: "empty" };
  if (!withinTextLimit(value)) return { ok: false, error: "too-long" };
  return { ok: true, value };
}

export function createList(
  state: StoredState,
  name: string,
  context: Context,
): Result<ListError> {
  const text = validateText(name);
  if (!text.ok) return text;
  if (state.lists.length >= limits.lists)
    return { ok: false, error: "list-limit" };

  const timestamp = context.now().toISOString();
  const list: List = {
    id: context.newId(),
    name: text.value,
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { ok: true, state: { ...state, lists: [...state.lists, list] } };
}

export function renameList(
  state: StoredState,
  listId: string,
  name: string,
  context: Context,
): Result<ListError> {
  const text = validateText(name);
  if (!text.ok) return text;
  const list = findList(state, listId);
  if (!list) return { ok: false, error: "not-found" };
  // An unchanged name is not an edit, so updatedAt stays as it was.
  if (text.value === list.name) return { ok: true, state };
  return replaceList(state, { ...list, name: text.value }, context);
}

export function deleteList(
  state: StoredState,
  listId: string,
): Result<ListError> {
  if (!findList(state, listId)) return { ok: false, error: "not-found" };
  return {
    ok: true,
    state: {
      ...state,
      lists: state.lists.filter((list) => list.id !== listId),
    },
  };
}

export function addItem(
  state: StoredState,
  listId: string,
  input: string,
  context: Context,
): Result<ItemError> {
  const text = validateText(input);
  if (!text.ok) return text;
  const list = findList(state, listId);
  if (!list) return { ok: false, error: "not-found" };
  if (list.items.length >= limits.itemsPerList)
    return { ok: false, error: "item-limit" };

  // Duplicate items are allowed without a warning (FR5).
  const item: Item = { id: context.newId(), text: text.value };
  return replaceList(state, { ...list, items: [...list.items, item] }, context);
}

export function editItem(
  state: StoredState,
  listId: string,
  itemId: string,
  input: string,
  context: Context,
): Result<ItemError> {
  const text = validateText(input);
  if (!text.ok) return text;
  const list = findList(state, listId);
  if (!list?.items.some((item) => item.id === itemId))
    return { ok: false, error: "not-found" };
  const items = list.items.map((item) =>
    item.id === itemId ? { ...item, text: text.value } : item,
  );
  return replaceList(state, { ...list, items }, context);
}

export function removeItem(
  state: StoredState,
  listId: string,
  itemId: string,
  context: Context,
): Result<ItemError> {
  const list = findList(state, listId);
  if (!list?.items.some((item) => item.id === itemId))
    return { ok: false, error: "not-found" };
  return replaceList(
    state,
    { ...list, items: list.items.filter((item) => item.id !== itemId) },
    context,
  );
}

/** Puts a removed item back where it was, for Undo. */
export function restoreItem(
  state: StoredState,
  listId: string,
  item: Item,
  index: number,
  context: Context,
): Result<ItemError> {
  const list = findList(state, listId);
  if (!list) return { ok: false, error: "not-found" };
  // Another tab may have restored it already.
  if (list.items.some((existing) => existing.id === item.id))
    return { ok: true, state };
  if (list.items.length >= limits.itemsPerList)
    return { ok: false, error: "item-limit" };
  const items = list.items.toSpliced(
    Math.min(index, list.items.length),
    0,
    item,
  );
  return replaceList(state, { ...list, items }, context);
}

function findList(state: StoredState, listId: string): List | undefined {
  return state.lists.find((list) => list.id === listId);
}

/** Returns a new state with the list replaced and its updatedAt set to now. */
function replaceList(
  state: StoredState,
  changed: List,
  context: Context,
): { ok: true; state: StoredState } {
  const updated: List = { ...changed, updatedAt: context.now().toISOString() };
  return {
    ok: true,
    state: {
      ...state,
      lists: state.lists.map((list) =>
        list.id === updated.id ? updated : list,
      ),
    },
  };
}
