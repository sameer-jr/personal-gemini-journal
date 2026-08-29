import React, { useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  Sparkles,
  Tag,
  Clock,
  Trash2,
  Edit3,
  ChevronRight,
  ShieldCheck,
  PlusCircle,
  FileText,
} from "lucide-react";
import type { JournalEntry, MoodType } from "../types.ts";

interface JournalListProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

const MOOD_EMOJIS: Record<MoodType, string> = {
  peaceful: "🌿",
  grateful: "🙏",
  energized: "⚡",
  reflective: "🌙",
  anxious: "🌧️",
  melancholy: "🍂",
  frustrated: "🔥",
  neutral: "⚖️",
};

export const JournalList: React.FC<JournalListProps> = ({
  entries,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");

  const filtered = entries.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMood = selectedMoodFilter === "all" || e.mood === selectedMoodFilter;
    return matchesSearch && matchesMood;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <span>Journal Timeline</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Your private, Firestore-isolated personal reflections in reverse-chronological order.
          </p>
        </div>

        <button
          id="btn-new-entry-from-list"
          onClick={onNewEntry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Write New Entry</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-entries"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords, reflections, or #tags..."
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Mood dropdown filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="select-mood-filter"
            value={selectedMoodFilter}
            onChange={(e) => setSelectedMoodFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Moods</option>
            <option value="peaceful">🌿 Peaceful</option>
            <option value="grateful">🙏 Grateful</option>
            <option value="energized">⚡ Energized</option>
            <option value="reflective">🌙 Reflective</option>
            <option value="anxious">🌧️ Anxious</option>
            <option value="melancholy">🍂 Melancholy</option>
            <option value="frustrated">🔥 Frustrated</option>
            <option value="neutral">⚖️ Steady</option>
          </select>
        </div>
      </div>

      {/* Entry Cards List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No Journal Entries Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedMoodFilter !== "all"
              ? "Try adjusting your search query or mood filter to find entries."
              : "You haven't written any entries yet. Begin your mindful journey today."}
          </p>
          <button
            onClick={onNewEntry}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Write First Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((entry) => {
            const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md hover:shadow-xl relative flex flex-col justify-between gap-3"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl p-1.5 rounded-xl bg-slate-800 border border-slate-700/60 leading-none">
                      {MOOD_EMOJIS[entry.mood] || "📝"}
                    </span>
                    <div>
                      <h3
                        onClick={() => onSelectEntry(entry)}
                        className="text-base font-bold text-slate-100 group-hover:text-teal-300 transition-colors cursor-pointer"
                      >
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {dateStr} · {timeStr}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{entry.mood}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-1.5">
                    {entry.reflection && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-medium font-mono">
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        AI Reflected
                      </span>
                    )}

                    <button
                      onClick={() => onEditEntry(entry)}
                      title="Edit Entry"
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this private entry?")) {
                          onDeleteEntry(entry.id);
                        }
                      }}
                      title="Delete Entry"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Excerpt */}
                <p
                  onClick={() => onSelectEntry(entry)}
                  className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed cursor-pointer"
                >
                  {entry.content}
                </p>

                {/* Reflection Snapshot if available */}
                {entry.reflection && (
                  <div
                    onClick={() => onSelectEntry(entry)}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1 cursor-pointer hover:border-teal-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-teal-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Tone: {entry.reflection.emotionalTone}
                      </span>
                      {entry.reflection.sentimentScore !== undefined && (
                        <span className="font-mono text-slate-400">
                          Score: {(entry.reflection.sentimentScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-slate-300">{entry.reflection.summary}</p>
                  </div>
                )}

                {/* Footer tags & read more */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {entry.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => onSelectEntry(entry)}
                    className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
                  >
                    <span>Read Full Reflection</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
