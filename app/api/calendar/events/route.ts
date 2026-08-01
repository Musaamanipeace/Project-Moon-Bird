import { requireUser } from "@/lib/http/auth";
import { error, json } from "@/lib/http/respond";
import { EVENT_COLUMNS } from "@/lib/events";
import { eventPublic, type EventRow } from "@/lib/serializers/events";

/**
 * GET /api/calendar/events — docs/API_CONTRACTS.md §7.3.
 *
 * The user's saved events, ordered event_date ASC. `[]` when empty.
 *
 * Queried from `events` with an inner embed of `user_calendar_events` rather
 * than the other way round: PostgREST's `order` applies to the rows it returns,
 * so selecting from the join table would order the *join rows* and leave the
 * events in whatever order they came back in. Starting from `events` makes
 * `event_date ASC` mean what §7.3 says it means.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { data, error: listError } = await supabase
    .from("events")
    .select(`${EVENT_COLUMNS}, user_calendar_events!inner(user_id)`)
    .eq("user_calendar_events.user_id", user.id)
    .order("event_date", { ascending: true });

  if (listError) return error(500, "could not load calendar events");

  // eventPublic reads only the ten contract keys, so the embedded join column
  // rides along in `data` and is dropped on the way out.
  return json({ events: ((data ?? []) as unknown as EventRow[]).map(eventPublic) });
}
