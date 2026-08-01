import "server-only";

import { isRealDate } from "@/lib/dates";

/**
 * Columns behind eventPublic (§7.6).
 *
 * `visibility` and `created_at` are on the table but never selected — see the
 * note in lib/serializers/events.ts.
 */
export const EVENT_COLUMNS =
  "id, title, event_date, rarity, synopsis, category, source, tier, approved, author_id";

/**
 * Pick the 400 body §7.2 names for a rejected event submission.
 *
 * Go checked in this order — decode, empty title, empty date, then the store's
 * date parse — and zod collapses all four into one parse failure, so the raw
 * body decides which string applies. The empty-title case is not handled here:
 * the schema accepts `""` so the handler can raise it after a successful parse,
 * which keeps Go's ordering (title before date) intact.
 */
export function eventErrorFor(raw: unknown): string {
  const value = raw as Record<string, unknown> | null;
  if (typeof value !== "object" || value === null) return "invalid body";

  const { title, eventDate } = value;

  // Wrong types would have failed Go's decode into a string field, which is the
  // "invalid body" branch rather than either of the named ones.
  if (typeof title !== "string") return "invalid body";
  if (typeof eventDate !== "string") return "invalid body";

  if (title.trim() === "") return "title is required";
  if (eventDate === "") return "eventDate is required";
  if (!isRealDate(eventDate)) {
    return "eventDate must be a valid date (YYYY-MM-DD)";
  }

  // Length caps (audit finding B7, which Go did not have) land here; §7.2 names
  // no string for them.
  return "invalid body";
}
