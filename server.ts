import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { AstroEvent, Challenge, ChatMessage, Comment, OnlineUser } from "./src/types";
import { astroCatalogue } from "./src/lib/events";

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI interactions will fall back to local rule-based simulation.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database State
const onlineUsers: Map<string, OnlineUser> = new Map();
let tribeMessages: ChatMessage[] = [];
let aiMessages: Map<string, ChatMessage[]> = new Map(); // keyed by nickname

// Seed mock Astro Events from the shared catalogue
const astroEvents: AstroEvent[] = JSON.parse(JSON.stringify(astroCatalogue));
// Seed comments for highlights
const mainEclipse = astroEvents.find(e => e.id === "eclipse-aug-2026" || e.id === "eclipse-2026");
if (mainEclipse) {
  mainEclipse.comments.push({
    id: "c1",
    author: "CosmicStargazer",
    text: "Planning a trip to northern Spain for this!",
    timestamp: "2026-07-10T05:00:00Z"
  });
}

// Seed documented challenges (Challenges 1–8 per Documentation.md)
const challenges: Challenge[] = [
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Open MoonDial — Observe Lunar Times", description: "Open MoonDial, observe tomorrow's moonrise, moon zenith, and moonset times, and add a reminder with a sound notification for each." },
      { stepNumber: 2, title: "Capture or Describe the Moon", description: "Take a picture of the moon with your camera, or describe how the moon looks and how it makes you feel.", optional: true },
      { stepNumber: 3, title: "Note Lunar Data & Take Snapshot", description: "Visit MoonDial to note your lunar data, then take a snapshot and log it." },
      { stepNumber: 4, title: "Share Log on Personal Feed", description: "Share the log on your personal feed (posts).", optional: true },
      { stepNumber: 5, title: "Find Public Event Coinciding with Full Moon", description: "Search the internet or any resource for a holiday or public event that coincides with the full moon, record the time of its zenith, and add a reminder." },
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
    goal: "Build lunar observation habit and connect celestial data to real-world events."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Set Wake-Up Alarm", description: "Pick a time to wake up the following day — when you would usually start your day — and set an alarm." },
      { stepNumber: 2, title: "Create & Activate Daily Schedule", description: "Make a schedule for your tasks on that day and activate it; it will remind you at every time you need to perform a task. (If you cannot carry your device, make a to-do list to check off at the end of the day. By default, a schedule is also a checkable to-do list.)", actionType: "set_dial_reminder" },
      { stepNumber: 3, title: "Complete Portfolio Page", description: "Complete your portfolio page." }
    ],
    surveyQuestions: [],
    bonusTasks: [
      { id: "bt1", title: "Skills Catalogue Explorer", description: "Explore the skills catalogue and find a simple skill you like.", xpReward: 20 },
      { id: "bt2", title: "5-Day Skill Practice Streak", description: "Go on a 5-day streak of practicing this skill.", xpReward: 40 }
    ],
    completionRequirement: "Publish your completed Portfolio page to lock in your onboarding profile and transition the challenge state to Finished.",
    comments: [],
    participants: [],
    goal: "Establish daily routine structure and complete onboarding profile."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Select Book from Catalogue", description: "Go to the books catalogue and pick a book that seems interesting." },
      { stepNumber: 2, title: "Read One Chapter or Section", description: "Read one chapter or section." },
      { stepNumber: 3, title: "Write Personal Reaction", description: "Write down, in an input text box, why you liked it; if you disliked it, express that as well." },
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
    goal: "Develop active reading habits and critical reflection skills."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Pick Current-Event Story or News Video", description: "Pick a current-event story or news video from the platform feed or external media." },
      { stepNumber: 2, title: "Watch or Read Coverage Carefully", description: "Watch or read the selected current-event coverage carefully." },
      { stepNumber: 3, title: "Write Personal Perspective", description: "Write down, in an input text box, your personal perspective on the event and how it impacts your local community." },
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
    goal: "Develop critical news literacy and personal perspective articulation."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Identify & Log Primary Trigger", description: "Identify the habit you want to quit and log its primary trigger (time, location, emotional state, or people) in your Journal.", actionType: "log_journal" },
      { stepNumber: 2, title: "Write Identity Reframing Statement", description: "Reframe your mindset in your Journal by writing an identity statement (e.g., 'I am not the type of person who does X').", actionType: "log_journal" },
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
    goal: "Replace unwanted habits with intentional identity-driven behavior change."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Record Vitals at Clinic", description: "Visit a local health clinic or medical center and get your basic vitals recorded (e.g., blood pressure, pulse, weight, or blood sugar).", actionType: "clinic_visit" },
      { stepNumber: 2, title: "Consult Health Catalogue", description: "Research or consult with a health professional / the disease catalogue to find out what your readings mean and gauge your current overall health status." },
      { stepNumber: 3, title: "Log Health Gauge in Journal", description: "Log your health-status gauge in your Journal using the health template.", actionType: "log_journal" },
      { stepNumber: 4, title: "Draft 30-Day Actionable Health Plan", description: "Draft an actionable personal plan in your Journal outlining how you will either maintain your good health or improve your vitals over the next 30 days." }
    ],
    surveyQuestions: [],
    bonusTasks: [
      { id: "bt1", title: "Explore Disease & Health Catalogue", description: "Explore the disease and health catalogue to learn about preventive measures for one common health condition.", xpReward: 25 },
      { id: "bt2", title: "Set Up MoonDial Health Reminders", description: "Set up daily water or exercise reminders on MoonDial to support your health plan.", xpReward: 30 }
    ],
    completionRequirement: "Save your actionable health plan and vital-summary log in your Journal to deem the challenge officially Finished.",
    comments: [],
    participants: [],
    goal: "Increase health awareness and establish a 30-day improvement or maintenance plan."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "Select Astro Event from Catalogue", description: "Go to the Astro Events catalogue and observe the nearest upcoming astro event, or browse and select one specific event that interests you (note: choosing a distant event will affect the calendar time required to complete this challenge).", actionType: "observe_event" },
      { stepNumber: 2, title: "Mark Event Date & Set Sound Reminder", description: "Mark the exact event date on your MoonDial calendar and set an active sound reminder.", actionType: "set_dial_reminder" },
      { stepNumber: 3, title: "Plan Observation Activity in Journal", description: "Plan a specific observation activity in your Journal for that day (e.g., outdoor viewing spot, equipment needed, or safety measures)." },
      { stepNumber: 4, title: "Attempt Live Celestial Capture", description: "On the scheduled date, attempt to capture the astronomical event with your eyes (or a camera)." },
      { stepNumber: 5, title: "Write Detailed Observation Log", description: "Write a detailed log of your live observation experience in your Journal.", actionType: "log_journal" }
    ],
    surveyQuestions: [],
    bonusTasks: [
      { id: "bt1", title: "Share Astro Event on Personal Feed", description: "Share a photo or written description of the astro event on your personal feed (posts).", xpReward: 35 },
      { id: "bt2", title: "Live Chat Stargazer Connect", description: "Connect with another online user in Live Chat during the astro event to compare observations.", xpReward: 35 }
    ],
    completionRequirement: "Log your final live-experience entry on the scheduled date to deem the challenge Finished.",
    comments: [],
    participants: [],
    goal: "Deepen astronomical engagement through planned observation and live documentation."
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
    state: "Finished",
    steps: [
      { stepNumber: 1, title: "List Master Life Goals", description: "Create a list in your Journal of the core things you want to achieve in this lifetime (your master life goals).", actionType: "life_goal" },
      { stepNumber: 2, title: "Reflect on Why Each Goal Matters", description: "Reflect on each goal and write a short explanation next to it detailing why that goal matters deeply to you." },
      { stepNumber: 3, title: "Select One Priority Goal", description: "Select one priority goal from your list to focus on right now." },
      { stepNumber: 4, title: "Break Goal into Sequential Action Steps", description: "Break down that single goal into sequential, actionable steps inside your Journal." },
      { stepNumber: 5, title: "Lock Commencement Date on MoonDial", description: "Set an exact commencement date on your MoonDial calendar for when you will take your very first step toward that goal.", actionType: "set_dial_reminder" }
    ],
    surveyQuestions: [],
    bonusTasks: [
      { id: "bt1", title: "Add Skill to Portfolio", description: "Add a required skill for your chosen goal from the Skills Catalogue to your Portfolio as an active focus area.", xpReward: 30 },
      { id: "bt2", title: "Share Commencement Date for Accountability", description: "Share your target commencement date with a friend or in Live Chat to build personal accountability.", xpReward: 30 }
    ],
    completionRequirement: "Confirm your chosen goal, action steps, and locked commencement date in your Journal to deem the challenge Finished.",
    comments: [],
    participants: [],
    goal: "Clarify lifelong direction and commit to a single prioritized goal with a locked start date."
  }
];

// Real-Time Event Stream (SSE) subscribers
let subscribers: any[] = [];

function broadcastSSE(type: string, data: any) {
  subscribers.forEach(sub => {
    sub.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// REST Endpoints
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    activeUsersCount: onlineUsers.size,
    currentTime: new Date().toISOString()
  });
});

app.get("/api/online-users", (req, res) => {
  res.json(Array.from(onlineUsers.values()));
});

app.post("/api/login", (req, res) => {
  const { nickname, activePhase } = req.body;
  if (!nickname) {
    return res.status(400).json({ error: "Nickname is required" });
  }

  const userId = nickname.toLowerCase();
  const user: OnlineUser = {
    id: userId,
    nickname,
    activePhase: activePhase || "Full Moon",
    lastActive: new Date().toISOString()
  };

  onlineUsers.set(userId, user);
  broadcastSSE("user_login", user);
  broadcastSSE("users_list", Array.from(onlineUsers.values()));

  res.json({ success: true, user });
});

app.post("/api/logout", (req, res) => {
  const { nickname } = req.body;
  if (nickname) {
    const userId = nickname.toLowerCase();
    onlineUsers.delete(userId);
    broadcastSSE("user_logout", { nickname });
    broadcastSSE("users_list", Array.from(onlineUsers.values()));
  }
  res.json({ success: true });
});

// Astro Events APIs
app.get("/api/events", (req, res) => {
  res.json(astroEvents);
});

app.post("/api/events/:id/comment", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;
  const event = astroEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const newComment: Comment = {
    id: Date.now().toString(),
    author: author || "Anonymous Stargazer",
    text,
    timestamp: new Date().toISOString()
  };

  event.comments.push(newComment);
  broadcastSSE("event_comment", { eventId: id, comment: newComment });
  res.json(newComment);
});

// Challenges APIs
app.get("/api/challenges", (req, res) => {
  res.json(challenges);
});

app.post("/api/challenges/:id/comment", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;
  const challenge = challenges.find(c => c.id === id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const newComment: Comment = {
    id: Date.now().toString(),
    author: author || "Anonymous Stargazer",
    text,
    timestamp: new Date().toISOString()
  };

  challenge.comments.push(newComment);
  broadcastSSE("challenge_comment", { challengeId: id, comment: newComment });
  res.json(newComment);
});

app.post("/api/challenges/:id/complete", (req, res) => {
  const { id } = req.params;
  const { nickname } = req.body;
  const challenge = challenges.find(c => c.id === id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  if (nickname) {
    const existing = challenge.participants.find(p => p.nickname === nickname);
    if (!existing) {
      const isAudited = challenge.auditorQuestionnaire && challenge.auditorQuestionnaire.length > 0;
      challenge.participants.push({
        nickname,
        state: isAudited ? "Completed / Unaudited" : "Finished",
        submittedAt: new Date().toISOString()
      });
      broadcastSSE("challenge_completed", { challengeId: id, nickname, rewardXp: challenge.rewardXp });
    }
  }
  res.json({ success: true, challenge });
});

// Chat Log APIs
app.get("/api/chat/messages/tribe", (req, res) => {
  res.json(tribeMessages);
});

app.post("/api/chat/messages/tribe", (req, res) => {
  const { nickname, text } = req.body;
  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    sender: nickname || "Guest",
    senderName: nickname || "Guest",
    text,
    timestamp: new Date().toISOString()
  };

  tribeMessages.push(newMessage);
  if (tribeMessages.length > 100) tribeMessages.shift(); // keep it clean

  broadcastSSE("tribe_message", newMessage);
  res.json(newMessage);
});

// AI Companion Dialog with Proactive triggers
app.get("/api/chat/messages/companion/:nickname", (req, res) => {
  const { nickname } = req.params;
  const key = nickname.toLowerCase();
  res.json(aiMessages.get(key) || []);
});

app.post("/api/chat/messages/companion", async (req, res) => {
  const { nickname, text, appMetrics, notesSnapshot } = req.body;
  if (!nickname) return res.status(400).json({ error: "Nickname is required" });

  const userKey = nickname.toLowerCase();
  if (!aiMessages.has(userKey)) {
    aiMessages.set(userKey, []);
  }

  const userHistory = aiMessages.get(userKey)!;

  const userMessage: ChatMessage = {
    id: `u-${Date.now()}`,
    sender: nickname,
    senderName: nickname,
    text,
    timestamp: new Date().toISOString()
  };
  userHistory.push(userMessage);

  // Lazy initialize and call Google GenAI
  let replyText = "";
  try {
    const ai = getAI();
    const hasKey = process.env.GEMINI_API_KEY;

    if (hasKey) {
      // Build context containing app metrics and notes for high-quality proactive astronomy support
      const contextPrompt = `
You are the supportive and highly conversational "Moonbug AI Companion," a supportive lunar astrologer, productivity assistant, and astronomer.
You are interacting with ${nickname}.
Current App Metrics Context: ${JSON.stringify(appMetrics || {})}
Recent Notes Snapshot: ${JSON.stringify(notesSnapshot || "")}

Keep your responses deeply aligned with astronomy, astrophysics, lunar phases, cosmic rhythms, and self-reflection.
Provide supportive, insightful advice on how to align routines with moon phases (e.g., resting on New Moon, taking massive action on Full Moon, planning on Waxing Crescent, organizing on Waning Gibbous).
Respond in a friendly, conversational, yet highly structured manner. Avoid sales jargon.
Keep responses concise (under 150 words).

Dialogue history:
${userHistory.slice(-6).map(m => `${m.senderName}: ${m.text}`).join("\n")}
Moonbug AI Companion:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
        config: {
          temperature: 0.8,
        }
      });
      replyText = response.text || "The cosmos are peaceful and silent right now. Focus on your deep breaths.";
    } else {
      // Fallback offline simulated responses
      const simulatedReplies = [
        "The current lunar phase offers a pristine window for inner reflections. What thoughts are manifesting for you?",
        "Astrophysics reveals we are all made of stardust. Aligning your routine with the cosmos helps reduce everyday friction.",
        "A magnificent Buck Supermoon is approaching. This represents a period of hyper-focus and abundant energy. Put those plans into action!",
        "Under the New Moon, let us reset and write our life goals. The canvas of space is wide open for your milestones."
      ];
      replyText = simulatedReplies[Math.floor(Math.random() * simulatedReplies.length)];
    }
  } catch (err: any) {
    console.error("Gemini API error:", err);
    replyText = "The solar winds are currently causing interference. Take a moment to stargaze, and let's speak again shortly.";
  }

  const aiMessage: ChatMessage = {
    id: `ai-${Date.now()}`,
    sender: "AI",
    senderName: "Moonbug Bot",
    text: replyText,
    timestamp: new Date().toISOString()
  };
  userHistory.push(aiMessage);

  res.json({ success: true, messages: [userMessage, aiMessage] });
});

// Proactive Engagement endpoint triggered by clients periodically
app.post("/api/chat/proactive", async (req, res) => {
  const { nickname, appMetrics, notesSnapshot, triggerType } = req.body;
  if (!nickname) return res.status(400).json({ error: "Nickname is required" });

  const userKey = nickname.toLowerCase();
  const userHistory = aiMessages.get(userKey) || [];

  let triggerPrompt = "";
  if (triggerType === "morning") {
    triggerPrompt = "It is morning check-in time. Autonomously initiate a warm cosmic greeting. Ask how they slept or recommend an alignment routine.";
  } else if (triggerType === "night") {
    triggerPrompt = "It is late-night astronomical hour. Recommend looking at the stars, or comment on the current moon positioning.";
  } else if (triggerType === "notes_added") {
    triggerPrompt = "The user just saved a journal or memory note. Gently comment on their reflection or offer a cosmic insight.";
  } else {
    triggerPrompt = "Autonomously check in on their current daily challenge progress or XP level.";
  }

  let replyText = "";
  try {
    const ai = getAI();
    if (process.env.GEMINI_API_KEY) {
      const contextPrompt = `
You are the supportive and warm "Moonbug AI Companion."
You are initiating a proactive supportive message to ${nickname}.
Context trigger: ${triggerPrompt}
Current User XP: ${appMetrics?.xp || 0}
Recent notes context: ${JSON.stringify(notesSnapshot || "")}

Draft a direct, supportive, and reflective micro-message (under 80 words) to spark their productivity relationship.
Moonbug AI Companion:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
        config: {
          temperature: 0.8
        }
      });
      replyText = response.text || "Stardust glows brighter when we synchronize. Keep up your amazing cosmic path!";
    } else {
      replyText = "The stars whisper encouragement. Remember to check your daily routine timetable to align with today's cycle!";
    }
  } catch (err) {
    replyText = "May the celestial tides guide your path. Keep up your amazing routines today!";
  }

  const aiMessage: ChatMessage = {
    id: `ai-proactive-${Date.now()}`,
    sender: "AI",
    senderName: "Moonbug Bot",
    text: replyText,
    timestamp: new Date().toISOString(),
    isProactive: true
  };

  if (!aiMessages.has(userKey)) aiMessages.set(userKey, []);
  aiMessages.get(userKey)!.push(aiMessage);

  res.json({ success: true, message: aiMessage });
});

// SSE subscription route
app.get("/api/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  res.write("\n");

  const subscriber = res;
  subscribers.push(subscriber);

  req.on("close", () => {
    subscribers = subscribers.filter(sub => sub !== subscriber);
  });
});

/* ============================================================
   SOCIAL LAYER (Catalogues: Brands & Books, Feeds, Users,
   Presence, Matchmaking) — JSON-file backed so data survives
   restarts. See Documentation.md "Social & Catalogues Backend".
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadJson<T>(file: string, fallback: T): T {
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return fallback; }
}
function saveJson(file: string, data: any) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ---- Brands catalogue ----
const seedBrands = [
  { id: "brand-astro-vibe", name: "AstroVibe Espresso", tagline: "Comet-cultivated cosmic coffee.", category: "Beverage", interests: ["Astronomy", "Mindfulness"], logoEmoji: "☕" },
  { id: "brand-lunar-gear", name: "Lunar Gear Co.", tagline: "Telescopes & night-sky apparel.", category: "Outdoor", interests: ["Astronomy", "Health"], logoEmoji: "🔭" },
  { id: "brand-quietmind", name: "QuietMind Journals", tagline: "Reflection notebooks for stargazers.", category: "Stationery", interests: ["Mindfulness", "Self-Improvement"], logoEmoji: "📓" },
  { id: "brand-orbitfit", name: "OrbitFit", tagline: "Movement routines aligned to moon phases.", category: "Fitness", interests: ["Health", "Self-Improvement"], logoEmoji: "🧘" },
];
let brands = loadJson<any[]>("brands.json", seedBrands);

// ---- Books catalogue (catalogue of books, not the books themselves) ----
const seedBooks = [
  { id: "book-cosmos", title: "Cosmos", author: "Carl Sagan", tagline: "A personal voyage through space and time.", category: "Science", interests: ["Astronomy", "Mindfulness"], emoji: "🪐" },
  { id: "book-moon", title: "The Moon: Our Celestial Companion", author: "Various", tagline: "Lunar science for curious minds.", category: "Science", interests: ["Astronomy"], emoji: "🌙" },
  { id: "book-atomic", title: "Atomic Habits", author: "James Clear", tagline: "Tiny changes, remarkable results.", category: "Self-Help", interests: ["Self-Improvement", "Health"], emoji: "⚛️" },
  { id: "book-power", title: "The Power of Now", author: "Eckhart Tolle", tagline: "Spiritual awakening in everyday life.", category: "Mindfulness", interests: ["Mindfulness"], emoji: "🧘" },
];
let books = loadJson<any[]>("books.json", seedBooks);

// ---- Skills catalogue ----
const seedSkills = [
  { id: "skill-astro-photography", name: "Astro-Photography", category: "Astronomy", description: "Capture the night sky with camera and tripod.", level: "Beginner", interests: ["Astronomy"] },
  { id: "skill-journaling", name: "Reflective Journaling", category: "Self-Improvement", description: "Daily written reflection and goal tracking.", level: "Beginner", interests: ["Self-Improvement", "Mindfulness"] },
  { id: "skill-telescope-use", name: "Telescope Operation", category: "Astronomy", description: "Align, focus, and track celestial objects.", level: "Intermediate", interests: ["Astronomy"] },
  { id: "skill-meditation", name: "Mindfulness Meditation", category: "Mindfulness", description: "Breath and body-scan routines for calm.", level: "Beginner", interests: ["Mindfulness", "Health"] },
  { id: "skill-orbital-mechanics", name: "Orbital Mechanics", category: "Science", description: "Keplerian models and ephemeris basics.", level: "Advanced", interests: ["Astronomy", "Self-Improvement"] },
];
let skills = loadJson<any[]>("skills.json", seedSkills);

// ---- Disease / health catalogue ----
const seedDiseases = [
  { id: "disease-hypertension", name: "Hypertension", category: "Cardiovascular", summary: "Persistently high blood pressure; monitor and reduce sodium.", prevention: "Regular exercise, low-salt diet, sleep." },
  { id: "disease-diabetes", name: "Type 2 Diabetes", category: "Metabolic", summary: "Impaired insulin use raising blood sugar.", prevention: "Balanced diet, activity, weight management." },
  { id: "disease-asthma", name: "Asthma", category: "Respiratory", summary: "Airway inflammation causing breathlessness.", prevention: "Avoid triggers, air quality awareness." },
  { id: "disease-insomnia", name: "Insomnia", category: "Sleep", summary: "Difficulty initiating or maintaining sleep.", prevention: "Consistent schedule, screen-down wind-down." },
];
let diseases = loadJson<any[]>("diseases.json", seedDiseases);

// ---- Charities / non-profit programmes catalogue ----
const seedCharities = [
  { id: "charity-stars-for-kids", name: "Stars for Kids", tagline: "Free telescopes & night-sky clubs for schools.", category: "Education", region: "Global" },
  { id: "charity-clean-air", name: "Clean Air Coalition", tagline: "Community air-quality monitoring grants.", category: "Environment", region: "Africa" },
  { id: "charity-mind-matters", name: "Mind Matters", tagline: "Mental-health peer support programmes.", category: "Health", region: "Global" },
  { id: "charity-orbit-academy", name: "Orbit Academy", tagline: "STEM scholarships for under-served regions.", category: "Education", region: "Kenya" },
];
let charities = loadJson<any[]>("charities.json", seedCharities);

// ---- Feeds ----
let feeds: any[] = loadJson<any[]>("feeds.json", []);
function addFeed(entry: any) {
  const item = { id: `feed-${Date.now()}`, timestamp: new Date().toISOString(), ...entry };
  feeds.unshift(item);
  if (feeds.length > 200) feeds.pop();
  saveJson("feeds.json", feeds);
  broadcastSSE("feed_new", item);
  return item;
}

// ---- Registered users (profiles w/ interests + brand links) ----
const seedUsers = [
  { id: "nebula-rae", nickname: "NebulaRae", interests: ["Astronomy", "Mindfulness"], brandLinks: ["brand-astro-vibe", "brand-quietmind"], avatarEmoji: "🌌", bio: "Night-sky journaler." },
  { id: "orbit-kai", nickname: "OrbitKai", interests: ["Astronomy", "Health"], brandLinks: ["brand-lunar-gear", "brand-orbitfit"], avatarEmoji: "🚀", bio: "Telescope runner." },
  { id: "calm-sol", nickname: "CalmSol", interests: ["Mindfulness", "Self-Improvement"], brandLinks: ["brand-quietmind", "brand-orbitfit"], avatarEmoji: "🌞", bio: "Habit builder." },
  { id: "star-mira", nickname: "StarMira", interests: ["Astronomy", "Self-Improvement"], brandLinks: ["brand-astro-vibe", "brand-lunar-gear"], avatarEmoji: "✨", bio: "Lunar photographer." },
];
let users = loadJson<any[]>("users.json", seedUsers);

// Map online presence -> registered user for "meet people like me"
function publicUser(u: any) {
  return { id: u.id, nickname: u.nickname, interests: u.interests, brandLinks: u.brandLinks, avatarEmoji: u.avatarEmoji, bio: u.bio };
}

// ---- Catalogue endpoints ----
app.get("/api/catalogue/brands", (req, res) => res.json(brands));
app.get("/api/catalogue/books", (req, res) => res.json(books));
app.get("/api/catalogue/skills", (req, res) => res.json(skills));
app.get("/api/catalogue/diseases", (req, res) => res.json(diseases));
app.get("/api/catalogue/charities", (req, res) => res.json(charities));

// ---- Feed endpoints ----
app.get("/api/feed", (req, res) => {
  const { author, kind } = req.query;
  let result = feeds;
  if (author) result = result.filter((f: any) => f.author === author);
  if (kind) result = result.filter((f: any) => f.kind === kind);
  res.json(result);
});
app.post("/api/feed", (req, res) => {
  const { author, kind, title, body, refId, refType, experience } = req.body;
  if (!author || !kind) return res.status(400).json({ error: "author and kind required" });
  const item = addFeed({ author, kind, title, body, refId, refType, experience });
  res.json(item);
});

// ---- Users / profile endpoints ----
app.get("/api/users", (req, res) => res.json(users.map(publicUser)));
app.get("/api/users/:id", (req, res) => {
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "User not found" });
  const uFeeds = feeds.filter(f => f.author === u.nickname);
  res.json({ ...publicUser(u), feed: uFeeds });
});

// ---- Matchmaking: "people like me" ----
app.get("/api/matchmaking", (req, res) => {
  const { nickname, interests, brandLinks } = req.query;
  const myInterests = (interests ? String(interests).split(",") : []) as string[];
  const myBrands = (brandLinks ? String(brandLinks).split(",") : []) as string[];
  const scored = users
    .filter(u => u.nickname !== nickname)
    .map(u => {
      const sharedInterests = u.interests.filter((i: string) => myInterests.includes(i));
      const sharedBrands = u.brandLinks.filter((b: string) => myBrands.includes(b));
      const score = sharedInterests.length * 2 + sharedBrands.length * 3;
      return { ...publicUser(u), score, sharedInterests, sharedBrands };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  res.json(scored);
});

// ---- Online presence for "flying birds" ----
app.get("/api/online-users/extended", (req, res) => {
  const list = Array.from(onlineUsers.values()) as any[];
  const enriched = list.map(o => {
    const reg = users.find(u => u.nickname.toLowerCase() === o.nickname.toLowerCase());
    return reg ? { ...o, ...publicUser(reg) } : { ...o, interests: [], brandLinks: [], avatarEmoji: "🐦" };
  });
  res.json(enriched);
});

// Setup custom full-stack dev server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Moonbug] Server running on http://localhost:${PORT}`);
  });
}

startServer();
