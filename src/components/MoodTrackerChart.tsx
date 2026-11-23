import React, { useMemo, useState } from "react";
import { X, Flame, HeartHandshake, TrendingUp, Smile, Sparkles } from "lucide-react";
import {
  AngerLevel,
  DailyMoodEntry,
  loadWeeklyMoodHistory,
  recordMoodFluctuation,
} from "../services/angerService";

interface MoodTrackerChartProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
  userName: string;
  currentAngerLevel: AngerLevel;
  personaModeLabel: string;
  onSelectAngerLevel: (level: AngerLevel) => void;
}

const ANGER_LEVEL_LABELS: Record<number, string> = {
  0: "0 · Happy",
  1: "1 · Pout",
  2: "2 · Gussa",
  3: "3 · Nakhre",
};

export function MoodTrackerChart({
  isOpen,
  onClose,
  assistantName,
  userName,
  currentAngerLevel,
  personaModeLabel,
  onSelectAngerLevel,
}: MoodTrackerChartProps) {
  const [chartView, setChartView] = useState<"fluctuation" | "manana">("fluctuation");
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const weeklyData = useMemo(() => {
    void currentAngerLevel;
    void refreshTick;
    return loadWeeklyMoodHistory();
  }, [currentAngerLevel, refreshTick]);

  const stats = useMemo(() => {
    if (weeklyData.length === 0) {
      return {
        avgAnger: "0.0",
        totalManana: 0,
        peakDay: "Thu",
        calmestDay: "Wed",
      };
    }
    const sumAnger = weeklyData.reduce((acc, d) => acc + d.angerLevel, 0);
    const totalManana = weeklyData.reduce((acc, d) => acc + d.mananaCount, 0);
    const sortedByPeak = [...weeklyData].sort((a, b) => b.angerLevel - a.angerLevel);
    const sortedByCalm = [...weeklyData].sort((a, b) => a.angerLevel - b.angerLevel);

    return {
      avgAnger: (sumAnger / weeklyData.length).toFixed(1),
      totalManana,
      peakDay: `${sortedByPeak[0]?.dayLabel ?? ""} (Lvl ${sortedByPeak[0]?.angerLevel ?? 0})`,
      calmestDay: `${sortedByCalm[0]?.dayLabel ?? ""} (Lvl ${sortedByCalm[0]?.angerLevel ?? 0})`,
    };
  }, [weeklyData]);

  if (!isOpen) return null;

  const activeEntryIndex = hoveredIndex !== null ? hoveredIndex : selectedDayIndex;
  const activeEntry = weeklyData[activeEntryIndex] || weeklyData[weeklyData.length - 1];

  const handleQuickMoodTrigger = (level: AngerLevel, isManana: boolean = false) => {
    onSelectAngerLevel(level);
    recordMoodFluctuation(
      level,
      isManana ? "manana" : "anger_change",
      isManana
        ? `${userName} coaxed ${assistantName} with sweet Hinglish—anger melted to 0!`
        : level === 0
        ? `${assistantName} is in a happy, playful mood with ${userName}.`
        : `${assistantName}'s Gussa spiked to Level ${level} today—waiting for sweet manana!`
    );
    setSelectedDayIndex(weeklyData.length - 1);
    setRefreshTick((t) => t + 1);
  };

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 85;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (index: number) => {
    if (weeklyData.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (weeklyData.length - 1)) * chartW;
  };

  const getY = (val: number, max: number = 3) => {
    return padTop + chartH - (Math.min(Math.max(val, 0), max) / max) * chartH;
  };

  // Build smooth curve path for Area chart
  const buildSmoothPath = (dataKey: "angerLevel" | "peakAnger") => {
    if (weeklyData.length === 0) return "";
    const points = weeklyData.map((d, i) => ({ x: getX(i), y: getY(d[dataKey], 3) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const angerLinePath = buildSmoothPath("angerLevel");
  const peakLinePath = buildSmoothPath("peakAnger");
  const angerAreaPath =
    weeklyData.length > 0
      ? `${angerLinePath} L ${getX(weeklyData.length - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`
      : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#0E1320] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-pink-400 shrink-0" />
              <span>{assistantName} Daily Mood &amp; Gussa Tracker</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>7-Day Anger Level Fluctuations</span>
              <span aria-hidden="true">·</span>
              <span>Active Persona: {personaModeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-pink-300">
                Current Gussa: Level {currentAngerLevel}/3
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Close Mood Tracker"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[82vh]">
          {/* Top Summary Row + Chart View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
              <span>
                Weekly Avg:{" "}
                <strong className="font-mono tabular-nums text-rose-300">
                  Lvl {stats.avgAnger}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>
                Peak Gussa:{" "}
                <strong className="font-mono tabular-nums text-amber-300">
                  {stats.peakDay}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>
                Sweetest Day:{" "}
                <strong className="font-mono tabular-nums text-emerald-300">
                  {stats.calmestDay}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>
                Total Manana:{" "}
                <strong className="font-mono tabular-nums text-pink-300">
                  {stats.totalManana}x
                </strong>
              </span>
            </div>

            {/* Segmented Chart Mode Control */}
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setChartView("fluctuation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartView === "fluctuation"
                    ? "bg-pink-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Anger Curve
              </button>
              <button
                type="button"
                onClick={() => setChartView("manana")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartView === "manana"
                    ? "bg-pink-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Gussa vs. Manana
              </button>
            </div>
          </div>

          {/* Native Lightweight SVG Chart Canvas */}
          <div className="w-full rounded-xl bg-[#090D16] border border-white/[0.06] p-3 sm:p-4 relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="zoyaAngerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
                  <stop offset="60%" stopColor="#ec4899" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="zoyaPeakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-Axis Labels */}
              {[0, 1, 2, 3].map((lvl) => {
                const y = getY(lvl, 3);
                return (
                  <g key={lvl}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="rgba(255,255,255,0.07)"
                      strokeDasharray={lvl === 2 ? "4 4" : "3 3"}
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize={11}
                      textAnchor="end"
                      className="font-medium"
                    >
                      {ANGER_LEVEL_LABELS[lvl]}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Day Labels */}
              {weeklyData.map((d, i) => {
                const x = getX(i);
                const isSelected = i === activeEntryIndex;
                return (
                  <g
                    key={d.dateKey}
                    className="cursor-pointer"
                    onClick={() => setSelectedDayIndex(i)}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <text
                      x={x}
                      y={svgHeight - 10}
                      fill={isSelected ? "#ec4899" : "#94a3b8"}
                      fontSize={12}
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                    >
                      {d.dayLabel}
                    </text>
                  </g>
                );
              })}

              {/* Content by View */}
              {chartView === "fluctuation" ? (
                <>
                  {/* Area fill */}
                  <path d={angerAreaPath} fill="url(#zoyaAngerGrad)" />
                  {/* Peak dashed line */}
                  <path
                    d={peakLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  {/* Main Anger line */}
                  <path
                    d={angerLinePath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={2.75}
                  />

                  {/* Interactive Points */}
                  {weeklyData.map((d, i) => {
                    const x = getX(i);
                    const y = getY(d.angerLevel, 3);
                    const isSelected = i === activeEntryIndex;
                    return (
                      <g
                        key={`pt-${d.dateKey}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedDayIndex(i)}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Invisible larger hover zone */}
                        <circle cx={x} cy={y} r={16} fill="transparent" />
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? "#f43f5e" : "#ec4899"}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                      </g>
                    );
                  })}
                </>
              ) : (
                /* Bar Chart View: Gussa Spikes vs Sweet Manana */
                <g>
                  {weeklyData.map((d, i) => {
                    const x = getX(i);
                    const isSelected = i === activeEntryIndex;
                    const maxVal = Math.max(...weeklyData.map((item) => Math.max(item.gussaTriggers, item.mananaCount, 4)));
                    const barW = 14;

                    const gussaH = (d.gussaTriggers / maxVal) * chartH;
                    const gussaY = padTop + chartH - gussaH;

                    const mananaH = (d.mananaCount / maxVal) * chartH;
                    const mananaY = padTop + chartH - mananaH;

                    return (
                      <g
                        key={`bar-${d.dateKey}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedDayIndex(i)}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Background highlight pill for selected column */}
                        {isSelected && (
                          <rect
                            x={x - barW - 6}
                            y={padTop}
                            width={barW * 2 + 12}
                            height={chartH}
                            fill="rgba(255,255,255,0.04)"
                            rx={6}
                          />
                        )}
                        {/* Gussa Spike Bar */}
                        <rect
                          x={x - barW - 2}
                          y={gussaY}
                          width={barW}
                          height={Math.max(gussaH, 3)}
                          fill="#f43f5e"
                          rx={3}
                          opacity={isSelected ? 1 : 0.85}
                        />
                        {/* Manana Count Bar */}
                        <rect
                          x={x + 2}
                          y={mananaY}
                          width={barW}
                          height={Math.max(mananaH, 3)}
                          fill="#10b981"
                          rx={3}
                          opacity={isSelected ? 1 : 0.85}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Selected Day Insight Strip */}
          {activeEntry && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles size={14} className="text-pink-400 shrink-0" />
                  <span className="font-semibold text-white">
                    {activeEntry.dayLabel} ({activeEntry.fullDateLabel})
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-pink-300 font-medium">
                    {activeEntry.moodLabel} (Lvl {activeEntry.angerLevel})
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {activeEntry.mananaCount} sweet apologies
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeEntry.note}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {weeklyData.map((d, idx) => (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      idx === activeEntryIndex
                        ? "bg-pink-500/25 border border-pink-500/50 text-pink-200"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                  >
                    {d.dayLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Today's Persona Mood Simulator Controls */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Adjust today&apos;s live mood to see {assistantName}&apos;s weekly graph &amp; avatar react:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickMoodTrigger(0, true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                  currentAngerLevel === 0
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                    : "bg-white/5 hover:bg-emerald-500/15 border-white/10 text-slate-300"
                }`}
              >
                <HeartHandshake size={14} className="text-emerald-400" />
                <span>Manao (Lvl 0 Happy)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMoodTrigger(1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                  currentAngerLevel === 1
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                    : "bg-white/5 hover:bg-amber-500/15 border-white/10 text-slate-300"
                }`}
              >
                <Smile size={14} className="text-amber-400" />
                <span>Lvl 1 Pout</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMoodTrigger(2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                  currentAngerLevel === 2
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-200"
                    : "bg-white/5 hover:bg-rose-500/15 border-white/10 text-slate-300"
                }`}
              >
                <Flame size={14} className="text-rose-400" />
                <span>Lvl 2 Gussa</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMoodTrigger(3)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                  currentAngerLevel === 3
                    ? "bg-red-500/25 border-red-500/60 text-red-200"
                    : "bg-white/5 hover:bg-red-500/15 border-white/10 text-slate-300"
                }`}
              >
                <Flame size={14} className="text-red-400" />
                <span>Lvl 3 Nakhre</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
