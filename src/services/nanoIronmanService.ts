import {
  AppConfig,
  GeneratedNanoIronmanImage,
  NANO_IRONMAN_MODELS,
  NanoIronmanModelId,
  getAllAvailableApiKeys,
  isDeveloperApiSlot,
  resolveActiveApiKey,
} from "../types";
import { getApiUrl } from "../utils/apiBase";

export interface GenerateImageOptions {
  prompt: string;
  model?: NanoIronmanModelId;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  imageSize?: "512px" | "1K" | "2K" | "4K";
  base64InputImage?: string;
  mimeType?: string;
  config: AppConfig;
}

export interface NanoIronmanStylePreset {
  id: string;
  label: string;
  promptPrefix: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

export const NANO_IRONMAN_STYLE_PRESETS: NanoIronmanStylePreset[] = [
  {
    id: "ironman-tech",
    label: "🦾 High-Tech Stark Suit",
    promptPrefix: "Cinematic 8K Marvel aesthetic, gleaming red and titanium gold Iron Man armor, glowing cyan Arc Reactor, particle effects, hyper-detailed:",
    aspectRatio: "1:1",
  },
  {
    id: "photorealistic",
    label: "📸 Cinematic 4K Portrait",
    promptPrefix: "Ultra-realistic cinematic 8K photo, dramatic studio lighting, rich texture, sharp focus, masterwork photography:",
    aspectRatio: "1:1",
  },
  {
    id: "cyberpunk",
    label: "🌃 Cyberpunk Neon",
    promptPrefix: "Futuristic cyberpunk aesthetic, glowing neon lights, holographic reflections, intricate tech details, night city ambiance:",
    aspectRatio: "16:9",
  },
  {
    id: "anime",
    label: "✨ 3D Disney Anime",
    promptPrefix: "Whimsical Pixar and modern anime 3D render, expressive glowing eyes, soft pastel volumetric lighting, octane render:",
    aspectRatio: "1:1",
  },
  {
    id: "wallpaper",
    label: "📱 4K Mobile Wallpaper",
    promptPrefix: "Majestic hyper-detailed abstract visual scenery, ethereal atmospheric glow, 4K mobile wallpaper vertical format:",
    aspectRatio: "9:16",
  },
  {
    id: "logo",
    label: "🎨 Vector Logo & Icon",
    promptPrefix: "Sleek modern minimalist vector logo graphic, clean geometric lines, vibrant gradient color palette, dark background:",
    aspectRatio: "1:1",
  },
];

const GALLERY_STORAGE_KEY_IRONMAN = "zoya_nano_ironman_gallery_v1";
const GALLERY_STORAGE_KEY_OLD = "zoya_nano_banana_gallery_v1";

export function loadSavedNanoIronmanGallery(): GeneratedNanoIronmanImage[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY_IRONMAN) || localStorage.getItem(GALLERY_STORAGE_KEY_OLD);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 30);
    }
  } catch {}
  return [];
}

export function saveNanoIronmanImageToGallery(img: GeneratedNanoIronmanImage): void {
  try {
    const existing = loadSavedNanoIronmanGallery();
    const updated = [img, ...existing.filter((item) => item.imageUrl !== img.imageUrl)].slice(0, 30);
    localStorage.setItem(GALLERY_STORAGE_KEY_IRONMAN, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zoya_nano_ironman_updated"));
    window.dispatchEvent(new CustomEvent("zoya_nano_banana_updated"));
  } catch {}
}

export function deleteNanoIronmanImageFromGallery(createdAt: number): void {
  try {
    const existing = loadSavedNanoIronmanGallery();
    const updated = existing.filter((item) => item.createdAt !== createdAt);
    localStorage.setItem(GALLERY_STORAGE_KEY_IRONMAN, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zoya_nano_ironman_updated"));
    window.dispatchEvent(new CustomEvent("zoya_nano_banana_updated"));
  } catch {}
}

/**
 * Generates or edits an image using Google's Nano Ironman family of models
 * (gemini-3.1-flash-lite-image, gemini-3.1-flash-image, gemini-3-pro-image)
 */
export async function generateNanoIronmanImage(
  opts: GenerateImageOptions
): Promise<GeneratedNanoIronmanImage> {
  const {
    prompt,
    model = opts.config.nanoIronmanModel || opts.config.nanoBananaModel || "gemini-3.1-flash-lite-image",
    aspectRatio = "1:1",
    imageSize = "1K",
    base64InputImage,
    mimeType = "image/jpeg",
    config,
  } = opts;

  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error("Prompt cannot be empty for Google Nano Ironman");
  }

  const customApiKey = resolveActiveApiKey(config) || undefined;

  const response = await fetch(getApiUrl("/api/gemini/image/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: cleanPrompt,
      model,
      aspectRatio,
      imageSize,
      base64InputImage,
      mimeType,
      customApiKey,
      preferDeveloperApi: isDeveloperApiSlot(config),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image generation failed with status ${response.status}`);
  }

  const result: GeneratedNanoIronmanImage = await response.json();
  saveNanoIronmanImageToGallery(result);
  return result;
}

// Backward-compatible aliases
export const generateNanoBananaImage = generateNanoIronmanImage;
export const loadSavedNanoBananaGallery = loadSavedNanoIronmanGallery;
export const saveNanoBananaImageToGallery = saveNanoIronmanImageToGallery;
export const deleteNanoBananaImageFromGallery = deleteNanoIronmanImageFromGallery;
export const NANO_BANANA_STYLE_PRESETS = NANO_IRONMAN_STYLE_PRESETS;
export type NanoBananaStylePreset = NanoIronmanStylePreset;
