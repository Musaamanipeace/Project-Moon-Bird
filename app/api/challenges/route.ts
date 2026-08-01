import {
  CHALLENGE_COLUMNS,
  latestLogsByChallenge,
  type ChallengeRow,
} from "@/lib/challenges";
import { requireUser } from "@/lib/http/auth";
import { error, json } from "@/lib/http/respond";
import { challengePublic, statePublic } from "@/lib/serializers/challenges";

/**
 * GET /api/challenges — docs/API_CONTRACTS.md §5.1.
 *
 * 200 `{"challenges":[...]}`, each element `challengePublic(c)` with an injected
 * `userState` key that is `null` when the user has no log for that challenge.
 * The array is always an array — `[]`, never `null`, when empty.
 *
 * `userState` is appended AFTER the alphabetical challengePublic keys rather
 * than merged into them, matching Go: challengePublic returns a map (sorted by
 * encoding/json), then `item["userState"] = ...` adds a key that sorts last
 * anyway (u > t in "title"). Spreading in that order reproduces the byte layout.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { data: challenges, error: listError } = await supabase
    .from("challenges")
    .select(CHALLENGE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (listError) return error(500, "could not load challenges");

  const logs = await latestLogsByChallenge(supabase, user.id);
  if (logs === null) return error(500, "could not load progress");

  const rows = (challenges ?? []) as ChallengeRow[];
  return json({
    challenges: rows.map((challenge) => {
      const log = logs.get(challenge.id);
      return {
        ...challengePublic(challenge),
        userState: log ? statePublic(log, challenge.slug) : null,
      };
    }),
  });
}
