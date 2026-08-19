import React, { useState, useEffect } from "react";
import { Sparkles, MapPin, Compass, Award, Mail, Calendar, HelpCircle, Bot, LogOut, ArrowUpRight, RefreshCw, ArrowLeft, ArrowRight, Rss, Crown } from "lucide-react";
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
import CataloguesDashboard from "./components/CataloguesDashboard";
import Sidebar from "./components/Sidebar";
import MeetPeople from "./components/MeetPeople";
import TribeDashboard from "./components/TribeDashboard";
import RecommendationFeed from "./components/RecommendationFeed";
import { api } from "./lib/api";
import { AstroEvent, Challenge, OnlineUser } from "./types";
import LandingPage from "./components/LandingPage";
import NotificationsDashboard from "./components/NotificationsDashboard";

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
  const [activeView, setActiveView] = useState<"home" | "dial" | "challenges" | "notes" | "profile" | "advertiser" | "chat" | "catalogues" | "meet" | "recommendations" | "tribe" | "notifications" | "hello">("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // User Authentication State (Frictionless local auto-entry)
  const [isLoggedIn, setIsOnlineLoggedIn] = useState(() => !!localStorage.getItem("mb_nickname"));
  const [nickname, setNickname] = useState(() => {
    const saved = localStorage.getItem("mb_nickname");
    if (saved) return saved;
    // Generate standard scaling anonymous identity string
    const randomIdx = Math.floor(Math.random() * 899 + 100);
    const generated = `moonrise_${randomIdx}`;
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

  const THEME_BY_VIEW: Record<string, string> = {
    home: "twilight", dial: "twilight",
    notes: "daytime",
    profile: "nighttime", tribe: "nighttime",
    advertiser: "cloudy",
    challenges: "dynamic", events: "dynamic", meet: "dynamic",
    catalogues: "dynamic", recommendations: "dynamic", chat: "dynamic", calendar: "dynamic",
    notifications: "dynamic", hello: "dynamic",
  };
  const themeVariant = THEME_BY_VIEW[activeView] || "twilight";

  const handleAuthenticate = (data: { nickname: string; location: string; birthDate: string }) => {
    setNickname(data.nickname.trim());
    setLocationText(data.location.trim());
    setBirthDate(data.birthDate);
    localStorage.setItem("mb_nickname", data.nickname.trim());
    localStorage.setItem("mb_location", data.location.trim());
    localStorage.setItem("mb_birthdate", data.birthDate);
    const loc = data.location.trim().toLowerCase();
    if (loc.includes("kenya") || loc.includes("kisumu") || loc.includes("nairobi")) setSunriseHour(6.68);
    else setSunriseHour(6.0);
    fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: data.nickname.trim(), activePhase: getLunarStatus(new Date()).phase.name }) }).catch(() => {});
    handleAddXp(20);
    setIsOnlineLoggedIn(true);
  };
  const handleExplorePublic = () => {
    if (!localStorage.getItem("mb_nickname")) {
      const generated = `moonrise_${Math.floor(Math.random() * 899 + 100)}`;
      setNickname(generated);
      localStorage.setItem("mb_nickname", generated);
      localStorage.setItem("mb_profile_id", generated);
    }
    setIsOnlineLoggedIn(true);
  };

  // Global feed poster (backend + local cache for instant display)
  const handleShareFeed = (entry: {
    kind: any; title?: string; body?: string; refId?: string; refType?: string; experience?: string;
  }) => {
    const item = { author: nickname, ...entry };
    // local cache
    try {
      const cached = JSON.parse(localStorage.getItem("mb_feed") || "[]");
      cached.unshift({ id: `local-${Date.now()}`, timestamp: new Date().toISOString(), ...item });
      if (cached.length > 200) cached.pop();
      localStorage.setItem("mb_feed", JSON.stringify(cached));
    } catch {}
    // backend
    api.postFeed(item).catch(() => {});
    alert("Shared to your feed! ✓");
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("mb_theme", nextTheme);
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
  const activeRiseSet = getMoonRiseSetTimes(lunarStatus.age, sunriseHour, 0);
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
        badgeColor: "text-turquoise-dim bg-turquoise-950/20 border-turquoise-900/30",
        reason: `New Moon Glare: Though above the horizon, the Moon is in New Moon phase and extremely close to the Sun's path. Solar glare completely washes it out.`
      };
    }

    if (isDaytime) {
      if (illumination < 15) {
        return {
          status: "INVISIBLE",
          badgeColor: "text-turquoise-dim bg-turquoise-950/20 border-turquoise-900/30",
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
    <div className={`app-scale-root min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-300 ${theme}`}>
      {!isLoggedIn ? (
        <LandingPage onAuthenticate={handleAuthenticate} onExplorePublic={handleExplorePublic} />
      ) : (
        <>
          {/* Background Starry Nebula Canvas */}
          <StarryBackground />
          <div className={`fixed inset-0 pointer-events-none theme-${themeVariant}`} style={{ zIndex: -9 }} />

          {/* Persistent Polish Header */}
          <Header
            activeView={activeView}
            isOnline={isOnline}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            onLoginClick={() => setIsOnlineLoggedIn(false)}
            onHome={() => setActiveView("home")}
          />

      {/* Sidebar + Main content row */}
      <div className="flex flex-1 min-h-0">
          <Sidebar
            activeView={activeView}
            onNavigate={setActiveView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          />


        {/* 2. MAIN ACTIVE VIEW RENDERER */}
        <main className="flex-1 pb-24 overflow-x-hidden min-w-0">
          {isLoggedIn && (
          <>
            {/* VIEW A: HOME VIEW (CONSOLIDATED CORE FEED) */}
            {activeView === "home" && (
                <div className="space-y-8 px-4 py-4 max-w-5xl mx-auto">

                  {/* 1. Hero Section: User-recommended content & free advertising */}
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6">
                    <div className="space-y-3">
                      <h2 className="text-base font-bold font-mono text-turquoise uppercase tracking-wider">
                        Discover paywall-free resources, recommended by people.
                      </h2>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        Highlighted community picks and free advertising — find courses, videos, books, movies and products without paywalls.
                      </p>
                      <button
                        onClick={() => setActiveView("recommendations")}
                        className="px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        Browse Recommendations &rarr;
                      </button>
                    </div>
                  </section>

                  {/* 2. Interactive Dashboard: 3D lunar clock + stats/events/challenges/ads */}
                  <DialDashboard
                    locationText={locationText}
                    birthDate={birthDate}
                    nickname={nickname}
                    xp={xp}
                    onAddXp={handleAddXp}
                  />

                  {/* 3. Endless Recommendation Feed */}
                  <RecommendationFeed onNavigateToView={setActiveView} />
                </div>
            )}

            {/* VIEW B: DIAL VIEW */}
            {activeView === "dial" && (
              <DialDashboard
                locationText={locationText}
                birthDate={birthDate}
                nickname={nickname}
                xp={xp}
                onAddXp={handleAddXp}
              />
            )}

            {/* VIEW C: CHALLENGES VIEW */}
            {activeView === "challenges" && (
              <ChallengesDashboard
                xp={xp}
                onAddXp={handleAddXp}
                onNavigateToView={setActiveView}
                onShareFeed={handleShareFeed}
              />
            )}

            {/* VIEW D: NOTES WORKSPACE */}
            {activeView === "notes" && (
              <NotesWorkspace xp={xp} onAddXp={handleAddXp} onNavigateToView={setActiveView} />
            )}

            {/* VIEW E: CALENDAR VIEW */}
            {activeView === "calendar" && (
              <CalendarDashboard onNavigateToView={setActiveView} />
            )}

            {/* VIEW F: PROFILE VIEW */}
            {activeView === "profile" && (
              <ProfileDashboard
                nickname={nickname}
                onChangeNickname={setNickname}
                xp={xp}
                onAddXp={handleAddXp}
                onNavigateToView={setActiveView}
              />
            )}

            {/* VIEW G: ADVERTISER VIEW */}
            {activeView === "advertiser" && (
              <AdvertiserDashboard
                xp={xp}
                onAddXp={handleAddXp}
                nickname={nickname}
                onNavigateToView={setActiveView}
                onShareFeed={handleShareFeed}
              />
            )}

            {/* VIEW H: CHAT VIEW */}
            {activeView === "chat" && (
              <ChatDashboard
                nickname={nickname}
                xp={xp}
                onAddXp={handleAddXp}
                onDeductXp={handleDeductXp}
                onNavigateToView={setActiveView}
              />
            )}

            {/* VIEW I: EVENTS & REGISTRY FORUM */}
            {activeView === "events" && (
              <EventsDashboard
                nickname={nickname}
                onAddXp={handleAddXp}
                isOnline={isOnline}
                onNavigateToView={setActiveView}
                onShareFeed={handleShareFeed}
              />
            )}

            {/* VIEW J: UNIFIED CATALOGUES */}
            {activeView === "catalogues" && (
              <CataloguesDashboard onNavigateToView={setActiveView} onShareFeed={handleShareFeed} />
            )}

            {/* VIEW K: MEET PEOPLE LIKE ME */}
            {activeView === "meet" && (
              <MeetPeople
                nickname={nickname}
                onNavigateToView={setActiveView}
                onOpenProfile={(id) => setActiveView("meet")}
              />
            )}

            {/* VIEW L: RECOMMENDATION FEED */}
            {activeView === "recommendations" && (
              <RecommendationFeed onNavigateToView={setActiveView} />
            )}

            {/* VIEW M: TRIBE & EMPIRE */}
            {activeView === "tribe" && (
              <TribeDashboard nickname={nickname} xp={xp} onNavigateToView={setActiveView} />
            )}

            {/* VIEW N: NOTIFICATIONS */}
            {activeView === "notifications" && (
              <NotificationsDashboard events={recentEvents} challenges={recentChallenges} nickname={nickname} />
            )}

            {/* VIEW O: HELLO (Moonrise AI) */}
            {activeView === "hello" && (
              <ChatDashboard
                nickname={nickname}
                xp={xp}
                onAddXp={handleAddXp}
                onDeductXp={handleDeductXp}
                onNavigateToView={setActiveView}
              />
            )}
          </>
        )}
      </main>
      </div>

      {/* BOTTOM PERSISTENT NAVIGATION BAR */}
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 py-2 border-t border-slate-800/80 bg-[#0a0b10]/95 backdrop-blur-xl z-40 flex items-center justify-around shadow-2xl overflow-x-auto">
          <button
            onClick={() => setActiveView("home")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "home" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveView("advertiser")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "advertiser" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Watch Ads</span>
          </button>

          <button
            onClick={() => setActiveView("advertiser")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "advertiser" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Advertise</span>
          </button>

          <button
            onClick={() => setActiveView("dial")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "dial" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Moondial</span>
          </button>

          <button
            onClick={() => setActiveView("challenges")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "challenges" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Challenges</span>
          </button>

          <button
            onClick={() => setActiveView("profile")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "profile" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Portfolio</span>
          </button>

          <button
            onClick={() => setActiveView("notes")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "notes" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Notebook</span>
          </button>

          <button
            onClick={() => setActiveView("catalogues")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "catalogues" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Catalogues</span>
          </button>

          <div className="w-px h-8 bg-slate-700/60 mx-1" />

          <button
            onClick={() => setActiveView("recommendations")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "recommendations" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <Rss className="w-4 h-4" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveView("chat")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "chat" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveView("tribe")}
            className={`flex flex-col items-center gap-1.5 text-[9px] font-mono font-bold transition-all duration-300 px-2 ${
              activeView === "tribe" ? "text-turquoise" : "text-slate-200 hover:text-white"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Tribe</span>
          </button>
        </nav>
      )}

      </>
      )}


    </div>
  );
}
