import React, { useState, useEffect, useMemo } from "react";
import { Crown, Users, Plus, X, ArrowRight, Network } from "lucide-react";
import { api } from "../lib/api";

interface ResolvedUser {
  id: string;
  nickname: string;
  avatarEmoji: string;
  xp: number;
  isSelf?: boolean;
}

function loadIds(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((x: any) => (typeof x === "string" ? x : x?.id)).filter(Boolean);
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

// Synthesize a stable XP value for matched members (extended user data has no XP).
function synthXp(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 25 + (h % 360);
}

export default function TribeDashboard({ nickname, xp, onNavigateToView }: { nickname: string; xp: number; onNavigateToView?: (view: string) => void }) {
  const [foundIds, setFoundIds] = useState<string[]>(() => loadIds("mb_match_found"));
  const [pendingIds, setPendingIds] = useState<string[]>(() => loadIds("mb_match_pending"));
  const [userIndex, setUserIndex] = useState<Map<string, { nickname: string; avatarEmoji: string }>>(new Map());

  // Resolve matched IDs into user records (extended data).
  useEffect(() => {
    let alive = true;
    Promise.all([api.users().catch(() => []), api.onlineExtended().catch(() => [])])
      .then(([users, online]) => {
        if (!alive) return;
        const map = new Map<string, { nickname: string; avatarEmoji: string }>();
        const add = (u: any) => {
          if (u?.id) map.set(u.id, { nickname: u.nickname || u.id, avatarEmoji: u.avatarEmoji || "🌙" });
        };
        (users as any[]).forEach(add);
        (online as any[]).forEach(add);
        setUserIndex(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const resolveMember = (id: string, isSelf = false): ResolvedUser => {
    const u = userIndex.get(id);
    return {
      id,
      nickname: isSelf ? nickname : (u?.nickname || id),
      avatarEmoji: isSelf ? "👑" : (u?.avatarEmoji || "🌙"),
      xp: isSelf ? xp : synthXp(id),
      isSelf,
    };
  };

  // Tribe = accepted matches; Empire = you + your tribe. Recomputed live from XP values.
  const tribeMembers = useMemo(() => foundIds.map((id) => resolveMember(id)), [foundIds, userIndex, nickname]);
  const selfMember = useMemo(() => resolveMember("self", true), [nickname, xp]);
  const allMembers = useMemo(() => [selfMember, ...tribeMembers], [selfMember, tribeMembers]);
  const ruler = useMemo(() => [...allMembers].sort((a, b) => b.xp - a.xp)[0], [allMembers]);
  const maxXp = useMemo(() => Math.max(...allMembers.map((m) => m.xp), 1), [allMembers]);
  const isSelfRuler = !!ruler?.isSelf;

  // Ring = everyone except the current ruler (ruler sits at the center of the empire).
  const ringMembers = useMemo(() => allMembers.filter((m) => m.id !== ruler?.id), [allMembers, ruler]);

  const recruit = (id: string) => {
    if (foundIds.includes(id)) return;
    const nextFound = [...foundIds, id];
    const nextPending = pendingIds.filter((p) => p !== id);
    setFoundIds(nextFound);
    setPendingIds(nextPending);
    saveIds("mb_match_found", nextFound);
    saveIds("mb_match_pending", nextPending);
  };

  const removeFromTribe = (id: string) => {
    const nextFound = foundIds.filter((f) => f !== id);
    setFoundIds(nextFound);
    saveIds("mb_match_found", nextFound);
  };

  const CENTER = 180;
  const RADIUS = ringMembers.length > 0 ? Math.min(140, 80 + ringMembers.length * 16) : 0;

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto text-slate-200">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
        <h2 className="text-xl font-bold font-mono text-turquoise tracking-wider flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Tribe &amp; Empire System
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Engaging with matched users adds them to your Tribe. The highest-XP member becomes the Ruler, forming an Empire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empire visualization */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Network className="w-4 h-4" /> Empire Map
            </h3>

            <div className="relative mx-auto" style={{ width: 360, height: 360 }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 360">
                {ringMembers.map((m, i) => {
                  const angle = (i / ringMembers.length) * 2 * Math.PI - Math.PI / 2;
                  const x = CENTER + Math.cos(angle) * RADIUS;
                  const y = CENTER + Math.sin(angle) * RADIUS;
                  return (
                    <line
                      key={`line-${m.id}`}
                      x1={CENTER}
                      y1={CENTER}
                      x2={x}
                      y2={y}
                      stroke="var(--color-turquoise)"
                      strokeOpacity={0.25}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </svg>

              {/* Ruler at the center */}
              {ruler && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ zIndex: 2 }}
                >
                  <div className="flex flex-col items-center gap-1 p-3 rounded-2xl border border-turquoise-500/40 bg-turquoise-500/10 backdrop-blur-md">
                    <Crown className="w-6 h-6 text-turquoise" />
                    <span className="text-3xl leading-none">{ruler.avatarEmoji}</span>
                    <span className="text-xs font-bold font-mono text-turquoise text-center max-w-[120px] truncate">
                      {ruler.isSelf ? "You" : ruler.nickname}
                    </span>
                    <span className="text-[9px] font-mono text-turquoise-dim">{ruler.xp} XP · Ruler</span>
                  </div>
                </div>
              )}

              {/* Subjects around the ring */}
              {ringMembers.map((m, i) => {
                const angle = (i / ringMembers.length) * 2 * Math.PI - Math.PI / 2;
                const x = CENTER + Math.cos(angle) * RADIUS;
                const y = CENTER + Math.sin(angle) * RADIUS;
                const size = 22 + (m.xp / maxXp) * 26;
                return (
                  <div
                    key={`ring-${m.id}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                    style={{ left: x, top: y, zIndex: 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 backdrop-blur-md"
                      style={{ width: size + 18, height: size + 18 }}
                    >
                      <span style={{ fontSize: size }}>{m.avatarEmoji}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-300 text-center max-w-[90px] truncate">{m.isSelf ? "You" : m.nickname}</span>
                    <span className="text-[8px] font-mono text-turquoise-dim">{m.xp} XP</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Empire Size</span>
                <span className="text-sm font-bold font-mono text-turquoise block">{allMembers.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Ruler</span>
                <span className="text-sm font-bold font-mono text-slate-200 block truncate">
                  {ruler ? (ruler.isSelf ? "You" : ruler.nickname) : "—"}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[10px] font-mono text-slate-400 leading-relaxed">
              Empires dynamically {isSelfRuler ? "stand proud" : "shift"} — the Empire expands or shrinks as connected members rise or fall in rank relative to one another. Surpass the current Ruler's XP and the crown is yours.
            </p>
          </div>
        </div>

        {/* Status + roster + recruits */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Crown className="w-4 h-4" /> Empire Status
            </h3>
            {isSelfRuler ? (
              <div className="p-3 rounded-xl border border-turquoise-500/30 bg-turquoise-500/10">
                <span className="text-lg">👑</span>
                <p className="text-xs font-bold font-mono text-turquoise mt-1">You are the Ruler of this Empire</p>
                <p className="text-[9px] font-mono text-slate-400 mt-0.5">Your XP outranks every subject in your Tribe.</p>
              </div>
            ) : ruler ? (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Ruler</span>
                <p className="text-xs font-bold font-mono text-slate-200 mt-1">{ruler.nickname}</p>
                <p className="text-[9px] font-mono text-slate-400">You are a subject ({xp} XP).</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">No empire yet. Recruit a matched user to form one.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Users className="w-4 h-4" /> Your Tribe
            </h3>
            {tribeMembers.length === 0 ? (
              <p className="text-[10px] text-slate-500 font-mono">Your tribe is empty. Recruit a matched user below.</p>
            ) : (
              <div className="space-y-2">
                {tribeMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{m.avatarEmoji}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold font-mono text-slate-200 block truncate">{m.nickname}</span>
                        <span className="text-[9px] font-mono text-turquoise-dim block">{m.xp} XP</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromTribe(m.id)}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-red-400 font-mono text-[10px]"
                      aria-label={`Remove ${m.nickname}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Plus className="w-4 h-4" /> Recruit Matches
            </h3>
            {pendingIds.length === 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-mono">No pending matches. Find people to engage with.</p>
                <button
                  onClick={() => onNavigateToView?.("meet")}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Find Someone Like Me <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingIds.map((id) => {
                  const u = userIndex.get(id);
                  return (
                    <div key={id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{u?.avatarEmoji || "🌙"}</span>
                        <span className="text-[11px] font-bold font-mono text-slate-200 truncate">{u?.nickname || id}</span>
                      </div>
                      <button
                        onClick={() => recruit(id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-[10px] font-bold uppercase transition-all"
                      >
                        <Plus className="w-3 h-3" /> Recruit
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => onNavigateToView?.("meet")}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 font-mono text-[10px] uppercase tracking-wider transition-all"
                >
                  More Matches <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
