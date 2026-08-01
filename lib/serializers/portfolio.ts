import { toRFC3339 } from "./time";

/**
 * Serializers for docs/API_CONTRACTS.md §8.4-§8.7.
 *
 * `user_id` is on every one of these rows and is never emitted — the caller is
 * the only person who can read them, so echoing their own id back is noise at
 * best.
 */

export type ProfileFieldRow = {
  id: string;
  parent_id: string | null;
  title: string;
  value_text: string | null;
  value_int: number | null;
  value_json: unknown;
  field_type: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** A row plus its assembled subtree. */
export type ProfileFieldNode = ProfileFieldRow & { children: ProfileFieldNode[] };

/**
 * publicField (§8.4), recursive.
 *
 * Keys alphabetical: children, createdAt, fieldType, id, parentId, sortOrder,
 * title, updatedAt, valueInt, valueJson, valueText.
 *
 * `children` is `[]`, never null, at every depth — §8.4 initialises it to an
 * empty slice and only replaces it when there are children. `valueJson` is
 * inlined verbatim from the jsonb column, defaulting to `[]` (not `{}`, and not
 * null) to match store.go:1349.
 */
export function publicField(f: ProfileFieldNode): Record<string, unknown> {
  return {
    children: f.children.map(publicField),
    createdAt: toRFC3339(f.created_at),
    fieldType: f.field_type,
    id: f.id,
    parentId: f.parent_id,
    sortOrder: f.sort_order,
    title: f.title,
    updatedAt: toRFC3339(f.updated_at),
    valueInt: f.value_int,
    valueJson: f.value_json ?? [],
    valueText: f.value_text ?? "",
  };
}

/** publicAsset (§8.5). Keys: createdAt, detail, id, kind, sortOrder, title, updatedAt. */
export function publicAsset(a: {
  id: string;
  kind: string;
  title: string;
  detail: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
}) {
  return {
    createdAt: toRFC3339(a.created_at),
    // §8.5 substitutes {} for an empty detail. The column defaults to '{}' so
    // this is belt-and-braces, but a row written before that default existed
    // would otherwise serialize as null.
    detail: a.detail ?? {},
    id: a.id,
    kind: a.kind,
    sortOrder: a.sort_order,
    title: a.title,
    updatedAt: toRFC3339(a.updated_at),
  };
}

/** publicFavorite (§8.6). Keys: createdAt, id, kind, label, sortOrder, updatedAt, value. */
export function publicFavorite(f: {
  id: string;
  kind: string;
  label: string;
  value: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}) {
  return {
    createdAt: toRFC3339(f.created_at),
    id: f.id,
    kind: f.kind,
    label: f.label,
    sortOrder: f.sort_order,
    updatedAt: toRFC3339(f.updated_at),
    value: f.value,
  };
}

/**
 * publicLink (§8.7). Keys: createdAt, id, isLinktree, label, sortOrder,
 * updatedAt, url.
 *
 * The response key is lowercase `url` even though the Go field was `URL`.
 */
export function publicLink(l: {
  id: string;
  url: string;
  label: string;
  is_linktree: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}) {
  return {
    createdAt: toRFC3339(l.created_at),
    id: l.id,
    isLinktree: l.is_linktree,
    label: l.label,
    sortOrder: l.sort_order,
    updatedAt: toRFC3339(l.updated_at),
    url: l.url,
  };
}

/**
 * badgePublic — the §10 fix.
 *
 * Go emitted this one collection with no serializer at all, so it went out as
 * PascalCase (`ChallengeID`, `Title`, `Icon`, `AwardedAt`) in struct-declaration
 * order with RFC3339**Nano** timestamps. `types/api.ts:Badge` declares
 * camelCase, and `Profile.tsx` reads `b.challengeId` — which is `undefined`
 * against the real payload, so no badge has ever rendered as earned.
 *
 * This is the one place where "match the Go bytes" and "match the frozen
 * types/api.ts" contradict each other. §10 recommends the fix; nothing can be
 * depending on the PascalCase shape, because it does not work.
 *
 * Keys alphabetical: awardedAt, challengeId, icon, title. `awardedAt` is
 * second-precision RFC3339 like every other timestamp in the API.
 */
export function badgePublic(b: {
  challenge_id: string;
  awarded_at: string;
  challenges: { title: string; icon: string } | null;
}) {
  return {
    awardedAt: toRFC3339(b.awarded_at),
    challengeId: b.challenge_id,
    icon: b.challenges?.icon ?? "",
    title: b.challenges?.title ?? "",
  };
}

/**
 * recentActivity elements (§8.1). Keys: completed, data, logDate, slug.
 *
 * `data` is normalised to `{}` rather than passed through as null, matching
 * RecentActivity. `logDate` is date-only and passed through verbatim.
 */
export function activityPublic(a: {
  log_date: string;
  status: string;
  data: unknown;
  challenges: { slug: string } | null;
}) {
  return {
    completed: a.status === "finished",
    data:
      a.data && typeof a.data === "object" && !Array.isArray(a.data) ? a.data : {},
    logDate: a.log_date,
    slug: a.challenges?.slug ?? "",
  };
}
