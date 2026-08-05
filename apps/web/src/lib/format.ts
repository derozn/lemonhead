const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function pounds(pence: number): string {
  return gbp.format(pence / 100);
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
