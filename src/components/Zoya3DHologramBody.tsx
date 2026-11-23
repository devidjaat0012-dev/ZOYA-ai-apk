import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  Mic,
  Check,
  Zap,
  Radio,
  Sliders,
  Eye,
} from "lucide-react";
import { SessionState } from "../types";

export type HologramModelType = "maya" | "hayat" | "idol" | "emerald" | "astral";

export interface HologramModelConfig {
  id: HologramModelType;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  imageSrc: string;
  colorHex: string;
  accentHex: string;
  tagline: string;
  vibe: string;
}

export const HOLOGRAM_MODELS: HologramModelConfig[] = [
  {
    id: "maya",
    name: "Maya Desi Chic",
    subtitle: "Warm Red Kurti",
    icon: "🌸",
    description: "Sweet caring companion in radiant red-orange embroidered kurti with golden glow",
    imageSrc: "/assets/characters/zoya_body_maya.jpg",
    colorHex: "#ff4b3a",
    accentHex: "#fbbf24",
    tagline: "Caring & Loving Companion",
    vibe: "Warm · Girlfriend",
  },
  {
    id: "hayat",
    name: "Hayat Cyberpunk",
    subtitle: "Iridescent Jacket",
    icon: "⚡",
    description: "Sleek cyber romper with translucent prismatic jacket & cosmic orbital rings",
    imageSrc: "/assets/characters/zoya_body_hayat.jpg",
    colorHex: "#00f0ff",
    accentHex: "#a855f7",
    tagline: "High-Tech Cyber Aesthetic",
    vibe: "Excited · Futuristic",
  },
  {
    id: "idol",
    name: "Neon Cyber Idol",
    subtitle: "Pop Star Stage",
    icon: "🎤",
    description: "Vibrant cyber idol in glowing neon pink stage outfit & holographic headset",
    imageSrc: "/assets/characters/zoya_body_idol.jpg",
    colorHex: "#ff2a8d",
    accentHex: "#38bdf8",
    tagline: "Energetic Idol Vibes",
    vibe: "Playful · Singing",
  },
  {
    id: "emerald",
    name: "Royal Emerald",
    subtitle: "Fusion Lehenga",
    icon: "👑",
    description: "Graceful modern royalty in emerald green & gold embroidered fusion gown",
    imageSrc: "/assets/characters/zoya_body_emerald.jpg",
    colorHex: "#10b981",
    accentHex: "#fbbf24",
    tagline: "Regal Elegance & Grace",
    vibe: "Graceful · Royal",
  },
  {
    id: "astral",
    name: "Astral Celestial",
    subtitle: "Cosmic Starlight",
    icon: "✨",
    description: "Ethereal goddess in midnight-violet starlight gown with floating planetary ring",
    imageSrc: "/assets/characters/zoya_body_astral.jpg",
    colorHex: "#8b5cf6",
    accentHex: "#ec4899",
    tagline: "Celestial Galaxy Spirit",
    vibe: "Dreamy · Ethereal",
  },
];

interface Zoya3DHologramBodyProps {
  state: SessionState;
  audioLevel?: number; // 0.0 to 1.0
  frequencyData?: number[];
  assistantName?: string;
  isCompact?: boolean;
  onExpandToggle?: () => void;
  isExpanded?: boolean;
  onToggleSession?: () => void;
  bodyModelId?: HologramModelType;
  onSelectBodyModel?: (modelId: HologramModelType) => void;
}

export default function Zoya3DHologramBody({
  state,
  audioLevel = 0,
  frequencyData = [],
  assistantName = "Zoya",
  isCompact = false,
  onExpandToggle,
  isExpanded = false,
  onToggleSession,
  bodyModelId,
  onSelectBodyModel,
}: Zoya3DHologramBodyProps) {
  // Selected Hologram Model (synced with settings and localStorage)
  const [selectedModel, setSelectedModel] = useState<HologramModelType>(() => {
    if (bodyModelId && HOLOGRAM_MODELS.some((m) => m.id === bodyModelId)) {
      return bodyModelId;
    }
    try {
      const saved = localStorage.getItem("zoya_holo_fullbody_id");
      if (saved && HOLOGRAM_MODELS.some((m) => m.id === saved)) {
        return saved as HologramModelType;
      }
    } catch {
      // ignore
    }
    return "hayat";
  });

  const [showHoloEffects, setShowHoloEffects] = useState<boolean>(true);
  const [imageLoaded, setImageLoaded] = useState<boolean>(true);
  const [showLookSelector, setShowLookSelector] = useState<boolean>(false);

  useEffect(() => {
    if (bodyModelId && HOLOGRAM_MODELS.some((m) => m.id === bodyModelId)) {
      setSelectedModel(bodyModelId);
    }
  }, [bodyModelId]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("zoya_holo_fullbody_id");
        if (saved && HOLOGRAM_MODELS.some((m) => m.id === saved)) {
          setSelectedModel(saved as HologramModelType);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const activeModelMeta = useMemo(() => {
    return HOLOGRAM_MODELS.find((m) => m.id === selectedModel) || HOLOGRAM_MODELS[0];
  }, [selectedModel]);

  const handleSelectModel = (modelId: HologramModelType) => {
    setSelectedModel(modelId);
    if (onSelectBodyModel) {
      onSelectBodyModel(modelId);
    }
    try {
      localStorage.setItem("zoya_holo_fullbody_id", modelId);
      localStorage.setItem("zoya_selected_hologram_model", modelId);
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Sound-reactive glow intensity calculation
  const reactiveGlow = useMemo(() => {
    if (state === "speaking") {
      return 18 + Math.min(audioLevel * 38, 38);
    }
    if (state === "listening") {
      return 12 + Math.min(audioLevel * 20, 20);
    }
    return 8;
  }, [state, audioLevel]);

  return (
    <div
      className={`relative flex flex-col items-center justify-between select-none overflow-hidden ${
        isExpanded
          ? "fixed inset-0 z-50 bg-[#060913]/98 backdrop-blur-2xl p-4 sm:p-6"
          : "w-full max-w-[380px] sm:max-w-[420px] h-[340px] xs:h-[380px] sm:h-[450px] md:h-[480px] max-h-[50vh] rounded-3xl bg-gradient-to-b from-[#090e1c] via-[#060914] to-[#04060c] border border-white/15 shadow-2xl"
      }`}
    >
      {/* Ambient Holographic Atmosphere & Sound-Reactive Aura */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700 blur-[85px] opacity-35"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${activeModelMeta.colorHex} 0%, ${activeModelMeta.accentHex}44 45%, transparent 75%)`,
        }}
      />

      {/* Floating Holographic Cyber Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: ["100%", "-20%"],
              opacity: [0, 0.7, 0],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 4.5 + (i % 5),
              repeat: Infinity,
              delay: i * 0.45,
              ease: "linear",
            }}
            style={{
              left: `${8 + (i * 8)}%`,
              backgroundColor: i % 2 === 0 ? activeModelMeta.colorHex : activeModelMeta.accentHex,
            }}
            className="absolute bottom-0 w-1.5 h-1.5 rounded-full blur-[0.5px] shadow-[0_0_8px_currentColor]"
          />
        ))}
      </div>

      {/* Sleek Minimal Floating Top Bar */}
      <div className="w-full px-3.5 pt-3 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-xl">
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: activeModelMeta.colorHex }}
          />
          <span className="text-[11px] font-extrabold tracking-wider uppercase text-white flex items-center gap-1">
            <span>{activeModelMeta.icon}</span>
            <span>{activeModelMeta.name.split(" ")[0]}</span>
          </span>
          <span className="text-[9px] text-pink-300/80 font-mono hidden xs:inline">
            {activeModelMeta.vibe.split(" ")[0]}
          </span>
        </div>

        {/* Action Controls & Look Switcher Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowLookSelector((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1 shadow ${
              showLookSelector
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-400"
                : "bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white border-white/15"
            }`}
            title="Switch Character Body Look"
          >
            <span>🎭</span>
            <span>Looks</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHoloEffects((prev) => !prev)}
            className={`p-1.5 rounded-full backdrop-blur-md border transition-all shadow cursor-pointer ${
              showHoloEffects
                ? "bg-pink-500/30 border-pink-400 text-pink-200"
                : "bg-black/70 border-white/15 text-slate-400 hover:text-white"
            }`}
            title={showHoloEffects ? "Holographic Glow ON" : "Holographic Glow OFF"}
          >
            <Sparkles size={13} />
          </button>

          {onExpandToggle && (
            <button
              type="button"
              onClick={onExpandToggle}
              className="p-1.5 rounded-full bg-black/70 hover:bg-white/20 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white transition-all shadow cursor-pointer"
              title={isExpanded ? "Exit Fullscreen" : "Fullscreen Stage"}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible 5-Option Body Switcher with Small Photos (Only when toggled) */}
      <AnimatePresence>
        {showLookSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            className="w-full px-2 pt-1.5 z-30 shrink-0 overflow-hidden"
          >
            <div className="w-full flex items-center justify-between gap-1 p-1.5 rounded-2xl bg-black/90 backdrop-blur-md border border-white/20 shadow-2xl overflow-x-auto scrollbar-none">
              {HOLOGRAM_MODELS.map((model, idx) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      handleSelectModel(model.id);
                      setShowLookSelector(false);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-md border border-white/60 scale-105"
                        : "text-slate-300 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    <div className="w-5 h-7 rounded overflow-hidden shrink-0 border border-white/30 bg-black">
                      <img
                        src={model.imageSrc}
                        alt={model.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold leading-tight flex items-center gap-0.5">
                        <span>{model.icon}</span>
                        <span>{idx + 1}. {model.name.split(" ")[0]}</span>
                      </span>
                      <span className="text-[8px] text-pink-200/90 leading-tight">
                        {model.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Character Stage: EXACT COLOURFUL IMAGE BODY (Not moveable, perfectly matching the original artwork) */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-0 py-1 overflow-hidden">

        {/* Concentric Holographic Orbital Rings around waist/torso (Hayat / Maya reference style) */}
        {showHoloEffects && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Outer tilted cosmic ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              style={{
                borderColor: `${activeModelMeta.colorHex}55`,
                boxShadow: `0 0 20px ${activeModelMeta.colorHex}33`,
              }}
              className="absolute w-[280px] h-[120px] rounded-[100%] border-[1.5px] border-dashed -rotate-12"
            />
            {/* Inner counter-rotating orbital ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              style={{
                borderColor: `${activeModelMeta.accentHex}66`,
              }}
              className="absolute w-[240px] h-[95px] rounded-[100%] border border-dotted rotate-6"
            />
          </div>
        )}

        {/* The Exact Character Body (Vibrant, Full Colors, Organic Breathing Scale Animation) */}
        <motion.div
          style={{ transformOrigin: "50% 92%" }}
          animate={{
            scaleY:
              state === "speaking"
                ? [1, 1.034 + Math.min(audioLevel * 0.05, 0.05), 1]
                : state === "listening"
                ? [1, 1.026, 1]
                : [1, 1.022, 1],
            scaleX:
              state === "speaking"
                ? [1, 1.018 + Math.min(audioLevel * 0.03, 0.03), 1]
                : state === "listening"
                ? [1, 1.012, 1]
                : [1, 1.010, 1],
            y:
              state === "speaking"
                ? [0, -3.5 - Math.min(audioLevel * 4, 4), 0]
                : [0, -4, 0],
          }}
          transition={{
            duration: state === "speaking" ? 1.2 : 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative h-full max-h-[440px] sm:max-h-[480px] aspect-[9/16] flex items-center justify-center z-10"
        >
          {/* Sound-Reactive Dynamic Backlight Silhouette with Synchronized Breathing */}
          {showHoloEffects && (
            <motion.div
              style={{
                transformOrigin: "50% 92%",
                filter: `drop-shadow(0 0 ${reactiveGlow}px ${activeModelMeta.colorHex})`,
              }}
              animate={{
                opacity: state === "speaking" ? [0.6, 0.95, 0.6] : [0.35, 0.65, 0.35],
                scale: state === "speaking" ? [1, 1.04 + audioLevel * 0.06, 1] : [1, 1.024, 1],
              }}
              transition={{
                duration: state === "speaking" ? 1.2 : 3.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <img
                src={activeModelMeta.imageSrc}
                alt=""
                className="w-full h-full object-contain object-bottom opacity-35 blur-md"
                aria-hidden="true"
              />
            </motion.div>
          )}

          {/* Crisp, Vibrant, High-Resolution Real Character Artwork with Subtle Breathing Shimmer */}
          <motion.img
            src={activeModelMeta.imageSrc}
            alt={activeModelMeta.name}
            onLoad={() => setImageLoaded(true)}
            style={{ transformOrigin: "50% 92%" }}
            animate={{
              filter: showHoloEffects
                ? [
                    `drop-shadow(0 0 ${reactiveGlow}px ${activeModelMeta.colorHex}66) drop-shadow(0 10px 25px rgba(0,0,0,0.8))`,
                    `drop-shadow(0 0 ${reactiveGlow + 4}px ${activeModelMeta.colorHex}88) drop-shadow(0 12px 28px rgba(0,0,0,0.85))`,
                    `drop-shadow(0 0 ${reactiveGlow}px ${activeModelMeta.colorHex}66) drop-shadow(0 10px 25px rgba(0,0,0,0.8))`,
                  ]
                : [
                    "drop-shadow(0 10px 25px rgba(0,0,0,0.8))",
                    "drop-shadow(0 12px 28px rgba(0,0,0,0.85))",
                    "drop-shadow(0 10px 25px rgba(0,0,0,0.8))",
                  ],
            }}
            transition={{
              duration: state === "speaking" ? 1.2 : 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-full h-full object-contain object-bottom transition-all duration-300 drop-shadow-2xl"
          />

          {/* Subtle Prismatic Hologram Shimmer Reflection */}
          {showHoloEffects && (
            <motion.div
              animate={{
                y: ["-100%", "200%"],
              }}
              transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-b from-transparent via-white/12 to-transparent pointer-events-none mix-blend-overlay"
            />
          )}
        </motion.div>

        {/* Futuristic Holographic Floor Projector & Pedestal */}
        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pointer-events-none z-5">
          {/* Projector Floor Rings with Perspective */}
          <div className="relative w-56 h-14 flex items-center justify-center">
            {/* Outer Projector Emitter Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              style={{
                borderColor: `${activeModelMeta.colorHex}77`,
                boxShadow: `0 0 25px ${activeModelMeta.colorHex}55, inset 0 0 15px ${activeModelMeta.colorHex}33`,
              }}
              className="absolute w-52 h-12 rounded-[100%] border-[2px] border-dashed"
            />

            {/* Inner Projector Light Beam Core */}
            <motion.div
              animate={{
                scale: state === "speaking" ? [1, 1.15 + audioLevel * 0.2, 1] : [1, 1.05, 1],
                opacity: state === "speaking" ? [0.7, 1, 0.7] : [0.5, 0.75, 0.5],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: `radial-gradient(ellipse at center, ${activeModelMeta.colorHex}bb 0%, ${activeModelMeta.accentHex}44 50%, transparent 80%)`,
              }}
              className="absolute w-40 h-8 rounded-[100%] blur-xs"
            />

            {/* Upward Laser Light Fan */}
            <div
              style={{
                background: `linear-gradient(to top, ${activeModelMeta.colorHex}33 0%, transparent 100%)`,
              }}
              className="absolute -top-16 w-36 h-20 [clip-path:polygon(20%_100%,80%_100%,100%_0%,0%_0%)] opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 📌 Bottom Status & Vibe Pill: Exactly Matching User Screenshot (HAYAT recording! & ✨ Excited) */}
      <div className="w-full pb-3.5 px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left spacer for optical center balance */}
        <div className="w-20 hidden sm:block pointer-events-none" />

        {/* Center: HAYAT recording! (Exact style from user reference image) */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm tracking-wide bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 shadow-lg">
          <span className="text-cyan-400 font-black uppercase tracking-wider drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            {activeModelMeta.name.split(" ")[0]}
          </span>
          <span className="text-white/90 font-medium">
            {state === "speaking"
              ? "speaking!"
              : state === "listening"
              ? audioLevel > 0.04
                ? "recording!"
                : "recording!"
              : state === "connecting"
              ? "connecting..."
              : "ready!"}
          </span>
        </div>

        {/* Right: ✨ Excited Pill Button (Exact style from user reference image) */}
        <button
          type="button"
          onClick={() => {
            const nextIdx =
              (HOLOGRAM_MODELS.findIndex((m) => m.id === selectedModel) + 1) %
              HOLOGRAM_MODELS.length;
            handleSelectModel(HOLOGRAM_MODELS[nextIdx].id);
          }}
          className="px-3.5 py-1.5 rounded-2xl bg-[#141724]/85 hover:bg-[#1f2438] backdrop-blur-md border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer active:scale-95"
          title={`Vibe: ${activeModelMeta.vibe} (Tap to change look & vibe)`}
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>{activeModelMeta.vibe.split(" ")[0]}</span>
        </button>
      </div>
    </div>
  );
}
