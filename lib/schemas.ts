import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().max(254).email(),
  password: z.string().min(8).max(128),
  displayName: z.string().max(128).optional(),
});

export const loginSchema = z.object({
  email: z.string().max(254).email(),
  password: z.string().max(128),
});

export const requestOtpSchema = z.object({
  email: z.string().max(254).email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().max(254).email(),
  code: z.string().length(6),
});

export const settingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  preferredMethod: z.enum(["otp", "password"]).optional(),
});

export const challengeSaveSchema = z.object({
  slug: z.string().max(120),
  data: z.record(z.unknown()).max(10000),
});

export const adCampaignInputSchema = z.object({
  format: z.enum(["video", "picture", "paid_challenge", "survey"]),
  title: z.string().max(200),
  payloadUrl: z.string().max(2000).url(),
  rewardPerAction: z.number().nonnegative().finite(),
  rewardCurrency: z.string().max(10),
  targetCategories: z.array(z.string().max(100)).max(50),
  nsfw: z.boolean(),
  status: z.string().max(50),
});

export const surveyInputSchema = z.object({
  campaignId: z.string().uuid(),
  questions: z.array(z.unknown()).max(200),
  minPayout: z.number().nonnegative().finite(),
});

export const walletInputSchema = z.object({
  chain: z.enum(["solana", "evm"]),
  address: z.string().max(446),
});

export const messageBodySchema = z.object({
  body: z.string().max(10000),
});