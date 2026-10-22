/* The numbers in a text, to check that a translation changed none of them (the reading notes' rule). */

const NUMBER = /\d{1,3}(?:[,   ]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g

/** Every number in `text`, thousands separators removed: "17,000" and "17 000" → "17000", "31.4%" → "31.4". */
export const numbersOf = (text) => (text.match(NUMBER) ?? []).map((n) => n.replace(/[,   ]/g, ''))

/** True when both texts hold the same numbers, as many times each. */
export const sameNumbers = (a, b) => {
  const sorted = (t) => numbersOf(t).sort().join('|')
  return sorted(a) === sorted(b)
}
