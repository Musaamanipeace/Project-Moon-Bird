import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, Sunrise, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { getMoonStatus } from "@/lib/lunar";

interface AltAzPoint {
  altitude: number;
  azimuth: number;
}

interface ClockResponse {
  current: AltAzPoint;
  path: AltAzPoint[];
  rising: boolean;
}

interface PhaseInfo {
  age: number;
  illumination: number;
  phase: string;
  phaseCode: string;
  phaseEmoji: string;
}

// Convert altitude/azimuth (degrees) to SVG x/y within a dome of given radius.
// North is at the top (12 o'clock). Altitude 0 = horizon (edge), 90 = zenith (center).
function skyDomeXY(altitude: number, azimuth: number, cx: number, cy: number, r: number) {
  const angle = ((azimuth - 90) * Math.PI) / 180;
  const altClamped = Math.max(0, Math.min(90, altitude));
  const dist = r * (1 - altClamped / 90);
  return {
    x: cx + dist * Math.cos(angle),
    y: cy - dist * Math.sin(angle),
  };
}

export default function LunarClock() {
  const [clock, setClock] = useState<ClockResponse | null>(null);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentHour = now.getUTCHours();
  const cx = 180;
  const cy = 180;
  const r = 150;

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<ClockResponse>("/lunar/clock")
      .then((d) => {
        if (!active) return;
        setClock(d);
        const base = getMoonStatus();
        setPhaseInfo({
          age: base.age,
          illumination: base.illumination,
          phase: base.phase,
          phaseCode: base.phaseCode,
          phaseEmoji: base.phaseEmoji,
        });
      })
      .catch(() => {
        // API unavailable — use client-side calculations as fallback.
        if (!active) return;
        const fallback = getClockFallback();
        setClock(fallback);
        const base = getMoonStatus();
        setPhaseInfo({
          age: base.age,
          illumination: base.illumination,
          phase: base.phase,
          phaseCode: base.phaseCode,
          phaseEmoji: base.phaseEmoji,
        });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-moon flex items-center gap-2">
          <Clock className="h-5 w-5 text-aurora" /> Lunar Clock
        </h3>
        <span className="text-xs text-moon-dim">UTC · {now.toISOString().slice(11, 16)}</span>
      </div>

      {loading && <p className="text-sm text-moon-dim">Positioning the moon…</p>}

      {clock && (
        <div className="relative mx-auto w-fit">
          {/* Sky dome background */}
          <svg width={360} height={370} viewBox="0 0 360 370" className="select-none">
            {/* Horizon glow */}
            <ellipse cx={cx} cy={cy + r + 4} rx={r + 8} ry={10} fill="rgba(139,123,255,0.08)" />

            {/* Dome arc — sky gradient */}
            <path
              d={`M ${cx - r},${cy} A ${r} ${r} 0 0 1 ${cx + r},${cy}`}
              fill="url(#skyGrad)"
              stroke="rgba(139,123,255,0.15)"
              strokeWidth={1}
            />

            {/* Sky gradient definition */}
            <defs>
              <linearGradient id="skyGrad" x1="0" y1={cy + r} x2="0" y2={cy - r}>
                <stop offset="0%" stopColor="rgba(10,12,28,0.6)" />
                <stop offset="50%" stopColor="rgba(17,20,48,0.3)" />
                <stop offset="100%" stopColor="rgba(139,123,255,0.05)" />
              </linearGradient>
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(233,236,255,0.3)" />
                <stop offset="100%" stopColor="rgba(139,123,255,0)" />
              </radialGradient>
            </defs>

            {/* Horizon line */}
            <line
              x1={cx - r - 10}
              y1={cy + r}
              x2={cx + r + 10}
              y2={cy + r}
              stroke="rgba(139,123,255,0.2)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Zenith marker */}
            <circle cx={cx} cy={cy - r} r={2} fill="rgba(139,123,255,0.3)" />
            <text x={cx} y={cy - r + 14} textAnchor="middle" fill="rgba(170,176,216,0.5)" fontSize={9} fontFamily="Space Grotesk, sans-serif">
              Z
            </text>

            {/* Cardinal directions */}
            <text x={cx} y={cy - r + 2} textAnchor="middle" fill="#7af0d0" fontSize={10} fontWeight={600} fontFamily="Space Grotesk, sans-serif">
              N
            </text>
            <text x={cx + r + 14} y={cy + 4} textAnchor="middle" fill="#7af0d0" fontSize={10} fontWeight={600} fontFamily="Space Grotesk, sans-serif">
              E
            </text>
            <text x={cx} y={cy + r + 18} textAnchor="middle" fill="#7af0d0" fontSize={10} fontWeight={600} fontFamily="Space Grotesk, sans-serif">
              S
            </text>
            <text x={cx - r - 14} y={cy + 4} textAnchor="middle" fill="#7af0d0" fontSize={10} fontWeight={600} fontFamily="Space Grotesk, sans-serif">
              W
            </text>

            {/* Hour markers on the horizon */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((az) => {
              const pos = skyDomeXY(0, az, cx, cy - r, r);
              return (
                <circle key={`hm-${az}`} cx={pos.x} cy={pos.y} r={1.5} fill="rgba(170,176,216,0.3)" />
              );
            })}

            {/* Moon path — the trajectory arc */}
            {clock.path && clock.path.length > 1 && (
              <motion.path
                d={buildPathD(clock.path, cx, cy, r)}
                fill="none"
                stroke="rgba(139,123,255,0.25)"
                strokeWidth={2}
                strokeDasharray="5 5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
            )}

            {/* Current moon position glow */}
            {clock.current && (() => {
              const p = skyDomeXY(clock.current.altitude, clock.current.azimuth, cx, cy - r, r);
              return (
                <circle key="moon-glow" cx={p.x} cy={p.y} r={30} fill="url(#moonGlow)" opacity={0.6} />
              );
            })()}

            {/* Moon disc (phase emoji rendered as text) */}
            {clock.current && (() => {
              const p = skyDomeXY(clock.current.altitude, clock.current.azimuth, cx, cy - r, r);
              return (
                <g key="moon-dot">
                  <circle cx={p.x} cy={p.y} r={6} fill="#e9ecff" opacity={0.9} />
                  <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={14} dominantBaseline="middle">
                    {phaseInfo?.phaseEmoji ?? "🌙"}
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Naked-Eye Visibility Banner */}
          {clock.current && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-violet-glow/20 bg-obsidian-soft/60 px-4 py-2 text-xs font-medium text-moon">
              {(() => {
                const alt = clock.current.altitude;
                const illum = phaseInfo?.illumination ?? 0;
                const isAboveHorizon = alt > 0;
                const isNewMoonGlare = illum < 1.5;

                if (!isAboveHorizon) {
                  return (
                    <span className="flex items-center gap-1.5 text-moon-dim">
                      <span className="h-2 w-2 rounded-full bg-rose-500/70 animate-pulse" />
                      Below Horizon (Altitude: {alt.toFixed(1)}°) · Not Visible
                    </span>
                  );
                } else if (isNewMoonGlare) {
                  return (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      Above Horizon · Obscured by New Moon Solar Glare
                    </span>
                  );
                } else {
                  return (
                    <span className="flex items-center gap-1.5 text-aurora">
                      <span className="h-2 w-2 rounded-full bg-aurora animate-pulse" />
                      👁️ Visible to Naked Eye ({alt.toFixed(1)}° Altitude)
                    </span>
                  );
                }
              })()}
            </div>
          )}

          {/* Side panel with data */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <Sunrise className="mx-auto h-4 w-4 text-aurora mb-1" />
              <div className="text-moon-dim">Altitude</div>
              <div className="font-display text-sm text-moon mt-0.5">
                {clock.current
                  ? `${clock.current.altitude.toFixed(1)}°`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <MapPin className="mx-auto h-4 w-4 text-violet-glow mb-1" />
              <div className="text-moon-dim">Azimuth</div>
              <div className="font-display text-sm text-moon mt-0.5">
                {clock.current
                  ? `${clock.current.azimuth.toFixed(0)}°`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <Clock className="mx-auto h-4 w-4 text-rose-glow mb-1" />
              <div className="text-moon-dim">Phase</div>
              <div className="font-display text-sm text-moon mt-0.5">
                {phaseInfo?.phaseCode
                  ? phaseInfo.phaseEmoji + " " + phaseInfo.phaseCode
                  : "—"}
              </div>
            </div>
          </div>

          {/* 24h mini chart */}
          {clock.path && clock.path.length > 0 && (
            <div className="mt-4 rounded-xl border border-violet-glow/15 bg-obsidian-soft/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-moon-dim mb-2">
                24-hour path — altitude
              </div>
              <svg width="100%" height={60} viewBox="0 0 340 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(122,240,208,0.3)" />
                    <stop offset="100%" stopColor="rgba(122,240,208,0)" />
                  </linearGradient>
                </defs>
                {/* Horizon baseline */}
                <line x1={0} y1={55} x2={340} y2={55} stroke="rgba(139,123,255,0.15)" strokeWidth={1} />
                {/* Area fill under the curve */}
                <polygon
                  points={
                    `0,55 ` +
                    clock.path
                      .map((p, i) => {
                        const x = (i / (clock.path.length - 1)) * 340;
                        const altClamped = Math.max(0, Math.min(90, p.altitude));
                        const y = 55 - (altClamped / 90) * 50;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` 340,55`
                  }
                  fill="url(#altGrad)"
                />
                {/* Altitude curve */}
                <polyline
                  points={clock.path
                    .map((p, i) => {
                      const x = (i / (clock.path.length - 1)) * 340;
                      const altClamped = Math.max(0, Math.min(90, p.altitude));
                      const y = 55 - (altClamped / 90) * 50;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#7af0d0"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                {/* Current time marker */}
                <line
                  x1={(currentHour / 24) * 340}
                  y1={0}
                  x2={(currentHour / 24) * 340}
                  y2={60}
                  stroke="rgba(233,236,255,0.4)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle cx={(currentHour / 24) * 340} cy={0} r={2} fill="#e9ecff" />
                {/* Hour labels */}
                {[0, 6, 12, 18, 24].map((h) => (
                  <text
                    key={h}
                    x={(h / 24) * 340}
                    y={59}
                    textAnchor="middle"
                    fill="rgba(170,176,216,0.5)"
                    fontSize={8}
                    fontFamily="Space Grotesk, sans-serif"
                  >
                    {String(h).padStart(2, "0")}h
                  </text>
                ))}
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildPathD(path: AltAzPoint[], cx: number, cy: number, r: number) {
  return path
    .map((p, i) => {
      const pos = skyDomeXY(p.altitude, p.azimuth, cx, cy - r, r);
      return `${i === 0 ? "M" : "L"} ${pos.x},${pos.y}`;
    })
    .join(" ");
}

// Client-side fallback: compute a simple 24h path when the backend is unavailable.
function getClockFallback(): ClockResponse {
  const now = new Date();
  const position = getFallbackPosition(now);
  const path: AltAzPoint[] = [];
  for (let h = 0; h <= 24; h++) {
    const t = new Date(now.getTime() + h * 3600000);
    path.push(getFallbackPosition(t));
  }
  return { current: position, path, rising: position.altitude < 0 };
}

function getFallbackPosition(t: Date): AltAzPoint {
  const hour = t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600;
  // Simple sinusoidal altitude model: transit at 21:00 UTC (9pm), width ≈ 10h above horizon
  const transitHour = 21;
  const halfWidth = 5;
  const hoursFromTransit = hour - transitHour;
  const altitude =
    50 * Math.cos((hoursFromTransit / halfWidth) * Math.PI / 2);

  // Approximate solar-relative azimuth: moon is ~180° from sun at opposition (full)
  // and moves eastward ~12°/day. We simplify to a fixed offset plus time-of-day sweep.
  const azimuth = ((hour * 15 + 180) % 360 + 360) % 360;

  return { altitude: Math.round(altitude * 100) / 100, azimuth: Math.round(azimuth * 100) / 100 };
}
