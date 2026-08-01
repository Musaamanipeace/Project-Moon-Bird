import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Completed challenge slugs per calendar day — the port of Go's
 * `store.CompletedSlugsForRange` (§7.7).
 *
 * Returns a Map keyed by "YYYY-MM-DD". A day with no completions is **absent**
 * from the map rather than mapped to `[]`, so the caller can emit `null` for it
 * (§16) — that distinction is the whole reason this returns a Map and not a
 * plain object of arrays.
 *
 * Returns `null` on query failure so the caller can raise §7.7's 500. An empty
 * map is a valid, successful "nothing completed this month" and must not be
 * confused with it.
 *
 * Only `'finished'` counts. `'completed_unaudited'` is a Long Challenge awaiting
 * audit (0003's status machine) and marking it complete on the calendar would
 * let a user see a filled-in month for work that has not been accepted.
 */
export async function completedSlugsForRange(
  supabase: SupabaseClient<Database>,
  userId: string,
  start: string,
  end: string,
): Promise<Map<string, string[]> | null> {
  const { data, error } = await supabase
    .from("challenge_logs")
    .select("log_date, challenges!inner(slug)")
    .eq("user_id", userId)
    .eq("status", "finished")
    .gte("log_date", start)
    .lte("log_date", end);

  if (error) return null;

  type Row = { log_date: string; challenges: { slug: string } | null };
  const byDate = new Map<string, string[]>();

  for (const row of (data ?? []) as unknown as Row[]) {
    const slug = row.challenges?.slug;
    if (!slug) continue;
    const slugs = byDate.get(row.log_date);
    if (slugs) slugs.push(slug);
    else byDate.set(row.log_date, [slug]);
  }

  return byDate;
}
