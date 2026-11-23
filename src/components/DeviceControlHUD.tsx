import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  Volume1,
  VolumeX,
  Sun,
  SunMedium,
  SunDim,
  Minus,
  Plus,
} from "lucide-react";
import {
  deviceControlService,
  DeviceControlState,
} from "../services/deviceControlService";

export default function DeviceControlHUD() {
  const [state, setState] = useState<DeviceControlState>(() =>
    deviceControlService.getState()
  );
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hideTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const unsub = deviceControlService.subscribe((next) => {
      setState(next);
      if (next.lastChangedType) {
        setIsVisible(true);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2600);
      }
    });

    return () => {
      unsub();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const type = state.lastChangedType || "volume";

  const renderVolumeIcon = () => {
    if (state.isMuted || state.volume === 0) {
      return <VolumeX size={18} className="text-rose-400" />;
    }
    if (state.volume < 40) {
      return <Volume1 size={18} className="text-cyan-400" />;
    }
    return <Volume2 size={18} className="text-cyan-400" />;
  };

  const renderBrightnessIcon = () => {
    if (state.brightness < 35) {
      return <SunDim size={18} className="text-amber-400" />;
    }
    if (state.brightness < 75) {
      return <SunMedium size={18} className="text-amber-400" />;
    }
    return <Sun size={18} className="text-amber-400" />;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0b1220]/95 border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(56,189,248,0.2)] backdrop-blur-xl text-white min-w-[260px] sm:min-w-[300px]">
            {/* Control Icon */}
            <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
              {type === "volume" ? renderVolumeIcon() : renderBrightnessIcon()}
            </div>

            {/* Slider & Label Container */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-200 capitalize">
                  {type === "volume"
                    ? state.isMuted
                      ? "Volume (Muted)"
                      : "System Volume"
                    : "Screen Brightness"}
                </span>
                <span
                  className={`font-mono text-[11px] font-bold ${
                    type === "volume" ? "text-cyan-300" : "text-amber-300"
                  }`}
                >
                  {type === "volume"
                    ? state.isMuted
                      ? "0%"
                      : `${state.volume}%`
                    : `${state.brightness}%`}
                </span>
              </div>

              {/* Progress Slider Track */}
              <div
                className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden cursor-pointer border border-white/10"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  if (type === "volume") {
                    deviceControlService.setVolume(Math.round(ratio * 100));
                  } else {
                    deviceControlService.setBrightness(
                      Math.max(10, Math.round(ratio * 100))
                    );
                  }
                }}
              >
                <motion.div
                  className={`h-full rounded-full transition-all duration-100 ${
                    type === "volume"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                      : "bg-gradient-to-r from-amber-500 to-yellow-400"
                  }`}
                  style={{
                    width: `${
                      type === "volume"
                        ? state.isMuted
                          ? 0
                          : state.volume
                        : state.brightness
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Quick +/- buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (type === "volume") {
                    deviceControlService.volumeDown(10);
                  } else {
                    deviceControlService.brightnessDown(15);
                  }
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Decrease"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (type === "volume") {
                    deviceControlService.volumeUp(10);
                  } else {
                    deviceControlService.brightnessUp(15);
                  }
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Increase"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
