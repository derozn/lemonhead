const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function pounds(pence: number): string {
  return gbp.format(pence / 100);
}

/** Replace each `{key}` placeholder in engine copy with the pounds-formatted
 * amount from that line's raw pence map (ADR 0008). Unknown placeholders stay
 * as written, so a missing amount shows up in tests instead of vanishing. */
export function renderAmounts(text: string, amounts?: Record<string, number>): string {
  if (!amounts) return text;
  return text.replace(/\{(\w+)\}/g, (token: string, key: string) => {
    const pence = amounts[key];
    return pence === undefined ? token : pounds(pence);
  });
}

/** Format pence as the plain string a money input holds ("1071.09"): no
 * currency symbol, no grouping, two decimals, so toPence round-trips it. */
export function penceToInputString(pence: number): string {
  return (pence / 100).toFixed(2);
}

/** Parse a pounds string ("78" or "78.50") to whole pence, or null. Blank is
 * null, never £0.00: an unanswered money question must fail validation. */
export function toPence(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}
