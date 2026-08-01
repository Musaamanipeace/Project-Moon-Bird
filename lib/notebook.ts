import "server-only";

import { isRealDate } from "@/lib/dates";
import { notebookPublic } from "@/lib/serializers/notebook";

/** Columns behind notebookPublic (§6.5). `user_id` is never selected. */
export const NOTEBOOK_COLUMNS =
  "id, entry_type, title, body, due_date, created_at, updated_at";

export type NotebookRow = Parameters<typeof notebookPublic>[0];

/**
 * `dueDate` arrives as a date string, `""`, `null`, or absent. Go treated the
 * last three identically as "no due date" (§6.2), so all three become SQL NULL.
 */
export function normalizeDueDate(
  value: string | null | undefined,
): string | null {
  return value ? value : null;
}

/**
 * Pick the 400 body the contract names for a rejected notebook payload.
 *
 * §6.2/§6.3 list three distinct strings for what zod collapses into a single
 * parse failure, so the raw decoded body decides which applies. The order
 * mirrors Go's: decode, then the handler's dueDate parse, then the store's
 * entry-type check.
 *
 * Note `invalid entry_type` is snake_case in the contract — it came from
 * `err.Error()` on a store-level error, not from the handler — and is
 * reproduced verbatim rather than tidied.
 *
 * Anything else (the B7 length caps this port adds, which Go did not have)
 * falls back to `invalid body`; the contract names no string for it.
 */
export function notebookErrorFor(raw: unknown): string {
  const value = raw as Record<string, unknown> | null;
  if (typeof value !== "object" || value === null) return "invalid body";

  const { entryType, dueDate } = value;

  // A non-string, non-null dueDate would have failed Go's JSON decode into
  // *string, which is the "invalid body" branch, not the parse branch.
  if (dueDate !== undefined && dueDate !== null && typeof dueDate !== "string") {
    return "invalid body";
  }
  if (typeof dueDate === "string" && dueDate !== "" && !isRealDate(dueDate)) {
    return "dueDate must be YYYY-MM-DD";
  }
  if (typeof entryType !== "string") return "invalid body";

  return "invalid entry_type";
}
