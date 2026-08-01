import { requireUser } from "@/lib/http/auth";
import { error, json, notFound } from "@/lib/http/respond";
import { parseBody } from "@/lib/http/validate";
import {
  NOTEBOOK_COLUMNS,
  normalizeDueDate,
  notebookErrorFor,
  type NotebookRow,
} from "@/lib/notebook";
import { notebookEntrySchema } from "@/lib/schemas";
import { notebookPublic } from "@/lib/serializers/notebook";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * A non-uuid path segment can never name a row, and Postgres rejects the
 * comparison outright rather than matching nothing — which would otherwise turn
 * `/api/notebook/banana` into a 500 on DELETE and a 404 on PUT for the same
 * input. Screening here keeps both on the 404 the contract specifies.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PUT /api/notebook/{id} — docs/API_CONTRACTS.md §6.3.
 *
 * Every write is scoped `user_id = <caller>` in addition to the RLS policy, so
 * another user's entry is indistinguishable from a missing one — the same
 * property Go had, here belt-and-braces with RLS rather than instead of it.
 *
 * 200 `{"entry":{...}}`, 404 `entry not found`.
 */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { id } = await context.params;

  const body = await parseBody(request, notebookEntrySchema, {
    invalidJson: "invalid body",
    message: (_zodError, raw) => notebookErrorFor(raw),
  });
  if (body instanceof Response) return body;

  // Checked after the body, not before: Go decoded and validated the payload
  // before it ever reached the database, so a request that is bad in both ways
  // answers 400, not 404.
  if (!UUID.test(id)) return notFound("entry not found");

  const { data, error: updateError } = await supabase
    .from("notebook_entries")
    .update({
      entry_type: body.entryType,
      title: body.title,
      body: body.body,
      due_date: normalizeDueDate(body.dueDate),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(NOTEBOOK_COLUMNS)
    .maybeSingle();

  // A malformed uuid makes Postgres reject the comparison outright rather than
  // matching nothing, so that arrives as updateError. Both it and "no row
  // matched" mean the same thing to the caller — there is no such entry of
  // theirs — and §6.3 gives only the one 404 for it.
  if (updateError || !data) return notFound("entry not found");

  return json({ entry: notebookPublic(data as NotebookRow) });
}

/**
 * DELETE /api/notebook/{id} — docs/API_CONTRACTS.md §6.4.
 *
 * 200 `{"ok":true}`, 404 `entry not found` when nothing was deleted.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { id } = await context.params;
  if (!UUID.test(id)) return notFound("entry not found");

  // `.select("id")` is what makes "how many rows matched" observable: without
  // it PostgREST returns no body and a delete of someone else's entry would
  // report success.
  const { data, error: deleteError } = await supabase
    .from("notebook_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (deleteError) return error(500, "could not delete entry");
  if ((data ?? []).length === 0) return notFound("entry not found");

  return json({ ok: true });
}
