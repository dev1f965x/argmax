import {
  characterCount,
  type Item,
  type List,
  limits,
  type StoredState,
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

/** Trims surrounding whitespace and rejects empty or over-long text (FR2, FR5, FR11). */
export function validateText(
  input: string,
): { ok: true; value: string } | { ok: false; error: TextError } {
  const value = input.trim();
  if (value.length === 0) return { ok: false, error: "empty" };
  if (characterCount(value) > limits.textLength)
    return { ok: false, error: "too-long" };
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
  return updateList(state, listId, context, (list) => ({
    ...list,
    name: text.value,
  }));
}

export function deleteList(
  state: StoredState,
  listId: string,
): Result<ListError> {
  if (!state.lists.some((list) => list.id === listId))
    return { ok: false, error: "not-found" };
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
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return { ok: false, error: "not-found" };
  if (list.items.length >= limits.itemsPerList)
    return { ok: false, error: "item-limit" };

  // Duplicate items are allowed without a warning (FR5).
  const item: Item = { id: context.newId(), text: text.value };
  return updateList(state, listId, context, (current) => ({
    ...current,
    items: [...current.items, item],
  }));
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
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list?.items.some((item) => item.id === itemId))
    return { ok: false, error: "not-found" };
  return updateList(state, listId, context, (current) => ({
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, text: text.value } : item,
    ),
  }));
}

export function removeItem(
  state: StoredState,
  listId: string,
  itemId: string,
  context: Context,
): Result<ItemError> {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list?.items.some((item) => item.id === itemId))
    return { ok: false, error: "not-found" };
  return updateList(state, listId, context, (current) => ({
    ...current,
    items: current.items.filter((item) => item.id !== itemId),
  }));
}

function updateList<E>(
  state: StoredState,
  listId: string,
  context: Context,
  change: (list: List) => List,
): Result<E | "not-found"> {
  if (!state.lists.some((list) => list.id === listId))
    return { ok: false, error: "not-found" };
  const updatedAt = context.now().toISOString();
  return {
    ok: true,
    state: {
      ...state,
      lists: state.lists.map((list) =>
        list.id === listId ? { ...change(list), updatedAt } : list,
      ),
    },
  };
}
