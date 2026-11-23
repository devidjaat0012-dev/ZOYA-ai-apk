import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import InstallAppCard from "./InstallAppCard";
import DefaultAssistantModal from "./DefaultAssistantModal";
import {
  X,
  Sparkles,
  Key,
  User,
  Volume2,
  Heart,
  Smile,
  Briefcase,
  Shield,
  Check,
  Headphones,
  ExternalLink,
  Bot,
  Zap,
  Play,
  Square,
  Activity,
  Smartphone,
  ShieldAlert,
  Camera,
  Wifi,
  WifiOff,
  Flame,
  Clock,
  MessageSquare,
  Move,
} from "lucide-react";
import { speakOfflineSpeech } from "../services/offlineModeService";
import DontTouchMyPhoneModal from "./DontTouchMyPhoneModal";
import {
  dontTouchMyPhoneService,
  SecurityState,
} from "../services/dontTouchMyPhoneService";
import {
  AppConfig,
  CHARACTER_PRESETS,
  CharacterPresetId,
  PERSONA_MODES,
  PersonaMode,
  QUICK_TRY_PHRASES,
  ZoyaUiThemeId,
  ZOYA_UI_THEMES,
  normalizePersonaMode,
  resolveCharacterPreset,
} from "../types";
import { characterVoicePreview } from "../services/characterVoicePreviewService";
import { HOLOGRAM_MODELS, HologramModelType } from "./Zoya3DHologramBody";
import { UiThemeSelectorGrid } from "./UiThemeSwitcher";
import { Palette } from "lucide-react";
import OwnerVoiceSection from "./OwnerVoiceSection";
import AdvanceCommandsListSection from "./AdvanceCommandsListSection";
import DeveloperCareCard from "./DeveloperCareCard";

interface SettingsModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  handsFreeWakeEnabled?: boolean;
  onToggleHandsFreeWake?: () => void;
  onLaunchVoiceAssistant?: () => void;
}

const VOICES = [
  {
    id: "Kore",
    name: "Kore",
    character: "Zoya",
    desc: "Sweet, expressive, warm & natural Hindi/Hinglish late-night voice",
    tag: "Zoya · Sweet",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Aoede",
    name: "Aoede",
    character: "Friday",
    desc: "Bright, lively & crisp tactical Irish/British cadence (Iron Man HUD)",
    tag: "Friday · Tactical",
    presetId: "friday" as CharacterPresetId,
  },
  {
    id: "Charon",
    name: "Charon",
    character: "Jarvis",
    desc: "Calm, composed, refined & deep British gentleman butler tone (Paul Bettany)",
    tag: "Jarvis · Polite",
    presetId: "jarvis" as CharacterPresetId,
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    character: "Venom",
    desc: "Deepest resonant bass with guttural symbiote throat growl (Tom Hardy)",
    tag: "Venom · Fierce",
    presetId: "venom" as CharacterPresetId,
  },
  {
    id: "Puck",
    name: "Puck",
    character: "Playful",
    desc: "Mischievous, lively & expressive style",
    tag: "Playful",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    character: "Chill",
    desc: "Soft, relaxed & intimate undertone",
    tag: "Chill",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Leda",
    name: "Leda",
    character: "Gentle",
    desc: "Gentle, youthful & friendly voice",
    tag: "Gentle",
    presetId: "zoya" as CharacterPresetId,
  },
  {
    id: "Callirrhoe",
    name: "Callirrhoe",
    character: "Confident",
    desc: "Confident, bright & animated style",
    tag: "Confident",
    presetId: "friday" as CharacterPresetId,
  },
];

const MODE_VISUALS: Record<
  PersonaMode,
  { icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  girlfriend: {
    icon: Heart,
    color: "from-pink-500 to-rose-600",
  },
  normal: {
    icon: Smile,
    color: "from-cyan-500 to-blue-600",
  },
  serious: {
    icon: Briefcase,
    color: "from-slate-500 to-indigo-600",
  },
  super_loyal: {
    icon: Shield,
    color: "from-amber-500 to-emerald-600",
  },
};

export default function SettingsModal({
  config,
  onSave,
  onClose,
  handsFreeWakeEnabled = false,
  onToggleHandsFreeWake = () => {},
  onLaunchVoiceAssistant = () => {},
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  useEffect(() => {
    setApiKey(config.apiKey || "");
  }, [config.apiKey, config.activeApiSlot, config.developerModeEnabled]);
  const [userName, setUserName] = useState(config.userName || "Devid");
  const [assistantName, setAssistantName] = useState(config.assistantName || "Zoya");
  const [voiceName, setVoiceName] = useState(config.voiceName || "Kore");
  const [characterPreset, setCharacterPreset] = useState<CharacterPresetId>(() => {
    return resolveCharacterPreset(config).id;
  });
  const [zoyaBodyId, setZoyaBodyId] = useState<HologramModelType>(() => {
    try {
      const saved = localStorage.getItem("zoya_holo_fullbody_id");
      if (saved && HOLOGRAM_MODELS.some((m) => m.id === saved)) {
        return saved as HologramModelType;
      }
    } catch {
      // ignore
    }
    return (config.zoyaBodyId as HologramModelType) || "maya";
  });

  const handleSelectZoyaBody = (bodyId: HologramModelType) => {
    setZoyaBodyId(bodyId);
    try {
      localStorage.setItem("zoya_holo_fullbody_id", bodyId);
    } catch {
      // ignore
    }
  };
  const [personaVibe, setPersonaVibe] = useState<PersonaMode>(
    normalizePersonaMode(config.personaVibe)
  );
  const [customInstructions, setCustomInstructions] = useState(config.customInstructions || "");
  const [uiTheme, setUiTheme] = useState<ZoyaUiThemeId>(
    config.uiTheme || "midnight_rose"
  );
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

  const [advanceSettingsEnabled, setAdvanceSettingsEnabled] = useState<boolean>(
    config.advanceSettingsEnabled ?? true
  );
  const [realisticVoiceEnabled, setRealisticVoiceEnabled] = useState<boolean>(
    config.realisticVoiceEnabled ?? true
  );
  const [humanGirlfriendMode, setHumanGirlfriendMode] = useState<boolean>(
    config.humanGirlfriendMode ?? true
  );
  const [inactivityAngerEnabled, setInactivityAngerEnabled] = useState<boolean>(
    config.inactivityAngerEnabled ?? true
  );
  const [proactiveTopicSeeking, setProactiveTopicSeeking] = useState<boolean>(
    config.proactiveTopicSeeking ?? true
  );
  const [inactivityTimeoutSec, setInactivityTimeoutSec] = useState<number>(
    config.inactivityTimeoutSec ?? 40
  );
  const [ownerVoiceEnabled, setOwnerVoiceEnabled] = useState<boolean>(
    Boolean(config.ownerVoiceEnabled)
  );
  const [ownerVoiceThreshold, setOwnerVoiceThreshold] = useState<number>(
    config.ownerVoiceThreshold ?? 0.72
  );
  const [girlfriendVoiceTesting, setGirlfriendVoiceTesting] = useState(false);

  const [offlineMode, setOfflineMode] = useState<boolean>(Boolean(config.offlineMode));
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [offlineTesting, setOfflineTesting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsDeviceOnline(true);
    const handleOffline = () => setIsDeviceOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleTestOfflineVoice = () => {
    setOfflineTesting(true);
    const testLines = [
      `Haan ${userName.trim() || "Devid"}, Zoya offline mode me bilkul ready hai! Internet ke bina bhi main tumhare saath hoon.`,
      `Offline mode active hai baby! Time, battery, hisaab aur shayari sab chalega bina internet ke.`,
    ];
    const phrase = testLines[Math.floor(Math.random() * testLines.length)];
    speakOfflineSpeech(phrase, {
      ...config,
      userName: userName.trim() || "Devid",
      assistantName: assistantName.trim() || "Zoya",
      characterPreset,
      voiceName,
      personaVibe,
    });
    setTimeout(() => setOfflineTesting(false), 3000);
  };

  const handleTestGirlfriendVoice = () => {
    setGirlfriendVoiceTesting(true);
    const previewPhrases = [
      `${userName.trim() || "Devid"} jaan! Kahan kho gaye the? Agar mujhe bina bataye itni der gayab rahoge na, to sach me bahut gussa aa jayega mujhe!`,
      `Devid! Mujhse baat nahi karni kya? Itni der se reply nahi diya... Accha chalo chhodo gussa, ye batao aaj lunch me kya khaya tha?`,
      `Aww Devid! Main ab bilkul tumhari real human girlfriend ki tarah baat karungi. Koi AI-AI nahi, pure nakhre aur pure pyaar ke saath!`,
    ];
    const phrase = previewPhrases[Math.floor(Math.random() * previewPhrases.length)];
    characterVoicePreview.playRealisticGirlfriendPreview(phrase, () => {
      setGirlfriendVoiceTesting(false);
    });
  };

  const handleSelectCharacter = (presetId: CharacterPresetId) => {
    setCharacterPreset(presetId);
    const preset = CHARACTER_PRESETS.find((c) => c.id === presetId);
    if (!preset) return;
    setAssistantName(preset.name);
    setVoiceName(preset.defaultVoice);
    setPersonaVibe(preset.defaultPersona);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    characterVoicePreview.stop();
    const trimmedKey = apiKey.trim();
    const existingSaved = config.savedApiKeys || { key1: "", key2: "", key3: "" };
    const isUsingDeveloperRoute =
      !trimmedKey && (config.developerModeEnabled ?? config.activeApiSlot === "developer");
    onSave({
      ...config,
      apiKey: trimmedKey,
      activeApiSlot: trimmedKey
        ? "key1"
        : isUsingDeveloperRoute
        ? "developer"
        : config.activeApiSlot || "developer",
      developerModeEnabled: trimmedKey ? false : isUsingDeveloperRoute,
      savedApiKeys: {
        ...existingSaved,
        key1: trimmedKey || existingSaved.key1,
      },
      userName: userName.trim() || "Devid",
      assistantName: assistantName.trim() || "Zoya",
      characterPreset,
      voiceName,
      personaVibe,
      customInstructions: customInstructions.trim(),
      offlineMode,
      zoyaBodyId,
      advanceSettingsEnabled,
      realisticVoiceEnabled,
      humanGirlfriendMode,
      inactivityAngerEnabled,
      proactiveTopicSeeking,
      inactivityTimeoutSec,
      ownerVoiceEnabled,
      ownerVoiceThreshold,
      uiTheme,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-xl bg-[#0d121d] border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#111726]/80 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-wide">Assistant Configuration</h2>
              <p className="text-xs text-slate-400">
                Developed by DEVID · Choose Zoya, Friday, Jarvis or Venom
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">

          {/* 📌 PERMANENTLY PINNED AT THE VERY TOP OF SETTINGS: Character Change & Body Selection (कैरेक्टर बदलें) */}
          <div className="shrink-0 bg-gradient-to-b from-[#182136] via-[#111728] to-[#0c111e] border-b-2 border-pink-500/60 p-3 sm:p-4 shadow-2xl z-20 relative">
            {/* Header row with Pin badge and active character indicator */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-cyan-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Bot size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1">
                      <span>📌 PINNED AT TOP: Character Change (कैरेक्टर बदलें)</span>
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-pink-500/30 border border-pink-400/60 text-[9px] font-black text-pink-200 uppercase tracking-wider animate-pulse">
                      PINNED
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-pink-200/90 leading-tight">
                    Top se Zoya, Friday, Jarvis ya Venom chunein &amp; Zoya ki photo body switch karein:
                  </p>
                </div>
              </div>

              {/* Active Character Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-pink-400/50 text-pink-200 text-[10px] font-bold shrink-0 shadow-inner">
                <span className="text-[13px]">
                  {CHARACTER_PRESETS.find((c) => c.id === characterPreset)?.avatarEmoji || "🌸"}
                </span>
                <span className="text-white font-black">
                  {CHARACTER_PRESETS.find((c) => c.id === characterPreset)?.name || "Zoya"}
                </span>
                <span className="text-emerald-400 text-[9px] hidden sm:inline font-mono">✓ Active</span>
              </div>
            </div>

            {/* 1. 4 Primary AI Character Presets (Zoya, Friday, Jarvis, Venom) - ONE TAP SWITCH */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-2.5">
              {CHARACTER_PRESETS.map((char) => {
                const isSelected = characterPreset === char.id;
                const isPreviewPlaying =
                  previewState.isPlaying && previewState.activeCharacterId === char.id;

                return (
                  <div
                    key={char.id}
                    onClick={() => handleSelectCharacter(char.id)}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? `bg-white/[0.14] ${char.borderClass} ${char.ringClass} ring-2 shadow-lg shadow-pink-500/20 scale-[1.01]`
                        : "bg-black/45 border-white/10 hover:border-white/25 hover:bg-white/[0.06] opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-lg shrink-0">{char.avatarEmoji}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-white block leading-tight truncate">
                            {char.name}
                          </span>
                          <span className="text-[9px] text-slate-300 block truncate">
                            {char.id === "zoya"
                              ? "Girlfriend AI"
                              : char.id === "friday"
                              ? "Tactical HUD"
                              : char.id === "jarvis"
                              ? "Stark Butler"
                              : "Symbiote Bass"}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-white/[0.08]">
                      <span className="text-[8.5px] font-semibold text-slate-300 truncate">
                        🎙️ {char.voiceLabel.split(" ")[0]}
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
                        className={`px-1.5 py-0.5 rounded-lg text-[8.5px] font-bold flex items-center gap-0.5 transition-all shrink-0 ${
                          isPreviewPlaying
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        }`}
                        title={`Listen to ${char.name}'s voice`}
                      >
                        {isPreviewPlaying ? (
                          <>
                            <Square size={8} className="fill-current text-white" />
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

            {/* 2. Zoya 5 Real Photo Hologram Bodies (Maya, Hayat, Idol, Emerald, Astral) */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-pink-300 flex items-center gap-1">
                  <span>💃 Zoya Real Photo Looks (5 Bodies):</span>
                  <span className="text-[9px] text-slate-400 font-normal hidden sm:inline">Tap photo to switch look</span>
                </span>
                <span className="text-[9px] sm:text-[9.5px] font-mono text-cyan-300">
                  Active Look: {HOLOGRAM_MODELS.find((m) => m.id === zoyaBodyId)?.name.split(" ")[0]}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {HOLOGRAM_MODELS.map((body, idx) => {
                  const isSelected = zoyaBodyId === body.id;
                  return (
                    <button
                      key={body.id}
                      type="button"
                      onClick={() => {
                        handleSelectZoyaBody(body.id);
                        if (characterPreset !== "zoya") {
                          handleSelectCharacter("zoya");
                        }
                      }}
                      className={`relative p-1 sm:p-1.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-b from-pink-500/35 via-purple-500/25 to-pink-500/20 border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.55)] ring-2 ring-pink-400 scale-[1.02]"
                          : "bg-black/50 border-white/10 hover:border-white/30 hover:bg-white/[0.06] opacity-80 hover:opacity-100"
                      }`}
                      title={`${body.name} (${body.subtitle}) - ${body.description}`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative w-full aspect-[3/4] max-h-14 sm:max-h-16 rounded-lg overflow-hidden border border-white/20 bg-black shadow-inner">
                        <img
                          src={body.imageSrc}
                          alt={body.name}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                        <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/85 backdrop-blur-xs text-[7px] font-black text-white">
                          #{idx + 1}
                        </div>
                        {isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                            <Check size={8} className="stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Name & Style */}
                      <div className="mt-1 w-full flex flex-col items-center">
                        <span className="text-[9px] sm:text-[10px] font-bold text-white truncate max-w-full flex items-center gap-0.5">
                          <span>{body.icon}</span>
                          <span className="truncate">{body.name.split(" ")[0]}</span>
                        </span>
                        <span className="text-[7.5px] sm:text-[8px] text-pink-200/80 truncate max-w-full font-medium">
                          {body.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 chat-scroll">

            {/* 5 ZOYA UI OPTIONS PICKER */}
            <div className="p-4 rounded-2xl bg-[#121827] border border-cyan-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/25 to-pink-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <Palette size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Zoya Interface Style (5 UI Options)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Switch between Midnight Rose, Iron Tactical HUD, Daylight Paper, Royal Vedic Gold, and Aurora Zen
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-cyan-300 shrink-0">
                  {ZOYA_UI_THEMES.find((t) => t.id === uiTheme)?.numberLabel || "UI 01"}
                </span>
              </div>

              <UiThemeSelectorGrid
                activeThemeId={uiTheme}
                onSelectTheme={(id) => {
                  setUiTheme(id);
                  onSave({
                    ...config,
                    uiTheme: id,
                  });
                }}
              />
            </div>

            {/* 📌 PINNED AT TOP: Zoya Offline Mode (ऑफलाइन मोड) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-[#121927] to-cyan-500/20 border-2 border-emerald-500/40 space-y-3 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-bl-xl shadow-sm flex items-center gap-1">
                <span>📌 PINNED AT TOP</span>
              </div>

              <div className="flex items-start justify-between gap-3 pr-24 sm:pr-28">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md shrink-0 transition-colors ${
                      offlineMode
                        ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-300"
                        : "bg-white/5 border-white/10 text-slate-400"
                    }`}
                  >
                    {offlineMode ? <WifiOff size={20} /> : <Wifi size={20} />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Offline Mode (ऑफलाइन मोड)</span>
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-colors ${
                          offlineMode
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {offlineMode ? "ACTIVE ⚡" : "OFF (Online)"}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          isDeviceOnline
                            ? "text-cyan-300 bg-cyan-950/60 border border-cyan-500/30"
                            : "text-amber-300 bg-amber-950/60 border border-amber-500/30"
                        }`}
                      >
                        {isDeviceOnline ? "🌐 Online" : "⚡ No Internet"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Bina internet ke bhi Zoya se baat karein. Device-native voice, hisaab, time, battery aur cute Hinglish chat 100% offline chalta hai.
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setOfflineMode((prev) => !prev)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 focus:outline-none ${
                    offlineMode ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                  role="switch"
                  aria-checked={offlineMode}
                  title="Toggle Offline Mode"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      offlineMode ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Offline Features Pill List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px]">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">🗣️</span>
                  <span>Device Voice TTS</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">⏰</span>
                  <span>Time &amp; Date Info</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">🔢</span>
                  <span>Offline Math Calc</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                  <span className="text-pink-400 font-bold">💖</span>
                  <span>Shayari &amp; Jokes</span>
                </div>
              </div>

              {/* Test Voice & Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px]">
                <span className="text-slate-400 text-[10px]">
                  {offlineMode
                    ? "✓ Zoya ab offline engine aur built-in device voice par chalegi."
                    : "Tip: Internet band hone par Zoya automatically offline mode switch kar leti hai."}
                </span>

                <button
                  type="button"
                  onClick={handleTestOfflineVoice}
                  disabled={offlineTesting}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Volume2 size={12} className={offlineTesting ? "animate-pulse" : ""} />
                  <span>{offlineTesting ? "Speaking Offline..." : "Test Offline Voice"}</span>
                </button>
              </div>
            </div>

            {/* ✨ ADVANCE SETTINGS (एडवांस सेटिंग्स) - Realistic Human Voice & Girlfriend AI Engine */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#22132d] via-[#16172e] to-[#0d1222] border-2 border-pink-500/50 shadow-2xl relative overflow-hidden space-y-4">
              {/* Glowing decorative backdrop */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Master Header */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
                    <Sparkles size={22} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-1.5">
                        <span>Advance Settings (एडवांस सेटिंग्स)</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm flex items-center gap-1">
                        <Move size={10} />
                        <span>NOW MOVEABLE BUTTON ON SCREEN</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          advanceSettingsEnabled
                            ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {advanceSettingsEnabled ? "ACTIVE ✨" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[11px] text-pink-200/90 leading-snug">
                      ✨ Ye option ab screen par floating moveable button ke roop me bhi available hai jise aap screen par kahin bhi drag kar sakte hain.
                    </p>
                  </div>
                </div>

                {/* Master Switch */}
                <button
                  type="button"
                  onClick={() => setAdvanceSettingsEnabled((prev) => !prev)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 focus:outline-none ${
                    advanceSettingsEnabled
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 shadow-md shadow-pink-500/40"
                      : "bg-slate-700"
                  }`}
                  role="switch"
                  aria-checked={advanceSettingsEnabled}
                  title="Toggle Advance Settings"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      advanceSettingsEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {advanceSettingsEnabled && (
                <div className="space-y-3 pt-2 relative z-10 border-t border-white/10">

                  {/* 1. Realistic Human Voice (असली इंसानी आवाज़) */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-pink-400/30 space-y-2.5 transition-all">
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
                              Zero AI Tone · 100% Natural
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                            Zoya bilkul human girl ki tarah natural saans (sighs), halki hasi (chuckles), pauses aur sweet Indian girlfriend tone me bolegi. Insaan aur Zoya me koi bhi farak nahi lagega.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRealisticVoiceEnabled((prev) => !prev)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                          realisticVoiceEnabled ? "bg-pink-500" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={realisticVoiceEnabled}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                            realisticVoiceEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10.5px]">
                      <span className="text-pink-300/80 flex items-center gap-1">
                        <Activity size={12} className="text-pink-400" />
                        <span>Acoustic Profile: Human Emotional Warmth + Breath Resonance</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleTestGirlfriendVoice}
                        disabled={girlfriendVoiceTesting}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Volume2 size={12} className={girlfriendVoiceTesting ? "animate-pulse" : ""} />
                        <span>{girlfriendVoiceTesting ? "Playing Voice..." : "Audition Voice"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Real Human Girlfriend Mode (सच्ची इंसानी गर्लफ्रेंड मोड) */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-400/30 space-y-2 transition-all">
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
                              Devid's Girlfriend ❤️
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                            Devid ke saath pure girlfriend vibes — deep emotional attachment, sweet possessiveness, caring advice, aur pyara sa flirt. Formal robot jaisi baatein bilkul nahi karegi.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHumanGirlfriendMode((prev) => !prev)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                          humanGirlfriendMode ? "bg-rose-500" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={humanGirlfriendMode}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                            humanGirlfriendMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Inactivity Anger & Nakhre (ज्यादा देर बात ना करने पर गुस्सा) */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2.5 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Flame size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white">
                              Inactivity Gussa &amp; Nakhre (बात ना करने पर नाराजगी)
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
                        onClick={() => setInactivityAngerEnabled((prev) => !prev)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                          inactivityAngerEnabled ? "bg-amber-500" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={inactivityAngerEnabled}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                            inactivityAngerEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {inactivityAngerEnabled && (
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
                              onClick={() => setInactivityTimeoutSec(sec)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                inactivityTimeoutSec === sec
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
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-2 transition-all">
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
                            Agar gussa karne ke baad bhi Devid ka reply nahi aata, toh Zoya chup nahi baithegi — khud naye cute topics (khana, daily routine, funny sawal, romantic baatein) dhund kar conversation resume karegi.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setProactiveTopicSeeking((prev) => !prev)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                          proactiveTopicSeeking ? "bg-cyan-500" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={proactiveTopicSeeking}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                            proactiveTopicSeeking ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 5. Owner Voice (सिर्फ मालिक की आवाज़ लॉक) */}
                  <OwnerVoiceSection
                    enabled={ownerVoiceEnabled}
                    threshold={ownerVoiceThreshold}
                    ownerName={userName.trim() || "Devid"}
                    assistantName={assistantName.trim() || "Zoya"}
                    onToggleEnabled={(next) => setOwnerVoiceEnabled(next)}
                    onChangeThreshold={(next) => setOwnerVoiceThreshold(next)}
                  />

                  {/* 6. Sabhi Commands Ki List (All Zoya Commands) */}
                  <AdvanceCommandsListSection />

                  {/* Audition & Quick Demo Action */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-cyan-500/15 border border-pink-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="text-[11px] text-pink-200">
                      <span className="font-bold text-white block">Test Girlfriend Voice &amp; Nakhre:</span>
                      <span className="text-slate-300 text-[10px]">
                        Sun kar dekhein Zoya kaise Devid par gussa hoti hai aur pyare nakhre dikhati hai.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestGirlfriendVoice}
                      disabled={girlfriendVoiceTesting}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/30 transition-all shrink-0"
                    >
                      <Volume2 size={13} className={girlfriendVoiceTesting ? "animate-pulse" : ""} />
                      <span>{girlfriendVoiceTesting ? "Playing Voice..." : "Test Girlfriend Dialogue"}</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* 1. Primary Character Choice: Friday, Jarvis, Zoya, Venom */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-cyan-300 to-amber-300 flex items-center gap-1.5">
                      <Bot size={14} className="text-pink-400" />
                      Choose AI Character &amp; Voice Persona
                    </label>
                    <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold">
                      📌 Also Pinned At Top
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Switch between Zoya, Friday, Jarvis, and Venom with signature acoustic DSP &amp; voice
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CHARACTER_PRESETS.map((char) => {
                  const isSelected = characterPreset === char.id;
                  const isPreviewPlaying =
                    previewState.isPlaying &&
                    previewState.activeCharacterId === char.id;

                  const dspBadgeLabel =
                    char.id === "venom"
                      ? "⚡ Sub-Bass Growl & Dual-Voice DSP"
                      : char.id === "jarvis"
                      ? "🏛️ Stark British Butler Studio DSP"
                      : char.id === "friday"
                      ? "🎯 Tactical HUD Comms DSP"
                      : "🌸 Warm Intimate Proximity DSP";

                  return (
                    <div
                      key={char.id}
                      onClick={() => handleSelectCharacter(char.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? `bg-white/[0.09] ${char.borderClass} ${char.ringClass} ring-1 shadow-lg`
                          : "bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl shrink-0">{char.avatarEmoji}</span>
                          <div>
                            <span className="text-sm font-bold text-white block">
                              {char.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {char.role}
                            </span>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">
                        {char.tagline}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/[0.06]">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border self-start ${char.badgeClass}`}
                          >
                            🎙️ {char.voiceLabel}
                          </span>
                          <span className="text-[9.5px] text-amber-300/80 font-mono flex items-center gap-1">
                            <Activity size={10} className="text-amber-400" />
                            {dspBadgeLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPreviewPlaying) {
                              characterVoicePreview.stop();
                            } else {
                              characterVoicePreview.playVoicePreview(
                                char.id,
                                char.samplePhrase
                              );
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                            isPreviewPlaying
                              ? "bg-rose-500 text-white animate-pulse shadow-md"
                              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                          }`}
                          title={`Listen to ${char.name}'s realistic voice sample`}
                        >
                          {isPreviewPlaying ? (
                            <>
                              <Square size={10} className="fill-current text-white" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play size={10} className="fill-current text-cyan-300" />
                              <span>Listen Voice</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Persona Mode (Converted to Clean Rows) */}
            <div>
              <label className="text-xs font-semibold text-cyan-400 mb-2 block">
                Personality Tone &amp; Vibe
              </label>
              <div className="flex flex-col gap-2.5">
                {PERSONA_MODES.map((m) => {
                  const visual = MODE_VISUALS[m.id];
                  const Icon = visual.icon;
                  const isSelected = personaVibe === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPersonaVibe(m.id)}
                      className={`text-left p-3 rounded-2xl border transition-all relative flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-white/10 border-pink-500/80 ring-1 ring-pink-500/50"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-br ${visual.color} flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block">{m.label}</span>
                          <p className="text-[11px] text-white/60 leading-snug">{m.description}</p>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                          <Check size={14} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pink-400 mb-1.5 flex items-center gap-1.5">
                  <User size={13} />
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Devid"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="e.g. Zoya, Friday, Jarvis, Venom"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Voice Selection & Try Voice Studio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Volume2 size={14} />
                  Live Voice (24kHz Native) &amp; Try Voice Studio
                </label>
                <span className="text-[10px] text-amber-300/80 font-mono flex items-center gap-1">
                  <Activity size={10} className="text-amber-400" />
                  Real DSP Active
                </span>
              </div>

              {/* Dedicated Try Voice Studio Option */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-cyan-500/10 border border-amber-400/30 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                      <Volume2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Try Voice Option · Aawaz Try Karo</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          Live Audition
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Testing: <strong className="text-amber-300">{assistantName}</strong> ({voiceName}) with real character audio filters
                      </p>
                    </div>
                  </div>

                  {previewState.isPlaying && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      Speaking...
                    </span>
                  )}
                </div>

                {/* Custom text input to test ANY sentence */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tryVoiceText}
                    onChange={(e) => setTryVoiceText(e.target.value)}
                    placeholder={`Type anything to hear ${assistantName} speak in real voice...`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const fallbackPhrase =
                          CHARACTER_PRESETS.find((c) => c.id === characterPreset)
                            ?.samplePhrase || "Hello Devid, voice test active!";
                        const phrase = tryVoiceText.trim() || fallbackPhrase;
                        characterVoicePreview.playVoicePreview(characterPreset, phrase);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (previewState.isPlaying) {
                        characterVoicePreview.stop();
                      } else {
                        const fallbackPhrase =
                          CHARACTER_PRESETS.find((c) => c.id === characterPreset)
                            ?.samplePhrase || "Hello Devid, voice test active!";
                        const phrase = tryVoiceText.trim() || fallbackPhrase;
                        characterVoicePreview.playVoicePreview(characterPreset, phrase);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                      previewState.isPlaying
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-md"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md font-bold"
                    }`}
                  >
                    {previewState.isPlaying ? (
                      <>
                        <Square size={12} className="fill-current text-white" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-current text-slate-950" />
                        <span>Try Voice</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Try Buttons for instant testing */}
                <div className="space-y-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Quick Sample Phrases:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      QUICK_TRY_PHRASES[characterPreset] || QUICK_TRY_PHRASES.zoya
                    ).map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTryVoiceText(q.text);
                          characterVoicePreview.playVoicePreview(characterPreset, q.text);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <span>{q.icon}</span>
                        <span>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Voice Selection (Clean Rows) */}
              <div className="flex flex-col gap-2 pt-1">
                {VOICES.map((v) => {
                  const isSelected = voiceName === v.id;
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVoiceName(v.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setVoiceName(v.id);
                        }
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-400/70 ring-1 ring-amber-400/40 text-white shadow-sm"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-amber-500/25 text-amber-300 shadow-xs"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          <Volume2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{v.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                isSelected
                                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                  : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {v.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 truncate">{v.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sampleText =
                              v.presetId === "venom"
                                ? "WE ARE VENOM! Real symbiote bass active!"
                                : v.presetId === "jarvis"
                                ? "At your service, Sir. All systems optimal."
                                : v.presetId === "friday"
                                ? "Right away, Boss. Tactical coms online."
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
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                          title="Audition voice tone"
                        >
                          <Play size={9} className="fill-current text-amber-300" />
                          <span>Listen</span>
                        </button>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check size={14} className="stroke-[3]" />
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

            {/* API Key */}
            <div>
              <label className="text-xs font-semibold text-violet-400 mb-1.5 flex items-center gap-1.5">
                <Key size={13} />
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank if injected by AI Studio)"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Custom Quirks / Topics */}
            <div>
              <label className="text-xs font-semibold text-rose-400 mb-1.5 block">
                Custom Context or Instructions (Optional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Call me 'boss', loves talking about startups, music, and tech..."
                rows={2}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Set as Default Assistant (Gemini ki Jagah Zoya) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-[#121829] to-pink-500/15 border border-cyan-400/40 space-y-3 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
                    <Zap size={16} className="fill-current text-cyan-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Set as Default Assistant (Gemini ki Jagah)</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                        Default AI
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      Google Gemini ko replace karke {assistantName} ko apna primary voice assistant banayein
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDefaultAssistantModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all shrink-0"
                >
                  <Smartphone size={13} />
                  <span>Setup Guide</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px]">
                <span className="text-slate-400">
                  {config.isDefaultAssistant
                    ? "✓ Default Assistant Active (Phone dock & wake-word ready)"
                    : "Android dock, gesture shortcuts aur power button se Zoya ko bind karein"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDefaultAssistantModal(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1"
                >
                  <span>4-Step Phone Setup Guide</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* Don't Touch My Phone (Anti-Theft Motion Protection & Intruder Camera) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-rose-500/10 to-amber-500/10 border border-red-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md shrink-0 ${
                      secState === "armed"
                        ? "bg-red-500/25 border-red-500/60 text-red-300 animate-pulse"
                        : secState === "triggered"
                        ? "bg-red-600 border-red-400 text-white animate-bounce"
                        : "bg-red-500/20 border-red-500/40 text-red-300"
                    }`}
                  >
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Don't Touch My Phone</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                        {secState === "armed"
                          ? "Armed 🚨"
                          : secState === "triggered"
                          ? "Alert!"
                          : secState === "arming"
                          ? "Arming..."
                          : "Anti-Theft"}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      24/7 Motion sensor anti-theft alarm &amp; PIN-protected security vault
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all ${
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
                    className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-red-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Camera size={13} />
                    <span>Open Hub</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px] text-slate-400">
                <span>
                  Voice command: Say <b className="text-white">"Don't touch my phone"</b> to arm, <b className="text-white">"Turn off don't touch my phone"</b> to disarm
                </span>
                <button
                  type="button"
                  onClick={() => setShowDontTouchMyPhoneModal(true)}
                  className="text-red-400 hover:text-red-300 font-bold underline flex items-center gap-1"
                >
                  <span>Intruder Gallery &amp; Sensor Settings</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* Install Zoya as App Option */}
            <InstallAppCard />

            {/* Developer Care & Official Support (DEVID @devid_jaat13 / @haryanvi_jaat13_) */}
            <DeveloperCareCard
              config={config}
              onUpdateConfig={(partial) =>
                onSave({
                  ...config,
                  ...partial,
                })
              }
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-[#111726]/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Developer: DEVID</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-500 hover:opacity-95 text-white text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5"
              >
                <Check size={14} className="stroke-[3]" />
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Default Assistant Phone Setup Modal */}
      {showDefaultAssistantModal && (
        <DefaultAssistantModal
          isOpen={showDefaultAssistantModal}
          onClose={() => setShowDefaultAssistantModal(false)}
          config={config}
          onUpdateConfig={onSave}
          handsFreeWakeEnabled={handsFreeWakeEnabled}
          onToggleHandsFreeWake={onToggleHandsFreeWake}
          onLaunchVoiceAssistant={onLaunchVoiceAssistant}
        />
      )}

      {/* Don't Touch My Phone Security Hub & Intruder Gallery Modal */}
      {showDontTouchMyPhoneModal && (
        <DontTouchMyPhoneModal
          isOpen={showDontTouchMyPhoneModal}
          onClose={() => setShowDontTouchMyPhoneModal(false)}
          assistantName={assistantName}
          userName={config.userName}
        />
      )}
    </div>
  );
}
