import "server-only";

import type { ProfileFieldInput } from "@/lib/schemas";
import {
  publicAsset,
  publicField,
  publicFavorite,
  publicLink,
  type ProfileFieldNode,
  type ProfileFieldRow,
} from "@/lib/serializers/portfolio";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export const FIELD_COLUMNS =
  "id, parent_id, title, value_text, value_int, value_json, field_type, sort_order, created_at, updated_at";
export const ASSET_COLUMNS =
  "id, kind, title, detail, sort_order, created_at, updated_at";
export const FAVORITE_COLUMNS =
  "id, kind, label, value, sort_order, created_at, updated_at";
export const LINK_COLUMNS =
  "id, url, label, is_linktree, sort_order, created_at, updated_at";

/**
 * Assemble the flat profile_fields rows into the forest §8.4 serializes.
 *
 * Rows arrive already ordered by (parent_id, sort_order) from the caller, and
 * pushing in arrival order keeps each sibling list in that order, so no
 * per-level re-sort is needed.
 *
 * A row whose parent_id points at a row that is not in the set would otherwise
 * vanish silently. That cannot happen through the API — the FK cascades and
 * every row belongs to one user — but a partially-failed write could leave one
 * behind, and dropping it would make the orphan invisible and unfixable. Such
 * rows are treated as roots instead.
 */
export function buildFieldTree(rows: ProfileFieldRow[]): ProfileFieldNode[] {
  const nodes = new Map<string, ProfileFieldNode>();
  for (const row of rows) nodes.set(row.id, { ...row, children: [] });

  const roots: ProfileFieldNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    const parent = row.parent_id ? nodes.get(row.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** A profile_fields row ready for insert, with its id already assigned. */
type FieldInsert = {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  value_text: string;
  value_int: number | null;
  value_json: unknown;
  field_type: string;
  sort_order: number;
};

/**
 * Flatten the §8.3 `fields` tree into insertable rows.
 *
 * Ids are minted here rather than left to the column default because a child's
 * parent_id has to reference its parent's id, and a single batched insert
 * cannot read back an id it is in the middle of generating. crypto.randomUUID
 * matches Go's uuid.NewString(): server-generated, client ids never honoured.
 *
 * `sortOrder` is taken from the input rather than the array index — §8.3 sends
 * it explicitly, and overwriting it would silently discard a client's ordering.
 */
export function flattenFields(
  userId: string,
  inputs: ProfileFieldInput[],
  parentId: string | null = null,
  out: FieldInsert[] = [],
): FieldInsert[] {
  for (const input of inputs) {
    const id = crypto.randomUUID();
    out.push({
      id,
      user_id: userId,
      parent_id: parentId,
      title: input.title,
      value_text: input.valueText,
      value_int: input.valueInt,
      value_json: input.valueJson ?? [],
      field_type: input.fieldType,
      sort_order: input.sortOrder,
    });
    flattenFields(userId, input.children, id, out);
  }
  return out;
}

export type PortfolioPayload = {
  assets: ReturnType<typeof publicAsset>[];
  favorites: ReturnType<typeof publicFavorite>[];
  fields: Record<string, unknown>[];
  links: ReturnType<typeof publicLink>[];
};

/**
 * Read all four collections and shape them as the §8.2 body.
 *
 * Returns null on any read failure: §8.2 gives all four the single string
 * "could not load portfolio", so the caller has nothing to distinguish and
 * no reason to know which one failed.
 *
 * The reads are concurrent. Go ran them in sequence, but since every failure
 * maps to the same body there is no observable ordering to preserve — unlike
 * §8.1, where each read has its own error string.
 */
export async function loadPortfolio(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<PortfolioPayload | null> {
  const [fields, assets, favorites, links] = await Promise.all([
    supabase
      .from("profile_fields")
      .select(FIELD_COLUMNS)
      .eq("user_id", userId)
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_assets")
      .select(ASSET_COLUMNS)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_favorites")
      .select(FAVORITE_COLUMNS)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_links")
      .select(LINK_COLUMNS)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  if (fields.error || assets.error || favorites.error || links.error) {
    return null;
  }

  const fieldRows = (fields.data ?? []) as unknown as ProfileFieldRow[];
  const assetRows = (assets.data ?? []) as unknown as Parameters<
    typeof publicAsset
  >[0][];
  const favoriteRows = (favorites.data ?? []) as unknown as Parameters<
    typeof publicFavorite
  >[0][];
  const linkRows = (links.data ?? []) as unknown as Parameters<
    typeof publicLink
  >[0][];

  // Keys alphabetical per §8.2: assets, favorites, fields, links.
  return {
    assets: assetRows.map(publicAsset),
    favorites: favoriteRows.map(publicFavorite),
    fields: buildFieldTree(fieldRows).map(publicField),
    links: linkRows.map(publicLink),
  };
}
