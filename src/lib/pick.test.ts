import { describe, expect, it } from "vitest";
import { pickIndex, type RandomSource } from "./pick";

/** Returns the given values in order, one per call. */
function fakeRandom(values: number[]): RandomSource {
  const queue = [...values];
  return (buffer) => {
    const next = queue.shift();
    if (next === undefined) throw new Error("No more fake values");
    buffer[0] = next;
  };
}

const range = 2 ** 32;

describe("pickIndex", () => {
  it("returns 0 when there is one item", () => {
    expect(pickIndex(1)).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, range + 1])(
    "rejects n = %s",
    (n) => {
      expect(() => pickIndex(n)).toThrow(RangeError);
    },
  );

  it("maps an accepted value to its remainder", () => {
    expect(pickIndex(3, fakeRandom([7]))).toBe(1);
  });

  it("accepts the last value below the limit", () => {
    const limit = range - (range % 3);
    expect(pickIndex(3, fakeRandom([limit - 1]))).toBe((limit - 1) % 3);
  });

  it("draws again while the value is in the rejected range", () => {
    const limit = range - (range % 3);
    // Both limit and 2^32 - 1 would favor index 0 and 1 if taken modulo 3.
    expect(pickIndex(3, fakeRandom([limit, range - 1, 5]))).toBe(2);
  });

  it("never rejects when n divides 2^32", () => {
    expect(pickIndex(4, fakeRandom([range - 1]))).toBe(3);
    expect(pickIndex(range, fakeRandom([range - 1]))).toBe(range - 1);
  });

  it("gives every index an equal share over many draws", () => {
    const n = 3;
    const draws = 30_000;
    const counts = new Array<number>(n).fill(0);
    for (let i = 0; i < draws; i += 1) {
      const index = pickIndex(n);
      counts[index] = (counts[index] ?? 0) + 1;
    }

    // A smoke check for a stuck or skewed source; the deterministic tests above are
    // what prove there is no modulo bias, which is far too small to detect by sampling.
    // Chi-square goodness of fit with n - 1 = 2 degrees of freedom. For 2 degrees
    // of freedom P(X > x) = exp(-x / 2), so 27.63 is the critical value at
    // p = 1e-6: a fair picker fails about once in a million runs.
    const expected = draws / n;
    const chiSquare = counts.reduce(
      (sum, count) => sum + (count - expected) ** 2 / expected,
      0,
    );
    expect(chiSquare).toBeLessThan(27.63);
  });
});
