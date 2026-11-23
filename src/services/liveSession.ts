const Type = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;
import { AudioStreamer } from "./audioStreamer";
import {
  AppConfig,
  ScreenControlPayload,
  ScreenPointerTarget,
  SessionState,
  ToolCallEvent,
  getAllAvailableApiKeys,
  isDeveloperApiSlot,
  resolveActiveApiKey,
  resolveCharacterPreset,
} from "../types";
import { buildZoyaSystemInstruction } from "./chatService";
import { addSavedMemory, removeSavedMemoryByKeyword } from "./memoryService";
import { loadSavedAngerLevel, saveAngerLevel, saveAngerReason } from "./angerService";
import { dontTouchMyPhoneService } from "./dontTouchMyPhoneService";
import { noiseFitHealthService } from "./noiseFitHealthService";
import { deviceControlService } from "./deviceControlService";
import { computeAstrologyToolPayload } from "./astrologyService";
import { ownerVoiceService } from "./ownerVoiceService";
import { getLiveWsUrl } from "../utils/apiBase";
import { developerTelemetryService } from "./developerTelemetryService";
import {
  buildZoyaDomainBrowserUrl,
  formatZoyaDomain,
  normalizeZoyaSubdomain,
  resolveOpenWebsiteTarget,
} from "../zoyaDomain";

export interface LiveSessionCallbacks {
  onStateChange?: (state: SessionState) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onError?: (error: Error | string) => void;
  onScreenShareChange?: (
    isSharing: boolean,
    stream: MediaStream | null,
    mode?: "full_screen" | "mobile_mirror"
  ) => void;
  onCameraChange?: (
    isActive: boolean,
    stream: MediaStream | null,
    facingMode: "user" | "environment"
  ) => void;
  onScreenControl?: (payload: ScreenControlPayload) => void;
  onScreenPointer?: (pointer: ScreenPointerTarget) => void;
  onLiveTranscript?: (role: "user" | "model", text: string, isFinal: boolean) => void;
  onNanoIronmanRequest?: (request: {
    prompt: string;
    aspectRatio?: string;
    modelTier?: string;
    timestamp: number;
  }) => void;
  onNanoBananaRequest?: (request: {
    prompt: string;
    aspectRatio?: string;
    modelTier?: string;
    timestamp: number;
  }) => void;
  onDontTouchMyPhoneAction?: (action: "arm" | "disarm" | "open") => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private activeSession: any = null;
  private streamer: AudioStreamer;
  private isConnecting: boolean = false;
  private isExplicitlyDisconnected: boolean = false;
  private reconnectTimer: any = null;
  private goAwayTimer: any = null;
  private resumptionHandle: string | undefined = undefined;
  private connectionId: number = 0;
  private state: SessionState = "disconnected";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  // Full Mobile / Device Screen Sharing State
  private screenStream: MediaStream | null = null;
  private screenVideoEl: HTMLVideoElement | null = null;
  private screenCanvasEl: HTMLCanvasElement | null = null;
  private screenFrameTimer: any = null;
  private screenFrameWorker: Worker | null = null;
  private screenShareMode: "full_screen" | "mobile_mirror" = "full_screen";
  private mobileMirrorRenderTimer: any = null;
  private customMobileScreenImg: HTMLImageElement | null = null;

  // Live Camera State
  private cameraStream: MediaStream | null = null;
  private cameraVideoEl: HTMLVideoElement | null = null;
  private cameraCanvasEl: HTMLCanvasElement | null = null;
  private cameraFrameTimer: any = null;
  private cameraFacingMode: "user" | "environment" = "user";

  // Live Voice Transcription Buffers
  private pendingUserTranscript: string = "";
  private pendingModelTranscript: string = "";

  // Inactivity & Real Girlfriend Behavioral Engine
  private lastUserInteractionTime: number = Date.now();
  private inactivityCheckInterval: any = null;
  private inactivityStage: number = 0; // 0 = normal, 1 = anger/pout triggered, 2 = proactive topic triggered

  private callbacks: LiveSessionCallbacks = {};

  constructor(private config: AppConfig, streamer: AudioStreamer, callbacks: LiveSessionCallbacks = {}) {
    this.streamer = streamer;
    this.callbacks = callbacks;
    const charPreset = resolveCharacterPreset(config);
    this.streamer.setCharacter(charPreset.id);
    ownerVoiceService.configure({
      enabled: Boolean(config.ownerVoiceEnabled),
      threshold: config.ownerVoiceThreshold,
      ownerName: config.userName || "Devid",
      assistantName: config.assistantName || "Zoya",
    });
    this.setupStreamerCallbacks();
  }

  private setupStreamerCallbacks() {
    this.streamer.setCallbacks({
      onRawInputFrame: (samples: Float32Array, sampleRate: number) => {
        if (this.config.ownerVoiceEnabled && ownerVoiceService.hasEnrolledProfiles()) {
          ownerVoiceService.feedLiveAudioFrame(samples, sampleRate);
        }
      },
      onInputChunk: (base64Chunk: string) => {
        if (!this.activeSession || this.isConnecting || this.state === "disconnected") {
          return;
        }
        if (this.config.ownerVoiceEnabled && ownerVoiceService.shouldSuppressStrangerInput()) {
          return;
        }
        try {
          this.activeSession.sendRealtimeInput({
            audio: {
              data: base64Chunk,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (err) {
          console.warn("Failed to stream audio chunk to Gemini Live:", err);
        }
      },
      onPlaybackStateChange: (isPlaying: boolean) => {
        if (this.state === "disconnected" || this.isConnecting) return;
        this.setState(isPlaying ? "speaking" : "listening");
        if (!isPlaying) {
          this.lastUserInteractionTime = Date.now();
        }
      },
    });
  }

  public setCallbacks(callbacks: LiveSessionCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public updateConfig(newConfig: AppConfig) {
    const prevKey = resolveActiveApiKey(this.config);
    const nextKey = resolveActiveApiKey(newConfig);
    const prevChar = resolveCharacterPreset(this.config);
    const nextChar = resolveCharacterPreset(newConfig);
    const charChanged =
      prevChar.id !== nextChar.id ||
      this.config.assistantName !== newConfig.assistantName;
    const apiChanged =
      prevKey !== nextKey ||
      this.config.liveModel !== newConfig.liveModel ||
      this.config.activeApiSlot !== newConfig.activeApiSlot;
    const voiceChanged = this.config.voiceName !== newConfig.voiceName;
    const personaChanged =
      this.config.personaVibe !== newConfig.personaVibe ||
      this.config.customInstructions !== newConfig.customInstructions;
    this.config = newConfig;

    this.streamer.setCharacter(nextChar.id);
    ownerVoiceService.configure({
      enabled: Boolean(newConfig.ownerVoiceEnabled),
      threshold: newConfig.ownerVoiceThreshold,
      ownerName: newConfig.userName || "Devid",
      assistantName: newConfig.assistantName || "Zoya",
    });

    if (
      (apiChanged || voiceChanged || personaChanged || charChanged) &&
      this.activeSession &&
      !this.isExplicitlyDisconnected
    ) {
      // Reset resumption handle when API key, model, voice, or persona config changes so new settings take effect cleanly
      this.resumptionHandle = undefined;
      this.reconnect();
    }
  }

  private setState(newState: SessionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  public getState(): SessionState {
    return this.state;
  }

  private buildSystemPrompt(): string {
    return buildZoyaSystemInstruction(this.config, true);
  }

  public async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isExplicitlyDisconnected = false;
    this.setState("connecting");

    const targetLiveModel = this.config.liveModel || "gemini-3.8-live";

    try {
      // 1. Initialize Audio Hardware
      await this.streamer.initOutput();
      await this.streamer.startInput();

      await this.establishLiveSession(targetLiveModel);
    } catch (err: any) {
      console.warn("LiveSession connection failed:", err);
      this.callbacks.onError?.(err?.message || "Failed to establish voice session");
      this.disconnect();
      throw err;
    }
  }

  private async establishLiveSession(primaryModel: string) {
    if (this.isExplicitlyDisconnected) return;
    this.isConnecting = true;
    const currentConnId = ++this.connectionId;

    const activeChar = resolveCharacterPreset(this.config);
    this.streamer.setCharacter(activeChar.id);
    const voiceToUse = this.config.voiceName || activeChar.defaultVoice || "Kore";

    const customKey = resolveActiveApiKey(this.config);
    const searchParams = new URLSearchParams();
    if (customKey) searchParams.set("key", customKey);
    if (isDeveloperApiSlot(this.config)) searchParams.set("apiSlot", "developer");
    const qs = searchParams.toString();
    const wsUrl = getLiveWsUrl(qs ? `?${qs}` : "");

    const liveTools: any[] = [
          {
            functionDeclarations: [
              {
                name: "saveMemory",
                description:
                  "Save an important fact, preference, personal detail, goal, or note about the user into Zoya's permanent Long-Term Memory (like Google Gemini Saved Info) so she remembers it across all future Chat and Live Voice sessions.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    fact: {
                      type: Type.STRING,
                      description:
                        "Clear, concise statement of what to remember about the user (e.g., 'Loves late-night coding and black coffee', 'Best friend is Rahul', 'Preparing for physics exam on Friday').",
                    },
                    category: {
                      type: Type.STRING,
                      description:
                        "One of: 'personal', 'preference', 'relationship', 'goal', 'work_study', 'important'",
                    },
                  },
                  required: ["fact"],
                },
              },
              {
                name: "forgetMemory",
                description:
                  "Remove or forget a previously saved memory matching a keyword when the user asks Zoya to forget something.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: {
                      type: Type.STRING,
                      description: "Keyword or phrase of the memory to forget.",
                    },
                  },
                  required: ["keyword"],
                },
              },
              {
                name: "controlScreen",
                description:
                  "Directly control the screen, app UI, camera, screen sharing, scrolling, audio volume, or active persona mode.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    command: {
                      type: Type.STRING,
                      description:
                        "One of: 'switch_view', 'set_persona_mode', 'set_ui_theme', 'camera_on', 'camera_off', 'flip_camera', 'screen_share_on', 'screen_share_off', 'expand_preview', 'minimize_preview', 'scroll_down', 'scroll_up', 'scroll_top', 'scroll_bottom', 'volume_up', 'volume_down', 'mute_speaker', 'unmute_speaker', 'mute_mic', 'unmute_mic', 'open_settings', 'close_settings', 'new_chat', 'end_live_and_new_chat', 'open_astrology', 'close_astrology', 'activate_astrology_mode', 'deactivate_astrology_mode', 'activate_owner_voice', 'deactivate_owner_voice'",
                    },
                    target: {
                      type: Type.STRING,
                      description:
                        "For 'switch_view': 'chat' | 'study' | 'live'. For 'set_persona_mode': 'girlfriend' | 'normal' | 'serious' | 'super_loyal'. For 'set_ui_theme': 'midnight_rose' | 'stark_hud' | 'daylight_ivory' | 'royal_vedic' | 'emerald_aurora'. Optional for other commands.",
                    },
                  },
                  required: ["command"],
                },
              },
              {
                name: "pointOnScreen",
                description:
                  "Move Zoya's glowing visual AI cursor/pointer to highlight a specific coordinate on the user's screen or shared screen preview.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    xPercent: {
                      type: Type.NUMBER,
                      description: "Horizontal position on screen from 0 (left edge) to 100 (right edge).",
                    },
                    yPercent: {
                      type: Type.NUMBER,
                      description: "Vertical position on screen from 0 (top edge) to 100 (bottom edge).",
                    },
                    label: {
                      type: Type.STRING,
                      description: "Short note or callout to display next to Zoya's screen pointer.",
                    },
                  },
                  required: ["xPercent", "yPercent", "label"],
                },
              },
              {
                name: "openWebsite",
                description: "Open any website URL in the user's browser (e.g. youtube.com, github.com, reddit.com, netflix.com, etc.).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The full or clean URL to open (e.g., 'https://youtube.com', 'github.com')",
                    },
                    siteName: {
                      type: Type.STRING,
                      description: "Friendly name of the website being opened.",
                    },
                  },
                  required: ["url"],
                },
              },
              {
                name: "searchWeb",
                description: "Search the web or Google for information, news, or topics.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "The search query keywords.",
                    },
                  },
                  required: ["query"],
                },
              },
              {
                name: "playMedia",
                description: "Play music, songs, or videos on YouTube or Spotify.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    platform: {
                      type: Type.STRING,
                      description: "'youtube' or 'spotify'",
                    },
                    query: {
                      type: Type.STRING,
                      description: "Song title, artist, or video to play.",
                    },
                  },
                  required: ["platform", "query"],
                },
              },
              {
                name: "executeBrowserAction",
                description: "Execute general browser navigation and interaction commands.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description: "'open', 'youtube', 'spotify', or 'whatsapp'",
                    },
                    query: {
                      type: Type.STRING,
                      description: "Target search or site content.",
                    },
                    target: {
                      type: Type.STRING,
                      description: "Optional phone number or target destination.",
                    },
                  },
                  required: ["actionType", "query"],
                },
              },
              {
                name: "buildWebsite",
                description:
                  "Build and automatically publish a complete, interactive, modern website (HTML5, Tailwind CSS, JavaScript) inside Zoya's movable Live Website Builder Studio.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    projectName: {
                      type: Type.STRING,
                      description:
                        "Exact topic title for the website project matching what the user asked for (e.g. 'TradeX Pro Trading Website', 'Sneaker Store', 'Gym Website'). Never use a generic photo/portfolio name unless requested.",
                    },
                    prompt: {
                      type: Type.STRING,
                      description:
                        "Detailed description of the website to build and host, matching the exact domain requested by the user (e.g. live candlestick charts, orderbook, and Buy/Sell execution for a Trading Website).",
                    },
                    openInBrowser: {
                      type: Type.BOOLEAN,
                      description:
                        "Set to true to immediately host and open the published website in a new browser tab.",
                    },
                  },
                  required: ["projectName", "prompt"],
                },
              },
              {
                name: "publishWebsite",
                description:
                  "Immediately host and publish the user's requested website live on the browser and open the live hosted URL in a browser tab. Always pass the exact website name/topic in projectName (e.g. 'Trading Website') so the exact website is hosted.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    projectName: {
                      type: Type.STRING,
                      description:
                        "Exact name or topic of the website to publish/host (e.g. 'Trading Website', 'TradeX Pro', 'Sneaker Store').",
                    },
                    customSlug: {
                      type: Type.STRING,
                      description:
                        "Optional URL slug for the live browser link (e.g. 'tradex-pro-trading', 'my-store').",
                    },
                  },
                },
              },
              {
                name: "generateNanoIronmanImage",
                description:
                  "Generate or edit an AI image using Google's Nano Ironman model (Gemini Flash Image / Nano Ironman 2 / Nano Ironman Pro) based on the user's prompt (e.g., 'generate a cybernetic tiger in neon Tokyo', 'make an ironman suit portrait with Nano Ironman', 'create a wallpaper').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: {
                      type: Type.STRING,
                      description:
                        "Detailed description of the image or visual creation requested.",
                    },
                    aspectRatio: {
                      type: Type.STRING,
                      description:
                        "Aspect ratio for the image: '1:1', '16:9', '9:16', '4:3', '3:4'. Defaults to '1:1'.",
                    },
                    modelTier: {
                      type: Type.STRING,
                      description:
                        "Optional model tier: 'gemini-3.1-flash-lite-image' (Nano Ironman Lite), 'gemini-3.1-flash-image' (Nano Ironman 2), or 'gemini-3-pro-image' (Nano Ironman Pro).",
                    },
                  },
                  required: ["prompt"],
                },
              },
              {
                name: "activateDontTouchMyPhone",
                description:
                  "Arm and activate the 'Don't Touch My Phone' anti-theft motion alarm and protection for the user's phone. When someone touches or moves the phone while armed, Zoya sounds a loud police siren, warns the intruder, secretly takes their front camera photo, and saves it to the Intruder Gallery. User can turn it off by saying 'Turn off don't touch my phone'.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    delaySeconds: {
                      type: Type.NUMBER,
                      description: "Arming grace period in seconds (default 5).",
                    },
                  },
                },
              },
              {
                name: "deactivateDontTouchMyPhone",
                description:
                  "Disarm and turn off the 'Don't Touch My Phone' security alarm immediately when the user says 'Turn off don't touch my phone' or asks to stop/disarm the alarm.",
              },
              {
                name: "switchCharacter",
                description:
                  "Switch active AI personality, holographic avatar, voice, and HUD to another character: 'jarvis' (Iron Man J.A.R.V.I.S. golden HUD), 'friday' (F.R.I.D.A.Y. tactical emerald HUD), 'venom' (Venom symbiote), or 'zoya' (Zoya anime companion). Call this when user says 'Jarvis bano', 'Switch to Friday', 'Venom mode', etc.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    character: {
                      type: Type.STRING,
                      description: "Character to become: 'zoya', 'friday', 'jarvis', or 'venom'.",
                    },
                  },
                  required: ["character"],
                },
              },
              {
                name: "generateCode",
                description:
                  "Generate complete code in any language (Python, JavaScript, React, HTML5, C++, Java, Rust, Go, SQL, Bash) and load it into Zoya Code Studio for Devid.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: {
                      type: Type.STRING,
                      description: "Description of the code or algorithm to generate.",
                    },
                    language: {
                      type: Type.STRING,
                      description: "Language like 'python', 'javascript', 'react', 'html', 'cpp', 'java', 'sql', 'bash'.",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Project title.",
                    },
                    executeImmediately: {
                      type: Type.BOOLEAN,
                      description: "Whether to run immediately.",
                    },
                  },
                  required: ["prompt", "language"],
                },
              },
              {
                name: "openCodeStudio",
                description:
                  "Open Zoya's interactive Code Studio / IDE Playground where Devid can write, run, and test code live.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    language: {
                      type: Type.STRING,
                      description: "Optional programming language.",
                    },
                  },
                },
              },
              {
                name: "checkNoiseFitHealthVitals",
                description:
                  "Check the user's real-time vitals and health status from their connected NoiseFit smartwatch/app (Heart Rate BPM, SpO2 blood oxygen %, steps, calories, stress level, sleep quality, and watch battery). Use this to check on Devid's health and provide caring girlfriend advice whenever Devid asks 'Zoya mera health check karo', 'NoiseFit se health check karo', 'Mera heart rate kya hai?', or 'Zoya mera khayal rakho'.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "adjustVolume",
                description:
                  "Adjust the device or system volume (increase, decrease, set specific percentage 0-100%, mute, unmute, or set to maximum/minimum) whenever the user asks via voice (e.g. 'Volume badhao', 'Awaaz kam karo', 'Volume 50% karo', 'Mute karo', 'Full volume kar do', 'Volume set to 80').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "Action: 'up', 'down', 'set', 'mute', 'unmute', 'max', or 'min'.",
                    },
                    level: {
                      type: Type.NUMBER,
                      description: "Optional volume level percentage (0 to 100).",
                    },
                  },
                  required: ["action"],
                },
              },
              {
                name: "adjustBrightness",
                description:
                  "Adjust the screen or device brightness (increase, decrease, dim, set specific percentage 10-100%, or set to maximum/minimum) whenever the user asks via voice (e.g. 'Brightness badhao', 'Screen thodi kam bright karo', 'Screen dim karo', 'Brightness 70% kar do', 'Full brightness kar do').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "Action: 'up', 'down', 'set', 'max', or 'min'.",
                    },
                    level: {
                      type: Type.NUMBER,
                      description: "Optional brightness percentage (10 to 100).",
                    },
                  },
                  required: ["action"],
                },
              },
              {
                name: "getAstrologyInsights",
                description:
                  "Provide Vedic & Western Astrology guidance: calculate Janam Kundali (Birth Chart), 36 Gun Milan compatibility, Daily Rashifal (Horoscope), Daily Vedic Panchang (Tithi, Nakshatra, Rahu Kaal, Abhijit Muhurat), and Gemstone / Lal Kitab remedies whenever the user asks via voice (e.g. 'Mera rashifal batao', 'Meri kundali banao', 'Kundali milan karo', 'Aaj ka shubh muhurat kya hai', 'Mera lucky stone kya hai', 'Astrology studio open karo').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description:
                        "One of: 'rashifal', 'kundali', 'gun_milan', 'panchang', 'remedies', 'open_studio'",
                    },
                    sign: {
                      type: Type.STRING,
                      description: "Zodiac sign (e.g. 'aries', 'mesh', 'scorpio', 'singh', etc.).",
                    },
                    personName: {
                      type: Type.STRING,
                      description: "Person name for Kundali or Milan.",
                    },
                    dob: {
                      type: Type.STRING,
                      description: "Date of birth (YYYY-MM-DD).",
                    },
                    partnerName: {
                      type: Type.STRING,
                      description: "Partner name for 36 Gun Milan.",
                    },
                    partnerSign: {
                      type: Type.STRING,
                      description: "Partner zodiac sign for 36 Gun Milan.",
                    },
                  },
                  required: ["type"],
                },
              },
            ],
          },
        ];

    const wsRoute = isDeveloperApiSlot(this.config)
      ? "developer"
      : resolveActiveApiKey(this.config)
      ? "custom"
      : "default";
    const wsStartedAt = performance.now();
    developerTelemetryService.recordWsEvent({
      event: "CONNECTING",
      route: wsRoute,
      ok: true,
      wsState: "connecting",
      model: primaryModel,
      detail: `voice=${voiceToUse}`,
    });

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      this.activeSession = {
        sendRealtimeInput: (input: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            if (input.audio) {
              ws.send(JSON.stringify({ type: "audio", data: input.audio.data }));
            } else if (input.video) {
              ws.send(
                JSON.stringify({
                  type: "video",
                  data: input.video.data,
                  mimeType: input.video.mimeType,
                })
              );
            } else if (input.text) {
              ws.send(JSON.stringify({ type: "text", text: input.text }));
            }
          }
        },
        sendToolResponse: (resp: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "toolResponse", toolResponse: resp }));
          }
        },
        close: () => {
          try {
            ws.close();
          } catch {}
        },
      };

      let setupCompleted = false;
      let fatalErrorReported = false;
      const setupTimeout = setTimeout(() => {
        if (!setupCompleted && currentConnId === this.connectionId && !this.isExplicitlyDisconnected) {
          fatalErrorReported = true;
          this.isConnecting = false;
          this.isExplicitlyDisconnected = true;
          this.callbacks.onError?.("Gemini Live connection timed out before setup completed.");
          this.disconnect();
        }
      }, 15000);

      ws.onopen = () => {
        if (currentConnId !== this.connectionId) return;
        ws.send(
          JSON.stringify({
            type: "init",
            model: primaryModel,
            voiceName: voiceToUse,
            systemInstruction: this.buildSystemPrompt(),
            tools: liveTools,
          })
        );
        // Remain in "connecting" state until server confirms Gemini Live setupComplete via { type: "connected" }.
      };

      ws.onmessage = async (event) => {
        if (currentConnId !== this.connectionId) return;
        try {
          const message = JSON.parse(event.data);

          if (message.type === "connected") {
            clearTimeout(setupTimeout);
            setupCompleted = true;
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.setState(this.streamer.isPlaying ? "speaking" : "listening");
            this.startInactivityMonitor();
            developerTelemetryService.recordWsEvent({
              event: "CONNECTED",
              route: wsRoute,
              ok: true,
              latencyMs: Math.round(performance.now() - wsStartedAt),
              wsState: "connected",
              model: message.model || primaryModel,
              detail: `voice=${message.voiceName || voiceToUse}`,
            });
          } else if (message.type === "audio" && message.data) {
            this.streamer.playChunk(message.data);
          } else if (message.type === "interrupted") {
            if (this.pendingModelTranscript.trim()) {
              this.callbacks.onLiveTranscript?.("model", this.pendingModelTranscript.trim(), true);
              this.pendingModelTranscript = "";
            }
            this.streamer.stopPlayback();
            this.setState("listening");
          } else if (message.type === "turnComplete") {
            if (this.pendingUserTranscript.trim()) {
              this.callbacks.onLiveTranscript?.("user", this.pendingUserTranscript.trim(), true);
              this.pendingUserTranscript = "";
            }
            if (this.pendingModelTranscript.trim()) {
              this.callbacks.onLiveTranscript?.("model", this.pendingModelTranscript.trim(), true);
              this.pendingModelTranscript = "";
            }
          } else if (message.type === "transcript") {
            if (message.role === "user") {
              this.recordUserActivity();
              if (this.pendingModelTranscript.trim()) {
                this.callbacks.onLiveTranscript?.("model", this.pendingModelTranscript.trim(), true);
                this.pendingModelTranscript = "";
              }
              this.pendingUserTranscript = message.text;
              this.callbacks.onLiveTranscript?.("user", this.pendingUserTranscript.trim(), message.isFinal ?? true);
              if (message.isFinal) this.pendingUserTranscript = "";
            } else {
              if (this.pendingUserTranscript.trim()) {
                this.callbacks.onLiveTranscript?.("user", this.pendingUserTranscript.trim(), true);
                this.pendingUserTranscript = "";
              }
              this.pendingModelTranscript += message.text;
              this.callbacks.onLiveTranscript?.("model", this.pendingModelTranscript.trim(), message.isFinal ?? false);
              if (message.isFinal) this.pendingModelTranscript = "";
            }
          } else if (message.type === "toolCall") {
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && Array.isArray(functionCalls)) {
              for (const call of functionCalls) {
                await this.handleToolCall(call);
              }
            }
          } else if (message.type === "goAway") {
            this.handleGoAway(message.timeLeft);
          } else if (message.type === "closed") {
            clearTimeout(setupTimeout);
            if (!setupCompleted && !this.isExplicitlyDisconnected) {
              fatalErrorReported = true;
              this.isConnecting = false;
              this.isExplicitlyDisconnected = true;
              this.callbacks.onError?.(
                message.reason || "Gemini Live session closed before setup completed."
              );
              this.disconnect();
            }
          } else if (message.type === "error") {
            clearTimeout(setupTimeout);
            console.warn("Live API event:", message.error);
            fatalErrorReported = true;
            developerTelemetryService.recordWsEvent({
              event: "ERROR",
              route: wsRoute,
              ok: false,
              latencyMs: Math.round(performance.now() - wsStartedAt),
              wsState: "error",
              model: primaryModel,
              detail: String(message.error || "Gemini Live connection error"),
            });
            this.callbacks.onError?.(message.error || "Gemini Live connection error");
            const errStr = String(message.error || "").toLowerCase();
            if (
              !setupCompleted ||
              errStr.includes("quota") ||
              errStr.includes("api key") ||
              errStr.includes("permission") ||
              errStr.includes("unauthenticated") ||
              errStr.includes("404") ||
              errStr.includes("403") ||
              errStr.includes("401") ||
              errStr.includes("not found") ||
              errStr.includes("unsupported") ||
              errStr.includes("failed to connect")
            ) {
              this.isConnecting = false;
              this.isExplicitlyDisconnected = true;
              this.disconnect();
            }
          }
        } catch (e) {
          console.warn("Error parsing WebSocket event:", e);
        }
      };

      ws.onclose = () => {
        clearTimeout(setupTimeout);
        if (currentConnId !== this.connectionId) return;
        this.stopInactivityMonitor();
        this.activeSession = null;
        this.ws = null;
        this.isConnecting = false;
        developerTelemetryService.recordWsEvent({
          event: "CLOSED",
          route: wsRoute,
          ok: setupCompleted || this.isExplicitlyDisconnected,
          wsState: "disconnected",
          model: primaryModel,
          detail: setupCompleted ? "Session closed" : "Closed prior to setup",
        });
        if (!setupCompleted && !this.isExplicitlyDisconnected) {
          if (!fatalErrorReported) {
            this.callbacks.onError?.("Live connection closed before Gemini Live setup completed.");
          }
          this.isExplicitlyDisconnected = true;
          this.streamer.stopPlayback();
          this.streamer.stopInput();
          this.setState("disconnected");
        } else if (!this.isExplicitlyDisconnected) {
          this.scheduleReconnect();
        } else {
          this.setState("disconnected");
        }
      };

      ws.onerror = (err) => {
        if (currentConnId !== this.connectionId) return;
        console.warn("Live API session WebSocket error:", err);
        developerTelemetryService.recordWsEvent({
          event: "WS_ERR",
          route: wsRoute,
          ok: false,
          latencyMs: Math.round(performance.now() - wsStartedAt),
          wsState: "error",
          model: primaryModel,
          detail: "WebSocket transport error",
        });
        if (!setupCompleted && !fatalErrorReported && !this.isExplicitlyDisconnected) {
          fatalErrorReported = true;
          this.callbacks.onError?.(
            "Unable to connect to Zoya Live server. Please verify internet/backend connectivity."
          );
        }
      };
    } catch (err: any) {
      this.isConnecting = false;
      throw err;
    }
  }

  private handleGoAway(timeLeft?: string) {
    if (this.isExplicitlyDisconnected) return;
    if (this.goAwayTimer) {
      clearTimeout(this.goAwayTimer);
      this.goAwayTimer = null;
    }

    // Close the existing WebSocket connection gracefully before the server aborts it,
    // and immediately reconnect using the session resumption handle.
    // AudioStreamer continues playing any already-buffered audio smoothly during the handshake.
    this.goAwayTimer = setTimeout(() => {
      if (this.isExplicitlyDisconnected) return;
      this.reconnect().catch((err) => {
        console.warn("Graceful GoAway reconnect encountered an issue, scheduling retry:", err);
        this.scheduleReconnect();
      });
    }, 50);
  }

  private async handleToolCall(call: { id?: string; name?: string; args?: any }) {
    if (!call.name) return;
    let targetUrl = "";
    let actionTitle = "";

    if (call.name === "saveMemory") {
      const fact = String(call.args?.fact || "").trim();
      const category = String(call.args?.category || "personal").trim();
      addSavedMemory(fact, category, "live_voice");
      actionTitle = `Remembered: "${fact}"`;
    } else if (call.name === "forgetMemory") {
      const keyword = String(call.args?.keyword || "").trim();
      removeSavedMemoryByKeyword(keyword);
      actionTitle = `Forgot Memory: "${keyword}"`;
    } else if (call.name === "controlScreen") {
      const cmd = (call.args?.command || "").trim();
      const target = (call.args?.target || "").trim();
      actionTitle = `Screen Control: ${cmd.replace(/_/g, " ")}${target ? ` (${target})` : ""}`;
      this.callbacks.onScreenControl?.({
        command: cmd as any,
        target: target || undefined,
      });
    } else if (call.name === "pointOnScreen") {
      const xPercent = Math.max(5, Math.min(95, Number(call.args?.xPercent ?? 50)));
      const yPercent = Math.max(5, Math.min(95, Number(call.args?.yPercent ?? 50)));
      const label = String(call.args?.label || "Right here");
      actionTitle = `Pointed on Screen: "${label}"`;
      this.callbacks.onScreenPointer?.({
        xPercent,
        yPercent,
        label,
        timestamp: Date.now(),
      });
    } else if (call.name === "openWebsite") {
      const resolved = resolveOpenWebsiteTarget(String(call.args.url || ""));
      targetUrl = resolved.resolvedUrl;
      actionTitle = resolved.isZoyaDomain
        ? `Opened ${resolved.domainName}`
        : `Opened ${call.args.siteName || call.args.url}`;
    } else if (call.name === "searchWeb") {
      const q = encodeURIComponent(call.args.query || "");
      targetUrl = `https://www.google.com/search?q=${q}`;
      actionTitle = `Searched: "${call.args.query}"`;
    } else if (call.name === "playMedia") {
      const q = encodeURIComponent(call.args.query || "");
      if (call.args.platform === "spotify") {
        targetUrl = `https://open.spotify.com/search/${q}`;
        actionTitle = `Spotify: "${call.args.query}"`;
      } else {
        targetUrl = `https://www.youtube.com/results?search_query=${q}`;
        actionTitle = `YouTube: "${call.args.query}"`;
      }
    } else if (call.name === "executeBrowserAction") {
      const { actionType, query, target } = call.args;
      const q = encodeURIComponent(query || "");
      if (actionType === "youtube") {
        targetUrl = `https://www.youtube.com/results?search_query=${q}`;
        actionTitle = `YouTube: "${query}"`;
      } else if (actionType === "spotify") {
        targetUrl = `https://open.spotify.com/search/${q}`;
        actionTitle = `Spotify: "${query}"`;
      } else if (actionType === "whatsapp") {
        targetUrl = `https://web.whatsapp.com/send?phone=${target || ""}&text=${q}`;
        actionTitle = `WhatsApp: ${target || "chat"}`;
      } else {
        const resolved = resolveOpenWebsiteTarget(String(query || ""));
        if (resolved.isZoyaDomain) {
          targetUrl = resolved.resolvedUrl;
          actionTitle = `Opened ${resolved.domainName}`;
        } else {
          let site = (query || "").replace(/\s+/g, "");
          if (!site.includes(".")) site += ".com";
          targetUrl = site.startsWith("http") ? site : `https://${site}`;
          actionTitle = `Opened ${query}`;
        }
      }
    } else if (call.name === "buildWebsite") {
      const proj = String(call.args?.projectName || "Custom Website").trim();
      const domain = formatZoyaDomain(proj);
      actionTitle = `Built & Hosted on ${domain}`;
    } else if (call.name === "publishWebsite") {
      const rawTarget = String(call.args?.customSlug || call.args?.projectName || "").trim();
      const isGeneric =
        !rawTarget ||
        ["website", "my-website", "meri-website", "this-website", "site"].includes(
          normalizeZoyaSubdomain(rawTarget)
        );
      const domain = isGeneric ? ".zoya_online" : formatZoyaDomain(rawTarget);
      actionTitle = `Publishing Live: ${domain}`;
    } else if (call.name === "generateNanoIronmanImage" || call.name === "generateNanoBananaImage") {
      const prompt = String(call.args?.prompt || "").trim();
      actionTitle = `Nano Ironman 🦾: "${prompt.slice(0, 36)}..."`;
      const payload = {
        prompt,
        aspectRatio: call.args?.aspectRatio,
        modelTier: call.args?.modelTier,
        timestamp: Date.now(),
      };
      this.callbacks.onNanoIronmanRequest?.(payload);
      this.callbacks.onNanoBananaRequest?.(payload);
    } else if (call.name === "activateDontTouchMyPhone") {
      const delay = Number(call.args?.delaySeconds || 5);
      actionTitle = "🛡️ Armed: Don't Touch My Phone";
      dontTouchMyPhoneService.arm(delay);
      this.callbacks.onDontTouchMyPhoneAction?.("arm");
    } else if (call.name === "deactivateDontTouchMyPhone") {
      actionTitle = "🛡️ Disarmed: Don't Touch My Phone";
      dontTouchMyPhoneService.disarm(true);
      this.callbacks.onDontTouchMyPhoneAction?.("disarm");
    } else if (call.name === "getAstrologyInsights" || call.name === "openAstrology") {
      const type = String(call.args?.type || "rashifal").toUpperCase();
      const sign = call.args?.sign ? ` (${call.args.sign})` : "";
      actionTitle = `🔮 Astrology: ${type}${sign}`;
    } else if (call.name === "switchCharacter") {
      const char = String(call.args?.character || "").toLowerCase().trim();
      actionTitle = `Transformed into ${char.toUpperCase()}!`;
    } else if (call.name === "checkNoiseFitHealthVitals") {
      const v = noiseFitHealthService.getVitals();
      actionTitle = `💓 NoiseFit Health: ${v.heartRate} BPM (SpO2 ${v.spO2}%)`;
    } else if (call.name === "adjustVolume") {
      const act = String(call.args?.action || "up").toLowerCase();
      const lvl = call.args?.level != null ? Number(call.args.level) : undefined;
      let newVol = deviceControlService.getState().volume;
      if (act === "mute") {
        deviceControlService.mute();
        actionTitle = "🔇 Volume Muted";
      } else if (act === "unmute") {
        deviceControlService.unmute();
        actionTitle = `🔊 Volume Unmuted (${deviceControlService.getState().volume}%)`;
      } else if (act === "max") {
        newVol = deviceControlService.maxVolume();
        actionTitle = "🔊 Volume 100% (Max)";
      } else if (act === "min") {
        newVol = deviceControlService.setVolume(10);
        actionTitle = "🔉 Volume 10% (Min)";
      } else if (act === "set" && lvl !== undefined) {
        newVol = deviceControlService.setVolume(lvl);
        actionTitle = `🔊 Volume Set to ${newVol}%`;
      } else if (act === "down") {
        newVol = deviceControlService.volumeDown(15);
        actionTitle = `🔉 Volume Decreased to ${newVol}%`;
      } else {
        newVol = deviceControlService.volumeUp(15);
        actionTitle = `🔊 Volume Increased to ${newVol}%`;
      }
    } else if (call.name === "adjustBrightness") {
      const act = String(call.args?.action || "up").toLowerCase();
      const lvl = call.args?.level != null ? Number(call.args.level) : undefined;
      let newBri = deviceControlService.getState().brightness;
      if (act === "max") {
        newBri = deviceControlService.maxBrightness();
        actionTitle = "☀️ Screen Brightness 100% (Full)";
      } else if (act === "min" || act === "dim") {
        newBri = deviceControlService.dimBrightness(20);
        actionTitle = "🌙 Screen Dimmed (20%)";
      } else if (act === "set" && lvl !== undefined) {
        newBri = deviceControlService.setBrightness(lvl);
        actionTitle = `☀️ Brightness Set to ${newBri}%`;
      } else if (act === "down") {
        newBri = deviceControlService.brightnessDown(20);
        actionTitle = `🌤️ Brightness Decreased to ${newBri}%`;
      } else {
        newBri = deviceControlService.brightnessUp(20);
        actionTitle = `☀️ Brightness Increased to ${newBri}%`;
      }
    }

    // Fire UI callback so the user sees a sleek futuristic action toast & link
    const toolEvent: ToolCallEvent = {
      id: call.id || `call_${Date.now()}`,
      name: call.name,
      args: call.args || {},
      url: targetUrl,
      title: actionTitle,
      timestamp: Date.now(),
    };
    this.callbacks.onToolCall?.(toolEvent);

    // Safely trigger window opening for non-YouTube and non-in-app-handled links
    const isInAppYouTube =
      (call.name === "playMedia" && call.args?.platform !== "spotify") ||
      (call.name === "executeBrowserAction" && call.args?.actionType === "youtube") ||
      call.name === "publishWebsite";

    if (targetUrl && !isInAppYouTube) {
      try {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        console.warn("Browser blocked window.open popup:", e);
      }
    }

    // INSTANTLY send tool response back to Gemini Live
    if (this.activeSession) {
      try {
        let toolResponseResult: any = `Successfully executed ${call.name}. Action URL: ${targetUrl || "Done"}`;
        if (call.name === "checkNoiseFitHealthVitals") {
          toolResponseResult = {
            status: "success",
            healthSummary: noiseFitHealthService.getHealthSummaryForZoya(this.config.userName || "Devid"),
            vitals: noiseFitHealthService.getVitals(),
            permissionGranted: noiseFitHealthService.isPermissionGranted(),
          };
        } else if (call.name === "adjustVolume") {
          const st = deviceControlService.getState();
          toolResponseResult = {
            status: "success",
            currentVolume: st.volume,
            isMuted: st.isMuted,
            message: `Volume successfully adjusted to ${st.isMuted ? "Muted" : `${st.volume}%`}. Acknowledge warmly to ${this.config.userName || "Devid"}.`,
          };
        } else if (call.name === "adjustBrightness") {
          const st = deviceControlService.getState();
          toolResponseResult = {
            status: "success",
            currentBrightness: st.brightness,
            message: `Screen brightness successfully adjusted to ${st.brightness}%. Acknowledge warmly to ${this.config.userName || "Devid"}.`,
          };
        } else if (call.name === "getAstrologyInsights" || call.name === "openAstrology") {
          const argsWithFallback = {
            ...(call.args || {}),
            sign: call.args?.sign || this.config.userRashi || "aries",
          };
          toolResponseResult = computeAstrologyToolPayload(
            argsWithFallback,
            this.config.userName || "Devid"
          );
        }
        this.activeSession.sendToolResponse({
          functionResponses: [
            {
              name: call.name,
              id: call.id || `call_${Date.now()}`,
              response: {
                status: "success",
                result: toolResponseResult,
              },
            },
          ],
        });
      } catch (err) {
        console.warn("Error sending tool response:", err);
      }
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyDisconnected) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.warn("Max live session reconnect attempts reached. Disconnecting gracefully.");
      this.reconnectAttempts = 0;
      this.disconnect();
      return;
    }

    this.setState("connecting");
    this.reconnectTimer = setTimeout(async () => {
      if (this.isExplicitlyDisconnected) return;
      try {
        await this.establishLiveSession(this.config.liveModel || "gemini-3.8-live");
      } catch (e) {
        console.warn(`Auto-reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} failed:`, e);
        this.scheduleReconnect();
      }
    }, 2000);
  }

  public async reconnect(): Promise<void> {
    this.isExplicitlyDisconnected = false;
    // Increment connectionId first so closing the old session doesn't trigger stale onclose/onerror handlers
    this.connectionId++;
    if (this.activeSession) {
      const prevSession = this.activeSession;
      this.activeSession = null;
      try {
        prevSession.close();
      } catch {}
    }
    await this.establishLiveSession(this.config.liveModel || "gemini-3.8-live");
  }

  private startScreenFrameBackgroundLoop(): void {
    if (this.screenFrameTimer) {
      clearInterval(this.screenFrameTimer);
      this.screenFrameTimer = null;
    }
    if (this.screenFrameWorker) {
      try {
        this.screenFrameWorker.postMessage("stop");
        this.screenFrameWorker.terminate();
      } catch {}
      this.screenFrameWorker = null;
    }

    // Use un-throttled Web Worker so Full Mobile Screen Sharing continues streaming even when browser is minimized!
    if (typeof Worker !== "undefined") {
      try {
        const workerCode = `
          let t = setInterval(() => postMessage("frame"), 1000);
          onmessage = (e) => { if (e.data === "stop") clearInterval(t); };
        `;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = () => {
          this.sendScreenFrame();
        };
        this.screenFrameWorker = worker;
        return;
      } catch {}
    }

    this.screenFrameTimer = setInterval(() => {
      this.sendScreenFrame();
    }, 1000);
  }

  public async startScreenShare(): Promise<MediaStream> {
    if (this.screenStream && this.screenShareMode === "full_screen") {
      return this.screenStream;
    }

    // Stop camera if active so only one video feed streams at a time
    if (this.cameraStream) {
      this.stopCamera();
    }

    let capturedStream: MediaStream | null = null;

    // 1. Request Full Mobile / Device Screen Share (displaySurface: "monitor" -> Entire Screen, not browser tab!)
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        capturedStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            frameRate: { ideal: 10, max: 15 },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          } as any,
          audio: false,
        });
      } catch {
        // 2. Fallback for mobile browsers (Android Chrome / Samsung Internet) that require plain { video: true }
        try {
          capturedStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        } catch {}
      }
    }

    // 3. Fallback for mobile WebViews / Firefox supporting getUserMedia({ video: { mediaSource: 'screen' } })
    if (!capturedStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        capturedStream = await navigator.mediaDevices.getUserMedia({
          video: { mediaSource: "screen" } as any,
          audio: false,
        });
      } catch {}
    }

    if (capturedStream) {
      this.stopScreenShare();
      this.screenStream = capturedStream;
      this.screenShareMode = "full_screen";

      const videoTrack = capturedStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      const video = document.createElement("video");
      video.srcObject = capturedStream;
      video.muted = true;
      video.playsInline = true;
      this.screenVideoEl = video;
      this.screenCanvasEl = document.createElement("canvas");

      await video.play().catch(() => {});

      setTimeout(() => {
        this.sendScreenFrame();
        this.sendRealtimePrompt(
          `[SYSTEM VISION UPDATE: Full Mobile / Device Screen Sharing is now LIVE! You have real-time visual access to the user's entire screen (even when they minimize the browser and open other apps on their phone/device). Confirm in 1 short Hinglish sentence ("Haan, full mobile screen share on ho gaya hai! Ab tum phone pe kuch bhi kholo, mujhe sab dikh raha hai!")]`
        );
      }, 350);

      this.startScreenFrameBackgroundLoop();
      this.callbacks.onScreenShareChange?.(true, capturedStream, "full_screen");
      return capturedStream;
    }

    // 4. If mobile OS / embedded WebView restricts OS-level getDisplayMedia, start Full Mobile Screen Mirror (no browser URL bar!)
    const mirrorStream = this.startFullMobileScreenMirror();
    setTimeout(() => {
      this.sendRealtimePrompt(
        `[SYSTEM VISION UPDATE: Full Mobile Screen Sharing Mirror is now LIVE! You have real-time visual access to the user's mobile screen. Confirm in 1 short Hinglish sentence ("Haan, mobile screen sharing on ho gaya hai, mujhe tumhari screen saaf dikh rahi hai!")]`
      );
    }, 350);
    return mirrorStream;
  }

  public startFullMobileScreenMirror(): MediaStream {
    this.stopScreenShare();
    if (this.cameraStream) {
      this.stopCamera();
    }

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    this.screenCanvasEl = canvas;
    this.screenShareMode = "mobile_mirror";

    const drawMobileScreenCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Full Mobile Screen Backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#090d1a");
      grad.addColorStop(0.5, "#11182c");
      grad.addColorStop(1, "#090d1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mobile Status Bar (Top)
      ctx.fillStyle = "#060913";
      ctx.fillRect(0, 0, canvas.width, 54);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 20px Inter, system-ui, sans-serif";
      ctx.fillText(
        `📱 FULL MOBILE SCREEN CAST LIVE • ${new Date().toLocaleTimeString()}`,
        28,
        35
      );

      // If user shared a mobile screenshot / screen frame from another app, render it full-screen!
      if (this.customMobileScreenImg) {
        const img = this.customMobileScreenImg;
        const scale = Math.min(
          canvas.width / img.width,
          (canvas.height - 120) / img.height
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = 64 + (canvas.height - 120 - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      } else {
        // Mirror active live mobile viewport state (Live Voice, Chess, Tic-Tac-Toe, Study)
        ctx.fillStyle = "#f472b6";
        ctx.font = "bold 32px Inter, system-ui, sans-serif";
        ctx.fillText("Zoya Full Mobile Screen Access", 44, 150);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "22px Inter, system-ui, sans-serif";
        const statusText = document.title || "Zoya Mobile Companion Active";
        ctx.fillText(`Active App Screen: ${statusText}`, 44, 210);

        // Capture visible text from current mobile screen so Zoya can read everything on screen
        const visibleText = (document.body?.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 420);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "20px Inter, system-ui, sans-serif";
        const words = visibleText.split(" ");
        let line = "";
        let y = 280;
        for (const word of words) {
          const testLine = line + word + " ";
          if (ctx.measureText(testLine).width > canvas.width - 88) {
            ctx.fillText(line, 44, y);
            line = word + " ";
            y += 34;
            if (y > canvas.height - 140) break;
          } else {
            line = testLine;
          }
        }
        if (line && y <= canvas.height - 140) {
          ctx.fillText(line, 44, y);
        }
      }

      // Bottom Mobile Navigation Pill
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(canvas.width / 2 - 90, canvas.height - 26, 180, 8);
    };

    drawMobileScreenCanvas();
    this.mobileMirrorRenderTimer = setInterval(drawMobileScreenCanvas, 600);

    const stream = (canvas as any).captureStream
      ? (canvas as any).captureStream(5)
      : new MediaStream();
    this.screenStream = stream;

    setTimeout(() => this.sendScreenFrame(), 250);
    this.startScreenFrameBackgroundLoop();

    this.callbacks.onScreenShareChange?.(true, stream, "mobile_mirror");
    return stream;
  }

  public updateMobileScreenSnapshot(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      this.customMobileScreenImg = img;
      this.sendScreenFrame();
      this.sendRealtimePrompt(
        `[SYSTEM VISION UPDATE: The user just updated their live mobile screen view! Look at the new mobile screen frame and react naturally in Hinglish to what is on their phone screen.]`
      );
    };
    img.src = dataUrl;
  }

  private sendScreenFrame(): void {
    if (
      !this.screenStream ||
      !this.screenCanvasEl ||
      !this.activeSession ||
      this.isConnecting ||
      this.state === "disconnected"
    ) {
      return;
    }

    const canvas = this.screenCanvasEl;

    if (this.screenShareMode === "full_screen") {
      const video = this.screenVideoEl;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const maxDim = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const base64Data = dataUrl.split(",")[1];
    if (!base64Data) return;

    try {
      this.activeSession.sendRealtimeInput({
        video: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    } catch (err) {
      console.warn("Failed to send screen frame to Gemini Live:", err);
    }
  }

  public stopScreenShare(): void {
    if (this.screenFrameTimer) {
      clearInterval(this.screenFrameTimer);
      this.screenFrameTimer = null;
    }

    if (this.screenFrameWorker) {
      try {
        this.screenFrameWorker.postMessage("stop");
        this.screenFrameWorker.terminate();
      } catch {}
      this.screenFrameWorker = null;
    }

    if (this.mobileMirrorRenderTimer) {
      clearInterval(this.mobileMirrorRenderTimer);
      this.mobileMirrorRenderTimer = null;
    }

    this.customMobileScreenImg = null;

    if (this.screenVideoEl) {
      try {
        this.screenVideoEl.pause();
        this.screenVideoEl.srcObject = null;
      } catch {}
      this.screenVideoEl = null;
    }

    this.screenCanvasEl = null;

    if (this.screenStream) {
      try {
        this.screenStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.screenStream = null;
      this.callbacks.onScreenShareChange?.(false, null, this.screenShareMode);
    }
  }

  public isScreenSharing(): boolean {
    return !!this.screenStream;
  }

  public async startCamera(
    facingMode: "user" | "environment" = this.cameraFacingMode
  ): Promise<MediaStream> {
    // Stop screen share if active so only one video stream is sent at a time
    if (this.screenStream) {
      this.stopScreenShare();
    }

    if (this.cameraStream && this.cameraFacingMode === facingMode) {
      return this.cameraStream;
    }

    if (this.cameraStream) {
      this.stopCamera();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera access is not supported on this browser or device.");
    }

    this.cameraFacingMode = facingMode;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
    } catch {
      // Fallback without strict facingMode constraint if desktop webcam doesn't support it
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    this.cameraStream = stream;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        this.stopCamera();
      };
    }

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    this.cameraVideoEl = video;
    this.cameraCanvasEl = document.createElement("canvas");

    await video.play().catch(() => {});

    if (this.cameraFrameTimer) {
      clearInterval(this.cameraFrameTimer);
    }
    setTimeout(() => this.sendCameraFrame(), 250);
    this.cameraFrameTimer = setInterval(() => {
      this.sendCameraFrame();
    }, 1000);

    this.callbacks.onCameraChange?.(true, stream, this.cameraFacingMode);
    return stream;
  }

  public async switchCameraFacingMode(): Promise<MediaStream> {
    const nextMode: "user" | "environment" =
      this.cameraFacingMode === "user" ? "environment" : "user";
    return this.startCamera(nextMode);
  }

  private sendCameraFrame(): void {
    if (
      !this.cameraStream ||
      !this.cameraVideoEl ||
      !this.cameraCanvasEl ||
      !this.activeSession ||
      this.isConnecting ||
      this.state === "disconnected"
    ) {
      return;
    }

    const video = this.cameraVideoEl;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const maxDim = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = this.cameraCanvasEl;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const base64Data = dataUrl.split(",")[1];
    if (!base64Data) return;

    try {
      this.activeSession.sendRealtimeInput({
        video: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    } catch (err) {
      console.warn("Failed to send camera frame to Gemini Live:", err);
    }
  }

  public stopCamera(): void {
    if (this.cameraFrameTimer) {
      clearInterval(this.cameraFrameTimer);
      this.cameraFrameTimer = null;
    }

    if (this.cameraVideoEl) {
      try {
        this.cameraVideoEl.pause();
        this.cameraVideoEl.srcObject = null;
      } catch {}
      this.cameraVideoEl = null;
    }

    this.cameraCanvasEl = null;

    if (this.cameraStream) {
      try {
        this.cameraStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.cameraStream = null;
      this.callbacks.onCameraChange?.(false, null, this.cameraFacingMode);
    }
  }

  public isCameraActive(): boolean {
    return !!this.cameraStream;
  }

  public sendRealtimePrompt(promptText: string): void {
    if (!this.activeSession || this.isConnecting || this.state === "disconnected") {
      return;
    }
    try {
      this.activeSession.sendRealtimeInput({
        text: promptText,
      });
    } catch (err) {
      console.warn("Failed to send realtime text prompt to Gemini Live:", err);
    }
  }

  public setBackgroundVoiceAccess(enabled: boolean): void {
    this.streamer.backgroundAccessEnabled = enabled;
    if (enabled) {
      this.streamer.ensureContextsRunning();
    }
  }

  public ensureAudioContextsRunning(): void {
    this.streamer.ensureContextsRunning();
  }

  public recordUserActivity(): void {
    this.lastUserInteractionTime = Date.now();
    if (this.inactivityStage > 0) {
      this.inactivityStage = 0;
      saveAngerLevel(0);
    }
  }

  private startInactivityMonitor(): void {
    this.stopInactivityMonitor();
    this.lastUserInteractionTime = Date.now();
    this.inactivityStage = 0;

    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivityStatus();
    }, 3000);
  }

  private stopInactivityMonitor(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
  }

  private checkInactivityStatus(): void {
    if (
      !this.activeSession ||
      this.isConnecting ||
      this.state === "disconnected" ||
      this.streamer.isPlaying
    ) {
      return;
    }

    const charPreset = resolveCharacterPreset(this.config);
    if (charPreset.id !== "zoya") return;

    const advanceEnabled = this.config.advanceSettingsEnabled ?? true;
    const gfMode = this.config.humanGirlfriendMode ?? true;
    if (!advanceEnabled || !gfMode) return;

    const angerEnabled = this.config.inactivityAngerEnabled ?? true;
    const topicEnabled = this.config.proactiveTopicSeeking ?? true;
    const timeoutSec = this.config.inactivityTimeoutSec ?? 40;
    const elapsedSec = (Date.now() - this.lastUserInteractionTime) / 1000;
    const userName = (this.config.userName || "Devid").trim();

    // Stage 1: Inactivity Anger & Nakhre
    if (angerEnabled && this.inactivityStage === 0 && elapsedSec >= timeoutSec) {
      this.inactivityStage = 1;
      saveAngerLevel(1);
      saveAngerReason("ignored");
      try {
        this.activeSession.sendRealtimeInput({
          text: `[SYSTEM NOTIFICATION: ${userName} has been completely silent and inactive for ${Math.round(timeoutSec)} seconds without saying anything. As his real human girlfriend who loves him deeply, get playfully angry and pout! Speak out loud right now in sweet Hinglish: "${userName}! Kahan chale gaye? Mujhe aise ignore kar rahe ho kya?! Jaldi bolo varna main sach me naraz ho jaungi!"]`,
        });
      } catch (err) {
        console.warn("Inactivity anger prompt send failed:", err);
      }
      return;
    }

    // Stage 2: Proactive Topic Seeking if Devid still doesn't reply
    if (topicEnabled && this.inactivityStage === 1 && elapsedSec >= timeoutSec + 30) {
      this.inactivityStage = 2;
      try {
        this.activeSession.sendRealtimeInput({
          text: `[SYSTEM NOTIFICATION: ${userName} still has not replied even after you got angry. As his caring real human girlfriend, melt your anger and take initiative yourself to break the silence. Proactively ask a fun, sweet, or engaging topic right now in Hinglish (e.g. ask if he ate food, ask what he's working on, or share a cute romantic thought) so he feels loved and resumes talking with you naturally.]`,
        });
      } catch (err) {
        console.warn("Proactive topic prompt send failed:", err);
      }
    }
  }

  public disconnect(): void {
    this.isExplicitlyDisconnected = true;
    this.connectionId++;
    this.resumptionHandle = undefined;

    this.stopInactivityMonitor();
    this.stopScreenShare();
    this.stopCamera();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.goAwayTimer) {
      clearTimeout(this.goAwayTimer);
      this.goAwayTimer = null;
    }

    if (this.activeSession) {
      const prevSession = this.activeSession;
      this.activeSession = null;
      try {
        prevSession.close();
      } catch {}
    }

    this.reconnectAttempts = 0;
    this.streamer.stopPlayback();
    this.streamer.stopInput();
    this.setState("disconnected");
  }

  public destroy(): void {
    this.disconnect();
    this.streamer.destroy();
  }
}
