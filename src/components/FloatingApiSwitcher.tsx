import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Move,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ApiSlotId,
  AppConfig,
  CHAT_MODEL_OPTIONS,
  LIVE_MODEL_OPTIONS,
  SavedApiKeys,
} from "../types";

interface FloatingApiSwitcherProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  hasError: boolean;
  onClearError?: () => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
}

const API_SLOTS: { id: ApiSlotId; label: string; shortLabel: string }[] = [
  { id: "developer", label: "Developer API (DEVID + Care)", shortLabel: "Developer API" },
  { id: "default", label: "Default AI Studio API", shortLabel: "Default API" },
  { id: "key1", label: "Custom API Key 1", shortLabel: "API Key 1" },
  { id: "key2", label: "Backup API Key 2", shortLabel: "API Key 2" },
  { id: "key3", label: "Backup API Key 3", shortLabel: "API Key 3" },
];

export default function FloatingApiSwitcher({
  config,
  onUpdateConfig,
  hasError,
  onClearError,
  constraintsRef,
}: FloatingApiSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeSlot: ApiSlotId =
    config.activeApiSlot || (config.apiKey ? "key1" : "developer");

  const savedKeys: SavedApiKeys = config.savedApiKeys || {
    key1: config.apiKey || "",
    key2: "",
    key3: "",
  };

  const [editingKeys, setEditingKeys] = useState<SavedApiKeys>(savedKeys);
  const [justSwitched, setJustSwitched] = useState(false);

  useEffect(() => {
    setEditingKeys(
      config.savedApiKeys || {
        key1: config.apiKey || "",
        key2: "",
        key3: "",
      }
    );
  }, [config.savedApiKeys, config.apiKey]);

  // Automatically highlight when an API error occurs
  const activeSlotObj =
    API_SLOTS.find((s) => s.id === activeSlot) || API_SLOTS[0];

  const handleSelectSlot = (slot: ApiSlotId) => {
    const nextKeys: SavedApiKeys = {
      key1: editingKeys.key1.trim(),
      key2: editingKeys.key2.trim(),
      key3: editingKeys.key3.trim(),
    };

    const resolvedCustomKey =
      slot === "key1"
        ? nextKeys.key1
        : slot === "key2"
        ? nextKeys.key2
        : slot === "key3"
        ? nextKeys.key3
        : "";

    onUpdateConfig({
      ...config,
      activeApiSlot: slot,
      savedApiKeys: nextKeys,
      apiKey: slot === "default" || slot === "developer" ? "" : resolvedCustomKey,
      developerModeEnabled: slot === "developer",
      developerCareEnabled: slot === "developer" ? true : config.developerCareEnabled,
    });
    onClearError?.();
    setJustSwitched(true);
    setTimeout(() => setJustSwitched(false), 1600);
  };

  const handleSaveKeyInput = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSlot: ApiSlotId =
      activeSlot === "default" || activeSlot === "developer" ? "key1" : activeSlot;
    handleSelectSlot(targetSlot);
  };

  const handleChangeChatModel = (modelId: string) => {
    onUpdateConfig({
      ...config,
      chatModel: modelId,
    });
    onClearError?.();
    setJustSwitched(true);
    setTimeout(() => setJustSwitched(false), 1600);
  };

  const handleChangeLiveModel = (modelId: string) => {
    onUpdateConfig({
      ...config,
      liveModel: modelId,
    });
    onClearError?.();
    setJustSwitched(true);
    setTimeout(() => setJustSwitched(false), 1600);
  };

  const handleToggleAutoFailover = () => {
    onUpdateConfig({
      ...config,
      autoFailoverApi: config.autoFailoverApi === false ? true : false,
    });
  };

  const handleOpenAiStudioSelector = async () => {
    try {
      const win = window as any;
      if (win.aistudio?.openSelectKey) {
        await win.aistudio.openSelectKey();
        handleSelectSlot("default");
      }
    } catch (e) {
      console.warn("Could not open AI Studio key selector:", e);
    }
  };

  const activeKeyForEditing =
    activeSlot === "key2"
      ? editingKeys.key2
      : activeSlot === "key3"
      ? editingKeys.key3
      : editingKeys.key1;

  const setActiveKeyForEditing = (val: string) => {
    if (activeSlot === "key2") {
      setEditingKeys((prev) => ({ ...prev, key2: val }));
    } else if (activeSlot === "key3") {
      setEditingKeys((prev) => ({ ...prev, key3: val }));
    } else {
      setEditingKeys((prev) => ({ ...prev, key1: val }));
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{ scale: 1.03 }}
      className="fixed bottom-20 left-3 sm:left-5 z-40 touch-none select-none"
    >
      {/* Collapsed / Header Draggable Pill */}
      <div
        className={`rounded-2xl backdrop-blur-xl border shadow-2xl transition-colors ${
          hasError
            ? "bg-rose-950/95 border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.35)]"
            : "bg-[#0E1320]/95 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 min-w-0">
            <Move size={13} className="text-slate-400 shrink-0" />
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasError
                  ? "bg-rose-400 animate-ping"
                  : justSwitched
                  ? "bg-cyan-400 animate-ping"
                  : "bg-emerald-400"
              }`}
            />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-left min-w-0"
            >
              <Key
                size={13}
                className={hasError ? "text-rose-300" : "text-pink-400"}
              />
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                {hasError ? "Switch API" : activeSlotObj.shortLabel}
              </span>
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono">
                {(config.chatModel || "gemini-4-hydrogen")
                  .replace("gemini-", "")
                  .replace("-preview", "")}
              </span>
            </button>
          </div>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
            title={isExpanded ? "Minimize API Switcher" : "Open Gemini API Switcher"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Expanded Movable Gemini API & Model Switcher Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-76 sm:w-84 border-t border-white/10 p-3.5 space-y-3 text-white overflow-hidden cursor-default"
            >
              {/* Status / Failover Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                  <Sparkles size={13} />
                  <span>Gemini API Switcher (Movable)</span>
                </div>
                {justSwitched && (
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Check size={11} /> Switched!
                  </span>
                )}
              </div>

              {hasError && (
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-300 shrink-0" />
                  <span>
                    API error or quota reached! Switch API key slot or model below.
                  </span>
                </div>
              )}

              {/* 1. API Key Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                  1. Select Active API Key Slot
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {API_SLOTS.map((slot) => {
                    const isSelected = activeSlot === slot.id;
                    const hasSavedKey =
                      slot.id === "default" || slot.id === "developer"
                        ? true
                        : Boolean(savedKeys[slot.id as keyof SavedApiKeys]?.trim());

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSelectSlot(slot.id)}
                        className={`px-2.5 py-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-1 ${
                          slot.id === "developer" ? "col-span-2" : ""
                        } ${
                          isSelected
                            ? slot.id === "developer"
                              ? "bg-emerald-500/20 border-emerald-400/60 text-white font-semibold"
                              : "bg-pink-500/20 border-pink-500/60 text-white font-semibold"
                            : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        <span className="truncate">{slot.shortLabel}</span>
                        {isSelected ? (
                          <Check
                            size={12}
                            className={slot.id === "developer" ? "text-emerald-400 shrink-0" : "text-pink-400 shrink-0"}
                          />
                        ) : (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              hasSavedKey ? "bg-emerald-400/70" : "bg-slate-600"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {activeSlot === "developer" && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-[10.5px] text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-300 shrink-0" />
                    <span>Developer Care &amp; Server Developer API active (auto-failover enabled)</span>
                  </div>
                )}
              </div>

              {/* Quick Paste / Update API Key Input */}
              <form onSubmit={handleSaveKeyInput} className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
                  <span>
                    {activeSlot === "default" || activeSlot === "developer"
                      ? "Or Paste Custom Key (Slot 1)"
                      : `Paste Key for ${activeSlotObj.shortLabel}`}
                  </span>
                  {typeof window !== "undefined" &&
                    (window as any).aistudio?.openSelectKey && (
                      <button
                        type="button"
                        onClick={handleOpenAiStudioSelector}
                        className="text-cyan-400 hover:underline text-[10px]"
                      >
                        AI Studio Key
                      </button>
                    )}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="password"
                    value={activeKeyForEditing}
                    onChange={(e) => setActiveKeyForEditing(e.target.value)}
                    placeholder="AIzaSy... paste backup Gemini key"
                    className="flex-1 bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-pink-500 min-w-0"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-xs font-semibold hover:opacity-95 transition-opacity shrink-0"
                  >
                    Apply
                  </button>
                </div>
              </form>

              {/* 2. Quick Gemini Model Switcher (Bypass per-model quota limits) */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
                  <Cpu size={11} className="text-cyan-400" />
                  <span>2. Switch Chat Model (If Quota Full)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHAT_MODEL_OPTIONS.map((m) => {
                    const isSelected =
                      (config.chatModel || "gemini-4-hydrogen") === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleChangeChatModel(m.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400/60 text-white"
                            : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="text-[11px] font-semibold truncate">
                          {m.label}
                        </div>
                        <div className="text-[9px] text-cyan-300/80 font-mono">
                          {m.tag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Live Voice Model Switcher */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                  3. Switch Live Voice Model
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {LIVE_MODEL_OPTIONS.map((m) => {
                    const isSelected =
                      (config.liveModel || "gemini-3.1-flash-live-preview") ===
                      m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleChangeLiveModel(m.id)}
                        className={`px-2 py-1.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "bg-pink-500/20 border-pink-400/60 text-white"
                            : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="text-[10px] font-semibold truncate">
                          {m.tag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Failover Toggle */}
              <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Auto-Switch on API Error</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoFailover}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    config.autoFailoverApi !== false
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  {config.autoFailoverApi !== false ? "ON" : "OFF"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
