import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Compass,
  Heart,
  Briefcase,
  Coins,
  ShieldAlert,
  Moon,
  Sun,
  Flame,
  Clock,
  Volume2,
  Calendar,
  Share2,
  CheckCircle2,
  Gem,
  Award,
  ChevronRight,
  BookOpen,
  Globe,
  RefreshCw,
  ExternalLink,
  Loader2,
  Star,
} from "lucide-react";
import {
  ZODIAC_SIGNS,
  getDailyHoroscope,
  calculateKundali,
  calculateGunMilan,
  getDailyPanchang,
  GEMSTONE_GUIDE,
  LAL_KITAB_REMEDIES,
  normalizeSignKey,
  fetchGroundedDailyHoroscope,
} from "../services/astrologyService";
import {
  ZodiacSignKey,
  DailyHoroscopeData,
  GoogleSearchHoroscopeData,
  KundaliReport,
  GunMilanReport,
  PanchangReport,
  AppConfig,
  isDeveloperApiSlot,
  resolveActiveApiKey,
} from "../types";
import AstrologicalWheelChart from "./AstrologicalWheelChart";

const FOCUS_AREAS = [
  "General",
  "Love & Bonding",
  "Career & Study",
  "Wealth & Luck",
  "Health & Peace",
] as const;

interface AstrologyStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  initialSign?: ZodiacSignKey;
  initialTab?: "rashifal" | "kundali" | "milan" | "panchang" | "remedies";
  onSendToVoice?: (prompt: string) => void;
  onUpdateUserRashi?: (sign: ZodiacSignKey) => void;
  onUpdateConfig?: (newConfig: AppConfig) => void;
}

export default function AstrologyStudio({
  isOpen,
  onClose,
  config,
  initialSign,
  initialTab = "rashifal",
  onSendToVoice,
  onUpdateUserRashi,
  onUpdateConfig,
}: AstrologyStudioProps) {
  const effectiveInitialSign: ZodiacSignKey =
    initialSign || config.userRashi || "aries";

  const [activeTab, setActiveTab] = useState<
    "rashifal" | "kundali" | "milan" | "panchang" | "remedies"
  >(initialTab);
  const [selectedSign, setSelectedSign] = useState<ZodiacSignKey>(effectiveInitialSign);
  const [saveAsMyRashi, setSaveAsMyRashi] = useState<boolean>(
    Boolean(config.userRashi)
  );
  const [horoscope, setHoroscope] = useState<DailyHoroscopeData>(() =>
    getDailyHoroscope(effectiveInitialSign)
  );

  // Google Search Grounded Personalized Daily Horoscope State
  const [focusArea, setFocusArea] = useState<string>("General");
  const [groundedHoroscope, setGroundedHoroscope] =
    useState<GoogleSearchHoroscopeData | null>(null);
  const [isFetchingGrounded, setIsFetchingGrounded] = useState<boolean>(false);
  const [groundedError, setGroundedError] = useState<string | null>(null);
  const groundedCacheRef = useRef<Record<string, GoogleSearchHoroscopeData>>({});

  // Kundali Form State
  const [kundaliName, setKundaliName] = useState(config.userName || "Devid");
  const [kundaliDob, setKundaliDob] = useState("2000-08-15");
  const [kundaliTime, setKundaliTime] = useState("10:30");
  const [kundaliPlace, setKundaliPlace] = useState("New Delhi, India");
  const [kundaliReport, setKundaliReport] = useState<KundaliReport>(() =>
    calculateKundali({
      name: config.userName || "Devid",
      dob: "2000-08-15",
      time: "10:30",
      place: "New Delhi, India",
    })
  );

  // Gun Milan Form State
  const [boyName, setBoyName] = useState(config.userName || "Devid");
  const [boySign, setBoySign] = useState<ZodiacSignKey>(config.userRashi || "aries");
  const [girlName, setGirlName] = useState("Zoya");
  const [girlSign, setGirlSign] = useState<ZodiacSignKey>("leo");
  const [gunMilanReport, setGunMilanReport] = useState<GunMilanReport>(() =>
    calculateGunMilan({
      boyName: config.userName || "Devid",
      boyRashi: config.userRashi || "aries",
      girlName: "Zoya",
      girlRashi: "leo",
    })
  );

  // Daily Panchang State
  const [panchang] = useState<PanchangReport>(() => getDailyPanchang());

  // Speaking state for TTS voice read
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedMantra, setCopiedMantra] = useState(false);

  const loadGroundedHoroscope = useCallback(
    async (signToFetch: ZodiacSignKey, area: string, forceRefresh: boolean = false) => {
      const todayKey = new Date().toISOString().slice(0, 10);
      const cacheKey = `${signToFetch}_${area}_${todayKey}_${config.userName || "Devid"}`;

      if (!forceRefresh && groundedCacheRef.current[cacheKey]) {
        setGroundedHoroscope(groundedCacheRef.current[cacheKey]);
        setGroundedError(null);
        return;
      }

      setIsFetchingGrounded(true);
      setGroundedError(null);
      try {
        const data = await fetchGroundedDailyHoroscope({
          sign: signToFetch,
          userName: config.userName || "Devid",
          focusArea: area,
          customApiKey: resolveActiveApiKey(config) || undefined,
          preferDeveloperApi: isDeveloperApiSlot(config),
        });
        groundedCacheRef.current[cacheKey] = data;
        setGroundedHoroscope(data);
      } catch (err: any) {
        setGroundedError(err?.message || "Unable to load live Google Search forecast");
      } finally {
        setIsFetchingGrounded(false);
      }
    },
    [config]
  );

  useEffect(() => {
    if (initialSign) {
      setSelectedSign(initialSign);
      setHoroscope(getDailyHoroscope(initialSign));
    } else if (config.userRashi) {
      setSelectedSign(config.userRashi);
      setHoroscope(getDailyHoroscope(config.userRashi));
    }
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialSign, initialTab, config.userRashi]);

  useEffect(() => {
    if (!isOpen || activeTab !== "rashifal") return;
    loadGroundedHoroscope(selectedSign, focusArea, false);
  }, [isOpen, activeTab, selectedSign, focusArea, loadGroundedHoroscope]);

  const persistRashiChoice = useCallback(
    (sign: ZodiacSignKey) => {
      if (onUpdateConfig) {
        onUpdateConfig({
          ...config,
          userRashi: sign,
        });
      }
      onUpdateUserRashi?.(sign);
    },
    [config, onUpdateConfig, onUpdateUserRashi]
  );

  const handleSelectSign = (sign: ZodiacSignKey) => {
    setSelectedSign(sign);
    setHoroscope(getDailyHoroscope(sign));
    if (saveAsMyRashi) {
      persistRashiChoice(sign);
    }
  };

  const handleToggleSaveAsMyRashi = (checked: boolean) => {
    setSaveAsMyRashi(checked);
    if (checked) {
      persistRashiChoice(selectedSign);
    }
  };

  const handleRecalculateKundali = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = calculateKundali({
      name: kundaliName,
      dob: kundaliDob,
      time: kundaliTime,
      place: kundaliPlace,
    });
    setKundaliReport(rep);
  };

  const handleCalculateMilan = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = calculateGunMilan({
      boyName,
      boyRashi: boySign,
      girlName,
      girlRashi: girlSign,
    });
    setGunMilanReport(rep);
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "hi-IN";
      utter.rate = 1.0;
      utter.pitch = 1.1;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090b14] border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white overflow-hidden"
        >
          {/* Subtle cosmic background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/15 via-purple-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-cyan-500/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300/40">
                <span className="text-xl font-bold">ॐ</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-300 via-orange-200 to-purple-300 bg-clip-text text-transparent">
                    Zoya Astrology &amp; Kundali Power
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline">
                    वैदिक ज्योतिष
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Rashifal, Janam Kundali, 36 Gun Milan &amp; Shubh Muhurat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onSendToVoice && (
                <button
                  type="button"
                  onClick={() => {
                    const currentPrompt =
                      activeTab === "rashifal"
                        ? `Zoya, mera ${ZODIAC_SIGNS[selectedSign].vedicName} ka aaj ka rashifal detail me batao aur astrological guidance do!`
                        : activeTab === "kundali"
                        ? `Zoya, meri Janam Kundali (${kundaliReport.ascendantRashi} lagna, ${kundaliReport.nakshatra} nakshatra) ka analysis voice me explain karo!`
                        : activeTab === "milan"
                        ? `Zoya, ${boyName} aur ${girlName} ke Gun Milan (${gunMilanReport.totalGuna}/36) ka astrological analysis batao!`
                        : `Zoya, aaj ka Shubh Muhurat, Abhijit samay aur Rahu Kaal voice me batao!`;
                    onSendToVoice(currentPrompt);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(217,70,239,0.35)] transition-all"
                  title="Ask Zoya Live Voice Assistant about this astrology chart"
                >
                  <Sparkles size={13} className="text-amber-300" />
                  <span className="hidden sm:inline">Ask Zoya Voice</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-3 sm:px-6 py-2 border-b border-white/5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 bg-black/30">
            {[
              { id: "rashifal", label: "🌟 आज का राशिफल", sub: "Horoscope" },
              { id: "kundali", label: "🪐 जन्म कुंडली", sub: "Birth Chart" },
              { id: "milan", label: "💖 36 गुण मिलान", sub: "Compatibility" },
              { id: "panchang", label: "📅 पंचांग & मुहूर्त", sub: "Panchang" },
              { id: "remedies", label: "🔮 रत्न & लाल किताब", sub: "Remedies" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-[0_0_14px_rgba(245,158,11,0.3)]"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* TAB 1: AAJ KA RASHIFAL (DAILY HOROSCOPE) */}
            {activeTab === "rashifal" && (
              <div className="space-y-6">
                {/* 12 Zodiac Sign Selector */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Select Your Zodiac Sign (अपनी राशि चुनें):
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 border border-white/15 hover:border-amber-400/40 cursor-pointer transition-all select-none">
                        <input
                          type="checkbox"
                          checked={saveAsMyRashi}
                          onChange={(e) => handleToggleSaveAsMyRashi(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-amber-400/60 bg-black/50 text-amber-500 focus:ring-amber-400/50 accent-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-amber-200">
                          Save as my Rashi
                        </span>
                        {config.userRashi === selectedSign && saveAsMyRashi && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                            Saved
                          </span>
                        )}
                      </label>
                      <span className="text-xs text-amber-400 font-mono">
                        {horoscope.date}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {(Object.keys(ZODIAC_SIGNS) as ZodiacSignKey[]).map((key) => {
                      const info = ZODIAC_SIGNS[key];
                      const isSelected = selectedSign === key;
                      const isSavedRashi = config.userRashi === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectSign(key)}
                          className={`relative p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 text-center ${
                            isSelected
                              ? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_16px_rgba(245,158,11,0.35)] scale-102"
                              : "bg-white/[0.03] border-white/5 hover:border-white/20 text-white/70 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          {isSavedRashi && (
                            <span
                              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                              title="Saved as My Rashi"
                            />
                          )}
                          <span className="text-xl">{info.symbol}</span>
                          <span className="text-xs font-bold leading-tight">
                            {info.vedicName.split(" ")[0]}
                          </span>
                          <span className="text-[10px] text-white/40 leading-tight">
                            {info.englishName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Google Search Grounded Personalized Daily Horoscope Card */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950/50 via-[#0d1022] to-amber-950/20 border border-cyan-400/35 shadow-[0_0_28px_rgba(34,211,238,0.12)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center shrink-0">
                        <Globe size={19} className="text-cyan-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-white">
                            {config.userName || "Devid"}&apos;s Live Personalized Daily Horoscope
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 flex items-center gap-1">
                            <Sparkles size={10} /> Google Search Grounded
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 mt-0.5">
                          {ZODIAC_SIGNS[selectedSign].symbol} {ZODIAC_SIGNS[selectedSign].vedicName} · Real-time planetary transits ({groundedHoroscope?.date || horoscope.date})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {(onUpdateUserRashi || onUpdateConfig) && (
                        <button
                          type="button"
                          onClick={() => handleToggleSaveAsMyRashi(true)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                            config.userRashi === selectedSign
                              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                              : "bg-white/5 hover:bg-amber-500/15 border-white/15 text-white/80 hover:text-amber-200"
                          }`}
                          title="Save this sign as your default Rashi"
                        >
                          <Star
                            size={12}
                            className={
                              config.userRashi === selectedSign
                                ? "fill-emerald-300 text-emerald-300"
                                : "text-amber-300"
                            }
                          />
                          <span>
                            {config.userRashi === selectedSign ? "My Rashi" : "Set My Rashi"}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => loadGroundedHoroscope(selectedSign, focusArea, true)}
                        disabled={isFetchingGrounded}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Refresh live Google Search horoscope prediction"
                      >
                        <RefreshCw
                          size={12}
                          className={isFetchingGrounded ? "animate-spin" : ""}
                        />
                        <span>{isFetchingGrounded ? "Searching..." : "Refresh Live"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Focus Area Selector */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-white/50 font-semibold mr-1">
                      Focus Area:
                    </span>
                    {FOCUS_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setFocusArea(area)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          focusArea === area
                            ? "bg-purple-500/25 border-purple-400/60 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                            : "bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/65"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>

                  {/* Loading / Error / Grounded Forecast Body */}
                  {isFetchingGrounded ? (
                    <div className="p-5 rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center gap-2.5 text-center">
                      <Loader2 size={22} className="text-cyan-300 animate-spin" />
                      <p className="text-xs text-cyan-100 font-medium">
                        Searching live planetary transits &amp; Rashifal for{" "}
                        {ZODIAC_SIGNS[selectedSign].englishName} via Google Search...
                      </p>
                    </div>
                  ) : groundedError ? (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                      <p className="text-xs text-rose-200">{groundedError}</p>
                      <button
                        type="button"
                        onClick={() => loadGroundedHoroscope(selectedSign, focusArea, true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-semibold text-white shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  ) : groundedHoroscope ? (
                    <div className="space-y-3.5">
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-400/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            <Sparkles size={13} /> Today&apos;s Personalized Transit Overview
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                speakText(
                                  `${groundedHoroscope.summary} ${groundedHoroscope.loveInsight} ${groundedHoroscope.careerInsight}`
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white/85 flex items-center gap-1"
                              title="Listen to live prediction"
                            >
                              <Volume2 size={12} /> Listen
                            </button>
                            {onSendToVoice && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSendToVoice(
                                    `Zoya, meri ${ZODIAC_SIGNS[selectedSign].vedicName} rashi ka aaj ka live prediction sunao (${focusArea}): ${groundedHoroscope.summary}`
                                  );
                                  onClose();
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/40 text-[11px] text-purple-100 font-semibold"
                              >
                                Discuss Live
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-white/90 leading-relaxed whitespace-pre-line">
                          {groundedHoroscope.summary}
                        </p>
                      </div>

                      {(groundedHoroscope.loveInsight || groundedHoroscope.careerInsight) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {groundedHoroscope.loveInsight && (
                            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                <Heart size={13} /> Love &amp; Relationships
                              </div>
                              <p className="text-xs text-white/85 leading-relaxed">
                                {groundedHoroscope.loveInsight}
                              </p>
                            </div>
                          )}
                          {groundedHoroscope.careerInsight && (
                            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 space-y-1">
                              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                <Briefcase size={13} /> Career &amp; Finances
                              </div>
                              <p className="text-xs text-white/85 leading-relaxed">
                                {groundedHoroscope.careerInsight}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {(groundedHoroscope.luckyTips || groundedHoroscope.remedy) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {groundedHoroscope.luckyTips && (
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
                              <span className="font-bold text-amber-300 block mb-0.5">
                                ✨ Lucky Factors Today
                              </span>
                              {groundedHoroscope.luckyTips}
                            </div>
                          )}
                          {groundedHoroscope.remedy && (
                            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-100">
                              <span className="font-bold text-purple-300 block mb-0.5">
                                🕉️ Today&apos;s Vedic Upay / Mantra
                              </span>
                              {groundedHoroscope.remedy}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grounding Sources */}
                      {groundedHoroscope.sources && groundedHoroscope.sources.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1.5 flex items-center gap-1">
                            <Globe size={11} className="text-cyan-300" /> Google Search Sources
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {groundedHoroscope.sources.map((src, idx) => (
                              <a
                                key={`${src.uri}_${idx}`}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-[11px] text-cyan-200 flex items-center gap-1 transition-colors max-w-[220px]"
                              >
                                <span className="truncate">{src.title}</span>
                                <ExternalLink size={10} className="shrink-0 opacity-75" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Interactive SVG Astrological Wheel Chart (User Rashi ↔ Planetary Transits) */}
                <AstrologicalWheelChart
                  selectedSign={selectedSign}
                  userName={config.userName || "Devid"}
                  onSelectSign={handleSelectSign}
                  onSendToVoice={
                    onSendToVoice
                      ? (promptText) => {
                          onSendToVoice(promptText);
                          onClose();
                        }
                      : undefined
                  }
                />

                {/* Horoscope Result Card */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-purple-900/10 to-black border border-amber-500/30 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{ZODIAC_SIGNS[selectedSign].symbol}</span>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-amber-200">
                            {ZODIAC_SIGNS[selectedSign].vedicName} — Daily Horoscope
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <span>स्वामी: {ZODIAC_SIGNS[selectedSign].rulingPlanet}</span>
                            <span>•</span>
                            <span>तत्व: {ZODIAC_SIGNS[selectedSign].element}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/50 uppercase tracking-widest">
                          Cosmic Alignment
                        </span>
                        <span className="text-2xl font-black bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                          {horoscope.overallScore}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(horoscope.hinglishPrediction)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                          isSpeaking
                            ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                            : "bg-white/5 hover:bg-white/15 text-white/80 border-white/10"
                        }`}
                        title="Listen to Horoscope in Hindi voice"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* 4 Pillars: Love, Career, Wealth, Health */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <Heart size={13} /> Love
                        </span>
                        <span>{horoscope.loveScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                          style={{ width: `${horoscope.loveScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <Briefcase size={13} /> Career
                        </span>
                        <span>{horoscope.careerScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${horoscope.careerScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <Coins size={13} /> Wealth
                        </span>
                        <span>{horoscope.wealthScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                          style={{ width: `${horoscope.wealthScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <Flame size={13} /> Vitality
                        </span>
                        <span>{horoscope.healthScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          style={{ width: `${horoscope.healthScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lucky Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-white/40 text-[10px] uppercase">Lucky Number</div>
                      <div className="font-bold text-amber-300 text-sm">{horoscope.luckyNumber}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-white/40 text-[10px] uppercase">Lucky Color</div>
                      <div className="font-bold text-white/90 text-sm">{horoscope.luckyColor}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-white/40 text-[10px] uppercase">Auspicious Time</div>
                      <div className="font-bold text-white/90 text-[11px] truncate">{horoscope.luckyTime}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-white/40 text-[10px] uppercase">Shubh Disha</div>
                      <div className="font-bold text-white/90 text-[11px]">{horoscope.auspiciousDirection}</div>
                    </div>
                  </div>

                  {/* Prediction in Hinglish */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Sparkles size={14} /> आज का भविष्यफल (Daily Prediction)
                    </div>
                    <p className="text-sm leading-relaxed text-white/90 font-medium">
                      {horoscope.hinglishPrediction}
                    </p>
                  </div>

                  {/* Zoya Personal Tip */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/30 text-xs text-pink-200">
                    <span className="font-bold text-white">✨ {horoscope.zoyaPersonalTip}</span>
                  </div>

                  {/* Mantra */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-amber-400 font-bold uppercase block">
                        दैनिक बीज मंत्र (Daily Beej Mantra)
                      </span>
                      <span className="text-white/80 font-mono text-xs truncate block">
                        {horoscope.mantra}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(horoscope.mantra);
                        setCopiedMantra(true);
                        setTimeout(() => setCopiedMantra(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-medium shrink-0 transition-colors"
                    >
                      {copiedMantra ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JANAM KUNDALI & BIRTH CHART (कुंडली) */}
            {activeTab === "kundali" && (
              <div className="space-y-6">
                {/* Form to enter details */}
                <form
                  onSubmit={handleRecalculateKundali}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      नाम (Full Name)
                    </label>
                    <input
                      type="text"
                      value={kundaliName}
                      onChange={(e) => setKundaliName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="Devid"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      जन्म तिथि (DOB)
                    </label>
                    <input
                      type="date"
                      value={kundaliDob}
                      onChange={(e) => setKundaliDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      जन्म समय (Birth Time)
                    </label>
                    <input
                      type="time"
                      value={kundaliTime}
                      onChange={(e) => setKundaliTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} /> कुंडली बनाएं (Generate)
                    </button>
                  </div>
                </form>

                {/* Kundali Visual Lagna Chart */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c0e1e] to-black border border-amber-500/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-amber-200">
                        {kundaliReport.personName} की वैदिक लग्न कुंडली (Birth Chart)
                      </h3>
                      <p className="text-xs text-white/50">
                        DOB: {kundaliReport.dob} | Time: {kundaliReport.time} | Place: {kundaliReport.place}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-semibold">
                        Lagna: {kundaliReport.ascendantRashi}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-semibold">
                        Moon: {kundaliReport.moonRashi}
                      </span>
                    </div>
                  </div>

                  {/* Summary & Nakshatra Pill */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <p className="leading-relaxed">{kundaliReport.summaryHinglish}</p>
                    <div className="mt-2 pt-2 border-t border-amber-500/20 flex flex-wrap gap-4 text-[11px] text-white/70">
                      <span><strong>नक्षत्र (Nakshatra):</strong> {kundaliReport.nakshatra} (चरण {kundaliReport.charan})</span>
                      <span><strong>महादशा (Dasha):</strong> {kundaliReport.currentMahadasha}</span>
                      <span><strong>इष्ट देव (Deity):</strong> {kundaliReport.favorableDeity}</span>
                      <span><strong>भाग्य रत्न (Stone):</strong> {kundaliReport.luckyStone}</span>
                    </div>
                  </div>

                  {/* 12 Bhavas (Houses) Grid Representation */}
                  <div>
                    <h4 className="text-xs font-bold text-white/70 uppercase mb-3 tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-amber-400" /> द्वादश भाव एवं ग्रह स्थिति (12 Houses &amp; Planets)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {kundaliReport.houses.map((house) => (
                        <div
                          key={house.houseNumber}
                          className={`p-3 rounded-2xl border transition-all ${
                            house.houseNumber === 1
                              ? "bg-amber-500/15 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                              : house.houseNumber === 7 || house.houseNumber === 10
                              ? "bg-purple-500/10 border-purple-400/40"
                              : "bg-white/[0.02] border-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-white/90">
                              House #{house.houseNumber}
                            </span>
                            <span className="text-[10px] font-mono text-amber-400 font-semibold">
                              Rashi {house.rashiNumber}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/40 truncate mb-2">
                            {house.houseName.split(" ")[0]}
                          </div>

                          <div className="min-h-[28px]">
                            {house.occupants.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {house.occupants.map((occ, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                  >
                                    {occ.split(" ")[0]}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-white/20 italic">Empty</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dosha Analysis Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>मांगलिक दोष (Manglik)</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            kundaliReport.manglikDosh.isPresent
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {kundaliReport.manglikDosh.isPresent ? "Yes (Active)" : "No Dosh"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {kundaliReport.manglikDosh.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>काल सर्प योग (Kaal Sarp)</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            kundaliReport.kaalSarpDosh.isPresent
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {kundaliReport.kaalSarpDosh.isPresent ? "Mild Effect" : "No Dosh"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {kundaliReport.kaalSarpDosh.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>शनि साढ़े साती (Sade Sati)</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            kundaliReport.sadeSati.isActive
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {kundaliReport.sadeSati.isActive ? "Running" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {kundaliReport.sadeSati.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 36 GUN MILAN & COMPATIBILITY (कुंडली मिलान) */}
            {activeTab === "milan" && (
              <div className="space-y-6">
                {/* Inputs for Boy and Girl */}
                <form
                  onSubmit={handleCalculateMilan}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
                >
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      लड़के का नाम (Boy)
                    </label>
                    <input
                      type="text"
                      value={boyName}
                      onChange={(e) => setBoyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      लड़के की राशि (Boy's Rashi)
                    </label>
                    <select
                      value={boySign}
                      onChange={(e) => setBoySign(e.target.value as ZodiacSignKey)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {(Object.keys(ZODIAC_SIGNS) as ZodiacSignKey[]).map((k) => (
                        <option key={k} value={k}>
                          {ZODIAC_SIGNS[k].vedicName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      लड़की का नाम (Girl)
                    </label>
                    <input
                      type="text"
                      value={girlName}
                      onChange={(e) => setGirlName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1 font-semibold">
                      लड़की की राशि (Girl's Rashi)
                    </label>
                    <select
                      value={girlSign}
                      onChange={(e) => setGirlSign(e.target.value as ZodiacSignKey)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {(Object.keys(ZODIAC_SIGNS) as ZodiacSignKey[]).map((k) => (
                        <option key={k} value={k}>
                          {ZODIAC_SIGNS[k].vedicName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Heart size={13} /> गुण मिलान (Check)
                    </button>
                  </div>
                </form>

                {/* Milan Report Card */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-950/20 via-pink-950/15 to-black border border-pink-500/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-pink-300">{gunMilanReport.boyName}</span>
                        <span className="text-xs text-white/40">({gunMilanReport.boyRashi})</span>
                        <Heart size={14} className="text-rose-500 fill-rose-500 animate-pulse" />
                        <span className="text-sm font-bold text-purple-300">{gunMilanReport.girlName}</span>
                        <span className="text-xs text-white/40">({gunMilanReport.girlRashi})</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        अष्टकूट मिलान स्कोर (Ashtakoot Score)
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-400 to-amber-300 bg-clip-text text-transparent">
                          {gunMilanReport.totalGuna} / 36
                        </span>
                        <span className="text-xs text-white/50 block font-mono">
                          {gunMilanReport.percentage}% Match
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-200 border border-pink-500/40 text-xs font-bold">
                        {gunMilanReport.verdict}
                      </span>
                    </div>
                  </div>

                  {/* Zoya Verdict Hinglish */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-pink-500/20 text-xs sm:text-sm text-pink-100 leading-relaxed">
                    <p className="font-medium">✨ {gunMilanReport.zoyaVerdictHinglish}</p>
                  </div>

                  {/* 8 Kootas Table */}
                  <div>
                    <h4 className="text-xs font-bold text-white/70 uppercase mb-3 tracking-wider">
                      8 अष्टकूट विवरण (Detailed 8 Koota Breakdown):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {gunMilanReport.breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-white/90">{item.name}</div>
                            <div className="text-[10px] text-white/40">{item.description}</div>
                          </div>
                          <div className="text-right font-mono font-bold text-amber-300 shrink-0">
                            {item.obtainedPoints} / {item.maxPoints} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Astro Remedies */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="text-xs font-bold text-amber-300">
                      🌿 वैदिक उपाय एवं वैवाहिक शांति (Astro Remedies):
                    </div>
                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                      {gunMilanReport.remedies.map((rem, i) => (
                        <li key={i}>{rem}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AAJ KA PANCHANG (पंचांग & शुभ मुहूर्त) */}
            {activeTab === "panchang" && (
              <div className="space-y-6">
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-[#0a0f1d] to-black border border-amber-500/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-amber-200">
                        दैनिक वैदिक पंचांग एवं शुभ मुहूर्त (Vedic Panchang)
                      </h3>
                      <p className="text-xs text-white/50">{panchang.dateStr}</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      {panchang.dayName}
                    </span>
                  </div>

                  {/* Top Critical Muhurats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Sun size={14} /> अभिजित मुहूर्त (Most Auspicious)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200 font-semibold">
                          सर्वार्थ सिद्धि
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-bold text-white">
                        {panchang.abhijitMuhurat}
                      </div>
                      <p className="text-[11px] text-emerald-200/70">
                        Koi bhi naya kaam, business deal, ya shubh karya start karne ke liye best time.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-rose-500/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <ShieldAlert size={14} /> राहु काल (Rahu Kaal - Inauspicious)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200 font-semibold">
                          वर्जित समय
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-bold text-white">
                        {panchang.rahuKaal}
                      </div>
                      <p className="text-[11px] text-rose-200/70">
                        Is samay me koi naya decision, shopping ya important agreement avoid karein.
                      </p>
                    </div>
                  </div>

                  {/* 5 Angas of Panchang */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">तिथि (Tithi)</span>
                      <span className="font-bold text-white text-xs sm:text-sm">{panchang.tithi}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">नक्षत्र (Nakshatra)</span>
                      <span className="font-bold text-white text-xs sm:text-sm">{panchang.nakshatra}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">योग (Yoga)</span>
                      <span className="font-bold text-white text-xs sm:text-sm">{panchang.yoga}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">करण (Karana)</span>
                      <span className="font-bold text-white text-xs sm:text-sm">{panchang.karana}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">चंद्र राशि (Moon Sign)</span>
                      <span className="font-bold text-white text-xs sm:text-sm">{panchang.moonSign}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase block">शुभ चौघड़िया (Choghadiya)</span>
                      <span className="font-bold text-amber-300 text-xs sm:text-sm">{panchang.shubhChoghadiya}</span>
                    </div>
                  </div>

                  {/* Sunrise & Sunset */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <Sun size={15} className="text-amber-400" />
                      <span>सूर्योदय: <strong>{panchang.sunrise}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon size={15} className="text-cyan-400" />
                      <span>सूर्यास्त: <strong>{panchang.sunset}</strong></span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>अमृत काल: <strong>{panchang.amritKaal}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: GEMSTONES & LAL KITAB (रत्न एवं उपाय) */}
            {activeTab === "remedies" && (
              <div className="space-y-6">
                {/* Gemstone Guide */}
                <div>
                  <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Gem size={16} className="text-amber-400" /> 9 नवरत्न एवं धारण विधि (Navaratna Guide):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {GEMSTONE_GUIDE.map((gem, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-400/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-xs">{gem.stone}</span>
                          <span className="text-[10px] text-white/50 font-mono">{gem.planet}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed">{gem.benefit}</p>
                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2 text-[10px] text-white/40">
                          <span>धातु: {gem.metal}</span>
                          <span>•</span>
                          <span>उंगली: {gem.finger}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lal Kitab Remedies */}
                <div>
                  <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400" /> लाल किताब के अचूक उपाय (Lal Kitab Secrets):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LAL_KITAB_REMEDIES.map((lk, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{lk.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300">
                            {lk.category}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed">
                          <strong>उपाय:</strong> {lk.remedy}
                        </p>
                        <p className="text-[11px] text-rose-300/80">
                          <strong>सावधानी:</strong> {lk.caution}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cheatsheet of Voice Commands */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-white/10 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Volume2 size={14} /> Zoya Astrology Voice Commands:
              </div>
              <p className="text-xs text-white/60">
                You can speak any of these commands to Zoya in Hindi, Hinglish, or English:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  `"Zoya activate astrology mode"`,
                  `"Deactivate astrology mode"`,
                  `"Zoya mera rashifal batao"`,
                  `"Mesh rashi ka aaj ka din kaisa rahega?"`,
                  `"Zoya meri kundali banao"`,
                  `"Kundali milan karo Devid aur Zoya ka"`,
                  `"Aaj ka shubh muhurat aur Rahu Kaal kya hai?"`,
                  `"Mera lucky number aur stone batao"`,
                  `"Zoya astrology studio open karo"`,
                ].map((cmd, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/80 font-mono"
                  >
                    {cmd}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
