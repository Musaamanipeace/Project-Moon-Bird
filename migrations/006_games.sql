-- Moonbug Word-Guessing Game (doc §3.D).
-- Idempotent DDL for the game schema. Re-runnable on existing DBs.

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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES game_levels(id) ON DELETE CASCADE,
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
-- Hardcoded seed set; 1,000 AI-generated levels to be loaded via a separate migration script.
INSERT INTO game_levels (id, word, phrase, difficulty, hints, category) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Galileo', '', 'hard',
   '["Italian polymath","Built his own telescope","Put under house arrest by the Inquisition","Confirmed the phases of Venus"]'::jsonb, 'science'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Shakespeare', '', 'hard',
   '["English playwright","Wrote Romeo and Juliet","Born in Stratford-upon-Avon","Often called the Bard"]'::jsonb, 'literature'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Amazon', '', 'easy',
   '["The largest river by volume on Earth","Flows through South America","Named after a warrior women tribe","Home to the pink river dolphin"]'::jsonb, 'geography'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tesla', '', 'easy',
   '["Electric car manufacturer","Named after Nikola Tesla","Founded in 2003","Elon Musk is the CEO"]'::jsonb, 'technology'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eiffel', '', 'medium',
   '["Located in Paris, France","Wrought-iron lattice tower","Built for the 1889 World\'s Fair","Named after its engineer Gustave"]'::jsonb, 'landmark'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Picasso', '', 'medium',
   '["Spanish painter","Co-founded Cubism","Painted Guernica","Prolific across painting, sculpture, ceramics"]'::jsonb, 'art'),
  ('11111111-1111-1111-1111-111111111111', 'Newton', '', 'hard',
   '["English physicist and mathematician","Formulated the laws of motion","Invented the reflecting telescope","Lived during the 17th century"]'::jsonb, 'science'),
  ('22222222-2222-2222-2222-222222222222', 'Mona Lisa', '', 'easy',
   '["Famous oil painting","Painted by Leonardo da Vinci","Hangs in the Louvre Museum","Subject\'s expression is famously ambiguous"]'::jsonb, 'art')
ON CONFLICT (id) DO NOTHING;
