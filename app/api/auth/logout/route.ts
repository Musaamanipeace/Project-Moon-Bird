import { json } from "@/lib/http/respond";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/logout — docs/API_CONTRACTS.md §4.5.
 *
 * No request body. Always 200 {"ok":true}: the Go handler ignored the revoke's
 * return value, so a failing sign-out must not surface as an error. signOut()
 * clears the Supabase auth cookies via the server client's cookie adapter.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Deliberately swallowed — see above.
  }

  return json({ ok: true });
}
