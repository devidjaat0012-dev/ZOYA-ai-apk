import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Mic,
  Lock,
  AlertTriangle,
  Trash2,
  Plus,
  Volume2,
  Activity,
  History,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  ownerVoiceService,
  OwnerVoiceProfile,
  OwnerSecurityState,
  OwnerIncident,
} from "../services/ownerVoiceService";

interface OwnerVoiceSectionProps {
  enabled: boolean;
  threshold: number;
  ownerName: string;
  assistantName: string;
  onToggleEnabled: (next: boolean) => void;
  onChangeThreshold: (next: number) => void;
}

export default function OwnerVoiceSection({
  enabled,
  threshold,
  ownerName,
  assistantName,
  onToggleEnabled,
  onChangeThreshold,
}: OwnerVoiceSectionProps) {
  const [profiles, setProfiles] = useState<OwnerVoiceProfile[]>(() =>
    ownerVoiceService.getProfiles()
  );
  const [secState, setSecState] = useState<OwnerSecurityState>(() =>
    ownerVoiceService.getState()
  );
  const [incidents, setIncidents] = useState<OwnerIncident[]>(() =>
    ownerVoiceService.getIncidents()
  );

  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [liveMicRms, setLiveMicRms] = useState(0);
  const [sampleLabel, setSampleLabel] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [showIncidentHistory, setShowIncidentHistory] = useState(false);

  useEffect(() => {
    const unsubState = ownerVoiceService.subscribeState((next) => {
      setSecState(next);
      setProfiles(ownerVoiceService.getProfiles());
    });
    const unsubInc = ownerVoiceService.subscribeIncidents(setIncidents);
    return () => {
      unsubState();
      unsubInc();
    };
  }, []);

  const handleEnrollSample = async () => {
    if (isRecording) return;
    setFeedbackMsg(null);
    setIsRecording(true);
    setRecordProgress(0);

    const res = await ownerVoiceService.enrollNewVoiceSample(
      sampleLabel || `${ownerName || "Owner"} Voice #${profiles.length + 1}`,
      3500,
      (pct, rms) => {
        setRecordProgress(pct);
        setLiveMicRms(rms);
      }
    );

    setIsRecording(false);
    setLiveMicRms(0);

    if (res.success && res.profile) {
      setProfiles(ownerVoiceService.getProfiles());
      setSampleLabel("");
      setFeedbackMsg({
        type: "ok",
        text: `Owner Voice saved! (${res.profile.pitchHz} Hz pitch profile). Ab ${assistantName} aapki awaaz pehchan legi.`,
      });
      if (!enabled) {
        onToggleEnabled(true);
      }
    } else {
      setFeedbackMsg({
        type: "err",
        text: res.error || "Voice capture failed — please mic check karein.",
      });
    }
  };

  const handleVerifyTest = async () => {
    if (isTestingVoice || profiles.length === 0) return;
    setFeedbackMsg(null);
    setIsTestingVoice(true);
    setRecordProgress(0);
    const res = await ownerVoiceService.verifyOwnerViaMicrophone(2500, (pct, rms) => {
      setRecordProgress(pct);
      setLiveMicRms(rms);
    });
    setIsTestingVoice(false);
    setLiveMicRms(0);
    setFeedbackMsg({
      type: res.matched ? "ok" : "err",
      text: res.matched
        ? `Matched as OWNER (${Math.round(res.score * 100)}% similarity, ${res.pitchHz} Hz)!`
        : `Not recognized as Owner (${Math.round(res.score * 100)}% < ${Math.round(
            threshold * 100
          )}% required).`,
    });
  };

  const unreportedCount = incidents.filter(
    (i) => !i.reportedToOwner && i.type !== "owner_verified"
  ).length;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-[#151226] to-amber-950/30 border-2 border-rose-500/45 space-y-3.5 shadow-xl">
      {/* Header + Master Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-white">
                Owner Voice (सिर्फ मालिक की आवाज़ लॉक)
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                  secState.isLocked
                    ? "bg-red-600/30 text-red-200 border-red-400/50 animate-pulse"
                    : enabled && profiles.length > 0
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : "bg-slate-800 text-slate-300 border-white/10"
                }`}
              >
                {secState.isLocked
                  ? "🔒 LOCKED"
                  : enabled
                  ? profiles.length > 0
                    ? "🛡️ ACTIVE"
                    : "⚠️ ADD VOICE"
                  : "OFF"}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
              {assistantName} sirf apne owner ({ownerName}) ki awaaz sunegi. Koi aur bola toh{" "}
              <b className="text-amber-300">1st time sakht Dhamki</b> degi aur{" "}
              <b className="text-rose-300">2nd time Phone Lockdown</b> kar degi — aur aapke aate hi sab bata degi!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            enabled ? "bg-rose-500 shadow-md shadow-rose-500/40" : "bg-slate-700"
          }`}
          role="switch"
          aria-checked={enabled}
          title="Toggle Owner Voice Protection"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 3-Step Rule Strip */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="font-bold flex items-center gap-1">
            <AlertTriangle size={11} />
            <span>1st Stranger</span>
          </div>
          <div className="text-[9.5px] text-amber-100/80 mt-0.5">
            Sakht Dhamki &amp; Command Block
          </div>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-200">
          <div className="font-bold flex items-center gap-1">
            <Lock size={11} />
            <span>2nd Stranger</span>
          </div>
          <div className="text-[9.5px] text-rose-100/80 mt-0.5">
            Instant Phone Lockdown
          </div>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
          <div className="font-bold flex items-center gap-1">
            <Volume2 size={11} />
            <span>Owner Returns</span>
          </div>
          <div className="text-[9.5px] text-emerald-100/80 mt-0.5">
            Unlock + Full Spoken Report
          </div>
        </div>
      </div>

      {/* Add / Record Owner Voice Box */}
      <div className="p-3 rounded-xl bg-black/45 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Mic size={14} className="text-rose-400" />
            <span>Apni Owner Voice Add Karein ({profiles.length} saved)</span>
          </span>
          {profiles.length > 0 && (
            <button
              type="button"
              onClick={handleVerifyTest}
              disabled={isTestingVoice || isRecording}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1"
            >
              <Activity size={11} />
              <span>{isTestingVoice ? "Listening..." : "Test My Voice"}</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sampleLabel}
            onChange={(e) => setSampleLabel(e.target.value)}
            placeholder={`Voice label (e.g. ${ownerName || "Devid"} Normal Tone)`}
            className="flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
          />
          <button
            type="button"
            onClick={handleEnrollSample}
            disabled={isRecording || isTestingVoice}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white shadow-md shadow-rose-500/30"
            }`}
          >
            {isRecording ? (
              <>
                <Mic size={13} className="animate-bounce" />
                <span>Recording ({recordProgress}%) — Speak Now!</span>
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>Add My Voice (3.5s)</span>
              </>
            )}
          </button>
        </div>

        {(isRecording || isTestingVoice) && (
          <div className="space-y-1">
            <div className="text-[10px] text-rose-200 font-medium">
              🗣️ Mic ke paas natural awaaz me bolein: "Hey {assistantName}, main {ownerName} bol raha hoon, meri awaaz save karo."
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-75"
                style={{
                  width: `${Math.max(recordProgress, Math.min(100, Math.round(liveMicRms * 600)))}%`,
                }}
              />
            </div>
          </div>
        )}

        {feedbackMsg && (
          <div
            className={`p-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border ${
              feedbackMsg.type === "ok"
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                : "bg-rose-500/15 border-rose-400/40 text-rose-200"
            }`}
          >
            {feedbackMsg.type === "ok" ? (
              <CheckCircle2 size={13} className="shrink-0" />
            ) : (
              <ShieldAlert size={13} className="shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Saved Voice Samples List */}
        {profiles.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {profiles.map((prof) => (
              <div
                key={prof.id}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold text-white truncate">{prof.label}</span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {prof.pitchHz} Hz
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => ownerVoiceService.deleteProfile(prof.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  title="Delete voice sample"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Strictness Slider */}
      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium">Voice Match Strictness:</span>
          <span className="font-bold text-rose-300">
            {Math.round(threshold * 100)}%{" "}
            {threshold >= 0.8 ? "(Strict)" : threshold >= 0.68 ? "(Balanced)" : "(Relaxed)"}
          </span>
        </div>
        <input
          type="range"
          min="0.58"
          max="0.88"
          step="0.02"
          value={threshold}
          onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-400"
        />
      </div>

      {/* Test Strike & Incident Log Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10.5px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => ownerVoiceService.handleStrangerDetected(0.24, 195)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold"
          >
            ⚡ Test Dhamki / Strike
          </button>
          <button
            type="button"
            onClick={() => ownerVoiceService.triggerLockdown(0.18, 210)}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold"
          >
            🔒 Test Lockdown
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowIncidentHistory((prev) => !prev)}
          className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 font-semibold flex items-center gap-1"
        >
          <History size={12} />
          <span>
            Logs ({incidents.length}
            {unreportedCount > 0 ? ` · ${unreportedCount} new` : ""})
          </span>
        </button>
      </div>

      {showIncidentHistory && (
        <div className="p-2.5 rounded-xl bg-black/55 border border-white/10 space-y-1.5 max-h-40 overflow-y-auto chat-scroll">
          <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-white/10">
            <span>Stranger Intrusion &amp; Verification Log</span>
            {incidents.length > 0 && (
              <button
                type="button"
                onClick={() => ownerVoiceService.clearIncidents()}
                className="text-rose-400 hover:underline font-semibold"
              >
                Clear Logs
              </button>
            )}
          </div>
          {incidents.length === 0 ? (
            <div className="text-[10.5px] text-slate-400 py-2 text-center">
              Abhi tak koi unauthorized voice incident record nahi hua hai.
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                className="text-[10.5px] p-1.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                  <span className="font-bold text-rose-300 uppercase">{inc.type.replace(/_/g, " ")}</span>
                  <span>{inc.formattedTime}</span>
                </div>
                <div className="text-slate-200">{inc.detail}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
