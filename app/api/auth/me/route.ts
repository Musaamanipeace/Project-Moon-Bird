import { json } from "@/lib/http/respond";
import { requireUser } from "@/lib/http/auth";
import { loadUserResponse } from "@/lib/http/profile";

/**
 * GET /api/auth/me — docs/API_CONTRACTS.md §4.6.
 *
 * Note the two different 401s: RequireAuth's has NO trailing newline (§1.4),
 * while the profile-lookup failure below goes through json() and DOES.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const user = await loadUserResponse(auth.supabase, auth.user);
  if (!user) return json({ error: "unauthorized" }, 401);

  return json({ user });
}
