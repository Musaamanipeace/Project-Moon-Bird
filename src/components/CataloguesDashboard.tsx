import React, { useState, useMemo } from "react";
import { BookOpen, Sparkles, Megaphone, Tag, Filter, Star, Calendar, ArrowUpRight, Telescope } from "lucide-react";
import { astroCatalogue } from "../lib/events";
import { DEFAULT_ADS } from "./AdvertiserDashboard";

type CatalogueKind = "all" | "astro_event" | "campaign";

interface CataloguesDashboardProps {
  onNavigateToView?: (view: string) => void;
}

// Astro event categories (mapped from the catalogue's `type` field)
const ASTRO_CATEGORIES = [
  "all",
  "eclipse",
  "transit",
  "meteor-shower",
  "supermoon",
  "alignment",
] as const;

// Campaign categories (mapped from the advertiser `adType` field)
const CAMPAIGN_CATEGORIES = ["all", "tv_commercial", "review", "banner"] as const;

export default function CataloguesDashboard({ onNavigateToView }: CataloguesDashboardProps) {
  const [kind, setKind] = useState<CatalogueKind>("all");
  const [astroCat, setAstroCat] = useState<string>("all");
  const [campaignCat, setCampaignCat] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Build the unified catalogue list
  const items = useMemo(() => {
    const astro = astroCatalogue.map((e) => ({
      id: e.id,
      kind: "astro_event" as const,
      title: e.title,
      description: e.description,
      category: e.type,
      badge: e.rarity,
      date: e.date,
    }));

    const campaigns = DEFAULT_ADS.map((a) => ({
      id: a.id,
      kind: "campaign" as const,
      title: a.title,
      description: a.description,
      category: a.adType,
      badge: a.category,
      brand: a.brandName,
    }));

    return [...astro, ...campaigns];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((it) => {
      const matchesKind = kind === "all" || it.kind === kind;
      const matchesCat =
        it.kind === "astro_event"
          ? astroCat === "all" || it.category === astroCat
          : campaignCat === "all" || it.category === campaignCat;
      const matchesQuery =
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q);
      return matchesKind && matchesCat && matchesQuery;
    });
  }, [items, kind, astroCat, campaignCat, query]);

  const kindTabs: { id: CatalogueKind; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Catalogues", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "astro_event", label: "Astro Events", icon: <Telescope className="w-3.5 h-3.5" /> },
    { id: "campaign", label: "Campaigns", icon: <Megaphone className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">
      {/* Header Hero */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-turquoise-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
              📚 UNIFIED CATALOGUES
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Astro events & campaigns catalogued together by category. Accessible from Home and Profile.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigateToView?.("home")}
              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-turquoise-500 text-slate-400 hover:text-turquoise text-[10px] font-mono font-bold uppercase transition-all"
            >
              Home
            </button>
            <button
              onClick={() => onNavigateToView?.("profile")}
              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-turquoise-500 text-slate-400 hover:text-turquoise text-[10px] font-mono font-bold uppercase transition-all"
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Kind Switcher */}
      <div className="flex flex-wrap gap-1.5">
        {kindTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setKind(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase transition-all ${
              kind === t.id
                ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
                : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Category filters + search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/30 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {kind !== "campaign" &&
            ASTRO_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setAstroCat(c)}
                className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold uppercase transition-all ${
                  astroCat === c
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                {c === "all" ? "All Astro" : c.replace("-", " ")}
              </button>
            ))}

          {kind !== "astro_event" &&
            CAMPAIGN_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCampaignCat(c)}
                className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold uppercase transition-all ${
                  campaignCat === c
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                {c === "all" ? "All Campaigns" : c.replace("-", " ")}
              </button>
            ))}
        </div>

        <input
          type="text"
          placeholder="Search catalogues..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500 font-mono"
        />
      </div>

      {/* Catalogue grid */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center border border-slate-800 bg-slate-950/20 rounded-xl">
          <Filter className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-[10px] text-slate-500 font-mono">No catalogue entries match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const isAstro = it.kind === "astro_event";
            return (
              <div
                key={`${it.kind}-${it.id}`}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-slate-750 transition-all space-y-2.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isAstro ? (
                        <Sparkles className="w-4 h-4 text-turquoise" />
                      ) : (
                        <Megaphone className="w-4 h-4 text-emerald-400" />
                      )}
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          isAstro
                            ? "text-turquoise border-turquoise-900/30 bg-turquoise-950/10"
                            : "text-emerald-400 border-emerald-900/30 bg-emerald-950/10"
                        }`}
                      >
                        {isAstro ? "Astro" : "Campaign"}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 uppercase">
                      {it.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold font-mono text-slate-100 mt-1.5 leading-snug">
                    {it.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3">
                    {it.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[9px] font-mono text-slate-500">
                    {isAstro ? (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {it.date}
                        </span>
                        <span className="flex items-center gap-1 text-turquoise">
                          <Star className="w-3 h-3" /> {it.badge}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {it.brand}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Star className="w-3 h-3" /> {it.badge}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
