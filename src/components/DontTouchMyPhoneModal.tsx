import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Volume2,
  VolumeX,
  Camera,
  Download,
  Trash2,
  X,
  Mic,
  Activity,
  Sliders,
  Play,
  Square,
  Info,
  Maximize2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
} from "lucide-react";
import {
  dontTouchMyPhoneService,
  SecurityState,
  IntruderRecord,
  MotionSensitivity,
} from "../services/dontTouchMyPhoneService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assistantName?: string;
  userName?: string;
}

export default function DontTouchMyPhoneModal({
  isOpen,
  onClose,
  assistantName = "Zoya",
  userName = "Devid",
}: Props) {
  const [activeTab, setActiveTab] = useState<"control" | "vault" | "settings">("control");
  const [secState, setSecState] = useState<SecurityState>(
    dontTouchMyPhoneService.getState()
  );
  const [countdown, setCountdown] = useState<number>(0);
  const [intruders, setIntruders] = useState<IntruderRecord[]>(
    dontTouchMyPhoneService.getIntruderRecords()
  );
  const [settings, setSettings] = useState(dontTouchMyPhoneService.getSettings());
  const [liveMagnitude, setLiveMagnitude] = useState<number>(0);
  const [previewPhoto, setPreviewPhoto] = useState<IntruderRecord | null>(null);

  // Secret Vault PIN Security States
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [vaultPinInput, setVaultPinInput] = useState<string>("");
  const [vaultPinError, setVaultPinError] = useState<string>("");

  // Delete Protection Confirmation Dialog States
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; isAll?: boolean } | null>(null);
  const [deletePinInput, setDeletePinInput] = useState<string>("");
  const [deletePinError, setDeletePinError] = useState<string>("");

  // Change & Reset PIN States
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>("");
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [confirmNewPinInput, setConfirmNewPinInput] = useState<string>("");
  const [changePinError, setChangePinError] = useState<string>("");
  const [changePinSuccess, setChangePinSuccess] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetPinSuccess, setResetPinSuccess] = useState<string>("");

  useEffect(() => {
    const unsubState = dontTouchMyPhoneService.subscribeState(setSecState);
    const unsubCountdown = dontTouchMyPhoneService.subscribeCountdown(setCountdown);
    const unsubIntruders = dontTouchMyPhoneService.subscribeIntruders(setIntruders);

    // Live accelerometer visualizer in control tab
    let motionHandler: ((e: DeviceMotionEvent) => void) | null = (e) => {
      const accel = e.accelerationIncludingGravity || e.acceleration;
      if (accel) {
        const x = accel.x || 0;
        const y = accel.y || 0;
        const z = accel.z || 0;
        const mag = Math.sqrt(x * x + y * y + z * z);
        setLiveMagnitude(Math.round(mag * 10) / 10);
      }
    };

    window.addEventListener("devicemotion", motionHandler, { passive: true });

    return () => {
      unsubState();
      unsubCountdown();
      unsubIntruders();
      if (motionHandler) {
        window.removeEventListener("devicemotion", motionHandler);
      }
    };
  }, []);

  // Auto-lock vault when modal closes to prevent anyone else from seeing photos
  const handleModalClose = () => {
    setIsVaultUnlocked(false);
    setVaultPinInput("");
    setVaultPinError("");
    setDeleteTarget(null);
    setDeletePinInput("");
    setDeletePinError("");
    setIsChangingPin(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleToggleArm = async () => {
    if (secState === "armed" || secState === "arming" || secState === "triggered") {
      dontTouchMyPhoneService.disarm(false);
    } else {
      await dontTouchMyPhoneService.requestPermissions();
      dontTouchMyPhoneService.arm(settings.armingDelaySeconds);
    }
  };

  const handleSensitivityChange = (sens: MotionSensitivity) => {
    dontTouchMyPhoneService.updateSettings({ sensitivity: sens });
    setSettings(dontTouchMyPhoneService.getSettings());
  };

  const handleSettingToggle = (key: keyof typeof settings, val: any) => {
    dontTouchMyPhoneService.updateSettings({ [key]: val });
    setSettings(dontTouchMyPhoneService.getSettings());
  };

  // Vault Unlock Action
  const handleUnlockVault = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (dontTouchMyPhoneService.verifySecurityPin(vaultPinInput)) {
      setIsVaultUnlocked(true);
      setVaultPinInput("");
      setVaultPinError("");
    } else {
      setVaultPinError("Incorrect PIN! Access Denied.");
      setVaultPinInput("");
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setVaultPinInput("");
      setVaultPinError("");
    } else if (val === "DEL") {
      setVaultPinInput((prev) => prev.slice(0, -1));
      setVaultPinError("");
    } else if (vaultPinInput.length < 6) {
      const next = vaultPinInput + val;
      setVaultPinInput(next);
      setVaultPinError("");
      // Auto-unlock if 4 digits match
      if (next.length === 4 && dontTouchMyPhoneService.verifySecurityPin(next)) {
        setIsVaultUnlocked(true);
        setVaultPinInput("");
      }
    }
  };

  // Delete Protection Verification
  const handleConfirmDeleteWithPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deleteTarget) return;

    if (!dontTouchMyPhoneService.verifySecurityPin(deletePinInput)) {
      setDeletePinError("Galat PIN! Photo delete nahi ho sakti.");
      return;
    }

    if (deleteTarget.isAll) {
      dontTouchMyPhoneService.clearAllRecords(deletePinInput);
    } else if (deleteTarget.id) {
      dontTouchMyPhoneService.deleteRecord(deleteTarget.id, deletePinInput);
    }

    setDeleteTarget(null);
    setDeletePinInput("");
    setDeletePinError("");
    if (previewPhoto && previewPhoto.id === deleteTarget.id) {
      setPreviewPhoto(null);
    }
  };

  // PIN Update Action
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError("");
    setChangePinSuccess("");

    if (!dontTouchMyPhoneService.verifySecurityPin(currentPinInput)) {
      setChangePinError("Current PIN is incorrect.");
      return;
    }

    if (newPinInput.length < 4) {
      setChangePinError("New PIN must be at least 4 digits.");
      return;
    }

    if (newPinInput !== confirmNewPinInput) {
      setChangePinError("New PIN confirmation does not match.");
      return;
    }

    const success = dontTouchMyPhoneService.setSecurityPin(newPinInput);
    if (success) {
      setChangePinSuccess("Security PIN updated successfully!");
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmNewPinInput("");
      setTimeout(() => {
        setIsChangingPin(false);
        setChangePinSuccess("");
      }, 1500);
    } else {
      setChangePinError("Failed to update PIN.");
    }
  };

  const handleResetPinToDefault = () => {
    const ok = dontTouchMyPhoneService.resetSecurityPin("1234");
    if (ok) {
      setResetPinSuccess("Master PIN successfully reset to default 1234!");
      setVaultPinInput("1234");
      setVaultPinError("");
      setShowResetConfirm(false);
      setTimeout(() => {
        setIsVaultUnlocked(true);
        setVaultPinInput("");
        setResetPinSuccess("");
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0d121f] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Stealth copy: No mention of camera/photo to intruders */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-red-500/10 via-[#111728] to-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
                secState === "armed"
                  ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-red-500/20 animate-pulse"
                  : secState === "triggered"
                  ? "bg-red-600 border-red-400 text-white animate-bounce shadow-red-600/50"
                  : secState === "arming"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 animate-spin"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              }`}
            >
              {secState === "armed" ? (
                <ShieldAlert size={22} />
              ) : secState === "triggered" ? (
                <ShieldAlert size={22} />
              ) : secState === "arming" ? (
                <Activity size={22} />
              ) : (
                <ShieldCheck size={22} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Don't Touch My Phone
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  Anti-Theft
                </span>
              </div>
              <p className="text-xs text-slate-400">
                24/7 Motion sensor alarm &amp; perimeter defense
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0a0e18] px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("control")}
            className={`py-2 px-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "control"
                ? "border-red-400 text-red-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Shield size={14} />
            <span>Control Center</span>
          </button>

          {/* Secret Vault Tab - Kept Discreet & Protected */}
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`py-2 px-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "vault"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {isVaultUnlocked ? (
              <Unlock size={14} className="text-emerald-400" />
            ) : (
              <Lock size={14} className="text-purple-400" />
            )}
            <span>Secret Vault</span>
            {isVaultUnlocked && intruders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/40">
                {intruders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`py-2 px-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "border-red-400 text-red-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Sliders size={14} />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === "control" && (
            <div className="space-y-4">
              {/* Main Status & Arm Button */}
              <div
                className={`p-5 rounded-2xl border text-center space-y-4 transition-all ${
                  secState === "armed"
                    ? "bg-gradient-to-b from-red-950/60 to-red-900/20 border-red-500/50 shadow-[0_0_24px_rgba(239,68,68,0.2)]"
                    : secState === "triggered"
                    ? "bg-red-900/60 border-red-500 animate-pulse"
                    : secState === "arming"
                    ? "bg-amber-950/40 border-amber-500/40"
                    : "bg-[#111726] border-white/10"
                }`}
              >
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        secState === "armed"
                          ? "bg-red-400 animate-ping"
                          : secState === "triggered"
                          ? "bg-red-500 animate-bounce"
                          : secState === "arming"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span>
                      {secState === "armed"
                        ? "Armed & Guarding Phone"
                        : secState === "triggered"
                        ? "🚨 Intruder Detected!"
                        : secState === "arming"
                        ? `Arming in ${countdown}s...`
                        : "Security Disarmed (Idle)"}
                    </span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    {secState === "armed"
                      ? "Phone Hilaate Hi Alarm Bajega"
                      : secState === "triggered"
                      ? "Intruder Alert Active!"
                      : secState === "arming"
                      ? `Phone Ko Table Par Rakh Dein (${countdown}s)`
                      : "Protect Devid's Phone From Intruders"}
                  </h4>

                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {secState === "armed"
                      ? `Agar koi bhi phone ko touch karega ya uthayega, toh ${assistantName} zor se loud siren bajayegi aur alert karegi.`
                      : `Activate karte hi 5 second ka grace time milega taaki phone ko aaraam se table par rakh sakein.`}
                  </p>
                </div>

                {/* Big Action Button */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleToggleArm}
                    className={`py-3.5 px-8 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                      secState === "armed" || secState === "triggered"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/40"
                        : secState === "arming"
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40"
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white shadow-emerald-600/30"
                    }`}
                  >
                    {secState === "armed" || secState === "triggered" ? (
                      <>
                        <Square size={18} className="fill-current" />
                        <span>Turn Off / Disarm Security</span>
                      </>
                    ) : secState === "arming" ? (
                      <>
                        <Square size={18} className="fill-current" />
                        <span>Cancel Arming ({countdown}s)</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} className="fill-current" />
                        <span>Arm "Don't Touch My Phone" (5s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stealth Vault Link (No photos leaked on main screen) */}
              <div className="p-3.5 rounded-2xl bg-[#111726] border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Secret Security Vault</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                        PIN Protected
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Surakshit log and tamper-proof evidence hidden behind Devid's master PIN
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("vault")}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-bold border border-purple-500/40 transition-colors whitespace-nowrap"
                >
                  {isVaultUnlocked ? "View Vault" : "Unlock Vault"}
                </button>
              </div>

              {/* Voice Command Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/25 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Mic size={15} />
                  <span>Voice Commands Supported (Bol Kar Control Karein)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Turn On Command:
                    </span>
                    <p className="font-mono text-emerald-300 font-semibold">
                      "Don't touch my phone"
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ya Zoya se kahein: <i>"Mere phone ko mat chhuo on karo"</i>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Turn Off Command:
                    </span>
                    <p className="font-mono text-rose-300 font-semibold">
                      "Turn off don't touch my phone"
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ya kahein: <i>"Band karo"</i> / <i>"Stop alarm"</i>
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Accelerometer & Motion Sensor Meter */}
              <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Activity size={15} className="text-cyan-400" />
                    <span>Live Device Motion &amp; G-Force Meter</span>
                  </div>
                  <span className="text-xs font-mono text-cyan-300">
                    {liveMagnitude > 0 ? `${liveMagnitude} m/s²` : "Calibrated"}
                  </span>
                </div>

                <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/10 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-rose-500 transition-all duration-100"
                    style={{
                      width: `${Math.min(100, Math.max(5, (liveMagnitude / 20) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Sensitivity: <b className="text-white capitalize">{settings.sensitivity}</b>
                  </span>
                  <span>
                    Threshold:{" "}
                    {settings.sensitivity === "high"
                      ? "2.2 m/s² (Sensitive)"
                      : settings.sensitivity === "low"
                      ? "8.5 m/s² (Firm Pick)"
                      : "4.5 m/s² (Normal Lift)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "vault" && (
            <div className="space-y-4">
              {/* If Vault is LOCKED: Show Master PIN keypad */}
              {!isVaultUnlocked ? (
                <div className="py-8 px-4 sm:px-6 rounded-2xl bg-[#111726] border border-purple-500/30 flex flex-col items-center text-center space-y-4 max-w-md mx-auto animate-fadeIn">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
                    <Lock size={32} />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">
                      Secret Evidence Vault (गुप्त वॉल्ट)
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Kisi bhi anjaan vyakti ko photo ka pata na chale aur koi delete na kar sake, isliye yeh vault Devid ke Master PIN se locked hai.
                    </p>
                  </div>

                  {/* PIN Display Dots */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          vaultPinInput.length > i
                            ? "bg-purple-400 border-purple-300 scale-110 shadow-sm shadow-purple-400"
                            : "bg-white/5 border-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  {vaultPinError && (
                    <div className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-xl animate-shake">
                      {vaultPinError}
                    </div>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] pt-1">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleKeypadPress(k)}
                        className={`h-12 rounded-2xl font-bold text-sm transition-all active:scale-95 border flex items-center justify-center ${
                          k === "C" || k === "DEL"
                            ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                            : "bg-[#182033] border-white/10 text-white hover:bg-purple-600/30 hover:border-purple-400/40 text-base shadow-sm"
                        }`}
                      >
                        {k === "DEL" ? "⌫" : k}
                      </button>
                    ))}
                  </div>

                  {/* Form Submit Button */}
                  <button
                    type="button"
                    onClick={() => handleUnlockVault()}
                    disabled={vaultPinInput.length < 4}
                    className="w-full max-w-[260px] py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    <Fingerprint size={16} />
                    <span>Unlock Vault</span>
                  </button>

                  {/* Reset PIN Section */}
                  {showResetConfirm ? (
                    <div className="w-full max-w-[260px] p-3 rounded-2xl bg-purple-950/60 border border-purple-500/50 text-center space-y-2 animate-fadeIn shadow-lg">
                      <p className="text-xs text-purple-200 font-semibold leading-snug">
                        Security PIN ko default <strong className="text-white">1234</strong> par reset karein?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPinToDefault}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
                        >
                          Reset 1234
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="text-xs text-purple-300 hover:text-purple-200 font-semibold underline flex items-center gap-1 transition-colors"
                    >
                      <KeyRound size={12} />
                      <span>Forgot PIN? Reset to 1234 (पिन रीसेट करें)</span>
                    </button>
                  )}

                  {resetPinSuccess && (
                    <div className="text-xs text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-fadeIn">
                      {resetPinSuccess}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <KeyRound size={12} className="text-purple-400" />
                    <span>Default Master PIN: <strong className="text-purple-300">1234</strong> (Customizable in Settings)</span>
                  </p>
                </div>
              ) : (
                /* Unlocked Vault Content */
                <div className="space-y-4 animate-fadeIn">
                  {/* Top Bar with Security Badges & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Unlock size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Secret Evidence Vault (Unlocked)</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                            Master Access
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {intruders.length} confidential capture{intruders.length === 1 ? "" : "s"} stored
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsVaultUnlocked(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors"
                      >
                        <Lock size={13} />
                        <span>Lock Vault</span>
                      </button>

                      {intruders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ isAll: true })}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Clear All (PIN Req.)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {intruders.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-[#111726] border border-white/10 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                        <ShieldCheck size={26} className="text-emerald-400" />
                      </div>
                      <h5 className="text-sm font-bold text-white">No Intruders Detected Yet</h5>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Aapka phone bilkul safe hai! Jab bhi koi phone ko haath lagayega, uski photo chupke se bina kisi ko pata chale yahan save ho jayegi.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {intruders.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-2xl overflow-hidden bg-[#111726] border border-white/10 flex flex-col group hover:border-purple-500/40 transition-all"
                        >
                          {/* Photo Container */}
                          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                            {record.photoUrl ? (
                              <img
                                src={record.photoUrl}
                                alt="Captured Intruder"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="text-center p-4 text-slate-500 text-xs">
                                <Camera size={24} className="mx-auto mb-1 text-slate-600" />
                                <span>Photo unavailable (Camera blocked)</span>
                              </div>
                            )}

                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold">
                              🚨 INTRUDER EVIDENCE
                            </div>

                            {record.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(record)}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Fullscreen Zoom"
                              >
                                <Maximize2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Details & Actions */}
                          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white">
                                {record.reason}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {record.formattedDate}
                              </p>
                              {record.motionMagnitude > 0 && (
                                <span className="text-[10px] text-cyan-300 font-mono">
                                  Motion: {record.motionMagnitude} m/s²
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                              {record.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => dontTouchMyPhoneService.downloadRecord(record)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1 border border-white/10 transition-colors"
                                >
                                  <Download size={13} />
                                  <span>Export Photo</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id: record.id })}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                                title="Delete Photo (Requires PIN)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Security PIN & Delete Protection Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-[#111726] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-purple-400" />
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        Master PIN &amp; Delete Protection (फोटो डिलीट सुरक्षा)
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Koi bhi anjaan vyakti intruder photos ko dekh ya delete nahi kar sakta
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        dontTouchMyPhoneService.resetSecurityPin("1234");
                        setChangePinSuccess("Security PIN successfully reset to default 1234!");
                        setTimeout(() => setChangePinSuccess(""), 3500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 hover:text-white text-xs font-bold border border-purple-500/40 transition-colors"
                      title="Reset PIN to default 1234"
                    >
                      Reset to 1234
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPin((prev) => !prev)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-bold border border-purple-500/40 transition-colors"
                    >
                      {isChangingPin ? "Cancel" : "Change PIN"}
                    </button>
                  </div>
                </div>

                {/* Change PIN Form */}
                {isChangingPin && (
                  <form onSubmit={handleChangePin} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5 text-xs animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">Current PIN</label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="Current PIN (Default: 1234)"
                          value={currentPinInput}
                          onChange={(e) => setCurrentPinInput(e.target.value)}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">New 4-Digit PIN</label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="New PIN"
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">Confirm New PIN</label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="Confirm New PIN"
                          value={confirmNewPinInput}
                          onChange={(e) => setConfirmNewPinInput(e.target.value)}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    {changePinError && (
                      <p className="text-rose-400 text-[11px] font-semibold">{changePinError}</p>
                    )}
                    {changePinSuccess && (
                      <p className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>{changePinSuccess}</span>
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
                      >
                        Save New PIN
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Motion Sensitivity */}
              <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-white">Motion Sensitivity</h5>
                    <p className="text-[11px] text-slate-400">
                      Kitne movement par alarm bajna chahiye
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-400 capitalize">
                    {settings.sensitivity}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["high", "medium", "low"] as MotionSensitivity[]).map((sens) => (
                    <button
                      key={sens}
                      type="button"
                      onClick={() => handleSensitivityChange(sens)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                        settings.sensitivity === sens
                          ? "bg-red-500/20 border-red-500/60 text-red-300"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {sens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Siren Volume Slider */}
              <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Volume2 size={14} className="text-red-400" />
                    <span>Alarm Siren Volume</span>
                  </div>
                  <span className="font-mono text-slate-300">
                    {Math.round(settings.sirenVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sirenVolume}
                  onChange={(e) =>
                    handleSettingToggle("sirenVolume", parseFloat(e.target.value))
                  }
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Zoya Voice Warning</p>
                    <p className="text-[11px] text-slate-400">
                      Alarm ke sath Zoya ki stern warning aawaz sunayein
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceAlert}
                    onChange={(e) => handleSettingToggle("voiceAlert", e.target.checked)}
                    className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Arming Delay (Grace Time)</p>
                    <p className="text-[11px] text-slate-400">
                      Phone ko rakhne ke liye milne wala waqt
                    </p>
                  </div>
                  <select
                    value={settings.armingDelaySeconds}
                    onChange={(e) =>
                      handleSettingToggle("armingDelaySeconds", parseInt(e.target.value))
                    }
                    className="py-1 px-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  >
                    <option value="3">3 Seconds</option>
                    <option value="5">5 Seconds</option>
                    <option value="10">10 Seconds</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0a0e18] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Info size={13} />
            <span>Say: "Turn off don't touch my phone" to disarm</span>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal with PIN Requirement */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#101626] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Delete Protection: Enter Master PIN
                </h4>
                <p className="text-[11px] text-slate-400">
                  {deleteTarget.isAll
                    ? "Tamper protection: Confirm PIN to clear all captures"
                    : "Tamper protection: Confirm PIN to permanently delete evidence"}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmDeleteWithPin} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Devid's Master Security PIN
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  placeholder="Enter 4-digit PIN (Default: 1234)"
                  value={deletePinInput}
                  onChange={(e) => {
                    setDeletePinInput(e.target.value);
                    setDeletePinError("");
                  }}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-sm font-mono tracking-widest text-center"
                  required
                />
              </div>

              {deletePinError && (
                <div className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/25 p-2 rounded-lg text-center animate-shake">
                  {deletePinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeletePinInput("");
                    setDeletePinError("");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletePinInput.length < 4}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Zoom Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X size={20} />
          </button>
          <div className="max-w-3xl w-full space-y-3">
            <img
              src={previewPhoto.photoUrl}
              alt="Intruder Zoom"
              className="w-full max-h-[75vh] object-contain rounded-2xl border border-purple-500/50 shadow-2xl"
            />
            <div className="flex items-center justify-between text-xs text-slate-300 px-2">
              <span>{previewPhoto.formattedDate} — {previewPhoto.reason}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: previewPhoto.id })}
                  className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold flex items-center gap-1.5 border border-rose-500/30"
                >
                  <Trash2 size={14} />
                  <span>Delete (PIN Req.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => dontTouchMyPhoneService.downloadRecord(previewPhoto)}
                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Export to Device</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
