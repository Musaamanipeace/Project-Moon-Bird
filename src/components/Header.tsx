import { useState } from "react";
import { Sun, Moon, Info, Sparkles, Wifi, WifiOff, LogOut } from "lucide-react";

interface HeaderProps {
  activeView: string;
  isOnline: boolean;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  onLoginClick: () => void;
  onHome: () => void;
}

export default function Header({ activeView, isOnline, theme, onThemeToggle, isLoggedIn, onLogout, onLoginClick, onHome }: HeaderProps) {
  const [showPopover, setShowPopover] = useState(false);

  // Dynamic dashboard text and tooltip description mapping
  const dashboardMap: Record<string, { title: string; desc: string; steps: string }> = {
    home: {
      title: "Home",
      desc: "Observe real-time celestial coordinates on our MoonDial and complete active challenges.",
      steps: "Track your precise Lunar Age, complete onboarding/lifestyle challenges, or log perspectives.",
    },
    notes: {
      title: "Notes Workspace",
      desc: "Tailored journal & workspace for habits, health vitals, astro logs, and life goals.",
      steps: "Manage 3D Journal entries, Habit Triggers, Vital Checks, Astro Observation Logs, and Life Blueprints.",
    },
    profile: {
      title: "Profile",
      desc: "Manage your cosmic identity, skills focus portfolio, health conditions catalogue, and feed posts.",
      steps: "Access Portfolio skills, Health & Disease catalogue, personal feed entries, or level rank.",
    },
    calendar: {
      title: "Calendar",
      desc: "Review a fixed monthly grid showcasing lunar phases and scheduled MoonDial events.",
      steps: "Set reminders for sky watcher events or lock goal commencement dates.",
    },
    chat: {
      title: "AI Companion",
      desc: "Engage in helpful reflection and productive support conversations.",
      steps: "Talk to moonrise AI or establish live thread with peers.",
    },
    events: {
      title: "Events & Challenges",
      desc: "Explore detailed astronomy transits, eclipse guides, and community challenges.",
      steps: "Hover over cards to see details, submit challenge entries, or complete assignments for XP.",
    },
    dial: {
      title: "Lunar Dial",
      desc: "Observe real-time celestial coordinates on our MoonDial and track lunar rise, zenith, and set times.",
      steps: "Watch the Moon's path across the sky, toggle Sun or realistic rendering, or set lunar reminders.",
    },
    challenges: {
      title: "Challenges",
      desc: "Complete onboarding, lifestyle, and skill challenges to earn Cheese XP and level up.",
      steps: "Pick a challenge track, follow step-by-step tasks, or submit entries for XP rewards.",
    },
    advertiser: {
      title: "Advertiser",
      desc: "Self-hosted ethical advertisement ecosystem for brands and creators.",
      steps: "Create sponsored ads, review the ad quiz, or browse the advertiser feed for XP.",
    },
    notifications: { title: "Notifications", desc: "Stay updated on events, challenges, and community activity.", steps: "Review astro-event alerts and challenge reminders." },
    hello: { title: "Hello (Moonrise AI)", desc: "Talk to Moonrise, your benevolent AI companion.", steps: "Ask questions, get guidance, or just say hello." },
  };

  const currentContext = dashboardMap[activeView] || dashboardMap.home;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0b10]/80 dark:bg-[#0a0b10]/80 light:bg-slate-100/90 backdrop-blur-md transition-all duration-300">
      {/* Animated Logo Container */}
      <div className="flex items-center gap-2 cursor-pointer group" onClick={onHome} title="Go to Home">
        <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 group-hover:text-white transition-colors duration-500 relative flex items-center gap-1">
          <span className="bg-gradient-to-r from-turquoise-200 via-turquoise-300 to-turquoise-500 bg-clip-text text-transparent">
            Project-moonrise
          </span>
        </h1>
      </div>

      {/* Center Dynamic Context Button with Hover Popover */}
      <div className="relative">
        <button
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 dark:border-slate-700/60 light:border-slate-300 bg-slate-900/50 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-turquoise-500/10 text-xs font-semibold text-slate-200 transition-all duration-300 focus:outline-none"
        >
          <span>{currentContext.title}</span>
          <Info className="w-3.5 h-3.5 text-turquoise" />
        </button>

        {showPopover && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-3 rounded-xl border border-slate-700 bg-[#0c0d16] text-slate-200 shadow-2xl backdrop-blur-lg z-50 transition-all duration-300 animate-fade-in">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0c0d16] border-t border-l border-slate-700 rotate-45" />
            <h4 className="text-xs font-bold text-turquoise mb-1 font-mono uppercase tracking-wider">
              {currentContext.title} Guide
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">
              {currentContext.desc}
            </p>
            <div className="border-t border-slate-800 pt-1.5">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Usage Instruction:</span>
              <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                {currentContext.steps}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Connection badges */}
      <div className="flex items-center gap-3">
        {/* Glowing Network Status Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-[10px] font-mono">
          {isOnline ? (
            <>
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-emerald-400 font-semibold uppercase animate-pulse">Online</span>
              <Wifi className="w-3 h-3 text-emerald-400" />
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 uppercase">Offline</span>
              <WifiOff className="w-3 h-3 text-slate-400" />
            </>
          )}
        </div>

        {/* Global Login/Logout Toggle */}
        {isLoggedIn ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/10 hover:bg-red-950/30 text-xs font-bold font-mono text-red-400 transition-all uppercase"
            title="Log Out of your Anonymous Pass"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-turquoise-500/30 bg-turquoise-500/10 hover:bg-turquoise-500/20 text-xs font-bold font-mono text-turquoise transition-all uppercase animate-pulse"
            title="Sign In with Anonymous Pass"
          >
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}

