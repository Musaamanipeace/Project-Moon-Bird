/**
 * Date helpers shared by the request schemas and the handlers.
 *
 * Deliberately free of `server-only`: `lib/schemas.ts` is imported from both
 * sides of the boundary, so anything it depends on has to be isomorphic.
 */

/** Shape of a date-only field: "YYYY-MM-DD". Shape only — see {@link isRealDate}. */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a string is a real calendar date in "YYYY-MM-DD" form.
 *
 * The regex alone accepts 2026-02-31; the round-trip rejects it. That matches
 * Go's `time.Parse("2006-01-02", ...)`, which errors with "day out of range"
 * where JS's `Date` would silently roll the value over into March.
 */
export function isRealDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/**
 * The UTC calendar day of an instant, as "YYYY-MM-DD".
 *
 * Every date the server assigns — log dates, ad-view periods, calendar days —
 * uses UTC, so the day a user's work lands on does not depend on where the
 * server happens to run.
 */
export function utcDate(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/**
 * Midday UTC for a date-only string, as a `Date`.
 *
 * Lunar phase for a calendar day is computed at 12:00:00 UTC rather than
 * midnight (docs/API_CONTRACTS.md §7.7). Midnight sits on the boundary between
 * two phases for roughly half the days in a synodic month, so a midnight sample
 * flips the reported phase for any day whose transition falls in the morning.
 */
export function noonUTC(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** `date` shifted by whole days, still as "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}
