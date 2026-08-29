import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
} from "firebase/firestore";
import type { UserProfile } from "../types.ts";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Fallback config from provisioning
const fallbackConfig = {
  apiKey: "AIzaSyAaAOo555vZy1oBGCYydz0wBqKjlbSoCbM",
  authDomain: "genai-academy-track1-506407.firebaseapp.com",
  projectId: "genai-academy-track1-506407",
  storageBucket: "genai-academy-track1-506407.firebasestorage.app",
  messagingSenderId: "258257579679",
  appId: "1:258257579679:web:5fabb8678d13731fed3caa",
  firestoreDatabaseId: "ai-studio-personalgeminijo-165330be-8db5-49ff-bb9e-f6147bd12172",
};

export function initFirebase(customConfig?: typeof fallbackConfig) {
  const config = customConfig || fallbackConfig;
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  try {
    // Attempt named database if provided
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch {
    db = getFirestore(app);
  }

  return { app, auth, db };
}

// Pre-initialize
const initialized = initFirebase();
export { auth, db };

export async function getCurrentUserIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  }
  return null;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: false,
    lastLoginAt: new Date().toISOString(),
  };
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return {
    uid: res.user.uid,
    email: res.user.email,
    displayName: res.user.displayName || email.split("@")[0],
    isAnonymous: false,
    lastLoginAt: new Date().toISOString(),
  };
}

export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<UserProfile> {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  return {
    uid: res.user.uid,
    email: res.user.email,
    displayName: displayName || email.split("@")[0],
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  const unsubFirebase = onFirebaseAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Private Explorer" : "Journal User"),
        photoURL: firebaseUser.photoURL,
        isAnonymous: firebaseUser.isAnonymous,
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      callback(null);
    }
  });

  return () => unsubFirebase();
}
