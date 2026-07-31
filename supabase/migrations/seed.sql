-- Seed data for Moon-Bird (doc §3.1).
-- Runs once per `supabase db reset`.

-- 5 lunar challenges (idempotent — upsert by slug).
INSERT INTO public.challenges (slug, title, description, prompt, moon_phase, icon, sort_order)
VALUES
  ('new-moon-reflection', 'New Moon Reflection', 'Set your intentions for the cycle ahead while the sky is darkest.', 'Write three core intentions you want to manifest this lunar cycle.', 'New Moon', '🌑', 1),
  ('waxing-crescent-focus', 'Waxing Crescent Focus', 'Direct your rising energy with deliberate allocation.', 'Distribute your daily energy across mind, body, and spirit.', 'Waxing Crescent', '🌒', 2),
  ('full-moon-release', 'Full Moon Release', 'Let go of what no longer serves you under the fullest light.', 'List what you are ready to release, then watch it burn away.', 'Full Moon', '🌕', 3),
  ('waning-gratitude', 'Waning Gibbous Gratitude', 'Reflect on abundance as the light begins to wane.', 'Save three specific things or people you are grateful for today.', 'Waning Gibbous', '🌖', 4),
  ('balsamic-rest', 'Balsamic Moon Rest', 'Slow down and surrender before the cycle resets.', 'Complete a 4-7-8 breathing session to wind down.', 'Waning Crescent', '🌘', 5)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  prompt = EXCLUDED.prompt,
  moon_phase = EXCLUDED.moon_phase,
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

-- TODO(operator): finding C5 — the old CDN https://cdn.moonbug.app no longer
-- resolves. Replace the payload_url values below with local assets under
-- public/fallback/ or remove these rows if the operator prefers an empty feed.
--
-- INSERT INTO public.advertisers (id, name, verified)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'Moonbug Curated', TRUE)
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO public.ad_campaigns
--   (id, advertiser_id, format, title, payload_url, reward_per_action, reward_currency, target_categories, nsfw, status)
-- VALUES
--   ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'picture', 'Cosmic Calm', '/fallback/cosmic-calm.jpg', 0.05, 'USDC', '["influential","relaxed"]'::jsonb, FALSE, 'active'),
--   ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'video', 'Lunar Glow', '/fallback/lunar-glow.mp4', 0.10, 'USDC', '["humorous","creative"]'::jsonb, FALSE, 'active')
-- ON CONFLICT (id) DO NOTHING;
