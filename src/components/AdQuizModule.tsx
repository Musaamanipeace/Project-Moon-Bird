import React, { useState, useEffect } from "react";
import { Sparkles, ArrowUpRight, HelpCircle, CheckCircle, Share2, Award, Bot } from "lucide-react";

interface Question {
  q: string;
  options: string[];
  answer: number;
}

interface SponsorAd {
  id: string;
  title: string;
  desc: string;
  sponsor: string;
  questions: Question[];
  payout: number;
}

const SPONSOR_ADS: SponsorAd[] = [
  {
    id: "ad-ksp",
    title: "🚀 Orbital Physics Simulator (KSP)",
    desc: "Simulate lunar capture orbits, launch Hohmann transits, and learn Newtonian orbital mechanics with 100% realistic simulations.",
    sponsor: "Open-Source Space Academy",
    questions: [
      {
        q: "What maneuver type transitions a spacecraft from a lower circular orbit to a higher circular orbit?",
        options: ["Hohmann Transfer", "Lagrange Drift", "Keplerian Spin"],
        answer: 0
      },
      {
        q: "Where is a spacecraft moving fastest in an elliptical orbit?",
        options: ["Apocenter", "Pericenter (Closest point)", "Equilateral Midpoint"],
        answer: 1
      }
    ],
    payout: 35
  },
  {
    id: "ad-rust",
    title: "🦀 Rust Embedded Systems Meetup",
    desc: "Build highly concurrent, memory-safe lunar sensor tracking firmware in bare-metal Rust. No garbage collector, zero-cost abstractions.",
    sponsor: "Embedded Rust Foundation",
    questions: [
      {
        q: "Which keyword/type is used in Rust to guarantee thread-safe reference counting?",
        options: ["unsafe", "Arc", "mutex_lock"],
        answer: 1
      },
      {
        q: "Does Rust use a garbage collector to manage memory?",
        options: ["Yes, a real-time mark-sweep GC", "No, compile-time borrow-checker mechanics", "Only in async threads"],
        answer: 1
      }
    ],
    payout: 40
  }
];

interface AdQuizModuleProps {
  xp: number;
  onAddXp: (amount: number) => void;
}

export default function AdQuizModule({ xp, onAddXp }: AdQuizModuleProps) {
  const [activeAd, setActiveAd] = useState<SponsorAd | null>(null);
  const [watchCountdown, setWatchCountdown] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizStep, setQuizStep] = useState<"watching" | "quiz" | "comment" | "done" | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [completedAds, setCompletedAds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("mb_completed_ads");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (watchCountdown > 0) {
      interval = setInterval(() => {
        setWatchCountdown(prev => {
          if (prev <= 1) {
            setQuizStep("quiz");
            setCurrentQuestionIdx(0);
            setQuizAnswers([]);
            setErrorMsg("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [watchCountdown]);

  const handleStartEngagement = (ad: SponsorAd) => {
    setActiveAd(ad);
    setQuizStep("watching");
    setWatchCountdown(5);
    setUserComment("");
    setErrorMsg("");
  };

  const handleSelectOption = (optIdx: number) => {
    if (!activeAd) return;
    const isCorrect = optIdx === activeAd.questions[currentQuestionIdx].answer;
    
    if (!isCorrect) {
      setErrorMsg("❌ Incorrect understanding! Review the sponsor's technical pitch and try again.");
      return;
    }

    setErrorMsg("");
    const newAnswers = [...quizAnswers, optIdx];
    setQuizAnswers(newAnswers);

    if (currentQuestionIdx + 1 < activeAd.questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      // Completed all questions! Transition to public comment stage
      setQuizStep("comment");
    }
  };

  const handleSaveComment = () => {
    if (!activeAd) return;
    if (userComment.trim().length < 5) {
      setErrorMsg("Please leave a high-quality, authentic comment (at least 5 characters) to log verification.");
      return;
    }

    // Reward XP!
    onAddXp(activeAd.payout);
    const updated = [...completedAds, activeAd.id];
    setCompletedAds(updated);
    localStorage.setItem("mb_completed_ads", JSON.stringify(updated));

    // Save voluntary comment to simulation ledger
    const savedComments = JSON.parse(localStorage.getItem("mb_ad_comments") || "[]");
    savedComments.push({
      adId: activeAd.id,
      sponsor: activeAd.sponsor,
      comment: userComment,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem("mb_ad_comments", JSON.stringify(savedComments));

    setQuizStep("done");
    setErrorMsg("");
  };

  const handleShareToSocials = () => {
    if (!activeAd) return;
    const referralLink = `https://moonbug.app/track/challenge-ad-${activeAd.id}?ref=${localStorage.getItem("mb_profile_id") || "anonymous"}`;
    alert(`🔗 Trackable Social Link Generated!\n\n${referralLink}\n\nAnyone clicking this will see ad info, and your profile gets direct XP referrals!`);
  };

  return (
    <section className="bg-[#0b0c15] border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
        <div>
          <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest flex items-center gap-2">
            📢 ADVERTISER ECONOMIC LOOP (Bypass Google Ads)
          </h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Sponsors fund escrow directly to compensate successful, voluntary human watchers.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-mono text-slate-400">
          Decentralized Ads
        </span>
      </div>

      {!activeAd ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPONSOR_ADS.map((ad) => {
            const isDone = completedAds.includes(ad.id);
            return (
              <div
                key={ad.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDone 
                    ? "border-emerald-500/20 bg-emerald-950/5 opacity-80" 
                    : "border-slate-800/80 bg-slate-950/30 hover:border-yellow-500/25"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">{ad.sponsor}</span>
                  <span className="text-[9px] font-mono font-bold text-yellow-400">
                    +{ad.payout} XP Reward
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-1">{ad.title}</h4>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed mt-1.5">{ad.desc}</p>
                
                <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex justify-between items-center">
                  {isDone ? (
                    <span className="text-[9.5px] font-mono text-emerald-400 flex items-center gap-1">
                      ✓ Engagement Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleStartEngagement(ad)}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-bold text-[9.5px] uppercase transition-colors"
                    >
                      Voluntary Engage & Earn &rarr;
                    </button>
                  )}
                  <span className="text-[8px] font-mono text-slate-500 uppercase">Quiz Verified</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-yellow-500/25 bg-slate-950/60 space-y-4">
          {/* Active Engagement Sub-panel */}
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <div>
              <span className="text-[8.5px] font-mono text-slate-500 uppercase">Sponsor Briefing</span>
              <h4 className="text-xs font-bold text-slate-200">{activeAd.title}</h4>
            </div>
            <button
              onClick={() => {
                setActiveAd(null);
                setQuizStep(null);
              }}
              className="text-slate-400 hover:text-white font-mono text-xs"
            >
              Cancel Engagement &times;
            </button>
          </div>

          {quizStep === "watching" && (
            <div className="text-center py-6 space-y-3">
              <span className="text-4xl animate-spin block">⏳</span>
              <span className="text-xs font-mono text-slate-200 block">
                Reading Briefing Document: {watchCountdown} seconds remaining...
              </span>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Moonbug guarantees human validation. Escrow requires voluntary engagement, preventing programmatic bot-abuse or forced pop-ups.
              </p>
            </div>
          )}

          {quizStep === "quiz" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                <span>Verification Quiz</span>
                <span>Question {currentQuestionIdx + 1} of {activeAd.questions.length}</span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                {activeAd.questions[currentQuestionIdx].q}
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {activeAd.questions[currentQuestionIdx].options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(oIdx)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-[10.5px] text-slate-300 hover:border-yellow-500/40 hover:bg-slate-950 transition-colors focus:outline-none font-sans"
                  >
                    {oIdx + 1}. {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quizStep === "comment" && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span className="text-xs font-bold text-slate-200">Quiz successfully passed!</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                Please leave a short comment detailing your honest thoughts or interest. This comment is recorded publicly on the anonymous ad loop block ledger.
              </p>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="e.g. This seems like a great meetup, I want to write bare-metal Rust on lunar sensors."
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:border-yellow-500/50 min-h-[60px]"
              />
              <button
                onClick={handleSaveComment}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-bold text-xs uppercase"
              >
                Log Comment & Claim {activeAd.payout} XP
              </button>
            </div>
          )}

          {quizStep === "done" && (
            <div className="text-center py-6 space-y-3">
              <span className="text-4xl block">✨</span>
              <h4 className="text-xs font-bold text-emerald-400">Escrow Payout Disbursed!</h4>
              <span className="text-[10.5px] text-slate-300 font-mono block">
                Logged successfully. You earned <span className="font-bold text-yellow-400">+{activeAd.payout} XP</span>!
              </span>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleShareToSocials}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 uppercase"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Social Referral Loop</span>
                </button>
                <button
                  onClick={() => {
                    setActiveAd(null);
                    setQuizStep(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-mono font-bold uppercase"
                >
                  Back to Ads Directory
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-[10px] font-mono text-red-400 animate-pulse bg-red-950/20 p-2.5 rounded-lg border border-red-900/30">
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
