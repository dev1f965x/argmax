import { describe, expect, it } from "vitest";
import { below, pick } from "./pick";
import type { Option } from "./topics";

const options: Option[] = [
  { id: "a", name: "김치찌개" },
  { id: "b", name: "파스타" },
  { id: "c", name: "국밥" },
];

/** A source that returns exactly these numbers, so a draw can be checked rather than sampled. */
function handing(...numbers: number[]) {
  let next = 0;
  return () => numbers[next++ % numbers.length];
}

describe("below", () => {
  it("turns a number into one of the places available", () => {
    expect(below(3, handing(0))).toBe(0);
    expect(below(3, handing(1))).toBe(1);
    expect(below(3, handing(2))).toBe(2);
    expect(below(3, handing(3))).toBe(0);
  });

  it("draws again rather than favour the first places", () => {
    // 2^32 is not divisible by 3, so the last two values would lean towards 0 and 1.
    const uneven = 2 ** 32 - 1;

    expect(below(3, handing(uneven, 7))).toBe(1);
  });

  it("refuses to pick from nothing", () => {
    expect(() => below(0)).toThrow(RangeError);
  });
});

describe("pick", () => {
  it("takes the option the source points at", () => {
    expect(pick(options, handing(1))?.name).toBe("파스타");
  });

  it("has nothing to give from an empty topic", () => {
    expect(pick([], handing(0))).toBeUndefined();
  });

  it("favours no one over a thousand draws", () => {
    const counts = new Map<string, number>();
    for (let draw = 0; draw < 3000; draw++) {
      const chosen = pick(options);
      if (chosen) counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
    }

    for (const option of options) {
      const share = (counts.get(option.id) ?? 0) / 3000;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThan(0.39);
    }
  });
});
