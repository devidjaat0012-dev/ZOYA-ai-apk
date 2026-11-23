import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Cloud,
  Sparkles,
  X,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";
import { User } from "../firebase";

interface AuthAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  memoriesCount: number;
  assistantName: string;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onManualCloudSync: () => Promise<void>;
}

export default function AuthAccountModal({
  isOpen,
  onClose,
  currentUser,
  isAuthLoading,
  isSyncingCloud,
  memoriesCount,
  assistantName,
  onGoogleLogin,
  onLogout,
  onManualCloudSync,
}: AuthAccountModalProps) {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginClick = async () => {
    setLoginError(null);
    setSubmitting(true);
    try {
      await onGoogleLogin();
    } catch (err: any) {
      const msg = String(err?.message || err || "Google Sign-In cancelled");
      if (!msg.toLowerCase().includes("popup-closed-by-user")) {
        setLoginError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutClick = async () => {
    setLoginError(null);
    setSubmitting(true);
    try {
      await onLogout();
    } catch (err: any) {
      setLoginError(String(err?.message || "Could not sign out"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-3xl bg-[#0C101C] border border-white/15 shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden select-none"
        >
          {/* Top Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-cyan-500/20 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
                <UserIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>{assistantName} Account &amp; Cloud Login</span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  Google Authentication &amp; Firebase Cloud Memory Sync
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {isAuthLoading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 size={28} className="animate-spin text-cyan-400" />
                <span className="text-xs">Checking login session...</span>
              </div>
            ) : currentUser ? (
              /* Logged-In User Profile Card */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-emerald-500/30 flex items-center gap-3.5">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "User"}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400/60 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {(currentUser.displayName || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-white truncate">
                        {currentUser.displayName || "Verified User"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                        <CheckCircle2 size={10} />
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                      <Mail size={12} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                  </div>
                </div>

                {/* Cloud Sync Info */}
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                      <Cloud size={15} className="text-cyan-400" />
                      <span>Firebase Cloud Backup Active</span>
                    </div>
                    <span className="text-[11px] text-emerald-300 font-medium">
                      {memoriesCount} Memories Synced
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Your personal profile, persona preferences, and{" "}
                    {assistantName}&apos;s long-term memories are securely tied
                    to your Google account.
                  </p>
                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={onManualCloudSync}
                    className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSyncingCloud ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Syncing with Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Sync Profile &amp; Memories Now</span>
                      </>
                    )}
                  </button>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200">
                    {loginError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleLogoutClick}
                  className="w-full py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={16} />
                  <span>Sign Out of {assistantName}</span>
                </button>
              </div>
            ) : (
              /* Logged-Out Sign In View */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-pink-300">
                    <ShieldCheck size={16} className="text-pink-400" />
                    <span>Why Sign In to {assistantName}?</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <span>
                        Automatically personalize {assistantName} with your
                        Google profile name &amp; photo
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>
                        Cloud backup for your Long-Term Memories &amp; Persona
                        preferences
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>
                        One-click secure Google Login via Firebase
                        Authentication
                      </span>
                    </li>
                  </ul>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200">
                    {loginError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleLoginClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin text-slate-800" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={17} className="text-pink-600" />
                      <span>Continue with Google Login</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
