/**
 * DeviceControlService
 * 
 * Manages device control functions for Zoya:
 * 1. System & Media Volume adjustment (0-100%, up, down, mute, unmute, max)
 * 2. Screen Brightness control (10-100%, dim, brighten, set exact percentage, max)
 * 
 * Multi-layer Execution:
 * - Native Android APK: Dispatches to window.ZoyaDeviceControlBridge (AudioManager & WindowManager.LayoutParams.screenBrightness)
 * - Web / PWA Viewport: Dynamically adjusts Web Audio master gain and applies real-time viewport screen brightness filter overlay
 * - Natural Voice Command Intent Parser: Automatically detects Hindi, Hinglish and English voice requests.
 */

export interface DeviceControlState {
  volume: number; // 0 to 100
  isMuted: boolean;
  brightness: number; // 10 to 100
  lastChangedType?: "volume" | "brightness" | null;
  lastChangedAt: number;
}

export interface DeviceControlCommandResult {
  isDeviceControl: boolean;
  type: "volume" | "brightness" | null;
  action: "up" | "down" | "set" | "mute" | "unmute" | "max" | "min" | null;
  targetValue?: number;
  feedbackMessage: string;
}

type DeviceControlListener = (state: DeviceControlState) => void;

class DeviceControlService {
  private volume: number = 80; // 0 to 100
  private isMuted: boolean = false;
  private brightness: number = 100; // 10 to 100
  private lastChangedType: "volume" | "brightness" | null = null;
  private lastChangedAt: number = 0;
  private listeners: Set<DeviceControlListener> = new Set();
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.loadPersistedState();
    this.applyBrightnessToDom(this.brightness);
  }

  private loadPersistedState(): void {
    try {
      const savedVol = localStorage.getItem("zoya_device_volume");
      if (savedVol !== null) {
        const parsed = parseInt(savedVol, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          this.volume = parsed;
        }
      }

      const savedBri = localStorage.getItem("zoya_device_brightness");
      if (savedBri !== null) {
        const parsed = parseInt(savedBri, 10);
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 100) {
          this.brightness = parsed;
        }
      }
    } catch {}
  }

  private persistState(): void {
    try {
      localStorage.setItem("zoya_device_volume", String(this.volume));
      localStorage.setItem("zoya_device_brightness", String(this.brightness));
    } catch {}
  }

  public getState(): DeviceControlState {
    return {
      volume: this.volume,
      isMuted: this.isMuted,
      brightness: this.brightness,
      lastChangedType: this.lastChangedType,
      lastChangedAt: this.lastChangedAt,
    };
  }

  public subscribe(listener: DeviceControlListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch (err) {
        console.warn("Device control listener error:", err);
      }
    });
  }

  // ==========================================
  // VOLUME CONTROL IMPLEMENTATION
  // ==========================================

  public setVolume(val: number, options: { silent?: boolean } = {}): number {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    this.volume = clamped;
    this.isMuted = clamped === 0;
    this.lastChangedType = "volume";
    this.lastChangedAt = Date.now();
    this.persistState();

    // Call Native Android Bridge if present
    this.callNativeSetVolume(clamped);

    if (!options.silent) {
      this.playVolumeChime(clamped);
    }

    this.notify();
    return clamped;
  }

  public volumeUp(step: number = 15): number {
    return this.setVolume(this.volume + step);
  }

  public volumeDown(step: number = 15): number {
    return this.setVolume(this.volume - step);
  }

  public mute(): void {
    this.isMuted = true;
    this.lastChangedType = "volume";
    this.lastChangedAt = Date.now();
    this.callNativeSetVolume(0);
    this.notify();
  }

  public unmute(): void {
    this.isMuted = false;
    if (this.volume === 0) {
      this.volume = 50;
    }
    this.lastChangedType = "volume";
    this.lastChangedAt = Date.now();
    this.callNativeSetVolume(this.volume);
    this.playVolumeChime(this.volume);
    this.notify();
  }

  public maxVolume(): number {
    return this.setVolume(100);
  }

  private callNativeSetVolume(vol: number): void {
    try {
      const bridge = (window as any).ZoyaDeviceControlBridge;
      if (bridge && typeof bridge.setSystemVolume === "function") {
        bridge.setSystemVolume(vol);
      }
    } catch (e) {
      console.warn("Native Android volume call failed:", e);
    }
  }

  // ==========================================
  // BRIGHTNESS CONTROL IMPLEMENTATION
  // ==========================================

  public setBrightness(val: number): number {
    const clamped = Math.max(10, Math.min(100, Math.round(val)));
    this.brightness = clamped;
    this.lastChangedType = "brightness";
    this.lastChangedAt = Date.now();
    this.persistState();

    // Apply real-time viewport screen brightness filter
    this.applyBrightnessToDom(clamped);

    // Call Native Android Bridge if present (adjusts WindowManager hardware backlight)
    this.callNativeSetBrightness(clamped);

    this.notify();
    return clamped;
  }

  public brightnessUp(step: number = 20): number {
    return this.setBrightness(this.brightness + step);
  }

  public brightnessDown(step: number = 20): number {
    return this.setBrightness(this.brightness - step);
  }

  public maxBrightness(): number {
    return this.setBrightness(100);
  }

  public dimBrightness(val: number = 25): number {
    return this.setBrightness(val);
  }

  private applyBrightnessToDom(brightnessPercent: number): void {
    if (typeof document === "undefined") return;

    // CSS Custom Property on documentElement for styling & overlays
    document.documentElement.style.setProperty(
      "--zoya-screen-brightness",
      `${brightnessPercent}%`
    );

    // Overlay dim element
    let overlay = document.getElementById("zoya-screen-brightness-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "zoya-screen-brightness-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "48";
      overlay.style.transition = "background-color 0.25s ease";
      document.body.appendChild(overlay);
    }

    if (brightnessPercent < 100) {
      // Opacity scales from 0.0 at 100% to 0.85 at 10%
      const dimOpacity = ((100 - brightnessPercent) / 100) * 0.82;
      overlay.style.backgroundColor = `rgba(0, 0, 0, ${dimOpacity.toFixed(3)})`;
    } else {
      overlay.style.backgroundColor = "transparent";
    }
  }

  private callNativeSetBrightness(bri: number): void {
    try {
      const bridge = (window as any).ZoyaDeviceControlBridge;
      if (bridge && typeof bridge.setScreenBrightness === "function") {
        bridge.setScreenBrightness(bri / 100.0);
      }
    } catch (e) {
      console.warn("Native Android brightness call failed:", e);
    }
  }

  // ==========================================
  // NATURAL VOICE COMMAND PARSER (Hinglish/English)
  // ==========================================

  public parseDeviceControlCommand(transcript: string): DeviceControlCommandResult {
    const raw = transcript.toLowerCase().trim();
    if (!raw) {
      return { isDeviceControl: false, type: null, action: null, feedbackMessage: "" };
    }

    // 1. VOLUME COMMANDS
    const isVolumeQuery =
      raw.includes("volume") ||
      raw.includes("awaaz") ||
      raw.includes("awaz") ||
      raw.includes("sound") ||
      raw.includes("dheemi") ||
      raw.includes("mute") ||
      raw.includes("unmute");

    if (isVolumeQuery) {
      // Check Mute
      if (
        raw.includes("mute karo") ||
        raw.includes("chup ho jao") ||
        raw.includes("awaaz band") ||
        raw.includes("awaz band") ||
        raw === "mute" ||
        raw.includes("sound band")
      ) {
        this.mute();
        return {
          isDeviceControl: true,
          type: "volume",
          action: "mute",
          targetValue: 0,
          feedbackMessage: "Maine volume mute kar diya hai!",
        };
      }

      // Check Unmute
      if (
        raw.includes("unmute karo") ||
        raw.includes("awaaz kholo") ||
        raw.includes("awaz kholo") ||
        raw === "unmute" ||
        raw.includes("sound on karo")
      ) {
        this.unmute();
        return {
          isDeviceControl: true,
          type: "volume",
          action: "unmute",
          targetValue: this.volume,
          feedbackMessage: `Volume unmute ho gaya (${this.volume}%)!`,
        };
      }

      // Check Full / Max volume
      if (
        raw.includes("full volume") ||
        raw.includes("max volume") ||
        raw.includes("maximum volume") ||
        raw.includes("puri awaaz") ||
        raw.includes("poori awaaz") ||
        raw.includes("volume 100")
      ) {
        const finalVol = this.maxVolume();
        return {
          isDeviceControl: true,
          type: "volume",
          action: "max",
          targetValue: finalVol,
          feedbackMessage: "Volume 100% full kar diya hai!",
        };
      }

      // Check exact percentage e.g. "volume 50 percent", "volume 70%", "awaaz 60 kar do"
      const percentMatch = raw.match(/(?:volume|awaaz|awaz|sound)\s*(?:ko|to|pe|par)?\s*(\d{1,3})\s*(?:%|percent|prcent)?/i);
      if (percentMatch) {
        const val = parseInt(percentMatch[1], 10);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          const finalVol = this.setVolume(val);
          return {
            isDeviceControl: true,
            type: "volume",
            action: "set",
            targetValue: finalVol,
            feedbackMessage: `Volume ${finalVol}% par set kar diya hai!`,
          };
        }
      }

      // Check Volume Up / Increase
      if (
        raw.includes("badhao") ||
        raw.includes("tez karo") ||
        raw.includes("up") ||
        raw.includes("increase") ||
        raw.includes("high") ||
        raw.includes("zyada karo") ||
        raw.includes("jyada karo")
      ) {
        const finalVol = this.volumeUp(15);
        return {
          isDeviceControl: true,
          type: "volume",
          action: "up",
          targetValue: finalVol,
          feedbackMessage: `Volume badha diya hai (${finalVol}%)!`,
        };
      }

      // Check Volume Down / Decrease
      if (
        raw.includes("kam karo") ||
        raw.includes("down") ||
        raw.includes("decrease") ||
        raw.includes("low") ||
        raw.includes("dheemi") ||
        raw.includes("ghatao")
      ) {
        const finalVol = this.volumeDown(15);
        return {
          isDeviceControl: true,
          type: "volume",
          action: "down",
          targetValue: finalVol,
          feedbackMessage: `Volume kam kar diya hai (${finalVol}%)!`,
        };
      }
    }

    // 2. BRIGHTNESS COMMANDS
    const isBrightnessQuery =
      raw.includes("brightness") ||
      raw.includes("screen") ||
      raw.includes("bright") ||
      raw.includes("dim") ||
      raw.includes("roshni");

    if (isBrightnessQuery) {
      // Check Full / Max brightness
      if (
        raw.includes("full brightness") ||
        raw.includes("max brightness") ||
        raw.includes("maximum brightness") ||
        raw.includes("poori brightness") ||
        raw.includes("brightness 100")
      ) {
        const finalBri = this.maxBrightness();
        return {
          isDeviceControl: true,
          type: "brightness",
          action: "max",
          targetValue: finalBri,
          feedbackMessage: "Screen brightness 100% full kar di hai!",
        };
      }

      // Check Dim / Low brightness
      if (
        raw.includes("dim karo") ||
        raw.includes("screen dim") ||
        raw.includes("night mode brightness") ||
        raw.includes("minimum brightness") ||
        raw.includes("sabse kam brightness")
      ) {
        const finalBri = this.dimBrightness(20);
        return {
          isDeviceControl: true,
          type: "brightness",
          action: "min",
          targetValue: finalBri,
          feedbackMessage: "Screen dim kar di hai (20%)!",
        };
      }

      // Check exact percentage e.g. "brightness 70%", "screen 60 percent", "brightness 50 kar do"
      const briPercentMatch = raw.match(/(?:brightness|screen|roshni)\s*(?:ko|to|pe|par)?\s*(\d{1,3})\s*(?:%|percent)?/i);
      if (briPercentMatch) {
        const val = parseInt(briPercentMatch[1], 10);
        if (!isNaN(val) && val >= 10 && val <= 100) {
          const finalBri = this.setBrightness(val);
          return {
            isDeviceControl: true,
            type: "brightness",
            action: "set",
            targetValue: finalBri,
            feedbackMessage: `Screen brightness ${finalBri}% par set kar di hai!`,
          };
        }
      }

      // Check Brightness Up / Increase
      if (
        raw.includes("badhao") ||
        raw.includes("up") ||
        raw.includes("increase") ||
        raw.includes("tez") ||
        raw.includes("zyada") ||
        raw.includes("jyada") ||
        raw.includes("bright karo")
      ) {
        const finalBri = this.brightnessUp(20);
        return {
          isDeviceControl: true,
          type: "brightness",
          action: "up",
          targetValue: finalBri,
          feedbackMessage: `Screen brightness badha di hai (${finalBri}%)!`,
        };
      }

      // Check Brightness Down / Decrease
      if (
        raw.includes("kam karo") ||
        raw.includes("down") ||
        raw.includes("decrease") ||
        raw.includes("low") ||
        raw.includes("dheemi") ||
        raw.includes("ghatao")
      ) {
        const finalBri = this.brightnessDown(20);
        return {
          isDeviceControl: true,
          type: "brightness",
          action: "down",
          targetValue: finalBri,
          feedbackMessage: `Screen brightness kam kar di hai (${finalBri}%)!`,
        };
      }
    }

    return {
      isDeviceControl: false,
      type: null,
      action: null,
      feedbackMessage: "",
    };
  }

  /**
   * Generates a sweet acoustic confirmation click when adjusting volume
   */
  private playVolumeChime(level: number): void {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Base frequency scales gently with volume level (400Hz to 800Hz)
      const freq = 420 + (level / 100) * 380;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }
}

export const deviceControlService = new DeviceControlService();
