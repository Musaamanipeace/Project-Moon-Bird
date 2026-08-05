import React, { useState, useEffect } from "react";
import { Sparkles, MapPin, Compass, Award, Mail, Calendar, HelpCircle, Bot, LogOut, ArrowUpRight, RefreshCw, ArrowLeft, ArrowRight } from "lucide-react";
import { getLunarStatus, getCyclesSinceBirth, getMoonPhaseDetails, getIllumination, SYNODIC_MONTH } from "./lib/lunar";
import { getSeason, getNextActiveEvent, getMoonRiseSetTimes } from "./lib/events";
import StarryBackground from "./components/StarryBackground";
import Header from "./components/Header";
import NotesWorkspace from "./components/NotesWorkspace";
import ProfileDashboard from "./components/ProfileDashboard";
import CalendarDashboard from "./components/CalendarDashboard";
import ChatDashboard from "./components/ChatDashboard";
import EventsDashboard from "./components/EventsDashboard";
import ChallengesDashboard from "./components/ChallengesDashboard";
import DialDashboard from "./components/DialDashboard";
import AdvertiserDashboard from "./components/AdvertiserDashboard";
import AdQuizModule from "./components/AdQuizModule";
import { AstroEvent, Challenge, OnlineUser } from "./types";

function getMoonPhasePath(age: number, radius: number = 40) {
  const k = age / 29.530588853;
  const phi = k * 2 * Math.PI;
  const illumPct = (1 - Math.cos(phi)) / 2;

  if (age < 0.2 || age > 29.33) {
    return ""; // Near New Moon
  }

  const isWaxing = age < 14.765;
  
  // Prevent terminator line from collapsing into a straight slice.
  // Add a subtle spherical warp so it always appears curved, preserving 3D lunar aesthetics.
  let termRadius = radius * Math.abs(1 - 2 * illumPct);
  if (termRadius < 3.5) {
    termRadius = 3.5;
  }

  const outerSweep = isWaxing ? 1 : 0;
  const termSweep = isWaxing ? (illumPct > 0.5 ? 1 : 0) : (illumPct > 0.5 ? 0 : 1);
  
  return `M 50 ${50 - radius} A ${radius} ${radius} 0 0 ${outerSweep} 50 ${50 + radius} A ${termRadius} ${radius} 0 0 ${termSweep} 50 ${50 - radius} Z`;
}

export default function App() {
  const [activeView, setActiveView] = useState<"home" | "dial" | "challenges" | "notes" | "profile" | "advertiser" | "chat">("home");
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // User Authentication State (Frictionless local auto-entry)
  const [isLoggedIn, setIsOnlineLoggedIn] = useState(true);
  const [nickname, setNickname] = useState(() => {
    const saved = localStorage.getItem("mb_nickname");
    if (saved) return saved;
    // Generate standard scaling anonymous identity string
    const randomIdx = Math.floor(Math.random() * 899 + 100);
    const generated = `moonbug_${randomIdx}`;
    localStorage.setItem("mb_nickname", generated);
    localStorage.setItem("mb_profile_id", generated);
    return generated;
  });
  const [locationText, setLocationText] = useState("Nairobi, Kenya");
  const [birthDate, setBirthDate] = useState("1998-05-15");

  // App metrics & XP state (persisted in localStorage)
  const [xp, setXp] = useState(30);

  // Dial Options
  const [showSun, setShowSun] = useState(true);
  const [showRealistic, setShowRealistic] = useState(true);

  // Lists fetched from server
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentEvents, setRecentEvents] = useState<AstroEvent[]>([]);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);

  // Detailed modal integration from home view highlights
  const [selectedHomeItem, setSelectedHomeItem] = useState<{ type: "event" | "challenge"; data: any } | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Newsletter subscribe
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribedMsg, setSubscribedMsg] = useState("");

  // Astronomical status based on system current time / custom selection
  const [isLiveSync, setIsLiveSync] = useState(true);
  const [customDateStr, setCustomDateStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [customTimeStr, setCustomTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [liveTick, setLiveTick] = useState(0);

  // Cycle ahead offset for upcoming lunar phases
  const [cyclePhaseOffset, setCyclePhaseOffset] = useState(0);

  // Track active hovered line descriptions for Toggle lines for info
  const [lineHoverInfo, setLineHoverInfo] = useState<string | null>(null);

  // Local sunrise reference (can be calibrated by user)
  const [sunriseHour, setSunriseHour] = useState(() => {
    const savedLoc = localStorage.getItem("mb_location") || "Nairobi, Kenya";
    if (savedLoc.toLowerCase().includes("kenya") || savedLoc.toLowerCase().includes("kisumu") || savedLoc.toLowerCase().includes("nairobi")) {
      return 6.68; // 6:41 AM (leads to precise 4:12 AM moonrise for today!)
    }
    return 6.0;
  });

  // Sync state if live sync is active
  useEffect(() => {
    if (isLiveSync) {
      const now = new Date();
      setCustomDateStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setCustomTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
  }, [isLiveSync, liveTick]);

  // Keep ticking the live synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTick(t => t + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getActiveDate = () => {
    if (isLiveSync) return new Date();
    const [y, m, d] = customDateStr.split("-").map(Number);
    const [h, min] = customTimeStr.split(":").map(Number);
    if (!y || !m || !d || isNaN(h) || isNaN(min)) return new Date();
    return new Date(y, m - 1, d, h, min, 0, 0);
  };

  const activeDate = getActiveDate();
  const lunarStatus = getLunarStatus(activeDate);

  // 1. Initial boots & listeners
  useEffect(() => {
    // Sync browser online status
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    // Sync theme from localStorage
    const savedTheme = localStorage.getItem("mb_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    // Sync user session details
    const savedName = localStorage.getItem("mb_nickname");
    const savedLoc = localStorage.getItem("mb_location");
    const savedBirth = localStorage.getItem("mb_birthdate");
    const savedXp = localStorage.getItem("mb_xp");

    if (savedName) {
      setNickname(savedName);
      setIsOnlineLoggedIn(true);
      // Trigger login to backend on boot
      fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: savedName, activePhase: getLunarStatus(new Date()).phase.name })
      }).catch(err => console.error("Auto login error:", err));
    }

    if (savedLoc) setLocationText(savedLoc);
    if (savedBirth) setBirthDate(savedBirth);
    if (savedXp) setXp(parseInt(savedXp));

    // Dynamic fetch of events & challenges highlights
    fetch("/api/events")
      .then(res => res.json())
      .then(data => setRecentEvents(data.slice(0, 3)))
      .catch(err => console.error(err));

    fetch("/api/challenges")
      .then(res => res.json())
      .then(data => setRecentChallenges(data.slice(0, 3)))
      .catch(err => console.error(err));

    // SSE Stream connection
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "users_list") {
          setOnlineUsers(payload.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      eventSource.close();
    };
  }, []);

  const handleAddXp = (amount: number) => {
    const nextXp = xp + amount;
    setXp(nextXp);
    localStorage.setItem("mb_xp", nextXp.toString());
  };

  const handleDeductXp = (amount: number) => {
    const nextXp = Math.max(0, xp - amount);
    setXp(nextXp);
    localStorage.setItem("mb_xp", nextXp.toString());
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("mb_theme", nextTheme);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    localStorage.setItem("mb_nickname", nickname.trim());
    localStorage.setItem("mb_location", locationText.trim());
    localStorage.setItem("mb_birthdate", birthDate);
    setIsOnlineLoggedIn(true);

    const loc = locationText.trim().toLowerCase();
    if (loc.includes("kenya") || loc.includes("kisumu") || loc.includes("nairobi")) {
      setSunriseHour(6.68);
    } else {
      setSunriseHour(6.0);
    }

    try {
      await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          activePhase: lunarStatus.phase.name
        })
      });
      handleAddXp(20); // login award
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem("mb_nickname");
    setIsOnlineLoggedIn(false);
    setNickname("");
  };

  const handleNewsletterSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribedMsg("✓ Subscription successful! Connecting skies...");
    setNewsletterEmail("");
    handleAddXp(15);
    setTimeout(() => setSubscribedMsg(""), 4000);
  };

  // Calculate moon birth details dynamically
  const birthDateObj = birthDate ? new Date(birthDate) : null;
  const userBirthAge = birthDateObj ? getLunarStatus(birthDateObj).age : 0;
  const userBirthPhase = birthDateObj ? getMoonPhaseDetails(userBirthAge) : null;
  const birthCycles = birthDateObj ? getCyclesSinceBirth(birthDateObj, activeDate) : 0;

  // Calculate moon rise and set decimal hours for activeDate using the calibrated sunriseHour
  const activeRiseSet = getMoonRiseSetTimes(lunarStatus.age, sunriseHour);
  const mRiseHour = activeRiseSet.riseDecimal;
  const mSetHour = activeRiseSet.setDecimal;

  const getMoonPositionAndPath = (h: number, riseH: number, setH: number) => {
    const x = 1000 - (h / 24) * 1000;
    const visibleDuration = (setH - riseH + 24) % 24;
    const invisibleDuration = 24 - visibleDuration;
    const dt = (h - riseH + 24) % 24;

    let y = 500;
    let isVisible = false;

    if (dt < visibleDuration) {
      const pct = dt / visibleDuration;
      const angle = pct * Math.PI;
      // Sway Northward (upwards, representing North compass sky, so y is less than 500)
      y = 500 - 220 * Math.sin(angle);
      isVisible = true;
    } else {
      const pct = (dt - visibleDuration) / invisibleDuration;
      const angle = pct * Math.PI;
      // Sway Southward (downwards, representing South compass sky, so y is greater than 500)
      y = 500 + 220 * Math.sin(angle);
      isVisible = false;
    }

    return { x, y, isVisible };
  };

  // Generate segments of Moon's path: visible (solid) and invisible (dashed)
  // We use 120 steps for a very high-resolution smooth curve
  const steps = 120;
  const moonVisibleSegments: string[] = [];
  const moonInvisibleSegments: string[] = [];
  
  let currentSegment: [number, number][] = [];
  let currentSegmentIsVisible = false;
  
  for (let i = 0; i <= steps; i++) {
    const h = (i / steps) * 24;
    const pos = getMoonPositionAndPath(h, mRiseHour, mSetHour);
    
    if (i === 0) {
      currentSegmentIsVisible = pos.isVisible;
    }
    
    if (pos.isVisible !== currentSegmentIsVisible) {
      if (currentSegment.length > 0) {
        const pathStr = `M ${currentSegment.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
        if (currentSegmentIsVisible) moonVisibleSegments.push(pathStr);
        else moonInvisibleSegments.push(pathStr);
      }
      // Start contiguous next segment
      const prevH = ((i - 1) / steps) * 24;
      const prevPos = getMoonPositionAndPath(prevH, mRiseHour, mSetHour);
      currentSegment = [[prevPos.x, prevPos.y], [pos.x, pos.y]];
      currentSegmentIsVisible = pos.isVisible;
    } else {
      currentSegment.push([pos.x, pos.y]);
    }
  }
  if (currentSegment.length > 0) {
    const pathStr = `M ${currentSegment.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
    if (currentSegmentIsVisible) moonVisibleSegments.push(pathStr);
    else moonInvisibleSegments.push(pathStr);
  }

  // Active positions based on active progress of the day
  const currentHourDecimal = activeDate.getHours() + activeDate.getMinutes() / 60;
  
  // Directly maps to the 24-hour horizontal number line (Mirror-flipped: 00h is far East / right, 24h is far West / left)
  const activeSunX = 1000 - (currentHourDecimal / 24) * 1000;
  const activeSunY = 500;

  // Daytime check based on calibrated sunrise reference
  const isDaytime = currentHourDecimal >= sunriseHour && currentHourDecimal < (sunriseHour + 12);

  // Moon active positions: sits on its active track, sharing the same horizontal timeline coordinate
  const activeMoonX = 1000 - (currentHourDecimal / 24) * 1000;
  const activeMoonPos = getMoonPositionAndPath(currentHourDecimal, mRiseHour, mSetHour);
  const activeMoonY = activeMoonPos.y;
  const isMoonCurrentlyVisible = activeMoonPos.isVisible;

  const getMoonVisibilityDetails = () => {
    const isAboveHorizon = activeMoonY < 500;
    if (!isAboveHorizon) {
      return {
        status: "INVISIBLE",
        badgeColor: "text-red-400 bg-red-950/20 border-red-900/30",
        reason: "Below Horizon: The Moon is physically on the other side of the Earth, occulted in the South underworld, and completely invisible."
      };
    }

    const illumination = getIllumination(lunarStatus.age);
    const isNearNewMoon = lunarStatus.age < 2.0 || lunarStatus.age > 27.5;

    if (isNearNewMoon) {
      return {
        status: "INVISIBLE",
        badgeColor: "text-amber-500 bg-amber-950/20 border-amber-900/30",
        reason: `New Moon Glare: Though above the horizon, the Moon is in New Moon phase and extremely close to the Sun's path. Solar glare completely washes it out.`
      };
    }

    if (isDaytime) {
      if (illumination < 15) {
        return {
          status: "INVISIBLE",
          badgeColor: "text-amber-500 bg-amber-950/20 border-amber-900/30",
          reason: `Washed Out (Daylight): Though above the horizon, the thin crescent (${illumination}% illuminated) is too close to the Sun's bright path. Atmospheric scattering washes it out.`
        };
      }
      return {
        status: "VISIBLE",
        badgeColor: "text-emerald-400 bg-emerald-950/20 border-emerald-900/30",
        reason: `Visible (Daytime): The Moon is above the horizon and sufficiently illuminated (${illumination}%) to pierce through the daytime sky glare.`
      };
    }

    // Nighttime and above horizon
    return {
      status: "VISIBLE",
      badgeColor: "text-emerald-400 bg-emerald-950/20 border-emerald-900/30",
      reason: `Highly Visible (Night): The Moon is above the horizon in the clear night sky, illuminated at ${illumination}%, and easily seen.`
    };
  };

  const moonVisibility = getMoonVisibilityDetails();

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-300 ${theme}`}>
      {/* Background Starry Nebula Canvas */}
      <StarryBackground />

      {/* Persistent Polish Header */}
      <Header
        activeView={activeView}
        isOnline={isOnline}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onLoginClick={() => setIsOnlineLoggedIn(false)}
      />

      {/* 1. AUTH LOGIN IDENTITY MODAL */}
      {!isLoggedIn && (
        <div className="fixed inset-0 bg-[#000000]/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-[#0a0b12] p-6 shadow-2xl relative">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-yellow-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold font-mono text-slate-100">Welcome to Moonbug</h2>
              <p className="text-xs text-slate-400">Enter your birth date and lunar nickname to begin your astral diary.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Cosmic Nickname</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g., Starseeker-99"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Coarse Location</label>
                <input
                  type="text"
                  required
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g., Nairobi, Kenya"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Birth Date</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-colors duration-300 shadow-lg shadow-yellow-500/10"
              >
                Enter Lunar Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MAIN ACTIVE VIEW RENDERER */}
      <main className="flex-1 pb-24 overflow-x-hidden">
        {isLoggedIn && (
          <>
            {/* VIEW A: HOME VIEW (CONSOLIDATED CORE FEED) */}
            {activeView === "home" && (
              <div className="space-y-8 px-4 py-4 max-w-5xl mx-auto">
                
                {/* 1. Global & Active Challenges Dashboard Hero Panel */}
                <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
                    <div>
                      <h2 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                        🏆 COMMUNITY CHALLENGES OVERVIEW
                      </h2>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Track your active stargazing streaks and level milestones</p>
                    </div>
                    <button
                      onClick={() => setActiveView("challenges")}
                      className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 self-start animate-pulse"
                    >
                      <span>Go to Challenges Workspace</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">Active Stargaze Streak</span>
                      <span className="text-lg font-bold font-mono text-yellow-400 block">🔥 5 Days</span>
                      <span className="text-[8.5px] text-slate-400 font-sans block leading-normal">Streak Saver archive active. Your lunar journal is safe.</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">Cheese XP Balance</span>
                      <span className="text-lg font-bold font-mono text-yellow-400 block">{xp} XP</span>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/60 mt-1">
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${Math.min(100, (xp / 600) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">Milestone Status</span>
                      <span className="text-xs font-bold text-slate-200 block mt-0.5">Level {xp < 100 ? "1" : xp < 300 ? "2" : xp < 600 ? "3" : "4"}: Explorer</span>
                      <span className="text-[8.5px] text-emerald-400 font-mono block">✓ Vocational Track stage 1 complete</span>
                    </div>
                  </div>
                </section>

                {/* 2. Direct Self-Hosted Advertiser Loop (Ethical Ad Economy) */}
                <AdQuizModule xp={xp} onAddXp={handleAddXp} />

                {/* 3. Astronomical Events Timeline Feed */}
                <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <h2 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider">
                        🌌 OFFLINE ASTRONOMICAL EVENTS FEED
                      </h2>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Coordinated from the local annual calendar tracking matrix</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {recentEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedHomeItem({ type: "event", data: ev })}
                        className="cursor-pointer p-4 rounded-xl border border-slate-850 bg-slate-950/30 hover:border-yellow-500/30 hover:bg-slate-950/70 transition-all flex flex-col justify-between h-36"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] font-mono text-yellow-500">{ev.date}</span>
                            <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded text-slate-400 uppercase">
                              {ev.rarity}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200 mt-1.5 truncate">{ev.title}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-1 font-sans">{ev.description}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 self-end hover:text-slate-200">
                          View details &rarr;
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Conditional Authentication Gate (Claim Anonymous Pass) */}
                <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                        🛡️ SECURED ANONYMOUS PASS PORTAL
                      </h3>
                      <p className="text-[10.5px] text-slate-300 font-mono">
                        Your unique Moonbug identifier token: <span className="text-yellow-500 font-bold font-mono">{nickname}</span>
                      </p>
                      <p className="text-[9.5px] text-slate-500 font-sans leading-normal">
                        Zero telemetry database logs. Re-assign or customize your nickname coordinates anytime to cycle ledger slots.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const randomIdx = Math.floor(Math.random() * 899 + 100);
                        const generated = `moonbug_${randomIdx}`;
                        setNickname(generated);
                        localStorage.setItem("mb_nickname", generated);
                        localStorage.setItem("mb_profile_id", generated);
                        handleAddXp(5);
                        alert(`✨ New unique anonymous pass claimed: ${generated}`);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all uppercase shrink-0"
                    >
                      Regenerate Pass ID
                    </button>
                  </div>
                </section>

                {/* 3. Personal calculations */}
                <section className="bg-[#0c0d16]/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
                  <h3 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider mb-3">
                    🔢 PERSONAL CELESTIAL CALCULATIONS
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Lunar Age</span>
                        <div className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 text-yellow-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-52 p-2 rounded-lg bg-black border border-slate-700 text-[10px] text-slate-300 leading-normal z-50">
                            "Lunar Age" is defined as: The number of full moon cycles that have occurred since the user's birthdate.
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold font-mono text-yellow-400 block">
                        {birthCycles.toLocaleString()} full moon cycles
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block leading-relaxed">
                        Completed moon alignments since birth date: {birthDateObj?.toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Moon Birth Phase</span>
                      <span className="text-sm font-bold font-mono text-yellow-400 block">
                        {userBirthPhase ? `${userBirthPhase.name} ${userBirthPhase.emoji}` : "Calculating..."}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block leading-relaxed">
                        The exact cosmic configuration during your terrestrial genesis day.
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Update Birth Date</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        localStorage.setItem("mb_birthdate", e.target.value);
                        handleAddXp(5);
                      }}
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none max-w-xs"
                    />
                  </div>
                </section>

                {/* 4. Double Highlights Cards: Astro Events & Challenges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Events Highlights */}
                  <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                        🌌 Astronomy Event Highlights
                      </h3>
                      <button onClick={() => setActiveView("events")} className="text-[9px] font-mono text-slate-400 hover:text-slate-200">
                        View All &rarr;
                      </button>
                    </div>

                    <div className="space-y-2">
                      {recentEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onMouseEnter={() => setHoveredItemId(ev.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          onClick={() => setSelectedHomeItem({ type: "event", data: ev })}
                          className="group relative cursor-pointer p-2.5 rounded-xl border border-slate-850 bg-slate-950/30 hover:border-yellow-500/30 transition-all flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-[9px] font-mono text-yellow-500">{ev.date}</span>
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-yellow-400">{ev.title}</h4>
                          </div>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-slate-800 ${
                            hoveredItemId === ev.id ? "bg-yellow-500 text-slate-950 animate-pulse" : "bg-slate-900 text-slate-400"
                          }`}>
                            {hoveredItemId === ev.id ? "(click me)" : ev.rarity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Challenges Highlights */}
                  <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                        🏆 Community Challenges
                      </h3>
                      <button onClick={() => setActiveView("events")} className="text-[9px] font-mono text-slate-400 hover:text-slate-200">
                        View All &rarr;
                      </button>
                    </div>

                    <div className="space-y-2">
                      {recentChallenges.map((ch) => (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedHomeItem({ type: "challenge", data: ch })}
                          className="group cursor-pointer p-2.5 rounded-xl border border-slate-850 bg-slate-950/30 hover:border-yellow-500/30 transition-all flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-[9px] font-mono text-yellow-500">Value: +{ch.rewardXp} XP</span>
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-yellow-400">{ch.title}</h4>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 group-hover:text-yellow-300">
                            Detail &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* 5. Weekly Newsletter & Online Tribe elements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Newsletter subscription form */}
                  <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-3">
                    <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                      📰 WEEKLY MOONBUG NEWSLETTER
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                      Receive weekly astro-transits guides, upcoming meteor shower alignments, and exclusive community challenges.
                    </p>
                    <form onSubmit={handleNewsletterSubscribe} className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 flex-1 focus:outline-none"
                      />
                      <button type="submit" className="p-2.5 rounded-xl bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-colors font-bold text-xs uppercase">
                        Subscribe
                      </button>
                    </form>
                    {subscribedMsg && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold block animate-pulse">
                        {subscribedMsg}
                      </span>
                    )}
                  </section>

                  {/* Online Tribe quick monitor */}
                  <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-3">
                    <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Lunar Tribe Online</span>
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {onlineUsers.length === 0 ? (
                        <span className="text-[10px] font-mono text-slate-500">Connecting real-time server stream...</span>
                      ) : (
                        onlineUsers.map((user) => (
                          <div
                            key={user.id}
                            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/40 text-[10px] font-mono text-slate-300"
                          >
                            👤 {user.nickname} ({user.activePhase})
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* VIEW B: DIAL DASHBOARD */}
            {activeView === "dial" && (
              <DialDashboard
                locationText={locationText}
                birthDate={birthDate}
                nickname={nickname}
                xp={xp}
                onAddXp={handleAddXp}
              />
            )}

            {/* VIEW C: CHALLENGES DASHBOARD */}
            {activeView === "challenges" && (
              <ChallengesDashboard
                xp={xp}
                onAddXp={handleAddXp}
              />
            )}

            {/* VIEW D: NOTES WORKSPACE */}
            {activeView === "notes" && (
              <NotesWorkspace xp={xp} onAddXp={handleAddXp} />
            )}

            {/* VIEW E: CALENDAR DASHBOARD */}
            {activeView === "calendar" && (
              <CalendarDashboard />
            )}

            {/* VIEW F: PROFILE DASHBOARD */}
            {activeView === "profile" && (
              <ProfileDashboard
                nickname={nickname}
                onChangeNickname={setNickname}
                xp={xp}
                onAddXp={handleAddXp}
              />
            )}

            {/* VIEW G: ADVERTISER DASHBOARD */}
            {activeView === "advertiser" && (
              <AdvertiserDashboard
                xp={xp}
                onAddXp={handleAddXp}
                nickname={nickname}
              />
            )}

            {/* VIEW H: CHAT DASHBOARD */}
            {activeView === "chat" && (
              <ChatDashboard
                nickname={nickname}
                xp={xp}
                onAddXp={handleAddXp}
                onDeductXp={handleDeductXp}
              />
            )}

            {/* VIEW I: EVENTS & REGISTRY FORUM */}
            {activeView === "events" && (
              <EventsDashboard
                nickname={nickname}
                onAddXp={handleAddXp}
                isOnline={isOnline}
              />
            )}
          </>
        )}
      </main>

      {/* BOTTOM PERSISTENT NAVIGATION BAR */}
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 py-2 border-t border-slate-800/80 bg-[#0a0b10]/95 backdrop-blur-xl z-40 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveView("home")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "home" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>🏠</span>
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveView("dial")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "dial" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>🌙</span>
            <span>Lunar Dial</span>
          </button>

          <button
            onClick={() => setActiveView("challenges")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "challenges" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>🏆</span>
            <span>Challenges</span>
          </button>

          <button
            onClick={() => setActiveView("notes")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "notes" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>📝</span>
            <span>Notebook</span>
          </button>

          <button
            onClick={() => setActiveView("calendar")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "calendar" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>📅</span>
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setActiveView("profile")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "profile" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>👤</span>
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveView("advertiser")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "advertiser" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>📢</span>
            <span>Advertiser</span>
          </button>

          <button
            onClick={() => setActiveView("chat")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 ${
              activeView === "chat" ? "text-yellow-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>💬</span>
            <span>Chat</span>
          </button>
        </nav>
      )}

      {/* DETAILED HIGHLIGHTS POPUP/MODAL RENDERER */}
      {selectedHomeItem && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0c0d15] p-5 space-y-4 my-8 relative">
            <button
              onClick={() => setSelectedHomeItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg focus:outline-none"
            >
              &times;
            </button>

            <div className="space-y-3 text-center">
              <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest block">
                Highlighted Event Summary
              </span>
              <h3 className="text-base font-bold font-mono text-slate-100">
                {selectedHomeItem.data.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed text-left">
                {selectedHomeItem.data.description}
              </p>
              {selectedHomeItem.type === "challenge" && (
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-left text-xs font-mono">
                  <span className="font-bold text-yellow-400 uppercase block mb-1">Goal Metric:</span>
                  {selectedHomeItem.data.goal}
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedHomeItem(null);
                    setActiveView("events");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs uppercase"
                >
                  Enter Forums
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
