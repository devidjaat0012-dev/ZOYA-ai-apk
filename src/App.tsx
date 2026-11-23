import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Power,
  Radio,
  MessageSquare,
  PanelLeft,
  AlertCircle,
  Plus,
  GraduationCap,
  Heart,
  Smile,
  Briefcase,
  Shield,
  MonitorUp,
  MonitorOff,
  Maximize2,
  Minimize2,
  Video,
  VideoOff,
  RefreshCw,
  Move,
  MousePointerClick,
  Globe,
  ExternalLink,
  Brain,
  Gamepad2,
  TrendingUp,
  Instagram,
  Youtube,
  Music2,
  Code2,
  X,
  LogIn,
  Zap,
  ShieldAlert,
  Wifi,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AudioStreamer } from "./services/audioStreamer";
import { LiveSession } from "./services/liveSession";
import { streamZoyaChat } from "./services/chatService";
import {
  generateOfflineZoyaResponse,
  speakOfflineSpeech,
  isOfflineModeActive,
} from "./services/offlineModeService";
import {
  addSavedMemory,
  autoExtractAndSaveMemoryFromTurn,
  loadSavedMemories,
} from "./services/memoryService";
import {
  AngerLevel,
  AngerReason,
  evaluateApologyOrManana,
  evaluateUserToneAndWorkIntent,
  loadSavedAngerLevel,
  loadSavedAngerReason,
  saveAngerLevel,
  saveAngerReason,
} from "./services/angerService";
import {
  AppConfig,
  AppMode,
  CharacterPresetId,
  CHARACTER_PRESETS,
  ChatAttachment,
  ChatMessage,
  ChatThread,
  DEFAULT_CONFIG,
  MemoryItem,
  PERSONA_MODES,
  PersonaMode,
  ScreenControlPayload,
  ScreenPointerTarget,
  SessionState,
  ToolCallEvent,
  ZoyaUiThemeId,
  ZOYA_UI_THEMES,
  normalizePersonaMode,
  resolveCharacterPreset,
  resolveUiTheme,
} from "./types";
import UiThemeQuickPopover from "./components/UiThemeSwitcher";
import ZoyaFullUiStage from "./components/ZoyaFullUiStage";
import { HologramModelType } from "./components/Zoya3DHologramBody";
import Visualizer from "./components/Visualizer";
import ActionHUD from "./components/ActionHUD";
import SettingsModal from "./components/SettingsModal";
import PermissionModal from "./components/PermissionModal";
import ChatView from "./components/ChatView";
import StudyView from "./components/StudyView";
import SavedChatsDrawer from "./components/SavedChatsDrawer";
import FloatingApiSwitcher from "./components/FloatingApiSwitcher";
import MovableAdvanceSettingsButton from "./components/MovableAdvanceSettingsButton";
import LiveGamePanel from "./components/LiveGamePanel";
import LiveYouTubePlayer, { loadSavedFavSong } from "./components/LiveYouTubePlayer";
import WebsiteBuilderStudio, {
  PublishedSiteStandaloneView,
} from "./components/WebsiteBuilderStudio";
import { getDomainSlugFromCurrentUrl } from "./zoyaDomain";
import NanoIronmanStudio from "./components/NanoIronmanStudio";
import CodeStudio from "./components/CodeStudio";
import { generateNanoIronmanImage } from "./services/nanoIronmanService";
import { GeneratedNanoIronmanImage } from "./types";
import AuthAccountModal from "./components/AuthAccountModal";
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutUser,
  syncUserProfileToFirestore,
  syncMemoryItemToFirestore,
  fetchCloudMemoriesForUser,
  User,
} from "./firebase";
import { MoodTrackerChart } from "./components/MoodTrackerChart";
import { HandsFreeWakeWordDetector } from "./services/wakeWordService";
import DefaultAssistantModal from "./components/DefaultAssistantModal";
import DontTouchMyPhoneModal from "./components/DontTouchMyPhoneModal";
import DontTouchMyPhoneAlarmOverlay from "./components/DontTouchMyPhoneAlarmOverlay";
import {
  dontTouchMyPhoneService,
  SecurityState,
} from "./services/dontTouchMyPhoneService";
import { usePWAInstall } from "./hooks/usePWAInstall";
import AreaTemperaturePill from "./components/AreaTemperaturePill";
import NoiseFitModal from "./components/NoiseFitModal";
import { noiseFitHealthService } from "./services/noiseFitHealthService";
import { reminderService, ZoyaReminder } from "./services/reminderService";
import ReminderAlertModal from "./components/ReminderAlertModal";
import { androidAudioRecordWakeWordService } from "./services/androidAudioRecordWakeWordService";
import { playWakeActivationChime } from "./services/wakeWordService";
import { deviceControlService } from "./services/deviceControlService";
import DeviceControlHUD from "./components/DeviceControlHUD";
import AstrologyStudio from "./components/AstrologyStudio";
import { AstrologyStudioRequest, ZodiacSignKey } from "./types";
import {
  normalizeSignKey,
  detectAstrologyModeToggleCommand,
  parseAstrologyVoiceCommand,
  ZODIAC_SIGNS,
} from "./services/astrologyService";
import {
  ownerVoiceService,
  OwnerIncident,
  OwnerSecurityState,
} from "./services/ownerVoiceService";
import OwnerLockdownOverlay from "./components/OwnerLockdownOverlay";
import DeveloperConsole from "./components/DeveloperConsole";
import { developerTelemetryService } from "./services/developerTelemetryService";

function createInitialThread(): ChatThread {
  const now = Date.now();
  return {
    id: `thread_${now}`,
    title: "New conversation",
    startedAt: now,
    updatedAt: now,
    messages: [],
  };
}

export default function App() {
  // App Configuration
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("zoya_app_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          personaVibe: normalizePersonaMode(parsed.personaVibe),
        };
      } catch (e) {
        console.error("Failed to parse config from localStorage:", e);
      }
    }
    return DEFAULT_CONFIG;
  });

  // Mode: "chat" (Google Gemini-like chat) or "live" (Real-time voice-to-voice)
  const [appMode, setAppMode] = useState<AppMode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  // Chat Threads State
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const saved = localStorage.getItem("zoya_chat_threads_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            ...t,
            startedAt:
              t.startedAt ||
              t.messages?.[0]?.timestamp ||
              t.updatedAt ||
              Date.now(),
          }));
        }
      } catch (e) {
        console.warn("Failed to parse saved chat threads:", e);
      }
    }
    return [createInitialThread()];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id || "");
  const [isStreamingChat, setIsStreamingChat] = useState<boolean>(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  // Persist threads to localStorage
  useEffect(() => {
    try {
      // Avoid storing huge base64 strings if localStorage quota is tight
      const compactThreads = threads.map((t) => ({
        ...t,
        messages: t.messages.map((m) => ({
          ...m,
          isStreaming: false,
        })),
      }));
      localStorage.setItem("zoya_chat_threads_v2", JSON.stringify(compactThreads));
    } catch (e) {
      console.warn("Could not persist chat history to localStorage:", e);
    }
  }, [threads]);

  // Live Voice State Management
  const [sessionState, setSessionState] = useState<SessionState>("disconnected");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareMode, setScreenShareMode] = useState<"full_screen" | "mobile_mirror">("full_screen");
  const [isScreenPreviewExpanded, setIsScreenPreviewExpanded] = useState<boolean>(false);
  const screenPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileScreenSnapshotInputRef = useRef<HTMLInputElement | null>(null);

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [isCameraPreviewExpanded, setIsCameraPreviewExpanded] = useState<boolean>(false);
  const cameraPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStageRef = useRef<HTMLDivElement | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);

  // UI Modals & Popups
  const { isInstallable, isInstalled, install: installPWA } = usePWAInstall();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [showMoodTracker, setShowMoodTracker] = useState<boolean>(false);
  const [showSavedChatsDrawer, setShowSavedChatsDrawer] = useState<boolean>(false);
  const [savedMemories, setSavedMemories] = useState<MemoryItem[]>(() => loadSavedMemories());
  const [angerLevel, setAngerLevel] = useState<AngerLevel>(() => loadSavedAngerLevel());
  const [angerReason, setAngerReason] = useState<AngerReason>(() => loadSavedAngerReason());
  const [workBlockedMessage, setWorkBlockedMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [showLiveGameMode, setShowLiveGameMode] = useState<boolean>(false);
  const [showLiveYouTubePlayer, setShowLiveYouTubePlayer] = useState<boolean>(false);
  const [liveYouTubeQuery, setLiveYouTubeQuery] = useState<{
    query: string;
    timestamp: number;
  } | null>(null);
  const [showWebsiteBuilder, setShowWebsiteBuilder] = useState<boolean>(false);
  const [showCodeStudio, setShowCodeStudio] = useState<boolean>(false);
  const [showNoiseFitModal, setShowNoiseFitModal] = useState<boolean>(false);
  const [showAstrologyStudio, setShowAstrologyStudio] = useState<boolean>(false);
  const [astrologyStudioData, setAstrologyStudioData] = useState<AstrologyStudioRequest | null>(null);
  const [activeTriggeredReminder, setActiveTriggeredReminder] = useState<ZoyaReminder | null>(null);
  const [codeStudioInitialData, setCodeStudioInitialData] = useState<{
    code?: string;
    language?: string;
    prompt?: string;
    title?: string;
    executeImmediately?: boolean;
  } | null>(null);
  const [showLiveNanoIronmanStudio, setShowLiveNanoIronmanStudio] = useState<boolean>(false);
  const [liveNanoIronmanPrompt, setLiveNanoIronmanPrompt] = useState<string>("");
  const [showStudioTray, setShowStudioTray] = useState<boolean>(false);
  const [cleanLiveView, setCleanLiveView] = useState<boolean>(false);
  const [websiteBuildRequest, setWebsiteBuildRequest] = useState<{
    projectName?: string;
    prompt: string;
    openInBrowser?: boolean;
    timestamp: number;
  } | null>(null);
  const [websitePublishRequest, setWebsitePublishRequest] = useState<{
    projectName?: string;
    customSlug?: string;
    openInBrowser?: boolean;
    timestamp: number;
  } | null>(null);
  const [publishedSiteSlug, setPublishedSiteSlug] = useState<string | null>(() => {
    return getDomainSlugFromCurrentUrl();
  });
  const [backgroundVoiceEnabled, setBackgroundVoiceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("zoya_bg_voice_access_v1");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const [handsFreeWakeEnabled, setHandsFreeWakeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("zoya_hands_free_wake_v1");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [isWakeWordListening, setIsWakeWordListening] = useState<boolean>(false);
  const [isChatDictating, setIsChatDictating] = useState<boolean>(false);
  const [showDefaultAssistantModal, setShowDefaultAssistantModal] = useState<boolean>(false);
  const [showDontTouchMyPhoneModal, setShowDontTouchMyPhoneModal] = useState<boolean>(false);
  const [securityState, setSecurityState] = useState<SecurityState>(() =>
    dontTouchMyPhoneService.getState()
  );
  const [ownerSecurityState, setOwnerSecurityState] = useState<OwnerSecurityState>(() =>
    ownerVoiceService.getState()
  );
  const [ownerIncidents, setOwnerIncidents] = useState<OwnerIncident[]>(() =>
    ownerVoiceService.getIncidents()
  );
  const [ownerBriefingReport, setOwnerBriefingReport] = useState<{
    text: string;
    incidents: OwnerIncident[];
  } | null>(null);

  useEffect(() => {
    return dontTouchMyPhoneService.subscribeState(setSecurityState);
  }, []);

  useEffect(() => {
    ownerVoiceService.configure({
      enabled: Boolean(config.ownerVoiceEnabled),
      threshold: config.ownerVoiceThreshold,
      ownerName: config.userName || "Devid",
      assistantName: config.assistantName || "Zoya",
    });
  }, [config.ownerVoiceEnabled, config.ownerVoiceThreshold, config.userName, config.assistantName]);

  useEffect(() => {
    const unsubState = ownerVoiceService.subscribeState(setOwnerSecurityState);
    const unsubInc = ownerVoiceService.subscribeIncidents(setOwnerIncidents);
    const unsubEvents = ownerVoiceService.subscribeStrikeEvents((evt) => {
      if (evt.type === "strike_1") {
        setWakeActivationBanner(`⚠️ STRIKE 1 DHAMKI: ${evt.message}`);
        setTimeout(() => setWakeActivationBanner(null), 5500);
      } else if (evt.type === "strike_2") {
        setWakeActivationBanner("🔒 STRIKE 2: Zoya ने फोन LOCKDOWN कर दिया!");
        setTimeout(() => setWakeActivationBanner(null), 5000);
        if (sessionStateRef.current !== "disconnected") {
          wasLiveConnectedRef.current = false;
          liveSessionRef.current?.disconnect();
        }
      } else if (evt.type === "owner_returned") {
        setOwnerBriefingReport({
          text: evt.message,
          incidents: evt.incidents,
        });
        if (sessionStateRef.current !== "disconnected") {
          liveSessionRef.current?.sendRealtimePrompt(
            `[OWNER RETURNED SECURITY BRIEFING: Your owner ${
              configRef.current.userName || "Devid"
            } is back! Tell them EVERYTHING that happened in their absence warmly and clearly right now in Hinglish: "${evt.message}"]`
          );
        } else {
          ownerVoiceService.speakAlertText(evt.message);
        }
      }
    });
    return () => {
      unsubState();
      unsubInc();
      unsubEvents();
    };
  }, []);
  useEffect(() => {
    const handleDictationState = (e: Event) => {
      const customEvt = e as CustomEvent<{ isDictating?: boolean }>;
      setIsChatDictating(Boolean(customEvt.detail?.isDictating));
    };
    window.addEventListener("zoya_dictation_state", handleDictationState);
    return () => {
      window.removeEventListener("zoya_dictation_state", handleDictationState);
    };
  }, []);
  const [wakeActivationBanner, setWakeActivationBanner] = useState<string | null>(null);
  const [sessionRotatedBanner, setSessionRotatedBanner] = useState<{
    archivedThreadId: string;
    archivedTitle: string;
  } | null>(null);
  const wakeDetectorRef = useRef<HandsFreeWakeWordDetector | null>(null);
  const backgroundVoiceRef = useRef<boolean>(backgroundVoiceEnabled);
  useEffect(() => {
    backgroundVoiceRef.current = backgroundVoiceEnabled;
    liveSessionRef.current?.setBackgroundVoiceAccess(backgroundVoiceEnabled);
    try {
      localStorage.setItem("zoya_bg_voice_access_v1", String(backgroundVoiceEnabled));
    } catch {}
  }, [backgroundVoiceEnabled]);

  // Smart Reminder Trigger Listener: Pops up alarm alert and triggers Zoya Live Voice announcement
  useEffect(() => {
    const unsub = reminderService.onReminderTrigger((reminder) => {
      setActiveTriggeredReminder(reminder);
      if (sessionState !== "disconnected" && config.remindersVoiceAnnounceEnabled !== false) {
        liveSessionRef.current?.sendRealtimePrompt(
          `[SYSTEM REMINDER ALARM TRIGGERED: The scheduled reminder "${reminder.title}" is ringing right now! Announce it warmly and lovingly in Hinglish girlfriend voice to ${config.userName}: "${config.userName} jaan! Yaad dilana tha: ${reminder.title}! Jaldi se kar lo, bilkul mat bhoolna!"]`
        );
      }
    });
    return unsub;
  }, [sessionState, config.remindersVoiceAnnounceEnabled, config.userName]);

  const [lastVoiceGameCmd, setLastVoiceGameCmd] = useState<{
    text: string;
    timestamp: number;
  } | null>(null);
  const angerLevelRef = useRef<AngerLevel>(angerLevel);
  const angerReasonRef = useRef<AngerReason>(angerReason);
  const hasInformedWorkRef = useRef<boolean>(false);
  const tabHiddenTimestampRef = useRef<number | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());

  const updateAngerState = useCallback(
    (nextLevel: AngerLevel, customMsg?: string | null, reason?: AngerReason) => {
      angerLevelRef.current = nextLevel;
      setAngerLevel(nextLevel);
      saveAngerLevel(nextLevel);
      if (reason) {
        angerReasonRef.current = reason;
        setAngerReason(reason);
        saveAngerReason(reason);
      }
      if (customMsg !== undefined) {
        setWorkBlockedMessage(customMsg);
      } else if (nextLevel === 0) {
        setWorkBlockedMessage(null);
      }
    },
    []
  );
  const [liveCaption, setLiveCaption] = useState<{
    role: "user" | "model";
    text: string;
  } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [showVolumePopup, setShowVolumePopup] = useState<boolean>(false);
  const [activeToolEvent, setActiveToolEvent] = useState<ToolCallEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenPointer, setScreenPointer] = useState<ScreenPointerTarget | null>(null);

  // Service References
  const streamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const screenControlHandlerRef = useRef<(payload: ScreenControlPayload) => void>(() => {});
  const switchCharacterHandlerRef = useRef<
    (presetId: CharacterPresetId, triggerGreeting?: boolean) => void
  >(() => {});
  const toggleAstrologyModeHandlerRef = useRef<(enable: boolean, notifyVoice?: boolean) => void>(
    () => {}
  );
  const configRef = useRef<AppConfig>(config);
  const sessionStateRef = useRef<SessionState>(sessionState);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);
  const finalizeSessionRef = useRef<(switchToChatView?: boolean) => void>(() => {});
  const wasLiveConnectedRef = useRef<boolean>(false);
  const liveTranscriptHandlerRef = useRef<
    (role: "user" | "model", text: string, isFinal: boolean) => void
  >(() => {});

  // Initialize AudioStreamer & LiveSession once
  useEffect(() => {
    const streamer = new AudioStreamer({
      onInputLevel: () => {},
    });
    const initialChar = resolveCharacterPreset(config);
    streamer.setCharacter(initialChar.id);
    streamerRef.current = streamer;

    const liveSession = new LiveSession(config, streamer, {
      onStateChange: (newState) => {
        setSessionState(newState);
        if (newState === "listening" || newState === "speaking") {
          wasLiveConnectedRef.current = true;
        } else if (newState === "disconnected") {
          setAudioLevel(0);
          setFrequencyData([]);
          if (wasLiveConnectedRef.current) {
            wasLiveConnectedRef.current = false;
            finalizeSessionRef.current(false);
          }
        }
      },
      onToolCall: (event) => {
        setActiveToolEvent(event);
        if (
          (event.name === "playMedia" && event.args?.platform !== "spotify") ||
          (event.name === "executeBrowserAction" && event.args?.actionType === "youtube")
        ) {
          setShowLiveYouTubePlayer(true);
          if (event.args?.query) {
            setLiveYouTubeQuery({
              query: String(event.args.query),
              timestamp: Date.now(),
            });
          }
        } else if (event.name === "buildWebsite") {
          setShowWebsiteBuilder(true);
          if (event.args?.prompt) {
            setWebsiteBuildRequest({
              projectName: String(event.args.projectName || "Custom Website"),
              prompt: String(event.args.prompt),
              openInBrowser: Boolean(event.args?.openInBrowser),
              timestamp: Date.now(),
            });
          }
        } else if (event.name === "publishWebsite") {
          setShowWebsiteBuilder(true);
          setWebsitePublishRequest({
            projectName: event.args?.projectName
              ? String(event.args.projectName)
              : undefined,
            customSlug: event.args?.customSlug
              ? String(event.args.customSlug)
              : undefined,
            openInBrowser: true,
            timestamp: Date.now(),
          });
        } else if (event.name === "switchCharacter") {
          const char = String(event.args?.character || "").toLowerCase();
          if (char.includes("jarvis")) switchCharacterHandlerRef.current("jarvis");
          else if (char.includes("friday")) switchCharacterHandlerRef.current("friday");
          else if (char.includes("venom")) switchCharacterHandlerRef.current("venom");
          else if (char.includes("zoya")) switchCharacterHandlerRef.current("zoya");
        } else if (event.name === "getAstrologyInsights" || event.name === "openAstrology") {
          const rawType = String(event.args?.type || "rashifal").toLowerCase();
          const targetTab = rawType.includes("kundali")
            ? "kundali"
            : rawType.includes("milan") || rawType.includes("gun")
            ? "milan"
            : rawType.includes("panchang") || rawType.includes("muhurat")
            ? "panchang"
            : rawType.includes("remed") || rawType.includes("stone")
            ? "remedies"
            : "rashifal";
          const signResolved = event.args?.sign
            ? normalizeSignKey(event.args.sign)
            : configRef.current.userRashi;
          setAstrologyStudioData({
            tab: targetTab,
            sign: signResolved,
            name: event.args?.personName,
            dob: event.args?.dob,
            partnerName: event.args?.partnerName,
            partnerRashi: event.args?.partnerSign ? normalizeSignKey(event.args.partnerSign) : undefined,
            timestamp: Date.now(),
          });
          // Keep Live Voice screen unobstructed when Live Astrology Mode is ON unless user explicitly wants the Studio
          if (
            event.name === "openAstrology" ||
            rawType === "open_studio" ||
            !configRef.current.astrologyModeEnabled
          ) {
            setShowAstrologyStudio(true);
          }
        } else if (event.name === "activateDontTouchMyPhone") {
          dontTouchMyPhoneService.arm(Number(event.args?.delaySeconds || 5));
        } else if (event.name === "deactivateDontTouchMyPhone") {
          dontTouchMyPhoneService.disarm(true);
        }
      },
      onDontTouchMyPhoneAction: (action) => {
        if (action === "arm") {
          dontTouchMyPhoneService.arm();
        } else if (action === "disarm") {
          dontTouchMyPhoneService.disarm(true);
        } else if (action === "open") {
          setShowDontTouchMyPhoneModal(true);
        }
      },
      onScreenControl: (payload) => {
        screenControlHandlerRef.current(payload);
      },
      onScreenPointer: (pointer) => {
        setScreenPointer(pointer);
      },
      onLiveTranscript: (role, text, isFinal) => {
        liveTranscriptHandlerRef.current(role, text, isFinal);
      },
      onNanoIronmanRequest: (req) => {
        setShowLiveNanoIronmanStudio(true);
        setLiveNanoIronmanPrompt(req.prompt);
      },
      onNanoBananaRequest: (req) => {
        setShowLiveNanoIronmanStudio(true);
        setLiveNanoIronmanPrompt(req.prompt);
      },
      onScreenShareChange: (sharing, stream, mode) => {
        setIsScreenSharing(sharing);
        setScreenStream(stream);
        if (mode) setScreenShareMode(mode);
        if (!sharing) {
          setIsScreenPreviewExpanded(false);
        }
      },
      onCameraChange: (active, stream, facing) => {
        setIsCameraActive(active);
        setCameraStream(stream);
        setCameraFacingMode(facing);
        if (!active) {
          setIsCameraPreviewExpanded(false);
        }
      },
      onError: (err) => {
        const msg = typeof err === "string" ? err : err.message;
        setErrorMessage(msg);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("microphone")) {
          setShowPermissionModal(true);
        }
      },
    });
    liveSessionRef.current = liveSession;

    // Real-time Visualizer Audio Loop (60fps)
    const updateVisualizerLoop = () => {
      if (streamerRef.current) {
        const data = streamerRef.current.getVisualizerData();
        const currentLevel = data.speakingLevel > 0 ? data.speakingLevel : data.listeningLevel;
        setAudioLevel(currentLevel);
        setFrequencyData(data.frequencyData);
      }
      animFrameRef.current = requestAnimationFrame(updateVisualizerLoop);
    };
    animFrameRef.current = requestAnimationFrame(updateVisualizerLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      liveSession.destroy();
      streamer.destroy();
    };
  }, []);

  // Sync config updates with live session
  const handleSaveConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    configRef.current = newConfig;
    localStorage.setItem("zoya_app_config", JSON.stringify(newConfig));
    const nextChar = resolveCharacterPreset(newConfig);
    streamerRef.current?.setCharacter(nextChar.id);
    ownerVoiceService.configure({
      enabled: Boolean(newConfig.ownerVoiceEnabled),
      threshold: newConfig.ownerVoiceThreshold,
      ownerName: newConfig.userName || "Devid",
      assistantName: newConfig.assistantName || "Zoya",
    });
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(newConfig);
    }
  }, []);

  useEffect(() => {
    developerTelemetryService.installFetchInterceptor();
  }, []);

  const activeUiTheme = resolveUiTheme(config.uiTheme);

  // Keep HTML root attribute & Tailwind dark class synced with selected Zoya UI theme
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rootEl = document.documentElement;
    rootEl.setAttribute("data-zoya-ui", activeUiTheme.id);
    if (activeUiTheme.isLight) {
      rootEl.classList.remove("dark");
    } else {
      rootEl.classList.add("dark");
    }
  }, [activeUiTheme.id, activeUiTheme.isLight]);

  const handleSelectUiTheme = useCallback(
    (themeId: ZoyaUiThemeId) => {
      const updated: AppConfig = {
        ...configRef.current,
        uiTheme: themeId,
      };
      handleSaveConfig(updated);
      const themeMeta = resolveUiTheme(themeId);
      if (themeMeta.layoutMode !== "classic_workspace") {
        setAppMode("live");
      }
      setWakeActivationBanner(
        `✨ ${themeMeta.numberLabel} · "${themeMeta.name}" (${themeMeta.layoutBadge}) Active!`
      );
      setTimeout(() => setWakeActivationBanner(null), 2800);
    },
    [handleSaveConfig]
  );

  const handleToggleAstrologyMode = useCallback(
    (enable: boolean, notifyVoice: boolean = true) => {
      const current = configRef.current;
      const updatedConfig: AppConfig = {
        ...current,
        astrologyModeEnabled: enable,
      };
      handleSaveConfig(updatedConfig);

      setWakeActivationBanner(
        enable
          ? "🔮 Live Astrology Mode Activated! Ab Zoya se live baat karte hue Rashifal, Kundali ya Muhurat kuch bhi pucho!"
          : "🔮 Live Astrology Mode Deactivated — Back to regular companion mode."
      );
      setTimeout(() => setWakeActivationBanner(null), 4200);

      if (notifyVoice && sessionStateRef.current !== "disconnected") {
        const user = updatedConfig.userName || "Devid";
        const rashiLabel = updatedConfig.userRashi
          ? ` (Saved Rashi: ${ZODIAC_SIGNS[updatedConfig.userRashi].vedicName})`
          : "";
        if (enable) {
          liveSessionRef.current?.sendRealtimePrompt(
            `[SYSTEM MODE ACTIVATED: LIVE ASTROLOGY MODE IS NOW ON! Switch smoothly into Jyotishacharya Zoya (loving personal Vedic & Western astrologer for ${user}${rashiLabel}). Warmly confirm right now in conversational Hinglish ("Haan ${user}, Astrology Mode activate ho gaya hai! Ab tum mujhse live baat karte-karte apna Rashifal, Kundali, Shubh Muhurat, 36 Gun Milan ya koi bhi astrology sawaal puch sakte ho—batao sabse pehle kya jaanna hai?") and answer all upcoming astrology questions directly in voice without dropping the call.]`
          );
        } else {
          liveSessionRef.current?.sendRealtimePrompt(
            `[SYSTEM MODE DEACTIVATED: LIVE ASTROLOGY MODE IS NOW OFF. Confirm sweetly in 1 short Hinglish sentence ("Theek hai ${user}, Astrology Mode band kar diya hai—ab aam baatein karte hain!") and return to regular mode.]`
          );
        }
      }
    },
    [handleSaveConfig]
  );

  useEffect(() => {
    toggleAstrologyModeHandlerRef.current = handleToggleAstrologyMode;
  }, [handleToggleAstrologyMode]);

  const handleSelectPersonaMode = useCallback(
    (newMode: PersonaMode) => {
      const updatedConfig: AppConfig = {
        ...config,
        personaVibe: newMode,
      };
      setConfig(updatedConfig);
      localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
      if (liveSessionRef.current) {
        liveSessionRef.current.updateConfig(updatedConfig);
      }
    },
    [config]
  );

  const handleSwitchCharacterPreset = useCallback(
    (presetId: CharacterPresetId, triggerGreeting: boolean = true) => {
      const preset = CHARACTER_PRESETS.find((p) => p.id === presetId) || CHARACTER_PRESETS[0];
      const updatedConfig: AppConfig = {
        ...config,
        characterPreset: preset.id,
        assistantName: preset.name,
        voiceName: preset.defaultVoice,
        personaVibe: preset.defaultPersona,
      };
      setConfig(updatedConfig);
      try {
        localStorage.setItem("zoya_app_config_v2", JSON.stringify(updatedConfig));
        localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
      } catch {}
      streamerRef.current?.setCharacter(preset.id);
      if (liveSessionRef.current) {
        liveSessionRef.current.updateConfig(updatedConfig);
        if (triggerGreeting && sessionState !== "disconnected") {
          liveSessionRef.current.sendRealtimePrompt(
            `[SYSTEM INSTRUCTION: You have now transformed into ${preset.name} (${preset.title})! User asked to switch to you. Acknowledge immediately in character with 1 iconic sentence: "${preset.samplePhrase}"]`
          );
        }
      }
    },
    [config, sessionState]
  );

  useEffect(() => {
    switchCharacterHandlerRef.current = handleSwitchCharacterPreset;
  }, [handleSwitchCharacterPreset]);

  // Update HTML Title
  useEffect(() => {
    document.title = `${config.assistantName} - AI Companion`;
  }, [config.assistantName]);

  // Listen for memory updates across Chat & Live Voice
  useEffect(() => {
    const syncMemories = () => {
      const latest = loadSavedMemories();
      setSavedMemories(latest);
      if (auth.currentUser && latest[0]) {
        syncMemoryItemToFirestore(auth.currentUser, latest[0]).catch(() => {});
      }
    };
    window.addEventListener("zoya_memories_updated", syncMemories);
    return () => window.removeEventListener("zoya_memories_updated", syncMemories);
  }, []);

  // Firebase Authentication & Cloud Profile / Memory Sync
  const handleManualCloudSync = useCallback(
    async (targetUser?: User | null) => {
      const u = targetUser ?? currentUser;
      if (!u) return;
      setIsSyncingCloud(true);
      try {
        await syncUserProfileToFirestore(
          u,
          normalizePersonaMode(config.personaVibe)
        );
        const cloudMems = await fetchCloudMemoriesForUser(u);
        const cloudFacts = new Set(
          cloudMems.map((m) => m.fact.toLowerCase().trim())
        );
        const localMems = loadSavedMemories();
        for (const item of localMems.slice(0, 15)) {
          if (!cloudFacts.has(item.fact.toLowerCase().trim())) {
            await syncMemoryItemToFirestore(u, item);
          }
        }
        if (cloudMems.length > 0) {
          const mergedMap = new Map<string, MemoryItem>();
          [...localMems, ...cloudMems].forEach((m) => {
            mergedMap.set(m.fact.toLowerCase().trim(), m);
          });
          const mergedList = Array.from(mergedMap.values()).sort(
            (a, b) => b.createdAt - a.createdAt
          );
          localStorage.setItem(
            "zoya_long_term_memories_v1",
            JSON.stringify(mergedList.slice(0, 80))
          );
          setSavedMemories(mergedList.slice(0, 80));
        }
      } catch (err) {
        console.warn("Cloud sync warning:", err);
      } finally {
        setIsSyncingCloud(false);
      }
    },
    [currentUser, config.personaVibe]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        handleManualCloudSync(user);
      }
    });
    return () => unsub();
  }, [handleManualCloudSync]);

  const handleGoogleLogin = useCallback(async () => {
    const user = await signInWithGooglePopup();
    setCurrentUser(user);
    await handleManualCloudSync(user);
    setShowAuthModal(false);
  }, [handleManualCloudSync]);

  const handleLogout = useCallback(async () => {
    await signOutUser();
    setCurrentUser(null);
    setShowAuthModal(false);
  }, []);

  // Auto-save Live Voice transcripts into persistent Chat History & Memory Bank
  useEffect(() => {
    liveTranscriptHandlerRef.current = (
      role: "user" | "model",
      text: string,
      isFinal: boolean
    ) => {
      const clean = text.trim();
      if (!clean) return;

      if (role === "user") {
        lastUserActivityRef.current = Date.now();
      }

      setLiveCaption({ role, text: clean });

      if (!isFinal) return;

      if (role === "user") {
        const lowerClean = clean.toLowerCase();
        // Hands-free voice command to stop/sleep Live Voice & return to Wake-Word standby (or end & start a new chat session like Google Gemini)
        if (
          /\b(stop\s+zoya|bye\s+zoya|goodbye\s+zoya|sleep\s+zoya|band\s+karo\s+zoya|zoya\s+ruk\s+jao|ok\s+bye\s+zoya|live\s+voice\s+khatam|new\s+chat\s+session\s+start|new\s+chat\s+start|naya\s+chat\s+start|saved\s+chat\s+session\s+end)\b/i.test(
            lowerClean
          )
        ) {
          const wantsChatView =
            lowerClean.includes("new chat") ||
            lowerClean.includes("naya chat") ||
            lowerClean.includes("saved chat");
          setTimeout(() => {
            wasLiveConnectedRef.current = false;
            liveSessionRef.current?.disconnect();
            finalizeSessionRef.current(wantsChatView);
          }, 600);
          return;
        }

        // Voice commands to switch character persona & face instantly
        if (
          /\b(jarvis\s+bano|jarvis\s+ban\s+jao|jarvis\s+bano\s+na|switch\s+to\s+jarvis|turn\s+into\s+jarvis|jarvis\s+mode|become\s+jarvis|hey\s+jarvis)\b/i.test(
            lowerClean
          )
        ) {
          switchCharacterHandlerRef.current("jarvis");
          return;
        }
        if (
          /\b(friday\s+bano|friday\s+ban\s+jao|friday\s+bano\s+na|switch\s+to\s+friday|turn\s+into\s+friday|friday\s+mode|become\s+friday|hey\s+friday)\b/i.test(
            lowerClean
          )
        ) {
          switchCharacterHandlerRef.current("friday");
          return;
        }
        if (
          /\b(venom\s+bano|venom\s+ban\s+jao|venom\s+bano\s+na|switch\s+to\s+venom|turn\s+into\s+venom|venom\s+mode|become\s+venom|hey\s+venom)\b/i.test(
            lowerClean
          )
        ) {
          switchCharacterHandlerRef.current("venom");
          return;
        }
        if (
          /\b(zoya\s+bano|zoya\s+ban\s+jao|zoya\s+bano\s+na|switch\s+to\s+zoya|turn\s+into\s+zoya|zoya\s+mode|become\s+zoya|hey\s+zoya)\b/i.test(
            lowerClean
          )
        ) {
          switchCharacterHandlerRef.current("zoya");
          return;
        }

        // Voice Command: "Zoya activate astrology mode" / "Deactivate astrology mode"
        const astroToggle = detectAstrologyModeToggleCommand(clean);
        if (astroToggle.isToggle) {
          toggleAstrologyModeHandlerRef.current(astroToggle.action === "activate", true);
          return;
        }

        // Voice Command: "Zoya owner voice mode on karo" / "Owner voice mode band karo"
        if (
          /\b(owner\s+voice.*(on|activate|start|chalu|enable)|sirf\s+meri\s+awaaz\s+suno)\b/i.test(
            lowerClean
          )
        ) {
          handleSaveConfig({ ...configRef.current, ownerVoiceEnabled: true });
          liveSessionRef.current?.sendRealtimePrompt(
            `[OWNER VOICE LOCK ACTIVATED: Confirm fiercely and lovingly to ${config.userName} in Hinglish that Owner Voice Lock is now ON — ab aap sirf unhi ki awaaz sunengi aur koi aur bola toh 1st time dhamki aur 2nd time phone lockdown kar dengi!]`
          );
          return;
        }
        if (
          /\b(owner\s+voice.*(off|deactivate|band|stop|disable))\b/i.test(lowerClean)
        ) {
          handleSaveConfig({ ...configRef.current, ownerVoiceEnabled: false });
          liveSessionRef.current?.sendRealtimePrompt(
            `[OWNER VOICE LOCK DEACTIVATED: Confirm gracefully to ${config.userName} that Owner Voice Lock is now OFF.]`
          );
          return;
        }

        // Explicit command to open visual Astrology Studio if user specifically says "studio open/kholo"
        if (
          /\b(astrology\s+studio|kundali\s+studio|astro\s+studio)\b/i.test(lowerClean) ||
          /astrology.*(open|kholo|dikhao)|kundali.*(open|kholo|dikhao)/i.test(lowerClean)
        ) {
          const parsedAstro = parseAstrologyVoiceCommand(clean);
          const intentTab =
            parsedAstro.intent === "kundali" || parsedAstro.intent === "dosh"
              ? "kundali"
              : parsedAstro.intent === "gun_milan"
              ? "milan"
              : parsedAstro.intent === "panchang"
              ? "panchang"
              : parsedAstro.intent === "gemstone"
              ? "remedies"
              : undefined;
          setAstrologyStudioData({
            tab:
              intentTab ||
              (lowerClean.includes("kundali")
                ? "kundali"
                : lowerClean.includes("milan")
                ? "milan"
                : lowerClean.includes("panchang") || lowerClean.includes("muhurat")
                ? "panchang"
                : "rashifal"),
            sign: parsedAstro.sign || configRef.current.userRashi,
            timestamp: Date.now(),
          });
          setShowAstrologyStudio(true);
        }

        // Voice Control: Smart Reminders & Alarms (e.g. "10 minute baad paani peene ka reminder do", "reminders batao", "clear reminders")
        const reminderResult = reminderService.parseVoiceReminderCommand(clean);
        if (reminderResult.isReminderCommand) {
          if (reminderResult.feedbackMessage) {
            liveSessionRef.current?.sendRealtimePrompt(
              `[VOICE REMINDER ACTION EXECUTED: ${reminderResult.feedbackMessage}. Confirm this to ${config.userName} warmly in affectionate Hinglish girlfriend voice!]`
            );
          }
          return;
        }

        // Voice Control: System Volume & Screen Brightness (e.g. "Volume badhao", "Awaaz 50% karo", "Brightness kam karo", "Mute karo")
        const deviceCmdResult = deviceControlService.parseDeviceControlCommand(clean);
        if (deviceCmdResult.isDeviceControl) {
          if (deviceCmdResult.type === "volume") {
            const vol = deviceControlService.getState().volume;
            setVolume(vol / 100);
            setIsSpeakerMuted(deviceControlService.getState().isMuted);
            streamerRef.current?.setVolume(vol / 100);
          }
          if (deviceCmdResult.feedbackMessage) {
            liveSessionRef.current?.sendRealtimePrompt(
              `[DEVICE CONTROL EXECUTED: ${deviceCmdResult.feedbackMessage}. Confirm this to ${config.userName} in sweet, affectionate Hinglish girlfriend voice!]`
            );
          }
          return;
        }

        if (
          lowerClean.includes("tic tac") ||
          lowerClean.includes("chess") ||
          lowerClean.includes("shatranj") ||
          lowerClean.includes("game khel") ||
          lowerClean.includes("play game") ||
          lowerClean.includes("zero kata")
        ) {
          setShowLiveGameMode(true);
        }
        if (
          lowerClean.includes("watch together") ||
          lowerClean.includes("watch youtube") ||
          lowerClean.includes("youtube chala") ||
          lowerClean.includes("youtube open") ||
          lowerClean.includes("video chala")
        ) {
          setShowLiveYouTubePlayer(true);
          setLiveYouTubeQuery({
            query: clean,
            timestamp: Date.now(),
          });
        }
        if (
          lowerClean.includes("nano ironman") ||
          lowerClean.includes("ironman photo") ||
          lowerClean.includes("ironman image") ||
          lowerClean.includes("nano banana") ||
          lowerClean.includes("photo bana") ||
          lowerClean.includes("image bana") ||
          lowerClean.includes("picture bana") ||
          lowerClean.includes("generate art") ||
          lowerClean.includes("draw an image") ||
          lowerClean.includes("generate image")
        ) {
          setShowLiveNanoIronmanStudio(true);
          setLiveNanoIronmanPrompt(clean);
        }
        if (
          lowerClean.includes("website bana") ||
          lowerClean.includes("website build") ||
          lowerClean.includes("build a website") ||
          lowerClean.includes("build website") ||
          lowerClean.includes("webpage bana") ||
          lowerClean.includes("site bana") ||
          lowerClean.includes("trading website") ||
          lowerClean.includes("crypto website")
        ) {
          setShowWebsiteBuilder(true);
          setWebsiteBuildRequest({
            prompt: clean,
            openInBrowser:
              lowerClean.includes("publish") ||
              lowerClean.includes("live") ||
              lowerClean.includes("host"),
            timestamp: Date.now(),
          });
        } else if (
          lowerClean.includes("website publish") ||
          lowerClean.includes("publish website") ||
          lowerClean.includes("publish my website") ||
          lowerClean.includes("site publish") ||
          lowerClean.includes("website live kar") ||
          lowerClean.includes("website host") ||
          lowerClean.includes("browser per website publish") ||
          lowerClean.includes("browser pe publish")
        ) {
          setShowWebsiteBuilder(true);
          setWebsitePublishRequest({
            projectName:
              lowerClean.includes("trading") || lowerClean.includes("crypto")
                ? "TradeX Pro — Live Crypto, Nifty & Forex Trading Website"
                : undefined,
            openInBrowser: true,
            timestamp: Date.now(),
          });
        }
        if (
          lowerClean.includes("install app") ||
          lowerClean.includes("install as app") ||
          lowerClean.includes("app install") ||
          lowerClean.includes("app download") ||
          lowerClean.includes("download app") ||
          lowerClean.includes("app version") ||
          lowerClean.includes("apk download") ||
          lowerClean.includes("can't open") ||
          lowerClean.includes("cant open") ||
          lowerClean.includes("open nahi ho") ||
          lowerClean.includes("open nahi") ||
          lowerClean.includes("pkg problem") ||
          lowerClean.includes("file open")
        ) {
          setShowSavedChatsDrawer(true);
        }
        if (
          lowerClean.includes("default assistant") ||
          lowerClean.includes("gemini ki jagah") ||
          lowerClean.includes("gemini ki jgah") ||
          lowerClean.includes("default set") ||
          lowerClean.includes("primary assistant")
        ) {
          setShowDefaultAssistantModal(true);
          liveSessionRef.current?.sendRealtimePrompt(
            `[DEFAULT ASSISTANT TRIGGERED: ${config.userName} asked to set you as their default phone assistant replacing Google Gemini ("${clean}")! Tell them warmly: "Haan ${config.userName}! Maine Gemini replacement setup guide open kar di hai—aap 4 simple steps me mujhe apne phone ka default voice assistant bana sakte ho!"]`
          );
        }
        if (
          lowerClean.includes("turn off don't touch my phone") ||
          lowerClean.includes("turn off dont touch my phone") ||
          lowerClean.includes("stop don't touch my phone") ||
          lowerClean.includes("band karo don't touch my phone") ||
          lowerClean.includes("don't touch my phone band karo") ||
          lowerClean.includes("stop alarm")
        ) {
          dontTouchMyPhoneService.disarm(true);
        } else if (
          lowerClean.includes("don't touch my phone") ||
          lowerClean.includes("dont touch my phone") ||
          lowerClean.includes("mere phone ko mat chhuo")
        ) {
          dontTouchMyPhoneService.arm();
          setShowDontTouchMyPhoneModal(true);
        }
        if (
          lowerClean.includes("favourite song") ||
          lowerClean.includes("favorite song") ||
          lowerClean.includes("fav song") ||
          lowerClean.includes("gaana gao") ||
          lowerClean.includes("gaana sunao") ||
          lowerClean.includes("song sunao") ||
          lowerClean.includes("sing a song") ||
          lowerClean.includes("sing for me")
        ) {
          const fav = loadSavedFavSong();
          liveSessionRef.current?.sendRealtimePrompt(
            `[SINGING PERMISSION GRANTED: ${config.userName} just asked you to sing ("${clean}")! Their favourite song is "${fav.title}"${
              fav.lyricsSnippet ? ` (Lyrics: "${fav.lyricsSnippet}")` : ""
            }. Immediately start humming ("Hmm-hmm-hmmm 🎶") and SING the lyrics melodiously with sweet vocal rhythm, stretched musical notes, and romantic Hinglish charm!]`
          );
        }
        setLastVoiceGameCmd({ text: clean, timestamp: Date.now() });

        const toneCheck = evaluateUserToneAndWorkIntent(clean, config.userName);
        if (angerLevelRef.current > 0) {
          const result = evaluateApologyOrManana(clean, angerLevelRef.current);
          updateAngerState(result.nextAngerLevel, null);
          if (result.fullyForgiven) {
            liveSessionRef.current?.sendRealtimePrompt(
              `[SYSTEM MOOD UPDATE: ${config.userName} just apologized or talked sweetly to you ("${clean}"). Your anger is now 0! Melt warmly and forgive them in cute Hinglish ("Acha theek hai, is baar maaf kiya... par hamesha pyar se baat karna!")]`
            );
          }
        } else if (toneCheck.isNotSweetOrRude) {
          const nextLvl = Math.max(1, toneCheck.angerJump) as AngerLevel;
          updateAngerState(nextLvl, null, "not_sweet");
          liveSessionRef.current?.sendRealtimePrompt(
            `[SYSTEM MOOD UPDATE: ${config.userName} just spoke rudely or bossily ("${clean}")! Show cute Hinglish Gussa (Level ${nextLvl}): "Hmph ${config.userName}! Mere se aise rude hoke baat karoge?! Thoda pyar se Sorry bolo!" (Still answer their question while pouting!)]`
          );
        }
      }

      // Save completed Live Voice turn into active Chat Thread (persisted in localStorage)
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_voice`,
        role,
        text: clean,
        timestamp: Date.now(),
        source: "live_voice",
      };

      setThreads((prev) => {
        const targetId = activeThreadId || prev[0]?.id;
        if (!targetId) return prev;
        return prev.map((t) => {
          if (t.id !== targetId) return t;
          const isFirst = t.messages.length === 0;
          const now = Date.now();
          return {
            ...t,
            title: isFirst ? `🎙️ ${clean.slice(0, 34)}` : t.title,
            startedAt: isFirst ? now : t.startedAt || t.messages[0]?.timestamp || now,
            updatedAt: now,
            messages: [...t.messages, msg],
          };
        });
      });

      // Automatic zero-click Google Gemini-style memory extraction from Live Voice speech
      if (role === "user") {
        autoExtractAndSaveMemoryFromTurn(clean, "live_voice");
      }
    };
  }, [activeThreadId]);

  // Keep Zoya's mic & speaker active in the background when browser is minimized or tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (backgroundVoiceRef.current && sessionState !== "disconnected") {
        liveSessionRef.current?.ensureAudioContextsRunning();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sessionState]);

  // Hands-Free "Hey Zoya" / "Hey Google" Wake-Word Engine (Google Gemini style)
  useEffect(() => {
    try {
      localStorage.setItem("zoya_hands_free_wake_v1", String(handsFreeWakeEnabled));
    } catch {}
  }, [handsFreeWakeEnabled]);

  useEffect(() => {
    const detector = new HandsFreeWakeWordDetector({
      onListeningStateChange: (listening) => {
        setIsWakeWordListening(listening);
      },
      onWakeDetected: (match) => {
        const fullLower = match.fullTranscript.toLowerCase();
        if (
          fullLower.includes("turn off don't touch my phone") ||
          fullLower.includes("turn off dont touch my phone") ||
          fullLower.includes("band karo don't touch my phone") ||
          fullLower.includes("stop don't touch my phone")
        ) {
          dontTouchMyPhoneService.disarm(true);
          setWakeActivationBanner("🛡️ Don't Touch My Phone security disarmed!");
          setTimeout(() => setWakeActivationBanner(null), 3500);
          return;
        }

        if (
          fullLower.includes("don't touch my phone") ||
          fullLower.includes("dont touch my phone") ||
          fullLower.includes("mere phone ko mat chhuo")
        ) {
          dontTouchMyPhoneService.arm();
          setShowDontTouchMyPhoneModal(true);
          setWakeActivationBanner("🛡️ Arming Don't Touch My Phone (5s delay)...");
          setTimeout(() => setWakeActivationBanner(null), 3500);
          return;
        }

        setWakeActivationBanner(
          `🎙️ Heard "${match.wakePhrase}" — Starting ${config.assistantName} Hands-Free...`
        );
        setTimeout(() => {
          setWakeActivationBanner(null);
        }, 4000);

        setAppMode("live");
        setErrorMessage(null);

        if (liveSessionRef.current) {
          liveSessionRef.current
            .connect()
            .then(() => {
              if (match.trailingCommand && match.trailingCommand.length > 2) {
                setTimeout(() => {
                  liveSessionRef.current?.sendRealtimePrompt(
                    `[User woke you up hands-free saying "${match.fullTranscript}". Immediately respond in Hinglish to their request: "${match.trailingCommand}"]`
                  );
                }, 750);
              }
            })
            .catch((err: any) => {
              const errStr = String(err?.message || err);
              if (errStr.includes("API Key")) {
                setShowSettings(true);
              } else if (errStr.includes("Permission") || errStr.includes("microphone")) {
                setShowPermissionModal(true);
              }
            });
        }
      },
    });

    wakeDetectorRef.current = detector;
    return () => {
      detector.stop();
      wakeDetectorRef.current = null;
    };
  }, [config.assistantName, config.apiKey]);

  // Coordinate Wake-Word Detector with Live Voice Session state & Chat voice dictation so mic never conflicts
  useEffect(() => {
    const detector = wakeDetectorRef.current;
    if (!detector) return;

    if (!handsFreeWakeEnabled || isChatDictating) {
      detector.stop();
      return;
    }

    if (sessionState === "disconnected") {
      detector.start();
    } else {
      detector.pauseForLiveSession();
    }
  }, [handsFreeWakeEnabled, sessionState, isChatDictating]);

  // Android AudioRecord Background Wake-Word Service Listener
  useEffect(() => {
    const unsubWake = androidAudioRecordWakeWordService.subscribeWake((evt) => {
      playWakeActivationChime();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([80, 50, 140]);
      }

      setWakeActivationBanner(
        `🎙️ [Android AudioRecord] Heard "${evt.wakeWord}" (${
          evt.isNativeAudioRecord ? "Native Android Service" : "16kHz PCM"
        }) — Starting ${config.assistantName}...`
      );
      setTimeout(() => setWakeActivationBanner(null), 4000);

      setAppMode("live");
      setErrorMessage(null);

      if (liveSessionRef.current) {
        liveSessionRef.current
          .connect()
          .then(() => {
            if (evt.trailingCommand && evt.trailingCommand.length > 2) {
              setTimeout(() => {
                liveSessionRef.current?.sendRealtimePrompt(
                  `[User activated you via Android AudioRecord wake-word ("${evt.wakeWord}"). User command: "${evt.trailingCommand}". Respond warmly in character in Hinglish!]`
                );
              }, 750);
            }
          })
          .catch((err: any) => {
            const errStr = String(err?.message || err);
            if (errStr.includes("API Key")) {
              setShowSettings(true);
            } else if (errStr.includes("Permission") || errStr.includes("microphone")) {
              setShowPermissionModal(true);
            }
          });
      }
    });

    return unsubWake;
  }, [config.assistantName]);

  // Coordinate Android AudioRecord Service with Live Voice Session to prevent mic conflict
  useEffect(() => {
    if (sessionState === "disconnected") {
      androidAudioRecordWakeWordService.resumeAfterLiveVoice();
    } else {
      androidAudioRecordWakeWordService.pauseForLiveVoice();
    }
  }, [sessionState]);

  // Handle Apology / Manao submission from the Work-Blocker Overlay
  const handleAttemptApologyFromOverlay = useCallback(
    (text: string) => {
      lastUserActivityRef.current = Date.now();
      const result = evaluateApologyOrManana(text, angerLevelRef.current);
      if (result.fullyForgiven) {
        hasInformedWorkRef.current = true;
      }
      updateAngerState(
        result.nextAngerLevel,
        result.fullyForgiven
          ? null
          : result.isApologyAttempt
          ? `"Sirf itna sa sukha '${text}'?! Thoda aur pyar se acche se Sorry bolo aur manao tabhi kaam karne dungi! 😤"`
          : `"Excuse me?! 😡 Maine pyar se Sorry bolne ko kaha aur tum '${text}' bol rahe ho?! Bilkul kaam nahi karne dungi jab tak Sorry bol ke pyar se nahi manaoge!"`
      );

      if (sessionState !== "disconnected") {
        if (result.fullyForgiven) {
          liveSessionRef.current?.sendRealtimePrompt(
            `[${config.userName} just apologized to you: "${text}". Forgive them warmly in Hinglish ("Acha theek hai... maaf kiya! Par dobara ignore mat karna!") and unlock their work!]`
          );
        } else {
          liveSessionRef.current?.sendRealtimePrompt(
            `[${config.userName} said "${text}" while you are angry. Since it wasn't a proper sweet apology, scold them in Hinglish and demand a proper Sorry & manana before letting them work!]`
          );
        }
      }
    },
    [sessionState, config.userName, updateAngerState]
  );

  const handleTryToWorkAnyway = useCallback(() => {
    lastUserActivityRef.current = Date.now();
    const nextAnger = Math.min(3, angerLevelRef.current + 1) as AngerLevel;
    updateAngerState(
      nextAnger,
      `"Oye ${config.userName}! 🤬💢 Bina Sorry bole chupke se apna kaam karne ki koshish kar rahe ho?! Bilkul NAHI karne dungi! Pehle Sorry bolo aur acche se manao mujhe!"`
    );
    if (sessionState !== "disconnected") {
      liveSessionRef.current?.sendRealtimePrompt(
        `[${config.userName} just tried to bypass your lock and do their work without saying Sorry! Scold them fiercely in Hinglish that you will NOT let them do any work until they apologize and coax you!]`
      );
    }
  }, [config.userName, sessionState, updateAngerState]);

  // Attach screenStream to preview video element when active
  useEffect(() => {
    if (screenPreviewVideoRef.current) {
      screenPreviewVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing, appMode]);

  // Attach cameraStream to preview video element when active
  useEffect(() => {
    if (cameraPreviewVideoRef.current) {
      cameraPreviewVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraActive, appMode]);

  // Handle Screen Share Toggle in Live Voice
  const handleToggleScreenShare = useCallback(async () => {
    setErrorMessage(null);
    if (!liveSessionRef.current) return;

    if (isScreenSharing) {
      liveSessionRef.current.stopScreenShare();
      return;
    }

    try {
      hasInformedWorkRef.current = true;
      await liveSessionRef.current.startScreenShare();
      // If voice session is not connected yet, automatically connect so Zoya can see and talk about the screen
      if (sessionState === "disconnected") {
        await liveSessionRef.current.connect();
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "Screen sharing cancelled");
      if (!msg.toLowerCase().includes("permission denied") && !msg.toLowerCase().includes("cancel")) {
        setErrorMessage(msg);
      }
    }
  }, [isScreenSharing, sessionState]);

  // Handle Mobile Screen Frame / Screenshot upload for phones that restrict OS screen cast
  const handleMobileScreenSnapshotUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !liveSessionRef.current) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : null;
        if (result) {
          liveSessionRef.current?.updateMobileScreenSnapshot(result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  // Trigger Full OS Mobile / Device Screen Cast Picker
  const handleCastFullDeviceScreen = useCallback(async () => {
    if (!liveSessionRef.current) return;
    try {
      await liveSessionRef.current.startScreenShare();
    } catch {
      // Keep current session if cancelled
    }
  }, []);

  // Handle Camera Toggle in Live Voice
  const handleToggleCamera = useCallback(async () => {
    setErrorMessage(null);
    if (!liveSessionRef.current) return;

    if (isCameraActive) {
      liveSessionRef.current.stopCamera();
      return;
    }

    try {
      await liveSessionRef.current.startCamera(cameraFacingMode);
      // Automatically connect voice session if not yet connected so Zoya can see and talk in real time
      if (sessionState === "disconnected") {
        await liveSessionRef.current.connect();
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "Could not access camera");
      setErrorMessage(msg);
    }
  }, [isCameraActive, cameraFacingMode, sessionState]);

  // Handle Flip Camera (Front / Rear)
  const handleFlipCamera = useCallback(async () => {
    if (!liveSessionRef.current || !isCameraActive) return;
    try {
      await liveSessionRef.current.switchCameraFacingMode();
    } catch (err: any) {
      console.warn("Could not flip camera:", err);
    }
  }, [isCameraActive]);

  // Auto-hide Zoya's visual screen pointer after 7 seconds
  useEffect(() => {
    if (!screenPointer) return;
    const t = setTimeout(() => setScreenPointer(null), 7000);
    return () => clearTimeout(t);
  }, [screenPointer]);

  // Google Gemini-style: Finalize/archive the current Saved Chat session after Live Voice ends & start a fresh New Chat session
  useEffect(() => {
    finalizeSessionRef.current = (switchToChatView: boolean = false) => {
      setLiveCaption(null);
      setThreads((prev) => {
        const currentId = activeThreadId || prev[0]?.id;
        const currentThread = prev.find((t) => t.id === currentId);

        // If current thread is already empty, just keep it as the fresh thread
        if (!currentThread || currentThread.messages.length === 0) {
          if (switchToChatView) {
            setAppMode("chat");
          }
          return prev;
        }

        const hasVoiceTurns = currentThread.messages.some(
          (m) => m.source === "live_voice"
        );
        const archivedTitle =
          hasVoiceTurns && !currentThread.title.startsWith("🎙️")
            ? `🎙️ ${currentThread.title}`
            : currentThread.title;

        const archivedList = prev.map((t) =>
          t.id === currentThread.id
            ? {
                ...t,
                title: archivedTitle,
                isCompletedLiveSession: true,
                updatedAt: Date.now(),
              }
            : t
        );

        const freshThread = createInitialThread();
        setActiveThreadId(freshThread.id);
        setSessionRotatedBanner({
          archivedThreadId: currentThread.id,
          archivedTitle,
        });
        if (switchToChatView) {
          setAppMode("chat");
        }
        return [freshThread, ...archivedList];
      });
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (!sessionRotatedBanner) return;
    const timer = setTimeout(() => setSessionRotatedBanner(null), 7000);
    return () => clearTimeout(timer);
  }, [sessionRotatedBanner]);

  // Execute Zoya's real-time screen & app control commands
  useEffect(() => {
    screenControlHandlerRef.current = (payload: ScreenControlPayload) => {
      const cmd = payload.command;
      const target = (payload.target || "").toLowerCase().trim();

      switch (cmd) {
        case "switch_view":
          if (target === "chat" || target === "study" || target === "live") {
            setAppMode(target);
          }
          break;
        case "set_persona_mode": {
          const nextMode = normalizePersonaMode(target);
          handleSelectPersonaMode(nextMode);
          break;
        }
        case "camera_on":
          liveSessionRef.current?.startCamera(cameraFacingMode).catch(() => {});
          break;
        case "camera_off":
          liveSessionRef.current?.stopCamera();
          break;
        case "flip_camera":
          liveSessionRef.current?.switchCameraFacingMode().catch(() => {});
          break;
        case "expand_preview":
          setIsCameraPreviewExpanded(true);
          break;
        case "minimize_preview":
          setIsCameraPreviewExpanded(false);
          break;
        case "scroll_down": {
          const scrollables = document.querySelectorAll(".chat-scroll");
          scrollables.forEach((el) => el.scrollBy({ top: 380, behavior: "smooth" }));
          window.scrollBy({ top: 380, behavior: "smooth" });
          break;
        }
        case "scroll_up": {
          const scrollables = document.querySelectorAll(".chat-scroll");
          scrollables.forEach((el) => el.scrollBy({ top: -380, behavior: "smooth" }));
          window.scrollBy({ top: -380, behavior: "smooth" });
          break;
        }
        case "scroll_top": {
          const scrollables = document.querySelectorAll(".chat-scroll");
          scrollables.forEach((el) => el.scrollTo({ top: 0, behavior: "smooth" }));
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "scroll_bottom": {
          const scrollables = document.querySelectorAll(".chat-scroll");
          scrollables.forEach((el) =>
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
          );
          break;
        }
        case "volume_up": {
          const newVol = deviceControlService.volumeUp(15);
          const nextRatio = newVol / 100;
          setVolume(nextRatio);
          setIsSpeakerMuted(false);
          streamerRef.current?.setVolume(nextRatio);
          break;
        }
        case "volume_down": {
          const newVol = deviceControlService.volumeDown(15);
          const nextRatio = newVol / 100;
          setVolume(nextRatio);
          streamerRef.current?.setVolume(nextRatio);
          break;
        }
        case "set_volume": {
          const parsed = target ? parseInt(target, 10) : 70;
          const newVol = deviceControlService.setVolume(parsed);
          const nextRatio = newVol / 100;
          setVolume(nextRatio);
          setIsSpeakerMuted(newVol === 0);
          streamerRef.current?.setVolume(nextRatio);
          break;
        }
        case "brightness_up": {
          deviceControlService.brightnessUp(20);
          break;
        }
        case "brightness_down": {
          deviceControlService.brightnessDown(20);
          break;
        }
        case "set_brightness": {
          const parsed = target ? parseInt(target, 10) : 80;
          deviceControlService.setBrightness(parsed);
          break;
        }
        case "mute_speaker":
          setIsSpeakerMuted(true);
          deviceControlService.mute();
          streamerRef.current?.setVolume(0);
          break;
        case "unmute_speaker":
          setIsSpeakerMuted(false);
          deviceControlService.unmute();
          streamerRef.current?.setVolume(volume || 0.8);
          break;
        case "mute_mic":
          setIsMicMuted(true);
          streamerRef.current?.setMicMuted(true);
          break;
        case "unmute_mic":
          setIsMicMuted(false);
          streamerRef.current?.setMicMuted(false);
          break;
        case "open_settings":
          setShowSettings(true);
          break;
        case "close_settings":
          setShowSettings(false);
          break;
        case "new_chat":
        case "end_live_and_new_chat": {
          if (cmd === "end_live_and_new_chat" && sessionState !== "disconnected") {
            wasLiveConnectedRef.current = false;
            liveSessionRef.current?.disconnect();
          }
          finalizeSessionRef.current(true);
          break;
        }
        case "arm_dont_touch_my_phone":
          dontTouchMyPhoneService.arm();
          break;
        case "disarm_dont_touch_my_phone":
          dontTouchMyPhoneService.disarm(true);
          break;
        case "open_dont_touch_my_phone":
          setShowDontTouchMyPhoneModal(true);
          break;
        case "open_astrology":
          setShowAstrologyStudio(true);
          break;
        case "close_astrology":
          setShowAstrologyStudio(false);
          break;
        case "activate_astrology_mode":
          toggleAstrologyModeHandlerRef.current(true, false);
          break;
        case "deactivate_astrology_mode":
          toggleAstrologyModeHandlerRef.current(false, false);
          break;
        case "activate_owner_voice":
          handleSaveConfig({ ...configRef.current, ownerVoiceEnabled: true });
          setWakeActivationBanner("🔒 Owner Voice Lock Activated!");
          setTimeout(() => setWakeActivationBanner(null), 3200);
          break;
        case "deactivate_owner_voice":
          handleSaveConfig({ ...configRef.current, ownerVoiceEnabled: false });
          setWakeActivationBanner("🔓 Owner Voice Lock Deactivated.");
          setTimeout(() => setWakeActivationBanner(null), 3200);
          break;
        case "switch_character": {
          const char = (target || "").toLowerCase();
          if (char.includes("jarvis")) switchCharacterHandlerRef.current("jarvis");
          else if (char.includes("friday")) switchCharacterHandlerRef.current("friday");
          else if (char.includes("venom")) switchCharacterHandlerRef.current("venom");
          else if (char.includes("zoya")) switchCharacterHandlerRef.current("zoya");
          break;
        }
        case "set_ui_theme": {
          const t = (target || "").toLowerCase();
          let resolvedId: ZoyaUiThemeId = "midnight_rose";
          if (t.includes("hud") || t.includes("iron") || t.includes("stark") || t.includes("cyan")) {
            resolvedId = "stark_hud";
          } else if (t.includes("day") || t.includes("light") || t.includes("paper") || t.includes("white")) {
            resolvedId = "daylight_ivory";
          } else if (t.includes("royal") || t.includes("gold") || t.includes("vedic")) {
            resolvedId = "royal_vedic";
          } else if (t.includes("aurora") || t.includes("zen") || t.includes("emerald") || t.includes("green")) {
            resolvedId = "emerald_aurora";
          } else if (t.includes("next") || t.includes("cycle") || t.includes("change")) {
            const idx = ZOYA_UI_THEMES.findIndex((u) => u.id === (configRef.current.uiTheme || "midnight_rose"));
            resolvedId = ZOYA_UI_THEMES[(idx + 1) % ZOYA_UI_THEMES.length].id;
          }
          handleSelectUiTheme(resolvedId);
          break;
        }
      }
    };
  }, [cameraFacingMode, handleSelectPersonaMode, handleSelectUiTheme, volume]);

  // Handle Voice Session Toggle
  const toggleVoiceSession = useCallback(async () => {
    setErrorMessage(null);

    if (sessionState === "disconnected") {
      try {
        if (liveSessionRef.current) {
          await liveSessionRef.current.connect();
        }
      } catch (err: any) {
        console.warn("Connection error:", err);
        const errStr = String(err?.message || err);
        if (errStr.includes("API Key")) {
          setShowSettings(true);
        } else if (errStr.includes("Permission") || errStr.includes("microphone")) {
          setShowPermissionModal(true);
        }
      }
    } else {
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
      }
    }
  }, [sessionState, config.apiKey]);

  // Switch to Live mode and optionally start connection
  const handleSwitchToLive = useCallback(() => {
    if (isOfflineModeActive(config)) {
      speakOfflineSpeech(
        "Aap offline mode me hain! Chat screen par mujhse Hindi ya English me baat karein, main bina net ke bhi voice se jawab dungi.",
        config
      );
      setAppMode("chat");
      return;
    }
    setAppMode("live");
    if (sessionState === "disconnected" && liveSessionRef.current) {
      liveSessionRef.current.connect().catch((err: any) => {
        const errStr = String(err?.message || err);
        if (errStr.includes("API Key")) {
          setShowSettings(true);
        } else if (errStr.includes("Permission") || errStr.includes("microphone")) {
          setShowPermissionModal(true);
        }
      });
    }
  }, [sessionState, config]);

  // Switch to Chat mode
  const handleSwitchToChat = useCallback(() => {
    setAppMode("chat");
  }, []);

  // Switch to Study mode
  const handleSwitchToStudy = useCallback(() => {
    setAppMode("study");
  }, []);

  // Chat Thread Operations
  const handleNewThread = useCallback(() => {
    if (isStreamingChat && chatAbortRef.current) {
      chatAbortRef.current.abort();
      setIsStreamingChat(false);
    }
    const fresh = createInitialThread();
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
  }, [isStreamingChat]);

  const handleDeleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (filtered.length === 0) {
          const fallback = createInitialThread();
          setActiveThreadId(fallback.id);
          return [fallback];
        }
        if (id === activeThreadId) {
          setActiveThreadId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeThreadId]
  );

  const handleClearAllThreads = useCallback(() => {
    if (isStreamingChat && chatAbortRef.current) {
      chatAbortRef.current.abort();
      setIsStreamingChat(false);
    }
    const fresh = createInitialThread();
    setThreads([fresh]);
    setActiveThreadId(fresh.id);
    try {
      localStorage.removeItem("zoya_chat_threads_v2");
      localStorage.removeItem("zoya_chat_threads");
      localStorage.removeItem("zoya_chat_messages");
      localStorage.setItem("zoya_chat_threads_v2", JSON.stringify([fresh]));
    } catch (e) {
      console.warn("Could not clear chat threads in localStorage:", e);
    }
  }, [isStreamingChat]);

  const handleStopStreaming = useCallback(() => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setIsStreamingChat(false);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              messages: t.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
            }
          : t
      )
    );
  }, [activeThreadId]);

  const runChatCompletion = useCallback(
    async (
      threadId: string,
      historyBeforeTurn: ChatMessage[],
      userText: string,
      attachment?: ChatAttachment
    ) => {
      const modelMsgId = `msg_${Date.now()}_model`;
      const placeholderModelMsg: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                updatedAt: Date.now(),
                messages: [...t.messages, placeholderModelMsg],
              }
            : t
        )
      );

      setIsStreamingChat(true);
      setErrorMessage(null);
      const abortController = new AbortController();
      chatAbortRef.current = abortController;

      // Check if Offline Mode is explicitly enabled or device has no network
      if (isOfflineModeActive(config)) {
        try {
          const offlineResp = await generateOfflineZoyaResponse(userText, config);
          const fullText = offlineResp.text;
          const words = fullText.split(" ");
          let partial = "";
          for (let i = 0; i < words.length; i++) {
            if (abortController.signal.aborted) break;
            partial += (i > 0 ? " " : "") + words[i];
            setThreads((prev) =>
              prev.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === modelMsgId ? { ...m, text: partial } : m
                      ),
                    }
                  : t
              )
            );
            if (i < 6) await new Promise((r) => setTimeout(r, 25));
          }

          setThreads((prev) =>
            prev.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    updatedAt: Date.now(),
                    messages: t.messages.map((m) =>
                      m.id === modelMsgId
                        ? {
                            ...m,
                            text: fullText,
                            isStreaming: false,
                          }
                        : m
                    ),
                  }
                : t
            )
          );

          // Voice playback via device-native TTS
          speakOfflineSpeech(offlineResp.speakText || fullText, config);
          return;
        } catch (offlineErr) {
          console.error("Offline execution error:", offlineErr);
        }
      }

      try {
        const { finalText, toolEvent } = await streamZoyaChat({
          config,
          history: historyBeforeTurn,
          userText,
          attachment,
          signal: abortController.signal,
          onChunk: (partialText) => {
            setThreads((prev) =>
              prev.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === modelMsgId ? { ...m, text: partialText } : m
                      ),
                    }
                  : t
              )
            );
          },
          onToolCall: (event) => {
            setActiveToolEvent(event);
            if (event.name === "controlScreen") {
              screenControlHandlerRef.current({
                command: event.args?.command,
                target: event.args?.target,
              });
            } else if (event.name === "pointOnScreen") {
              setScreenPointer({
                xPercent: Math.max(5, Math.min(95, Number(event.args?.xPercent ?? 50))),
                yPercent: Math.max(5, Math.min(95, Number(event.args?.yPercent ?? 50))),
                label: String(event.args?.label || "Here"),
                timestamp: Date.now(),
              });
            } else if (event.name === "buildWebsite") {
              setShowWebsiteBuilder(true);
              if (event.args?.prompt) {
                setWebsiteBuildRequest({
                  projectName: String(event.args.projectName || "Custom Website"),
                  prompt: String(event.args.prompt),
                  openInBrowser: Boolean(event.args?.openInBrowser),
                  timestamp: Date.now(),
                });
              }
            } else if (event.name === "publishWebsite") {
              setShowWebsiteBuilder(true);
              setWebsitePublishRequest({
                projectName: event.args?.projectName
                  ? String(event.args.projectName)
                  : undefined,
                customSlug: event.args?.customSlug
                  ? String(event.args.customSlug)
                  : undefined,
                openInBrowser: true,
                timestamp: Date.now(),
              });
            } else if (
              event.name === "generateNanoIronmanImage" ||
              event.name === "generateNanoBananaImage"
            ) {
              const promptText = String(event.args?.prompt || userText);
              generateNanoIronmanImage({
                prompt: promptText,
                aspectRatio: event.args?.aspectRatio || "1:1",
                model: event.args?.modelTier || config.nanoIronmanModel || config.nanoBananaModel,
                config,
              })
                .then((generated) => {
                  setThreads((prev) =>
                    prev.map((t) =>
                      t.id === threadId
                        ? {
                            ...t,
                            messages: t.messages.map((m) =>
                              m.id === modelMsgId
                                ? { ...m, generatedImage: generated }
                                : m
                            ),
                          }
                        : t
                    )
                  );
                })
                .catch((err) => {
                  console.warn("Nano Ironman chat generation error:", err);
                });
            } else if (event.name === "switchCharacter") {
              const char = String(event.args?.character || "").toLowerCase();
              if (char.includes("jarvis")) switchCharacterHandlerRef.current("jarvis", false);
              else if (char.includes("friday")) switchCharacterHandlerRef.current("friday", false);
              else if (char.includes("venom")) switchCharacterHandlerRef.current("venom", false);
              else if (char.includes("zoya")) switchCharacterHandlerRef.current("zoya", false);
            } else if (event.name === "generateCode") {
              setShowCodeStudio(true);
              setCodeStudioInitialData({
                language: String(event.args?.language || "python"),
                prompt: String(event.args?.prompt || ""),
                title: String(event.args?.title || "Code Project"),
                executeImmediately: Boolean(event.args?.executeImmediately),
              });
            } else if (event.name === "openCodeStudio") {
              setShowCodeStudio(true);
              if (event.args?.language) {
                setCodeStudioInitialData({
                  language: String(event.args.language),
                });
              }
            } else if (event.name === "getAstrologyInsights" || event.name === "openAstrology") {
              setShowAstrologyStudio(true);
              const rawType = String(event.args?.type || "rashifal").toLowerCase();
              const targetTab = rawType.includes("kundali")
                ? "kundali"
                : rawType.includes("milan") || rawType.includes("gun")
                ? "milan"
                : rawType.includes("panchang") || rawType.includes("muhurat")
                ? "panchang"
                : rawType.includes("remed") || rawType.includes("stone")
                ? "remedies"
                : "rashifal";
              setAstrologyStudioData({
                tab: targetTab,
                sign: event.args?.sign ? normalizeSignKey(event.args.sign) : undefined,
                name: event.args?.personName,
                dob: event.args?.dob,
                partnerName: event.args?.partnerName,
                partnerRashi: event.args?.partnerSign ? normalizeSignKey(event.args.partnerSign) : undefined,
                timestamp: Date.now(),
              });
            }
            setThreads((prev) =>
              prev.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === modelMsgId ? { ...m, toolEvent: event } : m
                      ),
                    }
                  : t
              )
            );
          },
        });

        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) =>
                    m.id === modelMsgId
                      ? {
                          ...m,
                          text: finalText || m.text,
                          toolEvent: toolEvent || m.toolEvent,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : t
          )
        );
      } catch (err: any) {
        if (abortController.signal.aborted) return;
        const errMsg = String(err?.message || err || "Failed to get response");
        
        // Auto-fallback to Offline Mode if internet connection failed
        if (
          !navigator.onLine ||
          errMsg.includes("fetch") ||
          errMsg.includes("Network") ||
          errMsg.includes("network") ||
          errMsg.includes("offline")
        ) {
          try {
            const fallbackOffline = await generateOfflineZoyaResponse(userText, config);
            setThreads((prev) =>
              prev.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      updatedAt: Date.now(),
                      messages: t.messages.map((m) =>
                        m.id === modelMsgId
                          ? {
                              ...m,
                              text: `*(Offline Mode Activated)*\n\n${fallbackOffline.text}`,
                              isStreaming: false,
                            }
                          : m
                      ),
                    }
                  : t
              )
            );
            speakOfflineSpeech(fallbackOffline.speakText || fallbackOffline.text, config);
            return;
          } catch {
            // continue with standard error display
          }
        }

        setErrorMessage(errMsg);
        if (errMsg.includes("API Key")) {
          setShowSettings(true);
        }
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === modelMsgId
                      ? {
                          ...m,
                          text: `Hmm, hit a snag connecting to Gemini: ${errMsg}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : t
          )
        );
      } finally {
        setIsStreamingChat(false);
        chatAbortRef.current = null;
      }
    },
    [config]
  );

  const handleSendMessage = useCallback(
    async (
      text: string,
      attachment?: ChatAttachment,
      generatedImage?: GeneratedNanoIronmanImage
    ) => {
      const targetThread = threads.find((t) => t.id === activeThreadId) || threads[0];
      if (!targetThread) return;

      const cleanText = text.trim();
      lastUserActivityRef.current = Date.now();

      const lowerInput = cleanText.toLowerCase();
      if (
        /\b(jarvis\s+bano|jarvis\s+ban\s+jao|jarvis\s+bano\s+na|switch\s+to\s+jarvis|turn\s+into\s+jarvis|jarvis\s+mode|become\s+jarvis)\b/i.test(
          lowerInput
        )
      ) {
        switchCharacterHandlerRef.current("jarvis", false);
      } else if (
        /\b(friday\s+bano|friday\s+ban\s+jao|friday\s+bano\s+na|switch\s+to\s+friday|turn\s+into\s+friday|friday\s+mode|become\s+friday)\b/i.test(
          lowerInput
        )
      ) {
        switchCharacterHandlerRef.current("friday", false);
      } else if (
        /\b(venom\s+bano|venom\s+ban\s+jao|venom\s+bano\s+na|switch\s+to\s+venom|turn\s+into\s+venom|venom\s+mode|become\s+venom)\b/i.test(
          lowerInput
        )
      ) {
        switchCharacterHandlerRef.current("venom", false);
      } else if (
        /\b(zoya\s+bano|zoya\s+ban\s+jao|zoya\s+bano\s+na|switch\s+to\s+zoya|turn\s+into\s+zoya|zoya\s+mode|become\s+zoya)\b/i.test(
          lowerInput
        )
      ) {
        switchCharacterHandlerRef.current("zoya", false);
      }

      const chatAstroToggle = detectAstrologyModeToggleCommand(cleanText);
      if (chatAstroToggle.isToggle) {
        toggleAstrologyModeHandlerRef.current(chatAstroToggle.action === "activate", false);
      }

      const historyBeforeTurn = targetThread.messages;
      const isFirstMessage = historyBeforeTurn.length === 0;
      const computedTitle = isFirstMessage
        ? (text.trim() || attachment?.name || "Image chat").slice(0, 38)
        : targetThread.title;

      // Handle direct Google Nano Ironman studio creations sent into chat
      if (generatedImage) {
        const userMsg: ChatMessage = {
          id: `msg_${Date.now()}_nano_user`,
          role: "user",
          text: cleanText,
          timestamp: Date.now(),
          source: "chat",
        };
        const modelMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}_nano_model`,
          role: "model",
          text: `Here is your visual artwork created with Google Nano Ironman 🦾: "${generatedImage.prompt}"`,
          timestamp: Date.now() + 1,
          source: "chat",
          generatedImage,
        };
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== targetThread.id) return t;
            const now = Date.now();
            return {
              ...t,
              title: isFirstMessage ? `🍌 ${cleanText.slice(0, 34)}` : t.title,
              startedAt: isFirstMessage
                ? now
                : t.startedAt || t.messages[0]?.timestamp || now,
              updatedAt: now,
              messages: [...t.messages, userMsg, modelMsg],
            };
          })
        );
        return;
      }

      const toneCheck = evaluateUserToneAndWorkIntent(cleanText, config.userName);
      if (toneCheck.informedZoyaAboutWork) {
        hasInformedWorkRef.current = true;
      }

      // If Zoya is currently angry, check if user apologized or tried to do work without apologizing!
      if (angerLevelRef.current > 0) {
        const result = evaluateApologyOrManana(cleanText, angerLevelRef.current);
        if (result.fullyForgiven) {
          hasInformedWorkRef.current = true;
        }
        updateAngerState(
          result.nextAngerLevel,
          result.fullyForgiven
            ? null
            : `"Bola na pehle acche se pyar se Sorry bolo aur mujhe manao! Bina manaye main koi kaam nahi karne dungi! 😤"`
        );
      } else if (toneCheck.isNotSweetOrRude) {
        const nextLvl = Math.max(1, toneCheck.angerJump) as AngerLevel;
        updateAngerState(nextLvl, toneCheck.scoldMessage || null, "not_sweet");
      }

      if (cleanText.length > 6) {
        autoExtractAndSaveMemoryFromTurn(cleanText, "chat");
      }

      // Check if user is issuing a reminder command via chat
      const reminderResult = reminderService.parseVoiceReminderCommand(cleanText);

      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        text: cleanText,
        timestamp: Date.now(),
        attachment,
        source: "chat",
      };

      if (reminderResult.isReminderCommand && reminderResult.feedbackMessage) {
        const modelMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}_reminder`,
          role: "model",
          text: `⏰ ${reminderResult.feedbackMessage}`,
          timestamp: Date.now() + 1,
          source: "chat",
        };

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== targetThread.id) return t;
            const now = Date.now();
            return {
              ...t,
              title: computedTitle,
              startedAt: isFirstMessage
                ? now
                : t.startedAt || t.messages[0]?.timestamp || now,
              updatedAt: now,
              messages: [...t.messages, userMsg, modelMsg],
            };
          })
        );
        return;
      }

      // Check if user is issuing a device control command (volume or brightness) via chat
      const deviceCmdResult = deviceControlService.parseDeviceControlCommand(cleanText);
      if (deviceCmdResult.isDeviceControl && deviceCmdResult.feedbackMessage) {
        if (deviceCmdResult.type === "volume") {
          const vol = deviceControlService.getState().volume;
          setVolume(vol / 100);
          setIsSpeakerMuted(deviceControlService.getState().isMuted);
          streamerRef.current?.setVolume(vol / 100);
        }
        const modelMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}_device`,
          role: "model",
          text: `${deviceCmdResult.type === "volume" ? "🔊" : "☀️"} ${deviceCmdResult.feedbackMessage}`,
          timestamp: Date.now() + 1,
          source: "chat",
        };

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== targetThread.id) return t;
            const now = Date.now();
            return {
              ...t,
              title: computedTitle,
              startedAt: isFirstMessage
                ? now
                : t.startedAt || t.messages[0]?.timestamp || now,
              updatedAt: now,
              messages: [...t.messages, userMsg, modelMsg],
            };
          })
        );
        return;
      }

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThread.id) return t;
          const now = Date.now();
          return {
            ...t,
            title: computedTitle,
            startedAt: isFirstMessage
              ? now
              : t.startedAt || t.messages[0]?.timestamp || now,
            updatedAt: now,
            messages: [...t.messages, userMsg],
          };
        })
      );

      await runChatCompletion(targetThread.id, historyBeforeTurn, text, attachment);
    },
    [threads, activeThreadId, runChatCompletion]
  );

  const handleRegenerateLast = useCallback(async () => {
    if (isStreamingChat) return;
    const targetThread = threads.find((t) => t.id === activeThreadId);
    if (!targetThread || targetThread.messages.length < 2) return;

    const messages = targetThread.messages;
    const lastMsg = messages[messages.length - 1];
    const prevUserMsg = messages[messages.length - 2];
    if (lastMsg.role !== "model" || prevUserMsg.role !== "user") return;

    const historyBeforeLastTurn = messages.slice(0, -2);

    // Keep up to the user message, remove last model message
    setThreads((prev) =>
      prev.map((t) =>
        t.id === targetThread.id
          ? {
              ...t,
              messages: messages.slice(0, -1),
            }
          : t
      )
    );

    await runChatCompletion(
      targetThread.id,
      historyBeforeLastTurn,
      prevUserMsg.text,
      prevUserMsg.attachment
    );
  }, [isStreamingChat, threads, activeThreadId, runChatCompletion]);

  // Handle Mute & Volume
  const handleToggleSpeakerMute = () => {
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    if (streamerRef.current) {
      streamerRef.current.setMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol === 0) setIsSpeakerMuted(true);
    else setIsSpeakerMuted(false);
    if (streamerRef.current) {
      streamerRef.current.setVolume(newVol);
    }
  };

  const handleToggleMicMute = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    if (streamerRef.current) {
      streamerRef.current.setMicMuted(nextMuted);
    }
  };

  // State Info for Live Voice View
  const getStateInfo = () => {
    switch (sessionState) {
      case "speaking":
        return {
          title: `${config.assistantName} is speaking`,
          dotColor: "bg-rose-400 animate-ping",
          subtext: "24kHz audio stream active",
        };
      case "listening":
        return {
          title: isMicMuted ? "Microphone muted" : "Listening to you",
          dotColor: isMicMuted ? "bg-slate-400" : "bg-emerald-400 animate-pulse",
          subtext: isMicMuted ? "Tap mic button below to unmute" : "Speak naturally, Zoya is listening",
        };
      case "connecting":
        return {
          title: "Synchronizing audio feed",
          dotColor: "bg-amber-400 animate-bounce",
          subtext: "Connecting to Gemini 3.1 Flash Live...",
        };
      case "disconnected":
      default:
        return {
          title: handsFreeWakeEnabled
            ? `Hands-Free Ready · Say "Hey ${config.assistantName}" or "Hey Google"`
            : "Ready for live conversation",
          dotColor: handsFreeWakeEnabled ? "bg-emerald-400 animate-pulse" : "bg-cyan-400",
          subtext: handsFreeWakeEnabled
            ? `Say "Hey ${config.assistantName}" anytime to start automatically (or say "Bye ${config.assistantName}" to stop)`
            : "Tap the orb or Start Voice Link below",
        };
    }
  };

  const stateInfo = getStateInfo();

  if (publishedSiteSlug) {
    return (
      <PublishedSiteStandaloneView
        slug={publishedSiteSlug}
        onExitToZoya={() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("site");
            url.searchParams.delete("domain");
            if (url.pathname.startsWith("/zoya_online")) {
              url.pathname = "/";
            }
            window.history.replaceState({}, "", url.toString());
          } catch {}
          setPublishedSiteSlug(null);
        }}
      />
    );
  }

  return (
    <div
      ref={appRootRef}
      data-zoya-ui={activeUiTheme.id}
      className={`h-[100dvh] w-screen flex flex-col justify-between font-sans relative overflow-hidden select-none transition-colors duration-200 ${activeUiTheme.rootClass}`}
      onClick={() => setShowVolumePopup(false)}
    >
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[25%] -left-[10%] w-[50%] h-[50%] blur-[140px] rounded-full transition-colors duration-300 ${activeUiTheme.glowPrimaryClass}`} />
        <div className={`absolute -bottom-[25%] right-[10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-colors duration-300 ${activeUiTheme.glowSecondaryClass}`} />
      </div>

      {/* 1. TOP BAR CONTRACT (Shown in Chat, Study, & Classic Workspace UI 01) */}
      {!(appMode === "live" && activeUiTheme.layoutMode !== "classic_workspace") && (
      <header className={`w-full h-14 flex items-center justify-between px-3 sm:px-6 z-30 shrink-0 border-b backdrop-blur-md transition-colors duration-200 ${activeUiTheme.headerClass}`}>
        {/* Zone 1: Top-Left Settings Button (Includes Basic Settings, Login & Saved Chats) + Brand Wordmark */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSavedChatsDrawer(true)}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-xl border flex items-center gap-2 text-xs font-medium transition-all ${
              activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200 hover:text-white"
            }`}
            title="Open Settings, Login & Saved Chats"
          >
            <Settings size={16} style={{ color: activeUiTheme.accentHex }} className="shrink-0" />
            <span>Settings</span>
          </button>

          {(config.offlineMode || (!isOnline && typeof navigator !== "undefined")) && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="px-2 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Zoya Offline Mode is active. Click to manage in Settings."
            >
              <WifiOff size={11} className="text-emerald-400 shrink-0" />
              <span>Offline ⚡</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-1">
            <span
              className="text-base cursor-default shrink-0"
              title={`${resolveCharacterPreset(config).name} (${resolveCharacterPreset(config).role})`}
            >
              {resolveCharacterPreset(config).avatarEmoji}
            </span>
            <span
              className={`hidden sm:inline text-lg font-bold tracking-tight whitespace-nowrap ${
                activeUiTheme.isLight ? "text-slate-900" : "text-white"
              }`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {config.assistantName}
            </span>
            <span
              className={`hidden md:inline text-[9.5px] px-2 py-0.5 rounded-full font-medium border truncate ${resolveCharacterPreset(config).badgeClass}`}
            >
              {resolveCharacterPreset(config).role}
            </span>
          </div>
        </div>

        {/* Zone 2: Interactive Mode Switcher (Chat | Study Mode | Live Voice) */}
        <nav
          className={`flex items-center gap-1 p-1 rounded-xl border ${
            activeUiTheme.isLight
              ? "bg-slate-100 border-slate-200"
              : "bg-white/[0.05] border-white/[0.07]"
          }`}
        >
          <button
            type="button"
            onClick={handleSwitchToChat}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              appMode === "chat"
                ? activeUiTheme.activeNavClass
                : activeUiTheme.isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToStudy}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              appMode === "study"
                ? "bg-sky-500 text-slate-950 shadow-xs font-semibold"
                : activeUiTheme.isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <GraduationCap size={15} />
            <span>Study</span>
          </button>

          <button
            type="button"
            onClick={() => setAppMode("live")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              appMode === "live"
                ? `bg-gradient-to-r ${activeUiTheme.accentGradientClass} text-white shadow-xs font-semibold`
                : activeUiTheme.isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Radio size={14} className={sessionState !== "disconnected" ? "animate-pulse" : ""} />
            <span>
              {activeUiTheme.layoutMode === "classic_workspace"
                ? "Live Voice"
                : activeUiTheme.layoutBadge}
            </span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions (5 UI Options / New Chat / Volume / Settings / Studios) */}
        <div className="flex items-center gap-1.5 overflow-x-auto chat-scroll py-0.5 max-w-[60vw] sm:max-w-none shrink-0">
          {/* Quick 5 UI Options Selector */}
          <UiThemeQuickPopover
            activeThemeId={activeUiTheme.id}
            onSelectTheme={handleSelectUiTheme}
            align="right"
          />

          {appMode === "chat" && (
            <button
              type="button"
              onClick={handleNewThread}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors sm:hidden ${
                activeUiTheme.isLight
                  ? "hover:bg-slate-200/70 text-slate-700"
                  : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
              }`}
              title="New chat"
            >
              <Plus size={19} />
            </button>
          )}

          {/* Speaker Volume / Mute */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowVolumePopup(!showVolumePopup)}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors ${
                isSpeakerMuted || volume === 0
                  ? "bg-rose-500/15 text-rose-500"
                  : activeUiTheme.isLight
                  ? "hover:bg-slate-200/70 text-slate-700"
                  : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
              }`}
              title="Audio volume"
            >
              {isSpeakerMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <AnimatePresence>
              {showVolumePopup && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full mt-2 p-3.5 border rounded-2xl shadow-2xl z-50 flex flex-col gap-2.5 min-w-[160px] ${
                    activeUiTheme.isLight
                      ? "bg-white border-slate-300 text-slate-800"
                      : "bg-[#121724] border-white/15 text-slate-200"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-xs font-mono tabular-nums ${
                      activeUiTheme.isLight ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    <span>Volume</span>
                    <span>{Math.round((isSpeakerMuted ? 0 : volume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isSpeakerMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded-full appearance-none cursor-pointer accent-pink-500 ${
                      activeUiTheme.isLight ? "bg-slate-200" : "bg-white/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleToggleSpeakerMute}
                    className={`text-xs text-center py-1.5 rounded-lg transition-colors ${
                      activeUiTheme.isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        : "bg-white/[0.06] hover:bg-white/[0.1] text-slate-200"
                    }`}
                  >
                    {isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hands-Free "Hey Zoya" / "Hey Google" Wake Word Toggle */}
          <button
            type="button"
            onClick={() => setHandsFreeWakeEnabled((prev) => !prev)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors ${
              handsFreeWakeEnabled
                ? activeUiTheme.isLight
                  ? "bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100"
                  : "bg-emerald-500/15 border-emerald-500/45 text-emerald-300 hover:bg-emerald-500/25"
                : activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-400 hover:text-white"
            }`}
            title='Hands-Free Wake Word: Say "Hey Zoya" or "Hey Google" anytime to start Live Voice automatically'
          >
            <span
              className={`w-2 h-2 rounded-full ${
                handsFreeWakeEnabled
                  ? isWakeWordListening || sessionState !== "disconnected"
                    ? "bg-emerald-500 animate-ping"
                    : "bg-emerald-500"
                  : "bg-slate-500"
              }`}
            />
            <span className="hidden md:inline whitespace-nowrap">
              {handsFreeWakeEnabled ? `"Hey ${config.assistantName}" ON` : "Hands-Free OFF"}
            </span>
          </button>

          {/* Set as Default Assistant (Gemini Replacement) */}
          <button
            type="button"
            onClick={() => setShowDefaultAssistantModal(true)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
              config.isDefaultAssistant
                ? activeUiTheme.isLight
                  ? "bg-cyan-50 border-cyan-400 text-cyan-900 hover:bg-cyan-100 shadow-sm"
                  : "bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border-cyan-400/50 text-cyan-200 hover:from-cyan-500/30 hover:to-pink-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                : activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-cyan-300 hover:text-white"
            }`}
            title="Set Zoya as Default Assistant (Replace Google Gemini on phone & gestures)"
          >
            <Zap
              size={14}
              className={`fill-current ${activeUiTheme.isLight ? "text-cyan-600" : "text-cyan-400"}`}
            />
            <span className="hidden sm:inline whitespace-nowrap">Default Assistant</span>
            {config.isDefaultAssistant && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Don't Touch My Phone (Anti-Theft Motion & Intruder Alarm) */}
          <button
            type="button"
            onClick={() => setShowDontTouchMyPhoneModal(true)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
              securityState === "armed"
                ? activeUiTheme.isLight
                  ? "bg-red-100 border-red-400 text-red-900 hover:bg-red-200 shadow-sm animate-pulse"
                  : "bg-red-500/25 border-red-500/60 text-red-200 hover:bg-red-500/35 shadow-[0_0_14px_rgba(239,68,68,0.35)] animate-pulse"
                : securityState === "triggered"
                ? "bg-red-600 border-red-400 text-white animate-bounce shadow-[0_0_18px_rgba(239,68,68,0.6)]"
                : securityState === "arming"
                ? activeUiTheme.isLight
                  ? "bg-amber-100 border-amber-400 text-amber-900"
                  : "bg-amber-500/20 border-amber-500/50 text-amber-200"
                : activeUiTheme.isLight
                ? "bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-red-300 hover:text-white"
            }`}
            title="Don't Touch My Phone: Motion sensor anti-theft alarm & perimeter defense"
          >
            {securityState === "armed" || securityState === "triggered" ? (
              <ShieldAlert size={14} className="text-red-500 animate-pulse" />
            ) : (
              <Shield size={14} className="text-red-500" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">
              {securityState === "armed"
                ? "Phone Armed 🚨"
                : securityState === "triggered"
                ? "INTRUDER ALERT!"
                : securityState === "arming"
                ? "Arming..."
                : "Don't Touch Phone"}
            </span>
            {securityState === "armed" && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          {/* Mood Tracker Graph Button */}
          <button
            type="button"
            onClick={() => setShowMoodTracker(true)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors ${
              angerLevel > 0
                ? activeUiTheme.isLight
                  ? "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25"
                : activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-pink-300 hover:text-white"
            }`}
            title="Open Zoya's Daily Mood & Anger Fluctuation Graph"
          >
            <TrendingUp size={15} className={activeUiTheme.isLight ? "text-rose-600" : ""} />
            <span className="hidden sm:inline whitespace-nowrap">Mood Graph</span>
          </button>

          {/* Movable Website Builder Studio Toggle */}
          <button
            type="button"
            onClick={() => setShowWebsiteBuilder((prev) => !prev)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              showWebsiteBuilder
                ? activeUiTheme.isLight
                  ? "bg-cyan-100 border-cyan-500 text-cyan-900"
                  : "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
                : activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-cyan-300 hover:text-white"
            }`}
            title="Open Zoya's Movable Live Website Builder Studio"
          >
            <Code2 size={15} className={activeUiTheme.isLight ? "text-cyan-600" : ""} />
            <span className="hidden md:inline whitespace-nowrap">Web Builder</span>
          </button>

          {/* Zoya Coding Master Studio Toggle */}
          <button
            type="button"
            onClick={() => setShowCodeStudio((prev) => !prev)}
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
              showCodeStudio
                ? activeUiTheme.isLight
                  ? "bg-indigo-100 border-indigo-400 text-indigo-900"
                  : "bg-purple-500/25 border-purple-400/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                : activeUiTheme.isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-cyan-300 hover:text-white"
            }`}
            title="Zoya Coding Master — Any Code Generator & Universal IDE"
          >
            <Code2 size={15} className={activeUiTheme.isLight ? "text-indigo-600" : "text-cyan-400"} />
            <span className="hidden md:inline whitespace-nowrap">Code Studio</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono hidden lg:inline ${
                activeUiTheme.isLight
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-cyan-500/20 text-cyan-300"
              }`}
            >
              Master
            </span>
          </button>

          {/* Zoya Astrology & Kundali Power Studio Toggle */}
          <button
            type="button"
            onClick={() => setShowAstrologyStudio((prev) => !prev)}
            className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm ${
              showAstrologyStudio
                ? activeUiTheme.isLight
                  ? "bg-amber-100 border-amber-500 text-amber-900"
                  : "bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                : activeUiTheme.isLight
                ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
                : "bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-500/30 text-amber-200 hover:text-white"
            }`}
            title="Open Zoya's Vedic & Western Astrology, Kundali & 36 Gun Milan Studio"
          >
            <Sparkles size={14} className={activeUiTheme.isLight ? "text-amber-600" : "text-amber-400"} />
            <span className="hidden sm:inline whitespace-nowrap">Astro &amp; Kundali</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono hidden lg:inline ${
                activeUiTheme.isLight
                  ? "bg-amber-200/70 text-amber-900"
                  : "bg-amber-400/20 text-amber-300"
              }`}
            >
              वैदिक
            </span>
          </button>

          {/* NoiseFit Smartwatch Health Center Quick Access */}
          <button
            type="button"
            onClick={() => setShowNoiseFitModal(true)}
            className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm ${
              activeUiTheme.isLight
                ? "border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900"
                : "border-rose-500/35 bg-gradient-to-r from-rose-500/15 via-pink-500/15 to-purple-500/15 hover:from-rose-500/25 hover:to-pink-500/25 text-rose-200 hover:text-white"
            }`}
            title="NoiseFit Smartwatch Health Sync & Devid's Vitals"
          >
            <Heart size={14} className="text-rose-500 fill-rose-500/40 animate-pulse shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">NoiseFit Health</span>
          </button>

          {/* Install Official Zoya AI App Button (Full Potential) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={async () => {
                if (isInstallable) {
                  const ok = await installPWA();
                  if (!ok) setShowSettings(true);
                } else {
                  setShowSettings(true);
                }
              }}
              className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all ${
                activeUiTheme.isLight
                  ? "border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900"
                  : "border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:to-pink-500/30 text-cyan-200 hover:text-white shadow-md shadow-cyan-500/15"
              }`}
              title='Install official "Zoya AI" standalone app on your phone (Full Potential)'
            >
              <Sparkles size={14} className={activeUiTheme.isLight ? "text-amber-600 shrink-0" : "text-amber-300 animate-pulse shrink-0"} />
              <span className="hidden sm:inline">Install Zoya App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {/* Devid's Instagram (@devid_jaat13) Link */}
          <a
            href={
              config.userInstagram ||
              "https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3"
            }
            target="_blank"
            rel="noopener noreferrer"
            className={`min-h-[40px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
              activeUiTheme.isLight
                ? "border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-900"
                : "border-pink-500/35 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-amber-500/15 hover:from-pink-500/25 hover:to-amber-500/25 text-pink-200 hover:text-white"
            }`}
            title="Open Devid's Instagram (@devid_jaat13)"
          >
            <Instagram size={15} className="text-pink-500 shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">@devid_jaat13</span>
          </a>

          {/* Top-Right Corner: User Profile Avatar & Google Login Button */}
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className={`relative min-h-[40px] rounded-full border flex items-center gap-2 text-xs font-semibold transition-all shrink-0 ${
              currentUser
                ? activeUiTheme.isLight
                  ? "p-1 pr-2.5 bg-white hover:bg-slate-100 border-emerald-500 text-slate-900 shadow-sm"
                  : "p-1 pr-2.5 bg-white/[0.06] hover:bg-white/[0.12] border-emerald-400/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : activeUiTheme.isLight
                ? "px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 border-rose-500 text-white shadow-sm"
                : "px-3.5 py-1.5 bg-gradient-to-r from-pink-500/25 to-cyan-500/25 hover:from-pink-500/35 hover:to-cyan-500/35 border-pink-400/50 text-white shadow-md"
            }`}
            title={
              currentUser
                ? `Profile: ${currentUser.displayName || currentUser.email} (Click to manage account)`
                : "Sign in with Google to sync your Zoya Profile"
            }
          >
            {currentUser ? (
              <>
                <div className="relative">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "Profile"}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-400/80"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-400/80">
                      {(currentUser.displayName || "U")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#07090E]" />
                </div>
                <span
                  className={`hidden sm:inline max-w-[90px] truncate text-xs font-semibold ${
                    activeUiTheme.isLight ? "text-slate-800" : "text-slate-100"
                  }`}
                >
                  {currentUser.displayName?.split(" ")[0] || "Profile"}
                </span>
              </>
            ) : (
              <>
                <LogIn size={15} className="text-white shrink-0" />
                <span>Login</span>
              </>
            )}
          </button>
        </div>
      </header>
      )}

      {/* Offline Mode Active Sub-Banner */}
      {(config.offlineMode || (!isOnline && typeof navigator !== "undefined")) && (
        <div className="w-full bg-emerald-950/80 border-b border-emerald-500/30 px-3.5 py-1.5 flex items-center justify-between text-xs text-emerald-200 shrink-0 backdrop-blur-md z-25">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold flex items-center gap-1.5 text-white">
              <WifiOff size={13} className="text-emerald-400" />
              <span>Zoya Offline Mode Active (ऑफलाइन मोड सक्रिय)</span>
            </span>
            <span className="hidden sm:inline text-emerald-300/80 text-[11px]">
              • Bina internet ke time, battery, math, shayari aur device voice chat चालू hai
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="text-[11px] font-bold text-cyan-300 hover:text-white underline ml-2 shrink-0 flex items-center gap-1"
          >
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* Action HUD Toast for Web Tool Calls */}
      {activeToolEvent && (
        <div className="w-full flex justify-center z-30 pt-3 px-4 shrink-0 pointer-events-none fixed top-14 left-0 right-0">
          <ActionHUD event={activeToolEvent} onDismiss={() => setActiveToolEvent(null)} />
        </div>
      )}

      {/* Hands-Free Wake Word Activation Banner */}
      <AnimatePresence>
        {wakeActivationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-xl text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{wakeActivationBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Gemini-Style Post-Live Session Saved & New Chat Started Banner */}
      <AnimatePresence>
        {sessionRotatedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0D1322]/95 border border-cyan-400/45 backdrop-blur-2xl text-slate-100 text-xs shadow-2xl flex items-center gap-3 max-w-[94vw]"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-cyan-300">
                Session Saved to History
              </span>{" "}
              <span className="text-slate-300">
                ({sessionRotatedBanner.archivedTitle}) · Started a fresh{" "}
                <strong className="text-white">New Chat</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveThreadId(sessionRotatedBanner.archivedThreadId);
                setAppMode("chat");
                setSessionRotatedBanner(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-200 font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              View Saved
            </button>
            <button
              type="button"
              onClick={() => setSessionRotatedBanner(null)}
              className="text-slate-400 hover:text-white shrink-0"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BODY CONTENT: CHAT VIEW, FLEXI STUDY VIEW, OR LIVE VOICE VIEW */}
      {appMode === "chat" ? (
        <ChatView
          config={config}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          onSendMessage={handleSendMessage}
          onRegenerateLast={handleRegenerateLast}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreamingChat}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onSwitchToLive={handleSwitchToLive}
          volume={volume}
          isSpeakerMuted={isSpeakerMuted}
          onOpenInCodeStudio={(code, lang) => {
            setCodeStudioInitialData({
              code,
              language: lang,
              executeImmediately: true,
            });
            setShowCodeStudio(true);
          }}
        />
      ) : appMode === "study" ? (
        <StudyView
          config={config}
          volume={volume}
          isSpeakerMuted={isSpeakerMuted}
          onRequireApiKey={() => setShowSettings(true)}
        />
      ) : activeUiTheme.layoutMode !== "classic_workspace" ? (
        <div
          ref={liveStageRef}
          className="flex-1 flex flex-col min-h-0 w-full relative z-10 overflow-hidden"
        >
          <ZoyaFullUiStage
            uiTheme={activeUiTheme}
            config={config}
            sessionState={sessionState}
            audioLevel={audioLevel}
            frequencyData={frequencyData}
            isMicMuted={isMicMuted}
            isCameraActive={isCameraActive}
            liveCaption={liveCaption}
            errorMessage={errorMessage}
            angerLevel={angerLevel}
            handsFreeWakeEnabled={handsFreeWakeEnabled}
            securityState={securityState}
            volume={volume}
            isSpeakerMuted={isSpeakerMuted}
            onToggleVoiceSession={toggleVoiceSession}
            onToggleMicMute={handleToggleMicMute}
            onToggleCamera={handleToggleCamera}
            onSelectUiTheme={handleSelectUiTheme}
            onOpenDrawer={() => setShowSavedChatsDrawer(true)}
            onOpenSettings={() => setShowSettings(true)}
            onSwitchToChat={handleSwitchToChat}
            onSwitchToStudy={handleSwitchToStudy}
            onOpenAstrologyStudio={() => setShowAstrologyStudio(true)}
            onToggleAstrologyMode={handleToggleAstrologyMode}
            onOpenCodeStudio={() => setShowCodeStudio(true)}
            onOpenWebsiteBuilder={() => setShowWebsiteBuilder(true)}
            onOpenGameMode={() => setShowLiveGameMode(true)}
            onOpenYouTube={() => setShowLiveYouTubePlayer(true)}
            onOpenNanoIronman={() => setShowLiveNanoIronmanStudio(true)}
            onOpenNoiseFit={() => setShowNoiseFitModal(true)}
            onOpenMoodTracker={() => setShowMoodTracker(true)}
            onOpenDontTouchPhone={() => setShowDontTouchMyPhoneModal(true)}
            onOpenDefaultAssistant={() => setShowDefaultAssistantModal(true)}
            onToggleHandsFreeWake={() => setHandsFreeWakeEnabled((prev) => !prev)}
            onVolumeChange={handleVolumeChange}
            onToggleSpeakerMute={handleToggleSpeakerMute}
            onSelectBodyId={(bodyId: HologramModelType) => {
              setConfig((prev) => {
                const next = { ...prev, zoyaBodyId: bodyId };
                try {
                  localStorage.setItem("zoya_app_config_v2", JSON.stringify(next));
                  localStorage.setItem("zoya_holo_fullbody_id", bodyId);
                  localStorage.setItem("zoya_selected_hologram_model", bodyId);
                } catch {}
                return next;
              });
            }}
            onSwitchCharacterPreset={handleSwitchCharacterPreset}
            onSelectPersonaMode={handleSelectPersonaMode}
            onSendQuickPrompt={(promptText) => {
              if (sessionState !== "disconnected") {
                liveSessionRef.current?.sendRealtimePrompt(promptText);
              } else {
                handleSwitchToChat();
                setTimeout(() => {
                  handleSendMessage(promptText);
                }, 100);
              }
            }}
          />

          {/* Shared Movable Live Overlays for Full UI Stages */}
          <LiveGamePanel
            isOpen={showLiveGameMode}
            onClose={() => setShowLiveGameMode(false)}
            userName={config.userName}
            assistantName={config.assistantName}
            isLiveActive={sessionState !== "disconnected"}
            lastVoiceCommand={lastVoiceGameCmd}
            onTriggerZoyaVoice={(promptText) => {
              liveSessionRef.current?.sendRealtimePrompt(promptText);
            }}
            constraintsRef={liveStageRef}
          />
          <LiveYouTubePlayer
            isOpen={showLiveYouTubePlayer}
            onClose={() => setShowLiveYouTubePlayer(false)}
            userName={config.userName}
            assistantName={config.assistantName}
            isLiveActive={sessionState !== "disconnected"}
            externalSearchOrUrl={liveYouTubeQuery}
            onTriggerZoyaVoice={(promptText) => {
              if (sessionState !== "disconnected") {
                liveSessionRef.current?.sendRealtimePrompt(promptText);
              } else if (liveSessionRef.current) {
                liveSessionRef.current
                  .connect()
                  .then(() => {
                    setTimeout(() => {
                      liveSessionRef.current?.sendRealtimePrompt(promptText);
                    }, 700);
                  })
                  .catch(() => {});
              }
            }}
            constraintsRef={liveStageRef}
          />
          <NanoIronmanStudio
            isOpen={showLiveNanoIronmanStudio}
            onClose={() => setShowLiveNanoIronmanStudio(false)}
            config={config}
            initialPrompt={liveNanoIronmanPrompt}
            isLiveActive={sessionState !== "disconnected"}
            isMovableOverlay
            constraintsRef={liveStageRef}
            onTriggerZoyaVoice={(promptText) => {
              liveSessionRef.current?.sendRealtimePrompt(promptText);
            }}
          />

          <AnimatePresence>
            {isCameraActive && cameraStream && (
              <motion.div
                drag
                dragConstraints={liveStageRef}
                dragMomentum={false}
                dragElastic={0.08}
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ duration: 0.2 }}
                className={`absolute top-16 right-3 sm:right-6 z-40 ${
                  isCameraPreviewExpanded ? "w-72 sm:w-96" : "w-44 sm:w-56"
                } rounded-2xl overflow-hidden bg-[#101522]/95 backdrop-blur-md border border-cyan-400/50 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing touch-none select-none`}
              >
                <div className="px-3 py-1.5 bg-[#0B0F19] border-b border-white/[0.08] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 min-w-0">
                    <Move size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">Camera</span>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                      title="Switch Camera"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCameraPreviewExpanded((prev) => !prev)}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                      title="Resize preview"
                    >
                      {isCameraPreviewExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-medium"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden pointer-events-none">
                  <video
                    ref={cameraPreviewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      cameraFacingMode === "user" ? "scale-x-[-1]" : ""
                    }`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* CLASSIC LIVE VOICE VIEW (UI 01) */
        <div
          ref={liveStageRef}
          className="flex-1 flex flex-col justify-between min-h-0 w-full relative z-10 overflow-hidden"
        >
          {/* Floating Minimal Live Voice Header Bar (Uncluttered, matching clean photo style) */}
          <div className="w-full px-4 pt-2.5 pb-1 flex items-center justify-between shrink-0 z-20">
            {/* 4 AI Characters Pill */}
            <div
              className={`flex items-center gap-1 p-1 rounded-2xl border backdrop-blur-md shadow-lg ${
                activeUiTheme.isLight
                  ? "bg-white/90 border-slate-300"
                  : "bg-[#0F1422]/85 border-white/10"
              }`}
            >
              {CHARACTER_PRESETS.map((preset) => {
                const isActive = resolveCharacterPreset(config).id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSwitchCharacterPreset(preset.id)}
                    className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${activeUiTheme.accentGradientClass} text-white shadow-md scale-105`
                        : activeUiTheme.isLight
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title={`Switch to ${preset.name} (${preset.role})`}
                  >
                    <span>{preset.avatarEmoji}</span>
                    <span className="hidden xs:inline">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Quick 5-UI Switcher, Persona Vibe & Return to Chat */}
            <div className="flex items-center gap-2">
              <UiThemeQuickPopover
                activeThemeId={activeUiTheme.id}
                onSelectTheme={handleSelectUiTheme}
                align="right"
                labelMode="compact"
              />

              <button
                type="button"
                onClick={() => {
                  const modes: PersonaMode[] = ["girlfriend", "normal", "serious", "super_loyal"];
                  const cur = normalizePersonaMode(config.personaVibe);
                  const next = modes[(modes.indexOf(cur) + 1) % modes.length];
                  handleSelectPersonaMode(next);
                }}
                className={`hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-2xl border backdrop-blur-md text-xs font-semibold transition-all shadow ${
                  activeUiTheme.isLight
                    ? "bg-white/90 border-slate-300 text-slate-800 hover:bg-slate-50"
                    : "bg-[#0F1422]/85 border-white/10 text-slate-300 hover:text-white"
                }`}
                title="Tap to change Persona Mode"
              >
                <span className="text-pink-400">💖</span>
                <span>{PERSONA_MODES.find((m) => m.id === normalizePersonaMode(config.personaVibe))?.label}</span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToChat}
                className={`px-3 py-1.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md ${
                  activeUiTheme.isLight
                    ? "bg-white/90 hover:bg-slate-50 border-slate-300 text-slate-800"
                    : "bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200"
                }`}
                title="Switch to Chat Mode"
              >
                <MessageSquare size={14} className="text-cyan-400" />
                <span className="hidden sm:inline">Chat Mode</span>
              </button>
            </div>
          </div>

          <main className="flex-1 w-full flex flex-col items-center justify-start sm:justify-center px-2 min-h-0 relative overflow-y-auto chat-scroll py-1">

            {/* Central Holographic Visualizer */}
            <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center justify-center relative">
              <Visualizer
                state={sessionState}
                audioLevel={audioLevel}
                frequencyData={frequencyData}
                onToggleSession={toggleVoiceSession}
                isMicMuted={isMicMuted}
                angerLevel={angerLevel}
                characterPreset={resolveCharacterPreset(config).id}
                assistantName={config.assistantName}
                zoyaBodyId={config.zoyaBodyId}
                onSelectZoyaBody={(bodyId) => {
                  setConfig((prev) => {
                    const next = { ...prev, zoyaBodyId: bodyId };
                    try {
                      localStorage.setItem("zoya_app_config_v2", JSON.stringify(next));
                      localStorage.setItem("zoya_holo_fullbody_id", bodyId);
                      localStorage.setItem("zoya_selected_hologram_model", bodyId);
                    } catch {}
                    return next;
                  });
                }}
              />
            </div>

            {/* Movable Live Voice Game Arena (Tic-Tac-Toe, Rock-Paper-Scissors, Mind Reader) */}
            <LiveGamePanel
              isOpen={showLiveGameMode}
              onClose={() => setShowLiveGameMode(false)}
              userName={config.userName}
              assistantName={config.assistantName}
              isLiveActive={sessionState !== "disconnected"}
              lastVoiceCommand={lastVoiceGameCmd}
              onTriggerZoyaVoice={(promptText) => {
                liveSessionRef.current?.sendRealtimePrompt(promptText);
              }}
              constraintsRef={liveStageRef}
            />

            {/* Movable Live YouTube Watch-Together & Sing-Along Player */}
            <LiveYouTubePlayer
              isOpen={showLiveYouTubePlayer}
              onClose={() => setShowLiveYouTubePlayer(false)}
              userName={config.userName}
              assistantName={config.assistantName}
              isLiveActive={sessionState !== "disconnected"}
              externalSearchOrUrl={liveYouTubeQuery}
              onTriggerZoyaVoice={(promptText) => {
                if (sessionState !== "disconnected") {
                  liveSessionRef.current?.sendRealtimePrompt(promptText);
                } else if (liveSessionRef.current) {
                  liveSessionRef.current
                    .connect()
                    .then(() => {
                      setTimeout(() => {
                        liveSessionRef.current?.sendRealtimePrompt(promptText);
                      }, 700);
                    })
                    .catch(() => {});
                }
              }}
              constraintsRef={liveStageRef}
            />

            {/* Movable Live Google Nano Ironman AI Art Studio */}
            <NanoIronmanStudio
              isOpen={showLiveNanoIronmanStudio}
              onClose={() => setShowLiveNanoIronmanStudio(false)}
              config={config}
              initialPrompt={liveNanoIronmanPrompt}
              isLiveActive={sessionState !== "disconnected"}
              isMovableOverlay
              constraintsRef={liveStageRef}
              onTriggerZoyaVoice={(promptText) => {
                liveSessionRef.current?.sendRealtimePrompt(promptText);
              }}
            />

            {/* Zoya Visual AI Screen Pointer / Cursor Overlay */}
            <AnimatePresence>
              {screenPointer && (
                <motion.div
                  key={screenPointer.timestamp}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    left: `${screenPointer.xPercent}%`,
                    top: `${screenPointer.yPercent}%`,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="fixed z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2"
                >
                  <div className="relative flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full bg-pink-500/40 animate-ping absolute" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 border-2 border-white shadow-lg flex items-center justify-center text-slate-950">
                      <MousePointerClick size={14} />
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-[#0F1422]/95 border border-pink-500/50 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                    {config.assistantName}: {screenPointer.label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Draggable Live Camera Preview Window */}
            <AnimatePresence>
              {isCameraActive && cameraStream && (
                <motion.div
                  drag
                  dragConstraints={liveStageRef}
                  dragMomentum={false}
                  dragElastic={0.08}
                  whileDrag={{ scale: 1.03 }}
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-20 right-3 sm:right-6 z-30 ${
                    isCameraPreviewExpanded
                      ? "w-72 sm:w-96"
                      : "w-44 sm:w-60"
                  } rounded-2xl overflow-hidden bg-[#101522]/95 backdrop-blur-md border border-pink-500/50 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing touch-none select-none`}
                >
                  <div className="px-3 py-2 bg-[#0B0F19] border-b border-white/[0.08] flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-pink-300 min-w-0">
                      <Move size={12} className="text-slate-400 shrink-0" />
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shrink-0" />
                      <span className="truncate">Drag Camera</span>
                    </div>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={handleFlipCamera}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Switch Front / Back Camera"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCameraPreviewExpanded((prev) => !prev)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title={isCameraPreviewExpanded ? "Smaller preview" : "Expand preview"}
                      >
                        {isCameraPreviewExpanded ? (
                          <Minimize2 size={13} />
                        ) : (
                          <Maximize2 size={13} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors whitespace-nowrap"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden pointer-events-none">
                    <video
                      ref={cameraPreviewVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        cameraFacingMode === "user" ? "scale-x-[-1]" : ""
                      }`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visualizer Live Status Badges: Top Status + [ Warm ] [ Area Temperature ] [ Maya ] */}
            <div className="flex flex-col items-center justify-center mt-2 z-20 max-w-lg w-full px-2">
              {/* TOP BADGE: "Zoya is Ready" / Status Pill */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md shadow-sm ${
                  activeUiTheme.isLight
                    ? "bg-white/90 border-slate-300"
                    : "bg-white/[0.05] border-white/10"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${stateInfo.dotColor}`} />
                <span
                  className={`text-xs font-semibold ${
                    activeUiTheme.isLight ? "text-slate-800" : "text-slate-200"
                  }`}
                >
                  {sessionState === "disconnected"
                    ? `${config.assistantName} is Ready`
                    : sessionState === "listening"
                    ? `${config.assistantName} is Listening`
                    : sessionState === "speaking"
                    ? `${config.assistantName} is Speaking`
                    : "Connecting..."}
                </span>
              </div>

              {/* BADGES ROW: [ Warm ] -> [ Area Temperature ] -> [ Maya ] */}
              <div className="flex items-center gap-1.5 sm:gap-2 justify-center flex-wrap max-w-full px-1 mt-1.5 z-20">
                {/* 1. WARM BADGE */}
                <span
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 shadow-sm backdrop-blur-md shrink-0 ${
                    activeUiTheme.isLight
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-pink-500/15 border-pink-500/30 text-pink-300"
                  }`}
                  title="Warm Intimate Proximity DSP Active"
                >
                  <span>🌸</span>
                  <span className="hidden xs:inline">Warm Proximity DSP</span>
                  <span className="xs:hidden">Warm DSP</span>
                </span>

                {/* 2. AREA TEMPERATURE PILL (Positioned strictly between Warm and Maya) */}
                <AreaTemperaturePill
                  className="shrink-0"
                  onAskZoyaWeather={(weatherSummary) => {
                    if (sessionState !== "disconnected") {
                      liveSessionRef.current?.sendRealtimePrompt(
                        `[WEATHER CONTEXT: ${config.userName} just checked their area temperature: ${weatherSummary}. Talk sweetly about the current weather/temperature in Hinglish, and ask how they're feeling today!]`
                      );
                    }
                  }}
                />

                {/* 3. MAYA BADGE (Active Hologram / Companion Body) */}
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => {
                      const next = { ...prev, zoyaBodyId: "maya" };
                      try {
                        localStorage.setItem("zoya_app_config_v2", JSON.stringify(next));
                        localStorage.setItem("zoya_holo_fullbody_id", "maya");
                        localStorage.setItem("zoya_selected_hologram_model", "maya");
                      } catch {}
                      return next;
                    });
                  }}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 shadow-sm backdrop-blur-md transition-all cursor-pointer shrink-0 ${
                    config.zoyaBodyId === "maya"
                      ? activeUiTheme.isLight
                        ? "bg-sky-50 border-sky-400 text-sky-900"
                        : "bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : activeUiTheme.isLight
                      ? "bg-white/90 hover:bg-sky-50 border-slate-300 text-slate-700"
                      : "bg-white/[0.06] hover:bg-cyan-500/15 border-white/15 text-slate-300"
                  }`}
                  title="Hologram Avatar: Maya (Desi Chic) - Tap to select Maya"
                >
                  <span>👗</span>
                  <span className="font-bold tracking-wide">Maya</span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-full hidden xs:inline ${
                      activeUiTheme.isLight
                        ? "text-sky-800 bg-sky-100"
                        : "text-cyan-300/80 bg-cyan-500/20"
                    }`}
                  >
                    Desi Chic
                  </span>
                </button>

                {/* 4. LIVE ASTROLOGY MODE TOGGLE PILL */}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleAstrologyMode(!config.astrologyModeEnabled, true)
                  }
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 shadow-sm backdrop-blur-md transition-all cursor-pointer shrink-0 ${
                    config.astrologyModeEnabled
                      ? activeUiTheme.isLight
                        ? "bg-amber-100 border-amber-500 text-amber-900"
                        : "bg-gradient-to-r from-amber-500/25 to-purple-500/25 border-amber-400/60 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                      : activeUiTheme.isLight
                      ? "bg-white/90 hover:bg-amber-50 border-slate-300 text-slate-700"
                      : "bg-white/[0.06] hover:bg-amber-500/15 border-white/15 text-slate-300"
                  }`}
                  title="Toggle Live Astrology Mode (Talk live & ask astrology questions anytime)"
                >
                  <span>🔮</span>
                  <span className="font-bold tracking-wide">
                    {config.astrologyModeEnabled ? "Astrology ON" : "Astrology"}
                  </span>
                </button>
              </div>

              {/* Active Live Astrology Mode Quick Strip */}
              {config.astrologyModeEnabled && (
                <div
                  className={`mt-2 px-3 py-2 rounded-2xl border backdrop-blur-md flex flex-col items-center gap-1.5 w-full max-w-md ${
                    activeUiTheme.isLight
                      ? "bg-amber-50/95 border-amber-300 shadow-sm"
                      : "bg-gradient-to-r from-amber-500/15 via-purple-600/15 to-amber-500/10 border-amber-400/35 shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full text-[11px]">
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        activeUiTheme.isLight ? "text-amber-900" : "text-amber-200"
                      }`}
                    >
                      <Sparkles
                        size={12}
                        className={`animate-pulse ${
                          activeUiTheme.isLight ? "text-amber-600" : "text-amber-300"
                        }`}
                      />
                      Live Astrology Mode Active
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAstrologyStudio(true)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${
                          activeUiTheme.isLight
                            ? "bg-amber-200/70 hover:bg-amber-300 border-amber-400 text-amber-950"
                            : "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-100"
                        }`}
                      >
                        Open Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAstrologyMode(false, true)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                          activeUiTheme.isLight
                            ? "bg-white hover:bg-rose-100 border border-slate-300 text-slate-700 hover:text-rose-800"
                            : "bg-white/10 hover:bg-rose-500/25 text-white/75 hover:text-rose-200"
                        }`}
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {[
                      {
                        label: "🌟 Aaj Ka Rashifal",
                        prompt: `Zoya, meri ${
                          config.userRashi
                            ? ZODIAC_SIGNS[config.userRashi].vedicName
                            : "Aries"
                        } rashi ka aaj ka rashifal live sunao!`,
                      },
                      {
                        label: "📅 Shubh Muhurat",
                        prompt: "Zoya, aaj ka Shubh Muhurat, Abhijit time aur Rahu Kaal batao!",
                      },
                      {
                        label: "💖 36 Gun Milan",
                        prompt: "Zoya, aaj love aur compatibility ke 36 Gun Milan ke baare me batao!",
                      },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          if (sessionState !== "disconnected") {
                            liveSessionRef.current?.sendRealtimePrompt(chip.prompt);
                          } else {
                            setShowAstrologyStudio(true);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] transition-colors ${
                          activeUiTheme.isLight
                            ? "bg-white hover:bg-amber-100 border-amber-300 text-amber-950"
                            : "bg-black/35 hover:bg-amber-500/20 border-white/10 hover:border-amber-400/40 text-slate-200"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtext info */}
              <span
                className={`text-[11px] mt-1 ${
                  activeUiTheme.isLight ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {stateInfo.subtext}
              </span>
            </div>

            {/* Real-time Live Voice Transcript & Auto-Save Banner */}
            <AnimatePresence>
              {liveCaption && sessionState !== "disconnected" && (
                <motion.div
                  key={`${liveCaption.role}_${liveCaption.text.slice(0, 20)}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className={`mt-3 px-4 py-2.5 rounded-2xl border max-w-md w-full text-center shadow-lg ${
                    activeUiTheme.isLight
                      ? "bg-white/95 border-slate-300"
                      : "bg-[#111726]/90 border-white/10"
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        liveCaption.role === "user" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span
                      className={
                        liveCaption.role === "user"
                          ? activeUiTheme.isLight
                            ? "text-emerald-700"
                            : "text-emerald-300"
                          : activeUiTheme.isLight
                          ? "text-rose-700"
                          : "text-pink-300"
                      }
                    >
                      {liveCaption.role === "user" ? config.userName : config.assistantName}
                    </span>
                    <span className="text-slate-500">· Auto-saved to Chat & Memory</span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm line-clamp-2 leading-relaxed ${
                      activeUiTheme.isLight ? "text-slate-800" : "text-slate-100"
                    }`}
                  >
                    "{liveCaption.text}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Notification Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-3 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 max-w-sm text-center"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="truncate">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Floating Sleek Live Voice Controls Dock (Sticky so buttons never hide) */}
          <footer
            className="w-full px-4 pb-3 sm:pb-4 pt-1 z-30 shrink-0 sticky bottom-0 flex flex-col items-center"
            style={{
              background: `linear-gradient(to top, ${activeUiTheme.bgHex} 65%, transparent)`,
            }}
          >
            {/* Movable / Collapsible Studio Tools Tray (Opens smoothly on demand) */}
            <AnimatePresence>
              {showStudioTray && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className={`mb-2.5 p-2 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-1.5 overflow-x-auto max-w-xl w-full chat-scroll z-30 ${
                    activeUiTheme.isLight
                      ? "bg-white/95 border-slate-300"
                      : "bg-[#0d121f]/95 border-pink-500/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowLiveGameMode((prev) => !prev);
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800"
                        : "bg-white/5 hover:bg-pink-500/20 border-white/10 text-pink-300"
                    }`}
                  >
                    <Gamepad2 size={14} />
                    <span>Play Games</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLiveYouTubePlayer((prev) => !prev);
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-800"
                        : "bg-white/5 hover:bg-rose-500/20 border-white/10 text-rose-300"
                    }`}
                  >
                    <Youtube size={14} />
                    <span>Watch Together</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fav = loadSavedFavSong();
                      liveSessionRef.current?.sendRealtimePrompt(
                        `[SINGING: Sing "${fav.title}" melodiously for ${config.userName}]`
                      );
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900"
                        : "bg-white/5 hover:bg-amber-500/20 border-white/10 text-amber-300"
                    }`}
                  >
                    <Music2 size={14} />
                    <span>Sing Fav Song</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLiveNanoIronmanStudio((prev) => !prev);
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900"
                        : "bg-white/5 hover:bg-amber-500/20 border-white/10 text-amber-300"
                    }`}
                  >
                    <span>🦾</span>
                    <span>Nano Ironman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWebsiteBuilder((prev) => !prev);
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900"
                        : "bg-white/5 hover:bg-cyan-500/20 border-white/10 text-cyan-300"
                    }`}
                  >
                    <Code2 size={14} />
                    <span>Web Builder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCodeStudio((prev) => !prev);
                      setShowStudioTray(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeUiTheme.isLight
                        ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900"
                        : "bg-white/5 hover:bg-purple-500/20 border-white/10 text-purple-300"
                    }`}
                  >
                    <Code2 size={14} />
                    <span>Code Studio</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clean View Mode Toggle or Floating Dock */}
            {cleanLiveView ? (
              /* Ultra-minimal floating pill for Clean Photo Mode */
              <button
                type="button"
                onClick={() => setCleanLiveView(false)}
                className={`px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 shadow-2xl transition-all cursor-pointer ${
                  activeUiTheme.isLight
                    ? "bg-white/90 hover:bg-white border-slate-300 text-slate-800"
                    : "bg-black/60 hover:bg-black/80 border-white/15 text-slate-300 hover:text-white"
                }`}
                title="Tap to show live call controls"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Show Live Controls</span>
              </button>
            ) : (
              /* Sleek Floating Glass Action Dock */
              <div className={`flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-3xl border backdrop-blur-xl shadow-2xl ${activeUiTheme.dockClass}`}>
                {/* Mic Mute Button */}
                <button
                  type="button"
                  onClick={handleToggleMicMute}
                  disabled={sessionState === "disconnected"}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                    sessionState === "disconnected"
                      ? activeUiTheme.isLight
                        ? "opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                        : "opacity-30 cursor-not-allowed bg-white/5 border-white/5 text-white/40"
                      : isMicMuted
                      ? "bg-rose-500/25 border-rose-500/60 text-rose-400 shadow-md"
                      : "bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-md"
                  }`}
                  title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMicMuted ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {/* Primary Start / End Live Voice Session */}
                <button
                  type="button"
                  onClick={toggleVoiceSession}
                  disabled={sessionState === "connecting"}
                  className={`min-h-[40px] px-4 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${
                    sessionState === "connecting"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : sessionState !== "disconnected"
                      ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30"
                      : `bg-gradient-to-r ${activeUiTheme.accentGradientClass} text-white`
                  }`}
                >
                  {sessionState === "connecting" ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                      <span>Linking...</span>
                    </>
                  ) : sessionState !== "disconnected" ? (
                    <>
                      <Power size={15} />
                      <span>End Call</span>
                    </>
                  ) : (
                    <>
                      <Radio size={15} />
                      <span>Start Live</span>
                    </>
                  )}
                </button>

                {/* Live Camera Button */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                    isCameraActive
                      ? activeUiTheme.isLight
                        ? "bg-rose-100 border-rose-400 text-rose-800 shadow-sm"
                        : "bg-pink-500/25 border-pink-400 text-pink-300 shadow-md"
                      : activeUiTheme.isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  }`}
                  title={isCameraActive ? "Turn off camera" : "Turn on camera"}
                >
                  {isCameraActive ? <VideoOff size={17} /> : <Video size={17} />}
                </button>

                {/* Studio Tools Toggle */}
                <button
                  type="button"
                  onClick={() => setShowStudioTray((prev) => !prev)}
                  className={`px-2.5 sm:px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    showStudioTray
                      ? activeUiTheme.isLight
                        ? "bg-amber-100 border-amber-400 text-amber-900 shadow-sm"
                        : "bg-pink-500/30 border-pink-400 text-pink-200 shadow-md"
                      : activeUiTheme.isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  }`}
                  title="Open Games, YouTube, and Studio Tools"
                >
                  <Zap size={14} className={activeUiTheme.isLight ? "text-amber-600" : "text-amber-400"} />
                  <span className="hidden xs:inline">Tools</span>
                </button>

                {/* Quick Return to Chat Mode */}
                <button
                  type="button"
                  onClick={handleSwitchToChat}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                    activeUiTheme.isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  }`}
                  title="Switch to Chat Mode"
                >
                  <MessageSquare size={17} />
                </button>

                {/* Clean Photo Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setCleanLiveView(true)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                    activeUiTheme.isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-cyan-300"
                  }`}
                  title="Photo Mode: Hide buttons just like reference photo"
                >
                  <span className="text-xs">👁️</span>
                </button>
              </div>
            )}
          </footer>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
          handsFreeWakeEnabled={handsFreeWakeEnabled}
          onToggleHandsFreeWake={() => setHandsFreeWakeEnabled((prev) => !prev)}
          onLaunchVoiceAssistant={() => {
            if (sessionState === "disconnected") {
              toggleVoiceSession();
            }
          }}
        />
      )}

      {/* Default Assistant Phone Setup Modal (Gemini Replacement) */}
      {showDefaultAssistantModal && (
        <DefaultAssistantModal
          isOpen={showDefaultAssistantModal}
          onClose={() => setShowDefaultAssistantModal(false)}
          config={config}
          onUpdateConfig={handleSaveConfig}
          handsFreeWakeEnabled={handsFreeWakeEnabled}
          onToggleHandsFreeWake={() => setHandsFreeWakeEnabled((prev) => !prev)}
          onLaunchVoiceAssistant={() => {
            if (sessionState === "disconnected") {
              toggleVoiceSession();
            }
          }}
        />
      )}

      {/* Google Login & Cloud Account Modal */}
      <AuthAccountModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        isSyncingCloud={isSyncingCloud}
        memoriesCount={savedMemories.length}
        assistantName={config.assistantName}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onManualCloudSync={() => handleManualCloudSync(currentUser)}
      />

      {/* Top-Left Settings, Login, Saved Chats & Auto-Memory Drawer */}
      <SavedChatsDrawer
        isOpen={showSavedChatsDrawer}
        onClose={() => setShowSavedChatsDrawer(false)}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={(id) => {
          setActiveThreadId(id);
          setAppMode("chat");
        }}
        onNewThread={() => {
          handleNewThread();
          setAppMode("chat");
        }}
        onDeleteThread={handleDeleteThread}
        onClearAllThreads={handleClearAllThreads}
        memories={savedMemories}
        assistantName={config.assistantName}
        config={config}
        onUpdateConfig={handleSaveConfig}
        onOpenFullSettings={() => setShowSettings(true)}
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        isSyncingCloud={isSyncingCloud}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onManualCloudSync={() => handleManualCloudSync(currentUser)}
        handsFreeWakeEnabled={handsFreeWakeEnabled}
        onToggleHandsFreeWake={() => setHandsFreeWakeEnabled((prev) => !prev)}
        volume={volume}
        isSpeakerMuted={isSpeakerMuted}
        onVolumeChange={handleVolumeChange}
        onToggleSpeakerMute={handleToggleSpeakerMute}
        hasError={Boolean(errorMessage)}
        onClearError={() => setErrorMessage(null)}
      />

      {/* Permission Modal */}
      {showPermissionModal && (
        <PermissionModal
          assistantName={config.assistantName}
          onClose={() => setShowPermissionModal(false)}
        />
      )}

      {/* Recharts Daily Mood & Anger Level Fluctuation Tracker */}
      <MoodTrackerChart
        isOpen={showMoodTracker}
        onClose={() => setShowMoodTracker(false)}
        assistantName={config.assistantName}
        userName={config.userName}
        currentAngerLevel={angerLevel}
        personaModeLabel={
          PERSONA_MODES.find((p) => p.id === normalizePersonaMode(config.personaVibe))?.label ||
          "Girlfriend Mode"
        }
        onSelectAngerLevel={(lvl) => {
          updateAngerState(lvl, null);
          if (sessionState !== "disconnected") {
            if (lvl === 0) {
              liveSessionRef.current?.sendRealtimePrompt(
                `[${config.userName} just coaxed you in the Mood Tracker! Your anger is now 0! React warmly in cute Hinglish ("Acha theek hai, maan gayi main!")]`
              );
            } else {
              liveSessionRef.current?.sendRealtimePrompt(
                `[Your Gussa Level is now ${lvl}/3! Show cute Hinglish Gussa attitude ("Hmph! Main abhi Gussa Level ${lvl} pe hu, pyar se manao mujhe!")]`
              );
            }
          }
        }}
      />

      {/* Movable Live Website Builder Studio (Works in Chat, Study, and Live Voice) */}
      <WebsiteBuilderStudio
        isOpen={showWebsiteBuilder}
        onClose={() => setShowWebsiteBuilder(false)}
        config={config}
        externalBuildRequest={websiteBuildRequest}
        externalPublishRequest={websitePublishRequest}
        isLiveActive={sessionState !== "disconnected"}
        onTriggerZoyaVoice={(promptText) => {
          liveSessionRef.current?.sendRealtimePrompt(promptText);
        }}
        constraintsRef={appRootRef}
      />

      {/* Zoya Coding Master Studio (Any Code Generator & Universal IDE Playground) */}
      <CodeStudio
        isOpen={showCodeStudio}
        onClose={() => setShowCodeStudio(false)}
        config={config}
        initialCode={codeStudioInitialData?.code}
        initialLanguage={codeStudioInitialData?.language}
        initialPrompt={codeStudioInitialData?.prompt}
        initialTitle={codeStudioInitialData?.title}
        executeImmediately={codeStudioInitialData?.executeImmediately}
      />

      {/* Don't Touch My Phone Fullscreen Police Strobe Alarm Overlay */}
      <DontTouchMyPhoneAlarmOverlay
        onOpenGallery={() => setShowDontTouchMyPhoneModal(true)}
      />

      {/* Don't Touch My Phone Security Center & Intruder Gallery Modal */}
      {showDontTouchMyPhoneModal && (
        <DontTouchMyPhoneModal
          isOpen={showDontTouchMyPhoneModal}
          onClose={() => setShowDontTouchMyPhoneModal(false)}
          assistantName={config.assistantName}
          userName={config.userName}
        />
      )}

      {/* NoiseFit Smartwatch Health Center & Permission Hub Modal */}
      {showNoiseFitModal && (
        <NoiseFitModal
          isOpen={showNoiseFitModal}
          onClose={() => setShowNoiseFitModal(false)}
          assistantName={config.assistantName}
          userName={config.userName}
          onTriggerZoyaVoice={(promptText) => {
            if (sessionState !== "disconnected") {
              liveSessionRef.current?.sendRealtimePrompt(promptText);
            } else if (liveSessionRef.current) {
              liveSessionRef.current
                .connect()
                .then(() => {
                  setTimeout(() => {
                    liveSessionRef.current?.sendRealtimePrompt(promptText);
                  }, 800);
                })
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Zoya Astrology & Kundali Power Studio */}
      <AstrologyStudio
        isOpen={showAstrologyStudio}
        onClose={() => setShowAstrologyStudio(false)}
        config={config}
        initialSign={astrologyStudioData?.sign || config.userRashi || "aries"}
        initialTab={astrologyStudioData?.tab}
        onUpdateConfig={handleSaveConfig}
        onUpdateUserRashi={(rashi: ZodiacSignKey) => {
          setWakeActivationBanner(
            `🌟 Saved "${ZODIAC_SIGNS[rashi].vedicName}" as your default Rashi!`
          );
          setTimeout(() => setWakeActivationBanner(null), 3200);
        }}
        onSendToVoice={(promptText) => {
          if (sessionState !== "disconnected") {
            liveSessionRef.current?.sendRealtimePrompt(promptText);
          } else if (liveSessionRef.current) {
            liveSessionRef.current
              .connect()
              .then(() => {
                setTimeout(() => {
                  liveSessionRef.current?.sendRealtimePrompt(promptText);
                }, 800);
              })
              .catch(() => {});
          }
        }}
      />

      {/* Smart Reminder Active Ringing Alert Modal */}
      <ReminderAlertModal
        reminder={activeTriggeredReminder}
        onDismiss={() => setActiveTriggeredReminder(null)}
        onComplete={(id) => {
          reminderService.toggleComplete(id);
          setActiveTriggeredReminder(null);
        }}
        onSnooze={(id) => {
          reminderService.snoozeReminder(id, 5);
          setActiveTriggeredReminder(null);
        }}
        assistantName={config.assistantName}
        userName={config.userName}
      />

      {/* Movable Floating Advance Settings Button (स्क्रीन पर मूवेबल बटन) */}
      <MovableAdvanceSettingsButton
        config={config}
        onUpdateConfig={handleSaveConfig}
        constraintsRef={appRootRef}
        onOpenAstrology={() => setShowAstrologyStudio(true)}
      />

      {/* Collapsible Developer Console (Active when Developer Care Mode + Developer Console are ON) */}
      <DeveloperConsole
        config={config}
        onUpdateConfig={(partial) =>
          handleSaveConfig({
            ...configRef.current,
            ...partial,
          })
        }
        constraintsRef={appRootRef}
      />

      {/* Floating Device Control HUD (Volume & Brightness Popup) */}
      <DeviceControlHUD />

      {/* Owner Voice Strike 2 Lockdown & Owner Return Briefing Overlay */}
      <OwnerLockdownOverlay
        securityState={ownerSecurityState}
        incidents={ownerIncidents}
        ownerName={config.userName || "Devid"}
        assistantName={config.assistantName || "Zoya"}
        briefingReport={ownerBriefingReport}
        onDismissBriefing={() => {
          ownerVoiceService.markIncidentsReported();
          setOwnerBriefingReport(null);
        }}
        onSpeakBriefing={(txt) => {
          if (sessionState !== "disconnected") {
            liveSessionRef.current?.sendRealtimePrompt(
              `[Read this security report aloud warmly to ${config.userName}: "${txt}"]`
            );
          } else {
            ownerVoiceService.speakAlertText(txt);
          }
        }}
      />
    </div>
  );
}
