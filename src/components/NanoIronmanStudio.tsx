import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Wand2,
  Download,
  Maximize2,
  Minimize2,
  X,
  Move,
  Loader2,
  Image as ImageIcon,
  Check,
  Copy,
  Trash2,
  Upload,
  RefreshCw,
  Send,
  Sliders,
  ExternalLink,
  Shield,
  Zap,
} from "lucide-react";
import {
  AppConfig,
  GeneratedNanoIronmanImage,
  NANO_IRONMAN_MODELS,
  NanoIronmanModelId,
} from "../types";
import {
  NANO_IRONMAN_STYLE_PRESETS,
  NanoIronmanStylePreset,
  deleteNanoIronmanImageFromGallery,
  generateNanoIronmanImage,
  loadSavedNanoIronmanGallery,
} from "../services/nanoIronmanService";

export interface NanoIronmanStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  initialPrompt?: string;
  initialInputImage?: string;
  onSendToChat?: (text: string, image: GeneratedNanoIronmanImage) => void;
  isLiveActive?: boolean;
  onTriggerZoyaVoice?: (promptText: string) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
  isMovableOverlay?: boolean;
}

export default function NanoIronmanStudio({
  isOpen,
  onClose,
  config,
  initialPrompt = "",
  initialInputImage,
  onSendToChat,
  isLiveActive = false,
  onTriggerZoyaVoice,
  constraintsRef,
  isMovableOverlay = false,
}: NanoIronmanStudioProps) {
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [selectedModel, setSelectedModel] = useState<NanoIronmanModelId>(
    config.nanoIronmanModel || config.nanoBananaModel || "gemini-3.1-flash-lite-image"
  );
  const [aspectRatio, setAspectRatio] = useState<
    "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
  >("1:1");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [inputImage, setInputImage] = useState<string | undefined>(
    initialInputImage
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeImage, setActiveImage] = useState<GeneratedNanoIronmanImage | null>(
    null
  );
  const [gallery, setGallery] = useState<GeneratedNanoIronmanImage[]>(() =>
    loadSavedNanoIronmanGallery()
  );
  const [activeTab, setActiveTab] = useState<"create" | "gallery">("create");
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (initialInputImage) setInputImage(initialInputImage);
  }, [initialInputImage]);

  useEffect(() => {
    const handleUpdate = () => {
      setGallery(loadSavedNanoIronmanGallery());
    };
    window.addEventListener("zoya_nano_ironman_updated", handleUpdate);
    window.addEventListener("zoya_nano_banana_updated", handleUpdate);
    return () => {
      window.removeEventListener("zoya_nano_ironman_updated", handleUpdate);
      window.removeEventListener("zoya_nano_banana_updated", handleUpdate);
    };
  }, []);

  const handleApplyPreset = (preset: NanoIronmanStylePreset) => {
    setAspectRatio(preset.aspectRatio);
    setPrompt((prev) => {
      const stripped = prev
        .replace(/^(Cinematic|Ultra-realistic|Futuristic|Whimsical|Majestic|Sleek).*?:/i, "")
        .trim();
      return `${preset.promptPrefix} ${stripped || "a futuristic visual creation"}`;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setInputImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateNanoIronmanImage({
        prompt: prompt.trim(),
        model: selectedModel,
        aspectRatio,
        imageSize,
        base64InputImage: inputImage,
        config,
      });

      setActiveImage(result);
      setGallery(loadSavedNanoIronmanGallery());

      // Trigger Zoya voice reaction if Live Voice is active
      if (isLiveActive && onTriggerZoyaVoice) {
        onTriggerZoyaVoice(
          `[System note: User generated an image with Nano Ironman with prompt "${prompt}". React enthusiastically in 1 short Hinglish sentence describing your admiration of this creation!]`
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "Generation failed. Check your Gemini API key or quota in Settings."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (img: GeneratedNanoIronmanImage) => {
    try {
      const link = document.createElement("a");
      link.href = img.imageUrl;
      link.download = `nano-ironman-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(img.imageUrl, "_blank");
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1800);
  };

  const handleDelete = (createdAt: number) => {
    deleteNanoIronmanImageFromGallery(createdAt);
    setGallery(loadSavedNanoIronmanGallery());
    if (activeImage?.createdAt === createdAt) {
      setActiveImage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag={isMovableOverlay && !isZoomed}
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: isZoomed ? "min(96vw, 1100px)" : undefined,
          height: isZoomed ? "92vh" : undefined,
        }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className={`fixed z-50 flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl border border-red-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(239,68,68,0.2)] overflow-hidden ${
          isZoomed
            ? "inset-4 sm:inset-6 m-auto rounded-3xl"
            : isMinimized
            ? "right-4 bottom-24 w-80 rounded-2xl"
            : isMovableOverlay
            ? "right-3 sm:right-6 top-16 w-[95vw] sm:w-[620px] lg:w-[720px] h-[84vh] max-h-[760px] rounded-3xl"
            : "inset-2 sm:inset-auto sm:top-14 sm:right-6 sm:bottom-6 sm:w-[580px] lg:w-[680px] rounded-3xl"
        }`}
      >
        {/* Studio Header - Red & Gold Stark Tech Aesthetics */}
        <div
          className={`px-4 py-3 bg-gradient-to-r from-red-600/25 via-amber-500/20 to-yellow-500/20 border-b border-red-500/30 flex items-center justify-between gap-2 ${
            isMovableOverlay && !isZoomed ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500/30 to-amber-500/30 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-base shadow-sm shrink-0">
              🦾
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">Google Nano Ironman Studio</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/25 text-amber-300 border border-red-500/40 shrink-0">
                  AI ART
                </span>
                {isMovableOverlay && !isZoomed && (
                  <Move size={11} className="text-slate-400 shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-amber-300/80 truncate">
                Jarvis-Grade AI Image Generation &amp; Conversational Editing
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="px-2 h-7 rounded-lg hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {isMinimized ? "Expand" : "Minimize"}
            </button>
            <button
              type="button"
              onClick={() => setIsZoomed((prev) => !prev)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title={isZoomed ? "Restore size" : "Maximize view"}
            >
              {isZoomed ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-colors"
              title="Close Nano Ironman Studio"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-3 overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === "create"
                      ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Wand2 size={12} />
                  <span>Create / Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("gallery")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === "gallery"
                      ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon size={12} />
                  <span>Creations Gallery ({gallery.length})</span>
                </button>
              </div>

              {/* Nano Ironman Model Tier Selector */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] overflow-x-auto">
                {NANO_IRONMAN_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                      selectedModel === m.id
                        ? "bg-red-500/25 border border-red-500/50 text-amber-200"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title={m.desc}
                  >
                    <span>{m.shortName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
                <span className="truncate">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white text-xs underline font-semibold shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Active Content: Create Mode */}
            {activeTab === "create" ? (
              <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto chat-scroll pr-1">
                {/* Style Presets */}
                <div className="space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Sparkles size={11} className="text-amber-400" />
                      <span>Ironman &amp; Cinematic Style Presets</span>
                    </span>
                    <span className="text-[10px] text-slate-500">1-Click Apply</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {NANO_IRONMAN_STYLE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/40 text-slate-300 hover:text-amber-200 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Prompt Input Form */}
                <form
                  onSubmit={handleGenerate}
                  className="space-y-2 shrink-0 bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl"
                >
                  {/* Reference Image preview for Prompt-to-Edit */}
                  {inputImage && (
                    <div className="relative inline-flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white/5 border border-amber-400/30">
                      <img
                        src={inputImage}
                        alt="Input reference"
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                      <div className="text-[11px] text-amber-200 font-medium truncate max-w-[200px]">
                        Conversational Edit Mode Active
                      </div>
                      <button
                        type="button"
                        onClick={() => setInputImage(undefined)}
                        className="w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                        title="Remove reference image"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      rows={2}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what you want Nano Ironman to create or modify (e.g. 'Stark tower at sunset', 'Arc reactor cyber tiger in 4K', 'Futuristic sports car with glowing neon')..."
                      className="w-full bg-black/40 border border-white/15 focus:border-red-400/60 rounded-xl py-2 px-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none chat-scroll"
                    />
                  </div>

                  {/* Settings row: Aspect ratio + Image upload + Generate */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Aspect Ratio Switcher */}
                      <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10">
                        {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map(
                          (ar) => (
                            <button
                              key={ar}
                              type="button"
                              onClick={() => setAspectRatio(ar)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                                aspectRatio === ar
                                  ? "bg-red-500/30 text-amber-300 border border-red-500/50"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              {ar}
                            </button>
                          )
                        )}
                      </div>

                      {/* Image Size (for Nano Ironman 2 & Pro) */}
                      {selectedModel !== "gemini-3.1-flash-lite-image" && (
                        <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10">
                          {(["1K", "2K", "4K"] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setImageSize(sz)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                                imageSize === sz
                                  ? "bg-amber-400/25 text-amber-200"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Upload reference button */}
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
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Upload reference photo for Conversational Prompt-to-Edit"
                      >
                        <Upload size={11} />
                        <span>Edit Image</span>
                      </button>
                    </div>

                    {/* Generate Action Button */}
                    <button
                      type="submit"
                      disabled={isGenerating || !prompt.trim()}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all active:scale-95 shrink-0"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Forging Art...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={13} />
                          <span>Forge with Nano Ironman</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Result Showcase Canvas Area */}
                <div className="flex-1 min-h-[220px] rounded-2xl border border-white/10 bg-black/60 overflow-hidden relative flex items-center justify-center p-2">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/40 flex items-center justify-center text-3xl animate-pulse">
                          🦾
                        </div>
                        <Loader2
                          size={24}
                          className="absolute -top-2 -right-2 text-amber-400 animate-spin"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">
                          Synthesizing with Nano Ironman...
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Communicating with Gemini Flash Image to generate high-fidelity artwork.
                        </p>
                      </div>
                    </div>
                  ) : activeImage ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center group">
                      <img
                        src={activeImage.imageUrl}
                        alt={activeImage.prompt}
                        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-transform"
                      />

                      {/* Floating Overlay Controls on Hover */}
                      <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 flex items-center justify-between gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
                            <span>🦾 {activeImage.model.replace("gemini-", "")}</span>
                            <span>·</span>
                            <span>{activeImage.aspectRatio || "1:1"}</span>
                          </div>
                          <div className="text-xs text-white truncate">
                            {activeImage.prompt}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownload(activeImage)}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Download full resolution image"
                          >
                            <Download size={13} />
                          </button>
                          {onSendToChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onSendToChat(
                                  `Created with Google Nano Ironman: "${activeImage.prompt}"`,
                                  activeImage
                                );
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Send to Active Chat conversation"
                            >
                              <Send size={12} />
                              <span>Send to Chat</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setInputImage(activeImage.imageUrl);
                              setPrompt(
                                `Enhance or transform this image with: `
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-amber-200 text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Conversational Prompt-to-Edit with Nano Ironman"
                          >
                            <RefreshCw size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-1">
                        🦾
                      </div>
                      <div className="text-sm font-semibold text-white">
                        Google Nano Ironman Image Generator
                      </div>
                      <p className="text-xs max-w-sm">
                        Enter any prompt above or pick a style preset to forge
                        studio-quality artwork directly with Gemini!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Gallery Tab */
              <div className="flex-1 overflow-y-auto chat-scroll pr-1">
                {gallery.length === 0 ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ImageIcon size={36} className="text-slate-500 mb-2" />
                    <div className="text-sm font-semibold text-white">
                      No Nano Ironman Creations Yet
                    </div>
                    <p className="text-xs max-w-xs mt-1">
                      Images you generate will be saved here so you can view,
                      download, or edit them anytime.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((item) => (
                      <div
                        key={item.createdAt}
                        className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-square flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          setActiveImage(item);
                          setActiveTab("create");
                        }}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.prompt}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                          <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                            {item.prompt}
                          </p>
                          <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="text-[9px] text-amber-300 font-mono">
                              {item.model.replace("gemini-", "").slice(0, 14)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(item);
                                daylight: true;
                                }}
                                className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white"
                                title="Download"
                              >
                                <Download size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.createdAt);
                                }}
                                className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Backward-compatible alias
export const NanoBananaStudio = NanoIronmanStudio;
