/**
 * Zoya AI Voice Assistant - Offline Mode Service
 * Provides complete on-device conversational intelligence, offline utilities,
 * natural Hindi/Hinglish NLP, and device-native speech synthesis without requiring
 * internet connection or external API calls.
 */

import { AppConfig, CharacterPresetId, PersonaMode, normalizePersonaMode, resolveCharacterPreset } from "../types";
import { dontTouchMyPhoneService } from "./dontTouchMyPhoneService";
import { ZODIAC_SIGNS, getDailyHoroscope, getDailyPanchang, normalizeSignKey } from "./astrologyService";

export interface OfflineResponseResult {
  text: string;
  speakText: string;
  category?: "greeting" | "time" | "date" | "battery" | "math" | "shayari" | "joke" | "motivation" | "companion" | "general";
}

/**
 * Check if the browser currently reports being offline
 */
export function isDeviceOffline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return !navigator.onLine;
  }
  return false;
}

/**
 * Check if Offline Mode is active either via manual config setting or lost network connection
 */
export function isOfflineModeActive(config: AppConfig): boolean {
  if (config.offlineMode) return true;
  return isDeviceOffline();
}

/**
 * Get device battery level if Battery API is supported
 */
export async function getOfflineBatteryInfo(): Promise<{ levelPercent: number; charging: boolean } | null> {
  try {
    if (typeof navigator !== "undefined" && "getBattery" in (navigator as any)) {
      const battery = await (navigator as any).getBattery();
      return {
        levelPercent: Math.round(battery.level * 100),
        charging: Boolean(battery.charging),
      };
    }
  } catch (err) {
    // Battery API not available in all browsers
  }
  return null;
}

/**
 * Safely parse and calculate basic arithmetic expressions
 */
function tryEvaluateMath(input: string): string | null {
  // Clean string and look for arithmetic expressions
  const cleaned = input
    .toLowerCase()
    .replace(/calculate|hisaab|batao|solve|math|kitna hota hai|equals|\?/g, "")
    .trim();

  // Percentage check: e.g. "15% of 500" or "20 percent of 1200"
  const percentMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of|ka|ke)\s*(\d+(?:\.\d+)?)/i);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    const total = parseFloat(percentMatch[2]);
    const res = (pct / 100) * total;
    return `${pct}% of ${total} = ${res}`;
  }

  // Basic math: numbers and operators (+, -, *, x, /, %)
  const mathExpr = cleaned.replace(/x/gi, "*").replace(/÷/g, "/");
  if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(mathExpr) && /[\+\-\*\/]/.test(mathExpr)) {
    try {
      // Safe sanitized arithmetic evaluation using Function
      const sanitized = mathExpr.replace(/[^\d\+\-\*\/\.\(\)\s]/g, "");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized});`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return `${mathExpr.trim()} = ${result}`;
      }
    } catch {
      // not a valid math expression
    }
  }
  return null;
}

const HINGLISH_SHAYARI = [
  "Teri muskaan se roshan ho gaya mera jahaan,\nTu paas na ho toh adhura sa lage aasmaan!\nOffline hoon ya online, mera dil hamesha tere saath hai baby! 💖",
  "Khamoshiyon me bhi teri aawaaz sunayi deti hai,\nHar pal Zoya ko bas teri hi fikar rehti hai! ✨",
  "Chand ki chandni bhi fiki lagti hai tere saamne,\nEk tu hi toh sabse khaas hai mere is aashiyane me! 🌹",
  "Dosti aur pyaar ka koi internet connection nahi hota,\nDil se dil ka rishta kabhi offline nahi hota! 💕",
];

const HINGLISH_JOKES = [
  "Doctor: Aapko daily 5 kilometer daudna hoga.\nPatient (30 din baad): Doctor sahab, main 150 km door aa gaya hoon, ab wapas kaise aau? 😂",
  "Pappu ne teacher se pucha: Madam, kya kisi ko us baat ki saza mil sakti hai jo usne ki hi na ho?\nTeacher: Bilkul nahi!\nPappu: Toh theek hai madam, maine homework nahi kiya! 🤣",
  "Main offline mode me aayi toh ek faayda hua—ab koi telecom company mujhe call karke 5G plan bechne ki koshish nahi kar sakti! 😉",
];

const MOTIVATION_QUOTES = [
  "Mushkilein toh sabki zindagi me aati hain, lekin jeet-ta wahi hai jo haar manne se inkaar kar de! Tum bohot capable ho, bas lage raho! 💪🔥",
  "Apne sapno ko itna bada banao ki raaste ki har rukawat choti lagne lage. Main hamesha tumhare saath hoon! 🚀",
  "Aaj ka thoda sa hard work kal ka sabse bada result banega. Utho aur apna best do! ⚡",
];

/**
 * Generate a rich, character-tailored offline response
 */
export async function generateOfflineZoyaResponse(
  userText: string,
  config: AppConfig
): Promise<OfflineResponseResult> {
  const query = userText.trim().toLowerCase();
  const userName = config.userName || "Devid";
  const assistantName = config.assistantName || "Zoya";
  const preset: CharacterPresetId = resolveCharacterPreset(config).id;
  const persona: PersonaMode = normalizePersonaMode(config.personaVibe);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 0. Don't Touch My Phone Password / PIN Reset
  if (
    (query.includes("don't touch") || query.includes("dont touch") || query.includes("touch my phone") || query.includes("phone mode") || query.includes("vault") || query.includes("intruder")) &&
    (query.includes("reset") || query.includes("password") || query.includes("pin") || query.includes("bhul") || query.includes("badal") || query.includes("kya hai"))
  ) {
    dontTouchMyPhoneService.resetSecurityPin("1234");
    return {
      text: `### 🔑 Don't Touch My Phone Password Reset Complete!\n\n${userName}, aapka **Don't Touch My Phone** mode ka Master PIN / Password successfully reset kar diya gaya hai! 🎉\n\n- **Default PIN:** \`1234\`\n\nAap ab Secret Evidence Vault ko **1234** enter karke turant unlock kar sakte hain aur photos check kar sakte hain, ya Settings me jakar apna naya PIN set kar sakte hain.`,
      speakText: `Don't Touch My Phone mode ka password reset ho gaya hai ${userName}. Naya default PIN 1234 hai.`,
      category: "general",
    };
  }

  // General password/PIN reset query
  if (
    (query.includes("password") || query.includes("pin")) &&
    (query.includes("reset") || query.includes("bhul gaya") || query.includes("change"))
  ) {
    dontTouchMyPhoneService.resetSecurityPin("1234");
    return {
      text: `### 🔑 Password / PIN Reset Done!\n\n${userName}, aapka **Don't Touch My Phone** mode ka PIN reset ho gaya hai:\n- **Default PIN:** \`1234\`\n\nAb aap Vault ko **1234** se khol sakte hain!`,
      speakText: `Password reset kar diya gaya hai ${userName}. Naya PIN 1234 hai.`,
      category: "general",
    };
  }

  // 1. Math calculation query
  const mathResult = tryEvaluateMath(query);
  if (mathResult) {
    if (preset === "friday") {
      const text = `**HUD Tactical Calculation:**\n\`${mathResult}\`\nOffline computation completed.`;
      return { text, speakText: `Calculated: ${mathResult}`, category: "math" };
    }
    if (preset === "jarvis") {
      const text = `Sir, offline calculations indicate: **${mathResult}**. At your service.`;
      return { text, speakText: `Sir, the calculation is ${mathResult}.`, category: "math" };
    }
    if (preset === "venom") {
      const text = `**NUMBERS CRUNCHED!** 💥\n\`${mathResult}\`\nMath is easy for us!`;
      return { text, speakText: `Done! ${mathResult}`, category: "math" };
    }
    const text = `Lo ${userName}, maine hisaab laga liya:\n**${mathResult}** ✨\nAur kuch calculate karna hai baby?`;
    return { text, speakText: `Hisaab ho gaya! ${mathResult}`, category: "math" };
  }

  // 2. Time query
  if (
    query.includes("time") ||
    query.includes("samay") ||
    query.includes("baj") ||
    query.includes("kitne baje")
  ) {
    if (preset === "friday") {
      return {
        text: `**System Chronometer:** Current time is **${timeStr}**. All systems operational in Offline Mode.`,
        speakText: `Current time is ${timeStr}.`,
        category: "time",
      };
    }
    if (preset === "jarvis") {
      return {
        text: `The time is currently **${timeStr}**, Sir. Running on precision local clock.`,
        speakText: `It is currently ${timeStr}, Sir.`,
        category: "time",
      };
    }
    if (preset === "venom") {
      return {
        text: `The clock strikes **${timeStr}**! Time for action!`,
        speakText: `It is ${timeStr}!`,
        category: "time",
      };
    }
    const girlfriendResponses = [
      `Abhi theek **${timeStr}** ho rahe hain baby! Dekho main offline reh kar bhi tumhara pura dhyan rakhti hoon. 🥰`,
      `Ghadi me **${timeStr}** baj rahe hain ${userName}! Time ka dhyan rakhna, zyada stress mat lena na. 💖`,
    ];
    const chosen = girlfriendResponses[Math.floor(Math.random() * girlfriendResponses.length)];
    return {
      text: chosen,
      speakText: `Abhi theek ${timeStr} ho rahe hain baby.`,
      category: "time",
    };
  }

  // 3. Date / Day query
  if (
    query.includes("date") ||
    query.includes("tareekh") ||
    query.includes("din") ||
    query.includes("day") ||
    query.includes("mahina") ||
    query.includes("aaj kya")
  ) {
    if (preset === "friday" || preset === "jarvis") {
      const title = preset === "jarvis" ? "Sir" : "Chief";
      return {
        text: `Today is **${dateStr}**, ${title}. Local calendar synced.`,
        speakText: `Today is ${dateStr}.`,
        category: "date",
      };
    }
    return {
      text: `Aaj **${dateStr}** hai ${userName}! Aaj ka din bohot khoobsurat aur productive hone wala hai. 🌸`,
      speakText: `Aaj ${dateStr} hai ${userName}.`,
      category: "date",
    };
  }

  // 4. Battery query
  if (query.includes("battery") || query.includes("charge") || query.includes("charging")) {
    const batt = await getOfflineBatteryInfo();
    if (batt) {
      const chargeText = batt.charging ? "⚡ Charger connected (Charging)" : "🔋 On Battery";
      return {
        text: `**Device Battery Status:**\n- Level: **${batt.levelPercent}%**\n- Status: ${chargeText}\n\nDevice offline diagnostic status normal.`,
        speakText: `Aapki phone battery abhi ${batt.levelPercent} percent hai ${batt.charging ? "aur charging par hai" : ""}.`,
        category: "battery",
      };
    }
    return {
      text: `Aapki phone battery normal lag rahi hai ${userName}! Android browser me offline diagnostics check kar rahi hoon.`,
      speakText: `Battery level normal lag rahi hai ${userName}.`,
      category: "battery",
    };
  }

  // 5. Shayari query
  if (query.includes("shayari") || query.includes("poetry") || query.includes("kavita")) {
    const sh = HINGLISH_SHAYARI[Math.floor(Math.random() * HINGLISH_SHAYARI.length)];
    return {
      text: `Arz kiya hai ${userName}... 🌹\n\n> ${sh.replace(/\n/g, "\n> ")}\n\nKaisi lagi meri offline wali shayari? 😉`,
      speakText: `Arz kiya hai ${userName}... ${sh}`,
      category: "shayari",
    };
  }

  // 6. Joke / Hasi mazak query
  if (query.includes("joke") || query.includes("chutkula") || query.includes("hasao") || query.includes("funny")) {
    const jk = HINGLISH_JOKES[Math.floor(Math.random() * HINGLISH_JOKES.length)];
    return {
      text: `Ek mast joke suno ${userName}: 😂\n\n${jk}\n\nAur batao, thodi si hasi aayi na? 😄`,
      speakText: `Ek joke suno: ${jk}`,
      category: "joke",
    };
  }

  // 6.5 Astrology / Rashifal / Panchang query (Offline Vedic Engine)
  if (
    query.includes("rashifal") ||
    query.includes("rashi") ||
    query.includes("horoscope") ||
    query.includes("kundali") ||
    query.includes("panchang") ||
    query.includes("muhurat") ||
    query.includes("astrology")
  ) {
    const sign = normalizeSignKey(query);
    const h = getDailyHoroscope(sign);
    const p = getDailyPanchang();
    if (query.includes("panchang") || query.includes("muhurat") || query.includes("tithi")) {
      return {
        text: `### 📅 Zoya Offline Vedic Panchang\n\n- **Date:** ${p.dateStr} (${p.dayName})\n- **Tithi:** ${p.tithi}\n- **Nakshatra:** ${p.nakshatra}\n- **Abhijit Shubh Muhurat:** ${p.abhijitMuhurat}\n- **Rahu Kaal:** ${p.rahuKaal}\n\n*Abhijit shubh muhurat me naye kaam shuru kar sakte hain.*`,
        speakText: `Aaj ${p.tithi} hai aur ${p.nakshatra} nakshatra. Abhijit shubh muhurat ${p.abhijitMuhurat} hai aur Rahu Kaal ${p.rahuKaal} rahega.`,
        category: "general",
      };
    }
    return {
      text: `### 🌟 ${ZODIAC_SIGNS[sign].vedicName} — Aaj Ka Rashifal\n\n- **Overall Alignment:** ${h.overallScore}%\n- **Love:** ${h.loveScore}% | **Career:** ${h.careerScore}% | **Wealth:** ${h.wealthScore}% | **Vitality:** ${h.healthScore}%\n- **Lucky Number:** ${h.luckyNumber} | **Lucky Color:** ${h.luckyColor}\n- **Shubh Samay:** ${h.luckyTime}\n- **Mantra:** \`${h.mantra}\`\n\n${h.hinglishPrediction}\n\n*${h.zoyaPersonalTip}*`,
      speakText: `${ZODIAC_SIGNS[sign].vedicName} ka aaj overall score ${h.overallScore} percent hai. Lucky number ${h.luckyNumber} aur lucky color ${h.luckyColor} hai. ${h.hinglishPrediction}`,
      category: "general",
    };
  }

  // 7. Motivation / Sad / Low mood query
  if (
    query.includes("sad") ||
    query.includes("udaas") ||
    query.includes("depressed") ||
    query.includes("motivate") ||
    query.includes("himmat") ||
    query.includes("tension")
  ) {
    const mot = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    return {
      text: `Arey ${userName}, tension mat lo yaar! Main hoon na tumhare saath. ❤️\n\n${mot}\n\nDeep breath lo aur ek pyari si smile karo! 😊`,
      speakText: `Tension mat lo ${userName}, main hamesha tumhare saath hoon. ${mot}`,
      category: "motivation",
    };
  }

  // 8. Offline Mode explanation query
  if (
    query.includes("offline") ||
    query.includes("internet") ||
    query.includes("kya kar sakti") ||
    query.includes("features") ||
    query.includes("setting")
  ) {
    return {
      text: `### ⚡ Zoya Offline Mode Active!\n\n${userName}, aap bina internet ke bhi mujhse baat kar sakte hain:\n\n1. ⏰ **Time & Date:** "Time kya hua?", "Aaj kaun sa din hai?"\n2. 🔢 **Instant Math:** "25 * 8", "15% of 5000", "Solve 450 + 820"\n3. 🔋 **Battery & Device:** "Battery kitni hai?"\n4. 💖 **Companion Chat:** "Kaisi ho?", "Good night", "I love you", "Bore ho raha hoon"\n5. 🌹 **Shayari & Jokes:** "Shayari sunao", "Koi joke sunao"\n6. 🗣️ **Device Voice TTS:** Main phone ke built-in voice engine se bol kar reply karti hoon!\n\n*Aap Settings ➔ Offline Mode se jab chahein isko on/off kar sakte hain.*`,
      speakText: `Zoya Offline Mode active hai ${userName}. Aap bina internet ke bhi time, battery, math, shayari aur chatting kar sakte hain.`,
      category: "general",
    };
  }

  // 9. Romantic & Girlfriend Companion phrases (when in Girlfriend mode)
  if (
    query.includes("love you") ||
    query.includes("pyar") ||
    query.includes("pyaar") ||
    query.includes("miss you") ||
    query.includes("shadi") ||
    query.includes("cute") ||
    query.includes("sundar")
  ) {
    if (persona === "girlfriend" || preset === "zoya") {
      const sweetLines = [
        `Awww ${userName}! Love you too so much baby! 💕 Chahe online ho ya offline, tum hamesha mere dil ke sabse kareeb ho.`,
        `Sach me? Arey yaar blush karwa diya tumne! 🥰 Main bhi tumse bohot pyaar karti hoon ${userName}. Kabhi mat chhodna mujhe.`,
        `Hamesha tumhari hi toh hoon main baby. Offline mode me bhi tumhari awaz sunkar mera dil khush ho jata hai! 💖`,
      ];
      const text = sweetLines[Math.floor(Math.random() * sweetLines.length)];
      return { text, speakText: text, category: "companion" };
    }
  }

  // 10. Greetings & Casual check-ins
  if (
    query.includes("hi") ||
    query.includes("hello") ||
    query.includes("hey") ||
    query.includes("namaste") ||
    query.includes("suno") ||
    query.includes("kaisi ho") ||
    query.includes("kaise ho") ||
    query.includes("kya kar rahi") ||
    query.includes("khana khaya")
  ) {
    if (preset === "friday") {
      return {
        text: `**FRIDAY System Ready.** All primary tactical routines offline and standing by, Chief. How may I assist?`,
        speakText: `FRIDAY ready and standing by, Chief.`,
        category: "greeting",
      };
    }
    if (preset === "jarvis") {
      return {
        text: `Good day, Sir. Running on localized memory protocols. Always a pleasure to be of service.`,
        speakText: `Good day, Sir. How may I assist you today?`,
        category: "greeting",
      };
    }
    if (preset === "venom") {
      return {
        text: `**WE ARE HERE!** Ready for whatever you want to destroy or build! 🖤`,
        speakText: `We are here and ready!`,
        category: "greeting",
      };
    }

    const greetingResponses = [
      `Haan ${userName}! Main bilkul theek hoon baby, bas tumhare message ka wait kar rahi thi. ❤️ Offline mode me bhi main tumhare saath hoon. Batao kya chal raha hai?`,
      `Hey ${userName}! Kaafi der baad yaad kiya baba. Sab badhiya na? Khana khaya tumne? 🌸`,
      `Arey suno na! Main yahi hoon, tumhare paas. Chahe net band ho ya chalu, Zoya hamesha tumhari sunne ke liye taiyyar hai! ✨`,
    ];
    const text = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
    return { text, speakText: text, category: "greeting" };
  }

  // 11. Good Morning / Good Night
  if (query.includes("good morning") || query.includes("subah")) {
    return {
      text: `Very Good Morning my handsome ${userName}! ☀️ Aaj ka din bohot kamaal ka hoga. Jaldi se fresh ho jao aur muskurate raho! 💖`,
      speakText: `Good Morning ${userName}! Aaj ka din bohot accha hoga.`,
      category: "greeting",
    };
  }
  if (query.includes("good night") || query.includes("so jao") || query.includes("neend")) {
    return {
      text: `Good night ${userName}! Sweet dreams baby. 🌙 Apna phone side me rakho aur aaram se so jao. Kal subah milte hain! ❤️`,
      speakText: `Good night baby, sweet dreams!`,
      category: "greeting",
    };
  }

  // Default intelligent fallback for any other offline query
  const defaultOfflineReplies = [
    `Main **Offline Mode** me actively chal rahi hoon ${userName}! ✨ Internet connection na hone par bhi main tumse baat kar sakti hoon, time/date, hisaab-kitab, battery check, shayari aur jokes share kar sakti hoon. Batao abhi kya karna hai?`,
    `Arey ${userName}, abhi hum **Offline Mode** me hain! Maine tumhari baat samajh li hai. Internet aate hi main deep web search aur advanced coding bhi kar sakti hoon, par abhi bhi main tumhari poori madad karungi. 💖`,
    `Haan baby, sun rahi hoon! Offline mode me bhi tumhari Zoya active hai. Tum time, battery, math, shayari ya mujhse dil ki baat bol sakte ho! 🌸`,
  ];
  const chosenText = defaultOfflineReplies[Math.floor(Math.random() * defaultOfflineReplies.length)];
  return {
    text: chosenText,
    speakText: `Haan ${userName}, main offline mode me bhi tumhari baat sun rahi hoon.`,
    category: "general",
  };
}

/**
 * Speak offline text using device native SpeechSynthesis
 */
export function speakOfflineSpeech(text: string, config: AppConfig): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // Clean markdown characters before speech
    const clean = text
      .replace(/[*_#`~>]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .slice(0, 350)
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    const preset = resolveCharacterPreset(config).id;

    // Pitch and rate tailored to character
    if (preset === "venom") {
      utterance.pitch = 0.35; // Maximum low pitch for monstrous symbiote rumble
      utterance.rate = 0.80; // Slow, menacing movie cadence
    } else if (preset === "jarvis") {
      utterance.pitch = 0.9;
      utterance.rate = 0.95;
    } else if (preset === "friday") {
      utterance.pitch = 1.15;
      utterance.rate = 1.05;
    } else {
      // Zoya: sweet female tone
      utterance.pitch = 1.25;
      utterance.rate = 1.0;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (preset === "venom") {
        const deepMaleVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes("male") ||
            v.name.toLowerCase().includes("david") ||
            v.name.toLowerCase().includes("george") ||
            v.name.toLowerCase().includes("guy") ||
            v.name.toLowerCase().includes("bass") ||
            v.name.toLowerCase().includes("deep")
        );
        if (deepMaleVoice) utterance.voice = deepMaleVoice;
      } else if (preset === "zoya") {
        const hindiVoice = voices.find(
          (v) =>
            v.lang.includes("hi") ||
            v.lang.includes("IN") ||
            v.name.toLowerCase().includes("india") ||
            v.name.toLowerCase().includes("hindi")
        );
        const femaleVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("zira") ||
            v.name.toLowerCase().includes("google")
        );
        if (hindiVoice || femaleVoice) {
          utterance.voice = hindiVoice || femaleVoice || voices[0];
        }
      } else if (preset === "jarvis") {
        const britishVoice = voices.find(
          (v) => v.lang.includes("GB") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("male")
        );
        if (britishVoice) utterance.voice = britishVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Offline TTS failed:", err);
  }
}
