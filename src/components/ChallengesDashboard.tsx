import React, { useState, useEffect } from "react";
import { Award, Lock, CheckCircle, Flame, ShieldAlert, Archive, HelpCircle, Users, Sun, Moon, Sparkles, Plus, AlertCircle, Filter, BookOpen, Compass, Search, Heart, Feather, Edit3, Share2, CheckSquare, ListPlus, Send } from "lucide-react";
import { Challenge, ChallengeStep, SurveyQuestion, BonusTask } from "../types";

interface ChallengesDashboardProps {
  xp: number;
  onAddXp: (amount: number) => void;
}

export default function ChallengesDashboard({ xp, onAddXp }: ChallengesDashboardProps) {
  const [activeTab, setActiveTab] = useState<"catalogued" | "milestones" | "builder">("catalogued");

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [completedChallenges, setCompletedChallenges] = useState<Record<string, boolean>>({});
  const [activeStreak, setActiveStreak] = useState(5);
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);

  // Detailed Challenge Execution Modal
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [stepProgress, setStepProgress] = useState<Record<number, boolean>>({});
  const [bonusProgress, setBonusProgress] = useState<Record<string, boolean>>({});
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number>>({});
  const [submissionNote, setSubmissionNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Challenge Builder Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Challenge['category']>("Mindfulness");
  const [newLevel, setNewLevel] = useState("Level One");
  const [newDescription, setNewDescription] = useState("");
  const [newXp, setNewXp] = useState(100);
  const [newSteps, setNewSteps] = useState<string[]>(["Identify primary trigger", "Set up friction barrier", "Complete survey"]);
  const [newSurveyPrompts, setNewSurveyPrompts] = useState<string[]>(["How effective was this challenge (1-5)?", "What was your main insight?"]);
  const [newBonusTasks, setNewBonusTasks] = useState<string[]>(["Share progress in live chat"]);

  // Hover metrics
  const [hoveredMetrics, setHoveredMetrics] = useState<string | null>(null);

  useEffect(() => {
    const savedCompleted = localStorage.getItem("mb_completed_challenges");
    if (savedCompleted) {
      setCompletedChallenges(JSON.parse(savedCompleted));
    }
    const savedCustom = localStorage.getItem("mb_custom_challenges");
    if (savedCustom) {
      setCustomChallenges(JSON.parse(savedCustom));
    }
  }, []);

  const saveCompleted = (updated: Record<string, boolean>) => {
    setCompletedChallenges(updated);
    localStorage.setItem("mb_completed_challenges", JSON.stringify(updated));
  };

  // Pre-configured Challenges (Including Challenge 4, 5, 6, 7, 8 requested by user)
  const defaultChallenges: Challenge[] = [
    {
      id: "ch-4",
      number: 4,
      title: "Perspective & News Audit",
      level: "Level One",
      category: "Mindfulness",
      description: "Evaluate current news coverage for source reliability, core takeaways, local impact, and actionability before sharing insights.",
      rewardXp: 90,
      steps: [
        { stepNumber: 1, title: "News Coverage Selection", description: "Select a recent news article or media report from a major outlet." },
        { stepNumber: 2, title: "Source Reliability Assessment", description: "Rate the reliability, neutrality, and editorial standards of the coverage." },
        { stepNumber: 3, title: "Takeaway & Impact Evaluation", description: "Summarize the core takeaway and assess direct impact on you/your neighborhood." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Source Reliability: On a scale of 1 to 5, how trustworthy and unbiased did this news coverage feel?", type: "scale" },
        { id: "q2", prompt: "Core Takeaway: In one or two sentences, what was the most important fact or message you learned?", type: "text" },
        { id: "q3", prompt: "Local Impact: Does this issue directly affect you, your family, or your neighborhood? (Yes/No, and why?)", type: "text" },
        { id: "q4", prompt: "Actionability: Is there a clear action or solution proposed in the coverage, or is it just reporting a problem?", type: "choice", options: ["Clear Action Proposed", "Problem Only", "Unclear / Mixed"] },
        { id: "q5", prompt: "Discussion Value: Would you feel comfortable sharing or discussing this topic with a peer in Live Chat?", type: "yesno" }
      ],
      bonusTasks: [
        { id: "b1", title: "Current Event Verification Quiz", description: "Answer current-event verification questions in the feed.", xpReward: 20 },
        { id: "b2", title: "Public Feed Perspective Entry", description: "Share your perspective entry publicly on your personal feed (posts).", xpReward: 25 }
      ],
      completionRequirement: "Submit your written perspective and survey answers to complete the audit and mark the challenge as Finished.",
      comments: [],
      completedBy: []
    },
    {
      id: "ch-5",
      number: 5,
      title: "Cut the Habit (Inspired by James Clear)",
      level: "Level Two",
      category: "Self-Improvement",
      description: "Break unwanted habits by identifying primary triggers, writing identity reframing statements, and setting physical or digital friction barriers.",
      rewardXp: 120,
      steps: [
        { stepNumber: 1, title: "Identify & Log Trigger", description: "Identify the habit you want to quit and log its primary trigger (time, location, emotional state, or people) in your Journal.", actionType: "log_journal" },
        { stepNumber: 2, title: "Identity Reframing Statement", description: "Reframe your mindset in your Journal by writing an identity statement (e.g., 'I am not the type of person who does X').", actionType: "log_journal" },
        { stepNumber: 3, title: "Set Up Friction Barrier", description: "Increase friction by setting up at least one physical or digital barrier (e.g., app blocker, physical displacement) to make the habit inconvenient.", actionType: "habit_barrier" },
        { stepNumber: 4, title: "Tailored Survey Feedback", description: "Answer survey questions about trigger awareness, barrier friction, identity shift, and support needs." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Trigger Awareness: On a scale of 1 to 5, how easy was it to identify the exact moment or mood that triggers this habit?", type: "scale" },
        { id: "q2", prompt: "Friction Check: Did the barrier you set up successfully delay or stop you the last time you felt the urge?", type: "text" },
        { id: "q3", prompt: "Identity Shift: How convincing does your new identity statement feel to you right now?", type: "text" },
        { id: "q4", prompt: "Support Need: Would having an accountability partner or Habit Contract make you more likely to stick with this change?", type: "yesno" }
      ],
      bonusTasks: [
        { id: "b1", title: "Habit Contract Creation", description: "Create a Habit Contract in your Journal with an accountability partner or a disincentive penalty for slipping up.", xpReward: 30 },
        { id: "b2", title: "5-Day Streak Avoidance Log", description: "Maintain a 5-day streak of successfully avoiding the habit and log it using Snapshot.", xpReward: 40 }
      ],
      completionRequirement: "Submit your trigger log, friction-barrier plan, and survey answers to mark the challenge as Finished.",
      comments: [],
      completedBy: []
    },
    {
      id: "ch-6",
      number: 6,
      title: "Vital Check",
      level: "Level One",
      category: "Health",
      description: "Visit a local health center or clinic, record your core vitals, research what your readings mean in the disease catalogue, and craft a 30-day health plan.",
      rewardXp: 110,
      steps: [
        { stepNumber: 1, title: "Record Vitals at Clinic", description: "Visit a local health clinic or medical center and get your basic vitals recorded (e.g., blood pressure, pulse, weight, or blood sugar).", actionType: "clinic_visit" },
        { stepNumber: 2, title: "Consult Health Catalogue", description: "Research or consult with a health professional / the disease catalogue to find out what your readings mean and gauge your current overall health status." },
        { stepNumber: 3, title: "Log Health Gauge in Journal", description: "Log your health-status gauge in your Journal using the health template.", actionType: "log_journal" },
        { stepNumber: 4, title: "Draft 30-Day Actionable Health Plan", description: "Draft an actionable personal plan in your Journal outlining how you will either maintain your good health or improve your vitals over the next 30 days." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Clinic Visit Status: Did you obtain professional readings for Blood Pressure / Pulse / Blood Sugar?", type: "yesno" },
        { id: "q2", prompt: "Vital Assessment: Based on standard medical ranges, how do your vitals compare?", type: "choice", options: ["Optimal / Normal Range", "Slightly Elevated", "Requires Lifestyle Adjustment"] },
        { id: "q3", prompt: "30-Day Goal: What is your primary 30-day health improvement goal?", type: "text" }
      ],
      bonusTasks: [
        { id: "b1", title: "Disease Catalogue Exploration", description: "Explore the disease and health catalogue to learn about preventive measures for one common health condition.", xpReward: 25 },
        { id: "b2", title: "MoonDial Health Reminders", description: "Set up daily water or exercise reminders on MoonDial to support your health plan.", xpReward: 30 }
      ],
      completionRequirement: "Save your actionable health plan and vital-summary log in your Journal to deem the challenge officially Finished.",
      comments: [],
      completedBy: []
    },
    {
      id: "ch-7",
      number: 7,
      title: "Sky Watcher",
      level: "Level Two",
      category: "Astronomy",
      description: "Observe an upcoming astronomical event from the Astro Events catalogue, mark it on your MoonDial calendar with reminders, and write a live observation log.",
      rewardXp: 130,
      steps: [
        { stepNumber: 1, title: "Select Astro Event", description: "Go to the Astro Events catalogue and observe the nearest upcoming astro event, or browse and select one specific event that interests you.", actionType: "observe_event" },
        { stepNumber: 2, title: "Calendar & Sound Reminder", description: "Mark the exact event date on your MoonDial calendar and set an active sound reminder.", actionType: "set_dial_reminder" },
        { stepNumber: 3, title: "Plan Observation Activity", description: "Plan a specific observation activity in your Journal for that day (e.g., outdoor viewing spot, equipment needed, or safety measures)." },
        { stepNumber: 4, title: "Live Celestial Capture", description: "On the scheduled date, attempt to capture the astronomical event with your eyes (or a camera)." },
        { stepNumber: 5, title: "Detailed Observation Log", description: "Write a detailed log of your live observation experience in your Journal.", actionType: "log_journal" }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Observation Conditions: How clear was the sky during your observation (1-5)?", type: "scale" },
        { id: "q2", prompt: "Event Details: Which astronomical event did you observe?", type: "text" },
        { id: "q3", prompt: "Experience Summary: What was the highlight of your observation session?", type: "text" }
      ],
      bonusTasks: [
        { id: "b1", title: "Personal Feed Event Share", description: "Share a photo or written description of the astro event on your personal feed (posts).", xpReward: 35 },
        { id: "b2", title: "Live Chat Stargazer Connect", description: "Connect with another online user in Live Chat during the astro event to compare observations.", xpReward: 35 }
      ],
      completionRequirement: "Log your final live-experience entry on the scheduled date to deem the challenge Finished.",
      comments: [],
      completedBy: []
    },
    {
      id: "ch-8",
      number: 8,
      title: "Life Blueprint",
      level: "Level One",
      category: "Life Blueprint",
      description: "Construct a master lifetime blueprint: list core lifetime goals, explain why each matters deeply, break a priority goal into actionable steps, and lock its commencement date.",
      rewardXp: 150,
      steps: [
        { stepNumber: 1, title: "Master Life Goals List", description: "Create a list in your Journal of the core things you want to achieve in this lifetime (your master life goals).", actionType: "life_goal" },
        { stepNumber: 2, title: "Purpose & Meaning Reflection", description: "Reflect on each goal and write a short explanation next to it detailing why that goal matters deeply to you." },
        { stepNumber: 3, title: "Select Priority Focus Goal", description: "Select one priority goal from your list to focus on right now." },
        { stepNumber: 4, title: "Sequential Action Breakdown", description: "Break down that single goal into sequential, actionable steps inside your Journal." },
        { stepNumber: 5, title: "Lock Commencement Date", description: "Set an exact commencement date on your MoonDial calendar for when you will take your very first step toward that goal.", actionType: "set_dial_reminder" }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Priority Goal Title: What single goal did you choose as your immediate focus?", type: "text" },
        { id: "q2", prompt: "Commencement Date: What exact date did you lock on MoonDial calendar to begin step 1?", type: "text" },
        { id: "q3", prompt: "Clarity Rating: On a scale of 1 to 5, how clear and actionable are your sequential steps?", type: "scale" }
      ],
      bonusTasks: [
        { id: "b1", title: "Add Skill to Portfolio", description: "Add a required skill for your chosen goal from the Skills Catalogue to your Portfolio as an active focus area.", xpReward: 30 },
        { id: "b2", title: "Accountability Date Share", description: "Share your target commencement date with a friend or in Live Chat to build personal accountability.", xpReward: 30 }
      ],
      completionRequirement: "Confirm your chosen goal, action steps, and locked commencement date in your Journal to deem the challenge Finished.",
      comments: [],
      completedBy: []
    }
  ];

  const allChallenges = [...defaultChallenges, ...customChallenges];

  const filteredChallenges = allChallenges.filter(ch => {
    const matchesSearch = ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ch.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ch.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleOpenChallenge = (ch: Challenge) => {
    setSelectedChallenge(ch);
    setStepProgress({});
    setBonusProgress({});
    setSurveyAnswers({});
    setSubmissionNote("");
    setModalError(null);
  };

  const handleToggleStep = (stepNumber: number) => {
    setStepProgress(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const handleToggleBonus = (bonusId: string) => {
    setBonusProgress(prev => ({ ...prev, [bonusId]: !prev[bonusId] }));
  };

  const handleSubmitChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge) return;

    // Check mandatory steps
    const totalSteps = selectedChallenge.steps.length;
    const checkedSteps = Object.values(stepProgress).filter(Boolean).length;

    if (checkedSteps < totalSteps) {
      setModalError(`Please complete all ${totalSteps} mandatory steps before submitting.`);
      return;
    }

    if (!submissionNote.trim()) {
      setModalError("Please write your final submission entry or log notes before completing.");
      return;
    }

    // Calculate total XP: Reward + bonus tasks
    let earnedXp = selectedChallenge.rewardXp;
    selectedChallenge.bonusTasks.forEach(b => {
      if (bonusProgress[b.id]) {
        earnedXp += b.xpReward;
      }
    });

    const updatedCompleted = { ...completedChallenges, [selectedChallenge.id]: true };
    saveCompleted(updatedCompleted);
    onAddXp(earnedXp);

    // Save submission as journal entry if needed
    const journalLogs = JSON.parse(localStorage.getItem("mb_journal_entries") || "[]");
    journalLogs.unshift({
      id: "j-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      content: `[Challenge Completed: ${selectedChallenge.title}]\n\n${submissionNote}\n\nSurvey Answers:\n${JSON.stringify(surveyAnswers, null, 2)}`,
      theme: "dark",
      mood: "Accomplished",
      category: selectedChallenge.title.includes("Habit") ? "Trigger Log" :
                selectedChallenge.title.includes("Vital") ? "Health Vitals" :
                selectedChallenge.title.includes("Sky") ? "Astro Observation" :
                selectedChallenge.title.includes("Blueprint") ? "Life Goals" : "Action Plan",
      timestamp: new Date().toLocaleTimeString()
    });
    localStorage.setItem("mb_journal_entries", JSON.stringify(journalLogs));

    alert(`🎉 Challenge "${selectedChallenge.title}" officially FINISHED!\n\nAwarded: +${earnedXp} XP!\nSaved entry to your Journal.`);
    setSelectedChallenge(null);
  };

  // Create custom challenge
  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      alert("Please enter a title and description for your challenge.");
      return;
    }

    const created: Challenge = {
      id: "custom-" + Date.now(),
      title: newTitle.trim(),
      level: newLevel,
      category: newCategory,
      description: newDescription.trim(),
      rewardXp: newXp,
      steps: newSteps.filter(s => s.trim()).map((s, idx) => ({
        stepNumber: idx + 1,
        title: `Step ${idx + 1}`,
        description: s.trim()
      })),
      surveyQuestions: newSurveyPrompts.filter(p => p.trim()).map((p, idx) => ({
        id: `sq-${idx}`,
        prompt: p.trim(),
        type: "text"
      })),
      bonusTasks: newBonusTasks.filter(b => b.trim()).map((b, idx) => ({
        id: `bt-${idx}`,
        title: `Bonus ${idx + 1}`,
        description: b.trim(),
        xpReward: 20
      })),
      completionRequirement: "Submit custom written reflection to complete challenge.",
      comments: [],
      completedBy: [],
      isCustom: true
    };

    const nextCustom = [created, ...customChallenges];
    setCustomChallenges(nextCustom);
    localStorage.setItem("mb_custom_challenges", JSON.stringify(nextCustom));

    // Reset builder inputs
    setNewTitle("");
    setNewDescription("");
    setNewXp(100);
    setActiveTab("catalogued");
    alert("✨ Custom Challenge created successfully! It is now live in your Catalogued list.");
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">
      
      {/* Top Banner & Stats */}
      <div 
        className="bg-[#090b14] border border-yellow-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 cursor-help relative group"
        onMouseEnter={() => setHoveredMetrics(`Active_Streak: ${activeStreak} days | XP_Ledger: ${xp} | Completed_Count: ${Object.keys(completedChallenges).length}`)}
        onMouseLeave={() => setHoveredMetrics(null)}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
              <span>🚀 MoonBird Challenge Engine & Builder</span>
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded text-[10px]">Active</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Complete onboarding habit, vital, sky watcher, and blueprint challenges or build your own.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[9px] font-mono text-slate-500 block uppercase">STREAK</span>
            <span className="text-sm font-bold font-mono text-yellow-400">🔥 {activeStreak} Days</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[9px] font-mono text-slate-500 block uppercase">ESCROW BAL</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{xp} XP</span>
          </div>
        </div>

        {hoveredMetrics && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#070b13] border border-emerald-400/40 rounded-xl p-3 shadow-2xl font-mono text-[10px] text-emerald-400">
            {hoveredMetrics}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#0c0d16] p-1.5 rounded-2xl border border-slate-800 font-mono text-xs font-bold">
        <button
          onClick={() => setActiveTab("catalogued")}
          className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "catalogued"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catalogued Challenges ({allChallenges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("milestones")}
          className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "milestones"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Milestone Level Tracks</span>
        </button>

        <button
          onClick={() => setActiveTab("builder")}
          className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "builder"
              ? "bg-yellow-500 text-slate-950 shadow-md animate-pulse"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Challenge Builder</span>
        </button>
      </div>

      {/* TAB 1: CATALOGUED CHALLENGES */}
      {activeTab === "catalogued" && (
        <div className="space-y-6">
          
          {/* Search & Category Filter */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search challenges by title or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-500 font-mono"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "Mindfulness", "Self-Improvement", "Health", "Astronomy", "Life Blueprint", "Custom"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat === "all" ? "🌐 ALL" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map(ch => {
              const isFinished = completedChallenges[ch.id];
              return (
                <div
                  key={ch.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isFinished
                      ? "border-emerald-900/60 bg-emerald-950/10 text-slate-300"
                      : "border-slate-800 bg-slate-950/40 hover:border-yellow-500/40 hover:bg-slate-950/80"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ch.number && (
                          <span className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-xs font-bold flex items-center justify-center">
                            #{ch.number}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider font-semibold px-2 py-0.5 bg-yellow-500/5 rounded border border-yellow-500/20">
                          {ch.category}
                        </span>
                        {ch.isCustom && (
                          <span className="text-[9px] font-mono text-emerald-400 px-1.5 py-0.2 bg-emerald-950/40 border border-emerald-900 rounded">
                            Custom User Challenge
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                        {ch.level || "Level One"}
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold font-mono ${isFinished ? "text-emerald-300 line-through" : "text-slate-100"}`}>
                      {ch.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      {ch.description}
                    </p>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-850 space-y-1 font-mono text-[10.5px]">
                      <span className="text-slate-400 block font-semibold">📋 Requirements:</span>
                      <span className="text-slate-300 block">{ch.steps.length} Mandatory Steps • {ch.surveyQuestions.length} Survey Prompts • {ch.bonusTasks.length} Bonus Tasks</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-900">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      🎁 Reward: +{ch.rewardXp} XP
                    </span>

                    {isFinished ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>FINISHED</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenChallenge(ch)}
                        className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-500/10 flex items-center gap-1.5"
                      >
                        <span>Start Challenge</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: MILESTONE TRACKS */}
      {activeTab === "milestones" && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-wider">
              🏆 Level Progress & Celestial Milestones
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Ascend through Level One (Explorer), Level Two (Stargazer), and Level Three (Cosmic Architect) as you complete onboarding challenges, log habit triggers, and set MoonDial calendar commencement dates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-yellow-400 font-bold uppercase block">Level One: Beginner</span>
              <p className="text-[11px] text-slate-400">Complete News Perspective Audit, Vital Check, and Life Blueprint.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Basic Journal & Health Templates</div>
            </div>

            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-yellow-400 font-bold uppercase block">Level Two: Stargazer</span>
              <p className="text-[11px] text-slate-400">Complete Cut the Habit (James Clear) and Sky Watcher Astro Event Log.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Sound Reminders & Challenge Builder</div>
            </div>

            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-yellow-400 font-bold uppercase block">Level Three: Cosmic Master</span>
              <p className="text-[11px] text-slate-400">Maintain a 10-day streak & share custom challenges with peers.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Tribe Chat Broadcast Badges</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHALLENGE BUILDER */}
      {activeTab === "builder" && (
        <form onSubmit={handleCreateChallenge} className="bg-[#0b0d18] border border-yellow-500/30 p-6 rounded-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-yellow-400" />
              <span>Construct a Custom MoonBird Challenge</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Define custom habit, health, astronomy, or productivity challenges for yourself and community members.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Challenge Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Morning Solar Hydration Sprint"
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
              >
                <option value="Mindfulness">Mindfulness</option>
                <option value="Self-Improvement">Self-Improvement</option>
                <option value="Health">Health</option>
                <option value="Astronomy">Astronomy</option>
                <option value="Life Blueprint">Life Blueprint</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Challenge Description</label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Explain the background purpose, steps involved, and intended outcome..."
              className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">XP Reward (10 - 200 XP)</label>
            <input
              type="number"
              min={10}
              max={200}
              value={newXp}
              onChange={(e) => setNewXp(Number(e.target.value))}
              className="w-full sm:w-48 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10"
          >
            Publish Custom Challenge
          </button>
        </form>
      )}

      {/* DETAILED CHALLENGE EXECUTION MODAL */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSubmitChallenge}
            className="w-full max-w-2xl bg-[#090b14] border border-yellow-500/40 p-6 rounded-2xl shadow-2xl space-y-5 my-8 relative"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-yellow-400 uppercase px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    {selectedChallenge.category}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {selectedChallenge.level}
                  </span>
                </div>
                <h2 className="text-base font-bold font-mono text-slate-100 mt-1">
                  {selectedChallenge.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="text-slate-500 hover:text-white text-xl focus:outline-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
              {selectedChallenge.description}
            </p>

            {/* MANDATORY STEPS CHECKLIST */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono text-yellow-400 uppercase flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-yellow-400" />
                <span>Mandatory Execution Steps</span>
              </h4>

              <div className="space-y-2">
                {selectedChallenge.steps.map((st) => {
                  const isChecked = stepProgress[st.stepNumber];
                  return (
                    <label
                      key={st.stepNumber}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500/40 bg-emerald-950/20 text-slate-200"
                          : "border-slate-800 bg-slate-950 hover:border-slate-750 text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!isChecked}
                        onChange={() => handleToggleStep(st.stepNumber)}
                        className="mt-0.5 accent-yellow-400 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold font-mono text-slate-200 block">
                          Step {st.stepNumber}: {st.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans leading-normal block">
                          {st.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* TAILORED SURVEY QUESTIONS */}
            {selectedChallenge.surveyQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-yellow-400 uppercase flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-yellow-400" />
                  <span>Tailored Survey & Feedback Prompts</span>
                </h4>

                <div className="space-y-3">
                  {selectedChallenge.surveyQuestions.map((q) => (
                    <div key={q.id} className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <label className="text-xs font-mono text-slate-200 block">
                        {q.prompt}
                      </label>

                      {q.type === "scale" ? (
                        <div className="flex gap-2 pt-1">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: num })}
                              className={`w-9 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === num
                                  ? "bg-yellow-500 text-slate-950 shadow-md"
                                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      ) : q.type === "yesno" ? (
                        <div className="flex gap-2 pt-1">
                          {["Yes", "No"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}
                              className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === opt
                                  ? "bg-yellow-500 text-slate-950"
                                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : q.type === "choice" && q.options ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}
                              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === opt
                                  ? "bg-yellow-500 text-slate-950"
                                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={(surveyAnswers[q.id] as string) || ""}
                          onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                          placeholder="Your answer..."
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BONUS TASKS */}
            {selectedChallenge.bonusTasks.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-yellow-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Bonus Tasks (+ Extra XP)</span>
                </h4>

                <div className="space-y-2">
                  {selectedChallenge.bonusTasks.map((b) => {
                    const isChecked = bonusProgress[b.id];
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={() => handleToggleBonus(b.id)}
                            className="accent-yellow-400 w-4 h-4"
                          />
                          <div>
                            <span className="text-xs font-bold font-mono text-slate-200 block">{b.title}</span>
                            <span className="text-[11px] text-slate-400 font-sans block">{b.description}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-yellow-400 shrink-0">+{b.xpReward} XP</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MANDATORY SUBMISSION NOTE */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-mono font-bold text-yellow-400 uppercase block">
                Completion Submission Entry (Required)
              </label>
              <p className="text-[11px] text-slate-400 font-sans">
                {selectedChallenge.completionRequirement}
              </p>
              <textarea
                required
                rows={3}
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                placeholder="Write your reflection, trigger log details, health vitals summary, observation experience, or blueprint action steps here..."
                className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500 font-mono"
              />
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono uppercase font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Finish & Claim XP</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
