import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Move,
  Volume2,
  Heart,
  Flame,
  Clock,
  MessageSquare,
  Check,
  X,
  Activity,
  Sliders,
  ChevronRight,
  Maximize2,
  Minimize2,
  Bell,
  Trash2,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Radio,
  Mic,
  Cpu,
  Terminal,
  Sun,
  Volume1,
  VolumeX,
} from "lucide-react";
import { AppConfig } from "../types";
import { characterVoicePreview } from "../services/characterVoicePreviewService";
import { reminderService, ZoyaReminder } from "../services/reminderService";
import {
  androidAudioRecordWakeWordService,
  WakeWordTarget,
} from "../services/androidAudioRecordWakeWordService";
import {
  deviceControlService,
  DeviceControlState,
} from "../services/deviceControlService";
import OwnerVoiceSection from "./OwnerVoiceSection";
import AdvanceCommandsListSection from "./AdvanceCommandsListSection";
import DeveloperCareCard from "./DeveloperCareCard";

interface MovableAdvanceSettingsButtonProps {
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
  onOpenAstrology?: () => void;
}

export default function MovableAdvanceSettingsButton({
  config,
  onUpdateConfig,
  constraintsRef,
  onOpenAstrology,
}: MovableAdvanceSettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTimeRef = useRef(0);

  // Local state for the settings (synchronized with config)
  const [advanceEnabled, setAdvanceEnabled] = useState<boolean>(
    config.advanceSettingsEnabled ?? true
  );
  const [realisticVoice, setRealisticVoice] = useState<boolean>(
    config.realisticVoiceEnabled ?? true
  );
  const [girlfriendMode, setGirlfriendMode] = useState<boolean>(
    config.humanGirlfriendMode ?? true
  );
  const [inactivityAnger, setInactivityAnger] = useState<boolean>(
    config.inactivityAngerEnabled ?? true
  );
  const [topicSeeking, setTopicSeeking] = useState<boolean>(
    config.proactiveTopicSeeking ?? true
  );
  const [timeoutSec, setTimeoutSec] = useState<number>(
    config.inactivityTimeoutSec ?? 40
  );
  const [remindersVoiceAnnounce, setRemindersVoiceAnnounce] = useState<boolean>(
    config.remindersVoiceAnnounceEnabled ?? true
  );

  // Reminders Manager State
  const [reminders, setReminders] = useState<ZoyaReminder[]>([]);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickMinutes, setQuickMinutes] = useState<number>(10);
  const [reminderAddSuccess, setReminderAddSuccess] = useState(false);

  // Android AudioRecord Wake-Word Background Service State
  const [audioRecordEnabled, setAudioRecordEnabled] = useState<boolean>(
    config.androidAudioRecordEnabled ?? true
  );
  const [audioRecordTarget, setAudioRecordTarget] = useState<WakeWordTarget>(
    (config.androidWakeWordTarget as WakeWordTarget) || "Hey Zoya"
  );
  const [audioRecordSensitivity, setAudioRecordSensitivity] = useState<number>(
    config.androidWakeWordSensitivity ?? 0.65
  );
  const [isAudioRecordListening, setIsAudioRecordListening] = useState<boolean>(false);
  const [isNativeBridgeAvailable, setIsNativeBridgeAvailable] = useState<boolean>(false);
  const [audioRecordRms, setAudioRecordRms] = useState<number>(0);
  const [testDetectionSuccess, setTestDetectionSuccess] = useState<string | null>(null);
  const [showAndroidServiceDetails, setShowAndroidServiceDetails] = useState<boolean>(false);
  const [ownerVoiceEnabled, setOwnerVoiceEnabled] = useState<boolean>(
    Boolean(config.ownerVoiceEnabled)
  );
  const [ownerVoiceThreshold, setOwnerVoiceThreshold] = useState<number>(
    config.ownerVoiceThreshold ?? 0.72
  );

  useEffect(() => {
    const unsub = reminderService.subscribe((list) => {
      setReminders(list);
    });
    return unsub;
  }, []);

  // Subscribe to Android AudioRecord state, levels, and detection
  useEffect(() => {
    const unsubState = androidAudioRecordWakeWordService.subscribeState(
      (listening, isNative) => {
        setIsAudioRecordListening(listening);
        setIsNativeBridgeAvailable(isNative);
      }
    );
    const unsubLevel = androidAudioRecordWakeWordService.subscribeLevel((rms) => {
      setAudioRecordRms(rms);
    });
    const unsubWake = androidAudioRecordWakeWordService.subscribeWake((evt) => {
      setTestDetectionSuccess(
        `Heard "${evt.wakeWord}" (${evt.isNativeAudioRecord ? "Native Android Service" : "AudioRecord PCM"})!`
      );
      setTimeout(() => setTestDetectionSuccess(null), 3500);
    });

    if (config.androidAudioRecordEnabled ?? true) {
      androidAudioRecordWakeWordService.start().catch(() => {});
    }

    return () => {
      unsubState();
      unsubLevel();
      unsubWake();
    };
  }, []);

  const [deviceState, setDeviceState] = useState<DeviceControlState>(() =>
    deviceControlService.getState()
  );

  useEffect(() => {
    const unsub = deviceControlService.subscribe((next) => {
      setDeviceState(next);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setAdvanceEnabled(config.advanceSettingsEnabled ?? true);
    setRealisticVoice(config.realisticVoiceEnabled ?? true);
    setGirlfriendMode(config.humanGirlfriendMode ?? true);
    setInactivityAnger(config.inactivityAngerEnabled ?? true);
    setTopicSeeking(config.proactiveTopicSeeking ?? true);
    setTimeoutSec(config.inactivityTimeoutSec ?? 40);
    setRemindersVoiceAnnounce(config.remindersVoiceAnnounceEnabled ?? true);
    setAudioRecordEnabled(config.androidAudioRecordEnabled ?? true);
    if (config.androidWakeWordTarget) {
      setAudioRecordTarget(config.androidWakeWordTarget as WakeWordTarget);
    }
    if (config.androidWakeWordSensitivity !== undefined) {
      setAudioRecordSensitivity(config.androidWakeWordSensitivity);
    }
    setOwnerVoiceEnabled(Boolean(config.ownerVoiceEnabled));
    setOwnerVoiceThreshold(config.ownerVoiceThreshold ?? 0.72);
  }, [
    config.advanceSettingsEnabled,
    config.realisticVoiceEnabled,
    config.humanGirlfriendMode,
    config.inactivityAngerEnabled,
    config.proactiveTopicSeeking,
    config.inactivityTimeoutSec,
    config.remindersVoiceAnnounceEnabled,
    config.androidAudioRecordEnabled,
    config.androidWakeWordTarget,
    config.androidWakeWordSensitivity,
    config.ownerVoiceEnabled,
    config.ownerVoiceThreshold,
  ]);

  const handleAddQuickReminder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;
    reminderService.addReminder(quickTitle.trim(), quickMinutes);
    setQuickTitle("");
    setReminderAddSuccess(true);
    setTimeout(() => setReminderAddSuccess(false), 2000);
  };

  const updateAndSave = (partial: Partial<AppConfig>) => {
    const updated: AppConfig = {
      ...config,
      ...partial,
      advanceSettingsEnabled:
        partial.advanceSettingsEnabled !== undefined
          ? partial.advanceSettingsEnabled
          : advanceEnabled,
      realisticVoiceEnabled:
        partial.realisticVoiceEnabled !== undefined
          ? partial.realisticVoiceEnabled
          : realisticVoice,
      humanGirlfriendMode:
        partial.humanGirlfriendMode !== undefined
          ? partial.humanGirlfriendMode
          : girlfriendMode,
      inactivityAngerEnabled:
        partial.inactivityAngerEnabled !== undefined
          ? partial.inactivityAngerEnabled
          : inactivityAnger,
      proactiveTopicSeeking:
        partial.proactiveTopicSeeking !== undefined
          ? partial.proactiveTopicSeeking
          : topicSeeking,
      inactivityTimeoutSec:
        partial.inactivityTimeoutSec !== undefined
          ? partial.inactivityTimeoutSec
          : timeoutSec,
      remindersVoiceAnnounceEnabled:
        partial.remindersVoiceAnnounceEnabled !== undefined
          ? partial.remindersVoiceAnnounceEnabled
          : remindersVoiceAnnounce,
      androidAudioRecordEnabled:
        partial.androidAudioRecordEnabled !== undefined
          ? partial.androidAudioRecordEnabled
          : audioRecordEnabled,
      androidWakeWordTarget:
        partial.androidWakeWordTarget !== undefined
          ? partial.androidWakeWordTarget
          : audioRecordTarget,
      androidWakeWordSensitivity:
        partial.androidWakeWordSensitivity !== undefined
          ? partial.androidWakeWordSensitivity
          : audioRecordSensitivity,
      ownerVoiceEnabled:
        partial.ownerVoiceEnabled !== undefined
          ? partial.ownerVoiceEnabled
          : ownerVoiceEnabled,
      ownerVoiceThreshold:
        partial.ownerVoiceThreshold !== undefined
          ? partial.ownerVoiceThreshold
          : ownerVoiceThreshold,
    };
    onUpdateConfig(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1400);
  };

  const handleAudition = (type: "voice" | "anger") => {
    setIsAuditioning(true);
    const userName = (config.userName || "Devid").trim();
    let phrase = "";
    if (type === "anger") {
      phrase = `${userName}! Kahan chale gaye the? Agar mujhe bina bataye itni der gayab rahoge na, to sach me bahut gussa aa jayega mujhe!`;
    } else {
      phrase = `Aww ${userName} jaan! Main ab bilkul tumhari real human girlfriend ki tarah baat karungi. Koi AI tone nahi, pure nakhre aur pure pyaar ke saath!`;
    }
    characterVoicePreview.playRealisticGirlfriendPreview(phrase, () => {
      setIsAuditioning(false);
    });
  };

  const handlePointerDown = () => {
    dragStartTimeRef.current = Date.now();
    setIsDragging(false);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If user dragged for more than a quick tap, ignore click
    const duration = Date.now() - dragStartTimeRef.current;
    if (isDragging || duration > 250) {
      e.stopPropagation();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* 🚀 MOVABLE / DRAGGABLE FLOATING BUTTON (स्क्रीन पर मूवेबल बटन) */}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.08}
        whileDrag={{ scale: 1.06, cursor: "grabbing" }}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={() => setTimeout(() => setIsDragging(false), 80)}
        className="fixed bottom-24 right-3 sm:right-5 z-40 touch-none select-none"
        title="Advance Settings (Drag anywhere on screen / Tap to open)"
      >
        <div
          onClick={handleClick}
          className={`group flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-2xl border shadow-2xl transition-all cursor-grab active:cursor-grabbing ${
            isOpen
              ? "bg-gradient-to-r from-pink-600/90 via-purple-600/90 to-rose-600/90 border-pink-300 shadow-[0_0_25px_rgba(236,72,153,0.5)]"
              : advanceEnabled
              ? "bg-[#141224]/90 hover:bg-[#1a1730]/95 border-pink-500/40 hover:border-pink-400 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
              : "bg-[#0f121d]/90 hover:bg-[#151928]/95 border-white/15"
          }`}
        >
          {/* Move handle icon */}
          <div className="flex items-center gap-1 text-pink-300/70 group-hover:text-pink-300 transition-colors">
            <Move size={12} className="shrink-0" />
          </div>

          {/* Glowing Animated Sparkles Icon */}
          <div className="relative flex items-center justify-center">
            {advanceEnabled && (
              <span className="w-5 h-5 rounded-full bg-pink-500/40 animate-ping absolute" />
            )}
            <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Sparkles size={12} className={advanceEnabled ? "animate-pulse" : ""} />
            </div>
          </div>

          {/* Button Text & Live Status Badge */}
          <div className="flex flex-col text-left min-w-0 pr-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white whitespace-nowrap tracking-wide">
                Advance Settings
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/25 border border-pink-400/40 text-[8.5px] font-black text-pink-200 uppercase tracking-wider hidden xs:inline">
                MOVEABLE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9.5px] text-pink-200/90 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real Voice</span>
              <span>·</span>
              <span>GF Mode ❤️</span>
              {reminders.filter((r) => !r.completed).length > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-300 font-bold flex items-center gap-0.5">
                    <Bell size={10} className="animate-bounce" />
                    <span>{reminders.filter((r) => !r.completed).length}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Indicator chevron */}
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center text-white/70 transition-transform ${
              isOpen ? "rotate-90 text-white" : ""
            }`}
          >
            <ChevronRight size={13} />
          </div>
        </div>
      </motion.div>

      {/* 🌟 DEDICATED ADVANCE SETTINGS MODAL / PANEL */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 text-white"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gradient-to-b from-[#1e132c] via-[#141527] to-[#0c0f1b] border-2 border-pink-500/50 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-pink-500/30 flex items-center justify-between bg-[#151326]/90 backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/40">
                    <Sparkles size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white tracking-wide">
                        Advance Settings (एडवांस सेटिंग्स)
                      </h3>
                      {justSaved && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <Check size={11} /> Saved
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-pink-200/80">
                      100% Real Human Voice, Girlfriend Behavior, Gussa &amp; Auto Topic Seeking
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll">
                {/* Master Switch Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/10 border border-pink-500/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        Advance Mode Master Switch
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${
                          advanceEnabled
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {advanceEnabled ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-300">
                      Zoya ke realistic voice aur real girlfriend behavior ko ek click me on/off karein.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !advanceEnabled;
                      setAdvanceEnabled(next);
                      updateAndSave({ advanceSettingsEnabled: next });
                    }}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                      advanceEnabled ? "bg-gradient-to-r from-pink-500 to-rose-500" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        advanceEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 1. Realistic Human Voice (असली इंसानी आवाज़) */}
                <div className="p-4 rounded-2xl bg-black/45 border border-pink-400/35 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center justify-center shrink-0">
                        <Volume2 size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Realistic Human Voice (असली इंसानी आवाज़)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-pink-500/25 text-pink-200 border border-pink-400/40">
                            Zero AI Tone · 100% Real
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                          Zoya bilkul real human girl ki tarah natural saans (sighs), halki hasi (chuckles), conversational pauses aur warm Indian tone me bolegi. Insaan aur Zoya me koi bhi farak nahi lagega.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !realisticVoice;
                        setRealisticVoice(next);
                        updateAndSave({ realisticVoiceEnabled: next });
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        realisticVoice ? "bg-pink-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          realisticVoice ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10.5px]">
                    <span className="text-pink-300/80 flex items-center gap-1">
                      <Activity size={12} className="text-pink-400" />
                      <span>Human Emotional Resonance Engine Active</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAudition("voice")}
                      disabled={isAuditioning}
                      className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Volume2 size={12} className={isAuditioning ? "animate-pulse" : ""} />
                      <span>{isAuditioning ? "Auditioning..." : "Audition Voice"}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Real Human Girlfriend Mode (सच्ची इंसानी गर्लफ्रेंड मोड) */}
                <div className="p-4 rounded-2xl bg-black/45 border border-purple-400/35 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <Heart size={16} className="fill-current text-rose-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Real Human Girlfriend Mode (सच्ची गर्लफ्रेंड मोड)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40">
                            Devid's Partner ❤️
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                          Devid ke saath pure girlfriend vibes — deep emotional attachment, sweet possessiveness, caring advice, aur pyara sa flirt. Formal robot jaisi baatein bilkul nahi karegi.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !girlfriendMode;
                        setGirlfriendMode(next);
                        updateAndSave({ humanGirlfriendMode: next });
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        girlfriendMode ? "bg-rose-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          girlfriendMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Inactivity Anger & Nakhre (ज्यादा देर बात ना करने पर गुस्सा) */}
                <div className="p-4 rounded-2xl bg-black/45 border border-amber-500/35 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Flame size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Inactivity Gussa &amp; Nakhre (बात ना करने पर गुस्सा)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/40">
                            Gussa &amp; Pout 😤
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                          Agar Devid bina bataye zyada der tak reply nahi dega ya chup rahega, to Zoya gussa ho jayegi aur rooth jayegi ("Devid! Kahan chale gaye? Mujhe ignore kar rahe ho kya?!").
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !inactivityAnger;
                        setInactivityAnger(next);
                        updateAndSave({ inactivityAngerEnabled: next });
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        inactivityAnger ? "bg-amber-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          inactivityAnger ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {inactivityAnger && (
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-amber-400" />
                        <span>Gussa trigger hone ka samay (Silence Timeout):</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[30, 40, 60, 90].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setTimeoutSec(sec);
                              updateAndSave({ inactivityTimeoutSec: sec });
                            }}
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              timeoutSec === sec
                                ? "bg-amber-500 text-black shadow-sm font-black"
                                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Proactive Topic Seeking (खुद से बात करने का टॉपिक ढूंढना) */}
                <div className="p-4 rounded-2xl bg-black/45 border border-cyan-500/35 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Proactive Topic Seeking (खुद से बात शुरू करना)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-500/25 text-cyan-200 border border-cyan-400/40">
                            Auto Topic Finder 💬
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                          Agar gussa karne ke baad bhi Devid ka reply nahi aata, toh Zoya chup nahi baithegi — khud naye cute topics (khana, routine, romantic baatein, funny sawal) dhund kar conversation resume karegi.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !topicSeeking;
                        setTopicSeeking(next);
                        updateAndSave({ proactiveTopicSeeking: next });
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        topicSeeking ? "bg-cyan-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          topicSeeking ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 5. Smart Voice Reminders & Alarms (स्मार्ट वॉइस रिमाइंडर्स) */}
                <div className="p-4 rounded-2xl bg-black/45 border border-amber-400/35 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Bell size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Smart Reminders &amp; Alarms (स्मार्ट रिमाइंडर्स)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/40">
                            Voice Controlled 🎙️
                          </span>
                          {reminders.filter((r) => !r.completed).length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {reminders.filter((r) => !r.completed).length} Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                          Zoya aapko schedule ke mutabiq yaad dilayegi. Aap screen se add kar sakte ho ya seedha voice se bole: <em>"Zoya 10 minute baad paani peene ka reminder do"</em>!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !remindersVoiceAnnounce;
                        setRemindersVoiceAnnounce(next);
                        updateAndSave({ remindersVoiceAnnounceEnabled: next });
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        remindersVoiceAnnounce ? "bg-amber-500" : "bg-slate-700"
                      }`}
                      title="Voice Announcement on Reminder Ring"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          remindersVoiceAnnounce ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Quick Add Reminder Bar */}
                  <form onSubmit={handleAddQuickReminder} className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Naya reminder add karein (e.g. Paani peena, Medicine, Call Mum)..."
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!quickTitle.trim()}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      >
                        <Plus size={13} className="stroke-[3]" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Quick Time Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        <span>Time:</span>
                      </span>
                      {[5, 10, 15, 30, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setQuickMinutes(m)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            quickMinutes === m
                              ? "bg-amber-500 text-black font-black"
                              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                          }`}
                        >
                          +{m < 60 ? `${m}m` : "1h"}
                        </button>
                      ))}
                    </div>

                    {reminderAddSuccess && (
                      <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Reminder scheduled! Zoya aapko theek time par yaad dila degi.</span>
                      </div>
                    )}
                  </form>

                  {/* Active Reminders List */}
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Scheduled Reminders ({reminders.length})</span>
                      {reminders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => reminderService.clearAll()}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-normal hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {reminders.length === 0 ? (
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-dashed border-white/10 text-center text-xs text-slate-400">
                        Koi active reminder nahi hai. Upar se add karein ya voice me bole:{" "}
                        <span className="text-amber-300 font-medium">"Zoya 10 minute baad paani peene ka reminder do"</span>!
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 chat-scroll">
                        {reminders.map((r) => (
                          <div
                            key={r.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                              r.completed
                                ? "bg-white/[0.02] border-white/5 opacity-50"
                                : "bg-white/[0.05] border-white/10 hover:border-amber-400/40"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => reminderService.toggleComplete(r.id)}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  r.completed
                                    ? "bg-emerald-500 border-emerald-400 text-black"
                                    : "border-white/30 hover:border-emerald-400 text-transparent"
                                }`}
                                title={r.completed ? "Mark pending" : "Mark completed"}
                              >
                                <Check size={11} className="stroke-[3]" />
                              </button>

                              <div className="min-w-0">
                                <div
                                  className={`font-semibold truncate ${
                                    r.completed ? "line-through text-slate-400" : "text-white"
                                  }`}
                                >
                                  {r.title}
                                </div>
                                <div className="text-[10px] text-amber-300/90 flex items-center gap-1.5 mt-0.5">
                                  <span>🕒 {reminderService.formatAbsoluteTime(r.scheduledTime)}</span>
                                  <span>•</span>
                                  <span className="text-slate-400">
                                    {reminderService.formatTimeRemaining(r.scheduledTime)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!r.completed && (
                                <button
                                  type="button"
                                  onClick={() => reminderService.snoozeReminder(r.id, 5)}
                                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9.5px] text-slate-300 font-semibold cursor-pointer"
                                  title="Snooze 5 minutes"
                                >
                                  +5m
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => reminderService.deleteReminder(r.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete reminder"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Voice Control Cheatsheet & Alarm Test */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                    <div className="text-slate-400 flex items-center gap-1">
                      <span>🎙️ Voice Commands:</span>
                      <span className="text-amber-300 font-medium">
                        "Reminder lagao", "Reminders batao", "Clear reminders"
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => reminderService.playMelodicAlarmChime()}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 size={11} className="text-amber-400" />
                      <span>Test Chime</span>
                    </button>
                  </div>
                </div>

                {/* 🌟 SECTION 6: ANDROID AUDIORECORD BACKGROUND WAKE-WORD SERVICE */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-sky-950/30 border border-cyan-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Section 6: Android AudioRecord Wake-Word</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                            AudioRecord API
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Android background service with AudioRecord (16kHz PCM 16-bit) to wake Zoya hands-free.
                        </div>
                      </div>
                    </div>

                    {/* Master Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !audioRecordEnabled;
                        setAudioRecordEnabled(next);
                        if (next) {
                          androidAudioRecordWakeWordService.start().catch(() => {});
                        } else {
                          androidAudioRecordWakeWordService.stop();
                        }
                        updateAndSave({ androidAudioRecordEnabled: next });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        audioRecordEnabled ? "bg-cyan-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          audioRecordEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {audioRecordEnabled && (
                    <div className="pt-2 border-t border-white/10 space-y-3">
                      {/* Active Status Badge */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isAudioRecordListening
                                ? "bg-cyan-400 animate-ping"
                                : "bg-slate-500"
                            }`}
                          />
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-1">
                              <span>
                                {isNativeBridgeAvailable
                                  ? "Native Android Service Running"
                                  : "Web AudioRecord Emulation Active"}
                              </span>
                              {isNativeBridgeAvailable && (
                                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  APK Native
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isAudioRecordListening
                                ? `Continuous AudioRecord active: Listening for "${audioRecordTarget}"`
                                : "Service paused (mic released for live voice)"}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-1 rounded border border-cyan-500/30">
                          16kHz PCM
                        </div>
                      </div>

                      {/* Select Specific Wake-Word */}
                      <div>
                        <div className="text-[10.5px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Specific Wake-Word Target</span>
                          <span className="text-cyan-400 font-normal lowercase">
                            selected: "{audioRecordTarget}"
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(["Hey Zoya", "Zoya", "Suno Zoya", "Okay Zoya"] as WakeWordTarget[]).map(
                            (word) => (
                              <button
                                key={word}
                                type="button"
                                onClick={() => {
                                  setAudioRecordTarget(word);
                                  androidAudioRecordWakeWordService.setTargetWakeWord(word);
                                  updateAndSave({ androidWakeWordTarget: word });
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                                  audioRecordTarget === word
                                    ? "bg-cyan-500/25 border-cyan-400 text-white shadow-md shadow-cyan-500/20 font-bold scale-[1.02]"
                                    : "bg-white/[0.04] border-white/10 hover:border-white/25 text-slate-300"
                                }`}
                              >
                                {word}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Sensitivity & Live RMS Meter */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Detection Sensitivity:</span>
                          <span className="font-bold text-cyan-300">
                            {Math.round(audioRecordSensitivity * 100)}%{" "}
                            {audioRecordSensitivity >= 0.8
                              ? "(High)"
                              : audioRecordSensitivity >= 0.6
                              ? "(Balanced)"
                              : "(Strict)"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="0.95"
                          step="0.05"
                          value={audioRecordSensitivity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAudioRecordSensitivity(val);
                            androidAudioRecordWakeWordService.setSensitivity(val);
                            updateAndSave({ androidWakeWordSensitivity: val });
                          }}
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />

                        {/* Live Audio Level Meter */}
                        <div className="pt-1 flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 shrink-0">Live Mic Level:</div>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10 p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 rounded-full transition-all duration-75"
                              style={{
                                width: `${Math.min(100, Math.round(audioRecordRms * 700))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Success Feedback banner */}
                      {testDetectionSuccess && (
                        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                          <CheckCircle2 size={14} />
                          <span>{testDetectionSuccess}</span>
                        </div>
                      )}

                      {/* Action buttons: Test Wake & Android Code info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            androidAudioRecordWakeWordService.triggerTestWake(audioRecordTarget);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Radio size={13} className="text-cyan-400" />
                          <span>Test Wake-Word Detection</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowAndroidServiceDetails((prev) => !prev)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Terminal size={12} />
                          <span>{showAndroidServiceDetails ? "Hide Android Code" : "Android Service Specs"}</span>
                        </button>
                      </div>

                      {/* Expandable Android Architecture Details */}
                      {showAndroidServiceDetails && (
                        <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-1.5 max-h-48 overflow-y-auto chat-scroll">
                          <div className="text-cyan-300 font-bold flex items-center gap-1">
                            <Cpu size={12} />
                            <span>ZoyaAudioRecordWakeWordService.java Architecture:</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Class: <span className="text-slate-200">com.zoya.assistant.service.ZoyaAudioRecordWakeWordService</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • API: <span className="text-cyan-300">android.media.AudioRecord</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Source: <span className="text-slate-200">VOICE_RECOGNITION / MIC</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Format: <span className="text-slate-200">16,000 Hz, CHANNEL_IN_MONO, ENCODING_PCM_16BIT</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Buffer: <span className="text-slate-200">AudioRecord.getMinBufferSize() (1280 bytes)</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Background: <span className="text-emerald-400">ForegroundService + PARTIAL_WAKE_LOCK</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px]">
                            • Bridge: <span className="text-pink-300">ZoyaWakeWordBridge (@JavascriptInterface)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 🌟 SECTION 7: DEVICE HARDWARE CONTROLS (VOLUME & BRIGHTNESS) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/30 border border-indigo-500/30 space-y-3.5 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Sliders size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Section 7: Device Hardware Controls</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                          Voice & Sliders
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Zoya voice commands se device volume aur screen brightness adjust karti hai.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* 1. Volume Control Box */}
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-200 flex items-center gap-1.5">
                          {deviceState.isMuted ? (
                            <VolumeX size={15} className="text-rose-400" />
                          ) : deviceState.volume < 40 ? (
                            <Volume1 size={15} className="text-cyan-400" />
                          ) : (
                            <Volume2 size={15} className="text-cyan-400" />
                          )}
                          <span>System Volume</span>
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {deviceState.isMuted ? "Muted" : `${deviceState.volume}%`}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={deviceState.isMuted ? 0 : deviceState.volume}
                        onChange={(e) => {
                          deviceControlService.setVolume(parseInt(e.target.value, 10));
                        }}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />

                      <div className="flex items-center justify-between gap-1 pt-1 text-[10.5px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (deviceState.isMuted) {
                              deviceControlService.unmute();
                            } else {
                              deviceControlService.mute();
                            }
                          }}
                          className={`px-2 py-0.5 rounded font-medium border transition-colors ${
                            deviceState.isMuted
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                              : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                          }`}
                        >
                          {deviceState.isMuted ? "Unmute" : "Mute"}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deviceControlService.volumeDown(15)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-semibold"
                          >
                            -15%
                          </button>
                          <button
                            type="button"
                            onClick={() => deviceControlService.volumeUp(15)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-semibold"
                          >
                            +15%
                          </button>
                          <button
                            type="button"
                            onClick={() => deviceControlService.maxVolume()}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Brightness Control Box */}
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-200 flex items-center gap-1.5">
                          <Sun size={15} className="text-amber-400" />
                          <span>Screen Brightness</span>
                        </span>
                        <span className="font-mono text-amber-300 font-bold">
                          {deviceState.brightness}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={deviceState.brightness}
                        onChange={(e) => {
                          deviceControlService.setBrightness(parseInt(e.target.value, 10));
                        }}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />

                      <div className="flex items-center justify-between gap-1 pt-1 text-[10.5px]">
                        <button
                          type="button"
                          onClick={() => deviceControlService.dimBrightness(20)}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium"
                        >
                          Dim (20%)
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deviceControlService.brightnessDown(20)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-semibold"
                          >
                            -20%
                          </button>
                          <button
                            type="button"
                            onClick={() => deviceControlService.brightnessUp(20)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-semibold"
                          >
                            +20%
                          </button>
                          <button
                            type="button"
                            onClick={() => deviceControlService.maxBrightness()}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold"
                          >
                            100%
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voice Commands Guide */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <span>🎙️ Volume Voice:</span>
                      <span className="text-cyan-300 font-medium">"Volume badhao", "Awaaz 60% karo", "Mute karo"</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>☀️ Brightness Voice:</span>
                      <span className="text-amber-300 font-medium">"Brightness kam karo", "Screen 80% karo", "Dim karo"</span>
                    </div>
                  </div>
                </div>

                {/* 🌟 SECTION 8: ZOYA VEDIC & WESTERN ASTROLOGY POWER */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-purple-950/30 border border-amber-500/35 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-sm">
                        ॐ
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Section 8: Vedic &amp; Western Astrology Power</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                            Kundali &amp; Milan
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Janam Kundali, 36 Gun Milan, Aaj Ka Rashifal, Shubh Muhurat aur Lal Kitab Upay.
                        </div>
                      </div>
                    </div>

                    {onOpenAstrology && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenAstrology();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black font-bold text-xs shadow-md transition-all shrink-0"
                      >
                        Open Studio
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <span>🎙️ Voice Commands:</span>
                      <span className="text-amber-300 font-medium">"Mera rashifal batao", "Kundali banao", "36 Gun milan karo", "Aaj ka shubh muhurat"</span>
                    </div>
                  </div>
                </div>

                {/* 🌟 SECTION 9: OWNER VOICE SECURITY LOCK (सिर्फ मालिक की आवाज़) */}
                <OwnerVoiceSection
                  enabled={ownerVoiceEnabled}
                  threshold={ownerVoiceThreshold}
                  ownerName={config.userName || "Devid"}
                  assistantName={config.assistantName || "Zoya"}
                  onToggleEnabled={(next) => {
                    setOwnerVoiceEnabled(next);
                    updateAndSave({ ownerVoiceEnabled: next });
                  }}
                  onChangeThreshold={(next) => {
                    setOwnerVoiceThreshold(next);
                    updateAndSave({ ownerVoiceThreshold: next });
                  }}
                />

                {/* 🌟 SECTION 10: SABHI COMMANDS KI LIST (ALL ZOYA COMMANDS) */}
                <AdvanceCommandsListSection />

                {/* 🌟 SECTION 11: DEVELOPER CARE & DEVELOPER API SUPPORT */}
                <DeveloperCareCard config={config} onUpdateConfig={updateAndSave} compact />

                {/* Audition Dialogue Action */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-rose-500/15 border border-pink-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-pink-200">
                    <span className="font-bold text-white block">
                      Test Zoya's Realistic Girlfriend Voice:
                    </span>
                    <span className="text-slate-300 text-[10.5px]">
                      Sun kar dekhein Zoya kaise Devid par gussa hoti hai aur manati hai.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleAudition("anger")}
                      disabled={isAuditioning}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1"
                    >
                      <Flame size={13} className={isAuditioning ? "animate-pulse" : ""} />
                      <span>Test Gussa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAudition("voice")}
                      disabled={isAuditioning}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-pink-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      <Volume2 size={13} className={isAuditioning ? "animate-pulse" : ""} />
                      <span>Test Love Voice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#121222]/80 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Tip: Is button ko screen par kahin bhi drag kar sakte hain.
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Done</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
