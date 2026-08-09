// Thin client for the Moonbug social/catalogue backend (server.ts).
// All endpoints are real HTTP calls to the running dev server.

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Brand { id: string; name: string; tagline: string; category: string; interests: string[]; logoEmoji: string; }
export interface Book { id: string; title: string; author: string; tagline: string; category: string; interests: string[]; emoji: string; }
export type FeedKind = 'catalogue_share' | 'challenge_created' | 'ad_share' | 'event_comment' | 'challenge_badge';
export interface FeedItem {
  id: string; author: string; kind: FeedKind; title?: string; body?: string;
  refId?: string; refType?: string; experience?: string; timestamp: string; likes?: number;
}
export interface PublicUser {
  id: string; nickname: string; interests: string[]; brandLinks: string[];
  avatarEmoji: string; bio?: string; score?: number; sharedInterests?: string[]; sharedBrands?: string[];
}

export const api = {
  brands: () => getJson<Brand[]>("/api/catalogue/brands"),
  books: () => getJson<Book[]>("/api/catalogue/books"),
  skills: () => getJson<any[]>("/api/catalogue/skills"),
  diseases: () => getJson<any[]>("/api/catalogue/diseases"),
  charities: () => getJson<any[]>("/api/catalogue/charities"),

  feed: (params?: { author?: string; kind?: string }) => {
    const q = new URLSearchParams();
    if (params?.author) q.set("author", params.author);
    if (params?.kind) q.set("kind", params.kind);
    const qs = q.toString();
    return getJson<FeedItem[]>(`/api/feed${qs ? `?${qs}` : ""}`);
  },
  postFeed: (entry: { author: string; kind: FeedKind; title?: string; body?: string; refId?: string; refType?: string; experience?: string }) =>
    postJson<FeedItem>("/api/feed", entry),

  users: () => getJson<PublicUser[]>("/api/users"),
  user: (id: string) => getJson<PublicUser & { feed: FeedItem[] }>(`/api/users/${id}`),

  matchmaking: (p: { nickname: string; interests: string[]; brandLinks: string[] }) =>
    getJson<PublicUser[]>(`/api/matchmaking?nickname=${encodeURIComponent(p.nickname)}&interests=${p.interests.join(",")}&brandLinks=${p.brandLinks.join(",")}`),

  onlineExtended: () => getJson<(PublicUser & { activePhase?: string })[]>("/api/online-users/extended"),
};
