import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  ImagePlus,
  Mic,
  MicOff,
  ArrowUp,
  Square,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Loader2,
  Radio,
  X,
  Flame,
  Clock,
  Sparkles,
  Download,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AppConfig,
  ChatAttachment,
  ChatMessage,
  ChatThread,
  GeneratedNanoIronmanImage,
  ToolCallEvent,
  resolveUiTheme,
} from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import { synthesizeZoyaSpeech } from "../services/chatService";
import { playPCM, stopPCM } from "../utils/audioUtils";
import NanoIronmanStudio from "./NanoIronmanStudio";
import { useVoiceDictation } from "../hooks/useVoiceDictation";

interface ChatViewProps {
  config: AppConfig;
  threads: ChatThread[];
  activeThreadId: string;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onSendMessage: (
    text: string,
    attachment?: ChatAttachment,
    generatedImage?: GeneratedNanoIronmanImage
  ) => void;
  onRegenerateLast: () => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onSwitchToLive: () => void;
  volume: number;
  isSpeakerMuted: boolean;
  onOpenInCodeStudio?: (code: string, language: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    kicker: "Witty Reality Check",
    title: "Roast my procrastination habits",
    prompt:
      "Give me a witty, slightly sassy reality check on procrastination and 3 actually smart ways to fix my focus today.",
  },
  {
    kicker: "Charismatic Writing",
    title: "Draft a bold, playful text reply",
    prompt:
      "Help me write a confident, playful, slightly teasing reply to someone who took 3 days to text me back.",
  },
  {
    kicker: "Smart Breakdown",
    title: "Explain quantum computing simply",
    prompt:
      "Explain how quantum computing works like we're talking over coffee—keep it sharp, fun, and zero boring textbook jargon.",
  },
  {
    kicker: "🍌 Google Nano Banana",
    title: "Generate AI Art & Photos",
    prompt:
      "Zoya, Google Nano Banana se ek stunning cybernetic lion in glowing neon cyberpunk lighting generate karo.",
  },
  {
    kicker: "Web & Media Action",
    title: "Play late-night lo-fi beats on YouTube",
    prompt: "Open YouTube and play late night lo-fi hip hop beats for coding.",
  },
];

export default function ChatView({
  config,
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onSendMessage,
  onRegenerateLast,
  onStopStreaming,
  isStreaming,
  sidebarOpen,
  onCloseSidebar,
  onSwitchToLive,
  volume,
  isSpeakerMuted,
  onOpenInCodeStudio,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNanoIronmanStudio, setShowNanoIronmanStudio] = useState<boolean>(false);
  const [nanoIronmanInitialPrompt, setNanoIronmanInitialPrompt] = useState<string>("");
  const [nanoIronmanInitialImage, setNanoIronmanInitialImage] = useState<string | undefined>(undefined);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Robust Voice-to-Text Dictation Hook
  const dictation = useVoiceDictation({
    onTranscriptUpdate: (fullText) => {
      setInputText(fullText);
    },
    defaultLanguage: "hi-IN",
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread?.messages || [];
  const uiTheme = resolveUiTheme(config.uiTheme);
  const isLight = uiTheme.isLight;

  const formatThreadStartedTime = (thread?: ChatThread) => {
    if (!thread) return "";
    try {
      const startTs =
        thread.startedAt ||
        thread.messages[0]?.timestamp ||
        thread.updatedAt;
      const d = new Date(startTs);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return "";
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.text]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputText]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopPCM();
    };
  }, []);

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

  const handleToggleDictation = () => {
    dictation.toggleDictation(inputText);
  };

  const handleDictationSend = () => {
    if (dictation.isDictating) {
      dictation.stopDictation();
    }
    const textToSend = inputText.trim();
    if (!textToSend && !attachment) return;

    onSendMessage(textToSend, attachment);
    setInputText("");
    setAttachment(undefined);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) {
      onStopStreaming();
      return;
    }
    if (!inputText.trim() && !attachment) return;

    if (dictation.isDictating) {
      dictation.stopDictation();
    }

    onSendMessage(inputText, attachment);
    setInputText("");
    setAttachment(undefined);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakMessage = async (msg: ChatMessage) => {
    if (playingMsgId === msg.id) {
      stopPCM();
      setPlayingMsgId(null);
      return;
    }

    stopPCM();
    setLoadingTtsId(msg.id);
    const audioBase64 = await synthesizeZoyaSpeech(msg.text, config);
    setLoadingTtsId(null);

    if (audioBase64) {
      setPlayingMsgId(msg.id);
      await playPCM(audioBase64, isSpeakerMuted ? 0 : volume, () => {
        setPlayingMsgId((prev) => (prev === msg.id ? null : prev));
      });
    }
  };

  return (
    <div className="flex-1 flex min-h-0 w-full relative overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCloseSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Collapsible Gemini-style Conversation Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-0 lg:w-0"
        } fixed lg:static inset-y-0 left-0 z-40 border-r transition-all duration-200 ease-out flex flex-col shrink-0 overflow-hidden ${uiTheme.sidebarClass}`}
      >
        <div className="w-72 flex flex-col h-full p-3.5">
          {/* New Chat CTA */}
          <button
            type="button"
            onClick={() => {
              onNewThread();
              if (window.innerWidth < 1024) onCloseSidebar();
            }}
            className={`w-full min-h-[44px] px-4 py-2.5 rounded-2xl active:scale-[0.99] border text-sm font-medium flex items-center gap-3 transition-all whitespace-nowrap ${
              isLight
                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs"
                : "bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-white"
            }`}
          >
            <Plus size={18} style={{ color: uiTheme.accentHex }} className="shrink-0" />
            <span>New chat</span>
          </button>

          {/* Recent Threads List */}
          <div className={`mt-5 mb-2 px-2 text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Recent conversations
          </div>

          <div className="flex-1 overflow-y-auto chat-scroll space-y-1 pr-1">
            {threads.map((thread) => {
              const isActive = thread.id === activeThread?.id;
              return (
                <div
                  key={thread.id}
                  className={`group flex items-center justify-between rounded-xl px-3 min-h-[42px] text-sm transition-colors cursor-pointer ${
                    isActive
                      ? isLight
                        ? "bg-white text-slate-950 font-medium shadow-xs border border-slate-200"
                        : "bg-white/[0.09] text-white font-medium"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                  onClick={() => {
                    onSelectThread(thread.id);
                    if (window.innerWidth < 1024) onCloseSidebar();
                  }}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1 py-1.5">
                    <MessageSquare
                      size={15}
                      style={isActive ? { color: uiTheme.accentHex } : undefined}
                      className={`mt-0.5 shrink-0 ${isActive ? "" : "text-slate-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{thread.title || "New conversation"}</div>
                      <div
                        className={`flex items-center gap-1 text-[10px] mt-0.5 ${
                          isLight ? "text-slate-500" : "text-cyan-300/80"
                        }`}
                      >
                        <Clock size={9} className="shrink-0" />
                        <span className="truncate">Started: {formatThreadStartedTime(thread)}</span>
                      </div>
                    </div>
                  </div>
                  {threads.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                      className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg transition-opacity ${
                        isLight
                          ? "hover:bg-slate-200 text-slate-500 hover:text-rose-600"
                          : "hover:bg-white/10 text-slate-400 hover:text-rose-400"
                      }`}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Switch to Live Voice Card */}
          <div className={`pt-3 mt-2 border-t ${isLight ? "border-slate-200" : "border-white/[0.06]"}`}>
            <button
              type="button"
              onClick={() => {
                onSwitchToLive();
                if (window.innerWidth < 1024) onCloseSidebar();
              }}
              className={`w-full min-h-[44px] px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
                isLight
                  ? "bg-white hover:bg-slate-50 border-rose-300 text-rose-700 shadow-xs"
                  : `bg-gradient-to-r ${uiTheme.accentGradientClass} bg-opacity-15 border-white/15 text-white hover:opacity-95 shadow-sm`
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Radio size={15} className="shrink-0" />
                Switch to Gemini Live Voice
              </span>
              <span className="text-[11px] opacity-80">24kHz</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Scrollable Message Stream */}
        <div className="flex-1 overflow-y-auto chat-scroll px-4 sm:px-6">
          <div className="max-w-3xl mx-auto w-full py-6 sm:py-10">
            {messages.length === 0 ? (
              /* Google Gemini-Inspired Welcome State */
              <div className="min-h-[58vh] flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-8"
                >
                  <h2
                    className={`text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r ${uiTheme.accentGradientClass} bg-clip-text text-transparent pb-1`}
                    style={{ fontFamily: "var(--font-display)", textWrap: "balance" }}
                  >
                    Hello, {config.userName}
                  </h2>
                  <p
                    className={`text-xl sm:text-2xl font-medium mt-1 ${
                      isLight ? "text-slate-600" : "text-slate-400"
                    }`}
                    style={{ textWrap: "balance" }}
                  >
                    What are we getting into today?
                  </p>
                </motion.div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROMPT_SUGGESTIONS.map((item, idx) => (
                    <motion.button
                      key={idx}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      onClick={() => onSendMessage(item.prompt)}
                      className={`text-left p-4 ${uiTheme.radiusClass} border transition-all flex flex-col justify-between min-h-[108px] group ${uiTheme.surfaceClass} ${uiTheme.cardHoverClass}`}
                    >
                      <div className={`text-xs mb-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {item.kicker}
                      </div>
                      <div
                        className={`text-sm font-medium leading-snug ${
                          isLight
                            ? "text-slate-900 group-hover:text-slate-950"
                            : "text-slate-100 group-hover:text-white"
                        }`}
                      >
                        {item.title}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Conversation Messages */
              <div className="space-y-7 pb-4">
                <div className="flex justify-center">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-600 shadow-xs"
                        : "bg-white/[0.04] border-white/10 text-slate-400"
                    }`}
                  >
                    <Clock size={11} style={{ color: uiTheme.secondaryAccentHex }} />
                    <span>
                      Chatting Started:{" "}
                      <strong className={`font-medium ${isLight ? "text-slate-900" : "text-cyan-300"}`}>
                        {formatThreadStartedTime(activeThread)}
                      </strong>
                    </span>
                  </div>
                </div>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  const isLastModel = !isUser && idx === messages.length - 1;

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex flex-col items-end gap-1.5">
                        {msg.source === "live_voice" && (
                          <div className="flex items-center gap-1 text-[11px] text-pink-400/90 font-medium px-1">
                            <Mic size={11} />
                            <span>Live Voice</span>
                          </div>
                        )}
                        {msg.attachment && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 max-w-xs bg-[#131824]">
                            <img
                              src={msg.attachment.previewUrl}
                              alt={msg.attachment.name || "Uploaded attachment"}
                              referrerPolicy="no-referrer"
                              className="max-h-56 w-auto object-cover"
                            />
                          </div>
                        )}
                        {msg.text && (
                          <div
                            className={`${uiTheme.userBubbleClass} rounded-3xl rounded-tr-md px-5 py-3.5 max-w-[88%] sm:max-w-[75%] text-[15px] leading-relaxed break-words`}
                          >
                            {msg.text}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="flex items-start gap-3.5 sm:gap-4"
                    >
                      {/* Zoya Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-tr ${uiTheme.accentGradientClass} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
                      >
                        <Flame size={15} className="text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Clean Unboxed Metadata */}
                        <div className={`flex items-center gap-2 text-xs mb-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                          <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                            {config.assistantName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{config.personaVibe.replace("_", " ")}</span>
                          {msg.source === "live_voice" && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-pink-500 font-medium flex items-center gap-1">
                                <Mic size={11} />
                                Live Voice
                              </span>
                            </>
                          )}
                        </div>

                        {/* Tool Action Card if Zoya executed a web action */}
                        {msg.toolEvent && (
                          <div className="mb-3 p-3 rounded-2xl bg-[#121826] border border-cyan-500/30 flex items-center justify-between gap-3 max-w-md">
                            <div className="min-w-0">
                              <div className="text-xs text-cyan-400 font-medium">Web Action Executed</div>
                              <div className="text-sm text-white font-medium truncate">
                                {msg.toolEvent.title}
                              </div>
                            </div>
                            {msg.toolEvent.url && (
                              <a
                                href={msg.toolEvent.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                              >
                                <span>Open</span>
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Google Nano Ironman Generated Image Card */}
                        {msg.generatedImage && (
                          <div className="mb-3 rounded-2xl overflow-hidden border border-red-500/40 bg-[#0F1420] max-w-md shadow-xl">
                            <div className="relative group overflow-hidden bg-black/60 flex items-center justify-center">
                              <img
                                src={msg.generatedImage.imageUrl}
                                alt={msg.generatedImage.prompt}
                                className="w-full h-auto max-h-80 object-contain"
                              />
                            </div>
                            <div className="p-3 bg-[#131929] border-t border-white/10 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-amber-300 text-[10px] font-bold">
                                  🦾 Nano Ironman
                                </span>
                                <p className="text-xs text-slate-300 truncate mt-1">
                                  {msg.generatedImage.prompt}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={msg.generatedImage.imageUrl}
                                  download={`zoya-nano-ironman-${Date.now()}.png`}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
                                  title="Download image"
                                >
                                  <Download size={13} />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNanoIronmanInitialImage(msg.generatedImage?.imageUrl);
                                    setNanoIronmanInitialPrompt(
                                      `Enhance or edit: ${msg.generatedImage?.prompt}`
                                    );
                                    setShowNanoIronmanStudio(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Edit with Nano Ironman"
                                >
                                  <Wand2 size={12} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message Body */}
                        {msg.text ? (
                          <MarkdownRenderer
                            content={msg.text}
                            onOpenInCodeStudio={onOpenInCodeStudio}
                            isLight={isLight}
                          />
                        ) : msg.isStreaming ? (
                          <div className={`flex items-center gap-2 py-2 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                            <span>{config.assistantName} is thinking...</span>
                          </div>
                        ) : null}

                        {/* Gemini-style Message Footer Actions */}
                        {!msg.isStreaming && msg.text && (
                          <div className="flex items-center gap-1 mt-2.5 -ml-1.5">
                            {/* Listen / Read Aloud */}
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(msg)}
                              disabled={loadingTtsId === msg.id}
                              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                                playingMsgId === msg.id
                                  ? "bg-pink-500/20 text-pink-500"
                                  : isLight
                                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                              }`}
                              title={playingMsgId === msg.id ? "Stop reading" : "Listen in Zoya's voice"}
                            >
                              {loadingTtsId === msg.id ? (
                                <Loader2 size={14} className="animate-spin text-pink-400" />
                              ) : playingMsgId === msg.id ? (
                                <Square size={13} className="fill-current" />
                              ) : (
                                <Volume2 size={14} />
                              )}
                              <span>{playingMsgId === msg.id ? "Stop" : "Listen"}</span>
                            </button>

                            {/* Copy */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg)}
                              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                                isLight
                                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                              }`}
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check size={14} className="text-emerald-500" />
                              ) : (
                                <Copy size={14} />
                              )}
                              <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                            </button>

                            {/* Regenerate (on last model message) */}
                            {isLastModel && (
                              <button
                                type="button"
                                onClick={onRegenerateLast}
                                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                                  isLight
                                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                                }`}
                                title="Regenerate response"
                              >
                                <RotateCcw size={14} />
                                <span>Redo</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Google Gemini Omnibox Composer */}
        <div
          className="w-full px-4 sm:px-6 pb-4 pt-2 shrink-0"
          style={{
            background: `linear-gradient(to top, ${uiTheme.bgHex} 60%, transparent)`,
          }}
        >
          <div className="max-w-3xl mx-auto w-full">
            {/* Speech Recognition Error Alert Banner */}
            <AnimatePresence>
              {dictation.errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="mb-2 px-3.5 py-2 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between shadow-xl backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
                    <span>{dictation.errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={dictation.clearError}
                    className="text-rose-300 hover:text-white p-1 rounded-md transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Dictation Active Floating Status Bar */}
            <AnimatePresence>
              {dictation.isDictating && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-slate-900/95 via-rose-950/60 to-slate-900/95 border border-rose-500/40 backdrop-blur-xl shadow-2xl flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      {/* Animated Pulse Recording Dot */}
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                      </span>
                      <span className="text-xs font-semibold text-rose-200">
                        {dictation.language === "hi-IN"
                          ? "बोलिए, जोया सुन रही है..."
                          : "Listening... Speak your message"}
                      </span>

                      {/* Equalizer Soundwave Animation */}
                      <div className="flex items-end gap-0.5 h-4 ml-1">
                        <span className="w-1 bg-rose-400 rounded-full animate-pulse" style={{ height: "60%", animationDuration: "0.5s" }} />
                        <span className="w-1 bg-pink-400 rounded-full animate-pulse" style={{ height: "100%", animationDuration: "0.35s" }} />
                        <span className="w-1 bg-rose-300 rounded-full animate-pulse" style={{ height: "40%", animationDuration: "0.6s" }} />
                        <span className="w-1 bg-pink-500 rounded-full animate-pulse" style={{ height: "85%", animationDuration: "0.45s" }} />
                        <span className="w-1 bg-rose-400 rounded-full animate-pulse" style={{ height: "55%", animationDuration: "0.55s" }} />
                      </div>
                    </div>

                    {/* Controls: Language toggle, Clear, Done, Direct Send */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* Language Switcher Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextLang = dictation.language === "hi-IN" ? "en-IN" : "hi-IN";
                          dictation.setLanguage(nextLang);
                          dictation.stopDictation();
                          setTimeout(() => dictation.startDictation(inputText), 120);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-slate-200 flex items-center gap-1 transition-colors"
                        title="Switch dictation language between Hindi and English"
                      >
                        <span>{dictation.language === "hi-IN" ? "🇮🇳 हिन्दी" : "🇬🇧 English"}</span>
                      </button>

                      {/* Clear Current Dictation */}
                      {inputText && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputText("");
                            dictation.stopDictation();
                            setTimeout(() => dictation.startDictation(""), 80);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/10 transition-colors"
                          title="Clear transcribed text"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* Done / Stop Dictation (keeps draft in input) */}
                      <button
                        type="button"
                        onClick={dictation.stopDictation}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors"
                        title="Done speaking (keep draft)"
                      >
                        Done
                      </button>

                      {/* Direct Send */}
                      <button
                        type="button"
                        onClick={handleDictationSend}
                        disabled={!inputText.trim()}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-md transition-all active:scale-95"
                        title="Send message to Zoya now"
                      >
                        <span>Send</span>
                        <ArrowUp size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Real-time Interim Live Preview Snippet */}
                  {dictation.interimTranscript && (
                    <div className="text-xs text-pink-200/90 italic px-2.5 py-1.5 rounded-xl bg-black/40 border border-pink-500/20 truncate animate-pulse">
                      "{dictation.interimTranscript}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={handleSubmit}
              className={`border ${uiTheme.radiusClass} p-2 sm:p-2.5 shadow-2xl transition-all ${
                dictation.isDictating
                  ? "border-rose-500/60 ring-2 ring-rose-500/20"
                  : ""
              } ${uiTheme.inputWrapperClass}`}
            >
              {/* Staged Image Attachment Preview */}
              {attachment && (
                <div className="px-2 pt-1 pb-2.5 flex items-center gap-3">
                  <div className="relative group rounded-xl overflow-hidden border border-white/15 w-16 h-16 bg-black/40 shrink-0">
                    <img
                      src={attachment.previewUrl}
                      alt="Staged upload"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachment(undefined)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {attachment.name || "Image attached"}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-1.5 sm:gap-2">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    isLight
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  title="Upload image to chat"
                >
                  <ImagePlus size={20} />
                </button>

                {/* Google Nano Ironman AI Art Generator Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNanoIronmanInitialImage(undefined);
                    setNanoIronmanInitialPrompt(inputText.trim());
                    setShowNanoIronmanStudio(true);
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full text-amber-500 hover:text-amber-400 hover:bg-amber-400/10 flex items-center justify-center transition-colors shrink-0 text-base"
                  title="Google Nano Ironman AI Image Studio"
                >
                  🦾
                </button>

                {/* Auto-expanding Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    dictation.isDictating
                      ? dictation.language === "hi-IN"
                        ? "सुन रही हूँ... बोलिए (Listening, speak now)..."
                        : "Listening... Speak your message..."
                      : `Ask ${config.assistantName} anything... (बोलकर टाइप करने के लिए माइक दबाएँ)`
                  }
                  className={`flex-1 bg-transparent text-[15px] leading-relaxed py-2.5 px-1 focus:outline-none resize-none max-h-40 chat-scroll ${
                    isLight
                      ? "text-slate-900 placeholder:text-slate-400"
                      : "text-white placeholder:text-slate-500"
                  }`}
                />

                {/* Right Controls: Dictate Mic + Send OR Gemini Live Button */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Voice-to-Text Dictation Microphone Button */}
                  <button
                    type="button"
                    onClick={handleToggleDictation}
                    className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all relative ${
                      dictation.isDictating
                        ? "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.65)] scale-105 active:scale-95"
                        : isLight
                        ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.06] active:scale-95"
                    }`}
                    title={
                      dictation.isDictating
                        ? "Stop voice dictation (सुनना बंद करें)"
                        : "Dictate message with voice (बोलकर टाइप करें)"
                    }
                  >
                    {dictation.isDictating && (
                      <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping pointer-events-none" />
                    )}
                    {dictation.isDictating ? <MicOff size={19} className="relative z-10" /> : <Mic size={19} />}
                  </button>

                  {/* Send / Stop Streaming Button (shown when typing, attached, or streaming) */}
                  {inputText.trim() || attachment || isStreaming ? (
                    <button
                      type="submit"
                      className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-transform active:scale-95 font-semibold ${
                        isLight
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-white text-slate-950 hover:bg-slate-200"
                      }`}
                      title={isStreaming ? "Stop generating" : "Send message"}
                    >
                      {isStreaming ? <Square size={16} className="fill-current" /> : <ArrowUp size={20} />}
                    </button>
                  ) : (
                    /* Iconic Gemini Live Voice Launch Button when input is empty */
                    <button
                      type="button"
                      onClick={onSwitchToLive}
                      className={`min-h-[44px] px-3.5 rounded-full bg-gradient-to-r ${uiTheme.accentGradientClass} text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:opacity-95 active:scale-95 transition-all whitespace-nowrap`}
                      title="Go Live with Zoya (Voice-to-Voice)"
                    >
                      <Radio size={16} />
                      <span className="hidden sm:inline">Live</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Google Nano Ironman Studio Drawer / Modal */}
      <NanoIronmanStudio
        isOpen={showNanoIronmanStudio}
        onClose={() => setShowNanoIronmanStudio(false)}
        config={config}
        initialPrompt={nanoIronmanInitialPrompt}
        initialInputImage={nanoIronmanInitialImage}
        onSendToChat={(text, img) => {
          onSendMessage(text, undefined, img);
        }}
      />
    </div>
  );
}
