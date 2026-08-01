import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Service-role client. Bypasses RLS, so it must never reach the browser — hence
 * the `server-only` import above, which turns an accidental client-component
 * import into a build error rather than a leaked key.
 *
 * Typed with Database so `.rpc()` checks the function name and parameter names
 * against 0009/0010; PostgREST answers an unknown name with a 404 that would
 * otherwise only surface at runtime.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}