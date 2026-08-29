import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.tsx";
import { JournalEditor } from "./components/JournalEditor.tsx";
import { JournalList } from "./components/JournalList.tsx";
import { EntryDetailView } from "./components/EntryDetailView.tsx";
import { MemoriesVault } from "./components/MemoriesVault.tsx";
import { InsightsDashboard } from "./components/InsightsDashboard.tsx";
import { SecurityModal } from "./components/SecurityModal.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { AiCompanionModal } from "./components/AiCompanionModal.tsx";
import {
  subscribeToAuth,
  logoutUser,
} from "./lib/firebase.ts";
import {
  subscribeToUserEntries,
  subscribeToUserMemories,
  deleteJournalEntry,
  saveJournalEntry,
  saveUserMemory,
} from "./lib/firestoreService.ts";
import type { UserProfile, JournalEntry, UserMemory } from "./types.ts";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Brain,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "entries" | "memories" | "insights">("entries");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [activeCompanionDraft, setActiveCompanionDraft] = useState<string>("");

  // Subscribe to Firebase Authentication - Real auth only
  useEffect(() => {
    const unsub = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Subscribe to isolated Firestore collection whenever user changes
  useEffect(() => {
    if (!user?.uid) return;

    const unsubEntries = subscribeToUserEntries(user.uid, (data) => {
      setEntries(data);
      // If empty for first time user, seed a gentle starter reflection
      if (data.length === 0) {
        seedInitialJournalEntry(user.uid);
      }
    });

    const unsubMemories = subscribeToUserMemories(user.uid, (mems) => {
      setMemories(mems);
      if (mems.length === 0) {
        seedInitialMemories(user.uid);
      }
    });

    return () => {
      unsubEntries();
      unsubMemories();
    };
  }, [user?.uid]);

  // Seed sample starter entry
  const seedInitialJournalEntry = async (uid: string) => {
    const starterEntry: JournalEntry = {
      id: "starter_reflection_1",
      userId: uid,
      title: "Stepping into Clarity & Mindful Presence",
      content: `Today I took time to pause and reflect on the pace of my daily schedule. It often feels like a constant sprint between tasks, but taking even fifteen minutes of silence this morning brought a profound sense of stillness.\n\nI noticed that my stress isn't caused by the workload itself, but by the mental pressure of trying to solve every uncertainty at once. Choosing to ground myself in what is within my direct circle of control creates immediate calm.`,
      mood: "peaceful",
      tags: ["Mindfulness", "Clarity", "Presence"],
      wordCount: 76,
      privacyLevel: "private",
      sentimentScore: 0.65,
      reflection: {
        summary: "A moment of conscious deceleration reveals that mental pressure stems from grasping at uncertainty rather than the task volume itself.",
        emotionalTone: "Serene, grounded, and self-compassionate",
        keyTakeaways: [
          "Differentiating between workload volume and internal resistance",
          "Finding grounded calm through intentional pauses",
          "Letting go of outcomes outside direct control"
        ],
        growthPrompt: "What is one uncertainty you can release control of today without guilt?",
        mindfulnessAdvice: "When feeling rushed, practice 4-7-8 breathing and remind yourself: 'I have enough time for what matters most.'",
        sentimentScore: 0.65,
        detectedThemes: ["Mindfulness", "Acceptance", "Pacing"]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveJournalEntry(uid, starterEntry);
  };

  const seedInitialMemories = async (uid: string) => {
    const starterMemory: UserMemory = {
      id: "starter_mem_1",
      userId: uid,
      topic: "The Control Anchor",
      keyInsight: "Mental exhaustion decreases dramatically when I consciously focus only on what is in my direct circle of influence.",
      category: "core_value",
      confidence: 0.95,
      sourceEntryTitle: "Stepping into Clarity & Mindful Presence",
      updatedAt: new Date().toISOString(),
    };
    await saveUserMemory(uid, starterMemory);
  };

  const handleSavedEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setActiveTab("entries");
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (user?.uid) {
      await deleteJournalEntry(user.uid, entryId);
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
    }
  };

  const handleOpenCompanion = (draftText?: string) => {
    setActiveCompanionDraft(draftText || "");
    setIsCompanionOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedEntry(null);
          setEditingEntry(null);
          setActiveTab(tab);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={async () => {
          await logoutUser();
          setUser(null);
        }}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenCompanion={() => handleOpenCompanion()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <>
            {/* View Switching */}
            {activeTab === "editor" && (
              <JournalEditor
                user={user}
                initialEntry={editingEntry}
                onSaved={handleSavedEntry}
                onOpenCompanion={handleOpenCompanion}
              />
            )}

            {activeTab === "entries" && (
              <>
                {selectedEntry ? (
                  <EntryDetailView
                    entry={selectedEntry}
                    onBack={() => setSelectedEntry(null)}
                    onEdit={(e) => {
                      setEditingEntry(e);
                      setActiveTab("editor");
                    }}
                    onDelete={handleDeleteEntry}
                    onUpdateEntry={(updated) => setSelectedEntry(updated)}
                    onOpenCompanion={handleOpenCompanion}
                  />
                ) : (
                  <JournalList
                    entries={entries}
                    onSelectEntry={(entry) => setSelectedEntry(entry)}
                    onEditEntry={(entry) => {
                      setEditingEntry(entry);
                      setActiveTab("editor");
                    }}
                    onDeleteEntry={handleDeleteEntry}
                    onNewEntry={() => {
                      setEditingEntry(null);
                      setActiveTab("editor");
                    }}
                  />
                )}
              </>
            )}

            {activeTab === "memories" && (
              <MemoriesVault
                user={user}
                memories={memories}
                onSelectEntryById={(id) => {
                  const target = entries.find((e) => e.id === id);
                  if (target) {
                    setSelectedEntry(target);
                    setActiveTab("entries");
                  }
                }}
              />
            )}

            {activeTab === "insights" && (
              <InsightsDashboard user={user} entries={entries} />
            )}
          </>
        ) : (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">
              Personal Gemini Journal
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              A private, cloud-isolated AI reflective journaling environment built with Firebase Authentication, zero-content logging, and server-side Gemini intelligence.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Per-User Firestore Isolation · Firebase Authentication · Zero-Log Policy</span>
          </div>
          <button
            onClick={() => setIsSecurityOpen(true)}
            className="text-teal-400 hover:text-teal-300 font-medium"
          >
            Review 10-Point Security Blueprint →
          </button>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        user={user}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      {user && (
        <AiCompanionModal
          isOpen={isCompanionOpen}
          onClose={() => setIsCompanionOpen(false)}
          user={user}
          currentDraft={activeCompanionDraft}
        />
      )}
    </div>
  );
}
