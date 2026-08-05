import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Bot, Users, Send, Sparkles, Compass, UserCheck, Volume2, AlertTriangle, ShieldCheck, Heart, ArrowUpRight, HelpCircle } from "lucide-react";
import { ChatMessage, OnlineUser } from "../types";

interface ChatDashboardProps {
  nickname: string;
  xp: number;
  onAddXp: (amount: number) => void;
  onDeductXp: (amount: number) => void;
}

export default function ChatDashboard({ nickname, xp, onAddXp, onDeductXp }: ChatDashboardProps) {
  const [chatTab, setChatTab] = useState<"ai" | "tribe">("ai");

  // Chat message arrays
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([]);
  const [tribeHistory, setTribeHistory] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Input states
  const [aiInput, setAiInput] = useState("");
  const [tribeInput, setTribeInput] = useState("");

  const [isAiTyping, setIsAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // AI Message Cap state (5 daily limit)
  const [aiMessagesCount, setAiMessagesCount] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // Survey State
  const [surveyVoted, setSurveyVoted] = useState<boolean>(false);
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null);
  const [surveyComment, setSurveyComment] = useState("");

  // Custom Hover Metrics State
  const [hoveredMetrics, setHoveredMetrics] = useState<string | null>(null);

  // Predefined Safe AI Comment presets (Free to send without XP penalty)
  const safeComments = [
    "✨ Clear skies tonight! Tracking alignment.",
    "🥬 Completed processed sugar challenge today!",
    "🌒 Looking up at the beautiful Crescent Moon!",
    "🛠️ Just calibrated my Celestial Clock metrics.",
    "🚀 Anonymous peer node synchronizing live."
  ];

  // Mock Active Online Members for horizontal scroll discovery
  const mockOnlinePeers = [
    { id: "moonbug_48", xp: 1200, avatar: "🟢", link: "#/portfolio/48" },
    { id: "moonbug_1.4k", xp: 4890, avatar: "🔵", link: "#/portfolio/1.4k" },
    { id: "moonbug_950", xp: 850, avatar: "🟣", link: "#/portfolio/950" },
    { id: "moonbug_12.5k", xp: 15400, avatar: "🟡", link: "#/portfolio/12.5k" },
    { id: "moonbug_7", xp: 320, avatar: "🔴", link: "#/portfolio/7" }
  ];

  useEffect(() => {
    // Load AI messages count
    const savedCount = localStorage.getItem("mb_ai_messages_count");
    if (savedCount) {
      setAiMessagesCount(parseInt(savedCount));
    }
    const savedPremium = localStorage.getItem("mb_premium_sponsor");
    if (savedPremium) {
      setIsPremium(savedPremium === "true");
    }

    // 1. Fetch initial state for online users & tribe chat log
    fetch("/api/online-users")
      .then(res => res.json())
      .then(data => setOnlineUsers(data))
      .catch(err => console.error("Error fetching online users:", err));

    fetch("/api/chat/messages/tribe")
      .then(res => res.json())
      .then(data => setTribeHistory(data))
      .catch(err => console.error("Error fetching tribe messages:", err));

    // Fetch AI messages history from backend for nickname
    if (nickname) {
      fetch(`/api/chat/messages/companion/${nickname}`)
        .then(res => res.json())
        .then(data => {
          if (data.length === 0) {
            // Seed a proactive welcoming dialogue checking streaks and routine focus
            setAiHistory([
              {
                id: "ai-proactive-welcome",
                sender: "AI",
                senderName: "Moonbug Bot",
                text: `Greetings, ${nickname}! I'm checking in on your active habits and lunar study metrics. I noticed you're on a solid 5-day stargazing streak! 

How are you handling your processed sugar elimination challenge today? Let's formulate your focus roadmap for the current lunar phase.`,
                timestamp: new Date().toISOString()
              }
            ]);
          } else {
            setAiHistory(data);
          }
        })
        .catch(err => console.error(err));
    }

    // 2. Open Real-Time Server-Sent Events (SSE) Stream
    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (type === "tribe_message") {
          setTribeHistory(prev => [...prev, data]);
        } else if (type === "users_list") {
          setOnlineUsers(data);
        }
      } catch (err) {
        console.error("Error parsing SSE payload:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [nickname]);

  // Scroll chat window to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiHistory, tribeHistory, isAiTyping]);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return;

    // Check message usage limit cap (5) for free tier
    if (aiMessagesCount >= 5 && !isPremium) {
      alert("⚠️ Daily computing token limit reached (5/5). Please make a small donation to reset your query tokens!");
      return;
    }

    const text = aiInput.trim();
    setAiInput("");

    // Increment message usage
    const newCount = aiMessagesCount + 1;
    setAiMessagesCount(newCount);
    localStorage.setItem("mb_ai_messages_count", newCount.toString());

    // Optimistically update frontend user message
    const tempUserMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: nickname,
      senderName: nickname,
      text,
      timestamp: new Date().toISOString()
    };
    setAiHistory(prev => [...prev, tempUserMsg]);
    setIsAiTyping(true);

    try {
      // Fetch snapshot context to support memory continuity
      const savedJournals = localStorage.getItem("mb_journals");
      const notesSnapshot = savedJournals ? JSON.parse(savedJournals).slice(0, 2).map((j: any) => j.content).join("\n") : "";

      const response = await fetch("/api/chat/messages/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          text,
          appMetrics: { xp },
          notesSnapshot
        })
      });

      const data = await response.json();
      if (data.success && data.messages) {
        setAiHistory(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, ...data.messages];
        });
        onAddXp(10);
      }
    } catch (err) {
      console.error("AI Companion error:", err);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendTribeMessage = async (customText?: string) => {
    const textToSend = (customText || tribeInput).trim();
    if (!textToSend) return;

    if (!customText) {
      // Custom text: charge 5 XP Anti-Spam Gate
      if (xp < 5) {
        alert("⚠️ Sending custom community messages requires exactly 5 XP. Use the free safe presets below!");
        return;
      }
      onDeductXp(5);
      setTribeInput("");
    }

    try {
      await fetch("/api/chat/messages/tribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          text: textToSend
        })
      });
      onAddXp(2); // Rebate some XP for participating
    } catch (err) {
      console.error("Tribe messaging error:", err);
    }
  };

  const handleResetTokens = () => {
    setIsPremium(true);
    setAiMessagesCount(0);
    localStorage.setItem("mb_premium_sponsor", "true");
    localStorage.setItem("mb_ai_messages_count", "0");
    onAddXp(500); // Massive boost
    alert("💖 Thank you for sponsoring the decentralized web! Computing tokens reset to UNLIMITED. Enjoy +500 XP!");
  };

  const handleVoteSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSurveyOption === null) return;
    setSurveyVoted(true);
    onAddXp(25); // high payout for user feedback
    alert("🗳️ Vote cast securely in the escrow pool! Thank you for participating. You earned +25 XP.");
  };

  const handleSpeakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    } else {
      alert("TTS not supported in this frame.");
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">
      
      {/* Linux Mint Tooltip Metrics Box */}
      <div 
        className="relative bg-slate-950 border border-emerald-500/30 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-help group transition-all"
        onMouseEnter={() => setHoveredMetrics(`Active_Tribe_Nodes: ${onlineUsers.length + 5} | Anti_Spam_Cost: 5 XP | Claude_Token_Limit: 5/Day`)}
        onMouseLeave={() => setHoveredMetrics(null)}
      >
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-yellow-400" />
          <div>
            <span className="text-xs font-mono font-bold text-slate-100 block">💬 Decent_Community_Chat_Gate & AI Companion</span>
            <span className="text-[10px] text-slate-400 font-mono">Anti-spam transaction system live: custom broadcasts cost 5 XP</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">
            Token Queries Today: <span className={aiMessagesCount >= 5 ? "text-red-400 font-bold" : "text-yellow-400"}>{aiMessagesCount}/5</span>
          </span>
          {isPremium ? (
            <span className="px-2.5 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-950/20 text-[9px] font-mono text-emerald-400 uppercase font-bold">
              👑 Sponsor Unlimited
            </span>
          ) : (
            <button
              onClick={handleResetTokens}
              className="px-2.5 py-1 rounded bg-gradient-to-r from-pink-500 to-yellow-500 text-slate-950 text-[9px] font-mono font-extrabold uppercase hover:opacity-90 transition-opacity"
            >
              💖 Sponsor & Reset
            </button>
          )}
        </div>

        {/* Hover metrics tooltip display */}
        {hoveredMetrics && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#070b13] border border-emerald-400/40 rounded-xl p-3 shadow-2xl font-mono text-[10px] text-emerald-400 leading-relaxed transition-all">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1 mb-1.5">
              <span className="font-bold text-slate-100 flex items-center gap-1">📊 CPU CHAT TRANSRECEIVER (v2.1)</span>
              <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/30 text-[8px] rounded">SYNC_STABLE</span>
            </div>
            <span>{hoveredMetrics}</span>
          </div>
        )}
      </div>

      {/* Online Peer Discovery Row */}
      <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-yellow-500" />
          <span>Active Online Nodes (Discovery Panel)</span>
        </h4>
        
        {/* Horizontal Scroll Area */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {mockOnlinePeers.map(peer => (
            <div 
              key={peer.id}
              className="bg-slate-900 border border-slate-800/80 px-3.5 py-2 rounded-xl flex items-center gap-2.5 min-w-[170px] hover:border-slate-700 transition-colors shrink-0"
            >
              <span className="text-sm">{peer.avatar}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-200 block truncate">{peer.id}</span>
                <span className="text-[9px] text-emerald-400 font-mono block">🔥 {peer.xp} XP</span>
              </div>
              <a 
                href={peer.link}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-yellow-400 transition-colors"
                title="View Portfolio Grid"
              >
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Sidebar (Survey + Cap info) + Main Chat Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sidebar */}
        <div className="space-y-4 md:col-span-1">
          {/* Active Survey Module */}
          <div className="bg-slate-950/60 border border-indigo-900/40 p-4 rounded-2xl space-y-3 shadow-lg">
            <h4 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ethical Polling Module</span>
            </h4>

            {!surveyVoted ? (
              <form onSubmit={handleVoteSurvey} className="space-y-2.5">
                <p className="text-[10.5px] font-sans text-slate-300 leading-relaxed font-semibold">
                  How should Moonbug distribute self-hosted advertising escrow pools?
                </p>

                <div className="space-y-1.5">
                  {[
                    "100% direct payouts to quiz passers",
                    "70% direct payouts, 30% community treasury",
                    "Distributed evenly to all active streak keepers"
                  ].map((opt, oIdx) => (
                    <label 
                      key={oIdx}
                      className={`flex items-start gap-1.5 p-2 rounded-lg border text-[9.5px] font-mono cursor-pointer transition-colors ${
                        selectedSurveyOption === oIdx
                          ? "border-yellow-500/50 bg-yellow-500/5 text-yellow-300"
                          : "border-slate-800 bg-slate-900 hover:border-slate-750 text-slate-400"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="survey-opt" 
                        checked={selectedSurveyOption === oIdx}
                        onChange={() => setSelectedSurveyOption(oIdx)}
                        className="hidden" 
                      />
                      <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  placeholder="Optional explanatory log..."
                  className="w-full p-2 h-12 rounded bg-slate-900 border border-slate-800 text-[9.5px] text-slate-200 font-sans focus:outline-none focus:border-indigo-500/55 resize-none"
                />

                <button
                  type="submit"
                  disabled={selectedSurveyOption === null}
                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-mono font-bold uppercase transition-colors"
                >
                  Cast Verified Vote (+25 XP)
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-center py-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  ✔
                </div>
                <p className="text-[10.5px] text-slate-400 font-mono">
                  Your cryptographic vote was submitted securely to the escrow node.
                </p>
                <div className="space-y-1 text-left bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[8.5px] font-mono text-indigo-300">
                  <div>A: 100% direct: 54%</div>
                  <div>B: 70/30 division: 32%</div>
                  <div>C: Streak pools: 14%</div>
                </div>
              </div>
            )}
          </div>

          {/* AI Message limits warning */}
          <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-[10px] font-mono space-y-2">
            <span className="text-yellow-400 font-bold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Query Token Cap</span>
            </span>
            <p className="text-slate-400 leading-relaxed text-[9px]">
              Every server-side generative query to the AI consumes advanced compute tokens. Free accounts receive 5 query tokens daily.
            </p>
            {aiMessagesCount >= 5 && !isPremium && (
              <div className="pt-1.5 border-t border-slate-800 text-center">
                <button
                  onClick={handleResetTokens}
                  className="w-full py-1.5 rounded bg-gradient-to-r from-pink-500 to-yellow-500 text-slate-950 font-extrabold uppercase text-[9px]"
                >
                  Unlock Unlimited with $5 P2P Donation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Workspace */}
        <div className="md:col-span-3 flex flex-col h-[520px] rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
          
          {/* Tabs selector */}
          <div className="flex border-b border-slate-800 p-2 gap-2 bg-slate-950/30 rounded-t-2xl">
            <button
              onClick={() => setChatTab("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold font-mono transition-all duration-300 focus:outline-none ${
                chatTab === "ai"
                  ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
              }`}
            >
              <Bot className="w-4 h-4 text-yellow-500" />
              <span>AI Companion (Streak Helper)</span>
            </button>
            <button
              onClick={() => setChatTab("tribe")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold font-mono transition-all duration-300 focus:outline-none ${
                chatTab === "tribe"
                  ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-yellow-500" />
              <span>Tribe Broadcast (SSE Sync)</span>
            </button>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {chatTab === "ai" ? (
              aiHistory.map((m) => {
                const isAi = m.sender === "AI";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3 border leading-relaxed text-xs shadow-md ${
                      isAi
                        ? "mr-auto rounded-tl-none border-slate-800/80 bg-slate-950/50 text-slate-200"
                        : "ml-auto rounded-tr-none border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-1 mb-1.5 text-[9px] font-mono font-semibold">
                      <span className={isAi ? "text-yellow-400" : "text-slate-400"}>
                        {isAi ? "🤖 Moonbug Companion" : `👤 ${m.senderName}`}
                      </span>
                    </div>
                    <p className="whitespace-pre-line font-sans">{m.text}</p>
                    
                    {isAi && (
                      <div className="flex justify-end mt-1.5 pt-1 border-t border-slate-900">
                        <button
                          onClick={() => handleSpeakText(m.text)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-yellow-400 flex items-center gap-1 text-[8px] font-mono transition-colors"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Narration</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              tribeHistory.map((m) => {
                const isMe = m.sender.toLowerCase() === nickname.toLowerCase();
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3 border leading-relaxed text-xs shadow-md ${
                      !isMe
                        ? "mr-auto rounded-tl-none border-slate-800/85 bg-[#10121e]/50 text-slate-200"
                        : "ml-auto rounded-tr-none border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-1 mb-1.5 text-[9px] font-mono font-semibold">
                      <span className={!isMe ? "text-cyan-400" : "text-yellow-400"}>
                        {m.senderName}
                      </span>
                      <span className="text-[8px] text-slate-500">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-line font-sans">{m.text}</p>
                  </div>
                );
              })
            )}

            {isAiTyping && (
              <div className="flex gap-1.5 items-center mr-auto rounded-2xl rounded-tl-none border border-slate-800/80 bg-slate-950/50 p-3 max-w-[150px]">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                <span className="text-[10px] font-mono text-slate-400 pl-1">Syncing compute...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Preset comments for Anti-Spam Gate */}
          {chatTab === "tribe" && (
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/30">
              <span className="text-[8px] font-mono text-slate-500 block uppercase mb-1">
                🔓 Free Safe Comment Presets (Bypasses the 5 XP Gate):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {safeComments.map((comment, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => handleSendTribeMessage(comment)}
                    className="px-2 py-0.5 rounded border border-slate-800 hover:border-yellow-500/40 bg-slate-950 text-[9px] font-mono text-slate-400 hover:text-yellow-400 transition-colors"
                  >
                    {comment}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-[#0c0d16]/60 rounded-b-2xl">
            {chatTab === "ai" ? (
              <div className="space-y-2">
                {aiMessagesCount >= 5 && !isPremium ? (
                  <div className="text-center py-2 text-xs font-mono text-red-400 font-semibold bg-red-950/10 rounded-xl border border-red-900/30">
                    ⚠️ DAILY CHAT LIMIT REACHED. UNLOCK BELOW TO ACTIVATE DEEP REFLECTIONS.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAiMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Coordinate with AI: Ask about routines, metrics, goals..."
                      className="flex-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 font-mono"
                    />
                    <button
                      type="submit"
                      className="p-2.5 rounded-xl bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-colors focus:outline-none"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTribeMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={tribeInput}
                  onChange={(e) => setTribeInput(e.target.value)}
                  placeholder="Broadcast live custom message (costs exactly 5 XP)..."
                  className="flex-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 font-mono"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-colors focus:outline-none font-mono font-bold text-xs flex items-center gap-1 shrink-0"
                >
                  <span>Broadcast</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
