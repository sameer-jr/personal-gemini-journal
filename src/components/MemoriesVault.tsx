import React, { useState } from "react";
import {
  Brain,
  Plus,
  Trash2,
  Lock,
  Tag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Heart,
  Lightbulb,
  Award,
  AlertTriangle,
} from "lucide-react";
import type { UserMemory, UserProfile } from "../types.ts";
import { saveUserMemory, deleteUserMemory } from "../lib/firestoreService.ts";

interface MemoriesVaultProps {
  user: UserProfile;
  memories: UserMemory[];
  onSelectEntryById?: (entryId: string) => void;
}

const CATEGORY_META: Record<
  UserMemory["category"],
  { label: string; icon: any; color: string; border: string; bg: string }
> = {
  core_value: {
    label: "Core Value",
    icon: Heart,
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  },
  gratitude_anchor: {
    label: "Gratitude Anchor",
    icon: Sparkles,
    color: "text-teal-400",
    border: "border-teal-500/30",
    bg: "bg-teal-500/10",
  },
  lesson_learned: {
    label: "Lesson Learned",
    icon: Lightbulb,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  recurring_stressor: {
    label: "Stress Pattern",
    icon: AlertTriangle,
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
  },
  milestone: {
    label: "Milestone",
    icon: Award,
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
  },
};

export const MemoriesVault: React.FC<MemoriesVaultProps> = ({
  user,
  memories,
  onSelectEntryById,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [keyInsight, setKeyInsight] = useState("");
  const [category, setCategory] = useState<UserMemory["category"]>("core_value");
  const [saving, setSaving] = useState(false);

  const filtered = memories.filter(
    (m) => selectedCategory === "all" || m.category === selectedCategory
  );

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !keyInsight.trim()) return;
    setSaving(true);
    try {
      const newMemory: UserMemory = {
        id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        userId: user.uid,
        topic: topic.trim(),
        keyInsight: keyInsight.trim(),
        category,
        confidence: 1.0,
        updatedAt: new Date().toISOString(),
      };
      await saveUserMemory(user.uid, newMemory);
      setTopic("");
      setKeyInsight("");
      setShowAddForm(false);
    } catch (err: any) {
      alert("Failed to save memory: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Remove this realization from your Memory Vault?")) {
      await deleteUserMemory(user.uid, id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
              Personal Memory Vault
            </h1>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700">
              {memories.length} realizations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Enduring core beliefs, gratitude anchors, and life lessons distilled by Gemini over time.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-teal-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Cancel" : "Add Anchor Realization"}</span>
        </button>
      </div>

      {/* Path Isolation Banner */}
      <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Partition:</span>
        <span className="text-teal-300">users/{user.uid}/memories/...</span>
      </div>

      {/* Add Memory Modal/Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveMemory}
          className="p-5 rounded-2xl bg-slate-900 border border-teal-500/30 space-y-4 animate-in slide-in-from-top-2 duration-200"
        >
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-teal-400" />
            Add Long-Term Memory Anchor
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Topic or Title</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Non-Negotiable Morning Routine"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="core_value">❤️ Core Value</option>
                <option value="gratitude_anchor">✨ Gratitude Anchor</option>
                <option value="lesson_learned">💡 Lesson Learned</option>
                <option value="recurring_stressor">⚠️ Stress Pattern</option>
                <option value="milestone">🏆 Milestone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Enduring Insight or Realization</label>
            <textarea
              required
              rows={3}
              value={keyInsight}
              onChange={(e) => setKeyInsight(e.target.value)}
              placeholder="What deep truth did you realize that you want to remember months from now?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to Vault"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          All Anchors ({memories.length})
        </button>

        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const count = memories.filter((m) => m.category === key).length;
          const isSelected = selectedCategory === key;
          const IconComp = meta.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isSelected
                  ? `${meta.bg} ${meta.color} border ${meta.border}`
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>
                {meta.label} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Memories Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <Brain className="w-10 h-10 text-teal-400/40 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Memories in this Category</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            As you write journal entries, click "Extract Memories" to automatically distill your core
            beliefs and wisdom into this vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((memory) => {
            const meta = CATEGORY_META[memory.category] || CATEGORY_META.lesson_learned;
            const IconComp = meta.icon;
            return (
              <div
                key={memory.id}
                id={`memory-card-${memory.id}`}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}
                    >
                      <IconComp className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </span>

                    <button
                      onClick={() => handleDelete(memory.id)}
                      title="Delete memory"
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
                    {memory.topic}
                  </h3>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                    "{memory.keyInsight}"
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    Confidence: {(memory.confidence * 100).toFixed(0)}%
                  </span>
                  {memory.sourceEntryTitle && (
                    <span className="truncate max-w-[150px] text-slate-500">
                      From: {memory.sourceEntryTitle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
