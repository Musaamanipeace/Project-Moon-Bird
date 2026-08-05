import { useState, useEffect, useRef } from "react";
import { Sparkles, MessageSquare, Plus, CheckCircle, Award, AwardIcon, Compass, Play } from "lucide-react";
import { AstroEvent, Challenge, Comment } from "../types";

interface EventsDashboardProps {
  nickname: string;
  onAddXp: (amount: number) => void;
  isOnline: boolean;
}

export default function EventsDashboard({ nickname, onAddXp, isOnline }: EventsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"events" | "challenges">("events");
  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed modal view
  const [selectedItem, setSelectedItem] = useState<{ type: "event" | "challenge"; data: any } | null>(null);
  const [commentText, setCommentText] = useState("");

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Space transits visual states
  const [transitPercent, setTransitPercent] = useState(0);
  const [isTransiting, setIsTransiting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch("/api/events")
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error(err));

    fetch("/api/challenges")
      .then(res => res.json())
      .then(data => setChallenges(data))
      .catch(err => console.error(err));
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedItem) return;

    const endpoint = selectedItem.type === "event"
      ? `/api/events/${selectedItem.data.id}/comment`
      : `/api/challenges/${selectedItem.data.id}/comment`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: nickname,
          text: commentText.trim()
        })
      });

      if (response.ok) {
        const newComment = await response.json();
        // Update local state list
        setSelectedItem(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: {
              ...prev.data,
              comments: [...prev.data.comments, newComment]
            }
          };
        });
        setCommentText("");
        fetchData(); // reload arrays
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });

      if (res.ok) {
        const data = await res.json();
        onAddXp(data.challenge.rewardXp);
        fetchData();
        // Update selected modal view if active
        if (selectedItem && selectedItem.data.id === challengeId) {
          setSelectedItem({
            type: "challenge",
            data: data.challenge
          });
        }
        alert(`Success! Challenge complete. Awarded +${data.challenge.rewardXp} XP!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run space transits simulation loops
  const startTransitSimulation = () => {
    setIsTransiting(true);
    setTransitPercent(0);
    const interval = setInterval(() => {
      setTransitPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTransiting(false);
          return 0;
        }
        return prev + 1.5;
      });
    }, 20);
  };

  const getRarityBadge = (rarity: string) => {
    const badges: Record<string, string> = {
      common: "bg-slate-500/10 text-slate-400 border border-slate-700/60",
      uncommon: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
      rare: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30",
      epic: "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30",
      legendary: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 animate-pulse"
    };
    return badges[rarity] || badges.common;
  };

  const filteredEvents = events.filter(ev => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return ev.title.toLowerCase().includes(q) ||
           ev.description.toLowerCase().includes(q) ||
           ev.type.toLowerCase().includes(q) ||
           ev.rarity.toLowerCase().includes(q) ||
           ev.date.includes(q);
  });

  const filteredChallenges = challenges.filter(ch => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return ch.title.toLowerCase().includes(q) ||
           ch.description.toLowerCase().includes(q) ||
           ch.goal.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto text-slate-200">
      
      {/* Tabs selector */}
      <div className="flex border-b border-slate-800 p-2 gap-2 bg-slate-900/40 backdrop-blur-md rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => { setActiveTab("events"); setSearchQuery(""); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all duration-300 focus:outline-none ${
            activeTab === "events"
              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 shadow"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          🌌 Astro Registry Forum
        </button>
        <button
          onClick={() => { setActiveTab("challenges"); setSearchQuery(""); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all duration-300 focus:outline-none ${
            activeTab === "challenges"
              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 shadow"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          🏆 Community Challenges
        </button>
      </div>

      {/* Search Bar Block */}
      <div className="max-w-md mx-auto relative group">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === "events" ? "🔍 Search all 2026 events offline..." : "🔍 Search community challenges..."}
          className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 font-mono transition-all shadow-inner focus:ring-1 focus:ring-yellow-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* RENDER TAB 1: ASTRO EVENTS */}
      {activeTab === "events" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const isHovered = hoveredId === ev.id;
            return (
              <div
                key={ev.id}
                onMouseEnter={() => setHoveredId(ev.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedItem({ type: "event", data: ev })}
                className="group relative cursor-pointer p-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/5 transition-all duration-300 flex flex-col justify-between h-48 overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {ev.date}
                    </span>
                    <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getRarityBadge(ev.rarity)}`}>
                      {ev.rarity}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold font-mono text-slate-100 group-hover:text-yellow-400 transition-colors">
                    {ev.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-3">
                    {ev.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] font-mono">
                  {/* Majestic Popout (Click Me) Hint */}
                  <span className={`text-yellow-400 font-bold transition-all duration-300 ${
                    isHovered ? "translate-x-1 opacity-100 animate-pulse" : "opacity-0"
                  }`}>
                    (click to view simulation) &rarr;
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {ev.comments.length} logs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER TAB 2: CHALLENGES */}
      {activeTab === "challenges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChallenges.map((ch) => {
            const isHovered = hoveredId === ch.id;
            const completed = ch.completedBy.includes(nickname);
            return (
              <div
                key={ch.id}
                onMouseEnter={() => setHoveredId(ch.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedItem({ type: "challenge", data: ch })}
                className="group relative cursor-pointer p-4 rounded-2xl border border-slate-800 bg-[#0c0d16]/40 hover:border-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/5 transition-all duration-300 flex flex-col justify-between h-48 overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Award: +{ch.rewardXp} XP
                    </span>
                    {completed ? (
                      <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                        ✓ Complete
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 uppercase tracking-wider animate-pulse">
                        Active
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold font-mono text-slate-100 group-hover:text-yellow-400 transition-colors">
                    {ch.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-3">
                    {ch.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] font-mono">
                  {/* Majestic Popout Hint */}
                  <span className={`text-yellow-400 font-bold transition-all duration-300 ${
                    isHovered ? "translate-x-1 opacity-100 animate-pulse" : "opacity-0"
                  }`}>
                    (details forum) &rarr;
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {ch.comments.length} notes
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED MODAL: WITH CUSTOM SPACE EVENT SIMULATOR */}
      {selectedItem && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-[#0a0b12] p-5 space-y-4 my-8 shadow-2xl relative">
            <button
              onClick={() => {
                setSelectedItem(null);
                setCommentText("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg focus:outline-none"
            >
              &times;
            </button>

            {/* Modal content body */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  Astronomy Portal Forum
                </span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  selectedItem.type === "event" ? getRarityBadge(selectedItem.data.rarity) : "bg-yellow-500 text-slate-950 font-extrabold"
                }`}>
                  {selectedItem.type === "event" ? selectedItem.data.rarity : `Reward: +${selectedItem.data.rewardXp} XP`}
                </span>
              </div>

              <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-yellow-500" />
                <span>{selectedItem.data.title}</span>
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedItem.data.description}
              </p>

              {/* SPACE TRANSITS ILLUSTRATOR (CUSTOM SVG ILLUSTRATORS) */}
              {selectedItem.type === "event" && (
                <div className="p-4 rounded-xl border border-slate-800 bg-[#05060b] flex flex-col items-center justify-center relative">
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[8px] font-mono text-slate-400 uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time Space Simulation</span>
                  </div>

                  <button
                    onClick={startTransitSimulation}
                    disabled={isTransiting}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded bg-yellow-500 hover:bg-yellow-400 text-[8px] font-mono font-bold text-slate-950 flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <Play className="w-2 h-2" />
                    <span>{isTransiting ? "Simulating..." : "Trigger Simulation"}</span>
                  </button>

                  <div className="h-32 w-full max-w-[280px] flex items-center justify-center relative">
                    {/* Render customized illustration based on event details */}
                    {selectedItem.data.id === "eclipse-2026" && (
                      <div className="relative">
                        {/* Starry corona glow backdrop */}
                        <div className="absolute inset-0 bg-yellow-100 rounded-full w-20 h-20 blur-xl opacity-70 animate-pulse" />
                        {/* Sun base */}
                        <div className="bg-yellow-400 rounded-full w-20 h-20 shadow-lg shadow-yellow-500/50" />
                        {/* Shadow Moon covering */}
                        <div
                          className="absolute bg-[#05060b] rounded-full w-20 h-20 border-2 border-yellow-500/20"
                          style={{
                            left: isTransiting ? `${(transitPercent / 100) * 80 - 40}px` : "0px",
                            opacity: isTransiting ? 1 : 0.9
                          }}
                        />
                      </div>
                    )}

                    {selectedItem.data.id === "perseids-2026" && (
                      <div className="relative w-full h-full">
                        {/* Meteor shower streaks */}
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-transparent via-white to-cyan-300 w-16 h-0.5 -rotate-45 opacity-80" />
                        <div className="absolute top-10 left-12 bg-gradient-to-r from-transparent via-white to-amber-300 w-24 h-0.5 -rotate-45 opacity-60" />
                        <div className="absolute top-6 left-28 bg-gradient-to-r from-transparent via-white to-cyan-300 w-12 h-0.5 -rotate-45 opacity-90 animate-pulse" />
                        {/* Big shooting meteor */}
                        <div
                          className="absolute bg-gradient-to-r from-transparent via-white to-cyan-400 h-1 rounded-full -rotate-45 shadow-lg shadow-cyan-500"
                          style={{
                            width: "80px",
                            top: isTransiting ? `${(transitPercent / 100) * 100 - 20}%` : "40%",
                            left: isTransiting ? `${(transitPercent / 100) * 100 - 20}%` : "40%"
                          }}
                        />
                      </div>
                    )}

                    {selectedItem.data.id === "iss-lunar-transit" && (
                      <div className="relative w-24 h-24">
                        {/* Moon Sphere */}
                        <div className="bg-amber-100/90 rounded-full w-24 h-24 shadow-inner border border-slate-700/60 overflow-hidden relative">
                          <div className="absolute top-4 left-6 bg-slate-300/40 rounded-full w-4 h-4" />
                          <div className="absolute top-12 left-12 bg-slate-300/30 rounded-full w-6 h-6" />
                        </div>
                        {/* ISS Satellite transit line */}
                        <div
                          className="absolute text-cyan-400 font-bold font-mono text-base z-10 filter drop-shadow(0 0 5px #22d3ee)"
                          style={{
                            top: "40%",
                            left: isTransiting ? `${(transitPercent / 100) * 140 - 40}px` : "50%",
                            transform: "translate(-50%, -50%)"
                          }}
                        >
                          🛰️
                        </div>
                      </div>
                    )}

                    {selectedItem.data.id === "supermoon-july" && (
                      <div className="relative">
                        <div
                          className="bg-gradient-to-r from-amber-200 to-yellow-500 rounded-full w-24 h-24 shadow-2xl border border-yellow-400 overflow-hidden relative transition-all duration-1000"
                          style={{
                            transform: isTransiting ? "scale(1.2)" : "scale(1.0)",
                            boxShadow: isTransiting ? "0 0 40px #f59e0b" : "0 0 20px rgba(245, 158, 11, 0.4)"
                          }}
                        >
                          <div className="absolute top-4 left-6 bg-yellow-600/20 rounded-full w-6 h-6" />
                          <div className="absolute top-12 left-12 bg-yellow-600/10 rounded-full w-8 h-8" />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] font-mono text-slate-500 text-center mt-2 uppercase tracking-widest">
                    {isTransiting ? "Orbital Alignment in transit..." : "Simulation static. Click Trigger."}
                  </p>
                </div>
              )}

              {/* CHALLENGE COMPONENT MODULE */}
              {selectedItem.type === "challenge" && (
                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-yellow-300 flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500 animate-spin-slow" />
                      <span>Assignment Protocol</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">Value: +{selectedItem.data.rewardXp} XP</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {selectedItem.data.goal}
                  </p>

                  <div className="flex justify-end pt-2">
                    {selectedItem.data.completedBy.includes(nickname) ? (
                      <button disabled className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase cursor-not-allowed">
                        ✓ Challenge Logged
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteChallenge(selectedItem.data.id)}
                        className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-extrabold uppercase shadow transition-colors"
                      >
                        Log Challenge Complete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FORUM/COMMENTS REGISTRY SYSTEM */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">
                  💬 Stargazers Forum Logs
                </h4>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {selectedItem.data.comments.length === 0 ? (
                    <p className="text-[10px] text-slate-500 font-mono italic">No stargazer comments filed. Write your first log below!</p>
                  ) : (
                    selectedItem.data.comments.map((c: any) => (
                      <div key={c.id} className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 leading-normal">
                        <div className="flex items-center justify-between mb-1 text-[9px] font-mono">
                          <span className="text-yellow-400 font-bold">{c.author}</span>
                          <span className="text-slate-500">{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Log your observation details, clarity reports, or remarks..."
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 flex-1 focus:outline-none focus:border-yellow-500/50"
                  />
                  <button
                    onClick={handlePostComment}
                    className="p-2.5 rounded-xl bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold text-xs"
                  >
                    Post Log
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
