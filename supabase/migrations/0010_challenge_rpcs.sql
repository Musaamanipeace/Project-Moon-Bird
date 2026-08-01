-- Challenge/badge server-authoritative RPCs, part 2 (doc §5.3, audit A2/B5).
--
-- 0009 defined grant_advertiser_role / award_badge / complete_challenge. This
-- migration closes three gaps that surfaced while wiring the challenge routes:
--
--   1. EXECUTE was never revoked, so any authenticated caller could invoke a
--      SECURITY DEFINER function with someone ELSE's p_user_id. That is an IDOR
--      on top of the very functions that exist to bypass RLS.
--   2. award_badge returned void, so §5.3's `badgeAwarded` — true only the first
--      time a badge is earned — could not be derived without a racy pre-SELECT.
--   3. profiles.streak / longest_streak are (correctly, per A1) not writable by
--      `authenticated`, and no function existed to recompute them, so the Go
--      backend's RecomputeStreak had no counterpart.

-- ---------------------------------------------------------------------------
-- 1. Lock the SECURITY DEFINER surface to the service role.
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE to PUBLIC on every new function. For a SECURITY
-- DEFINER function that takes the acting user as a *parameter*, that default is
-- a privilege-escalation path: complete_challenge('<victim-uuid>', ...) would
-- run as the table owner with no RLS to stop it.
--
-- Rather than compare p_user_id to auth.uid() inside each function (which would
-- also block the legitimate cross-user cases — an auditor deciding on someone
-- else's log), the functions are made callable only by service_role. Route
-- Handlers establish the caller's identity from the Supabase cookie session
-- first, then invoke these through the service-role client. The identity never
-- comes from the request body.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.grant_advertiser_role(uuid)',
    'public.complete_challenge(uuid, uuid, date, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. award_badge: report whether a badge was actually inserted.
-- ---------------------------------------------------------------------------
-- §5.3 emits `badgeAwarded`, which Go took from AwardBadge's RowsAffected() > 0.
-- A SELECT-then-INSERT in the handler would report `true` twice under two
-- concurrent requests; the CTE below reads the outcome of the INSERT itself, so
-- exactly one caller sees true.
--
-- The return type changes, which CREATE OR REPLACE cannot do — hence the DROP.
-- 0009's void version is superseded; a fresh `db reset` applies both in order.
DROP FUNCTION IF EXISTS public.award_badge(uuid, uuid);

CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH inserted AS (
    INSERT INTO public.badges (user_id, challenge_id)
    VALUES (p_user_id, p_challenge_id)
    ON CONFLICT (user_id, challenge_id) DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM inserted);
$$;

REVOKE ALL ON FUNCTION public.award_badge(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_badge(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. recompute_streak: the counterpart to Go's store.RecomputeStreak.
-- ---------------------------------------------------------------------------
-- A "streak day" is a UTC date on which the user has at least one challenge log
-- in status 'finished'. Only 'finished' counts: 'completed_unaudited' is a claim
-- awaiting peer review, and letting it extend a streak would make the audit
-- phase decorative.
--
-- The current streak is the length of the consecutive run ending today or
-- yesterday (yesterday so that a user who has not logged in yet today does not
-- watch their streak reset at midnight). Any older run leaves the streak at 0.
-- longest_streak is monotonic — it is never lowered by a recompute, so back-dated
-- data corrections cannot erase a record the user actually earned.
--
-- Dates are compared against UTC, matching the server-assigned log_date in §5.3.
CREATE OR REPLACE FUNCTION public.recompute_streak(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH streak_days AS (
    SELECT DISTINCT log_date AS day
    FROM public.challenge_logs
    WHERE user_id = p_user_id AND status = 'finished'
  ),
  -- Gaps and islands: consecutive dates share (date - row_number), so each
  -- distinct value of `island` is one unbroken run.
  islands AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::int AS island
    FROM streak_days
  ),
  runs AS (
    SELECT count(*)::int AS length, max(day) AS last_day
    FROM islands
    GROUP BY island
  ),
  totals AS (
    SELECT
      COALESCE(
        (SELECT length FROM runs
          WHERE last_day >= (now() AT TIME ZONE 'utc')::date - 1
          ORDER BY last_day DESC
          LIMIT 1),
        0
      ) AS current_streak,
      COALESCE((SELECT max(length) FROM runs), 0) AS best_streak
  )
  UPDATE public.profiles
  SET streak = totals.current_streak,
      longest_streak = GREATEST(public.profiles.longest_streak, totals.best_streak)
  FROM totals
  WHERE public.profiles.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.recompute_streak(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_streak(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_streak(uuid) TO service_role;
