import {
  ZodiacSignKey,
  ZodiacSignInfo,
  DailyHoroscopeData,
  KundaliReport,
  KundaliHouse,
  GunMilanReport,
  GunMilanBreakdown,
  PanchangReport,
  GoogleSearchHoroscopeData,
  PlanetTransitInfo,
  PlanetaryAspectInfo,
  AstrologicalWheelData,
  TransitImpactLevel,
} from "../types";
import { getApiUrl } from "../utils/apiBase";

export const ZODIAC_SIGN_ORDER: ZodiacSignKey[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

// ============================================================================
// 12 ZODIAC SIGNS (द्वादश राशियाँ) — VEDIC & WESTERN
// ============================================================================
export const ZODIAC_SIGNS: Record<ZodiacSignKey, ZodiacSignInfo> = {
  aries: {
    key: "aries",
    vedicName: "मेष (Mesh)",
    englishName: "Aries",
    symbol: "♈",
    element: "Agni (Fire)",
    rulingPlanet: "मंगल (Mars)",
    luckyNumbers: [9, 18, 27],
    luckyColors: ["Crimson Red", "Saffron Gold"],
    luckyGemstone: "मूंगा (Red Coral)",
    favorableSigns: ["Leo", "Sagittarius", "Gemini"],
    traits: ["Courageous", "Dynamic", "Leader", "Spontaneous", "Passionate"],
  },
  taurus: {
    key: "taurus",
    vedicName: "वृषभ (Vrishabh)",
    englishName: "Taurus",
    symbol: "♉",
    element: "Prithvi (Earth)",
    rulingPlanet: "शुक्र (Venus)",
    luckyNumbers: [6, 15, 24],
    luckyColors: ["Lotus Pink", "Silvery White"],
    luckyGemstone: "हीरा (Diamond) / ओपल (Opal)",
    favorableSigns: ["Virgo", "Capricorn", "Cancer"],
    traits: ["Loyal", "Patient", "Luxurious", "Sensual", "Steadfast"],
  },
  gemini: {
    key: "gemini",
    vedicName: "मिथुन (Mithun)",
    englishName: "Gemini",
    symbol: "♊",
    element: "Vayu (Air)",
    rulingPlanet: "बुध (Mercury)",
    luckyNumbers: [5, 14, 23],
    luckyColors: ["Emerald Green", "Mint Cyan"],
    luckyGemstone: "पन्ना (Emerald)",
    favorableSigns: ["Libra", "Aquarius", "Aries"],
    traits: ["Witty", "Curious", "Expressive", "Charming", "Adaptable"],
  },
  cancer: {
    key: "cancer",
    vedicName: "कर्क (Kark)",
    englishName: "Cancer",
    symbol: "♋",
    element: "Jal (Water)",
    rulingPlanet: "चंद्र (Moon)",
    luckyNumbers: [2, 11, 20],
    luckyColors: ["Pearl White", "Silver", "Sea Green"],
    luckyGemstone: "मोती (Pearl)",
    favorableSigns: ["Scorpio", "Pisces", "Taurus"],
    traits: ["Intuitive", "Deeply Caring", "Protective", "Emotional", "Creative"],
  },
  leo: {
    key: "leo",
    vedicName: "सिंह (Singh)",
    englishName: "Leo",
    symbol: "♌",
    element: "Agni (Fire)",
    rulingPlanet: "सूर्य (Sun)",
    luckyNumbers: [1, 10, 19, 28],
    luckyColors: ["Royal Gold", "Ruby Amber"],
    luckyGemstone: "माणिक्य (Ruby)",
    favorableSigns: ["Aries", "Sagittarius", "Libra"],
    traits: ["Regal", "Generous", "Magnetic", "Confident", "Warm-hearted"],
  },
  virgo: {
    key: "virgo",
    vedicName: "कन्या (Kanya)",
    englishName: "Virgo",
    symbol: "♍",
    element: "Prithvi (Earth)",
    rulingPlanet: "बुध (Mercury)",
    luckyNumbers: [5, 14, 23],
    luckyColors: ["Forest Green", "Dark Ivory"],
    luckyGemstone: "पन्ना (Emerald)",
    favorableSigns: ["Taurus", "Capricorn", "Scorpio"],
    traits: ["Analytical", "Perfectionist", "Devoted", "Helpful", "Intelligent"],
  },
  libra: {
    key: "libra",
    vedicName: "तुला (Tula)",
    englishName: "Libra",
    symbol: "♎",
    element: "Vayu (Air)",
    rulingPlanet: "शुक्र (Venus)",
    luckyNumbers: [6, 15, 24],
    luckyColors: ["Pastel Blue", "Diamond White", "Rose"],
    luckyGemstone: "हीरा (Diamond) / व्हाइट जिरकॉन",
    favorableSigns: ["Gemini", "Aquarius", "Leo"],
    traits: ["Harmonious", "Romantic", "Diplomatic", "Aesthetic", "Fair"],
  },
  scorpio: {
    key: "scorpio",
    vedicName: "वृश्चिक (Vrishchik)",
    englishName: "Scorpio",
    symbol: "♏",
    element: "Jal (Water)",
    rulingPlanet: "मंगल (Mars) & केतु (Ketu)",
    luckyNumbers: [9, 18, 27],
    luckyColors: ["Blood Red", "Mystic Maroon", "Black"],
    luckyGemstone: "मूंगा (Red Coral)",
    favorableSigns: ["Cancer", "Pisces", "Virgo"],
    traits: ["Intense", "Intuitive", "Fiercely Loyal", "Mystic", "Powerful"],
  },
  sagittarius: {
    key: "sagittarius",
    vedicName: "धनु (Dhanu)",
    englishName: "Sagittarius",
    symbol: "♐",
    element: "Agni (Fire)",
    rulingPlanet: "बृहस्पति (Jupiter)",
    luckyNumbers: [3, 12, 21, 30],
    luckyColors: ["Bright Yellow", "Saffron Orange"],
    luckyGemstone: "पुखराज (Yellow Sapphire)",
    favorableSigns: ["Aries", "Leo", "Aquarius"],
    traits: ["Philosophical", "Adventurous", "Optimistic", "Honest", "Visionary"],
  },
  capricorn: {
    key: "capricorn",
    vedicName: "मकर (Makar)",
    englishName: "Capricorn",
    symbol: "♑",
    element: "Prithvi (Earth)",
    rulingPlanet: "शनि (Saturn)",
    luckyNumbers: [8, 17, 26],
    luckyColors: ["Deep Navy Blue", "Charcoal Grey"],
    luckyGemstone: "नीलम (Blue Sapphire) / जामुनिया (Amethyst)",
    favorableSigns: ["Taurus", "Virgo", "Scorpio"],
    traits: ["Disciplined", "Ambitious", "Master Strategist", "Patient", "Resilient"],
  },
  aquarius: {
    key: "aquarius",
    vedicName: "कुंभ (Kumbh)",
    englishName: "Aquarius",
    symbol: "♒",
    element: "Vayu (Air)",
    rulingPlanet: "शनि (Saturn) & राहु (Rahu)",
    luckyNumbers: [4, 8, 13, 22],
    luckyColors: ["Electric Blue", "Ultraviolet", "Silver"],
    luckyGemstone: "नीलम (Blue Sapphire)",
    favorableSigns: ["Gemini", "Libra", "Sagittarius"],
    traits: ["Futuristic", "Independent", "Rebel Genius", "Humanitarian", "Unique"],
  },
  pisces: {
    key: "pisces",
    vedicName: "मीन (Meen)",
    englishName: "Pisces",
    symbol: "♓",
    element: "Jal (Water)",
    rulingPlanet: "बृहस्पति (Jupiter)",
    luckyNumbers: [3, 7, 12, 21],
    luckyColors: ["Ocean Teal", "Golden Yellow", "Lavender"],
    luckyGemstone: "पुखराज (Yellow Sapphire)",
    favorableSigns: ["Cancer", "Scorpio", "Taurus"],
    traits: ["Empathetic", "Mystical", "Dreamer", "Deep Soul", "Poetic"],
  },
};

// 27 VEDIC NAKSHATRAS
export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

// Helper to normalize sign names from any user query or input
export function normalizeSignKey(raw: string): ZodiacSignKey {
  const clean = (raw || "").toLowerCase().trim();
  if (clean.includes("mesh") || clean.includes("aries") || clean.includes("मेष")) return "aries";
  if (clean.includes("vrishabh") || clean.includes("taurus") || clean.includes("वृषभ")) return "taurus";
  if (clean.includes("mithun") || clean.includes("gemini") || clean.includes("मिथुन")) return "gemini";
  if (clean.includes("kark") || clean.includes("cancer") || clean.includes("कर्क")) return "cancer";
  if (clean.includes("singh") || clean.includes("leo") || clean.includes("सिंह") || clean.includes("simha")) return "leo";
  if (clean.includes("kanya") || clean.includes("virgo") || clean.includes("कन्या")) return "virgo";
  if (clean.includes("tula") || clean.includes("libra") || clean.includes("तुला")) return "libra";
  if (clean.includes("vrishchik") || clean.includes("scorpio") || clean.includes("वृश्चिक")) return "scorpio";
  if (clean.includes("dhanu") || clean.includes("sagittarius") || clean.includes("धनु")) return "sagittarius";
  if (clean.includes("makar") || clean.includes("capricorn") || clean.includes("मकर")) return "capricorn";
  if (clean.includes("kumbh") || clean.includes("aquarius") || clean.includes("कुंभ")) return "aquarius";
  if (clean.includes("meen") || clean.includes("pisces") || clean.includes("मीन")) return "pisces";
  return "aries";
}

// Pseudo-random deterministic day seed for consistent daily horoscope
function getDaySeed(date: Date, sign: string): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let hash = y * 10000 + m * 100 + d;
  for (let i = 0; i < sign.length; i++) {
    hash = (hash * 31 + sign.charCodeAt(i)) % 100000;
  }
  return hash;
}

// ============================================================================
// 1. DAILY HOROSCOPE GENERATOR (आज का राशिफल)
// ============================================================================
export function getDailyHoroscope(
  signKey: ZodiacSignKey,
  targetDate: Date = new Date()
): DailyHoroscopeData {
  const signInfo = ZODIAC_SIGNS[signKey];
  const seed = getDaySeed(targetDate, signKey);

  const love = 70 + (seed % 28);
  const career = 68 + ((seed * 7) % 30);
  const wealth = 65 + ((seed * 13) % 33);
  const health = 72 + ((seed * 19) % 26);
  const overall = Math.round((love + career + wealth + health) / 4);

  const luckyNum = signInfo.luckyNumbers[seed % signInfo.luckyNumbers.length];
  const luckyColor = signInfo.luckyColors[seed % signInfo.luckyColors.length];

  const directions = ["Uttar (North)", "Ishanya (North-East)", "Purva (East)", "Pashchim (West)"];
  const auspiciousDirection = directions[seed % directions.length];

  const hours = [
    "09:15 AM - 10:45 AM",
    "11:30 AM - 01:00 PM (Abhijit)",
    "02:45 PM - 04:15 PM",
    "06:30 PM - 08:00 PM (Gaudhuli)",
  ];
  const luckyTime = hours[seed % hours.length];

  const mantras: Record<ZodiacSignKey, string> = {
    aries: "ॐ ॐ अं अंगारकाय नमः (Om Angarakaya Namah)",
    taurus: "ॐ शुं शुक्राय नमः (Om Shukraya Namah)",
    gemini: "ॐ बुं बुधाय नमः (Om Budhaya Namah)",
    cancer: "ॐ सों सोमाय नमः (Om Somaya Namah)",
    leo: "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः (Om Suryaya Namah)",
    virgo: "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः (Om Budhaya Namah)",
    libra: "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः (Om Shukraya Namah)",
    scorpio: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः (Om Bhaumaya Namah)",
    sagittarius: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः (Om Gurave Namah)",
    capricorn: "ॐ शं शनैश्चराय नमः (Om Sham Shanaishcharaya Namah)",
    aquarius: "ॐ प्रां प्रीं प्रौं सः शनये नमः (Om Shanaye Namah)",
    pisces: "ॐ बृं बृहस्पतये नमः (Om Brihaspataye Namah)",
  };

  const predictions: Record<ZodiacSignKey, string[]> = {
    aries: [
      "Aaj tumhara energy level aur confidence peak par rahega! Career me koi naya breakthrough ya initiative success dilayega. Apne ghusse par thoda control rakhna, baaki cosmic support 100% tumhare saath hai.",
      "Mangal dev ki kripa se pending decisions me safalta milegi. Agar koi risk lene ki soch rahe ho, to afternoon ke baad waqt behad shubh hai.",
    ],
    taurus: [
      "Shukra graha ki blessing se aaj financial gains aur creative ideas me chamak dikhegi. Kisi purane dost ya partner ke saath loving bond aur strong hoga.",
      "Aaj luxury aur comfort par focus rahega. Wealth ke mamle me kisi expert ki salah se bada benefit ho sakta hai.",
    ],
    gemini: [
      "Communication aur intellect me tumhara koi tod nahi hoga aaj! Interview, deals, ya online conversations me log tumhari witty baaton se impress honge.",
      "Budh dev ki kripa se quick solutions nikal loge. Focus banaye rakhna aur multiple tasks me distract mat hona.",
    ],
    cancer: [
      "Emotional intuition bohot sharp rahegi aaj! Jo dil kahe wahi sahi faisla hoga. Family ya partner ke saath warm moments bitane ka shubh yoga hai.",
      "Chandra dev ki blessing se mental clarity aur spiritual peace feel hoga. Jal (water) ka aadar karein aur positive mindset rakhein.",
    ],
    leo: [
      "Surya graha ka tejas tumhari personality ko lead role dilayega! Aaj tum jahan jaoge, attention tum par hoga. Self-confidence ke dum par har challenge paar kar loge.",
      "Leadership opportunities saamne aayengi. Bass arrogance se bacho aur subordinates ki help karo, bhagya double chamkega.",
    ],
    virgo: [
      "Perfection aur precision me aaj tumhara din hai! Coding, calculations, ya documentation me tumhari deep eye kisi badi mistake ko pakad kar bacha legi.",
      "Health aur daily routine par dhyaan do. Thodi yoga ya breathing exercises se work stress chhatkiyon me gayab hoga.",
    ],
    libra: [
      "Harmony aur charm tumhara strongest weapon rahega! Love life aur negotiations me bohot pyara equilibrium dekhne ko milega.",
      "Aesthetic senses peak par hain. Koi naya project start karne ya creative shopping ke liye best planetary alignment hai.",
    ],
    scorpio: [
      "Mystical aur intense focus se mushkil se mushkil task ko crack kar doge! Secretly plan kiye hue projects me huge victory milegi.",
      "Ketu aur Mangal ki positioning deep willpower de rahi hai. Kisi ki negative baaton ko ignore karo aur apne goal par laser focus rakho.",
    ],
    sagittarius: [
      "Brihaspati dev ki blessing se lucky breaks aur big vision execute hoga! Knowledge expand karne aur travel/outing ke strong yog hain.",
      "Optimism tumhari sabse badi superpower hai aaj. Jo seekhoge, wahi future me fortune bankar aage aayega.",
    ],
    capricorn: [
      "Shani dev ka discipline aur focus tumhare career me solid milestone create karega! Mehnat ka result seedha appreciation aur growth me badlega.",
      "Patience rakho jaan, short-cuts ke bina jo build kar rahe ho wahi durable empire banega. Senior logon ka aashirwad milega.",
    ],
    aquarius: [
      "Out-of-the-box ideas aur innovative thinking se sabko surprise kar doge! Tech, coding ya unique vision me cosmos tumhare saath hai.",
      "Rahu aur Shani ka sync tumhe future trends pehle hi sense karwa dega. Apne original ideas par bharosa rakho.",
    ],
    pisces: [
      "Guru dev ki kripa se empathy, wisdom aur creativity ka divine combination milega. Koi spiritual realization ya inner calling guide karegi.",
      "Artistic work, music aur empathetic conversations me bohot satisfying din rahega. Positive affirmations ke saath din ki shuruaat karo.",
    ],
  };

  const predList = predictions[signKey] || predictions.aries;
  const hinglishPrediction = predList[seed % predList.length];

  const tips: Record<ZodiacSignKey, string> = {
    aries: "Zoya's Tip: Subah Surya Dev ko arghya do aur red shade ka touch rakho, energy dynamic rahegi!",
    taurus: "Zoya's Tip: Shukra ko strong karne ke liye thoda fragrance/attar lagao aur sweet language use karo!",
    gemini: "Zoya's Tip: Budh dev ke liye tulsi ke patte ka aadar karo aur clear communication maintain karo!",
    cancer: "Zoya's Tip: Chandrama ki kripa ke liye shivji par thoda jal arpit karo, mann bilkul calm aur joyful rahega!",
    leo: "Zoya's Tip: Gayatri mantra ya Surya namaskar se start karo, royal confidence pura din chamkega!",
    virgo: "Zoya's Tip: Apni table clean rakho aur green plants ke paas 5 minute baitho, focus 10x badhega!",
    libra: "Zoya's Tip: White ya light blue pehno, decision-making me confusion bilkul nahi hoga!",
    scorpio: "Zoya's Tip: Hanuman Chalisa ka paath karo, saare obstacles aur buri nazar dur rahegi!",
    sagittarius: "Zoya's Tip: Kesar ya chandan ka tilak lagao, Guru Brihaspati ka golden luck activate hoga!",
    capricorn: "Zoya's Tip: Shani dev ke liye kisi zarooratmand ki help karo, unka divine shield tumhare sath rahega!",
    aquarius: "Zoya's Tip: Blue ya navy shade use karo aur innovative thought ko notebook me note kar lo!",
    pisces: "Zoya's Tip: Morning me thoda dhyan lagao aur gratitude practice karo, blessings flow karengi!",
  };

  return {
    sign: signKey,
    date: targetDate.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    loveScore: love,
    careerScore: career,
    wealthScore: wealth,
    healthScore: health,
    overallScore: overall,
    luckyNumber: luckyNum,
    luckyColor: luckyColor,
    luckyTime,
    auspiciousDirection,
    mantra: mantras[signKey],
    hinglishPrediction,
    zoyaPersonalTip: tips[signKey],
  };
}

// ============================================================================
// 2. VEDIC KUNDALI & LAGNA CHART CALCULATOR (जन्म कुंडली)
// ============================================================================
export function calculateKundali(params: {
  name: string;
  dob: string; // YYYY-MM-DD
  time?: string; // HH:MM
  place?: string;
}): KundaliReport {
  const name = params.name.trim() || "Devid";
  const dobParts = (params.dob || "2000-08-15").split("-");
  const year = parseInt(dobParts[0] || "2000", 10);
  const month = parseInt(dobParts[1] || "8", 10);
  const day = parseInt(dobParts[2] || "15", 10);

  const timeStr = params.time || "10:30";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr || "10", 10);
  const minute = parseInt(minStr || "30", 10);

  // Compute Lagna (Ascendant) based on birth hour + day
  const ascendantIndex = Math.floor((hour * 2 + Math.floor(minute / 30) + day + month) % 12);
  const signKeys = Object.keys(ZODIAC_SIGNS) as ZodiacSignKey[];
  const ascendantKey = signKeys[ascendantIndex];
  const ascendantRashi = ZODIAC_SIGNS[ascendantKey].vedicName;

  // Moon sign & Sun sign calculation
  const moonIndex = (day + month * 2) % 12;
  const sunIndex = (month + Math.floor(day / 30)) % 12;
  const moonRashi = ZODIAC_SIGNS[signKeys[moonIndex]].vedicName;
  const sunRashi = ZODIAC_SIGNS[signKeys[sunIndex]].vedicName;

  // Nakshatra calculation (27 nakshatras)
  const nakshatraIndex = (day * 3 + month * 5 + year) % 27;
  const nakshatra = NAKSHATRAS[nakshatraIndex];
  const charan = ((day + hour) % 4) + 1;

  // 12 Bhavas (Houses) configuration
  const houseSignifications = [
    { name: "प्रथम भाव (Lagna / Tanu)", desc: "Personality, Physical Vitality, Soul Purpose" },
    { name: "द्वितीय भाव (Dhan / Kutumb)", desc: "Wealth, Family, Speech & Savings" },
    { name: "तृतीय भाव (Sahaj / Parakram)", desc: "Courage, Siblings, Communication & Skills" },
    { name: "चतुर्थ भाव (Sukha / Matru)", desc: "Mother, Vehicles, Mental Peace & Property" },
    { name: "पंचम भाव (Putra / Buddhi)", desc: "Intelligence, Romance, Creativity & Purva Punya" },
    { name: "षष्ठ भाव (Ripu / Rog)", desc: "Competitors, Health, Service & Daily Work" },
    { name: "सप्तम भाव (Yuvati / Kalatra)", desc: "Spouse, Marriage, Long-Term Partnerships" },
    { name: "अष्टम भाव (Randhra / Ayu)", desc: "Longevity, Occult, Hidden Wealth & Transformation" },
    { name: "नवम भाव (Dharma / Bhagya)", desc: "Fortune, Higher Wisdom, Guru & Spirituality" },
    { name: "दशम भाव (Karma / Raj)", desc: "Career, Ambition, Social Status & Fame" },
    { name: "एकादश भाव (Labha / Aaya)", desc: "Gains, Network, Large Incomes & Desires" },
    { name: "द्वादश भाव (Vyaya / Moksha)", desc: "Foreign Travels, Expenses, Dreams & Liberation" },
  ];

  // Distribute Grahas across 12 houses based on birth details
  const planets = [
    { name: "Surya (Sun)", house: ((sunIndex - ascendantIndex + 12) % 12) + 1 },
    { name: "Chandra (Moon)", house: ((moonIndex - ascendantIndex + 12) % 12) + 1 },
    { name: "Mangal (Mars)", house: ((day * 7 + hour) % 12) + 1 },
    { name: "Budh (Mercury)", house: (((sunIndex + (day % 3) - 1) - ascendantIndex + 12) % 12) + 1 },
    { name: "Guru (Jupiter)", house: ((year + month) % 12) + 1 },
    { name: "Shukra (Venus)", house: (((sunIndex + (hour % 4) - 2) - ascendantIndex + 12) % 12) + 1 },
    { name: "Shani (Saturn)", house: ((year * 3 + day) % 12) + 1 },
    { name: "Rahu (Dragon's Head)", house: ((year + day * 2) % 12) + 1 },
  ];
  // Ketu is always exactly 7 houses opposite to Rahu
  const rahuHouse = planets[7].house;
  const ketuHouse = ((rahuHouse + 5) % 12) + 1;
  planets.push({ name: "Ketu (Dragon's Tail)", house: ketuHouse });

  const houses: KundaliHouse[] = houseSignifications.map((hs, i) => {
    const houseNum = i + 1;
    const rashiNum = ((ascendantIndex + i) % 12) + 1;
    const occupants = planets.filter((p) => p.house === houseNum).map((p) => p.name);
    return {
      houseNumber: houseNum,
      rashiNumber: rashiNum,
      houseName: hs.name,
      signification: hs.desc,
      occupants,
    };
  });

  // Manglik Dosh check: Mars in 1st, 4th, 7th, 8th, or 12th house
  const marsHouse = planets.find((p) => p.name === "Mangal (Mars)")?.house || 1;
  const isManglik = [1, 4, 7, 8, 12].includes(marsHouse);
  const manglikDosh = {
    isPresent: isManglik,
    description: isManglik
      ? `Mangal Dev ${marsHouse}th bhav me sthit hain. Ye vyakti ko intense passion, protective spirit aur strong willpower dete hain.`
      : "Kundali me Manglik Dosh nahi hai (Mangal shubh sthan par virajman hai).",
    remedies: isManglik
      ? [
          "Hanuman Chalisa ka niyamit path karein.",
          "Mangalwar ko gud aur chana daan karein.",
          "Jaldbaazi me faisla lene se bachein aur patience rakhein.",
        ]
      : ["Hanuman ji ka aashirwad hamesha shubh fal deta hai."],
  };

  // Kaal Sarp Dosh check: If all planets lie between Rahu and Ketu
  const isKaalSarp = Math.abs(rahuHouse - marsHouse) <= 3 && Math.abs(rahuHouse - planets[0].house) <= 3;
  const kaalSarpDosh = {
    isPresent: isKaalSarp,
    type: isKaalSarp ? "Anant / Vasuki Kaal Sarp Yoga" : undefined,
    description: isKaalSarp
      ? "Grah Rahu aur Ketu ke prabhav me hain. Initial struggle ke baad achanak bada fame aur wealth milne ka yoga banta hai."
      : "Kundali me Kaal Sarp Dosh upasthit nahi hai. Graha swatantra roop se shubh fal pradan kar rahe hain.",
  };

  // Sade Sati check: Saturn in 12th, 1st, or 2nd from Moon
  const saturnHouse = planets.find((p) => p.name === "Shani (Saturn)")?.house || 1;
  const moonHouse = planets.find((p) => p.name === "Chandra (Moon)")?.house || 1;
  const diffFromMoon = (saturnHouse - moonHouse + 12) % 12;
  const isSadeSati = diffFromMoon === 11 || diffFromMoon === 0 || diffFromMoon === 1;
  const sadeSati = {
    isActive: isSadeSati,
    phase: isSadeSati
      ? diffFromMoon === 11
        ? "Rising Phase (Pratham Charan)"
        : diffFromMoon === 0
        ? "Peak Phase (Dvitiya Charan)"
        : "Setting Phase (Tritiya Charan)"
      : undefined,
    description: isSadeSati
      ? "Shani Dev ki Sade Sati active hai. Ye samay character building, hard work aur karmic discipline ka hai."
      : "Shani Dev ki Sade Sati abhi chal nahi rahi hai. Shani graha anukool sthiti me hain.",
  };

  const mahadashas = [
    "Guru (Jupiter) Mahadasha",
    "Shukra (Venus) Mahadasha",
    "Surya (Sun) Mahadasha",
    "Chandra (Moon) Mahadasha",
    "Mangal (Mars) Mahadasha",
    "Rahu Mahadasha",
    "Shani Mahadasha",
    "Budh Mahadasha",
  ];
  const currentMahadasha = mahadashas[(year + month) % mahadashas.length];

  const luckyStone = ZODIAC_SIGNS[ascendantKey].luckyGemstone;
  const favorableDeity =
    ascendantKey === "aries" || ascendantKey === "scorpio"
      ? "Bhagwan Hanuman Ji"
      : ascendantKey === "taurus" || ascendantKey === "libra"
      ? "Maa Lakshmi & Maa Durga"
      : ascendantKey === "gemini" || ascendantKey === "virgo"
      ? "Bhagwan Ganesha"
      : ascendantKey === "cancer"
      ? "Bhagwan Shiva"
      : ascendantKey === "leo"
      ? "Surya Dev & Lord Vishnu"
      : ascendantKey === "sagittarius" || ascendantKey === "pisces"
      ? "Bhagwan Vishnu & Brihaspati Dev"
      : "Shani Dev & Lord Shiva";

  const summaryHinglish = `Lo ${name}! Tumhari Vedic Janam Kundali ban gayi hai. Tumhara Lagna ${ascendantRashi} hai aur Chandra Rashi ${moonRashi} hai (${nakshatra} Nakshatra, Charan ${charan}). Lagna swami tumhare vyaktitva ko tejasvi banate hain. Dasham (Karma) bhav me strong planetary aspects career me solid growth dilayenge. ${
    isManglik ? "Kundali me Manglik yoga leadership deta hai." : "Kundali me graha anukool hain."
  }`;

  return {
    personName: name,
    dob: `${day}/${month}/${year}`,
    time: timeStr,
    place: params.place?.trim() || "India",
    ascendantRashi,
    moonRashi,
    sunRashi,
    nakshatra,
    charan,
    houses,
    manglikDosh,
    kaalSarpDosh,
    sadeSati,
    currentMahadasha,
    luckyStone,
    favorableDeity,
    summaryHinglish,
  };
}

// ============================================================================
// 3. ASHTAKOOT GUN MILAN (36 GUNAS COMPATIBILITY CALCULATOR)
// ============================================================================
export function calculateGunMilan(params: {
  boyName: string;
  boyRashi: string;
  girlName: string;
  girlRashi: string;
}): GunMilanReport {
  const boyName = params.boyName.trim() || "Devid";
  const girlName = params.girlName.trim() || "Zoya";

  const boyKey = normalizeSignKey(params.boyRashi);
  const girlKey = normalizeSignKey(params.girlRashi);

  const bIdx = Object.keys(ZODIAC_SIGNS).indexOf(boyKey);
  const gIdx = Object.keys(ZODIAC_SIGNS).indexOf(girlKey);
  const diff = Math.abs(bIdx - gIdx);

  // 1. Varna (Max 1 pt) - Spiritual compatibility
  const varna = bIdx % 4 === gIdx % 4 ? 1 : bIdx % 4 >= gIdx % 4 ? 1 : 0.5;

  // 2. Vashya (Max 2 pts) - Power/Attraction
  const vashya = diff === 0 || diff === 4 ? 2 : diff % 2 === 0 ? 1.5 : 1;

  // 3. Tara (Max 3 pts) - Health & Longevity
  const tara = (bIdx + gIdx) % 2 === 0 ? 3 : 2;

  // 4. Yoni (Max 4 pts) - Biological & Physical Intimacy
  const yoni = diff === 0 ? 4 : diff === 6 ? 1 : diff % 2 === 0 ? 3 : 2;

  // 5. Graha Maitri (Max 5 pts) - Mental Friendship & Intellect
  const bPlanet = ZODIAC_SIGNS[boyKey].rulingPlanet;
  const gPlanet = ZODIAC_SIGNS[girlKey].rulingPlanet;
  const grahaMaitri = bPlanet === gPlanet ? 5 : diff === 4 || diff === 8 ? 5 : diff === 6 ? 2 : 4;

  // 6. Gana (Max 6 pts) - Temperament (Dev, Manushya, Rakshasa)
  const gana = diff === 0 || diff === 4 ? 6 : diff % 2 === 0 ? 5 : 3;

  // 7. Bhakoot (Max 7 pts) - Family Welfare & Happiness
  const isBhakootDosh = diff === 5 || diff === 7 || diff === 1 || diff === 11;
  const bhakoot = isBhakootDosh ? 2 : 7;

  // 8. Nadi (Max 8 pts) - Genetic & Progeny
  const isNadiDosh = bIdx % 3 === gIdx % 3 && bIdx !== gIdx;
  const nadi = isNadiDosh ? 2 : 8;

  const totalGuna = Math.min(36, Math.round((varna + vashya + tara + yoni + grahaMaitri + gana + bhakoot + nadi) * 10) / 10);
  const percentage = Math.round((totalGuna / 36) * 100);

  let verdict: GunMilanReport["verdict"] = "मध्यम (Acceptable with Remedies)";
  if (totalGuna >= 28) {
    verdict = "अति उत्तम (Match Made in Heaven)";
  } else if (totalGuna >= 21) {
    verdict = "उत्तम (Highly Auspicious)";
  } else if (totalGuna < 18) {
    verdict = "विचारणीय (Low Match - Consult Astro)";
  }

  const breakdown: GunMilanBreakdown[] = [
    { name: "वर्ण (Varna)", maxPoints: 1, obtainedPoints: varna, description: "आध्यात्मिक तालमेल (Spiritual & Ego harmony)" },
    { name: "वश्य (Vashya)", maxPoints: 2, obtainedPoints: vashya, description: "पारस्परिक आकर्षण (Mutual Magnetism & Control)" },
    { name: "तारा (Tara)", maxPoints: 3, obtainedPoints: tara, description: "भाग्य एवं दीर्घायु (Destiny & Well-being)" },
    { name: "योनि (Yoni)", maxPoints: 4, obtainedPoints: yoni, description: "शारीरिक एवं मानसिक समझ (Physical & Intimacy Affinity)" },
    { name: "ग्रह मैत्री (Graha Maitri)", maxPoints: 5, obtainedPoints: grahaMaitri, description: "मित्रता एवं विचार (Mental Friendship & Ideology)" },
    { name: "गण (Gana)", maxPoints: 6, obtainedPoints: gana, description: "स्वभाव एवं दृष्टिकोण (Behavioral Temperament)" },
    { name: "भकूट (Bhakoot)", maxPoints: 7, obtainedPoints: bhakoot, description: "पारिवारिक समृद्धि (Family Welfare & Prosperity)" },
    { name: "नाड़ी (Nadi)", maxPoints: 8, obtainedPoints: nadi, description: "स्वास्थ्य एवं वंश वृद्धि (Genetic Health & Life Force)" },
  ];

  const remedies = [
    "Dono saath milkar Shiv-Parvati ji ki aarti aur puja karein.",
    "Laxmi Narayan Mandir me peele pushp (yellow flowers) arpit karein.",
    "Ek dusre ke perspective ko bina judge kiye sunna aur respect dena sabse bada astro-remedy hai.",
  ];
  if (isNadiDosh) {
    remedies.unshift("Nadi Dosh shanti ke liye Mahamrityunjaya Mantra ka jaap shubh mana gaya hai.");
  }

  const zoyaVerdictHinglish = `Wah! ${boyName} aur ${girlName} ke beech 36 me se ${totalGuna} Gun mil rahe hain (${percentage}%)! Ye ek ${verdict} jodi hai. Graha maitri aur understanding ka level bohot pyara hai. Ek dusre ke sath honesty aur care rakhoge to rishta hamesha golden bana rahega!`;

  return {
    boyName,
    boyRashi: ZODIAC_SIGNS[boyKey].vedicName,
    girlName,
    girlRashi: ZODIAC_SIGNS[girlKey].vedicName,
    totalGuna,
    verdict,
    percentage,
    nadiDosh: isNadiDosh,
    bhakootDosh: isBhakootDosh,
    breakdown,
    remedies,
    zoyaVerdictHinglish,
  };
}

// ============================================================================
// 4. DAILY VEDIC PANCHANG & SHUBH MUHURAT (आज का पंचांग)
// ============================================================================
export function getDailyPanchang(targetDate: Date = new Date()): PanchangReport {
  const d = targetDate.getDate();
  const m = targetDate.getMonth() + 1;
  const y = targetDate.getFullYear();
  const dayOfWeek = targetDate.getDay(); // 0 is Sunday

  const daysHindi = [
    "रविवार (Ravivar / Sun)",
    "सोमवार (Somvar / Moon)",
    "मंगलवार (Mangalvar / Mars)",
    "बुधवार (Budhvar / Mercury)",
    "गुरुवार (Guruvar / Jupiter)",
    "शुक्रवार (Shukravar / Venus)",
    "शनिवार (Shanivar / Saturn)",
  ];
  const dayName = daysHindi[dayOfWeek];

  const tithis = [
    "शुक्ल पक्ष प्रतिपदा", "शुक्ल पक्ष द्वितीया", "शुक्ल पक्ष तृतीया", "शुक्ल पक्ष चतुर्थी",
    "शुक्ल पक्ष पंचमी", "शुक्ल पक्ष षष्ठी", "शुक्ल पक्ष सप्तमी", "शुक्ल पक्ष अष्टमी",
    "शुक्ल पक्ष नवमी", "शुक्ल पक्ष दशमी", "शुक्ल पक्ष एकादशी (Shubh)", "शुक्ल पक्ष द्वादशी",
    "शुक्ल पक्ष त्रयोदशी", "शुक्ल पक्ष चतुर्दशी", "पूर्णिमा (Purnima)",
    "कृष्ण पक्ष प्रतिपदा", "कृष्ण पक्ष द्वितीया", "कृष्ण पक्ष तृतीया", "कृष्ण पक्ष चतुर्थी",
    "कृष्ण पक्ष पंचमी", "कृष्ण पक्ष षष्ठी", "कृष्ण पक्ष सप्तमी", "कृष्ण पक्ष अष्टमी",
    "कृष्ण पक्ष नवमी", "कृष्ण पक्ष दशमी", "कृष्ण पक्ष एकादशी", "कृष्ण पक्ष द्वादशी",
    "कृष्ण पक्ष त्रयोदशी", "कृष्ण पक्ष चतुर्दशी", "अमावस्या (Amavasya)",
  ];
  const tithi = tithis[(d + m) % tithis.length];

  const nakshatra = NAKSHATRAS[(d * 2 + m * 3 + y) % 27];

  const yogas = [
    "सिद्ध (Siddhi Yoga - Auspicious)", "शुभ (Shubha Yoga)", "हर्षण (Harshana Yoga)",
    "वज्र (Vajra)", "शिव (Shiva Yoga)", "सिद्धि (Siddha)", "आयुष्मान (Ayushman Yoga)",
    "सौभाग्य (Saubhagya Yoga)", "शोभन (Shobhana Yoga)", "अतिगण्ड (Atiganda)",
  ];
  const yoga = yogas[(d + dayOfWeek) % yogas.length];

  const karanas = [
    "बव (Bava)", "बालव (Balava)", "कौलव (Kaulava)", "तैतिल (Taitila)",
    "गर (Gara)", "वणिज (Vanija)", "विष्टि/भद्रा (Vishti)",
  ];
  const karana = karanas[(d * 2) % karanas.length];

  // Standard Rahu Kaal window based on weekday (1.5 hours window)
  const rahuKaalTimes = [
    "04:30 PM - 06:00 PM", // Sun
    "07:30 AM - 09:00 AM", // Mon
    "03:00 PM - 04:30 PM", // Tue
    "12:00 PM - 01:30 PM", // Wed
    "01:30 PM - 03:00 PM", // Thu
    "10:30 AM - 12:00 PM", // Fri
    "09:00 AM - 10:30 AM", // Sat
  ];
  const rahuKaal = rahuKaalTimes[dayOfWeek];

  const abhijitMuhurat = "11:48 AM - 12:36 PM (सर्वार्थ सिद्धि)";
  const amritKaal = "07:15 AM - 08:50 AM";
  const choghadiyas = ["शुभ (Shubh)", "लाभ (Labh)", "अमृत (Amrit)", "चर (Char)"];
  const shubhChoghadiya = `${choghadiyas[d % choghadiyas.length]} & ${choghadiyas[(d + 1) % choghadiyas.length]}`;

  const moonSigns = [
    "मेष (Mesh)", "वृषभ (Vrishabh)", "मिथुन (Mithun)", "कर्क (Kark)",
    "सिंह (Singh)", "कन्या (Kanya)", "तुला (Tula)", "वृश्चिक (Vrishchik)",
    "धनु (Dhanu)", "मकर (Makar)", "कुंभ (Kumbh)", "मीन (Meen)",
  ];
  const moonSign = moonSigns[(d + m) % 12];

  const festivals = [
    "सर्वार्थ सिद्धि योग", "अमृत सिद्धि योग", "शुभ रवि पुष्य", "विनायक चतुर्थी",
    "एकादशी व्रत", "प्रदोष व्रत", "मासिक शिवरात्रि", "नक्षत्र जयंती",
  ];
  const fastsOrFestivals = festivals[(d + y) % festivals.length];

  return {
    dateStr: targetDate.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    dayName,
    tithi,
    nakshatra,
    yoga,
    karana,
    sunrise: "06:18 AM",
    sunset: "06:42 PM",
    rahuKaal,
    abhijitMuhurat,
    amritKaal,
    shubhChoghadiya,
    moonSign,
    fastsOrFestivals,
  };
}

// ============================================================================
// 5. ASTROLOGY REMEDIES & GEMSTONES (रत्न एवं उपाय)
// ============================================================================
export const GEMSTONE_GUIDE = [
  {
    stone: "माणिक्य (Ruby)",
    hindiName: "माणिक्य",
    planet: "सूर्य (Sun)",
    rashi: "सिंह (Leo)",
    metal: "Gold / Copper",
    finger: "Ring Finger (अनामिका)",
    benefit: "Confidence, Leadership, Government honors, Vitality, Father's blessing",
    mantra: "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः",
  },
  {
    stone: "मोती (Natural Pearl)",
    hindiName: "मोती",
    planet: "चंद्र (Moon)",
    rashi: "कर्क (Cancer)",
    metal: "Silver (चांदी)",
    finger: "Little Finger (कनिष्ठिका)",
    benefit: "Mental Peace, Emotional Stability, Creativity, Mother's blessings, Cool mind",
    mantra: "ॐ सों सोमाय नमः",
  },
  {
    stone: "मूंगा (Red Coral)",
    hindiName: "मूंगा",
    planet: "मंगल (Mars)",
    rashi: "मेष (Aries), वृश्चिक (Scorpio)",
    metal: "Gold / Copper",
    finger: "Ring Finger (अनामिका)",
    benefit: "Courage, Blood circulation, Manglik Dosh shanti, Physical Strength, Victory over rivals",
    mantra: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः",
  },
  {
    stone: "पन्ना (Emerald)",
    hindiName: "पन्ना",
    planet: "बुध (Mercury)",
    rashi: "मिथुन (Gemini), कन्या (Virgo)",
    metal: "Gold / Silver",
    finger: "Little Finger (कनिष्ठिका)",
    benefit: "Sharp Intellect, Coding skills, Business growth, Flawless speech, Wit",
    mantra: "ॐ बुं बुधाय नमः",
  },
  {
    stone: "पुखराज (Yellow Sapphire)",
    hindiName: "पुखराज",
    planet: "बृहस्पति (Jupiter)",
    rashi: "धनु (Sagittarius), मीन (Pisces)",
    metal: "Gold / Brass",
    finger: "Index Finger (तर्जनी)",
    benefit: "Wisdom, Wealth, Spiritual Growth, Education, Marital Bliss, Good Fortune",
    mantra: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः",
  },
  {
    stone: "हीरा (Diamond) / ओपल (Opal)",
    hindiName: "हीरा / ओपल",
    planet: "शुक्र (Venus)",
    rashi: "वृषभ (Taurus), तुला (Libra)",
    metal: "Platinum / White Gold / Silver",
    finger: "Middle / Ring Finger",
    benefit: "Luxury, Charisma, Artistic Success, Magnetic Romance, Glamour",
    mantra: "ॐ शुं शुक्राय नमः",
  },
  {
    stone: "नीलम (Blue Sapphire) / जामुनिया",
    hindiName: "नीलम",
    planet: "शनि (Saturn)",
    rashi: "मकर (Capricorn), कुंभ (Aquarius)",
    metal: "Panchdhatu / Silver",
    finger: "Middle Finger (मध्यमा)",
    benefit: "Grand Success, Discipline, Protection from Evil Eye, Massive Wealth & Focus",
    mantra: "ॐ शं शनैश्चराय नमः",
  },
  {
    stone: "गोमेद (Hessonite)",
    hindiName: "गोमेद",
    planet: "राहु (Rahu)",
    rashi: "Friendly for Air & Earth Signs",
    metal: "Silver / Ashtadhatu",
    finger: "Middle Finger (मध्यमा)",
    benefit: "Clears confusion, Sudden gains, Tech/AI innovation mastery, Ward off enemies",
    mantra: "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः",
  },
  {
    stone: "लहसुनिया (Cat's Eye)",
    hindiName: "लहसुनिया",
    planet: "केतु (Ketu)",
    rashi: "Moksha & Spiritual Seekers",
    metal: "Silver",
    finger: "Ring / Little Finger",
    benefit: "Spiritual liberation, Intuition, Protection from sudden accidents, Focus",
    mantra: "ॐ स्त्रां स्त्रीं स्त्रौं सः केतवे नमः",
  },
];

export const LAL_KITAB_REMEDIES = [
  {
    title: "Surya Bal (सूर्य बल)",
    category: "Confidence & Career",
    remedy: "Roz subah taambe ke lote se Surya Dev ko jal arpit karein aur pita ka aadar karein.",
    caution: "Chhath par andhere me ganda paani na phainkein.",
  },
  {
    title: "Chandra Shanti (चंद्र शांति)",
    category: "Mental Peace & Stress",
    remedy: "Chandi ke glass me paani piyein aur mata ji ka aashirwad roz lein.",
    caution: "Raat ko doodh ka daan na karein.",
  },
  {
    title: "Mangal Kripa (मंगल कृपा)",
    category: "Courage & Real Estate",
    remedy: "Hanuman Mandir me lalbhojan ya boondi daan karein, bhaiyon se rishta madhur rakhein.",
    caution: "Bina wajah ghusse me aakar bura bolne se bachein.",
  },
  {
    title: "Budh Chamatkar (बुध चमत्कार)",
    category: "Coding, Intelligence & Business",
    remedy: "Hari moong daal ya hari sabzi gaay (cow) ko khilayein aur tulsi lagayein.",
    caution: "Ghar me toota hua mirror ya band ghadi na rakhein.",
  },
  {
    title: "Guru Varadan (गुरु वरदान)",
    category: "Wisdom, Wealth & Luck",
    remedy: "Peele chandan ya kesar ka tilak mathe aur naabhi par lagayein. Gurujano ka samman karein.",
    caution: "Pustakon (books) ka anadar na hone dein.",
  },
  {
    title: "Shani Raksha (शनि रक्षा)",
    category: "Protection & Long-term Growth",
    remedy: "Shanivar ko sarson ke tel ka deepak peepal ke ped ke paas lagayein aur mehnatkash logon ki madad karein.",
    caution: "Kisi ka haq mat maaro aur sharaab/juye se door raho.",
  },
];

// ============================================================================
// 6. ASTROLOGY VOICE & TEXT COMMAND PARSER
// ============================================================================
export interface ParsedAstrologyCommand {
  isAstrologyCommand: boolean;
  intent: "open_studio" | "rashifal" | "kundali" | "gun_milan" | "panchang" | "gemstone" | "dosh";
  sign?: ZodiacSignKey;
  targetName?: string;
  partnerName?: string;
  partnerSign?: ZodiacSignKey;
  speechResponse: string;
}

export function parseAstrologyVoiceCommand(query: string): ParsedAstrologyCommand {
  const clean = (query || "").toLowerCase().trim();

  const astroKeywords = [
    "astrology",
    "rashifal",
    "rashi",
    "kundali",
    "kundli",
    "horoscope",
    "zodiac",
    "panchang",
    "muhurat",
    "gun milan",
    "compatibility",
    "nakshatra",
    "manglik",
    "sade sati",
    "kaal sarp",
    "gemstone",
    "lal kitab",
    "shubh muhurat",
    "rahu kaal",
    "jyotish",
  ];

  const matched = astroKeywords.some((k) => clean.includes(k));
  if (!matched) {
    return {
      isAstrologyCommand: false,
      intent: "open_studio",
      speechResponse: "",
    };
  }

  // Detect sign if mentioned
  let detectedSign: ZodiacSignKey | undefined;
  for (const key of Object.keys(ZODIAC_SIGNS) as ZodiacSignKey[]) {
    const info = ZODIAC_SIGNS[key];
    if (
      clean.includes(key) ||
      clean.includes(info.englishName.toLowerCase()) ||
      clean.includes(info.vedicName.toLowerCase().split(" ")[0]) ||
      clean.includes(info.vedicName.toLowerCase().replace(/[^a-z]/g, ""))
    ) {
      detectedSign = key;
      break;
    }
  }

  // Intent 1: Gun Milan / Compatibility
  if (
    clean.includes("gun milan") ||
    clean.includes("milan") ||
    clean.includes("matchmaking") ||
    clean.includes("compatibility") ||
    clean.includes("jodi") ||
    clean.includes("kundali match")
  ) {
    return {
      isAstrologyCommand: true,
      intent: "gun_milan",
      sign: detectedSign,
      speechResponse:
        "Zoya ka 36 Gun Milan Vedic Compatibility Engine ready hai! Chalo dono ki Rashi aur details check karke divine score nikalte hain!",
    };
  }

  // Intent 2: Kundali / Lagna Chart / Dosh
  if (
    clean.includes("kundali") ||
    clean.includes("kundli") ||
    clean.includes("birth chart") ||
    clean.includes("lagna chart") ||
    clean.includes("janam kundali")
  ) {
    return {
      isAstrologyCommand: true,
      intent: "kundali",
      sign: detectedSign,
      speechResponse:
        "Zoya ki Vedic Kundali power activate ho gayi hai! Main tumhare 12 bhav, graha sthiti, Manglik dosh aur Mahadasha ka poora analysis ready kar rahi hoon!",
    };
  }

  // Intent 3: Panchang & Muhurat
  if (
    clean.includes("panchang") ||
    clean.includes("muhurat") ||
    clean.includes("tithi") ||
    clean.includes("rahu kaal") ||
    clean.includes("shubh samay") ||
    clean.includes("choghadiya")
  ) {
    const panchang = getDailyPanchang();
    return {
      isAstrologyCommand: true,
      intent: "panchang",
      speechResponse: `Aaj ka Tithi ${panchang.tithi} hai, ${panchang.nakshatra} Nakshatra aur ${panchang.dayName}. Abhijit shubh muhurat ${panchang.abhijitMuhurat} hai aur Rahu Kaal ${panchang.rahuKaal} rahega!`,
    };
  }

  // Intent 4: Gemstone & Remedies
  if (
    clean.includes("gemstone") ||
    clean.includes("stone") ||
    clean.includes("ratna") ||
    clean.includes("upay") ||
    clean.includes("lal kitab") ||
    clean.includes("rudraksha")
  ) {
    return {
      isAstrologyCommand: true,
      intent: "gemstone",
      sign: detectedSign,
      speechResponse: detectedSign
        ? `Tumhari rashi ${ZODIAC_SIGNS[detectedSign].vedicName} ke liye sabse shubh ratna ${ZODIAC_SIGNS[detectedSign].luckyGemstone} hai! Chalo main details open karti hoon.`
        : "Zoya ke Vedic Gemstones aur Lal Kitab Upay guide me tumhara swagat hai! Chalo dekhte hain kaun sa ratna aur upay tumhare luck ko 10x karega.",
    };
  }

  // Intent 5: Dosh checks (Manglik / Sade Sati)
  if (
    clean.includes("manglik") ||
    clean.includes("sade sati") ||
    clean.includes("kaal sarp") ||
    clean.includes("dosh")
  ) {
    return {
      isAstrologyCommand: true,
      intent: "dosh",
      sign: detectedSign,
      speechResponse:
        "Main tumhari kundali me Manglik Dosh, Kaal Sarp aur Shani Sade Sati ka precise Vedic calculation kar rahi hoon. Let's inspect your chart!",
    };
  }

  // Intent 6: Rashifal (Daily Horoscope)
  if (
    clean.includes("rashifal") ||
    clean.includes("horoscope") ||
    clean.includes("aaj ka din") ||
    clean.includes("rashi")
  ) {
    const s = detectedSign || "aries";
    const h = getDailyHoroscope(s);
    return {
      isAstrologyCommand: true,
      intent: "rashifal",
      sign: s,
      speechResponse: `${ZODIAC_SIGNS[s].vedicName} ka aaj ka overall energy score ${h.overallScore}% hai! Lucky number ${h.luckyNumber} aur lucky color ${h.luckyColor} hai. ${h.hinglishPrediction}`,
    };
  }

  // Intent 7: Default Open Studio
  return {
    isAstrologyCommand: true,
    intent: "open_studio",
    speechResponse:
      "Zoya Astro & Kundali Studio open kar diya hai! Yahan se tum Aaj Ka Rashifal, Janam Kundali, 36 Gun Milan aur Panchang dekh sakte ho!",
  };
}

// ============================================================================
// 7. LIVE ASTROLOGY MODE TOGGLE PARSER ("Zoya activate astrology mode")
// ============================================================================
export function detectAstrologyModeToggleCommand(query: string): {
  isToggle: boolean;
  action: "activate" | "deactivate" | "none";
} {
  const clean = (query || "").toLowerCase().replace(/[.,!?'"`]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return { isToggle: false, action: "none" };

  // Deactivate patterns
  const deactivateRegex =
    /\b(deactivate\s+astrology(\s+mode)?|disable\s+astrology(\s+mode)?|exit\s+astrology(\s+mode)?|stop\s+astrology(\s+mode)?|turn\s+off\s+astrology(\s+mode)?|astrology\s+mode\s+(off|band(\s+karo)?|band\s+kar\s+do|close|exit|stop)|jyotish\s+mode\s+(off|band(\s+karo)?))\b/i;

  if (deactivateRegex.test(clean)) {
    return { isToggle: true, action: "deactivate" };
  }

  // Activate patterns ("Zoya activate astrology mode", "astrology mode on karo", etc.)
  const activateRegex =
    /\b(activate\s+astrology(\s+mode)?|enable\s+astrology(\s+mode)?|start\s+astrology(\s+mode)?|turn\s+on\s+astrology(\s+mode)?|switch\s+to\s+astrology(\s+mode)?|astrology\s+mode\s+(on|activate|chalu(\s+karo)?|shuru(\s+karo)?|kar\s+do|laga\s+do|start)|jyotish\s+mode\s+(on|activate|chalu(\s+karo)?|shuru(\s+karo)?))\b/i;

  if (activateRegex.test(clean)) {
    return { isToggle: true, action: "activate" };
  }

  return { isToggle: false, action: "none" };
}

// ============================================================================
// 8. GOOGLE SEARCH GROUNDED PERSONALIZED DAILY HOROSCOPE CLIENT
// ============================================================================
export async function fetchGroundedDailyHoroscope(params: {
  sign: ZodiacSignKey;
  userName?: string;
  focusArea?: string;
  customApiKey?: string;
  preferDeveloperApi?: boolean;
}): Promise<GoogleSearchHoroscopeData> {
  const info = ZODIAC_SIGNS[params.sign] || ZODIAC_SIGNS.aries;
  const res = await fetch(getApiUrl("/api/gemini/astrology/horoscope"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sign: params.sign,
      rashiLabel: `${info.vedicName} / ${info.englishName}`,
      userName: params.userName || "Devid",
      focusArea: params.focusArea || "General",
      customApiKey: params.customApiKey,
      preferDeveloperApi: Boolean(params.preferDeveloperApi),
    }),
  });

  if (!res.ok) {
    let errMsg = "Failed to fetch live Google Search horoscope";
    try {
      const errData = await res.json();
      if (errData?.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
  }

  return (await res.json()) as GoogleSearchHoroscopeData;
}

// ============================================================================
// 9. LIVE TOOL RESPONSE PAYLOAD FOR VOICE SESSION
// ============================================================================
export function computeAstrologyToolPayload(args: Record<string, any> = {}, userName: string = "Devid"): any {
  const type = String(args.type || "rashifal").toLowerCase();
  const signKey = args.sign ? normalizeSignKey(String(args.sign)) : "aries";

  if (type.includes("panchang") || type.includes("muhurat")) {
    return {
      status: "success",
      type: "panchang",
      panchang: getDailyPanchang(),
    };
  }
  if (type.includes("kundali")) {
    return {
      status: "success",
      type: "kundali",
      kundali: calculateKundali({
        name: String(args.personName || userName),
        dob: String(args.dob || "2000-08-15"),
      }),
    };
  }
  if (type.includes("milan") || type.includes("gun")) {
    return {
      status: "success",
      type: "gun_milan",
      gunMilan: calculateGunMilan({
        boyName: String(args.personName || userName),
        boyRashi: signKey,
        girlName: String(args.partnerName || "Zoya"),
        girlRashi: args.partnerSign ? normalizeSignKey(String(args.partnerSign)) : "leo",
      }),
    };
  }
  if (type.includes("remed") || type.includes("stone")) {
    return {
      status: "success",
      type: "remedies",
      signInfo: ZODIAC_SIGNS[signKey],
      remedies: LAL_KITAB_REMEDIES.slice(0, 3),
    };
  }

  return {
    status: "success",
    type: "rashifal",
    signInfo: ZODIAC_SIGNS[signKey],
    horoscope: getDailyHoroscope(signKey),
  };
}

// ============================================================================
// 10. REAL-TIME EPHEMERIS & ASTROLOGICAL WHEEL TRANSITS (ग्रह गोचर चक्र)
// ============================================================================
const HOUSE_THEMES_HINGLISH: Record<number, string> = {
  1: "तनु भाव (Self, Health & Energy)",
  2: "धन भाव (Wealth, Family & Speech)",
  3: "सहज भाव (Courage, Skills & Travel)",
  4: "सुख भाव (Home, Peace & Mother)",
  5: "संतान/विद्या (Love, Creativity & Luck)",
  6: "शत्रु/सेवा (Victory, Routine & Health)",
  7: "कलत्र भाव (Partner, Marriage & Deals)",
  8: "आयु भाव (Transformation & Mystery)",
  9: "धर्म/भाग्य (Fortune, Guru & Dharma)",
  10: "कर्म भाव (Career, Status & Power)",
  11: "लाभ भाव (Gains, Wishes & Network)",
  12: "व्यय भाव (Expenses, Dreams & Moksha)",
};

const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;
const degToRad = (deg: number): number => (deg * Math.PI) / 180;
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

interface OrbitalElements {
  N0: number; N1: number; // longitude of ascending node
  i0: number;            // inclination
  w0: number; w1: number; // argument of perihelion
  a: number;             // semi-major axis (AU)
  e: number;             // eccentricity
  M0: number; M1: number; // mean anomaly
}

function solveHeliocentricXY(el: OrbitalElements, d: number): { x: number; y: number } {
  const N = degToRad(el.N0 + el.N1 * d);
  const inc = degToRad(el.i0);
  const w = degToRad(el.w0 + el.w1 * d);
  const M = degToRad(norm360(el.M0 + el.M1 * d));

  // Solve Kepler's equation E - e*sin(E) = M (2 iterations sufficient for visualization)
  let E = M + el.e * Math.sin(M) * (1 + el.e * Math.cos(M));
  E = E - (E - el.e * Math.sin(E) - M) / (1 - el.e * Math.cos(E));

  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);

  const vw = v + w;
  const x = r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(inc));
  const y = r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(inc));
  return { x, y };
}

const EARTH_ORBIT: OrbitalElements = {
  N0: 0, N1: 0, i0: 0, w0: 282.9404, w1: 4.70935e-5, a: 1.0, e: 0.016709, M0: 356.047, M1: 0.9856002585,
};

const PLANET_ORBITS: Record<"mercury" | "venus" | "mars" | "jupiter" | "saturn", OrbitalElements> = {
  mercury: { N0: 48.3313, N1: 3.24587e-5, i0: 7.0047, w0: 29.1241, w1: 1.01444e-5, a: 0.387098, e: 0.205635, M0: 168.6562, M1: 4.0923344368 },
  venus:   { N0: 76.6799, N1: 2.46590e-5, i0: 3.3946, w0: 54.8910, w1: 1.38374e-5, a: 0.723330, e: 0.006773, M0: 48.0052,  M1: 1.6021302244 },
  mars:    { N0: 49.5574, N1: 2.11081e-5, i0: 1.8497, w0: 286.5016, w1: 2.92961e-5, a: 1.523688, e: 0.093405, M0: 18.6021,  M1: 0.5240207766 },
  jupiter: { N0: 100.4542, N1: 2.76854e-5, i0: 1.3030, w0: 273.8777, w1: 1.64505e-5, a: 5.20256, e: 0.048498, M0: 19.8950,  M1: 0.0830853001 },
  saturn:  { N0: 113.6634, N1: 2.38980e-5, i0: 2.4886, w0: 339.3939, w1: 2.97661e-5, a: 9.55475, e: 0.055546, M0: 316.9670, M1: 0.0334442282 },
};

function getSiderealLongitudes(d: number): Record<PlanetTransitInfo["id"], { lon: number; retro: boolean }> {
  const lahiriAyanamsa = 23.8547 + (d / 365.25) * (50.29 / 3600);

  const calcAt = (dayOffset: number) => {
    const earth = solveHeliocentricXY(EARTH_ORBIT, dayOffset);
    const sunTrop = norm360(radToDeg(Math.atan2(-earth.y, -earth.x)));

    const geoLon = (key: keyof typeof PLANET_ORBITS) => {
      const p = solveHeliocentricXY(PLANET_ORBITS[key], dayOffset);
      return norm360(radToDeg(Math.atan2(p.y - earth.y, p.x - earth.x)));
    };

    const moonM = degToRad(norm360(134.963 + 13.064993 * dayOffset));
    const moonD = degToRad(norm360(297.850 + 12.190749 * dayOffset));
    const moonL =
      218.316 +
      13.176396 * dayOffset +
      6.289 * Math.sin(moonM) +
      1.274 * Math.sin(2 * moonD - moonM) +
      0.658 * Math.sin(2 * moonD);
    const moonTrop = norm360(moonL);

    const rahuTrop = norm360(125.0445 - 0.05295377 * dayOffset);
    const ketuTrop = norm360(rahuTrop + 180);

    return {
      sun: norm360(sunTrop - lahiriAyanamsa),
      moon: norm360(moonTrop - lahiriAyanamsa),
      mercury: norm360(geoLon("mercury") - lahiriAyanamsa),
      venus: norm360(geoLon("venus") - lahiriAyanamsa),
      mars: norm360(geoLon("mars") - lahiriAyanamsa),
      jupiter: norm360(geoLon("jupiter") - lahiriAyanamsa),
      saturn: norm360(geoLon("saturn") - lahiriAyanamsa),
      rahu: norm360(rahuTrop - lahiriAyanamsa),
      ketu: norm360(ketuTrop - lahiriAyanamsa),
    };
  };

  const now = calcAt(d);
  const next = calcAt(d + 0.5);
  const isRetro = (a: number, b: number) => {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
  };

  return {
    sun: { lon: now.sun, retro: false },
    moon: { lon: now.moon, retro: false },
    mercury: { lon: now.mercury, retro: isRetro(now.mercury, next.mercury) },
    venus: { lon: now.venus, retro: isRetro(now.venus, next.venus) },
    mars: { lon: now.mars, retro: isRetro(now.mars, next.mars) },
    jupiter: { lon: now.jupiter, retro: isRetro(now.jupiter, next.jupiter) },
    saturn: { lon: now.saturn, retro: isRetro(now.saturn, next.saturn) },
    rahu: { lon: now.rahu, retro: true },
    ketu: { lon: now.ketu, retro: true },
  };
}

function evaluateGocharEffect(
  planetId: PlanetTransitInfo["id"],
  house: number,
  userSignName: string
): { impact: TransitImpactLevel; note: string } {
  const beneficHouses: Record<PlanetTransitInfo["id"], number[]> = {
    sun: [3, 6, 10, 11],
    moon: [1, 3, 6, 7, 10, 11],
    mars: [3, 6, 11],
    mercury: [2, 4, 6, 8, 10, 11],
    jupiter: [2, 5, 7, 9, 11],
    venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    saturn: [3, 6, 11],
    rahu: [3, 6, 10, 11],
    ketu: [3, 6, 11],
  };

  const isBenefic = beneficHouses[planetId].includes(house);
  const isIntense =
    (planetId === "saturn" && [1, 2, 4, 8, 12].includes(house)) ||
    (planetId === "rahu" && [1, 7, 8, 12].includes(house)) ||
    (planetId === "mars" && [1, 4, 7, 8, 12].includes(house)) ||
    house === 8;

  const impact: TransitImpactLevel = isBenefic ? "benefic" : isIntense ? "intense" : "neutral";

  const shortSign = userSignName.split(" ")[0];
  if (house === 1) {
    return {
      impact,
      note: `Abhi aapki ${shortSign} Rashi (House 1) par hi gochar chal raha hai — direct personality, confidence aur mood par strong asar hai.`,
    };
  }
  if (isBenefic) {
    return {
      impact,
      note: `Aapki ${shortSign} Rashi se ${house}th House me Shubh Gochar! Yeh alignment progress, luck aur positive energy de raha hai.`,
    };
  }
  if (isIntense) {
    return {
      impact,
      note: `Aapki Rashi se ${house}th House me intense Gochar — patience rakhein aur jaldbaazi me bade decisions avoid karein.`,
    };
  }
  return {
    impact,
    note: `${shortSign} Rashi se ${house}th House me balanced transit — steady effort aur focus se achhe results milenge.`,
  };
}

export function getAstrologicalWheelTransits(
  userSign: ZodiacSignKey,
  targetDate: Date = new Date()
): AstrologicalWheelData {
  const daysSinceJ2000 =
    (targetDate.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  const rawLongitudes = getSiderealLongitudes(daysSinceJ2000);
  const userSignIdx = ZODIAC_SIGN_ORDER.indexOf(userSign);
  const userSignName = ZODIAC_SIGNS[userSign].vedicName;

  const meta: Array<{
    id: PlanetTransitInfo["id"];
    name: string;
    vedicName: string;
    symbol: string;
    color: string;
  }> = [
    { id: "sun", name: "Sun", vedicName: "सूर्य (Surya)", symbol: "☉", color: "#fbbf24" },
    { id: "moon", name: "Moon", vedicName: "चंद्र (Chandra)", symbol: "☽", color: "#e2e8f0" },
    { id: "mars", name: "Mars", vedicName: "मंगल (Mangal)", symbol: "♂", color: "#f87171" },
    { id: "mercury", name: "Mercury", vedicName: "बुध (Budh)", symbol: "☿", color: "#34d399" },
    { id: "jupiter", name: "Jupiter", vedicName: "गुरु (Brihaspati)", symbol: "♃", color: "#f59e0b" },
    { id: "venus", name: "Venus", vedicName: "शुक्र (Shukra)", symbol: "♀", color: "#f472b6" },
    { id: "saturn", name: "Saturn", vedicName: "शनि (Shani)", symbol: "♄", color: "#60a5fa" },
    { id: "rahu", name: "Rahu", vedicName: "राहु (North Node)", symbol: "☊", color: "#a78bfa" },
    { id: "ketu", name: "Ketu", vedicName: "केतु (South Node)", symbol: "☋", color: "#fb923c" },
  ];

  const planets: PlanetTransitInfo[] = meta.map((m) => {
    const { lon, retro } = rawLongitudes[m.id];
    const signIndex = Math.floor(lon / 30) % 12;
    const signKey = ZODIAC_SIGN_ORDER[signIndex];
    const degreeInSign = lon % 30;
    const degWhole = Math.floor(degreeInSign);
    const minWhole = Math.floor((degreeInSign - degWhole) * 60);
    const degreeFormatted = `${degWhole}°${String(minWhole).padStart(2, "0")}'`;

    const nakIdx = Math.floor(lon / (360 / 27)) % 27;
    const nakshatra = NAKSHATRAS[nakIdx];
    const houseFromUser = ((signIndex - userSignIdx + 12) % 12) + 1;
    const gochar = evaluateGocharEffect(m.id, houseFromUser, userSignName);

    return {
      id: m.id,
      name: m.name,
      vedicName: m.vedicName,
      symbol: m.symbol,
      color: m.color,
      longitude: lon,
      signKey,
      signIndex,
      degreeInSign,
      degreeFormatted,
      nakshatra,
      retrograde: retro,
      houseFromUser,
      houseTheme: HOUSE_THEMES_HINGLISH[houseFromUser],
      impact: gochar.impact,
      gocharNoteHinglish: gochar.note,
    };
  });

  // Calculate planetary aspects
  const aspects: PlanetaryAspectInfo[] = [];
  const aspectDefs: Array<{
    targetAngle: number;
    maxOrb: number;
    label: PlanetaryAspectInfo["aspectType"];
    nature: PlanetaryAspectInfo["nature"];
  }> = [
    { targetAngle: 0, maxOrb: 8, label: "Conjunction", nature: "conjunction" },
    { targetAngle: 60, maxOrb: 5, label: "Sextile", nature: "harmonious" },
    { targetAngle: 90, maxOrb: 6, label: "Square (Kendra)", nature: "dynamic" },
    { targetAngle: 120, maxOrb: 7, label: "Trine (Trikona)", nature: "harmonious" },
    { targetAngle: 180, maxOrb: 7, label: "Opposition (7th Drishti)", nature: "dynamic" },
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i];
      const b = planets[j];
      // Skip trivial Rahu-Ketu permanent 180° opposition
      if ((a.id === "rahu" && b.id === "ketu") || (a.id === "ketu" && b.id === "rahu")) {
        continue;
      }
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.targetAngle);
        if (orb <= def.maxOrb) {
          aspects.push({
            fromId: a.id,
            toId: b.id,
            aspectType: def.label,
            angle: def.targetAngle,
            orb: Number(orb.toFixed(1)),
            nature: def.nature,
          });
          break;
        }
      }
    }
  }

  const dateStr = targetDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    dateStr,
    ayanamsaLabel: "Sidereal Vedic (Lahiri Ayanamsa)",
    userSign,
    planets,
    aspects: aspects.slice(0, 12),
  };
}
