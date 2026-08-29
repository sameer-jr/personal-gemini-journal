import { GoogleGenAI } from "@google/genai";
import type { EntryReflection, UserMemory, PersonalInsightSynthesis, JournalPromptSuggestion } from "../src/types.ts";

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Server secret GEMINI_API_KEY is missing. Ensure it is configured in Google Cloud Secret Manager or environment.");
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Input sanitizer & bounds checking for security
function sanitizeJournalInput(text: string, maxLength: number = 20000): string {
  if (typeof text !== "string") {
    throw new Error("Invalid payload: input must be a string");
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Invalid payload: input cannot be empty");
  }
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

/**
 * Generates an empathetic, psychologically grounded reflection on a journal entry.
 */
export async function generateEntryReflection(
  entryContent: string,
  entryTitle?: string,
  userMood?: string
): Promise<EntryReflection> {
  const sanitizedContent = sanitizeJournalInput(entryContent, 25000);
  const ai = getGenAI();

  const systemInstruction = `You are an empathetic, insightful, and non-judgmental personal journaling companion and reflection guide.
Your purpose is to help the user process their thoughts, discover hidden patterns, nurture self-compassion, and find constructive paths forward.
Security & Ethical Directives:
- Maintain complete respect for user vulnerability.
- Provide objective, thoughtful psychological reframing.
- Do NOT make definitive medical or psychiatric diagnoses. If severe distress is mentioned, offer warm, grounding mindfulness guidance and standard supportive resources.
- Output MUST be strictly valid JSON matching the requested structure.`;

  const prompt = `Analyze and reflect upon the following private journal entry:
Title: ${entryTitle ? entryTitle.slice(0, 200) : "Untitled Entry"}
User Stated Mood: ${userMood ? userMood.slice(0, 50) : "Unspecified"}

Journal Entry Text:
"""
${sanitizedContent}
"""

Please return a single valid JSON object strictly matching this schema:
{
  "summary": "A concise 2-3 sentence distillation of what the writer experienced or is processing.",
  "emotionalTone": "A nuanced description of the emotional state (e.g. 'Cautiously optimistic with undertones of cognitive fatigue').",
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
  "growthPrompt": "A single, powerful open-ended self-inquiry question for the user to reflect on later.",
  "mindfulnessAdvice": "A practical, grounded grounding technique or cognitive reframing suggestion tailored to this specific entry.",
  "sentimentScore": 0.4, // A float between -1.0 (very negative/heavy) to +1.0 (very positive/energized)
  "detectedThemes": ["Theme 1", "Theme 2", "Theme 3"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text || "{}";
  try {
    const parsed = JSON.parse(responseText);
    return {
      summary: parsed.summary || "Reflection generated.",
      emotionalTone: parsed.emotionalTone || "Reflective",
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : ["Thoughtful reflection captured."],
      growthPrompt: parsed.growthPrompt || "What lesson can you take forward from this moment?",
      mindfulnessAdvice: parsed.mindfulnessAdvice || "Take a deep breath and acknowledge your resilience.",
      sentimentScore: typeof parsed.sentimentScore === "number" ? Math.max(-1, Math.min(1, parsed.sentimentScore)) : 0,
      detectedThemes: Array.isArray(parsed.detectedThemes) ? parsed.detectedThemes : ["Self-Reflection"],
    };
  } catch (err) {
    throw new Error("Failed to parse AI reflection output into expected schema");
  }
}

/**
 * Extracts enduring core memories, beliefs, recurring stressors, and gratitude anchors.
 */
export async function extractMemoriesFromEntry(
  entryContent: string,
  entryTitle?: string,
  entryId?: string
): Promise<Array<Omit<UserMemory, "id" | "userId">>> {
  const sanitizedContent = sanitizeJournalInput(entryContent, 20000);
  const ai = getGenAI();

  const systemInstruction = `You are a memory synthesis engine for a personal life journal.
Your task is to identify enduring long-term insights worth remembering across months and years (e.g., core personal values, recurring habits, deep gratitude anchors, relational milestones, or important life lessons).
Do not extract fleeting trivia. Extract only significant, meaningful anchors.`;

  const prompt = `Review this journal entry:
Title: ${entryTitle ? entryTitle.slice(0, 200) : "Untitled"}
Content:
"""
${sanitizedContent}
"""

Extract 1 to 4 enduring memory items. Return a JSON array with objects matching:
[
  {
    "topic": "Short title of memory or realization",
    "keyInsight": "The enduring wisdom, lesson, or realization to keep in long-term memory",
    "category": "core_value" | "gratitude_anchor" | "lesson_learned" | "recurring_stressor" | "milestone",
    "confidence": 0.9
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text || "[]";
  try {
    const list = JSON.parse(responseText);
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      topic: item.topic || "Core Realization",
      keyInsight: item.keyInsight || "Key insight recorded.",
      category: ["core_value", "gratitude_anchor", "lesson_learned", "recurring_stressor", "milestone"].includes(item.category)
        ? item.category
        : "lesson_learned",
      confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.85,
      sourceEntryId: entryId,
      sourceEntryTitle: entryTitle,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Synthesizes weekly/monthly holistic trends across multiple journal entry summaries.
 */
export async function synthesizeHolisticInsights(
  entriesMetadata: Array<{ title: string; mood: string; summary?: string; sentiment?: number; date: string }>
): Promise<Omit<PersonalInsightSynthesis, "id" | "userId">> {
  if (entriesMetadata.length === 0) {
    throw new Error("No entries provided for synthesis");
  }

  const ai = getGenAI();
  const summaryPayload = entriesMetadata
    .slice(0, 30) // limit for safety
    .map((e, idx) => `Entry ${idx + 1} (${e.date}) [Mood: ${e.mood}]: "${e.title}" - ${e.summary || "No summary"}`)
    .join("\n");

  const systemInstruction = `You are an executive wellness and emotional intelligence mentor.
Analyze the user's recent journal trajectories to produce an empowering, analytical synthesis of their themes, growth vectors, and emotional rhythms.`;

  const prompt = `Synthesize patterns across these recent journal records:
${summaryPayload}

Return a valid JSON object matching:
{
  "period": "e.g. Recent Journey (Last ${entriesMetadata.length} entries)",
  "dominantThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "emotionalTrajectory": "A cohesive 2-sentence description of how emotional energy and mindset have evolved.",
  "strengthsIdentified": ["Strength 1", "Strength 2", "Strength 3"],
  "mindfulActionItems": ["Clear recommendation 1", "Clear recommendation 2", "Clear recommendation 3"],
  "overallSentimentTrend": "improving" | "stable" | "fluctuating" | "declining"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text || "{}";
  try {
    const parsed = JSON.parse(responseText);
    return {
      period: parsed.period || `Recent Journey (${entriesMetadata.length} entries)`,
      entryCount: entriesMetadata.length,
      dominantThemes: Array.isArray(parsed.dominantThemes) ? parsed.dominantThemes : ["Personal Reflection", "Self Care"],
      emotionalTrajectory: parsed.emotionalTrajectory || "Consistent introspection with steady self-awareness.",
      strengthsIdentified: Array.isArray(parsed.strengthsIdentified) ? parsed.strengthsIdentified : ["High emotional self-awareness", "Commitment to growth"],
      mindfulActionItems: Array.isArray(parsed.mindfulActionItems) ? parsed.mindfulActionItems : ["Continue scheduling daily quiet time", "Celebrate micro-victories"],
      overallSentimentTrend: ["improving", "stable", "fluctuating", "declining"].includes(parsed.overallSentimentTrend)
        ? parsed.overallSentimentTrend
        : "stable",
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error("Failed to parse synthesis results");
  }
}

/**
 * Generates dynamic, personalized journaling prompts.
 */
export async function generateSmartPrompts(
  category: string = "clarity",
  recentThemes: string[] = []
): Promise<JournalPromptSuggestion[]> {
  const ai = getGenAI();

  const prompt = `Generate 4 deeply thought-provoking, unique, and empowering journaling prompts for the category: "${category}".
Recent user life themes if any: ${recentThemes.join(", ") || "General well-being, mindfulness, career, relationships"}.

Return a JSON array strictly matching:
[
  {
    "id": "p-1",
    "category": "${category}",
    "title": "Short catchy prompt title",
    "prompt": "The full evocative journaling prompt (2-3 sentences)",
    "guidingQuestion": "One direct question to jumpstart writing"
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text || "[]";
  try {
    const parsed = JSON.parse(responseText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [
      {
        id: "p-fallback-1",
        category: "clarity" as const,
        title: "The Unburdening",
        prompt: "Write down everything currently demanding your mental energy, then sort them into things you control versus things you must accept.",
        guidingQuestion: "What is one heavy weight you can choose to set down today?",
      },
    ];
  }
}

/**
 * Interactive private journaling companion chat.
 */
export async function chatWithCompanion(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  currentDraft?: string
): Promise<string> {
  const ai = getGenAI();

  const formattedHistory = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: sanitizeJournalInput(m.content, 2000) }],
  }));

  const systemInstruction = `You are a warm, perceptive, and compassionate AI journaling companion.
Your role is to help the writer explore their thoughts with gentle curiosity, reflective questions, and unconditional positive regard.
${currentDraft ? `The user is currently writing about: "${currentDraft.slice(0, 5000)}"` : ""}
Never lecture. Keep responses conversational, concise (2-4 paragraphs maximum), and end with a gentle question that prompts deeper understanding.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: formattedHistory,
    config: {
      systemInstruction,
      temperature: 0.6,
    },
  });

  return response.text || "I am listening. Take your time to explore that feeling further.";
}
