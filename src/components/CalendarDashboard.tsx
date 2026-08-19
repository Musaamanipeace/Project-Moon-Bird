import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Moon, ArrowUpRight } from "lucide-react";
import { getLunarStatus, getMoonPhaseDetails, MoonPhase, SYNODIC_MONTH } from "../lib/lunar";
import { AstroEvent } from "../types";

interface CalendarDashboardProps {
  onNavigateToView?: (view: string) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Phases that count as "moon-phase dates" for the highlight toggle. */
const KEY_PHASE_CODES = ["new-moon", "first-quarter", "full-moon", "last-quarter"];

/** Local YYYY-MM-DD key, matching the date format returned by GET /api/events. */
function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarDashboard({ onNavigateToView }: CalendarDashboardProps) {
  const today = new Date();

  // Grid month (defaults to the current month)
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());

  // Spec toggles
  const [showEvents, setShowEvents] = useState(true);
  const [highlightPhaseDates, setHighlightPhaseDates] = useState(true);

  // Scheduled events pulled from the backend registry
  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/events")
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Calendar events fetch failed:", err);
        if (!cancelled) setEventsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Index events by their calendar date for O(1) day lookups
  const eventsByDate = useMemo(() => {
    const map: Record<string, AstroEvent[]> = {};
    events.forEach(evt => {
      const key = (evt.date || "").slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [events]);

  // Legend entries derived straight from the lunar engine (one per phase, in cycle order)
  const legendPhases = useMemo<MoonPhase[]>(() => {
    const seen = new Set<string>();
    const ordered: MoonPhase[] = [];
    for (let age = 0; age < SYNODIC_MONTH; age += 0.25) {
      const phase = getMoonPhaseDetails(age);
      if (!seen.has(phase.code)) {
        seen.add(phase.code);
        ordered.push(phase);
      }
    }
    return ordered;
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const monthEventCount = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return events.filter(evt => (evt.date || "").startsWith(prefix)).length;
  }, [events, viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const goCurrentMonth = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const toggleClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
      active
        ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
    }`;

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">

      {/* Header */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-turquoise-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              <span>Calendar</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">
              Maps moon phases onto dates. Toggle scheduled events on and off, and toggle highlighted moon-phase dates.
            </p>
          </div>
          {onNavigateToView && (
            <button
              type="button"
              onClick={() => onNavigateToView("dial")}
              className="px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 self-start shrink-0"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Open Moondial</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </section>

      {/* Toolbar: month navigation + spec toggles */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-turquoise hover:border-turquoise-500 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <button
              type="button"
              onClick={goCurrentMonth}
              className="text-[9px] font-mono uppercase tracking-wider text-slate-500 hover:text-turquoise transition-colors"
            >
              Jump to current month
            </button>
          </div>

          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Next month"
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-turquoise hover:border-turquoise-500 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            aria-pressed={showEvents}
            onClick={() => setShowEvents(v => !v)}
            className={toggleClass(showEvents)}
          >
            <CalendarDays className="w-3 h-3" />
            <span>Show events: {showEvents ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            aria-pressed={highlightPhaseDates}
            onClick={() => setHighlightPhaseDates(v => !v)}
            className={toggleClass(highlightPhaseDates)}
          >
            <Moon className="w-3 h-3" />
            <span>Highlight moon-phase dates: {highlightPhaseDates ? "On" : "Off"}</span>
          </button>

          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider ml-auto">
            {eventsError
              ? "Event registry offline"
              : `${monthEventCount} event${monthEventCount === 1 ? "" : "s"} this month`}
          </span>
        </div>
      </section>

      {/* Monthly grid */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DAY_NAMES.map(name => (
            <div key={name} className="text-center text-[9px] font-mono text-slate-500 uppercase tracking-wider py-2">
              {name}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[76px] sm:min-h-[96px] rounded-xl border border-slate-800/40 bg-slate-950/20"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = toDateKey(viewYear, viewMonth, day);
            // Sample at local noon so the phase reflects the whole day.
            const status = getLunarStatus(new Date(viewYear, viewMonth, day, 12, 0, 0));
            const phase = status.phase;
            const isKeyPhase = KEY_PHASE_CODES.includes(phase.code);
            const isHighlighted = highlightPhaseDates && isKeyPhase;
            const isToday = dateKey === todayKey;
            const dayEvents = eventsByDate[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`min-h-[76px] sm:min-h-[96px] rounded-xl border p-1.5 sm:p-2 flex flex-col gap-1 transition-all ${
                  isToday
                    ? "border-turquoise-500 bg-turquoise-500/10"
                    : isHighlighted
                      ? "border-turquoise-500/50 bg-turquoise-500/5 ring-1 ring-turquoise-500/50"
                      : "border-slate-800 bg-slate-950/40"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-[10px] sm:text-xs font-mono font-bold ${isToday ? "text-turquoise" : "text-slate-300"}`}>
                    {day}
                  </span>
                  <span
                    className="text-sm sm:text-base leading-none"
                    title={`${phase.name} — ${status.illumination}% illuminated`}
                    aria-label={phase.name}
                  >
                    {phase.emoji}
                  </span>
                </div>

                {isHighlighted && (
                  <span className="self-start px-1.5 py-0.5 rounded-full border border-turquoise-500/60 bg-turquoise-500/10 text-turquoise-bright font-mono text-[7.5px] sm:text-[8px] font-bold uppercase tracking-wider">
                    {phase.name}
                  </span>
                )}

                {showEvents && dayEvents.length > 0 && (
                  <div className="mt-auto space-y-0.5">
                    {dayEvents.slice(0, 2).map(evt => (
                      <div
                        key={evt.id}
                        title={evt.title}
                        className="px-1 py-0.5 rounded border border-turquoise-900/40 bg-turquoise-500/10 text-turquoise font-mono text-[7.5px] sm:text-[9px] truncate"
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="block text-[7.5px] sm:text-[9px] font-mono text-slate-500">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Legend */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-5 space-y-3">
        <h3 className="text-[10px] font-bold font-mono text-turquoise uppercase tracking-widest">
          Phase Indicator Legend
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {legendPhases.map(phase => (
            <div
              key={phase.code}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border bg-slate-950/40 ${
                KEY_PHASE_CODES.includes(phase.code) ? "border-turquoise-500/40" : "border-slate-800"
              }`}
            >
              <span className="text-base leading-none">{phase.emoji}</span>
              <span className="text-[9px] font-mono text-slate-300 uppercase tracking-wider leading-tight">
                {phase.name}
              </span>
            </div>
          ))}
        </div>

        <ul className="space-y-1 pt-2 border-t border-slate-800">
          <li className="text-[9.5px] font-mono text-slate-400 leading-relaxed">
            <span className="text-turquoise">Emoji</span> — the moon phase mapped onto that date.
          </li>
          <li className="text-[9.5px] font-mono text-slate-400 leading-relaxed">
            <span className="text-turquoise">Turquoise ring + badge</span> — New Moon, Full Moon, or Quarter date, shown while "Highlight moon-phase dates" is on.
          </li>
          <li className="text-[9.5px] font-mono text-slate-400 leading-relaxed">
            <span className="text-turquoise">Chips</span> — scheduled events on that date, shown while "Show events" is on.
          </li>
          <li className="text-[9.5px] font-mono text-slate-400 leading-relaxed">
            <span className="text-turquoise">Solid turquoise cell</span> — today.
          </li>
        </ul>

        {onNavigateToView && (
          <button
            type="button"
            onClick={() => onNavigateToView("events")}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-turquoise hover:text-turquoise-bright transition-colors flex items-center gap-1"
          >
            <span>Browse the full event registry</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </section>
    </div>
  );
}
