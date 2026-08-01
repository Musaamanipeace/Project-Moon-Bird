import { json } from "@/lib/http/respond";
import { displayNameFromEmail } from "@/lib/display-name";
import { parseBody } from "@/lib/http/validate";
import { requestOtpSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/request-otp — docs/API_CONTRACTS.md §4.1, MIGRATION_MAP §4.1.
 *
 * 200 `{"ok":true}`.
 *
 * `shouldCreateUser: true` preserves Go's behaviour of signing the address up on
 * its first OTP: Go's verify-otp called store.CreateUser, which was get-or-create.
 *
 * **`devCode` is intentionally absent.** Go echoed the plaintext OTP in the
 * response whenever APP_ENV != "production" — an env var, not a build flag, so a
 * single misconfiguration turned the login endpoint into an OTP oracle. Supabase
 * never returns the code to the caller, so the key cannot be reproduced and is
 * not faked. In local dev the code is in Inbucket at http://127.0.0.1:54324.
 *
 * The whole Go mail path is gone with it, and three defects go with it
 * (MIGRATION_MAP §4): unsalted SHA-256 over a 10^6 keyspace, SendOTPEmail
 * returning nil when SMTP_HOST was empty so codes were silently never sent, and
 * hand-built RFC822 headers with no CRLF guard on the recipient — a header
 * injection vector that audit-findings.md never recorded.
 *
 * Note src/pages/Login.tsx still renders `devCode`; that path becomes a pointer
 * to Inbucket during the UI port, not a silent removal (MASTER_PROMPT §11).
 *
 * Email bombing and SMTP quota exhaustion (audit A8) are bounded by Supabase
 * Auth's own per-address and per-IP send limits.
 */
export async function POST(request: Request) {
  const body = await parseBody(request, requestOtpSchema, {
    invalidJson: "a valid email is required",
    message: () => "a valid email is required",
  });
  if (body instanceof Response) return body;

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return json({ error: "could not send code" }, 500);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: body.email,
    options: {
      // Read by the on_auth_user_created trigger (0002_profiles.sql) — and only
      // on insert, so this is inert for an address that already has an account.
      // display_name must be passed: the trigger's own fallback is the raw email
      // local part, whereas Go named OTP accounts with displayNameFromEmail.
      data: {
        auth_method: "otp",
        display_name: displayNameFromEmail(body.email),
        preferred_method: "otp",
      },
      shouldCreateUser: true,
    },
  });

  if (error) return json({ error: "could not send code" }, 500);

  return json({ ok: true });
}
