import { json } from "@/lib/http/respond";
import { loadUserResponse } from "@/lib/http/profile";
import { parseBody } from "@/lib/http/validate";
import { signupSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** The single 400 body §4.3 uses for decode errors, bad email, and short passwords. */
const INVALID = "email and password (min 6 chars) are required";

/**
 * POST /api/auth/signup — docs/API_CONTRACTS.md §4.3, MIGRATION_MAP §4.1.
 *
 * 200 (not 201) with `{"ok":true,"user":{...}}` — the issueSession shape (§4.7).
 *
 * Go inserted the user row itself; here auth.users is written by Supabase and
 * the on_auth_user_created trigger (0002_profiles.sql) owns public.profiles.
 * `options.data` lands in raw_user_meta_data, which the trigger reads — so
 * display_name/auth_method/preferred_method must be passed here, or the trigger
 * falls back to the email local part and 'otp'.
 *
 * Divergences from Go, both deliberate:
 *  - bcrypt(cost 10) is replaced by Supabase Auth's own password storage.
 *  - `validEmail` accepted anything containing "@" and "." under 254 bytes;
 *    zod's .email() is stricter. It only ever rejects more, and the 400 body is
 *    unchanged, so no real address Go accepted is newly refused.
 *
 * Rate limiting (audit A8) is Supabase Auth's built-in per-IP/per-email limit
 * rather than middleware of ours. That covers this route but not the app's own
 * write endpoints — TODO(operator): a shared limiter still has to land for
 * those (docs/audit-findings.md A8).
 */
export async function POST(request: Request) {
  const body = await parseBody(request, signupSchema, {
    invalidJson: INVALID,
    message: () => INVALID,
  });
  if (body instanceof Response) return body;

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return json({ error: "could not create account" }, 500);
  }

  // Go trimmed DisplayName and let store.CreateUser substitute a default when it
  // came out empty. The product default is now "Moon-Bird".
  const displayName = body.displayName?.trim() || "Moon-Bird";

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        auth_method: "password",
        display_name: displayName,
        preferred_method: "password",
      },
    },
  });

  if (error) {
    // Supabase surfaces the duplicate as "User already registered" when email
    // confirmation is off. Map it — never pass Supabase's own string through,
    // since the frontend renders `error` verbatim.
    if (/already registered|already exists/i.test(error.message)) {
      return json({ error: "an account with this email already exists" }, 409);
    }
    return json({ error: "could not create account" }, 500);
  }

  // With email confirmation ON, Supabase obfuscates the duplicate rather than
  // erroring: it returns a user with an empty `identities` array and no session.
  // That is the documented signal for "this address already has an account".
  if (data.user && data.user.identities?.length === 0) {
    return json({ error: "an account with this email already exists" }, 409);
  }

  // No session means email confirmation is enabled, so there is no authenticated
  // caller to read profiles as and §4.3's {ok, user} cannot be produced — the
  // contract assumes signup logs you straight in.
  // TODO(operator): disable "Confirm email" in Supabase Auth for contract
  // parity, or accept this 500 and add a confirm-your-email UI state.
  if (!data.session) {
    return json({ error: "could not start session" }, 500);
  }

  const user = await loadUserResponse(supabase, data.session.user);
  if (!user) return json({ error: "could not create account" }, 500);

  return json({ ok: true, user });
}
