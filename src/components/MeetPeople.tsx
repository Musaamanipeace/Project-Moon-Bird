import React, { useState, useEffect, useMemo } from "react";
import { Users, User, MessageSquare, Sparkles, Check, XCircle, Clock } from "lucide-react";
import { api, PublicUser } from "../lib/api";

interface MeetPeopleProps {
  nickname: string;
  onNavigateToView?: (view: string) => void;
  onOpenProfile?: (id: string) => void;
}

interface MatchedUser extends PublicUser {
  score: number;
  sharedInterests: string[];
  sharedBrands: string[];
  status: "found" | "pending" | "rejected" | "new";
}

const ACCEPT_XP_THRESHOLD = 100;
const FOUND_KEY = "mb_match_found";
const REJECTED_KEY = "mb_match_rejected";
const PENDING_KEY = "mb_match_pending";

const LOCAL_SAMPLE: PublicUser[] = [
  { id: "sample_1", nickname: "aurora_watcher", interests: ["astrophotography", "journaling", "stargazing"], brandLinks: ["celestron", "nasa"], avatarEmoji: "🌌", bio: "Night-sky enthusiast." },
  { id: "sample_2", nickname: "lunar_li", interests: ["meditation", "astrology", "journaling"], brandLinks: ["spacex"], avatarEmoji: "🌙", bio: "Moon-phase tracker." },
  { id: "sample_3", nickname: "comet_kid", interests: ["stargazing", "coding", "meditation"], brandLinks: ["celestron", "spacex", "nasa"], avatarEmoji: "☄️", bio: "Building sky apps." },
  { id: "sample_4", nickname: "tide_reader", interests: ["surfing", "astrology"], brandLinks: ["patagonia"], avatarEmoji: "🌊", bio: "Follows the tides." },
];

function readList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]") as string[]; } catch { return []; }
}
function writeList(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

function computeScore(
  user: PublicUser,
  myInterests: string[],
  myBrands: string[]
): { score: number; sharedInterests: string[]; sharedBrands: string[] } {
  const sharedInterests = (user.interests || []).filter(i => myInterests.includes(i));
  const sharedBrands = (user.brandLinks || []).filter(b => myBrands.includes(b));
  const score = sharedInterests.length * 2 + sharedBrands.length * 3;
  return { score, sharedInterests, sharedBrands };
}

export default function MeetPeople({ nickname, onNavigateToView, onOpenProfile }: MeetPeopleProps) {
  const [candidates, setCandidates] = useState<MatchedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "found" | "pending" | "rejected">("all");

  const xp = useMemo(() => {
    const v = parseInt(localStorage.getItem("mb_xp") || "0", 10);
    return isNaN(v) ? 0 : v;
  }, []);

  const myInterests = useMemo(() => {
    try {
      const hobbies: string[] = JSON.parse(localStorage.getItem("mb_hobbies") || "[]");
      return hobbies.map(h => h.replace(/^\[.*?\]\s*/, "").trim()).filter(Boolean);
    } catch { return []; }
  }, []);
  const myBrands = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("mb_brand_links") || "[]"); } catch { return []; }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.matchmaking({ nickname, interests: myInterests, brandLinks: myBrands }).catch(() => [] as PublicUser[]),
      api.onlineExtended().catch(() => [] as PublicUser[]),
    ]).then(([mk, onl]) => {
      if (!alive) return;
      const byId = new Map<string, PublicUser>();
      [...(mk as PublicUser[]), ...(onl as PublicUser[])].forEach(u => {
        if (u && u.id) byId.set(u.id, u);
      });
      let pool = Array.from(byId.values());
      if (pool.length === 0) pool = LOCAL_SAMPLE;

      const found = readList(FOUND_KEY);
      const rejected = readList(REJECTED_KEY);
      const pending = readList(PENDING_KEY);

      const enriched: MatchedUser[] = pool.map(u => {
        const { score, sharedInterests, sharedBrands } = computeScore(u, myInterests, myBrands);
        let status: MatchedUser["status"] = "new";
        if (found.includes(u.id)) status = "found";
        else if (pending.includes(u.id)) status = "pending";
        else if (rejected.includes(u.id)) status = "rejected";
        return {
          ...u,
          score,
          sharedInterests,
          sharedBrands,
          status,
        };
      });

      enriched.sort((a, b) => b.score - a.score);
      setCandidates(enriched);
    }).catch(e => setError(String(e)));
    return () => { alive = false; };
  }, [nickname, myInterests, myBrands]);

  const setStatus = (id: string, status: "found" | "pending" | "rejected") => {
    setCandidates(prev => prev.map(c => (c.id === id ? { ...c, status } : c)));

    const found = readList(FOUND_KEY).filter(x => x !== id);
    const rejected = readList(REJECTED_KEY).filter(x => x !== id);
    const pending = readList(PENDING_KEY).filter(x => x !== id);

    if (status === "found") found.push(id);
    else if (status === "rejected") rejected.push(id);
    else if (status === "pending") pending.push(id);

    writeList(FOUND_KEY, found);
    writeList(REJECTED_KEY, rejected);
    writeList(PENDING_KEY, pending);
  };

  const canAccept = xp >= ACCEPT_XP_THRESHOLD;

  const visible = filter === "all"
    ? candidates
    : candidates.filter(c => c.status === filter);

  return (
    <div className="relative space-y-6 p-4 max-w-5xl mx-auto text-slate-200 min-h-[70vh]">
      <div className="relative z-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-turquoise-500/5 rounded-full blur-3xl" />
          <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Find Someone Like Me
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Privacy-preserving matching based on shared profile traits. Accept matches once XP reaches {ACCEPT_XP_THRESHOLD} (current: {xp}).
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-mono">{error}</div>
        )}

        {!canAccept && (
          <div className="mt-4 p-3 rounded-xl bg-turquoise-950/30 border border-turquoise-700/40 text-turquoise text-xs font-mono">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Earn {ACCEPT_XP_THRESHOLD - xp} more XP to accept matches. You can still defer (pending) or reject.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "found", "pending", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${filter === f ? "bg-turquoise-500 text-slate-950" : "border border-slate-800 text-slate-300 hover:bg-slate-800"}`}
            >
              {f === "all" ? `All (${candidates.length})` : `${f} (${candidates.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-2">Best Matches</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.length === 0 && (
              <p className="text-[10px] text-slate-500 font-mono col-span-full">No matches in this category yet. Keep exploring!</p>
            )}
            {visible.map(c => (
              <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-3 hover:border-turquoise-500/30 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.avatarEmoji}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-100 block truncate">{c.nickname}</span>
                    <span className="text-[9px] text-turquoise font-mono">match score: {c.score}</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {(c.sharedInterests || []).map(i => (
                    <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-turquoise-500/10 text-turquoise border border-turquoise-500/20">{i}</span>
                  ))}
                  {(c.sharedBrands || []).map(b => (
                    <span key={b} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">🔗 {b}</span>
                  ))}
                  {c.sharedInterests.length === 0 && c.sharedBrands.length === 0 && (
                    <span className="text-[8px] font-mono text-slate-500">no shared traits</span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenProfile?.(c.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    <User className="w-3 h-3" /> Profile
                  </button>

                  {c.status === "found" ? (
                    <button
                      onClick={() => onNavigateToView?.("chat")}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-bold"
                    >
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => canAccept && setStatus(c.id, "found")}
                        disabled={!canAccept}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded font-bold transition-all ${canAccept ? "bg-turquoise-500 hover:bg-turquoise-400 text-slate-950" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                      >
                        <Check className="w-3 h-3" /> Accept
                      </button>
                      <button
                        onClick={() => setStatus(c.id, "pending")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded ${c.status === "pending" ? "bg-amber-500/80 text-slate-950" : "bg-amber-900/40 text-amber-400 hover:bg-amber-900/60"}`}
                      >
                        <Clock className="w-3 h-3" /> Pending
                      </button>
                      <button
                        onClick={() => setStatus(c.id, "rejected")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded ${c.status === "rejected" ? "bg-red-500/80 text-slate-950" : "bg-red-900/40 text-red-400 hover:bg-red-900/60"}`}
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: "found" as const, label: "Found", color: "text-turquoise" },
            { key: "pending" as const, label: "Pending", color: "text-amber-400" },
            { key: "rejected" as const, label: "Rejected", color: "text-red-400" },
          ]).map(col => (
            <div key={col.key} className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-3">
              <h4 className={`text-[10px] font-mono font-bold uppercase tracking-wider ${col.color}`}>
                {col.label} ({readList(col.key === "found" ? FOUND_KEY : col.key === "pending" ? PENDING_KEY : REJECTED_KEY).length})
              </h4>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidates.filter(c => c.status === col.key).map(c => (
                  <span key={c.id} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{c.avatarEmoji} {c.nickname}</span>
                ))}
                {candidates.filter(c => c.status === col.key).length === 0 && (
                  <span className="text-[8px] font-mono text-slate-600">empty</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
