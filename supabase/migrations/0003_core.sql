-- Challenge lifecycle state as a Postgres ENUM (audit finding B3). The
-- transition table lives in the database via a trigger below, so no client or
-- Route Handler can bypass it. Re-runnable: guard the type creation.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_status') THEN
    CREATE TYPE public.challenge_status AS ENUM (
      'unfinished',
      'finished',
      'completed_unaudited',
      'evolving'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  prompt text NOT NULL,
  moon_phase text NOT NULL,
  -- Required on every challenge (doc §7). Skills-Related | Self-Improvement-Wellbeing | Fun-Based.
  scope text NOT NULL DEFAULT 'Self-Improvement-Wellbeing'
    CHECK (scope IN ('Skills-Related','Self-Improvement-Wellbeing','Fun-Based')),
  icon text NOT NULL,
  sort_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.challenge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.challenge_status NOT NULL DEFAULT 'unfinished',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, log_date)
);

-- Transition guard (B3). Valid edges (doc §7):
--   unfinished          -> finished | completed_unaudited | evolving
--   completed_unaudited -> finished (auditor approval) | unfinished (rejection)
-- Any other status change raises. Same-status writes (metadata-only updates)
-- are allowed through.
CREATE OR REPLACE FUNCTION public.enforce_challenge_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'unfinished'
     AND NEW.status IN ('finished', 'completed_unaudited', 'evolving') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed_unaudited'
     AND NEW.status IN ('finished', 'unfinished') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid status transition: % -> %', OLD.status, NEW.status;
END $$;

DROP TRIGGER IF EXISTS trg_challenge_status_transition ON public.challenge_logs;
CREATE TRIGGER trg_challenge_status_transition
  BEFORE UPDATE OF status ON public.challenge_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_status_transition();

CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.notebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('journal','dream','logbook','goal','schedule','idea')),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  synopsis text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'astronomical',
  source text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'astronomical' CHECK (tier IN ('astronomical','community')),
  author_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved boolean NOT NULL DEFAULT FALSE,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reminder boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user ON public.user_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON public.challenge_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_notebook_user ON public.notebook_entries(user_id, created_at DESC);
