/** Generational / courtesy suffixes that are not the family name. */
const NAME_SUFFIX =
  /^(jr|sr|ii|iii|iv|v|2nd|3rd|4th|second|third|fourth|i{1,3}|iv)$/i;

/**
 * Family name for compact lists. "Michael Harris II" → "Harris",
 * "Ronald Acuña Jr." → "Acuña", "Michael Harris the second" → "Harris".
 */
export function shortName(full: string) {
  const parts = full.replace(/\./g, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return full;
  if (parts.length === 1) return parts[0];

  let i = parts.length - 1;
  while (i > 0 && NAME_SUFFIX.test(parts[i])) {
    i -= 1;
  }
  if (i > 0 && /^the$/i.test(parts[i])) {
    i -= 1;
  }
  return parts[i] || parts[0];
}
