import React, { useState, useEffect, useMemo } from "react";
import { Users, User, MessageSquare, Newspaper, X, Sparkles } from "lucide-react";
import { api, PublicUser } from "../lib/api";

interface MeetPeopleProps {
  nickname: string;
  onNavigateToView?: (view: string) => void;
  onOpenProfile?: (id: string) => void;
}

export default function MeetPeople({ nickname, onNavigateToView, onOpenProfile }: MeetPeopleProps) {
  const [online, setOnline] = useState<(PublicUser & { activePhase?: string; id: string })[]>([]);
  const [matches, setMatches] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<(PublicUser & { feed?: any[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derive the current user's interests/brands from localStorage where available.
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
      api.onlineExtended().catch(() => []),
      api.matchmaking({ nickname, interests: myInterests, brandLinks: myBrands }).catch(() => []),
    ]).then(([onl, mt]) => {
      if (!alive) return;
      setOnline(onl as any);
      setMatches(mt);
    }).catch(e => setError(String(e)));
    return () => { alive = false; };
  }, [nickname, myInterests, myBrands]);

  const openProfile = async (id: string) => {
    try {
      const u = await api.user(id);
      setSelected({ ...u, feed: u.feed || [] });
    } catch {
      setError("Could not load profile.");
    }
  };

  return (
    <div className="relative space-y-6 p-4 max-w-5xl mx-auto text-slate-200 min-h-[70vh]">
      <div className="relative z-10">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-turquoise-500/5 rounded-full blur-3xl" />
          <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Meet People Like Me
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Browse online stargazers and your best matches below. Open a profile to view portfolio, chat, or feed. Matches are prioritized by shared interests & linked brands.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-mono">{error}</div>
        )}

        <div className="mt-4">
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-2">🌟 Best Matches (by shared interests & brands)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.length === 0 && (
              <p className="text-[10px] text-slate-500 font-mono">No matches yet. Add interests in your profile to improve matching.</p>
            )}
            {matches.map(m => (
              <div key={m.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-turquoise-500/30 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.avatarEmoji}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-100 block truncate">{m.nickname}</span>
                    <span className="text-[9px] text-turquoise font-mono">match score: {m.score}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(m.sharedInterests || []).map(i => <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-turquoise-500/10 text-turquoise border border-turquoise-500/20">{i}</span>)}
                  {(m.sharedBrands || []).map(b => <span key={b} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">🔗 {b}</span>)}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => openProfile(m.id)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"><User className="w-3 h-3" /> Profile</button>
                  <button onClick={() => onNavigateToView?.("chat")} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"><MessageSquare className="w-3 h-3" /> Chat</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-2">🟢 Online Now ({online.length})</h3>
          <div className="flex flex-wrap gap-2">
            {online.map(u => (
              <button key={u.id} onClick={() => openProfile(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/50 hover:border-turquoise-500/40 text-[10px] font-mono">
                <span>{u.avatarEmoji || "🐦"}</span> {u.nickname}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start sm:items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#0a0b12] p-5 shadow-2xl relative max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selected.avatarEmoji}</span>
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-100">{selected.nickname}</h3>
                <p className="text-[10px] text-slate-400 font-mono">{selected.bio}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {selected.interests.map(i => <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-turquoise-500/10 text-turquoise border border-turquoise-500/20">{i}</span>)}
            </div>

            <h4 className="mt-4 text-[10px] font-mono text-slate-400 uppercase tracking-wider">📰 Their Feed</h4>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {!selected.feed || selected.feed.length === 0 ? (
                <p className="text-[10px] text-slate-500 font-mono">No shared posts yet.</p>
              ) : selected.feed.map((f: any) => (
                <div key={f.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/50">
                  <span className="text-[9px] font-mono text-turquoise uppercase">{f.kind}</span>
                  <p className="text-[11px] text-slate-200">{f.title || f.body}</p>
                  {f.experience && <p className="text-[10px] text-slate-400 mt-1">✨ {f.experience}</p>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => onNavigateToView?.("chat")} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-xs font-bold"><MessageSquare className="w-3.5 h-3.5" /> Chat</button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
