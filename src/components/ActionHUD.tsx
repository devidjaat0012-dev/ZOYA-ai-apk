import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { ToolCallEvent } from "../types";

interface ActionHUDProps {
  event: ToolCallEvent | null;
  onDismiss: () => void;
}

export default function ActionHUD({ event, onDismiss }: ActionHUDProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="w-full max-w-md px-4 pointer-events-auto"
        >
          <div className="bg-[#0f1422]/90 border border-cyan-500/40 rounded-2xl p-3.5 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  TOOL EXECUTED
                </div>
                <div className="text-sm font-semibold text-white/90 truncate">
                  {event.title}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>Launch</span>
                  <ExternalLink size={13} />
                </a>
              )}
              <button
                onClick={onDismiss}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
