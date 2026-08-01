import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CHALLENGE_COLUMNS,
  CHALLENGE_LOG_COLUMNS,
  recomputeStreakQuietly,
  utcLogDate,
  type ChallengeLogRow,
  type ChallengeRow,
} from "@/lib/challenges";
import { requireUser } from "@/lib/http/auth";
import { error, json, notFound } from "@/lib/http/respond";
import { parseBody } from "@/lib/http/validate";
import { challengeProgressSchema } from "@/lib/schemas";
import { challengePublic, statePublic } from "@/lib/serializers/challenges";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Load a challenge by slug.
 *
 * Returns `null` for BOTH "no such slug" and a genuine database failure,
 * because §5.2/§5.3 pin a single 404 `challenge not found` for any error out of
 * GetChallengeBySlug. Collapsing them is the documented contract, and it also
 * avoids leaking whether a slug exists.
 */
async function findChallenge(
  supabase: SupabaseClient,
  slug: string,
): Promise<ChallengeRow | null> {
  const { data, error: lookupError } = await supabase
    .from("challenges")
    .select(CHALLENGE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError || !data) return null;
  return data as ChallengeRow;
}

/** The user's latest log for one challenge, or null when there is none. */
async function latestLog(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
): Promise<{ log: ChallengeLogRow | null } | null> {
  const { data, error: logError } = await supabase
    .from("challenge_logs")
    .select(CHALLENGE_LOG_COLUMNS)
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .order("log_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Distinguished from "no rows": GetLatestLog returned (nil, nil) for no rows,
  // so an absent log is a 200 with userState null, while a query failure is the
  // 500 in §5.2.
  if (logError) return null;
  return { log: (data as ChallengeLogRow | null) ?? null };
}

/**
 * GET /api/challenges/{slug} — docs/API_CONTRACTS.md §5.2.
 *
 * 200 with sorted keys `challenge`, `userState`; `userState` is always present
 * and null when there is no log.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { slug } = await context.params;
  const challenge = await findChallenge(supabase, slug);
  if (!challenge) return notFound("challenge not found");

  const result = await latestLog(supabase, user.id, challenge.id);
  if (result === null) return error(500, "could not load state");

  return json({
    challenge: challengePublic(challenge),
    userState: result.log ? statePublic(result.log, challenge.slug) : null,
  });
}

/**
 * PUT /api/challenges/{slug} — docs/API_CONTRACTS.md §5.3.
 *
 * Saves the free-form `data` payload for TODAY (server-assigned UTC date — the
 * client cannot backdate) and, when `completed` is true, promotes the log's
 * status and awards the badge.
 *
 * Status is NEVER written directly. The `status` column is guarded by the
 * transition trigger in migration 0003 (audit finding B3); the only sanctioned
 * writer is the `complete_challenge` SECURITY DEFINER function, which mirrors
 * the same transition table. The data-only upsert below deliberately omits
 * `status` from its payload so the trigger is not even reached.
 *
 * 200 with sorted keys `badgeAwarded`, `ok`, `userState`.
 */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { slug } = await context.params;
  const challenge = await findChallenge(supabase, slug);
  if (!challenge) return notFound("challenge not found");

  const body = await parseBody(request, challengeProgressSchema, {
    invalidJson: "invalid body",
    message: () => "invalid body",
  });
  if (body instanceof Response) return body;

  // Nil Data is normalised to {} (§5.3), not left null: the column is NOT NULL
  // and the client is typed for Record<string, unknown>.
  const data = body.data ?? {};
  const logDate = utcLogDate();

  const existing = await latestLogForDate(supabase, user.id, challenge.id, logDate);
  if (existing === null) return error(500, "could not save progress");

  const saved = existing.log
    ? await updateLogData(supabase, user.id, challenge.id, logDate, data)
    : await insertLog(supabase, user.id, challenge.id, logDate, data);
  if (!saved) return error(500, "could not save progress");

  let badgeAwarded = false;
  let state = saved;

  // Only 'unfinished' has an outgoing edge to 'finished'. A log that is already
  // finished is left alone — calling the RPC would raise "invalid status
  // transition" and turn a harmless repeat PUT into a 500. A `completed: false`
  // on a finished log is likewise a no-op: finished -> unfinished is not a legal
  // edge (0003), so a completion cannot be silently retracted by the client.
  if (body.completed === true && saved.status === "unfinished") {
    const promoted = await promoteAndAward(user.id, challenge.id, logDate);
    if (!promoted) return error(500, "could not save progress");

    badgeAwarded = promoted.badgeAwarded;
    await recomputeStreakQuietly(user.id);

    const refreshed = await latestLogForDate(
      supabase,
      user.id,
      challenge.id,
      logDate,
    );
    if (refreshed?.log) state = refreshed.log;
  }

  return json({
    badgeAwarded,
    ok: true,
    userState: statePublic(state, challenge.slug),
  });
}

/** The log for one exact (user, challenge, date), or `{log: null}` if absent. */
async function latestLogForDate(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  logDate: string,
): Promise<{ log: ChallengeLogRow | null } | null> {
  const { data, error: readError } = await supabase
    .from("challenge_logs")
    .select(CHALLENGE_LOG_COLUMNS)
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (readError) return null;
  return { log: (data as ChallengeLogRow | null) ?? null };
}

async function insertLog(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  logDate: string,
  data: Record<string, unknown>,
): Promise<ChallengeLogRow | null> {
  // `status` is omitted on purpose — the column default is 'unfinished' and
  // supplying it here would make this handler a second writer of the state
  // machine (see the note on PUT).
  const { data: row, error: insertError } = await supabase
    .from("challenge_logs")
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      log_date: logDate,
      data,
    })
    .select(CHALLENGE_LOG_COLUMNS)
    .single();

  if (insertError || !row) return null;
  return row as ChallengeLogRow;
}

async function updateLogData(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  logDate: string,
  data: Record<string, unknown>,
): Promise<ChallengeLogRow | null> {
  // Data is replaced wholesale rather than merged, matching Go's upsert: a
  // client that wants to keep earlier keys sends them back.
  const { data: row, error: updateError } = await supabase
    .from("challenge_logs")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("log_date", logDate)
    .select(CHALLENGE_LOG_COLUMNS)
    .single();

  if (updateError || !row) return null;
  return row as ChallengeLogRow;
}

/**
 * Promote an unfinished log to 'finished' and award the badge.
 *
 * Both RPCs are service-role-only (migration 0010) because they take the acting
 * user as a parameter; the id passed here comes from the verified cookie
 * session, never from the request body.
 *
 * `award_badge` returns whether it actually inserted, which is exactly Go's
 * `RowsAffected() > 0` — so `badgeAwarded` is true only the first time, and two
 * concurrent requests cannot both claim it.
 *
 * TODO(operator): PROJECT_DOCUMENTATION.md:107-109 describes "Long Challenges"
 * that must pass a peer audit before the reward is released, i.e. they should
 * promote to 'completed_unaudited' here and reach 'finished' only via the
 * auditor's decision. `public.challenges` carries no column marking which of the
 * eight onboarding challenges are long-form, and that classification does not
 * survive in repo history, so every completion currently goes straight to
 * 'finished'. Add the flag and branch on it here once the operator supplies it.
 */
async function promoteAndAward(
  userId: string,
  challengeId: string,
  logDate: string,
): Promise<{ badgeAwarded: boolean } | null> {
  const admin = createAdminSupabaseClient();

  const { error: completeError } = await admin.rpc("complete_challenge", {
    p_user_id: userId,
    p_challenge_id: challengeId,
    p_log_date: logDate,
    p_status: "finished",
  });
  if (completeError) return null;

  const { data: awarded, error: badgeError } = await admin.rpc("award_badge", {
    p_user_id: userId,
    p_challenge_id: challengeId,
  });
  // The status transition is already committed. Failing the whole request now
  // would tell the client its completion did not happen when it did, so a badge
  // failure degrades to badgeAwarded:false. Note this leaves the badge
  // unawarded: the log is now 'finished', so no later PUT re-enters this path.
  // TODO(operator): a periodic reconciliation job should award badges for
  // 'finished' logs that have no matching row in public.badges.
  if (badgeError) return { badgeAwarded: false };

  return { badgeAwarded: awarded === true };
}
