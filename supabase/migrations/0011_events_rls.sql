-- 0011_events_rls.sql
--
-- Two gaps in public.events' row security, found while wiring §7.1/§7.2.
--
-- 1. There is no INSERT policy at all. 0008 gave `authenticated` a SELECT
--    policy and nothing else, so POST /api/events could never have succeeded:
--    RLS denies by default, and a missing policy is a denial, not a pass.
--
-- 2. `events_select_auth USING (true)` let any signed-in user read every row,
--    including unapproved community submissions and rows marked
--    visibility='private'. The private flag exists to close audit finding B4;
--    a SELECT policy of `true` makes it decorative for exactly the audience it
--    is meant to hide things from — other logged-in users.

-- Part 1 — replace the blanket authenticated SELECT.
--
-- Same visibility rule anon gets, widened by "your own rows". An author must be
-- able to see a submission that is still awaiting approval, or the event they
-- just created would vanish from their own listing.
DROP POLICY IF EXISTS "events_select_auth" ON public.events;
CREATE POLICY "events_select_auth" ON public.events
  FOR SELECT TO authenticated
  USING (
    (approved = true AND visibility = 'public')
    OR author_id = (SELECT auth.uid())
  );

-- Part 2 — let a user submit a community event, and only a community event.
--
-- The WITH CHECK duplicates the server-forced values the handler already sets
-- (§7.2: tier='community', approved=false, author_id=<caller>). That is
-- deliberate: the handler is the convenience, this is the guarantee. A bug in a
-- future handler — or any direct PostgREST call with the anon key and a valid
-- session — cannot self-approve an event onto the public calendar or attribute
-- one to another user.
CREATE POLICY "events_insert_community" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    tier = 'community'
    AND approved = false
    AND author_id = (SELECT auth.uid())
  );

-- Part 3 — an author may edit and withdraw their own submission.
--
-- Still constrained to unapproved rows: once a moderator approves an event it
-- is on other users' calendars, so editing it out from under them (or flipping
-- it private) is not the author's call. There is deliberately no UPDATE path
-- that can set approved = true — approval is a service_role action.
CREATE POLICY "events_update_own_pending" ON public.events
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()) AND approved = false)
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND approved = false
    AND tier = 'community'
  );

CREATE POLICY "events_delete_own_pending" ON public.events
  FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()) AND approved = false);
