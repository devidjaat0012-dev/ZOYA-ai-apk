import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mic,
  Plus,
  Search,
  Trash2,
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  Settings,
  LogIn,
  LogOut,
  User as UserIcon,
  Volume2,
  VolumeX,
  Sliders,
  Cloud,
  Loader2,
  Radio,
  Key,
  Check,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Headphones,
  ExternalLink,
  Heart,
  Smile,
  Briefcase,
  Shield,
  Bot,
  Play,
  Square,
  Activity,
  Zap,
  ShieldAlert,
  Camera,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import InstallAppCard from "./InstallAppCard";
import DefaultAssistantModal from "./DefaultAssistantModal";
import DontTouchMyPhoneModal from "./DontTouchMyPhoneModal";
import { UiThemeSelectorGrid } from "./UiThemeSwitcher";
import { ZoyaUiThemeId, ZOYA_UI_THEMES } from "../types";
import {
  dontTouchMyPhoneService,
  SecurityState,
} from "../services/dontTouchMyPhoneService";
import {
  ApiSlotId,
  AppConfig,
  CHARACTER_PRESETS,
  CharacterPresetId,
  CHAT_MODEL_OPTIONS,
  ChatThread,
  LIVE_MODEL_OPTIONS,
  MemoryItem,
  NANO_BANANA_MODELS,
  PERSONA_MODES,
  QUICK_TRY_PHRASES,
  SavedApiKeys,
  normalizePersonaMode,
  resolveCharacterPreset,
} from "../types";
import { characterVoicePreview } from "../services/characterVoicePreviewService";

const API_SLOTS: { id: ApiSlotId; label: string; shortLabel: string }[] = [
  { id: "developer", label: "Developer API (DEVID + Care)", shortLabel: "Developer API" },
  { id: "default", label: "Default AI Studio API", shortLabel: "Default API" },
  { id: "key1", label: "Custom API Key 1", shortLabel: "API Key 1" },
  { id: "key2", label: "Backup API Key 2", shortLabel: "API Key 2" },
  { id: "key3", label: "Backup API Key 3", shortLabel: "API Key 3" },
];

const VOICE_OPTIONS = [
  {
    id: "Kore",
    label: "Kore",
    tag: "Zoya · Sweet",
    desc: "Sweet, warm & natural Hindi/Hinglish tone",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Aoede",
    label: "Aoede",
    tag: "Friday · Tactical",
    desc: "Bright, lively & crisp tactical feminine cadence (Iron Man HUD)",
    presetId: "friday" as CharacterPresetId,
  },
  {
    id: "Charon",
    label: "Charon",
    tag: "Jarvis · Polite",
    desc: "Calm, steady & deep gentleman butler cadence (Paul Bettany)",
    presetId: "jarvis" as CharacterPresetId,
  },
  {
    id: "Fenrir",
    label: "Fenrir",
    tag: "Venom · Fierce",
    desc: "Bold, powerful & deep resonant bass cadence (Tom Hardy)",
    presetId: "venom" as CharacterPresetId,
  },
  {
    id: "Puck",
    label: "Puck",
    tag: "Playful",
    desc: "Mischievous & expressive",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Zephyr",
    label: "Zephyr",
    tag: "Chill",
    desc: "Soft, relaxed & intimate undertone",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Leda",
    label: "Leda",
    tag: "Sweet",
    desc: "Gentle & youthful cadence",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Callirrhoe",
    label: "Callirrhoe",
    tag: "Confident",
    desc: "Confident, bright & animated",
    presetId: "friday" as CharacterPresetId,
  },
];
import {
  clearAllSavedMemories,
  removeSavedMemoryById,
} from "../services/memoryService";
import { User } from "../firebase";

interface SavedChatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  activeThreadId: string;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onClearAllThreads?: () => void;
  memories: MemoryItem[];
  assistantName: string;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onOpenFullSettings: () => void;
  currentUser: User | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onManualCloudSync: () => Promise<void>;
  handsFreeWakeEnabled: boolean;
  onToggleHandsFreeWake: () => void;
  volume: number;
  isSpeakerMuted: boolean;
  onVolumeChange: (val: number) => void;
  onToggleSpeakerMute: () => void;
  hasError?: boolean;
  onClearError?: () => void;
}

export default function SavedChatsDrawer({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onClearAllThreads,
  memories,
  assistantName,
  config,
  onUpdateConfig,
  onOpenFullSettings,
  currentUser,
  isAuthLoading,
  isSyncingCloud,
  onGoogleLogin,
  onLogout,
  onManualCloudSync,
  handsFreeWakeEnabled,
  onToggleHandsFreeWake,
  volume,
  isSpeakerMuted,
  onVolumeChange,
  onToggleSpeakerMute,
  hasError,
  onClearError,
}: SavedChatsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "settings" | "chats" | "auto_memory"
  >("settings");
  const [authBusy, setAuthBusy] = useState(false);
  const [justSwitchedApi, setJustSwitchedApi] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const activeSlot: ApiSlotId =
    config.activeApiSlot || (config.apiKey ? "key1" : "developer");

  const savedKeys: SavedApiKeys = config.savedApiKeys || {
    key1: config.apiKey || "",
    key2: "",
    key3: "",
  };

  const [editingKeys, setEditingKeys] = useState<SavedApiKeys>(savedKeys);
  const [tryVoiceText, setTryVoiceText] = useState("");
  const [showDefaultAssistantModal, setShowDefaultAssistantModal] = useState(false);
  const [showDontTouchMyPhoneModal, setShowDontTouchMyPhoneModal] = useState(false);
  const [secState, setSecState] = useState<SecurityState>(() =>
    dontTouchMyPhoneService.getState()
  );
  useEffect(() => {
    return dontTouchMyPhoneService.subscribeState(setSecState);
  }, []);
  const [previewState, setPreviewState] = useState({
    isPlaying: false,
    activeCharacterId: null as CharacterPresetId | null,
  });

  useEffect(() => {
    const unsub = characterVoicePreview.subscribe(setPreviewState);
    return () => {
      unsub();
      characterVoicePreview.stop();
    };
  }, []);

  useEffect(() => {
    setEditingKeys(
      config.savedApiKeys || {
        key1: config.apiKey || "",
        key2: "",
        key3: "",
      }
    );
  }, [config.savedApiKeys, config.apiKey]);

  const activeSlotObj =
    API_SLOTS.find((s) => s.id === activeSlot) || API_SLOTS[0];

  const handleConfirmClearAll = () => {
    try {
      localStorage.removeItem("zoya_chat_threads_v2");
      localStorage.removeItem("zoya_chat_threads");
      localStorage.removeItem("zoya_chat_messages");
    } catch (e) {
      console.warn("Could not remove threads from localStorage:", e);
    }
    if (onClearAllThreads) {
      onClearAllThreads();
    } else {
      threads.forEach((t) => onDeleteThread(t.id));
      onNewThread();
    }
    setShowClearConfirmModal(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3200);
  };

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
    setJustSwitchedApi(true);
    setTimeout(() => setJustSwitchedApi(false), 1600);
  };

  const handleSaveKeyInput = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSlot: ApiSlotId =
      activeSlot === "default" || activeSlot === "developer" ? "key1" : activeSlot;
    handleSelectSlot(targetSlot);
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

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (t.title.toLowerCase().includes(q)) return true;
    return t.messages.some((m) => m.text.toLowerCase().includes(q));
  });

  const formatStartTime = (thread: ChatThread) => {
    try {
      const startTs =
        thread.startedAt ||
        thread.messages[0]?.timestamp ||
        thread.updatedAt;
      const d = new Date(startTs);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return "";
    }
  };

  const handleLoginClick = async () => {
    setAuthBusy(true);
    try {
      await onGoogleLogin();
    } catch {
      // handled by parent/modal
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogoutClick = async () => {
    setAuthBusy(true);
    try {
      await onLogout();
    } finally {
      setAuthBusy(false);
    }
  };

  const currentPersona = normalizePersonaMode(config.personaVibe);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
          />

          {/* Top-Left Settings, Saved Chats & Login Sidebar Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-80 sm:w-96 bg-[#0B0E17] border-r border-white/10 shadow-2xl flex flex-col select-none"
          >
            {/* Top Bar */}
            <div className="px-4 py-3.5 bg-[#0F1422] border-b border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500/25 to-cyan-500/25 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
                  <Settings size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Settings &amp; Saved Chats</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Login, Basic Settings &amp; Chat History
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close Settings Drawer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Navigation Tabs inside Top-Left Settings Drawer: Basic Settings | Saved Chats | Auto-Memory */}
            <div className="p-3 border-b border-white/[0.07] space-y-2.5 bg-[#0D111C]">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#080A10] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                    activeTab === "settings"
                      ? "bg-white/12 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Settings size={12} className="text-cyan-400 shrink-0" />
                  <span className="truncate">Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("chats")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                    activeTab === "chats"
                      ? "bg-pink-500/20 text-pink-200 border border-pink-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare size={12} className="text-pink-400 shrink-0" />
                  <span className="truncate">Saved ({threads.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("auto_memory")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                    activeTab === "auto_memory"
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={12} className="text-emerald-400 shrink-0" />
                  <span className="truncate">Memory ({memories.length})</span>
                </button>
              </div>

              {activeTab === "chats" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onNewThread();
                        onClose();
                      }}
                      className="flex-1 min-h-[38px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500/20 to-cyan-500/20 hover:from-pink-500/30 hover:to-cyan-500/30 border border-pink-500/30 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Plus size={15} className="text-pink-400" />
                      <span>New Chat / Session</span>
                    </button>

                    {threads.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowClearConfirmModal(true)}
                        className="min-h-[38px] px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                        title="Clear Entire Conversation History from localStorage"
                      >
                        <Trash2 size={14} className="text-rose-400" />
                        <span className="hidden sm:inline">Clear History</span>
                      </button>
                    )}
                  </div>

                  {/* Notification banner when history was cleared */}
                  <AnimatePresence>
                    {clearedNotice && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 shadow-lg"
                      >
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>All conversation history permanently removed from localStorage!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search saved chats & voice history..."
                      className="w-full bg-[#07090F] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scroll">
              {activeTab === "settings" ? (
                <div className="space-y-3.5">
                  {/* 📌 PINNED AT TOP: Zoya Offline Mode Card */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-[#121927] to-cyan-500/20 border-2 border-emerald-500/40 space-y-2.5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[8.5px] font-black uppercase tracking-wider rounded-bl-xl shadow-sm flex items-center gap-1">
                      <span>📌 PINNED AT TOP</span>
                    </div>

                    <div className="flex items-start justify-between gap-2.5 pr-20">
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-md shrink-0 transition-colors ${
                            config.offlineMode
                              ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-300"
                              : "bg-white/5 border-white/10 text-slate-400"
                          }`}
                        >
                          {config.offlineMode ? <WifiOff size={18} /> : <Wifi size={18} />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1">
                              <span>Offline Mode (ऑफलाइन मोड)</span>
                            </h4>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold border ${
                                config.offlineMode
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {config.offlineMode ? "ACTIVE ⚡" : "OFF"}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-300 leading-tight">
                            Bina internet ke time, battery, math, shayari aur device voice chat chalayein.
                          </p>
                        </div>
                      </div>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            ...config,
                            offlineMode: !config.offlineMode,
                          })
                        }
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 focus:outline-none ${
                          config.offlineMode ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={Boolean(config.offlineMode)}
                        title="Toggle Offline Mode"
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                            config.offlineMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9.5px] pt-0.5">
                      <div className="px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1">
                        <span>🗣️</span>
                        <span className="truncate">Device Voice TTS</span>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1">
                        <span>⏰</span>
                        <span className="truncate">Time, Math &amp; Battery</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Google Login & Account Section */}
                  <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UserIcon size={14} className="text-pink-400" />
                        <span>Account &amp; Login</span>
                      </span>
                      {currentUser && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                          Logged In
                        </span>
                      )}
                    </div>

                    {isAuthLoading ? (
                      <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 size={14} className="animate-spin text-cyan-400" />
                        <span>Checking account...</span>
                      </div>
                    ) : currentUser ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                          {currentUser.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt={currentUser.displayName || "Profile"}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400/70 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                              {(currentUser.displayName || "U")[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">
                              {currentUser.displayName || "Verified User"}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {currentUser.email}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isSyncingCloud}
                            onClick={onManualCloudSync}
                            className="py-2 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {isSyncingCloud ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Cloud size={12} />
                            )}
                            <span>Sync Cloud</span>
                          </button>
                          <button
                            type="button"
                            disabled={authBusy}
                            onClick={handleLogoutClick}
                            className="py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <LogOut size={12} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Sign in with Google to sync your profile, preferences,
                          and {assistantName}&apos;s memories across devices.
                        </p>
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handleLoginClick}
                          className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                        >
                          {authBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <LogIn size={14} className="text-pink-600" />
                          )}
                          <span>Login with Google</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Quick Access to Saved Chats inside Settings */}
                  <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-pink-400" />
                        <span>Saved Chats &amp; History</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 text-[10px] font-semibold">
                        {threads.length} Saved
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("chats")}
                        className="py-2 px-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 text-pink-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare size={13} />
                        <span>Open Saved Chats</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNewThread();
                          onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus size={13} className="text-cyan-400" />
                        <span>New Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Set as Default Assistant (Gemini ki Jagah Zoya) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#111624] to-pink-500/15 border border-cyan-400/40 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
                          <Zap size={14} className="fill-current text-cyan-300" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Default Assistant (Gemini Replacement)</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Gemini ki jagah Zoya ko primary assistant banayein
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          config.isDefaultAssistant
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-white/5 text-slate-400 border-white/10"
                        }`}
                      >
                        {config.isDefaultAssistant ? "Active" : "Standard"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !config.isDefaultAssistant;
                          onUpdateConfig({
                            ...config,
                            isDefaultAssistant: nextVal,
                            autoLaunchVoiceOnStart: nextVal,
                          });
                          if (nextVal && !handsFreeWakeEnabled) {
                            onToggleHandsFreeWake();
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          config.isDefaultAssistant
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : "bg-gradient-to-r from-cyan-500 to-pink-500 text-white"
                        }`}
                      >
                        <Zap size={13} className="fill-current" />
                        <span>{config.isDefaultAssistant ? "Default Mode: ON" : "Set as Default"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDefaultAssistantModal(true)}
                        className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cyan-300 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        Setup Guide
                      </button>
                    </div>
                  </div>

                  {/* Don't Touch My Phone (Anti-Theft Motion & Intruder Alarm) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-500/15 via-[#111624] to-rose-500/10 border border-red-500/30 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert size={14} className="text-red-400" />
                          <span className="text-xs font-bold text-white">
                            Don't Touch My Phone
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                            {secState === "armed"
                              ? "Armed 🚨"
                              : secState === "triggered"
                              ? "Alert!"
                              : secState === "arming"
                              ? "Arming..."
                              : "Anti-Theft"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-tight">
                          Phone touch karne ya hilane par turant high-decibel anti-theft alarm bajega aur perimeter lock hoga.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            secState === "armed" ||
                            secState === "arming" ||
                            secState === "triggered"
                          ) {
                            dontTouchMyPhoneService.disarm(false);
                          } else {
                            await dontTouchMyPhoneService.requestPermissions();
                            dontTouchMyPhoneService.arm();
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                          secState === "armed" || secState === "triggered"
                            ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                            : secState === "arming"
                            ? "bg-amber-600 text-white"
                            : "bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-white"
                        }`}
                      >
                        <Shield size={13} />
                        <span>
                          {secState === "armed" || secState === "triggered"
                            ? "Disarm Alarm"
                            : secState === "arming"
                            ? "Cancel"
                            : "Arm Security"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDontTouchMyPhoneModal(true)}
                        className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-red-300 hover:text-white text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        <Camera size={12} />
                        <span>Security Hub</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Install Zoya as an App & Android APK */}
                  <InstallAppCard />

                  {/* 3B. Zoya 5 UI Options (5 Interface Themes) */}
                  <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">
                          Zoya Interface Styles (5 UI Options)
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Choose from 5 distinct visual UIs · Instant switch
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                        {ZOYA_UI_THEMES.find((t) => t.id === (config.uiTheme || "midnight_rose"))?.numberLabel || "UI 01"}
                      </span>
                    </div>
                    <UiThemeSelectorGrid
                      activeThemeId={config.uiTheme}
                      compact
                      onSelectTheme={(themeId: ZoyaUiThemeId) => {
                        onUpdateConfig({
                          ...config,
                          uiTheme: themeId,
                        });
                      }}
                    />
                  </div>

                  {/* 4. Basic Settings: Names, Persona Mode, Voice, Wake Word & Audio */}
                  <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders size={14} className="text-cyan-400" />
                      <span>Basic Settings</span>
                    </div>

                    {/* Choose Character: Friday, Jarvis, Zoya, Venom */}
                    <div className="space-y-1.5 pb-2.5 border-b border-white/[0.08]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-cyan-300 to-amber-300 flex items-center gap-1.5">
                          <Bot size={13} className="text-pink-400" />
                          Choose AI Character &amp; Voice
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Switch between Zoya, Friday, Jarvis, and Venom
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {CHARACTER_PRESETS.map((char) => {
                          const activePreset = resolveCharacterPreset(config);
                          const isSelected = activePreset.id === char.id;
                          const isPreviewPlaying =
                            previewState.isPlaying &&
                            previewState.activeCharacterId === char.id;

                          return (
                            <div
                              key={char.id}
                              onClick={() => {
                                onUpdateConfig({
                                  ...config,
                                  assistantName: char.name,
                                  characterPreset: char.id,
                                  voiceName: char.defaultVoice,
                                  personaVibe: char.defaultPersona,
                                });
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? `bg-white/[0.08] ${char.borderClass} ${char.ringClass} ring-1 shadow-md`
                                  : "bg-[#080B12] border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-base shrink-0">{char.avatarEmoji}</span>
                                  <span className="text-xs font-bold text-white truncate">
                                    {char.name}
                                  </span>
                                </div>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white flex items-center justify-center shrink-0">
                                    <Check size={10} className="stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 line-clamp-1">{char.role}</p>

                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.06]">
                                <span className={`text-[8.5px] px-1.5 py-0.5 rounded border font-medium truncate ${char.badgeClass}`}>
                                  🎙️ {char.voiceLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPreviewPlaying) {
                                      characterVoicePreview.stop();
                                    } else {
                                      characterVoicePreview.playVoicePreview(char.id, char.samplePhrase);
                                    }
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                                    isPreviewPlaying
                                      ? "bg-rose-500 text-white animate-pulse"
                                      : "bg-white/10 hover:bg-white/20 text-white"
                                  }`}
                                  title={`Listen to ${char.name}'s voice`}
                                >
                                  {isPreviewPlaying ? (
                                    <>
                                      <Square size={8} className="fill-current" />
                                      <span>Stop</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={8} className="fill-current text-cyan-300" />
                                      <span>Listen</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Your Name & Assistant Name */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={config.userName}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              userName: e.target.value,
                            })
                          }
                          className="w-full bg-[#080B12] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Assistant Name
                        </label>
                        <input
                          type="text"
                          value={config.assistantName}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              assistantName: e.target.value,
                            })
                          }
                          className="w-full bg-[#080B12] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>

                    {/* Persona Mode (Converted to Clean Rows) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-400 font-medium">
                        {assistantName} Live Persona &amp; Personality Mode
                      </label>
                      <div className="flex flex-col gap-1.5">
                        {PERSONA_MODES.map((mode) => {
                          const selected = currentPersona === mode.id;
                          const ModeIcon =
                            mode.id === "girlfriend"
                              ? Heart
                              : mode.id === "normal"
                              ? Smile
                              : mode.id === "serious"
                              ? Briefcase
                              : Shield;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() =>
                                onUpdateConfig({
                                  ...config,
                                  personaVibe: mode.id,
                                })
                              }
                              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                                selected
                                  ? "bg-pink-500/20 border-pink-500/60 text-white shadow-sm ring-1 ring-pink-500/30"
                                  : "bg-[#080B12] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    selected
                                      ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-xs"
                                      : "bg-white/5 text-slate-400"
                                  }`}
                                >
                                  <ModeIcon size={14} />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-white block">
                                    {mode.label}
                                  </span>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {mode.tagline}
                                  </p>
                                </div>
                              </div>
                              {selected ? (
                                <div className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                                  <Check size={12} className="stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Voice Tone Options & Try Voice Studio */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] text-slate-400 font-medium">
                          Live Voice Tone (24kHz Native Cadence)
                        </label>
                        <span className="text-[9px] text-amber-300 font-mono flex items-center gap-1">
                          <Activity size={9} className="text-amber-400" />
                          Real DSP
                        </span>
                      </div>

                      {/* Dedicated Try Voice Studio Option */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-cyan-500/10 border border-amber-400/30 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                              <Volume2 size={13} />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                Try Voice Option · Aawaz Test
                              </span>
                              <p className="text-[9.5px] text-slate-400">
                                Testing: <strong className="text-amber-300">{assistantName}</strong> ({config.voiceName})
                              </p>
                            </div>
                          </div>

                          {previewState.isPlaying && (
                            <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                              Speaking...
                            </span>
                          )}
                        </div>

                        {/* Custom text input */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tryVoiceText}
                            onChange={(e) => setTryVoiceText(e.target.value)}
                            placeholder={`Type anything to test ${assistantName}'s voice...`}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const activePreset = resolveCharacterPreset(config);
                                const phrase = tryVoiceText.trim() || activePreset.samplePhrase;
                                characterVoicePreview.playVoicePreview(activePreset.id, phrase);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const activePreset = resolveCharacterPreset(config);
                              if (previewState.isPlaying) {
                                characterVoicePreview.stop();
                              } else {
                                const phrase = tryVoiceText.trim() || activePreset.samplePhrase;
                                characterVoicePreview.playVoicePreview(activePreset.id, phrase);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                              previewState.isPlaying
                                ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-bold"
                            }`}
                          >
                            {previewState.isPlaying ? (
                              <>
                                <Square size={10} className="fill-current text-white" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play size={10} className="fill-current text-slate-950" />
                                <span>Try Voice</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Quick phrase chips */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(
                            QUICK_TRY_PHRASES[resolveCharacterPreset(config).id] || QUICK_TRY_PHRASES.zoya
                          ).map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setTryVoiceText(q.text);
                                const activePreset = resolveCharacterPreset(config);
                                characterVoicePreview.playVoicePreview(activePreset.id, q.text);
                              }}
                              className="px-2 py-0.5 rounded-md text-[9px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1"
                            >
                              <span>{q.icon}</span>
                              <span>{q.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1">
                        {VOICE_OPTIONS.map((v) => {
                          const isSelected = config.voiceName === v.id;
                          return (
                            <div
                              key={v.id}
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                onUpdateConfig({
                                  ...config,
                                  voiceName: v.id as any,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onUpdateConfig({
                                    ...config,
                                    voiceName: v.id as any,
                                  });
                                }
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                                isSelected
                                  ? "bg-amber-500/15 border-amber-400/60 text-white shadow-sm ring-1 ring-amber-400/30"
                                  : "bg-[#080B12] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-amber-500/25 text-amber-300"
                                      : "bg-white/5 text-slate-400"
                                  }`}
                                >
                                  <Volume2 size={14} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">
                                      {v.label}
                                    </span>
                                    {v.tag && (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                          v.tag === "Recommended"
                                            ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                                            : "bg-white/10 text-cyan-300 font-mono"
                                        }`}
                                      >
                                        {v.tag}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {v.desc}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const sampleText =
                                      v.presetId === "venom"
                                        ? "WE ARE VENOM! Symbiote voice online!"
                                        : v.presetId === "jarvis"
                                        ? "At your service, Sir. Audio optimal."
                                        : v.presetId === "friday"
                                        ? "Right away, Boss. Tactical link ready."
                                        : "Arey Devid! Zoya ki voice ready hai.";
                                    if (
                                      previewState.isPlaying &&
                                      previewState.activeCharacterId === v.presetId
                                    ) {
                                      characterVoicePreview.stop();
                                    } else {
                                      characterVoicePreview.playVoicePreview(
                                        v.presetId,
                                        sampleText
                                      );
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                                  title="Listen voice sample"
                                >
                                  <Play size={8} className="fill-current text-amber-300" />
                                  <span>Listen</span>
                                </button>
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                    <Check size={12} className="stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hands-Free Wake Word Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Radio
                          size={14}
                          className={
                            handsFreeWakeEnabled
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }
                        />
                        <div>
                          <div className="text-xs font-medium text-white">
                            Hands-Free &quot;Hey {config.assistantName}&quot;
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Auto-wake Live Voice by voice command
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleHandsFreeWake}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          handsFreeWakeEnabled
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        {handsFreeWakeEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Speaker Volume */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={onToggleSpeakerMute}
                          className="flex items-center gap-1.5 text-slate-200 hover:text-white"
                        >
                          {isSpeakerMuted || volume === 0 ? (
                            <VolumeX size={14} className="text-rose-400" />
                          ) : (
                            <Volume2 size={14} className="text-cyan-400" />
                          )}
                          <span>Speaker Volume</span>
                        </button>
                        <span className="text-[11px] font-mono text-slate-400">
                          {Math.round((isSpeakerMuted ? 0 : volume) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isSpeakerMuted ? 0 : volume}
                        onChange={(e) =>
                          onVolumeChange(parseFloat(e.target.value))
                        }
                        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-pink-500"
                      />
                    </div>

                    {/* Open Full Advanced Settings Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFullSettings();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Settings size={13} className="text-pink-400" />
                      <span>Advanced Persona &amp; Instructions</span>
                    </button>
                  </div>

                  {/* 4. Gemini API Key & Model Switcher inside Settings */}
                  <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Key size={14} className="text-pink-400" />
                        <span>Gemini API Key &amp; Models</span>
                      </span>
                      {justSwitchedApi ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Check size={11} /> Saved!
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 text-[10px] font-mono">
                          {activeSlotObj.shortLabel}
                        </span>
                      )}
                    </div>

                    {hasError && (
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
                        <AlertTriangle
                          size={14}
                          className="text-rose-300 shrink-0"
                        />
                        <span>
                          API error or quota reached! Switch API key slot or
                          model below.
                        </span>
                      </div>
                    )}

                    {/* API Key Slot Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 block">
                        Select Active API Key Slot
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {API_SLOTS.map((slot) => {
                          const isSelected = activeSlot === slot.id;
                          const hasSavedKey =
                            slot.id === "default" || slot.id === "developer"
                              ? true
                              : Boolean(
                                  savedKeys[
                                    slot.id as keyof SavedApiKeys
                                  ]?.trim()
                                );

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
                                  : "bg-[#080B12] border-white/10 text-slate-300 hover:text-white"
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
                                    hasSavedKey
                                      ? "bg-emerald-400/70"
                                      : "bg-slate-600"
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {activeSlot === "developer" && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-[10.5px] text-emerald-200">
                          Developer Care Active (Server Developer API + auto-failover)
                        </div>
                      )}
                    </div>

                    {/* Paste Custom API Key */}
                    <form onSubmit={handleSaveKeyInput} className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 block">
                        {activeSlot === "default" || activeSlot === "developer"
                          ? "Paste Custom Gemini Key (Saves to API Key 1)"
                          : `Paste Key for ${activeSlotObj.shortLabel}`}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="password"
                          value={activeKeyForEditing}
                          onChange={(e) =>
                            setActiveKeyForEditing(e.target.value)
                          }
                          placeholder="AIzaSy... paste Gemini API key"
                          className="flex-1 bg-[#080B12] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-pink-500 min-w-0"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-xs font-semibold hover:opacity-95 transition-opacity shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </form>

                    {/* Switch Chat Model */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Cpu size={11} className="text-cyan-400" />
                        <span>Chat Model</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CHAT_MODEL_OPTIONS.map((m) => {
                          const isSelected =
                            (config.chatModel || "gemini-4-hydrogen") ===
                            m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onUpdateConfig({
                                  ...config,
                                  chatModel: m.id,
                                });
                                onClearError?.();
                                setJustSwitchedApi(true);
                                setTimeout(
                                  () => setJustSwitchedApi(false),
                                  1600
                                );
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "bg-cyan-500/20 border-cyan-400/60 text-white"
                                  : "bg-[#080B12] border-white/10 text-slate-300 hover:text-white"
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

                    {/* Switch Live Voice Model */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 block">
                        Live Voice Model
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {LIVE_MODEL_OPTIONS.map((m) => {
                          const isSelected =
                            (config.liveModel ||
                              "gemini-3.1-flash-live-preview") === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onUpdateConfig({
                                  ...config,
                                  liveModel: m.id,
                                });
                                onClearError?.();
                                setJustSwitchedApi(true);
                                setTimeout(
                                  () => setJustSwitchedApi(false),
                                  1600
                                );
                              }}
                              className={`px-2 py-1.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? "bg-pink-500/20 border-pink-400/60 text-white"
                                  : "bg-[#080B12] border-white/10 text-slate-300 hover:text-white"
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

                    {/* Google Nano Ironman AI Image Model */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                        <span>🦾</span>
                        <span>Google Nano Ironman Model (Art &amp; Photos)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {NANO_BANANA_MODELS.map((m) => {
                          const isSelected =
                            (config.nanoIronmanModel ||
                              config.nanoBananaModel ||
                              "gemini-3.1-flash-lite-image") === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onUpdateConfig({
                                  ...config,
                                  nanoIronmanModel: m.id,
                                  nanoBananaModel: m.id,
                                });
                                setJustSwitchedApi(true);
                                setTimeout(
                                  () => setJustSwitchedApi(false),
                                  1600
                                );
                              }}
                              className={`px-2 py-1.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? "bg-red-500/20 border-red-500/60 text-amber-200 shadow-sm"
                                  : "bg-[#080B12] border-white/10 text-slate-300 hover:text-white"
                              }`}
                              title={m.desc}
                            >
                              <div className="text-[10px] font-bold truncate">
                                {m.shortName}
                              </div>
                              <div className="text-[9px] text-amber-400/80 font-mono">
                                {m.resolution}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Auto-Failover Toggle */}
                    <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <ShieldCheck
                          size={14}
                          className="text-emerald-400 shrink-0"
                        />
                        <span>Auto-Switch on API Error</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            ...config,
                            autoFailoverApi:
                              config.autoFailoverApi === false ? true : false,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          config.autoFailoverApi !== false
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-white/5 text-slate-400 border border-white/10"
                        }`}
                      >
                        {config.autoFailoverApi !== false ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>

                  {/* 5. Customer Support & Help Center (Instagram @haryanvi_jaat13_) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/15 via-[#111624] to-amber-500/10 border border-pink-500/30 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Headphones size={14} className="text-pink-400" />
                        <span>Customer Support &amp; Help</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">
                        24/7 Support
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Need help with Zoya AI, API keys, or custom features? Message official support directly on Instagram:
                    </p>
                    <a
                      href={
                        config.customerSupportInstagram ||
                        "https://www.instagram.com/haryanvi_jaat13_?stkn=MTJpYjUzbGpxOGc1dw=="
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition-all"
                    >
                      <span>Customer Support · @haryanvi_jaat13_</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ) : activeTab === "chats" ? (
                filteredThreads.length === 0 ? (
                  <div className="py-12 px-4 text-center text-xs text-slate-500">
                    No matching saved chats found.
                  </div>
                ) : (
                  <>
                    {filteredThreads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const hasVoice = thread.messages.some(
                      (m) => m.source === "live_voice"
                    );
                    const lastMsg =
                      thread.messages[thread.messages.length - 1];

                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          onClose();
                        }}
                        className={`group relative rounded-2xl p-3 border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isActive
                            ? "bg-gradient-to-r from-pink-500/15 to-cyan-500/10 border-pink-500/40 text-white shadow-md"
                            : "bg-[#111624]/80 hover:bg-[#161D2F] border-white/[0.06] text-slate-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {hasVoice ? (
                              <Mic
                                size={13}
                                className="text-pink-400 shrink-0"
                              />
                            ) : (
                              <MessageSquare
                                size={13}
                                className={
                                  isActive
                                    ? "text-cyan-400 shrink-0"
                                    : "text-slate-400 shrink-0"
                                }
                              />
                            )}
                            <span className="text-xs sm:text-sm font-semibold truncate text-white">
                              {thread.title || "New conversation"}
                            </span>
                          </div>

                          {lastMsg ? (
                            <p className="text-[11px] text-slate-400 truncate mt-1">
                              {lastMsg.role === "user"
                                ? "You: "
                                : `${assistantName}: `}
                              {lastMsg.text}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic mt-1">
                              Empty conversation
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 text-cyan-300 font-medium">
                              <Clock size={10} className="text-cyan-400" />
                              Started: {formatStartTime(thread)}
                            </span>
                            <span>·</span>
                            <span>{thread.messages.length} msgs</span>
                            {hasVoice && (
                              <>
                                <span>·</span>
                                <span className="text-pink-400 font-medium">
                                  {thread.isCompletedLiveSession
                                    ? "✓ Live Session Saved"
                                    : "Voice + Chat"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                          className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all shrink-0"
                          title="Delete saved chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Prominent Clear Entire Conversation History Action */}
                  {threads.length > 0 && (
                    <div className="pt-2 pb-1 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirmModal(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                        title="Clear Entire Conversation History from localStorage"
                      >
                        <Trash2 size={14} className="text-rose-400" />
                        <span>Clear Entire Conversation History (पूरी हिस्ट्री मिटाएं)</span>
                      </button>
                    </div>
                  )}
                </>
              )) : (
                /* Automatic Memory View */
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 to-cyan-500/10 border border-pink-500/25 text-[11px] text-slate-300 leading-relaxed flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-pink-300 block mb-0.5">
                        100% Automatic Gemini Memory
                      </span>
                      Everything you share in <strong>Chat</strong> or{" "}
                      <strong>Live Voice</strong> is automatically remembered by{" "}
                      {assistantName}. No manual saving needed.
                    </div>
                    {memories.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllSavedMemories}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold shrink-0 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs text-slate-400 space-y-2">
                      <Sparkles
                        size={20}
                        className="mx-auto text-pink-400/70"
                      />
                      <p>
                        Just talk naturally with {assistantName} in Chat or Live
                        Voice—she will automatically remember important things
                        you tell her!
                      </p>
                    </div>
                  ) : (
                    memories.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#121827] border border-white/[0.07] flex items-start justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <CheckCircle2
                            size={14}
                            className="text-emerald-400 shrink-0 mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-100 leading-relaxed break-words">
                              {item.fact}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              {item.source === "live_voice" ? (
                                <span className="text-pink-400 flex items-center gap-1">
                                  <Mic size={10} /> Auto-saved from Live Voice
                                </span>
                              ) : (
                                <span className="text-cyan-400 flex items-center gap-1">
                                  <MessageSquare size={10} /> Auto-saved from
                                  Chat
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSavedMemoryById(item.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors shrink-0"
                          title="Forget this"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.aside>

          {/* Default Assistant Phone Setup Modal */}
          {showDefaultAssistantModal && (
            <DefaultAssistantModal
              isOpen={showDefaultAssistantModal}
              onClose={() => setShowDefaultAssistantModal(false)}
              config={config}
              onUpdateConfig={onUpdateConfig}
              handsFreeWakeEnabled={handsFreeWakeEnabled}
              onToggleHandsFreeWake={onToggleHandsFreeWake}
              onLaunchVoiceAssistant={() => {
                onClose();
              }}
            />
          )}

          {/* Confirmation Dialog for Permanent Removal of All Chat Threads */}
          <AnimatePresence>
            {showClearConfirmModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  className="w-full max-w-md bg-[#111624] border border-rose-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4"
                >
                  {/* Top Warning Glow Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
                      <Trash2 size={22} className="animate-pulse" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span>Clear Entire Conversation History?</span>
                      </h3>
                      <p className="text-xs text-rose-300 font-medium">
                        पूरी बातचीत और वॉइस हिस्ट्री हमेशा के लिए मिटाएं?
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirmModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Cancel"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Explanatory Body */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs text-slate-300 leading-relaxed">
                    <p>
                      This will permanently remove <strong>all {threads.length} saved conversation thread(s)</strong> and audio transcripts stored in your browser&apos;s <strong>localStorage</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      All cached chat records will be purged, and a brand-new clean conversation will be started.
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-300 font-semibold">
                      <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                      <span>Warning: This action is permanent and cannot be undone!</span>
                    </div>
                  </div>

                  {/* Action Buttons: Cancel vs Permanently Clear */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirmModal(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Cancel (रद्द करें)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClearAll}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Yes, Clear All (हाँ, सब हटाएं)</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
