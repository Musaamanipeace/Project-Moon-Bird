import { requireUser } from "@/lib/http/auth";
import { badRequest, error, json } from "@/lib/http/respond";
import { completedSlugsForRange } from "@/lib/calendar";
import { noonUTC } from "@/lib/dates";
import { age, illumination, phaseCode, phaseEmoji, phaseName } from "@/lib/lunar";

/**
 * `time.Date(year, month+1, 0, ...).Day()` — day 0 of the next month is the last
 * day of this one, and JS `Date` normalises the same way.
 */
function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Go's `strconv.Atoi` with the error ignored: a non-numeric param yields 0,
 * which the caller then treats as "unset" and replaces with today's value.
 *
 * `Number()` would accept "1e3", " 12 ", and "0x10", none of which Atoi does,
 * and `parseInt` would read "12abc" as 12. The explicit digit check keeps the
 * accepted set to what the Go handler accepted.
 */
function atoi(raw: string | null): number {
  if (raw === null || !/^-?\d+$/.test(raw)) return 0;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : 0;
}

/**
 * GET /api/calendar — docs/API_CONTRACTS.md §7.7.
 *
 * 200 with keys `days`, `month`, `year`; each day carries
 * `completedChallenges`, `date`, `day`, `illumination`, `phase`, `phaseCode`,
 * `phaseEmoji`.
 *
 * Two details that look like mistakes and are not:
 *
 *  - **Each day is sampled at 12:00:00 UTC, not midnight.** Midnight sits on a
 *    phase boundary for a good fraction of the days in a synodic month, so a
 *    midnight sample reports the wrong phase for any day whose transition falls
 *    before noon. §7.7 pins this explicitly.
 *  - **`completedChallenges` is `null`, not `[]`, for a day with nothing on it**
 *    (§16). In Go it was a missing map key yielding a nil slice; `types/api.ts`
 *    types it `string[] | null` and the UI distinguishes the two.
 *
 * `month` is range-checked after the fallback; `year` deliberately is not, so a
 * negative year is accepted and passed through exactly as Go passed it to
 * `time.Date`.
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const year = atoi(params.get("year")) || now.getUTCFullYear();
  const month = atoi(params.get("month")) || now.getUTCMonth() + 1;

  if (month < 1 || month > 12) return badRequest("invalid month");

  const total = daysIn(year, month);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const dateFor = (d: number) => `${pad(year, 4)}-${pad(month)}-${pad(d)}`;

  const completed = await completedSlugsForRange(
    supabase,
    user.id,
    dateFor(1),
    dateFor(total),
  );
  if (completed === null) return error(500, "could not load calendar");

  const days = [];
  for (let d = 1; d <= total; d += 1) {
    const date = dateFor(d);
    const a = age(noonUTC(date));
    days.push({
      completedChallenges: completed.get(date) ?? null,
      date,
      day: d,
      illumination: illumination(a),
      phase: phaseName(a),
      phaseCode: phaseCode(a),
      phaseEmoji: phaseEmoji(a),
    });
  }

  return json({ days, month, year });
}
