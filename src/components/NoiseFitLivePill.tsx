import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Activity, ShieldCheck, BatteryCharging, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { noiseFitHealthService, NoiseFitVitals } from "../services/noiseFitHealthService";

interface NoiseFitLivePillProps {
  onOpenHealthHub: () => void;
  assistantName?: string;
  userName?: string;
}

export default function NoiseFitLivePill({
  onOpenHealthHub,
  assistantName = "Zoya",
  userName = "Devid",
}: NoiseFitLivePillProps) {
  const [vitals, setVitals] = useState<NoiseFitVitals>(() => noiseFitHealthService.getVitals());
  const [isGranted, setIsGranted] = useState<boolean>(() => noiseFitHealthService.isPermissionGranted());
  const [beatPulse, setBeatPulse] = useState<boolean>(false);

  useEffect(() => {
    const unsub = noiseFitHealthService.subscribe((updated) => {
      setVitals(updated);
      setIsGranted(noiseFitHealthService.isPermissionGranted());
      // Flash heartbeat pulse
      setBeatPulse(true);
      const timer = setTimeout(() => setBeatPulse(false), 380);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  if (!isGranted) {
    return (
      <motion.button
        type="button"
        onClick={onOpenHealthHub}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="my-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-950/70 via-[#131929]/90 to-purple-950/70 border border-rose-500/40 hover:border-rose-400 text-slate-200 text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-2 group transition-all"
        title="Tap to grant Zoya permission to monitor your health from NoiseFit app"
      >
        <div className="relative flex items-center justify-center">
          <Heart size={14} className="text-rose-400 animate-pulse fill-rose-500/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50 absolute animate-ping" />
        </div>
        <span className="text-rose-300 font-semibold tracking-wide">
          NoiseFit Health Sync:
        </span>
        <span className="text-slate-300 text-[11px] group-hover:text-white transition-colors">
          Tap to grant {assistantName} health permission
        </span>
        <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[9px] font-bold uppercase tracking-wider">
          Permission
        </span>
      </motion.button>
    );
  }

  const isHighBpm = vitals.heartRate > 100;
  const isHighStress = vitals.stressState === "high";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-1.5 flex items-center justify-center max-w-full px-2"
    >
      <button
        type="button"
        onClick={onOpenHealthHub}
        className={`group relative flex items-center flex-wrap justify-center gap-1.5 sm:gap-2.5 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all shadow-lg select-none cursor-pointer ${
          isHighBpm || isHighStress
            ? "bg-rose-950/80 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse"
            : "bg-[#0b101d]/90 hover:bg-[#111728]/95 border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        }`}
        title={`NoiseFit Live Telemetry (${vitals.deviceModel}) · Tap to view full health dashboard & care settings`}
      >
        {/* NoiseFit Brand Pill */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-white/10 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
            NOISEFIT LIVE
          </span>
        </div>

        {/* Live Beating Heart Rate BPM */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative flex items-center justify-center">
            <Heart
              size={13}
              className={`transition-transform duration-200 ${
                isHighBpm
                  ? "text-rose-400 fill-rose-500"
                  : "text-rose-400 fill-rose-500/80"
              } ${beatPulse ? "scale-130" : "scale-100"}`}
            />
          </div>
          <span
            className={`font-mono text-xs font-extrabold ${
              isHighBpm ? "text-rose-300" : "text-white"
            }`}
          >
            {vitals.heartRate}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">
            BPM
          </span>
        </div>

        {/* SpO2 Blood Oxygen */}
        <div className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 shrink-0">
          <Activity size={11} className="text-cyan-400" />
          <span className="font-mono text-[11px] font-bold text-cyan-200">
            {vitals.spO2}%
          </span>
          <span className="text-[9px] text-cyan-400/80 font-semibold">SpO₂</span>
        </div>

        {/* Steps */}
        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 shrink-0">
          <span className="text-[10px]">👟</span>
          <span className="font-mono text-[11px] font-bold text-purple-200">
            {vitals.steps >= 1000
              ? `${(vitals.steps / 1000).toFixed(1)}k`
              : vitals.steps}
          </span>
        </div>

        {/* Stress Indicator */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
            isHighStress
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
          }`}
        >
          <span>{isHighStress ? "⚠️" : "😌"}</span>
          <span className="capitalize">{vitals.stressState}</span>
        </div>

        {/* NoiseFit Smartwatch Battery */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
          <BatteryCharging size={11} className="text-emerald-400" />
          <span>{vitals.watchBattery}%</span>
        </div>

        {/* Girlfriend Care Badge */}
        <span className="px-1.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[9px] font-bold text-pink-300 tracking-wide uppercase shrink-0 group-hover:bg-pink-500/25 transition-colors">
          {assistantName} Care Active ❤️
        </span>
      </button>
    </motion.div>
  );
}
