import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  Settings,
  Mic,
  MicOff,
  LayoutGrid,
  MessageSquare,
  SlidersHorizontal,
  Sparkles,
  Code2,
  Globe,
  GraduationCap,
  Gamepad2,
  Youtube,
  Heart,
  TrendingUp,
  Shield,
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Send,
  X,
  Radio,
  Sun,
  Compass,
  Moon,
  ChevronRight,
  Power,
} from "lucide-react";
import {
  AppConfig,
  CharacterPresetId,
  CHARACTER_PRESETS,
  PERSONA_MODES,
  PersonaMode,
  SessionState,
  ZoyaUiThemeId,
  ZoyaUiThemeOption,
  normalizePersonaMode,
  resolveCharacterPreset,
} from "../types";
import { ZODIAC_SIGNS } from "../services/astrologyService";
import { HOLOGRAM_MODELS, HologramModelType } from "./Zoya3DHologramBody";
import UiThemeQuickPopover, { UiThemeSelectorGrid } from "./UiThemeSwitcher";
import AreaTemperaturePill from "./AreaTemperaturePill";
import { AngerLevel } from "../services/angerService";

export interface ZoyaFullUiStageProps {
  uiTheme: ZoyaUiThemeOption;
  config: AppConfig;
  sessionState: SessionState;
  audioLevel: number;
  frequencyData: number[];
  isMicMuted: boolean;
  isCameraActive: boolean;
  liveCaption: { role: "user" | "assistant"; text: string } | null;
  errorMessage: string | null;
  angerLevel: AngerLevel;
  handsFreeWakeEnabled: boolean;
  securityState: "disarmed" | "arming" | "armed" | "triggered";
  volume: number;
  isSpeakerMuted: boolean;
  onToggleVoiceSession: () => void;
  onToggleMicMute: () => void;
  onToggleCamera: () => void;
  onSelectUiTheme: (id: ZoyaUiThemeId) => void;
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
  onSwitchToChat: () => void;
  onSwitchToStudy: () => void;
  onOpenAstrologyStudio: () => void;
  onToggleAstrologyMode: (enabled: boolean, speakFeedback?: boolean) => void;
  onOpenCodeStudio: () => void;
  onOpenWebsiteBuilder: () => void;
  onOpenGameMode: () => void;
  onOpenYouTube: () => void;
  onOpenNanoIronman: () => void;
  onOpenNoiseFit: () => void;
  onOpenMoodTracker: () => void;
  onOpenDontTouchPhone: () => void;
  onOpenDefaultAssistant: () => void;
  onToggleHandsFreeWake: () => void;
  onVolumeChange: (val: number) => void;
  onToggleSpeakerMute: () => void;
  onSelectBodyId: (bodyId: HologramModelType) => void;
  onSwitchCharacterPreset: (presetId: CharacterPresetId) => void;
  onSelectPersonaMode: (mode: PersonaMode) => void;
  onSendQuickPrompt: (prompt: string) => void;
}

/** Real-time glowing HUD oscilloscope wave canvas reacting to audioLevel & frequencyData */
function LiveHudWaveformCanvas({
  audioLevel,
  frequencyData,
  sessionState,
  strokeHex,
  glowHex,
}: {
  audioLevel: number;
  frequencyData: number[];
  sessionState: SessionState;
  strokeHex: string;
  glowHex: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(audioLevel);
  const freqRef = useRef(frequencyData);
  const stateRef = useRef(sessionState);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    freqRef.current = frequencyData;
  }, [frequencyData]);

  useEffect(() => {
    stateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const curState = stateRef.current;
      const rawLvl = levelRef.current;
      const freqs = freqRef.current;
      const ampBase =
        curState === "speaking"
          ? Math.max(0.35, rawLvl * 1.15)
          : curState === "listening"
          ? Math.max(0.22, rawLvl * 0.95)
          : 0.14;

      phase += curState === "speaking" ? 0.14 : curState === "listening" ? 0.08 : 0.04;

      // Subtle center baseline
      ctx.strokeStyle = "rgba(148,163,184,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw symmetric HUD frequency pulses + dual sine ribbon
      const points = 42;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = glowHex;
      ctx.strokeStyle = strokeHex;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * w;
        const normX = i / points;
        const envelope = Math.sin(normX * Math.PI);
        const freqSample =
          freqs && freqs.length > 0
            ? freqs[i % freqs.length] || 0
            : 0;
        const wave =
          Math.sin(normX * Math.PI * 5 + phase) * 0.6 +
          Math.cos(normX * Math.PI * 9 - phase * 1.3) * 0.4;
        const dy = envelope * (ampBase * 18 + freqSample * 10) * wave;
        const y = h / 2 + dy;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary mirrored harmonic ribbon
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * w;
        const normX = i / points;
        const envelope = Math.sin(normX * Math.PI);
        const dy =
          envelope *
          ampBase *
          13 *
          Math.sin(normX * Math.PI * 6 - phase * 1.1);
        const y = h / 2 - dy;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [strokeHex, glowHex]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={44}
      className="w-full h-11 block"
      aria-label="Live Voice Waveform"
    />
  );
}

/** Resilient Zoya character image showcase with fallback glow */
function CompanionPortrait({
  bodyModelId,
  characterPreset,
  assistantName,
  accentHex,
  secondaryHex,
  sessionState,
  audioLevel,
  className = "",
}: {
  bodyModelId: HologramModelType;
  characterPreset: CharacterPresetId;
  assistantName: string;
  accentHex: string;
  secondaryHex: string;
  sessionState: SessionState;
  audioLevel: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const selectedModel =
    HOLOGRAM_MODELS.find((m) => m.id === bodyModelId) || HOLOGRAM_MODELS[1]; // Default Hayat Cyberpunk for futuristic HUD look

  const imageSrc =
    characterPreset === "jarvis"
      ? "/assets/characters/jarvis_hologram.jpg"
      : characterPreset === "friday"
      ? "/assets/characters/friday_hologram.png"
      : characterPreset === "venom"
      ? "/assets/characters/venom_avatar.jpg"
      : selectedModel.imageSrc;

  useEffect(() => {
    setImgError(false);
  }, [imageSrc]);

  const pulseScale =
    sessionState === "speaking"
      ? 1 + Math.min(audioLevel * 0.08, 0.07)
      : sessionState === "listening"
      ? 1.02
      : 1;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {/* Backlit atmospheric aura */}
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-45 transition-transform duration-200 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentHex}66 0%, ${secondaryHex}22 55%, transparent 75%)`,
          transform: `scale(${pulseScale})`,
        }}
      />

      {!imgError ? (
        <img
          src={imageSrc}
          alt={`${assistantName} AI Companion`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="relative z-10 w-full h-full object-cover object-top select-none transition-transform duration-300"
          style={{
            transform: `scale(${sessionState === "speaking" ? 1.02 : 1})`,
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 72%, rgba(0,0,0,0.12) 96%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 72%, rgba(0,0,0,0.12) 96%, rgba(0,0,0,0) 100%)",
          }}
        />
      ) : (
        <div className="relative z-10 w-36 h-48 rounded-2xl border border-white/15 bg-black/40 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-4xl">{selectedModel.icon}</span>
          <span className="text-xs font-bold text-white">{assistantName} Core</span>
          <span className="text-[10px] text-slate-400">{selectedModel.name}</span>
        </div>
      )}
    </div>
  );
}

export default function ZoyaFullUiStage(props: ZoyaFullUiStageProps) {
  const {
    uiTheme,
    config,
    sessionState,
    audioLevel,
    frequencyData,
    isMicMuted,
    isCameraActive,
    liveCaption,
    errorMessage,
    angerLevel,
    handsFreeWakeEnabled,
    securityState,
    volume,
    isSpeakerMuted,
    onToggleVoiceSession,
    onToggleMicMute,
    onToggleCamera,
    onSelectUiTheme,
    onOpenDrawer,
    onOpenSettings,
    onSwitchToChat,
    onSwitchToStudy,
    onOpenAstrologyStudio,
    onToggleAstrologyMode,
    onOpenCodeStudio,
    onOpenWebsiteBuilder,
    onOpenGameMode,
    onOpenYouTube,
    onOpenNanoIronman,
    onOpenNoiseFit,
    onOpenMoodTracker,
    onOpenDontTouchPhone,
    onOpenDefaultAssistant,
    onToggleHandsFreeWake,
    onVolumeChange,
    onToggleSpeakerMute,
    onSelectBodyId,
    onSwitchCharacterPreset,
    onSelectPersonaMode,
    onSendQuickPrompt,
  } = props;

  const [hudModal, setHudModal] = useState<"none" | "apps" | "control" | "voice_style">("none");
  const [matrixInput, setMatrixInput] = useState("");

  const activePreset = resolveCharacterPreset(config);
  const currentPersona = normalizePersonaMode(config.personaVibe);
  const activeBodyId: HologramModelType =
    (config.zoyaBodyId as HologramModelType) ||
    (uiTheme.layoutMode === "companion_hud"
      ? "hayat"
      : uiTheme.layoutMode === "vedic_sanctum"
      ? "astral"
      : "maya");

  const statusText =
    sessionState === "speaking"
      ? "Speaking live"
      : sessionState === "listening"
      ? isMicMuted
        ? "Mic muted"
        : "Listening to you"
      : sessionState === "connecting"
      ? "Establishing neural link..."
      : "Ready to assist you";

  const statusBadgeValue =
    sessionState === "speaking"
      ? "SPEAKING"
      : sessionState === "listening"
      ? "ACTIVE"
      : sessionState === "connecting"
      ? "SYNCING"
      : "OPTIMAL";

  const aiLevelValue = config.astrologyModeEnabled
    ? "ASTRO"
    : currentPersona === "super_loyal"
    ? "MAX"
    : currentPersona.toUpperCase();

  const quickAppsList = [
    {
      id: "astrology",
      label: "Astro & Kundali",
      desc: "Rashifal, Gun Milan & Planetary Wheel",
      icon: Sparkles,
      accent: "text-amber-400",
      bg: "bg-amber-500/15 border-amber-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenAstrologyStudio();
      },
    },
    {
      id: "code",
      label: "Code Studio",
      desc: "Universal AI IDE & Code Master",
      icon: Code2,
      accent: "text-cyan-400",
      bg: "bg-cyan-500/15 border-cyan-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenCodeStudio();
      },
    },
    {
      id: "web",
      label: "Web Builder",
      desc: "Live Website Generator & Preview",
      icon: Globe,
      accent: "text-sky-400",
      bg: "bg-sky-500/15 border-sky-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenWebsiteBuilder();
      },
    },
    {
      id: "study",
      label: "Study Tutor",
      desc: "Step-by-step AI Teacher & Quizzes",
      icon: GraduationCap,
      accent: "text-indigo-400",
      bg: "bg-indigo-500/15 border-indigo-400/30",
      onClick: () => {
        setHudModal("none");
        onSwitchToStudy();
      },
    },
    {
      id: "games",
      label: "Live Games",
      desc: "Play Tic-Tac-Toe, RPS & Mind Reader",
      icon: Gamepad2,
      accent: "text-pink-400",
      bg: "bg-pink-500/15 border-pink-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenGameMode();
      },
    },
    {
      id: "youtube",
      label: "Watch Together",
      desc: "YouTube Co-Watch & Sing-Along",
      icon: Youtube,
      accent: "text-rose-400",
      bg: "bg-rose-500/15 border-rose-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenYouTube();
      },
    },
    {
      id: "ironman",
      label: "Nano Ironman Art",
      desc: "AI Image & Character Art Studio",
      icon: Zap,
      accent: "text-amber-300",
      bg: "bg-orange-500/15 border-orange-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenNanoIronman();
      },
    },
    {
      id: "health",
      label: "NoiseFit Health",
      desc: "Smartwatch Vitals & Daily Activity",
      icon: Heart,
      accent: "text-rose-400",
      bg: "bg-rose-500/15 border-rose-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenNoiseFit();
      },
    },
    {
      id: "mood",
      label: "Mood & Security",
      desc: "Emotional Graph & Phone Alarm",
      icon: TrendingUp,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-400/30",
      onClick: () => {
        setHudModal("none");
        onOpenMoodTracker();
      },
    },
  ];

  // Shared HUD Bottom Sheet / Overlay for Apps, Control, & Avatar/Voice Style
  const renderSharedHudModal = () => (
    <AnimatePresence>
      {hudModal !== "none" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setHudModal("none")}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-xl max-h-[82dvh] overflow-y-auto chat-scroll rounded-t-3xl sm:rounded-3xl border p-5 shadow-2xl ${
              uiTheme.isLight
                ? "bg-white border-slate-300 text-slate-900"
                : "bg-[#081222]/98 border-cyan-500/30 text-slate-100"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold">
                  {hudModal === "apps"
                    ? `${config.assistantName} Futuristic Apps`
                    : hudModal === "control"
                    ? `${config.assistantName} Device & AI Controls`
                    : "Choose Companion Avatar & Persona"}
                </h2>
                <p
                  className={`text-xs ${
                    uiTheme.isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {hudModal === "apps"
                    ? "Launch any integrated studio directly from your HUD"
                    : hudModal === "control"
                    ? "Hardware voice, anti-theft alarm, astrology live mode & 5 UI layouts"
                    : "Switch companion character body, AI preset & vibe"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHudModal("none")}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>

            {hudModal === "apps" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickAppsList.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={app.onClick}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        uiTheme.isLight
                          ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${app.bg}`}
                      >
                        <Icon size={18} className={app.accent} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{app.label}</div>
                        <div
                          className={`text-[11px] truncate ${
                            uiTheme.isLight ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          {app.desc}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {hudModal === "control" && (
              <div className="space-y-4">
                {/* Speaker Volume Control */}
                <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      {isSpeakerMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-cyan-400" />}
                      Speaker Volume
                    </span>
                    <span className="font-mono tabular-nums">
                      {Math.round((isSpeakerMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isSpeakerMuted ? 0 : volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-cyan-500/25 rounded-full accent-cyan-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={onToggleSpeakerMute}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                    >
                      {isSpeakerMuted ? "Unmute" : "Mute"}
                    </button>
                  </div>
                </div>

                {/* Hardware & Feature Toggles */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onToggleCamera}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isCameraActive
                        ? "bg-pink-500/20 border-pink-400/60"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {isCameraActive ? <Video size={15} className="text-pink-400" /> : <VideoOff size={15} />}
                      <span>Camera Vision</span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-1">
                      {isCameraActive ? "Streaming live" : "Turn on camera"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleAstrologyMode(!config.astrologyModeEnabled, true)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      config.astrologyModeEnabled
                        ? "bg-amber-500/20 border-amber-400/60"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Sparkles size={15} className="text-amber-400" />
                      <span>Astrology Mode</span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-1">
                      {config.astrologyModeEnabled ? "Live Jyotish ON" : "Tap to activate"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleHandsFreeWake}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      handsFreeWakeEnabled
                        ? "bg-emerald-500/20 border-emerald-400/60"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Mic size={15} className="text-emerald-400" />
                      <span>Hands-Free Wake</span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-1">
                      {handsFreeWakeEnabled ? `"Hey ${config.assistantName}" ON` : "Disabled"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHudModal("none");
                      onOpenDontTouchPhone();
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      securityState === "armed"
                        ? "bg-red-500/25 border-red-400"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {securityState === "armed" ? (
                        <ShieldAlert size={15} className="text-red-400" />
                      ) : (
                        <Shield size={15} className="text-rose-400" />
                      )}
                      <span>Phone Shield</span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-1">
                      {securityState === "armed" ? "Motion alarm armed" : "Open anti-theft"}
                    </div>
                  </button>
                </div>

                {/* Quick System Shortcuts */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHudModal("none");
                      onOpenDefaultAssistant();
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-xs font-semibold"
                  >
                    Set as Default Assistant
                  </button>
                  <button
                    type="button"
                    onClick={() => setHudModal("voice_style")}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold"
                  >
                    Switch Avatar / Persona
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHudModal("none");
                      onOpenSettings();
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold"
                  >
                    Full Settings
                  </button>
                </div>

                {/* Full UI Switcher inside Control Sheet */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs font-bold mb-2">Switch Full Zoya UI (5 Layouts)</div>
                  <UiThemeSelectorGrid
                    activeThemeId={uiTheme.id}
                    onSelectTheme={(id) => {
                      onSelectUiTheme(id);
                      setHudModal("none");
                    }}
                    compact
                  />
                </div>
              </div>
            )}

            {hudModal === "voice_style" && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold mb-2">Companion Body Outfit</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HOLOGRAM_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectBodyId(m.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          activeBodyId === m.id
                            ? "bg-cyan-500/20 border-cyan-400"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <img
                          src={m.imageSrc}
                          alt={m.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-11 rounded-lg object-cover object-top shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{m.name}</div>
                          <div className="text-[10px] opacity-70 truncate">{m.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold mb-2">AI Character Core</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CHARACTER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSwitchCharacterPreset(preset.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                          activePreset.id === preset.id
                            ? "bg-cyan-500/25 border-cyan-400"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <span>{preset.avatarEmoji}</span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold mb-2">Persona Vibe</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONA_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectPersonaMode(m.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left ${
                          currentPersona === m.id
                            ? "bg-pink-500/20 border-pink-400"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // UI 02: COMPANION AI HUD (Modeled directly on Reference Image + Zoya Powers)
  // ============================================================================
  if (uiTheme.layoutMode === "companion_hud") {
    return (
      <div className="flex-1 flex flex-col justify-between min-h-0 w-full relative z-10 overflow-hidden bg-[#030811] text-cyan-50">
        {/* Subtle Deep HUD Backdrop */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 38% 36%, rgba(6,182,212,0.16) 0%, rgba(2,10,20,0.45) 45%, #02060D 100%)",
          }}
        />

        {/* Minimal Top Header matching Reference Image */}
        <header className="relative z-20 w-full px-4 sm:px-8 pt-3 pb-2 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-100 transition-colors"
            title="Open Chats & Memory Drawer"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-col items-center text-center min-w-0 px-2">
            <h1
              className="text-lg sm:text-xl font-extrabold tracking-[0.18em] uppercase text-white truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {config.assistantName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  sessionState === "speaking"
                    ? "bg-rose-400 animate-ping"
                    : sessionState === "listening"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-cyan-400"
                }`}
              />
              <span>Online</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[230px] sm:max-w-xs mt-0.5">
              {statusText}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <UiThemeQuickPopover
              activeThemeId={uiTheme.id}
              onSelectTheme={onSelectUiTheme}
              align="right"
              labelMode="compact"
            />
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-100 transition-colors"
              title="Open Settings"
            >
              <Settings size={19} />
            </button>
          </div>
        </header>

        {/* Hero Companion Split Stage: Full-Body Character + Floating Telemetry Card */}
        <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-3 sm:px-8 flex flex-col justify-center min-h-0 overflow-y-auto chat-scroll">
          <div className="grid grid-cols-12 items-center gap-2 sm:gap-6 w-full my-auto py-1">
            {/* Left/Center Character Visual */}
            <div className="col-span-7 sm:col-span-6 lg:col-span-6 relative flex flex-col items-center justify-end">
              <CompanionPortrait
                bodyModelId={activeBodyId}
                characterPreset={activePreset.id}
                assistantName={config.assistantName}
                accentHex={uiTheme.accentHex}
                secondaryHex={uiTheme.secondaryAccentHex}
                sessionState={sessionState}
                audioLevel={audioLevel}
                className="w-full h-[270px] sm:h-[360px] lg:h-[420px] max-w-[300px] sm:max-w-[360px] rounded-3xl"
              />

              {/* Subtle Interactive Body Outfit Selector under Hero */}
              <div className="relative z-20 -mt-5 flex items-center gap-1 p-1 rounded-2xl bg-[#071322]/90 border border-cyan-400/30 backdrop-blur-md shadow-lg">
                {HOLOGRAM_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectBodyId(m.id)}
                    className={`px-2 py-1 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap ${
                      activeBodyId === m.id
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "text-cyan-100/80 hover:text-white"
                    }`}
                    title={m.name}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Floating Glass HUD Card matching screenshot */}
            <div className="col-span-5 sm:col-span-6 lg:col-span-6 flex flex-col gap-3">
              <div className="p-3 sm:p-5 rounded-2xl bg-[#071323]/80 border border-cyan-400/30 backdrop-blur-xl shadow-[0_0_28px_rgba(6,182,212,0.14)] space-y-3.5">
                <div>
                  <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-medium">
                    SYSTEM STATUS
                  </div>
                  <div className="text-sm sm:text-xl font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
                    {statusBadgeValue}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-medium">
                    AI LEVEL
                  </div>
                  <div className="text-base sm:text-2xl font-extrabold font-mono tabular-nums text-cyan-200 mt-0.5">
                    {aiLevelValue}
                  </div>
                </div>

                {/* Live Audio Oscilloscope */}
                <div className="pt-1 border-t border-cyan-500/20">
                  <LiveHudWaveformCanvas
                    audioLevel={audioLevel}
                    frequencyData={frequencyData}
                    sessionState={sessionState}
                    strokeHex="#22D3EE"
                    glowHex="rgba(34,211,238,0.65)"
                  />
                </div>

                {/* Real Zoya Feature Quick Actions inside HUD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleAstrologyMode(!config.astrologyModeEnabled, true)}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition-colors ${
                      config.astrologyModeEnabled
                        ? "bg-amber-500/20 border-amber-400/60 text-amber-200"
                        : "bg-white/[0.04] hover:bg-cyan-500/15 border-cyan-500/20 text-cyan-100"
                    }`}
                  >
                    <span className="truncate">Astrology</span>
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCodeStudio}
                    className="px-2.5 py-2 rounded-xl border bg-white/[0.04] hover:bg-cyan-500/15 border-cyan-500/20 text-[11px] font-semibold text-cyan-100 flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">Code Studio</span>
                    <Code2 size={13} className="text-cyan-300 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Compact Area Weather & Quick Telemetry Strip on Desktop/Larger Phones */}
              <div className="hidden sm:flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#071323]/70 border border-cyan-500/20 text-xs">
                <AreaTemperaturePill />
                <button
                  type="button"
                  onClick={onToggleHandsFreeWake}
                  className={`font-semibold transition-colors ${
                    handsFreeWakeEnabled ? "text-emerald-300" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {handsFreeWakeEnabled ? `Hey ${config.assistantName} ON` : "Wake OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Live Caption or Error Banner */}
          <AnimatePresence>
            {liveCaption && sessionState !== "disconnected" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mx-auto mt-1 mb-1 px-4 py-2 rounded-2xl bg-[#081526]/90 border border-cyan-400/30 max-w-md w-full text-center shadow-lg"
              >
                <span className="text-[10px] font-bold text-cyan-300 mr-1.5">
                  {liveCaption.role === "user" ? config.userName : config.assistantName}:
                </span>
                <span className="text-xs text-slate-100">{liveCaption.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMessage && (
            <div className="mx-auto mt-1 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs text-center max-w-sm">
              {errorMessage}
            </div>
          )}
        </main>

        {/* Floating Prominent Circular "Tap to Speak" Orb + 4-Tile Reference Dock */}
        <footer className="relative z-20 w-full max-w-md mx-auto px-4 pb-4 pt-1 flex flex-col items-center shrink-0">
          {/* Center Circular Mic Orb */}
          <div className="flex flex-col items-center -mt-4 mb-3">
            <button
              type="button"
              onClick={onToggleVoiceSession}
              disabled={sessionState === "connecting"}
              className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-2 flex items-center justify-center transition-all active:scale-95 shadow-[0_0_28px_rgba(34,211,238,0.45)] ${
                sessionState !== "disconnected"
                  ? "bg-gradient-to-tr from-rose-600 to-cyan-500 border-white text-white"
                  : "bg-[#09182C] hover:bg-[#0D2340] border-cyan-300 text-cyan-200"
              }`}
              title={sessionState !== "disconnected" ? "End Live Voice" : "Tap to Speak"}
            >
              {sessionState !== "disconnected" && (
                <span className="absolute inset-[-5px] rounded-full border border-cyan-300/60 animate-ping pointer-events-none" />
              )}
              {sessionState === "connecting" ? (
                <div className="w-6 h-6 border-2 border-cyan-200 border-t-transparent rounded-full animate-spin" />
              ) : sessionState !== "disconnected" ? (
                <Power size={26} />
              ) : (
                <Mic size={28} />
              )}
            </button>
            <span className="text-xs font-medium text-slate-200 mt-1.5">
              {sessionState !== "disconnected" ? "Tap to End Call" : "Tap to Speak"}
            </span>
          </div>

          {/* 4-Tile Bottom Dock matching Image: Voice | Apps | Messages | Control */}
          <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setHudModal("voice_style")}
              className="min-h-[56px] rounded-xl bg-[#071323]/90 hover:bg-cyan-500/15 border border-cyan-400/35 flex flex-col items-center justify-center gap-1 text-cyan-100 transition-all"
            >
              <Mic size={18} className="text-cyan-300" />
              <span className="text-[11px] font-medium">Voice</span>
            </button>

            <button
              type="button"
              onClick={() => setHudModal("apps")}
              className="min-h-[56px] rounded-xl bg-[#071323]/90 hover:bg-cyan-500/15 border border-cyan-400/25 flex flex-col items-center justify-center gap-1 text-cyan-100 transition-all"
            >
              <LayoutGrid size={18} className="text-cyan-300" />
              <span className="text-[11px] font-medium">Apps</span>
            </button>

            <button
              type="button"
              onClick={onSwitchToChat}
              className="min-h-[56px] rounded-xl bg-[#071323]/90 hover:bg-cyan-500/15 border border-cyan-400/25 flex flex-col items-center justify-center gap-1 text-cyan-100 transition-all"
            >
              <MessageSquare size={18} className="text-cyan-300" />
              <span className="text-[11px] font-medium">Messages</span>
            </button>

            <button
              type="button"
              onClick={() => setHudModal("control")}
              className="min-h-[56px] rounded-xl bg-[#071323]/90 hover:bg-cyan-500/15 border border-cyan-400/25 flex flex-col items-center justify-center gap-1 text-cyan-100 transition-all"
            >
              <SlidersHorizontal size={18} className="text-cyan-300" />
              <span className="text-[11px] font-medium">Control</span>
            </button>
          </div>
        </footer>

        {renderSharedHudModal()}
      </div>
    );
  }

  // ============================================================================
  // UI 03: ZOYA COMMAND BENTO OS (Daylight Paper Clean Multi-Card Workspace)
  // ============================================================================
  if (uiTheme.layoutMode === "command_bento") {
    const userRashiInfo = config.userRashi ? ZODIAC_SIGNS[config.userRashi] : ZODIAC_SIGNS.aries;

    return (
      <div className="flex-1 flex flex-col justify-between min-h-0 w-full relative z-10 overflow-hidden bg-[#F5F7FA] text-slate-900">
        {/* Clean Daylight OS Top Bar */}
        <header className="w-full px-4 sm:px-8 h-14 bg-white/95 border-b border-slate-200 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenDrawer}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800"
              title="Open Drawer"
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {config.assistantName} Command OS
              </div>
              <div className="text-[11px] text-slate-500">
                {activePreset.name} · {statusText}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UiThemeQuickPopover
              activeThemeId={uiTheme.id}
              onSelectTheme={onSelectUiTheme}
              align="right"
            />
            <button
              type="button"
              onClick={onSwitchToChat}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap"
            >
              Open Chat
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800"
              title="Settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </header>

        {/* Scrollable Bento Dashboard Grid */}
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 overflow-y-auto chat-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Primary Companion Tile */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500">Live Voice Core</span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    Talk with {config.assistantName}
                  </h2>
                </div>
                <AreaTemperaturePill />
              </div>

              <div className="relative rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center h-64">
                <CompanionPortrait
                  bodyModelId={activeBodyId}
                  characterPreset={activePreset.id}
                  assistantName={config.assistantName}
                  accentHex="#E11D48"
                  secondaryHex="#0284C7"
                  sessionState={sessionState}
                  audioLevel={audioLevel}
                  className="w-full h-full"
                />
                <button
                  type="button"
                  onClick={onToggleVoiceSession}
                  disabled={sessionState === "connecting"}
                  className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl transition-all ${
                    sessionState !== "disconnected"
                      ? "bg-rose-600 text-white"
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {sessionState !== "disconnected" ? <Power size={15} /> : <Mic size={15} />}
                  <span>
                    {sessionState !== "disconnected" ? "End Live Voice" : "Start Live Voice"}
                  </span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <LiveHudWaveformCanvas
                  audioLevel={audioLevel}
                  frequencyData={frequencyData}
                  sessionState={sessionState}
                  strokeHex="#E11D48"
                  glowHex="rgba(225,29,72,0.35)"
                />
                {liveCaption && sessionState !== "disconnected" && (
                  <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                    <strong className="text-slate-900">
                      {liveCaption.role === "user" ? config.userName : config.assistantName}:{" "}
                    </strong>
                    {liveCaption.text}
                  </p>
                )}
              </div>
            </div>

            {/* Right Bento Capabilities Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Featured Vedic Astrology Card */}
              <div className="sm:col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-amber-800">
                    Vedic Jyotish · {userRashiInfo.vedicName} ({userRashiInfo.englishName})
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Daily Horoscope, Kundali &amp; Live Astrology Mode
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleAstrologyMode(!config.astrologyModeEnabled, true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      config.astrologyModeEnabled
                        ? "bg-amber-600 border-amber-700 text-white"
                        : "bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    {config.astrologyModeEnabled ? "Live Astro ON" : "Live Astro"}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAstrologyStudio}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    Open Kundali
                  </button>
                </div>
              </div>

              {quickAppsList
                .filter((a) => a.id !== "astrology")
                .slice(0, 6)
                .map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={app.onClick}
                      className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-left flex items-start gap-3 transition-all shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-slate-800" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{app.label}</div>
                        <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">{app.desc}</div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </main>

        {/* Clean Bottom Bar */}
        <footer className="w-full px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={onSwitchToChat}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap"
          >
            Chat Workspace
          </button>
          <button
            type="button"
            onClick={onSwitchToStudy}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap"
          >
            Study Tutor
          </button>
          <button
            type="button"
            onClick={onOpenDontTouchPhone}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold whitespace-nowrap"
          >
            {securityState === "armed" ? "Shield Armed" : "Phone Shield"}
          </button>
          <button
            type="button"
            onClick={() => setHudModal("control")}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap"
          >
            More Controls
          </button>
        </footer>

        {renderSharedHudModal()}
      </div>
    );
  }

  // ============================================================================
  // UI 04: VEDIC COSMIC SANCTUM (Astrology + Mandala Orb Layout)
  // ============================================================================
  if (uiTheme.layoutMode === "vedic_sanctum") {
    const userRashi = config.userRashi ? ZODIAC_SIGNS[config.userRashi] : ZODIAC_SIGNS.aries;

    return (
      <div className="flex-1 flex flex-col justify-between min-h-0 w-full relative z-10 overflow-hidden bg-[#0D0805] text-amber-50">
        {/* Top Sacred Header */}
        <header className="relative z-20 w-full px-4 sm:px-8 pt-3 pb-2 flex items-center justify-between border-b border-amber-500/20 bg-[#140D07]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDrawer}
              className="w-10 h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-200"
              title="Open Menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden xs:block">
              <div className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                ॐ {config.assistantName} Jyotish Sanctum
              </div>
              <div className="text-[11px] text-amber-100/70">
                {userRashi.symbol} {userRashi.vedicName} · {statusText}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UiThemeQuickPopover
              activeThemeId={uiTheme.id}
              onSelectTheme={onSelectUiTheme}
              align="right"
              labelMode="compact"
            />
            <button
              type="button"
              onClick={onOpenAstrologyStudio}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-bold whitespace-nowrap shadow-md"
            >
              Kundali Studio
            </button>
          </div>
        </header>

        {/* Center Orbital Zodiac Mandala Stage */}
        <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-3 flex flex-col items-center justify-center min-h-0 overflow-y-auto chat-scroll">
          <div className="relative flex items-center justify-center my-2">
            {/* Rotating 12-Sign SVG Zodiac Halo */}
            <motion.svg
              viewBox="0 0 260 260"
              animate={{ rotate: 360 }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              className="w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] pointer-events-none opacity-80"
            >
              <circle
                cx="130"
                cy="130"
                r="122"
                fill="none"
                stroke="rgba(245,158,11,0.35)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <circle
                cx="130"
                cy="130"
                r="102"
                fill="none"
                stroke="rgba(251,146,60,0.45)"
                strokeWidth="1.5"
              />
              {Object.values(ZODIAC_SIGNS).map((sign, idx) => {
                const angle = (idx * 30 - 90) * (Math.PI / 180);
                const x = 130 + 112 * Math.cos(angle);
                const y = 130 + 112 * Math.sin(angle);
                return (
                  <text
                    key={sign.key}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FCD34D"
                    fontSize="12"
                  >
                    {sign.symbol}
                  </text>
                );
              })}
            </motion.svg>

            {/* Centered Astral Portrait inside Sacred Ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[186px] h-[186px] sm:w-[218px] sm:h-[218px] rounded-full overflow-hidden border-2 border-amber-400/70 shadow-[0_0_40px_rgba(245,158,11,0.35)] bg-[#140D07]">
                <CompanionPortrait
                  bodyModelId={config.zoyaBodyId === "maya" || !config.zoyaBodyId ? "astral" : activeBodyId}
                  characterPreset={activePreset.id}
                  assistantName={config.assistantName}
                  accentHex="#F59E0B"
                  secondaryHex="#FB923C"
                  sessionState={sessionState}
                  audioLevel={audioLevel}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* Live Cosmic Waveform */}
          <div className="w-full max-w-xs mt-1">
            <LiveHudWaveformCanvas
              audioLevel={audioLevel}
              frequencyData={frequencyData}
              sessionState={sessionState}
              strokeHex="#F59E0B"
              glowHex="rgba(245,158,11,0.65)"
            />
          </div>

          {/* 3 Instant Vedic Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-2xl mt-3">
            <button
              type="button"
              onClick={() =>
                onSendQuickPrompt(
                  `Zoya, meri ${userRashi.vedicName} rashi ka aaj ka rashifal aur lucky guidance sunao!`
                )
              }
              className="p-3 rounded-2xl bg-[#1A120B] hover:bg-[#251A10] border border-amber-500/30 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sun size={15} />
                <span>Aaj Ka Rashifal</span>
              </div>
              <p className="text-[11px] text-amber-100/70 mt-1">
                {userRashi.vedicName} daily forecast
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                onSendQuickPrompt(
                  "Zoya, aaj ka Panchang, Shubh Muhurat, Abhijit time aur Rahu Kaal batao!"
                )
              }
              className="p-3 rounded-2xl bg-[#1A120B] hover:bg-[#251A10] border border-amber-500/30 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                <Compass size={15} />
                <span>Shubh Muhurat</span>
              </div>
              <p className="text-[11px] text-amber-100/70 mt-1">
                Abhijit &amp; Rahu Kaal timings
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenAstrologyStudio}
              className="p-3 rounded-2xl bg-[#1A120B] hover:bg-[#251A10] border border-amber-500/30 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <Moon size={15} />
                <span>36 Gun Kundali</span>
              </div>
              <p className="text-[11px] text-amber-100/70 mt-1">
                Grah Gochar chart &amp; matching
              </p>
            </button>
          </div>
        </main>

        {/* Bottom Vedic Sanctum Dock */}
        <footer className="relative z-20 w-full px-4 pb-4 pt-2 flex items-center justify-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleVoiceSession}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl"
          >
            {sessionState !== "disconnected" ? <Power size={16} /> : <Mic size={16} />}
            <span>{sessionState !== "disconnected" ? "End Jyotish Call" : "Ask Zoya Live"}</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToChat}
            className="px-4 py-3 rounded-2xl bg-[#1A120B] hover:bg-[#251A10] border border-amber-500/30 text-amber-200 text-xs font-semibold"
          >
            Chat
          </button>

          <button
            type="button"
            onClick={() => setHudModal("apps")}
            className="px-4 py-3 rounded-2xl bg-[#1A120B] hover:bg-[#251A10] border border-amber-500/30 text-amber-200 text-xs font-semibold"
          >
            Apps
          </button>
        </footer>

        {renderSharedHudModal()}
      </div>
    );
  }

  // ============================================================================
  // UI 05: NEURAL MATRIX SPLIT (Dual-Pane Voice Core + Prompt Console & Studios)
  // ============================================================================
  return (
    <div className="flex-1 flex flex-col justify-between min-h-0 w-full relative z-10 overflow-hidden bg-[#04100D] text-emerald-50">
      {/* Top Dual-Matrix Header */}
      <header className="w-full px-4 sm:px-6 h-14 bg-[#061511]/95 border-b border-emerald-500/25 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-200"
            title="Open Menu"
          >
            <Menu size={18} />
          </button>
          <div>
            <div className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              {config.assistantName} Neural Matrix
            </div>
            <div className="text-[11px] text-emerald-300/80">
              Dual Voice + Instant Prompt Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UiThemeQuickPopover
            activeThemeId={uiTheme.id}
            onSelectTheme={onSelectUiTheme}
            align="right"
            labelMode="compact"
          />
          <button
            type="button"
            onClick={onSwitchToChat}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-100 text-xs font-semibold whitespace-nowrap"
          >
            Full Chat
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-200"
            title="Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* Split Dual Deck */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto chat-scroll">
        {/* Left Pane: Companion Avatar + Audio Matrix */}
        <div className="lg:col-span-5 rounded-3xl bg-[#071914] border border-emerald-500/25 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-300">{statusText}</span>
            <span className="font-mono tabular-nums text-teal-300">
              {activePreset.name}
            </span>
          </div>

          <CompanionPortrait
            bodyModelId={activeBodyId}
            characterPreset={activePreset.id}
            assistantName={config.assistantName}
            accentHex="#10B981"
            secondaryHex="#2DD4BF"
            sessionState={sessionState}
            audioLevel={audioLevel}
            className="w-full h-64 sm:h-72 rounded-2xl"
          />

          <LiveHudWaveformCanvas
            audioLevel={audioLevel}
            frequencyData={frequencyData}
            sessionState={sessionState}
            strokeHex="#10B981"
            glowHex="rgba(16,185,129,0.6)"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleVoiceSession}
              className={`flex-1 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                sessionState !== "disconnected"
                  ? "bg-rose-600 text-white"
                  : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              }`}
            >
              {sessionState !== "disconnected" ? <Power size={15} /> : <Radio size={15} />}
              <span>{sessionState !== "disconnected" ? "Disconnect" : "Connect Voice"}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMicMute}
              disabled={sessionState === "disconnected"}
              className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-emerald-500/30 flex items-center justify-center disabled:opacity-40"
              title="Mute Mic"
            >
              {isMicMuted ? <MicOff size={16} className="text-rose-400" /> : <Mic size={16} className="text-emerald-300" />}
            </button>

            <button
              type="button"
              onClick={onToggleCamera}
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                isCameraActive
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                  : "bg-white/5 border-emerald-500/30 text-slate-300"
              }`}
              title="Toggle Camera"
            >
              {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
          </div>
        </div>

        {/* Right Pane: Instant Command Prompt + Studio Launcher Matrix */}
        <div className="lg:col-span-7 rounded-3xl bg-[#071914] border border-emerald-500/25 p-4 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Live Command &amp; Studio Deck</h2>
              <button
                type="button"
                onClick={() => setHudModal("control")}
                className="text-xs font-semibold text-emerald-300 hover:underline"
              >
                Controls &amp; Settings
              </button>
            </div>

            {liveCaption && sessionState !== "disconnected" && (
              <div className="p-3 rounded-2xl bg-[#04100D] border border-emerald-500/25 text-xs leading-relaxed">
                <span className="font-bold text-emerald-300 mr-1.5">
                  {liveCaption.role === "user" ? config.userName : config.assistantName}:
                </span>
                <span className="text-emerald-50">{liveCaption.text}</span>
              </div>
            )}

            {/* Quick Neural Prompts */}
            <div className="flex flex-wrap gap-2">
              {[
                "Aaj ka rashifal batao",
                "Ek Python script likho",
                "Sing my favorite song",
                "Open Astrology Studio",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendQuickPrompt(prompt)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs text-emerald-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Direct Studio Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {quickAppsList.slice(0, 6).map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={app.onClick}
                    className="p-3 rounded-2xl bg-[#0B221B] hover:bg-[#102E25] border border-emerald-500/20 text-left flex flex-col gap-1.5 transition-all"
                  >
                    <Icon size={17} className={app.accent} />
                    <div className="text-xs font-bold text-white truncate">{app.label}</div>
                    <div className="text-[10px] text-emerald-200/70 truncate">{app.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Text-to-Voice / Prompt Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!matrixInput.trim()) return;
              onSendQuickPrompt(matrixInput.trim());
              setMatrixInput("");
            }}
            className="flex items-center gap-2 pt-2 border-t border-emerald-500/20"
          >
            <input
              type="text"
              value={matrixInput}
              onChange={(e) => setMatrixInput(e.target.value)}
              placeholder={`Send live prompt to ${config.assistantName}...`}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#04100D] border border-emerald-500/30 focus:border-emerald-400 outline-none text-xs sm:text-sm text-white placeholder-emerald-200/40"
            />
            <button
              type="submit"
              className="w-11 h-11 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center shrink-0 transition-colors"
              title="Send Prompt"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>

      {renderSharedHudModal()}
    </div>
  );
}
