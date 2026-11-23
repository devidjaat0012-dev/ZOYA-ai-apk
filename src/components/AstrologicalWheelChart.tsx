import React, { useMemo, useState } from "react";
import { Sparkles, RotateCw, Compass, Info } from "lucide-react";
import {
  ZODIAC_SIGNS,
  ZODIAC_SIGN_ORDER,
  getAstrologicalWheelTransits,
} from "../services/astrologyService";
import {
  ZodiacSignKey,
  PlanetTransitInfo,
  AstrologicalWheelData,
} from "../types";

interface AstrologicalWheelChartProps {
  selectedSign: ZodiacSignKey;
  userName?: string;
  onSelectSign?: (sign: ZodiacSignKey) => void;
  onSendToVoice?: (prompt: string) => void;
}

const ELEMENT_FILLS: Record<string, { base: string; stroke: string; label: string }> = {
  fire: {
    base: "rgba(245, 158, 11, 0.11)",
    stroke: "rgba(251, 191, 36, 0.35)",
    label: "#fcd34d",
  },
  earth: {
    base: "rgba(16, 185, 129, 0.10)",
    stroke: "rgba(52, 211, 153, 0.32)",
    label: "#6ee7b7",
  },
  air: {
    base: "rgba(6, 182, 212, 0.10)",
    stroke: "rgba(34, 211, 238, 0.34)",
    label: "#67e8f9",
  },
  water: {
    base: "rgba(139, 92, 246, 0.12)",
    stroke: "rgba(167, 139, 250, 0.35)",
    label: "#c4b5fd",
  },
};

function getElementKey(signKey: ZodiacSignKey): keyof typeof ELEMENT_FILLS {
  const el = ZODIAC_SIGNS[signKey].element.toLowerCase();
  if (el.includes("fire") || el.includes("agni")) return "fire";
  if (el.includes("earth") || el.includes("prithvi")) return "earth";
  if (el.includes("air") || el.includes("vayu")) return "air";
  return "water";
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeAnnularSector(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export default function AstrologicalWheelChart({
  selectedSign,
  userName = "Devid",
  onSelectSign,
  onSendToVoice,
}: AstrologicalWheelChartProps) {
  const [alignUserRashiTop, setAlignUserRashiTop] = useState<boolean>(true);
  const [showAspects, setShowAspects] = useState<boolean>(true);
  const [selectedPlanetId, setSelectedPlanetId] =
    useState<PlanetTransitInfo["id"]>("sun");

  const wheelData: AstrologicalWheelData = useMemo(
    () => getAstrologicalWheelTransits(selectedSign),
    [selectedSign]
  );

  const userSignIndex = ZODIAC_SIGN_ORDER.indexOf(selectedSign);
  // Rotate chart so user's Rashi wedge (30 deg wide) is centered at top (0 deg) if aligned
  const rotationOffsetDeg = alignUserRashiTop
    ? -(userSignIndex * 30 + 15)
    : -15;

  const toChartAngle = (siderealLon: number) =>
    ((siderealLon + rotationOffsetDeg) % 360 + 360) % 360;

  // Spread visual angles for closely conjunct planets so badges never overlap
  const positionedPlanets = useMemo(() => {
    const sorted = [...wheelData.planets]
      .map((p) => ({
        ...p,
        trueAngle: toChartAngle(p.longitude),
        visualAngle: toChartAngle(p.longitude),
        radialTier: 0,
      }))
      .sort((a, b) => a.trueAngle - b.trueAngle);

    // Multi-pass angular separation + alternating radial tier for dense clusters
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const next = sorted[(i + 1) % sorted.length];
        let diff = next.visualAngle - curr.visualAngle;
        if (i === sorted.length - 1) diff += 360;
        if (diff < 16) {
          const push = (16 - diff) / 2;
          curr.visualAngle = (curr.visualAngle - push + 360) % 360;
          next.visualAngle = (next.visualAngle + push) % 360;
          next.radialTier = curr.radialTier === 0 ? 1 : 0;
        }
      }
    }

    return sorted;
  }, [wheelData.planets, rotationOffsetDeg]);

  const planetById = useMemo(() => {
    const map: Record<string, (typeof positionedPlanets)[number]> = {};
    for (const p of positionedPlanets) {
      map[p.id] = p;
    }
    return map;
  }, [positionedPlanets]);

  const activePlanet =
    wheelData.planets.find((p) => p.id === selectedPlanetId) ||
    wheelData.planets[0];

  const userSignInfo = ZODIAC_SIGNS[selectedSign];
  const planetsInHouse1 = wheelData.planets.filter((p) => p.houseFromUser === 1);
  const beneficCount = wheelData.planets.filter((p) => p.impact === "benefic").length;

  const CX = 270;
  const CY = 270;
  const R_OUTER = 248;
  const R_ZODIAC_INNER = 196;
  const R_HOUSE_INNER = 160;
  const R_PLANET_OUTER = 140;
  const R_PLANET_INNER = 116;
  const R_ASPECT_RING = 92;
  const R_HUB = 54;

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0a0d1b] via-[#0e0b1f] to-[#080a14] border border-amber-400/30 shadow-[0_0_32px_rgba(245,158,11,0.12)] space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-purple-500/25 to-cyan-500/25 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Compass size={20} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-amber-200">
                ग्रह गोचर चक्र — Live Planetary Wheel Chart
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-200 border border-amber-400/30">
                {wheelData.dateStr}
              </span>
            </div>
            <p className="text-[11px] text-white/55 mt-0.5">
              Maps {userSignInfo.symbol} {userSignInfo.vedicName} (House 1) to today&apos;s live{" "}
              {wheelData.ayanamsaLabel} planetary positions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAlignUserRashiTop((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
              alignUserRashiTop
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                : "bg-white/5 hover:bg-white/10 border-white/15 text-white/75"
            }`}
            title="Rotate wheel so your Rashi (House 1) sits at the 12 o'clock Lagna apex"
          >
            <RotateCw size={12} />
            <span>{alignUserRashiTop ? "My Rashi Top (H1)" : "Fixed Mesha (0°)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAspects((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
              showAspects
                ? "bg-purple-500/20 border-purple-400/50 text-purple-200"
                : "bg-white/5 hover:bg-white/10 border-white/15 text-white/65"
            }`}
          >
            {showAspects ? "Aspects ON" : "Aspects OFF"}
          </button>
        </div>
      </div>

      {/* Main Layout: Interactive SVG Wheel + Selected Transit Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: SVG Astrological Wheel */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[460px] aspect-square">
            <svg
              viewBox="0 0 540 540"
              className="w-full h-full select-none drop-shadow-[0_0_24px_rgba(168,85,247,0.18)]"
              role="img"
              aria-label={`Astrological wheel chart mapping ${userSignInfo.englishName} to current planetary transits`}
            >
              <defs>
                <radialGradient id="wheelBgGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1c1438" stopOpacity="0.95" />
                  <stop offset="62%" stopColor="#0d1124" stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#070913" stopOpacity="1" />
                </radialGradient>
                <radialGradient id="hubGlowGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.08" />
                </radialGradient>
              </defs>

              {/* Wheel Backing */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER + 8}
                fill="url(#wheelBgGrad)"
                stroke="rgba(245,158,11,0.28)"
                strokeWidth="1.5"
              />

              {/* Degree Tick Marks around Outer Rim (every 5 deg) */}
              {Array.from({ length: 72 }).map((_, idx) => {
                const deg = idx * 5;
                const chartAngle = toChartAngle(deg);
                const isMajor = deg % 30 === 0;
                const p1 = polarToCartesian(CX, CY, R_OUTER, chartAngle);
                const p2 = polarToCartesian(
                  CX,
                  CY,
                  isMajor ? R_OUTER - 8 : R_OUTER - 4,
                  chartAngle
                );
                return (
                  <line
                    key={`tick_${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isMajor ? "rgba(251,191,36,0.55)" : "rgba(255,255,255,0.16)"}
                    strokeWidth={isMajor ? 1.4 : 0.7}
                  />
                );
              })}

              {/* 12 Zodiac Sign Sectors & Inner 12 Bhava (House) Wedges */}
              {ZODIAC_SIGN_ORDER.map((signKey, signIdx) => {
                const startLon = signIdx * 30;
                const startAngle = startLon + rotationOffsetDeg;
                const endAngle = startAngle + 30;
                const midAngle = startAngle + 15;

                const isUserSign = signKey === selectedSign;
                const houseNum = ((signIdx - userSignIndex + 12) % 12) + 1;
                const elStyle = ELEMENT_FILLS[getElementKey(signKey)];
                const info = ZODIAC_SIGNS[signKey];

                const outerPath = describeAnnularSector(
                  CX,
                  CY,
                  R_ZODIAC_INNER,
                  R_OUTER,
                  startAngle,
                  endAngle
                );
                const housePath = describeAnnularSector(
                  CX,
                  CY,
                  R_HOUSE_INNER,
                  R_ZODIAC_INNER,
                  startAngle,
                  endAngle
                );

                const symPos = polarToCartesian(CX, CY, 226, midAngle);
                const namePos = polarToCartesian(CX, CY, 207, midAngle);
                const housePos = polarToCartesian(CX, CY, 178, midAngle);

                const isActivePlanetInThisSign = activePlanet.signKey === signKey;

                return (
                  <g
                    key={signKey}
                    className="cursor-pointer transition-opacity"
                    onClick={() => onSelectSign?.(signKey)}
                  >
                    {/* Outer Zodiac Wedge */}
                    <path
                      d={outerPath}
                      fill={
                        isUserSign
                          ? "rgba(245, 158, 11, 0.28)"
                          : isActivePlanetInThisSign
                          ? "rgba(168, 85, 247, 0.22)"
                          : elStyle.base
                      }
                      stroke={
                        isUserSign
                          ? "rgba(251, 191, 36, 0.9)"
                          : isActivePlanetInThisSign
                          ? "rgba(192, 132, 252, 0.7)"
                          : elStyle.stroke
                      }
                      strokeWidth={isUserSign ? 2 : 0.9}
                    />

                    {/* Inner House (Bhava) Wedge */}
                    <path
                      d={housePath}
                      fill={
                        isUserSign
                          ? "rgba(245, 158, 11, 0.16)"
                          : "rgba(255, 255, 255, 0.025)"
                      }
                      stroke={
                        isUserSign
                          ? "rgba(251, 191, 36, 0.65)"
                          : "rgba(255, 255, 255, 0.09)"
                      }
                      strokeWidth={isUserSign ? 1.4 : 0.7}
                    />

                    {/* Zodiac Glyph */}
                    <text
                      x={symPos.x}
                      y={symPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isUserSign ? "19" : "16"}
                      fill={isUserSign ? "#fde68a" : elStyle.label}
                      fontWeight="bold"
                    >
                      {info.symbol}
                    </text>

                    {/* Short Vedic Rashi Name */}
                    <text
                      x={namePos.x}
                      y={namePos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="8.5"
                      fill={isUserSign ? "#fef3c7" : "rgba(255,255,255,0.68)"}
                      fontWeight={isUserSign ? "700" : "500"}
                    >
                      {info.vedicName.split(" ")[0]}
                    </text>

                    {/* House Number relative to User's Rashi */}
                    <text
                      x={housePos.x}
                      y={housePos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isUserSign ? "10" : "9.5"}
                      fontFamily="monospace"
                      fontWeight={isUserSign ? "800" : "600"}
                      fill={isUserSign ? "#fbbf24" : "rgba(255,255,255,0.52)"}
                    >
                      {isUserSign ? "H1★" : `H${houseNum}`}
                    </text>
                  </g>
                );
              })}

              {/* Concentric Orbit Divider Rings */}
              <circle
                cx={CX}
                cy={CY}
                r={R_ASPECT_RING}
                fill="rgba(7, 9, 19, 0.65)"
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="3 4"
              />

              {/* Planetary Aspect Chords (Drishti) */}
              {showAspects &&
                wheelData.aspects.map((asp, idx) => {
                  const pFrom = planetById[asp.fromId];
                  const pTo = planetById[asp.toId];
                  if (!pFrom || !pTo) return null;

                  const c1 = polarToCartesian(CX, CY, R_ASPECT_RING - 2, pFrom.trueAngle);
                  const c2 = polarToCartesian(CX, CY, R_ASPECT_RING - 2, pTo.trueAngle);
                  const involvesSelected =
                    asp.fromId === selectedPlanetId || asp.toId === selectedPlanetId;

                  const strokeColor =
                    asp.nature === "harmonious"
                      ? "#34d399"
                      : asp.nature === "dynamic"
                      ? "#fb7185"
                      : "#fbbf24";

                  return (
                    <line
                      key={`${asp.fromId}_${asp.toId}_${idx}`}
                      x1={c1.x}
                      y1={c1.y}
                      x2={c2.x}
                      y2={c2.y}
                      stroke={strokeColor}
                      strokeOpacity={involvesSelected ? 0.78 : 0.24}
                      strokeWidth={involvesSelected ? 1.8 : 0.9}
                      strokeDasharray={asp.nature === "conjunction" ? undefined : "4 3"}
                    />
                  );
                })}

              {/* Highlight Ray from Selected Planet / House-1 Transits to User Hub */}
              {positionedPlanets.map((p) => {
                const isSelected = p.id === selectedPlanetId;
                const isHouse1 = p.houseFromUser === 1;
                if (!isSelected && !isHouse1) return null;
                const pEdge = polarToCartesian(CX, CY, R_ASPECT_RING, p.trueAngle);
                const pHub = polarToCartesian(CX, CY, R_HUB + 2, p.trueAngle);
                return (
                  <line
                    key={`ray_${p.id}`}
                    x1={pEdge.x}
                    y1={pEdge.y}
                    x2={pHub.x}
                    y2={pHub.y}
                    stroke={isSelected ? p.color : "#fbbf24"}
                    strokeOpacity={isSelected ? 0.8 : 0.45}
                    strokeWidth={isSelected ? 1.8 : 1.1}
                  />
                );
              })}

              {/* Planetary Nodes & Exact Degree Ticks */}
              {positionedPlanets.map((p) => {
                const isSelected = p.id === selectedPlanetId;
                const nodeRadius =
                  p.radialTier === 1 ? R_PLANET_INNER : R_PLANET_OUTER;
                const pos = polarToCartesian(CX, CY, nodeRadius, p.visualAngle);
                const exactRim = polarToCartesian(
                  CX,
                  CY,
                  R_HOUSE_INNER - 2,
                  p.trueAngle
                );

                return (
                  <g
                    key={p.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setSelectedPlanetId(p.id)}
                    onClick={() => setSelectedPlanetId(p.id)}
                  >
                    {/* Exact degree tick connector */}
                    <line
                      x1={exactRim.x}
                      y1={exactRim.y}
                      x2={pos.x}
                      y2={pos.y}
                      stroke={p.color}
                      strokeOpacity={isSelected ? 0.9 : 0.35}
                      strokeWidth={isSelected ? 1.6 : 0.9}
                    />
                    <circle
                      cx={exactRim.x}
                      cy={exactRim.y}
                      r={isSelected ? 3.2 : 2}
                      fill={p.color}
                    />

                    {/* Halo when selected */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={19}
                        fill="none"
                        stroke={p.color}
                        strokeOpacity={0.55}
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Planet Pill Circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 14 : 12}
                      fill={isSelected ? "#1a1033" : "#0b0f1f"}
                      stroke={p.color}
                      strokeWidth={isSelected ? 2.2 : 1.4}
                    />

                    {/* Planet Glyph */}
                    <text
                      x={pos.x}
                      y={pos.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isSelected ? "14" : "12"}
                      fill={p.color}
                      fontWeight="bold"
                    >
                      {p.symbol}
                    </text>

                    {/* Retrograde Marker */}
                    {p.retrograde && (
                      <text
                        x={pos.x + 11}
                        y={pos.y - 9}
                        fontSize="8"
                        fill="#fb7185"
                        fontWeight="bold"
                      >
                        R
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Center Hub: User's Selected Rashi */}
              <circle
                cx={CX}
                cy={CY}
                r={R_HUB}
                fill="url(#hubGlowGrad)"
                stroke="rgba(251, 191, 36, 0.7)"
                strokeWidth="1.8"
              />
              <circle
                cx={CX}
                cy={CY}
                r={R_HUB - 5}
                fill="rgba(9, 11, 20, 0.85)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.8"
              />
              <text
                x={CX}
                y={CY - 12}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="24"
                fill="#fde68a"
              >
                {userSignInfo.symbol}
              </text>
              <text
                x={CX}
                y={CY + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10.5"
                fontWeight="700"
                fill="#ffffff"
              >
                {userSignInfo.vedicName.split(" ")[0]}
              </text>
              <text
                x={CX}
                y={CY + 24}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#fbbf24"
                fontFamily="monospace"
              >
                LAGNA • H1
              </text>
            </svg>
          </div>

          {/* Aspect Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-white/60 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Conjunction / H1 Ray
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Trine / Sextile (Shubh)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> Opposition / Square
            </span>
            <span className="text-rose-300 font-semibold">R = Retrograde (वक्री)</span>
          </div>
        </div>

        {/* Right: Planetary Position Inspector & 9-Graha Grid */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Quick Summary Strip for User's Rashi */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold block">
                {userName}&apos;s Rashi Resonance
              </span>
              <span className="text-white/90 font-semibold">
                {beneficCount}/9 Shubh Transits •{" "}
                {planetsInHouse1.length > 0
                  ? `${planetsInHouse1.map((p) => p.symbol).join(" ")} in House 1`
                  : "Calm House 1"}
              </span>
            </div>
            <span className="text-xl">{userSignInfo.symbol}</span>
          </div>

          {/* Selected Planet Deep Transit Card */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/15 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    borderColor: activePlanet.color,
                    color: activePlanet.color,
                  }}
                >
                  {activePlanet.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      {activePlanet.vedicName}
                    </span>
                    {activePlanet.retrograde && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                        वक्री (Retrograde)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/60">
                    In {ZODIAC_SIGNS[activePlanet.signKey].symbol}{" "}
                    {ZODIAC_SIGNS[activePlanet.signKey].vedicName} ({activePlanet.degreeFormatted})
                  </div>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase shrink-0 border ${
                  activePlanet.impact === "benefic"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : activePlanet.impact === "intense"
                    ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                    : "bg-cyan-500/20 text-cyan-200 border-cyan-400/40"
                }`}
              >
                {activePlanet.impact === "benefic"
                  ? "Shubh"
                  : activePlanet.impact === "intense"
                  ? "Intense"
                  : "Balanced"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-black/35 border border-white/10">
                <span className="text-white/45 block text-[10px]">
                  Bhava from {userSignInfo.vedicName.split(" ")[0]}
                </span>
                <span className="font-bold text-amber-300">
                  House #{activePlanet.houseFromUser}
                </span>
                <span className="block text-[10px] text-white/65 truncate">
                  {activePlanet.houseTheme}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-black/35 border border-white/10">
                <span className="text-white/45 block text-[10px]">नक्षत्र (Nakshatra)</span>
                <span className="font-bold text-purple-200">{activePlanet.nakshatra}</span>
                <span className="block text-[10px] text-white/65">
                  {Math.round(activePlanet.longitude)}° Sidereal
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs text-white/85 leading-relaxed flex items-start gap-2">
              <Info size={14} className="text-indigo-300 shrink-0 mt-0.5" />
              <span>{activePlanet.gocharNoteHinglish}</span>
            </div>

            {onSendToVoice && (
              <button
                type="button"
                onClick={() =>
                  onSendToVoice(
                    `Zoya, meri ${userSignInfo.vedicName} rashi ke House ${activePlanet.houseFromUser} me ${activePlanet.vedicName} (${ZODIAC_SIGNS[activePlanet.signKey].vedicName}, ${activePlanet.nakshatra} nakshatra) ka aaj kya asar pad raha hai? Live batao!`
                  )
                }
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-amber-600/80 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles size={13} className="text-amber-200" />
                <span>Ask Zoya Live about {activePlanet.name} Transit</span>
              </button>
            )}
          </div>

          {/* All 9 Graha Selector Pills */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
              Tap Any Graha to Inspect House &amp; Degree:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {wheelData.planets.map((p) => {
                const isSelected = p.id === selectedPlanetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanetId(p.id)}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1 ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-400/70 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                        : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/75"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold flex items-center gap-1 truncate">
                        <span style={{ color: p.color }}>{p.symbol}</span>
                        <span>{p.name}</span>
                      </div>
                      <div className="text-[9.5px] text-white/50 truncate">
                        {ZODIAC_SIGNS[p.signKey].symbol} {p.degreeFormatted}
                      </div>
                    </div>
                    <span className="text-[9.5px] font-mono font-bold text-amber-300 shrink-0">
                      H{p.houseFromUser}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
