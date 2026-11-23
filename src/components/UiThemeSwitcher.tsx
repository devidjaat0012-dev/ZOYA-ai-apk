import React, { useState, useRef, useEffect } from "react";
import { LayoutGrid, Check, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ZOYA_UI_THEMES,
  ZoyaUiThemeId,
  ZoyaUiThemeOption,
  resolveUiTheme,
} from "../types";

interface UiThemeSelectorGridProps {
  activeThemeId?: ZoyaUiThemeId;
  onSelectTheme: (themeId: ZoyaUiThemeId) => void;
  compact?: boolean;
}

/**
 * Miniature wireframe illustration showing each option's DISTINCT full UI architecture
 */
function MiniUiWireframe({ option }: { option: ZoyaUiThemeOption }) {
  const accentStyle = { backgroundColor: option.accentHex };
  const secondaryStyle = { backgroundColor: option.secondaryAccentHex };
  const surfaceStyle = {
    backgroundColor: option.surfaceHex,
    borderColor: option.borderHex,
  };

  if (option.layoutMode === "companion_hud") {
    // Reference Image Layout: Character left + Telemetry card right + Center Mic Orb + 4 bottom tiles
    return (
      <div className="relative w-full h-full flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="h-1 w-2.5 rounded-full opacity-70" style={{ backgroundColor: option.textHex }} />
          <span className="h-1.5 w-6 rounded-full" style={accentStyle} />
          <span className="h-1.5 w-1.5 rounded-full" style={secondaryStyle} />
        </div>
        <div className="flex items-center justify-between gap-1.5 flex-1 py-0.5">
          {/* Character silhouette pillar */}
          <div
            className="w-5 h-8 rounded-md border flex items-end justify-center pb-0.5"
            style={surfaceStyle}
          >
            <div className="w-2.5 h-5 rounded-t-full opacity-90" style={accentStyle} />
          </div>
          {/* Telemetry card + waveform */}
          <div className="flex-1 h-7 rounded-md border p-1 flex flex-col justify-between" style={surfaceStyle}>
            <span className="h-1 w-7 rounded-full opacity-80" style={secondaryStyle} />
            <div className="flex items-end gap-0.5 h-2.5">
              <span className="w-1 h-1 rounded-full" style={accentStyle} />
              <span className="w-1 h-2.5 rounded-full" style={secondaryStyle} />
              <span className="w-1 h-1.5 rounded-full" style={accentStyle} />
              <span className="w-1 h-2 rounded-full" style={secondaryStyle} />
            </div>
          </div>
        </div>
        {/* 4 bottom dock tiles */}
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-2 rounded-sm border" style={surfaceStyle} />
          ))}
        </div>
      </div>
    );
  }

  if (option.layoutMode === "command_bento") {
    // Bento OS Layout: Top strip + 3-column bento cards
    return (
      <div className="w-full h-full flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between">
          <span className="h-1.5 w-7 rounded-full" style={accentStyle} />
          <span className="text-[7px] font-mono tabular-nums" style={{ color: option.mutedTextHex }}>
            OS
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 flex-1">
          <div className="col-span-2 rounded-md border p-1 flex flex-col justify-between" style={surfaceStyle}>
            <span className="h-1.5 w-8 rounded-full" style={secondaryStyle} />
            <span className="h-1 w-5 rounded-full opacity-50" style={{ backgroundColor: option.textHex }} />
          </div>
          <div className="rounded-md border p-1 flex flex-col justify-between" style={surfaceStyle}>
            <span className="w-2 h-2 rounded-full self-end" style={accentStyle} />
            <span className="h-1 w-full rounded-full opacity-40" style={{ backgroundColor: option.textHex }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 h-2">
          <div className="rounded-sm border" style={surfaceStyle} />
          <div className="rounded-sm border" style={surfaceStyle} />
          <div className="rounded-sm" style={accentStyle} />
        </div>
      </div>
    );
  }

  if (option.layoutMode === "vedic_sanctum") {
    // Vedic Sanctum: Celestial Zodiac Orb centered + 3 bottom Vedic cards
    return (
      <div className="w-full h-full flex flex-col justify-between items-center">
        <div className="w-full flex items-center justify-between">
          <span className="h-1 w-5 rounded-full" style={accentStyle} />
          <span className="text-[7px] font-mono" style={{ color: option.accentHex }}>ॐ</span>
          <span className="h-1 w-4 rounded-full opacity-60" style={secondaryStyle} />
        </div>
        <div
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: option.accentHex }}
        >
          <div className="w-3.5 h-3.5 rounded-full" style={accentStyle} />
        </div>
        <div className="w-full grid grid-cols-3 gap-1">
          <div className="h-2 rounded-sm border" style={surfaceStyle} />
          <div className="h-2 rounded-sm border" style={surfaceStyle} />
          <div className="h-2 rounded-sm border" style={surfaceStyle} />
        </div>
      </div>
    );
  }

  if (option.layoutMode === "neural_matrix") {
    // Dual Split Matrix: Left orb pane + Right live chat/tools pane
    return (
      <div className="w-full h-full flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between">
          <span className="h-1 w-6 rounded-full" style={accentStyle} />
          <span className="h-1 w-4 rounded-full" style={secondaryStyle} />
        </div>
        <div className="grid grid-cols-2 gap-1 flex-1">
          <div className="rounded-md border flex items-center justify-center" style={surfaceStyle}>
            <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: option.accentHex }} />
          </div>
          <div className="rounded-md border p-1 flex flex-col justify-between" style={surfaceStyle}>
            <span className="h-1 w-6 rounded-full opacity-70" style={{ backgroundColor: option.textHex }} />
            <span className="h-1 w-4 rounded-full self-end" style={secondaryStyle} />
            <span className="h-1.5 w-full rounded-sm opacity-30" style={accentStyle} />
          </div>
        </div>
      </div>
    );
  }

  // classic_workspace: Top bar + sidebar/stage + dock
  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={accentStyle} />
          <span className="h-1.5 w-8 rounded-full opacity-80" style={{ backgroundColor: option.textHex }} />
        </div>
        <span
          className="text-[8px] font-mono tabular-nums flex items-center gap-0.5"
          style={{ color: option.mutedTextHex }}
        >
          {option.isLight ? <Sun size={9} /> : <Moon size={9} />}
          {option.numberLabel}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1.5">
        <div className="h-5 flex-1 rounded-md border px-1.5 flex items-center" style={surfaceStyle}>
          <span className="h-1.5 w-10 rounded-full opacity-70" style={{ backgroundColor: option.textHex }} />
        </div>
        <div
          className="h-4 w-8 rounded-md"
          style={{
            background: `linear-gradient(135deg, ${option.accentHex}, ${option.secondaryAccentHex})`,
          }}
        />
      </div>
    </div>
  );
}

export function UiThemeSelectorGrid({
  activeThemeId,
  onSelectTheme,
  compact = false,
}: UiThemeSelectorGridProps) {
  const active = resolveUiTheme(activeThemeId);

  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 gap-1.5"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
      }
    >
      {ZOYA_UI_THEMES.map((option) => {
        const isSelected = active.id === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelectTheme(option.id)}
            className={`group relative text-left p-2.5 rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isSelected
                ? "border-amber-400/70 bg-white/[0.1] ring-1 ring-amber-400/40 shadow-md"
                : "border-white/10 bg-black/30 hover:bg-white/[0.06] hover:border-white/25"
            }`}
          >
            {/* Mini Live UI Architecture Preview Window */}
            <div
              className="w-full h-16 rounded-lg border overflow-hidden p-1.5 mb-2"
              style={{
                backgroundColor: option.bgHex,
                borderColor: option.borderHex,
              }}
            >
              <MiniUiWireframe option={option} />
            </div>

            {/* Clean Typographic Metadata */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                  <span>{option.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {option.numberLabel} · {option.layoutBadge}
                </div>
                {!compact && (
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {option.tagline}
                  </p>
                )}
              </div>

              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-white/20 text-transparent group-hover:border-white/40"
                }`}
                aria-hidden="true"
              >
                <Check size={12} className="stroke-[3]" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface UiThemeQuickPopoverProps {
  activeThemeId?: ZoyaUiThemeId;
  onSelectTheme: (themeId: ZoyaUiThemeId) => void;
  align?: "left" | "right";
  labelMode?: "full" | "compact";
}

export function UiThemeQuickPopover({
  activeThemeId,
  onSelectTheme,
  align = "right",
  labelMode = "full",
}: UiThemeQuickPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentTheme: ZoyaUiThemeOption = resolveUiTheme(activeThemeId);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const buttonLightClasses = currentTheme.isLight
    ? "bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-800"
    : "bg-white/[0.05] hover:bg-white/[0.1] border-white/12 text-slate-200 hover:text-white";

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${buttonLightClasses}`}
        title="Switch between 5 Full Zoya UI Layouts"
        aria-expanded={open}
      >
        <LayoutGrid
          size={15}
          style={{ color: currentTheme.accentHex }}
          className="shrink-0"
        />
        {labelMode === "full" ? (
          <span className="hidden sm:inline whitespace-nowrap">
            5 UI · {currentTheme.shortName}
          </span>
        ) : (
          <span className="whitespace-nowrap">{currentTheme.shortName}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className={`fixed sm:absolute top-16 sm:top-full sm:mt-2 ${
              align === "left" ? "left-3 sm:left-0" : "right-3 sm:right-0"
            } w-[calc(100vw-24px)] sm:w-[340px] rounded-2xl border shadow-2xl p-3.5 z-50 backdrop-blur-xl ${
              currentTheme.isLight
                ? "bg-white/98 border-slate-300 text-slate-900"
                : "bg-[#0E1320]/98 border-white/15 text-white"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${
                currentTheme.isLight ? "border-slate-200" : "border-white/10"
              }`}
            >
              <div>
                <h3
                  className={`text-xs font-bold ${
                    currentTheme.isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  5 Full Zoya UI Layouts
                </h3>
                <p
                  className={`text-[11px] ${
                    currentTheme.isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  Select complete screen layout &amp; HUD mode
                </p>
              </div>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  currentTheme.isLight ? "text-indigo-600" : "text-cyan-300"
                }`}
              >
                {currentTheme.numberLabel}
              </span>
            </div>

            <div className="space-y-1.5 max-h-[65vh] overflow-y-auto chat-scroll pr-0.5">
              {ZOYA_UI_THEMES.map((option) => {
                const isSelected = currentTheme.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSelectTheme(option.id);
                      setOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-3 ${
                      isSelected
                        ? currentTheme.isLight
                          ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300"
                          : "bg-white/[0.11] border-amber-400/60 ring-1 ring-amber-400/30"
                        : currentTheme.isLight
                        ? "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        : "bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20"
                    }`}
                  >
                    {/* Live Mini Architecture Swatch */}
                    <div
                      className="w-14 h-11 rounded-lg border shrink-0 p-1"
                      style={{
                        backgroundColor: option.bgHex,
                        borderColor: option.borderHex,
                      }}
                    >
                      <MiniUiWireframe option={option} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold truncate ${
                          currentTheme.isLight ? "text-slate-900" : "text-white"
                        }`}
                      >
                        {option.name}
                      </div>
                      <div
                        className={`text-[10.5px] font-medium truncate ${
                          currentTheme.isLight ? "text-slate-700" : "text-cyan-300/90"
                        }`}
                      >
                        {option.numberLabel} · {option.layoutBadge}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          currentTheme.isLight ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {option.tagline}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check size={12} className="stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UiThemeQuickPopover;
