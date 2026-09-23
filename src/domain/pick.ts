import type { Option } from "./topics";

/** A source of 32-bit numbers. The app hands it the platform's; a test hands it its own. */
export type Random = () => number;

const TOP = 2 ** 32;

/** The platform's own source, the one a password generator would use (ADR 4). */
export const secureRandom: Random = () => crypto.getRandomValues(new Uint32Array(1))[0];

/**
 * A number below `count`, with every value equally likely.
 *
 * Taking the remainder of a 32-bit number would favour the first few values whenever the
 * range does not divide evenly, so the values in the uneven tail are drawn again.
 */
export function below(count: number, random: Random = secureRandom): number {
  if (count <= 0) throw new RangeError("nothing to pick from");

  const even = TOP - (TOP % count);
  let drawn = random();
  while (drawn >= even) drawn = random();
  return drawn % count;
}

/** One of the options, or nothing when there are none to pick from. */
export function pick(
  options: readonly Option[],
  random: Random = secureRandom,
): Option | undefined {
  if (options.length === 0) return undefined;
  return options[below(options.length, random)];
}
