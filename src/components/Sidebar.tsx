import React from "react";
import { User, BookOpen, Bell, Tv, Users, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const ITEMS = [
  { id: "profile", label: "Portfolio", icon: User, hint: "Your cosmic identity & work" },
  { id: "catalogues", label: "Catalogues", icon: BookOpen, hint: "Events, brands, books, ads" },
  { id: "notes", label: "Reminders & Alarms", icon: Bell, hint: "Deadlines & recurring alarms" },
  { id: "advertiser", label: "Watch Ads", icon: Tv, hint: "Earn XP from sponsored feeds" },
  { id: "meet", label: "Meet People Like Me", icon: Users, hint: "Find stargazers with shared interests" },
] as const;

export default function Sidebar({ activeView, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-slate-800/80 bg-[#0a0b12]/90 backdrop-blur-md transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-800/80">
        {!collapsed && (
          <span className="text-[10px] font-mono text-turquoise uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Moonbug HUD
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-turquoise hover:bg-slate-800/60 transition-all"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = activeView === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              title={it.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? "bg-turquoise-500/10 border border-turquoise-500/30 text-turquoise"
                  : "border border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block text-xs font-mono font-bold leading-tight">{it.label}</span>
                  <span className="block text-[9px] text-slate-500 truncate">{it.hint}</span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 text-[9px] font-mono text-slate-600">
          Global quick access · v2.0
        </div>
      )}
    </aside>
  );
}
