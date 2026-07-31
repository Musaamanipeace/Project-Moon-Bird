-- Moon-Bird Word-Guessing Game (doc §3.D).
-- Supabase migration: old `users(id)` references become `auth.users(id)`.
-- Re-runnable on existing DBs.

CREATE TABLE IF NOT EXISTS game_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  phrase TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.game_levels(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 4,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_game_levels_difficulty ON game_levels(difficulty);
CREATE INDEX IF NOT EXISTS idx_game_levels_category ON game_levels(category);
CREATE INDEX IF NOT EXISTS idx_user_game_progress_user ON user_game_progress(user_id);

-- Seed levels (idempotent — ON CONFLICT DO NOTHING).
-- UUIDs chosen to avoid collisions with advertiser seeds (0005).
INSERT INTO game_levels (id, word, phrase, difficulty, hints, category) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Galileo', '', 'hard',
   '["Italian polymath","Built his own telescope","Put under house arrest by the Inquisition","Confirmed the phases of Venus"]'::jsonb, 'science'),
  ('55555555-5555-5555-5555-555555555555', 'Shakespeare', '', 'hard',
   '["English playwright","Wrote Romeo and Juliet","Born in Stratford-upon-Avon","Often called the Bard"]'::jsonb, 'literature'),
  ('66666666-6666-6666-6666-666666666666', 'Amazon', '', 'easy',
   '["The largest river by volume on Earth","Flows through South America","Named after a warrior women tribe","Home to the pink river dolphin"]'::jsonb, 'geography'),
  ('77777777-7777-7777-7777-777777777777', 'Tesla', '', 'easy',
   '["Electric car manufacturer","Named after Nikola Tesla","Founded in 2003","Elon Musk is the CEO"]'::jsonb, 'technology'),
  ('88888888-8888-8888-8888-888888888888', 'Eiffel', '', 'medium',
   '["Located in Paris, France","Wrought-iron lattice tower","Built for the 1889 World''s Fair","Named after its engineer Gustave"]'::jsonb, 'landmark'),
  ('99999999-9999-9999-9999-999999999999', 'Picasso', '', 'medium',
   '["Spanish painter","Co-founded Cubism","Painted Guernica","Prolific across painting, sculpture, ceramics"]'::jsonb, 'art'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Newton', '', 'hard',
   '["English physicist and mathematician","Formulated the laws of motion","Invented the reflecting telescope","Lived during the 17th century"]'::jsonb, 'science'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mona Lisa', '', 'easy',
   '["Famous oil painting","Painted by Leonardo da Vinci","Hangs in the Louvre Museum","Subject''s expression is famously ambiguous"]'::jsonb, 'art')
ON CONFLICT (id) DO NOTHING;
