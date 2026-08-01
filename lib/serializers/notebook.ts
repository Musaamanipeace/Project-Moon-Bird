import { toRFC3339 } from "./time";

/**
 * Valid notebook entry types (docs/API_CONTRACTS.md §6, store.go:509), mirrored
 * by the CHECK constraint on public.notebook_entries.entry_type (0003_core.sql).
 */
export const NOTEBOOK_ENTRY_TYPES = [
  "journal",
  "dream",
  "logbook",
  "goal",
  "schedule",
  "idea",
] as const;

export type NotebookEntryType = (typeof NOTEBOOK_ENTRY_TYPES)[number];

/**
 * notebookPublic (docs/API_CONTRACTS.md §6.5).
 *
 * Keys alphabetical: body, createdAt, dueDate, entryType, id, title, updatedAt.
 *
 * Two date formats in one object, deliberately:
 *  - `dueDate` is date-only "YYYY-MM-DD" or null. It comes from a `date` column
 *    and is passed through verbatim; parsing and reformatting would shift the
 *    day for any server west of UTC.
 *  - `createdAt`/`updatedAt` are RFC3339 at second precision.
 *
 * `user_id` is on the row but is never serialized.
 */
export function notebookPublic(e: {
  id: string;
  entry_type: string;
  title: string;
  body: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    body: e.body,
    createdAt: toRFC3339(e.created_at),
    dueDate: e.due_date,
    entryType: e.entry_type,
    id: e.id,
    title: e.title,
    updatedAt: toRFC3339(e.updated_at),
  };
}
