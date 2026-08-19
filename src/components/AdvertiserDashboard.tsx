import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Sparkles,
  Play,
  X,
  MessageSquare,
  Plus,
  Eye,
  Award,
  Tag,
  Leaf,
  Brain,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Ad {
  id: string;
  brandName: string;
  creatorName: string;
  category: "sponsored" | "free_user";
  adType: "tv_commercial" | "review" | "banner";
  title: string;
  description: string;
  mediaUrl: string;
  redirectUrl: string;
  budget?: number;
  spent?: number;
  views: number;
  clicks: number;
  likes: number;
  shares: number;
  commentsCount: number;
  comments?: Array<{ author: string; text: string; time: string }>;
  status: "active" | "paused" | "pending_payment";
  rewardAmount: number;
}

export const DEFAULT_ADS: Ad[] = [
  {
    id: "ad-sponsored-1",
    brandName: "AstroVibe Espresso",
    creatorName: "AstroVibe Corp",
    category: "sponsored",
    adType: "tv_commercial",
    title: "Celestial Grind: 100% Organic Andromeda Coffee Beans",
    description:
      "Launch your daily morning focus loops with our micro-roasted comet-cultivated coffee beans. High-altitude cosmic espresso shipped instantly with 100% zero-g freshness and zero telemetry tracking.",
    mediaUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/astrovibe",
    budget: 600,
    spent: 125,
    views: 12500,
    clicks: 640,
    likes: 420,
    shares: 115,
    commentsCount: 28,
    comments: [],
    status: "active",
    rewardAmount: 25,
  },
  {
    id: "ad-free-1",
    brandName: "Orion Matcha Tea",
    creatorName: "@ZenCosmonaut",
    category: "free_user",
    adType: "review",
    title: "Matcha Grown in a Lunar Greenhouse - Upfront Creator Review",
    description:
      "This is an upfront sponsored post / review by brand representative @ZenCosmonaut. Tasting our very first batch of organic green tea grown entirely under pressurized dome greenhouses on the Moon.",
    mediaUrl:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/orion-matcha",
    views: 18400,
    clicks: 812,
    likes: 1205,
    shares: 341,
    commentsCount: 76,
    comments: [],
    status: "active",
    rewardAmount: 0,
  },
];

interface AdvertiserDashboardProps {
  xp: number;
  onAddXp: (amount: number) => void;
  nickname: string;
  onNavigateToView?: (view: string) => void;
  onShareFeed?: (entry: { kind: any; title?: string; body?: string; refId?: string; refType?: string }) => void;
}

type MediaType = "Banner" | "GIF" | "Short Video";

interface WatchCampaign {
  id: string;
  brand: string;
  title: string;
  description: string;
  mediaType: MediaType;
  tags: string[];
  interests: string[];
  emoji: string;
  mediaUrl?: string;
}

function normalizeMediaType(value: unknown): MediaType {
  if (value === "banner") return "Banner";
  if (value === "gif") return "GIF";
  if (value === "short_video") return "Short Video";
  return "Banner";
}

const PREF_OPTIONS = ["sustainability", "health", "nature", "education"] as const;
type PrefOption = (typeof PREF_OPTIONS)[number];

const REACTION_EMOJIS = ["👍", "❤️", "🔥", "🌱", "💡"];

const REWARD_PER_VIEW = 5;

// -------------------------------------------
// Inline SVG creatives (zero-dependency media)
// -------------------------------------------
// Kept byte-identical to the helper in adIngestion.ts, so an ad served by
// /api/ads/curated and its offline counterpart below render the same creative.
// A data URI needs no network, no file on disk and no /ads/* static route, and
// works in both <img src> and CSS background-image: url(...).
const CATEGORY_TINTS: Record<string, string> = {
  environment: "#1a3a2a",   // green
  public_health: "#0f3b3b", // teal
  nature: "#3a3a1a",        // olive
  awareness: "#1f1f4a",     // indigo
};

function svgAdCreative(title: string, category: string): string {
  const fill = CATEGORY_TINTS[category] || CATEGORY_TINTS.awareness;
  const label = String(title || "Public Awareness").replace(/[<>&"']/g, " ").trim();
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='315'>" +
    "<rect width='100%' height='100%' fill='" + fill + "'/>" +
    "<text x='50%' y='50%' fill='#afeeee' font-family='monospace' font-size='28' " +
    "text-anchor='middle' dominant-baseline='middle'>" + label + "</text>" +
    "</svg>";
  return "data:image/svg+xml," + svg.replace(/%/g, "%25").replace(/#/g, "%23").replace(/ /g, "%20");
}

// Ingestion categories -> the brand interests a user can opt into (PREF_OPTIONS),
// so preference filtering keeps working for both curated and fallback ads.
const CATEGORY_INTERESTS: Record<string, PrefOption[]> = {
  environment: ["sustainability", "nature"],
  public_health: ["health"],
  nature: ["nature"],
  awareness: ["sustainability", "education"],
  climate: ["sustainability"],
  education: ["education"],
  health: ["health"],
};

function interestsForCategory(category: unknown): string[] {
  const mapped = new Set<string>();
  String(category ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .forEach((key) => (CATEGORY_INTERESTS[key] || []).forEach((i) => mapped.add(i)));
  if (mapped.size === 0) return ["sustainability", "education"];
  return Array.from(mapped);
}

// Real curated campaigns, mirroring SEED_ADS in adIngestion.ts. Used whenever
// the curated API is unreachable or returns nothing, so the Watch shelf still
// shows actual embedded ad creatives (never an empty or emoji-only card).
const FALLBACK_ADS: WatchCampaign[] = [
  {
    id: "seed-env-1",
    brand: "Clean Water Alliance",
    title: "Protect Our Rivers",
    description: "Every drop counts — keep our rivers flowing clean.",
    mediaType: "Banner",
    tags: ["environment", "water", "sustainability", "awareness"],
    interests: interestsForCategory("environment"),
    emoji: "💧",
    mediaUrl: svgAdCreative("Protect Our Rivers", "environment"),
  },
  {
    id: "seed-env-2",
    brand: "Global Reforestation Fund",
    title: "Plant a Tree Today",
    description: "One tree at a time, we cool the planet.",
    mediaType: "GIF",
    tags: ["environment", "climate", "nature", "awareness"],
    interests: interestsForCategory("environment"),
    emoji: "🌳",
    mediaUrl: svgAdCreative("Plant a Tree Today", "environment"),
  },
  {
    id: "seed-health-1",
    brand: "Public Health Now",
    title: "Breathe Easy",
    description: "Clean air is a human right. Mask up when air quality drops.",
    mediaType: "Short Video",
    tags: ["public_health", "air_quality", "awareness"],
    interests: interestsForCategory("public_health"),
    emoji: "🫁",
    mediaUrl: svgAdCreative("Breathe Easy", "public_health"),
  },
  {
    id: "seed-health-2",
    brand: "Healthy Communities",
    title: "Walk for Your Heart",
    description: "Thirty minutes of movement a day keeps the doctor away.",
    mediaType: "Banner",
    tags: ["public_health", "wellbeing", "awareness"],
    interests: interestsForCategory("public_health"),
    emoji: "🚶",
    mediaUrl: svgAdCreative("Walk for Your Heart", "public_health"),
  },
  {
    id: "seed-nature-1",
    brand: "Nature Conservation Trust",
    title: "Guard the Wild",
    description: "Protect habitats before they go silent.",
    mediaType: "GIF",
    tags: ["nature", "conservation", "wildlife", "awareness"],
    interests: interestsForCategory("nature"),
    emoji: "🦌",
    mediaUrl: svgAdCreative("Guard the Wild", "nature"),
  },
  {
    id: "seed-awareness-1",
    brand: "Blue Planet Initiative",
    title: "Be Ocean Wise",
    description: "Reduce plastics — our oceans are not a landfill.",
    mediaType: "Short Video",
    tags: ["awareness", "ocean", "environment", "nature"],
    interests: interestsForCategory("awareness"),
    emoji: "🌊",
    mediaUrl: svgAdCreative("Be Ocean Wise", "awareness"),
  },
];

// Legacy emoji-only mock shelf. No longer the curated Watch source (FALLBACK_ADS
// is), kept only as reference copy for uploaded/demo campaign placeholders.
const WATCH_CAMPAIGNS: WatchCampaign[] = [
  {
    id: "wc-reforest",
    brand: "Global Reforest Fund",
    title: "Reforest the Skies — One Canopy at a Time",
    description:
      "A public-awareness banner highlighting community tree-planting drives restoring degraded watersheds worldwide.",
    mediaType: "Banner",
    tags: ["environment", "climate"],
    interests: ["sustainability", "nature"],
    emoji: "🌳",
  },
  {
    id: "wc-mental",
    brand: "Mindful Horizons",
    title: "Mental Health Matters — You Are Not Alone",
    description:
      "An animated public-service loop reminding viewers to take mindful pauses and reach out for support.",
    mediaType: "GIF",
    tags: ["wellbeing", "awareness"],
    interests: ["health", "education"],
    emoji: "🧠",
  },
  {
    id: "wc-oceans",
    brand: "Blue Planet Coalition",
    title: "Clean Oceans Initiative — Short Film",
    description:
      "A high-end short video documenting volunteer shoreline cleanups and plastic-free pledges.",
    mediaType: "Short Video",
    tags: ["oceans", "wildlife"],
    interests: ["nature", "sustainability"],
    emoji: "🌊",
  },
  {
    id: "wc-library",
    brand: "Open Shelf Project",
    title: "Free Public Library Access for Every Child",
    description:
      "A bordered banner campaign promoting equitable access to community learning spaces.",
    mediaType: "Banner",
    tags: ["education", "equity"],
    interests: ["education"],
    emoji: "📚",
  },
  {
    id: "wc-energy",
    brand: "SunBridge Renewables",
    title: "Renewable Energy Now — Looping Visual",
    description:
      "An animated GIF showcasing rooftop solar adoption reducing neighborhood emissions.",
    mediaType: "GIF",
    tags: ["energy", "climate"],
    interests: ["sustainability", "health"],
    emoji: "☀️",
  },
  {
    id: "wc-garden",
    brand: "Urban Roots",
    title: "Urban Garden Project — Mini Documentary",
    description:
      "A short high-end video tour of city balcony gardens feeding local food banks.",
    mediaType: "Short Video",
    tags: ["food", "community"],
    interests: ["nature", "education"],
    emoji: "🌱",
  },
  {
    id: "wc-wildlife",
    brand: "Wildlife Guardians",
    title: "Protect Pollinators — Public Notice",
    description:
      "A bordered banner raising awareness about declining bee populations and how to help.",
    mediaType: "Banner",
    tags: ["wildlife", "nature"],
    interests: ["nature"],
    emoji: "🐝",
  },
  {
    id: "wc-climate",
    brand: "Climate Literacy Now",
    title: "Climate Literacy for All — Animated Loop",
    description:
      "An animated GIF breaking down the basics of a changing climate in 15 seconds.",
    mediaType: "GIF",
    tags: ["education", "climate"],
    interests: ["education", "sustainability"],
    emoji: "🌍",
  },
];

interface CampaignComment {
  author: string;
  text: string;
  time: string;
}

interface CampaignReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface UploadedCampaign {
  id: string;
  title: string;
  brand: string;
  tagline: string;
  mediaType: MediaType;
  categoryTags: string[];
  mediaUrl?: string;
  owner: string;
  createdAt: string;
  boost: number;
  comments: CampaignComment[];
  reactions: CampaignReaction[];
}

const DOOMSCROLL_LIMIT = 8;

function loadCampaigns(): UploadedCampaign[] {
  const saved = localStorage.getItem("moonrise_all_ads");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as UploadedCampaign[]) : [];
  } catch {
    return [];
  }
}

function blankReactions(): CampaignReaction[] {
  return REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0, users: [] }));
}

export default function AdvertiserDashboard({
  xp,
  onAddXp,
  nickname,
  onNavigateToView,
  onShareFeed,
}: AdvertiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<"watch" | "advertise">("watch");

  const [prefs, setPrefs] = useState<PrefOption[]>(() => {
    const saved = localStorage.getItem("mb_ad_prefs");
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return arr as PrefOption[];
      } catch {
        /* ignore */
      }
    }
    return [];
  });
  const [showPrefs, setShowPrefs] = useState<boolean>(prefs.length === 0);

  const togglePref = (p: PrefOption) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const savePrefs = () => {
    localStorage.setItem("mb_ad_prefs", JSON.stringify(prefs));
    setShowPrefs(false);
  };

  const [watchCount, setWatchCount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [curatedAds, setCuratedAds] = useState<WatchCampaign[] | null>(null);

  const resetWatchCount = () => setWatchCount(0);

  useEffect(() => {
    if (activeTab === "watch") return;
    resetWatchCount();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "watch") return;
    let cancelled = false;
    fetch("/api/ads/curated")
      .then((res) => {
        if (!res.ok) throw new Error("curated feed unavailable");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setCuratedAds(
            (data as Array<Record<string, any>>).map((ad) => ({
              id: String(ad.id ?? crypto.randomUUID()),
              brand: ad.brand ?? "",
              title: ad.title ?? "",
              description: ad.tagline ?? "",
              mediaType: normalizeMediaType(ad.mediaType),
              tags: Array.isArray(ad.brandTags) ? ad.brandTags.map(String) : [],
              interests: interestsForCategory(ad.category),
              emoji: "🌐",
              mediaUrl: ad.localMediaUrl || ad.sourceUrl || undefined,
            }))
          );
        } else {
          setCuratedAds(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCuratedAds(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Curated ads when the API answers; real embedded creatives when it does not.
  const sourceCampaigns = curatedAds ?? FALLBACK_ADS;

  const visibleCampaigns =
    prefs.length === 0
      ? sourceCampaigns
      : sourceCampaigns.filter((c) => c.interests.some((i) => prefs.includes(i as PrefOption)));

  const handleWatch = (campaign: WatchCampaign) => {
    onAddXp(REWARD_PER_VIEW);
    setWatchedIds((prev) => (prev.includes(campaign.id) ? prev : [...prev, campaign.id]));
    const next = watchCount + 1;
    setWatchCount(next);
    if (next >= DOOMSCROLL_LIMIT) {
      setShowWarning(true);
      resetWatchCount();
    }
  };

  const [campaigns, setCampaigns] = useState<UploadedCampaign[]>(loadCampaigns);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [tagline, setTagline] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("Banner");
  const [categoryTags, setCategoryTags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  const [commentInputs, setCommentInputs] = useState<{ [id: string]: string }>({});
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  useEffect(() => {
    localStorage.setItem("moonrise_all_ads", JSON.stringify(campaigns));
  }, [campaigns]);

  const showToast = (text: string) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: "" }), 3500);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !brand.trim() || !tagline.trim()) {
      alert("Please provide a title, brand, and tagline.");
      return;
    }
    const newCampaign: UploadedCampaign = {
      id: `camp-${Date.now()}`,
      title: title.trim(),
      brand: brand.trim(),
      tagline: tagline.trim(),
      mediaType,
      categoryTags: categoryTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      mediaUrl: mediaUrl.trim() || undefined,
      owner: nickname || "CosmicPilot",
      createdAt: new Date().toISOString(),
      boost: 0,
      comments: [],
      reactions: blankReactions(),
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    onShareFeed?.({
      kind: "ad_share",
      title: newCampaign.title,
      body: newCampaign.tagline,
      refId: newCampaign.id,
      refType: "ad",
    });

    setTitle("");
    setBrand("");
    setTagline("");
    setMediaType("Banner");
    setCategoryTags("");
    setMediaUrl("");
    showToast("🚀 Campaign published! It now appears in the feeds.");
  };

  const updateCampaign = (id: string, updater: (c: UploadedCampaign) => UploadedCampaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const handleAddComment = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const text = commentInputs[id]?.trim();
    if (!text) return;
    updateCampaign(id, (c) => ({
      ...c,
      comments: [{ author: nickname || "CosmicPilot", text, time: "Just now" }, ...c.comments],
    }));
    setCommentInputs((prev) => ({ ...prev, [id]: "" }));
  };

  const toggleReaction = (id: string, emoji: string) => {
    const user = nickname || "CosmicPilot";
    updateCampaign(id, (c) => ({
      ...c,
      reactions: c.reactions.map((r) => {
        if (r.emoji !== emoji) return r;
        const has = r.users.includes(user);
        return {
          ...r,
          count: has ? r.count - 1 : r.count + 1,
          users: has ? r.users.filter((u) => u !== user) : [...r.users, user],
        };
      }),
    }));
  };

  const handleBoost = (id: string) => {
    updateCampaign(id, (c) => ({ ...c, boost: c.boost + 1 }));
    showToast("✨ Campaign boosted with 5 Cheese for extra visibility!");
  };

  const myCampaigns = campaigns.filter((c) => c.owner === (nickname || "CosmicPilot"));

  // The real creative is layered over the emoji placeholder. If a remote URL
  // ever fails to load we hide the image and the original per-media-type
  // placeholder shows through, so a card is never blank.
  const renderCreative = (campaign: WatchCampaign, fit: "cover" | "contain") =>
    campaign.mediaUrl ? (
      <img
        src={campaign.mediaUrl}
        alt={campaign.title}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className={`absolute inset-0 w-full h-full ${
          fit === "cover" ? "object-cover" : "object-contain"
        }`}
      />
    ) : null;

  const renderMedia = (campaign: WatchCampaign, onPlay?: () => void) => {
    if (campaign.mediaType === "Banner") {
      return (
        <div className="relative aspect-[3/1] rounded-xl overflow-hidden border border-slate-800 mb-3 bg-gradient-to-r from-turquoise-900/40 via-slate-800/40 to-slate-900/40 flex items-center justify-center">
          <span className="text-3xl">{campaign.emoji}</span>
          {renderCreative(campaign, "cover")}
          <span className="absolute bottom-2 left-2 text-[8px] font-mono font-bold bg-slate-900/90 text-turquoise px-1.5 py-0.5 rounded uppercase border border-turquoise-500/10">
            🖼️ Banner
          </span>
        </div>
      );
    }
    if (campaign.mediaType === "GIF") {
      return (
        <button
          type="button"
          onClick={onPlay}
          className={`relative aspect-square rounded-xl overflow-hidden border border-slate-800 mb-3 bg-gradient-to-br from-turquoise-800/30 to-slate-900/50 flex items-center justify-center ${
            campaign.mediaUrl ? "" : "animate-pulse"
          }`}
        >
          <span className="text-4xl">{campaign.emoji}</span>
          {renderCreative(campaign, "contain")}
          <span className="absolute bottom-2 left-2 text-[8px] font-mono font-bold bg-slate-900/90 text-turquoise px-1.5 py-0.5 rounded uppercase border border-slate-800 border-turquoise-500/10">
            🎞️ GIF
          </span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onPlay}
        className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 mb-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 flex items-center justify-center group"
      >
        <span className="text-3xl opacity-70 group-hover:opacity-100 transition-opacity">{campaign.emoji}</span>
        {renderCreative(campaign, "cover")}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="p-3 rounded-full bg-turquoise-400 text-slate-950 shadow-lg">
            <Play className="w-5 h-5 fill-current" />
          </span>
        </span>
        <span className="absolute bottom-2 left-2 text-[8px] font-mono font-bold bg-slate-900/90 text-turquoise px-1.5 py-0.5 rounded uppercase border border-turquoise-500/10">
          ▶ Short Video
        </span>
      </button>
    );
  };

  return (
    <div
      className="space-y-8 p-4 max-w-6xl mx-auto text-slate-200 pb-24"
      style={{ background: "linear-gradient(160deg, #2a2e33, #1a1d22 60%, #101216)" }}
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-turquoise-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <span className="text-xs font-bold font-mono text-turquoise bg-turquoise-400/10 px-2.5 py-0.5 rounded-full border border-turquoise-400/20 uppercase tracking-widest flex items-center gap-1 w-fit">
              <Megaphone className="w-3 h-3 text-turquoise" />
              <span>Watch Ads &amp; Advertise</span>
            </span>
            <h2 className="text-2xl font-bold font-mono tracking-tight text-white">
              Cloudy Sky Ad Ecosystem
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Curated, nature-conscious and public-awareness campaigns. Watch to earn Cheese, or
              advertise your own campaign and track its engagement.
            </p>
          </div>

          <div className="bg-[#0b0c14] border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner min-w-[200px]">
            <div className="p-2.5 rounded-lg bg-turquoise-500/10 border border-turquoise-500/20">
              <Award className="w-5 h-5 text-turquoise" />
            </div>
            <div className="font-mono space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block">Cheese Balance</span>
              <span className="text-xs font-bold text-slate-300 block">{nickname || "Cosmic Traveler"}</span>
              <span className="text-xs font-black text-turquoise flex items-center gap-1">
                {xp} <span className="text-[10px] text-slate-500 font-bold">Cheese</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab("watch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeTab === "watch"
                ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4 text-turquoise" />
            <span>Watch Ads</span>
          </button>
          <button
            onClick={() => setActiveTab("advertise")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeTab === "advertise"
                ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Megaphone className="w-4 h-4 text-turquoise" />
            <span>Advertise</span>
          </button>
        </div>
      </div>

      {activeTab === "watch" && (
        <div className="space-y-6">
          {showPrefs ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-turquoise" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-turquoise">
                  Tailor your campaigns
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Pick the brand interests you care about so we can surface the most relevant
                nature-conscious and public-awareness campaigns for you.
              </p>
              <div className="flex flex-wrap gap-2">
                {PREF_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePref(p)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold capitalize border transition-all ${
                      prefs.includes(p)
                        ? "bg-turquoise-500/20 border-turquoise-400/40 text-turquoise"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={savePrefs}
                className="px-4 py-2 rounded-xl bg-turquoise-400 hover:bg-turquoise-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all"
              >
                Save Preferences
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md px-5 py-3">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <Leaf className="w-4 h-4 text-turquoise" />
                <span>
                  Curating for:{" "}
                  {prefs.map((p) => (
                    <span key={p} className="text-turquoise capitalize">{p} </span>
                  ))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrefs(true)}
                className="text-[10px] font-mono text-turquoise hover:underline"
              >
                Change preferences
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleCampaigns.map((c) => {
              const watched = watchedIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 flex flex-col justify-between h-full"
                >
                  <div>
                    {renderMedia(c, () => handleWatch(c))}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-turquoise uppercase font-black tracking-wider block">
                        {c.brand}
                      </span>
                      <h4 className="text-xs font-bold font-mono text-slate-100 leading-snug">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{c.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[8px] font-mono uppercase bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700"
                          >
                            <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleWatch(c)}
                    className={`mt-4 w-full py-2 rounded-xl font-black font-mono text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      watched
                        ? "bg-slate-800 border border-slate-700 text-slate-300"
                        : "bg-turquoise-400 hover:bg-turquoise-300 text-slate-950 shadow-md"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{watched ? "Watched ✓" : `Watch & Earn +${REWARD_PER_VIEW} Cheese`}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {visibleCampaigns.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 text-center text-xs font-mono text-slate-400">
              No campaigns match your current preferences.{" "}
              <button onClick={() => setShowPrefs(true)} className="text-turquoise hover:underline">
                Adjust them here
              </button>
              .
            </div>
          )}
        </div>
      )}

      {activeTab === "advertise" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 space-y-5">
            <div className="border-b border-slate-800/80 pb-4">
              <h3 className="text-md font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-turquoise" />
                <span>Upload Campaign</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Publish a campaign and track its engagement, comments, and emoji reactions.
              </p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Brand</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Reforest the Skies"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-turquoise-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Media Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Banner", "GIF", "Short Video"] as MediaType[]).map((mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => setMediaType(mt)}
                        className={`px-2 py-2 rounded-xl border text-[10px] font-mono font-bold transition-all ${
                          mediaType === mt
                            ? "border-turquoise-400/50 bg-turquoise-500/10 text-turquoise"
                            : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {mt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy campaign headline"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-turquoise-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Tagline</label>
                <textarea
                  required
                  rows={2}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Short public-awareness message"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-turquoise-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Category Tags (comma separated)</label>
                  <input
                    type="text"
                    value={categoryTags}
                    onChange={(e) => setCategoryTags(e.target.value)}
                    placeholder="nature, climate"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-turquoise-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Media URL (optional)</label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://... or leave blank"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-turquoise-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-turquoise-400 hover:bg-turquoise-300 text-slate-950 font-bold font-mono text-xs uppercase tracking-widest transition-all"
              >
                Publish Campaign
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
              <h3 className="text-xs font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-turquoise" />
                Your Campaigns
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Track comments and emoji reactions. Boost with Cheese for extra reach.
              </p>
            </div>

            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {myCampaigns.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5 text-center text-[11px] font-mono text-slate-400">
                  No campaigns yet. Publish one to start tracking engagement.
                </div>
              )}

              {myCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-turquoise-400/10 text-turquoise border border-turquoise-400/20 mr-1.5">
                        {c.mediaType}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{c.brand}</span>
                    </div>
                    {c.boost > 0 && (
                      <span className="text-[8px] font-mono text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase">
                        ⚡ Boost x{c.boost}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold font-mono text-slate-100 leading-snug">{c.title}</h4>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{c.tagline}</p>

                  <div className="flex flex-wrap gap-2">
                    {c.reactions.map((r) => {
                      const reacted = r.users.includes(nickname || "CosmicPilot");
                      return (
                        <button
                          key={r.emoji}
                          onClick={() => toggleReaction(c.id, r.emoji)}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-all ${
                            reacted
                              ? "border-turquoise-400/50 bg-turquoise-500/10 text-turquoise"
                              : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {c.comments.length} comments
                    </span>
                    <button
                      onClick={() => handleBoost(c.id)}
                      className="px-2.5 py-1 rounded-lg bg-turquoise-400 hover:bg-turquoise-300 text-slate-950 font-bold uppercase tracking-wider transition-all"
                    >
                      Boost (5 🧀)
                    </button>
                  </div>

                  <form onSubmit={(e) => handleAddComment(e, c.id)} className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInputs[c.id] || ""}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [c.id]: e.target.value })}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-mono font-bold"
                      >
                        Send
                      </button>
                    </div>
                    {c.comments.length > 0 && (
                      <div className="space-y-1 max-h-[90px] overflow-y-auto bg-slate-950/60 p-1.5 rounded border border-slate-900/80">
                        {c.comments.map((comm, idx) => (
                          <div key={idx} className="text-[9px] text-slate-400 leading-snug">
                            <span className="text-[8px] font-mono text-turquoise font-bold mr-1">{comm.author}:</span>
                            <span>{comm.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md rounded-2xl border border-turquoise-400/30 bg-[#0c1622] p-6 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-turquoise-400/15 flex items-center justify-center">
                <Brain className="w-6 h-6 text-turquoise" />
              </div>
              <h3 className="text-base font-bold font-mono text-turquoise">Take a breath</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                You've been scrolling through ads for a while. Maybe step away for a moment — your
                mental health matters more than any feed.
              </p>
              <button
                onClick={() => setShowWarning(false)}
                className="px-5 py-2.5 rounded-xl bg-turquoise-400 hover:bg-turquoise-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5 mx-auto"
              >
                <X className="w-4 h-4" />
                I'll take a break
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0c0e17] border border-turquoise-500/30 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className="p-1 rounded-full bg-turquoise-400/20">
              <Sparkles className="w-4 h-4 text-turquoise animate-pulse" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-100">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
