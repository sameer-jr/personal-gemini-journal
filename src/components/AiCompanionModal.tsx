import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ShieldCheck,
  Lock,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import type { CompanionMessage, UserProfile } from "../types.ts";
import { chatWithAICompanion } from "../lib/api.ts";

interface AiCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  currentDraft?: string;
}

export const AiCompanionModal: React.FC<AiCompanionModalProps> = ({
  isOpen,
  onClose,
  user,
  currentDraft,
}) => {
  const [messages, setMessages] = useState<CompanionMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: `Hello ${
        user.displayName || "friend"
      }. I am your private Gemini Reflection Partner. Everything shared here is isolated strictly within your secure session. What thoughts or emotions would you like to explore today?`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: CompanionMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const payload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await chatWithAICompanion(payload, currentDraft);
      setMessages((prev) => [
        ...prev,
        {
          id: "bot_" + Date.now(),
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "assistant",
          content: "I apologize, I could not process that thought at this moment. Let's try again in a second.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="ai-companion-drawer"
        className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Reflection Partner</h3>
              <p className="text-[10px] text-teal-400 font-mono">
                Server-Side Gemini · Zero Log Leakage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Draft Context Badge if available */}
        {currentDraft && currentDraft.trim().length > 0 && (
          <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center gap-2 text-xs text-indigo-300">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Active context: Current draft ({currentDraft.length} chars)</span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <span
                    className={`block text-[10px] mt-1 ${
                      isUser ? "text-indigo-200 text-right" : "text-slate-500"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white">
                    {(user.displayName || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-teal-400 font-mono animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Partner is reflecting with empathy...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Field */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="relative">
            <input
              id="input-companion-chat"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for guidance, cognitive reframe, or deeper inquiry..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
