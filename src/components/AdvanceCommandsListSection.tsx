import React, { useMemo, useState } from "react";
import {
  Terminal,
  Search,
  Copy,
  Check,
  Sparkles,
  Shield,
  Palette,
  Sliders,
  Code2,
  HeartPulse,
  Compass,
  Play,
} from "lucide-react";

interface ZoyaCommandItem {
  id: string;
  category:
    | "Security & Owner"
    | "Astrology"
    | "Characters & UI"
    | "Device & Screen"
    | "Studios & AI"
    | "Health & Media";
  phrase: string;
  altPhrases?: string[];
  description: string;
  badge: string;
}

const ALL_ZOYA_COMMANDS: ZoyaCommandItem[] = [
  // Security & Owner Voice
  {
    id: "ov_on",
    category: "Security & Owner",
    phrase: "Zoya owner voice mode on karo",
    altPhrases: ["Activate owner voice lock", "Sirf meri awaaz suno"],
    description:
      "Sirf Owner ki awaaz par Zoya respond karegi. Koi aur bola toh 1st time dhamki aur 2nd time Phone Lockdown!",
    badge: "Owner Voice",
  },
  {
    id: "ov_off",
    category: "Security & Owner",
    phrase: "Owner voice mode band karo",
    altPhrases: ["Deactivate owner voice"],
    description: "Owner Voice speaker verification protection ko temporarily band karta hai.",
    badge: "Owner Voice",
  },
  {
    id: "dtmp_arm",
    category: "Security & Owner",
    phrase: "Don't touch my phone",
    altPhrases: ["Mere phone ko mat chhuo", "Anti-theft mode on karo"],
    description: "5s grace timer ke saath motion alarm & stealth intruder camera arm karta hai.",
    badge: "Anti-Theft",
  },
  {
    id: "dtmp_off",
    category: "Security & Owner",
    phrase: "Turn off don't touch my phone",
    altPhrases: ["Band karo", "Stop alarm", "Disarm security"],
    description: "Chalta hua Anti-Theft police siren aur motion sensor disarm karta hai.",
    badge: "Anti-Theft",
  },
  {
    id: "dtmp_pin",
    category: "Security & Owner",
    phrase: "Don't touch my phone ka password reset karo",
    altPhrases: ["PIN reset karo"],
    description: "Secret Vault & Lockdown fallback PIN ko wapas default '1234' par reset karta hai.",
    badge: "PIN Vault",
  },
  {
    id: "dev_care",
    category: "Security & Owner",
    phrase: "Developer Care aur support details batao",
    altPhrases: ["Zoya developer kaun hai", "DEVID support dikhao"],
    description: "DEVID Developer Care diagnostics, Developer API status aur official support links batata hai.",
    badge: "Developer Care",
  },

  // Astrology
  {
    id: "astro_live_on",
    category: "Astrology",
    phrase: "Zoya activate astrology mode",
    altPhrases: ["Astrology mode on karo", "Jyotish mode chalu karo"],
    description:
      "Live call par baat karte-karte Vedic & Western astrology (Rashifal, Kundali, Muhurat) active karta hai.",
    badge: "Live Mode",
  },
  {
    id: "astro_live_off",
    category: "Astrology",
    phrase: "Deactivate astrology mode",
    altPhrases: ["Astrology mode band karo", "Exit astrology mode"],
    description: "Live Astrology Mode band karke normal companion mode me wapas laata hai.",
    badge: "Live Mode",
  },
  {
    id: "astro_rashifal",
    category: "Astrology",
    phrase: "Mera aaj ka rashifal batao",
    altPhrases: ["Aries ka aaj ka din kaisa rahega?"],
    description: "Aaj ka love, career, wealth, health rashifal aur lucky number/color batata hai.",
    badge: "Rashifal",
  },
  {
    id: "astro_kundali",
    category: "Astrology",
    phrase: "Meri kundali banao",
    altPhrases: ["Kundali check karo", "36 Gun milan karo"],
    description: "Janam Kundali houses, Doshas, Mahadasha ya 36 Gun compatibility calculate karta hai.",
    badge: "Kundali",
  },
  {
    id: "astro_muhurat",
    category: "Astrology",
    phrase: "Aaj ka shubh muhurat aur panchang batao",
    altPhrases: ["Astrology studio open karo"],
    description: "Tithi, Nakshatra, Abhijit Muhurat, Rahu Kaal ya visual Astrology Studio kholta hai.",
    badge: "Panchang",
  },

  // Characters & UI
  {
    id: "char_jarvis",
    category: "Characters & UI",
    phrase: "Jarvis bano",
    altPhrases: ["Switch to Jarvis", "Hey Jarvis"],
    description: "Iron Man J.A.R.V.I.S. British gentleman voice, golden HUD aur hologram activate karta hai.",
    badge: "Character",
  },
  {
    id: "char_friday",
    category: "Characters & UI",
    phrase: "Friday bano",
    altPhrases: ["Switch to Friday", "Hey Friday"],
    description: "F.R.I.D.A.Y. tactical HUD aur Irish/British voice cadence switch karta hai.",
    badge: "Character",
  },
  {
    id: "char_venom",
    category: "Characters & UI",
    phrase: "Venom bano",
    altPhrases: ["Venom mode", "Switch to Venom"],
    description: "Ultra-deep sub-bass Tom Hardy symbiote voice aur dark Venom avatar chalu karta hai.",
    badge: "Character",
  },
  {
    id: "char_zoya",
    category: "Characters & UI",
    phrase: "Zoya bano",
    altPhrases: ["Switch to Zoya"],
    description: "Zoya ki sweet, caring Hinglish voice aur flagship companion persona wapas laata hai.",
    badge: "Character",
  },
  {
    id: "ui_switch",
    category: "Characters & UI",
    phrase: "Companion HUD UI lagao",
    altPhrases: ["Vedic Sanctum UI lagao", "Command Bento UI lagao", "Matrix UI lagao", "Classic UI lagao"],
    description: "Zoya ke 5 full-layout UI styles me se koi bhi voice ya touch se turant switch karta hai.",
    badge: "5 UI Styles",
  },
  {
    id: "wake_words",
    category: "Characters & UI",
    phrase: "Hey Zoya / Suno Zoya / Okay Zoya",
    altPhrases: ["Bye Zoya", "Band karo Zoya"],
    description: "Hands-free background AudioRecord wake-word se Zoya ko jagana aur wapas sleep karna.",
    badge: "Wake-Word",
  },

  // Device & Screen
  {
    id: "dev_vol",
    category: "Device & Screen",
    phrase: "Volume badhao / Awaaz 60% karo / Mute karo",
    altPhrases: ["Awaaz kam karo", "Full volume karo", "Unmute karo"],
    description: "Device system media volume aur Zoya speaker level voice se control karta hai.",
    badge: "Hardware",
  },
  {
    id: "dev_bri",
    category: "Device & Screen",
    phrase: "Brightness kam karo / Screen 80% karo / Dim karo",
    altPhrases: ["Brightness badhao", "Full brightness karo"],
    description: "Screen brightness level ko 10% se 100% ke beech turant adjust karta hai.",
    badge: "Hardware",
  },
  {
    id: "dev_cam",
    category: "Device & Screen",
    phrase: "Camera on karo / Flip camera / Screen share on",
    altPhrases: ["Camera band karo", "Expand preview", "Scroll down", "Scroll up"],
    description: "Live Vision Camera (Front/Back), Screen Share aur page scrolling voice se control karta hai.",
    badge: "Live Vision",
  },
  {
    id: "dev_session",
    category: "Device & Screen",
    phrase: "Live voice khatam karke new chat start karo",
    altPhrases: ["Saved chat end karke naya chat shuru karo", "Open settings"],
    description: "Current voice call archive karke fresh chat thread shuru karta hai.",
    badge: "Session",
  },

  // Studios & AI Tools
  {
    id: "st_nano",
    category: "Studios & AI",
    phrase: "Nano Ironman se photo banao",
    altPhrases: ["Google Nano Ironman se image banao", "Create cyberpunk tiger wallpaper"],
    description: "Nano Ironman Studio me AI high-resolution image generate ya edit karta hai.",
    badge: "Nano Ironman",
  },
  {
    id: "st_web",
    category: "Studios & AI",
    phrase: "Mere liye ek website banao",
    altPhrases: ["Website bana ke publish kar do", "Browser pe website live karo"],
    description: "Live Website Builder Studio me full interactive site banakar live URL par publish karta hai.",
    badge: "Web Builder",
  },
  {
    id: "st_code",
    category: "Studios & AI",
    phrase: "Code studio kholo / Python code likho",
    altPhrases: ["React component do", "Algorithm debug karo"],
    description: "Zoya Coding Master IDE kholkar working multi-language code generate & run karta hai.",
    badge: "Coding Master",
  },
  {
    id: "st_mem",
    category: "Studios & AI",
    phrase: "Yaad rakhna mujhe black coffee pasand hai",
    altPhrases: ["Remember that...", "Ye baat bhool jao"],
    description: "Long-Term Memory Bank me personal details hamesha ke liye save ya delete karta hai.",
    badge: "Memory",
  },

  // Health & Media
  {
    id: "hm_health",
    category: "Health & Media",
    phrase: "Zoya mera health check karo",
    altPhrases: ["NoiseFit se health check karo", "Mera heart rate kya hai?"],
    description: "NoiseFit smartwatch se BPM, SpO2, Steps aur Stress check karke health care report deta hai.",
    badge: "NoiseFit",
  },
  {
    id: "hm_rem",
    category: "Health & Media",
    phrase: "10 minute baad paani peene ka reminder do",
    altPhrases: ["Reminders batao", "Clear reminders"],
    description: "Voice alarm timer set karta hai aur samay hone par Zoya khud bolkar yaad dilati hai.",
    badge: "Reminder",
  },
  {
    id: "hm_sing",
    category: "Health & Media",
    phrase: "Zoya mera favourite song sunao",
    altPhrases: ["Gaana gao", "Sing my favorite song"],
    description: "Saved favourite song ke lyrics pyaar se gungunakar sunati hai.",
    badge: "Singing",
  },
  {
    id: "hm_yt",
    category: "Health & Media",
    phrase: "Chalo sath me YouTube video dekhte hain",
    altPhrases: ["Play Kesariya on YouTube", "Chess / Tic Tac Toe khelo"],
    description: "Floating YouTube Watch-Together player ya Live Voice Games open karta hai.",
    badge: "Media & Games",
  },
];

const CATEGORIES: Array<ZoyaCommandItem["category"] | "All"> = [
  "All",
  "Security & Owner",
  "Astrology",
  "Characters & UI",
  "Device & Screen",
  "Studios & AI",
  "Health & Media",
];

interface AdvanceCommandsListSectionProps {
  onSelectCommandPhrase?: (phrase: string) => void;
}

export default function AdvanceCommandsListSection({
  onSelectCommandPhrase,
}: AdvanceCommandsListSectionProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ZOYA_COMMANDS.filter((item) => {
      const catOk = activeCategory === "All" || item.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        item.phrase.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        (item.altPhrases || []).some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  const handleCopy = async (item: ZoyaCommandItem) => {
    try {
      await navigator.clipboard.writeText(item.phrase);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {}
    onSelectCommandPhrase?.(item.phrase);
  };

  const getCategoryIcon = (cat: ZoyaCommandItem["category"]) => {
    switch (cat) {
      case "Security & Owner":
        return <Shield size={12} className="text-rose-400" />;
      case "Astrology":
        return <Compass size={12} className="text-amber-400" />;
      case "Characters & UI":
        return <Palette size={12} className="text-pink-400" />;
      case "Device & Screen":
        return <Sliders size={12} className="text-cyan-400" />;
      case "Studios & AI":
        return <Code2 size={12} className="text-indigo-400" />;
      case "Health & Media":
        return <HeartPulse size={12} className="text-emerald-400" />;
    }
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#101628] to-indigo-950/50 border border-cyan-500/35 space-y-3 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <Terminal size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Sabhi Zoya Commands List (All Voice &amp; App Commands)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {ALL_ZOYA_COMMANDS.length} Commands
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
              Voice Call ya Chat me use hone waale sabhi Zoya commands — search karein ya tap karke copy karein.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[10.5px] font-bold text-cyan-300 shrink-0"
        >
          {isExpanded ? "Hide List" : "Show All"}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2.5 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search command (e.g. astrology, owner voice, volume, jarvis, website)..."
              className="w-full bg-black/50 border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    active
                      ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm"
                      : "bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 border-white/10"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Command Cards List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 chat-scroll">
            {filtered.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-black/30 border border-white/10 text-xs text-slate-400">
                Koi command match nahi hua — dusra keyword try karein.
              </div>
            ) : (
              filtered.map((cmd) => {
                const isCopied = copiedId === cmd.id;
                return (
                  <div
                    key={cmd.id}
                    className="p-2.5 rounded-xl bg-black/45 hover:bg-black/60 border border-white/10 hover:border-cyan-500/35 transition-all flex items-start justify-between gap-2.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getCategoryIcon(cmd.category)}
                        <span className="text-[11.5px] font-bold text-cyan-200 break-words">
                          "{cmd.phrase}"
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-white/10 text-slate-200 border border-white/10">
                          {cmd.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-300 leading-snug">
                        {cmd.description}
                      </p>
                      {cmd.altPhrases && cmd.altPhrases.length > 0 && (
                        <div className="text-[9.5px] text-slate-400 flex flex-wrap gap-1">
                          <span className="text-slate-500">Also say:</span>
                          {cmd.altPhrases.map((alt, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/10 text-slate-300"
                            >
                              "{alt}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(cmd)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 border transition-all ${
                        isCopied
                          ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-200"
                          : "bg-white/5 hover:bg-cyan-500/20 border-white/10 hover:border-cyan-400/40 text-slate-200"
                      }`}
                      title="Copy command"
                    >
                      {isCopied ? (
                        <>
                          <Check size={11} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          {onSelectCommandPhrase ? <Play size={10} /> : <Copy size={11} />}
                          <span>{onSelectCommandPhrase ? "Copy" : "Copy"}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-pink-400" />
              <span>Showing {filtered.length} of {ALL_ZOYA_COMMANDS.length} commands</span>
            </span>
            <span className="text-cyan-300/80">Live Voice &amp; Chat Ready</span>
          </div>
        </div>
      )}
    </div>
  );
}
