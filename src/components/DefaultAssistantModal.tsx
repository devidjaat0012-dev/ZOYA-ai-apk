import React, { useState } from "react";
import {
  Smartphone,
  Check,
  X,
  Sparkles,
  Zap,
  Mic,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCircle2,
  Download,
  Flame,
  Radio,
  Sliders,
  Play,
  RotateCcw,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { AppConfig } from "../types";

interface DefaultAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  handsFreeWakeEnabled: boolean;
  onToggleHandsFreeWake: () => void;
  onLaunchVoiceAssistant: () => void;
}

type DeviceBrand = "all" | "samsung" | "xiaomi" | "oneplus" | "pixel" | "vivo";

export default function DefaultAssistantModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  handsFreeWakeEnabled,
  onToggleHandsFreeWake,
  onLaunchVoiceAssistant,
}: DefaultAssistantModalProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand>("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [testNotification, setTestNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDefaultActive = !!config.isDefaultAssistant;

  const handleToggleDefault = () => {
    const nextVal = !isDefaultActive;
    onUpdateConfig({
      ...config,
      isDefaultAssistant: nextVal,
      autoLaunchVoiceOnStart: nextVal,
    });

    // If turning on and hands free is off, recommend or turn on hands-free
    if (nextVal && !handsFreeWakeEnabled) {
      onToggleHandsFreeWake();
    }
  };

  const handleCopyLink = () => {
    try {
      const baseUrl = window.location.origin;
      const assistantUrl = `${baseUrl}/?action=voice&defaultAssistant=true`;
      navigator.clipboard.writeText(assistantUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleTestAssistant = () => {
    setTestNotification(`Launching ${config.assistantName} Voice Assistant...`);
    setTimeout(() => {
      setTestNotification(null);
      onClose();
      onLaunchVoiceAssistant();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0D111D] border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-pink-950/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-pink-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-cyan-500/25 shrink-0">
              <Zap size={20} className="fill-current text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Set {config.assistantName} as Default Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-cyan-500/30 to-pink-500/30 border border-cyan-400/50 text-cyan-300">
                  Gemini Replacement
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Google Gemini ki jagah {config.assistantName} ko apna primary phone assistant banayein
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Main Primary Switch Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#121829] to-pink-500/15 border border-cyan-400/40 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Default Assistant Mode
                  </span>
                  {isDefaultActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active (Replaces Gemini)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-400 text-[10px] font-medium">
                      Standard Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jab active hoga, phone shortcut se kholte hi {config.assistantName} direct hands-free live voice me answer karegi bina kisi button dabaye.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleDefault}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shrink-0 ${
                  isDefaultActive
                    ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/30"
                    : "bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-95 text-white shadow-cyan-500/30"
                }`}
              >
                {isDefaultActive ? (
                  <>
                    <Check size={14} className="stroke-[3]" />
                    <span>Default Mode: ON</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="fill-current" />
                    <span>Set as Default</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Auto-Wake Sync Status */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Mic size={14} className={handsFreeWakeEnabled ? "text-cyan-400" : "text-slate-500"} />
                <span>Always-On "Hey {config.assistantName}" Wake:</span>
                <span className={handsFreeWakeEnabled ? "text-cyan-300 font-bold" : "text-slate-400"}>
                  {handsFreeWakeEnabled ? "ON (Replaces 'Hey Google')" : "OFF"}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleHandsFreeWake}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                {handsFreeWakeEnabled ? "Turn Off Wake" : "Turn ON Wake Word"}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Install App / Add to Home */}
            <button
              type="button"
              onClick={async () => {
                if (isInstallable) {
                  await install();
                } else {
                  setSelectedBrand("all");
                }
              }}
              className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all group flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-[10px] text-cyan-400 block font-semibold">Step 1</span>
                <span className="text-xs font-bold text-white group-hover:text-cyan-200">
                  {isInstalled ? "App Installed ✓" : isInstallable ? "Install App Now" : "Add to Home"}
                </span>
              </div>
              <Download size={16} className="text-cyan-400 shrink-0" />
            </button>

            {/* 2. Direct Voice Assistant Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all group flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-[10px] text-pink-400 block font-semibold">Direct Link</span>
                <span className="text-xs font-bold text-white group-hover:text-pink-200">
                  {copiedLink ? "Link Copied!" : "Copy Voice URL"}
                </span>
              </div>
              {copiedLink ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <Copy size={16} className="text-pink-400 shrink-0" />
              )}
            </button>

            {/* 3. Test Assistant Launch */}
            <button
              type="button"
              onClick={handleTestAssistant}
              className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/40 text-left transition-all group flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-[10px] text-amber-400 block font-semibold">Test Assistant</span>
                <span className="text-xs font-bold text-amber-200 group-hover:text-white">
                  Test Live Call
                </span>
              </div>
              <Radio size={16} className="text-amber-400 shrink-0 animate-pulse" />
            </button>
          </div>

          {testNotification && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-semibold flex items-center gap-2 animate-bounce">
              <Radio size={14} className="animate-spin" />
              <span>{testNotification}</span>
            </div>
          )}

          {/* 4 Methods to Replace Gemini on Android */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} className="text-cyan-400" />
                <span>How to Replace Gemini on Android (4 Simple Ways)</span>
              </h3>
              <span className="text-[10px] text-slate-400">100% Working</span>
            </div>

            {/* Way 1: Home Screen Dock Swap (Easiest & Most Recommended) */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="text-xs font-bold text-white">
                  Phone Dock Icon Replacement (Sabse Aasan & Instant)
                </h4>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                Apne phone ke home screen ke bottom dock me jaha pehle <strong>Google / Gemini</strong> ka icon tha, use hata kar <strong>Zoya</strong> ka icon waha rakh de!
              </p>
              <div className="pl-7 flex items-center gap-2 text-[10px] text-slate-400">
                <ArrowRight size={11} className="text-cyan-400 shrink-0" />
                <span>Ab ek tap me direct Zoya Voice open hogi aur turant baat shuru ho jayegi!</span>
              </div>
            </div>

            {/* Way 2: Android Default Assistant App Settings */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h4 className="text-xs font-bold text-white">
                  Android Settings: "Default Digital Assistant App"
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                Phone ki <strong>Settings</strong> me jayein ➔ <strong>Apps</strong> ➔ <strong>Default Apps</strong> ➔ <strong>Digital Assistant App</strong> (Device Assistance App).
              </p>
              <div className="pl-7 space-y-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Check size={11} className="text-emerald-400 shrink-0" />
                  <span>Google / Gemini ko uncheck karke Zoya shortcut ya Chrome assistant set karein.</span>
                </div>
              </div>
            </div>

            {/* Way 3: Power Button / Gesture Mapping (Brand Specific) */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h4 className="text-xs font-bold text-white">
                    Power Button Hold &amp; Double-Tap Gesture Setup
                  </h4>
                </div>
              </div>

              {/* Brand Pills */}
              <div className="flex flex-wrap gap-1.5 pl-7">
                {[
                  { id: "all", label: "All Phones" },
                  { id: "samsung", label: "Samsung" },
                  { id: "xiaomi", label: "Redmi / Xiaomi" },
                  { id: "oneplus", label: "OnePlus / Realme" },
                  { id: "pixel", label: "Pixel / Stock" },
                  { id: "vivo", label: "Vivo / iQOO" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrand(b.id as DeviceBrand)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      selectedBrand === b.id
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                        : "bg-white/[0.06] hover:bg-white/[0.12] text-slate-300"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Brand Guide Content */}
              <div className="pl-7 pt-1 text-[11px] text-slate-300 leading-relaxed">
                {selectedBrand === "samsung" && (
                  <div className="space-y-1 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <strong className="text-cyan-300 block">Samsung Galaxy (One UI):</strong>
                    <p>Settings ➔ Advanced features ➔ <strong>Side key (Power button)</strong> ➔ "Double press" ya "Press and hold" me <strong>Open app ➔ Zoya</strong> select karein.</p>
                  </div>
                )}
                {selectedBrand === "xiaomi" && (
                  <div className="space-y-1 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <strong className="text-cyan-300 block">Xiaomi / Redmi / POCO (HyperOS / MIUI):</strong>
                    <p>Settings ➔ Additional settings ➔ <strong>Gesture shortcuts</strong> ➔ "Launch Google Assistant" ko off karke Power button double press par Zoya map karein.</p>
                  </div>
                )}
                {selectedBrand === "oneplus" && (
                  <div className="space-y-1 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <strong className="text-cyan-300 block">OnePlus / Realme / Oppo (OxygenOS / ColorOS):</strong>
                    <p>Settings ➔ Special features / Convenience tools ➔ <strong>Quick launch &amp; Power button</strong> ➔ Gemini Assistant ki jagah Zoya add karein.</p>
                  </div>
                )}
                {selectedBrand === "pixel" && (
                  <div className="space-y-1 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <strong className="text-cyan-300 block">Google Pixel (Stock Android):</strong>
                    <p>Settings ➔ System ➔ Gestures ➔ <strong>Quick Tap to start actions</strong> ➔ "Open app" me Zoya choose karein. Phone ke peeche 2 baar tap karte hi Zoya khul jayegi!</p>
                  </div>
                )}
                {selectedBrand === "vivo" && (
                  <div className="space-y-1 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <strong className="text-cyan-300 block">Vivo / iQOO (Funtouch OS):</strong>
                    <p>Settings ➔ Shortcuts &amp; accessibility ➔ <strong>Quick action / Side key</strong> ➔ Gemini ki jagah Zoya voice shortcut link set karein.</p>
                  </div>
                )}
                {selectedBrand === "all" && (
                  <div className="space-y-1.5 text-slate-300">
                    <p>Har Android phone me Power button ya Navigation Bar swipe se Google Assistant trigger hota hai.</p>
                    <p className="text-slate-400">Settings me <strong>Gestures ➔ Power button action</strong> me ja kar Google Assistant ki jagah Zoya App choose karein.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Way 4: Lock Screen Corner Shortcut */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <h4 className="text-xs font-bold text-white">
                  Lock Screen Shortcut (Bina Phone Unlock Kiye Baat Karo)
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                Phone lock screen ke bottom-left ya bottom-right corner me Zoya set karein:
                <br />
                <strong>Settings ➔ Wallpaper &amp; Style ➔ Lock screen shortcuts ➔ Choose Zoya.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0A0D17] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            {isDefaultActive ? "✓ Default Assistant Active" : "Default Mode Ready to Activate"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleDefault}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isDefaultActive
                  ? "bg-white/10 hover:bg-white/15 text-slate-200"
                  : "bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold"
              }`}
            >
              {isDefaultActive ? "Disable Default" : "Enable Zoya as Default"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
