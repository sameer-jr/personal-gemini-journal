import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Save,
  Tag,
  Smile,
  ShieldCheck,
  Lightbulb,
  Heart,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Feather,
} from "lucide-react";
import type { JournalEntry, MoodType, EntryReflection, UserProfile, JournalPromptSuggestion } from "../types.ts";
import { requestJournalReflection, requestMemoryExtraction, requestSmartPrompts } from "../lib/api.ts";
import { saveJournalEntry, saveUserMemory } from "../lib/firestoreService.ts";

interface JournalEditorProps {
  user: UserProfile;
  initialEntry?: JournalEntry | null;
  onSaved: (entry: JournalEntry) => void;
  onOpenCompanion: (draftText: string) => void;
}

const MOODS: Array<{ type: MoodType; label: string; icon: string; bg: string; text: string; border: string }> = [
  { type: "peaceful", label: "Peaceful", icon: "🌿", bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  { type: "grateful", label: "Grateful", icon: "🙏", bg: "bg-teal-500/10", text: "text-teal-300", border: "border-teal-500/30" },
  { type: "energized", label: "Energized", icon: "⚡", bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  { type: "reflective", label: "Reflective", icon: "🌙", bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/30" },
  { type: "anxious", label: "Anxious", icon: "🌧️", bg: "bg-sky-500/10", text: "text-sky-300", border: "border-sky-500/30" },
  { type: "melancholy", label: "Melancholy", icon: "🍂", bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
  { type: "frustrated", label: "Frustrated", icon: "🔥", bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" },
  { type: "neutral", label: "Steady", icon: "⚖️", bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30" },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  initialEntry,
  onSaved,
  onOpenCompanion,
}) => {
  const [title, setTitle] = useState(initialEntry?.title || "");
  const [content, setContent] = useState(initialEntry?.content || "");
  const [mood, setMood] = useState<MoodType>(initialEntry?.mood || "reflective");
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || ["Self-Reflection"]);
  const [tagInput, setTagInput] = useState("");
  const [reflection, setReflection] = useState<EntryReflection | null>(initialEntry?.reflection || null);

  // AI Loading states
  const [reflecting, setReflecting] = useState(false);
  const [extractingMemories, setExtractingMemories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [prompts, setPrompts] = useState<JournalPromptSuggestion[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptCategory, setPromptCategory] = useState<string>("clarity");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Synchronize on initial entry edit change
  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title);
      setContent(initialEntry.content);
      setMood(initialEntry.mood);
      setTags(initialEntry.tags || []);
      setReflection(initialEntry.reflection || null);
    }
  }, [initialEntry]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTimeMin = Math.ceil(wordCount / 200);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const cleaned = tagInput.trim().replace(/^#/, "");
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Generate Server-Side Gemini Reflection
  const handleGenerateReflection = async () => {
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Please write some thoughts before generating a reflection." });
      return;
    }
    setReflecting(true);
    setStatusMessage(null);
    try {
      const generated = await requestJournalReflection(content, title, mood);
      setReflection(generated);
      // Auto-append detected themes to tags if novel
      if (generated.detectedThemes && Array.isArray(generated.detectedThemes)) {
        const newTags = Array.from(new Set([...tags, ...generated.detectedThemes]));
        setTags(newTags.slice(0, 8));
      }
      setStatusMessage({ type: "success", text: "Reflection generated via server-side Gemini." });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to generate reflection." });
    } finally {
      setReflecting(false);
    }
  };

  // Extract Core Memories into isolated user collection
  const handleExtractMemories = async () => {
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Please write some thoughts first." });
      return;
    }
    setExtractingMemories(true);
    setStatusMessage(null);
    try {
      const extracted = await requestMemoryExtraction(content, title, initialEntry?.id);
      if (extracted.length === 0) {
        setStatusMessage({ type: "error", text: "No enduring core realizations detected in this entry." });
      } else {
        // Persist each extracted memory to Firestore
        for (const item of extracted) {
          await saveUserMemory(user.uid, {
            ...item,
            id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            userId: user.uid,
          });
        }
        setStatusMessage({
          type: "success",
          text: `Saved ${extracted.length} core realizations into your private Memory Vault!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to extract memories." });
    } finally {
      setExtractingMemories(false);
    }
  };

  // Load Smart Prompt Suggestions
  const handleFetchPrompts = async (category: string) => {
    setPromptCategory(category);
    setLoadingPrompts(true);
    try {
      const list = await requestSmartPrompts(category, tags);
      setPrompts(list);
    } catch {
      // ignore
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleApplyPrompt = (promptItem: JournalPromptSuggestion) => {
    setTitle(promptItem.title);
    setContent((prev) => (prev ? `${prev}\n\n[Prompt Reflection: ${promptItem.guidingQuestion}]\n` : `[${promptItem.prompt}]\n\n`));
    setShowPrompts(false);
  };

  // Save Entry
  const handleSave = async () => {
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Journal entry content cannot be empty." });
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    try {
      const entryId = initialEntry?.id || "entry_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      const newEntry: JournalEntry = {
        id: entryId,
        userId: user.uid,
        title: title.trim() || `Journal Entry · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        content: content.trim(),
        mood,
        tags,
        reflection,
        sentimentScore: reflection?.sentimentScore ?? 0,
        wordCount,
        privacyLevel: "private",
        createdAt: initialEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveJournalEntry(user.uid, newEntry);
      setStatusMessage({ type: "success", text: "Entry securely saved to your isolated Firestore container." });
      onSaved(newEntry);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save entry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Isolation & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Path:</span>
          <span className="text-teal-300 truncate max-w-[280px] sm:max-w-md">
            users/{user.uid}/entries/{initialEntry ? initialEntry.id.substring(0, 10) + "..." : "[new]"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readTimeMin} min read</span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Editor Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* Title Input */}
        <div>
          <input
            id="input-entry-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of this reflection (or leave for auto-date)..."
            className="w-full bg-transparent text-xl sm:text-2xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none border-b border-slate-800 pb-3"
          />
        </div>

        {/* Mood Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Current Emotional State
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const isSelected = mood === m.type;
              return (
                <button
                  key={m.type}
                  id={`mood-btn-${m.type}`}
                  type="button"
                  onClick={() => setMood(m.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? `${m.bg} ${m.border} ${m.text} shadow-sm ring-1 ring-teal-500/50`
                      : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt Suggestions Toolbar Toggle */}
        <div className="flex items-center justify-between border-y border-slate-800/80 py-2.5">
          <button
            id="btn-toggle-prompts"
            type="button"
            onClick={() => {
              if (!showPrompts && prompts.length === 0) {
                handleFetchPrompts(promptCategory);
              }
              setShowPrompts(!showPrompts);
            }}
            className="flex items-center gap-2 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{showPrompts ? "Hide Inquiries & Prompts" : "Looking for inspiration? Browse Smart Prompts"}</span>
            {showPrompts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onOpenCompanion(content)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unpack with AI Guide</span>
          </button>
        </div>

        {/* Prompts Drawer */}
        {showPrompts && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-700/50">
              {["clarity", "stress_relief", "gratitude", "growth", "creativity"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleFetchPrompts(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize font-medium transition-colors ${
                    promptCategory === cat
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat.replace("_", " ")}
                </button>
              ))}
            </div>

            {loadingPrompts ? (
              <div className="py-4 text-center text-xs text-slate-400 font-mono animate-pulse">
                Fetching thoughtful inquiries from Gemini...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prompts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleApplyPrompt(p)}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 cursor-pointer transition-all group"
                  >
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300">
                      {p.title}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.prompt}</p>
                    <span className="text-[11px] text-teal-400 font-medium block mt-1.5">
                      Use prompt →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Writing Canvas */}
        <div>
          <textarea
            id="textarea-journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Write openly and authentically... What is currently unfolding in your mind and life?"
            className="w-full bg-slate-950/50 border border-slate-800/90 rounded-xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 leading-relaxed font-sans text-sm sm:text-base resize-y transition-colors"
          />
        </div>

        {/* Tags input */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs font-medium text-slate-400">Themes & Tags</label>
          </div>
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 text-xs font-medium border border-slate-700"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-slate-400 hover:text-rose-400 text-xs leading-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="input-add-tag"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag (Press Enter)..."
              className="bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none min-w-[130px]"
            />
          </div>
        </div>

        {/* Action Controls & AI Toolbar */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Generate Gemini Reflection */}
            <button
              id="btn-generate-ai-reflection"
              type="button"
              onClick={handleGenerateReflection}
              disabled={reflecting || !content.trim()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all disabled:opacity-40"
            >
              <Sparkles className={`w-3.5 h-3.5 ${reflecting ? "animate-spin" : ""}`} />
              <span>{reflecting ? "Analyzing Emotional Tone..." : "Generate AI Reflection"}</span>
            </button>

            {/* Extract Core Memories */}
            <button
              id="btn-extract-memories"
              type="button"
              onClick={handleExtractMemories}
              disabled={extractingMemories || !content.trim()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-all disabled:opacity-40"
            >
              <Brain className={`w-3.5 h-3.5 text-teal-400 ${extractingMemories ? "animate-pulse" : ""}`} />
              <span>{extractingMemories ? "Extracting Realizations..." : "Extract Memories"}</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            id="btn-save-journal-entry"
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "Saving Securely..." : "Save Entry"}</span>
          </button>
        </div>
      </div>

      {/* AI Reflection Result Card */}
      {reflection && (
        <div
          id="card-ai-reflection"
          className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Gemini Psychological Reflection</h3>
                <span className="text-[11px] text-teal-400 font-mono">
                  Tone: {reflection.emotionalTone}
                </span>
              </div>
            </div>
            {reflection.sentimentScore !== undefined && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-mono block">Sentiment Meter</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    reflection.sentimentScore > 0.2
                      ? "text-emerald-400"
                      : reflection.sentimentScore < -0.2
                      ? "text-rose-400"
                      : "text-amber-400"
                  }`}
                >
                  {reflection.sentimentScore > 0 ? "+" : ""}
                  {(reflection.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Reflection Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
            <span className="text-teal-400 font-semibold block mb-1">Core Reflection:</span>
            {reflection.summary}
          </div>

          {/* Key takeaways */}
          {reflection.keyTakeaways && reflection.keyTakeaways.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Key Insights & Patterns
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {reflection.keyTakeaways.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300"
                  >
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Self-Growth Inquiry Question & Mindfulness Advice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1">
              <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Growth Self-Inquiry Prompt
              </span>
              <p className="text-slate-300 italic">{reflection.growthPrompt}</p>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/20 text-xs space-y-1">
              <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-teal-400" />
                Mindfulness & Cognitive Reframe
              </span>
              <p className="text-slate-300">{reflection.mindfulnessAdvice}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
