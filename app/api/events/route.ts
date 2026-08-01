import { requireUser } from "@/lib/http/auth";
import { badRequest, error, json } from "@/lib/http/respond";
import { parseBody } from "@/lib/http/validate";
import { utcDate } from "@/lib/dates";
import { EVENT_COLUMNS, eventErrorFor } from "@/lib/events";
import { eventInputSchema } from "@/lib/schemas";
import { eventPublic, type EventRow } from "@/lib/serializers/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/events — docs/API_CONTRACTS.md §7.1. **Unauthenticated.**
 *
 * The four predicate branches are reproduced exactly:
 *
 *   tier=community      → tier = 'community' AND approved
 *   tier=astronomical   → tier = 'astronomical'
 *   (default) community=true → astronomical OR (community AND approved)
 *   (default)           → tier = 'astronomical'
 *
 * `community` counts only when the raw value is exactly the string "true", and
 * any `tier` outside the two names falls into the default branch. Both are
 * quirks of the Go handler rather than intent, but the client relies on them.
 *
 * Always `AND event_date >= from`, ordered event_date ASC, `from` defaulting to
 * today in UTC.
 *
 * One divergence from Go, and the reason this route builds its own anon client
 * rather than reusing an authenticated one: the query runs as `anon` even for a
 * signed-in caller. Go had no row security, so the predicate above was the only
 * gate. Here `events_select_anon` (0008/0011) independently restricts anon to
 * approved public rows, which means a caller cannot widen this listing past what
 * the predicate already allows — the two agree, and the RLS policy is the one
 * that survives a future bug in the predicate.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") || utcDate();
  const tier = params.get("tier");
  // Exactly "true", per §7.1 — "1", "TRUE", and a bare `?community` do not
  // count, and the frontend only ever sends the literal.
  const community = params.get("community") === "true";

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .gte("event_date", from);

  if (tier === "community") {
    query = query.eq("tier", "community").eq("approved", true);
  } else if (tier === "astronomical") {
    query = query.eq("tier", "astronomical");
  } else if (community) {
    query = query.or(
      "tier.eq.astronomical,and(tier.eq.community,approved.is.true)",
    );
  } else {
    query = query.eq("tier", "astronomical");
  }

  const { data, error: listError } = await query.order("event_date", {
    ascending: true,
  });

  // §7.1's note that `?from=banana` surfaces as this same 500 holds here too:
  // an unparseable date is rejected by Postgres, not by us.
  if (listError) return error(500, "could not load events");

  return json({ events: ((data ?? []) as EventRow[]).map(eventPublic) });
}

/**
 * POST /api/events — docs/API_CONTRACTS.md §7.2.
 *
 * `tier`, `approved`, and `author_id` are server-forced and are not accepted
 * from the body (eventInputSchema is .strict(), so sending them is a 400). The
 * same three values are re-checked by the `events_insert_community` RLS policy
 * in 0011, so this handler is the convenience and the policy is the guarantee.
 *
 * 201 `{"event":{...}}`.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const body = await parseBody(request, eventInputSchema, {
    invalidJson: "invalid body",
    message: (_zodError, raw) => eventErrorFor(raw),
  });
  if (body instanceof Response) return body;

  // Go checked these after decoding, so an empty string is a distinct 400 from
  // a malformed one; the schema accepts "" and the check lives here to keep
  // that split.
  if (body.title.trim() === "") return badRequest("title is required");

  const { data, error: insertError } = await supabase
    .from("events")
    .insert({
      title: body.title,
      event_date: body.eventDate,
      // Empty means "unspecified", and the column defaults only apply when the
      // key is absent — an explicit "" would be stored as "".
      rarity: body.rarity || "common",
      synopsis: body.synopsis ?? "",
      category: body.category || "community",
      source: body.source ?? "",
      tier: "community",
      approved: false,
      author_id: user.id,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (insertError || !data) return error(500, "could not save event");

  return json({ event: eventPublic(data as EventRow) }, 201);
}
