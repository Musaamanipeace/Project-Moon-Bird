import { json } from "@/lib/http/respond";
import { loadUserResponse } from "@/lib/http/profile";
import { parseBody } from "@/lib/http/validate";
import { loginSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/login — docs/API_CONTRACTS.md §4.4, MIGRATION_MAP §4.1.
 *
 * 200 `{"ok":true,"user":{...}}` — the issueSession shape (§4.7). The session
 * cookie is written by @supabase/ssr through the server client's cookie
 * adapter, replacing setSessionCookie/moonbug_session. The frontend never read
 * a token out of the body, so nothing changes for it.
 *
 * Every failure returns the identical `invalid credentials` — §4.4 is explicit
 * that the two Go paths share one string so the route cannot be used to
 * enumerate accounts. Note that password length is deliberately NOT
 * pre-validated here (loginSchema has no min), matching Go: a length check
 * would let a caller distinguish "too short" from "wrong".
 *
 * Brute force (audit A8) is bounded by Supabase Auth's built-in rate limits,
 * not by middleware of ours.
 */
export async function POST(request: Request) {
  const body = await parseBody(request, loginSchema, {
    invalidJson: "email and password are required",
    message: () => "email and password are required",
  });
  if (body instanceof Response) return body;

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return json({ error: "could not start session" }, 500);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  // Covers unknown account, wrong password, and an OTP-created account that has
  // no password set — all one body, as in Go.
  if (error || !data.user) {
    return json({ error: "invalid credentials" }, 401);
  }

  const user = await loadUserResponse(supabase, data.user);
  if (!user) return json({ error: "invalid credentials" }, 401);

  return json({ ok: true, user });
}
