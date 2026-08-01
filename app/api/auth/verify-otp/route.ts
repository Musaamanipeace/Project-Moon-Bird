import { json } from "@/lib/http/respond";
import { loadUserResponse } from "@/lib/http/profile";
import { parseBody } from "@/lib/http/validate";
import { verifyOtpSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/verify-otp — docs/API_CONTRACTS.md §4.2, MIGRATION_MAP §4.1.
 *
 * 200 `{"ok":true,"user":{...}}` — the issueSession shape (§4.7).
 *
 * Note the rename: the wire field stays `code`, Supabase's parameter is `token`.
 * The length-6 check is on the wire value, matching Go's `len(body.Code) != 6`
 * (a byte-length check, not a digit check — a 6-character non-numeric code
 * reaches the verifier and fails there, as before).
 *
 * Account creation happened in request-otp via `shouldCreateUser`, where Go did
 * it here through get-or-create store.CreateUser. Same outcome, earlier.
 *
 * Go's OTP store had no attempt counter, so a 6-digit code with a 5-minute
 * window could be brute-forced well inside its TTL (audit A8). Supabase Auth
 * enforces its own attempt limit and expiry, which is the fix.
 */
export async function POST(request: Request) {
  const body = await parseBody(request, verifyOtpSchema, {
    invalidJson: "email and code are required",
    message: () => "email and code are required",
  });
  if (body instanceof Response) return body;

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return json({ error: "verification failed" }, 500);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: body.email,
    token: body.code,
    type: "email",
  });

  // Go split these: a store error was 500 "verification failed", a false return
  // was 401 "invalid or expired code". Supabase reports both as an error, and
  // the ones a client can actually cause — wrong code, expired code, too many
  // attempts — are all the 401 case. A transport failure surfacing as 401 rather
  // than 500 is the safe direction to be wrong in, and it leaks less.
  if (error || !data.user) {
    return json({ error: "invalid or expired code" }, 401);
  }

  const user = await loadUserResponse(supabase, data.user);
  if (!user) return json({ error: "could not create session" }, 500);

  return json({ ok: true, user });
}
