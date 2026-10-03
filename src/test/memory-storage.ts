/** In-memory Storage whose methods can be made to throw. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const failures: { get?: Error; set?: Error; remove?: Error } = {};
  const storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem(key: string) {
      if (failures.remove) throw failures.remove;
      data.delete(key);
    },
    getItem(key: string) {
      if (failures.get) throw failures.get;
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failures.set) throw failures.set;
      data.set(key, value);
    },
  } satisfies Storage;
  return { storage, data, failures };
}
