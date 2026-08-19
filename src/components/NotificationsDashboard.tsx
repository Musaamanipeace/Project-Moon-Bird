import React from "react";
import { Bell, Calendar, Trophy, Users, PlayCircle } from "lucide-react";
import type { AstroEvent, Challenge } from "../types";

interface NotificationsDashboardProps {
  events: AstroEvent[];
  challenges: Challenge[];
  nickname: string;
}

export default function NotificationsDashboard({
  events,
  challenges,
  nickname,
}: NotificationsDashboardProps) {
  const displayName = nickname || "explorer";

  const notifications: { category: string; message: string; icon?: React.ReactNode }[] = [
    {
      category: "System",
      message: `Welcome to Project-moonrise, ${displayName}. Complete challenges to earn Cheese.`,
      icon: <Bell className="w-3.5 h-3.5" />,
    },
    ...events.slice(0, 3).map((ev) => ({
      category: "Event",
      message: `Event approaching: ${ev.title} on ${ev.date}.`,
      icon: <Calendar className="w-3.5 h-3.5" />,
    })),
    ...challenges.slice(0, 3).map((ch) => ({
      category: "Challenge",
      message: `Challenge ready: ${ch.title} (+${ch.rewardXp} XP).`,
      icon: <Trophy className="w-3.5 h-3.5" />,
    })),
    {
      category: "Community",
      message: "Find Someone Like Me helps you match with peers.",
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      category: "Community",
      message: "Watch nature-conscious ads to earn Cheese.",
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-bold font-mono text-turquoise uppercase tracking-wider mb-4 flex items-center gap-1.5">
        🔔 Notifications
      </h2>
      <div className="space-y-2">
        {notifications.map((n, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-1.5 mb-1">
              {n.icon}
              <span className="text-[9px] font-mono uppercase text-turquoise-dim">{n.category}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
