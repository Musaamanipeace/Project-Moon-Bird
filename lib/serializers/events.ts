/**
 * eventPublic (docs/API_CONTRACTS.md §7.6).
 *
 * Keys alphabetical: approved, authorId, category, eventDate, id, rarity,
 * source, synopsis, tier, title.
 *
 * `eventDate` is date-only and passed through verbatim from the `date` column;
 * parsing and reformatting would shift the day for any server west of UTC.
 * `authorId` is null or a string.
 *
 * `visibility` is on the row (added by the port to close audit finding B4 —
 * §2.2 requires a user-controlled public/private toggle and the Go schema had
 * no column to enforce it) but is NOT emitted: types/api.ts:MoonEvent has no
 * such field, so adding it silently would change the shape the client is typed
 * against. It is enforced in the query predicate and by RLS instead.
 * TODO(operator): surface it here and on MoonEvent together when the UI grows a
 * visibility toggle.
 */
export function eventPublic(e: {
  id: string;
  title: string;
  event_date: string;
  rarity: string;
  synopsis: string;
  category: string;
  source: string;
  tier: string;
  approved: boolean;
  author_id: string | null;
}) {
  return {
    approved: e.approved,
    authorId: e.author_id,
    category: e.category,
    eventDate: e.event_date,
    id: e.id,
    rarity: e.rarity,
    source: e.source,
    synopsis: e.synopsis,
    tier: e.tier,
    title: e.title,
  };
}

export type EventRow = Parameters<typeof eventPublic>[0];
