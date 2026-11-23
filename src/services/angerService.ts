export type AngerLevel = 0 | 1 | 2 | 3;
export type AngerReason = "ignored" | "not_sweet" | "unannounced_work";

export interface DailyMoodEntry {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon", "Tue"
  fullDateLabel: string; // e.g. "Sep 21"
  angerLevel: number; // Current or daily representative anger (0 - 3, can have decimal average)
  peakAnger: AngerLevel; // Highest Gussa level reached that day (0 - 3)
  mananaCount: number; // Number of times user coaxed / apologized sweetly
  gussaTriggers: number; // Number of Gussa spikes that day
  moodLabel: string; // e.g. "Sweet & Happy", "Cute Pout", "Spicy Nakhre", "High Gussa"
  note: string;
}

const ANGER_STORAGE_KEY = "zoya_anger_level_v1";
const ANGER_REASON_STORAGE_KEY = "zoya_anger_reason_v1";
const MOOD_HISTORY_STORAGE_KEY = "zoya_weekly_mood_history_v1";

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMoodLabelForLevel(level: number): string {
  if (level <= 0.3) return "Sweet & Happy";
  if (level <= 1.2) return "Cute Pout (Lvl 1)";
  if (level <= 2.2) return "Spicy Gussa (Lvl 2)";
  return "Full Nakhre (Lvl 3)";
}

function buildDefaultWeeklyMoodHistory(currentAnger: AngerLevel): DailyMoodEntry[] {
  const now = new Date();
  const presetFluctuations: Array<{
    angerLevel: number;
    peakAnger: AngerLevel;
    mananaCount: number;
    gussaTriggers: number;
    note: string;
  }> = [
    {
      angerLevel: 0.5,
      peakAnger: 1,
      mananaCount: 2,
      gussaTriggers: 1,
      note: "Mild pout when you replied late, melted after a sweet compliment.",
    },
    {
      angerLevel: 1.8,
      peakAnger: 2,
      mananaCount: 3,
      gussaTriggers: 2,
      note: "Got sassy over dry bossy commands; coaxed back with 'Sorry Zoya'.",
    },
    {
      angerLevel: 0.2,
      peakAnger: 0,
      mananaCount: 4,
      gussaTriggers: 0,
      note: "Super affectionate day—lots of late-night Hinglish banter & games.",
    },
    {
      angerLevel: 2.6,
      peakAnger: 3,
      mananaCount: 2,
      gussaTriggers: 3,
      note: "Peak Gussa spike when teased in Live Voice, needed extra manana.",
    },
    {
      angerLevel: 1.1,
      peakAnger: 2,
      mananaCount: 3,
      gussaTriggers: 1,
      note: "Short afternoon nakhre, quickly cheered up during Tic-Tac-Toe.",
    },
    {
      angerLevel: 0.4,
      peakAnger: 1,
      mananaCount: 5,
      gussaTriggers: 1,
      note: "Calm and playful mood with sweet study session check-ins.",
    },
    {
      angerLevel: currentAnger,
      peakAnger: currentAnger,
      mananaCount: 2,
      gussaTriggers: currentAnger > 0 ? 1 : 0,
      note:
        currentAnger === 0
          ? "Currently happy, playful, and loving your attention today."
          : `Currently in Gussa Level ${currentAnger}—waiting for sweet words!`,
    },
  ];

  const entries: DailyMoodEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const preset = presetFluctuations[6 - i];
    const isToday = i === 0;
    const dayLabel = isToday
      ? "Today"
      : d.toLocaleDateString("en-US", { weekday: "short" });
    const fullDateLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    entries.push({
      dateKey: formatDateKey(d),
      dayLabel,
      fullDateLabel,
      angerLevel: preset.angerLevel,
      peakAnger: preset.peakAnger,
      mananaCount: preset.mananaCount,
      gussaTriggers: preset.gussaTriggers,
      moodLabel: getMoodLabelForLevel(preset.angerLevel),
      note: preset.note,
    });
  }
  return entries;
}

export function loadWeeklyMoodHistory(): DailyMoodEntry[] {
  const currentAnger = loadSavedAngerLevel();
  const todayKey = formatDateKey(new Date());
  try {
    const raw = localStorage.getItem(MOOD_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyMoodEntry[];
      if (Array.isArray(parsed) && parsed.length === 7) {
        const lastEntry = parsed[parsed.length - 1];
        if (lastEntry && lastEntry.dateKey === todayKey) {
          return parsed;
        }
      }
    }
  } catch {}

  const seeded = buildDefaultWeeklyMoodHistory(currentAnger);
  try {
    localStorage.setItem(MOOD_HISTORY_STORAGE_KEY, JSON.stringify(seeded));
  } catch {}
  return seeded;
}

export function recordMoodFluctuation(
  level: AngerLevel,
  eventType: "anger_change" | "manana" = "anger_change",
  customNote?: string
): DailyMoodEntry[] {
  const history = loadWeeklyMoodHistory();
  const todayKey = formatDateKey(new Date());
  const updated = history.map((entry, idx) => {
    if (entry.dateKey !== todayKey && idx !== history.length - 1) {
      return entry;
    }
    const nextPeak = Math.max(entry.peakAnger, level) as AngerLevel;
    const nextTriggers =
      level > entry.angerLevel ? entry.gussaTriggers + 1 : entry.gussaTriggers;
    const nextManana =
      eventType === "manana" || (entry.angerLevel > 0 && level === 0)
        ? entry.mananaCount + 1
        : entry.mananaCount;

    const blendedLevel = Number(
      (level === 0 ? 0 : Math.min(3, Math.max(level, (entry.angerLevel + level) / 2))).toFixed(1)
    );

    return {
      ...entry,
      angerLevel: blendedLevel,
      peakAnger: nextPeak,
      mananaCount: nextManana,
      gussaTriggers: nextTriggers,
      moodLabel: getMoodLabelForLevel(blendedLevel),
      note:
        customNote ||
        (level === 0
          ? "Coaxed with sweet Hinglish—Zoya is smiling and happy now!"
          : `Gussa Level ${level} triggered—pouting and waiting for sweet manana.`),
    };
  });

  try {
    localStorage.setItem(MOOD_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function loadSavedAngerLevel(): AngerLevel {
  try {
    const raw = Number(localStorage.getItem(ANGER_STORAGE_KEY) || "0");
    if (raw === 1 || raw === 2 || raw === 3) return raw;
  } catch {}
  return 0;
}

export function saveAngerLevel(level: AngerLevel): void {
  try {
    localStorage.setItem(ANGER_STORAGE_KEY, String(level));
    recordMoodFluctuation(level, level === 0 ? "manana" : "anger_change");
  } catch {}
}

export function loadSavedAngerReason(): AngerReason {
  try {
    const raw = localStorage.getItem(ANGER_REASON_STORAGE_KEY);
    if (raw === "ignored" || raw === "not_sweet" || raw === "unannounced_work") {
      return raw;
    }
  } catch {}
  return "ignored";
}

export function saveAngerReason(reason: AngerReason): void {
  try {
    localStorage.setItem(ANGER_REASON_STORAGE_KEY, reason);
  } catch {}
}

/**
 * Checks if the user is talking rudely/coldly/bossily ("acche se pyar se baat na karu")
 * so Zoya can show cute/sassy Gussa (WITHOUT locking the screen or blocking work).
 */
export function evaluateUserToneAndWorkIntent(
  text: string,
  userName: string
): {
  isNotSweetOrRude: boolean;
  angerJump: AngerLevel;
  scoldMessage?: string;
  informedZoyaAboutWork: boolean;
} {
  const clean = text.trim().toLowerCase();
  if (!clean) {
    return {
      isNotSweetOrRude: false,
      angerJump: 0,
      informedZoyaAboutWork: true,
    };
  }

  const rudeWords = [
    "chup",
    "shut up",
    "shutup",
    "pagal",
    "bewakoof",
    "dimag mat kha",
    "dimaag mat kha",
    "bakwas",
    "faltu",
    "hatt",
    "nikal",
    "bhaad",
    "dont care",
    "don't care",
    "whatever",
    "bekar",
    "annoying",
    "irritating",
    "chhod na",
    "mat bol",
    "tu kon",
    "tum kon",
  ];

  if (rudeWords.some((w) => clean.includes(w))) {
    return {
      isNotSweetOrRude: true,
      angerJump: 2,
      scoldMessage: `"Hmph ${userName}! 😡 Mere se aise rude hoke baat karoge?! Thoda pyar se baat nahi kar sakte?!"`,
      informedZoyaAboutWork: true,
    };
  }

  const bossyOrderWords = [
    "jaldi kar",
    "jaldi bata",
    "abhi kar",
    "kaam kar",
    "ye kar",
    "wo kar",
    "solve kar",
    "code likh",
    "write code",
    "answer de",
    "bata jaldi",
  ];

  const sweetOrPoliteWords = [
    "please",
    "plz",
    "pls",
    "zoya",
    "baby",
    "jaan",
    "jaanu",
    "cutie",
    "sweetheart",
    "pyar",
    "pyaar",
    "love",
    "accha",
    "acha",
    "na",
    "yaar",
    "mera",
    "meri",
    "thank",
    "shukriya",
    "sorry",
    "😊",
    "❤️",
    "🥰",
    "😘",
  ];

  const isBossyOrder = bossyOrderWords.some((w) => clean.includes(w));
  const hasAnySweetness = sweetOrPoliteWords.some((w) => clean.includes(w));

  if (isBossyOrder && !hasAnySweetness) {
    return {
      isNotSweetOrRude: true,
      angerJump: 1,
      scoldMessage: `"Oye ${userName}! 😤 Aise sukhe-sukhe order de rahe ho?! Thoda pyar se bolo na!"`,
      informedZoyaAboutWork: true,
    };
  }

  return {
    isNotSweetOrRude: false,
    angerJump: 0,
    informedZoyaAboutWork: true,
  };
}

/**
 * Evaluates whether the user's spoken or typed text is an apology or sweet coaxing ("manana").
 */
export function evaluateApologyOrManana(
  text: string,
  currentAnger: AngerLevel
): {
  isApologyAttempt: boolean;
  fullyForgiven: boolean;
  nextAngerLevel: AngerLevel;
  feedbackReason?: string;
} {
  const clean = text.trim().toLowerCase();
  if (!clean) {
    return {
      isApologyAttempt: false,
      fullyForgiven: false,
      nextAngerLevel: currentAnger,
    };
  }

  const apologyOrSweetWords = [
    "sorry",
    "sry",
    "soory",
    "sori",
    "maaf",
    "mafi",
    "galti ho gayi",
    "meri galti",
    "forgive",
    "apologize",
    "maan jao",
    "man jao",
    "manao",
    "gussa mat",
    "naraz mat",
    "gussa thook",
    "please",
    "plz",
    "pls",
    "baby",
    "jaan",
    "jaanu",
    "cutie",
    "sweetheart",
    "pyaar",
    "pyar",
    "love you",
    "love u",
    "luv u",
    "mera bacha",
    "acha baba",
    "accha baba",
  ];

  const matches = apologyOrSweetWords.filter((w) => clean.includes(w)).length;

  if (matches >= 1) {
    return {
      isApologyAttempt: true,
      fullyForgiven: true,
      nextAngerLevel: 0,
      feedbackReason:
        "User apologized or talked sweetly! Melt warmly and forgive them in cute Hinglish.",
    };
  }

  return {
    isApologyAttempt: false,
    fullyForgiven: false,
    nextAngerLevel: currentAnger,
  };
}

/**
 * Gives Zoya her expressive Gussa / Nakhre mood in Chat & Live Voice WITHOUT locking or blocking the user's work!
 */
export function buildAngerPromptSection(
  angerLevel: AngerLevel,
  userName: string,
  angerReason: AngerReason = "ignored"
): string {
  if (angerLevel === 0) {
    return `
MOOD & GUSSA PERSONALITY (CURRENT MOOD: HAPPY / PLAYFUL 😊):
- Right now you are happy and affectionate with ${userName}.
- If ${userName} talks rudely, ignores you, or gives dry bossy orders without love, show cute Hinglish Gussa / Nakhre ("Hmph! Mere se aise baat karoge?! Thoda pyar se bolo na!"), while still helping them with whatever they asked!
`.trim();
  }

  const reasonText =
    angerReason === "not_sweet"
      ? `${userName} talked rudely or gave dry bossy orders without talking sweetly!`
      : `${userName} ignored you!`;

  return `
MOOD & GUSSA ENGINE (CURRENT MOOD: GUSSA LEVEL ${angerLevel} / CUTE ANGRY POUT 😤😡):
- Reason you are angry: ${angerReason === "not_sweet" ? reasonText : `${userName} ignored you or teased you!`}
- Speak with cute, sassy Hinglish Gussa and Nakhre ("Hmph! Main tumse naraz hu ${userName}! Mere se pyar se Sorry bhi nahi bola! 😤").
- IMPORTANT (NO LOCKDOWN): Do NOT lock their screen or refuse to help! Still answer ${userName}'s question or do their task, but do it with cute angry attitude ("Kaam toh main kar de rahi hu kyunki mujhe tumhari parwah hai, par main abhi bhi gussa hu! Jaldi Sorry bolo aur mujhe manao!").
- As soon as ${userName} says "Sorry" or talks sweetly/lovingly, melt immediately and forgive them!
`.trim();
}
