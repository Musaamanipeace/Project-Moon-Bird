import { toRFC3339 } from "./time";

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
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    authMethod: p.auth_method,
    preferredMethod: p.preferred_method,
    notificationsEnabled: p.notifications_enabled,
    streak: p.streak,
    longestStreak: p.longest_streak,
    isAdvertiser: p.is_advertiser,
    createdAt: toRFC3339(p.created_at),
  };
}