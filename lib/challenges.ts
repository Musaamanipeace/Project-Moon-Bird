import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ChallengeStatus } from "@/lib/serializers/challenges";

/**
 * Columns behind challengePublic (§5.4). `scope` is intentionally absent — see
 * the note in lib/serializers/challenges.ts.
 */
export const CHALLENGE_COLUMNS =
  "id, slug, title, description, prompt, moon_phase, icon, sort_order";

/** Columns behind statePublic (§5.5), plus `status` which it derives from. */
export const CHALLENGE_LOG_COLUMNS =
  "challenge_id, log_date, data, status, updated_at";

export type ChallengeRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  moon_phase: string;
  icon: string;
  sort_order: number;
};

export type ChallengeLogRow = {
  challenge_id: string;
  log_date: string;
  data: unknown;
  status: ChallengeStatus;
  updated_at: string;
};

/**
 * The server-assigned log date (§5.3): today in UTC as "YYYY-MM-DD".
 *
 * `toISOString().slice(0, 10)` rather than any locale-aware formatter — the
 * column is a `date` and every other date comparison in the schema
 * (recompute_streak, the ad-view period) is against UTC, so a server running in
 * Nairobi must not write a different day than one running in UTC.
 */
export function utcLogDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Latest log per challenge for one user — the port of Go's
 * `store.AllStatesForUser` (§5.1).
 *
 * Postgres has no portable DISTINCT ON through PostgREST, so the rows come back
 * newest-first and the first sighting of each challenge_id wins. `log_date`
 * alone is not a total order (a user can have several rows on one date only
 * across different challenges, but ties within a challenge are impossible given
 * the UNIQUE constraint), so `updated_at` breaks any remaining ambiguity.
 *
 * Returns a map keyed by challenge_id, not by slug: the caller already holds the
 * challenge rows and slugs are only unique because of a constraint, whereas the
 * id is the actual foreign key.
 */
export async function latestLogsByChallenge(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, ChallengeLogRow> | null> {
  const { data, error } = await supabase
    .from("challenge_logs")
    .select(CHALLENGE_LOG_COLUMNS)
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return null;

  const latest = new Map<string, ChallengeLogRow>();
  for (const row of (data ?? []) as ChallengeLogRow[]) {
    if (!latest.has(row.challenge_id)) latest.set(row.challenge_id, row);
  }
  return latest;
}

/**
 * Recompute profiles.streak / longest_streak after a status change.
 *
 * Go called store.RecomputeStreak and **deliberately swallowed its error**
 * (§5.3, handlers.go:376-379) so a streak-bookkeeping failure could not lose a
 * user's actual progress. That behaviour is preserved: the challenge log is
 * already committed by the time this runs, and failing the request would tell
 * the client its save did not happen when it did.
 *
 * Runs through the service-role client because profiles.streak is not writable
 * by `authenticated` (audit finding A1) and recompute_streak's EXECUTE grant is
 * service-role-only (migration 0010).
 */
export async function recomputeStreakQuietly(userId: string): Promise<void> {
  try {
    await createAdminSupabaseClient().rpc("recompute_streak", {
      p_user_id: userId,
    });
  } catch {
    // Intentionally ignored — see above.
  }
}
