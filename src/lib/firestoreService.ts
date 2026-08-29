import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase.ts";
import type { JournalEntry, UserMemory, PersonalInsightSynthesis } from "../types.ts";

// -----------------------------------------------------------------
// ENTRIES (Stored strictly under users/{userId}/entries/{entryId})
// -----------------------------------------------------------------

export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error("User ID is required for isolated persistence.");

  const entryRef = doc(db, "users", userId, "entries", entry.id);
  await setDoc(entryRef, {
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
    serverPersistedAt: Timestamp.now(),
  });
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required.");

  const entryRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryRef);
}

export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  try {
    const entriesCol = collection(db, "users", userId, "entries");
    const q = query(entriesCol, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteList: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          remoteList.push(docSnap.data() as JournalEntry);
        });
        onUpdate(remoteList);
      },
      (err) => {
        console.error("[Firestore] Entries listener error encountered");
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error("[Firestore] Failed to subscribe to entries");
    return () => {};
  }
}

// -----------------------------------------------------------------
// MEMORIES (Stored strictly under users/{userId}/memories/{memoryId})
// -----------------------------------------------------------------

export async function saveUserMemory(userId: string, memory: UserMemory): Promise<void> {
  if (!userId) throw new Error("User ID is required.");

  const memRef = doc(db, "users", userId, "memories", memory.id);
  await setDoc(memRef, {
    ...memory,
    userId,
    updatedAt: new Date().toISOString(),
    serverPersistedAt: Timestamp.now(),
  });
}

export async function deleteUserMemory(userId: string, memoryId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required.");

  const memRef = doc(db, "users", userId, "memories", memoryId);
  await deleteDoc(memRef);
}

export function subscribeToUserMemories(
  userId: string,
  onUpdate: (memories: UserMemory[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  try {
    const memsCol = collection(db, "users", userId, "memories");
    const q = query(memsCol, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserMemory[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as UserMemory);
        });
        onUpdate(list);
      },
      (err) => {
        console.error("[Firestore] Memories listener error encountered");
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error("[Firestore] Failed to subscribe to memories");
    return () => {};
  }
}

// -----------------------------------------------------------------
// INSIGHTS SYNTHESIS (users/{userId}/insights/{insightId})
// -----------------------------------------------------------------

export async function savePersonalInsight(userId: string, insight: PersonalInsightSynthesis): Promise<void> {
  if (!userId) throw new Error("User ID is required.");

  const docRef = doc(db, "users", userId, "insights", insight.id);
  await setDoc(docRef, {
    ...insight,
    userId,
    serverPersistedAt: Timestamp.now(),
  });
}

export async function fetchUserInsights(userId: string): Promise<PersonalInsightSynthesis[]> {
  if (!userId) return [];
  try {
    const insightsCol = collection(db, "users", userId, "insights");
    const q = query(insightsCol, orderBy("generatedAt", "desc"));
    const snap = await getDocs(q);
    const list: PersonalInsightSynthesis[] = [];
    snap.forEach((d) => list.push(d.data() as PersonalInsightSynthesis));
    return list;
  } catch (err: any) {
    console.error("[Firestore] Failed to fetch insights");
    return [];
  }
}
