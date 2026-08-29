export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  encryptionNoticeAcknowledged?: boolean;
}

export type MoodType = 'peaceful' | 'energized' | 'grateful' | 'reflective' | 'anxious' | 'melancholy' | 'frustrated' | 'neutral';

export interface EntryReflection {
  summary: string;
  emotionalTone: string;
  keyTakeaways: string[];
  growthPrompt: string;
  mindfulnessAdvice: string;
  sentimentScore: number; // -1.0 to 1.0
  detectedThemes: string[];
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodType;
  tags: string[];
  reflection?: EntryReflection | null;
  sentimentScore?: number;
  wordCount: number;
  privacyLevel: 'private' | 'draft' | 'shared';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface UserMemory {
  id: string;
  userId: string;
  topic: string;
  keyInsight: string;
  category: 'core_value' | 'gratitude_anchor' | 'lesson_learned' | 'recurring_stressor' | 'milestone';
  confidence: number; // 0 to 1
  sourceEntryId?: string;
  sourceEntryTitle?: string;
  updatedAt: string;
}

export interface PersonalInsightSynthesis {
  id: string;
  userId: string;
  period: string; // e.g. "Past 7 Days", "August 2026"
  entryCount: number;
  dominantThemes: string[];
  emotionalTrajectory: string;
  strengthsIdentified: string[];
  mindfulActionItems: string[];
  overallSentimentTrend: 'improving' | 'stable' | 'fluctuating' | 'declining';
  generatedAt: string;
}

export interface JournalPromptSuggestion {
  id: string;
  category: 'stress_relief' | 'clarity' | 'gratitude' | 'growth' | 'creativity';
  title: string;
  prompt: string;
  guidingQuestion: string;
}

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
