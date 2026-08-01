import { json } from "@/lib/http/respond";
import { requireUser } from "@/lib/http/auth";
import { loadUserResponse } from "@/lib/http/profile";
import { parseBody } from "@/lib/http/validate";
import { settingsSchema } from "@/lib/schemas";

/** GET /api/auth/settings — returns the same user object as §4.6. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const user = await loadUserResponse(auth.supabase, auth.user);
  if (!user) return json({ error: "unauthorized" }, 401);

  return json({ user });
}

/**
 * PUT /api/auth/settings — docs/API_CONTRACTS.md §4.8.
 *
 * Both fields are optional, so absent != false: only the keys actually present
 * are applied. An empty body is a valid no-op that re-reads the user.
 *
 * Only display_name, preferred_method and notifications_enabled are grantable
 * to `authenticated` (0008_rls.sql, audit finding A1); is_advertiser, role and
 * the streak columns are writable only by SECURITY DEFINER functions. The
 * .strict() schema rejects those keys before the grant would.
 */
export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const body = await parseBody(request, settingsSchema, {
    invalidJson: "invalid body",
    // Go decoded into a *string and only then checked membership, so the two
    // failures carry different bodies. Zod collapses them into one parse, so
    // the raw value decides: a string outside the set is the membership
    // failure; anything else (wrong type, unknown key) is a decode failure.
    message: (_error, raw) => {
      const value = (raw as Record<string, unknown> | null)?.preferredMethod;
      return typeof value === "string"
        ? "preferredMethod must be 'otp' or 'password'"
        : "invalid body";
    },
  });
  if (body instanceof Response) return body;

  const updates: Record<string, unknown> = {};
  if (body.notificationsEnabled !== undefined) {
    updates.notifications_enabled = body.notificationsEnabled;
  }
  if (body.preferredMethod !== undefined) {
    updates.preferred_method = body.preferredMethod;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await auth.supabase
      .from("profiles")
      .update(updates)
      .eq("id", auth.user.id);

    if (error) return json({ error: "could not update settings" }, 500);
  }

  const user = await loadUserResponse(auth.supabase, auth.user);
  if (!user) return json({ error: "could not update settings" }, 500);

  return json({ user });
}
