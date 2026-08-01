import { requireUser } from "@/lib/http/auth";
import { loadUserResponse } from "@/lib/http/profile";
import { error, json } from "@/lib/http/respond";
import { activityPublic, badgePublic } from "@/lib/serializers/portfolio";

/**
 * GET /api/profile — docs/API_CONTRACTS.md §8.1.
 *
 * 200 with keys `badges`, `longestStreak`, `recentActivity`, `streak`,
 * `totalCompleted`, `user`.
 *
 * §8.1 has `badges` as `null` when empty (Go's `var out []Badge` is a nil
 * slice) while `recentActivity` is `[]` (it was `make(..., 0, n)`). §16 lists
 * that asymmetry as load-bearing, so it is reproduced rather than tidied.
 *
 * The four reads run concurrently. Go issued them in sequence and returned on
 * the first failure, so the checks below are ordered to match — otherwise the
 * error string a client sees would depend on which promise settles first.
 *
 * `badges` is where this port deliberately diverges — see §10 and the note on
 * badgePublic. Go emitted PascalCase keys there, which types/api.ts does not
 * match and the profile page cannot read.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const [userResult, badgeResult, activityResult, countResult] =
    await Promise.all([
      loadUserResponse(supabase, user),
      supabase
        .from("badges")
        .select("challenge_id, awarded_at, challenges(title, icon)")
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false }),
      supabase
        .from("challenge_logs")
        .select("log_date, status, data, challenges(slug)")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(20),
      // head:true asks PostgREST for the count without the rows — this is a
      // tally, and materialising every finished log to call .length on it would
      // grow linearly with a user's history.
      supabase
        .from("challenge_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "finished"),
    ]);

  // §8.1's first failure is a 401 with a trailing newline — unlike RequireAuth's
  // 401, which has none (§1.4). Same status and body otherwise.
  if (!userResult) return json({ error: "unauthorized" }, 401);
  if (badgeResult.error) return error(500, "could not load badges");
  if (activityResult.error) return error(500, "could not load activity");
  if (countResult.error) return error(500, "could not load stats");

  const badgeRows = (badgeResult.data ?? []) as unknown as Parameters<
    typeof badgePublic
  >[0][];
  const activityRows = (activityResult.data ?? []) as unknown as Parameters<
    typeof activityPublic
  >[0][];

  return json({
    // null, not [], when empty — see above.
    badges: badgeRows.length > 0 ? badgeRows.map(badgePublic) : null,
    longestStreak: userResult.longestStreak,
    recentActivity: activityRows.map(activityPublic),
    streak: userResult.streak,
    totalCompleted: countResult.count ?? 0,
    user: userResult,
  });
}
