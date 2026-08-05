import React, { useState, useEffect } from "react";
import { Calendar, Plus, Filter, Sparkles, Users, AlertCircle, Trash2, Tag, MapPin, CheckCircle } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  category: "astro_event" | "community_activity";
  location?: string;
  createdByUser?: boolean;
}

export default function CalendarDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem("mb_stored_calendar_events");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "evt-1",
        title: "Perseids Meteor Shower Peak watch party",
        date: "2026-08-12",
        description: "The peak of the annual Perseids meteor shower, with up to 100 meteors visible per hour under low moon glare.",
        category: "astro_event",
        location: "Nairobi National Park Stargazing Spot"
      },
      {
        id: "evt-2",
        title: "Total Solar Eclipse alignment sprint",
        date: "2026-08-21",
        description: "A total solar eclipse with path of totality sweeping across key equatorial metrics. Peak duration: 4m 12s.",
        category: "astro_event",
        location: "Equator line crossing observatory"
      },
      {
        id: "evt-3",
        title: "Tribe Stargazing Watch - Kisumu",
        date: "2026-07-25",
        description: "A local community activity to trace the summer triangle constellations. Bring telescopes or camera scopes.",
        category: "community_activity",
        location: "Dunga Hill Camp, Kisumu",
        createdByUser: false
      }
    ];
  });

  const [activeFilter, setActiveFilter] = useState<"all" | "astro_event" | "community_activity">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Event Form State
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"astro_event" | "community_activity">("community_activity");
  const [location, setLocation] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    localStorage.setItem("mb_stored_calendar_events", JSON.stringify(events));
  }, [events]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr.trim() || !description.trim()) {
      alert("Please specify the title, date, and description coordinates.");
      return;
    }

    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title,
      date: dateStr,
      description,
      category,
      location: location.trim() || "Virtual Coordinates",
      createdByUser: true
    };

    setEvents([newEvent, ...events]);
    setTitle("");
    setDateStr("");
    setDescription("");
    setCategory("community_activity");
    setLocation("");
    setShowForm(false);
    alert("✨ Event successfully scheduled in the local astronomical calendar database!");
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  // Sort events chronologically (soonest first)
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Apply filters
  const filteredEvents = sortedEvents.filter(evt => {
    const matchesFilter = activeFilter === "all" || evt.category === activeFilter;
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (evt.location && evt.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-200">
      
      {/* 1. Header Hero Panel */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
              📅 ASTRO & COMMUNITY CHRONOLOGY CALENDAR
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Backend event registry database. Track celestial cycles and user-created watch parties.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Search & Category Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/30 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
          {(["all", "astro_event", "community_activity"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                activeFilter === f
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                  : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f === "all" ? "🌐 SHOW ALL" : f.replace("_", " ")}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search calendar events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-500 font-mono"
        />
      </div>

      {/* 3. Sliding Add Activity Form Drawer */}
      {showForm && (
        <form onSubmit={handleAddEvent} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 animate-fade-in">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
              Schedule Stargazing Event
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-white font-bold"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Activity Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Orion Belt watch and chat"
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Calendar Date</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Category Track</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none font-mono"
              >
                <option value="community_activity">👥 Community Stargazing / Activity</option>
                <option value="astro_event">🌌 Astronomical Event Peak</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Physical or Virtual Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Nairobi Hill Top Sky Club"
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Activity Parameters & Details</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify target constellations, recommended lens parameters, and exact hours."
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs uppercase font-mono font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs uppercase font-mono font-bold"
            >
              Add to Calendar Ledger
            </button>
          </div>
        </form>
      )}

      {/* 4. Timeline Grid */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center border border-slate-800 bg-slate-950/20 rounded-2xl space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto animate-bounce" />
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">No Event Matches</h4>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-sans">
            Adjust your search or filter switches to show default entries in the backend calendar registry.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800 pl-4 space-y-6 ml-2 pt-2">
          {filteredEvents.map(evt => {
            const isAstro = evt.category === "astro_event";
            const dateObj = new Date(evt.date);
            const formattedDate = dateObj.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div key={evt.id} className="relative group">
                {/* Timeline node circle */}
                <span className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 bg-[#05060b] transition-all group-hover:scale-125 ${
                  isAstro ? "border-yellow-400" : "border-blue-400"
                }`}>
                  <span className={`absolute inset-1.5 rounded-full ${
                    isAstro ? "bg-yellow-400 animate-ping" : "bg-blue-400"
                  }`} />
                </span>

                {/* Card Container */}
                <div className="p-4 rounded-2xl border border-slate-850 bg-slate-950/40 hover:border-slate-750 hover:bg-slate-950/80 transition-all space-y-2 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-slate-400 font-bold block">
                        {formattedDate} ({evt.date})
                      </span>
                      <h4 className="text-xs font-bold font-mono text-slate-100 group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                        {evt.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isAstro ? "text-yellow-400 border-yellow-900/30 bg-yellow-950/10" : "text-blue-400 border-blue-900/30 bg-blue-950/10"
                      }`}>
                        {isAstro ? "Astro Transit" : "Community"}
                      </span>

                      {evt.createdByUser && (
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete scheduled activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11.5px] text-slate-400 leading-relaxed font-sans font-medium">
                    {evt.description}
                  </p>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-2 border-t border-slate-900/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-600" />
                      <span>{evt.location}</span>
                    </span>

                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      <span>Active Registration Stream</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
