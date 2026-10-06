import { describe, expect, it } from "vitest";
import { pickIndex, pickWeightedIndex, type RandomSource } from "./pick";

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

describe("pickWeightedIndex", () => {
  it("returns 0 when there is one item, whatever its weight", () => {
    expect(pickWeightedIndex([1])).toBe(0);
    expect(pickWeightedIndex([1_000])).toBe(0);
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 2],
  ])("maps position %i of weights [2, 1, 3] to index %i", (position, index) => {
    // The total 6 does not divide 2^32, so values below the limit map by remainder.
    expect(pickWeightedIndex([2, 1, 3], fakeRandom([position]))).toBe(index);
    expect(pickWeightedIndex([2, 1, 3], fakeRandom([position + 6]))).toBe(
      index,
    );
  });

  it("draws again in the rejected range, like pickIndex", () => {
    const limit = range - (range % 6);
    expect(pickWeightedIndex([2, 1, 3], fakeRandom([limit, 2]))).toBe(1);
  });

  it("treats equal weights like pickIndex", () => {
    for (const value of [0, 1, 2, 7, range - 2]) {
      expect(pickWeightedIndex([1, 1, 1], fakeRandom([value]))).toBe(
        pickIndex(3, fakeRandom([value])),
      );
    }
  });

  it.each([
    ["no weights", []],
    ["a weight of 0", [1, 0]],
    ["a negative weight", [-1]],
    ["a fractional weight", [1.5]],
    ["NaN", [Number.NaN]],
    ["infinity", [Number.POSITIVE_INFINITY]],
    ["a total above 2^32", [range, 1]],
  ])("rejects %s", (_, weights) => {
    expect(() => pickWeightedIndex(weights)).toThrow(RangeError);
  });

  it("accepts a total of exactly 2^32", () => {
    expect(pickWeightedIndex([range - 1, 1], fakeRandom([range - 1]))).toBe(1);
  });

  it("gives each index a share proportional to its weight over many draws", () => {
    const weights = [1, 2, 3, 4];
    const total = 10;
    const draws = 40_000;
    const counts = new Array<number>(weights.length).fill(0);
    for (let i = 0; i < draws; i += 1) {
      const index = pickWeightedIndex(weights);
      counts[index] = (counts[index] ?? 0) + 1;
    }

    // A smoke check like the one for pickIndex; the boundary tests above are
    // what prove the mapping. Chi-square goodness of fit with 4 - 1 = 3 degrees
    // of freedom. For 3 degrees of freedom
    // P(X > x) = erfc(sqrt(x / 2)) + sqrt(2x / pi) * exp(-x / 2), so 30.66 is
    // the critical value at p = 1e-6: a fair picker fails about once in a
    // million runs.
    const chiSquare = counts.reduce((sum, count, index) => {
      const expected = (draws * (weights[index] ?? 0)) / total;
      return sum + (count - expected) ** 2 / expected;
    }, 0);
    expect(chiSquare).toBeLessThan(30.66);
  });
});
