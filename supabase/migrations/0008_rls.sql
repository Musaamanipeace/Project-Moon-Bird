-- RLS policies for every public table (doc §7).
-- Re-runnable: uses CREATE OR REPLACE for policies.

-- public.profiles
-- A1: the self-service UPDATE must never let a user escalate their own
-- privileges. Row scope ("own row") is enforced by the RLS policy; *column*
-- scope is enforced with column-level privileges, because an RLS WITH CHECK
-- only sees the NEW row and cannot tell whether is_advertiser/role changed.
-- is_advertiser, role, streak, and longest_streak are therefore writable only
-- by the SECURITY DEFINER functions, which run as the table owner and bypass
-- these grants.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_select_owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, preferred_method, notifications_enabled) ON public.profiles TO authenticated;

-- public.challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select_auth" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "challenges_select_anon" ON public.challenges FOR SELECT TO anon USING (true);

-- public.challenge_logs
ALTER TABLE public.challenge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenge_logs_all_owner" ON public.challenge_logs FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_owner" ON public.badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- public.notebook_entries
ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_entries_all_owner" ON public.notebook_entries FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_auth" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_select_anon" ON public.events FOR SELECT TO anon USING (approved = true AND visibility = 'public');

-- public.user_calendar_events
ALTER TABLE public.user_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_calendar_events_all_owner" ON public.user_calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.profile_fields
ALTER TABLE public.profile_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_fields_all_owner" ON public.profile_fields FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.user_assets
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_assets_all_owner" ON public.user_assets FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_favorites_all_owner" ON public.user_favorites FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.user_links
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_links_all_owner" ON public.user_links FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.advertisers
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advertisers_all_owner" ON public.advertisers FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.ad_campaigns
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_campaigns_select_auth" ON public.ad_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "ad_campaigns_modify_owner" ON public.ad_campaigns FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.advertisers WHERE id = advertiser_id AND user_id = auth.uid()));

-- public.surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surveys_modify_advertiser" ON public.surveys FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.ad_campaigns JOIN public.advertisers ON ad_campaigns.advertiser_id = advertisers.id WHERE ad_campaigns.id = surveys.campaign_id AND advertisers.user_id = auth.uid()));
CREATE POLICY "surveys_select_auth" ON public.surveys FOR SELECT TO authenticated USING (true);

-- public.completion_tokens
ALTER TABLE public.completion_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completion_tokens_all_owner" ON public.completion_tokens FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.payout_accounts (PayPal rail — replaces the old crypto user_wallets).
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_accounts_all_owner" ON public.payout_accounts FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.ad_view_sessions (A3). Server-authoritative, but a user may only ever
-- read/carry their own sessions; issuance and completion run through the
-- SECURITY DEFINER path which bypasses RLS.
ALTER TABLE public.ad_view_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_view_sessions_all_owner" ON public.ad_view_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- public.chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_rooms_select_auth" ON public.chat_rooms FOR SELECT TO authenticated USING (true);

-- public.chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_insert_owner" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_select_auth" ON public.chat_messages FOR SELECT TO authenticated USING (true);

-- public.audit_assignments
ALTER TABLE public.audit_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_assignments_select_auditor" ON public.audit_assignments FOR SELECT TO authenticated USING (auditor_id = auth.uid());

-- public.game_levels
ALTER TABLE public.game_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_levels_select_auth" ON public.game_levels FOR SELECT TO authenticated USING (true);

-- public.user_game_progress
ALTER TABLE public.user_game_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_game_progress_all_owner" ON public.user_game_progress FOR ALL TO authenticated USING (auth.uid() = user_id);
