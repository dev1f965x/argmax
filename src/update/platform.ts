import type { UpdateSource } from "./ports";

/** Only the installed Windows build can replace itself in place (ADR 8). */
export const updatesItself = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Nothing to install over a page that is already the current one. */
export const alreadyCurrent: UpdateSource = {
  check: async () => null,
};
