import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Heart,
  HelpCircle,
  Brain,
  Edit3,
  Trash2,
  Lock,
  Tag,
  Share2,
  CheckCircle2,
  Copy,
  Clock,
} from "lucide-react";
import type { JournalEntry, MoodType } from "../types.ts";
import { requestJournalReflection, requestMemoryExtraction } from "../lib/api.ts";
import { saveJournalEntry, saveUserMemory } from "../lib/firestoreService.ts";

interface EntryDetailViewProps {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entryId: string) => void;
  onUpdateEntry: (updated: JournalEntry) => void;
  onOpenCompanion: (draftText: string) => void;
}

const MOOD_META: Record<MoodType, { label: string; icon: string; text: string }> = {
  peaceful: { label: "Peaceful", icon: "🌿", text: "text-emerald-400" },
  grateful: { label: "Grateful", icon: "🙏", text: "text-teal-400" },
  energized: { label: "Energized", icon: "⚡", text: "text-amber-400" },
  reflective: { label: "Reflective", icon: "🌙", text: "text-indigo-400" },
  anxious: { label: "Anxious", icon: "🌧️", text: "text-sky-400" },
  melancholy: { label: "Melancholy", icon: "🍂", text: "text-blue-400" },
  frustrated: { label: "Frustrated", icon: "🔥", text: "text-rose-400" },
  neutral: { label: "Steady", icon: "⚖️", text: "text-slate-400" },
};

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({
  entry,
  onBack,
  onEdit,
  onDelete,
  onUpdateEntry,
  onOpenCompanion,
}) => {
  const [reflecting, setReflecting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const moodInfo = MOOD_META[entry.mood] || { label: "Reflective", icon: "📝", text: "text-slate-300" };
  const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleTriggerReflection = async () => {
    setReflecting(true);
    try {
      const reflection = await requestJournalReflection(entry.content, entry.title, entry.mood);
      const updated: JournalEntry = {
        ...entry,
        reflection,
        sentimentScore: reflection.sentimentScore,
        updatedAt: new Date().toISOString(),
      };
      await saveJournalEntry(entry.userId, updated);
      onUpdateEntry(updated);
      setNotification("Gemini reflection generated and saved to Firestore.");
    } catch (err: any) {
      alert(err.message || "Failed to generate reflection.");
    } finally {
      setReflecting(false);
    }
  };

  const handleExtractMemories = async () => {
    setExtracting(true);
    try {
      const list = await requestMemoryExtraction(entry.content, entry.title, entry.id);
      if (list.length > 0) {
        for (const m of list) {
          await saveUserMemory(entry.userId, {
            ...m,
            id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            userId: entry.userId,
          });
        }
        setNotification(`Extracted and stored ${list.length} core realizations in Memory Vault!`);
      } else {
        setNotification("No additional core memories detected in this entry.");
      }
    } catch (err: any) {
      alert(err.message || "Memory extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  const handleCopyMarkdown = () => {
    const md = `# ${entry.title}\n*Date: ${dateStr} (${entry.mood})*\n\n${entry.content}\n\n---\n${
      entry.reflection ? `## AI Reflection\n${entry.reflection.summary}\n\n**Emotional Tone:** ${entry.reflection.emotionalTone}\n` : ""
    }`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Entries</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy as MD"}</span>
          </button>

          <button
            onClick={() => onEdit(entry)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm("Permanently delete this entry from your Firestore partition?")) {
                onDelete(entry.id);
                onBack();
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Journal Entry View Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Title & Metadata */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold ${moodInfo.text}`}>
              <span>{moodInfo.icon}</span>
              <span>{moodInfo.label}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 text-xs font-mono">
              <Lock className="w-3 h-3 text-teal-400" />
              Isolated: users/{entry.userId.substring(0, 6)}...
            </span>

            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              {entry.wordCount} words
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 leading-tight">
            {entry.title}
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{dateStr} at {timeStr}</span>
          </div>
        </div>

        {/* Entry Narrative Content */}
        <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
          {entry.content}
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-800">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            {entry.tags.map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 text-xs font-medium border border-slate-700">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* AI Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              id="btn-detail-reflection"
              onClick={handleTriggerReflection}
              disabled={reflecting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${reflecting ? "animate-spin" : ""}`} />
              <span>{entry.reflection ? "Re-Analyze Reflection" : "Generate Gemini Reflection"}</span>
            </button>

            <button
              id="btn-detail-extract-memories"
              onClick={handleExtractMemories}
              disabled={extracting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
            >
              <Brain className={`w-3.5 h-3.5 text-teal-400 ${extracting ? "animate-pulse" : ""}`} />
              <span>Extract to Memory Vault</span>
            </button>
          </div>

          <button
            onClick={() => onOpenCompanion(entry.content)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chat with Reflection Guide about this</span>
          </button>
        </div>
      </div>

      {/* Gemini AI Reflection Detail Box */}
      {entry.reflection ? (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Empathetic AI Reflection</h3>
                <p className="text-xs text-teal-400 font-mono">
                  Emotional Tone: {entry.reflection.emotionalTone}
                </p>
              </div>
            </div>

            {entry.reflection.sentimentScore !== undefined && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Sentiment</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    entry.reflection.sentimentScore > 0.2
                      ? "text-emerald-400"
                      : entry.reflection.sentimentScore < -0.2
                      ? "text-rose-400"
                      : "text-amber-400"
                  }`}
                >
                  {entry.reflection.sentimentScore > 0 ? "+" : ""}
                  {(entry.reflection.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <span className="text-teal-400 font-semibold block mb-1">Synthesized Essence:</span>
            {entry.reflection.summary}
          </div>

          {/* Key takeaways */}
          {entry.reflection.keyTakeaways && entry.reflection.keyTakeaways.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Key Realizations & Cognitive Vectors
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {entry.reflection.keyTakeaways.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-200">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth inquiry & Mindfulness reframe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs space-y-1.5">
              <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Deeper Inquiry Question
              </span>
              <p className="text-slate-200 italic leading-relaxed">{entry.reflection.growthPrompt}</p>
            </div>

            <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/20 text-xs space-y-1.5">
              <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-teal-400" />
                Mindfulness & Cognitive Reframe
              </span>
              <p className="text-slate-200 leading-relaxed">{entry.reflection.mindfulnessAdvice}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-teal-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-semibold text-slate-200">No AI Reflection Generated Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click "Generate Gemini Reflection" above to receive empathetic emotional tone analysis, key takeaways, and mindful reframing from server-side Gemini.
          </p>
        </div>
      )}
    </div>
  );
};
