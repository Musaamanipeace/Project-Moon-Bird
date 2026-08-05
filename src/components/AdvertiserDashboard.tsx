import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  CreditCard, 
  BarChart3, 
  Plus, 
  Eye, 
  Sparkles, 
  ThumbsUp, 
  Share2, 
  MessageSquare, 
  Play, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  TrendingUp, 
  Award, 
  User, 
  Users,
  Tv, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Ad {
  id: string;
  brandName: string;
  creatorName: string;
  category: "sponsored" | "free_user";
  adType: "tv_commercial" | "review" | "banner";
  title: string;
  description: string;
  mediaUrl: string;
  redirectUrl: string;
  budget?: number;
  spent?: number;
  views: number;
  clicks: number;
  likes: number;
  shares: number;
  commentsCount: number;
  comments?: Array<{ author: string; text: string; time: string }>;
  status: "active" | "paused" | "pending_payment";
  rewardAmount: number; // XP reward for watching (0 for free_user ads)
}

interface AdvertiserDashboardProps {
  xp: number;
  onAddXp: (amount: number) => void;
  nickname: string;
}

const DEFAULT_ADS: Ad[] = [
  {
    id: "ad-sponsored-1",
    brandName: "AstroVibe Espresso",
    creatorName: "AstroVibe Corp",
    category: "sponsored",
    adType: "tv_commercial",
    title: "Celestial Grind: 100% Organic Andromeda Coffee Beans",
    description: "Launch your daily morning focus loops with our micro-roasted comet-cultivated coffee beans. High-altitude cosmic espresso shipped instantly with 100% zero-g freshness and zero telemetry tracking.",
    mediaUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/astrovibe",
    budget: 600,
    spent: 125,
    views: 12500,
    clicks: 640,
    likes: 420,
    shares: 115,
    commentsCount: 28,
    comments: [
      { author: "LunaSeeker", text: "Best dark roast in the entire solar system. Keeps me awake during long orbital observation shifts!", time: "2 hours ago" },
      { author: "SolarWind_Dev", text: "Do they deliver directly to the Lagrange point station?", time: "5 hours ago" }
    ],
    status: "active",
    rewardAmount: 25,
  },
  {
    id: "ad-sponsored-2",
    brandName: "Stellar Optics Ltd",
    creatorName: "Stellar Corporate",
    category: "sponsored",
    adType: "tv_commercial",
    title: "Quantum Nebula Telescopes: Unveil the Deep Sky Canvas",
    description: "Professional TV-style commercial showcasing our latest deep-space lenses. View the birthing grounds of distant galaxies in pristine 16K optical resolution. Equipped with active solar-wind magnetic shielding filters.",
    mediaUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/nebula-optics",
    budget: 900,
    spent: 310,
    views: 31000,
    clicks: 1840,
    likes: 912,
    shares: 280,
    commentsCount: 45,
    comments: [
      { author: "NebulaWatcher", text: "Unbelievable fidelity. I could clearly see the active radiation rings around Jupiter last night.", time: "1 day ago" }
    ],
    status: "active",
    rewardAmount: 30,
  },
  {
    id: "ad-sponsored-3",
    brandName: "Cosmic Gravity Bands",
    creatorName: "Orion Fitness Labs",
    category: "sponsored",
    adType: "banner",
    title: "Zero-G Resistance Bands: Maintain Human Bone Density",
    description: "High-contrast display advertisement. Premium muscle resistance bands engineered specifically for long-duration orbital habitats, spacecraft maintenance crew, and active Martian colony explorers.",
    mediaUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/zerog-bands",
    budget: 400,
    spent: 90,
    views: 9000,
    clicks: 412,
    likes: 180,
    shares: 32,
    commentsCount: 9,
    comments: [],
    status: "active",
    rewardAmount: 15,
  },
  {
    id: "ad-free-1",
    brandName: "Orion Matcha Tea",
    creatorName: "@ZenCosmonaut",
    category: "free_user",
    adType: "review",
    title: "Matcha Grown in a Lunar Greenhouse - Upfront Creator Review",
    description: "This is an upfront sponsored post / review by brand representative @ZenCosmonaut. Tasting our very first batch of organic green tea grown entirely under pressurized dome greenhouses on the Moon. Super crisp flavor, clean caffeine kick without any jitters!",
    mediaUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/orion-matcha",
    views: 18400,
    clicks: 812,
    likes: 1205,
    shares: 341,
    commentsCount: 76,
    comments: [
      { author: "GreenT_Lover", text: "Love the transparency! Upfront review advertising is much better than hidden sponsors.", time: "3 hours ago" },
      { author: "MartianFarmer", text: "What soil stimulants are you using to match the light cycle?", time: "6 hours ago" }
    ],
    status: "active",
    rewardAmount: 0,
  },
  {
    id: "ad-free-2",
    brandName: "Space Station Simulator",
    creatorName: "@AstroGamer",
    category: "free_user",
    adType: "review",
    title: "Reviewing modular airlock mechanics: Full-blown Game Ad!",
    description: "I was paid by Quantum Play to make a cool gameplay review representing Space Station Simulator 2026. This game features 100% accurate orbital physics, hull breach repairs, and meteor defenses. Download free and play today!",
    mediaUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/space-sim",
    views: 11900,
    clicks: 650,
    likes: 742,
    shares: 198,
    commentsCount: 52,
    comments: [
      { author: "GamerSimX", text: "The airlock decompression animations look so incredibly realistic.", time: "1 hour ago" }
    ],
    status: "active",
    rewardAmount: 0,
  },
  {
    id: "ad-free-3",
    brandName: "Nebula Threads",
    creatorName: "@NovaFashion",
    category: "free_user",
    adType: "banner",
    title: "Sustainable Cyberpunk flight jackets & spacesuits reveal",
    description: "Our brand representative shows off our thermal-resistant flight suits. Perfect for high-speed atmospheric re-entry or just showing off style at the dome social bars. Handcrafted from recycled launch booster materials.",
    mediaUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop",
    redirectUrl: "https://example.com/nebula-threads",
    views: 4890,
    clicks: 215,
    likes: 310,
    shares: 64,
    commentsCount: 18,
    comments: [],
    status: "active",
    rewardAmount: 0,
  }
];

export default function AdvertiserDashboard({ xp, onAddXp, nickname }: AdvertiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "create" | "analytics">("feed");
  const [ads, setAds] = useState<Ad[]>(() => {
    const saved = localStorage.getItem("moonbug_all_ads");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ADS;
      }
    }
    return DEFAULT_ADS;
  });

  const [totalXpRewarded, setTotalXpRewarded] = useState<number>(() => {
    const saved = localStorage.getItem("moonbug_xp_rewarded_ledger");
    return saved ? Number(saved) : 4850;
  });

  // Watcher ad player overlay state
  const [watchingAd, setWatchingAd] = useState<Ad | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isWatchingCompleted, setIsWatchingCompleted] = useState<boolean>(false);
  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean>(false);

  // Creation State variables
  const [creatorName, setCreatorName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [adCategory, setAdCategory] = useState<"sponsored" | "free_user">("sponsored");
  const [adType, setAdType] = useState<"tv_commercial" | "review" | "banner">("tv_commercial");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("https://");
  const [budget, setBudget] = useState(250);
  const [signupEmail, setSignupEmail] = useState("");

  // Payment Simulation Modal State
  const [checkoutAd, setCheckoutAd] = useState<Ad | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // New Comment State
  const [commentInputs, setCommentInputs] = useState<{ [adId: string]: string }>({});

  // Floating notifications/claim effects
  const [claimToast, setClaimToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  useEffect(() => {
    localStorage.setItem("moonbug_all_ads", JSON.stringify(ads));
  }, [ads]);

  useEffect(() => {
    localStorage.setItem("moonbug_xp_rewarded_ledger", totalXpRewarded.toString());
  }, [totalXpRewarded]);

  // Video playback countdown ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (watchingAd && !isWatchingCompleted) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setCanSkip(true);
            setProgressPercent(100);
            return 0;
          }
          const next = prev - 1;
          setProgressPercent(((5 - next) / 5) * 100);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [watchingAd, isWatchingCompleted]);

  // Launch simulated video watch
  const handleWatchAd = (ad: Ad) => {
    setWatchingAd(ad);
    setSecondsRemaining(5);
    setCanSkip(false);
    setProgressPercent(0);
    setIsWatchingCompleted(false);
    setIsRewardClaimed(false);
    
    // Simulate updating impression instantly
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, views: a.views + 1 } : a));
  };

  // Complete viewing & Claim XP Reward (for sponsored ads)
  const handleClaimReward = () => {
    if (!watchingAd) return;
    
    if (watchingAd.category === "sponsored" && watchingAd.rewardAmount > 0) {
      onAddXp(watchingAd.rewardAmount);
      setTotalXpRewarded(prev => prev + watchingAd.rewardAmount);
      
      // Update spent budget for the sponsored ad
      setAds(prev => prev.map(a => {
        if (a.id === watchingAd.id) {
          const updatedSpent = (a.spent || 0) + 1.25; // Deduct $1.25 budget per simulated rewarded watch
          return {
            ...a,
            spent: updatedSpent >= (a.budget || 100) ? a.budget : updatedSpent,
            clicks: a.clicks + 1,
          };
        }
        return a;
      }));

      setClaimToast({
        show: true,
        text: `✨ Watch Reward Claimed! +${watchingAd.rewardAmount} XP credited to your account.`
      });
      setTimeout(() => setClaimToast({ show: false, text: "" }), 4000);
    }
    
    setIsRewardClaimed(true);
    setWatchingAd(null);
  };

  // Skip ad without claim or simple skip after 5s
  const handleSkipAd = () => {
    if (!watchingAd) return;
    if (watchingAd.category === "sponsored" && !isRewardClaimed) {
      // Prompt user they can claim rewards instead
      handleClaimReward();
    } else {
      setWatchingAd(null);
    }
  };

  // Organic Interaction Mechanics (Like, Share, Comment) which raise traffic dynamically
  const handleLikeAd = (id: string, isSponsored: boolean) => {
    setAds(prev => prev.map(a => {
      if (a.id === id) {
        // Organic ads double or boost traffic with engagement
        const boostFactor = isSponsored ? 25 : 120; // organic gets a higher relative virality boost!
        return { 
          ...a, 
          likes: a.likes + 1,
          views: a.views + boostFactor // engagement raises views!
        };
      }
      return a;
    }));

    // Sparkle alert
    setClaimToast({
      show: true,
      text: isSponsored 
        ? "👍 Ad liked! Boosted brand reputation rating."
        : "🔥 Liked! This User Ad is gaining viral steam, receiving +120 views!"
    });
    setTimeout(() => setClaimToast({ show: false, text: "" }), 3000);
  };

  const handleShareAd = (id: string, isSponsored: boolean) => {
    setAds(prev => prev.map(a => {
      if (a.id === id) {
        const boostFactor = isSponsored ? 80 : 250; // free user ad virality boost is awesome!
        return {
          ...a,
          shares: a.shares + 1,
          views: a.views + boostFactor
        };
      }
      return a;
    }));

    setClaimToast({
      show: true,
      text: isSponsored
        ? "🔗 Shared! Re-broadcasted campaign to orbit network."
        : "🚀 Shared! Organic reach multiplier activated! +250 views added."
    });
    setTimeout(() => setClaimToast({ show: false, text: "" }), 3000);
  };

  const handleAddComment = (e: React.FormEvent, adId: string) => {
    e.preventDefault();
    const text = commentInputs[adId]?.trim();
    if (!text) return;

    setAds(prev => prev.map(a => {
      if (a.id === adId) {
        const newComments = a.comments ? [...a.comments] : [];
        newComments.unshift({
          author: nickname || "CosmicPilot",
          text: text,
          time: "Just now"
        });
        
        // Add huge organic boost
        const boostFactor = a.category === "sponsored" ? 150 : 400;
        return {
          ...a,
          comments: newComments,
          commentsCount: a.commentsCount + 1,
          views: a.views + boostFactor
        };
      }
      return a;
    }));

    setCommentInputs(prev => ({ ...prev, [adId]: "" }));
    setClaimToast({
      show: true,
      text: "💬 Review feedback added! Organic traffic boosted dramatically!"
    });
    setTimeout(() => setClaimToast({ show: false, text: "" }), 3000);
  };

  // Create Campaign Flow
  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !title.trim() || !description.trim()) {
      alert("Please provide the ad title, description, and brand name.");
      return;
    }

    const defaultUrls: { [key: string]: string } = {
      tv_commercial: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=1200&auto=format&fit=crop",
      review: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop",
      banner: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200&auto=format&fit=crop"
    };

    const finalMedia = mediaUrl.trim() || defaultUrls[adType];
    const generatedId = `ad-custom-${Date.now()}`;
    const calculatedReward = adCategory === "sponsored" ? (budget >= 500 ? 30 : budget >= 250 ? 25 : 15) : 0;

    const newAd: Ad = {
      id: generatedId,
      brandName: brandName.trim(),
      creatorName: adCategory === "free_user" ? (creatorName.trim() || `@${nickname || "AstroAdvertiser"}`) : `${brandName.trim()} Corp`,
      category: adCategory,
      adType: adType,
      title: title.trim(),
      description: description.trim(),
      mediaUrl: finalMedia,
      redirectUrl: redirectUrl.trim() || "https://example.com",
      budget: adCategory === "sponsored" ? Number(budget) : undefined,
      spent: adCategory === "sponsored" ? 0 : undefined,
      views: adCategory === "sponsored" ? 0 : 50, // free ads get minor starting impressions
      clicks: 0,
      likes: 0,
      shares: 0,
      commentsCount: 0,
      comments: [],
      status: adCategory === "sponsored" ? "pending_payment" : "active",
      rewardAmount: calculatedReward
    };

    if (adCategory === "sponsored") {
      setCheckoutAd(newAd);
    } else {
      setAds([newAd, ...ads]);
      setBrandName("");
      setCreatorName("");
      setTitle("");
      setDescription("");
      setMediaUrl("");
      setRedirectUrl("https://");
      setActiveTab("feed");
      setClaimToast({
        show: true,
        text: "🚀 Free User Ad published organically! Boost engagement to gain views."
      });
      setTimeout(() => setClaimToast({ show: false, text: "" }), 4000);
    }
  };

  // Payment simulation for sponsored ads
  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      alert("Please fill in the simulated card coordinates.");
      return;
    }

    setPaymentSuccess(true);
    setTimeout(() => {
      if (checkoutAd) {
        const fundedAd: Ad = {
          ...checkoutAd,
          status: "active"
        };
        setAds([fundedAd, ...ads]);
      }
      setPaymentSuccess(false);
      setCheckoutAd(null);
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setBrandName("");
      setTitle("");
      setDescription("");
      setMediaUrl("");
      setRedirectUrl("https://");
      setActiveTab("feed");

      setClaimToast({
        show: true,
        text: "✨ Payment successful! Your Corporate Sponsored Campaign is now live at the top of the feeds."
      });
      setTimeout(() => setClaimToast({ show: false, text: "" }), 4000);
    }, 1600);
  };

  // Toggle active / paused
  const handleToggleAdStatus = (id: string) => {
    setAds(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === "active" ? "paused" : "active";
        return { ...a, status: nextStatus as any };
      }
      return a;
    }));
  };

  const totalImpressions = ads.reduce((acc, a) => acc + a.views, 0);
  const totalClicks = ads.reduce((acc, a) => acc + a.clicks, 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-8 p-4 max-w-6xl mx-auto text-slate-200 pb-24">
      
      {/* HEADER HUD */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-yellow-400 bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-400/20 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Dual-Tier Ad Registry</span>
              </span>
              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 uppercase">
                Privacy-First Network
              </span>
            </div>
            <h2 className="text-2xl font-bold font-mono tracking-tight text-white">Full-Scale Advertisement Ecosystem</h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Experience a realistic micro-ads network. Watch **Company Sponsored Campaigns** to earn guaranteed profile XP funded by advertising budgets, or deploy **User-Made Free Ads** (reviews, video COMMERCIALS, and banners) that gather organic traffic strictly based on reader engagement metrics.
            </p>
          </div>

          {/* User Scorebox */}
          <div className="bg-[#0b0c14] border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner min-w-[200px]">
            <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="font-mono space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block">Watcher Profile</span>
              <span className="text-xs font-bold text-slate-300 block">{nickname || "Cosmic Traveler"}</span>
              <span className="text-xs font-black text-yellow-400 flex items-center gap-1">
                {xp} <span className="text-[10px] text-slate-500 font-bold">XP Level</span>
              </span>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeTab === "feed"
                ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-4 h-4 text-yellow-400" />
            <span>📺 Watcher Feed</span>
          </button>
          
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeTab === "create"
                ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>📢 Campaign Hub</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeTab === "analytics"
                ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>📊 Network Analytics</span>
          </button>
        </div>
      </div>

      {/* VIEW A: WATCHER FEED */}
      {activeTab === "feed" && (
        <div className="space-y-8">
          
          {/* TOP UPPER-HAND FEEDS: COMPANY SPONSORED (Monetized for watchers) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-yellow-400">
                  ⚡ Premium Sponsored Campaigns (Guaranteed XP Payouts)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Skippable after 5 seconds</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ads.filter(a => a.category === "sponsored" && a.status === "active").map(ad => (
                <div 
                  key={ad.id}
                  className="bg-gradient-to-b from-[#161309] to-[#0a0a0c] border border-yellow-500/20 hover:border-yellow-500/40 p-4 rounded-2xl shadow-xl transition-all duration-300 relative group flex flex-col justify-between h-full"
                >
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-yellow-400 text-slate-950 font-black font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 animate-pulse">
                      <Award className="w-2.5 h-2.5" />
                      <span>+{ad.rewardAmount} XP</span>
                    </span>
                  </div>

                  <div>
                    {/* Media frame */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-slate-800 mb-3.5 group-hover:border-yellow-500/10 transition-all">
                      <img 
                        src={ad.mediaUrl} 
                        alt={ad.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-bold bg-slate-900/90 text-yellow-400 px-1.5 py-0.5 rounded uppercase border border-yellow-500/10">
                          {ad.adType === "tv_commercial" ? "📺 TV Commercial" : ad.adType === "review" ? "🎤 Video Review" : "🖼️ Banner"}
                        </span>
                      </div>
                      
                      {/* Play Hover Action Overlay */}
                      <button 
                        onClick={() => handleWatchAd(ad)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <div className="p-3.5 rounded-full bg-yellow-400 text-slate-950 shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-yellow-500 uppercase font-black tracking-wider block">
                        Sponsored • {ad.brandName}
                      </span>
                      <h4 className="text-xs font-bold font-mono text-slate-100 line-clamp-1 leading-snug">
                        {ad.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2 leading-relaxed">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer Interactive Actions */}
                  <div className="mt-4 pt-3.5 border-t border-slate-900 flex flex-col gap-2">
                    <button
                      onClick={() => handleWatchAd(ad)}
                      className="w-full py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black font-mono text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch & Earn +{ad.rewardAmount} XP</span>
                    </button>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 pt-1">
                      <span>👁️ {ad.views.toLocaleString()} views</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleLikeAd(ad.id, true)}
                          className="hover:text-yellow-400 flex items-center gap-1.5 transition-all"
                          title="Like sponsored ad"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{ad.likes}</span>
                        </button>
                        <button 
                          onClick={() => handleShareAd(ad.id, true)}
                          className="hover:text-yellow-400 flex items-center gap-1.5 transition-all"
                          title="Share ad"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>{ad.shares}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOWER GRID: USER-MADE FREE ADS (Engagement driven, non-monetizable) */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-emerald-400">
                  🌱 Creator Upfront Advertisements & Product Reviews (Organic Engagement)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Engagement fuels organic traffic</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ads.filter(a => a.category === "free_user" && a.status === "active").map(ad => (
                <div 
                  key={ad.id}
                  className="bg-[#0b0c13]/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl shadow-lg transition-all duration-300 flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Media preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-slate-800 mb-3.5">
                      <img 
                        src={ad.mediaUrl} 
                        alt={ad.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <span className="text-[8px] font-mono font-bold bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                          {ad.adType === "review" ? "🎤 Upfront Review" : ad.adType === "tv_commercial" ? "📺 TV Commercial" : "🖼️ Banner"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                          {ad.brandName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          by {ad.creatorName}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold font-mono text-slate-200 line-clamp-1 leading-snug">
                        {ad.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2 leading-relaxed">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Engagement Actions Section (This is what stimulates traffic!) */}
                  <div className="mt-4 pt-3.5 border-t border-slate-900 space-y-3.5">
                    {/* Interactive indicators */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-[#06070d] p-2 rounded-xl border border-slate-800/50">
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] text-slate-500 uppercase block">Traffic Impressions</span>
                        <span className="font-bold text-slate-300">{ad.views.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-slate-500 uppercase block">Organic Index</span>
                        <span className="font-bold text-emerald-400">
                          {Math.round(((ad.likes + ad.shares * 2 + ad.commentsCount * 3) / (ad.views || 1)) * 1000) || 5}xp
                        </span>
                      </div>
                    </div>

                    {/* Like/Share quick buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleLikeAd(ad.id, false)}
                        className="py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all text-[10px] font-mono flex items-center justify-center gap-1.5"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />
                        <span>Like (+120 views)</span>
                      </button>
                      <button
                        onClick={() => handleShareAd(ad.id, false)}
                        className="py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all text-[10px] font-mono flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Share (+250 views)</span>
                      </button>
                    </div>

                    {/* Upfront Comment Feedback box */}
                    <form onSubmit={(e) => handleAddComment(e, ad.id)} className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Write upfront review comment..."
                          value={commentInputs[ad.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [ad.id]: e.target.value })}
                          className="flex-1 px-2 py-1 rounded-lg border border-slate-800 bg-[#06070a] text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-mono font-bold"
                        >
                          Send
                        </button>
                      </div>

                      {/* Display limited comments */}
                      {ad.comments && ad.comments.length > 0 && (
                        <div className="space-y-1 max-h-[70px] overflow-y-auto pt-1 bg-[#05060b] p-1.5 rounded border border-slate-900/80">
                          {ad.comments.slice(0, 2).map((comm, idx) => (
                            <div key={idx} className="text-[9px] text-slate-400 leading-snug">
                              <span className="text-[8px] font-mono text-emerald-500 font-bold mr-1">{comm.author}:</span>
                              <span>{comm.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: CAMPAIGN HUB */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLS: CREATION WORKSPACE FORM */}
          <div className="lg:col-span-2 bg-[#0b0c15]/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800/80 pb-4">
              <h3 className="text-md font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Launch Advertiser Campaign</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your media parameters, format, and targeting budget variables below.
              </p>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-5">
              
              {/* Core tier selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Ad Network Tier Selection</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    key="sponsored"
                    type="button"
                    onClick={() => {
                      setAdCategory("sponsored");
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      adCategory === "sponsored"
                        ? "border-yellow-500/50 bg-yellow-500/10"
                        : "border-slate-800 bg-[#0c0d16] hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono text-slate-200">Corporate Sponsored</span>
                      <Sparkles className={`w-4 h-4 ${adCategory === "sponsored" ? "text-yellow-400 animate-pulse" : "text-slate-600"}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Requires funding budget. Watchers get paid profile XP upon completion. Displays at top with upper-hand priority.
                    </p>
                  </button>

                  <button
                    key="free_user"
                    type="button"
                    onClick={() => {
                      setAdCategory("free_user");
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      adCategory === "free_user"
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-800 bg-[#0c0d16] hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono text-slate-200">Free User / Brand Rep</span>
                      <Users className={`w-4 h-4 ${adCategory === "free_user" ? "text-emerald-400" : "text-slate-600"}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      100% Free to publish. Categorized upfront review or showpost. Non-monetizable. Traffic scales on reader engagement indices.
                    </p>
                  </button>
                </div>
              </div>

              {/* Basic Brand Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Advertiser / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. AstroVibe Coffee"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    {adCategory === "sponsored" ? "Contact Email" : "Brand Representative Username"}
                  </label>
                  {adCategory === "sponsored" ? (
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="marketing@astrovibe.com"
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder={`@${nickname || "CosmicPilot"}`}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Ad Format select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Upfront Advertisement Format</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdType("tv_commercial")}
                    className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition-all ${
                      adType === "tv_commercial"
                        ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-300"
                        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Tv className="w-4 h-4" />
                    <span>TV Commercial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdType("review")}
                    className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition-all ${
                      adType === "review"
                        ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-300"
                        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Upfront Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdType("banner")}
                    className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition-all ${
                      adType === "banner"
                        ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-300"
                        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Display Banner</span>
                  </button>
                </div>
              </div>

              {/* Copywriting */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Advertisement Header / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy headline announcing product launch or upfront review highlight..."
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Upfront Promotional Description & Body Copy</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is your product? Be honest, direct, and transparent. If this is a creator review, clarify your sponsorship terms upfront as per regulations."
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Media URL & Redirect destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Media Asset (Unsplash Image / Video URL)</label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="Leave empty for beautiful default space art"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Call to Action Landing URL</label>
                  <input
                    type="url"
                    required
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://astrovibe.com/promo"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Budget Slider */}
              {adCategory === "sponsored" && (
                <div className="p-4 rounded-xl border border-yellow-500/10 bg-yellow-500/5 space-y-2">
                  <div className="flex justify-between items-center font-mono text-xs">
                    <span className="text-slate-400 uppercase tracking-wide font-bold">Campaign Payout Bid Budget</span>
                    <span className="text-yellow-400 font-black">${budget}.00 USD</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-yellow-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>Est. Watcher Impressions: {(budget * 100).toLocaleString()}</span>
                    <span className="text-yellow-400 font-bold">
                      Payout: {budget >= 500 ? "30 XP / watcher" : budget >= 250 ? "25 XP / watcher" : "15 XP / watcher"}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest transition-all ${
                  adCategory === "sponsored"
                    ? "bg-yellow-400 hover:bg-yellow-300 text-slate-950"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
              >
                {adCategory === "sponsored" ? "Proceed to Sandbox Checkout & Verify" : "Publish Free User Ad Immediately"}
              </button>
            </form>
          </div>

          {/* RIGHT 1 COL: RUNNING LEDGER */}
          <div className="space-y-6">
            <div className="bg-[#0b0c15]/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold font-mono text-yellow-500 uppercase tracking-wider">
                📂 Active Registry Ledger
              </h3>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                Review and pause your active, simulated campaigns.
              </p>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {ads.map((ad) => (
                  <div 
                    key={ad.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-300 block font-mono line-clamp-1">{ad.brandName}</span>
                        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded ${
                          ad.category === "sponsored" 
                            ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" 
                            : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        }`}>
                          {ad.category === "sponsored" ? "Sponsored" : "Free User"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                          ad.status === "active" 
                            ? "bg-green-500/10 text-green-400" 
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {ad.status}
                        </span>
                        
                        {ad.status !== "pending_payment" && (
                          <button
                            onClick={() => handleToggleAdStatus(ad.id)}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-[8px] font-mono hover:bg-slate-800"
                          >
                            {ad.status === "active" ? "Pause" : "Resume"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-[#06070a] p-1.5 rounded border border-slate-900 text-center text-[9px] font-mono text-slate-400">
                      <div>
                        <span className="text-[7px] text-slate-600 uppercase block">Views</span>
                        <span>{ad.views.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-slate-600 uppercase block">Likes</span>
                        <span>{ad.likes}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-slate-600 uppercase block">Budget</span>
                        <span className={ad.category === "sponsored" ? "text-emerald-400" : "text-slate-500"}>
                          {ad.category === "sponsored" ? `$${ad.spent}/${ad.budget}` : "Free"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: NETWORK ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b0c15]/80 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Network Traffic</span>
              <span className="text-2xl font-black font-mono text-slate-100 block">
                {totalImpressions.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Simulated total views</span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b0c15]/80 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Clicks</span>
              <span className="text-2xl font-black font-mono text-yellow-400 block">
                {totalClicks.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Direct traffic redirects</span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b0c15]/80 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Average CTR</span>
              <span className="text-2xl font-black font-mono text-blue-400 block">
                {avgCTR}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Click-Through-Rate benchmark</span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b0c15]/80 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">XP Funded to Watchers</span>
              <span className="text-2xl font-black font-mono text-emerald-400 block">
                {totalXpRewarded} <span className="text-xs text-slate-500 font-bold">XP</span>
              </span>
              <span className="text-[9px] text-emerald-500/70 font-mono block">Guaranteed advertiser payouts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Visual trends graph representation */}
            <div className="md:col-span-2 bg-[#0b0c15]/90 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold font-mono text-slate-100 uppercase">Dual-Tier Traffic Trends</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Comparing total impressions over lunar cycles</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Sponsored Ads
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free User Ads
                  </span>
                </div>
              </div>

              {/* Dynamic Simulated graph */}
              <div className="pt-2">
                <div className="h-44 w-full flex items-end gap-2.5 border-b border-slate-800 pb-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 top-1/4 border-t border-slate-900 pointer-events-none" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-slate-900 pointer-events-none" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-slate-900 pointer-events-none" />

                  {/* Graph columns */}
                  {[
                    { label: "Cycle 1", sponsored: 30, free: 45 },
                    { label: "Cycle 2", sponsored: 45, free: 60 },
                    { label: "Cycle 3", sponsored: 65, free: 55 },
                    { label: "Cycle 4", sponsored: 50, free: 75 },
                    { label: "Cycle 5", sponsored: 80, free: 85 },
                    { label: "Cycle 6", sponsored: 95, free: 110 },
                    { label: "Active", sponsored: 115, free: 130 },
                  ].map((cycle, idx) => (
                    <div key={idx} className="flex-1 flex flex-col justify-end h-full items-center gap-1">
                      <div className="w-full flex justify-center gap-1 items-end h-32">
                        {/* Sponsored Column */}
                        <div 
                          className="w-3 rounded-t-sm bg-gradient-to-t from-yellow-600 to-yellow-400 hover:brightness-110 transition-all relative group" 
                          style={{ height: `${(cycle.sponsored / 150) * 100}%` }}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 p-1 rounded font-mono text-[8px] text-yellow-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-20">
                            {cycle.sponsored * 100} views
                          </div>
                        </div>
                        {/* Free User Column */}
                        <div 
                          className="w-3 rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 hover:brightness-110 transition-all relative group" 
                          style={{ height: `${(cycle.free / 150) * 100}%` }}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 p-1 rounded font-mono text-[8px] text-emerald-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-20">
                            {cycle.free * 100} views
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">{cycle.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Virality Engine Explanation block */}
            <div className="bg-[#0b0c15]/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>The Virality Formula</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Unlike traditional networks that lock organic visibility behind payment paywalls, our User-Made Free Ads feed thrives on actual communal interaction indexes.
                </p>
                <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl font-mono text-[10px] text-slate-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>👍 Like click:</span>
                    <span className="text-emerald-400 font-bold">+120 Organic Views</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🔗 Share action:</span>
                    <span className="text-emerald-400 font-bold">+250 Organic Views</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💬 Upfront Comment:</span>
                    <span className="text-emerald-400 font-bold">+400 Organic Views</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-850">
                <span className="text-[9px] text-slate-500 font-mono block">
                  Encourage brand representatives and users to upload content directly!
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AD WATCHER SIMULATOR PLAYER OVERLAY */}
      <AnimatePresence>
        {watchingAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#080910] overflow-hidden shadow-2xl relative"
            >
              
              {/* Cinema Media Screen area */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-slate-900">
                <img 
                  src={watchingAd.mediaUrl} 
                  alt={watchingAd.title} 
                  className="w-full h-full object-cover opacity-85"
                />
                
                {/* Simulated playback visual bar */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-5">
                  
                  {/* Dynamic Playback controls simulation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-white">
                      <span className="bg-slate-900/90 border border-slate-800/80 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        <span>Corporate Sponsor Feed</span>
                      </span>
                      <span>Simulated High-Definition Playback</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Play pause icon */}
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      
                      {/* Progress bar */}
                      <div className="flex-1 bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-slate-950">
                        <div 
                          className="bg-yellow-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 min-w-[25px] text-right">
                        0:0{5 - secondsRemaining}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Skip / Claim controller overlay */}
                <div className="absolute top-4 right-4 z-20">
                  {canSkip ? (
                    <button
                      onClick={handleClaimReward}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black font-mono uppercase tracking-widest rounded-xl shadow-2xl transition-all flex items-center gap-1.5 animate-bounce"
                    >
                      <span>Claim +{watchingAd.rewardAmount} XP Reward</span>
                      <Award className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      <span>Skippable in {secondsRemaining}s...</span>
                    </div>
                  )}
                </div>

                {/* Audio simulation state */}
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-slate-800 text-slate-300 hover:text-white transition-all"
                  title={isAudioMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Informational section */}
              <div className="p-6 space-y-4 bg-[#080910]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                      {watchingAd.brandName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Ad Type: TV commercial format
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-mono text-slate-100">{watchingAd.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{watchingAd.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-xs font-mono">
                  <div className="text-slate-500">
                    Watching awards you guaranteed <span className="text-yellow-400 font-bold">{watchingAd.rewardAmount} XP</span>.
                  </div>
                  <div className="flex gap-2">
                    {canSkip && (
                      <button
                        onClick={handleSkipAd}
                        className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl transition-all"
                      >
                        Skip Ad
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT MODAL DIALOG */}
      <AnimatePresence>
        {checkoutAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.form
              onSubmit={handleSimulatePayment}
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#080911] p-6 shadow-2xl space-y-4 relative"
            >
              <div className="border-b border-slate-850 pb-3">
                <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest block">Simulation Payment Gateway</span>
                <h3 className="text-sm font-bold text-slate-100 font-mono">Sponsored B2B Campaign Invoice</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Brand: {checkoutAd.brandName}</p>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">Initial Bid Budget:</span>
                  <span className="font-bold text-emerald-400 font-mono">${checkoutAd.budget}.00 USD</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Guaranteed impressions:</span>
                  <span>{(Number(checkoutAd.budget || 250) * 100).toLocaleString()} targeted views</span>
                </div>
              </div>

              {/* Sandbox Card Form */}
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">Simulated Card Number</label>
                    <button 
                      type="button"
                      onClick={() => setCardNumber("4242 4242 4242 4242")}
                      className="text-[9px] font-mono text-yellow-400 hover:underline"
                    >
                      Autofill Test Card
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full p-2.5 pl-9 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-700 font-mono focus:outline-none focus:border-yellow-500"
                    />
                    <CreditCard className="w-4 h-4 text-slate-600 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-700 font-mono text-center focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">CVC Code</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      placeholder="***"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-700 font-mono text-center focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-850 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckoutAd(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900 uppercase font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSuccess}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-800 text-slate-950 text-xs uppercase font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  {paymentSuccess ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Verifying Funds...</span>
                    </>
                  ) : (
                    <span>Fund Campaign</span>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING SPARKLE TOAST NOTIFICATION */}
      <AnimatePresence>
        {claimToast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0c0e17] border border-yellow-500/30 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className="p-1 rounded-full bg-yellow-400/20">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-100">{claimToast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
