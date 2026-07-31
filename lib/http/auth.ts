import "server-only";

import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/http/respond";

/** The RLS-scoped client returned by createServerSupabaseClient(). */
type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export type AuthedContext = {
  supabase: ServerSupabaseClient;
  user: User;
};

/**
 * RequireAuth equivalent (docs/API_CONTRACTS.md §1.4).
 *
 * Resolves the Supabase cookie session and returns the authenticated context,
 * or the exact 401 `{"error":"unauthorized"}` response (no trailing newline).
 * Callers branch on `instanceof Response`:
 *
 *   const auth = await requireUser();
 *   if (auth instanceof Response) return auth;
 *   const { supabase, user } = auth;
 *
 * Fail-closed: any error from the auth call — expired token, unreachable
 * Supabase, malformed cookie — yields 401 rather than falling through to a
 * handler with a null user. This deliberately does not port the Go backend's
 * dev-secret fallback, which let requests through when the signing key was
 * unset (audit finding A7).
 *
 * Uses getUser(), not getSession(): getSession() trusts the cookie payload
 * without contacting the auth server, so a forged cookie would pass.
 */
export async function requireUser(): Promise<AuthedContext | Response> {
  let supabase: ServerSupabaseClient;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return unauthorized();
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return unauthorized();
  }

  return { supabase, user: data.user };
}
