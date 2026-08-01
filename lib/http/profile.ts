import "server-only";

import type { User } from "@supabase/supabase-js";

import { userResponse } from "@/lib/serializers/users";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

/** Columns backing userResponse (§4.9). `email` is not among them. */
const PROFILE_COLUMNS =
  "id, display_name, auth_method, preferred_method, notifications_enabled, streak, longest_streak, is_advertiser, created_at";

/**
 * Load the caller's profile and shape it as the contract's user object.
 *
 * The Go backend had a single `users` table; here identity is split between
 * auth.users (email, verified by Supabase) and public.profiles (app state), so
 * `email` is taken from the authenticated user rather than the profile row.
 *
 * Returns null when the profile row is missing — the handle_new_user trigger
 * creates it, so this means the row was deleted or the trigger did not fire.
 * Callers map null to the route's own error, since §4.6 and §4.8 differ.
 */
export async function loadUserResponse(
  supabase: ServerSupabaseClient,
  user: User,
): Promise<ReturnType<typeof userResponse> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const profile = data as unknown as Parameters<typeof userResponse>[0];
  return userResponse({ ...profile, email: user.email ?? "" });
}
