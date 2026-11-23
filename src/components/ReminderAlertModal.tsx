import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check, Clock, Volume2, X, Sparkles } from "lucide-react";
import { ZoyaReminder, reminderService } from "../services/reminderService";

interface ReminderAlertModalProps {
  reminder: ZoyaReminder | null;
  onDismiss: () => void;
  onSnooze: (reminderId: string) => void;
  onComplete: (reminderId: string) => void;
  assistantName?: string;
  userName?: string;
}

export default function ReminderAlertModal({
  reminder,
  onDismiss,
  onSnooze,
  onComplete,
  assistantName = "Zoya",
  userName = "Devid",
}: ReminderAlertModalProps) {
  if (!reminder) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#181226] via-[#100d1c] to-[#0a0712] border-2 border-pink-500/60 p-6 shadow-[0_0_50px_rgba(236,72,153,0.35)] text-white text-center overflow-hidden"
        >
          {/* Ambient Pulsing Glow Rings */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-pink-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-amber-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          {/* Animated Alarm Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/40 mb-4 animate-bounce">
            <Bell size={28} className="text-white animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black animate-ping" />
          </div>

          {/* Assistant Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-semibold mb-2">
            <Sparkles size={12} className="text-amber-400" />
            <span>{assistantName} Voice Reminder</span>
          </div>

          {/* Reminder Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 leading-snug">
            {reminder.title}
          </h2>

          <p className="text-xs text-pink-200/80 mb-6">
            {userName} jaan, aapka scheduled reminder time ho gaya hai! Is kaam ko jaldi se poora kar lo. ❤️
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onComplete(reminder.id)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Check size={16} className="stroke-[3]" />
              <span>Mark Completed (Poora Ho Gaya)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSnooze(reminder.id)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Clock size={13} className="text-amber-400" />
                <span>Snooze +5m</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
