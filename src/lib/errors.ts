import { z } from "./zod";

/**
 * Summarizes an error for the console without user content: parser messages
 * quote the stored text, and Zod errors include the rejected values.
 */
export function describeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.code}`)
      .join(", ");
  }
  // DOMException is not an Error subclass in every environment.
  if (error instanceof Error || error instanceof DOMException)
    return error.name;
  return typeof error;
}
