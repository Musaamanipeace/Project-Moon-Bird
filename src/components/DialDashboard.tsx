import React, { useEffect, useState } from "react";
import {
  Moon,
  MapPin,
  Coins,
  Trophy,
  Sparkles,
  Megaphone,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { getLunarStatus, SYNODIC_MONTH } from "../lib/lunar";
import { AstroEvent, Challenge } from "../types";

interface DialDashboardProps {
  locationText: string;
  birthDate: string;
  nickname: string;
  xp: number;
  onAddXp: (amount: number) => void;
}

/** Bordered container style used by every panel of the twilight Moondial. */
const PANEL = "rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md";

/** Placeholder featured campaigns (same shape family as the advertiser ad cards). */
const FEATURED_ADS: Array<{ title: string; brand: string; tagline: string }> = [
  {
    title: "Celestial Grind Coffee",
    brand: "AstroVibe Espresso",
    tagline: "Micro-roasted beans brewed for long observation nights.",
  },
  {
    title: "Quantum Nebula Telescope",
    brand: "Stellar Optics Ltd",
    tagline: "Deep-sky clarity with solar-wind shielded optics.",
  },
  {
    title: "Dome-Grown Matcha",
    brand: "Orion Matcha Tea",
    tagline: "Clean caffeine, zero jitters, grown under glass.",
  },
];

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  // Midday anchor keeps the derived phase stable regardless of timezone.
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Lit-limb path of the moon sphere: the outer limb plus an elliptical
 * terminator, which is what makes the disc read as a shaded 3D sphere.
 */
function getLitLimbPath(age: number, cx: number, cy: number, r: number): string {
  if (age < 0.35 || age > SYNODIC_MONTH - 0.35) return ""; // fully dark near New Moon
  const phi = (age / SYNODIC_MONTH) * 2 * Math.PI;
  const illum = (1 - Math.cos(phi)) / 2; // 0 -> 1
  const isWaxing = age < SYNODIC_MONTH / 2;

  let termRx = r * Math.abs(1 - 2 * illum);
  if (termRx < 3) termRx = 3; // keep the terminator curved, never a flat slice

  const outerSweep = isWaxing ? 1 : 0;
  const termSweep = isWaxing ? (illum > 0.5 ? 1 : 0) : (illum > 0.5 ? 0 : 1);

  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${termRx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
}

export default function DialDashboard({ locationText, birthDate, nickname, xp, onAddXp }: DialDashboardProps) {
  // ---- Interactive lunar clock date control ----
  const [activeDateStr, setActiveDateStr] = useState(() => toDateInputValue(new Date()));
  const [hoveringMoon, setHoveringMoon] = useState(false);
  const [pinnedTooltip, setPinnedTooltip] = useState(false);

  // ---- Flanking panel data ----
  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data.slice(0, 4) : []);
      })
      .catch((err) => console.error("Moondial events fetch failed:", err))
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setChallenges(Array.isArray(data) ? data.slice(0, 4) : []);
      })
      .catch((err) => console.error("Moondial challenges fetch failed:", err))
      .finally(() => {
        if (!cancelled) setChallengesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Derived lunar state for the selected date ----
  const activeDate = fromDateInputValue(activeDateStr);
  const lunarStatus = getLunarStatus(activeDate);
  const illuminationPct = Math.round(lunarStatus.illumination);
  const isToday = activeDateStr === toDateInputValue(new Date());
  const showTooltip = hoveringMoon || pinnedTooltip;

  const shiftDays = (delta: number) => {
    const next = fromDateInputValue(activeDateStr);
    next.setDate(next.getDate() + delta);
    setActiveDateStr(toDateInputValue(next));
  };

  // ---- Essential user stats (level thresholds mirror App) ----
  const level = xp < 100 ? 1 : xp < 300 ? 2 : xp < 600 ? 3 : 4;
  const tierFloor = level === 1 ? 0 : level === 2 ? 100 : level === 3 ? 300 : 600;
  const nextTierAt = level === 1 ? 100 : level === 2 ? 300 : level === 3 ? 600 : null;
  const tierProgress = nextTierAt
    ? Math.min(100, Math.max(0, Math.round(((xp - tierFloor) / (nextTierAt - tierFloor)) * 100)))
    : 100;

  // ---- Lunar clock geometry ----
  const CX = 120;
  const CY = 120;
  const MOON_R = 74;
  const RING_R = 106;
  const litPath = getLitLimbPath(lunarStatus.age, CX, CY, MOON_R);
  const markerAngle = (lunarStatus.age / SYNODIC_MONTH) * 2 * Math.PI - Math.PI / 2;
  const markerX = CX + RING_R * Math.cos(markerAngle);
  const markerY = CY + RING_R * Math.sin(markerAngle);

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "linear-gradient(160deg, #1a1b3a, #0c0d1f 60%, #0a0b14)" }}
    >
      {/* Soft lunar glow over the subdued evening sky */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(175,238,238,0.12), rgba(175,238,238,0.04) 55%, transparent 75%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(63,187,187,0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-200">

        {/* HERO */}
        <section className={`${PANEL} p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] block">
                Lunar Clock &amp; Calendar
              </span>
              <h2 className="text-lg font-bold font-mono text-turquoise flex items-center gap-2">
                <Moon className="w-4 h-4 text-turquoise-dim" />
                <span>Moondial</span>
              </h2>
              <p className="text-[10.5px] font-mono text-slate-400">
                Twilight sky reading for <span className="text-slate-300">{nickname}</span> · {locationText}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/50">
              <span className="text-xl leading-none">{lunarStatus.phase.emoji}</span>
              <div className="leading-tight">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Tonight</span>
                <span className="text-xs font-bold font-mono text-slate-200">{lunarStatus.phase.name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* CLOCK + FLANKING PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* CENTREPIECE: 3D INTERACTIVE LUNAR CLOCK */}
          <section className={`${PANEL} p-5 lg:col-span-6 lg:order-2 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h3 className="text-[11px] font-bold font-mono text-turquoise uppercase tracking-widest">
                3D Interactive Lunar Clock
              </h3>
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                {isToday ? "Live date" : "Simulated date"}
              </span>
            </div>

            {/* Date control */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => shiftDays(-1)}
                title="Previous day"
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-turquoise hover:border-turquoise-500/40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/60">
                <CalendarDays className="w-3.5 h-3.5 text-turquoise-dim" />
                <input
                  type="date"
                  value={activeDateStr}
                  onChange={(e) => setActiveDateStr(e.target.value || toDateInputValue(new Date()))}
                  className="bg-transparent text-xs font-mono text-turquoise focus:outline-none"
                />
              </div>

              <button
                onClick={() => shiftDays(1)}
                title="Next day"
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-turquoise hover:border-turquoise-500/40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveDateStr(toDateInputValue(new Date()))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  isToday
                    ? "border border-slate-800 bg-slate-950/60 text-slate-500"
                    : "bg-turquoise-500 text-slate-950 hover:bg-turquoise-400"
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Today</span>
              </button>
            </div>

            {/* The sphere */}
            <div className="relative flex items-center justify-center">
              {showTooltip && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-3 py-2 rounded-xl border border-turquoise-500/40 bg-slate-950/95 shadow-2xl text-center">
                  <span className="text-[10px] font-mono font-bold text-turquoise uppercase tracking-wider block">
                    {lunarStatus.phase.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 block">
                    {illuminationPct}% illuminated
                  </span>
                </div>
              )}

              <div
                onMouseEnter={() => setHoveringMoon(true)}
                onMouseLeave={() => setHoveringMoon(false)}
                onClick={() => setPinnedTooltip((v) => !v)}
                title={`${lunarStatus.phase.name} · ${illuminationPct}% illuminated`}
                className="w-full max-w-[340px] aspect-square cursor-pointer select-none"
              >
                <svg viewBox="0 0 240 240" className="w-full h-full" role="img">
                  <defs>
                    <radialGradient id="dial-lit-grad" cx="36%" cy="30%" r="78%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                      <stop offset="55%" stopColor="#e6f7f7" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#8fb4b4" stopOpacity="0.85" />
                    </radialGradient>
                    <radialGradient id="dial-sphere-shadow" cx="50%" cy="50%" r="50%">
                      <stop offset="58%" stopColor="#000000" stopOpacity="0" />
                      <stop offset="88%" stopColor="#000000" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                    </radialGradient>
                    <radialGradient id="dial-halo" cx="50%" cy="50%" r="50%">
                      <stop offset="55%" stopColor="#afeeee" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#afeeee" stopOpacity="0" />
                    </radialGradient>
                    <clipPath id="dial-moon-clip">
                      <circle cx={CX} cy={CY} r={MOON_R} />
                    </clipPath>
                  </defs>

                  {/* Soft halo */}
                  <circle cx={CX} cy={CY} r={RING_R} fill="url(#dial-halo)" />

                  {/* Synodic cycle ring (the clock face) */}
                  <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  {Array.from({ length: 8 }).map((_, i) => {
                    const ang = (i / 8) * 2 * Math.PI - Math.PI / 2;
                    const inner = RING_R - 7;
                    return (
                      <line
                        key={i}
                        x1={CX + inner * Math.cos(ang)}
                        y1={CY + inner * Math.sin(ang)}
                        x2={CX + RING_R * Math.cos(ang)}
                        y2={CY + RING_R * Math.sin(ang)}
                        stroke="#334155"
                        strokeWidth={i % 2 === 0 ? 2.5 : 1.5}
                        opacity={i % 2 === 0 ? 0.9 : 0.5}
                      />
                    );
                  })}
                  <text x={CX} y="12" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">NEW</text>
                  <text x={CX} y="236" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">FULL</text>
                  <text x="234" y={CY + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">1Q</text>
                  <text x="6" y={CY + 3} textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">3Q</text>

                  {/* Cycle position marker */}
                  <circle cx={markerX} cy={markerY} r="5" fill="#afeeee" opacity="0.95" />
                  <circle cx={markerX} cy={markerY} r="9" fill="#afeeee" opacity="0.22" />

                  {/* Dark side of the sphere */}
                  <circle cx={CX} cy={CY} r={MOON_R} fill="#12142a" stroke="#232744" strokeWidth="1.5" />

                  {/* Illuminated limb with the phase terminator */}
                  {litPath && (
                    <path
                      d={litPath}
                      fill="url(#dial-lit-grad)"
                      className="transition-all duration-500"
                      style={{ filter: "drop-shadow(0px 0px 10px rgba(175,238,238,0.35))" }}
                    />
                  )}

                  {/* Surface detail */}
                  <g clipPath="url(#dial-moon-clip)" opacity="0.35" pointerEvents="none">
                    <circle cx="98" cy="90" r="12" fill="#0f172a" opacity="0.35" />
                    <circle cx="95" cy="87" r="6" fill="#0b1120" opacity="0.4" />
                    <circle cx="141" cy="112" r="15" fill="#0f172a" opacity="0.3" />
                    <circle cx="137" cy="108" r="8" fill="#0b1120" opacity="0.35" />
                    <circle cx="112" cy="152" r="13" fill="#0f172a" opacity="0.32" />
                    <circle cx="150" cy="66" r="7" fill="#0f172a" opacity="0.3" />
                    <circle cx="80" cy="140" r="6" fill="#0f172a" opacity="0.28" />
                  </g>

                  {/* Spherical depth shading */}
                  <circle
                    cx={CX}
                    cy={CY}
                    r={MOON_R}
                    fill="url(#dial-sphere-shadow)"
                    pointerEvents="none"
                  />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={MOON_R}
                    fill="none"
                    stroke="#afeeee"
                    strokeWidth="0.8"
                    opacity="0.18"
                    pointerEvents="none"
                  />
                </svg>
              </div>
            </div>

            {/* Readout */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Phase</span>
                <span className="text-[11px] font-bold font-mono text-slate-200 block mt-0.5">
                  {lunarStatus.phase.name}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Illumination</span>
                <span className="text-[11px] font-bold font-mono text-turquoise block mt-0.5">
                  {illuminationPct}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Cycle Age</span>
                <span className="text-[11px] font-bold font-mono text-slate-200 block mt-0.5">
                  {lunarStatus.age.toFixed(1)}d
                </span>
              </div>
            </div>
            <p className="text-[9px] font-mono text-slate-500 text-center">
              Hover or tap the sphere for phase details · use the date control to travel the cycle
            </p>
          </section>

          {/* LEFT FLANK: ESSENTIAL USER STATS */}
          <section className={`${PANEL} p-5 lg:col-span-3 lg:order-1 space-y-3`}>
            <h3 className="text-[11px] font-bold font-mono text-turquoise uppercase tracking-widest border-b border-slate-800/80 pb-2">
              Essential User Stats
            </h3>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-turquoise-dim" />
                Cheese Balance
              </span>
              <span className="text-base font-bold font-mono text-turquoise block">{xp} Cheese</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-turquoise-dim" />
                Community Rank
              </span>
              <span className="text-xs font-bold font-mono text-slate-200 block">Level {level}: Explorer</span>
              <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
                <div className="h-full rounded-full bg-turquoise-500" style={{ width: `${tierProgress}%` }} />
              </div>
              <span className="text-[8.5px] font-mono text-slate-500 block">
                {nextTierAt ? `Next tier at ${nextTierAt} Cheese` : "Top tier reached"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-turquoise-dim" />
                Observation Point
              </span>
              <span className="text-xs font-bold font-mono text-slate-200 block">{locationText}</span>
            </div>
          </section>

          {/* RIGHT FLANK: UPCOMING ASTROLOGICAL / LUNAR EVENTS */}
          <section className={`${PANEL} p-5 lg:col-span-3 lg:order-3 space-y-3`}>
            <h3 className="text-[11px] font-bold font-mono text-turquoise uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-turquoise-dim" />
              Upcoming Events
            </h3>

            {eventsLoading ? (
              <span className="text-[10px] font-mono text-slate-500 block">Syncing sky calendar…</span>
            ) : events.length === 0 ? (
              <span className="text-[10px] font-mono text-slate-500 block">No upcoming events listed.</span>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-mono text-turquoise-dim">{ev.date}</span>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 uppercase shrink-0">
                        {ev.rarity}
                      </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-200 leading-snug">{ev.title}</h4>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* BELOW THE CLOCK: CHALLENGES + FEATURED ADS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* HIGHLIGHTED COMMUNITY CHALLENGES */}
          <section className={`${PANEL} p-5 space-y-3`}>
            <h3 className="text-[11px] font-bold font-mono text-turquoise uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-turquoise-dim" />
              Highlighted Community Challenges
            </h3>

            {challengesLoading ? (
              <span className="text-[10px] font-mono text-slate-500 block">Loading challenge board…</span>
            ) : challenges.length === 0 ? (
              <span className="text-[10px] font-mono text-slate-500 block">No highlighted challenges yet.</span>
            ) : (
              <div className="space-y-2">
                {challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3"
                  >
                    <h4 className="text-[11px] font-bold text-slate-200 leading-snug">{ch.title}</h4>
                    <span className="text-[9px] font-mono font-bold text-turquoise shrink-0">
                      +{ch.rewardXp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* FEATURED USER ADS */}
          <section className={`${PANEL} p-5 space-y-3`}>
            <h3 className="text-[11px] font-bold font-mono text-turquoise uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-turquoise-dim" />
              Featured User Ads
            </h3>

            <div className="space-y-2">
              {FEATURED_ADS.map((ad) => (
                <div key={ad.title} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                  <span className="text-[8.5px] font-mono text-turquoise-dim uppercase block">{ad.brand}</span>
                  <h4 className="text-[11px] font-bold text-slate-200 leading-snug">{ad.title}</h4>
                  <p className="text-[9.5px] font-sans text-slate-400 leading-relaxed">{ad.tagline}</p>
                </div>
              ))}
            </div>
            <span className="text-[9px] font-mono text-slate-500 block">
              Featured campaigns from community advertisers.
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
