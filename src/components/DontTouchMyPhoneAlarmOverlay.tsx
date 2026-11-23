import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Volume2,
  Mic,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  dontTouchMyPhoneService,
  SecurityState,
} from "../services/dontTouchMyPhoneService";

interface Props {
  onOpenGallery?: () => void;
}

export default function DontTouchMyPhoneAlarmOverlay({ onOpenGallery }: Props) {
  const [secState, setSecState] = useState<SecurityState>(
    dontTouchMyPhoneService.getState()
  );
  const [strobeRed, setStrobeRed] = useState(true);

  useEffect(() => {
    const unsubState = dontTouchMyPhoneService.subscribeState(setSecState);
    return () => {
      unsubState();
    };
  }, []);

  // Flashing police strobe effect
  useEffect(() => {
    if (secState !== "triggered") return;
    const interval = setInterval(() => {
      setStrobeRed((prev) => !prev);
    }, 280);
    return () => clearInterval(interval);
  }, [secState]);

  if (secState !== "triggered") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between p-4 sm:p-6 transition-colors duration-200 select-none ${
        strobeRed
          ? "bg-red-950/95 shadow-[inset_0_0_120px_rgba(239,68,68,0.7)]"
          : "bg-blue-950/95 shadow-[inset_0_0_120px_rgba(59,130,246,0.7)]"
      }`}
    >
      {/* Top Banner */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/30 border border-red-500/60 text-red-200 text-xs font-bold animate-pulse">
          <ShieldAlert size={16} className="text-red-400" />
          <span>SECURITY BREACH DETECTED</span>
        </div>
        <button
          type="button"
          onClick={() => dontTouchMyPhoneService.disarm(false)}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <X size={14} />
          <span>Dismiss</span>
        </button>
      </div>

      {/* Main Alert Card */}
      <div className="w-full max-w-md my-auto flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-ping absolute inset-0" />
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 border-4 border-white/20 flex items-center justify-center shadow-2xl relative z-10 animate-bounce">
            <AlertTriangle size={48} className="text-white" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase drop-shadow-md">
            Don't Touch My Phone!
          </h1>
          <p className="text-sm font-semibold text-red-300">
            Khabardar! Phone ko haath mat lagao! Devid ka phone hai yeh!
          </p>
        </div>

        {/* Warning Badge */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-red-500/40 text-xs text-red-200 flex items-center justify-center gap-2 max-w-xs mx-auto">
          <ShieldAlert size={16} className="text-red-400 shrink-0" />
          <span>Unauthorized contact detected! Return phone immediately.</span>
        </div>

        {/* Voice Deactivation Prompt Box */}
        <div className="w-full p-3.5 rounded-2xl bg-black/70 border border-red-400/40 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 animate-pulse">
            <Mic size={14} />
            <span>Voice Command Active (Listening...)</span>
          </div>
          <p className="text-xs text-slate-200">
            Say:{" "}
            <span className="font-bold text-white bg-red-500/30 px-2 py-0.5 rounded">
              "Turn off don't touch my phone"
            </span>{" "}
            or{" "}
            <span className="font-bold text-white bg-red-500/30 px-2 py-0.5 rounded">
              "Band karo"
            </span>
          </p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="w-full max-w-md pb-2">
        <button
          type="button"
          onClick={() => dontTouchMyPhoneService.disarm(false)}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-600/40 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Volume2 size={18} />
          <span>Turn Off / Disarm Alarm</span>
        </button>
      </div>
    </div>
  );
}
