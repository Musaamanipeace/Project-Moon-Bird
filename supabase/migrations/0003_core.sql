CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  prompt text NOT NULL,
  moon_phase text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.challenge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'unfinished' CHECK (status IN ('unfinished','finished','completed_unaudited','evolving')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, log_date)
);

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
