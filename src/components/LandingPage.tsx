import React, { useState } from "react";
import { Sparkles, ArrowRight, Telescope, Compass, BookOpen, Shield } from "lucide-react";
import StarryBackground from "./StarryBackground";
import InfoPage from "./InfoPage";

interface LandingPageProps {
  onAuthenticate: (data: { nickname: string; location: string; birthDate: string }) => void;
  onExplorePublic: () => void;
}

const PREVIEW_RESOURCES = [
  { cat: "course", title: "Intro to Astrophotography", author: "StarGazer Academy" },
  { cat: "book", title: "Cosmos by Carl Sagan", author: "Carl Sagan" },
  { cat: "product", title: "Orion SkyQuest XT8", author: "AstroGear Reviews" },
];

export default function LandingPage({ onAuthenticate, onExplorePublic }: LandingPageProps) {
  const [subView, setSubView] = useState<"home" | "policy" | "guidelines" | "about">("home");
  const [showAuth, setShowAuth] = useState(false);
  const [nickname, setNickname] = useState("");
  const [location, setLocation] = useState("Nairobi, Kenya");
  const [birthDate, setBirthDate] = useState("1998-05-15");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !location.trim() || !birthDate.trim()) return;
    onAuthenticate({ nickname: nickname.trim(), location: location.trim(), birthDate: birthDate.trim() });
  };

  if (subView !== "home") {
    return (
      <div className="relative min-h-screen text-slate-100">
        <StarryBackground />
        <div
          className="fixed inset-0 -z-9 pointer-events-none"
          style={{ background: "linear-gradient(165deg, rgba(26,27,58,0.55), rgba(10,11,20,0.35))" }}
        />
        <div className="relative z-10">
          <InfoPage page={subView} />
          <div className="max-w-2xl mx-auto px-4 pb-10">
            <button
              onClick={() => setSubView("home")}
              className="text-turquoise hover:text-turquoise-bright font-mono text-xs uppercase tracking-wider transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-100">
      <StarryBackground />
      <div
        className="fixed inset-0 -z-9 pointer-events-none"
        style={{ background: "linear-gradient(165deg, rgba(26,27,58,0.55), rgba(10,11,20,0.35))" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        {/* HERO */}
        <section className="text-center space-y-4 mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono tracking-wider">
            <span className="bg-gradient-to-r from-turquoise-200 via-turquoise-300 to-turquoise-500 bg-clip-text text-transparent">
              Project-moonrise
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-200 font-mono">
            Track the moon. Discover resources. Rise together.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl mx-auto">
            A paywall-free community where citizens discover health, skill, and relationship
            resources together — recommended by people, not algorithms-for-sale.
          </p>
        </section>

        {/* PRIMARY CALLS TO ACTION */}
        <section className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            onClick={() => setShowAuth(true)}
            className="px-6 py-3 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-turquoise-500/10"
          >
            <Sparkles className="w-4 h-4" />
            Sign Up / Log In
          </button>
          <button
            onClick={onExplorePublic}
            className="px-6 py-3 rounded-xl border border-turquoise-500/40 text-turquoise hover:bg-turquoise-500/10 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            Explore Public Content
          </button>
        </section>

        {/* AUTH CARD */}
        {showAuth && (
          <section className="rounded-2xl border border-slate-700/80 bg-[#0a0b12]/80 backdrop-blur-md p-6 mb-10 max-w-md mx-auto">
            <h2 className="text-turquoise font-mono uppercase tracking-wider text-sm mb-4 flex items-center gap-1.5">
              <Telescope className="w-4 h-4" />
              Claim Your Anonymous Pass
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Cosmic Nickname</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g., Starseeker-99"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-turquoise-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Coarse Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Nairobi, Kenya"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-turquoise-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Birth Date</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-colors duration-300 shadow-lg shadow-turquoise-500/10"
              >
                Enter Lunar Workspace
              </button>
            </form>
          </section>
        )}

        {/* PREVIEW GRID */}
        <section className="mb-10">
          <h2 className="text-sm font-mono uppercase text-turquoise tracking-wider mb-4 text-center">
            🌟 Community-Recommended Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PREVIEW_RESOURCES.map((rec, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
                <span className="text-[9px] font-mono text-turquoise-dim uppercase block">{rec.cat}</span>
                <h4 className="text-xs font-bold text-slate-200">{rec.title}</h4>
                <span className="text-[9px] text-slate-500 font-mono block">by {rec.author}</span>
                <button className="mt-2 text-[10px] font-mono text-turquoise hover:text-turquoise-bright transition-colors">
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* BORDERLESS TEXT LINKS */}
        <section className="flex flex-wrap items-center justify-center gap-6 border-t border-slate-800/60 pt-6">
          <button
            onClick={() => setSubView("policy")}
            className="text-slate-400 hover:text-turquoise transition-colors font-mono text-xs flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            Platform Policy
          </button>
          <button
            onClick={() => setSubView("guidelines")}
            className="text-slate-400 hover:text-turquoise transition-colors font-mono text-xs flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Community Guidelines
          </button>
          <button
            onClick={() => setSubView("about")}
            className="text-slate-400 hover:text-turquoise transition-colors font-mono text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            About
          </button>
        </section>

        <div className="text-center mt-10 text-[10px] font-mono text-slate-600">
          <ArrowRight className="w-3 h-3 inline mr-1" />
          Paywall-free community discovery — launching in Kenya &amp; Africa.
        </div>
      </div>
    </div>
  );
}
