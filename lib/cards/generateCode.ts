// Excludes 0/O, 1/I/L and vowels-that-spell-words — kept simple: no 0, O,
// 1, I to avoid misreads when a human re-types a code off a printed card.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SUFFIX_LENGTH = 6; // 31^6 ≈ 887M combinations

export function generateCardCode(): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `SCAN-${suffix}`;
}
