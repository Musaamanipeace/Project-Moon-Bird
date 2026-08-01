import { requireUser } from "@/lib/http/auth";
import { error, json } from "@/lib/http/respond";
import { parseBody } from "@/lib/http/validate";
import {
  NOTEBOOK_COLUMNS,
  normalizeDueDate,
  notebookErrorFor,
  type NotebookRow,
} from "@/lib/notebook";
import { notebookEntrySchema } from "@/lib/schemas";
import { notebookPublic } from "@/lib/serializers/notebook";

/**
 * GET /api/notebook — docs/API_CONTRACTS.md §6.1.
 *
 * 200 `{"entries":[...]}`, ordered created_at DESC, `[]` when empty.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { data, error: listError } = await supabase
    .from("notebook_entries")
    .select(NOTEBOOK_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (listError) return error(500, "could not load notebook");

  return json({ entries: ((data ?? []) as NotebookRow[]).map(notebookPublic) });
}

/**
 * POST /api/notebook — docs/API_CONTRACTS.md §6.2.
 *
 * 201 `{"entry":{...}}`.
 *
 * One deliberate divergence: §6.2's last row says any unrecognised store error
 * was surfaced verbatim through `err.Error()`, putting raw driver text — table
 * and constraint names, sometimes column values — into a 400 body. That is an
 * information leak and is NOT ported. The named strings are reproduced; the
 * catch-all becomes a generic 500.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const body = await parseBody(request, notebookEntrySchema, {
    invalidJson: "invalid body",
    message: (_zodError, raw) => notebookErrorFor(raw),
  });
  if (body instanceof Response) return body;

  const { data, error: insertError } = await supabase
    .from("notebook_entries")
    .insert({
      user_id: user.id,
      entry_type: body.entryType,
      title: body.title,
      body: body.body,
      due_date: normalizeDueDate(body.dueDate),
    })
    .select(NOTEBOOK_COLUMNS)
    .single();

  if (insertError || !data) return error(500, "could not save entry");

  return json({ entry: notebookPublic(data as NotebookRow) }, 201);
}
