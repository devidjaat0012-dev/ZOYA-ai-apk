import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, RotateCcw, Sparkles, Mic, Volume2, PictureInPicture2, Shield, Zap, Radio, Target, Box, Disc3 } from "lucide-react";
import { CharacterPresetId, SessionState, getCharacterAvatar } from "../types";
import Zoya3DHologramBody, { HOLOGRAM_MODELS, HologramModelType } from "./Zoya3DHologramBody";

const CUSTOM_AVATAR_STORAGE_KEY = "zoya_custom_live_avatar_v2";

interface VisualizerProps {
  state: SessionState;
  audioLevel?: number; // 0.0 to 1.0 real-time reactive level
  frequencyData?: number[];
  onToggleSession?: () => void;
  isMicMuted?: boolean;
  angerLevel?: 0 | 1 | 2 | 3;
  characterPreset?: CharacterPresetId;
  assistantName?: string;
  zoyaBodyId?: string;
  onSelectZoyaBody?: (bodyId: string) => void;
}

export default function Visualizer({
  state,
  audioLevel = 0,
  frequencyData = [],
  onToggleSession,
  isMicMuted = false,
  angerLevel = 0,
  characterPreset = "zoya",
  assistantName = "Zoya",
  zoyaBodyId,
  onSelectZoyaBody,
}: VisualizerProps) {
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);

  // 3D Hologram Body vs Neural Core Orb mode switcher
  const [viewMode, setViewMode] = useState<"3d_hologram" | "core_orb">(() => {
    try {
      const saved = localStorage.getItem("zoya_visualizer_mode");
      if (saved === "core_orb") return "core_orb";
    } catch {
      // ignore
    }
    return "3d_hologram";
  });
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(false);

  const handleSetViewMode = (mode: "3d_hologram" | "core_orb") => {
    setViewMode(mode);
    try {
      localStorage.setItem("zoya_visualizer_mode", mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const videoEl = pipVideoRef.current;
    if (!videoEl) return;
    const handleLeavePip = () => setIsPipActive(false);
    videoEl.addEventListener("leavepictureinpicture", handleLeavePip);
    return () => {
      videoEl.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, []);

  const handleTogglePip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
        return;
      }
      const canvas = faceCanvasRef.current;
      const video = pipVideoRef.current;
      if (!canvas || !video) return;

      if (!video.srcObject && typeof (canvas as any).captureStream === "function") {
        const stream = (canvas as any).captureStream(30);
        video.srcObject = stream;
      }
      await video.play();
      if (typeof (video as any).requestPictureInPicture === "function") {
        await (video as any).requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn("Picture-in-Picture not supported or blocked:", err);
    }
  };

  // Refs for real-time 60fps animation loop without re-binding canvas effect
  const stateRef = useRef<SessionState>(state);
  const audioLevelRef = useRef<number>(audioLevel);
  const freqRef = useRef<number[]>(frequencyData);
  const isMicMutedRef = useRef<boolean>(isMicMuted);
  const angerLevelRef = useRef<number>(angerLevel);

  // Track angerLevel transitions between happy (0) and angry (1, 2, 3) for fluid CSS fade animation
  const prevAngerLevelRef = useRef<number>(angerLevel);
  const [isMoodTransitioning, setIsMoodTransitioning] = useState<boolean>(false);
  const [moodTransitionType, setMoodTransitionType] = useState<"happy-to-angry" | "angry-to-happy" | null>(null);

  useEffect(() => {
    const prev = prevAngerLevelRef.current;
    if (prev !== angerLevel) {
      if (prev === 0 && angerLevel > 0) {
        setMoodTransitionType("happy-to-angry");
        setIsMoodTransitioning(true);
        const timer = setTimeout(() => setIsMoodTransitioning(false), 1250);
        prevAngerLevelRef.current = angerLevel;
        return () => clearTimeout(timer);
      } else if (prev > 0 && angerLevel === 0) {
        setMoodTransitionType("angry-to-happy");
        setIsMoodTransitioning(true);
        const timer = setTimeout(() => setIsMoodTransitioning(false), 1250);
        prevAngerLevelRef.current = angerLevel;
        return () => clearTimeout(timer);
      } else if (prev > 0 && angerLevel > 0) {
        setMoodTransitionType("happy-to-angry");
        setIsMoodTransitioning(true);
        const timer = setTimeout(() => setIsMoodTransitioning(false), 1250);
        prevAngerLevelRef.current = angerLevel;
        return () => clearTimeout(timer);
      }
      prevAngerLevelRef.current = angerLevel;
    }
  }, [angerLevel]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    freqRef.current = frequencyData;
  }, [frequencyData]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    angerLevelRef.current = angerLevel;
  }, [angerLevel]);

  const currentAvatarStorageKey = `${CUSTOM_AVATAR_STORAGE_KEY}_${characterPreset}`;

  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem(currentAvatarStorageKey);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${CUSTOM_AVATAR_STORAGE_KEY}_${characterPreset}`);
      setCustomAvatar(saved || null);
    } catch {
      setCustomAvatar(null);
    }
  }, [characterPreset]);

  const presetDefaultAvatar = getCharacterAvatar(characterPreset);
  const avatarSrc = customAvatar || presetDefaultAvatar;

  // Handle custom photo upload from user's device
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) {
        setCustomAvatar(result);
        try {
          localStorage.setItem(currentAvatarStorageKey, result);
        } catch (err) {
          console.warn("Could not save custom avatar to localStorage:", err);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleResetAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomAvatar(null);
    try {
      localStorage.removeItem(currentAvatarStorageKey);
    } catch {}
  };

  // ============================================================================
  // ============================================================================
  // 60FPS REAL-TIME AI NEURAL VOICE CORE & AVATAR CANVAS ENGINE
  // ============================================================================
  useEffect(() => {
    const canvas = faceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isZoyaDefault = characterPreset === "zoya" && !customAvatar;

    const img = new Image();
    img.crossOrigin = "anonymous";
    let isLoaded = false;

    if (!isZoyaDefault) {
      img.src = avatarSrc;
      img.onload = () => {
        isLoaded = true;
      };
    }

    let animId: number;
    let smoothAudioLevel = 0;

    const renderFace = (now: number) => {
      const t = now * 0.001;
      const currentState = stateRef.current;
      const rawLevel = audioLevelRef.current;
      const freqs = freqRef.current;
      const currentAnger = angerLevelRef.current;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      smoothAudioLevel += (rawLevel - smoothAudioLevel) * 0.28;
      const effLevel = Math.max(0.06, smoothAudioLevel);

      // ======================================================================
      // 1. ZOYA NEURAL AI VOICE CORE - ABSTRACT SOUNDWAVE & QUANTUM ORB
      // ======================================================================
      if (isZoyaDefault) {
        const cx = W / 2;
        const cy = H / 2;

        // 1A. Deep Cyber Obsidian Base
        ctx.fillStyle = "#040208";
        ctx.fillRect(0, 0, W, H);

        // 1B. Dynamic Ambient Plasma Backlight
        const auraRadius = W * (0.38 + effLevel * 0.18 + Math.sin(t * 2.4) * 0.02);
        const auraGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, auraRadius);
        if (currentAnger > 0) {
          auraGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
          auraGrad.addColorStop(0.5, "rgba(244, 63, 94, 0.22)");
          auraGrad.addColorStop(1, "rgba(220, 38, 38, 0)");
        } else {
          auraGrad.addColorStop(0, "rgba(244, 114, 182, 0.45)");
          auraGrad.addColorStop(0.4, "rgba(168, 85, 247, 0.25)");
          auraGrad.addColorStop(0.8, "rgba(6, 182, 212, 0.12)");
          auraGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
        }
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 1C. Audio Radial Equalizer Spokes (36 reactive frequency spikes)
        const spokes = 36;
        const baseSpokeR = W * 0.32;
        ctx.save();
        ctx.lineCap = "round";
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Math.PI * 2 + t * 0.14;
          const freqVal = freqs[i % Math.max(1, freqs.length)] || effLevel;
          const spokeLen = 8 + freqVal * (currentAnger > 0 ? 42 : 36) + Math.sin(t * 5 + i) * 3;
          const rInner = baseSpokeR;
          const rOuter = baseSpokeR + spokeLen;

          const x1 = cx + Math.cos(angle) * rInner;
          const y1 = cy + Math.sin(angle) * rInner;
          const x2 = cx + Math.cos(angle) * rOuter;
          const y2 = cy + Math.sin(angle) * rOuter;

          ctx.strokeStyle =
            currentAnger > 0
              ? `rgba(239, 68, 68, ${0.4 + (i % 2 === 0 ? 0.45 : 0.2)})`
              : i % 3 === 0
              ? `rgba(6, 182, 212, ${0.45 + effLevel * 0.45})`
              : i % 3 === 1
              ? `rgba(236, 72, 153, ${0.5 + effLevel * 0.45})`
              : `rgba(168, 85, 247, ${0.45 + effLevel * 0.45})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();

        // 1D. Concentric Holographic Gyroscope Orbit Rings (rotating in counter-phases)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.35);
        ctx.strokeStyle = currentAnger > 0 ? "rgba(251, 113, 133, 0.65)" : "rgba(236, 72, 153, 0.65)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([12, 10, 24, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, W * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(-t * 0.7);
        ctx.strokeStyle = currentAnger > 0 ? "rgba(245, 158, 11, 0.7)" : "rgba(6, 182, 212, 0.7)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 14]);
        ctx.beginPath();
        ctx.arc(0, 0, W * 0.27, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 1E. Harmonic Sine Wave Equalizer Ribbon looping through center
        ctx.save();
        ctx.beginPath();
        const ribbonWidth = W * 0.58;
        const ribbonStartX = cx - ribbonWidth / 2;
        for (let rx = 0; rx <= ribbonWidth; rx += 4) {
          const normX = rx / ribbonWidth;
          const envelope = Math.sin(normX * Math.PI);
          const waveY = cy + Math.sin(normX * 14 + t * 7) * (effLevel * 32 + 5) * envelope;
          if (rx === 0) ctx.moveTo(ribbonStartX + rx, waveY);
          else ctx.lineTo(ribbonStartX + rx, waveY);
        }
        ctx.strokeStyle = currentAnger > 0 ? "rgba(255, 255, 255, 0.88)" : "rgba(56, 189, 248, 0.88)";
        ctx.lineWidth = 2.4;
        ctx.shadowColor = currentAnger > 0 ? "#ef4444" : "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // 1F. Central Glowing Core Sphere
        ctx.save();
        const coreR = W * (0.13 + effLevel * 0.08 + (currentState === "speaking" ? Math.sin(t * 12) * 0.015 : Math.sin(t * 2.2) * 0.008));
        const coreGrad = ctx.createRadialGradient(cx - coreR * 0.25, cy - coreR * 0.25, 2, cx, cy, coreR);
        if (currentAnger > 0) {
          coreGrad.addColorStop(0, "#ffffff");
          coreGrad.addColorStop(0.3, "#f43f5e");
          coreGrad.addColorStop(0.7, "#dc2626");
          coreGrad.addColorStop(1, "#7f1d1d");
        } else {
          coreGrad.addColorStop(0, "#ffffff");
          coreGrad.addColorStop(0.25, "#f472b6");
          coreGrad.addColorStop(0.6, "#ec4899");
          coreGrad.addColorStop(0.85, "#8b5cf6");
          coreGrad.addColorStop(1, "#06b6d4");
        }
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = currentAnger > 0 ? "#f43f5e" : "#ec4899";
        ctx.shadowBlur = 24 + effLevel * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight on sphere
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(cx - coreR * 0.35, cy - coreR * 0.35, coreR * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 1G. Orbiting Cyber Satellite Particles
        ctx.save();
        const particleCount = 18;
        for (let p = 0; p < particleCount; p++) {
          const speed = (p % 2 === 0 ? 1 : -1) * (0.5 + (p % 4) * 0.2);
          const pAngle = t * speed + (p / particleCount) * Math.PI * 2;
          const pDist = W * (0.18 + (p % 5) * 0.04 + effLevel * 0.04);
          const px = cx + Math.cos(pAngle) * pDist;
          const py = cy + Math.sin(pAngle) * pDist;
          const pr = 1.6 + (p % 3) * 0.8;

          ctx.fillStyle =
            currentAnger > 0
              ? p % 2 === 0
                ? "#fca5a5"
                : "#f59e0b"
              : p % 3 === 0
              ? "#38bdf8"
              : p % 3 === 1
              ? "#f472b6"
              : "#c084fc";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 1H. HUD Telemetry Arc Label
        ctx.save();
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = currentAnger > 0 ? "rgba(252, 165, 165, 0.8)" : "rgba(244, 114, 182, 0.8)";
        ctx.textAlign = "center";
        ctx.fillText(
          currentAnger > 0
            ? `ZOYA // ANGER CORE [LVL ${currentAnger}]`
            : currentState === "speaking"
            ? "ZOYA // SYNTHESIZING VOICE..."
            : currentState === "listening"
            ? "ZOYA // LISTENING ATTENTIVELY"
            : "ZOYA // NEURAL AUDIO CORE",
          cx,
          H - 24
        );
        ctx.restore();
      } else if (isLoaded) {
        // ======================================================================
        // 2. CHARACTER PRESETS (JARVIS / FRIDAY / VENOM / CUSTOM AVATAR)
        // ======================================================================
        const imgAspect = img.width / img.height;
        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;
        if (imgAspect > 1) {
          sw = img.height;
          sx = (img.width - sw) / 2;
        } else if (imgAspect < 1) {
          sh = img.width;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

        if (characterPreset === "jarvis") {
          // Golden-amber Stark Arc Reactor Core Bloom
          ctx.save();
          const coreBloom = ctx.createRadialGradient(
            W * 0.5,
            H * 0.5,
            W * 0.02,
            W * 0.5,
            H * 0.5,
            W * (0.34 + effLevel * 0.14)
          );
          coreBloom.addColorStop(0, `rgba(255, 245, 205, ${0.65 + effLevel * 0.35})`);
          coreBloom.addColorStop(0.35, `rgba(245, 158, 11, ${0.45 + effLevel * 0.3})`);
          coreBloom.addColorStop(0.75, "rgba(217, 119, 6, 0.2)");
          coreBloom.addColorStop(1, "rgba(217, 119, 6, 0)");
          ctx.fillStyle = coreBloom;
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + effLevel * 0.4})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * (0.16 + effLevel * 0.06), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (characterPreset === "friday") {
          // Emerald tactical cybernetic core bloom
          ctx.save();
          const coreBloom = ctx.createRadialGradient(
            W * 0.5,
            H * 0.5,
            W * 0.02,
            W * 0.5,
            H * 0.5,
            W * (0.35 + effLevel * 0.15)
          );
          coreBloom.addColorStop(0, `rgba(167, 243, 208, ${0.7 + effLevel * 0.3})`);
          coreBloom.addColorStop(0.35, `rgba(16, 185, 129, ${0.45 + effLevel * 0.25})`);
          coreBloom.addColorStop(0.75, "rgba(6, 182, 212, 0.2)");
          coreBloom.addColorStop(1, "rgba(6, 182, 212, 0)");
          ctx.fillStyle = coreBloom;
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * 0.46, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(52, 211, 153, ${0.6 + effLevel * 0.35})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * (0.17 + effLevel * 0.05), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (characterPreset === "venom") {
          // Dark crimson & violet symbiote bio-plasma bloom
          ctx.save();
          const coreBloom = ctx.createRadialGradient(
            W * 0.5,
            H * 0.5,
            W * 0.04,
            W * 0.5,
            H * 0.5,
            W * (0.42 + effLevel * 0.18)
          );
          coreBloom.addColorStop(0, `rgba(220, 38, 38, ${0.45 + effLevel * 0.4})`);
          coreBloom.addColorStop(0.45, `rgba(126, 34, 206, ${0.32 + effLevel * 0.3})`);
          coreBloom.addColorStop(0.85, `rgba(15, 23, 42, ${0.25 + effLevel * 0.2})`);
          coreBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = coreBloom;
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * 0.49, 0, Math.PI * 2);
          ctx.fill();

          const time = Date.now() * 0.003;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + effLevel * 0.45})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += 0.15) {
            const r = W * (0.40 + Math.sin(a * 6 + time) * 0.02 + effLevel * 0.04);
            const px = W * 0.5 + Math.cos(a) * r;
            const py = H * 0.5 + Math.sin(a) * r;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      if (!document.hidden) {
        animId = requestAnimationFrame(renderFace);
      }
    };

    animId = requestAnimationFrame(renderFace);

    // Keep visualizer animating even when the browser window is minimized (for Floating PiP Window)
    const bgInterval = setInterval(() => {
      if (document.hidden) {
        renderFace(performance.now());
      }
    }, 45);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(bgInterval);
    };
  }, [avatarSrc, customAvatar, characterPreset]);

  // ============================================================================
  // OSCILLOSCOPE AUDIO WAVEFORM BELOW AVATAR
  // ============================================================================
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const effectiveLevel = Math.max(0.08, audioLevel);

      let strokeColor1 = "rgba(236, 72, 153, 0.45)";
      let strokeColor2 = "rgba(168, 85, 247, 0.35)";
      let strokeColor3 = "rgba(6, 182, 212, 0.25)";

      if (angerLevel === 1) {
        strokeColor1 = "rgba(251, 113, 133, 0.85)";
        strokeColor2 = "rgba(245, 158, 11, 0.65)";
        strokeColor3 = "rgba(244, 63, 94, 0.45)";
      } else if (angerLevel === 2) {
        strokeColor1 = "rgba(244, 63, 94, 0.95)";
        strokeColor2 = "rgba(239, 68, 68, 0.8)";
        strokeColor3 = "rgba(251, 113, 133, 0.6)";
      } else if (angerLevel >= 3) {
        strokeColor1 = "rgba(239, 68, 68, 1)";
        strokeColor2 = "rgba(220, 38, 38, 0.9)";
        strokeColor3 = "rgba(244, 63, 94, 0.75)";
      } else if (characterPreset === "jarvis") {
        strokeColor1 = state === "speaking" ? "rgba(251, 191, 36, 0.95)" : "rgba(245, 158, 11, 0.8)";
        strokeColor2 = "rgba(217, 119, 6, 0.65)";
        strokeColor3 = "rgba(254, 243, 199, 0.45)";
      } else if (characterPreset === "friday") {
        strokeColor1 = state === "speaking" ? "rgba(52, 211, 153, 0.95)" : "rgba(16, 185, 129, 0.8)";
        strokeColor2 = "rgba(6, 182, 212, 0.65)";
        strokeColor3 = "rgba(167, 243, 208, 0.45)";
      } else if (characterPreset === "venom") {
        strokeColor1 = "rgba(220, 38, 38, 0.95)";
        strokeColor2 = "rgba(147, 51, 234, 0.7)";
        strokeColor3 = "rgba(153, 27, 27, 0.5)";
      } else if (state === "speaking") {
        strokeColor1 = "rgba(244, 63, 94, 0.9)";
        strokeColor2 = "rgba(236, 72, 153, 0.7)";
        strokeColor3 = "rgba(192, 132, 252, 0.55)";
      } else if (state === "listening") {
        strokeColor1 = isMicMuted
          ? "rgba(148, 163, 184, 0.4)"
          : "rgba(16, 185, 129, 0.85)";
        strokeColor2 = isMicMuted
          ? "rgba(100, 116, 139, 0.3)"
          : "rgba(6, 182, 212, 0.65)";
        strokeColor3 = isMicMuted
          ? "rgba(71, 85, 105, 0.2)"
          : "rgba(236, 72, 153, 0.4)";
      } else if (state === "connecting") {
        strokeColor1 = "rgba(245, 158, 11, 0.75)";
        strokeColor2 = "rgba(236, 72, 153, 0.5)";
        strokeColor3 = "rgba(139, 92, 246, 0.35)";
      }

      const waves = [
        {
          amplitude: 24 * effectiveLevel,
          freq: 0.025,
          speed: 0.05,
          color: strokeColor1,
          lineWidth: 2.5,
        },
        {
          amplitude: 16 * effectiveLevel,
          freq: 0.04,
          speed: -0.04,
          color: strokeColor2,
          lineWidth: 1.8,
        },
        {
          amplitude: 9 * effectiveLevel,
          freq: 0.06,
          speed: 0.065,
          color: strokeColor3,
          lineWidth: 1.2,
        },
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.shadowBlur =
          angerLevel > 0
            ? 10 + angerLevel * 7
            : state === "speaking" || state === "listening"
            ? 12
            : 4;
        ctx.shadowColor = wave.color;

        for (let x = 0; x < width; x += 3) {
          const windowing = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * wave.freq + phase * wave.speed) *
              wave.amplitude *
              windowing;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      phase += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, isMicMuted, angerLevel, characterPreset]);

  // Dynamic visual feedback on Zoya's mood via animated glowing visualizer ring
  const getMoodGlowConfig = () => {
    if (angerLevel === 1) {
      return {
        ringBorderColor: "rgba(251, 113, 133, 0.9)", // Warm coral-rose
        boxShadowKeyframes: [
          "0 0 26px rgba(251, 113, 133, 0.5), 0 0 52px rgba(245, 158, 11, 0.22), inset 0 0 16px rgba(251, 113, 133, 0.2)",
          "0 0 48px rgba(251, 113, 133, 0.8), 0 0 82px rgba(245, 158, 11, 0.42), inset 0 0 26px rgba(251, 113, 133, 0.35)",
          "0 0 26px rgba(251, 113, 133, 0.5), 0 0 52px rgba(245, 158, 11, 0.22), inset 0 0 16px rgba(251, 113, 133, 0.2)",
        ],
        pulseDuration: 2.2,
        outerRingScale: [1, 1.032, 1],
        coronaOpacity: [0.35, 0.65, 0.35],
        haloBorderColor: "rgba(251, 113, 133, 0.75)",
        haloRotateDuration: 10,
        ambientGradient: "bg-gradient-to-tr from-rose-500/40 via-amber-500/35 to-pink-500/30",
        moodThemeLabel: "Mild Annoyed Pout",
      };
    }

    if (angerLevel === 2) {
      return {
        ringBorderColor: "rgba(244, 63, 94, 0.95)", // Fiery crimson
        boxShadowKeyframes: [
          "0 0 42px rgba(244, 63, 94, 0.75), 0 0 85px rgba(239, 68, 68, 0.5), inset 0 0 24px rgba(244, 63, 94, 0.4)",
          "0 0 75px rgba(244, 63, 94, 0.95), 0 0 125px rgba(239, 68, 68, 0.72), inset 0 0 42px rgba(244, 63, 94, 0.6)",
          "0 0 42px rgba(244, 63, 94, 0.75), 0 0 85px rgba(239, 68, 68, 0.5), inset 0 0 24px rgba(244, 63, 94, 0.4)",
        ],
        pulseDuration: 1.5,
        outerRingScale: [1, 1.05, 1],
        coronaOpacity: [0.55, 0.9, 0.55],
        haloBorderColor: "rgba(239, 68, 68, 0.85)",
        haloRotateDuration: 6.5,
        ambientGradient: "bg-gradient-to-tr from-red-500/50 via-rose-500/45 to-amber-500/35",
        moodThemeLabel: "Gussa / Nakhre",
      };
    }

    if (angerLevel >= 3) {
      return {
        ringBorderColor: "rgba(239, 68, 68, 1)", // Burning ruby scarlet
        boxShadowKeyframes: [
          "0 0 58px rgba(239, 68, 68, 0.9), 0 0 110px rgba(220, 38, 38, 0.7), 0 0 160px rgba(244, 63, 94, 0.55), inset 0 0 38px rgba(239, 68, 68, 0.65)",
          "0 0 100px rgba(239, 68, 68, 1), 0 0 165px rgba(220, 38, 38, 0.95), 0 0 220px rgba(244, 63, 94, 0.8), inset 0 0 60px rgba(239, 68, 68, 0.9)",
          "0 0 58px rgba(239, 68, 68, 0.9), 0 0 110px rgba(220, 38, 38, 0.7), 0 0 160px rgba(244, 63, 94, 0.55), inset 0 0 38px rgba(239, 68, 68, 0.65)",
        ],
        pulseDuration: 0.95,
        outerRingScale: [1, 1.072, 1],
        coronaOpacity: [0.75, 1, 0.75],
        haloBorderColor: "rgba(220, 38, 38, 0.95)",
        haloRotateDuration: 4,
        ambientGradient: "bg-gradient-to-tr from-red-600/60 via-red-500/55 to-rose-600/50",
        moodThemeLabel: "Peak Gussa & High Drama",
      };
    }

    // Character-specific visual glow and aura presets
    if (characterPreset === "jarvis") {
      const isSpeaking = state === "speaking";
      return {
        ringBorderColor: isSpeaking ? "rgba(251, 191, 36, 0.95)" : "rgba(245, 158, 11, 0.85)",
        boxShadowKeyframes: isSpeaking
          ? [
              "0 0 32px rgba(245, 158, 11, 0.75), 0 0 75px rgba(217, 119, 6, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.45)",
              "0 0 58px rgba(245, 158, 11, 0.95), 0 0 110px rgba(251, 191, 36, 0.75), inset 0 0 32px rgba(251, 191, 36, 0.65)",
              "0 0 32px rgba(245, 158, 11, 0.75), 0 0 75px rgba(217, 119, 6, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.45)",
            ]
          : [
              "0 0 22px rgba(245, 158, 11, 0.45), 0 0 50px rgba(217, 119, 6, 0.3), inset 0 0 14px rgba(245, 158, 11, 0.25)",
              "0 0 38px rgba(245, 158, 11, 0.65), 0 0 75px rgba(251, 191, 36, 0.45), inset 0 0 22px rgba(245, 158, 11, 0.4)",
              "0 0 22px rgba(245, 158, 11, 0.45), 0 0 50px rgba(217, 119, 6, 0.3), inset 0 0 14px rgba(245, 158, 11, 0.25)",
            ],
        pulseDuration: isSpeaking ? 1.3 : 2.5,
        outerRingScale: isSpeaking ? [1, 1.036, 1] : [1, 1.02, 1],
        coronaOpacity: isSpeaking ? [0.55, 0.88, 0.55] : [0.3, 0.6, 0.3],
        haloBorderColor: "rgba(251, 191, 36, 0.85)",
        haloRotateDuration: isSpeaking ? 8 : 16,
        ambientGradient: "bg-gradient-to-tr from-amber-600/50 via-yellow-500/40 to-orange-500/30",
        moodThemeLabel: isSpeaking ? "Stark AI Speaking" : "J.A.R.V.I.S. Standby",
      };
    }

    if (characterPreset === "friday") {
      const isSpeaking = state === "speaking";
      return {
        ringBorderColor: isSpeaking ? "rgba(52, 211, 153, 0.95)" : "rgba(16, 185, 129, 0.85)",
        boxShadowKeyframes: isSpeaking
          ? [
              "0 0 32px rgba(16, 185, 129, 0.75), 0 0 75px rgba(6, 182, 212, 0.5), inset 0 0 20px rgba(52, 211, 153, 0.45)",
              "0 0 58px rgba(16, 185, 129, 0.95), 0 0 110px rgba(6, 182, 212, 0.75), inset 0 0 32px rgba(52, 211, 153, 0.65)",
              "0 0 32px rgba(16, 185, 129, 0.75), 0 0 75px rgba(6, 182, 212, 0.5), inset 0 0 20px rgba(52, 211, 153, 0.45)",
            ]
          : [
              "0 0 22px rgba(16, 185, 129, 0.45), 0 0 48px rgba(6, 182, 212, 0.3), inset 0 0 14px rgba(16, 185, 129, 0.25)",
              "0 0 36px rgba(16, 185, 129, 0.65), 0 0 72px rgba(6, 182, 212, 0.45), inset 0 0 22px rgba(16, 185, 129, 0.4)",
              "0 0 22px rgba(16, 185, 129, 0.45), 0 0 48px rgba(6, 182, 212, 0.3), inset 0 0 14px rgba(16, 185, 129, 0.25)",
            ],
        pulseDuration: isSpeaking ? 1.3 : 2.5,
        outerRingScale: isSpeaking ? [1, 1.036, 1] : [1, 1.02, 1],
        coronaOpacity: isSpeaking ? [0.55, 0.88, 0.55] : [0.3, 0.6, 0.3],
        haloBorderColor: "rgba(16, 185, 129, 0.85)",
        haloRotateDuration: isSpeaking ? 7 : 14,
        ambientGradient: "bg-gradient-to-tr from-emerald-500/50 via-cyan-500/40 to-teal-400/30",
        moodThemeLabel: isSpeaking ? "F.R.I.D.A.Y. Tactical Online" : "F.R.I.D.A.Y. Standby",
      };
    }

    if (characterPreset === "venom") {
      const isSpeaking = state === "speaking";
      return {
        ringBorderColor: "rgba(220, 38, 38, 0.95)",
        boxShadowKeyframes: isSpeaking
          ? [
              "0 0 35px rgba(220, 38, 38, 0.8), 0 0 75px rgba(147, 51, 234, 0.55), inset 0 0 24px rgba(220, 38, 38, 0.5)",
              "0 0 65px rgba(220, 38, 38, 1), 0 0 120px rgba(147, 51, 234, 0.8), inset 0 0 40px rgba(220, 38, 38, 0.75)",
              "0 0 35px rgba(220, 38, 38, 0.8), 0 0 75px rgba(147, 51, 234, 0.55), inset 0 0 24px rgba(220, 38, 38, 0.5)",
            ]
          : [
              "0 0 24px rgba(220, 38, 38, 0.5), 0 0 55px rgba(147, 51, 234, 0.35), inset 0 0 16px rgba(220, 38, 38, 0.3)",
              "0 0 42px rgba(220, 38, 38, 0.75), 0 0 85px rgba(147, 51, 234, 0.55), inset 0 0 26px rgba(220, 38, 38, 0.55)",
              "0 0 24px rgba(220, 38, 38, 0.5), 0 0 55px rgba(147, 51, 234, 0.35), inset 0 0 16px rgba(220, 38, 38, 0.3)",
            ],
        pulseDuration: isSpeaking ? 1.05 : 2.2,
        outerRingScale: isSpeaking ? [1, 1.055, 1] : [1, 1.025, 1],
        coronaOpacity: isSpeaking ? [0.65, 0.98, 0.65] : [0.35, 0.65, 0.35],
        haloBorderColor: "rgba(220, 38, 38, 0.85)",
        haloRotateDuration: isSpeaking ? 5 : 11,
        ambientGradient: "bg-gradient-to-tr from-red-800/60 via-purple-950/70 to-slate-950/80",
        moodThemeLabel: "Klyntar Symbiote",
      };
    }

    // Default Calm / Loving / Normal for Zoya (angerLevel === 0)
    switch (state) {
      case "speaking":
        return {
          ringBorderColor: "rgba(244, 114, 182, 0.9)",
          boxShadowKeyframes: [
            "0 0 25px rgba(244, 63, 94, 0.55), 0 0 55px rgba(236, 72, 153, 0.4), inset 0 0 15px rgba(244, 63, 94, 0.25)",
            "0 0 45px rgba(244, 63, 94, 0.8), 0 0 85px rgba(236, 72, 153, 0.6), inset 0 0 25px rgba(244, 63, 94, 0.4)",
            "0 0 25px rgba(244, 63, 94, 0.55), 0 0 55px rgba(236, 72, 153, 0.4), inset 0 0 15px rgba(244, 63, 94, 0.25)",
          ],
          pulseDuration: 1.8,
          outerRingScale: [1, 1.028, 1],
          coronaOpacity: [0.35, 0.65, 0.35],
          haloBorderColor: "rgba(244, 114, 182, 0.7)",
          haloRotateDuration: 6,
          ambientGradient: "bg-gradient-to-tr from-rose-500/45 via-pink-400/45 to-purple-400/40",
          moodThemeLabel: "Sweet Speaking",
        };
      case "listening":
        return {
          ringBorderColor: isMicMuted
            ? "rgba(148, 163, 184, 0.6)"
            : "rgba(52, 211, 153, 0.85)",
          boxShadowKeyframes: isMicMuted
            ? [
                "0 0 15px rgba(100, 116, 139, 0.3), inset 0 0 10px rgba(100, 116, 139, 0.15)",
                "0 0 30px rgba(100, 116, 139, 0.45), inset 0 0 15px rgba(100, 116, 139, 0.25)",
                "0 0 15px rgba(100, 116, 139, 0.3), inset 0 0 10px rgba(100, 116, 139, 0.15)",
              ]
            : [
                "0 0 25px rgba(16, 185, 129, 0.5), 0 0 50px rgba(6, 182, 212, 0.35), inset 0 0 15px rgba(16, 185, 129, 0.2)",
                "0 0 45px rgba(16, 185, 129, 0.75), 0 0 75px rgba(6, 182, 212, 0.5), inset 0 0 24px rgba(16, 185, 129, 0.35)",
                "0 0 25px rgba(16, 185, 129, 0.5), 0 0 50px rgba(6, 182, 212, 0.35), inset 0 0 15px rgba(16, 185, 129, 0.2)",
              ],
          pulseDuration: 2.4,
          outerRingScale: [1, 1.02, 1],
          coronaOpacity: [0.3, 0.6, 0.3],
          haloBorderColor: isMicMuted
            ? "rgba(100, 116, 139, 0.4)"
            : "rgba(52, 211, 153, 0.65)",
          haloRotateDuration: 14,
          ambientGradient: isMicMuted
            ? "bg-gradient-to-tr from-slate-600/30 via-slate-500/20 to-slate-700/20"
            : "bg-gradient-to-tr from-emerald-500/35 via-cyan-400/30 to-pink-500/25",
          moodThemeLabel: "Active Listening",
        };
      case "connecting":
        return {
          ringBorderColor: "rgba(251, 191, 36, 0.85)",
          boxShadowKeyframes: [
            "0 0 25px rgba(245, 158, 11, 0.5), 0 0 50px rgba(245, 158, 11, 0.3), inset 0 0 15px rgba(245, 158, 11, 0.2)",
            "0 0 45px rgba(245, 158, 11, 0.75), 0 0 75px rgba(236, 72, 153, 0.5), inset 0 0 25px rgba(245, 158, 11, 0.35)",
            "0 0 25px rgba(245, 158, 11, 0.5), 0 0 50px rgba(245, 158, 11, 0.3), inset 0 0 15px rgba(245, 158, 11, 0.2)",
          ],
          pulseDuration: 1.2,
          outerRingScale: [1, 1.03, 1],
          coronaOpacity: [0.4, 0.75, 0.4],
          haloBorderColor: "rgba(245, 158, 11, 0.7)",
          haloRotateDuration: 5,
          ambientGradient: "bg-gradient-to-tr from-amber-500/35 via-pink-400/30 to-purple-400/25",
          moodThemeLabel: "Connecting",
        };
      case "disconnected":
      default:
        return {
          ringBorderColor: "rgba(244, 114, 182, 0.6)",
          boxShadowKeyframes: [
            "0 0 20px rgba(236, 72, 153, 0.35), 0 0 45px rgba(168, 85, 247, 0.22), inset 0 0 12px rgba(236, 72, 153, 0.15)",
            "0 0 35px rgba(236, 72, 153, 0.55), 0 0 65px rgba(168, 85, 247, 0.38), inset 0 0 20px rgba(236, 72, 153, 0.28)",
            "0 0 20px rgba(236, 72, 153, 0.35), 0 0 45px rgba(168, 85, 247, 0.22), inset 0 0 12px rgba(236, 72, 153, 0.15)",
          ],
          pulseDuration: 3.2,
          outerRingScale: [1, 1.018, 1],
          coronaOpacity: [0.25, 0.5, 0.25],
          haloBorderColor: "rgba(244, 114, 182, 0.4)",
          haloRotateDuration: 16,
          ambientGradient: "bg-gradient-to-tr from-pink-500/30 via-purple-400/25 to-cyan-400/20",
          moodThemeLabel: "Calm & Sweet Standby",
        };
    }
  };

  const moodGlow = getMoodGlowConfig();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      {/* Hidden file input so user can also pick their own exact image anytime */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />
      {/* Hidden video element used to stream animated face into OS Picture-in-Picture outside browser */}
      <video
        ref={pipVideoRef}
        muted
        playsInline
        className="fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none"
      />
      {/* Mode Switcher: 3D Hologram Body vs Neural Core Orb */}
      <div className="flex items-center gap-1.5 mb-2 z-30">
        <button
          type="button"
          onClick={() => handleSetViewMode("3d_hologram")}
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            viewMode === "3d_hologram"
              ? "bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)] scale-105"
              : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Box size={13} />
          <span>Hologram Body (5 Image Bodies)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSetViewMode("core_orb")}
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            viewMode === "core_orb"
              ? "bg-pink-500/30 text-pink-200 border border-pink-400/50 shadow-md"
              : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Disc3 size={13} />
          <span>Neural Core Orb</span>
        </button>
      </div>


      {viewMode === "3d_hologram" ? (
        <div className="w-full flex flex-col items-center justify-center relative z-20">
          <Zoya3DHologramBody
            state={state}
            audioLevel={audioLevel}
            frequencyData={frequencyData}
            assistantName={assistantName}
            isExpanded={is3DExpanded}
            onExpandToggle={() => setIs3DExpanded((prev) => !prev)}
            onToggleSession={onToggleSession}
            bodyModelId={zoyaBodyId as any}
            onSelectBodyModel={onSelectZoyaBody as any}
          />
        </div>
      ) : (
        <>
          {/* Ambient Dreamy / Holographic Plasma Backlight */}
          <motion.div
        animate={{
          scale:
            angerLevel > 0
              ? [1, 1.08 + angerLevel * 0.05, 1]
              : state === "speaking"
              ? [1, 1.16 + audioLevel * 0.25, 1]
              : [1, 1.06, 1],
          opacity:
            angerLevel > 0
              ? [0.45 + angerLevel * 0.12, 0.7 + angerLevel * 0.1, 0.45 + angerLevel * 0.12]
              : state === "speaking"
              ? [0.55, 0.88, 0.55]
              : [0.35, 0.5, 0.35],
        }}
        transition={{
          duration: moodGlow.pulseDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute w-[310px] h-[310px] sm:w-[400px] sm:h-[400px] rounded-full blur-[85px] pointer-events-none transition-colors duration-700 ${moodGlow.ambientGradient}`}
      />

      {/* Outer Animated Orbiting Aura & Movie Holographic HUD Rings */}
      <div className="relative w-[240px] h-[240px] sm:w-[296px] sm:h-[296px] flex items-center justify-center">
        {/* ==================================================================== */}
        {/* MOVIE-GRADE JARVIS HOLOGRAPHIC HUD GRAPHICS (IRON MAN / TONY STARK)  */}
        {/* ==================================================================== */}
        {characterPreset === "jarvis" && (
          <div className="absolute inset-[-28px] pointer-events-none z-15 flex items-center justify-center">
            {/* Outer Golden Azimuth Telemetry Ring with Degree Markings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-amber-400/40"
            >
              <div className="absolute top-0.5 inset-x-0 flex justify-center text-[8px] font-mono font-bold tracking-widest text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                000°
              </div>
              <div className="absolute bottom-0.5 inset-x-0 flex justify-center text-[8px] font-mono font-bold tracking-widest text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                180°
              </div>
              <div className="absolute left-1 inset-y-0 flex items-center text-[8px] font-mono font-bold tracking-widest text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                270°
              </div>
              <div className="absolute right-1 inset-y-0 flex items-center text-[8px] font-mono font-bold tracking-widest text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                090°
              </div>
            </motion.div>

            {/* Counter-rotating Segmented Stark Arc */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[10px] rounded-full border-[2px] border-amber-400/50 border-dashed"
            />

            {/* 4 Stark HUD Corner Brackets */}
            <div className="absolute inset-[-4px] flex flex-col justify-between p-1">
              <div className="flex justify-between items-start text-amber-300 font-mono text-xs drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                <span>⌜ STARK IND.</span>
                <span>SYS: 04 ⌝</span>
              </div>
              <div className="flex justify-between items-end text-amber-300 font-mono text-xs drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                <span>⌞ 844.2 MHz</span>
                <span>ARC CORE ⌟</span>
              </div>
            </div>

            {/* Top Floating Stark Telemetry Tag */}
            <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.5)] flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase text-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>STARK NEURAL INTERFACE // J.A.R.V.I.S.</span>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MOVIE-GRADE FRIDAY TACTICAL COMBAT HUD GRAPHICS (TACTICAL GREEN/CYAN)*/}
        {/* ==================================================================== */}
        {characterPreset === "friday" && (
          <div className="absolute inset-[-28px] pointer-events-none z-15 flex items-center justify-center">
            {/* Outer Emerald Tactical Compass Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-emerald-400/50"
            >
              <div className="absolute top-0.5 inset-x-0 flex justify-center text-[8px] font-mono font-bold tracking-widest text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
                TAC-N
              </div>
              <div className="absolute bottom-0.5 inset-x-0 flex justify-center text-[8px] font-mono font-bold tracking-widest text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
                TAC-S
              </div>
              <div className="absolute left-1 inset-y-0 flex items-center text-[8px] font-mono font-bold tracking-widest text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
                WEST
              </div>
              <div className="absolute right-1 inset-y-0 flex items-center text-[8px] font-mono font-bold tracking-widest text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
                EAST
              </div>
            </motion.div>

            {/* Counter-rotating Tactical Hexagonal Reticle */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[12px] rounded-full border-[1.5px] border-cyan-400/50 border-dotted"
            />

            {/* Tactical Combat Corner Targeting Reticles */}
            <div className="absolute inset-[-4px] flex flex-col justify-between p-1">
              <div className="flex justify-between items-start text-emerald-300 font-mono text-xs drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]">
                <span>[+ TARGET LOCK]</span>
                <span>[SUIT: 100%]</span>
              </div>
              <div className="flex justify-between items-end text-cyan-300 font-mono text-xs drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]">
                <span>[RADAR: ACTIVE]</span>
                <span>[IRISH CADENCE +]</span>
              </div>
            </div>

            {/* Top Floating Friday Tactical Tag */}
            <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.5)] flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase text-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>F.R.I.D.A.Y. TACTICAL HUD // PROTOCOL ONLINE</span>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VENOM SYMBIOTE BIO-PLASMA AURA                                        */}
        {/* ==================================================================== */}
        {characterPreset === "venom" && (
          <div className="absolute inset-[-20px] pointer-events-none z-15 flex items-center justify-center">
            {/* Top Floating Venom Symbiote Tag */}
            <div className="absolute -top-6 px-3 py-0.5 rounded-full bg-black/90 border border-red-600/70 shadow-[0_0_15px_rgba(220,38,38,0.7)] flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-red-200">
              <span>🖤</span>
              <span>KLYNTAR SYMBIOTE // WE ARE VENOM</span>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ZOYA ANIME HOLOGRAM AMBIENCE                                         */}
        {/* ==================================================================== */}
        {characterPreset === "zoya" && (
          <div className="absolute inset-[-20px] pointer-events-none z-15 flex items-center justify-center">
            <div className="absolute -top-6 px-3 py-0.5 rounded-full bg-pink-950/70 border border-pink-400/50 shadow-[0_0_12px_rgba(236,72,153,0.4)] flex items-center gap-1.5 text-[9px] font-semibold tracking-wider uppercase text-pink-200">
              <span>🌸</span>
              <span>ZOYA AI COMPANION · NEURAL VOICE CORE</span>
            </div>
          </div>
        )}

        {/* Rotating Ambient Halo Ring with Mood-Reactive Tint & Speed */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: moodGlow.haloRotateDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ borderColor: moodGlow.haloBorderColor }}
          className="absolute inset-[-10px] rounded-full border-[2px] border-dashed pointer-events-none transition-colors duration-700 visualizer-border-fade"
        />

        {/* Subtle Reactive CSS Fade Animation Wave when mood changes (Happy <-> Angry) */}
        {isMoodTransitioning && (
          <div
            key={`visualizer-mood-shift-wave-${angerLevel}`}
            style={{
              borderColor: moodGlow.ringBorderColor,
              boxShadow: `0 0 32px ${moodGlow.ringBorderColor}, inset 0 0 14px ${moodGlow.ringBorderColor}`,
            }}
            className="absolute inset-[-5.5px] rounded-full border-[2.5px] pointer-events-none z-15 visualizer-glow-wave-active"
          />
        )}

        {/* Dedicated Subtle Glowing Visualizer Ring */}
        <motion.div
          key="visualizer-mood-ring-steady"
          animate={{
            boxShadow: moodGlow.boxShadowKeyframes,
            scale: moodGlow.outerRingScale,
            opacity: moodGlow.coronaOpacity,
          }}
          transition={{
            duration: moodGlow.pulseDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            borderColor: moodGlow.ringBorderColor,
          }}
          className={`absolute inset-[-3.5px] rounded-full border-[2px] pointer-events-none z-10 visualizer-border-fade ${
            isMoodTransitioning ? "visualizer-mood-shift-active" : ""
          }`}
        />

        {/* Agitated Corona Radiation Ring for Moderate to High Anger */}
        <AnimatePresence>
          {angerLevel >= 2 && (
            <motion.div
              key={`anger-corona-${angerLevel}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                scale: angerLevel === 3 ? [1.02, 1.14, 1.02] : [1.01, 1.08, 1.01],
                opacity: angerLevel === 3 ? [0.65, 0.15, 0.65] : [0.45, 0.1, 0.45],
              }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                opacity: { duration: 0.75, ease: "easeInOut" },
                scale: {
                  duration: angerLevel === 3 ? 0.95 : 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className={`absolute inset-[-8px] rounded-full border pointer-events-none z-10 visualizer-border-fade ${
                angerLevel === 3 ? "border-red-500/80" : "border-rose-500/60"
              }`}
            />
          )}
        </AnimatePresence>

        {/* Audio-Reactive Expanding Pulse Ring */}
        <AnimatePresence>
          {(state === "speaking" || state === "listening") && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{
                scale: [1, 1.12 + audioLevel * 0.28, 1],
                opacity: [0.65, 0.15, 0.65],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: state === "speaking" ? 0.45 : 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute inset-[-6px] rounded-full border-2 pointer-events-none visualizer-border-fade ${
                characterPreset === "jarvis"
                  ? "border-amber-400"
                  : characterPreset === "friday"
                  ? "border-emerald-400"
                  : characterPreset === "venom"
                  ? "border-red-500"
                  : angerLevel > 0
                  ? "border-rose-400"
                  : state === "speaking"
                  ? "border-rose-400"
                  : "border-emerald-400"
              }`}
            />
          )}
        </AnimatePresence>

        {/* Floating Sparkles for Zoya only */}
        {characterPreset === "zoya" && (
          <>
            <motion.div
              animate={{
                y: [-4, -14, -4],
                opacity: [0.4, 0.95, 0.4],
                scale: [0.9, 1.15, 0.9],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 right-6 z-30 text-pink-300 pointer-events-none drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
            >
              <Sparkles size={18} />
            </motion.div>
            <motion.div
              animate={{
                y: [4, -8, 4],
                opacity: [0.3, 0.85, 0.3],
                scale: [0.85, 1.1, 0.85],
              }}
              transition={{
                duration: 4.1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-4 -left-2 z-30 text-purple-300 pointer-events-none drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
            />
          </>
        )}

        {/* Main 60FPS Live Animated Holographic Face & Pod Container */}
        <motion.div
          onClick={onToggleSession}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: moodGlow.boxShadowKeyframes,
            scale:
              state === "speaking"
                ? [1, 1.03 + Math.min(audioLevel * 0.04, 0.04), 1]
                : [1, 1.02, 1],
          }}
          transition={{
            boxShadow: {
              duration: moodGlow.pulseDuration,
              repeat: Infinity,
              ease: "easeInOut",
            },
            scale: {
              duration: state === "speaking" ? 1.2 : 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          style={{
            borderColor: moodGlow.ringBorderColor,
          }}
          className={`relative w-[220px] h-[220px] sm:w-[272px] sm:h-[272px] rounded-full overflow-hidden cursor-pointer z-20 border-[3.5px] visualizer-border-fade bg-black ${
            isMoodTransitioning ? "visualizer-mood-shift-active" : ""
          }`}
        >
          {/* 60FPS Real-Time AI Visualizer & Avatar Canvas (also streams to OS Picture-in-Picture) */}
          <canvas
            ref={faceCanvasRef}
            width={480}
            height={480}
            className="w-full h-full object-cover select-none pointer-events-none opacity-100"
          />

          {/* JARVIS Movie Hologram Scanline Bar */}
          {characterPreset === "jarvis" && (
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-amber-400/25 to-transparent pointer-events-none mix-blend-screen"
            />
          )}

          {/* FRIDAY Movie Tactical Cyber Scanline Bar */}
          {characterPreset === "friday" && (
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent pointer-events-none mix-blend-screen"
            />
          )}

          {/* VENOM Menacing Symbiote Bio-Plasma Tendril Sweep */}
          {characterPreset === "venom" && (
            <motion.div
              animate={{ y: ["-100%", "200%"], opacity: [0.2, 0.55, 0.2] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-red-600/35 to-purple-900/40 pointer-events-none mix-blend-color-dodge"
            />
          )}

          {/* Zoya Dreamy Sunlit Shimmer Overlay */}
          {characterPreset === "zoya" && (
            <motion.div
              animate={{
                opacity:
                  state === "speaking" ? [0.15, 0.32, 0.15] : [0.08, 0.18, 0.08],
                x: [-8, 8, -8],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-pink-300/15 to-white/25 pointer-events-none mix-blend-screen"
            />
          )}

          {/* Anime Anger Vein Badge when Zoya is Gussa */}
          {angerLevel > 0 && characterPreset === "zoya" && (
            <motion.div
              animate={{ scale: [0.92, 1.25, 0.92], rotate: [-8, 8, -8] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute top-3 right-5 z-30 px-2.5 py-1 rounded-full bg-red-600/90 border border-white/60 text-[10px] font-extrabold text-white shadow-lg flex items-center gap-1 pointer-events-none"
            >
              <span>💢</span>
              <span>GUSSA LVL {angerLevel}</span>
            </motion.div>
          )}

          {/* Dynamic Bottom Status Pill Inside Portrait */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-30">
            <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 flex items-center gap-1.5 shadow-lg">
              {state === "disconnected" && (
                <>
                  <span
                    className={`w-2 h-2 rounded-full animate-ping ${
                      characterPreset === "jarvis"
                        ? "bg-amber-400"
                        : characterPreset === "friday"
                        ? "bg-emerald-400"
                        : characterPreset === "venom"
                        ? "bg-red-500"
                        : "bg-pink-400"
                    }`}
                  />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-100">
                    Tap {assistantName} to Speak
                  </span>
                </>
              )}
              {state === "connecting" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-200">
                    Connecting...
                  </span>
                </>
              )}
              {state === "listening" && (
                <>
                  <Mic
                    size={11}
                    className={
                      isMicMuted
                        ? "text-slate-400"
                        : characterPreset === "jarvis"
                        ? "text-amber-400 animate-pulse"
                        : characterPreset === "friday"
                        ? "text-emerald-400 animate-pulse"
                        : "text-emerald-400 animate-pulse"
                    }
                  />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-200">
                    {isMicMuted ? "Mic Muted" : `${assistantName} Listening`}
                  </span>
                </>
              )}
              {state === "speaking" && (
                <>
                  <Volume2
                    size={11}
                    className={
                      characterPreset === "jarvis"
                        ? "text-amber-300 animate-bounce"
                        : characterPreset === "friday"
                        ? "text-emerald-300 animate-bounce"
                        : characterPreset === "venom"
                        ? "text-red-400 animate-bounce"
                        : "text-rose-300 animate-bounce"
                    }
                  />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-100">
                    {assistantName} Speaking
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Floating Quick Button to Pop-out Outside Browser (PiP), Upload Custom Photo, or Reset */}
        <div className="absolute bottom-1 right-2 z-30 flex items-center gap-1">
          <button
            type="button"
            onClick={handleTogglePip}
            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-lg transition-all ${
              isPipActive
                ? "bg-emerald-500 text-slate-950 border-emerald-300"
                : "bg-[#111726]/90 hover:bg-cyan-500/30 border-cyan-400/40 text-cyan-200 hover:text-white"
            }`}
            title={`Float ${assistantName} Outside Browser (Picture-in-Picture)`}
          >
            <PictureInPicture2 size={14} />
          </button>
          {customAvatar && (
            <button
              type="button"
              onClick={handleResetAvatar}
              className="w-8 h-8 rounded-full bg-[#111726]/90 hover:bg-rose-500/25 border border-white/15 text-slate-300 hover:text-rose-200 flex items-center justify-center shadow-lg transition-all"
              title={`Reset to original ${assistantName} Neural Core`}
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="w-8 h-8 rounded-full bg-[#111726]/90 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 hover:text-white flex items-center justify-center shadow-lg transition-all"
            title={`Change or upload custom ${assistantName} avatar`}
          >
            <Camera size={14} />
          </button>
        </div>
      </div>
      </>
      )}

      {/* Real-time Oscilloscope Sine Waveform */}
      <div className="w-full max-w-[420px] h-[46px] mt-4 relative flex items-center justify-center">
        <canvas
          ref={waveCanvasRef}
          width={420}
          height={46}
          className="w-full h-full pointer-events-none drop-shadow-md"
        />
      </div>

      {/* Futuristic Equalizer Bars */}
      {frequencyData.length > 0 &&
        (state === "speaking" || state === "listening") && (
          <div className="flex items-center gap-1.5 h-5 mt-0.5 px-4">
            {frequencyData.slice(0, 16).map((val, idx) => (
              <motion.div
                key={idx}
                animate={{ height: Math.max(3, val * 22) }}
                transition={{ duration: 0.08 }}
                className={`w-1 rounded-full ${
                  characterPreset === "jarvis"
                    ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                    : characterPreset === "friday"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                    : characterPreset === "venom"
                    ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    : state === "speaking"
                    ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                    : "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                }`}
              />
            ))}
          </div>
        )}
    </div>
  );
}

