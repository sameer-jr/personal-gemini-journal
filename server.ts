import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import {
  generateEntryReflection,
  extractMemoriesFromEntry,
  synthesizeHolisticInsights,
  generateSmartPrompts,
  chatWithCompanion,
} from "./server/geminiService.ts";

const PORT = Number(process.env.PORT || 8080);

// Read Firebase config if available
let firebaseConfig: Record<string, string> = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  // Safe fallback
}

// Initialize Firebase Admin SDK safely
const projectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || "genai-academy-track1-506407";
if (!getAdminApps().length) {
  try {
    initAdminApp({
      projectId,
    });
  } catch (err) {
    console.warn("Firebase Admin initialized with default project configuration.");
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    isAnonymous?: boolean;
  };
}

/**
 * Authoritative Authentication Middleware:
 * Verifies the Firebase ID token using Firebase Admin SDK.
 * Rejects requests without valid tokens with HTTP 401.
 * Never synthesizes guest/mock tokens or trusts user-supplied UIDs.
 */
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected Bearer <Firebase_ID_Token>.",
    });
    return;
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Token is empty." });
    return;
  }

  try {
    // Authoritative verification via Firebase Admin SDK
    const decodedToken = await getAdminAuth().verifyIdToken(token, true);

    // Derive identity ONLY from verified token payload
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      isAnonymous: decodedToken.firebase?.sign_in_provider === "anonymous",
    };

    next();
  } catch (error: any) {
    // Never leak internal token error stacks or private server credentials
    res.status(401).json({
      error: "Unauthorized",
      message: "The provided authentication token is invalid or has expired.",
    });
  }
}

async function startServer() {
  const app = express();

  // Helmet HTTP security headers
  const isProd = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://*.firebaseapp.com"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "https://fonts.gstatic.com"],
              imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://*.firebaseapp.com"],
              connectSrc: [
                "'self'",
                "https://*.googleapis.com",
                "https://*.firebaseio.com",
                "https://*.firebaseapp.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firestore.googleapis.com",
              ],
              frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginOpenerPolicy: {
  policy: "same-origin-allow-popups",
},
crossOriginEmbedderPolicy: false,
    })
  );

  // Rate Limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120, // max 120 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please slow down your requests.",
    },
  });
  app.use("/api/", apiLimiter);

  // Payload bounds checking & body parser limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Non-sensitive zero-content operational logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api/")) {
        const userMask = (req as AuthenticatedRequest).user?.uid
          ? `[user:${(req as AuthenticatedRequest).user?.uid.substring(0, 6)}...]`
          : "[unauth]";
        console.log(`[API] ${req.method} ${req.path} ${res.statusCode} (${duration}ms) ${userMask}`);
      }
    });
    next();
  });

  // Public Configuration Endpoint
  app.get("/api/config/public", (_req, res) => {
    res.json({
      projectId: firebaseConfig.projectId || projectId,
      appId: firebaseConfig.appId || "",
      apiKey: firebaseConfig.apiKey || "",
      authDomain: firebaseConfig.authDomain || `${projectId}.firebaseapp.com`,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      storageBucket: firebaseConfig.storageBucket || `${projectId}.firebasestorage.app`,
      messagingSenderId: firebaseConfig.messagingSenderId || "",
      oAuthClientId: firebaseConfig.oAuthClientId || "",
      securityModel: {
        tokenVerification: "Authoritative Firebase Admin ID Token Verification",
        firestoreIsolation: "Strict per-user paths users/{uid}/...",
        secretsManagement: "Server-Side Execution & Google Cloud Secret Manager Only",
      },
    });
  });

  // Health Endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      serverSideGeminiConfigured: !!process.env.GEMINI_API_KEY,
      firebaseConfigured: !!projectId,
    });
  });

  // Protected Auth Token Verification Endpoint
  app.post("/api/auth/verify", requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      status: "authenticated",
      user: req.user,
      authorizedPath: `users/${req.user?.uid}`,
    });
  });

  // Protected: Gemini Journal Reflection
  app.post("/api/journal/reflect", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, title, mood } = req.body;
      if (!content || typeof content !== "string") {
        res.status(400).json({ error: "Validation Error", message: "content string is required." });
        return;
      }
      if (content.trim().length === 0 || content.length > 25000) {
        res.status(400).json({ error: "Validation Error", message: "content must be between 1 and 25,000 characters." });
        return;
      }
      if (title !== undefined && (typeof title !== "string" || title.length > 200)) {
        res.status(400).json({ error: "Validation Error", message: "title must be a string up to 200 characters." });
        return;
      }
      if (mood !== undefined && (typeof mood !== "string" || mood.length > 50)) {
        res.status(400).json({ error: "Validation Error", message: "mood must be a string up to 50 characters." });
        return;
      }

      const reflection = await generateEntryReflection(content, title, mood);
      res.json({ success: true, reflection });
    } catch {
      console.error("[ERROR] Reflection generation failed");
      res.status(500).json({
        error: "Reflective Analysis Failed",
        message: "An error occurred while generating your reflection. Please try again.",
      });
    }
  });

  // Protected: Extract Long-term Memories
  app.post("/api/journal/extract-memories", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, title, entryId } = req.body;
      if (!content || typeof content !== "string") {
        res.status(400).json({ error: "Validation Error", message: "content string is required." });
        return;
      }
      if (content.trim().length === 0 || content.length > 25000) {
        res.status(400).json({ error: "Validation Error", message: "content must be between 1 and 25,000 characters." });
        return;
      }
      if (title !== undefined && (typeof title !== "string" || title.length > 200)) {
        res.status(400).json({ error: "Validation Error", message: "title must be a string up to 200 characters." });
        return;
      }
      if (entryId !== undefined && (typeof entryId !== "string" || entryId.length > 100)) {
        res.status(400).json({ error: "Validation Error", message: "entryId must be a string up to 100 characters." });
        return;
      }

      const extractedMemories = await extractMemoriesFromEntry(content, title, entryId);
      res.json({ success: true, memories: extractedMemories });
    } catch {
      console.error("[ERROR] Memory extraction failed");
      res.status(500).json({ error: "Memory Extraction Failed", message: "Unable to process memories." });
    }
  });

  // Protected: Synthesize Holistic Insights across entries
  app.post("/api/journal/synthesize-insights", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: "Validation Error", message: "An array of entry summaries is required." });
        return;
      }
      if (entries.length > 50) {
        res.status(400).json({ error: "Validation Error", message: "Maximum 50 entry summaries allowed per synthesis." });
        return;
      }

      for (let i = 0; i < entries.length; i++) {
        const item = entries[i];
        if (!item || typeof item !== "object") {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} must be an object.` });
          return;
        }
        if (typeof item.title !== "string" || item.title.length > 200) {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} title must be a string up to 200 characters.` });
          return;
        }
        if (typeof item.mood !== "string" || item.mood.length > 50) {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} mood must be a string up to 50 characters.` });
          return;
        }
        if (item.summary !== undefined && (typeof item.summary !== "string" || item.summary.length > 2000)) {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} summary must be a string up to 2000 characters.` });
          return;
        }
        if (item.sentiment !== undefined && item.sentiment !== null && (typeof item.sentiment !== "number" || item.sentiment < -1 || item.sentiment > 1)) {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} sentiment must be a number between -1 and 1.` });
          return;
        }
        if (item.date !== undefined && (typeof item.date !== "string" || item.date.length > 50)) {
          res.status(400).json({ error: "Validation Error", message: `Entry at index ${i} date must be a string up to 50 characters.` });
          return;
        }
      }

      const insights = await synthesizeHolisticInsights(entries);
      res.json({ success: true, insights });
    } catch {
      console.error("[ERROR] Synthesis failed");
      res.status(500).json({ error: "Insight Synthesis Failed", message: "Could not synthesize journey trends." });
    }
  });

  // Protected: Smart Journaling Prompts
  app.post("/api/journal/smart-prompts", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, themes } = req.body;
      if (category !== undefined && (typeof category !== "string" || category.length > 50)) {
        res.status(400).json({ error: "Validation Error", message: "category must be a string up to 50 characters." });
        return;
      }
      if (themes !== undefined) {
        if (!Array.isArray(themes) || themes.length > 10 || themes.some((t) => typeof t !== "string" || t.length > 50)) {
          res.status(400).json({ error: "Validation Error", message: "themes must be an array of up to 10 strings, each max 50 characters." });
          return;
        }
      }

      const validCategory = typeof category === "string" ? category : "clarity";
      const validThemes = Array.isArray(themes) ? themes : [];
      const prompts = await generateSmartPrompts(validCategory, validThemes);
      res.json({ success: true, prompts });
    } catch {
      console.error("[ERROR] Prompt generation failed");
      res.status(500).json({ error: "Prompt Generation Failed", message: "Could not load prompts." });
    }
  });

  // Protected: Interactive Private Journaling Companion Chat
  app.post("/api/journal/chat-companion", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { messages, currentDraft } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Validation Error", message: "messages array is required." });
        return;
      }
      if (messages.length > 20) {
        res.status(400).json({ error: "Validation Error", message: "Message history exceeds maximum limit (20)." });
        return;
      }
      if (currentDraft !== undefined && currentDraft !== null) {
        if (typeof currentDraft !== "string" || currentDraft.length > 5000) {
          res.status(400).json({ error: "Validation Error", message: "currentDraft must be a string up to 5,000 characters." });
          return;
        }
      }

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || typeof m !== "object") {
          res.status(400).json({ error: "Validation Error", message: `Message at index ${i} must be an object.` });
          return;
        }
        if (m.role !== "user" && m.role !== "assistant") {
          res.status(400).json({ error: "Validation Error", message: `Message at index ${i} role must be 'user' or 'assistant'.` });
          return;
        }
        if (typeof m.content !== "string" || m.content.trim().length === 0) {
          res.status(400).json({ error: "Validation Error", message: `Message at index ${i} content must be a non-empty string.` });
          return;
        }
        if (m.content.length > 2000) {
          res.status(400).json({ error: "Validation Error", message: `Message at index ${i} exceeds maximum length of 2,000 characters.` });
          return;
        }
      }

      const validMessages = messages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));

      const reply = await chatWithCompanion(validMessages, currentDraft);
      res.json({ success: true, reply });
    } catch {
      console.error("[ERROR] Companion chat failed");
      res.status(500).json({ error: "Chat Failed", message: "Companion could not respond at this time." });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const clientPath = path.join(process.cwd(), "dist", "client");
    app.use(express.static(clientPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Personal Gemini Journal running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[FATAL] Failed to start server:", err);
  process.exit(1);
});

