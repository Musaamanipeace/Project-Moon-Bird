import { z } from "zod";

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

export const challengeSaveSchema = z
  .object({
    slug: z.string().max(120),
    // z.record() has no .max() — the cap is on the serialized size, which is
    // what actually bounds the row we store.
    data: z.record(z.unknown()).refine(
      (value) => JSON.stringify(value).length <= CHALLENGE_DATA_MAX_BYTES,
      { message: `data must serialize to at most ${CHALLENGE_DATA_MAX_BYTES} bytes` },
    ),
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
