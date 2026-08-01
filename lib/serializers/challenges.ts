import { toRFC3339 } from "./time";

/**
 * challengePublic (docs/API_CONTRACTS.md §5.4).
 *
 * Keys alphabetical, matching Go's map serialization: description, icon, id,
 * moonPhase, prompt, slug, sortOrder, title.
 *
 * `scope` (Skills-Related | Self-Improvement-Wellbeing | Fun-Based) exists on
 * the row but is deliberately NOT emitted — the Go serializer predates the
 * column and types/api.ts:ChallengeDefinition has no field for it, so adding it
 * would change the wire shape the client is typed against. Add it here and to
 * ChallengeDefinition together when the UI needs to filter by scope.
 */
export function challengePublic(c: {
  id: string;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  moon_phase: string;
  icon: string;
  sort_order: number;
}) {
  return {
    description: c.description,
    icon: c.icon,
    id: c.id,
    moonPhase: c.moon_phase,
    prompt: c.prompt,
    slug: c.slug,
    sortOrder: c.sort_order,
    title: c.title,
  };
}

/**
 * The four values of the public.challenge_status ENUM (migration 0003, audit
 * finding B3). The Go backend had a plain `completed boolean`; the port
 * replaced it with a state machine guarded by a database trigger.
 */
export type ChallengeStatus =
  | "unfinished"
  | "finished"
  | "completed_unaudited"
  | "evolving";

/**
 * Collapse the status ENUM back onto §5.5's `completed` boolean.
 *
 * ONLY 'finished' is completed. In particular 'completed_unaudited' — a claim
 * the user has submitted but a peer auditor has not yet approved
 * (PROJECT_DOCUMENTATION.md:107-109) — serializes as `false`. Reporting it as
 * true would hand out the badge and the streak day before the audit runs, which
 * makes the audit phase decorative. 'evolving' is likewise in-progress.
 */
export function isCompleted(status: ChallengeStatus): boolean {
  return status === "finished";
}

/**
 * statePublic (docs/API_CONTRACTS.md §5.5).
 *
 * Keys alphabetical: challengeId, completed, data, logDate, slug, updatedAt.
 *
 * - `logDate` is emitted verbatim as the "YYYY-MM-DD" string Postgres returns
 *   for a `date` column — NOT parsed into a Date and re-formatted, which would
 *   shift it by a day for anyone west of UTC.
 * - `updatedAt` is RFC3339 at second precision.
 * - `data` is normalised to `{}`, never null.
 * - `completed_at` is on the row but is never serialized (§5.5).
 */
export function statePublic(
  log: {
    challenge_id: string;
    log_date: string;
    data: unknown;
    status: ChallengeStatus;
    updated_at: string;
  },
  slug: string,
) {
  return {
    challengeId: log.challenge_id,
    completed: isCompleted(log.status),
    data: normalizeData(log.data),
    logDate: log.log_date,
    slug,
    updatedAt: toRFC3339(log.updated_at),
  };
}

/**
 * jsonb columns come back as whatever was stored. The column defaults to '{}'
 * and is NOT NULL, but a row written before that default — or a payload that
 * was a JSON array or scalar — must still serialize as an object, because
 * types/api.ts types `data` as Record<string, unknown>.
 */
function normalizeData(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  return data as Record<string, unknown>;
}
