import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Mic,
  ShieldAlert,
  KeyRound,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  ownerVoiceService,
  OwnerIncident,
  OwnerSecurityState,
} from "../services/ownerVoiceService";

interface OwnerLockdownOverlayProps {
  securityState: OwnerSecurityState;
  incidents: OwnerIncident[];
  ownerName: string;
  assistantName: string;
  briefingReport: {
    text: string;
    incidents: OwnerIncident[];
  } | null;
  onDismissBriefing: () => void;
  onSpeakBriefing: (text: string) => void;
}

export default function OwnerLockdownOverlay({
  securityState,
  incidents,
  ownerName,
  assistantName,
  briefingReport,
  onDismissBriefing,
  onSpeakBriefing,
}: OwnerLockdownOverlayProps) {
  const [isVerifyingMic, setIsVerifyingMic] = useState(false);
  const [micProgress, setMicProgress] = useState(0);
  const [micRms, setMicRms] = useState(0);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinValue, setPinValue] = useState("");

  const hasVoiceProfiles = ownerVoiceService.hasEnrolledProfiles();

  const handleVoiceUnlock = async () => {
    if (isVerifyingMic) return;
    setStatusError(null);
    setIsVerifyingMic(true);
    setMicProgress(0);

    const res = await ownerVoiceService.verifyOwnerViaMicrophone(2500, (pct, rms) => {
      setMicProgress(pct);
      setMicRms(rms);
    });

    setIsVerifyingMic(false);
    setMicRms(0);

    if (!res.matched) {
      setStatusError(
        res.reason ||
          `Awaaz match nahi hui (${Math.round(res.score * 100)}%)! Sirf ${ownerName} ki awaaz se unlock hoga.`
      );
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    const ok = ownerVoiceService.unlockWithPin(pinValue);
    if (!ok) {
      setStatusError("Galat Master PIN! Ye attempt log kar liya gaya hai.");
      setPinValue("");
    } else {
      setPinValue("");
      setShowPinPad(false);
    }
  };

  const lockIncidents = incidents
    .filter((i) => !i.reportedToOwner && i.type !== "owner_verified")
    .slice(0, 5);

  return (
    <>
      {/* FULLSCREEN PHONE LOCKDOWN OVERLAY (STRIKE 2) */}
      <AnimatePresence>
        {securityState.isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-gradient-to-b from-[#1a050b] via-[#0c0410] to-black text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            <div className="w-full max-w-md rounded-3xl bg-[#130812]/95 border-2 border-rose-500/70 shadow-2xl shadow-rose-950/80 p-5 sm:p-6 space-y-5 text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

              <div className="mx-auto w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
                <Lock size={36} className="text-rose-300" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-400/50 text-[10.5px] font-black uppercase tracking-widest text-rose-200">
                  <ShieldAlert size={12} />
                  <span>Zoya Owner Voice Lockdown</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  PHONE LOCKED BY {assistantName.toUpperCase()}
                </h2>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  Unauthorized insaan ne pehli warning ke baad bhi bolne ki koshish ki! Jab tak owner{" "}
                  <b className="text-white">{ownerName}</b> wapas nahi aate aur verify nahi karte, phone LOCK rahega.
                </p>
              </div>

              {/* Recent Intrusion Activity */}
              {lockIncidents.length > 0 && (
                <div className="text-left p-3 rounded-2xl bg-black/55 border border-rose-500/30 space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Intrusion Timeline ({lockIncidents.length})
                  </div>
                  {lockIncidents.map((inc) => (
                    <div key={inc.id} className="text-[11px] text-slate-200 border-b border-white/5 pb-1 last:border-0">
                      <span className="text-[9.5px] font-mono text-rose-300 mr-1.5">
                        [{inc.formattedTime}]
                      </span>
                      <span>{inc.detail}</span>
                    </div>
                  ))}
                </div>
              )}

              {statusError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-400/50 text-xs text-red-200 font-semibold flex items-center justify-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              {/* Primary Unlock: Owner Voice Verification */}
              <div className="space-y-2.5">
                {hasVoiceProfiles && (
                  <button
                    type="button"
                    onClick={handleVoiceUnlock}
                    disabled={isVerifyingMic}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-sm shadow-lg shadow-rose-500/35 flex items-center justify-center gap-2 transition-all"
                  >
                    <Mic size={18} className={isVerifyingMic ? "animate-bounce" : ""} />
                    <span>
                      {isVerifyingMic
                        ? `Listening (${micProgress}%) — "${ownerName}" Bolein...`
                        : `Verify "${ownerName}" Voice to Unlock`}
                    </span>
                  </button>
                )}

                {isVerifyingMic && (
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 transition-all duration-75"
                      style={{
                        width: `${Math.max(micProgress, Math.min(100, Math.round(micRms * 600)))}%`,
                      }}
                    />
                  </div>
                )}

                {/* Master PIN fallback */}
                {!showPinPad ? (
                  <button
                    type="button"
                    onClick={() => setShowPinPad(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <KeyRound size={14} />
                    <span>Unlock with Owner Master PIN (Default: 1234)</span>
                  </button>
                ) : (
                  <form onSubmit={handlePinSubmit} className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={pinValue}
                      onChange={(e) => setPinValue(e.target.value)}
                      placeholder="Enter Master PIN (1234)"
                      autoFocus
                      className="flex-1 bg-black/60 border border-rose-400/50 rounded-xl px-3.5 py-2 text-sm text-white text-center tracking-widest focus:outline-none focus:border-rose-300"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                    >
                      Unlock
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OWNER RETURN BRIEFING MODAL (TELLS OWNER EVERYTHING THAT HAPPENED) */}
      <AnimatePresence>
        {!securityState.isLocked && briefingReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[135] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-3xl bg-[#0e1526] border-2 border-emerald-400/60 shadow-2xl p-5 space-y-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Welcome Back, {ownerName}! — {assistantName} Security Report
                    </h3>
                    <p className="text-[11px] text-emerald-300">
                      Aapki absence me jo kuch bhi hua, uski poori report neeche hai:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismissBriefing}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-xs sm:text-[13px] leading-relaxed text-emerald-50">
                "{briefingReport.text}"
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 chat-scroll">
                {briefingReport.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-xl bg-black/45 border border-white/10 text-xs flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`font-black uppercase ${
                          inc.type === "strike_2_lockdown"
                            ? "text-rose-400"
                            : inc.type === "strike_1_warning"
                            ? "text-amber-300"
                            : "text-red-300"
                        }`}
                      >
                        {inc.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400 font-mono">{inc.formattedTime}</span>
                    </div>
                    <p className="text-slate-200">{inc.detail}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSpeakBriefing(briefingReport.text)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Volume2 size={14} />
                  <span>Speak Report Again</span>
                </button>
                <button
                  type="button"
                  onClick={onDismissBriefing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs"
                >
                  Got It, Thanks {assistantName}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
