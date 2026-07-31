-- Moon-Bird Advertisers, Campaigns, Surveys & Payouts (doc §5 + §1 addendum).
-- Supabase migration: old `users(id)` references become `auth.users(id)`.
-- Re-runnable on existing DBs.

CREATE TABLE IF NOT EXISTS advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Grant window (audit finding A1). Written only by the SECURITY DEFINER
  -- grant_advertiser_role() flow after server-side eligibility, never by the
  -- user. NULL expires_at means no expiry.
  granted_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('video','picture','paid_challenge','survey')),
  title TEXT NOT NULL,
  payload_url TEXT NOT NULL,
  reward_per_action NUMERIC(18,8) NOT NULL DEFAULT 0,
  -- PayPal payout rail (binding decision): rewards are denominated in fiat.
  reward_currency TEXT NOT NULL DEFAULT 'USD',
  target_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  nsfw BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_payout NUMERIC(18,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  signature TEXT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, nonce)
);

-- Server-authoritative ad view sessions (audit finding A3). The old flow let a
-- client assert "I watched it" and mint a completion token directly. Instead:
--   1. Server opens a session, generates `nonce`, stamps `issued_at`.
--   2. Client plays the ad, then posts back the nonce.
--   3. Server accepts only if now() - issued_at >= min_dwell_seconds and the
--      nonce is unclaimed, then sets completed_at.
-- The partial unique index below caps rewards at one completion per user per
-- campaign per UTC-day period, so replaying nonces cannot farm payouts.
CREATE TABLE IF NOT EXISTS ad_view_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  min_dwell_seconds INTEGER NOT NULL DEFAULT 5,
  completed_at TIMESTAMPTZ NULL,
  reward_period DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, nonce)
);

-- A3: at most one *completed* session per user/campaign/period is claimable.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_view_completion_period
  ON ad_view_sessions (user_id, campaign_id, reward_period)
  WHERE completed_at IS NOT NULL;

-- PayPal payout accounts (binding decision: PayPal rail replaces the old
-- Solana/EVM crypto wallets). A user links the PayPal email that receives
-- payouts; the server-side rail resolves this to a PayPal Payouts batch item.
-- TODO(operator): wire PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET and the live
-- Payouts API; the rail is stubbed behind those env vars for now.
CREATE TABLE IF NOT EXISTS payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paypal' CHECK (provider IN ('paypal')),
  paypal_email TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_completion_tokens_user ON completion_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON payout_accounts(user_id);

-- Curated fallback advertiser + campaigns live in seed.sql, not here. Schema
-- migrations stay data-free so they can run against any environment.
