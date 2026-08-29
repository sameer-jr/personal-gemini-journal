import { getCurrentUserIdToken } from "./firebase.ts";
import type { EntryReflection, UserMemory, PersonalInsightSynthesis, JournalPromptSuggestion } from "../types.ts";

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getCurrentUserIdToken();
  if (!token) {
    throw new Error("Authentication required. Please sign in to securely access AI reflection services.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function checkServerHealth() {
  const res = await fetch("/api/health");
  return res.json();
}

export async function fetchPublicSecurityConfig() {
  const res = await fetch("/api/config/public");
  return res.json();
}

export async function verifyServerAuth() {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to verify server authentication.");
  }
  return res.json();
}

export async function requestJournalReflection(
  content: string,
  title?: string,
  mood?: string
): Promise<EntryReflection> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/journal/reflect", {
    method: "POST",
    headers,
    body: JSON.stringify({ content, title, mood }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Reflection service temporarily unavailable.");
  }

  const data = await res.json();
  return data.reflection;
}

export async function requestMemoryExtraction(
  content: string,
  title?: string,
  entryId?: string
): Promise<Array<Omit<UserMemory, "id" | "userId">>> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/journal/extract-memories", {
    method: "POST",
    headers,
    body: JSON.stringify({ content, title, entryId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Memory extraction failed.");
  }

  const data = await res.json();
  return data.memories || [];
}

export async function requestHolisticInsights(
  entries: Array<{ title: string; mood: string; summary?: string; sentiment?: number; date: string }>
): Promise<PersonalInsightSynthesis> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/journal/synthesize-insights", {
    method: "POST",
    headers,
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Insight synthesis failed.");
  }

  const data = await res.json();
  return data.insights;
}

export async function requestSmartPrompts(
  category: string,
  themes?: string[]
): Promise<JournalPromptSuggestion[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/journal/smart-prompts", {
    method: "POST",
    headers,
    body: JSON.stringify({ category, themes }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Smart prompts unavailable.");
  }

  const data = await res.json();
  return data.prompts || [];
}

export async function chatWithAICompanion(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  currentDraft?: string
): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/journal/chat-companion", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, currentDraft }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Journal companion unavailable.");
  }

  const data = await res.json();
  return data.reply;
}
