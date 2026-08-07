import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Award, Clock, Lightbulb, Mic, Volume2, Plus, Trash2, Check, ArrowRight, Bell, HelpCircle } from "lucide-react";
import { JournalEntry, RoutineTask, LifeGoal, Reminder, Idea } from "../types";

interface NotesWorkspaceProps {
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
}

export default function NotesWorkspace({ xp, onAddXp, onNavigateToView }: NotesWorkspaceProps) {
  const [activeScope, setActiveScope] = useState<"diary" | "routine" | "goals" | "reminders" | "ideas">("diary");

  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const [pendingChallengeAction, setPendingChallengeAction] = useState<{ challengeId: string; stepNumber: number; actionType: string } | null>(null);

  // Form States
  // Journal Form
  const [journalText, setJournalText] = useState("");
  const [journalTheme, setJournalTheme] = useState("Deep Reflection");
  const [journalMood, setJournalMood] = useState("Peaceful");
  const [journalReminder, setJournalReminder] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [flippedJournalId, setFlippedJournalId] = useState<string | null>(null);

  // Routine Form
  const [routineName, setRoutineName] = useState("");
  const [routineTime, setRoutineTime] = useState("");
  const [routineRecur, setRoutineRecur] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Annually'>("Daily");
  const [routineLife, setRoutineLife] = useState<'Permanent' | 'Temporary'>("Permanent");
  const [routineExpiry, setRoutineExpiry] = useState("");

  // Goals Form
  const [goalTitle, setGoalTitle] = useState("");
  const [goalContent, setGoalContent] = useState("");

  // Reminders Form
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderInterval, setReminderInterval] = useState<'once' | '4x-daily' | 'custom'>("once");
  const [customInterval, setCustomInterval] = useState("08:00, 12:00, 16:00, 20:00");

  // Ideas Form
  const [ideaText, setIdeaText] = useState("");
  const [ideaTheme, setIdeaTheme] = useState<'general' | 'high-contrast' | 'dark-mode' | 'light-mode' | 'dyslexia-friendly'>("general");
  const [selectedIdeaFilter, setSelectedIdeaFilter] = useState<string>("all");

  // Countdown timers updater
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Load initial notes state from localStorage
    const savedJournals = localStorage.getItem("mb_journals");
    if (savedJournals) setJournals(JSON.parse(savedJournals));

    const savedRoutines = localStorage.getItem("mb_routines");
    if (savedRoutines) {
      const parsed: RoutineTask[] = JSON.parse(savedRoutines);
      // Run checklist resets check
      const checkedResets = parsed.map(r => {
        if (r.completed && r.lastCompletedTimestamp) {
          const lastDate = new Date(r.lastCompletedTimestamp);
          const now = new Date();
          let shouldReset = false;

          if (r.recurrence === "Daily") {
            // Reset if day has changed
            shouldReset = now.getDate() !== lastDate.getDate() || now.getMonth() !== lastDate.getMonth() || now.getFullYear() !== lastDate.getFullYear();
          } else if (r.recurrence === "Weekly") {
            // Reset if week has changed (diff > 7 days)
            const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
            shouldReset = diffDays >= 7;
          } else if (r.recurrence === "Monthly") {
            // Reset if month has changed
            shouldReset = now.getMonth() !== lastDate.getMonth() || now.getFullYear() !== lastDate.getFullYear();
          } else if (r.recurrence === "Annually") {
            shouldReset = now.getFullYear() !== lastDate.getFullYear();
          }

          if (shouldReset) {
            return { ...r, completed: false };
          }
        }
        return r;
      });
      setRoutines(checkedResets);
    }

    const savedGoals = localStorage.getItem("mb_goals");
    if (savedGoals) setGoals(JSON.parse(savedGoals));

    const savedReminders = localStorage.getItem("mb_reminders");
    if (savedReminders) setReminders(JSON.parse(savedReminders));

    const savedIdeas = localStorage.getItem("mb_ideas");
    if (savedIdeas) setIdeas(JSON.parse(savedIdeas));

    // Load pending challenge tool action
    const savedPending = localStorage.getItem("mb_pending_challenge_tool_action");
    if (savedPending) {
      try {
        const parsed = JSON.parse(savedPending);
        if (parsed.view === 'notes') {
          setPendingChallengeAction(parsed);
          if (parsed.actionType === 'create_routine') setActiveScope("routine");
          else if (parsed.actionType === 'create_reminder') setActiveScope("reminders");
          else if (parsed.actionType === 'create_goal') setActiveScope("goals");
          else setActiveScope("diary");
        }
      } catch (e) {
        console.error("Failed to parse pending challenge action", e);
      }
    }

    // Seed mock details if empty to guide the user beautifully
    if (!savedGoals) {
      const defaultGoals: LifeGoal[] = [
        { id: "g1", title: "🌠 Mastering Astrophotography", whyItMatters: "- Purchase an equatorial mount telescope mount by Winter.\n- Capture 10 clear nebulae transits under Waning Crescent skies.\n- Complete MoonBird challenges regularly to maintain focus.", actionSteps: ["Step 1: Research mounts", "Step 2: Save budget", "Step 3: First capture"], commencementDate: "2026-09-01", priority: "High" }
      ];
      setGoals(defaultGoals);
      localStorage.setItem("mb_goals", JSON.stringify(defaultGoals));
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state functions
  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const recordChallengeStepCompletion = () => {
    if (!pendingChallengeAction) return;
    const key = `${pendingChallengeAction.challengeId}-step-${pendingChallengeAction.stepNumber}`;
    const existing = localStorage.getItem("mb_challenge_step_actions");
    const actions = existing ? JSON.parse(existing) : {};
    actions[key] = {
      id: key,
      challengeId: pendingChallengeAction.challengeId,
      stepNumber: pendingChallengeAction.stepNumber,
      actionType: pendingChallengeAction.actionType,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem("mb_challenge_step_actions", JSON.stringify(actions));
    localStorage.removeItem("mb_pending_challenge_tool_action");
    setPendingChallengeAction(null);
    onNavigateToView?.("challenges");
  };

  // 1. Journal Handlers
  const handleAddJournal = () => {
    if (!journalText.trim()) return;
    const entry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      content: journalText,
      theme: journalTheme,
      mood: journalMood,
      reminderDate: journalReminder || undefined,
      timestamp: new Date().toISOString()
    };
    const updated = [entry, ...journals];
    setJournals(updated);
    saveToStorage("mb_journals", updated);
    setJournalText("");
    setJournalReminder("");
    onAddXp(20); // Award XP for journaling!
    if (pendingChallengeAction?.actionType === 'create_journal') {
      recordChallengeStepCompletion();
    }
  };

  const handleSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsRecording(true);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setJournalText((prev) => (prev ? prev + " " + transcript : transcript));
    };

    rec.start();
  };

  const handleSpeakJournal = (text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Text to Speech is not supported in this browser.");
      return;
    }
    // Cancel any active speaker
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleDeleteJournal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = journals.filter(j => j.id !== id);
    setJournals(updated);
    saveToStorage("mb_journals", updated);
  };

  // 2. Routine Handlers
  const handleAddRoutine = () => {
    if (!routineName.trim() || !routineTime.trim()) return;
    const r: RoutineTask = {
      id: `r-${Date.now()}`,
      name: routineName,
      timeFrame: routineTime,
      completed: false,
      recurrence: routineRecur,
      lifespan: routineLife,
      expiryDate: routineLife === "Temporary" ? routineExpiry : undefined
    };
    const updated = [...routines, r];
    setRoutines(updated);
    saveToStorage("mb_routines", updated);
    setRoutineName("");
    setRoutineTime("");
    setRoutineExpiry("");
    onAddXp(15);
    if (pendingChallengeAction?.actionType === 'create_routine') {
      recordChallengeStepCompletion();
    }
  };

  const handleToggleRoutine = (id: string) => {
    const updated = routines.map(r => {
      if (r.id === id) {
        const nextCompleted = !r.completed;
        if (nextCompleted) onAddXp(10); // Reward completing tasks
        return {
          ...r,
          completed: nextCompleted,
          lastCompletedTimestamp: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return r;
    });
    setRoutines(updated);
    saveToStorage("mb_routines", updated);
  };

  const handleDeleteRoutine = (id: string) => {
    const updated = routines.filter(r => r.id !== id);
    setRoutines(updated);
    saveToStorage("mb_routines", updated);
  };

  // 3. Goals Handlers
  const handleAddGoal = () => {
    if (!goalTitle.trim() || !goalContent.trim()) return;
    const g: LifeGoal = {
      id: `g-${Date.now()}`,
      title: goalTitle,
      whyItMatters: goalContent,
      actionSteps: ["Step 1: Planning and research", "Step 2: Resource setup", "Step 3: Initial commencement"],
      commencementDate: new Date().toISOString().split("T")[0],
      priority: "High"
    };
    const updated = [...goals, g];
    setGoals(updated);
    saveToStorage("mb_goals", updated);
    setGoalTitle("");
    setGoalContent("");
    onAddXp(25);
    if (pendingChallengeAction?.actionType === 'create_goal') {
      recordChallengeStepCompletion();
    }
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    saveToStorage("mb_goals", updated);
  };

  // 4. Reminders Handlers
  const handleAddReminder = () => {
    if (!reminderText.trim() || !reminderTime.trim()) return;
    const r: Reminder = {
      id: `rem-${Date.now()}`,
      text: reminderText,
      datetime: reminderTime,
      interval: reminderInterval,
      customHours: reminderInterval === "custom" ? customInterval : undefined,
      completed: false
    };
    const updated = [...reminders, r];
    setReminders(updated);
    saveToStorage("mb_reminders", updated);
    setReminderText("");
    setReminderTime("");
    onAddXp(10);
    if (pendingChallengeAction?.actionType === 'create_reminder') {
      recordChallengeStepCompletion();
    }
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveToStorage("mb_reminders", updated);
  };

  const calculateRemainingTime = (isoString: string) => {
    const target = new Date(isoString).getTime();
    const now = currentTime.getTime();
    const diff = target - now;

    if (diff <= 0) return "Alert: Countdown complete!";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // 5. Ideas Handlers
  const handleAddIdea = () => {
    if (!ideaText.trim()) return;
    const i: Idea = {
      id: `i-${Date.now()}`,
      content: ideaText,
      theme: ideaTheme,
      timestamp: new Date().toLocaleDateString()
    };
    const updated = [i, ...ideas];
    setIdeas(updated);
    saveToStorage("mb_ideas", updated);
    setIdeaText("");
    onAddXp(15);
  };

  const handleDeleteIdea = (id: string) => {
    const updated = ideas.filter(i => i.id !== id);
    setIdeas(updated);
    saveToStorage("mb_ideas", updated);
  };

  const filteredIdeas = selectedIdeaFilter === "all" 
    ? ideas 
    : ideas.filter(i => i.theme === selectedIdeaFilter);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 text-slate-100 max-w-6xl mx-auto">
      {pendingChallengeAction && (
        <div className="col-span-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-yellow-400 uppercase block font-bold">Challenge Action Required</span>
            <span className="text-xs text-slate-200 font-mono">{pendingChallengeAction.description || 'Complete this step to continue your challenge'}</span>
          </div>
          <button
            onClick={recordChallengeStepCompletion}
            className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            Done — Return to Challenge
          </button>
        </div>
      )}
      {/* Sidebar Scope Selector */}
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        <button
          onClick={() => setActiveScope("diary")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
            activeScope === "diary"
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md shadow-yellow-500/5"
              : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span>Daily Journal</span>
        </button>

        <button
          onClick={() => setActiveScope("routine")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
            activeScope === "routine"
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md shadow-yellow-500/5"
              : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>Timetable & Reset</span>
        </button>

        <button
          onClick={() => setActiveScope("goals")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
            activeScope === "goals"
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md shadow-yellow-500/5"
              : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4 flex-shrink-0" />
          <span>Life Goals</span>
        </button>

        <button
          onClick={() => setActiveScope("reminders")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
            activeScope === "reminders"
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md shadow-yellow-500/5"
              : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Deadlines & Alert</span>
        </button>

        <button
          onClick={() => setActiveScope("ideas")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
            activeScope === "ideas"
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md shadow-yellow-500/5"
              : "border-slate-800 bg-[#10121e]/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <Lightbulb className="w-4 h-4 flex-shrink-0" />
          <span>Ideas Boards</span>
        </button>
      </div>

      {/* Main Workspace Content Area */}
      <div className="md:col-span-3 min-h-[460px] p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        
        {/* SCOPE 1: DAILY JOURNAL */}
        {activeScope === "diary" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-yellow-400 tracking-wider uppercase">
                🌙 PERSONAL EXPERIENCE DIARY (P.E.D.)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Award: +20 XP</span>
            </div>

            <div className="space-y-3">
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Transcribe your deepest physical and meditative feeling as you coordinate with current Moon cycles..."
                className="w-full h-28 p-3 rounded-xl border border-slate-800 bg-slate-950/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 transition-colors"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Theme Category</label>
                  <select
                    value={journalTheme}
                    onChange={(e) => setJournalTheme(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/85 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Deep Reflection">🔮 Deep Reflection</option>
                    <option value="Starry Spark">✨ Starry Spark</option>
                    <option value="Solar Flare">☀️ Solar Flare</option>
                    <option value="Cozy Earth">🌲 Cozy Earth</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Current Mood State</label>
                  <select
                    value={journalMood}
                    onChange={(e) => setJournalMood(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/85 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Peaceful">🧘 Peaceful</option>
                    <option value="Energetic">⚡ Energetic</option>
                    <option value="Melancholy">🌧️ Melancholy</option>
                    <option value="Creative">🎨 Creative</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Sync Reminder (Optional)</label>
                  <input
                    type="datetime-local"
                    value={journalReminder}
                    onChange={(e) => setJournalReminder(e.target.value)}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-950/85 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSpeechToText}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 focus:outline-none ${
                      isRecording
                        ? "border-red-500 bg-red-500/10 text-red-400 animate-pulse"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isRecording ? "Transcribing..." : "Speak Now"}</span>
                  </button>
                </div>

                <button
                  onClick={handleAddJournal}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-slate-950 transition-all duration-300 shadow-lg shadow-yellow-500/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Journal Entry</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800/85 pt-4">
              <h4 className="text-xs font-bold font-mono text-slate-400 mb-3 tracking-widest uppercase">
                📖 Historical Logs (Flip Book Style)
              </h4>

              {journals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">
                  Your astral experience logs are currently empty. Save your first entry to generate a card.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {journals.map((j) => {
                    const isFlipped = flippedJournalId === j.id;
                    return (
                      <div
                        key={j.id}
                        onClick={() => setFlippedJournalId(isFlipped ? null : j.id)}
                        className="relative h-44 w-full cursor-pointer perspective-1000"
                      >
                        {/* 3D Flippable Book Layer */}
                        <div
                          className={`absolute inset-0 w-full h-full rounded-xl border transition-all duration-700 transform-style-3d ${
                            isFlipped ? "rotate-y-180" : ""
                          } ${
                            j.theme === "Starry Spark"
                              ? "border-amber-500/30 bg-amber-950/20"
                              : j.theme === "Solar Flare"
                              ? "border-red-500/30 bg-red-950/20"
                              : j.theme === "Cozy Earth"
                              ? "border-emerald-500/30 bg-emerald-950/20"
                              : "border-indigo-500/30 bg-indigo-950/20"
                          }`}
                        >
                          {/* FRONT OF THE CARD */}
                          <div className="absolute inset-0 w-full h-full p-4 flex flex-col justify-between backface-hidden">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                                  {j.date}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold font-mono bg-slate-950 text-yellow-400 border border-slate-800">
                                  {j.mood}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold font-mono text-slate-200 line-clamp-1">
                                {j.theme} Journal Entry
                              </h5>
                              <p className="text-[11px] text-slate-400 leading-relaxed mt-2 line-clamp-3">
                                {j.content}
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                              <span className="text-[9px] text-yellow-400 font-bold font-mono uppercase animate-pulse">
                                Click to Flip ↩
                              </span>
                              <button
                                onClick={(e) => handleDeleteJournal(j.id, e)}
                                className="p-1 rounded bg-slate-900/60 text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* BACK OF THE CARD */}
                          <div className="absolute inset-0 w-full h-full p-4 flex flex-col justify-between rotate-y-180 backface-hidden bg-slate-950/95 rounded-xl border border-slate-700/80">
                            <div className="overflow-y-auto max-h-28 pr-1 scrollbar-thin">
                              <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider block mb-1">
                                Complete Entry Logs
                              </span>
                              <p className="text-[11px] text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                                {j.content}
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSpeakJournal(j.content);
                                }}
                                className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-yellow-400"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Narrate Log</span>
                              </button>
                              <span className="text-[9px] text-slate-400 font-mono">Click to Reset</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCOPE 2: ROUTINE TIMETABLE */}
        {activeScope === "routine" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-yellow-400 tracking-wider uppercase">
                📅 LUNAR TIMETABLE & AUTORESETTING CHECKLIST
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Award: +15 XP</span>
            </div>

            {/* Timetable inputs */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Task Name</label>
                  <input
                    type="text"
                    value={routineName}
                    onChange={(e) => setRoutineName(e.target.value)}
                    placeholder="e.g., Deep Breathing Meditation"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Time Interval Frame</label>
                  <input
                    type="text"
                    value={routineTime}
                    onChange={(e) => setRoutineTime(e.target.value)}
                    placeholder="e.g., 08:00 - 08:30"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Resets Interval</label>
                  <select
                    value={routineRecur}
                    onChange={(e) => setRoutineRecur(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-[#0c0d16] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Daily">Daily Reset (24 Hours)</option>
                    <option value="Weekly">Weekly Reset (7 Days)</option>
                    <option value="Monthly">Monthly Reset (30 Days)</option>
                    <option value="Annually">Annually Reset</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Task Lifespan</label>
                  <select
                    value={routineLife}
                    onChange={(e) => setRoutineLife(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-[#0c0d16] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Permanent">Permanent Task</option>
                    <option value="Temporary">Temporary (Calendar Expiry)</option>
                  </select>
                </div>

                {routineLife === "Temporary" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400">Expiry Date Deadline</label>
                    <input
                      type="date"
                      value={routineExpiry}
                      onChange={(e) => setRoutineExpiry(e.target.value)}
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAddRoutine}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-slate-950 transition-all duration-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Routine Task</span>
                </button>
              </div>
            </div>

            {/* Timetable checklist list */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                📋 Routine Checklist
              </h4>

              {routines.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">
                  No routines defined yet. Set your daily meditation or study guidelines above.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {routines.map((r) => {
                    // Check if temporary and expired
                    const isExpired = r.lifespan === "Temporary" && r.expiryDate && new Date(r.expiryDate) < currentTime;
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                          r.completed
                            ? "border-emerald-500/20 bg-emerald-950/10 text-slate-400"
                            : isExpired
                            ? "border-slate-800 bg-slate-900/20 text-slate-500 line-through opacity-60"
                            : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => !isExpired && handleToggleRoutine(r.id)}
                            disabled={isExpired}
                            className={`flex items-center justify-center w-5 h-5 rounded-lg border transition-all duration-200 focus:outline-none ${
                              r.completed
                                ? "border-emerald-500 bg-emerald-500 text-slate-950"
                                : "border-slate-700 hover:border-yellow-500 bg-slate-950"
                            }`}
                          >
                            {r.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <span className={`text-xs font-bold font-mono block ${r.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {r.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                                🕒 {r.timeFrame}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-yellow-400">
                                🔄 {r.recurrence} Reset
                              </span>
                              {r.lifespan === "Temporary" && r.expiryDate && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isExpired ? "bg-red-950/40 text-red-400" : "bg-slate-900 text-amber-400"}`}>
                                  ⌛ Expiry: {r.expiryDate} {isExpired && "(Expired)"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRoutine(r.id)}
                          className="p-1.5 rounded-lg bg-slate-900/60 text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCOPE 3: LIFE GOALS */}
        {activeScope === "goals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-yellow-400 tracking-wider uppercase">
                🌠 LONG TERM LIFE GOALS & MILESTONES
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Award: +25 XP</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g., Reach Level 10 Moon Explorer"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">Goal Content & Action Steps (Use bullet points '-')</label>
                <textarea
                  value={goalContent}
                  onChange={(e) => setGoalContent(e.target.value)}
                  placeholder="Describe your long term milestone here..."
                  className="w-full h-24 p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAddGoal}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-slate-950 transition-all duration-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Life Goal</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                🌠 Active Milestones
              </h4>

              {goals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">No goals defined yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {goals.map((g) => (
                    <div key={g.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-bold font-mono text-yellow-400">
                          {g.title}
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                        {g.whyItMatters || (g as any).content}
                      </div>
                      {g.actionSteps && g.actionSteps.length > 0 && (
                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                          <span className="text-yellow-400 font-bold block">Action Steps & Date:</span>
                          <span className="block text-slate-300">{g.actionSteps.join(" → ")}</span>
                          <span className="block text-emerald-400">Locked Date: {g.commencementDate}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCOPE 4: REMINDERS & SIMULATED ALARMS */}
        {activeScope === "reminders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-yellow-400 tracking-wider uppercase">
                ⏰ SYSTEM DEADLINES & RECURRING ALARMS
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Award: +10 XP</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">Deadline Description</label>
                <input
                  type="text"
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                  placeholder="e.g., Stargazing window peak"
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Target Date-Time</label>
                  <input
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Alarm Frequency Interval</label>
                  <select
                    value={reminderInterval}
                    onChange={(e) => setReminderInterval(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-[#0c0d16] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="once">Once (Single countdown)</option>
                    <option value="4x-daily">4 Times a Day (Simulated checks)</option>
                    <option value="custom">Custom Hours</option>
                  </select>
                </div>
              </div>

              {reminderInterval === "custom" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Custom Alert Hours (Comma separated)</label>
                  <input
                    type="text"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAddReminder}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-slate-950 transition-all duration-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Alarm Reminder</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                ⏰ Countdown & Active Timers
              </h4>

              {reminders.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">No alert timers active.</p>
              ) : (
                <div className="space-y-2">
                  {reminders.map((rem) => {
                    const remainingStr = calculateRemainingTime(rem.datetime);
                    const isAlarming = remainingStr.startsWith("Alert:");
                    return (
                      <div
                        key={rem.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border ${
                          isAlarming
                            ? "border-red-500/30 bg-red-950/15 text-slate-300"
                            : "border-slate-800 bg-slate-950/40"
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-mono text-slate-200 block">
                            {rem.text}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                              🎯 Target: {new Date(rem.datetime).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-yellow-400">
                              🔊 Mode: {rem.interval === "4x-daily" ? "4x Daily Alarm" : rem.interval === "custom" ? "Custom Alerts" : "One-Shot"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg border bg-slate-950 ${
                            isAlarming
                              ? "border-red-500 text-red-400 animate-pulse"
                              : "border-slate-800 text-yellow-400"
                          }`}>
                            {remainingStr}
                          </span>
                          <button
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCOPE 5: IDEAS & MEMORIES ACCESSIBILITY BOARDS */}
        {activeScope === "ideas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-yellow-400 tracking-wider uppercase">
                💡 IDEAS BOARDS & COSMIC ACCESSIBILITY CAPTURES
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Award: +15 XP</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="Draft a freeform astronomical idea, astrophotography guide, or memory log..."
                className="w-full h-24 p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Accessibility Theme Tag</label>
                  <select
                    value={ideaTheme}
                    onChange={(e) => setIdeaTheme(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-[#0c0d16] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="general">📁 General</option>
                    <option value="high-contrast">🌗 High Contrast Text</option>
                    <option value="dark-mode">🌌 Dark Space Mode</option>
                    <option value="light-mode">☀️ Light Mode Accent</option>
                    <option value="dyslexia-friendly">📖 Dyslexia-Friendly Spacing</option>
                  </select>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    onClick={handleAddIdea}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-slate-950 transition-all duration-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Idea Snippet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filtration & Sorting panel */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 mr-1 uppercase">Filter Snippets:</span>
                {["all", "general", "high-contrast", "dark-mode", "light-mode", "dyslexia-friendly"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedIdeaFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all duration-200 focus:outline-none ${
                      selectedIdeaFilter === filter
                        ? "bg-yellow-500 text-slate-950 shadow"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {filter === "all" ? "🌐 Show All" : filter}
                  </button>
                ))}
              </div>

              {filteredIdeas.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">No idea snippets matches this filter category.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredIdeas.map((idea) => {
                    // Implement accessibility theme rules dynamically
                    let fontClass = "font-sans";
                    let bgClass = "bg-slate-950/40 border-slate-800";
                    let textClass = "text-slate-200";

                    if (idea.theme === "dyslexia-friendly") {
                      fontClass = "font-serif tracking-widest leading-loose";
                      bgClass = "bg-amber-100/5 border-amber-500/20";
                    } else if (idea.theme === "high-contrast") {
                      bgClass = "bg-black border-white/60";
                      textClass = "text-white font-extrabold";
                    } else if (idea.theme === "light-mode") {
                      bgClass = "bg-white/95 border-slate-200";
                      textClass = "text-slate-900";
                    } else if (idea.theme === "dark-mode") {
                      bgClass = "bg-[#05060b] border-indigo-900/50";
                      textClass = "text-cyan-100";
                    }

                    return (
                      <div key={idea.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${bgClass}`}>
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800/25 pb-1 mb-2">
                            <span className="text-[9px] font-mono text-slate-400">
                              Log: {idea.timestamp}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-yellow-400">
                              {idea.theme}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${textClass} ${fontClass} whitespace-pre-line`}>
                            {idea.content}
                          </p>
                        </div>

                        <div className="flex justify-end border-t border-slate-800/10 pt-2">
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
