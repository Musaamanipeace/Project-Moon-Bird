import React, { useState, useEffect } from "react";
import { User, Tag, Briefcase, MapPin, Image, Star, Trophy, Wallet, Plus, Trash2, CheckCircle, ShieldAlert, Eye, FileText, Upload, Sparkles, Megaphone, ArrowUpRight, BookOpen, Newspaper } from "lucide-react";
import { UserProfile } from "../types";
import { api, FeedItem } from "../lib/api";

interface ProfileDashboardProps {
  nickname: string;
  onChangeNickname: (name: string) => void;
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
}

export default function ProfileDashboard({ nickname, onChangeNickname, xp, onAddXp, onNavigateToView }: ProfileDashboardProps) {
  const [profileId, setProfileId] = useState("");
  const [anonMode, setAnonMode] = useState(true);
  const [occupation, setOccupation] = useState("Student");

  // Personal feed (own posts)
  const [myFeed, setMyFeed] = useState<FeedItem[]>([]);
  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem("mb_feed") || "[]");
    setMyFeed(cached);
    api.feed({ author: nickname }).then((f) => {
      // merge local + backend, dedupe by id
      const merged = [...cached, ...f].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      setMyFeed(merged);
    }).catch(() => {});
  }, [nickname]);

  // Hobbies list
  const [hobbies, setHobbies] = useState<string[]>(["[Physics] Space mechanics", "[Sky] Crescent tracking"]);
  const [newHobby, setNewHobby] = useState("");
  const [hobbyCategory, setHobbyCategory] = useState("Stargaze");

  // Under-18 Verification Gate
  const [ageVerified, setAgeVerified] = useState<"unverified" | "pending" | "verified">("unverified");
  const [verificationFile, setVerificationFile] = useState<string | null>(null);

  // Self-Ads permission and state
  const [selfAdTitle, setSelfAdTitle] = useState("Hire my Python orbital plotter script!");
  const [selfAdDesc, setSelfAdDesc] = useState("Fast, open-source Keplerian model solver. Fully offline-first.");
  const [selfAdEnabled, setSelfAdEnabled] = useState(false);

  // Custom Hover Metrics State
  const [hoveredMetrics, setHoveredMetrics] = useState<string | null>(null);

  // Typewriter Text lines
  const typewriterQuotes = [
    "Compiling celestial orbital coordinates...",
    "Bypassing invasive marketing trackers...",
    "Securing user data with offline-first local storage...",
    "MoonBird Node v2.0 active. Stargaze safe."
  ];
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  useEffect(() => {
    // Generate/Fetch standardized Moonbug ID
    let id = localStorage.getItem("mb_profile_id");
    if (!id) {
      // Pick a random standardized scaling Moonbug ID index e.g. moonbug_12.4k
      const randomIdx = (Math.random() * 9 + 1).toFixed(1);
      id = `moonbug_${randomIdx}k`;
      localStorage.setItem("mb_profile_id", id);
    }
    setProfileId(id);

    const savedAnon = localStorage.getItem("mb_anon_mode");
    if (savedAnon) setAnonMode(JSON.parse(savedAnon));

    const savedOcc = localStorage.getItem("mb_occupation");
    if (savedOcc) setOccupation(savedOcc);

    const savedHobbies = localStorage.getItem("mb_hobbies");
    if (savedHobbies) setHobbies(JSON.parse(savedHobbies));

    const savedAgeVer = localStorage.getItem("mb_age_verified");
    if (savedAgeVer) setAgeVerified(savedAgeVer as any);

    // Swap typewriter lines periodically
    const textInterval = setInterval(() => {
      setTypewriterIndex(prev => (prev + 1) % typewriterQuotes.length);
    }, 4500);

    return () => clearInterval(textInterval);
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, typeof data === "string" ? data : JSON.stringify(data));
  };

  const handleAddHobby = () => {
    const trimmed = newHobby.trim();
    if (!trimmed) return;

    const words = trimmed.split(/\s+/);
    if (words.length > 3) {
      alert("Hobby is strictly constrained to a maximum of 3 words for privacy sanitization.");
      return;
    }

    const formattedHobby = `[${hobbyCategory}] ${trimmed}`;
    if (hobbies.includes(formattedHobby)) return;

    const updated = [...hobbies, formattedHobby];
    setHobbies(updated);
    saveToStorage("mb_hobbies", updated);
    setNewHobby("");
    onAddXp(10);
  };

  const handleDeleteHobby = (index: number) => {
    const updated = hobbies.filter((_, i) => i !== index);
    setHobbies(updated);
    saveToStorage("mb_hobbies", updated);
  };

  const handleCredentialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setVerificationFile(reader.result as string);
      setAgeVerified("pending");
      saveToStorage("mb_age_verified", "pending");
      
      // Auto-verify after a few seconds mock delay
      setTimeout(() => {
        setAgeVerified("verified");
        saveToStorage("mb_age_verified", "verified");
        onAddXp(50);
        alert("🛡️ Under-18 Safeguard Verified! Your account is protected and verified with a student badge (+50 XP).");
      }, 3500);
    };
    reader.readAsDataURL(file);
  };

  const getCheeseRank = (xpValue: number) => {
    if (xpValue < 100) return { title: "Moon Muncher", next: 100, progress: (xpValue / 100) * 100, level: 1, isHigh: false };
    if (xpValue < 300) return { title: "Crescent Nibbler", next: 300, progress: ((xpValue - 100) / 200) * 100, level: 2, isHigh: false };
    if (xpValue < 600) return { title: "Lunar Explorer", next: 600, progress: ((xpValue - 300) / 300) * 100, level: 3, isHigh: true };
    return { title: "Cosmic Oracle", next: 1200, progress: Math.min(((xpValue - 600) / 600) * 100, 100), level: 4, isHigh: true };
  };

  const currentRank = getCheeseRank(xp);

  // Generate 28 dummy days for contribution grid (last 4 weeks)
  const contributionDays = Array.from({ length: 28 }).map((_, idx) => {
    const weights = [0, 1, 0, 2, 0, 3, 4, 1, 0, 2, 3, 0, 0, 1];
    const weight = weights[(idx + (nickname.length || 3)) % weights.length];
    return {
      day: idx + 1,
      weight, // 0 = empty, 1-4 = shades of green
      commits: weight * 2
    };
  });

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto text-slate-200">
      
      {/* Linux Mint Tooltip Metrics Box */}
      <div 
        className="relative bg-slate-950 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between gap-4 cursor-help group transition-all"
        onMouseEnter={() => setHoveredMetrics(`Profile_ID: ${profileId} | Minor_Safeguard_Badge: ${ageVerified.toUpperCase()} | Self_Ad_Sponsor_Slot: ${currentRank.isHigh ? "UNLOCKED" : "LOCKED_LEVEL_3"}`)}
        onMouseLeave={() => setHoveredMetrics(null)}
      >
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-turquoise" />
          <div>
            <span className="text-xs font-mono font-bold text-slate-100 block">🖥️ GitHub-Style Anonymous Developer Workspace</span>
            <span className="text-[10px] text-slate-400 font-mono">Build local portfolio matrices, verify student safety, and display self-ad loops</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-center">
          <span className="text-[9px] font-mono text-slate-500 block uppercase">cheese rank</span>
          <span className="text-xs font-bold font-mono text-turquoise">
            Level {currentRank.level} : {currentRank.title}
          </span>
        </div>

        {/* Hover metrics tooltip display */}
        {hoveredMetrics && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#070b13] border border-emerald-400/40 rounded-xl p-3 shadow-2xl font-mono text-[10px] text-emerald-400 leading-relaxed transition-all">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1 mb-1.5">
              <span className="font-bold text-slate-100 flex items-center gap-1">📊 PROFILE METRICS CONTROLLER (v1.8)</span>
              <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/30 text-[8px] rounded">SAFE_SSL</span>
            </div>
            <span>{hoveredMetrics}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Standardized Identity and Under-18 Safeguard Gate */}
        <div className="space-y-6 bg-[#090b14]/80 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono text-turquoise uppercase tracking-widest flex items-center gap-2">
              👤 Anonymous Ledger Profile
            </h3>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              We strictly purge all inputs collecting physical addresses or names. Identify yourself purely through your unique Moonbug token coordinate.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Standardized Moonbug ID</span>
              <input
                type="text"
                value={profileId}
                readOnly
                className="p-2.5 rounded-xl border border-slate-850 bg-slate-950 text-xs font-mono text-turquoise-dim select-all cursor-copy"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Local Nickname</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  onChangeNickname(e.target.value);
                  saveToStorage("mb_nickname", e.target.value);
                }}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-mono text-slate-200 focus:outline-none focus:border-turquoise-500/60"
                placeholder="e.g. stargazer-99"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <div>
                <span className="text-xs font-bold font-mono text-slate-300 block">Incognito Shield</span>
                <span className="text-[9px] font-mono text-slate-500 block">Purges nickname from index logs</span>
              </div>
              <input
                type="checkbox"
                checked={anonMode}
                onChange={(e) => {
                  setAnonMode(e.target.checked);
                  saveToStorage("mb_anon_mode", e.target.checked);
                }}
                className="w-4 h-4 rounded border-slate-800 text-turquoise-dim focus:ring-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Broad Occupation</span>
              <select
                value={occupation}
                onChange={(e) => {
                  setOccupation(e.target.value);
                  saveToStorage("mb_occupation", e.target.value);
                }}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none font-mono"
              >
                <option value="Student">📁 Student Academics</option>
                <option value="Paid Employed">💼 Industrial Engineer</option>
                <option value="Voluntary Service">🧘 Volunteer Node</option>
                <option value="Other">🌐 Decentralized Operator</option>
              </select>
            </div>
          </div>

          {/* Under-18 Verification Gate */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[10px] font-mono font-bold text-turquoise uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Under-18 Safeguard Gate</span>
                </h4>
                <p className="text-[9px] text-slate-500 font-sans leading-normal mt-0.5">
                  Secure offline credential channel to protect minors from fraudulent actors.
                </p>
              </div>
              {ageVerified === "verified" ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[8px] font-mono text-emerald-400 uppercase font-bold">
                  Verified
                </span>
              ) : ageVerified === "pending" ? (
                <span className="px-2 py-0.5 rounded bg-turquoise-950/40 border border-turquoise-500/30 text-[8px] font-mono text-turquoise uppercase font-bold animate-pulse">
                  Syncing
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-[8px] font-mono text-red-400 uppercase font-bold">
                  Gate Open
                </span>
              )}
            </div>

            {ageVerified === "unverified" && (
              <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950 p-4 rounded-xl text-center cursor-pointer hover:border-turquoise-500/40 transition-colors">
                <Upload className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-[10.5px] font-mono text-slate-300">Upload Student ID / Credential</span>
                <span className="text-[8px] text-slate-500 font-mono mt-0.5">Processed 100% locally in browser</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCredentialUpload}
                  className="hidden"
                />
              </label>
            )}

            {ageVerified === "pending" && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-turquoise-500/30 border-t-turquoise-500 animate-spin" />
                <span className="text-[9px] font-mono text-slate-400">Performing offline OCR decryption algorithms...</span>
              </div>
            )}

            {ageVerified === "verified" && (
              <div className="bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/20 text-[9px] font-mono text-emerald-300 leading-relaxed">
                🛡️ Verified Student Safeguard is active. All predatory ad algorithms are completely locked from this viewport.
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Typewriter Terminal, GitHub activity grid, Project viewports */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Portfolio Canvas Header & Typewriter */}
          <div className="bg-[#090b14]/80 p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-turquoise uppercase tracking-widest">
                🚀 Dynamic Portfolio Canvas
              </h3>
              <span className="text-[9px] font-mono text-slate-500">stable_node_active: true</span>
            </div>

            {/* Typewriter text console */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 font-mono text-xs text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>&gt;</span>
                <span className="transition-all duration-300">{typewriterQuotes[typewriterIndex]}</span>
              </div>
              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse shrink-0" />
            </div>

            {/* GitHub-Style Contribution Grid */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Lunar Contribution Log (Last 28 Days)</span>
                <span className="text-[9px] font-mono text-slate-500">28 days tracking cycle</span>
              </div>

              {/* Grid element */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex flex-col gap-2">
                <div className="grid grid-cols-7 gap-1.5 mx-auto">
                  {contributionDays.map(day => {
                    const colorShades = [
                      "bg-slate-900 border-slate-950", // 0
                      "bg-emerald-950 border-emerald-900/40", // 1
                      "bg-emerald-800 border-emerald-700/40", // 2
                      "bg-emerald-600 border-emerald-500/40", // 3
                      "bg-emerald-400 border-emerald-300/40", // 4
                    ];
                    return (
                      <div
                        key={day.day}
                        title={`Day ${day.day}: ${day.commits} contributions completed`}
                        className={`w-5.5 h-5.5 rounded-sm border cursor-help hover:ring-1 hover:ring-turquoise-400 transition-all ${colorShades[day.weight]}`}
                      />
                    );
                  })}
                </div>
                
                <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 px-1 border-t border-slate-900 pt-2">
                  <span>New Moon (Cycle Start)</span>
                  <div className="flex items-center gap-1">
                    <span>Less</span>
                    <span className="w-2 h-2 rounded-sm bg-slate-900" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-950" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-800" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-600" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-400" />
                    <span>More</span>
                  </div>
                  <span>Full Moon (Zenith)</span>
                </div>
              </div>
            </div>

            {/* Tagged Hobbies block */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Interests Tags</span>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/40 border border-slate-850">
                {hobbies.map((h, index) => (
                  <div key={index} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-turquoise-500/30 bg-turquoise-500/5 text-[10px] text-turquoise-bright font-mono">
                    <span>{h}</span>
                    <button onClick={() => handleDeleteHobby(index)} className="hover:text-red-400 text-slate-500 font-bold focus:outline-none">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHobby}
                  onChange={(e) => setNewHobby(e.target.value)}
                  placeholder="New tag (max 3 words)..."
                  className="p-2 rounded-xl border border-slate-850 bg-slate-950 text-[10px] text-slate-200 placeholder-slate-500 flex-1 focus:outline-none focus:border-turquoise-500/30"
                />
                <button
                  onClick={handleAddHobby}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>

          {/* Project Screenshot Slots & Self Ad slot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Viewports */}
            <div className="bg-[#090b14]/80 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">🖼️ active Project Viewports</span>
              <div className="space-y-3.5">
                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950">
                  <div className="bg-slate-900 px-3 py-1 text-[8.5px] font-mono text-slate-500 border-b border-slate-850 flex justify-between">
                    <span>lunar_map_engine_v1.bin</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                  <div className="h-20 bg-slate-950 flex items-center justify-center flex-col text-center">
                    <span className="text-lg">🗺️</span>
                    <span className="text-[9px] font-mono text-slate-300 mt-1 font-bold">Atmospheric Sky Clarity Map</span>
                  </div>
                </div>

                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950">
                  <div className="bg-slate-900 px-3 py-1 text-[8.5px] font-mono text-slate-500 border-b border-slate-850 flex justify-between">
                    <span>dusk_breather.so</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                  <div className="h-20 bg-slate-950 flex items-center justify-center flex-col text-center">
                    <span className="text-lg">🧘</span>
                    <span className="text-[9px] font-mono text-slate-300 mt-1 font-bold">Calm Dusk Breather Logic</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Self Ad slot */}
            <div className="bg-[#090b14]/80 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">📢 host Profile Self-Ads</span>
                  <p className="text-[8.5px] text-slate-500 font-sans leading-normal">
                    Level 3+ users unlock direct hosting of custom ads in their profile slots.
                  </p>
                </div>
                {currentRank.isHigh ? (
                  <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/30 text-[8px] rounded text-emerald-400 uppercase font-bold">Unlocked</span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-red-950/80 border border-red-500/30 text-[8px] rounded text-red-400 uppercase font-bold">Locked</span>
                )}
              </div>

              {currentRank.isHigh ? (
                <div className="space-y-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-slate-500">AD PROMOTION TITLE</label>
                    <input
                      type="text"
                      value={selfAdTitle}
                      onChange={(e) => setSelfAdTitle(e.target.value)}
                      className="p-1.5 rounded border border-slate-850 bg-slate-950 text-[10px] font-mono text-turquoise"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-slate-500">PROMOTION SUBTITLE/DESC</label>
                    <textarea
                      value={selfAdDesc}
                      onChange={(e) => setSelfAdDesc(e.target.value)}
                      className="p-1.5 h-10 rounded border border-slate-850 bg-slate-950 text-[9px] font-sans text-slate-300 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selfAdEnabled}
                      onChange={(e) => setSelfAdEnabled(e.target.checked)}
                      id="enable-self-ad"
                      className="rounded border-slate-800 text-turquoise-dim focus:ring-0"
                    />
                    <label htmlFor="enable-self-ad" className="text-[9px] font-mono text-slate-400 cursor-pointer">
                      Broadcast self-ad to my profile slot
                    </label>
                  </div>

                  {selfAdEnabled && (
                    <div className="p-2.5 border border-turquoise-500/30 bg-turquoise-500/5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-mono text-turquoise-dim uppercase font-bold">
                        <span>📢 Sponsor Ad (P2P Node)</span>
                        <span>Level {currentRank.level} Sponsor</span>
                      </div>
                      <h5 className="text-[10px] font-bold text-slate-100 font-mono">{selfAdTitle}</h5>
                      <p className="text-[9px] text-slate-400 font-sans leading-normal">{selfAdDesc}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center border border-slate-850 bg-slate-950/60 rounded-xl text-center p-4">
                  <Megaphone className="w-6 h-6 text-slate-700 mb-1" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">Host Profile self-ad is Locked</span>
                  <span className="text-[8.5px] text-slate-500 font-mono mt-0.5">Reach Cheese Level 3 (300+ XP) to unlock self-sponsored ad slots.</span>
                </div>
              )}
            </div>
            </div>

            {/* Catalogues access */}
            <div className="bg-[#090b14]/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-turquoise" />
                <div>
                  <span className="text-xs font-mono font-bold text-slate-100 block">📚 Unified Catalogues</span>
                  <span className="text-[9px] text-slate-400 font-mono">Astro events & campaigns by category</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateToView?.("catalogues")}
                className="px-3.5 py-1.5 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Open</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Personal Feed */}
            <div className="bg-[#090b14]/80 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-turquoise" />
                <span className="text-xs font-mono font-bold text-slate-100 block">📰 My Feed</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {myFeed.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">No posts yet. Share a catalogue, challenge, or badge!</p>
                ) : (
                  myFeed.map((f) => (
                    <div key={f.id} className="p-2.5 rounded-xl border border-slate-850 bg-slate-950/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-turquoise uppercase">{f.kind}</span>
                        <span className="text-[8px] text-slate-500 font-mono">{new Date(f.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-200 mt-0.5">{f.title || f.body}</p>
                      {f.experience && (
                        <p className="text-[10px] text-turquoise mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> View player's challenge experience: {f.experience}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

        </div>


      </div>

    </div>
  );
}
