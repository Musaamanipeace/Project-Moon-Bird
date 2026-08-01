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
