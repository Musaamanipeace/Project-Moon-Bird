import React, { useState, useEffect } from "react";
import { Award, Lock, CheckCircle, Flame, ShieldAlert, Archive, HelpCircle, Users, Sun, Moon, Sparkles, Plus, AlertCircle, Filter, BookOpen, Compass, Search, Heart, Feather, Edit3, Share2, CheckSquare, ListPlus, Send, Flag, Target, Gift, Image, Video, Music, DollarSign, Eye, ClipboardList } from "lucide-react";
import { Challenge, ChallengeStep, SurveyQuestion, BonusTask, ChallengeStepAction } from "../types";

// Per-challenge display images (src/assets/challenge-1.png .. challenge-8.png).
// Renamed to code-safe, consistent names so Vite can statically import them.
import challengeImg1 from "../assets/challenge-1.png";
import challengeImg2 from "../assets/challenge-2.png";
import challengeImg3 from "../assets/challenge-3.png";
import challengeImg4 from "../assets/challenge-4.png";
import challengeImg5 from "../assets/challenge-5.png";
import challengeImg6 from "../assets/challenge-6.png";
import challengeImg7 from "../assets/challenge-7.png";
import challengeImg8 from "../assets/challenge-8.png";

// PREVIEW MODE: "predisplayed" shows the image in the card immediately.
// Switch to "on-interaction" later to reveal only when the card is opened/hovered.
const CHALLENGE_IMAGE_MODE: "predisplayed" | "on-interaction" = "predisplayed";

const challengeImagesByNumber: Record<number, string> = {
  1: challengeImg1,
  2: challengeImg2,
  3: challengeImg3,
  4: challengeImg4,
  5: challengeImg5,
  6: challengeImg6,
  7: challengeImg7,
  8: challengeImg8,
};

const getChallengeImage = (num?: number): string | null =>
  num && challengeImagesByNumber[num] ? challengeImagesByNumber[num] : null;

interface ChallengesDashboardProps {
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
  onShareFeed?: (entry: { kind: any; title?: string; body?: string; refId?: string; refType?: string; experience?: string }) => void;
}

export default function ChallengesDashboard({ xp, onAddXp, onNavigateToView, onShareFeed }: ChallengesDashboardProps) {
  const [activeTab, setActiveTab] = useState<"catalogued" | "milestones" | "builder">("catalogued");

  const nickname = localStorage.getItem("mb_nickname") || "anonymous";

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userChallengeStates, setUserChallengeStates] = useState<Record<string, 'Unfinished' | 'Finished' | 'Completed / Unaudited' | 'Evolving'>>({});
  const [activeStreak, setActiveStreak] = useState(5);
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);

  // Tool-action tracking
  const [completedStepActions, setCompletedStepActions] = useState<Record<string, ChallengeStepAction>>({});
  const [pendingToolAction, setPendingToolAction] = useState<{ challengeId: string; stepNumber: number; view: string; actionType: string } | null>(null);

  // Detailed Challenge Execution Modal
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  // Lock background scroll while the challenge modal is open
  useEffect(() => {
    if (selectedChallenge) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [selectedChallenge]);
  const [stepProgress, setStepProgress] = useState<Record<number, boolean>>({});
  const [bonusProgress, setBonusProgress] = useState<Record<string, boolean>>({});
  const [unlockedStepNumber, setUnlockedStepNumber] = useState<number>(1);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number>>({});
  const [submissionNote, setSubmissionNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Challenge Builder Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Challenge['category']>("Mindfulness");
  const [newScope, setNewScope] = useState<Challenge['scope']>("Self-Improvement/Wellbeing");
  const [newParticipationMode, setNewParticipationMode] = useState<Challenge['participationMode']>("Solo");
  const [newLevel, setNewLevel] = useState("Level One");
  const [newDescription, setNewDescription] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newXp, setNewXp] = useState(100);
  const [newSteps, setNewSteps] = useState<string[]>(["", ""]);
  const [newStepOptionalFlags, setNewStepOptionalFlags] = useState<boolean[]>([false, false]);
  const [newSurveyPrompts, setNewSurveyPrompts] = useState<string[]>([]);
  const [newAuditorPrompts, setNewAuditorPrompts] = useState<string[]>([]);
  const [newBonusTasks, setNewBonusTasks] = useState<string[]>([""]);
  const [newCompletionRequirement, setNewCompletionRequirement] = useState("");
  const [newDynamicSteps, setNewDynamicSteps] = useState(false);
  const [newCheckpoints, setNewCheckpoints] = useState<{label: string, description: string, stepNumber: number}[]>([]);
  const [newMilestones, setNewMilestones] = useState<{label: string, description: string, rewardXp: number}[]>([]);
  const [newRewards, setNewRewards] = useState<{type: string, description: string, value: string}[]>([]);
  const [newMediaAssets, setNewMediaAssets] = useState<{id: string, type: string, url: string, caption: string, stepNumber?: number}[]>([]);
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);

  // Hover metrics
  const [hoveredMetrics, setHoveredMetrics] = useState<string | null>(null);

  useEffect(() => {
    const savedStates = localStorage.getItem("mb_challenge_states");
    if (savedStates) {
      setUserChallengeStates(JSON.parse(savedStates));
    }
    const savedCustom = localStorage.getItem("mb_custom_challenges");
    if (savedCustom) {
      setCustomChallenges(JSON.parse(savedCustom));
    }
    const savedActions = localStorage.getItem("mb_challenge_step_actions");
    if (savedActions) {
      setCompletedStepActions(JSON.parse(savedActions));
    }
  }, []);

  useEffect(() => {
    if (!selectedChallenge) return;
    const mandatorySteps = selectedChallenge.steps.filter(s => !s.optional);
    const currentStep = mandatorySteps.find(s => s.stepNumber === unlockedStepNumber && !stepProgress[s.stepNumber]);
    if (currentStep?.toolAction && isStepActionCompleted(selectedChallenge.id, currentStep.stepNumber)) {
      setStepProgress(prev => ({ ...prev, [currentStep.stepNumber]: true }));
      const remaining = mandatorySteps.filter(s => !stepProgress[s.stepNumber] && s.stepNumber !== currentStep.stepNumber);
      if (remaining.length === 0) {
        setUnlockedStepNumber(999);
      } else {
        setUnlockedStepNumber(remaining[0].stepNumber);
      }
    }
  }, [selectedChallenge, completedStepActions]);

  const saveChallengeStates = (updated: Record<string, 'Unfinished' | 'Finished' | 'Completed / Unaudited' | 'Evolving'>) => {
    setUserChallengeStates(updated);
    localStorage.setItem("mb_challenge_states", JSON.stringify(updated));
  };

  const saveStepAction = (action: ChallengeStepAction) => {
    const updated = { ...completedStepActions, [action.id]: action };
    setCompletedStepActions(updated);
    localStorage.setItem("mb_challenge_step_actions", JSON.stringify(updated));
  };

  const getStepActionKey = (challengeId: string, stepNumber: number) => `${challengeId}-step-${stepNumber}`;

  const isStepActionCompleted = (challengeId: string, stepNumber: number): boolean => {
    const key = getStepActionKey(challengeId, stepNumber);
    return !!completedStepActions[key];
  };

  const navigateToTool = (view: string, challengeId: string, stepNumber: number) => {
    const actionType = selectedChallenge?.steps.find(s => s.stepNumber === stepNumber)?.toolAction?.actionType || 'manual';
    const toolActionPayload = {
      challengeId,
      stepNumber,
      view,
      actionType,
      description: selectedChallenge?.steps.find(s => s.stepNumber === stepNumber)?.toolAction?.description || '',
      label: selectedChallenge?.steps.find(s => s.stepNumber === stepNumber)?.toolAction?.label || ''
    };
    localStorage.setItem("mb_pending_challenge_tool_action", JSON.stringify(toolActionPayload));
    setPendingToolAction({ challengeId, stepNumber, view, actionType });
    onNavigateToView?.(view);
  };

  const returnFromTool = () => {
    if (!pendingToolAction || !selectedChallenge) return;
    const { challengeId, stepNumber } = pendingToolAction;
    const key = getStepActionKey(challengeId, stepNumber);
    const alreadyDone = isStepActionCompleted(challengeId, stepNumber);

    if (!alreadyDone) {
      saveStepAction({
        id: key,
        challengeId,
        stepNumber,
        actionType: pendingToolAction.actionType || 'manual',
        completedAt: new Date().toISOString()
      });
    }

    localStorage.removeItem("mb_pending_challenge_tool_action");
    setPendingToolAction(null);
    setUnlockedStepNumber(999);
    setStepProgress(prev => ({ ...prev, [stepNumber]: true }));
  };

  const determineJournalCategory = (title: string): string => {
    if (title.includes("Habit")) return "Trigger Log";
    if (title.includes("Vital")) return "Health Vitals";
    if (title.includes("Sky")) return "Astro Observation";
    if (title.includes("Blueprint")) return "Life Goals";
    return "Action Plan";
  };

  const defaultChallenges: Challenge[] = [
    {
      id: "ch-1",
      number: 1,
      title: "Sky Watcher (Level One)",
      level: "Level One",
      category: "Astronomy",
      scope: "Fun-Based",
      participationMode: "Solo",
      description: "Observe tomorrow's moonrise, moon zenith, and moonset times via MoonDial; log lunar data with snapshots; and connect lunar data to a public event.",
      rewardXp: 80,
      goal: "Build lunar observation habit and connect celestial data to real-world events.",
      steps: [
        { stepNumber: 1, title: "Observe MoonDial & Set Reminders", description: "Open MoonDial, observe tomorrow's moonrise, moon zenith, and moonset times, and add a reminder with a sound notification for each.", toolAction: { view: "dial", actionType: "create_reminder", label: "MoonDial Reminders", description: "Open MoonDial to observe lunar times and set sound reminders." } },
        { stepNumber: 2, title: "Capture or Describe the Moon", description: "Take a picture of the moon with your camera, or describe how the moon looks and how it makes you feel.", optional: true },
        { stepNumber: 3, title: "Note Lunar Data & Take Snapshot", description: "Visit MoonDial to note your lunar data, then take a snapshot and log it.", toolAction: { view: "dial", actionType: "create_journal", label: "MoonDial & Journal", description: "Open MoonDial to view lunar data, then log your snapshot in your Journal." } },
        { stepNumber: 4, title: "Share Log on Personal Feed", description: "Share the log on your personal feed (posts).", optional: true },
        { stepNumber: 5, title: "Find Public Event Coinciding with Full Moon", description: "Search the internet or any resource for a holiday or public event that coincides with the full moon, record the time of its zenith, and add a reminder.", toolAction: { view: "dial", actionType: "create_reminder", label: "MoonDial Reminder", description: "Open MoonDial to set a reminder for the public event you discovered." } },
        { stepNumber: 6, title: "Snapshot Reminder & Public Log", description: "Take a snapshot of this reminder and log it, sharing the log publicly.", optional: true }
      ],
      surveyQuestions: [],
      auditorQuestionnaire: [
        { id: "aq1", prompt: "Lunar Observation Quality: How accurately did the participant record moonrise, zenith, and moonset times?", type: "scale" },
        { id: "aq2", prompt: "Public Event Connection: Did the participant successfully identify a relevant public event and record its zenith time?", type: "yesno" },
        { id: "aq3", prompt: "Engagement & Effort: On a scale of 1 to 5, how would you rate the participant's overall engagement and effort?", type: "scale" }
      ],
      bonusTasks: [
        { id: "bt1", title: "Astro Event Journal Plan", description: "Explore astro events, pick a favorite, and journal a plan for an activity during that day (an indoor activity is strongly advised unless you are in a safe place).", xpReward: 25 },
        { id: "bt2", title: "Auditor Experience Report", description: "Tell an auditor about your experience on that day.", xpReward: 30 }
      ],
      completionRequirement: "Submit your logged lunar snapshot and public-event reminder to the auditor or system check to mark the challenge as Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-2",
      number: 2,
      title: "Who Am I (Level One)",
      level: "Level One",
      category: "Self-Improvement",
      scope: "Self-Improvement/Wellbeing",
      participationMode: "Solo",
      description: "Establish your daily rhythm by setting a wake-up alarm, scheduling your day, and completing your MoonBird portfolio page.",
      rewardXp: 70,
      goal: "Establish daily routine structure and complete onboarding profile.",
      steps: [
        { stepNumber: 1, title: "Set Wake-Up Alarm", description: "Pick a time to wake up the following day — when you would usually start your day — and set an alarm." },
        { stepNumber: 2, title: "Create & Activate Daily Schedule", description: "Make a schedule for your tasks on that day and activate it; it will remind you at every time you need to perform a task. (If you cannot carry your device, make a to-do list to check off at the end of the day. By default, a schedule is also a checkable to-do list.)", actionType: "set_dial_reminder", toolAction: { view: "notes", actionType: "create_routine", label: "Daily Schedule", description: "Open Notebook to create and activate your daily schedule / routine." } },
        { stepNumber: 3, title: "Complete Portfolio Page", description: "Complete your portfolio page.", toolAction: { view: "profile", actionType: "update_profile", label: "Profile Editor", description: "Open your Profile to complete and publish your portfolio page." } }
      ],
      surveyQuestions: [],
      bonusTasks: [
        { id: "bt1", title: "Skills Catalogue Explorer", description: "Explore the skills catalogue and find a simple skill you like.", xpReward: 20 },
        { id: "bt2", title: "5-Day Skill Practice Streak", description: "Go on a 5-day streak of practicing this skill.", xpReward: 40 }
      ],
      completionRequirement: "Publish your completed Portfolio page to lock in your onboarding profile and transition the challenge state to Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-3",
      number: 3,
      title: "The Seeker",
      level: "Level One",
      category: "Mindfulness",
      scope: "Skills-Related",
      participationMode: "Solo",
      description: "Engage with a book from the catalogue, read actively, reflect on your experience, and submit a detailed reader survey.",
      rewardXp: 90,
      goal: "Develop active reading habits and critical reflection skills.",
      steps: [
        { stepNumber: 1, title: "Select Book from Catalogue", description: "Go to the books catalogue and pick a book that seems interesting." },
        { stepNumber: 2, title: "Read One Chapter or Section", description: "Read one chapter or section." },
        { stepNumber: 3, title: "Write Personal Reaction", description: "Write down, in an input text box, why you liked it; if you disliked it, express that as well.", toolAction: { view: "notes", actionType: "create_journal", label: "Journal Entry", description: "Open Notebook to write your personal reaction to the book." } },
        { stepNumber: 4, title: "Answer Tailored Reader Survey", description: "Answer some tailored survey questions about the book." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "The Hook: On a scale of 1 to 5, how strongly did the opening chapter pull you into the story or topic?", type: "scale" },
        { id: "q2", prompt: "Pacing & Flow: Did the chapter feel like it moved too fast, too slow, or just right?", type: "choice", options: ["Too Fast", "Too Slow", "Just Right"] },
        { id: "q3", prompt: "Character/Topic First Impression: Which character, idea, or concept grabbed your attention the most, and why?", type: "text" },
        { id: "q4", prompt: "Clarity & Tone: Was there anything in this chapter that felt confusing, off-putting, or out of place?", type: "text" },
        { id: "q5", prompt: "Expectations Set: Based on this chapter alone, what do you anticipate the rest of the book will be about?", type: "text" },
        { id: "q6", prompt: "The Drop-Off Check: At any point during the chapter, did you feel tempted to stop reading? (If yes, where?)", type: "yesno" },
        { id: "q7", prompt: "The Cliffhanger Factor: How eager are you to flip the page and start Chapter 2 immediately?", type: "scale" },
        { id: "q8", prompt: "Target Audience Fit: In a few words, who do you think would enjoy reading this book the most?", type: "text" }
      ],
      bonusTasks: [
        { id: "bt1", title: "Finish the Book", description: "Finish reading the book.", xpReward: 30 },
        { id: "bt2", title: "Take a Book Quiz", description: "Take a quiz on the book.", xpReward: 35 }
      ],
      completionRequirement: "Complete and submit the 8-question reader survey to officially mark the challenge as Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-4",
      number: 4,
      title: "Up to Date",
      level: "Level One",
      category: "Mindfulness",
      scope: "Self-Improvement/Wellbeing",
      participationMode: "Solo",
      description: "Select a current-event story, analyze source reliability and local impact, write your perspective, and submit for audit.",
      rewardXp: 90,
      goal: "Develop critical news literacy and personal perspective articulation.",
      steps: [
        { stepNumber: 1, title: "Pick Current-Event Story or News Video", description: "Pick a current-event story or news video from the platform feed or external media." },
        { stepNumber: 2, title: "Watch or Read Coverage Carefully", description: "Watch or read the selected current-event coverage carefully." },
        { stepNumber: 3, title: "Write Personal Perspective", description: "Write down, in an input text box, your personal perspective on the event and how it impacts your local community.", toolAction: { view: "notes", actionType: "create_journal", label: "Perspective Journal", description: "Open Notebook to write and save your personal perspective entry." } },
        { stepNumber: 4, title: "Answer Tailored Survey Questions", description: "Answer some tailored survey questions about the event." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Source Reliability: On a scale of 1 to 5, how trustworthy and unbiased did this news coverage feel?", type: "scale" },
        { id: "q2", prompt: "Core Takeaway: In one or two sentences, what was the most important fact or message you learned?", type: "text" },
        { id: "q3", prompt: "Local Impact: Does this issue directly affect you, your family, or your neighborhood? (Yes/No, and why?)", type: "text" },
        { id: "q4", prompt: "Actionability: Is there a clear action or solution proposed in the coverage, or is it just reporting a problem?", type: "choice", options: ["Clear Action Proposed", "Problem Only", "Unclear / Mixed"] },
        { id: "q5", prompt: "Discussion Value: Would you feel comfortable sharing or discussing this topic with a peer in Live Chat?", type: "yesno" }
      ],
      bonusTasks: [
        { id: "bt1", title: "Current-Event Verification Quiz", description: "Answer the current-event verification quiz to test your comprehension.", xpReward: 20 },
        { id: "bt2", title: "Public Feed Perspective Entry", description: "Share your perspective entry publicly on your personal feed (posts).", xpReward: 25 }
      ],
      completionRequirement: "Submit your written perspective and survey answers to complete the audit and mark the challenge as Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-5",
      number: 5,
      title: "Cut the Habit (Inspired by James Clear)",
      level: "Level Two",
      category: "Self-Improvement",
      scope: "Self-Improvement/Wellbeing",
      participationMode: "Solo",
      description: "Break unwanted habits by identifying primary triggers, writing identity reframing statements, and setting physical or digital friction barriers.",
      rewardXp: 120,
      goal: "Replace unwanted habits with intentional identity-driven behavior change.",
      steps: [
        { stepNumber: 1, title: "Identify & Log Primary Trigger", description: "Identify the habit you want to quit and log its primary trigger (time, location, emotional state, or people) in your Journal.", actionType: "log_journal", toolAction: { view: "notes", actionType: "create_journal", label: "Trigger Journal", description: "Open Notebook to log the primary trigger for the habit you want to quit." } },
        { stepNumber: 2, title: "Write Identity Reframing Statement", description: "Reframe your mindset in your Journal by writing an identity statement (e.g., 'I am not the type of person who does X').", actionType: "log_journal", toolAction: { view: "notes", actionType: "create_journal", label: "Identity Journal", description: "Open Notebook to write your identity reframing statement." } },
        { stepNumber: 3, title: "Set Up Friction Barrier", description: "Increase friction by setting up at least one physical or digital barrier (e.g., app blocker, physical displacement) to make the habit inconvenient.", actionType: "habit_barrier" },
        { stepNumber: 4, title: "Answer Progress Survey Questions", description: "Answer some tailored survey questions about your progress." }
      ],
      surveyQuestions: [
        { id: "q1", prompt: "Trigger Awareness: On a scale of 1 to 5, how easy was it to identify the exact moment or mood that triggers this habit?", type: "scale" },
        { id: "q2", prompt: "Friction Check: Did the barrier you set up successfully delay or stop you the last time you felt the urge?", type: "text" },
        { id: "q3", prompt: "Identity Shift: How convincing does your new identity statement feel to you right now?", type: "text" },
        { id: "q4", prompt: "Support Need: Would having an accountability partner or Habit Contract make you more likely to stick with this change?", type: "yesno" }
      ],
      bonusTasks: [
        { id: "bt1", title: "Create Habit Contract", description: "Create a Habit Contract in your Journal with an accountability partner or a disincentive penalty for slipping up.", xpReward: 30 },
        { id: "bt2", title: "5-Day Streak Avoidance Log", description: "Maintain a 5-day streak of successfully avoiding the habit and log it using Snapshot.", xpReward: 40 }
      ],
      completionRequirement: "Submit your trigger log, friction-barrier plan, and survey answers to mark the challenge as Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-6",
      number: 6,
      title: "Vital Check (Level One)",
      level: "Level One",
      category: "Health",
      scope: "Self-Improvement/Wellbeing",
      participationMode: "Solo",
      description: "Visit a local health clinic, record core vitals, research your readings, log a health-status gauge, and draft a 30-day actionable health plan.",
      rewardXp: 110,
      goal: "Increase health awareness and establish a 30-day improvement or maintenance plan.",
      steps: [
        { stepNumber: 1, title: "Record Vitals at Clinic", description: "Visit a local health clinic or medical center and get your basic vitals recorded (e.g., blood pressure, pulse, weight, or blood sugar).", actionType: "clinic_visit" },
        { stepNumber: 2, title: "Consult Health Catalogue", description: "Research or consult with a health professional / the disease catalogue to find out what your readings mean and gauge your current overall health status." },
        { stepNumber: 3, title: "Log Health Gauge in Journal", description: "Log your health-status gauge in your Journal using the health template.", actionType: "log_journal", toolAction: { view: "notes", actionType: "create_journal", label: "Health Journal", description: "Open Notebook to log your health-status gauge using the health template." } },
        { stepNumber: 4, title: "Draft 30-Day Actionable Health Plan", description: "Draft an actionable personal plan in your Journal outlining how you will either maintain your good health or improve your vitals over the next 30 days.", toolAction: { view: "notes", actionType: "create_journal", label: "Health Plan Journal", description: "Open Notebook to draft your 30-day actionable health plan." } }
      ],
      surveyQuestions: [],
      bonusTasks: [
        { id: "bt1", title: "Explore Disease & Health Catalogue", description: "Explore the disease and health catalogue to learn about preventive measures for one common health condition.", xpReward: 25 },
        { id: "bt2", title: "Set Up MoonDial Health Reminders", description: "Set up daily water or exercise reminders on MoonDial to support your health plan.", xpReward: 30 }
      ],
      completionRequirement: "Save your actionable health plan and vital-summary log in your Journal to deem the challenge officially Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-7",
      number: 7,
      title: "Sky Watcher (Level Two)",
      level: "Level Two",
      category: "Astronomy",
      scope: "Fun-Based",
      participationMode: "Solo",
      description: "Observe an upcoming astronomical event from the Astro Events catalogue, mark it on your MoonDial calendar, plan observation logistics, and log a live experience.",
      rewardXp: 130,
      goal: "Deepen astronomical engagement through planned observation and live documentation.",
      steps: [
        { stepNumber: 1, title: "Select Astro Event from Catalogue", description: "Go to the Astro Events catalogue and observe the nearest upcoming astro event, or browse and select one specific event that interests you (note: choosing a distant event will affect the calendar time required to complete this challenge).", actionType: "observe_event", toolAction: { view: "events", actionType: "observe_event", label: "Astro Events", description: "Open Events to browse and select an upcoming astronomical event." } },
        { stepNumber: 2, title: "Mark Event Date & Set Sound Reminder", description: "Mark the exact event date on your MoonDial calendar and set an active sound reminder.", actionType: "set_dial_reminder", toolAction: { view: "dial", actionType: "create_reminder", label: "MoonDial Reminder", description: "Open MoonDial to mark the event date and set a sound reminder." } },
        { stepNumber: 3, title: "Plan Observation Activity in Journal", description: "Plan a specific observation activity in your Journal for that day (e.g., outdoor viewing spot, equipment needed, or safety measures).", toolAction: { view: "notes", actionType: "create_journal", label: "Observation Plan Journal", description: "Open Notebook to write your observation activity plan." } },
        { stepNumber: 4, title: "Attempt Live Celestial Capture", description: "On the scheduled date, attempt to capture the astronomical event with your eyes (or a camera)." },
        { stepNumber: 5, title: "Write Detailed Observation Log", description: "Write a detailed log of your live observation experience in your Journal.", actionType: "log_journal", toolAction: { view: "notes", actionType: "create_journal", label: "Observation Log Journal", description: "Open Notebook to write your detailed live observation log." } }
      ],
      surveyQuestions: [],
      bonusTasks: [
        { id: "bt1", title: "Share Astro Event on Personal Feed", description: "Share a photo or written description of the astro event on your personal feed (posts).", xpReward: 35 },
        { id: "bt2", title: "Live Chat Stargazer Connect", description: "Connect with another online user in Live Chat during the astro event to compare observations.", xpReward: 35 }
      ],
      completionRequirement: "Log your final live-experience entry on the scheduled date to deem the challenge Finished.",
      comments: [],
      participants: [],
      state: "Finished"
    },
    {
      id: "ch-8",
      number: 8,
      title: "Life Blueprint (Level One)",
      level: "Level One",
      category: "Life Blueprint",
      scope: "Self-Improvement/Wellbeing",
      participationMode: "Solo",
      description: "Construct a master lifetime blueprint: list core lifetime goals, explain why each matters deeply, break a priority goal into actionable steps, and lock its commencement date.",
      rewardXp: 150,
      goal: "Clarify lifelong direction and commit to a single prioritized goal with a locked start date.",
      steps: [
        { stepNumber: 1, title: "List Master Life Goals", description: "Create a list in your Journal of the core things you want to achieve in this lifetime (your master life goals).", actionType: "life_goal", toolAction: { view: "notes", actionType: "create_journal", label: "Life Goals Journal", description: "Open Notebook to create your master life goals list." } },
        { stepNumber: 2, title: "Reflect on Why Each Goal Matters", description: "Reflect on each goal and write a short explanation next to it detailing why that goal matters deeply to you.", toolAction: { view: "notes", actionType: "create_journal", label: "Reflection Journal", description: "Open Notebook to reflect on and explain why each goal matters deeply to you." } },
        { stepNumber: 3, title: "Select One Priority Goal", description: "Select one priority goal from your list to focus on right now." },
        { stepNumber: 4, title: "Break Goal into Sequential Action Steps", description: "Break down that single goal into sequential, actionable steps inside your Journal." },
        { stepNumber: 5, title: "Lock Commencement Date on MoonDial", description: "Set an exact commencement date on your MoonDial calendar for when you will take your very first step toward that goal.", actionType: "set_dial_reminder", toolAction: { view: "dial", actionType: "create_reminder", label: "MoonDial Commencement Date", description: "Open MoonDial to set an exact commencement date for your first step." } }
      ],
      surveyQuestions: [],
      bonusTasks: [
        { id: "bt1", title: "Add Skill to Portfolio", description: "Add a required skill for your chosen goal from the Skills Catalogue to your Portfolio as an active focus area.", xpReward: 30 },
        { id: "bt2", title: "Share Commencement Date for Accountability", description: "Share your target commencement date with a friend or in Live Chat to build personal accountability.", xpReward: 30 }
      ],
      completionRequirement: "Confirm your chosen goal, action steps, and locked commencement date in your Journal to deem the challenge Finished.",
      comments: [],
      participants: [],
      state: "Finished"
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
    const restored: Record<number, boolean> = {};
    ch.steps.forEach(s => {
      if (isStepActionCompleted(ch.id, s.stepNumber)) {
        restored[s.stepNumber] = true;
      }
    });
    setStepProgress(restored);
    setBonusProgress({});
    const mandatorySteps = ch.steps.filter(s => !s.optional);
    const allMandatoryDone = mandatorySteps.every(s => restored[s.stepNumber]);
    setUnlockedStepNumber(allMandatoryDone ? 999 : (mandatorySteps.find(s => !restored[s.stepNumber])?.stepNumber || 1));
    setSurveyAnswers({});
    setSubmissionNote("");
    setModalError(null);
    setPendingToolAction(null);
  };

  const handleToggleStep = (stepNumber: number) => {
    setStepProgress(prev => {
      const next = { ...prev, [stepNumber]: !prev[stepNumber] };
      if (!selectedChallenge) return next;

      const mandatorySteps = selectedChallenge.steps.filter(s => !s.optional);
      const completedMandatory = mandatorySteps.filter(s => next[s.stepNumber]).length;
      const totalMandatory = mandatorySteps.length;

      if (completedMandatory >= totalMandatory) {
        setUnlockedStepNumber(999);
      } else {
        const nextUnchecked = mandatorySteps.find(s => !next[s.stepNumber]);
        if (nextUnchecked) {
          setUnlockedStepNumber(nextUnchecked.stepNumber);
        }
      }

      return next;
    });
  };

  const handleToggleBonus = (bonusId: string) => {
    setBonusProgress(prev => ({ ...prev, [bonusId]: !prev[bonusId] }));
  };

  const handleSubmitChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge) return;

    const userState = userChallengeStates[selectedChallenge.id];
    if (userState === 'Finished' || userState === 'Completed / Unaudited') {
      setModalError("This challenge has already been submitted.");
      return;
    }

    const mandatorySteps = selectedChallenge.steps.filter(s => !s.optional);
    const checkedMandatorySteps = mandatorySteps.filter(s => stepProgress[s.stepNumber]).length;

    if (checkedMandatorySteps < mandatorySteps.length) {
      setModalError(`Please complete all ${mandatorySteps.length} mandatory steps before submitting.`);
      return;
    }

    const missingToolActions = mandatorySteps.filter(s => s.toolAction && !isStepActionCompleted(selectedChallenge.id, s.stepNumber));
    if (missingToolActions.length > 0) {
      setModalError(`Please complete the required tool actions for: ${missingToolActions.map(s => `Step ${s.stepNumber}: ${s.title}`).join(", ")}`);
      return;
    }

    if (!submissionNote.trim()) {
      setModalError("Please write your final submission entry or log notes before completing.");
      return;
    }

    const isAudited = selectedChallenge.auditorQuestionnaire && selectedChallenge.auditorQuestionnaire.length > 0;
    const newState: 'Finished' | 'Completed / Unaudited' = isAudited ? 'Completed / Unaudited' : 'Finished';

    const updatedStates = { ...userChallengeStates, [selectedChallenge.id]: newState };
    saveChallengeStates(updatedStates);

    let earnedXp = selectedChallenge.rewardXp;
    selectedChallenge.bonusTasks.forEach(b => {
      if (bonusProgress[b.id]) {
        earnedXp += b.xpReward;
      }
    });

    if (!selectedChallenge.participants.find(p => p.nickname === nickname)) {
      selectedChallenge.participants.push({
        nickname,
        state: newState,
        submittedAt: new Date().toISOString(),
        submittedNote: submissionNote.trim()
      });
    }

    onAddXp(earnedXp);

    const journalLogs = JSON.parse(localStorage.getItem("mb_journal_entries") || "[]");
    journalLogs.unshift({
      id: "j-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      content: `[Challenge Completed: ${selectedChallenge.title}]\n\n${submissionNote}\n\nSurvey Answers:\n${JSON.stringify(surveyAnswers, null, 2)}`,
      theme: "dark",
      mood: "Accomplished",
      category: determineJournalCategory(selectedChallenge.title),
      timestamp: new Date().toLocaleTimeString()
    });
    localStorage.setItem("mb_journal_entries", JSON.stringify(journalLogs));

    alert(`Challenge "${selectedChallenge.title}" officially ${newState === 'Finished' ? 'FINISHED' : 'SUBMITTED FOR AUDIT'}!\n\nAwarded: +${earnedXp} XP!\nSaved entry to your Journal.`);

    // Share a completed-challenge badge to the feed (with experience CTA)
    onShareFeed?.({
      kind: "challenge_badge",
      title: `Completed: ${selectedChallenge.title}`,
      body: `Earned +${earnedXp} XP — ${selectedChallenge.rewardXp} base.`,
      refId: selectedChallenge.id,
      refType: "challenge",
      experience: submissionNote,
    });

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
      scope: newScope,
      participationMode: newParticipationMode,
      description: newDescription.trim(),
      goal: newGoal.trim() || undefined,
      rewardXp: newXp,
      dynamicSteps: newDynamicSteps,
      steps: newSteps.filter(s => s.trim()).map((s, idx) => ({
        stepNumber: idx + 1,
        title: `Step ${idx + 1}`,
        description: s.trim(),
        optional: newStepOptionalFlags[idx] || false
      })),
      surveyQuestions: newSurveyPrompts.filter(p => p.trim()).map((p, idx) => ({
        id: `sq-${idx}`,
        prompt: p.trim(),
        type: "text"
      })),
      auditorQuestionnaire: newAuditorPrompts.filter(p => p.trim()).map((p, idx) => ({
        id: `aq-${idx}`,
        prompt: p.trim(),
        type: "text"
      })),
      bonusTasks: newBonusTasks.filter(b => b.trim()).map((b, idx) => ({
        id: `bt-${idx}`,
        title: `Bonus ${idx + 1}`,
        description: b.trim(),
        xpReward: 20
      })),
      completionRequirement: newCompletionRequirement.trim() || "Submit custom written reflection to complete challenge.",
      checkpoints: newCheckpoints.length > 0 ? newCheckpoints.map((c, idx) => ({
        id: `cp-${idx}`,
        label: c.label,
        description: c.description,
        stepNumber: c.stepNumber
      })) : undefined,
      targetMilestones: newMilestones.length > 0 ? newMilestones.map((m, idx) => ({
        id: `tm-${idx}`,
        label: m.label,
        description: m.description,
        rewardXp: m.rewardXp
      })) : undefined,
      creatorSponsoredRewards: newRewards.length > 0 ? newRewards.map((r, idx) => ({
        id: `cr-${idx}`,
        type: r.type as any,
        description: r.description,
        value: r.value
      })) : undefined,
      mediaAssets: newMediaAssets.length > 0 ? newMediaAssets.map((ma, idx) => ({
        id: `ma-${idx}`,
        type: ma.type as any,
        url: ma.url,
        caption: ma.caption || undefined,
        placement: 'between_steps',
        stepNumber: ma.stepNumber
      })) : undefined,
      comments: [],
      participants: [],
      state: "Finished",
      isCustom: true
    };

    const nextCustom = [created, ...customChallenges];
    setCustomChallenges(nextCustom);
    localStorage.setItem("mb_custom_challenges", JSON.stringify(nextCustom));

    setNewTitle("");
    setNewDescription("");
    setNewGoal("");
    setNewXp(100);
    setNewSteps(["", ""]);
    setNewStepOptionalFlags([false, false]);
    setNewSurveyPrompts([]);
    setNewAuditorPrompts([]);
    setNewBonusTasks([""]);
    setNewCompletionRequirement("");
    setNewDynamicSteps(false);
    setNewCheckpoints([]);
    setNewMilestones([]);
    setNewRewards([]);
    setNewMediaAssets([]);
    setShowAdvancedBuilder(false);
    setActiveTab("catalogued");
    alert("Custom Challenge created successfully! It is now live in your Catalogued list.");

    onShareFeed?.({
      kind: "challenge_created",
      title: created.title,
      body: created.description,
      refId: created.id,
      refType: "challenge",
    });
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">
      
      {/* Top Banner & Stats */}
      <div 
        className="bg-[#090b14] border border-turquoise-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 cursor-help relative group"
        onMouseEnter={() => setHoveredMetrics(`Active_Streak: ${activeStreak} days | XP_Ledger: ${xp} | Completed_Count: ${Object.keys(userChallengeStates).length}`)}
        onMouseLeave={() => setHoveredMetrics(null)}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-turquoise-500/10 border border-turquoise-500/30 rounded-xl text-turquoise">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
              <span>🚀 MoonBird Challenge Engine & Builder</span>
              <span className="px-2 py-0.5 bg-turquoise-500/10 text-turquoise border border-turquoise-500/30 rounded text-[10px]">Active</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Complete onboarding habit, vital, sky watcher, and blueprint challenges or build your own.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[9px] font-mono text-slate-500 block uppercase">STREAK</span>
            <span className="text-sm font-bold font-mono text-turquoise">🔥 {activeStreak} Days</span>
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
              ? "bg-turquoise-500 text-slate-950 shadow-md"
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
              ? "bg-turquoise-500 text-slate-950 shadow-md"
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
              ? "bg-turquoise-500 text-slate-950 shadow-md animate-pulse"
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
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-turquoise-500 font-mono"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "Mindfulness", "Self-Improvement", "Health", "Astronomy", "Life Blueprint", "Custom"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? "border-turquoise-500 bg-turquoise-500/10 text-turquoise-bright"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat === "all" ? "🌐 ALL" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredChallenges.map(ch => {
              const userState = userChallengeStates[ch.id];
              const isFinished = userState === 'Finished' || userState === 'Completed / Unaudited';
              return (
                <div
                  key={ch.id}
                  className={`group p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isFinished
                      ? "border-emerald-900/60 bg-emerald-950/10 text-slate-300"
                      : "border-slate-800 bg-slate-950/40 hover:border-turquoise-500/40 hover:bg-slate-950/80"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Per-challenge display image (preview mode driven by CHALLENGE_IMAGE_MODE) */}
                    {(() => {
                      const img = getChallengeImage(ch.number);
                      if (!img) return null;
                      if (CHALLENGE_IMAGE_MODE === "predisplayed") {
                        return (
                          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                            <img
                              src={img}
                              alt={`${ch.title} preview`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        );
                      }
                      // on-interaction: reveal on hover
                      return (
                        <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <img
                            src={img}
                            alt={`${ch.title} preview`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ch.number && (
                          <span className="w-5 h-5 rounded-full bg-turquoise-500/10 border border-turquoise-500/30 text-turquoise font-mono text-[10px] font-bold flex items-center justify-center">
                            #{ch.number}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-turquoise uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-turquoise-500/5 rounded border border-turquoise-500/20">
                          {ch.category}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 border border-slate-800 px-1 py-0.5 rounded">
                          {ch.scope}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 border border-slate-800 px-1 py-0.5 rounded">
                          {ch.participationMode}
                        </span>
                        {ch.isCustom && (
                          <span className="text-[8px] font-mono text-emerald-400 px-1 py-0.2 bg-emerald-950/40 border border-emerald-900 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
                        {ch.level || "Level One"}
                      </span>
                    </div>

                    <h3 className={`text-xs font-bold font-mono leading-tight ${isFinished ? "text-emerald-300 line-through" : "text-slate-100"}`}>
                      {ch.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed line-clamp-2">
                      {ch.description}
                    </p>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-850 space-y-0.5 font-mono text-[10px]">
                      <span className="text-slate-400 block font-semibold">📋 Requirements:</span>
                      <span className="text-slate-300 block">{ch.steps.filter(s => !s.optional).length} Mandatory Steps • {ch.surveyQuestions.length} Survey • {ch.bonusTasks.length} Bonus</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-900">
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      +{ch.rewardXp} XP
                    </span>

                    {isFinished ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{userState === 'Completed / Unaudited' ? 'AUDIT PENDING' : 'FINISHED'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenChallenge(ch)}
                        className="px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-bold font-mono text-[10px] uppercase tracking-wider transition-all shadow-md shadow-turquoise-500/10 flex items-center gap-1"
                      >
                        <span>Start</span>
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
            <h3 className="text-xs font-bold font-mono text-turquoise uppercase tracking-wider">
              🏆 Level Progress & Celestial Milestones
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Ascend through Level One (Explorer), Level Two (Stargazer), and Level Three (Cosmic Architect) as you complete onboarding challenges, log habit triggers, and set MoonDial calendar commencement dates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-turquoise font-bold uppercase block">Level One: Beginner</span>
              <p className="text-[11px] text-slate-400">Complete News Perspective Audit, Vital Check, and Life Blueprint.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Basic Journal & Health Templates</div>
            </div>

            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-turquoise font-bold uppercase block">Level Two: Stargazer</span>
              <p className="text-[11px] text-slate-400">Complete Cut the Habit (James Clear) and Sky Watcher Astro Event Log.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Sound Reminders & Challenge Builder</div>
            </div>

            <div className="bg-[#0b0c15] border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-mono text-turquoise font-bold uppercase block">Level Three: Cosmic Master</span>
              <p className="text-[11px] text-slate-400">Maintain a 10-day streak & share custom challenges with peers.</p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Unlocks: Tribe Chat Broadcast Badges</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHALLENGE BUILDER */}
      {activeTab === "builder" && (
        <form onSubmit={handleCreateChallenge} className="bg-[#0b0d18] border border-turquoise-500/30 p-6 rounded-2xl space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-turquoise" />
              <span>Construct a Custom MoonBird Challenge</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Define custom habit, health, astronomy, or productivity challenges for yourself and community members.
            </p>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Challenge Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Morning Solar Hydration Sprint"
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
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

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
              >
                <option value="Skills-Related">Skills-Related</option>
                <option value="Self-Improvement/Wellbeing">Self-Improvement/Wellbeing</option>
                <option value="Fun-Based">Fun-Based</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Participation Mode</label>
              <select
                value={newParticipationMode}
                onChange={(e) => setNewParticipationMode(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
              >
                <option value="Solo">Solo</option>
                <option value="Group">Group</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Challenge Description *</label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Explain the background purpose, steps involved, and intended outcome..."
              className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Goal / Outcome (optional)</label>
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="e.g., Build lunar observation habit and connect celestial data to real-world events."
              className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Level</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
              >
                <option value="Level One">Level One</option>
                <option value="Level Two">Level Two</option>
                <option value="Level Three">Level Three</option>
              </select>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Steps *</label>
            {newSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <input
                  type="text"
                  value={step}
                  onChange={(e) => {
                    const updated = [...newSteps];
                    updated[idx] = e.target.value;
                    setNewSteps(updated);
                  }}
                  placeholder={`Step ${idx + 1} description`}
                  className="flex-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                />
                <label className="flex items-center gap-1 text-[10px] font-mono text-slate-400 whitespace-nowrap pt-2">
                  <input
                    type="checkbox"
                    checked={newStepOptionalFlags[idx] || false}
                    onChange={(e) => {
                      const updated = [...newStepOptionalFlags];
                      updated[idx] = e.target.checked;
                      setNewStepOptionalFlags(updated);
                    }}
                  />
                  Optional
                </label>
                {newSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSteps(newSteps.filter((_, i) => i !== idx));
                      setNewStepOptionalFlags(newStepOptionalFlags.filter((_, i) => i !== idx));
                    }}
                    className="text-red-400 text-xs px-2 pt-2"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setNewSteps([...newSteps, ""]);
                setNewStepOptionalFlags([...newStepOptionalFlags, false]);
              }}
              className="text-[10px] font-mono text-turquoise hover:text-turquoise-bright uppercase"
            >
              + Add Step
            </button>
          </div>

          {/* Dynamic Steps Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dynamicSteps"
              checked={newDynamicSteps}
              onChange={(e) => setNewDynamicSteps(e.target.checked)}
              className="accent-turquoise-400"
            />
            <label htmlFor="dynamicSteps" className="text-xs font-mono text-slate-300">
              Allow dynamic (addable) steps during challenge execution
            </label>
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvancedBuilder(!showAdvancedBuilder)}
            className="text-xs font-mono text-turquoise uppercase tracking-wider flex items-center gap-1"
          >
            {showAdvancedBuilder ? '▼' : '▶'} Advanced Builder Blocks
          </button>

          {showAdvancedBuilder && (
            <div className="space-y-4 border border-slate-800 rounded-xl p-4 bg-slate-950/40">
              {/* Survey Questions */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">User Survey Prompts</label>
                {newSurveyPrompts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const updated = [...newSurveyPrompts];
                        updated[idx] = e.target.value;
                        setNewSurveyPrompts(updated);
                      }}
                      placeholder="Survey prompt..."
                      className="flex-1 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                    />
                    {newSurveyPrompts.length > 1 && (
                      <button type="button" onClick={() => setNewSurveyPrompts(newSurveyPrompts.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNewSurveyPrompts([...newSurveyPrompts, ""])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Prompt</button>
              </div>

              {/* Auditor Questionnaire */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Auditor Questionnaire</label>
                {newAuditorPrompts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const updated = [...newAuditorPrompts];
                        updated[idx] = e.target.value;
                        setNewAuditorPrompts(updated);
                      }}
                      placeholder="Auditor evaluation prompt..."
                      className="flex-1 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                    />
                    {newAuditorPrompts.length > 1 && (
                      <button type="button" onClick={() => setNewAuditorPrompts(newAuditorPrompts.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNewAuditorPrompts([...newAuditorPrompts, ""])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Prompt</button>
              </div>

              {/* Bonus Tasks */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Bonus Tasks</label>
                {newBonusTasks.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => {
                        const updated = [...newBonusTasks];
                        updated[idx] = e.target.value;
                        setNewBonusTasks(updated);
                      }}
                      placeholder="Bonus task description..."
                      className="flex-1 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                    />
                    {newBonusTasks.length > 1 && (
                      <button type="button" onClick={() => setNewBonusTasks(newBonusTasks.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNewBonusTasks([...newBonusTasks, ""])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Bonus Task</button>
              </div>

              {/* Checkpoints */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Checkpoints</label>
                {newCheckpoints.map((cp, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={cp.label}
                      onChange={(e) => {
                        const updated = [...newCheckpoints];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setNewCheckpoints(updated);
                      }}
                      placeholder="Label"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={cp.description}
                      onChange={(e) => {
                        const updated = [...newCheckpoints];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setNewCheckpoints(updated);
                      }}
                      placeholder="Description"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={cp.stepNumber}
                        onChange={(e) => {
                          const updated = [...newCheckpoints];
                          updated[idx] = { ...updated[idx], stepNumber: Number(e.target.value) };
                          setNewCheckpoints(updated);
                        }}
                        placeholder="Step"
                        className="w-16 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                      />
                      <button type="button" onClick={() => setNewCheckpoints(newCheckpoints.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setNewCheckpoints([...newCheckpoints, { label: "", description: "", stepNumber: 1 }])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Checkpoint</button>
              </div>

              {/* Target Milestones */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Target Milestones</label>
                {newMilestones.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => {
                        const updated = [...newMilestones];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setNewMilestones(updated);
                      }}
                      placeholder="Milestone label"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={m.description}
                      onChange={(e) => {
                        const updated = [...newMilestones];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setNewMilestones(updated);
                      }}
                      placeholder="Description"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={m.rewardXp}
                        onChange={(e) => {
                          const updated = [...newMilestones];
                          updated[idx] = { ...updated[idx], rewardXp: Number(e.target.value) };
                          setNewMilestones(updated);
                        }}
                        placeholder="XP"
                        className="w-16 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                      />
                      <button type="button" onClick={() => setNewMilestones(newMilestones.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setNewMilestones([...newMilestones, { label: "", description: "", rewardXp: 0 }])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Milestone</button>
              </div>

              {/* Creator-Sponsored Rewards */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Creator-Sponsored Rewards</label>
                {newRewards.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <select
                      value={r.type}
                      onChange={(e) => {
                        const updated = [...newRewards];
                        updated[idx] = { ...updated[idx], type: e.target.value };
                        setNewRewards(updated);
                      }}
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="digital_service">Digital Service</option>
                      <option value="digital_asset">Digital Asset</option>
                    </select>
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => {
                        const updated = [...newRewards];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setNewRewards(updated);
                      }}
                      placeholder="Description"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={r.value}
                        onChange={(e) => {
                          const updated = [...newRewards];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setNewRewards(updated);
                        }}
                        placeholder="Value"
                        className="flex-1 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                      />
                      <button type="button" onClick={() => setNewRewards(newRewards.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setNewRewards([...newRewards, { type: "cash", description: "", value: "" }])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Reward</button>
              </div>

              {/* Media Assets */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Media Assets</label>
                {newMediaAssets.map((ma, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <select
                      value={ma.type}
                      onChange={(e) => {
                        const updated = [...newMediaAssets];
                        updated[idx] = { ...updated[idx], type: e.target.value };
                        setNewMediaAssets(updated);
                      }}
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </select>
                    <input
                      type="text"
                      value={ma.url}
                      onChange={(e) => {
                        const updated = [...newMediaAssets];
                        updated[idx] = { ...updated[idx], url: e.target.value };
                        setNewMediaAssets(updated);
                      }}
                      placeholder="URL or asset path"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ma.caption}
                      onChange={(e) => {
                        const updated = [...newMediaAssets];
                        updated[idx] = { ...updated[idx], caption: e.target.value };
                        setNewMediaAssets(updated);
                      }}
                      placeholder="Caption (optional)"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={ma.stepNumber || ""}
                        onChange={(e) => {
                          const updated = [...newMediaAssets];
                          updated[idx] = { ...updated[idx], stepNumber: e.target.value ? Number(e.target.value) : undefined };
                          setNewMediaAssets(updated);
                        }}
                        placeholder="Step #"
                        className="w-20 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none"
                      />
                      <button type="button" onClick={() => setNewMediaAssets(newMediaAssets.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setNewMediaAssets([...newMediaAssets, { id: "ma-" + Date.now(), type: "image", url: "", caption: "" }])} className="text-[10px] font-mono text-turquoise uppercase">+ Add Media Asset</button>
              </div>

              {/* Completion Requirement */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Completion Requirement</label>
                <textarea
                  rows={2}
                  value={newCompletionRequirement}
                  onChange={(e) => setNewCompletionRequirement(e.target.value)}
                  placeholder="Exact final step and criteria required to deem the challenge Finished."
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-turquoise-500/10"
          >
            Publish Custom Challenge
          </button>
        </form>
      )}

      {/* DETAILED CHALLENGE EXECUTION MODAL */}
       {selectedChallenge && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-md z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSubmitChallenge}
            className="w-full max-w-2xl bg-[#090b14] border border-turquoise-500/40 rounded-2xl shadow-2xl space-y-4 my-4 sm:my-8 relative max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono text-turquoise uppercase px-2 py-0.5 bg-turquoise-500/10 border border-turquoise-500/30 rounded">
                      {selectedChallenge.category}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                      {selectedChallenge.scope}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                      {selectedChallenge.participationMode}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {selectedChallenge.level}
                    </span>
                  </div>
                <h2 className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-1">
                  {selectedChallenge.title}
                </h2>
                {selectedChallenge.goal && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedChallenge.goal}</p>
                )}

                {/* Step Progress Indicator */}
                {(() => {
                  const mandatorySteps = selectedChallenge.steps.filter(s => !s.optional);
                  const completedCount = mandatorySteps.filter(s => stepProgress[s.stepNumber]).length;
                  const totalCount = mandatorySteps.length;
                  const allDone = completedCount === totalCount;
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {mandatorySteps.map((s, i) => (
                          <div
                            key={s.stepNumber}
                            className={`h-1.5 rounded-full transition-all ${
                              stepProgress[s.stepNumber]
                                ? "w-4 bg-emerald-400"
                                : s.stepNumber === unlockedStepNumber && !allDone
                                ? "w-4 bg-turquoise-400 animate-pulse"
                                : "w-2 bg-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {allDone ? 'All mandatory steps complete!' : `Step ${completedCount + 1} of ${totalCount}`}
                      </span>
                    </div>
                  );
                })()}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedChallenge(null)}
                  className="text-slate-500 hover:text-white text-xl focus:outline-none shrink-0"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-5 space-y-4 overflow-y-auto flex-1 min-h-0 py-2">

            {selectedChallenge.participantRoles && selectedChallenge.participantRoles.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] font-mono text-turquoise uppercase block font-semibold">👥 Participant Roles</span>
                {selectedChallenge.participantRoles.map((r, i) => (
                  <span key={i} className="text-[11px] text-slate-300 font-mono block">
                    {r.isLeader ? '👑 ' : ''}{r.role}: {r.description}
                  </span>
                ))}
              </div>
            )}

            {selectedChallenge.checkpoints && selectedChallenge.checkpoints.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] font-mono text-turquoise uppercase block font-semibold">🚩 Checkpoints</span>
                {selectedChallenge.checkpoints.map((cp, i) => (
                  <span key={i} className="text-[11px] text-slate-300 font-mono block">
                    Step {cp.stepNumber}: {cp.label} — {cp.description}
                  </span>
                ))}
              </div>
            )}

            {selectedChallenge.targetMilestones && selectedChallenge.targetMilestones.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] font-mono text-turquoise uppercase block font-semibold">🎯 Target Milestones</span>
                {selectedChallenge.targetMilestones.map((m, i) => (
                  <span key={i} className="text-[11px] text-slate-300 font-mono block">
                    {m.label}: {m.description} (+{m.rewardXp} XP)
                  </span>
                ))}
              </div>
            )}

            {selectedChallenge.creatorSponsoredRewards && selectedChallenge.creatorSponsoredRewards.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] font-mono text-turquoise uppercase block font-semibold">💎 Creator-Sponsored Rewards</span>
                {selectedChallenge.creatorSponsoredRewards.map((r, i) => (
                  <span key={i} className="text-[11px] text-slate-300 font-mono block">
                    {r.type.toUpperCase()}: {r.description} ({r.value})
                  </span>
                ))}
              </div>
            )}

            {selectedChallenge.mediaAssets && selectedChallenge.mediaAssets.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] font-mono text-turquoise uppercase block font-semibold">🖼️ Media Assets</span>
                {selectedChallenge.mediaAssets.map((ma, i) => (
                  <span key={i} className="text-[11px] text-slate-300 font-mono block">
                    [{ma.type}] {ma.caption || ma.url} {ma.stepNumber ? `(at step ${ma.stepNumber})` : ''}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-300 font-sans leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
              {selectedChallenge.description}
            </p>

            {/* MANDATORY STEPS CHECKLIST */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono text-turquoise uppercase flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-turquoise" />
                <span>Mandatory Execution Steps</span>
              </h4>

              <div className="space-y-2">
                {selectedChallenge.steps.filter(s => !s.optional).map((st) => {
                  const isChecked = !!stepProgress[st.stepNumber];
                  const isUnlocked = isChecked || st.stepNumber === unlockedStepNumber;
                  const isLocked = !isUnlocked;
                  const actionCompleted = isStepActionCompleted(selectedChallenge.id, st.stepNumber);

                  if (isLocked) return null;

                  return (
                    <label
                      key={st.stepNumber}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500/40 bg-emerald-950/20 text-slate-200"
                          : "border-turquoise-500/30 bg-turquoise-500/5 text-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStep(st.stepNumber)}
                        className="mt-0.5 accent-turquoise-400 w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold font-mono text-slate-200 block">
                          Step {st.stepNumber}: {st.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans leading-normal block">
                          {st.description}
                        </span>
                        {st.toolAction && !isChecked && !actionCompleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigateToTool(st.toolAction!.view, selectedChallenge.id, st.stepNumber);
                            }}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <span>Open {st.toolAction.label}</span>
                            <span>&rarr;</span>
                          </button>
                        )}
                        {actionCompleted && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <CheckCircle className="w-3 h-3" /> Tool action completed
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* OPTIONAL STEPS */}
            {unlockedStepNumber === 999 && selectedChallenge.steps.some(s => s.optional) && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Optional Steps (Extra Rewards)</span>
                </h4>

                <div className="space-y-2">
                  {selectedChallenge.steps.filter(s => s.optional).map((st) => {
                    const isChecked = !!stepProgress[st.stepNumber];
                    return (
                      <label
                        key={st.stepNumber}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "border-turquoise-500/40 bg-turquoise-500/10 text-turquoise-bright"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStep(st.stepNumber)}
                          className="mt-0.5 accent-turquoise-400 w-4 h-4"
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
            )}

            {/* TAILORED SURVEY QUESTIONS */}
            {selectedChallenge.surveyQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-turquoise uppercase flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-turquoise" />
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
                                  ? "bg-turquoise-500 text-slate-950 shadow-md"
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
                                  ? "bg-turquoise-500 text-slate-950"
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
                                  ? "bg-turquoise-500 text-slate-950"
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

            {/* AUDITOR QUESTIONNAIRE */}
            {selectedChallenge.auditorQuestionnaire && selectedChallenge.auditorQuestionnaire.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-turquoise uppercase flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-turquoise" />
                  <span>Auditor Evaluation Questionnaire</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">This section will be completed by an assigned auditor after you submit the challenge.</p>

                <div className="space-y-3">
                  {selectedChallenge.auditorQuestionnaire.map((q) => (
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
                              className={`w-9 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === num
                                  ? "bg-turquoise-500 text-slate-950 shadow-md"
                                  : "bg-slate-900 border border-slate-800 text-slate-400"
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
                              className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === opt
                                  ? "bg-turquoise-500 text-slate-950"
                                  : "bg-slate-900 border border-slate-800 text-slate-400"
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
                              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                                surveyAnswers[q.id] === opt
                                  ? "bg-turquoise-500 text-slate-950"
                                  : "bg-slate-900 border border-slate-800 text-slate-400"
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
                          placeholder="Auditor evaluation..."
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BONUS TASKS */}
            {unlockedStepNumber === 999 && selectedChallenge.bonusTasks.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono text-turquoise uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-turquoise" />
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
                            ? "border-turquoise-500/40 bg-turquoise-500/10 text-turquoise-bright"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={() => handleToggleBonus(b.id)}
                            className="accent-turquoise-400 w-4 h-4"
                          />
                          <div>
                            <span className="text-xs font-bold font-mono text-slate-200 block">{b.title}</span>
                            <span className="text-[11px] text-slate-400 font-sans block">{b.description}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-turquoise shrink-0">+{b.xpReward} XP</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MANDATORY SUBMISSION NOTE */}
            {unlockedStepNumber === 999 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-mono font-bold text-turquoise uppercase block">
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
                  className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-turquoise-500 font-mono"
                />
              </div>
             )}

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{modalError}</span>
              </div>
            )}

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono uppercase font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-turquoise-500 hover:bg-turquoise-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-turquoise-500/10 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Finish & Claim XP</span>
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

    </div>
  );
}
