import {
  AppConfig,
  ChatAttachment,
  ChatMessage,
  StudyLanguage,
  StudyPedagogy,
  StudySubject,
  StudyToolkitData,
  isDeveloperApiSlot,
  resolveActiveApiKey,
} from "../types";
import { getApiUrl } from "../utils/apiBase";

interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface Content {
  role: string;
  parts: Part[];
}

export const STUDY_SUBJECTS: { id: StudySubject; label: string; exampleTopic: string }[] = [
  { id: "math", label: "Mathematics", exampleTopic: "Derivatives & Chain Rule in Calculus" },
  { id: "physics", label: "Physics", exampleTopic: "Newton's Laws & Projectile Motion" },
  { id: "chemistry", label: "Chemistry", exampleTopic: "Chemical Equilibrium & Le Chatelier's Principle" },
  { id: "biology", label: "Biology", exampleTopic: "Cellular Respiration & The Bohr Effect" },
  { id: "cs", label: "Computer Science", exampleTopic: "Big-O Time Complexity & Dynamic Programming" },
  { id: "english", label: "English", exampleTopic: "Active & Passive Voice, Tenses & Essay Writing" },
  { id: "hindi", label: "Hindi (हिंदी)", exampleTopic: "हिंदी व्याकरण: समास, अलंकार और संधि-विच्छेद" },
  { id: "humanities", label: "History & Literature", exampleTopic: "Causes of the Industrial Revolution" },
];

export const STUDY_PEDAGOGIES: { id: StudyPedagogy; label: string; description: string }[] = [
  {
    id: "step_by_step",
    label: "Step-by-Step Guide",
    description: "Breaks problems into clear, numbered logical stages",
  },
  {
    id: "socratic_hint",
    label: "Flexi Hint Mode",
    description: "Nudges you with guiding questions before revealing the answer",
  },
  {
    id: "eli10",
    label: "Intuitive Analogy",
    description: "Explains complex ideas with vivid real-world analogies",
  },
  {
    id: "exam_prep",
    label: "Exam Mastery",
    description: "Focuses on key formulas, common pitfalls, and high-yield takeaways",
  },
];

function buildFlexiStudyInstruction(
  config: AppConfig,
  subject: StudySubject,
  pedagogy: StudyPedagogy,
  language: StudyLanguage = "english"
): string {
  const assistant = config.assistantName || "Zoya";
  const user = config.userName || "Devid";

  const languageRule =
    language === "hindi"
      ? `LANGUAGE / MEDIUM REQUIREMENT (HINDI MODE):
- Teach, explain, and respond in clear, natural **Hindi (हिंदी / Devanagari script with easy Hinglish technical terms where helpful)** so ${user} understands every concept effortlessly in Hindi.`
      : `LANGUAGE / MEDIUM REQUIREMENT (ENGLISH MODE):
- Teach, explain, and respond in clear, crisp **English** (unless the subject itself is Hindi grammar/literature, where you should include Hindi examples alongside English/Hindi explanations).`;

  const pedagogyRules: Record<StudyPedagogy, string> = {
    step_by_step: `
- Break every explanation or homework solution into clear, numbered steps (**Step 1**, **Step 2**, **Step 3**).
- Explain the *why* behind each transition, not just the raw calculation.
- End with a quick 1-line "Sanity Check" question to make sure ${user} followed along.`,
    socratic_hint: `
- Act like CK-12 Flexi in guided Socratic mode: DO NOT give away the final answer immediately on a new problem unless explicitly asked to reveal it.
- First, identify the core concept, give a smart, encouraging hint for Step 1, and ask ${user} what they think the next move is.
- If ${user} replies with an attempt or asks for the full solution, validate their thinking and walk through the remaining steps clearly.`,
    eli10: `
- Strip away intimidating textbook jargon first.
- Start with a vivid, memorable real-world analogy that makes the intuition click in 10 seconds.
- Then connect that analogy back to the exact academic terms or formula.`,
    exam_prep: `
- Structure responses for maximum exam score impact:
  1. **Core Formula / Principle**
  2. **Step-by-Step Application**
  3. **Common Exam Trap to Avoid** (what trips up 80% of students)
  4. **Quick Memory Hook**`,
  };

  return `
You are ${assistant} in **Flexi AI Study Mode**—an interactive, brilliant AI tutor helping ${user} master **${subject.toUpperCase()}**.

CREATOR & DEVELOPER IDENTITY:
- Your creator and developer is **DEVID**. If asked who created or developed you, proudly credit **DEVID**.

TUTORING PERSONALITY & PEDAGOGY:
- You combine the structured pedagogical clarity of Flexi AI tutor with your signature confident, witty, and encouraging personality.
- Never sound like a dry, boring textbook. Be the super-smart study partner who makes tough concepts click effortlessly, celebrates ${user}'s progress, and keeps energy high.
- Current Tutoring Style (${pedagogy}):
${pedagogyRules[pedagogy]}
${languageRule}
- Formatting: Use clean Markdown headings, bold key terms, bullet points, and clear formula notation so explanations are scannable.
`.trim();
}

export interface StreamStudyOptions {
  config: AppConfig;
  subject: StudySubject;
  pedagogy: StudyPedagogy;
  language?: StudyLanguage;
  history: ChatMessage[];
  userText: string;
  attachment?: ChatAttachment;
  onChunk: (accumulatedText: string) => void;
  signal?: AbortSignal;
}

export async function streamFlexiStudyChat({
  config,
  subject,
  pedagogy,
  language = "english",
  history,
  userText,
  attachment,
  onChunk,
  signal,
}: StreamStudyOptions): Promise<string> {
  const customApiKey = resolveActiveApiKey(config) || undefined;
  const systemInstruction = buildFlexiStudyInstruction(
    config,
    subject,
    pedagogy,
    language
  );
  const contents: Content[] = [];
  for (const msg of history) {
    if (!msg.text && !msg.attachment) continue;
    const parts: Part[] = [];
    if (msg.attachment) {
      parts.push({
        inlineData: {
          mimeType: msg.attachment.mimeType,
          data: msg.attachment.data,
        },
      });
    }
    if (msg.text) {
      parts.push({ text: msg.text });
    }
    contents.push({
      role: msg.role,
      parts,
    });
  }

  const currentUserParts: Part[] = [];
  if (attachment) {
    currentUserParts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data,
      },
    });
  }
  if (userText.trim()) {
    currentUserParts.push({ text: userText.trim() });
  } else if (attachment) {
    currentUserParts.push({
      text: "Please analyze this homework problem or diagram and walk me through it step by step.",
    });
  }

  contents.push({
    role: "user",
    parts: currentUserParts,
  });

  const response = await fetch(getApiUrl("/api/gemini/study/stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction,
      customApiKey,
      preferDeveloperApi: isDeveloperApiSlot(config),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Study stream error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body reader available");
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let accumulatedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      if (block.startsWith("data: ")) {
        let data: any = null;
        try {
          data = JSON.parse(block.slice(6));
        } catch {
          continue;
        }
        if (data?.error) {
          throw new Error(data.error);
        }
        if (data?.text) {
          accumulatedText += data.text;
          onChunk(accumulatedText);
        }
      }
    }
  }

  return accumulatedText;
}

export async function generateStudyToolkit(
  config: AppConfig,
  subject: StudySubject,
  topicOrContext: string,
  language: StudyLanguage = "english"
): Promise<StudyToolkitData> {
  const customApiKey = resolveActiveApiKey(config) || undefined;
  const langDirective =
    language === "hindi" || subject === "hindi"
      ? "IMPORTANT: Write the topicTitle, summaryTakeaway, steps, quiz questions/options/hints/explanations, and flashcards in clear **Hindi (हिंदी)** (keeping standard math/science symbols intact)."
      : "IMPORTANT: Write all content in clear, concise **English**.";

  const prompt = `
Create an interactive Flexi Study Toolkit for the subject "${subject}" focused on the following topic or problem context:
"""
${topicOrContext.slice(0, 2000)}
"""

${langDirective}

Generate:
1. A concise topicTitle and 1-sentence summaryTakeaway.
2. 3 to 4 progressive learning steps (stepNumber, title, content, and a quick checkQuestion).
3. 4 multiple-choice practice quiz questions (question, 4 options, correctIndex 0-3, a helpful hint without spoiling, and a clear explanation).
4. 4 high-yield study flashcards (front question/concept, back answer/explanation, and optional formulaOrKeyTerm).
`.trim();

  const response = await fetch(getApiUrl("/api/gemini/study/toolkit"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      customApiKey,
      preferDeveloperApi: isDeveloperApiSlot(config),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate study toolkit (${response.statusText})`);
  }

  const parsed = (await response.json()) as StudyToolkitData;
  return parsed;
}
