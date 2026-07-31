-- Seed data for Moon-Bird (doc §3.1).
-- Runs once per `supabase db reset`.

-- The 8 onboarding challenges (doc §3.1). Idempotent — upsert by slug.
--
-- IMPORTANT (do-not-paraphrase constraint): only the challenge NAMES and the
-- structural fields (scope, sort order, icon) survive in repo history. The
-- original description / prompt (the "Completion Step" copy) and any survey
-- question WORDING do NOT survive and must not be invented here. Each row
-- therefore carries a TODO(operator) placeholder in description/prompt until the
-- operator supplies the original text. `moon_phase` is a legacy non-null column;
-- these onboarding challenges are not phase-locked, so it is set to 'Any'.
--
-- Challenge 6 "Vital Check" is structured only — do NOT add health/medical
-- advice copy. The operator/clinician supplies that text.
--
-- Surviving survey question LABELS (wording NOT included — restore later):
--   The Seeker:   Hook (1-5) · Pacing & Flow · First Impression · Clarity & Tone
--                 · Expectations Set · Drop-Off Check (+ where) · Cliffhanger
--                 Factor · Target Audience Fit
--   Up to Date:   Source Reliability (1-5) · Core Takeaway · Local Impact
--                 (Yes/No + why) · Actionability · Discussion Value
--   Cut the Habit: Trigger Awareness (1-5) · Friction Check · Identity Shift
--                 · Support Need
INSERT INTO public.challenges (slug, title, description, prompt, moon_phase, scope, icon, sort_order)
VALUES
  ('sky-watcher-l1', 'Sky Watcher L1', 'TODO(operator): supply original description for Sky Watcher L1.', 'TODO(operator): supply original completion step for Sky Watcher L1.', 'Any', 'Skills-Related', '🔭', 1),
  ('who-am-i', 'Who Am I', 'TODO(operator): supply original description for Who Am I.', 'TODO(operator): supply original completion step for Who Am I.', 'Any', 'Self-Improvement-Wellbeing', '🪞', 2),
  ('the-seeker', 'The Seeker', 'TODO(operator): supply original description for The Seeker.', 'TODO(operator): supply original completion step for The Seeker.', 'Any', 'Skills-Related', '🧭', 3),
  ('up-to-date', 'Up to Date', 'TODO(operator): supply original description for Up to Date.', 'TODO(operator): supply original completion step for Up to Date.', 'Any', 'Skills-Related', '📰', 4),
  ('cut-the-habit', 'Cut the Habit', 'TODO(operator): supply original description for Cut the Habit.', 'TODO(operator): supply original completion step for Cut the Habit.', 'Any', 'Self-Improvement-Wellbeing', '✂️', 5),
  ('vital-check', 'Vital Check', 'TODO(operator): supply original description for Vital Check (structure only — no medical advice copy).', 'TODO(operator): supply original completion step for Vital Check (structure only — no medical advice copy).', 'Any', 'Self-Improvement-Wellbeing', '❤️', 6),
  ('sky-watcher-l2', 'Sky Watcher L2', 'TODO(operator): supply original description for Sky Watcher L2.', 'TODO(operator): supply original completion step for Sky Watcher L2.', 'Any', 'Skills-Related', '🌌', 7),
  ('life-blueprint', 'Life Blueprint', 'TODO(operator): supply original description for Life Blueprint.', 'TODO(operator): supply original completion step for Life Blueprint.', 'Any', 'Self-Improvement-Wellbeing', '🗺️', 8)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  prompt = EXCLUDED.prompt,
  moon_phase = EXCLUDED.moon_phase,
  scope = EXCLUDED.scope,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- 6 astronomical events (idempotent — ON CONFLICT DO NOTHING).
-- Runs only once (not inside a loop).
INSERT INTO public.events (title, event_date, rarity, synopsis, category, source, tier, approved, visibility)
VALUES
  ('Perseid Meteor Shower Peak', '2026-08-12', 'annual', 'Up to 100 meteors per hour as Earth passes through debris from comet 109P/Swift-Tuttle.', 'astronomical', 'NASA', 'astronomical', TRUE, 'public'),
  ('Autumn Equinox', '2026-09-22', 'annual', 'The Sun crosses the celestial equator; day and night are nearly equal in length.', 'astronomical', 'IAU', 'astronomical', TRUE, 'public'),
  ('Orionid Meteor Shower Peak', '2026-10-21', 'annual', 'Meteors radiate from Orion, left behind by Halley''s Comet.', 'astronomical', 'NASA', 'astronomical', TRUE, 'public'),
  ('Winter Solstice', '2026-12-21', 'annual', 'The longest night of the year in the Northern Hemisphere.', 'astronomical', 'IAU', 'astronomical', TRUE, 'public'),
  ('Geminid Meteor Shower Peak', '2026-12-14', 'annual', 'One of the richest showers, up to 120 multicolored meteors per hour.', 'astronomical', 'NASA', 'astronomical', TRUE, 'public'),
  ('Total Lunar Eclipse', '2026-03-03', 'rare', 'The Full Moon passes fully into Earth''s umbra, glowing copper-red.', 'astronomical', 'NASA', 'astronomical', TRUE, 'public')
ON CONFLICT DO NOTHING;

-- Moon-Bird Curated house-ad fallback (doc §5; audit findings C5 + PayPal rail).
-- Kept COMMENTED ON PURPOSE: the old CDN https://cdn.moonbug.app no longer
-- resolves, and seeding rows that point at missing assets would re-introduce the
-- C5 "placeholder data" defect the audit flagged. To activate house ads, the
-- operator must first place real assets under public/fallback/ (or swap in a
-- real ad-network payload), then uncomment. Currency is USD to match the PayPal
-- payout rail (crypto/USDC was dropped by binding decision).
--
-- INSERT INTO public.advertisers (id, name, verified)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'Moon-Bird Curated', TRUE)
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO public.ad_campaigns
--   (id, advertiser_id, format, title, payload_url, reward_per_action, reward_currency, target_categories, nsfw, status)
-- VALUES
--   ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'picture', 'Cosmic Calm', '/fallback/cosmic-calm.jpg', 0.05, 'USD', '["influential","relaxed"]'::jsonb, FALSE, 'active'),
--   ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'video', 'Lunar Glow', '/fallback/lunar-glow.mp4', 0.10, 'USD', '["humorous","creative"]'::jsonb, FALSE, 'active')
-- ON CONFLICT (id) DO NOTHING;
