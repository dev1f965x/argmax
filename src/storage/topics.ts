import type { Topic } from "../domain/topics";

const KEY = "argmax.topics";

/** Where the topics live: this device, and nowhere else (ADR 5). */
export interface TopicStore {
  read(): Topic[];
  write(topics: readonly Topic[]): void;
}

export const localTopics: TopicStore = {
  read() {
    try {
      return topicsFrom(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      // A blocked or full storage is not worth an error screen; an empty list is honest.
      return [];
    }
  },

  write(topics) {
    try {
      localStorage.setItem(KEY, JSON.stringify(topics));
    } catch {}
  },
};

/**
 * Keeps only what this build understands. A file edited by hand, or written by a version
 * that stored something else, leaves the app with fewer topics rather than a broken screen.
 */
export function topicsFrom(stored: unknown): Topic[] {
  if (!Array.isArray(stored)) return [];

  return stored.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const { id, name, options } = entry;
    if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") return [];

    return [{ id, name, options: optionsFrom(options) }];
  });
}

function optionsFrom(stored: unknown) {
  if (!Array.isArray(stored)) return [];

  return stored.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const { id, name } = entry;
    if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") return [];

    return [{ id, name }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
