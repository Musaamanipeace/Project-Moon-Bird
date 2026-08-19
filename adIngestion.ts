import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";

// -------------------------------------------
// Automated Ad Ingestion & Pipeline (rebrand spec)
// Stages: 1) Ingestion & Retrieval, 2) Filtering & QC, 3) Persistence & Delivery
// All helpers are defensive and never throw to crash the server.
// -------------------------------------------

export interface IngestedAd {
  id: string;
  title: string;
  brand: string;
  tagline: string;
  mediaType: "banner" | "gif" | "short_video";
  category: string;
  brandTags: string[];
  sourceUrl: string;
  localMediaUrl: string;
  mimeType?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

// -------------------------------------------
// Inline SVG creatives (zero-dependency media)
// -------------------------------------------
// Seed creatives are embedded directly in the record as an inline SVG data URI.
// Nothing has to exist on disk and no /ads/* static route is required, so
// `GET /api/ads/curated` always returns media a browser can actually render.
//
// NOTE: keep `CATEGORY_TINTS` / `svgAdCreative` byte-identical to the copy in
// src/components/AdvertiserDashboard.tsx (used by FALLBACK_ADS) so the offline
// fallback and the API serve the exact same creative for the same ad.
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

// Pre-loaded static seed library — public-awareness / nature-conscious fallback.
// Used when external ingestion is down or returns empty brand queries.
export const SEED_ADS: IngestedAd[] = [
  {
    id: "seed-env-1",
    title: "Protect Our Rivers",
    brand: "Clean Water Alliance",
    tagline: "Every drop counts — keep our rivers flowing clean.",
    mediaType: "banner",
    category: "environment",
    brandTags: ["environment", "water", "sustainability", "awareness"],
    sourceUrl: svgAdCreative("Protect Our Rivers", "environment"),
    localMediaUrl: svgAdCreative("Protect Our Rivers", "environment"),
    mimeType: "image/svg+xml",
    width: 1200,
    height: 628,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "seed-env-2",
    title: "Plant a Tree Today",
    brand: "Global Reforestation Fund",
    tagline: "One tree at a time, we cool the planet.",
    mediaType: "gif",
    category: "environment",
    brandTags: ["environment", "climate", "nature", "awareness"],
    sourceUrl: svgAdCreative("Plant a Tree Today", "environment"),
    localMediaUrl: svgAdCreative("Plant a Tree Today", "environment"),
    mimeType: "image/svg+xml",
    width: 480,
    height: 480,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "seed-health-1",
    title: "Breathe Easy",
    brand: "Public Health Now",
    tagline: "Clean air is a human right. Mask up when air quality drops.",
    mediaType: "short_video",
    category: "public_health",
    brandTags: ["public_health", "air_quality", "awareness"],
    sourceUrl: svgAdCreative("Breathe Easy", "public_health"),
    localMediaUrl: svgAdCreative("Breathe Easy", "public_health"),
    mimeType: "image/svg+xml",
    durationSec: 15,
    fileSizeBytes: 3500000,
    width: 720,
    height: 1280,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "seed-health-2",
    title: "Walk for Your Heart",
    brand: "Healthy Communities",
    tagline: "Thirty minutes of movement a day keeps the doctor away.",
    mediaType: "banner",
    category: "public_health",
    brandTags: ["public_health", "wellbeing", "awareness"],
    sourceUrl: svgAdCreative("Walk for Your Heart", "public_health"),
    localMediaUrl: svgAdCreative("Walk for Your Heart", "public_health"),
    mimeType: "image/svg+xml",
    width: 1200,
    height: 628,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "seed-nature-1",
    title: "Guard the Wild",
    brand: "Nature Conservation Trust",
    tagline: "Protect habitats before they go silent.",
    mediaType: "gif",
    category: "nature",
    brandTags: ["nature", "conservation", "wildlife", "awareness"],
    sourceUrl: svgAdCreative("Guard the Wild", "nature"),
    localMediaUrl: svgAdCreative("Guard the Wild", "nature"),
    mimeType: "image/svg+xml",
    width: 600,
    height: 600,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "seed-awareness-1",
    title: "Be Ocean Wise",
    brand: "Blue Planet Initiative",
    tagline: "Reduce plastics — our oceans are not a landfill.",
    mediaType: "short_video",
    category: "awareness",
    brandTags: ["awareness", "ocean", "environment", "nature"],
    sourceUrl: svgAdCreative("Be Ocean Wise", "awareness"),
    localMediaUrl: svgAdCreative("Be Ocean Wise", "awareness"),
    mimeType: "image/svg+xml",
    durationSec: 20,
    fileSizeBytes: 6200000,
    width: 1080,
    height: 1080,
    createdAt: "2026-01-01T00:00:00Z"
  }
];

// -------------------------------------------
// Persistence helpers
// -------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADS_DIR = join(__dirname, "data", "ads");
if (!existsSync(ADS_DIR)) mkdirSync(ADS_DIR, { recursive: true });

const ADS_FILE = join(ADS_DIR, "ads.json");

export function loadAds(): IngestedAd[] {
  if (!existsSync(ADS_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(ADS_FILE, "utf-8"));
    return Array.isArray(parsed) ? (parsed as IngestedAd[]) : [];
  } catch {
    return [];
  }
}

export function saveAds(ads: IngestedAd[]): void {
  try {
    writeFileSync(ADS_FILE, JSON.stringify(ads, null, 2));
  } catch (err: any) {
    console.warn("[ads] failed to save ads.json:", err?.message);
  }
}

// -------------------------------------------
// Stage 2: Format Classification
// -------------------------------------------
export function classifyFormat(
  mime: string,
  width?: number,
  height?: number
): "banner" | "gif" | "short_video" | null {
  const m = (mime || "").toLowerCase();
  if (m.includes("gif")) return "gif";
  if (m.startsWith("video/")) return "short_video";
  if (m.startsWith("image/")) {
    // Wide aspect ratios are treated as banners.
    if (typeof width === "number" && typeof height === "number" && height > 0 && width >= height * 1.5) {
      return "banner";
    }
    return "gif"; // square / non-wide static images default to the gif bucket
  }
  return null;
}

// -------------------------------------------
// Stage 2: Media Duration & Format Validation (ffprobe)
// -------------------------------------------
function execFileAsync(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 16 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || "", stderr: stderr || "", code: err ? (err as any).code || 1 : 0 });
    });
  });
}

export async function validateWithFfprobe(
  filePath: string
): Promise<{ ok: boolean; durationSec?: number; width?: number; height?: number; fileSizeBytes?: number }> {
  // Best-effort: if ffprobe is missing or errors, we cannot validate, so allow.
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath
  ]);

  let info: any;
  try {
    info = JSON.parse(stdout);
  } catch {
    return { ok: true };
  }
  if (!info || !info.streams) return { ok: true };

  const videoStream = (info.streams || []).find((s: any) => s.codec_type === "video");
  const format = info.format || {};

  const durationSec = videoStream?.duration
    ? parseFloat(videoStream.duration)
    : format.duration
      ? parseFloat(format.duration)
      : undefined;

  const width = videoStream?.width ? parseInt(String(videoStream.width), 10) : undefined;
  const height = videoStream?.height ? parseInt(String(videoStream.height), 10) : undefined;
  const fileSizeBytes = format.size ? parseInt(String(format.size), 10) : undefined;

  // Discard rules:
  // - videos > 60 seconds
  // - files > 15MB
  // - videos failing resolution standards (<480 on either axis)
  if (typeof durationSec === "number" && durationSec > 60) return { ok: false };
  if (typeof fileSizeBytes === "number" && fileSizeBytes > 15 * 1024 * 1024) return { ok: false };
  if (videoStream && ((typeof width === "number" && width < 480) || (typeof height === "number" && height < 480))) {
    return { ok: false };
  }

  return { ok: true, durationSec, width, height, fileSizeBytes };
}

// -------------------------------------------
// Stage 3: Static Asset Mirroring (download + cloud fallback)
// -------------------------------------------
function extFor(sourceUrl: string, mime?: string): string {
  const fromUrl = extname(sourceUrl.split("?")[0]);
  if (fromUrl && fromUrl.length <= 5) return fromUrl;
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  if (mime === "video/mp4") return ".mp4";
  if (mime && mime.startsWith("image/")) return ".jpg";
  if (mime && mime.startsWith("video/")) return ".mp4";
  return ".bin";
}

export async function mirrorAsset(sourceUrl: string, id: string): Promise<string> {
  const ext = extFor(sourceUrl);
  const localPath = join(ADS_DIR, id + ext);

  // Cloud storage path: if Supabase is configured, upload there.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      // Lazy import so a missing optional dep never crashes the server.
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const resp = await fetch(sourceUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const { error } = await supabase.storage
          .from("ads")
          .upload(`${id}${ext}`, buf, { contentType: resp.headers.get("content-type") || undefined, upsert: true });
        if (!error) {
          const { data } = supabase.storage.from("ads").getPublicUrl(`${id}${ext}`);
          if (data?.publicUrl) return data.publicUrl;
        }
      }
    } catch (err: any) {
      console.warn("[ads] supabase mirror failed, falling back to local:", err?.message);
    }
  }

  // Local mirror (best-effort) — download and persist to disk.
  try {
    const resp = await fetch(sourceUrl);
    if (resp.ok) {
      const buf = Buffer.from(await resp.arrayBuffer());
      writeFileSync(localPath, buf);
      return `/ads/${id}${ext}`;
    }
  } catch (err: any) {
    console.warn("[ads] local mirror failed, returning source url:", err?.message);
  }

  // On failure, return the original source URL so the record is still usable.
  return sourceUrl;
}

// -------------------------------------------
// Stage 1: Ingestion Sources
// -------------------------------------------

// Official API ingestion — Meta Ad Library Graph API.
export async function ingestFromMetaAdLibrary(): Promise<IngestedAd[]> {
  const token = process.env.META_AD_LIBRARY_TOKEN;
  if (!token) return [];

  try {
    const base = "https://graph.facebook.com/v19.0/ads_archive";
    const params = new URLSearchParams({
      access_token: token,
      search_terms: "environment,public health,nature,awareness",
      ad_type: "POLITICAL_AND_ISSUE_ADS",
      ad_reached_countries: "US",
      fields: "id,page_name,ad_creative_body,ad_creative_link_titles,ad_snapshot_url,publisher_platforms",
      limit: "50"
    });

    const resp = await fetch(`${base}?${params.toString()}`);
    if (!resp.ok) return [];
    const json: any = await resp.json();
    const candidates: any[] = Array.isArray(json?.data) ? json.data : [];

    const results: IngestedAd[] = [];
    for (const c of candidates) {
      const snapshotUrl: string = c?.ad_snapshot_url || "";
      if (!snapshotUrl) continue;

      // We mirror the creative, then validate locally and classify.
      const id = `meta-${c.id || Date.now()}`;
      const localUrl = await mirrorAsset(snapshotUrl, id);
      const localPath = join(ADS_DIR, id + extFor(snapshotUrl));

      const validation = await validateWithFfprobe(localPath).catch(() => ({ ok: true as boolean, durationSec: undefined, width: undefined, height: undefined, fileSizeBytes: undefined }));
      if (!validation.ok) continue;

      const mediaType = classifyFormat(c?.mime_type || "image/jpeg", validation.width, validation.height);
      if (!mediaType) continue;

      results.push({
        id,
        title: c?.ad_creative_link_titles?.[0] || c?.page_name || "Untitled Campaign",
        brand: c?.page_name || "Unknown Brand",
        tagline: c?.ad_creative_body || "",
        mediaType,
        category: deriveCategory(c),
        brandTags: deriveBrandTags(c),
        sourceUrl: snapshotUrl,
        localMediaUrl: localUrl,
        mimeType: c?.mime_type,
        durationSec: validation.durationSec,
        fileSizeBytes: validation.fileSizeBytes,
        width: validation.width,
        height: validation.height,
        createdAt: new Date().toISOString()
      });
    }
    return results;
  } catch (err: any) {
    console.warn("[ads] Meta Ad Library ingestion error:", err?.message);
    return [];
  }
}

// Specialized scraping proxy ingestion (Playwright + residential IP rotation).
// This is a documented STUB: `playwright` is NOT installed in this environment.
// When enabled, this is where we would launch a headless browser against public
// transparency archives, rotate residential proxies, and emit candidate records.
export async function ingestFromProxyScraper(): Promise<IngestedAd[]> {
  // TODO(ads): Plug in Playwright with residential IP rotation here.
  //   const { chromium } = await import("playwright");
  //   const browser = await chromium.launch({ proxy: { server: ROTATING_PROXY } });
  //   ... scrape public transparency archive pages for the targeted tags ...
  return [];
}

function deriveCategory(c: any): string {
  const text = `${c?.page_name || ""} ${c?.ad_creative_body || ""}`.toLowerCase();
  if (text.includes("health") || text.includes("vaccine") || text.includes("wellbeing")) return "public_health";
  if (text.includes("nature") || text.includes("wildlife") || text.includes("forest") || text.includes("ocean")) return "nature";
  if (text.includes("environment") || text.includes("climate") || text.includes("sustain")) return "environment";
  return "awareness";
}

function deriveBrandTags(c: any): string[] {
  const tags = new Set<string>(["awareness"]);
  const text = `${c?.page_name || ""} ${c?.ad_creative_body || ""}`.toLowerCase();
  const map: [string, string][] = [
    ["environment", "environment"],
    ["climate", "climate"],
    ["sustain", "sustainability"],
    ["health", "public_health"],
    ["nature", "nature"],
    ["wildlife", "wildlife"],
    ["ocean", "ocean"],
    ["conservation", "conservation"]
  ];
  for (const [needle, tag] of map) {
    if (text.includes(needle)) tags.add(tag);
  }
  return Array.from(tags);
}

// -------------------------------------------
// Orchestration
// -------------------------------------------
export async function runIngestion(): Promise<IngestedAd[]> {
  const meta = await ingestFromMetaAdLibrary().catch(() => [] as IngestedAd[]);
  const proxy = await ingestFromProxyScraper().catch(() => [] as IngestedAd[]);
  const combined = [...meta, ...proxy];

  if (combined.length > 0) {
    saveAds(combined);
    return combined;
  }

  // Fallback: if external ingestion is down or returns empty, default to the
  // pre-loaded static seed library with a fresh createdAt stamp.
  const seeded = SEED_ADS.map((a) => ({
    ...a,
    createdAt: new Date().toISOString()
  }));
  saveAds(seeded);
  return seeded;
}

// A media URL is only renderable if it is self-contained (data URI), remote,
// or actually mirrored to disk. Older persisted records in data/ads/ads.json can
// still point at "/ads/*.svg" files that were never downloaded and are not
// served by any static route, which shows up as a broken creative.
function isRenderableMedia(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:")) return true;
  if (/^https?:\/\//i.test(url)) return true;
  if (url.startsWith("/ads/")) return existsSync(join(ADS_DIR, url.slice("/ads/".length)));
  return false;
}

export function withRenderableMedia(ad: IngestedAd): IngestedAd {
  if (isRenderableMedia(ad.localMediaUrl)) return ad;
  if (isRenderableMedia(ad.sourceUrl)) return { ...ad, localMediaUrl: ad.sourceUrl };
  const creative = svgAdCreative(ad.title, ad.category);
  return { ...ad, sourceUrl: creative, localMediaUrl: creative, mimeType: "image/svg+xml" };
}

export function getCuratedAds(): IngestedAd[] {
  const ads = loadAds();
  if (!ads || ads.length === 0) return SEED_ADS;
  // Never hand the client a creative it cannot render.
  return ads.map(withRenderableMedia);
}
