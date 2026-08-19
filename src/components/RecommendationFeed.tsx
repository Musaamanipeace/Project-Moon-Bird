import React, { useState, useEffect, useRef, useCallback } from "react";
import { Rss, BookOpen, Play, ShoppingBag, Film, Star, ExternalLink, Loader2, Check } from "lucide-react";

type Category = "course" | "youtube" | "book" | "movie" | "product";

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  author: string;
  likes: number;
  url?: string;
}

const CATEGORIES: Category[] = ["course", "youtube", "book", "movie", "product"];

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  youtube: <Play className="w-4 h-4" />,
  book: <BookOpen className="w-4 h-4" />,
  movie: <Film className="w-4 h-4" />,
  product: <ShoppingBag className="w-4 h-4" />,
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "course", label: "Courses" },
  { key: "youtube", label: "Videos" },
  { key: "book", label: "Books" },
  { key: "movie", label: "Movies" },
  { key: "product", label: "Products" },
];

const SAMPLE: Record<Category, { titles: string[]; authors: string[]; descriptions: string[] }> = {
  course: {
    titles: [
      "Introduction to Astrophotography",
      "Lunar Photography Masterclass",
      "Astrophotography with a Phone",
      "Deep-Sky Stacking Workshop",
      "Planetary Imaging Fundamentals",
      "Milky Way Panorama Course",
    ],
    authors: ["StarGazer Academy", "MoonCapture Pro", "NightSky School", "Orion Labs", "AstroU", "Celestial Ed"],
    descriptions: [
      "Learn how to capture stunning images of the night sky with just a DSLR and a tripod. Perfect for beginners.",
      "Advanced techniques for capturing high-resolution lunar surface details with stacking and processing software.",
      "A practical guide to shooting the Moon and stars using only a modern smartphone and a steady mount.",
      "Step-by-step workflow for calibrating and stacking deep-sky exposures to reveal faint nebulae.",
      "Master the settings and gear needed to photograph Jupiter, Saturn, and the phases of the Moon.",
      "Compose sweeping Milky Way panoramas from dark-sky sites using free software tools.",
    ],
  },
  youtube: {
    titles: [
      "The Secret Life of the Moon",
      "Why the Sky is Dark at Night",
      "Touring the Lunar Marathon",
      "How Telescopes Actually Work",
      "Live Meteor Shower Watch",
      "The Colour of Stars Explained",
    ],
    authors: ["CosmicDocs", "Night Owl TV", "LunaCast", "Optics Lab", "SkyLive", "Stellar Talks"],
    descriptions: [
      "A fascinating documentary exploring lunar geology, the Apollo missions, and the future of moon colonization.",
      "An accessible explanation of Olbers' paradox and what the darkness of space really tells us.",
      "A guided virtual tour of the 100 lunar features every observer should tick off in a single night.",
      "A clear breakdown of refractors, reflectors, and catadioptrics for first-time buyers.",
      "Join thousands of viewers for a relaxed, narrated meteor shower viewing from a dark location.",
      "Why stars appear blue, red, or white, and what their colour reveals about temperature.",
    ],
  },
  book: {
    titles: [
      "Cosmos by Carl Sagan",
      "The Lunar Codex",
      "NightWatch: A Practical Guide",
      "Turn Left at Orion",
      "The Cosmic Perspective",
      "Atlas of the Moon",
    ],
    authors: ["Carl Sagan", "Mira Vale", "Terence Dickinson", "Guy Consolmagno", "Neil deGrasse Tyson", "Antonin Rukl"],
    descriptions: [
      "A timeless exploration of the universe, science, and humanity's place in the cosmos. Essential reading.",
      "A speculative anthology linking lunar mythology to modern space-exploration ambitions.",
      "The classic field guide to observing the night sky with the naked eye and small telescopes.",
      "A friendly handbook for finding the best celestial objects with a small backyard telescope.",
      "A sweeping survey of astronomy that connects cosmic scales to everyday human experience.",
      "The definitive reference map of lunar maria, craters, and rilles for serious observers.",
    ],
  },
  movie: {
    titles: [
      "Interstellar (2014)",
      "The Moon and Beyond",
      "Apollo 11 (2019)",
      "La La Land (2016)",
      "Moon (2009)",
      "First Man (2018)",
    ],
    authors: ["FilmBuff", "DocuCine", "Archive Films", "Indie Pics", "SciFi House", "Biopic Studio"],
    descriptions: [
      "Christopher Nolan's epic space odyssey featuring realistic black hole visuals based on Kip Thorne's physics.",
      "A contemplative feature on humanity's enduring fascination with Earth's only natural satellite.",
      "Restored mission footage that puts you inside the first crewed landing on the Moon.",
      "A bittersweet musical where the Los Angeles night sky frames a story of ambition and love.",
      "A quiet sci-fi drama about isolation and identity at a lunar helium-3 mining base.",
      "The intense personal story of Neil Armstrong and the cost of the first lunar footsteps.",
    ],
  },
  product: {
    titles: [
      "Orion SkyQuest XT8 Telescope",
      "Celestron Travel Scope 70",
      "Sky-Watcher Star Adventurer",
      "ZWO ASI224MC Camera",
      "Lunar Filter Set",
      "Red-Light Astronomy Headlamp",
    ],
    authors: ["AstroGear Reviews", "GearBox", "Mount Masters", "CameraLab", "FilterWorks", "NightKit"],
    descriptions: [
      "A highly-rated beginner reflector telescope perfect for observing the moon, planets, and bright objects.",
      "A lightweight, grab-and-go refractor ideal for travel and quick lunar and terrestrial views.",
      "A portable equatorial tracker that turns a DSLR into a deep-sky astrophotography rig.",
      "A sensitive planetary camera that captures crisp lunar and planetary detail at high frame rates.",
      "A set of neutral-density filters that tame the bright full moon for comfortable observing.",
      "A comfortable red-light headlamp that preserves night vision during setup and teardown.",
    ],
  },
};

function generateBatch(start: number, count: number): RecommendationItem[] {
  const items: RecommendationItem[] = [];
  for (let i = 0; i < count; i++) {
    const n = start + i;
    const category = CATEGORIES[n % CATEGORIES.length];
    const pool = SAMPLE[category];
    const idx = Math.floor(n / CATEGORIES.length) % pool.titles.length;
    items.push({
      id: `rec-${n + 1}`,
      title: pool.titles[idx],
      author: pool.authors[idx],
      description: pool.descriptions[idx],
      category,
      likes: 40 + ((n * 37) % 320),
    });
  }
  return items;
}

const INITIAL_COUNT = 12;
const BATCH_SIZE = 9;
const MAX_ITEMS = 240;
const STORAGE_KEY = "mb_feed_subscriptions";

function loadSubscriptions(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set<string>(JSON.parse(raw) as string[]);
  } catch {
    /* ignore corrupt storage */
  }
  return new Set<string>();
}

export default function RecommendationFeed({ onNavigateToView }: { onNavigateToView?: (view: string) => void }) {
  const [items, setItems] = useState<RecommendationItem[]>(() => generateBatch(0, INITIAL_COUNT));
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(loadSubscriptions);

  const loadingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (itemsRef.current.length >= MAX_ITEMS) return;
    loadingRef.current = true;
    setLoading(true);
    window.setTimeout(() => {
      setItems((prev) => [...prev, ...generateBatch(prev.length, BATCH_SIZE)]);
      loadingRef.current = false;
      setLoading(false);
    }, 700);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const filtered = filter === "all" ? items : items.filter((r) => r.category === filter);

  const toggleSubscribe = (id: string) => {
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  };

  const reachedEnd = items.length >= MAX_ITEMS;

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono text-turquoise tracking-wider flex items-center gap-2">
            <Rss className="w-5 h-5" />
            Endless Recommendation Feed
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Community-curated courses, videos, books, movies, and products - paywall-free.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
              filter === f.key
                ? "bg-turquoise-500 text-slate-950 shadow-md"
                : "border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((rec) => {
          const isSubscribed = subscribedIds.has(rec.id);
          return (
            <div
              key={rec.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md hover:border-turquoise-500/30 transition-all flex flex-col justify-between h-full"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-turquoise-500/30 text-turquoise text-[10px] font-mono font-bold uppercase">
                    {CATEGORY_ICONS[rec.category]}
                    {rec.category}
                  </span>
                  {rec.url && (
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-turquoise transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <h4 className="text-sm font-bold font-mono text-slate-100 leading-snug">
                  {rec.title}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {rec.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <Star className="w-3 h-3 text-turquoise" />
                  <span>by {rec.author}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 px-5 py-3 border-t border-slate-800">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Star className="w-3 h-3" />
                  <span>{rec.likes}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSubscribe(rec.id)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      isSubscribed
                        ? "bg-turquoise-500 text-slate-950"
                        : "border border-turquoise-500/40 text-turquoise hover:bg-turquoise-500/10"
                    }`}
                  >
                    {isSubscribed ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> Subscribed ✓
                      </span>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                  {onNavigateToView && (
                    <button
                      onClick={() => onNavigateToView("catalogues")}
                      className="text-[10px] font-mono text-turquoise hover:text-turquoise-bright transition-colors uppercase"
                    >
                      Open in catalogue
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-10" />

      <div className="flex items-center justify-center gap-2 py-4 text-turquoise font-mono text-xs uppercase tracking-wider">
        {loading && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>loading more...</span>
          </>
        )}
        {!loading && reachedEnd && <span>You have reached the end of the feed.</span>}
      </div>
    </div>
  );
}
