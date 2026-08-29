import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  EyeOff,
  Server,
  FileCheck,
  Layers,
  Cpu,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { UserProfile } from "../types.ts";
import { verifyServerAuth, fetchPublicSecurityConfig } from "../lib/api.ts";

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose, user }) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSecurityCheck = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const authVerification = await verifyServerAuth();
      const config = await fetchPublicSecurityConfig();
      setVerifyResult({
        auth: authVerification,
        config: config,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setVerifyError(err.message || "Security verification check failed.");
    } finally {
      setVerifying(false);
    }
  };

  const securityRules = [
    {
      id: "rule-1",
      title: "1. Authoritative Firebase Authentication",
      desc: "Identity is verified server-side on every protected API call using Firebase ID Token cryptographic signatures. Client-supplied UIDs are rejected.",
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      status: "Enforced",
    },
    {
      id: "rule-2",
      title: "2. Per-User Firestore Data Isolation",
      desc: `All journal entries, memories, and insights are partitioned under users/{uid}/... Path ownership is strictly enforced via Firestore Security Rules and backend token derivation.`,
      icon: <Database className="w-4 h-4 text-teal-400" />,
      status: `Isolated to: users/${user ? user.uid.substring(0, 10) + "..." : "{auth_uid}"}`,
    },
    {
      id: "rule-3",
      title: "3. Server-Only Secret Management",
      desc: "Gemini API keys are never bundled in client-side code. Production secrets are fetched directly by server-side processes from Google Cloud Secret Manager / env.",
      icon: <Key className="w-4 h-4 text-amber-400" />,
      status: "Zero Browser Exposure",
    },
    {
      id: "rule-4",
      title: "4. Principle of Least Privilege",
      desc: "Cloud Run execution runs under a dedicated, tightly-scoped service account with granular permissions restricted exclusively to necessary Firestore and Secret Manager roles.",
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      status: "Cloud Run Scoped",
    },
    {
      id: "rule-5",
      title: "5. Safe Gemini AI Model Pipeline",
      desc: "Input payloads are bounded (max 25k chars), stripped of injection sequences, and model outputs are parsed through structured JSON schemas before client return.",
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      status: "Schema Validated",
    },
    {
      id: "rule-6",
      title: "6. Zero-Content Privacy & Safe Logging",
      desc: "Private journal entries, personal reflection text, and auth tokens are never written to stdout, stderr, or application log collectors. Only operational metadata is tracked.",
      icon: <EyeOff className="w-4 h-4 text-rose-400" />,
      status: "Zero-Log Policy Active",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="security-modal-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Security Architecture & Review</h2>
              <p className="text-xs text-slate-400">
                10-Point Google Cloud & Firebase Production Security Blueprint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-sm">
          {/* Live Verification Diagnostic Box */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Live Authoritative Token & Isolation Diagnostic
                </span>
                <p className="text-xs text-slate-400">
                  Verify that backend rejects unauthenticated calls and derives UID only from token signatures.
                </p>
              </div>
              <button
                id="btn-run-live-security-check"
                onClick={handleRunSecurityCheck}
                disabled={verifying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
                {verifying ? "Auditing..." : "Audit Live Connection"}
              </button>
            </div>

            {verifyResult && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-teal-500/30 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Backend Token Cryptographically Verified ({verifyResult.timestamp})</span>
                </div>
                <p className="text-slate-300">
                  Authoritative UID: <span className="text-teal-300">{verifyResult.auth.user.uid}</span>
                </p>
                <p className="text-slate-300">
                  Firestore Partition Path:{" "}
                  <span className="text-teal-300">{verifyResult.auth.authorizedPath}</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  Database ID: {verifyResult.config.firestoreDatabaseId} | Project:{" "}
                  {verifyResult.config.projectId}
                </p>
              </div>
            )}

            {verifyError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                {verifyError}
              </div>
            )}
          </div>

          {/* Security Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {securityRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {rule.icon}
                    <h3 className="text-xs font-semibold text-slate-100">{rule.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">Status:</span>
                  <span className="text-emerald-400 font-medium font-mono truncate max-w-[200px]">
                    {rule.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Threat Model Defenses Summary */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-2">
            <h4 className="font-semibold text-indigo-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Active Threat Model Countermeasures
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-300">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-indigo-500/10">
                <span className="font-semibold text-indigo-200 block mb-0.5">No IDOR / Cross-User</span>
                UID derived solely from JWT claims, never from client parameters.
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-indigo-500/10">
                <span className="font-semibold text-indigo-200 block mb-0.5">No Secret Leakage</span>
                Zero browser exposure of Gemini keys; server proxies all inference.
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-indigo-500/10">
                <span className="font-semibold text-indigo-200 block mb-0.5">No Private Data Logs</span>
                Server request logs record status codes and masked IDs only.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Google Cloud Run · Firebase Auth · Firestore Rules v2</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
