import React, { useState, useEffect } from "react";
import {
  Calendar, Clock, Lightbulb, Bell, Plus, Trash2, Check, ArrowRight,
  Bot, Link2, FileText, Sparkles, ListChecks, Archive, Tag, Send,
  FolderPlus, PenLine, MessageSquarePlus
} from "lucide-react";

interface NotesWorkspaceProps {
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
}

type PlannerScope = "today" | "tomorrow" | "custom";
type IdeaCategory = "general" | "work" | "personal" | "health";

interface PlannerTask {
  id: string;
  text: string;
  done: boolean;
  date: string;
  deadline?: string;
  alertNote?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  links: string[];
  documents: string[];
  notes: string;
  brief: string;
  planner: { id: string; text: string; done: boolean }[];
}

interface ChallengeLog {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface CatalogueCategory {
  name: string;
  items: string[];
}

const PLANNER_KEY = "mb_planner_tasks";
const IDEA_KEY = "mb_ideas";
const PROJECT_KEY = "mb_projects";
const CHALLENGE_LOG_KEY = "mb_challenge_logs";
const CATALOGUE_KEY = "mb_personal_catalogues";

const IDEA_CATEGORIES: IdeaCategory[] = ["general", "work", "personal", "health"];

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function NotesWorkspace({ xp, onAddXp, onNavigateToView }: NotesWorkspaceProps) {
  const [activeScope, setActiveScope] = useState<"planner" | "ideas" | "projects" | "archives">("planner");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [plannerView, setPlannerView] = useState<PlannerScope>("today");
  const [customDate, setCustomDate] = useState(() => fmtDate(new Date()));
  const [plannerText, setPlannerText] = useState("");
  const [plannerDeadline, setPlannerDeadline] = useState("");
  const [plannerAlert, setPlannerAlert] = useState("");

  const [ideas, setIdeas] = useState<{ id: string; text: string; category: IdeaCategory; timestamp: string }[]>([]);
  const [ideaText, setIdeaText] = useState("");
  const [ideaCategory, setIdeaCategory] = useState<IdeaCategory>("general");

  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectBrief, setNewProjectBrief] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectLink, setProjectLink] = useState("");
  const [projectChatInput, setProjectChatInput] = useState("");
  const [projectChat, setProjectChat] = useState<{ sender: string; text: string }[]>([]);

  const [challengeLogs, setChallengeLogs] = useState<ChallengeLog[]>([]);
  const [challengeLogText, setChallengeLogText] = useState("");
  const [catalogues, setCatalogues] = useState<CatalogueCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("cars");
  const [catItemText, setCatItemText] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const save = (key: string, data: unknown) => localStorage.setItem(key, JSON.stringify(data));

  useEffect(() => {
    const load = <T,>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    setPlannerTasks(load<PlannerTask[]>(PLANNER_KEY, []));
    setIdeas(load(IDEA_KEY, []));
    setProjects(load<Project[]>(PROJECT_KEY, []));
    setChallengeLogs(load<ChallengeLog[]>(CHALLENGE_LOG_KEY, []));

    const cats = load<CatalogueCategory[]>(CATALOGUE_KEY, []);
    if (cats.length === 0) {
      const seeded: CatalogueCategory[] = [
        { name: "cars", items: [] },
        { name: "links", items: [] }
      ];
      setCatalogues(seeded);
      save(CATALOGUE_KEY, seeded);
    } else {
      setCatalogues(cats);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const plannerActiveDate = (): string => {
    if (plannerView === "today") return fmtDate(new Date());
    if (plannerView === "tomorrow") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return fmtDate(d);
    }
    return customDate;
  };

  const visiblePlannerTasks = plannerTasks.filter((t) => t.date === plannerActiveDate());

  const deadlineStatus = (deadline?: string, done?: boolean): "overdue" | "soon" | "none" => {
    if (!deadline || done) return "none";
    const target = new Date(deadline).getTime();
    const now = currentTime.getTime();
    if (isNaN(target)) return "none";
    if (target <= now) return "overdue";
    if (target - now <= 24 * 60 * 60 * 1000) return "soon";
    return "none";
  };

  const handleAddPlannerTask = () => {
    if (!plannerText.trim()) return;
    const task: PlannerTask = {
      id: `pt-${Date.now()}`,
      text: plannerText.trim(),
      done: false,
      date: plannerActiveDate(),
      deadline: plannerDeadline || undefined,
      alertNote: plannerAlert.trim() || undefined
    };
    const updated = [...plannerTasks, task];
    setPlannerTasks(updated);
    save(PLANNER_KEY, updated);
    setPlannerText("");
    setPlannerDeadline("");
    setPlannerAlert("");
    onAddXp(5);
  };

  const handleTogglePlannerTask = (id: string) => {
    const updated = plannerTasks.map((t) => {
      if (t.id !== id) return t;
      const next = !t.done;
      if (next && !t.done) onAddXp(10);
      return { ...t, done: next };
    });
    setPlannerTasks(updated);
    save(PLANNER_KEY, updated);
  };

  const handleDeletePlannerTask = (id: string) => {
    const updated = plannerTasks.filter((t) => t.id !== id);
    setPlannerTasks(updated);
    save(PLANNER_KEY, updated);
  };

  const handleAddIdea = () => {
    if (!ideaText.trim()) return;
    const i = { id: `i-${Date.now()}`, text: ideaText.trim(), category: ideaCategory, timestamp: new Date().toLocaleDateString() };
    const updated = [i, ...ideas];
    setIdeas(updated);
    save(IDEA_KEY, updated);
    setIdeaText("");
    onAddXp(10);
  };

  const handleDeleteIdea = (id: string) => {
    const updated = ideas.filter((i) => i.id !== id);
    setIdeas(updated);
    save(IDEA_KEY, updated);
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const p: Project = {
      id: `p-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      links: [],
      documents: [],
      notes: "",
      brief: "",
      planner: []
    };
    const updated = [...projects, p];
    setProjects(updated);
    save(PROJECT_KEY, updated);
    setNewProjectName("");
    setNewProjectDesc("");
    onAddXp(20);
  };

  const updateSelectedProject = (updater: (p: Project) => Project) => {
    if (!selectedProjectId) return;
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === selectedProjectId ? updater(p) : p));
      save(PROJECT_KEY, updated);
      return updated;
    });
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    save(PROJECT_KEY, updated);
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
      setProjectChat([]);
    }
  };

  const handleAddProjectLink = () => {
    if (!projectLink.trim() || !selectedProjectId) return;
    updateSelectedProject((p) => ({ ...p, links: [...p.links, projectLink.trim()] }));
    setProjectLink("");
  };

  const handleGeneratePlanner = () => {
    if (!selectedProjectId) return;
    const brief = newProjectBrief.trim();
    if (!brief) return;
    const steps = brief
      .split(/\n+|(?:\.|\;|\-) /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => ({ id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: s, done: false }));
    const deduped: { id: string; text: string; done: boolean }[] = [];
    steps.forEach((s) => {
      if (!deduped.some((d) => d.text.toLowerCase() === s.text.toLowerCase())) deduped.push(s);
    });
    updateSelectedProject((p) => ({ ...p, brief, planner: [...p.planner, ...deduped] }));
    setNewProjectBrief("");
    const sys: { sender: string; text: string } = {
      sender: "Project AI",
      text: `Generated ${deduped.length} planner step(s) from your brief and added them to the project planner.`
    };
    setProjectChat((prev) => [...prev, sys]);
  };

  const handleToggleProjectPlannerItem = (itemId: string) => {
    updateSelectedProject((p) => ({
      ...p,
      planner: p.planner.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
    }));
  };

  const localProjectAssistant = (input: string, project: Project): string => {
    const lower = input.toLowerCase();
    const open = project.planner.filter((p) => !p.done).length;
    if (lower.includes("plan") || lower.includes("step") || lower.includes("break")) {
      return `For "${project.name}", I suggest splitting the work into tracked checklist steps. Use the brief box to auto-generate a planner, then tick items as you progress (${open} still open).`;
    }
    if (lower.includes("link") || lower.includes("resource") || lower.includes("document")) {
      return `Add relevant links and documents under Resources so the project context for "${project.name}" stays complete. I'll reference them when assisting.`;
    }
    if (lower.includes("note") || lower.includes("write")) {
      return `You can draft notes for "${project.name}" in the notes zone, then use "Insert into note" to drop my reply directly into that text.`;
    }
    return `Noted for "${project.name}". Keep your brief updated and I'll help maintain the planner and context. (${open} open step(s))`;
  };

  const handleProjectChatSend = () => {
    if (!projectChatInput.trim() || !selectedProjectId) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;
    const userMsg = { sender: "You", text: projectChatInput.trim() };
    const reply = localProjectAssistant(projectChatInput.trim(), project);
    setProjectChat((prev) => [...prev, userMsg, { sender: "Project AI", text: reply }]);
    setProjectChatInput("");
  };

  const handleInsertIntoNote = () => {
    if (!selectedProjectId) return;
    const lastAi = [...projectChat].reverse().find((m) => m.sender === "Project AI");
    if (!lastAi) return;
    updateSelectedProject((p) => ({
      ...p,
      notes: p.notes ? `${p.notes}\n\n${lastAi.text}` : lastAi.text
    }));
  };

  const handleAddChallengeLog = () => {
    if (!challengeLogText.trim()) return;
    const log: ChallengeLog = {
      id: `cl-${Date.now()}`,
      text: challengeLogText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    const updated = [log, ...challengeLogs];
    setChallengeLogs(updated);
    save(CHALLENGE_LOG_KEY, updated);
    setChallengeLogText("");
    onAddXp(5);
  };

  const handleToggleChallengeLog = (id: string) => {
    const updated = challengeLogs.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c));
    setChallengeLogs(updated);
    save(CHALLENGE_LOG_KEY, updated);
  };

  const handleDeleteChallengeLog = (id: string) => {
    const updated = challengeLogs.filter((c) => c.id !== id);
    setChallengeLogs(updated);
    save(CHALLENGE_LOG_KEY, updated);
  };

  const handleAddCatItem = () => {
    if (!catItemText.trim()) return;
    const updated = catalogues.map((c) =>
      c.name === selectedCat ? { ...c, items: [...c.items, catItemText.trim()] } : c
    );
    setCatalogues(updated);
    save(CATALOGUE_KEY, updated);
    setCatItemText("");
  };

  const handleDeleteCatItem = (catName: string, idx: number) => {
    const updated = catalogues.map((c) =>
      c.name === catName ? { ...c, items: c.items.filter((_, i) => i !== idx) } : c
    );
    setCatalogues(updated);
    save(CATALOGUE_KEY, updated);
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim().toLowerCase().replace(/\s+/g, "-");
    if (catalogues.some((c) => c.name === name)) return;
    const updated = [...catalogues, { name, items: [] }];
    setCatalogues(updated);
    save(CATALOGUE_KEY, updated);
    setNewCatName("");
    setSelectedCat(name);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const writeZone =
    "w-full border-0 bg-slate-950/40 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-950/60 transition-colors resize-none";

  const scopeBtn = (key: typeof activeScope, label: string, Icon: React.FC<{ className?: string }>) => (
    <button
      onClick={() => setActiveScope(key)}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-xs text-left min-w-[130px] transition-all duration-300 focus:outline-none ${
        activeScope === key
          ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright shadow-md shadow-turquoise-500/5"
          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 text-slate-100 max-w-6xl mx-auto rounded-2xl"
      style={{
        background: "linear-gradient(160deg, #1b2230, #161d29 60%, #0d121b)",
        boxShadow: "inset 0 0 120px rgba(214, 188, 140, 0.06)"
      }}
    >
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {scopeBtn("planner", "Daily Planner", Calendar)}
        {scopeBtn("ideas", "Ideas", Lightbulb)}
        {scopeBtn("projects", "Projects", FolderPlus)}
        {scopeBtn("archives", "Archives & Lists", Archive)}

        <div className="md:mt-auto pt-3 border-t border-slate-800/70 px-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Notebook XP</span>
          <span className="text-sm font-bold font-mono text-turquoise block">{xp} Cheese</span>
          <span className="text-[9px] font-mono text-slate-500">Daytime writing mode</span>
        </div>
      </div>

      <div className="md:col-span-3 min-h-[460px] p-5 rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-xl">
        {activeScope === "planner" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-turquoise tracking-wider uppercase">📅 DAILY PLANNER</h3>
              <span className="text-[10px] font-mono text-slate-400">+5 XP / task · +10 done</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["today", "tomorrow", "custom"] as PlannerScope[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setPlannerView(v)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all ${
                    plannerView === v
                      ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
                      : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {v === "today" ? "Today" : v === "tomorrow" ? "Tomorrow" : "Custom Range"}
                </button>
              ))}
              {plannerView === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 font-mono focus:outline-none"
                />
              )}
              <span className="self-center text-[10px] font-mono text-slate-500">
                Viewing: {dayLabel(new Date(plannerActiveDate() + "T00:00:00"))}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <textarea
                value={plannerText}
                onChange={(e) => setPlannerText(e.target.value)}
                placeholder="Plan a task for this day (e.g., Morning meditation, Submit report)…"
                className={`${writeZone} h-20`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={plannerDeadline}
                    onChange={(e) => setPlannerDeadline(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Custom Alert Note (optional)</label>
                  <input
                    type="text"
                    value={plannerAlert}
                    onChange={(e) => setPlannerAlert(e.target.value)}
                    placeholder="e.g., Ping me 30 min before"
                    className="px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddPlannerTask}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-xs font-bold text-slate-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">Checklist</h4>
              {visiblePlannerTasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">No tasks planned for this view yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {visiblePlannerTasks.map((t) => {
                    const status = deadlineStatus(t.deadline, t.done);
                    return (
                      <div
                        key={t.id}
                        className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                          t.done
                            ? "border-emerald-500/20 bg-emerald-950/10"
                            : status === "overdue"
                            ? "border-red-500/40 bg-red-950/10"
                            : status === "soon"
                            ? "border-amber-500/40 bg-amber-950/10"
                            : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleTogglePlannerTask(t.id)}
                            className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-lg border transition-all ${
                              t.done
                                ? "border-emerald-500 bg-emerald-500 text-slate-950"
                                : "border-slate-700 hover:border-turquoise-500 bg-slate-950"
                            }`}
                          >
                            {t.done && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <span className={`text-xs font-bold font-mono block ${t.done ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {t.text}
                            </span>
                            {t.deadline && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1 ${
                                  status === "overdue"
                                    ? "bg-red-950/40 text-red-400"
                                    : status === "soon"
                                    ? "bg-amber-950/40 text-amber-300"
                                    : "bg-slate-900 text-slate-400"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {new Date(t.deadline).toLocaleString()}
                                {status === "overdue" && " · OVERDUE"}
                                {status === "soon" && " · SOON"}
                              </span>
                            )}
                            {t.alertNote && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-turquoise-950/40 text-turquoise ml-1 inline-flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                {t.alertNote}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePlannerTask(t.id)}
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

        {activeScope === "ideas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-turquoise tracking-wider uppercase">💡 IDEAS — QUICK CAPTURE</h3>
              <span className="text-[10px] font-mono text-slate-400">+10 XP</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="Capture a quick idea…"
                className={`${writeZone} h-20`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400">Category:</span>
                {IDEA_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setIdeaCategory(c)}
                    className={`px-2.5 py-1 rounded-lg ${
                      ideaCategory === c
                        ? "border border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright font-mono text-[10px] uppercase"
                        : "border border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[10px] uppercase hover:text-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={handleAddIdea}
                  className="ml-auto flex items-center gap-1 px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-xs font-bold text-slate-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Capture</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {ideas.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">No ideas captured yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ideas.map((i) => (
                    <div key={i.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-turquoise">{i.category}</span>
                        <button onClick={() => handleDeleteIdea(i.id)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-line font-sans">{i.text}</p>
                      <span className="text-[9px] font-mono text-slate-500 block">{i.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeScope === "projects" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-turquoise tracking-wider uppercase">📁 PROJECTS</h3>
              <span className="text-[10px] font-mono text-slate-400">+20 XP</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Lunar Photography Portfolio"
                    className="px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400">Description</label>
                  <input
                    type="text"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Brief description"
                    className="px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddProject}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-xs font-bold text-slate-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">Active Projects</h4>
                {projects.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 font-mono">No projects yet.</p>
                ) : (
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedProjectId(p.id); setProjectChat([]); }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedProjectId === p.id
                            ? "border-turquoise-500 bg-turquoise-500/10"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-slate-200">{p.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                            className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.description || "No description"}</p>
                        <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500 font-mono">
                          <span>{p.links.length} links</span>
                          <span>·</span>
                          <span>{p.documents.length} docs</span>
                          <span>·</span>
                          <span>{p.planner.length} plan steps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProject && (
                <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                  <h4 className="text-xs font-bold font-mono text-turquoise uppercase tracking-wider">
                    {selectedProject.name} — Project AI Assistant
                  </h4>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={projectLink}
                      onChange={(e) => setProjectLink(e.target.value)}
                      placeholder="Add resource link…"
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={handleAddProjectLink}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold"
                    >
                      <Link2 className="w-3.5 h-3.5 inline" /> Add
                    </button>
                  </div>
                  {selectedProject.links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.links.map((l, idx) => (
                        <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-turquoise">{l}</span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400">Project Brief (auto-generates planner)</label>
                    <textarea
                      value={newProjectBrief}
                      onChange={(e) => setNewProjectBrief(e.target.value)}
                      placeholder="Describe the project; each sentence/line becomes a tracked planner step…"
                      className={`${writeZone} h-16`}
                    />
                    <button
                      onClick={handleGeneratePlanner}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-xs font-bold"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Planner
                    </button>
                  </div>

                  {selectedProject.planner.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5" /> Project Planner
                      </span>
                      {selectedProject.planner.map((it) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleProjectPlannerItem(it.id)}
                            className={`flex items-center justify-center w-4 h-4 rounded border ${
                              it.done ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-950"
                            }`}
                          >
                            {it.done && <Check className="w-3 h-3" />}
                          </button>
                          <span className={`text-[11px] ${it.done ? "line-through text-slate-500" : "text-slate-200"}`}>{it.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <span className="text-[10px] font-mono text-turquoise uppercase block flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" /> Embedded Project AI Chatbot
                    </span>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {projectChat.length === 0 && (
                        <p className="text-[10px] text-slate-500 font-mono">Ask the assistant to plan, edit, or organize this project.</p>
                      )}
                      {projectChat.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-[11px] ${
                            m.sender === "You" ? "bg-turquoise-500/10 text-turquoise-bright ml-8" : "bg-slate-800 text-slate-200 mr-8"
                          }`}
                        >
                          <span className="text-[9px] font-mono block opacity-70">{m.sender}</span>
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={projectChatInput}
                        onChange={(e) => setProjectChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleProjectChatSend()}
                        placeholder="Ask the project AI…"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        onClick={handleProjectChatSend}
                        className="px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-xs font-bold"
                      >
                        <Send className="w-3.5 h-3.5 inline" /> Send
                      </button>
                    </div>
                    <button
                      onClick={handleInsertIntoNote}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] font-bold"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Insert into note
                    </button>
                  </div>

                  <div className="space-y-1 border-t border-slate-800 pt-3">
                    <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <PenLine className="w-3.5 h-3.5" /> Project Notes
                    </label>
                    <textarea
                      value={selectedProject.notes}
                      onChange={(e) => updateSelectedProject((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Draft notes here; use 'Insert into note' to append AI replies…"
                      className={`${writeZone} h-24`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeScope === "archives" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-turquoise tracking-wider uppercase">🗂️ CHALLENGE LOGS & PERSONAL CATALOGUES</h3>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h4 className="text-xs font-bold font-mono text-slate-300 tracking-wider uppercase flex items-center gap-1">
                <Archive className="w-3.5 h-3.5" /> Challenge Note Logs
              </h4>
              <textarea
                value={challengeLogText}
                onChange={(e) => setChallengeLogText(e.target.value)}
                placeholder="Archive a completed-challenge note task…"
                className={`${writeZone} h-16`}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddChallengeLog}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-xs font-bold text-slate-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Log
                </button>
                <button
                  onClick={() => onNavigateToView?.("challenges")}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 hover:text-turquoise transition-all"
                >
                  View Challenges <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 pt-1">
                {challengeLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 font-mono">No archived challenge logs yet.</p>
                ) : (
                  challengeLogs.map((c) => (
                    <div key={c.id} className="flex items-start justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleChallengeLog(c.id)}
                          className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-lg border ${
                            c.completed ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          {c.completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <span className={`text-xs font-bold font-mono block ${c.completed ? "line-through text-slate-500" : "text-slate-200"}`}>{c.text}</span>
                          <span className="text-[9px] font-mono text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteChallengeLog(c.id)}
                        className="p-1.5 rounded-lg bg-slate-900/60 text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h4 className="text-xs font-bold font-mono text-slate-300 tracking-wider uppercase flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Personal Catalogues
              </h4>

              <div className="flex flex-wrap gap-2">
                {catalogues.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedCat(c.name)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase border transition-all ${
                      selectedCat === c.name
                        ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {c.name} ({c.items.length})
                  </button>
                ))}
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category…"
                  className="px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={handleAddCat}
                  className="px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-[10px] font-bold"
                >
                  <Plus className="w-3 h-3 inline" /> Add
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={catItemText}
                  onChange={(e) => setCatItemText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCatItem()}
                  placeholder={`Add item to "${selectedCat}"…`}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={handleAddCatItem}
                  className="px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-xs font-bold"
                >
                  <FileText className="w-3.5 h-3.5 inline" /> Add Item
                </button>
              </div>

              <div className="space-y-1 pt-1">
                {catalogues.find((c) => c.name === selectedCat)?.items.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3 font-mono">No items in "{selectedCat}" yet.</p>
                ) : (
                  catalogues
                    .find((c) => c.name === selectedCat)
                    ?.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/30">
                        <span className="text-[12px] text-slate-200 font-mono">{item}</span>
                        <button onClick={() => handleDeleteCatItem(selectedCat, idx)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
