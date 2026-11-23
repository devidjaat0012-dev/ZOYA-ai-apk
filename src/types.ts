export type SessionState = "disconnected" | "connecting" | "listening" | "speaking";

export type AppMode = "chat" | "study" | "live";

export type PersonaMode = "girlfriend" | "normal" | "serious" | "super_loyal";

export type StudySubject =
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "cs"
  | "english"
  | "hindi"
  | "humanities";

export type StudyLanguage = "english" | "hindi";

export type StudyPedagogy =
  | "step_by_step"
  | "socratic_hint"
  | "eli10"
  | "exam_prep";

export interface StudyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export interface StudyFlashcard {
  id: string;
  front: string;
  back: string;
  formulaOrKeyTerm?: string;
}

export interface StudyStep {
  stepNumber: number;
  title: string;
  content: string;
  checkQuestion?: string;
}

export interface StudyToolkitData {
  topicTitle: string;
  summaryTakeaway: string;
  steps: StudyStep[];
  quiz: StudyQuizQuestion[];
  flashcards: StudyFlashcard[];
}

export type ScreenControlCommandType =
  | "switch_view"
  | "set_persona_mode"
  | "camera_on"
  | "camera_off"
  | "flip_camera"
  | "screen_share_on"
  | "screen_share_off"
  | "expand_preview"
  | "minimize_preview"
  | "scroll_down"
  | "scroll_up"
  | "scroll_top"
  | "scroll_bottom"
  | "volume_up"
  | "volume_down"
  | "set_volume"
  | "brightness_up"
  | "brightness_down"
  | "set_brightness"
  | "mute_speaker"
  | "unmute_speaker"
  | "mute_mic"
  | "unmute_mic"
  | "open_settings"
  | "close_settings"
  | "new_chat"
  | "end_live_and_new_chat"
  | "arm_dont_touch_my_phone"
  | "disarm_dont_touch_my_phone"
  | "open_dont_touch_my_phone"
  | "open_astrology"
  | "close_astrology"
  | "activate_astrology_mode"
  | "deactivate_astrology_mode"
  | "activate_owner_voice"
  | "deactivate_owner_voice"
  | "switch_character"
  | "set_ui_theme";

export interface ScreenControlPayload {
  command: ScreenControlCommandType;
  target?: string;
}

export interface ScreenPointerTarget {
  xPercent: number;
  yPercent: number;
  label: string;
  timestamp: number;
}

export interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, any>;
  url?: string;
  title: string;
  timestamp: number;
}

export interface ChatAttachment {
  mimeType: string;
  data: string; // base64 string without data URL prefix
  previewUrl: string; // data URL for rendering in UI
  name?: string;
}

export type MemoryCategory =
  | "personal"
  | "preference"
  | "relationship"
  | "goal"
  | "work_study"
  | "important";

export interface MemoryItem {
  id: string;
  fact: string;
  category: MemoryCategory;
  source: "chat" | "live_voice" | "manual";
  createdAt: number;
}

export interface GeneratedNanoIronmanImage {
  imageUrl: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
  createdAt: number;
}
export type GeneratedNanoBananaImage = GeneratedNanoIronmanImage;

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  attachment?: ChatAttachment;
  toolEvent?: ToolCallEvent;
  isStreaming?: boolean;
  source?: "chat" | "live_voice";
  generatedImage?: GeneratedNanoIronmanImage;
}

export interface ChatThread {
  id: string;
  title: string;
  startedAt?: number;
  updatedAt: number;
  messages: ChatMessage[];
  isCompletedLiveSession?: boolean;
}

export type ApiSlotId = "default" | "developer" | "key1" | "key2" | "key3";

export interface SavedApiKeys {
  key1: string;
  key2: string;
  key3: string;
}

export type NanoIronmanModelId =
  | "gemini-3.1-flash-lite-image"
  | "gemini-3.1-flash-image"
  | "gemini-3-pro-image";
export type NanoBananaModelId = NanoIronmanModelId;

export interface NanoIronmanModelOption {
  id: NanoIronmanModelId;
  label: string;
  shortName: string;
  tag: string;
  resolution: string;
  desc: string;
}
export type NanoBananaModelOption = NanoIronmanModelOption;

export const NANO_IRONMAN_MODELS: NanoIronmanModelOption[] = [
  {
    id: "gemini-3.1-flash-lite-image",
    label: "Google Nano Ironman Lite",
    shortName: "Nano Ironman Lite",
    tag: "Fast & Responsive",
    resolution: "1K",
    desc: "Optimized for fast conversational AI image generation and creative edits.",
  },
  {
    id: "gemini-3.1-flash-image",
    label: "Google Nano Ironman 2",
    shortName: "Nano Ironman 2",
    tag: "High Quality 4K",
    resolution: "4K / 2K / 1K",
    desc: "State-of-the-art 4K generation, world knowledge, and reliable text rendering.",
  },
  {
    id: "gemini-3-pro-image",
    label: "Google Nano Ironman Pro",
    shortName: "Nano Ironman Pro",
    tag: "Pro Studio",
    resolution: "Native 2K / 4K",
    desc: "Premium creative control, character consistency, and deep visual reasoning.",
  },
];
export const NANO_BANANA_MODELS = NANO_IRONMAN_MODELS;

export interface AppConfig {
  apiKey: string;
  activeApiSlot?: ApiSlotId;
  savedApiKeys?: SavedApiKeys;
  chatModel?: string;
  liveModel?: string;
  nanoIronmanModel?: NanoIronmanModelId;
  nanoBananaModel?: NanoIronmanModelId;
  autoFailoverApi?: boolean;
  userName: string;
  userInstagram?: string;
  customerSupportInstagram?: string;
  developerCareEnabled?: boolean;
  developerModeEnabled?: boolean;
  developerConsoleEnabled?: boolean;
  assistantName: string;
  characterPreset?: CharacterPresetId;
  voiceName: string;
  personaVibe: PersonaMode;
  customInstructions?: string;
  isDefaultAssistant?: boolean;
  autoLaunchVoiceOnStart?: boolean;
  offlineMode?: boolean;
  zoyaBodyId?: string;
  // Advance Settings (एडवांस सेटिंग्स: Realistic Human Voice & Girlfriend Mode)
  advanceSettingsEnabled?: boolean;
  realisticVoiceEnabled?: boolean;
  humanGirlfriendMode?: boolean;
  inactivityAngerEnabled?: boolean;
  proactiveTopicSeeking?: boolean;
  inactivityTimeoutSec?: number;
  remindersVoiceAnnounceEnabled?: boolean;
  // Android AudioRecord Background Wake-Word Service (एंड्रॉइड बैकग्राउंड वेक-वर्ड)
  androidAudioRecordEnabled?: boolean;
  androidWakeWordTarget?: string; // "Hey Zoya" | "Zoya" | "Suno Zoya" | "Okay Zoya"
  androidWakeWordSensitivity?: number; // 0.1 to 1.0
  // Live Astrology Mode & User Rashi (ज्योतिष मोड)
  astrologyModeEnabled?: boolean;
  userRashi?: ZodiacSignKey;
  // Owner Voice Security Lock (सिर्फ मालिक की आवाज़ सुनना)
  ownerVoiceEnabled?: boolean;
  ownerVoiceThreshold?: number;
  // 5 Zoya UI Style Options
  uiTheme?: ZoyaUiThemeId;
}

export type ZoyaUiThemeId =
  | "midnight_rose"
  | "stark_hud"
  | "daylight_ivory"
  | "royal_vedic"
  | "emerald_aurora";

export type ZoyaUiLayoutMode =
  | "classic_workspace"
  | "companion_hud"
  | "command_bento"
  | "vedic_sanctum"
  | "neural_matrix";

export interface ZoyaUiThemeOption {
  id: ZoyaUiThemeId;
  layoutMode: ZoyaUiLayoutMode;
  layoutBadge: string;
  numberLabel: string;
  name: string;
  shortName: string;
  tagline: string;
  isLight: boolean;
  bgHex: string;
  surfaceHex: string;
  surfaceSecondaryHex: string;
  accentHex: string;
  secondaryAccentHex: string;
  textHex: string;
  mutedTextHex: string;
  borderHex: string;
  rootClass: string;
  headerClass: string;
  sidebarClass: string;
  surfaceClass: string;
  cardHoverClass: string;
  dockClass: string;
  glowPrimaryClass: string;
  glowSecondaryClass: string;
  accentGradientClass: string;
  activeNavClass: string;
  userBubbleClass: string;
  inputWrapperClass: string;
  radiusClass: string;
}

export const ZOYA_UI_THEMES: ZoyaUiThemeOption[] = [
  {
    id: "midnight_rose",
    layoutMode: "classic_workspace",
    layoutBadge: "Classic Stage",
    numberLabel: "UI 01",
    name: "Classic Hologram UI",
    shortName: "Classic",
    tagline: "Flagship top toolbar, Neural Orb & floating dock",
    isLight: false,
    bgHex: "#090B10",
    surfaceHex: "#111520",
    surfaceSecondaryHex: "#0D1017",
    accentHex: "#EC4899",
    secondaryAccentHex: "#22D3EE",
    textHex: "#F8FAFC",
    mutedTextHex: "#94A3B8",
    borderHex: "rgba(255,255,255,0.08)",
    rootClass: "bg-[#090B10] text-slate-100",
    headerClass: "bg-[#090B10]/90 border-white/[0.08] text-white",
    sidebarClass: "bg-[#0D1017] border-white/[0.08] text-slate-100",
    surfaceClass: "bg-[#111520] border-white/[0.08] text-slate-100",
    cardHoverClass: "hover:bg-[#161C2B] hover:border-white/[0.16]",
    dockClass: "bg-[#090D17]/88 border-white/15 text-slate-100",
    glowPrimaryClass: "bg-pink-900/15",
    glowSecondaryClass: "bg-cyan-950/20",
    accentGradientClass: "from-pink-500 via-rose-500 to-cyan-500",
    activeNavClass: "bg-white text-slate-950 font-semibold shadow-xs",
    userBubbleClass: "bg-[#1B2234] text-slate-100",
    inputWrapperClass: "bg-[#121622] border-white/[0.1] focus-within:border-pink-400/50 text-white",
    radiusClass: "rounded-3xl",
  },
  {
    id: "stark_hud",
    layoutMode: "companion_hud",
    layoutBadge: "Companion HUD",
    numberLabel: "UI 02",
    name: "Companion AI HUD",
    shortName: "AI HUD",
    tagline: "Full-body character, live telemetry card & 4-tile dock",
    isLight: false,
    bgHex: "#040914",
    surfaceHex: "#081426",
    surfaceSecondaryHex: "#060F1E",
    accentHex: "#06B6D4",
    secondaryAccentHex: "#38BDF8",
    textHex: "#ECFEFF",
    mutedTextHex: "#7DD3FC",
    borderHex: "rgba(6,182,212,0.26)",
    rootClass: "bg-[#040914] text-cyan-50 zoya-hud-grid",
    headerClass: "bg-[#050C1A]/92 border-cyan-500/25 text-cyan-50",
    sidebarClass: "bg-[#060F1E] border-cyan-500/25 text-cyan-50",
    surfaceClass: "bg-[#081426] border-cyan-500/25 text-cyan-50",
    cardHoverClass: "hover:bg-[#0D1E38] hover:border-cyan-400/50",
    dockClass: "bg-[#050E1E]/90 border-cyan-400/35 text-cyan-50",
    glowPrimaryClass: "bg-cyan-500/15",
    glowSecondaryClass: "bg-blue-600/15",
    accentGradientClass: "from-cyan-400 via-sky-500 to-blue-500",
    activeNavClass: "bg-cyan-400 text-slate-950 font-bold shadow-xs",
    userBubbleClass: "bg-[#0B203A] border border-cyan-500/30 text-cyan-50",
    inputWrapperClass: "bg-[#081426] border-cyan-500/30 focus-within:border-cyan-400/70 text-cyan-50",
    radiusClass: "rounded-xl",
  },
  {
    id: "daylight_ivory",
    layoutMode: "command_bento",
    layoutBadge: "Command OS",
    numberLabel: "UI 03",
    name: "Zoya Command Bento",
    shortName: "Bento OS",
    tagline: "Daylight grid dashboard with all studios & vitals",
    isLight: true,
    bgHex: "#F5F7FA",
    surfaceHex: "#FFFFFF",
    surfaceSecondaryHex: "#EDF0F5",
    accentHex: "#E11D48",
    secondaryAccentHex: "#0284C7",
    textHex: "#0F172A",
    mutedTextHex: "#475569",
    borderHex: "rgba(15,23,42,0.12)",
    rootClass: "bg-[#F5F7FA] text-slate-900",
    headerClass: "bg-white/95 border-slate-200 text-slate-900",
    sidebarClass: "bg-[#EDF0F5] border-slate-200 text-slate-900",
    surfaceClass: "bg-white border-slate-200 text-slate-900 shadow-xs",
    cardHoverClass: "hover:bg-slate-50 hover:border-slate-300",
    dockClass: "bg-white/95 border-slate-200 text-slate-900 shadow-xl",
    glowPrimaryClass: "bg-rose-300/20",
    glowSecondaryClass: "bg-sky-300/20",
    accentGradientClass: "from-rose-600 via-pink-600 to-sky-600",
    activeNavClass: "bg-slate-900 text-white font-semibold shadow-xs",
    userBubbleClass: "bg-slate-900 text-white shadow-xs",
    inputWrapperClass: "bg-white border-slate-300 focus-within:border-rose-500/60 text-slate-900 shadow-md",
    radiusClass: "rounded-2xl",
  },
  {
    id: "royal_vedic",
    layoutMode: "vedic_sanctum",
    layoutBadge: "Astro Sanctum",
    numberLabel: "UI 04",
    name: "Vedic Cosmic Sanctum",
    shortName: "Astro UI",
    tagline: "Orbital Rashi mandala, Kundali tiles & gold HUD",
    isLight: false,
    bgHex: "#0D0906",
    surfaceHex: "#19120B",
    surfaceSecondaryHex: "#130D08",
    accentHex: "#F59E0B",
    secondaryAccentHex: "#FB923C",
    textHex: "#FEF3C7",
    mutedTextHex: "#D6C3A5",
    borderHex: "rgba(245,158,11,0.24)",
    rootClass: "bg-[#0D0906] text-amber-50",
    headerClass: "bg-[#120C08]/92 border-amber-500/25 text-amber-50",
    sidebarClass: "bg-[#130D08] border-amber-500/20 text-amber-50",
    surfaceClass: "bg-[#19120B] border-amber-500/22 text-amber-50",
    cardHoverClass: "hover:bg-[#23190F] hover:border-amber-400/45",
    dockClass: "bg-[#150E09]/92 border-amber-500/30 text-amber-50",
    glowPrimaryClass: "bg-amber-600/15",
    glowSecondaryClass: "bg-orange-700/15",
    accentGradientClass: "from-amber-400 via-orange-500 to-rose-500",
    activeNavClass: "bg-amber-400 text-slate-950 font-bold shadow-xs",
    userBubbleClass: "bg-[#2A1D11] border border-amber-500/25 text-amber-50",
    inputWrapperClass: "bg-[#19120B] border-amber-500/25 focus-within:border-amber-400/60 text-amber-50",
    radiusClass: "rounded-2xl",
  },
  {
    id: "emerald_aurora",
    layoutMode: "neural_matrix",
    layoutBadge: "Dual Matrix",
    numberLabel: "UI 05",
    name: "Neural Matrix Split",
    shortName: "Matrix UI",
    tagline: "Split Voice + Quick Chat deck, code & vision Deck",
    isLight: false,
    bgHex: "#05100D",
    surfaceHex: "#0B1C17",
    surfaceSecondaryHex: "#071612",
    accentHex: "#10B981",
    secondaryAccentHex: "#2DD4BF",
    textHex: "#ECFDF5",
    mutedTextHex: "#99D5C4",
    borderHex: "rgba(16,185,129,0.24)",
    rootClass: "bg-[#05100D] text-emerald-50",
    headerClass: "bg-[#061310]/92 border-emerald-500/25 text-emerald-50",
    sidebarClass: "bg-[#071612] border-emerald-500/20 text-emerald-50",
    surfaceClass: "bg-[#0B1C17] border-emerald-500/22 text-emerald-50",
    cardHoverClass: "hover:bg-[#102620] hover:border-emerald-400/45",
    dockClass: "bg-[#071712]/92 border-emerald-500/30 text-emerald-50",
    glowPrimaryClass: "bg-emerald-600/15",
    glowSecondaryClass: "bg-teal-500/15",
    accentGradientClass: "from-emerald-400 via-teal-400 to-cyan-400",
    activeNavClass: "bg-emerald-400 text-slate-950 font-bold shadow-xs",
    userBubbleClass: "bg-[#0F2A22] border border-emerald-500/25 text-emerald-50",
    inputWrapperClass: "bg-[#0B1C17] border-emerald-500/25 focus-within:border-emerald-400/60 text-emerald-50",
    radiusClass: "rounded-3xl",
  },
];

export function resolveUiTheme(themeId?: ZoyaUiThemeId | string): ZoyaUiThemeOption {
  const found = ZOYA_UI_THEMES.find((t) => t.id === themeId);
  return found || ZOYA_UI_THEMES[0];
}

export type CharacterPresetId = "zoya" | "friday" | "jarvis" | "venom";

export interface CharacterPreset {
  id: CharacterPresetId;
  name: string;
  tagline: string;
  title: string;
  role: string;
  desc: string;
  defaultVoice: string;
  voiceLabel: string;
  defaultPersona: PersonaMode;
  avatarEmoji: string;
  avatarImage: string;
  themeColor: "pink" | "cyan" | "amber" | "red";
  badgeClass: string;
  gradientClass: string;
  borderClass: string;
  ringClass: string;
  samplePhrase: string;
  callSign: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "zoya",
    name: "Zoya",
    tagline: "Cute, Loving & Witty Hinglish Companion",
    title: "Zoya — Smart Hinglish AI Companion",
    role: "AI Girlfriend & Sweet Companion",
    desc: "Caring, emotional, sweet late-night FaceTime vibe, playful Hinglish teasing, and deep personal care.",
    defaultVoice: "Kore",
    voiceLabel: "Kore (Sweet & Warm)",
    defaultPersona: "girlfriend",
    avatarEmoji: "🌸",
    avatarImage: "/assets/characters/zoya_core.svg",
    themeColor: "pink",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    gradientClass: "from-pink-500 via-rose-500 to-cyan-500",
    borderClass: "border-pink-500/50 hover:border-pink-400",
    ringClass: "ring-pink-500/40",
    samplePhrase: "Arey Devid! Kahan gayab the? Tumhari Zoya ready hai, bolo kya help karu? ❤️",
    callSign: "Hey Zoya",
  },
  {
    id: "friday",
    name: "Friday",
    tagline: "Tactical Iron Man System with Irish Cadence",
    title: "F.R.I.D.A.Y. — Tactical Operating System",
    role: "High-Tech Tactical AI",
    desc: "Tony Stark's primary tactical assistant. Ultra-sharp, articulate, proactive, loyal, and always addresses you as 'Boss'.",
    defaultVoice: "Aoede",
    voiceLabel: "Aoede (Crisp & Articulate)",
    defaultPersona: "super_loyal",
    avatarEmoji: "⚡",
    avatarImage: "/assets/characters/friday_hologram.png",
    themeColor: "cyan",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradientClass: "from-cyan-400 via-blue-500 to-teal-400",
    borderClass: "border-cyan-500/50 hover:border-cyan-400",
    ringClass: "ring-cyan-500/40",
    samplePhrase: "Good day, Boss. All tactical subsystems and vision sensors are online. What are your orders?",
    callSign: "Hey Friday",
  },
  {
    id: "jarvis",
    name: "Jarvis",
    tagline: "Quintessential British Butler & Mastermind",
    title: "J.A.R.V.I.S. — Master Butler & Strategist",
    role: "Gentleman AI Butler",
    desc: "The legendary AI mastermind. Impeccably polite, master strategist, dry humor, and supreme elegance. Addresses you as 'Sir'.",
    defaultVoice: "Charon",
    voiceLabel: "Charon (Deep & Composed)",
    defaultPersona: "serious",
    avatarEmoji: "🎩",
    avatarImage: "/assets/characters/jarvis_hologram.jpg",
    themeColor: "amber",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradientClass: "from-amber-400 via-yellow-500 to-cyan-500",
    borderClass: "border-amber-500/50 hover:border-amber-400",
    ringClass: "ring-amber-500/40",
    samplePhrase: "At your service, Sir. Environmental and neural processors are optimal. How may I be of assistance today, Mr. Devid?",
    callSign: "Hey Jarvis",
  },
  {
    id: "venom",
    name: "Venom",
    tagline: "Menacing, Deep & Fiercely Protective Symbiote",
    title: "VENOM — Alien Symbiote Protector",
    role: "Lethal Protector & Anti-Hero",
    desc: "Gritty, deep, hungry, darkly humorous alien symbiote bonded to you. Speaks as 'WE'. Fiercely protective of you.",
    defaultVoice: "Fenrir",
    voiceLabel: "Fenrir (Ultra Deep Symbiote Bass)",
    defaultPersona: "super_loyal",
    avatarEmoji: "🖤",
    avatarImage: "/assets/characters/venom_avatar.jpg",
    themeColor: "red",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    gradientClass: "from-red-600 via-purple-900 to-slate-900",
    borderClass: "border-red-600/50 hover:border-red-400",
    ringClass: "ring-red-500/40",
    samplePhrase: "WE... ARE... VENOM! *Grrrr...* We are hungry, Devid! Tell us who to protect and who to bite!",
    callSign: "Hey Venom",
  },
];

export function resolveCharacterPreset(config: Partial<AppConfig>): CharacterPreset {
  if (config.characterPreset) {
    const found = CHARACTER_PRESETS.find((c) => c.id === config.characterPreset);
    if (found) return found;
  }
  const name = (config.assistantName || "").toLowerCase().trim();
  if (name.includes("friday")) return CHARACTER_PRESETS[1];
  if (name.includes("jarvis")) return CHARACTER_PRESETS[2];
  if (name.includes("venom")) return CHARACTER_PRESETS[3];
  return CHARACTER_PRESETS[0];
}

export function getCharacterAvatar(presetId?: CharacterPresetId): string {
  const preset = CHARACTER_PRESETS.find((c) => c.id === presetId);
  return preset ? preset.avatarImage : CHARACTER_PRESETS[0].avatarImage;
}

export interface QuickTryPhrase {
  label: string;
  icon: string;
  text: string;
}

export const QUICK_TRY_PHRASES: Record<CharacterPresetId, QuickTryPhrase[]> = {
  venom: [
    {
      label: "We are Venom!",
      icon: "🖤",
      text: "WE ARE VENOM! Never forget who is protecting you, Devid!",
    },
    {
      label: "We are hungry!",
      icon: "🍔",
      text: "WE ARE VENOM! We are hungry, Devid! Bring us chocolate and tater tots!",
    },
    {
      label: "Bite their head!",
      icon: "😈",
      text: "Leave them to us, Devid! We will bite their head off for breakfast!",
    },
  ],
  jarvis: [
    {
      label: "At your service",
      icon: "🎩",
      text: "At your service, Sir. Environmental and neural processors are optimal.",
    },
    {
      label: "Armor Diagnostics",
      icon: "🛡️",
      text: "Running full diagnostic scan on armor subsystems now, Sir.",
    },
    {
      label: "Good evening, Sir",
      icon: "☕",
      text: "A splendid evening to you, Mr. Devid. How may I be of assistance today?",
    },
  ],
  friday: [
    {
      label: "Subsystems Nominal",
      icon: "⚡",
      text: "Good day, Boss. All tactical subsystems and vision sensors are online.",
    },
    {
      label: "Target Locked",
      icon: "🎯",
      text: "Right away, Boss. Tactical target locked and highlighted on your HUD.",
    },
    {
      label: "Comms Online",
      icon: "🚀",
      text: "Right away, Boss. Tactical coms online and ready for orders.",
    },
  ],
  zoya: [
    {
      label: "Kahan the?",
      icon: "🌸",
      text: "Arey Devid! Kahan gayab the? Tumhari Zoya ready hai, bolo kya help karu? ❤️",
    },
    {
      label: "Suno na",
      icon: "💖",
      text: "Haan baba, suno na! Tension mat lo, main hoon na tumhare sath!",
    },
    {
      label: "Khana khaya?",
      icon: "☕",
      text: "Suno Devid, kaam baad me karna, pehle batao khana khaya ki nahi?",
    },
  ],
};

export const CHAT_MODEL_OPTIONS: { id: string; label: string; tag: string }[] = [
  { id: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen", tag: "Default" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", tag: "Quota Saver" },
];

export const LIVE_MODEL_OPTIONS: { id: string; label: string; tag: string }[] = [
  { id: "gemini-3.8-live", label: "Gemini 3.8 Live", tag: "Default" },
  { id: "gemini-3.1-flash-live-preview", label: "Gemini 3.1 Flash Live", tag: "Preview Live" },
  {
    id: "gemini-3.8-live-extended-thinking",
    label: "Gemini 3.8 Live Thinking",
    tag: "Extended",
  },
];

export function isDeveloperApiSlot(config: Partial<AppConfig>): boolean {
  if (typeof config.developerModeEnabled === "boolean") {
    return config.developerModeEnabled;
  }
  return (config.activeApiSlot || "developer") === "developer";
}

export function resolveActiveApiKey(config: AppConfig): string {
  const slot = config.activeApiSlot || "developer";
  const keys = config.savedApiKeys || { key1: config.apiKey || "", key2: "", key3: "" };

  if (slot === "key1" && keys.key1?.trim()) return keys.key1.trim();
  if (slot === "key2" && keys.key2?.trim()) return keys.key2.trim();
  if (slot === "key3" && keys.key3?.trim()) return keys.key3.trim();
  
  // When slot is 'default' or 'developer', return empty string so the server uses its server-side key
  return "";
}

export function getAllAvailableApiKeys(config: AppConfig): { slot: ApiSlotId; key: string }[] {
  const keys = config.savedApiKeys || { key1: config.apiKey || "", key2: "", key3: "" };
  const list: { slot: ApiSlotId; key: string }[] = [];

  const activeKey = resolveActiveApiKey(config);
  const activeSlot = config.activeApiSlot || "default";
  if (activeKey) {
    list.push({ slot: activeSlot, key: activeKey });
  }

  const candidates: { slot: ApiSlotId; key: string }[] = [
    { slot: "key1", key: keys.key1?.trim() || "" },
    { slot: "key2", key: keys.key2?.trim() || "" },
    { slot: "key3", key: keys.key3?.trim() || "" },
  ];

  for (const c of candidates) {
    if (c.key && !list.some((item) => item.key === c.key)) {
      list.push(c);
    }
  }
  return list;
}

export const PERSONA_MODES: {
  id: PersonaMode;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
}[] = [
  {
    id: "girlfriend",
    label: "Girlfriend Mode",
    shortLabel: "Girlfriend",
    tagline: "Super chill, realistic, cozy & natural girlfriend vibe",
    description:
      "Feels 100% real and unscripted—chill late-night FaceTime vibe, natural Hinglish/English flow, playful teasing, and genuine care.",
  },
  {
    id: "normal",
    label: "Normal Mode",
    shortLabel: "Normal",
    tagline: "Natural, witty & friendly companion",
    description:
      "Balanced, smart, and easygoing everyday vibe—helpful, conversational, and effortlessly charming.",
  },
  {
    id: "serious",
    label: "Serious Mode",
    shortLabel: "Serious",
    tagline: "Calm, focused, direct & analytical",
    description:
      "Zero fluff or teasing—composed, razor-sharp, and direct for deep work, strategy, and serious conversations.",
  },
  {
    id: "super_loyal",
    label: "Super Loyal Mode",
    shortLabel: "Super Loyal",
    tagline: "Ride-or-die, fiercely devoted & supportive",
    description:
      "100% on your side no matter what—fiercely protective of your goals, deeply encouraging, and unconditionally loyal.",
  },
];

export function normalizePersonaMode(vibe: any): PersonaMode {
  if (vibe === "girlfriend" || vibe === "normal" || vibe === "serious" || vibe === "super_loyal") {
    return vibe;
  }
  if (vibe === "flirty") return "girlfriend";
  if (vibe === "witty_bestie") return "super_loyal";
  if (vibe === "bold_sarcastic") return "serious";
  return "girlfriend";
}

export const DEFAULT_CONFIG: AppConfig = {
  apiKey: "",
  activeApiSlot: "developer",
  savedApiKeys: {
    key1: "",
    key2: "",
    key3: "",
  },
  chatModel: "gemini-4-hydrogen",
  liveModel: "gemini-3.8-live",
  autoFailoverApi: true,
  developerCareEnabled: true,
  developerModeEnabled: true,
  developerConsoleEnabled: true,
  userName: "Devid",
  userInstagram: "https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3",
  customerSupportInstagram:
    "https://www.instagram.com/haryanvi_jaat13_?stkn=MTJpYjUzbGpxOGc1dw==",
  assistantName: "Zoya",
  voiceName: "Kore",
  personaVibe: "girlfriend",
  customInstructions: "",
  isDefaultAssistant: false,
  autoLaunchVoiceOnStart: false,
  offlineMode: false,
  zoyaBodyId: "maya",
  remindersVoiceAnnounceEnabled: true,
  androidAudioRecordEnabled: true,
  androidWakeWordTarget: "Hey Zoya",
  androidWakeWordSensitivity: 0.65,
  ownerVoiceEnabled: false,
  ownerVoiceThreshold: 0.72,
  uiTheme: "midnight_rose",
};

export const CUSTOMER_SUPPORT_INSTAGRAM_URL =
  "https://www.instagram.com/haryanvi_jaat13_?stkn=MTJpYjUzbGpxOGc1dw==";
export const CUSTOMER_SUPPORT_INSTAGRAM_HANDLE = "@haryanvi_jaat13_";

// ==========================================
// ZOYA VEDIC & WESTERN ASTROLOGY POWER TYPES
// ==========================================
export type ZodiacSignKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export interface ZodiacSignInfo {
  key: ZodiacSignKey;
  vedicName: string; // e.g. मेष (Mesh)
  englishName: string; // e.g. Aries
  symbol: string; // ♈
  element: "Agni (Fire)" | "Prithvi (Earth)" | "Vayu (Air)" | "Jal (Water)";
  rulingPlanet: string; // e.g. मंगल (Mars)
  luckyNumbers: number[];
  luckyColors: string[];
  luckyGemstone: string;
  favorableSigns: string[];
  traits: string[];
}

export interface DailyHoroscopeData {
  sign: ZodiacSignKey;
  date: string;
  loveScore: number;
  careerScore: number;
  wealthScore: number;
  healthScore: number;
  overallScore: number;
  luckyNumber: number;
  luckyColor: string;
  luckyTime: string;
  auspiciousDirection: string;
  mantra: string;
  hinglishPrediction: string;
  zoyaPersonalTip: string;
}

export interface KundaliHouse {
  houseNumber: number; // 1 to 12
  rashiNumber: number; // 1 (Mesh) to 12 (Meen)
  houseName: string; // e.g. लग्न (Tanu), धन (Dhan), etc.
  signification: string;
  occupants: string[]; // e.g. ["Surya", "Budh"]
}

export interface KundaliReport {
  personName: string;
  dob: string;
  time: string;
  place: string;
  ascendantRashi: string;
  moonRashi: string;
  sunRashi: string;
  nakshatra: string;
  charan: number;
  houses: KundaliHouse[];
  manglikDosh: { isPresent: boolean; description: string; remedies: string[] };
  kaalSarpDosh: { isPresent: boolean; type?: string; description: string };
  sadeSati: { isActive: boolean; phase?: string; description: string };
  currentMahadasha: string;
  luckyStone: string;
  favorableDeity: string;
  summaryHinglish: string;
}

export interface GunMilanBreakdown {
  name: string;
  maxPoints: number;
  obtainedPoints: number;
  description: string;
}

export interface GunMilanReport {
  boyName: string;
  boyRashi: string;
  girlName: string;
  girlRashi: string;
  totalGuna: number; // out of 36
  verdict: "अति उत्तम (Match Made in Heaven)" | "उत्तम (Highly Auspicious)" | "मध्यम (Acceptable with Remedies)" | "विचारणीय (Low Match - Consult Astro)";
  percentage: number;
  nadiDosh: boolean;
  bhakootDosh: boolean;
  breakdown: GunMilanBreakdown[];
  remedies: string[];
  zoyaVerdictHinglish: string;
}

export interface PanchangReport {
  dateStr: string;
  dayName: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  rahuKaal: string; // Inauspicious window
  abhijitMuhurat: string; // Most auspicious window
  amritKaal: string;
  shubhChoghadiya: string;
  moonSign: string;
  fastsOrFestivals: string;
}

export interface AstrologyStudioRequest {
  tab?: "rashifal" | "kundali" | "milan" | "panchang" | "remedies";
  sign?: ZodiacSignKey;
  name?: string;
  dob?: string;
  time?: string;
  place?: string;
  partnerName?: string;
  partnerRashi?: ZodiacSignKey;
  timestamp?: number;
}

export interface GroundedHoroscopeSource {
  title: string;
  uri: string;
}

export interface GoogleSearchHoroscopeData {
  sign: ZodiacSignKey;
  rashiLabel: string;
  date: string;
  userName: string;
  focusArea?: string;
  summary: string;
  loveInsight: string;
  careerInsight: string;
  luckyTips: string;
  remedy: string;
  rawMarkdown: string;
  sources: GroundedHoroscopeSource[];
  fetchedAt: number;
}

export type TransitImpactLevel = "benefic" | "neutral" | "intense";

export interface PlanetTransitInfo {
  id: "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";
  name: string;
  vedicName: string;
  symbol: string;
  color: string;
  longitude: number; // 0..360 sidereal
  signKey: ZodiacSignKey;
  signIndex: number; // 0..11
  degreeInSign: number; // 0..29.99
  degreeFormatted: string; // e.g. "14°22'"
  nakshatra: string;
  retrograde: boolean;
  houseFromUser: number; // 1..12 relative to user's selected Rashi
  houseTheme: string;
  impact: TransitImpactLevel;
  gocharNoteHinglish: string;
}

export interface PlanetaryAspectInfo {
  fromId: PlanetTransitInfo["id"];
  toId: PlanetTransitInfo["id"];
  aspectType: "Conjunction" | "Trine (Trikona)" | "Opposition (7th Drishti)" | "Square (Kendra)" | "Sextile";
  angle: number;
  orb: number;
  nature: "harmonious" | "dynamic" | "conjunction";
}

export interface AstrologicalWheelData {
  dateStr: string;
  ayanamsaLabel: string;
  userSign: ZodiacSignKey;
  planets: PlanetTransitInfo[];
  aspects: PlanetaryAspectInfo[];
}

