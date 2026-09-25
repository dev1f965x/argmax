import type { UpdateSource } from "./ports";

/** Only the installed Windows build can replace itself in place (ADR 8). */
export const updatesItself = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** A page is always current, so there is nothing to install over it. */
export const alreadyCurrent: UpdateSource = {
  check: async () => null,
};
