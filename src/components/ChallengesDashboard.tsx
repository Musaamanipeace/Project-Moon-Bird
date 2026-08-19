import React, { useState, useEffect } from "react";
import {
  Moon, Flame, Award, CheckCircle, Plus, Gamepad2, Castle, Utensils,
  Target, ChevronRight, Sparkles, RefreshCw, Send, Footprints, Trophy
} from "lucide-react";
import { Challenge } from "../types";
import { getLunarStatus } from "../lib/lunar";

interface ChallengesDashboardProps {
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
  onShareFeed?: (entry: { kind: any; title?: string; body?: string; refId?: string; refType?: string; experience?: string }) => void;
}

/* ----------------------------- helpers ----------------------------- */
const todayStr = (d = new Date()) => d.toISOString().split("T")[0];
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

type Streak = { count: number; lastDate: string | null };

const loadStreak = (key: string): Streak => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, lastDate: null };
};

const saveStreak = (key: string, streak: Streak) =>
  localStorage.setItem(key, JSON.stringify(streak));

// Logs progress for today; extends the streak only on consecutive days.
const logStreak = (key: string): Streak => {
  const cur = loadStreak(key);
  const t = todayStr();
  if (cur.lastDate === t) return cur; // already logged today
  let next: Streak;
  if (cur.lastDate === yesterdayStr()) {
    next = { count: cur.count + 1, lastDate: t };
  } else {
    next = { count: 1, lastDate: t };
  }
  saveStreak(key, next);
  return next;
};

/* ----------------------- multiplayer: phrase game ----------------------- */
interface Phrase {
  answer: string;
  hints: [string, string, string];
}

// Local curated phrase list. Presented as "AI-generated" style — no external API.
const PHRASES: Phrase[] = [
  { answer: "Northern Lights", hints: ["A natural light show painted across the night sky.", "Best witnessed near the Earth's polar regions.", "Caused by charged solar particles colliding with our atmosphere."] },
  { answer: "Lunar Eclipse", hints: ["The sky dims during this celestial event.", "Earth sits directly between the Sun and the Moon.", "The Moon often glows a deep coppery red."] },
  { answer: "Tsunami", hints: ["A massive wall of moving ocean water.", "Often triggered by undersea earthquakes.", "Sometimes called a tidal wave."] },
  { answer: "Comet", hints: ["A traveler from the cold edges of the Solar System.", "It grows a glowing tail as it nears the Sun.", "Halley's is the most famous example."] },
  { answer: "Milky Way", hints: ["The galaxy we call home.", "A pale band of countless stars across the dark.", "Best seen far from city lights."] },
  { answer: "Aurora", hints: ["A shimmering curtain of colour in the polar sky.", "Its name comes from the Roman goddess of dawn.", "Driven by the solar wind."] },
];

/* ----------------------------- chess ----------------------------- */
const PIECE_ROWS: string[] = [
  "rnbqkbnr",
  "pppppppp",
  "        ",
  "        ",
  "        ",
  "        ",
  "PPPPPPPP",
  "RNBQKBNR",
];

const isWhitePiece = (c: string) => c >= "A" && c <= "Z";

/* ----------------------- fallback challenges ----------------------- */
// Local copy so challenges ALWAYS render, even when /api/challenges is down.
const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: "ch-1",
    title: "Sky Watcher (Level One)",
    category: "Astronomy",
    scope: "Skills-Related",
    participationMode: "Solo",
    description: "Use MoonDial to observe the moonrise, zenith, and moonset in a single night, then connect the lunar data you captured to a public astronomy event in your area.",
    rewardXp: 80,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Log all three MoonDial observations and link one public event.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-2",
    title: "Who Am I (Level One)",
    category: "Self-Improvement",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Set a daily wake-up alarm, schedule your day the night before, and complete your personal portfolio page with a clear bio and goals.",
    rewardXp: 70,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Submit an alarm routine, a daily schedule, and a finished portfolio page.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-3",
    title: "The Seeker",
    category: "Mindfulness",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Read a book from the community catalogue and submit a short reader survey sharing what resonated with you and one insight you'll apply.",
    rewardXp: 90,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Finish one catalogue book and submit the reader survey.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-4",
    title: "Up to Date",
    category: "Mindfulness",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Pick a current-event story, analyze it from multiple angles, and write a short personal perspective on what it means for your community.",
    rewardXp: 90,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Submit a written analysis and a personal perspective on a current event.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-5",
    title: "Cut the Habit",
    category: "Self-Improvement",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Identify the triggers behind a habit you want to drop, then build friction barriers that make the unwanted behavior harder to start.",
    rewardXp: 120,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Document your triggers and implement at least two friction barriers.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-6",
    title: "Vital Check",
    category: "Health",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Record your core vitals during a clinic visit, then draft a practical 30-day health plan with measurable weekly targets.",
    rewardXp: 110,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Submit vitals readings and a 30-day health plan.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-7",
    title: "Sky Watcher (Level Two)",
    category: "Astronomy",
    scope: "Skills-Related",
    participationMode: "Solo",
    description: "Observe a notable astro event (eclipse, meteor shower, or supermoon) and log a live, in-the-moment experience with your impressions and data.",
    rewardXp: 130,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Log a live observation of an astro event with notes and data.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
  {
    id: "ch-8",
    title: "Life Blueprint",
    category: "Life Blueprint",
    scope: "Self-Improvement/Wellbeing",
    participationMode: "Solo",
    description: "Construct a master lifetime blueprint covering your core goals across health, skills, and purpose, then lock in a firm commencement date.",
    rewardXp: 150,
    steps: [],
    surveyQuestions: [],
    bonusTasks: [],
    completionRequirement: "Complete a lifetime blueprint and set a locked commencement date.",
    comments: [],
    participants: [],
    state: "Unfinished",
  },
];


export default function ChallengesDashboard({ xp, onAddXp, onNavigateToView, onShareFeed }: ChallengesDashboardProps) {
  const lunar = getLunarStatus(new Date());

  /* ---------- Daily Tasks ---------- */
  const [dailyTasks, setDailyTasks] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem("mb_daily_tasks") || "[]"); } catch { return []; }
  });
  const [newTask, setNewTask] = useState("");

  useEffect(() => { localStorage.setItem("mb_daily_tasks", JSON.stringify(dailyTasks)); }, [dailyTasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setDailyTasks(prev => [...prev, { id: "t-" + Date.now(), text: newTask.trim(), done: false }]);
    setNewTask("");
  };
  const toggleTask = (id: string) => {
    setDailyTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const done = !t.done;
      if (done) onAddXp(5); // small XP for completion
      return { ...t, done };
    }));
  };
  const removeTask = (id: string) => setDailyTasks(prev => prev.filter(t => t.id !== id));

  /* ---------- Lunar-Phase Streak ---------- */
  const [lunarStreak, setLunarStreak] = useState<Streak>(() => loadStreak("mb_lunar_streak"));
  const logLunar = () => {
    const next = logStreak("mb_lunar_streak");
    setLunarStreak(next);
    onAddXp(10);
  };

  // Build a row of recent lunar-phase chips (last 8 days).
  const phaseChips = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i));
    const ls = getLunarStatus(d);
    return { date: d, phase: ls.phase };
  });

  /* ---------- Project Tracking Streak ---------- */
  const [projectStreak, setProjectStreak] = useState<Streak>(() => loadStreak("mb_project_streak"));
  const logProject = () => {
    const next = logStreak("mb_project_streak");
    setProjectStreak(next);
    onAddXp(10);
  };
  const [projectNote, setProjectNote] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("mb_project_note");
    if (saved) setProjectNote(saved);
  }, []);
  useEffect(() => { localStorage.setItem("mb_project_note", projectNote); }, [projectNote]);

  /* ---------- Notebook Logging: Daily Meals ---------- */
  const [meals, setMeals] = useState<{ id: string; text: string; time: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("mb_daily_meals") || "[]"); } catch { return []; }
  });
  const [newMeal, setNewMeal] = useState("");
  useEffect(() => { localStorage.setItem("mb_daily_meals", JSON.stringify(meals)); }, [meals]);
  const addMeal = () => {
    if (!newMeal.trim()) return;
    setMeals(prev => [{ id: "m-" + Date.now(), text: newMeal.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
    setNewMeal("");
    onAddXp(8); // reward for logging
  };

  /* ---------- Multiplayer: 3-Hint Phrase Game ---------- */
  const [phrase, setPhrase] = useState<Phrase>(() => PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  const [hintsShown, setHintsShown] = useState(0);
  const [guess, setGuess] = useState("");
  const [phraseResult, setPhraseResult] = useState<"win" | "lose" | null>(null);
  const newPhrase = () => {
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
    setHintsShown(0);
    setGuess("");
    setPhraseResult(null);
  };
  const submitGuess = () => {
    if (guess.trim().toLowerCase() === phrase.answer.toLowerCase()) {
      setPhraseResult("win");
      onAddXp(15);
    } else {
      setPhraseResult("lose");
    }
  };

  /* ---------- Multiplayer: Chess ---------- */
  const [board, setBoard] = useState<string[][]>(() => PIECE_ROWS.map(r => r.split("")));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const resetChess = () => setBoard(PIECE_ROWS.map(r => r.split("")));

  const clickSquare = (r: number, c: number) => {
    if (!selected) {
      const p = board[r][c];
      if (p && p !== " ") setSelected({ r, c });
      return;
    }
    const moving = board[selected.r][selected.c];
    const target = board[r][c];
    // Basic rule: cannot land on a piece of the same colour.
    if (target !== " ") {
      const movingWhite = isWhitePiece(moving);
      const targetWhite = isWhitePiece(target);
      if (movingWhite && targetWhite) {
        setSelected({ r, c }); // reselect
        return;
      }
    }
    const next = board.map(row => [...row]);
    next[r][c] = moving;
    next[selected.r][selected.c] = " ";
    setBoard(next);
    setSelected(null);
  };

  /* ---------- Challenges Catalogue (fetch) ---------- */
  const [challenges, setChallenges] = useState<Challenge[]>(FALLBACK_CHALLENGES);
  const [completedChallenges, setCompletedChallenges] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("mb_completed_challenges") || "{}"); } catch { return {}; }
  });
  const [catError, setCatError] = useState(false);
  useEffect(() => {
    fetch("/api/challenges")
      .then(res => res.json())
      .then((data: Challenge[]) => {
        if (Array.isArray(data) && data.length > 0) setChallenges(data);
      })
      .catch(() => setCatError(true));
  }, []);
  const completeChallenge = (ch: Challenge) => {
    if (completedChallenges[ch.id]) return;
    const nextState = { ...completedChallenges, [ch.id]: true };
    setCompletedChallenges(nextState);
    localStorage.setItem("mb_completed_challenges", JSON.stringify(nextState));
    onAddXp(ch.rewardXp || 50);
    onShareFeed?.({
      kind: "challenge_badge",
      title: `Completed: ${ch.title}`,
      body: `Earned +${ch.rewardXp || 50} XP via moonrise Challenges.`,
      refId: ch.id,
      refType: "challenge",
      experience: "Completed a moonrise community challenge.",
    });
  };

  /* ---------- render ---------- */
  return (
    <div
      className="min-h-screen p-4 max-w-5xl mx-auto text-slate-200 space-y-6"
      style={{
        background: "linear-gradient(160deg, #102a2e, #0c1c22 60%, #08121a)",
        borderRadius: "1rem",
      }}
    >
      {/* Organic, non-robotic banner */}
      <div className="relative overflow-hidden rounded-2xl border border-turquoise-500/30 bg-[#0a1b1f]/70 p-5">
        <div className="absolute -top-6 right-8 text-6xl opacity-30 select-none pointer-events-none">🌿</div>
        <div className="absolute top-2 right-24 text-5xl opacity-20 select-none pointer-events-none">🌊</div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-turquoise-500/10 border border-turquoise-500/30 rounded-xl text-turquoise">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                <span>🌍 moonrise Challenges & Social Hub</span>
                <span className="px-2 py-0.5 bg-turquoise-500/10 text-turquoise border border-turquoise-500/30 rounded text-[10px]">Active</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Daily tasks, lunar streaks, multiplayer games, project tracking & notebook logging.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">LUNAR STREAK</span>
              <span className="text-sm font-bold font-mono text-turquoise">🔥 {lunarStreak.count} Days</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">XP</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. CHALLENGES CATALOGUE */}
      <SectionCard icon={<Trophy className="w-4 h-4 text-turquoise" />} title="Challenges Catalogue">
        <p className="text-[11px] text-slate-400 font-mono mb-3">
          Complete community challenges to earn XP and share a badge to your feed.
          {catError && <span className="text-turquoise/70"> (showing offline copy)</span>}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map(ch => {
            const done = !!completedChallenges[ch.id];
            return (
              <div key={ch.id} className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 ${done ? "border-emerald-900/60 bg-emerald-950/10" : "border-slate-800 bg-slate-950/40"}`}>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[9px] font-mono text-turquoise uppercase border border-turquoise-500/30 px-1.5 py-0.5 rounded">{ch.category}</span>
                    <span className="text-[9px] font-mono text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">{ch.rewardXp} XP</span>
                  </div>
                  <h3 className={`text-xs font-bold font-mono mt-1.5 ${done ? "text-emerald-300 line-through" : "text-slate-100"}`}>{ch.title}</h3>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-1 line-clamp-2">{ch.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <span className="text-[11px] font-mono font-bold text-emerald-400">+{ch.rewardXp} XP</span>
                  {done ? (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> FINISHED
                    </span>
                  ) : (
                    <button
                      onClick={() => completeChallenge(ch)}
                      className="px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-bold font-mono text-[10px] uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      <span>Complete</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 1. DAILY TASKS */}
      <SectionCard icon={<CheckCircle className="w-4 h-4 text-turquoise" />} title="Daily Tasks">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a daily task..."
            className="flex-1 pl-3 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:outline-none focus:border-turquoise-500 font-mono"
          />
          <button onClick={addTask} className="px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {dailyTasks.length === 0 && <p className="text-[11px] text-slate-500 font-mono">No tasks yet. Add one to start earning XP.</p>}
          {dailyTasks.map(t => (
            <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="accent-turquoise-400 w-4 h-4" />
                <span className={`text-xs font-mono ${t.done ? "line-through text-slate-500" : "text-slate-200"}`}>{t.text}</span>
              </label>
              <button onClick={() => removeTask(t.id)} className="text-slate-500 hover:text-red-400 text-lg px-2 leading-none">&times;</button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2. MONTHLY LUNAR-PHASE STREAKS */}
      <SectionCard icon={<Moon className="w-4 h-4 text-turquoise" />} title="Monthly Lunar-Phase Streaks">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="px-3 py-2 rounded-xl border border-turquoise-500/30 bg-turquoise-500/5 text-center">
            <span className="block text-[9px] font-mono text-slate-500 uppercase">Current Phase</span>
            <span className="text-sm font-bold font-mono text-turquoise">{lunar.phase.emoji} {lunar.phase.name}</span>
          </div>
          <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
            <span className="block text-[9px] font-mono text-slate-500 uppercase">Illumination</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{lunar.illumination}%</span>
          </div>
          <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
            <span className="block text-[9px] font-mono text-slate-500 uppercase">Lunar Age</span>
            <span className="text-sm font-bold font-mono text-turquoise">{lunar.age} d</span>
          </div>
          <button onClick={logLunar} className="ml-auto px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1">
            <Flame className="w-4 h-4" /> Log Today's Activity (+10 XP)
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {phaseChips.map((chip, i) => (
            <div key={i} className="shrink-0 w-14 text-center p-2 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-xl leading-none">{chip.phase.emoji}</div>
              <div className="text-[8px] font-mono text-slate-400 mt-1 truncate">{chip.phase.name.split(" ")[0]}</div>
              <div className="text-[8px] font-mono text-slate-500">{chip.date.getDate()}/{chip.date.getMonth() + 1}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 font-mono mt-2">Streak: <span className="text-turquoise font-bold">{lunarStreak.count} consecutive lunar days</span> logged.</p>
      </SectionCard>

      {/* 4. MULTIPLAYER GAMES */}
      <SectionCard icon={<Gamepad2 className="w-4 h-4 text-turquoise" />} title="Multiplayer Games">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 3-hint phrase guessing */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-turquoise uppercase font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Phrase Guesser (local)
              </span>
              <button onClick={newPhrase} className="text-[10px] font-mono text-slate-400 hover:text-turquoise flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> New
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">No external API — phrases generated locally in AI style.</p>
            <div className="space-y-1.5">
              {Array.from({ length: hintsShown }).map((_, i) => (
                <div key={i} className="text-[11px] text-slate-300 font-mono p-2 rounded-lg border border-slate-800 bg-slate-900/60">
                  <span className="text-turquoise">Hint {i + 1}:</span> {phrase.hints[i]}
                </div>
              ))}
            </div>
            {hintsShown < 3 && phraseResult === null && (
              <button onClick={() => setHintsShown(h => h + 1)} className="text-[10px] font-mono text-turquoise hover:text-turquoise-bright uppercase">
                + Reveal Next Hint
              </button>
            )}
            {phraseResult === null ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitGuess()}
                  placeholder="Your guess..."
                  className="flex-1 p-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500 font-mono"
                />
                <button onClick={submitGuess} className="px-3 py-2 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1">
                  <Send className="w-3.5 h-3.5" /> Guess
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-lg border border-turquoise-500/30 bg-turquoise-500/5">
                <span className={`text-xs font-mono font-bold ${phraseResult === "win" ? "text-emerald-400" : "text-slate-300"}`}>
                  {phraseResult === "win" ? "Correct! +15 XP" : `Answer: ${phrase.answer}`}
                </span>
              </div>
            )}
          </div>

          {/* Chess */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-turquoise uppercase font-bold flex items-center gap-1">
                <Castle className="w-3.5 h-3.5" /> Chess Board
              </span>
              <button onClick={resetChess} className="text-[10px] font-mono text-slate-400 hover:text-turquoise flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Click a piece, then a target square to move.</p>
            <div className="grid grid-cols-8 gap-0 w-full max-w-[280px] mx-auto border border-slate-700">
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isSel = selected && selected.r === r && selected.c === c;
                  const dark = (r + c) % 2 === 1;
                  const pieceLabel: Record<string, string> = {
                    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
                    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
                  };
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => clickSquare(r, c)}
                      className={`aspect-square flex items-center justify-center text-lg leading-none ${
                        isSel ? "bg-turquoise-500 text-slate-950" : dark ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-900"
                      }`}
                    >
                      {cell === " " ? "" : (pieceLabel[cell] || cell)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 5. PROJECT TRACKING STREAKS */}
      <SectionCard icon={<Target className="w-4 h-4 text-turquoise" />} title="Project Tracking Streaks">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
            <span className="block text-[9px] font-mono text-slate-500 uppercase">Project Streak</span>
            <span className="text-sm font-bold font-mono text-turquoise">📈 {projectStreak.count} Days</span>
          </div>
          <button onClick={logProject} className="px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1">
            <Footprints className="w-4 h-4" /> Log Today's Progress (+10 XP)
          </button>
        </div>
        <div className="mt-3">
          <label className="text-[10px] font-mono text-slate-400 uppercase">Project Note</label>
          <textarea
            rows={2}
            value={projectNote}
            onChange={e => setProjectNote(e.target.value)}
            placeholder="What did you work on today?"
            className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500 font-mono"
          />
        </div>
      </SectionCard>

      {/* 6. NOTEBOOK LOGGING TASKS: Daily Meals */}
      <SectionCard icon={<Utensils className="w-4 h-4 text-turquoise" />} title="Notebook Logging — Daily Meals">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newMeal}
            onChange={e => setNewMeal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMeal()}
            placeholder="Log a meal (e.g., Oatmeal & berries)..."
            className="flex-1 pl-3 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500 font-mono"
          />
          <button onClick={addMeal} className="px-3 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1">
            <Plus className="w-4 h-4" /> Log (+8 XP)
          </button>
        </div>
        <div className="space-y-2">
          {meals.length === 0 && <p className="text-[11px] text-slate-500 font-mono">No meals logged yet.</p>}
          {meals.map(m => (
            <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-200">{m.text}</span>
              <span className="text-[10px] font-mono text-slate-500">{m.time}</span>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}

/* --------------------------- small sub-components --------------------------- */
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#0a1b1f]/60 border border-turquoise-500/20 p-4 rounded-2xl backdrop-blur-md">
      <h3 className="text-xs font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-2 mb-3">
        {icon}
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}
