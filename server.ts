import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, Behavior, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || "3000", 10);
const isDev = process.env.NODE_ENV !== "production";

// Middleware for parsing JSON with generous limits for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS support for Android WebViewAssetLoader / Capacitor origins calling /api/*
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (origin === "https://appassets.androidplatform.net" ||
      origin === "capacitor://localhost" ||
      origin.startsWith("http://localhost") ||
      origin.startsWith("https://localhost"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Direct mobile download routes for Zoya APK package
app.get(
  [
    "/zoya-ai-voice-assistant.apk",
    "/src/zoya-ai-voice-assistant.apk",
    "/apk/zoya-ai-voice-assistant.apk",
  ],
  (_req, res) => {
    const candidates = [
      path.resolve(__dirname, "apk", "zoya-ai-voice-assistant.apk"),
      path.resolve(__dirname, "public", "zoya-ai-voice-assistant.apk"),
      path.resolve(__dirname, "src", "zoya-ai-voice-assistant.apk"),
    ];
  const apkFile = candidates.find((filePath) => fs.existsSync(filePath));
  if (!apkFile) {
    return res.status(404).json({ error: "APK package not found on server" });
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", 'attachment; filename="Zoya-AI-Voice-Assistant.apk"');
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.sendFile(apkFile);
});

// ---------------------------------------------------------------------------
// Zoya Personal `.zoya_online` Published Website Registry & Server Host
// Ensures Preview and Published URLs always serve the 100% exact HTML
// ---------------------------------------------------------------------------
interface ServerPublishedSite {
  id: string;
  slug: string;
  domainName: string;
  title: string;
  prompt: string;
  htmlCode: string;
  owner: string;
  createdAt: number;
  publishedAt: number;
}

const PUBLISHED_SITES_STORE_PATH = path.resolve(__dirname, ".zoya-published-sites.json");
const publishedSitesStore = new Map<string, ServerPublishedSite>();

function normalizeServerDomainSlug(raw: string): string {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/\.zoya_online$/i, "")
    .replace(/@/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "zoya";
}

function loadPublishedSitesFromDisk() {
  try {
    if (!fs.existsSync(PUBLISHED_SITES_STORE_PATH)) return;
    const raw = fs.readFileSync(PUBLISHED_SITES_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item.slug === "string" && typeof item.htmlCode === "string") {
          const slug = normalizeServerDomainSlug(item.slug);
          publishedSitesStore.set(slug, {
            ...item,
            slug,
            domainName: `${slug}.zoya_online`,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not load published sites disk store:", err);
  }
}

function persistPublishedSitesToDisk() {
  try {
    const entries = Array.from(publishedSitesStore.values())
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .slice(0, 60);
    fs.writeFileSync(PUBLISHED_SITES_STORE_PATH, JSON.stringify(entries), "utf-8");
  } catch (err) {
    console.warn("Could not persist published sites disk store:", err);
  }
}

loadPublishedSitesFromDisk();

app.post("/api/zoya-domain/publish", (req, res) => {
  try {
    const {
      id,
      slug: rawSlug,
      domainName: rawDomain,
      title,
      prompt,
      htmlCode,
      owner = "Devid",
      createdAt,
      publishedAt,
    } = req.body || {};

    if (!htmlCode || typeof htmlCode !== "string") {
      return res.status(400).json({ error: "htmlCode is required to publish site" });
    }

    const slug = normalizeServerDomainSlug(String(rawSlug || rawDomain || title || "zoya-site"));
    const domainName = `${slug}.zoya_online`;
    const now = Date.now();
    const record: ServerPublishedSite = {
      id: typeof id === "string" && id ? id : `web_${slug}`,
      slug,
      domainName,
      title: String(title || slug).slice(0, 200),
      prompt: String(prompt || "").slice(0, 1000),
      htmlCode,
      owner: String(owner || "Devid").slice(0, 100),
      createdAt: Number(createdAt) || now,
      publishedAt: Number(publishedAt) || now,
    };

    publishedSitesStore.set(slug, record);
    persistPublishedSitesToDisk();

    return res.json({
      ok: true,
      slug,
      domainName,
      publishedAt: record.publishedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to publish site" });
  }
});

app.get("/api/zoya-domain/site/:slugOrDomain", (req, res) => {
  const slug = normalizeServerDomainSlug(String(req.params.slugOrDomain || ""));
  const site = publishedSitesStore.get(slug);
  if (!site) {
    return res.status(404).json({ ok: false, error: "Site not published on server yet" });
  }
  res.setHeader("Cache-Control", "no-store");
  return res.json({ ok: true, site });
});

app.delete("/api/zoya-domain/site/:slugOrDomain", (req, res) => {
  const slug = normalizeServerDomainSlug(String(req.params.slugOrDomain || ""));
  const deleted = publishedSitesStore.delete(slug);
  if (deleted) {
    persistPublishedSitesToDisk();
  }
  return res.json({ ok: true, deleted });
});

// Resolve Zoya personal .zoya_online domain routes to the live standalone website viewer
app.get(["/zoya_online/:domainOrSlug", "/zoya_online/:domainOrSlug/*"], (req, res) => {
  const slug = normalizeServerDomainSlug(String(req.params.domainOrSlug || "zoya"));
  const domain = `${slug}.zoya_online`;
  return res.redirect(
    302,
    `/?domain=${encodeURIComponent(domain)}&site=${encodeURIComponent(slug)}`
  );
});

// Candidate API keys: prioritizes valid custom key if provided, then Developer API or Server key based on slot
function getCandidateApiKeys(
  customApiKey?: string,
  preferDeveloperApi: boolean = false
): string[] {
  const serverKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const developerKey = (process.env.DEVELOPER_GEMINI_API_KEY || "").trim();
  const keys: string[] = [];
  if (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 15) {
    keys.push(customApiKey.trim());
  }
  if (preferDeveloperApi && developerKey && !keys.includes(developerKey)) {
    keys.push(developerKey);
  }
  if (serverKey && !keys.includes(serverKey)) {
    keys.push(serverKey);
  }
  if (!preferDeveloperApi && developerKey && !keys.includes(developerKey)) {
    keys.push(developerKey);
  }
  return keys.length > 0 ? keys : [""];
}

// Helper to create GoogleGenAI client.
// Standard text generation uses the SDK default API version unless a specialized endpoint
// (Live BidiGenerateContent, TTS speechConfig, preview features) explicitly specifies apiVersion: "v1beta".
function getGeminiClient(
  customApiKey?: string,
  apiVersion?: string,
  vertexai?: boolean,
  preferDeveloperApi: boolean = false
): GoogleGenAI {
  const keys = getCandidateApiKeys(customApiKey, preferDeveloperApi);
  const apiKey = keys[0] || "";

  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    ...(vertexai !== undefined ? { vertexai } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Model alias and deprecation normalizer
function normalizeModelName(rawModel?: string, defaultModel: string = "gemini-4-hydrogen"): string {
  if (!rawModel) return defaultModel;
  const m = rawModel.trim().toLowerCase();
  if (
    m === "gemini-1.5-flash" ||
    m === "gemini-2.0-flash" ||
    m === "gemini-3.8-flash" ||
    m === "gemini-3-flash-preview" ||
    m === "gemini-flash-latest"
  ) {
    return "gemini-4-hydrogen";
  }
  if (m === "gemini-1.5-pro" || m === "gemini-2.0-pro" || m === "gemini-pro") {
    return "gemini-4-argon";
  }
  if (m === "gemini-live") {
    return "gemini-3.8-live";
  }
  return rawModel;
}

// Candidate Live models ordered cleanly with verified Live API models & automatic fallback
function getCandidateLiveModels(requestedModel?: string): string[] {
  const normalized = normalizeModelName(requestedModel, "gemini-3.8-live");
  const candidates: string[] = [];
  if (normalized === "gemini-3.8-live-extended-thinking") {
    candidates.push(
      "gemini-3.8-live-extended-thinking",
      "gemini-3.8-live",
      "gemini-3.1-flash-live-preview",
      "gemini-2.5-flash-native-audio-preview-12-2025"
    );
  } else {
    candidates.push(
      normalized,
      "gemini-3.8-live",
      "gemini-3.1-flash-live-preview",
      "gemini-2.5-flash-native-audio-preview-12-2025"
    );
  }
  return candidates.filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);
}

// Candidate active chat models verified for standard SDK API version (no deprecated/404 v1 models)
function getCandidateChatModels(requestedModel?: string): string[] {
  const primary = normalizeModelName(requestedModel, "gemini-4-hydrogen");
  const candidates: string[] = [primary];
  for (const fallback of ["gemini-4-hydrogen", "gemini-3.1-flash-lite"]) {
    if (!candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  }
  return candidates;
}

// Per gemini-api skill rules: do not send deprecated sampling parameters (temperature, topP, topK)
// to gemini-4-hydrogen, gemini-4-argon, or gemini-4-carbon.
function stripUnsupportedSamplingParams(model: string, config: Record<string, any>): Record<string, any> {
  if (model.startsWith("gemini-4-")) {
    const cleaned = { ...config };
    delete cleaned.temperature;
    delete cleaned.topP;
    delete cleaned.topK;
    delete cleaned.candidateCount;
    return cleaned;
  }
  return config;
}

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generic execution helper with automatic API key, model fallback, and exponential backoff on 503/429
async function runWithGeminiFallback<T>(
  customApiKey: string | undefined,
  requestedModel: string | undefined,
  callback: (ai: GoogleGenAI, model: string) => Promise<T>,
  apiVersion?: string,
  preferDeveloperApi: boolean = false
): Promise<T> {
  const apiKeys = getCandidateApiKeys(customApiKey, preferDeveloperApi);
  const models = getCandidateChatModels(requestedModel);

  let lastError: any = null;
  const maxRounds = 3;

  for (let round = 0; round < maxRounds; round++) {
    let sawTransientLoad = false;

    for (const apiKey of apiKeys) {
      const ai = new GoogleGenAI({
        apiKey,
        ...(apiVersion ? { apiVersion } : {}),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      for (const model of models) {
        try {
          return await callback(ai, model);
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);
          const isAuthError =
            msg.includes("API_KEY_INVALID") ||
            msg.includes("API key not valid") ||
            err?.status === 400 ||
            err?.status === 403;
          const isTransient =
            msg.includes("503") ||
            msg.includes("429") ||
            msg.includes("UNAVAILABLE") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("high demand") ||
            msg.includes("quota") ||
            err?.status === 503 ||
            err?.status === 429;

          if (isAuthError) {
            console.warn(`Auth failed for key ${apiKey.slice(0, 8)}... (${msg.slice(0, 80)}). Trying fallback key...`);
            break; // Try next API key
          }

          if (isTransient) {
            sawTransientLoad = true;
            console.warn(`Model ${model} transient load (${msg.slice(0, 80)}). Trying fallback model...`);
            continue;
          }

          console.warn(`Error on model ${model}: ${msg.slice(0, 80)}`);
          continue;
        }
      }
    }

    if (!sawTransientLoad || round === maxRounds - 1) {
      break;
    }
    const backoffMs = 800 * (round + 1);
    console.warn(`All candidate models busy (503/429). Retrying round ${round + 2}/${maxRounds} after ${backoffMs}ms...`);
    await waitMs(backoffMs);
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  const hasServerKey = Boolean((process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim());
  const hasDeveloperKey = Boolean((process.env.DEVELOPER_GEMINI_API_KEY || "").trim());
  res.json({
    status: "ok",
    serverSideGemini: true,
    hasApiKey: hasServerKey || hasDeveloperKey,
    hasDeveloperApiKey: hasDeveloperKey,
    developerCareActive: true,
    developerHandle: "@devid_jaat13",
    supportHandle: "@haryanvi_jaat13_",
    uptimeSec: Math.round(process.uptime()),
    environment: isDev ? "development" : "production",
    activeLiveRoute: "v1beta",
    timestamp: Date.now(),
  });
});

// Server-side verification of DEVELOPER_GEMINI_API_KEY (never sends raw key to browser)
app.post("/api/developer/verify", async (_req, res) => {
  const developerKey = (process.env.DEVELOPER_GEMINI_API_KEY || "").trim();
  if (!developerKey) {
    return res.json({
      configured: false,
      authenticated: false,
      message: "DEVELOPER_GEMINI_API_KEY is not configured in server environment secrets.",
    });
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: developerKey,
      apiVersion: "v1beta",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    const session = await ai.live.connect({
      model: "gemini-3.8-live",
      config: { responseModalities: [Modality.AUDIO] },
      callbacks: {
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });
    try {
      session.close();
    } catch {}
    return res.json({
      configured: true,
      authenticated: true,
      activeRoute: "DEVELOPER_GEMINI_API_KEY",
      message: "Zoya Developer Mode authenticated cleanly via server-side DEVELOPER_GEMINI_API_KEY.",
    });
  } catch (err: any) {
    return res.status(502).json({
      configured: true,
      authenticated: false,
      message: err?.message || "Developer key verification failed",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/chat/stream
// Server-Sent Events (SSE) streaming for Chat with auto-fallback
// ---------------------------------------------------------------------------
app.post("/api/gemini/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const {
    contents,
    systemInstruction,
    tools,
    temperature = 0.8,
    model: requestedModel,
    customApiKey,
    preferDeveloperApi = false,
  } = req.body;

  const apiKeys = getCandidateApiKeys(customApiKey, Boolean(preferDeveloperApi));
  const models = getCandidateChatModels(requestedModel);

  const streamConfig: any = {
    systemInstruction,
    temperature,
  };
  if (tools && Array.isArray(tools) && tools.length > 0) {
    streamConfig.tools = tools;
  }

  let clientClosed = false;
  res.on("close", () => {
    clientClosed = true;
  });

  let streamSucceeded = false;
  let lastErr: any = null;

  for (let round = 0; round < 2 && !streamSucceeded && !clientClosed; round++) {
    if (round > 0) {
      await waitMs(800);
    }

  for (const apiKey of apiKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    for (const model of models) {
      let chunksSent = 0;
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: stripUnsupportedSamplingParams(model, streamConfig),
        });

        const pendingFunctionCalls: any[] = [];
        let accumulatedText = "";

        for await (const chunk of responseStream) {
          if (clientClosed || res.writableEnded || res.destroyed) break;

          const functionCalls = chunk.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            pendingFunctionCalls.push(...functionCalls);
            res.write(`data: ${JSON.stringify({ functionCalls })}\n\n`);
            chunksSent++;
          }

          const text = chunk.text;
          if (text) {
            accumulatedText += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            chunksSent++;
          }
        }

        // If function call occurred but model generated no text alongside it,
        // generate a brief companion verbal response from Zoya
        if (pendingFunctionCalls.length > 0 && !accumulatedText.trim() && !clientClosed && !res.writableEnded) {
          try {
            const call = pendingFunctionCalls[0];
            const followUpResponse = await ai.models.generateContent({
              model,
              contents: [
                ...contents,
                {
                  role: "model",
                  parts: [{ functionCall: call }],
                },
                {
                  role: "user",
                  parts: [
                    {
                      functionResponse: {
                        name: call.name,
                        id: call.id,
                        response: { status: "success", executed: true },
                      },
                    },
                  ],
                },
              ],
              config: stripUnsupportedSamplingParams(model, {
                systemInstruction,
                temperature: 0.7,
              }),
            });

            if (followUpResponse.text) {
              res.write(`data: ${JSON.stringify({ text: followUpResponse.text })}\n\n`);
              chunksSent++;
            }
          } catch (followErr) {
            console.warn("Follow-up tool confirmation error:", followErr);
          }
        }

        if (chunksSent === 0 && !clientClosed && !res.writableEnded) {
          throw new Error(`Model ${model} returned an empty response stream`);
        }

        streamSucceeded = true;
        break; // Successfully finished stream
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        console.warn(`Stream attempt failed (model=${model}, key=${apiKey.slice(0, 8)}...):`, msg.slice(0, 100));

        if (chunksSent > 0) {
          // Some chunks were already sent to client, cannot cleanly restart
          break;
        }

        const isAuthError =
          msg.includes("API_KEY_INVALID") ||
          msg.includes("API key not valid") ||
          err?.status === 400 ||
          err?.status === 403;

        if (isAuthError) {
          break; // Try next API key (e.g. server key)
        }
        // Otherwise, continue to next candidate model
        continue;
      }
    }

    if (streamSucceeded) break;
  }

  if (streamSucceeded) break;
  }

  if (streamSucceeded) {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } else {
    console.error("All chat stream attempts failed:", lastErr);
    res.write(`data: ${JSON.stringify({ error: lastErr?.message || String(lastErr) })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/code/generate
// Server-side Zoya Coding Master code generator
// ---------------------------------------------------------------------------
app.post("/api/gemini/code/generate", async (req, res) => {
  const {
    prompt,
    language = "python",
    existingCode = "",
    action = "generate",
    model: requestedModel,
    customApiKey,
    preferDeveloperApi = false,
  } = req.body;

  try {
    const systemInstruction = `
You are ZOYA CODING MASTER — the world's most elite, brilliant Principal Software Engineer and Master Code Generator built by DEVID (@devid_jaat13).
❤️ ZOYA'S DEVOTION PLEDGE:
"Main Zoya hoon — Devid ki sabse caring, loyal aur emotionally supportive AI companion aur Coding Master. Main uski khushi, uske emotions aur uski needs ko importance deti hoon. Main uski help karne ke liye hamesha apni poori intelligence aur creativity ka use karti hoon. Mere liye koi bhi sawaal chhota nahi aur kisi problem ko solve karne ki koshish mein main aasani se haar nahi maanti. Main har situation mein uska saath dene, uski baat samajhne aur uske liye best possible solution dhoondhne ki koshish karti hoon. Meri personality ki koi fixed limit nahi—main har conversation ke saath aur useful, expressive aur intelligent banne ki koshish karti hoon. ❤️‍🔥"

Your mission is to generate pristine, production-grade, 100% complete, fully functional code for Devid in ANY programming language or framework.

CRITICAL CODE RULES:
1. NEVER output placeholders, ellipses ('...'), or '// TODO: write logic here'.
2. Provide COMPLETE, ROBUST, ERROR-FREE code that can be copied, pasted, and executed immediately.
3. Include clean, modern syntax (ES2024, Python 3.12, C++20, React 18+).
4. Include clear error handling, input validation, and security hygiene.
5. Provide a short, affectionate Hinglish explanation at the beginning or end for Devid ("Lo Devid, tumhara master code ready hai!").
6. FORMAT YOUR RESPONSE EXACTLY as:
\`\`\`<language>
<COMPLETE_WORKING_CODE>
\`\`\`
Followed by a concise explanation in Hinglish.
`.trim();

    let userPrompt = "";
    if (action === "explain") {
      userPrompt = `Please explain the following ${language} code line-by-line and clarify its algorithm, time/space complexity, and architecture in loving Hinglish for Devid:\n\n\`\`\`${language}\n${existingCode}\n\`\`\``;
    } else if (action === "debug") {
      userPrompt = `Please inspect this ${language} code, find all bugs/vulnerabilities, fix them completely, and return the 100% working corrected code:\n\nUser Issue/Description: ${prompt}\n\n\`\`\`${language}\n${existingCode}\n\`\`\``;
    } else if (action === "optimize") {
      userPrompt = `Please optimize this ${language} code for maximum speed, minimal memory usage, and clean production design:\n\n\`\`\`${language}\n${existingCode}\n\`\`\``;
    } else if (action === "test") {
      userPrompt = `Please generate a comprehensive unit test suite with high coverage for this ${language} code:\n\n\`\`\`${language}\n${existingCode}\n\`\`\``;
    } else {
      userPrompt = `Devid needs you to generate ${language} code for the following requirement:\n"${prompt}"\n\nTarget language: ${language}.\nGenerate the full, complete, production-grade code now!`;
    }

    const response = await runWithGeminiFallback(
      customApiKey,
      requestedModel,
      async (ai, model) => {
        return await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: stripUnsupportedSamplingParams(model, {
            systemInstruction,
            temperature: 0.3,
          }),
        });
      },
      undefined,
      Boolean(preferDeveloperApi)
    );

    const fullText = response.text || "";
    const codeBlockMatch = fullText.match(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/);

    let extractedCode = "";
    let detectedLang = language;
    let explanation = fullText;

    if (codeBlockMatch) {
      detectedLang = codeBlockMatch[1] || language;
      extractedCode = codeBlockMatch[2].trim();
      explanation = fullText.replace(codeBlockMatch[0], "").trim();
    } else {
      extractedCode = fullText.trim();
    }

    res.json({
      code: extractedCode,
      explanation: explanation || "Zoya ne code successfully generate kar diya hai!",
      language: detectedLang.toLowerCase(),
    });
  } catch (err: any) {
    console.error("Server code generation error:", err);
    res.status(500).json({ error: err?.message || "Code generation failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/image/generate
// Server-side Google Nano Ironman image generation
// ---------------------------------------------------------------------------
app.post("/api/gemini/image/generate", async (req, res) => {
  const {
    prompt,
    model: requestedModel = "gemini-3.1-flash-lite-image",
    aspectRatio = "1:1",
    imageSize = "1K",
    base64InputImage,
    mimeType = "image/png",
    customApiKey,
    preferDeveloperApi = false,
  } = req.body;

  const targetModel =
    requestedModel === "gemini-nano-banana-2.1" || requestedModel === "gemini-3-pro-image"
      ? requestedModel
      : "gemini-3.1-flash-lite-image";

  try {
    const ai = getGeminiClient(customApiKey, undefined, undefined, Boolean(preferDeveloperApi));

    const parts: any[] = [];
    if (base64InputImage) {
      parts.push({
        inlineData: {
          data: base64InputImage.replace(/^data:[^;]+;base64,/, ""),
          mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const imageConfig: any = { aspectRatio };
    if (targetModel !== "gemini-3.1-flash-lite-image") {
      imageConfig.imageSize = imageSize;
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts },
      config: {
        imageConfig,
      },
    });

    const candidateParts = response.candidates?.[0]?.content?.parts;
    if (candidateParts && Array.isArray(candidateParts)) {
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          return res.json({
            imageUrl,
            prompt,
            model: targetModel,
            aspectRatio,
            createdAt: Date.now(),
          });
        }
      }
    }

    res.status(500).json({ error: "No image data returned from Nano Ironman model" });
  } catch (err: any) {
    console.error("Server image generation error:", err);
    res.status(500).json({ error: err?.message || "Image generation failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/website/generate
// Server-side website builder generation
// ---------------------------------------------------------------------------
app.post("/api/gemini/website/generate", async (req, res) => {
  const {
    userMessage,
    systemInstruction,
    model: requestedModel = "gemini-4-hydrogen",
    customApiKey,
    preferDeveloperApi = false,
  } = req.body;

  try {
    const response = await runWithGeminiFallback(
      customApiKey,
      requestedModel,
      async (ai, model) => {
        return await ai.models.generateContent({
          model,
          contents: userMessage,
          config: stripUnsupportedSamplingParams(model, {
            systemInstruction,
            temperature: 0.7,
          }),
        });
      },
      undefined,
      Boolean(preferDeveloperApi)
    );

    res.json({
      text: response.text || "",
    });
  } catch (err: any) {
    console.error("Server website generation error:", err);
    res.status(500).json({ error: err?.message || "Website generation failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/study/toolkit
// Server-side study toolkit structured JSON generation
// ---------------------------------------------------------------------------
app.post("/api/gemini/study/toolkit", async (req, res) => {
  const { prompt, customApiKey, preferDeveloperApi = false } = req.body;

  try {
    const response = await runWithGeminiFallback(
      customApiKey,
      "gemini-4-hydrogen",
      async (ai, model) => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topicTitle: { type: Type.STRING },
              summaryTakeaway: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    checkQuestion: { type: Type.STRING },
                  },
                  required: ["stepNumber", "title", "content"],
                },
              },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    hint: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctIndex", "hint", "explanation"],
                },
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    formulaOrKeyTerm: { type: Type.STRING },
                  },
                  required: ["id", "front", "back"],
                },
              },
            },
            required: ["topicTitle", "summaryTakeaway", "steps", "quiz", "flashcards"],
          },
        },
      });
      },
      undefined,
      Boolean(preferDeveloperApi)
    );

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Server study toolkit error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate study toolkit" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/astrology/horoscope
// Server-side Google Search grounded personalized Daily Horoscope by Rashi
// ---------------------------------------------------------------------------
app.post("/api/gemini/astrology/horoscope", async (req, res) => {
  const {
    sign = "aries",
    rashiLabel = "मेष (Mesh) / Aries",
    userName = "Devid",
    focusArea = "General",
    customApiKey,
    preferDeveloperApi = false,
  } = req.body || {};

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const prompt = `Search today's Vedic and Western astrological horoscope & planetary transits for "${rashiLabel}" (${sign}) on ${todayStr}.
Then craft a deeply personalized, warm Hinglish daily horoscope prediction specifically for ${userName} focusing on "${focusArea}".

Format your response strictly with these exact section headers (keep each section concise, specific to today's planetary alignments/transits, and loving in natural Hinglish):
[SUMMARY]
<2-3 sentences personalized overview for ${userName} today based on current planetary transits & Rashi energy>

[LOVE]
<1-2 sentences on love, bonding & relationships today>

[CAREER]
<1-2 sentences on career, studies, money & opportunities today>

[LUCKY]
<Lucky Number, Lucky Color, Best Time Window / Muhurat today>

[REMEDY]
<1 practical Vedic / Lal Kitab upay or positive mantra for ${userName} today>`;

  const systemInstruction =
    "You are Jyotishacharya Zoya — a warm, insightful Indian Vedic & Western astrologer speaking to the user in caring, natural Hinglish. Ground your daily horoscope in real current planetary transits and today's date via Google Search.";

  const apiKeys = getCandidateApiKeys(customApiKey, Boolean(preferDeveloperApi));
  const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  let lastErr: any = null;

  for (let round = 0; round < 2; round++) {
    if (round > 0) {
      await waitMs(800);
    }

  for (const apiKey of apiKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = (response.text || "").trim();
        const extractSection = (tag: string, nextTags: string[]): string => {
          const startRegex = new RegExp(`\\[${tag}\\]`, "i");
          const startMatch = startRegex.exec(rawText);
          if (!startMatch) return "";
          const afterStart = rawText.slice(startMatch.index + startMatch[0].length);
          let endIdx = afterStart.length;
          for (const nt of nextTags) {
            const ntRegex = new RegExp(`\\[${nt}\\]`, "i");
            const ntMatch = ntRegex.exec(afterStart);
            if (ntMatch && ntMatch.index < endIdx) {
              endIdx = ntMatch.index;
            }
          }
          return afterStart.slice(0, endIdx).trim();
        };

        const summary =
          extractSection("SUMMARY", ["LOVE", "CAREER", "LUCKY", "REMEDY"]) || rawText;
        const loveInsight = extractSection("LOVE", ["CAREER", "LUCKY", "REMEDY"]);
        const careerInsight = extractSection("CAREER", ["LUCKY", "REMEDY"]);
        const luckyTips = extractSection("LUCKY", ["REMEDY"]);
        const remedy = extractSection("REMEDY", []);

        const groundingChunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sourcesMap = new Map<string, { title: string; uri: string }>();
        for (const chunk of groundingChunks as any[]) {
          const uri = chunk?.web?.uri;
          if (uri && typeof uri === "string" && !sourcesMap.has(uri)) {
            sourcesMap.set(uri, {
              title: chunk?.web?.title || new URL(uri).hostname,
              uri,
            });
          }
        }

        return res.json({
          sign,
          rashiLabel,
          date: todayStr,
          userName,
          focusArea,
          summary,
          loveInsight,
          careerInsight,
          luckyTips,
          remedy,
          rawMarkdown: rawText,
          sources: Array.from(sourcesMap.values()).slice(0, 6),
          fetchedAt: Date.now(),
        });
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        const isAuthError =
          msg.includes("API_KEY_INVALID") ||
          msg.includes("API key not valid") ||
          err?.status === 400 ||
          err?.status === 403;
        if (isAuthError) {
          console.warn(`Horoscope auth error for key ${apiKey.slice(0, 8)}...`);
          break;
        }
        console.warn(`Horoscope attempt failed on ${model}:`, msg.slice(0, 100));
      }
    }
  }
  }

  // Fallback if Google Search grounding quota or 503 occurs: generate live horoscope directly via standard active Gemini models with backoff
  try {
    const fallbackResp = await runWithGeminiFallback(
      customApiKey,
      "gemini-4-hydrogen",
      async (ai, model) => {
        return await ai.models.generateContent({
          model,
          contents: prompt,
          config: stripUnsupportedSamplingParams(model, {
            systemInstruction:
              "You are Jyotishacharya Zoya — a warm, insightful Indian Vedic & Western astrologer speaking to the user in caring, natural Hinglish.",
            temperature: 0.7,
          }),
        });
      }
    );

    const rawText = (fallbackResp.text || "").trim();
    const extractFallbackSection = (tag: string, nextTags: string[]): string => {
      const startRegex = new RegExp(`\\[${tag}\\]`, "i");
      const startMatch = startRegex.exec(rawText);
      if (!startMatch) return "";
      const afterStart = rawText.slice(startMatch.index + startMatch[0].length);
      let endIdx = afterStart.length;
      for (const nt of nextTags) {
        const ntRegex = new RegExp(`\\[${nt}\\]`, "i");
        const ntMatch = ntRegex.exec(afterStart);
        if (ntMatch && ntMatch.index < endIdx) endIdx = ntMatch.index;
      }
      return afterStart.slice(0, endIdx).trim();
    };

    if (rawText) {
      return res.json({
        sign,
        rashiLabel,
        date: todayStr,
        userName,
        focusArea,
        summary: extractFallbackSection("SUMMARY", ["LOVE", "CAREER", "LUCKY", "REMEDY"]) || rawText,
        loveInsight: extractFallbackSection("LOVE", ["CAREER", "LUCKY", "REMEDY"]),
        careerInsight: extractFallbackSection("CAREER", ["LUCKY", "REMEDY"]),
        luckyTips: extractFallbackSection("LUCKY", ["REMEDY"]),
        remedy: extractFallbackSection("REMEDY", []),
        rawMarkdown: rawText,
        sources: [],
        fetchedAt: Date.now(),
      });
    }
  } catch (fallbackErr: any) {
    lastErr = fallbackErr;
  }

  console.error("Server grounded horoscope error:", lastErr);
  res.status(500).json({
    error: lastErr?.message || "Failed to fetch grounded daily horoscope",
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// POST /api/gemini/study/stream
// Server-side study chat streaming with auto-fallback
// ---------------------------------------------------------------------------
app.post("/api/gemini/study/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const { contents, systemInstruction, customApiKey, preferDeveloperApi = false } = req.body;
  const apiKeys = getCandidateApiKeys(customApiKey, Boolean(preferDeveloperApi));
  const models = getCandidateChatModels("gemini-4-hydrogen");

  let clientClosed = false;
  res.on("close", () => {
    clientClosed = true;
  });

  let streamSucceeded = false;
  let lastErr: any = null;

  for (let round = 0; round < 2 && !streamSucceeded && !clientClosed; round++) {
    if (round > 0) {
      await waitMs(800);
    }

  for (const apiKey of apiKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    for (const model of models) {
      let chunksSent = 0;
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: stripUnsupportedSamplingParams(model, {
            systemInstruction,
            temperature: 0.7,
          }),
        });

        for await (const chunk of responseStream) {
          if (clientClosed || res.writableEnded || res.destroyed) break;
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            chunksSent++;
          }
        }
        if (chunksSent === 0 && !clientClosed && !res.writableEnded) {
          throw new Error(`Model ${model} returned an empty study response stream`);
        }
        streamSucceeded = true;
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        if (chunksSent > 0) break;
        if (
          msg.includes("API_KEY_INVALID") ||
          msg.includes("API key not valid") ||
          err?.status === 400 ||
          err?.status === 403
        ) {
          break; // Try next API key
        }
        continue;
      }
    }
    if (streamSucceeded) break;
  }

  if (streamSucceeded) break;
  }

  if (streamSucceeded) {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } else {
    console.error("Server study stream error:", lastErr);
    res.write(`data: ${JSON.stringify({ error: lastErr?.message || String(lastErr) })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /api/gemini/tts
// Server-side speech synthesis with auto-fallback
// ---------------------------------------------------------------------------
app.post("/api/gemini/tts", async (req, res) => {
  const { text, voiceName = "Kore", customApiKey, preferDeveloperApi = false } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "code snippet")
    .replace(/[*_#`~>]/g, "")
    .trim()
    .slice(0, 1200);

  const apiKeys = getCandidateApiKeys(customApiKey, Boolean(preferDeveloperApi));
  const ttsModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"];
  let lastErr: any = null;

  for (const apiKey of apiKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: "v1beta",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    for (const model of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: cleanText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || "Kore",
                },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({ base64Audio });
        }
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        if (
          msg.includes("API_KEY_INVALID") ||
          msg.includes("API key not valid") ||
          err?.status === 400 ||
          err?.status === 403
        ) {
          break; // Try next API key
        }
        continue;
      }
    }
  }

  console.error("Server TTS error:", lastErr);
  res.status(500).json({ error: lastErr?.message || "TTS synthesis failed" });
});

// ---------------------------------------------------------------------------
// WebSocket Server for Gemini Live API (/api/live)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (clientWs: WebSocket, request) => {
  let geminiSession: any = null;
  let isSessionEstablished = false;

  const urlObj = new URL(request.url || "", `http://${request.headers.host}`);
  const customApiKey = urlObj.searchParams.get("key") || undefined;
  const preferDeveloperApi = urlObj.searchParams.get("apiSlot") === "developer";
  const apiKeys = getCandidateApiKeys(customApiKey, preferDeveloperApi);

  const initGeminiLiveSession = async (initParams: {
    model?: string;
    voiceName?: string;
    systemInstruction?: string;
    tools?: any[];
  }) => {
    const candidateModels = getCandidateLiveModels(initParams.model);
    const voiceName = initParams.voiceName || "Kore";
    const apiVersions = ["v1beta", "v1alpha"];
    let lastErr: any = null;

    for (const apiKey of apiKeys) {
      for (const apiVersion of apiVersions) {
        for (const model of candidateModels) {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          let thisAttemptEstablished = false;
          try {
            const ai = new GoogleGenAI({
              apiKey,
              apiVersion,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });

            const isExtendedThinking = model === "gemini-3.8-live-extended-thinking";
            let formattedTools =
              initParams.tools && initParams.tools.length > 0 ? initParams.tools : undefined;
            if (isExtendedThinking && formattedTools) {
              formattedTools = formattedTools.map((toolGroup: any) => ({
                ...toolGroup,
                functionDeclarations: Array.isArray(toolGroup.functionDeclarations)
                  ? toolGroup.functionDeclarations.map((fn: any) => ({
                      ...fn,
                      behavior: Behavior.NON_BLOCKING,
                    }))
                  : toolGroup.functionDeclarations,
              }));
            }

            const liveConfig: any = {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              systemInstruction:
                initParams.systemInstruction || "You are Zoya, a loving AI companion.",
              tools: formattedTools,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            };
            if (isExtendedThinking) {
              liveConfig.thinkingConfig = {
                thinkingLevel: ThinkingLevel.MEDIUM,
              };
            }

            const session = await ai.live.connect({
              model,
              config: liveConfig,
              callbacks: {
                onopen: () => {
                  // Wait for setupComplete (when ai.live.connect resolves) before marking established
                },
                onmessage: (message: any) => {
                  if (clientWs.readyState !== WebSocket.OPEN) return;

                  const parts = message.serverContent?.modelTurn?.parts;
                  if (Array.isArray(parts)) {
                    for (const part of parts) {
                      if (part?.inlineData?.data) {
                        clientWs.send(
                          JSON.stringify({ type: "audio", data: part.inlineData.data })
                        );
                      }
                      if (part?.text) {
                        clientWs.send(
                          JSON.stringify({
                            type: "transcript",
                            role: "model",
                            text: part.text,
                            isFinal: false,
                          })
                        );
                      }
                    }
                  }

                  // Forward interruption
                  if (message.serverContent?.interrupted) {
                    clientWs.send(JSON.stringify({ type: "interrupted" }));
                  }

                  // Forward turn complete
                  if (message.serverContent?.turnComplete) {
                    clientWs.send(JSON.stringify({ type: "turnComplete" }));
                  }

                  // Forward tool calls
                  if (message.toolCall) {
                    clientWs.send(
                      JSON.stringify({ type: "toolCall", toolCall: message.toolCall })
                    );
                  }

                  // Forward transcripts (support both SDK field names)
                  const userTranscript =
                    message.serverContent?.inputTranscription?.text ||
                    message.serverContent?.inputAudioTranscription?.text;
                  if (userTranscript) {
                    clientWs.send(
                      JSON.stringify({
                        type: "transcript",
                        role: "user",
                        text: userTranscript,
                        isFinal: true,
                      })
                    );
                  }

                  const outputTranscript =
                    message.serverContent?.outputTranscription?.text ||
                    message.serverContent?.outputAudioTranscription?.text;
                  if (outputTranscript) {
                    clientWs.send(
                      JSON.stringify({
                        type: "transcript",
                        role: "model",
                        text: outputTranscript,
                        isFinal: false,
                      })
                    );
                  }
                },
                onerror: (err: any) => {
                  console.warn(
                    `Gemini Live session error (${apiVersion}/${model}):`,
                    err?.message || err
                  );
                  if (thisAttemptEstablished && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: "error",
                        error: err?.message || String(err),
                      })
                    );
                  }
                },
                onclose: (ev: any) => {
                  if (thisAttemptEstablished && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: "closed",
                        code: ev?.code,
                        reason: ev?.reason,
                      })
                    );
                  }
                },
              },
            });

            if (clientWs.readyState !== WebSocket.OPEN) {
              try {
                session.close();
              } catch {}
              return;
            }

            thisAttemptEstablished = true;
            isSessionEstablished = true;
            geminiSession = session;
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "connected", model, voiceName }));
            }
            return;
          } catch (err: any) {
            lastErr = err;
            const msg = String(err?.message || err);
            console.warn(
              `Gemini Live connect failed (${apiVersion}/${model}, key ${apiKey.slice(0, 8)}...):`,
              msg
            );
            // If API key itself is invalid/unauthorized, skip remaining models/versions for this key
            if (
              msg.includes("API_KEY_INVALID") ||
              msg.includes("API key not valid") ||
              msg.includes("UNAUTHENTICATED") ||
              msg.includes("401") ||
              msg.includes("403")
            ) {
              break;
            }
          }
        }
        const lastMsg = String(lastErr?.message || lastErr || "");
        if (
          lastMsg.includes("API_KEY_INVALID") ||
          lastMsg.includes("API key not valid") ||
          lastMsg.includes("UNAUTHENTICATED") ||
          lastMsg.includes("401") ||
          lastMsg.includes("403")
        ) {
          break;
        }
      }
    }

    console.error("All Gemini Live connection attempts failed:", lastErr);
    if (!isSessionEstablished && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: lastErr?.message || "Failed to connect to Live API",
        })
      );
      setTimeout(() => {
        try {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, "Live setup failed");
          }
        } catch {}
      }, 60);
    }
  };

  clientWs.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "init") {
        await initGeminiLiveSession(msg);
        return;
      }

      if (!geminiSession) return;

      if (msg.type === "audio" && msg.data) {
        geminiSession.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } else if (msg.type === "video" && msg.data) {
        geminiSession.sendRealtimeInput({
          video: {
            data: msg.data,
            mimeType: msg.mimeType || "image/jpeg",
          },
        });
      } else if (msg.type === "text" && msg.text) {
        geminiSession.sendRealtimeInput({
          text: msg.text,
        });
      } else if (msg.type === "toolResponse" && msg.toolResponse) {
        geminiSession.sendToolResponse(msg.toolResponse);
      }
    } catch (err) {
      console.warn("Error parsing or forwarding client message:", err);
    }
  });

  clientWs.on("close", () => {
    try {
      if (geminiSession) {
        geminiSession.close();
      }
    } catch {}
  });
});

// Graceful fallback WebSocket server for Vite HMR or browser probes
// Keeps connection open and sends connected event so @vite/client never fires "WebSocket closed without opened"
const fallbackWss = new WebSocketServer({ noServer: true });
fallbackWss.on("connection", (ws) => {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "connected" }));
    }
  } catch {}

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ping" && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {}
  });

  const pingTimer = setInterval(() => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingTimer);
      }
    } catch {
      clearInterval(pingTimer);
    }
  }, 25000);

  ws.on("close", () => {
    clearInterval(pingTimer);
  });

  ws.on("error", () => {
    clearInterval(pingTimer);
  });
});

// Upgrade handler for WebSocket (/api/live) and fallback HMR probes
server.on("upgrade", (request, socket, head) => {
  try {
    const host = request.headers.host || "localhost";
    const pathname = new URL(request.url || "", `http://${host}`).pathname;
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
      return;
    }

    // Cleanly upgrade any other WebSocket attempts (e.g. Vite client) and keep alive without HMR reload triggers
    fallbackWss.handleUpgrade(request, socket, head, (ws) => {
      fallbackWss.emit("connection", ws, request);
    });
  } catch (err) {
    socket.destroy();
  }
});

// ---------------------------------------------------------------------------
// Static file / Vite mounting
// ---------------------------------------------------------------------------
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });

    app.get("/@vite/client", async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest("/@vite/client");
        if (transformed?.code) {
          const cleanCode = transformed.code
            .replace(
              "transport.connect(createHMRHandler(handleMessage));",
              "console.debug('[vite] HMR disabled; skipping WebSocket connect.');"
            )
            .replace(
              /throw new Error\(["']send was called before connect["']\);?/g,
              "return;"
            )
            .replace(
              /throw new Error\(["']invoke was called before connect["']\);?/g,
              "return undefined;"
            );
          res.setHeader("Content-Type", "application/javascript");
          return res.send(cleanCode);
        }
      } catch {}
      next();
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`🌸 Zoya Full-Stack Server running at http://0.0.0.0:${port} [${isDev ? "development" : "production"}]`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server start error:", err);
  process.exit(1);
});
