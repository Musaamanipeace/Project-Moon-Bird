import { z } from "zod";

import { isRealDate } from "@/lib/dates";
import { NOTEBOOK_ENTRY_TYPES } from "@/lib/serializers/notebook";

// Every schema is .strict(): the Go backend used decoder.DisallowUnknownFields,
// so an unknown request key is a 400, not a silently ignored field
// (docs/API_CONTRACTS.md §1.3). Dropping .strict() would let a typo'd or
// injected key through unnoticed.

export const signupSchema = z
  .object({
    email: z.string().max(254).email(),
    // Six, not eight: §4.3's 400 body is the fixed string "email and password
    // (min 6 chars) are required", and src/pages/Login.tsx gates on the same
    // number. Enforcing a higher floor here would reject passwords the client
    // accepted, with a message stating a limit we do not apply.
    // TODO(operator): to raise the floor, raise it in all three places —
    // Supabase Auth's minimum password length, this schema, and the client.
    password: z.string().min(6).max(128),
    displayName: z.string().max(128).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().max(254).email(),
    password: z.string().max(128),
  })
  .strict();

export const requestOtpSchema = z
  .object({
    email: z.string().max(254).email(),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: z.string().max(254).email(),
    code: z.string().length(6),
  })
  .strict();

export const settingsSchema = z
  .object({
    notificationsEnabled: z.boolean().optional(),
    preferredMethod: z.enum(["otp", "password"]).optional(),
  })
  .strict();

/** Serialized-size cap for free-form challenge payloads, in bytes. */
const CHALLENGE_DATA_MAX_BYTES = 10_000;

/**
 * Body of `PUT /api/challenges/{slug}` (docs/API_CONTRACTS.md §5.3).
 *
 * Go's struct was `{ Data map[string]interface{}; Completed bool }`, so both
 * keys are effectively optional on the wire: a missing `data` decodes to nil
 * (normalised to `{}`) and a missing `completed` decodes to false.
 *
 * There is deliberately no `logDate` key — the log date is server-assigned from
 * UTC now, so a client cannot backdate a completion to repair a broken streak.
 *
 * Audit finding A2 — the server never checked `data` against the challenge's
 * completion step — is only PARTIALLY closed here. The size and shape caps
 * below are enforced; semantic validation is not, because the per-challenge
 * completion-step copy does not survive in repo history (see seed.sql) and
 * inventing acceptance criteria would be worse than none.
 * TODO(operator): once the original completion steps are restored, add a
 * per-challenge validator keyed on `challenges.slug` and reject payloads that
 * do not satisfy it.
 */
export const challengeProgressSchema = z
  .object({
    // z.record() has no .max() — the cap is on the serialized size, which is
    // what actually bounds the jsonb column we store.
    data: z
      .record(z.unknown())
      .refine(
        (value) => JSON.stringify(value).length <= CHALLENGE_DATA_MAX_BYTES,
        {
          message: `data must serialize to at most ${CHALLENGE_DATA_MAX_BYTES} bytes`,
        },
      )
      .nullish(),
    completed: z.boolean().optional(),
  })
  .strict();

/**
 * Date-only "YYYY-MM-DD", the strict `time.Parse("2006-01-02", ...)` Go used.
 *
 * `isRealDate` rather than an inline refinement: an inline
 * `new Date(v).toISOString()` throws a RangeError on "2026-13-01" instead of
 * returning false, and a throwing refinement escapes zod as a 500 rather than
 * the 400 this is here to produce.
 */
const dateOnly = z.string().refine(isRealDate, {
  message: "must be a real calendar date",
});

/**
 * Notebook create/update body (docs/API_CONTRACTS.md §6.2, §6.3).
 *
 * `dueDate` accepts null and "" as "no due date", matching Go, which treated a
 * nil *string and an empty string identically. Both normalise to SQL NULL.
 *
 * Length caps close audit finding B7 — Go accepted multi-megabyte journal
 * bodies with only a TrimSpace, which is a cheap storage-abuse vector.
 */
export const notebookEntrySchema = z
  .object({
    entryType: z.enum(NOTEBOOK_ENTRY_TYPES),
    title: z.string().max(200),
    body: z.string().max(50_000),
    dueDate: z.union([dateOnly, z.literal("")]).nullish(),
  })
  .strict();

/**
 * Community event submission (docs/API_CONTRACTS.md §7.2).
 *
 * Only these six fields are accepted. `tier`, `approved`, and `authorId` are
 * server-forced ('community', false, the caller) and are deliberately absent —
 * a client that could set them would self-approve its own event onto the public
 * calendar.
 */
export const eventInputSchema = z
  .object({
    title: z.string().max(200),
    eventDate: dateOnly,
    rarity: z.string().max(50).optional(),
    synopsis: z.string().max(5_000).optional(),
    category: z.string().max(100).optional(),
    source: z.string().max(200).optional(),
  })
  .strict();

/**
 * Valid `user_assets.kind` values — the CHECK in 0004_portfolio.sql:34 and the
 * list at §8.3 (store.go:1306). Exported because the route maps a failure on
 * this field to its own 400 body ("invalid asset kind", not "invalid body").
 */
export const ASSET_KINDS = [
  "car",
  "bicycle",
  "pets",
  "jewelry",
  "clothing",
] as const;

/**
 * One node of the §8.3 `fields` tree.
 *
 * Recursive, so it needs z.lazy plus an explicit type annotation — TypeScript
 * cannot infer the type of a value that refers to itself. `children` is what
 * the nesting is rebuilt from; ids are never accepted from the client (§8.3),
 * which .strict() enforces for free: a client that echoes back a `id` from a
 * previous GET gets a 400 rather than a silently ignored key.
 *
 * The defaults here are the three §8.3 server-side defaults. `fieldType` is
 * additionally pinned to the 0004_portfolio.sql:26 CHECK set — Go accepted any
 * string and let Postgres raise a constraint violation the contract names no
 * body for, which would surface as an opaque 500.
 */
export type ProfileFieldInput = {
  title: string;
  valueText: string;
  valueInt: number | null;
  valueJson: unknown;
  fieldType: "text" | "integer" | "multi" | "nested";
  sortOrder: number;
  children: ProfileFieldInput[];
};

export const profileFieldInputSchema: z.ZodType<ProfileFieldInput> = z.lazy(() =>
  z
    .object({
      title: z.string().max(200),
      valueText: z.string().max(10000).default(""),
      valueInt: z.number().int().nullable().default(null),
      valueJson: z.unknown().default([]),
      fieldType: z
        .enum(["text", "integer", "multi", "nested"])
        .default("text"),
      sortOrder: z.number().int().default(0),
      children: z.array(profileFieldInputSchema).max(200).default([]),
    })
    .strict(),
);

/**
 * §8.3 request body. Every collection is optional and defaults to `[]` because
 * Go normalised a nil slice to empty — and since each Upsert* starts with a
 * DELETE, **omitting a key deletes that collection**. That is the specified
 * behaviour, not an oversight; a partial save is not expressible here.
 */
export const portfolioInputSchema = z
  .object({
    fields: z.array(profileFieldInputSchema).max(500).default([]),
    assets: z
      .array(
        z
          .object({
            kind: z.enum(ASSET_KINDS),
            title: z.string().max(200),
            detail: z.unknown().default({}),
            sortOrder: z.number().int().default(0),
          })
          .strict(),
      )
      .max(500)
      .default([]),
    favorites: z
      .array(
        z
          .object({
            kind: z.string().max(100),
            label: z.string().max(200),
            value: z.string().max(2000).default(""),
            sortOrder: z.number().int().default(0),
          })
          .strict(),
      )
      .max(500)
      .default([]),
    links: z
      .array(
        z
          .object({
            url: z.string().max(2000).url(),
            label: z.string().max(200).default(""),
            isLinktree: z.boolean().default(false),
            sortOrder: z.number().int().default(0),
          })
          .strict(),
      )
      .max(500)
      .default([]),
  })
  .strict();

export const adCampaignInputSchema = z
  .object({
    format: z.enum(["video", "picture", "paid_challenge", "survey"]),
    title: z.string().max(200),
    payloadUrl: z.string().max(2000).url(),
    rewardPerAction: z.number().nonnegative().finite(),
    rewardCurrency: z.string().max(10),
    targetCategories: z.array(z.string().max(100)).max(50),
    nsfw: z.boolean(),
    status: z.string().max(50),
  })
  .strict();

export const surveyInputSchema = z
  .object({
    campaignId: z.string().uuid(),
    questions: z.array(z.unknown()).max(200),
    minPayout: z.number().nonnegative().finite(),
  })
  .strict();

/**
 * Payout destination for the PayPal rail. Replaces the previous
 * { chain, address } crypto wallet shape — payouts are fiat (USD) to a PayPal
 * email, matching public.payout_accounts (provider CHECK 'paypal').
 */
export const payoutAccountInputSchema = z
  .object({
    paypalEmail: z.string().max(254).email(),
  })
  .strict();

export const messageBodySchema = z
  .object({
    body: z.string().max(10000),
  })
  .strict();
