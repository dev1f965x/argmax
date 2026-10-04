/** Reads a string that one screen passed to the next in the history entry's state. */
export function navigationString(state: unknown, key: string): string | null {
  if (typeof state !== "object" || state === null || !(key in state))
    return null;
  const value: unknown = Reflect.get(state, key);
  return typeof value === "string" ? value : null;
}
