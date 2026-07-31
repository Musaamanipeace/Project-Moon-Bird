import { toRFC3339 } from "./time";

export function adCampaignResponse(p: {
  id: string;
  advertiser_id: string;
  format: string;
  title: string;
  payload_url: string;
  reward_per_action: string;
  reward_currency: string;
  target_categories: unknown[];
  nsfw: boolean;
  status: string;
  created_at: string;
}) {
  return {
    id: p.id,
    advertiserId: p.advertiser_id,
    format: p.format as "video" | "picture" | "paid_challenge" | "survey",
    title: p.title,
    payloadUrl: p.payload_url,
    rewardPerAction: Number(p.reward_per_action),
    rewardCurrency: p.reward_currency,
    targetCategories: p.target_categories as string[],
    nsfw: p.nsfw,
    status: p.status,
    createdAt: toRFC3339(p.created_at),
  };
}

export function adSurveyResponse(p: {
  id: string;
  campaign_id: string;
  questions: unknown[];
  min_payout: string;
}) {
  return {
    id: p.id,
    campaignId: p.campaign_id,
    questions: p.questions,
    minPayout: Number(p.min_payout),
  };
}