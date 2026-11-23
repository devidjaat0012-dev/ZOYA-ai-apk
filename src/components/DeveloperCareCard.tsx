import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Headphones,
  HeartHandshake,
  KeyRound,
  LayoutPanelTop,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import {
  ApiSlotId,
  AppConfig,
  CUSTOMER_SUPPORT_INSTAGRAM_URL,
  isDeveloperApiSlot,
} from "../types";
import { getApiUrl } from "../utils/apiBase";

interface DeveloperCareCardProps {
  config: AppConfig;
  onUpdateConfig: (partial: Partial<AppConfig>) => void;
  compact?: boolean;
}

interface HealthDiagnostics {
  status: string;
  hasApiKey: boolean;
  hasDeveloperApiKey: boolean;
  developerCareActive: boolean;
  timestamp: number;
}

interface VerifyState {
  verified?: boolean;
  message?: string;
}

export default function DeveloperCareCard({
  config,
  onUpdateConfig,
  compact = false,
}: DeveloperCareCardProps) {
  const [health, setHealth] = useState<HealthDiagnostics | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>({});
  const [diagError, setDiagError] = useState<string | null>(null);

  const developerModeActive = isDeveloperApiSlot(config);
  const careEnabled = config.developerCareEnabled !== false;
  const consoleEnabled = config.developerConsoleEnabled !== false;

  const runDiagnostics = async () => {
    setCheckingHealth(true);
    setDiagError(null);
    try {
      const res = await fetch(getApiUrl("/api/health"));
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      setHealth({
        status: data.status || "ok",
        hasApiKey: Boolean(data.hasApiKey),
        hasDeveloperApiKey: Boolean(data.hasDeveloperApiKey),
        developerCareActive: Boolean(data.developerCareActive),
        timestamp: data.timestamp || Date.now(),
      });
    } catch (err: any) {
      setDiagError(err?.message || "Health check unreachable");
    } finally {
      setCheckingHealth(false);
    }
  };

  const runDeveloperKeyVerification = async () => {
    setVerifyingKey(true);
    try {
      const res = await fetch(getApiUrl("/api/developer/verify"), {
        method: "POST",
      });
      const data = await res.json();
      setVerifyState({
        verified: Boolean(data.authenticated),
        message: data.message,
      });
    } catch (err: any) {
      setVerifyState({
        verified: false,
        message: err?.message || "Developer authentication verification failed",
      });
    } finally {
      setVerifyingKey(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleToggleDeveloperMode = () => {
    const nextEnabled = !developerModeActive;
    onUpdateConfig({
      developerModeEnabled: nextEnabled,
      activeApiSlot: nextEnabled ? "developer" : "default",
      apiKey: "",
      developerCareEnabled: nextEnabled ? true : careEnabled,
    });
  };

  const handleSelectApiSlot = (slot: ApiSlotId) => {
    const isDev = slot === "developer";
    onUpdateConfig({
      activeApiSlot: slot,
      developerModeEnabled: isDev,
      apiKey: slot === "developer" || slot === "default" ? "" : config.apiKey,
      developerCareEnabled: isDev ? true : careEnabled,
    });
  };

  return (
    <div
      className={`${
        compact ? "p-3.5" : "p-4"
      } rounded-2xl bg-gradient-to-br from-emerald-500/12 via-cyan-500/10 to-pink-500/10 border border-emerald-400/35 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
            <HeartHandshake size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white">
                Developer Care &amp; Zoya Developer Mode
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                <ShieldCheck size={10} />
                <span>DEVID Verified</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
              Server-side <code className="text-emerald-300 font-mono">DEVELOPER_GEMINI_API_KEY</code> authentication, Zoya Developer Mode routing, aur DEVID Care diagnostics.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Zoya Developer Mode Toggle Switch */}
      <div className="p-3 rounded-xl bg-black/45 border border-emerald-400/40 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              developerModeActive
                ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/50"
                : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            <Terminal size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white">
                Zoya Developer Mode
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  developerModeActive
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                    : "bg-slate-800 text-slate-400 border border-white/10"
                }`}
              >
                {developerModeActive ? "Active" : "Off"}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
              {developerModeActive
                ? "ON: Sabhi API requests (Chat, Live, Study, Coding, Astrology) server-side DEVELOPER_GEMINI_API_KEY se authenticate ho rahe hain."
                : "OFF: Standard Default Server API key use ho rahi hai."}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={developerModeActive}
          aria-label="Toggle Zoya Developer Mode"
          onClick={handleToggleDeveloperMode}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
            developerModeActive ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              developerModeActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Developer Care Mode & Collapsible Developer Console Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <HeartHandshake size={13} className="text-cyan-300 shrink-0" />
              <span className="truncate">Developer Care Mode</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
              {careEnabled
                ? "Active: Diagnostics & Care insights enabled"
                : "Off: Standard companion mode"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={careEnabled}
            aria-label="Toggle Developer Care Mode"
            onClick={() => onUpdateConfig({ developerCareEnabled: !careEnabled })}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
              careEnabled ? "bg-cyan-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                careEnabled ? "translate-x-4.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <LayoutPanelTop size={13} className="text-emerald-300 shrink-0" />
              <span className="truncate">Developer Console</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
              {!careEnabled
                ? "Requires Developer Care active"
                : consoleEnabled
                ? "Shown: Live API logs & latency HUD"
                : "Hidden from workspace"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={consoleEnabled && careEnabled}
            aria-label="Toggle Developer Console"
            onClick={() =>
              onUpdateConfig({
                developerConsoleEnabled: !consoleEnabled,
                developerCareEnabled: !consoleEnabled ? true : careEnabled,
              })
            }
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
              consoleEnabled && careEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                consoleEnabled && careEnabled ? "translate-x-4.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Server-Side Developer Key Environment Status (No Secret Exposure) */}
      <div className="p-2.5 rounded-xl bg-black/35 border border-white/10 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-200 min-w-0">
            <KeyRound
              size={14}
              className={
                health?.hasDeveloperApiKey ? "text-emerald-400 shrink-0" : "text-amber-400 shrink-0"
              }
            />
            <span className="truncate">
              Server Secret (<code className="text-cyan-300 font-mono">DEVELOPER_GEMINI_API_KEY</code>):{" "}
              <b className={health?.hasDeveloperApiKey ? "text-emerald-300" : "text-amber-300"}>
                {health?.hasDeveloperApiKey ? "Configured (Server-Only)" : "Managed in Server Secrets"}
              </b>
            </span>
          </div>

          <button
            type="button"
            onClick={runDeveloperKeyVerification}
            disabled={verifyingKey}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10.5px] font-semibold text-emerald-200 flex items-center gap-1 self-start sm:self-auto shrink-0 transition-colors"
          >
            <ShieldCheck size={11} className={verifyingKey ? "animate-pulse" : ""} />
            <span>{verifyingKey ? "Verifying..." : "Verify Developer Auth"}</span>
          </button>
        </div>

        {verifyState.message && (
          <div
            className={`text-[10.5px] px-2.5 py-1.5 rounded-lg border ${
              verifyState.verified
                ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-200"
                : "bg-rose-500/15 border-rose-400/35 text-rose-200"
            }`}
          >
            {verifyState.message}
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-snug">
          Security rule: API keys kabhi browser ya client code me store/expose nahi hoti. Server proxy routes (<code className="text-slate-300">/api/*</code> &amp; <code className="text-slate-300">/api/live</code>) automatically <code className="text-slate-300">DEVELOPER_GEMINI_API_KEY</code> env variable use karte hain.
        </p>
      </div>

      {/* Developer API Routing Selector + Developer Care Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleSelectApiSlot("developer")}
          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
            developerModeActive
              ? "bg-emerald-500/20 border-emerald-400/60 text-white"
              : "bg-black/35 border-white/10 text-slate-300 hover:bg-black/50"
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold flex items-center gap-1.5">
              <Wrench size={12} className="text-emerald-300 shrink-0" />
              <span className="truncate">Developer API Route</span>
            </div>
            <div className="text-[10px] text-emerald-200/80 truncate mt-0.5">
              {health?.hasDeveloperApiKey
                ? "Authenticated via Developer Key"
                : "Server Fallback Protected"}
            </div>
          </div>
          {developerModeActive && (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectApiSlot("default")}
          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
            !developerModeActive && (config.activeApiSlot || "developer") === "default"
              ? "bg-cyan-500/20 border-cyan-400/60 text-white"
              : "bg-black/35 border-white/10 text-slate-300 hover:bg-black/50"
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold flex items-center gap-1.5">
              <Sparkles size={12} className="text-cyan-300 shrink-0" />
              <span className="truncate">Default Studio Route</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Standard Server Runtime Key
            </div>
          </div>
          {!developerModeActive && (config.activeApiSlot || "developer") === "default" && (
            <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
          )}
        </button>
      </div>

      {/* Live Safe Diagnostics Strip */}
      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10.5px] text-slate-200 flex-wrap">
          <Activity
            size={13}
            className={
              diagError
                ? "text-rose-400"
                : health?.hasDeveloperApiKey
                ? "text-emerald-400"
                : "text-amber-400"
            }
          />
          {diagError ? (
            <span className="text-rose-300">Diagnostics: {diagError}</span>
          ) : health ? (
            <>
              <span className="font-semibold text-emerald-300">
                Server: Online
              </span>
              <span className="text-slate-500">•</span>
              <span>
                Developer Mode:{" "}
                <b className={developerModeActive ? "text-emerald-300" : "text-slate-400"}>
                  {developerModeActive ? "ON" : "OFF"}
                </b>
              </span>
              <span className="text-slate-500">•</span>
              <button
                type="button"
                onClick={() => onUpdateConfig({ developerCareEnabled: !careEnabled })}
                className="underline decoration-dotted hover:text-white"
              >
                Care Persona:{" "}
                <b className={careEnabled ? "text-cyan-300" : "text-slate-400"}>
                  {careEnabled ? "ON" : "OFF"}
                </b>
              </button>
            </>
          ) : (
            <span className="text-slate-400">Checking Developer Care status...</span>
          )}
        </div>

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={checkingHealth}
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10.5px] font-semibold text-white flex items-center gap-1 self-start sm:self-auto shrink-0 transition-colors"
        >
          <RefreshCw size={11} className={checkingHealth ? "animate-spin" : ""} />
          <span>{checkingHealth ? "Checking..." : "Run Diagnostics"}</span>
        </button>
      </div>

      {/* Official Developer Care & Support Links */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 border-t border-white/10">
        <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
          <Headphones size={13} className="text-pink-400 shrink-0" />
          <span>
            Developer Care &amp; Priority Updates by DEVID.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a
            href={
              config.userInstagram ||
              "https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <span>DEVID (@devid_jaat13)</span>
            <ExternalLink size={11} />
          </a>
          <a
            href={config.customerSupportInstagram || CUSTOMER_SUPPORT_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-md transition-all"
          >
            <span>Care: @haryanvi_jaat13_</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
