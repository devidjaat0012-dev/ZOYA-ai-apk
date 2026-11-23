import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Lightbulb,
  ListChecks,
  Sparkles,
  ImagePlus,
  Mic,
  MicOff,
  ArrowUp,
  Square,
  Volume2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  HelpCircle,
  Layers,
  GraduationCap,
  X,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AppConfig,
  ChatAttachment,
  ChatMessage,
  StudyLanguage,
  StudyPedagogy,
  StudySubject,
  StudyToolkitData,
  resolveUiTheme,
} from "../types";
import {
  STUDY_PEDAGOGIES,
  STUDY_SUBJECTS,
  generateStudyToolkit,
  streamFlexiStudyChat,
} from "../services/studyService";
import { synthesizeZoyaSpeech } from "../services/chatService";
import { playPCM, stopPCM } from "../utils/audioUtils";
import MarkdownRenderer from "./MarkdownRenderer";
import { useVoiceDictation } from "../hooks/useVoiceDictation";

interface StudyViewProps {
  config: AppConfig;
  volume: number;
  isSpeakerMuted: boolean;
  onRequireApiKey: () => void;
}

const DEFAULT_TOOLKIT: Record<StudySubject, StudyToolkitData> = {
  math: {
    topicTitle: "Derivatives & The Chain Rule",
    summaryTakeaway:
      "The Chain Rule differentiates composite functions by multiplying the derivative of the outer function by the derivative of the inner function: d/dx[f(g(x))] = f'(g(x)) · g'(x).",
    steps: [
      {
        stepNumber: 1,
        title: "Identify the Outer and Inner Functions",
        content:
          "Given h(x) = sin(3x²), treat the outside layer as f(u) = sin(u) and the inside expression as u = g(x) = 3x².",
        checkQuestion: "In (2x + 5)⁴, what is the inner function u?",
      },
      {
        stepNumber: 2,
        title: "Differentiate the Outer Function",
        content:
          "Take the derivative of f(u) = sin(u) with respect to u, leaving the inside untouched: f'(g(x)) = cos(3x²).",
        checkQuestion: "Why do we keep 3x² inside cos(...) at this stage?",
      },
      {
        stepNumber: 3,
        title: "Multiply by the Derivative of the Inner Function",
        content:
          "Differentiate g(x) = 3x² to get g'(x) = 6x. Multiply both parts together: h'(x) = 6x · cos(3x²).",
        checkQuestion: "What would the final derivative of (2x + 5)⁴ be?",
      },
    ],
    quiz: [
      {
        id: "q1",
        question: "What is the derivative of f(x) = (3x + 1)⁵ with respect to x?",
        options: [
          "5(3x + 1)⁴",
          "15(3x + 1)⁴",
          "3(3x + 1)⁴",
          "15x(3x + 1)⁴",
        ],
        correctIndex: 1,
        hint: "Don't forget to multiply the outer power rule result by the derivative of the inner (3x + 1).",
        explanation:
          "Using the Chain Rule: outer derivative is 5(3x + 1)⁴, and inner derivative of (3x + 1) is 3. Multiplying 5 × 3 gives 15(3x + 1)⁴.",
      },
      {
        id: "q2",
        question: "If y = e^(4x), what is dy/dx?",
        options: ["e^(4x)", "4x · e^(4x - 1)", "4e^(4x)", "e^4"],
        correctIndex: 2,
        hint: "The derivative of e^u is e^u · du/dx.",
        explanation:
          "The outer function e^u differentiates to itself (e^(4x)), multiplied by the derivative of 4x which is 4, yielding 4e^(4x).",
      },
      {
        id: "q3",
        question: "When should you apply the Chain Rule instead of only the Power Rule?",
        options: [
          "Whenever two separate functions are added together",
          "When a function is nested inside another function, like f(g(x))",
          "Only when trigonometric functions are present",
          "When dividing two polynomials",
        ],
        correctIndex: 1,
        hint: "Think about composite functions—one operation wrapped around another.",
        explanation:
          "The Chain Rule is specifically designed for composite (nested) functions of the form f(g(x)).",
      },
    ],
    flashcards: [
      {
        id: "f1",
        front: "Chain Rule Formula",
        back: "Differentiate the outer function evaluated at the inner function, then multiply by the derivative of the inner function.",
        formulaOrKeyTerm: "d/dx [f(g(x))] = f'(g(x)) · g'(x)",
      },
      {
        id: "f2",
        front: "Power Chain Rule Shortcut",
        back: "Bring the exponent n down, subtract 1 from the exponent, and multiply by u'.",
        formulaOrKeyTerm: "d/dx [uⁿ] = n · uⁿ⁻¹ · u'",
      },
      {
        id: "f3",
        front: "Derivative of ln(u(x))",
        back: "Take the reciprocal of the inner function u(x) and multiply by its derivative u'(x).",
        formulaOrKeyTerm: "d/dx [ln(u)] = u' / u",
      },
    ],
  },
  physics: {
    topicTitle: "Newton's Laws & Projectile Motion",
    summaryTakeaway:
      "Horizontal and vertical components of projectile motion are independent: horizontal velocity remains constant (ax = 0), while vertical motion accelerates downward due to gravity (ay = -g).",
    steps: [
      {
        stepNumber: 1,
        title: "Resolve Initial Velocity into Components",
        content:
          "Split launch velocity v₀ at angle θ into horizontal v₀x = v₀·cos(θ) and vertical v₀y = v₀·sin(θ).",
        checkQuestion: "Which component stays constant throughout flight (ignoring air resistance)?",
      },
      {
        stepNumber: 2,
        title: "Find Time to Peak Height",
        content:
          "At the highest point of the trajectory, vertical velocity vy = 0. Use vy = v₀y - g·t to solve for t_peak = v₀y / g.",
      },
      {
        stepNumber: 3,
        title: "Calculate Horizontal Range",
        content:
          "Multiply constant horizontal speed v₀x by total flight time t_total: Range R = v₀x · t_total.",
      },
    ],
    quiz: [
      {
        id: "p1",
        question: "At the very top of a projectile's parabolic path, what are its vertical velocity and acceleration?",
        options: [
          "vy = 0, ay = 0",
          "vy = 0, ay = -9.8 m/s²",
          "vy = 9.8 m/s, ay = -9.8 m/s²",
          "vy = v₀, ay = 0",
        ],
        correctIndex: 1,
        hint: "Does gravity ever turn off at the top of the arc?",
        explanation:
          "Vertical velocity momentarily reaches 0 at the peak, but gravity continues pulling downward at -9.8 m/s².",
      },
    ],
    flashcards: [
      {
        id: "pf1",
        front: "Newton's Second Law",
        back: "Net force equals mass times acceleration in the direction of the net force.",
        formulaOrKeyTerm: "ΣF = m · a",
      },
      {
        id: "pf2",
        front: "Vertical Position in Projectile Motion",
        back: "Vertical displacement as a function of time under constant gravitational acceleration.",
        formulaOrKeyTerm: "Δy = v₀y·t - ½·g·t²",
      },
    ],
  },
  chemistry: {
    topicTitle: "Chemical Equilibrium & Le Chatelier's Principle",
    summaryTakeaway:
      "When a system at dynamic equilibrium experiences a disturbance (concentration, temperature, or pressure), it shifts in the direction that counteracts the disturbance.",
    steps: [
      {
        stepNumber: 1,
        title: "Write the Reversible Reaction & Heat Term",
        content:
          "Identify reactants vs products and whether the forward reaction is exothermic (heat is a product) or endothermic (heat is a reactant).",
      },
      {
        stepNumber: 2,
        title: "Identify the Applied Stress",
        content:
          "Determine if concentration was added/removed, temperature was raised/lowered, or volume/pressure was changed.",
      },
      {
        stepNumber: 3,
        title: "Predict the Shift Direction",
        content:
          "Adding a species shifts away from that side; removing a species shifts toward that side; decreasing volume shifts toward fewer moles of gas.",
      },
    ],
    quiz: [
      {
        id: "c1",
        question: "For N₂(g) + 3H₂(g) ⇌ 2NH₃(g) + Heat, what happens if you increase the pressure by decreasing volume?",
        options: [
          "Shifts left toward reactants (4 moles of gas)",
          "Shifts right toward products (2 moles of gas)",
          "No shift occurs",
          "Equilibrium constant Kc increases",
        ],
        correctIndex: 1,
        hint: "Count total moles of gas on the left (1 + 3 = 4) versus the right (2).",
        explanation:
          "Increasing pressure favors the side with fewer moles of gas to relieve pressure—shifting right toward 2 moles of NH₃.",
      },
    ],
    flashcards: [
      {
        id: "cf1",
        front: "Equilibrium Constant Expression",
        back: "Ratio of product concentrations to reactant concentrations raised to their stoichiometric coefficients (excluding pure solids and liquids).",
        formulaOrKeyTerm: "Kc = [Products]^p / [Reactants]^r",
      },
    ],
  },
  biology: {
    topicTitle: "Hemoglobin Oxygen Transport & The Bohr Effect",
    summaryTakeaway:
      "Higher CO₂ and lower pH (more acidic conditions in active muscles) decrease hemoglobin's affinity for oxygen, shifting the dissociation curve right to unload more O₂ where it is needed most.",
    steps: [
      {
        stepNumber: 1,
        title: "Oxygen Loading in the Lungs",
        content:
          "High partial pressure of O₂ (pO₂) and higher pH in pulmonary capillaries cause hemoglobin to bind oxygen cooperatively.",
      },
      {
        stepNumber: 2,
        title: "Metabolic CO₂ Production in Exercising Tissues",
        content:
          "Active cells release CO₂, which reacts with water via carbonic anhydrase: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻, lowering blood pH.",
      },
      {
        stepNumber: 3,
        title: "Rightward Curve Shift (Unloading)",
        content:
          "H⁺ ions bind to hemoglobin, stabilizing the deoxy state and releasing O₂ directly into metabolically active tissues.",
      },
    ],
    quiz: [
      {
        id: "b1",
        question: "How does intense exercise affect the oxygen-hemoglobin dissociation curve in skeletal muscle capillaries?",
        options: [
          "Shifts the curve to the left, holding onto O₂ tightly",
          "Shifts the curve to the right, promoting O₂ unloading to tissues",
          "Has no effect on hemoglobin affinity",
          "Increases blood pH to 7.8",
        ],
        correctIndex: 1,
        hint: "Exercising muscles need MORE oxygen released to them, triggered by elevated CO₂ and H⁺.",
        explanation:
          "Increased CO₂, H⁺ (lower pH), and temperature shift the dissociation curve to the right (the Bohr effect), enhancing oxygen delivery.",
      },
    ],
    flashcards: [
      {
        id: "bf1",
        front: "The Bohr Effect Equation",
        back: "Increased protons (H⁺) push the equilibrium toward releasing free oxygen into tissues.",
        formulaOrKeyTerm: "Hb(O₂)₄ + H⁺ ⇌ HbH⁺ + 4O₂",
      },
    ],
  },
  cs: {
    topicTitle: "Big-O Time Complexity & Dynamic Programming",
    summaryTakeaway:
      "Dynamic Programming optimizes exponential recursive problems (like O(2ⁿ)) down to polynomial or linear time (O(n)) by storing and reusing solutions to overlapping subproblems.",
    steps: [
      {
        stepNumber: 1,
        title: "Identify Overlapping Subproblems",
        content:
          "Check if naive recursion recomputes the exact same inputs repeatedly (e.g. fib(3) called many times inside fib(6)).",
      },
      {
        stepNumber: 2,
        title: "Define the State & Memoization Table",
        content:
          "Create a cache/array dp[i] representing the optimal answer for subproblem size i.",
      },
      {
        stepNumber: 3,
        title: "Write the State Transition Recurrence",
        content:
          "Express dp[i] in terms of already-computed smaller states, e.g. dp[i] = dp[i-1] + dp[i-2].",
      },
    ],
    quiz: [
      {
        id: "cs1",
        question: "What does memoization reduce the time complexity of recursive Fibonacci from and to?",
        options: [
          "From O(n²) to O(log n)",
          "From O(2ⁿ) to O(n)",
          "From O(n!) to O(n²)",
          "From O(n) to O(1)",
        ],
        correctIndex: 1,
        hint: "Each state from 1 to n is computed only once and looked up in O(1) time.",
        explanation:
          "Without memoization, binary recursion branches grow as O(2ⁿ). Caching each of the n states reduces runtime to O(n).",
      },
    ],
    flashcards: [
      {
        id: "csf1",
        front: "Binary Search Time Complexity",
        back: "Halving the search space on each comparison yields logarithmic time complexity.",
        formulaOrKeyTerm: "T(n) = O(log n)",
      },
    ],
  },
  english: {
    topicTitle: "Active & Passive Voice, Tenses & Essay Writing",
    summaryTakeaway:
      "In Active Voice, the subject performs the action (Subject + Verb + Object), whereas in Passive Voice, the object receives the action (Object + Auxiliary 'be' + Past Participle V3 + by Subject).",
    steps: [
      {
        stepNumber: 1,
        title: "Identify Subject, Verb, and Object (SVO)",
        content:
          "In 'Devid wrote a brilliant essay', 'Devid' is the Subject, 'wrote' is Past Simple Verb (V2), and 'a brilliant essay' is the Object.",
        checkQuestion: "What is the object in 'Zoya explains English grammar'?",
      },
      {
        stepNumber: 2,
        title: "Swap Object to the Front & Match Tense of 'Be'",
        content:
          "Move the object to the subject position and add the matching form of 'to be' (is/am/are for Present, was/were for Past, has/have been for Perfect).",
        checkQuestion: "Which 'be' verb matches Past Simple ('wrote') for a singular object?",
      },
      {
        stepNumber: 3,
        title: "Convert Main Verb to Past Participle (V3)",
        content:
          "Replace the main verb with its V3 form and add 'by + agent': 'A brilliant essay was written by Devid.'",
      },
    ],
    quiz: [
      {
        id: "eng1",
        question: "Choose the correct Passive Voice of: 'She is writing a letter.'",
        options: [
          "A letter was written by her.",
          "A letter is being written by her.",
          "A letter has been written by her.",
          "A letter is written by her.",
        ],
        correctIndex: 1,
        hint: "Present Continuous ('is writing') uses 'is/are + being + V3' in Passive Voice.",
        explanation:
          "For Present Continuous tense, the passive structure is: Object + is/am/are + being + V3 (past participle) + by Subject.",
      },
      {
        id: "eng2",
        question: "Identify the correct sentence in Present Perfect Continuous Tense:",
        options: [
          "I am studying since morning.",
          "I have been studying since morning.",
          "I had studied since morning.",
          "I study since morning.",
        ],
        correctIndex: 1,
        hint: "Actions that started in the past and are still continuing with 'since/for' use have/has been + V-ing.",
        explanation:
          "'Have been studying' (Present Perfect Continuous) is used with 'since morning' to show an action that began in the past and continues in the present.",
      },
    ],
    flashcards: [
      {
        id: "engf1",
        front: "Passive Voice Formula (Present Continuous)",
        back: "Move object to front, add is/am/are + being + Past Participle (V3).",
        formulaOrKeyTerm: "Object + is/am/are + being + V3 + by Subject",
      },
      {
        id: "engf2",
        front: "Since vs. For in Perfect Tenses",
        back: "Use 'Since' for a specific point in time (since Monday, since 2020) and 'For' for a duration of time (for 3 hours, for 5 days).",
        formulaOrKeyTerm: "Since = Point in Time | For = Duration",
      },
    ],
  },
  hindi: {
    topicTitle: "हिंदी व्याकरण: समास, संधि और अलंकार (Hindi Grammar Mastery)",
    summaryTakeaway:
      "दो या दो से अधिक शब्दों के मेल से नया सार्थक शब्द बनाने की प्रक्रिया को 'समास' (Compound) कहते हैं, जबकि दो वर्णों (ध्वनियों) के मेल से होने वाले विकार को 'संधि' कहते हैं।",
    steps: [
      {
        stepNumber: 1,
        title: "संधि और समास में मुख्य अंतर समझें",
        content:
          "संधि में दो वर्णों (अक्षरों की ध्वनियों) का मेल होता है (जैसे: विद्या + आलय = विद्यालय), जबकि समास में दो पदों (शब्दों) का संक्षिप्तीकरण होता है (जैसे: राजा का पुत्र = राजपुत्र)।",
        checkQuestion: "'नीलकमल' में संधि है या समास?",
      },
      {
        stepNumber: 2,
        title: "समास के 6 प्रमुख भेद पहचानें",
        content:
          "1. अव्ययीभाव (पहला पद प्रधान/अव्यय, जैसे- यथाशक्ति), 2. तत्पुरुष (कारक चिह्न का लोप, जैसे- देशभक्ति), 3. कर्मधारय (विशेषण-विशेष्य), 4. द्विगु (पहला पद संख्यावाचक, जैसे- चौराहा), 5. द्वंद्व (दोनों पद प्रधान, जैसे- माता-पिता), 6. बहुव्रीहि (तीसरा विशेष अर्थ, जैसे- दशानन)।",
      },
      {
        stepNumber: 3,
        title: "प्रमुख अलंकार (शब्दालंकार व अर्थालंकार)",
        content:
          "अनुप्रास (वर्ण की आवृत्ति), यमक (एक शब्द दो बार, अर्थ अलग-अलग: 'कनक-कनक'), उपमा (तुलना: 'सा/सी/सम'), और रूपक (उपमेय में उपमान का अभेद आरोप)।",
      },
    ],
    quiz: [
      {
        id: "hin1",
        question: "'चौराहा' (चार राहों का समूह) शब्द में कौन-सा समास है?",
        options: [
          "द्वंद्व समास",
          "द्विगु समास",
          "बहुव्रीहि समास",
          "अव्ययीभाव समास",
        ],
        correctIndex: 1,
        hint: "जिस समास का पहला पद संख्यावाचक (Number) हो और समूह का बोध कराए, उसे क्या कहते हैं?",
        explanation:
          "'चौराहा' में पहला पद 'चौ' (चार) संख्यावाचक विशेषण है, इसलिए यहाँ द्विगु समास है।",
      },
      {
        id: "hin2",
        question: "'कनक-कनक ते सौ गुनी मादकता अधिकाय' पंक्ति में कौन-सा अलंकार है?",
        options: [
          "अनुप्रास अलंकार",
          "यमक अलंकार",
          "उपमा अलंकार",
          "श्लेष अलंकार",
        ],
        correctIndex: 1,
        hint: "यहाँ 'कनक' शब्द दो बार आया है और दोनों बार उसका अर्थ अलग है (सोना और धतूरा)।",
        explanation:
          "जब एक ही शब्द एक से अधिक बार आए और हर बार उसका अर्थ भिन्न हो, तो वहाँ यमक अलंकार होता है।",
      },
    ],
    flashcards: [
      {
        id: "hinf1",
        front: "द्विगु बनाम द्वंद्व समास",
        back: "द्विगु समास में पहला पद संख्यावाचक होता है (जैसे- तिरंगा, पंचवटी); द्वंद्व समास में दोनों पद प्रधान होते हैं और बीच में 'और' का लोप होता है (जैसे- दिन-रात)।",
        formulaOrKeyTerm: "द्विगु = संख्या | द्वंद्व = दोनों पद प्रधान",
      },
      {
        id: "hinf2",
        front: "दीर्घ स्वर संधि का सूत्र",
        back: "जब ह्रस्व या दीर्घ अ, इ, उ के बाद समान स्वर आए तो दोनों मिलकर दीर्घ (आ, ई, ऊ) हो जाते हैं।",
        formulaOrKeyTerm: "अ + अ = आ (हिम + आलय = हिमालय)",
      },
    ],
  },
  humanities: {
    topicTitle: "Primary Causes & Impacts of the Industrial Revolution",
    summaryTakeaway:
      "The convergence of agricultural enclosure, abundant coal & iron reserves, steam power innovation, and global trade networks transformed agrarian societies into urbanized industrial economies.",
    steps: [
      {
        stepNumber: 1,
        title: "The Agricultural Revolution & Enclosure",
        content:
          "Crop rotation and enclosure acts increased food yields while displacing rural workers, creating a mobile labor force for factory towns.",
      },
      {
        stepNumber: 2,
        title: "Energy Transition: Water to Steam Power",
        content:
          "James Watt's improvements to the steam engine decoupled factories from rivers, enabling dense urban manufacturing hubs near coal fields.",
      },
      {
        stepNumber: 3,
        title: "Social & Economic Transformation",
        content:
          "Rapid urbanization, rise of wage labor and industrial capitalism, railroad expansion, and eventual labor reform movements.",
      },
    ],
    quiz: [
      {
        id: "h1",
        question: "Why did the Industrial Revolution begin in Great Britain in the mid-18th century?",
        options: [
          "Strict government ban on private banking",
          "Abundant domestic coal and iron, navigable waterways, capital, and colonial markets",
          "Lack of any agricultural workforce",
          "Complete isolation from maritime trade",
        ],
        correctIndex: 1,
        hint: "Think about geography, natural resources (coal/iron), and financial institutions.",
        explanation:
          "Britain possessed accessible coal and iron deposits, island waterways, strong property/patent laws, and global trade networks.",
      },
    ],
    flashcards: [
      {
        id: "hf1",
        front: "Watt Steam Engine (1776)",
        back: "Added a separate condenser that drastically reduced fuel consumption and powered textile mills, mines, and locomotives.",
        formulaOrKeyTerm: "Coal → Thermal Energy → Mechanical Work",
      },
    ],
  },
};

export default function StudyView({
  config,
  volume,
  isSpeakerMuted,
  onRequireApiKey,
}: StudyViewProps) {
  const [subject, setSubject] = useState<StudySubject>("math");
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(() => {
    const saved = localStorage.getItem("zoya_study_language_v1");
    return saved === "hindi" ? "hindi" : "english";
  });
  const [pedagogy, setPedagogy] = useState<StudyPedagogy>("step_by_step");
  const [mobilePane, setMobilePane] = useState<"tutor" | "deck">("tutor");
  const [deckTab, setDeckTab] = useState<"steps" | "quiz" | "flashcards">("steps");

  useEffect(() => {
    try {
      localStorage.setItem("zoya_study_language_v1", studyLanguage);
    } catch {}
  }, [studyLanguage]);

  // Study Chat Messages (persisted in localStorage per session)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_study_messages_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "zoya_study_messages_v1",
        JSON.stringify(messages.map((m) => ({ ...m, isStreaming: false })))
      );
    } catch {}
  }, [messages]);

  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);

  // Voice Dictation Hook
  const dictation = useVoiceDictation({
    onTranscriptUpdate: (fullText) => {
      setInputText(fullText);
    },
    defaultLanguage: studyLanguage === "hindi" ? "hi-IN" : "en-IN",
  });

  // Study Toolkit State
  const [toolkit, setToolkit] = useState<StudyToolkitData>(DEFAULT_TOOLKIT.math);
  const [unlockedStepCount, setUnlockedStepCount] = useState<number>(1);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showQuizHint, setShowQuizHint] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; answered: number }>({
    correct: 0,
    answered: 0,
  });
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, number>>({});
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);
  const [masteredCards, setMasteredCards] = useState<Record<string, boolean>>({});

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // When subject changes, load default subject toolkit if user hasn't generated a custom one yet
  const handleSelectSubject = (newSubj: StudySubject) => {
    setSubject(newSubj);
    if (newSubj === "hindi") {
      setStudyLanguage("hindi");
    } else if (newSubj === "english") {
      setStudyLanguage("english");
    }
    setToolkit(DEFAULT_TOOLKIT[newSubj]);
    setUnlockedStepCount(1);
    setQuizIndex(0);
    setSelectedOption(null);
    setShowQuizHint(false);
    setCardIndex(0);
    setCardFlipped(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [inputText]);

  useEffect(() => {
    return () => {
      stopPCM();
    };
  }, []);

  const handleSendStudyPrompt = async (promptText: string, imgAttachment?: ChatAttachment) => {
    if (isStreaming) return;
    if (!promptText.trim() && !imgAttachment) return;

    const userMsg: ChatMessage = {
      id: `study_u_${Date.now()}`,
      role: "user",
      text: promptText.trim(),
      timestamp: Date.now(),
      attachment: imgAttachment,
    };

    const modelMsgId = `study_m_${Date.now()}`;
    const placeholderModel: ChatMessage = {
      id: modelMsgId,
      role: "model",
      text: "",
      timestamp: Date.now(),
      isStreaming: true,
    };

    const historySnapshot = [...messages];
    setMessages((prev) => [...prev, userMsg, placeholderModel]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const finalText = await streamFlexiStudyChat({
        config,
        subject,
        pedagogy,
        language: studyLanguage,
        history: historySnapshot,
        userText: promptText,
        attachment: imgAttachment,
        signal: controller.signal,
        onChunk: (partial) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, text: partial } : m))
          );
        },
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId ? { ...m, text: finalText || m.text, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const errMsg = String(err?.message || err || "Failed to connect");
      if (errMsg.includes("API Key") || !config.apiKey) {
        onRequireApiKey();
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId
            ? {
                ...m,
                text: `Could not complete study response: ${errMsg}`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleBuildToolkitFromContext = async (contextText: string) => {
    if (isGeneratingDeck) return;
    setIsGeneratingDeck(true);
    setMobilePane("deck");
    try {
      const generated = await generateStudyToolkit(
        config,
        subject,
        contextText,
        studyLanguage
      );
      if (generated && generated.steps?.length) {
        setToolkit(generated);
        setUnlockedStepCount(1);
        setQuizIndex(0);
        setSelectedOption(null);
        setShowQuizHint(false);
        setQuizScore({ correct: 0, answered: 0 });
        setAnsweredQuestions({});
        setCardIndex(0);
        setCardFlipped(false);
        setDeckTab("quiz");
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      if (errMsg.includes("API Key") || !config.apiKey) {
        onRequireApiKey();
      }
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1];
      if (base64Data) {
        setAttachment({
          mimeType: file.type || "image/jpeg",
          data: base64Data,
          previewUrl: dataUrl,
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleDictation = () => {
    dictation.toggleDictation(inputText);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (dictation.isDictating) {
      dictation.stopDictation();
    }
    if (isStreaming) {
      abortRef.current?.abort();
      setIsStreaming(false);
      return;
    }
    if (!inputText.trim() && !attachment) return;
    const textToSend = inputText;
    const attachToSend = attachment;
    setInputText("");
    setAttachment(undefined);
    handleSendStudyPrompt(textToSend, attachToSend);
  };

  const handleSpeak = async (msg: ChatMessage) => {
    if (playingMsgId === msg.id) {
      stopPCM();
      setPlayingMsgId(null);
      return;
    }
    stopPCM();
    setLoadingTtsId(msg.id);
    const audio = await synthesizeZoyaSpeech(msg.text, config);
    setLoadingTtsId(null);
    if (audio) {
      setPlayingMsgId(msg.id);
      await playPCM(audio, isSpeakerMuted ? 0 : volume, () => {
        setPlayingMsgId((prev) => (prev === msg.id ? null : prev));
      });
    }
  };

  const currentQuestion = toolkit.quiz[quizIndex] || toolkit.quiz[0];
  const currentCard = toolkit.flashcards[cardIndex] || toolkit.flashcards[0];

  const handleSelectQuizOption = (optIdx: number) => {
    if (!currentQuestion) return;
    if (answeredQuestions[currentQuestion.id] !== undefined) return;
    setSelectedOption(optIdx);
    setAnsweredQuestions((prev) => ({ ...prev, [currentQuestion.id]: optIdx }));
    setQuizScore((prev) => ({
      correct: prev.correct + (optIdx === currentQuestion.correctIndex ? 1 : 0),
      answered: prev.answered + 1,
    }));
  };

  const activeSubjectInfo =
    STUDY_SUBJECTS.find((s) => s.id === subject) || STUDY_SUBJECTS[0];
  const uiTheme = resolveUiTheme(config.uiTheme);
  const isLight = uiTheme.isLight;

  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full overflow-hidden ${uiTheme.rootClass}`}>
      {/* Top Subject & Flexi Pedagogy Control Strip */}
      <div className={`w-full px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${uiTheme.headerClass}`}>
        {/* Subject Selector Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
          {STUDY_SUBJECTS.map((subj) => {
            const isSelected = subject === subj.id;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSelectSubject(subj.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? isLight
                      ? "bg-sky-100 text-sky-800 border border-sky-300 font-semibold"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {subj.label}
              </button>
            );
          })}
        </div>

        {/* Right: English / Hindi Language Toggle + Pedagogy Selector + Mobile Zone Switcher */}
        <div className="flex items-center gap-2 ml-auto">
          {/* English | Hindi (हिंदी) Study Medium Switcher */}
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.05] border border-pink-500/30"
            title="Switch Study Explanation & Quiz Language (English / Hindi)"
          >
            <button
              type="button"
              onClick={() => setStudyLanguage("english")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                studyLanguage === "english"
                  ? "bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setStudyLanguage("hindi")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                studyLanguage === "hindi"
                  ? "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            {STUDY_PEDAGOGIES.map((ped) => {
              const isSelected = pedagogy === ped.id;
              return (
                <button
                  key={ped.id}
                  type="button"
                  onClick={() => setPedagogy(ped.id)}
                  title={ped.description}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isSelected
                      ? "bg-white text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ped.label}
                </button>
              );
            })}
          </div>

          {/* Mobile View Toggle (Tutor vs Interactive Practice Deck) */}
          <div className="flex lg:hidden items-center gap-1 p-0.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setMobilePane("tutor")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                mobilePane === "tutor" ? "bg-sky-500 text-white" : "text-slate-300"
              }`}
            >
              Flexi Tutor
            </button>
            <button
              type="button"
              onClick={() => setMobilePane("deck")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                mobilePane === "deck" ? "bg-sky-500 text-white" : "text-slate-300"
              }`}
            >
              Practice Deck
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Zone Educational Sandbox Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 w-full overflow-hidden">
        {/* LEFT ZONE (7 cols on desktop): Interactive Flexi AI Study Tutor */}
        <div
          className={`lg:col-span-7 flex flex-col min-h-0 h-full border-r ${
            isLight ? "border-slate-200" : "border-white/[0.07]"
          } ${mobilePane === "deck" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Scrollable Tutor Feed */}
          <div className="flex-1 overflow-y-auto chat-scroll px-4 sm:px-6 py-6">
            <div className="max-w-2xl mx-auto w-full">
              {messages.length === 0 ? (
                /* Flexi AI Study Welcome Screen */
                <div className="py-4 space-y-6">
                  <div>
                    <div className={`flex items-center gap-2 text-xs font-medium mb-2 ${isLight ? "text-sky-700" : "text-sky-400"}`}>
                      <GraduationCap size={16} />
                      <span>Flexi AI Study Partner</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeSubjectInfo.label}</span>
                    </div>
                    <h2
                      className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}
                      style={{ fontFamily: "var(--font-display)", textWrap: "balance" }}
                    >
                      Let's master {activeSubjectInfo.label} together, {config.userName}.
                    </h2>
                    <p className={`text-sm mt-1.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Ask any homework question, snap a photo of a problem or diagram, or test yourself with interactive step-by-step hints and quizzes.
                    </p>
                  </div>

                  {/* Quick Starter Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleSendStudyPrompt(
                          `Teach me ${activeSubjectInfo.exampleTopic} step by step and give me a quick practice problem at the end.`
                        )
                      }
                      className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[104px] ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                    >
                      <span className={`text-xs font-medium ${isLight ? "text-sky-700" : "text-sky-400"}`}>Guided Concept Lesson</span>
                      <span className={`text-sm font-medium mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                        Walk me through {activeSubjectInfo.exampleTopic}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPedagogy("socratic_hint");
                        handleSendStudyPrompt(
                          `Give me a challenging ${activeSubjectInfo.label} problem on ${activeSubjectInfo.exampleTopic}, but don't give away the answer yet—coach me with a Flexi hint first!`
                        );
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[104px] ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                    >
                      <span className={`text-xs font-medium ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Socratic Coaching</span>
                      <span className={`text-sm font-medium mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                        Challenge me with a problem & give me a hint first
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[104px] ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                    >
                      <span className={`text-xs font-medium ${isLight ? "text-rose-700" : "text-pink-400"}`}>Snap & Solve Homework</span>
                      <span className={`text-sm font-medium mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                        Upload a photo of an equation, chart, or worksheet
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleBuildToolkitFromContext(
                          `${activeSubjectInfo.label}: ${activeSubjectInfo.exampleTopic}`
                        )
                      }
                      className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[104px] ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                    >
                      <span className={`text-xs font-medium ${isLight ? "text-amber-700" : "text-amber-400"}`}>Instant Quiz & Cards</span>
                      <span className={`text-sm font-medium mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                        Generate fresh quiz & flashcards on {activeSubjectInfo.exampleTopic}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Study Conversation */
                <div className="space-y-6 pb-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="text-xs text-slate-400">
                      <span>{activeSubjectInfo.label}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>
                        {STUDY_PEDAGOGIES.find((p) => p.id === pedagogy)?.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMessages([])}
                      className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Clear session</span>
                    </button>
                  </div>

                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex flex-col items-end gap-2">
                          {msg.attachment && (
                            <div className="rounded-2xl overflow-hidden border border-white/10 max-w-xs bg-[#131824]">
                              <img
                                src={msg.attachment.previewUrl}
                                alt={msg.attachment.name || "Homework upload"}
                                referrerPolicy="no-referrer"
                                className="max-h-52 w-auto object-cover"
                              />
                            </div>
                          )}
                          {msg.text && (
                            <div className={`${uiTheme.userBubbleClass} rounded-3xl rounded-tr-md px-5 py-3 max-w-[85%] text-[15px] leading-relaxed`}>
                              {msg.text}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-slate-950 font-bold">
                          <GraduationCap size={17} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 text-xs mb-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                              {config.assistantName} Flexi Tutor
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{activeSubjectInfo.label}</span>
                          </div>

                          {msg.text ? (
                            <MarkdownRenderer content={msg.text} isLight={isLight} />
                          ) : msg.isStreaming ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                              <span>Breaking down the steps...</span>
                            </div>
                          ) : null}

                          {/* Flexi Pedagogical Follow-Up Chips beneath Tutor Responses */}
                          {!msg.isStreaming && msg.text && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSendStudyPrompt(
                                    "Give me a small Socratic hint for the next step without spoiling the full answer."
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                <Lightbulb size={13} />
                                <span>Give me a Hint</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSendStudyPrompt(
                                    "Explain this using a simple, intuitive real-world analogy."
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-sky-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                <Sparkles size={13} />
                                <span>Explain Simply</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBuildToolkitFromContext(msg.text)}
                                disabled={isGeneratingDeck}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                {isGeneratingDeck ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <ListChecks size={13} />
                                )}
                                <span>Quiz Me on This</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSpeak(msg)}
                                disabled={loadingTtsId === msg.id}
                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                {loadingTtsId === msg.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : playingMsgId === msg.id ? (
                                  <Square size={12} className="fill-current text-pink-400" />
                                ) : (
                                  <Volume2 size={13} />
                                )}
                                <span>{playingMsgId === msg.id ? "Stop" : "Listen"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Study Input Composer */}
          <div className={`p-3 sm:p-4 border-t shrink-0 ${uiTheme.headerClass}`}>
            <div className="max-w-2xl mx-auto w-full">
              <form
                onSubmit={handleFormSubmit}
                className={`border ${uiTheme.radiusClass} p-2 transition-colors ${uiTheme.inputWrapperClass}`}
              >
                {attachment && (
                  <div className="px-2 pt-1 pb-2 flex items-center gap-3">
                    <div className="relative rounded-xl overflow-hidden border border-white/15 w-14 h-14 bg-black/40 shrink-0">
                      <img
                        src={attachment.previewUrl}
                        alt="Homework preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachment(undefined)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <span className="text-xs text-slate-300 truncate">
                      {attachment.name || "Homework image attached"}
                    </span>
                  </div>
                )}

                <div className="flex items-end gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-w-[42px] min-h-[42px] rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors shrink-0"
                    title="Upload homework or diagram photo"
                  >
                    <ImagePlus size={19} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleFormSubmit();
                      }
                    }}
                    placeholder={`Ask a ${activeSubjectInfo.label} question or paste a problem...`}
                    className={`flex-1 bg-transparent text-sm sm:text-[15px] leading-relaxed py-2 px-1 focus:outline-none resize-none max-h-36 chat-scroll ${
                      isLight
                        ? "text-slate-900 placeholder:text-slate-400"
                        : "text-white placeholder:text-slate-500"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`min-w-[42px] min-h-[42px] rounded-full flex items-center justify-center transition-colors shrink-0 relative ${
                      dictation.isDictating
                        ? "bg-rose-500/25 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                        : isLight
                        ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    title={dictation.isDictating ? "Stop voice dictation" : "Dictate with voice"}
                  >
                    {dictation.isDictating && (
                      <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                    )}
                    {dictation.isDictating ? <MicOff size={18} className="relative z-10" /> : <Mic size={18} />}
                  </button>

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachment && !isStreaming}
                    className={`min-w-[42px] min-h-[42px] rounded-full flex items-center justify-center transition-all shrink-0 ${
                      inputText.trim() || attachment || isStreaming
                        ? "bg-sky-500 text-slate-950 hover:bg-sky-400 font-semibold"
                        : isLight
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-white/[0.06] text-slate-500 cursor-not-allowed"
                    }`}
                    title="Ask Flexi Tutor"
                  >
                    {isStreaming ? <Square size={15} className="fill-current" /> : <ArrowUp size={19} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT ZONE (5 cols on desktop): Interactive Concept & Practice Deck */}
        <div
          className={`lg:col-span-5 flex flex-col min-h-0 h-full ${uiTheme.sidebarClass} ${
            mobilePane === "tutor" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Deck Header & Segmented Tab Switcher */}
          <div className={`p-4 border-b flex flex-col gap-3 shrink-0 ${isLight ? "border-slate-200" : "border-white/[0.07]"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className={`text-xs font-medium flex items-center gap-1.5 ${isLight ? "text-sky-700" : "text-sky-400"}`}>
                  <span>Interactive Study Deck</span>
                  {isGeneratingDeck && (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      · <Loader2 size={12} className="animate-spin" /> Updating...
                    </span>
                  )}
                </div>
                <h3 className={`text-base font-semibold truncate mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                  {toolkit.topicTitle}
                </h3>
              </div>
            </div>

            {/* Segmented Control: Guided Steps | Practice Quiz | Flashcards */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
                isLight
                  ? "bg-slate-200/70 border-slate-300"
                  : "bg-[#080B11] border-white/[0.07]"
              }`}
            >
              <button
                type="button"
                onClick={() => setDeckTab("steps")}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  deckTab === "steps"
                    ? isLight
                      ? "bg-white text-slate-950 font-semibold shadow-xs"
                      : "bg-[#192236] text-white font-semibold shadow-xs"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen size={14} />
                <span>Guided Steps</span>
              </button>

              <button
                type="button"
                onClick={() => setDeckTab("quiz")}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  deckTab === "quiz"
                    ? isLight
                      ? "bg-white text-slate-950 font-semibold shadow-xs"
                      : "bg-[#192236] text-white font-semibold shadow-xs"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListChecks size={14} />
                <span>Quiz ({toolkit.quiz.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDeckTab("flashcards")}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  deckTab === "flashcards"
                    ? isLight
                      ? "bg-white text-slate-950 font-semibold shadow-xs"
                      : "bg-[#192236] text-white font-semibold shadow-xs"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers size={14} />
                <span>Cards ({toolkit.flashcards.length})</span>
              </button>
            </div>
          </div>

          {/* Deck Body Content */}
          <div className="flex-1 overflow-y-auto chat-scroll p-4 sm:p-5">
            {deckTab === "steps" && (
              /* TAB 1: PROGRESSIVE DISCLOSURE STEP-BY-STEP GUIDE */
              <div className="space-y-4">
                <div className={`p-3.5 rounded-2xl border ${uiTheme.surfaceClass}`}>
                  <div className={`text-xs font-medium mb-1 ${isLight ? "text-sky-700" : "text-sky-400"}`}>Core Takeaway</div>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    {toolkit.summaryTakeaway}
                  </p>
                </div>

                <div className="space-y-3">
                  {toolkit.steps.map((step, idx) => {
                    const isUnlocked = idx < unlockedStepCount;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-4 transition-all ${
                          isUnlocked
                            ? uiTheme.surfaceClass
                            : isLight
                            ? "bg-slate-100/70 border-slate-200 opacity-70"
                            : "bg-[#0E131D]/60 border-white/[0.04] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-mono font-semibold tabular-nums ${isLight ? "text-sky-700" : "text-sky-400"}`}>
                            Stage 0{step.stepNumber}. {step.title}
                          </span>
                          {isUnlocked && (
                            <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          )}
                        </div>

                        {isUnlocked ? (
                          <>
                            <p className={`text-sm leading-relaxed mt-1 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                              {step.content}
                            </p>
                            {step.checkQuestion && (
                              <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${isLight ? "border-slate-200" : "border-white/[0.06]"}`}>
                                <span className={`text-xs italic ${isLight ? "text-amber-700" : "text-amber-300/90"}`}>
                                  Self-Check: {step.checkQuestion}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendStudyPrompt(
                                      `Help me answer this self-check question for Stage ${step.stepNumber}: "${step.checkQuestion}"`
                                    )
                                  }
                                  className={`text-xs hover:underline shrink-0 ${isLight ? "text-sky-700" : "text-sky-400"}`}
                                >
                                  Ask Zoya →
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Complete the previous stage first, then unlock this step.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {unlockedStepCount < toolkit.steps.length ? (
                  <button
                    type="button"
                    onClick={() => setUnlockedStepCount((c) => c + 1)}
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                      isLight
                        ? "bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-900"
                        : "bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-200"
                    }`}
                  >
                    Reveal Stage 0{unlockedStepCount + 1} of 0{toolkit.steps.length}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeckTab("quiz")}
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                      isLight
                        ? "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-900"
                        : "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200"
                    }`}
                  >
                    All Stages Complete — Start Practice Quiz →
                  </button>
                )}
              </div>
            )}

            {deckTab === "quiz" && currentQuestion && (
              /* TAB 2: INTERACTIVE PRACTICE QUIZ WITH INSTANT GRADING & HINTS */
              <div className="space-y-4">
                {/* Quiz Progress & Score Header */}
                <div className={`flex items-center justify-between text-xs font-mono tabular-nums ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  <span>
                    Question {quizIndex + 1} of {toolkit.quiz.length}
                  </span>
                  <span>
                    Score: {quizScore.correct} / {quizScore.answered}
                  </span>
                </div>

                {/* Question Card */}
                <div className={`p-4 rounded-2xl border space-y-4 ${uiTheme.surfaceClass}`}>
                  <p className={`text-sm sm:text-[15px] font-medium leading-relaxed ${isLight ? "text-slate-900" : "text-white"}`}>
                    {currentQuestion.question}
                  </p>

                  {/* Options List */}
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const recordedAnswer = answeredQuestions[currentQuestion.id];
                      const hasAnswered = recordedAnswer !== undefined;
                      const isThisSelected = recordedAnswer === optIdx;
                      const isCorrectOption = optIdx === currentQuestion.correctIndex;

                      let btnStyle = isLight
                        ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                        : "bg-[#0C101A] hover:bg-white/[0.05] border-white/[0.08] text-slate-200";
                      let statusBadge: React.ReactNode = null;

                      if (hasAnswered) {
                        if (isCorrectOption) {
                          btnStyle = isLight
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-medium"
                            : "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-medium";
                          statusBadge = (
                            <span className="flex items-center gap-1 text-xs text-emerald-500 shrink-0">
                              <CheckCircle2 size={14} /> Correct
                            </span>
                          );
                        } else if (isThisSelected && !isCorrectOption) {
                          btnStyle = isLight
                            ? "bg-rose-50 border-rose-400 text-rose-900"
                            : "bg-rose-500/15 border-rose-500/50 text-rose-200";
                          statusBadge = (
                            <span className="flex items-center gap-1 text-xs text-rose-500 shrink-0">
                              <AlertTriangle size={14} /> Not quite
                            </span>
                          );
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => handleSelectQuizOption(optIdx)}
                          className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {statusBadge}
                        </button>
                      );
                    })}
                  </div>

                  {/* Flexi Hint Toggle */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowQuizHint((h) => !h)}
                      className={`text-xs flex items-center gap-1.5 ${isLight ? "text-amber-700 hover:text-amber-800" : "text-amber-300 hover:text-amber-200"}`}
                    >
                      <HelpCircle size={14} />
                      <span>{showQuizHint ? "Hide Flexi Hint" : "Need a Flexi Hint?"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobilePane("tutor");
                        handleSendStudyPrompt(
                          `Can you walk me through this quiz question step by step: "${currentQuestion.question}"`
                        );
                      }}
                      className={`text-xs hover:underline ${isLight ? "text-sky-700" : "text-sky-400"}`}
                    >
                      Discuss with Zoya →
                    </button>
                  </div>

                  {showQuizHint && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${isLight ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-amber-500/10 border-amber-500/30 text-amber-200"}`}>
                      <strong>Flexi Hint:</strong> {currentQuestion.hint}
                    </div>
                  )}

                  {/* Detailed Explanation after answering */}
                  {answeredQuestions[currentQuestion.id] !== undefined && (
                    <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1 ${isLight ? "bg-sky-50 border-sky-300 text-slate-800" : "bg-sky-500/10 border-sky-500/30 text-slate-200"}`}>
                      <div className={`font-semibold ${isLight ? "text-sky-800" : "text-sky-300"}`}>Why this works:</div>
                      <p>{currentQuestion.explanation}</p>
                    </div>
                  )}
                </div>

                {/* Prev / Next Question Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={quizIndex === 0}
                    onClick={() => {
                      setQuizIndex((i) => Math.max(0, i - 1));
                      setShowQuizHint(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl disabled:opacity-30 text-xs font-medium flex items-center gap-1 ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200"
                    }`}
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  <button
                    type="button"
                    disabled={quizIndex >= toolkit.quiz.length - 1}
                    onClick={() => {
                      setQuizIndex((i) => Math.min(toolkit.quiz.length - 1, i + 1));
                      setShowQuizHint(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl disabled:opacity-30 text-xs font-medium flex items-center gap-1 ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200"
                    }`}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {deckTab === "flashcards" && currentCard && (
              /* TAB 3: INTERACTIVE FLIP FLASHCARDS */
              <div className="space-y-4">
                <div className={`flex items-center justify-between text-xs font-mono tabular-nums ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  <span>
                    Card {cardIndex + 1} of {toolkit.flashcards.length}
                  </span>
                  <span>
                    Mastered: {Object.values(masteredCards).filter(Boolean).length} /{" "}
                    {toolkit.flashcards.length}
                  </span>
                </div>

                {/* Interactive Flip Card */}
                <button
                  type="button"
                  onClick={() => setCardFlipped((f) => !f)}
                  className={`w-full min-h-[210px] p-6 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer group ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                >
                  <div className={`flex items-center justify-between w-full text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    <span className={`font-mono uppercase tracking-wider ${isLight ? "text-sky-700" : "text-sky-400"}`}>
                      {cardFlipped ? "Answer & Explanation" : "Concept / Prompt"}
                    </span>
                    <span className={`flex items-center gap-1 ${isLight ? "text-slate-500 group-hover:text-slate-900" : "text-slate-400 group-hover:text-white"}`}>
                      <RotateCw size={13} /> Tap to flip
                    </span>
                  </div>

                  <div className="my-4">
                    {!cardFlipped ? (
                      <h4 className={`text-lg font-semibold leading-snug ${isLight ? "text-slate-900" : "text-white"}`}>
                        {currentCard.front}
                      </h4>
                    ) : (
                      <div className="space-y-2.5">
                        <p className={`text-sm leading-relaxed ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                          {currentCard.back}
                        </p>
                        {currentCard.formulaOrKeyTerm && (
                          <div className={`px-3 py-2 rounded-xl border font-mono text-xs ${isLight ? "bg-slate-100 border-slate-200 text-rose-700" : "bg-black/40 border-white/10 text-pink-300"}`}>
                            {currentCard.formulaOrKeyTerm}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    {masteredCards[currentCard.id] ? "● Marked as Mastered" : "Click card to reveal back"}
                  </div>
                </button>

                {/* Navigation & Mastery Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={cardIndex === 0}
                    onClick={() => {
                      setCardIndex((i) => Math.max(0, i - 1));
                      setCardFlipped(false);
                    }}
                    className={`px-3 py-2 rounded-xl disabled:opacity-30 text-xs font-medium flex items-center gap-1 ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200"
                    }`}
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMasteredCards((prev) => ({
                        ...prev,
                        [currentCard.id]: !prev[currentCard.id],
                      }))
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      masteredCards[currentCard.id]
                        ? isLight
                          ? "bg-emerald-100 border-emerald-400 text-emerald-900"
                          : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : isLight
                        ? "bg-white border-slate-300 text-slate-700 hover:text-slate-900"
                        : "bg-white/[0.05] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    {masteredCards[currentCard.id] ? "✓ Mastered" : "Mark Mastered"}
                  </button>

                  <button
                    type="button"
                    disabled={cardIndex >= toolkit.flashcards.length - 1}
                    onClick={() => {
                      setCardIndex((i) => Math.min(toolkit.flashcards.length - 1, i + 1));
                      setCardFlipped(false);
                    }}
                    className={`px-3 py-2 rounded-xl disabled:opacity-30 text-xs font-medium flex items-center gap-1 ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200"
                    }`}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
