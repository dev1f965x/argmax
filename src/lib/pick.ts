/** Fills the buffer with random values, like crypto.getRandomValues. */
export type RandomSource = (buffer: Uint32Array<ArrayBuffer>) => void;

const range = 2 ** 32;

const cryptoRandom: RandomSource = (buffer) => {
  crypto.getRandomValues(buffer);
};

/**
 * Returns an index in [0, n) where every index has exactly the same chance.
 *
 * A 32-bit random value taken modulo n favors low indexes whenever 2^32 is not
 * a multiple of n, so values at or above the largest multiple of n are drawn again.
 */
export function pickIndex(
  n: number,
  random: RandomSource = cryptoRandom,
): number {
  if (!Number.isInteger(n) || n < 1 || n > range) {
    throw new RangeError(`n must be an integer from 1 to 2^32, got ${n}`);
  }

  const limit = range - (range % n);
  const buffer = new Uint32Array(1);
  // Ends because a uniform source lands below the limit with probability above 1/2.
  for (;;) {
    random(buffer);
    const [value] = buffer;
    if (value === undefined)
      throw new Error("A one-element Uint32Array has no first element");
    if (value < limit) return value % n;
  }
}

/**
 * Returns an index where each index has the chance weight / sum of weights
 * (FR15). Each weight covers that many consecutive positions in [0, total), so
 * one unbiased pickIndex(total) followed by a walk over the running sum keeps
 * the pick free of bias: weights [2, 1, 3] give positions 0-1 to index 0,
 * position 2 to index 1, and positions 3-5 to index 2.
 */
export function pickWeightedIndex(
  weights: readonly number[],
  random: RandomSource = cryptoRandom,
): number {
  if (weights.length === 0) throw new RangeError("weights must not be empty");
  let total = 0;
  for (const weight of weights) {
    if (!Number.isInteger(weight) || weight < 1)
      throw new RangeError(
        `Each weight must be an integer of at least 1, got ${weight}`,
      );
    total += weight;
  }
  // Also stops a sum past Number.MAX_SAFE_INTEGER, where the walk would be inexact.
  if (total > range)
    throw new RangeError(
      `The weights must add up to at most 2^32, got ${total}`,
    );

  let position = pickIndex(total, random);
  for (const [index, weight] of weights.entries()) {
    if (position < weight) return index;
    position -= weight;
  }
  throw new Error("A position below the total falls within some weight");
}
