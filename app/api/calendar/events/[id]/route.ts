import { requireUser } from "@/lib/http/auth";
import { badRequest, error, json, notFound } from "@/lib/http/respond";

type RouteContext = { params: Promise<{ id: string }> };

/** Go's `uuid.Parse` gate; a failure is §7.4/§7.5's `invalid event id`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/calendar/events/{id} — docs/API_CONTRACTS.md §7.4.
 *
 * Saves an event to the caller's calendar. No request body is read. Idempotent:
 * `ON CONFLICT DO NOTHING` against the UNIQUE (user_id, event_id) in 0003, which
 * PostgREST spells as `ignoreDuplicates`.
 *
 * §7.4 notes that saving a nonexistent event yields **400**, not 404 — the
 * foreign key raises and the raw driver error was returned verbatim. The status
 * is kept; the body is not. Echoing driver text hands the client table and
 * constraint names, so the two failures a caller can actually cause get named
 * strings and everything else is a generic 500.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { id } = await context.params;
  if (!UUID.test(id)) return badRequest("invalid event id");

  const { error: insertError } = await supabase
    .from("user_calendar_events")
    .upsert(
      { user_id: user.id, event_id: id },
      { onConflict: "user_id,event_id", ignoreDuplicates: true },
    );

  if (insertError) {
    // 23503 is foreign_key_violation: a well-formed uuid naming no event. It is
    // also what a caller sees for an event RLS hides from them, which is the
    // right answer either way — they cannot tell the two apart, and shouldn't.
    if (insertError.code === "23503") return badRequest("unknown event id");
    return error(500, "could not save calendar event");
  }

  return json({ ok: true });
}

/**
 * DELETE /api/calendar/events/{id} — docs/API_CONTRACTS.md §7.5.
 *
 * 200 `{"ok":true}`, or 404 `event not saved` when nothing matched.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { id } = await context.params;
  if (!UUID.test(id)) return badRequest("invalid event id");

  // `.select("id")` is what makes RowsAffected observable — without it
  // PostgREST returns no body and unsaving an event that was never saved would
  // report success.
  const { data, error: deleteError } = await supabase
    .from("user_calendar_events")
    .delete()
    .eq("event_id", id)
    .eq("user_id", user.id)
    .select("id");

  if (deleteError) return error(500, "could not remove calendar event");
  if ((data ?? []).length === 0) return notFound("event not saved");

  return json({ ok: true });
}
