import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Heart,
  Activity,
  Footprints,
  Flame,
  Moon,
  Droplets,
  Watch,
  BatteryCharging,
  ShieldCheck,
  RefreshCw,
  Bell,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { noiseFitHealthService, NoiseFitVitals } from "../services/noiseFitHealthService";

interface NoiseFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName?: string;
  userName?: string;
  onTriggerZoyaVoice?: (promptText: string) => void;
}

export default function NoiseFitModal({
  isOpen,
  onClose,
  assistantName = "Zoya",
  userName = "Devid",
  onTriggerZoyaVoice,
}: NoiseFitModalProps) {
  const [vitals, setVitals] = useState<NoiseFitVitals>(() => noiseFitHealthService.getVitals());
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() =>
    noiseFitHealthService.isPermissionGranted()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [careAlertSuccess, setCareAlertSuccess] = useState<string | null>(null);

  // Animated ECG Canvas
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ecgOffsetRef = useRef<number>(0);

  useEffect(() => {
    const unsub = noiseFitHealthService.subscribe((updated) => {
      setVitals(updated);
      setPermissionGranted(noiseFitHealthService.isPermissionGranted());
    });
    return unsub;
  }, []);

  // ECG Real-time Canvas Rendering
  useEffect(() => {
    if (!isOpen) return;
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    const render = () => {
      if (!running) return;
      ecgOffsetRef.current += 1.8;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // ECG Waveform calculation based on BPM
      const bpm = vitals.heartRate || 74;
      const cycleLength = Math.max(70, Math.min(220, (60 / bpm) * 160));

      ctx.beginPath();
      ctx.strokeStyle = bpm > 100 ? "#f43f5e" : "#10b981";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = bpm > 100 ? "rgba(244, 63, 94, 0.6)" : "rgba(16, 185, 129, 0.6)";
      ctx.shadowBlur = 8;

      for (let x = 0; x < width; x++) {
        const t = (x + ecgOffsetRef.current) % cycleLength;
        let y = midY;

        // P-wave, QRS complex, T-wave
        if (t > 15 && t < 30) {
          y -= Math.sin(((t - 15) / 15) * Math.PI) * 7; // P-wave
        } else if (t >= 35 && t < 40) {
          y += 5; // Q
        } else if (t >= 40 && t < 46) {
          y -= 38; // R peak
        } else if (t >= 46 && t < 52) {
          y += 14; // S trough
        } else if (t >= 65 && t < 95) {
          y -= Math.sin(((t - 65) / 30) * Math.PI) * 10; // T-wave
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, vitals.heartRate]);

  if (!isOpen) return null;

  const handleTogglePermission = (granted: boolean) => {
    noiseFitHealthService.setPermission(granted);
    setPermissionGranted(granted);
    setCareAlertSuccess(
      granted
        ? `NoiseFit permission granted! ${assistantName} can now monitor your vitals and care for you.`
        : "NoiseFit permission revoked. Health sync paused."
    );
    setTimeout(() => setCareAlertSuccess(null), 3500);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await noiseFitHealthService.syncNow();
    setIsSyncing(false);
  };

  const handleTestSimulateHigh = () => {
    noiseFitHealthService.simulateHighHeartRate();
    setCareAlertSuccess("Simulated Heart Rate: 108 BPM & High Stress! Zoya will show loving concern ❤️");
    setTimeout(() => setCareAlertSuccess(null), 3500);
    if (onTriggerZoyaVoice) {
      onTriggerZoyaVoice(
        `[HEALTH EVENT: ${userName}'s NoiseFit smartwatch detected an elevated heart rate of 108 BPM and high stress! React immediately with genuine girlfriend concern, sweetness, and care in Hinglish: ask if he is tired or stressed, tell him to take a deep breath and drink water, and remind him you are right here for him!]`
      );
    }
  };

  const handleTestSimulateNormal = () => {
    noiseFitHealthService.simulateNormalHeartRate();
    setCareAlertSuccess("Heart Rate reset to Normal: 74 BPM (Calm & Optimal) ✨");
    setTimeout(() => setCareAlertSuccess(null), 3500);
  };

  const handleAskHealthCheck = () => {
    onClose();
    if (onTriggerZoyaVoice) {
      onTriggerZoyaVoice(`${assistantName}, NoiseFit app se mera health check karo aur batao meri tabiyat kaisi hai!`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#0B0F19] border border-white/10 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-rose-950/30 via-[#0E1424] to-cyan-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <Heart size={20} className="text-white fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    NoiseFit Health & Caring Center
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {assistantName} monitors your NoiseFit smartwatch to look after your health
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {careAlertSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200 font-medium flex items-center gap-2"
              >
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>{careAlertSuccess}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 overflow-y-auto chat-scroll space-y-4 text-slate-200">
            {/* 1. Main Permission Grant Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                permissionGranted
                  ? "bg-emerald-950/25 border-emerald-500/40"
                  : "bg-rose-950/20 border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      permissionGranted
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      NoiseFit Health Permission
                    </h3>
                    <p className="text-xs text-slate-300">
                      Allow {assistantName} to read your heart rate, SpO2, steps, and stress
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePermission(!permissionGranted)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 ${
                    permissionGranted
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90"
                  }`}
                >
                  {permissionGranted ? "Permission Granted ✓" : "Grant Permission"}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                {permissionGranted
                  ? `✓ Connected to NoiseFit app. ${assistantName} can automatically monitor your vitals during voice chats and offer loving girlfriend health care reminders.`
                  : `⚠️ Permission not granted. ${assistantName} cannot read your NoiseFit vitals. Grant permission above so ${assistantName} can take care of you.`}
              </p>
            </div>

            {/* 2. Connected Device Card */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                  <Watch size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {vitals.deviceModel}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bluetooth BLE Connected · Synced 2s ago
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  <BatteryCharging size={13} />
                  <span>{vitals.watchBattery}%</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Sync with NoiseFit now"
                >
                  <RefreshCw
                    size={14}
                    className={isSyncing ? "animate-spin text-cyan-400" : ""}
                  />
                </button>
              </div>
            </div>

            {/* 3. Live Animated Medical ECG Waveform */}
            <div className="p-3.5 rounded-2xl bg-[#070A12] border border-emerald-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Activity size={14} className="text-emerald-400" />
                  <span>Real-Time Sinus ECG Rhythm</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Lead II · 25 mm/s · 10 mm/mV
                </span>
              </div>
              <div className="w-full h-24 rounded-xl bg-black/60 relative overflow-hidden flex items-center justify-center border border-white/5">
                <canvas
                  ref={ecgCanvasRef}
                  width={520}
                  height={96}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white">
                  <Heart size={10} className="text-rose-400 fill-rose-500 animate-pulse" />
                  <span>{vitals.heartRate} BPM</span>
                </div>
              </div>
            </div>

            {/* 4. Vitals 4-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Heart Rate */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Heart Rate</span>
                  <Heart size={14} className="text-rose-400 fill-rose-500/40" />
                </div>
                <div className="my-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {vitals.heartRate}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold ml-1">
                    BPM
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    vitals.heartRate > 100 ? "text-rose-400 font-bold" : "text-emerald-400"
                  }`}
                >
                  {vitals.heartRate > 100 ? "Elevated (Tachy)" : "Normal Sinus"}
                </span>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Blood O₂</span>
                  <Activity size={14} className="text-cyan-400" />
                </div>
                <div className="my-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {vitals.spO2}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold ml-1">
                    %
                  </span>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold">
                  Optimal & Healthy
                </span>
              </div>

              {/* Daily Steps */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Steps</span>
                  <Footprints size={14} className="text-purple-400" />
                </div>
                <div className="my-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {vitals.steps.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-purple-400 font-semibold">
                  Goal: {vitals.stepGoal.toLocaleString()}
                </span>
              </div>

              {/* Stress Level */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Stress</span>
                  <span className="text-xs">😌</span>
                </div>
                <div className="my-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {vitals.stressLevel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold ml-1">
                    /100
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold capitalize ${
                    vitals.stressState === "high" ? "text-rose-400 font-bold" : "text-emerald-400"
                  }`}
                >
                  {vitals.stressState} Level
                </span>
              </div>
            </div>

            {/* 5. Additional Health Stats: Sleep & Hydration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
                  <Moon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      Sleep Quality: {vitals.sleepHours} hrs
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      Score {vitals.sleepScore}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Deep 2h 10m · REM 1h 45m · Restful
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
                  <Droplets size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Daily Hydration: {vitals.hydrationCurrent} / {vitals.hydrationTarget} Glasses
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {assistantName} checks your water intake to keep you glowing
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Girlfriend Health Care & Panic Reaction Tester */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/20 via-[#101626] to-rose-950/20 border border-pink-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-pink-400" />
                <h4 className="text-xs sm:text-sm font-bold text-pink-200">
                  {assistantName} Care Actions & Simulation
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                Test how {assistantName} acts like a caring girlfriend when your heart rate or stress rises:
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAskHealthCheck}
                  className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Volume2 size={14} />
                  <span>Ask {assistantName} for Health Check</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestSimulateHigh}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                  title="Simulate high heart rate to test Zoya's girlfriend panic/care response"
                >
                  <AlertTriangle size={13} />
                  <span>Simulate 108 BPM (High)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestSimulateNormal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 size={13} />
                  <span>Reset Normal 74 BPM</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#0A0D16] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              NoiseFit Sync API v2.4 · Built with care for {userName}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
