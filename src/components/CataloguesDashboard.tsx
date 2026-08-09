import React, { useState, useMemo, useEffect } from "react";
import { BookOpen, Sparkles, Megaphone, Tag, Filter, Star, Calendar, ArrowUpRight, Telescope, Store, Library, LayoutGrid, Share2, HeartPulse, HandHeart } from "lucide-react";
import { astroCatalogue } from "../lib/events";
import { DEFAULT_ADS } from "./AdvertiserDashboard";
import { api, Brand, Book } from "../lib/api";

type CatalogueKind = "all" | "astro_event" | "brand" | "book" | "campaign" | "skill" | "disease" | "charity" | "general";

interface CataloguesDashboardProps {
  onNavigateToView?: (view: string) => void;
  onShareFeed?: (entry: { kind: any; title?: string; body?: string; refId?: string; refType?: string }) => void;
}

interface CatItem {
  id: string;
  kind: CatalogueKind;
  title: string;
  description: string;
  category: string;
  badge?: string;
  date?: string;
  brand?: string;
  icon: string;
}

const KIND_META: Record<Exclude<CatalogueKind, "all">, { label: string; icon: React.ReactNode; color: string }> = {
  astro_event: { label: "Astro Events", icon: <Telescope className="w-4 h-4" />, color: "text-turquoise" },
  brand: { label: "Brands", icon: <Store className="w-4 h-4" />, color: "text-turquoise-bright" },
  book: { label: "Books", icon: <Library className="w-4 h-4" />, color: "text-turquoise-dim" },
  campaign: { label: "Campaigns / Ads", icon: <Megaphone className="w-4 h-4" />, color: "text-emerald-400" },
  skill: { label: "Skills", icon: <Sparkles className="w-4 h-4" />, color: "text-turquoise" },
  disease: { label: "Disease / Health", icon: <HeartPulse className="w-4 h-4" />, color: "text-rose-300" },
  charity: { label: "Charities", icon: <HandHeart className="w-4 h-4" />, color: "text-amber-300" },
  general: { label: "General", icon: <LayoutGrid className="w-4 h-4" />, color: "text-slate-300" },
};

export default function CataloguesDashboard({ onNavigateToView, onShareFeed }: CataloguesDashboardProps) {
  const [kind, setKind] = useState<CatalogueKind>("all");
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);

  useEffect(() => {
    api.brands().then(setBrands).catch(() => {});
    api.books().then(setBooks).catch(() => {});
    api.skills().then(setSkills).catch(() => {});
    api.diseases().then(setDiseases).catch(() => {});
    api.charities().then(setCharities).catch(() => {});
  }, []);

  const items = useMemo<CatItem[]>(() => {
    const astro: CatItem[] = astroCatalogue.map((e) => ({
      id: e.id, kind: "astro_event", title: e.title, description: e.description,
      category: e.type, badge: e.rarity, date: e.date, icon: "🌌",
    }));
    const campaigns: CatItem[] = DEFAULT_ADS.map((a) => ({
      id: a.id, kind: "campaign", title: a.title, description: a.description,
      category: a.adType, badge: a.category, brand: a.brandName, icon: "📢",
    }));
    const brandItems: CatItem[] = brands.map((b) => ({
      id: b.id, kind: "brand", title: b.name, description: `${b.tagline} (${b.category})`,
      category: b.category, badge: b.interests.join(", "), icon: b.logoEmoji || "🏷️",
    }));
    const bookItems: CatItem[] = books.map((b) => ({
      id: b.id, kind: "book", title: b.title, description: `${b.tagline} — ${b.author}`,
      category: b.category, badge: b.interests.join(", "), icon: b.emoji || "📚",
    }));
    const skillItems: CatItem[] = skills.map((s) => ({
      id: s.id, kind: "skill", title: s.name, description: s.description,
      category: s.category, badge: `Level: ${s.level}`, icon: "🛠️",
    }));
    const diseaseItems: CatItem[] = diseases.map((d) => ({
      id: d.id, kind: "disease", title: d.name, description: d.summary,
      category: d.category, badge: `Prevention: ${d.prevention}`, icon: "🩺",
    }));
    const charityItems: CatItem[] = charities.map((c) => ({
      id: c.id, kind: "charity", title: c.name, description: c.tagline,
      category: c.category, badge: c.region, icon: "🤝",
    }));
    return [...astro, ...brandItems, ...bookItems, ...campaigns, ...skillItems, ...diseaseItems, ...charityItems];
  }, [brands, books, skills, diseases, charities]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((it) => {
      const matchesKind = kind === "all" || it.kind === kind;
      const matchesQuery = !q || it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      return matchesKind && matchesQuery;
    });
  }, [items, kind, query]);

  const kinds: CatalogueKind[] = ["all", "astro_event", "brand", "book", "campaign", "skill", "disease", "charity", "general"];

  const handleShare = (it: CatItem) => {
    onShareFeed?.({ kind: "catalogue_share", title: it.title, body: it.description, refId: it.id, refType: it.kind });
  };

  return (
    <div className="flex gap-4 p-4 max-w-6xl mx-auto text-slate-200">
      {/* Decluttered left filter rail */}
      <aside className="hidden sm:flex flex-col gap-1 w-44 shrink-0">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-1">Catalogues</span>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-mono text-[10px] font-bold uppercase transition-all ${
              kind === k
                ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {k === "all" ? <BookOpen className="w-4 h-4" /> : KIND_META[k].icon}
            {k === "all" ? "All" : KIND_META[k].label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        {/* Header Hero */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-turquoise-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
                📚 UNIFIED CATALOGUES
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Astro events, brands, books, campaigns & general — catalogued together.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNavigateToView?.("home")} className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-turquoise-500 text-slate-400 hover:text-turquoise text-[10px] font-mono font-bold uppercase transition-all">Home</button>
              <button onClick={() => onNavigateToView?.("profile")} className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-turquoise-500 text-slate-400 hover:text-turquoise text-[10px] font-mono font-bold uppercase transition-all">Profile</button>
            </div>
          </div>
        </div>

        {/* Mobile kind chips */}
        <div className="flex sm:hidden flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold uppercase ${kind === k ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright" : "border-slate-850 bg-slate-950 text-slate-500"}`}>
              {k === "all" ? "All" : KIND_META[k].label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search catalogues..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500 font-mono"
        />

        {filtered.length === 0 ? (
          <div className="p-8 text-center border border-slate-800 bg-slate-950/20 rounded-xl">
            <Filter className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] text-slate-500 font-mono">No catalogue entries match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => {
              const meta = it.kind === "all" ? null : KIND_META[it.kind];
              return (
                <div key={`${it.kind}-${it.id}`} className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-slate-750 transition-all space-y-2.5 flex flex-col">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{it.icon}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${meta?.color || "text-slate-300"} border-slate-800 bg-slate-900`}>
                          {it.kind.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 uppercase">{it.category}</span>
                    </div>
                    <h4 className="text-xs font-bold font-mono text-slate-100 mt-1.5 leading-snug">{it.title}</h4>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3">{it.description}</p>
                    <div className="flex items-center gap-2 pt-1 text-[9px] font-mono text-slate-500">
                      {it.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {it.date}</span>}
                      {it.brand && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {it.brand}</span>}
                      {it.badge && <span className="flex items-center gap-1 text-turquoise"><Star className="w-3 h-3" /> {it.badge}</span>}
                    </div>
                  </div>
                  {onShareFeed && (
                    <button onClick={() => handleShare(it)} className="mt-auto self-start flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded border border-turquoise-500/30 text-turquoise hover:bg-turquoise-500/10 transition-all">
                      <Share2 className="w-3 h-3" /> Share to Feed
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
