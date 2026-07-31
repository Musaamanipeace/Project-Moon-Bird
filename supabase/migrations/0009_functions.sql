-- SECURITY DEFINER helper functions for server-authoritative actions (doc §6, §9).
-- All functions set search_path = ''.

-- grant_advertiser_role: checks if user has any challenge activity, then grants advertiser status.
CREATE OR REPLACE FUNCTION public.grant_advertiser_role(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profiles
  SET is_advertiser = true
  WHERE id = p_user_id
    AND EXISTS (SELECT 1 FROM public.challenge_logs WHERE user_id = p_user_id);
$$;

-- award_badge: inserts a badge if it does not already exist.
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_challenge_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.badges (user_id, challenge_id)
  VALUES (p_user_id, p_challenge_id)
  ON CONFLICT (user_id, challenge_id) DO NOTHING;
$$;

-- complete_challenge: updates challenge_logs status with transition validation.
-- Valid transitions:
--   unfinished -> finished | completed_unaudited | evolving
--   completed_unaudited -> finished | unfinished
CREATE OR REPLACE FUNCTION public.complete_challenge(
  p_user_id uuid,
  p_challenge_id uuid,
  p_log_date date,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('finished', 'completed_unaudited', 'evolving', 'unfinished') THEN
    RAISE EXCEPTION 'invalid target status';
  END IF;

  UPDATE public.challenge_logs
  SET status = p_status,
      updated_at = now()
  WHERE user_id = p_user_id
    AND challenge_id = p_challenge_id
    AND log_date = p_log_date
    AND (
      (status = 'unfinished' AND p_status IN ('finished', 'completed_unaudited', 'evolving'))
      OR
      (status = 'completed_unaudited' AND p_status IN ('finished', 'unfinished'))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid status transition';
  END IF;
END;
$$;
