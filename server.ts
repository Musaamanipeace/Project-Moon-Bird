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

// Seed mock Challenges
const challenges: Challenge[] = [
  {
    id: "ch-stargaze",
    title: "Stargazing Sketchbook",
    category: "Astronomy",
    level: "Level One",
    description: "Go outside tonight, find a comfortable spot with low light pollution, sketch the Moon's shape, and log its estimated age.",
    rewardXp: 50,
    steps: [{ stepNumber: 1, title: "Sketch Moon Phase", description: "Draw or photograph current moon phase and log atmospheric clarity." }],
    surveyQuestions: [{ id: "sq1", prompt: "How clear was the sky (1-5)?", type: "scale" }],
    bonusTasks: [{ id: "bt1", title: "Upload Photo", description: "Upload sketchbook photo to personal gallery.", xpReward: 15 }],
    completionRequirement: "Log note in journal detailing atmospheric clarity.",
    comments: [],
    completedBy: []
  },
  {
    id: "ch-cycle",
    title: "Three-Day Moon Sync",
    category: "Mindfulness",
    level: "Level Two",
    description: "Maintain a consecutive 3-day journaling ritual detailing your sleep cycles and emotional focus under the current phase.",
    rewardXp: 100,
    steps: [{ stepNumber: 1, title: "3-Day Journal Log", description: "Log three daily journal entries sequentially during the same Moon cycle." }],
    surveyQuestions: [{ id: "sq1", prompt: "Did sleep quality improve?", type: "yesno" }],
    bonusTasks: [{ id: "bt1", title: "Track Streak", description: "Maintain a 3-day active streak.", xpReward: 25 }],
    completionRequirement: "Log three daily sequential journal entries.",
    comments: [],
    completedBy: []
  },
  {
    id: "ch-spotter",
    title: "ISS Transit Alignment",
    category: "Astronomy",
    level: "Level Two",
    description: "Attempt to observe or photograph the International Space Station or another satellite passing across the night sky.",
    rewardXp: 80,
    steps: [{ stepNumber: 1, title: "Spot Satellite", description: "Log an entry describing your satellite spotting attempt." }],
    surveyQuestions: [{ id: "sq1", prompt: "Did you spot the transit?", type: "yesno" }],
    bonusTasks: [{ id: "bt1", title: "Tag Entry", description: "Tag entry with #high-contrast.", xpReward: 20 }],
    completionRequirement: "Log satellite spotting attempt in journal.",
    comments: [],
    completedBy: []
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

  if (nickname && !challenge.completedBy.includes(nickname)) {
    challenge.completedBy.push(nickname);
    broadcastSSE("challenge_completed", { challengeId: id, nickname, rewardXp: challenge.rewardXp });
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
