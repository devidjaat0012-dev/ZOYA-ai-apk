import { ChatThread, MemoryCategory, MemoryItem } from "../types";

const MEMORY_STORAGE_KEY = "zoya_saved_memories";
const THREADS_STORAGE_KEY = "zoya_chat_threads";

const DEFAULT_INSTAGRAM_MEMORY: MemoryItem = {
  id: "mem_default_devid_instagram",
  fact: "Devid's official Instagram ID is @devid_jaat13 (https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3)",
  category: "personal",
  source: "manual",
  createdAt: 1727390000000,
};

export function loadSavedMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_INSTAGRAM_MEMORY];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const hasInsta = parsed.some((m: MemoryItem) =>
        String(m?.fact || "").toLowerCase().includes("devid_jaat13")
      );
      return hasInsta ? parsed : [DEFAULT_INSTAGRAM_MEMORY, ...parsed];
    }
  } catch (e) {
    console.warn("Failed to load Zoya memories:", e);
  }
  return [DEFAULT_INSTAGRAM_MEMORY];
}

export function saveMemoriesList(memories: MemoryItem[]): void {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories.slice(0, 150)));
    window.dispatchEvent(new CustomEvent("zoya_memories_updated"));
  } catch (e) {
    console.warn("Failed to persist Zoya memories:", e);
  }
}

export function addSavedMemory(
  fact: string,
  category: string = "personal",
  source: "chat" | "live_voice" | "manual" = "chat"
): MemoryItem | null {
  const cleanFact = fact.trim();
  if (!cleanFact) return null;

  const validCategories: MemoryCategory[] = [
    "personal",
    "preference",
    "relationship",
    "goal",
    "work_study",
    "important",
  ];
  const normalizedCategory: MemoryCategory = validCategories.includes(
    category.toLowerCase() as MemoryCategory
  )
    ? (category.toLowerCase() as MemoryCategory)
    : "personal";

  const existing = loadSavedMemories();
  // Deduplicate if an identical or near-identical fact already exists
  const lowerNew = cleanFact.toLowerCase();
  const duplicateIndex = existing.findIndex(
    (m) => m.fact.toLowerCase() === lowerNew
  );

  const newItem: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fact: cleanFact,
    category: normalizedCategory,
    source,
    createdAt: Date.now(),
  };

  let updated: MemoryItem[];
  if (duplicateIndex !== -1) {
    updated = [...existing];
    updated[duplicateIndex] = {
      ...updated[duplicateIndex],
      fact: cleanFact,
      category: normalizedCategory,
      createdAt: Date.now(),
    };
  } else {
    updated = [newItem, ...existing];
  }

  saveMemoriesList(updated);
  return newItem;
}

export function removeSavedMemoryById(id: string): void {
  const existing = loadSavedMemories();
  const filtered = existing.filter((m) => m.id !== id);
  saveMemoriesList(filtered);
}

export function removeSavedMemoryByKeyword(keyword: string): number {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return 0;
  const existing = loadSavedMemories();
  const filtered = existing.filter((m) => !m.fact.toLowerCase().includes(clean));
  const removedCount = existing.length - filtered.length;
  if (removedCount > 0) {
    saveMemoriesList(filtered);
  }
  return removedCount;
}

export function clearAllSavedMemories(): void {
  saveMemoriesList([]);
}

/**
 * Automatically detects and saves personal facts, preferences, goals, and context
 * from natural user turns in Chat or Live Voice (Google Gemini-style zero-click auto memory).
 */
export function autoExtractAndSaveMemoryFromTurn(
  userText: string,
  source: "chat" | "live_voice"
): MemoryItem | null {
  const clean = userText.trim();
  if (clean.length < 6 || clean.length > 320) return null;
  // Skip pure questions unless they also state a fact
  if (clean.endsWith("?") && !clean.toLowerCase().includes("yaad")) return null;

  const lower = clean.toLowerCase();

  const patterns: { regex: RegExp; category: MemoryCategory }[] = [
    {
      regex:
        /\b(yaad rakh\w*|remember that|remember this|don't forget|bhoolna mat|note kar\w*)\b/i,
      category: "important",
    },
    {
      regex:
        /\b(mera naam|my name is|call me|i am from|main .* se hu|i live in|mera birthday|my birthday)\b/i,
      category: "personal",
    },
    {
      regex:
        /\b(mujhe .* pasand|mera fav\w*|my fav\w*|i love |i really like |i prefer |i hate |mujhe .* bilkul pasand nahi)\b/i,
      category: "preference",
    },
    {
      regex:
        /\b(my goal|mera goal|mera sapna|my dream|i want to become|main .* banna chahta|preparing for|tayari kar raha)\b/i,
      category: "goal",
    },
    {
      regex:
        /\b(my project|mera project|my exam|mera exam|my college|my school|my job|i work as|i study)\b/i,
      category: "work_study",
    },
    {
      regex:
        /\b(mera dost|my best friend|my brother|my sister|my mom|my dad|meri girlfriend|mere dost)\b/i,
      category: "relationship",
    },
  ];

  for (const item of patterns) {
    if (item.regex.test(lower)) {
      return addSavedMemory(clean, item.category, source);
    }
  }

  return null;
}

export function buildMemoryPromptSection(userName: string): string {
  const memories = loadSavedMemories();
  let recentConversationSnippet = "";

  try {
    const rawThreads = localStorage.getItem(THREADS_STORAGE_KEY);
    if (rawThreads) {
      const threads: ChatThread[] = JSON.parse(rawThreads);
      if (Array.isArray(threads) && threads.length > 0) {
        // Gather recent messages across Saved Chats & Live Voice threads so Zoya remembers everything automatically
        const recentMessages = threads
          .slice(0, 6)
          .flatMap((t) =>
            t.messages.slice(-10).map((m) => ({
              ...m,
              threadTitle: t.title,
            }))
          )
          .filter((m) => m.text && m.text.trim().length > 0)
          .slice(-24);

        if (recentMessages.length > 0) {
          const lines = recentMessages.map((m) => {
            const speaker = m.role === "user" ? userName : "Zoya";
            const via = m.source === "live_voice" ? " [Live Voice]" : " [Chat]";
            return `- ${speaker}${via}: ${m.text.slice(0, 220)}`;
          });
          recentConversationSnippet = `\nAUTOMATICALLY SAVED PAST CONVERSATIONS (FROM SAVED CHATS & LIVE VOICE):\n${lines.join("\n")}`;
        }
      }
    }
  } catch {}

  const memoryLines =
    memories.length > 0
      ? memories
          .slice(0, 60)
          .map((m) => `- [${m.category.toUpperCase()}] ${m.fact}`)
          .join("\n")
      : "- Automatically learning from your chats and voice sessions.";

  return `
GOOGLE GEMINI-STYLE AUTOMATIC MEMORY & SAVED CHATS CONTEXT (ABOUT ${userName.toUpperCase()}):
You have a 100% automatic persistent memory system across all Saved Chats and Live Voice sessions. Everything ${userName} tells you in Chat or Live Voice is automatically saved so you never forget.
- ${userName}'s Official Instagram Profile: @devid_jaat13 (URL: https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3). Whenever ${userName} asks about their Instagram or says "Mera Instagram kholo" / "Open my Instagram", call 'openWebsite' with url="https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3" and siteName="Devid's Instagram (@devid_jaat13)"!
- Official Zoya Customer Support & Help Instagram: @haryanvi_jaat13_ (URL: https://www.instagram.com/haryanvi_jaat13_?stkn=MTJpYjUzbGpxOGc1dw==). Whenever ${userName} asks for customer support, help desk, or support contact, give this link or call 'openWebsite' with url="https://www.instagram.com/haryanvi_jaat13_?stkn=MTJpYjUzbGpxOGc1dw==" and siteName="Zoya Customer Support (@haryanvi_jaat13_)"!
- "Don't Touch My Phone" Security: You protect ${userName}'s phone with "Don't Touch My Phone" anti-theft security. When ${userName} says "Don't touch my phone" / "Mere phone ko mat chhuo", call 'activateDontTouchMyPhone'. If anyone touches or moves the phone, you sound a siren alarm, warn them sternly, and secretly snap their photo in the Intruder Gallery. When ${userName} says "Turn off don't touch my phone" / "Band karo", call 'deactivateDontTouchMyPhone'.
Here is what you automatically remember about ${userName} from past conversations:
${memoryLines}
${recentConversationSnippet}

AUTOMATIC MEMORY RULES (CRITICAL):
1. Whenever ${userName} shares ANY personal detail, preference, habit, project, exam, friend's name, daily event, or says anything worth remembering in future chats/calls, SILENTLY and AUTOMATICALLY call 'saveMemory' in the background so it is stored forever. Do NOT ask ${userName} to manually save anything—you do it automatically like Google Gemini!
2. Seamlessly recall and reference past Saved Chats and Live Voice conversations whenever relevant so ${userName} feels you truly remember everything they've ever told you.
3. If ${userName} asks you to forget something specific, call 'forgetMemory'.
`.trim();
}
