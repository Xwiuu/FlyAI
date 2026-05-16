/**
 * Returns num/den, or `null` when den is 0/null/undefined. UI renders null as "—".
 * Never returns 0 for a missing denominator — that would silently signal "0%"
 * when the truth is "no data".
 */
export function safeRate(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null) return null;
  if (!Number.isFinite(num) || !Number.isFinite(den)) return null;
  if (den === 0) return null;
  return num / den;
}

/** Sums numeric values, skipping null/undefined. */
export function safeSum(values: ReadonlyArray<number | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    total += v;
  }
  return total;
}

/** Strict bit-identical equality for two numbers up to a tolerance (defaults exact). */
export function assertEquals(a: number, b: number, label: string, epsilon = 0): void {
  const diff = Math.abs(a - b);
  if (diff > epsilon) {
    throw new Error(`integrity: ${label} mismatch — a=${a} b=${b} diff=${diff}`);
  }
}

/** True when the date is the last Friday of its month (US locale weekday=5). */
export function isLastFridayOfMonth(d: Date): boolean {
  if (d.getDay() !== 5) return false;
  const probe = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
  return probe.getMonth() !== d.getMonth();
}
