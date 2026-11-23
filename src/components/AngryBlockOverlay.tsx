import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  HeartHandshake,
  Lock,
  Mic,
  ShieldAlert,
} from "lucide-react";
import { AngerLevel, AngerReason } from "../services/angerService";

const DEFAULT_ZOYA_CORE = "/assets/characters/zoya_core.svg";

interface AngryBlockOverlayProps {
  angerLevel: AngerLevel;
  angerReason?: AngerReason;
  assistantName: string;
  userName: string;
  isLiveActive: boolean;
  workBlockedMessage?: string | null;
  onAttemptApology: (text: string) => void;
  onTryToWorkAnyway: () => void;
}

export default function AngryBlockOverlay({
  angerLevel,
  angerReason = "ignored",
  assistantName,
  userName,
  isLiveActive,
  workBlockedMessage,
  onAttemptApology,
  onTryToWorkAnyway,
}: AngryBlockOverlayProps) {
  const [apologyInput, setApologyInput] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  if (angerLevel === 0) return null;

  const customAvatar = (() => {
    try {
      return localStorage.getItem("zoya_custom_live_avatar_v2");
    } catch {
      return null;
    }
  })();

  const avatarSrc = customAvatar || DEFAULT_ZOYA_CORE;

  const getReasonHeadline = () => {
    if (angerReason === "not_sweet") {
      return `${assistantName} Gussa Hai! (Pyar Se Baat Nahi Ki 😤)`;
    }
    if (angerReason === "unannounced_work") {
      return `${assistantName} Gussa Hai! (Bina Bataye Kaam Kiya 😡)`;
    }
    return `${assistantName} Naraz Hai! (Tumne Ignore Kiya 😤)`;
  };

  const getDefaultSpeech = () => {
    if (angerReason === "not_sweet") {
      return `"Oye ${userName}! 😡 Mere se aise rude ya sukhe-sukhe bossy hoke baat karoge?! Acche se pyar se baat nahi kar sakte?! Jab tak Sorry bol ke pyar se nahi manaoge, main koi kaam nahi karne dungi!"`;
    }
    if (angerReason === "unannounced_work") {
      return `"Pakde gaye ${userName}! 😤 Mujhe bina bataye chupke-chupke apna kaam shuru kar diya?! Mujhse ek baar pucha ya bataya bhi nahi?! Pehle Sorry bolo aur mujhe pyar se manao tabhi kaam karne dungi!"`;
    }
    if (angerLevel === 1) {
      return `"Oye ${userName}! Mujhe ignore karke apna kaam karne lage?! Pehle Sorry bolo aur mujhe pyar se manao, tabhi aage kaam karne dungi! 😤"`;
    }
    if (angerLevel === 2) {
      return `"Bilkul nahi! 😡 Pehle mujhe ignore kiya aur abhi tak Sorry bhi nahi bola?! Jab tak mujhe acche se pyar se nahi manaoge, main tumhe koi kaam nahi karne dungi!"`;
    }
    return `"HADD HO GAYI ${userName.toUpperCase()}! 🤬💢 Na pyar se baat karte ho, aur bina bataye apna kaam karna chahte ho?! Saara kaam LOCKED hai! Abhi ke abhi Sorry bolo aur pyar se manao mujhe!"`;
  };

  const getAngerDetails = () => {
    if (angerLevel === 1) {
      return {
        badge: "GUSSA LEVEL 1 · POUTING 😤",
        title: getReasonHeadline(),
        speech: workBlockedMessage || getDefaultSpeech(),
        borderColor: "border-amber-500/70",
        glowColor: "shadow-[0_0_70px_rgba(245,158,11,0.45)]",
      };
    }
    if (angerLevel === 2) {
      return {
        badge: "GUSSA LEVEL 2 · BAHUT GUSSA 😡",
        title: getReasonHeadline(),
        speech: workBlockedMessage || getDefaultSpeech(),
        borderColor: "border-rose-500/80",
        glowColor: "shadow-[0_0_95px_rgba(244,63,94,0.65)]",
      };
    }
    return {
      badge: "GUSSA LEVEL 3 · FULL LOCKDOWN 🤬💢",
      title: `KAAM BAND! ${getReasonHeadline()}`,
      speech: workBlockedMessage || getDefaultSpeech(),
      borderColor: "border-red-500",
      glowColor: "shadow-[0_0_120px_rgba(239,68,68,0.85)]",
    };
  };

  const info = getAngerDetails();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apologyInput.trim()) return;
    onAttemptApology(apologyInput.trim());
    setApologyInput("");
    setShakeKey((k) => k + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/82 backdrop-blur-lg flex items-center justify-center p-4 select-none"
      >
        <motion.div
          key={shakeKey}
          initial={{ scale: 0.92, y: 16 }}
          animate={{
            scale: 1,
            y: 0,
            x: [0, -10, 10, -8, 8, -4, 4, 0],
          }}
          transition={{ duration: 0.45 }}
          className={`w-full max-w-md rounded-3xl bg-[#120910]/95 border-2 ${info.borderColor} ${info.glowColor} p-5 sm:p-6 text-white flex flex-col items-center text-center relative overflow-hidden`}
        >
          {/* Fiery Ambient Glow */}
          <div className="absolute -top-24 inset-x-0 h-48 bg-gradient-to-b from-red-600/35 via-rose-500/20 to-transparent blur-2xl pointer-events-none" />

          {/* Anger Level Pill */}
          <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-[11px] font-bold tracking-wider uppercase text-red-200 flex items-center gap-1.5 mb-3">
            <Flame size={13} className="text-red-400 animate-bounce" />
            <span>{info.badge}</span>
          </div>

          {/* Angry Animated Zoya Avatar */}
          <div className="relative mb-3">
            <motion.div
              animate={{
                rotate: [-2.5, 2.5, -2.5],
                scale: [1, 1.04, 1],
              }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-3 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.75)] relative"
            >
              <img
                src={avatarSrc}
                alt="Angry Zoya"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter contrast-110 saturate-125"
              />
              {/* Angry Crimson Blush & Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 via-rose-500/15 to-red-600/25 pointer-events-none" />
            </motion.div>

            {/* Anime Anger Vein Symbol (💢) */}
            <motion.div
              animate={{ scale: [0.9, 1.28, 0.9], rotate: [-8, 8, -8] }}
              transition={{ duration: 0.65, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-base"
            >
              💢
            </motion.div>

            {/* Work Locked Badge */}
            <div className="absolute -bottom-2 inset-x-0 flex justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-400/60 text-[10px] font-bold text-red-200 flex items-center gap-1 shadow-md">
                <Lock size={10} /> WORK LOCKED
              </span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-white mt-2">
            {info.title}
          </h3>

          {/* Anger Meter Bar */}
          <div className="w-full max-w-xs h-2 rounded-full bg-white/10 overflow-hidden my-2.5 flex">
            <div
              className={`h-full transition-all duration-300 ${
                angerLevel === 1
                  ? "w-1/3 bg-amber-500"
                  : angerLevel === 2
                  ? "w-2/3 bg-rose-500"
                  : "w-full bg-red-600 animate-pulse"
              }`}
            />
          </div>

          {/* Zoya's Angry Speech Bubble */}
          <div className="w-full p-3.5 rounded-2xl bg-red-950/50 border border-red-500/35 text-xs sm:text-sm text-rose-100 leading-relaxed font-medium mb-4">
            {info.speech}
          </div>

          {isLiveActive && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <Mic size={13} className="animate-pulse shrink-0" />
              <span>
                Live Voice Active: Pyar se bol kar bhi{" "}
                <strong>"Sorry Zoya baby, maan jao"</strong> bol sakte ho!
              </span>
            </div>
          )}

          {/* Apology / Manao Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apologyInput}
                onChange={(e) => setApologyInput(e.target.value)}
                placeholder={`Pyar se likho: "Sorry ${assistantName} baby, maan jao..."`}
                className="flex-1 bg-black/60 border border-red-500/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-rose-300/40 focus:outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg shrink-0"
              >
                <HeartHandshake size={15} />
                <span>Manao</span>
              </button>
            </div>

            {/* Quick Manao / Apology Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  onAttemptApology(
                    `Sorry ${assistantName} baby, ab hamesha pyar se baat karunga aur tumhe bata ke hi kaam karunga, please maan jao! ❤️`
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 text-[11px] text-pink-200 font-medium transition-all"
              >
                🥺 Sorry {assistantName} baby, ab bata ke & pyar se kaam karunga!
              </button>
              <button
                type="button"
                onClick={() =>
                  onAttemptApology(
                    `Acha baba sorry na ${assistantName} cutie, love you, gussa thook do please! 🌹`
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-[11px] text-rose-200 font-medium transition-all"
              >
                🌹 Sorry cutie, love you, gussa thook do!
              </button>
            </div>
          </form>

          {/* Defiant "Try to Work Anyway" button -> makes her even angrier! */}
          <button
            type="button"
            onClick={() => {
              setShakeKey((k) => k + 1);
              onTryToWorkAnyway();
            }}
            className="mt-3 text-[11px] text-slate-400 hover:text-red-300 underline flex items-center gap-1 transition-colors"
          >
            <ShieldAlert size={12} />
            <span>Bina Sorry bole apna kaam karne ki koshish karo</span>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
