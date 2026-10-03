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
