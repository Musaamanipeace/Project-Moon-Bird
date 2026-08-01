import { toRFC3339 } from "./time";

/**
 * userResponse (docs/API_CONTRACTS.md §4.9) — used by routes 4–9 and 22.
 *
 * Keys are emitted in ALPHABETICAL order because Go's encoding/json sorts
 * map[string]interface{} keys, and the contract pins the resulting byte order:
 * authMethod, createdAt, displayName, email, id, longestStreak,
 * notificationsEnabled, preferredMethod, streak.
 *
 * Documented divergence: `isAdvertiser` (alphabetically between `id` and
 * `longestStreak`) is not in the Go serializer, but types/api.ts declares it
 * optional on User and the UI gates advertiser nav on it
 * (components/Header.tsx, pages/AdvertiserDashboard.tsx). Omitting it would
 * make the advertiser section unreachable, so it is included.
 *
 * `password_hash` is never selected into this shape, so it cannot leak.
 */
export function userResponse(p: {
  id: string;
  email: string;
  display_name: string;
  auth_method: string;
  preferred_method: string;
  notifications_enabled: boolean;
  streak: number;
  longest_streak: number;
  is_advertiser: boolean;
  created_at: string;
}) {
  return {
    authMethod: p.auth_method,
    createdAt: toRFC3339(p.created_at),
    displayName: p.display_name,
    email: p.email,
    id: p.id,
    isAdvertiser: p.is_advertiser,
    longestStreak: p.longest_streak,
    notificationsEnabled: p.notifications_enabled,
    preferredMethod: p.preferred_method,
    streak: p.streak,
  };
}
