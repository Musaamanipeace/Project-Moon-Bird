import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  ChevronDown,
  Coins,
  Cpu,
  Film,
  Gem,
  Gift,
  House,
  Music,
  Newspaper,
  Pill,
  Plus,
  Refrigerator,
  Shirt,
  Sparkles,
  Star,
  Tag,
  TreePalm,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { api, FeedItem } from "../lib/api";

/* ==========================================================================
   Profile & Portfolio Page
   Nighttime theme: deep sky shades + subtle star elements behind bordered
   cards. Sections per spec:
     1. User Overview
     2. Possessions & Interests
     3. Social & Community (recommendations, shared personal feed, donations)
   ========================================================================== */

interface ProfileDashboardProps {
  nickname: string;
  onChangeNickname: (name: string) => void;
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
}

type IconType = React.ComponentType<{ className?: string }>;

/* ---------------------------- shared class names -------------------------- */

const CARD = "rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md";
const LABEL = "text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500";
const CARD_TITLE = "text-xs font-mono font-bold uppercase tracking-widest text-turquoise flex items-center gap-2";
const INPUT =
  "p-2 rounded-xl border border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500/60";
const BTN =
  "px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors";
const BTN_GHOST =
  "px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-turquoise-500/40 text-slate-300 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors";
const CHIP =
  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-turquoise-500/30 bg-turquoise-500/5 text-[10px] font-mono text-turquoise-bright";

/* ------------------------- localStorage utilities ------------------------- */

function readList(key: string, fallback: string[] = []): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return fallback;
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable — keep in-memory state only */
  }
}

function readText(key: string, fallback = ""): string {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function writeText(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — keep in-memory state only */
  }
}

/** Editable list persisted to localStorage under `key`. */
function useStoredList(key: string, initial: string[] = []) {
  const [items, setItems] = useState<string[]>(() => readList(key, initial));

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setItems((prev) => {
      if (prev.some((i) => i.toLowerCase() === value.toLowerCase())) return prev;
      const next = [...prev, value];
      writeList(key, next);
      return next;
    });
  };

  const remove = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      writeList(key, next);
      return next;
    });
  };

  return { items, add, remove };
}

/** Editable free text persisted to localStorage under `key`. */
function useStoredText(key: string, initial = "") {
  const [value, setValue] = useState<string>(() => readText(key, initial));
  const update = (next: string) => {
    setValue(next);
    writeText(key, next);
  };
  return { value, update };
}

/* ------------------------------ rank & age -------------------------------- */

interface RankInfo {
  level: number;
  label: string;
  floor: number;
  next: number | null;
}

function getRank(xpValue: number): RankInfo {
  if (xpValue < 100) return { level: 1, label: "Moon Muncher", floor: 0, next: 100 };
  if (xpValue < 300) return { level: 2, label: "Crescent Nibbler", floor: 100, next: 300 };
  if (xpValue < 600) return { level: 3, label: "Lunar Explorer", floor: 300, next: 600 };
  return { level: 4, label: "Cosmic Oracle", floor: 600, next: null };
}

function getRankProgress(xpValue: number, rank: RankInfo): number {
  if (rank.next === null) return 100;
  const span = rank.next - rank.floor;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, ((xpValue - rank.floor) / span) * 100));
}

function computeAgeYears(birthDate: string): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) years -= 1;
  if (years < 0 || years > 150) return null;
  return years;
}

/* --------------------------- subtle star field ---------------------------- */

const STARS: { top: string; left: string; size: number; opacity: number }[] = [
  { top: "6%", left: "8%", size: 2, opacity: 0.7 },
  { top: "11%", left: "27%", size: 1, opacity: 0.45 },
  { top: "4%", left: "52%", size: 2, opacity: 0.55 },
  { top: "15%", left: "72%", size: 1, opacity: 0.6 },
  { top: "9%", left: "91%", size: 2, opacity: 0.5 },
  { top: "24%", left: "16%", size: 1, opacity: 0.5 },
  { top: "31%", left: "44%", size: 2, opacity: 0.4 },
  { top: "27%", left: "63%", size: 1, opacity: 0.65 },
  { top: "36%", left: "86%", size: 2, opacity: 0.45 },
  { top: "44%", left: "6%", size: 1, opacity: 0.55 },
  { top: "51%", left: "34%", size: 2, opacity: 0.4 },
  { top: "48%", left: "77%", size: 1, opacity: 0.6 },
  { top: "62%", left: "21%", size: 2, opacity: 0.45 },
  { top: "68%", left: "58%", size: 1, opacity: 0.5 },
  { top: "72%", left: "89%", size: 2, opacity: 0.4 },
  { top: "81%", left: "12%", size: 1, opacity: 0.55 },
  { top: "86%", left: "47%", size: 2, opacity: 0.45 },
  { top: "92%", left: "69%", size: 1, opacity: 0.5 },
];

function StarField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}

/* ------------------------- reusable list editor UI ------------------------ */

function ListEditor({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  emptyText = "Nothing added yet.",
}: {
  label?: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  emptyText?: string;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {label && <span className={`${LABEL} block`}>{label}</span>}

      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[10px] font-mono text-slate-600">{emptyText}</span>
        ) : (
          items.map((item, index) => (
            <span key={`${item}-${index}`} className={CHIP}>
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${item}`}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className={`${INPUT} flex-1`}
        />
        <button type="button" onClick={submit} className={BTN}>
          <span className="flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Add
          </span>
        </button>
      </div>
    </div>
  );
}

/* --------------------- possessions & interests config --------------------- */

const POSSESSION_CATEGORIES: {
  key: string;
  label: string;
  Icon: IconType;
  placeholder: string;
}[] = [
  { key: "mb_pos_realestate", label: "Real Estate", Icon: House, placeholder: "e.g. Family plot — Nairobi" },
  { key: "mb_pos_vehicles", label: "Vehicles", Icon: Car, placeholder: "e.g. 2012 hatchback" },
  { key: "mb_pos_clothing", label: "Clothing", Icon: Shirt, placeholder: "e.g. Observation parka" },
  { key: "mb_pos_electronics", label: "Electronics", Icon: Cpu, placeholder: "e.g. 8in reflector telescope" },
  { key: "mb_pos_collectables", label: "Collectables", Icon: Gem, placeholder: "e.g. Meteorite fragment" },
  { key: "mb_pos_medications", label: "Medications", Icon: Pill, placeholder: "e.g. Daily vitamin D" },
  { key: "mb_pos_leisure", label: "Leisure Activities", Icon: TreePalm, placeholder: "e.g. Night hiking" },
];

function PossessionCategory({
  storageKey,
  label,
  Icon,
  placeholder,
  open,
  onToggle,
}: {
  key?: string;
  storageKey: string;
  label: string;
  Icon: IconType;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
}) {
  const list = useStoredList(storageKey);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-900/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-turquoise" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">{label}</span>
          <span className="text-[9px] font-mono text-slate-500">({list.items.length})</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800/80">
          <ListEditor
            placeholder={placeholder}
            items={list.items}
            onAdd={list.add}
            onRemove={list.remove}
            emptyText={`No ${label.toLowerCase()} tracked yet.`}
          />
        </div>
      )}
    </div>
  );
}

/* ----------------------- recommendation list config ----------------------- */

const RECOMMENDATION_LISTS: {
  key: string;
  label: string;
  Icon: IconType;
  placeholder: string;
}[] = [
  { key: "mb_rec_books", label: "Books", Icon: BookOpen, placeholder: "e.g. Cosmos — Carl Sagan" },
  { key: "mb_rec_movies", label: "Movies", Icon: Film, placeholder: "e.g. Apollo 11 (2019)" },
  { key: "mb_rec_appliances", label: "Appliances", Icon: Refrigerator, placeholder: "e.g. Low-noise dehumidifier" },
  { key: "mb_rec_songs", label: "Songs", Icon: Music, placeholder: "e.g. Moonlight Sonata" },
];

function RecommendationList({
  storageKey,
  label,
  Icon,
  placeholder,
}: {
  key?: string;
  storageKey: string;
  label: string;
  Icon: IconType;
  placeholder: string;
}) {
  const list = useStoredList(storageKey);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-turquoise" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">{label}</span>
      </span>
      <ListEditor
        placeholder={placeholder}
        items={list.items}
        onAdd={list.add}
        onRemove={list.remove}
        emptyText={`No ${label.toLowerCase()} recommended yet.`}
      />
    </div>
  );
}

/* ============================ main component ============================== */

export default function ProfileDashboard({
  nickname,
  onChangeNickname,
  xp,
  onAddXp,
  onNavigateToView,
}: ProfileDashboardProps) {
  /* ---- User Overview state (persisted) ---- */
  const occupation = useStoredText("mb_portfolio_occupation", "Student");
  const family = useStoredText("mb_portfolio_family", "");
  const birthDate = useStoredText("mb_birthdate", "");
  const milestones = useStoredList("mb_portfolio_milestones");
  const brands = useStoredList("mb_portfolio_brands");

  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  useEffect(() => {
    setNicknameDraft(nickname);
  }, [nickname]);

  const rank = getRank(xp);
  const rankProgress = getRankProgress(xp, rank);
  const ageYears = computeAgeYears(birthDate.value);

  /* ---- Possessions accordion ---- */
  const [openCategory, setOpenCategory] = useState<string>(POSSESSION_CATEGORIES[0].key);

  /* ---- Shared personal feed ---- */
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedStatus, setFeedStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setFeedStatus("loading");
    api
      .feed({ author: nickname })
      .then((items) => {
        if (cancelled) return;
        setFeed(Array.isArray(items) ? items : []);
        setFeedStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setFeed([]);
        setFeedStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  /* ---- Donation panel ---- */
  const CASH_RANK_THRESHOLD = 300;
  const cashUnlocked = xp >= CASH_RANK_THRESHOLD;
  const [donateTo, setDonateTo] = useState("");
  const [donateXp, setDonateXp] = useState("");
  const [donateCash, setDonateCash] = useState("");
  const [donateStatus, setDonateStatus] = useState("");

  const handleDonateXp = () => {
    const recipient = donateTo.trim();
    const amount = Number.parseInt(donateXp, 10);

    if (!recipient) {
      setDonateStatus("Enter the username you want to donate to.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setDonateStatus("Enter an XP amount greater than 0.");
      return;
    }
    if (amount > xp) {
      setDonateStatus(`Not enough XP. Your balance is ${xp} XP.`);
      return;
    }
    const confirmed = window.confirm(`Donate ${amount} XP to ${recipient}?`);
    if (!confirmed) {
      setDonateStatus("Donation cancelled.");
      return;
    }
    onAddXp(-amount);
    setDonateXp("");
    setDonateStatus(`Donated ${amount} XP to ${recipient}.`);
  };

  const handleDonateCash = () => {
    const recipient = donateTo.trim();
    const amount = Number.parseFloat(donateCash);

    if (!cashUnlocked) {
      setDonateStatus(`Cash transfers unlock at ${CASH_RANK_THRESHOLD} XP (Level 3+).`);
      return;
    }
    if (!recipient) {
      setDonateStatus("Enter the username you want to donate to.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setDonateStatus("Enter a cash amount greater than 0.");
      return;
    }
    setDonateStatus(
      `Cash transfer of ${amount} to ${recipient} is queued (higher-rank feature — no payment is processed here).`
    );
    setDonateCash("");
  };

  /* ------------------------------- render -------------------------------- */

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: "linear-gradient(160deg, #0a0f1f, #070b16 60%, #04060d)" }}
    >
      {/* subtle star elements behind the bordered cards */}
      <StarField />

      <div className="relative max-w-6xl mx-auto p-4 space-y-6 text-slate-200">
        {/* ------------------------- page header ------------------------- */}
        <header className={`${CARD} p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div className="space-y-1">
            <span className={`${LABEL} block`}>Profile &amp; Portfolio</span>
            <h1 className="text-base font-mono font-bold text-turquoise flex items-center gap-2">
              <User className="w-5 h-5" />
              {nickname || "anonymous"}
            </h1>
            <p className="text-[10px] font-mono text-slate-500">
              Level {rank.level} · {rank.label} · {xp} XP
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigateToView?.("recommendations")} className={BTN_GHOST}>
              <span className="flex items-center gap-1">
                Feed <ArrowUpRight className="w-3 h-3" />
              </span>
            </button>
            <button type="button" onClick={() => onNavigateToView?.("catalogues")} className={BTN_GHOST}>
              <span className="flex items-center gap-1">
                Catalogues <ArrowUpRight className="w-3 h-3" />
              </span>
            </button>
            <button type="button" onClick={() => onNavigateToView?.("tribe")} className={BTN_GHOST}>
              <span className="flex items-center gap-1">
                Tribe <ArrowUpRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ====================== 1. USER OVERVIEW ====================== */}
          <section className={`${CARD} p-5 space-y-5`}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>
                <User className="w-4 h-4" />
                User Overview
              </h2>
              <p className="text-[10px] font-mono text-slate-500">
                Anonymous identity, rank, milestones and personal details.
              </p>
            </div>

            {/* anonymous username */}
            <div className="space-y-1.5">
              <span className={`${LABEL} block`}>Anonymous Username</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  placeholder="e.g. moonrise_412"
                  className={`${INPUT} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = nicknameDraft.trim();
                    if (!next) return;
                    onChangeNickname(next);
                    writeText("mb_nickname", next);
                  }}
                  className={BTN}
                >
                  Save
                </button>
              </div>
            </div>

            {/* rank */}
            <div className="space-y-1.5">
              <span className={`${LABEL} block`}>Rank</span>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-turquoise flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    Level {rank.level}: {rank.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{xp} XP</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-turquoise-500" style={{ width: `${rankProgress}%` }} />
                </div>
                <span className="text-[9px] font-mono text-slate-500">
                  {rank.next === null ? "Highest rank reached" : `${rank.next - xp} XP to Level ${rank.level + 1}`}
                </span>
              </div>
            </div>

            {/* milestone achievements */}
            <div className="space-y-2">
              <span className={`${LABEL} flex items-center gap-1.5`}>
                <Star className="w-3.5 h-3.5 text-turquoise" />
                Milestone Achievements
              </span>
              <ListEditor
                placeholder="e.g. Logged 100 moon observations"
                items={milestones.items}
                onAdd={milestones.add}
                onRemove={milestones.remove}
                emptyText="No milestones recorded yet."
              />
            </div>

            {/* age + occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className={`${LABEL} block`}>Age</span>
                <input
                  type="date"
                  value={birthDate.value}
                  onChange={(e) => birthDate.update(e.target.value)}
                  className={`${INPUT} w-full`}
                />
                <span className="text-[10px] font-mono text-turquoise-dim block">
                  {ageYears === null ? "Set a birth date to compute age" : `${ageYears} years old`}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className={`${LABEL} flex items-center gap-1.5`}>
                  <Briefcase className="w-3.5 h-3.5 text-turquoise" />
                  Occupation
                </span>
                <input
                  type="text"
                  value={occupation.value}
                  onChange={(e) => occupation.update(e.target.value)}
                  placeholder="e.g. Student"
                  className={`${INPUT} w-full`}
                />
              </div>
            </div>

            {/* brand associations */}
            <div className="space-y-2">
              <span className={`${LABEL} flex items-center gap-1.5`}>
                <Tag className="w-3.5 h-3.5 text-turquoise" />
                Brand Associations
              </span>
              <ListEditor
                placeholder="e.g. AstroGear"
                items={brands.items}
                onAdd={brands.add}
                onRemove={brands.remove}
                emptyText="No brands linked yet."
              />
            </div>

            {/* family details */}
            <div className="space-y-1.5">
              <span className={`${LABEL} flex items-center gap-1.5`}>
                <Users className="w-3.5 h-3.5 text-turquoise" />
                Family Details
              </span>
              <textarea
                value={family.value}
                onChange={(e) => family.update(e.target.value)}
                placeholder="Household, relatives, dependants…"
                rows={3}
                className={`${INPUT} w-full resize-none`}
              />
            </div>
          </section>

          {/* ================ 2. POSSESSIONS & INTERESTS ================== */}
          <section className={`${CARD} p-5 space-y-4`}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>
                <Sparkles className="w-4 h-4" />
                Possessions &amp; Interests
              </h2>
              <p className="text-[10px] font-mono text-slate-500">
                Categorized tracking — open a category to add or remove entries.
              </p>
            </div>

            <div className="space-y-2">
              {POSSESSION_CATEGORIES.map((cat) => (
                <PossessionCategory
                  key={cat.key}
                  storageKey={cat.key}
                  label={cat.label}
                  Icon={cat.Icon}
                  placeholder={cat.placeholder}
                  open={openCategory === cat.key}
                  onToggle={() => setOpenCategory((prev) => (prev === cat.key ? "" : cat.key))}
                />
              ))}
            </div>
          </section>
        </div>

        {/* ============ 3. SOCIAL & COMMUNITY — recommendations ============ */}
        <section className={`${CARD} p-5 space-y-4`}>
          <div className="space-y-1">
            <h2 className={CARD_TITLE}>
              <BookOpen className="w-4 h-4" />
              Personal Recommendation Lists
            </h2>
            <p className="text-[10px] font-mono text-slate-500">
              Curate what you recommend to the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RECOMMENDATION_LISTS.map((rec) => (
              <RecommendationList
                key={rec.key}
                storageKey={rec.key}
                label={rec.label}
                Icon={rec.Icon}
                placeholder={rec.placeholder}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ============ 3b. Shared personal feed ============ */}
          <section className={`${CARD} p-5 space-y-3`}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>
                <Newspaper className="w-4 h-4" />
                Shared Personal Feed
              </h2>
              <p className="text-[10px] font-mono text-slate-500">
                Everything you have shared as <span className="text-turquoise-dim">{nickname || "anonymous"}</span>.
              </p>
            </div>

            {feedStatus === "loading" && (
              <p className="text-[10px] font-mono text-slate-500">Loading your shared feed…</p>
            )}

            {feedStatus === "error" && (
              <p className="text-[10px] font-mono text-slate-500">
                Feed unavailable right now. Your posts will appear here once the connection returns.
              </p>
            )}

            {feedStatus === "ready" && feed.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-4 text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-300 block">Your feed is quiet</span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Share a catalogue entry, a badge or a campaign and it will show up here.
                </span>
              </div>
            )}

            {feedStatus === "ready" && feed.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {feed.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-turquoise">{item.kind}</span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {item.title && (
                      <h3 className="text-[11px] font-mono font-bold text-slate-200">{item.title}</h3>
                    )}
                    {item.body && <p className="text-[10px] text-slate-400 leading-relaxed">{item.body}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ============ 3c. User donation feature ============ */}
          <section className={`${CARD} p-5 space-y-4`}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>
                <Gift className="w-4 h-4" />
                User Donation
              </h2>
              <p className="text-[10px] font-mono text-slate-500">
                Donate XP to another user. Cash transfers unlock at higher ranks.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className={`${LABEL} block`}>Donate To (Username)</span>
              <input
                type="text"
                value={donateTo}
                onChange={(e) => setDonateTo(e.target.value)}
                placeholder="e.g. moonrise_734"
                className={`${INPUT} w-full`}
              />
            </div>

            {/* XP donation */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <span className={`${LABEL} flex items-center gap-1.5`}>
                <Coins className="w-3.5 h-3.5 text-turquoise" />
                XP Donation
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={donateXp}
                  onChange={(e) => setDonateXp(e.target.value)}
                  placeholder="XP amount"
                  className={`${INPUT} flex-1`}
                />
                <button type="button" onClick={handleDonateXp} className={BTN}>
                  Donate XP
                </button>
              </div>
              <span className="text-[9px] font-mono text-slate-500 block">Your balance: {xp} XP</span>
            </div>

            {/* Cash transfer (higher ranks) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`${LABEL} flex items-center gap-1.5`}>
                  <Banknote className="w-3.5 h-3.5 text-turquoise" />
                  Cash Transfer
                </span>
                <span
                  className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                    cashUnlocked
                      ? "text-turquoise border-turquoise-500/40 bg-turquoise-500/10"
                      : "text-slate-500 border-slate-800 bg-slate-900/60"
                  }`}
                >
                  {cashUnlocked ? "Unlocked" : "Locked"}
                </span>
              </div>

              {cashUnlocked ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={donateCash}
                      onChange={(e) => setDonateCash(e.target.value)}
                      placeholder="Cash amount"
                      className={`${INPUT} flex-1`}
                    />
                    <button type="button" onClick={handleDonateCash} className={BTN}>
                      Send Cash
                    </button>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 block leading-relaxed">
                    Cash transfers are enabled at higher rank (Level 3+, {CASH_RANK_THRESHOLD}+ XP). This panel records
                    your intent only — no payment is processed here.
                  </span>
                </>
              ) : (
                <span className="text-[9px] font-mono text-slate-500 block leading-relaxed">
                  Direct cash transfers are enabled at higher rank. Reach {CASH_RANK_THRESHOLD} XP (Level 3) to unlock
                  this option — you currently have {xp} XP.
                </span>
              )}
            </div>

            {donateStatus && (
              <p className="text-[10px] font-mono text-turquoise-dim leading-relaxed">{donateStatus}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
