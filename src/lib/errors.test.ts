import { describe, expect, it } from "vitest";
import { describeError } from "./errors";
import { z } from "./zod";

describe("describeError", () => {
  it("names a parser error without quoting the stored text", () => {
    let error: unknown;
    try {
      JSON.parse("{secret list name");
    } catch (caught) {
      error = caught;
    }
    expect(describeError(error)).toBe("SyntaxError");
  });

  it("lists Zod issue paths and codes without the rejected values", () => {
    const result = z.object({ name: z.string() }).safeParse({ name: 42 });
    expect(describeError(result.error)).toBe("name: invalid_type");
  });

  it("names a DOMException", () => {
    expect(describeError(new DOMException("full", "QuotaExceededError"))).toBe(
      "QuotaExceededError",
    );
  });
});
