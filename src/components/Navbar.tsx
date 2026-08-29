import React from "react";
import {
  ShieldCheck,
  BookOpen,
  Sparkles,
  Brain,
  TrendingUp,
  LogIn,
  LogOut,
  User as UserIcon,
  Lock,
} from "lucide-react";
import type { UserProfile } from "../types.ts";

interface NavbarProps {
  user: UserProfile | null;
  activeTab: "editor" | "entries" | "memories" | "insights";
  setActiveTab: (tab: "editor" | "entries" | "memories" | "insights") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSecurity: () => void;
  onOpenCompanion: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onOpenSecurity,
  onOpenCompanion,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Security Status */}
        <div className="flex items-center gap-3">
          <button
            id="nav-brand-btn"
            onClick={() => setActiveTab("entries")}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 text-base tracking-tight">
                  Gemini Journal
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  Private & Cloud-Isolated
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Zero-log · Server-side AI · Per-user Firestore
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          <button
            id="nav-tab-editor"
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "editor"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Write
          </button>

          <button
            id="nav-tab-entries"
            onClick={() => setActiveTab("entries")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "entries"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Entries
          </button>

          <button
            id="nav-tab-memories"
            onClick={() => setActiveTab("memories")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "memories"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Brain className="w-4 h-4 text-teal-400" />
            Memory Vault
          </button>

          <button
            id="nav-tab-insights"
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "insights"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Insights & Trends
          </button>
        </nav>

        {/* Right Tools & Auth Profile */}
        <div className="flex items-center gap-2.5">
          {/* AI Guide Quick Drawer */}
          <button
            id="btn-open-ai-companion"
            onClick={onOpenCompanion}
            title="Open Private Journaling Reflection Partner"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span className="hidden sm:inline">AI Reflection Partner</span>
          </button>

          {/* Security Review Dashboard Trigger */}
          <button
            id="btn-open-security-modal"
            onClick={onOpenSecurity}
            title="View Security Architecture & Token Verification"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Security Architecture</span>
          </button>

          {/* Auth State Button */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-medium text-slate-200 leading-none truncate max-w-[110px]">
                    {user.displayName || user.email || "Mindful User"}
                  </p>
                  <p className="text-[10px] text-teal-400 font-mono leading-none mt-0.5 truncate max-w-[110px]">
                    users/{user.uid.substring(0, 6)}...
                  </p>
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sign out securely"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-open-login"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Join</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile sub-tabs */}
      <div className="flex md:hidden border-t border-slate-800 px-4 py-2 gap-2 overflow-x-auto bg-slate-900">
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            activeTab === "editor" ? "bg-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          Write Entry
        </button>
        <button
          onClick={() => setActiveTab("entries")}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            activeTab === "entries" ? "bg-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          All Entries
        </button>
        <button
          onClick={() => setActiveTab("memories")}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            activeTab === "memories" ? "bg-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          Memory Vault
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            activeTab === "insights" ? "bg-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          Insights & Trends
        </button>
      </div>
    </header>
  );
};
