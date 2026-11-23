// Don't Touch My Phone — Anti-Theft Motion & Intruder Protection Service for Zoya
// Detects phone movement/touch, triggers loud police siren & Zoya voice warning,
// secretly snaps the intruder's photo using the front camera, saves to Intruder Gallery,
// and turns off when the user says "Turn off don't touch my phone" or disarms manually.

export type SecurityState = "idle" | "arming" | "armed" | "triggered";
export type MotionSensitivity = "high" | "medium" | "low";

export interface IntruderRecord {
  id: string;
  timestamp: number;
  formattedDate: string;
  photoUrl: string; // base64 JPEG
  reason: string;
  motionMagnitude: number;
}

export interface SecuritySettings {
  sensitivity: MotionSensitivity;
  sirenVolume: number;
  voiceAlert: boolean;
  screenStrobe: boolean;
  autoDownloadPhoto: boolean;
  armingDelaySeconds: number;
}

const STORAGE_KEY_INTRUSIONS = "zoya_intruder_records_v1";
const STORAGE_KEY_SETTINGS = "zoya_security_settings_v1";
const STORAGE_KEY_PIN = "zoya_security_vault_pin_v1";

const DEFAULT_SETTINGS: SecuritySettings = {
  sensitivity: "medium",
  sirenVolume: 0.9,
  voiceAlert: true,
  screenStrobe: true,
  autoDownloadPhoto: false,
  armingDelaySeconds: 5,
};

type StateListener = (state: SecurityState) => void;
type IntruderListener = (records: IntruderRecord[]) => void;
type CountdownListener = (secondsLeft: number) => void;

class DontTouchMyPhoneService {
  private state: SecurityState = "idle";
  private settings: SecuritySettings = DEFAULT_SETTINGS;
  private intruderRecords: IntruderRecord[] = [];

  // Listeners
  private stateListeners: Set<StateListener> = new Set();
  private intruderListeners: Set<IntruderListener> = new Set();
  private countdownListeners: Set<CountdownListener> = new Set();

  // Sensors & Arming timers
  private countdownTimer: any = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private touchHandler: ((e: PointerEvent | TouchEvent) => void) | null = null;

  // Baseline calibration
  private lastAccel = { x: 0, y: 0, z: 0 };
  private baselineCalibrated = false;
  private calibrationCount = 0;

  // Siren Audio & Voice
  private audioCtx: AudioContext | null = null;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  private voiceRepeatInterval: any = null;

  // Voice Deactivation Listener (Web Speech API)
  private speechRecognition: any = null;
  private isRecognitionActive = false;

  constructor() {
    this.loadPersistedData();
  }

  private loadPersistedData(): void {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
      const savedRecords = localStorage.getItem(STORAGE_KEY_INTRUSIONS);
      if (savedRecords) {
        this.intruderRecords = JSON.parse(savedRecords);
      }
    } catch (e) {
      console.warn("Could not load security records from storage:", e);
    }
  }

  private saveRecords(): void {
    try {
      // Keep up to 50 latest records to stay well within localStorage quota
      const trimmed = this.intruderRecords.slice(0, 50);
      localStorage.setItem(STORAGE_KEY_INTRUSIONS, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("Could not save intruder records:", e);
    }
  }

  public getSettings(): SecuritySettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<SecuritySettings>): void {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    } catch {}
  }

  public getState(): SecurityState {
    return this.state;
  }

  public getIntruderRecords(): IntruderRecord[] {
    return [...this.intruderRecords];
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeIntruders(listener: IntruderListener): () => void {
    this.intruderListeners.add(listener);
    listener(this.intruderRecords);
    return () => this.intruderListeners.delete(listener);
  }

  public subscribeCountdown(listener: CountdownListener): () => void {
    this.countdownListeners.add(listener);
    return () => this.countdownListeners.delete(listener);
  }

  private notifyState(): void {
    this.stateListeners.forEach((l) => l(this.state));
  }

  private notifyIntruders(): void {
    this.intruderListeners.forEach((l) => l(this.intruderRecords));
  }

  private notifyCountdown(sec: number): void {
    this.countdownListeners.forEach((l) => l(sec));
  }

  /**
   * Request motion permission for iOS 13+ devices if applicable
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        return perm === "granted";
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Start Arming sequence with grace period (default 5s)
   */
  public arm(delaySec: number = this.settings.armingDelaySeconds): void {
    if (this.state === "armed" || this.state === "arming") return;

    this.stopAlarms();
    this.state = "arming";
    this.notifyState();

    let remaining = Math.max(1, delaySec);
    this.notifyCountdown(remaining);

    // Speak arming announcement
    this.speakVoice(
      `Don't Touch My Phone security activating in ${remaining} seconds. Phone ko table par rakh dein.`
    );

    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      this.notifyCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.completeArming();
      }
    }, 1000);
  }

  /**
   * Complete arming and start motion / touch listeners
   */
  private completeArming(): void {
    this.state = "armed";
    this.baselineCalibrated = false;
    this.calibrationCount = 0;
    this.notifyState();
    this.notifyCountdown(0);

    // Play arming beep
    this.playShortChime(880, 0.2);

    // Start motion & touch sensors
    this.attachSensors();

    // Start voice listener specifically for "turn off don't touch my phone"
    this.startVoiceDeactivationListener();
  }

  /**
   * Disarm security, stop all sirens and reset to idle
   */
  public disarm(triggeredByVoice: boolean = false): void {
    if (this.state === "idle") return;

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.detachSensors();
    this.stopAlarms();
    this.stopVoiceDeactivationListener();

    this.state = "idle";
    this.notifyState();
    this.notifyCountdown(0);

    // Confirm disarm to user
    const msg = triggeredByVoice
      ? "Don't Touch My Phone security turned off. Welcome back, Devid! Zoya ne aapka phone safe rakha tha."
      : "Security disarmed. System safe.";
    this.speakVoice(msg, 1.05);
  }

  /**
   * When phone is moved or touched while armed!
   */
  private triggerAlarm(reason: string, magnitude: number = 0): void {
    if (this.state !== "armed") return;

    this.state = "triggered";
    this.notifyState();

    // 1. Secretly capture intruder's photo using front camera
    this.captureIntruderPhoto(reason, magnitude);

    // 2. Play high-pitch police siren
    if (this.settings.sirenVolume > 0) {
      this.startPoliceSiren();
    }

    // 3. Loud fierce Hinglish voice warning from Zoya
    if (this.settings.voiceAlert) {
      this.startVoiceWarnings();
    }

    // Ensure speech listener is actively listening for "turn off don't touch my phone"
    this.startVoiceDeactivationListener();
  }

  /**
   * Attach motion, orientation, and screen touch sensors
   */
  private attachSensors(): void {
    this.detachSensors();

    // Accelerometer sensitivity threshold (delta in m/s^2)
    const threshold =
      this.settings.sensitivity === "high"
        ? 2.2
        : this.settings.sensitivity === "low"
        ? 8.5
        : 4.5;

    // 1. Device Motion (Accelerometer)
    this.motionHandler = (event: DeviceMotionEvent) => {
      if (this.state !== "armed") return;
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (!accel) return;

      const x = accel.x || 0;
      const y = accel.y || 0;
      const z = accel.z || 0;

      if (!this.baselineCalibrated) {
        this.lastAccel = { x, y, z };
        this.calibrationCount += 1;
        if (this.calibrationCount > 5) {
          this.baselineCalibrated = true;
        }
        return;
      }

      const dx = x - this.lastAccel.x;
      const dy = y - this.lastAccel.y;
      const dz = z - this.lastAccel.z;
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

      this.lastAccel = { x, y, z };

      if (delta > threshold) {
        this.triggerAlarm("Phone Movement Detected (Picked Up / Shifted)", delta);
      }
    };

    // 2. Device Orientation (Gyroscope tilt)
    let lastTilt = { alpha: 0, beta: 0, gamma: 0 };
    let hasFirstTilt = false;
    this.orientationHandler = (event: DeviceOrientationEvent) => {
      if (this.state !== "armed") return;
      const b = event.beta || 0;
      const g = event.gamma || 0;

      if (!hasFirstTilt) {
        lastTilt = { alpha: event.alpha || 0, beta: b, gamma: g };
        hasFirstTilt = true;
        return;
      }

      const tiltDelta = Math.abs(b - lastTilt.beta) + Math.abs(g - lastTilt.gamma);
      if (tiltDelta > (this.settings.sensitivity === "high" ? 8 : 16)) {
        this.triggerAlarm("Phone Tilt / Angle Change Detected", tiltDelta);
      }
    };

    // 3. Screen Touch Detection (if screen is tapped while lying flat)
    this.touchHandler = () => {
      if (this.state === "armed") {
        this.triggerAlarm("Screen Touched / Hand Contact Detected", 9.9);
      }
    };

    try {
      window.addEventListener("devicemotion", this.motionHandler, true);
      window.addEventListener("deviceorientation", this.orientationHandler, true);
      window.addEventListener("pointerdown", this.touchHandler, { capture: true, passive: true });
    } catch (e) {
      console.warn("Error attaching motion sensors:", e);
    }
  }

  private detachSensors(): void {
    if (this.motionHandler) {
      window.removeEventListener("devicemotion", this.motionHandler, true);
      this.motionHandler = null;
    }
    if (this.orientationHandler) {
      window.removeEventListener("deviceorientation", this.orientationHandler, true);
      this.orientationHandler = null;
    }
    if (this.touchHandler) {
      window.removeEventListener("pointerdown", this.touchHandler, true);
      this.touchHandler = null;
    }
  }

  /**
   * Secret front-camera photo capture and saving to intruder records
   */
  private async captureIntruderPhoto(reason: string, magnitude: number): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.recordIntruderWithoutPhoto(reason, magnitude);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      // Wait 350ms for exposure/focus
      await new Promise((resolve) => setTimeout(resolve, 350));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Draw frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Stamp Security Watermark Banner
        ctx.fillStyle = "rgba(220, 38, 38, 0.85)"; // Red alert bar
        ctx.fillRect(0, canvas.height - 56, canvas.width, 56);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("🚨 INTRUDER CAUGHT — DON'T TOUCH MY PHONE", 14, canvas.height - 34);

        ctx.font = "12px monospace";
        const dateStr = new Date().toLocaleString("en-IN", { timeZoneName: "short" });
        ctx.fillText(`Timestamp: ${dateStr} | Protected by Zoya AI`, 14, canvas.height - 14);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        const record: IntruderRecord = {
          id: "intruder_" + Date.now(),
          timestamp: Date.now(),
          formattedDate: dateStr,
          photoUrl: dataUrl,
          reason,
          motionMagnitude: Math.round(magnitude * 10) / 10,
        };

        this.intruderRecords.unshift(record);
        this.saveRecords();
        this.notifyIntruders();

        // Optional auto-download to device gallery
        if (this.settings.autoDownloadPhoto) {
          this.downloadRecord(record);
        }
      }

      // Stop camera tracks immediately
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.warn("Camera snapshot failed, logging motion event without photo:", err);
      this.recordIntruderWithoutPhoto(reason, magnitude);
    }
  }

  private recordIntruderWithoutPhoto(reason: string, magnitude: number): void {
    const record: IntruderRecord = {
      id: "intruder_" + Date.now(),
      timestamp: Date.now(),
      formattedDate: new Date().toLocaleString("en-IN"),
      photoUrl: "",
      reason,
      motionMagnitude: Math.round(magnitude * 10) / 10,
    };
    this.intruderRecords.unshift(record);
    this.saveRecords();
    this.notifyIntruders();
  }

  /**
   * High-intensity Web Audio API Police Siren
   */
  private startPoliceSiren(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";

      const baseFreq = 750;
      const peakFreq = 1450;
      let rising = true;

      osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(Math.min(1, this.settings.sirenVolume), this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();

      this.sirenOsc1 = osc;
      this.sirenGain = gain;

      // Frequency sweeping warble loop
      let currentFreq = baseFreq;
      this.sirenInterval = setInterval(() => {
        if (!this.audioCtx || !this.sirenOsc1) return;
        if (rising) {
          currentFreq += 70;
          if (currentFreq >= peakFreq) rising = false;
        } else {
          currentFreq -= 70;
          if (currentFreq <= baseFreq) rising = true;
        }
        try {
          this.sirenOsc1.frequency.setValueAtTime(currentFreq, this.audioCtx.currentTime);
        } catch {}
      }, 35);
    } catch (e) {
      console.warn("Could not start siren audio context:", e);
    }
  }

  /**
   * Fierce warning voice in Hindi & English (Stealth: never reveals photo capture to intruder)
   */
  private startVoiceWarnings(): void {
    const warnings = [
      "Khabardaar! Phone ko haath mat lagao! Devid ka phone hai yeh! Turant phone wapas rakho!",
      "Warning! Unauthorized touch detected! Step away from Devid's phone immediately!",
      "Phone chhod do! Alarm band nahi hoga jab tak Devid nahi bolega!",
      "Devid ka phone hai yeh! Phone ko wapas table par rakh do!",
    ];

    let index = 0;
    const playNext = () => {
      if (this.state !== "triggered") return;
      this.speakVoice(warnings[index % warnings.length], 1.15, 1.1);
      index++;
    };

    playNext();
    this.voiceRepeatInterval = setInterval(() => {
      if (this.state === "triggered") {
        playNext();
      } else {
        clearInterval(this.voiceRepeatInterval);
      }
    }, 7000);
  }

  private speakVoice(text: string, rate: number = 1.0, pitch: number = 1.05): void {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Pick sweet/expressive female voice if available (Hindi/Indian English)
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.includes("hi") ||
          v.lang.includes("IN") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("zira")
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  private playShortChime(freq: number, durationSec: number): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
      setTimeout(() => ctx.close().catch(() => {}), (durationSec + 0.1) * 1000);
    } catch {}
  }

  private stopAlarms(): void {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.voiceRepeatInterval) {
      clearInterval(this.voiceRepeatInterval);
      this.voiceRepeatInterval = null;
    }
    if (this.sirenOsc1) {
      try {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
      } catch {}
      this.sirenOsc1 = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
  }

  /**
   * Speech recognition listener waiting specifically for "turn off don't touch my phone"
   */
  private startVoiceDeactivationListener(): void {
    if (this.isRecognitionActive) return;
    if (typeof window === "undefined") return;

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += " " + (event.results[i]?.[0]?.transcript || "");
        }
        const cleaned = transcript.toLowerCase().trim();

        // Check for disarm phrases
        const disarmPatterns = [
          /turn\s+off\s+(don'?t|dont)\s+touch\s+(my\s+)?phone/i,
          /(don'?t|dont)\s+touch\s+(my\s+)?phone\s+(turn\s+)?off/i,
          /(don'?t|dont)\s+touch\s+(my\s+)?phone\s+band\s+karo/i,
          /band\s+karo\s+(don'?t|dont)\s+touch\s+my\s+phone/i,
          /stop\s+(don'?t|dont)\s+touch\s+(my\s+)?phone/i,
          /stop\s+alarm/i,
          /turn\s+off\s+security/i,
          /band\s+karo\s+alarm/i,
          /zoya\s+turn\s+off\s+don'?t\s+touch\s+my\s+phone/i,
          /zoya\s+alarm\s+band\s+karo/i,
        ];

        const matched = disarmPatterns.some((pattern) => pattern.test(cleaned));
        if (matched) {
          console.log("[DontTouchMyPhone] Disarmed via voice phrase:", cleaned);
          this.disarm(true);
        }
      };

      rec.onend = () => {
        // Only restart if still actively desired and state is armed/triggered
        if (this.isRecognitionActive && (this.state === "armed" || this.state === "triggered")) {
          setTimeout(() => {
            if (this.isRecognitionActive && (this.state === "armed" || this.state === "triggered")) {
              try {
                rec.start();
              } catch {
                this.isRecognitionActive = false;
              }
            }
          }, 1500);
        } else {
          this.isRecognitionActive = false;
        }
      };

      rec.onerror = (err: any) => {
        const errorType = err?.error;
        if (
          errorType === "not-allowed" ||
          errorType === "service-not-allowed" ||
          errorType === "audio-capture" ||
          errorType === "aborted"
        ) {
          this.isRecognitionActive = false;
        }
      };

      rec.start();
      this.speechRecognition = rec;
      this.isRecognitionActive = true;
    } catch {
      this.isRecognitionActive = false;
    }
  }

  private stopVoiceDeactivationListener(): void {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.abort();
      } catch {}
      this.speechRecognition = null;
    }
    this.isRecognitionActive = false;
  }

  /**
   * Helper to download a captured intruder record to the user's phone gallery / downloads
   */
  public downloadRecord(record: IntruderRecord): void {
    if (!record.photoUrl) return;
    try {
      const a = document.createElement("a");
      a.href = record.photoUrl;
      a.download = `zoya_intruder_${record.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn("Could not trigger download:", e);
    }
  }

  public deleteRecord(id: string, pin?: string): boolean {
    if (pin !== undefined && !this.verifySecurityPin(pin)) {
      return false;
    }
    this.intruderRecords = this.intruderRecords.filter((r) => r.id !== id);
    this.saveRecords();
    this.notifyIntruders();
    return true;
  }

  public clearAllRecords(pin?: string): boolean {
    if (pin !== undefined && !this.verifySecurityPin(pin)) {
      return false;
    }
    this.intruderRecords = [];
    this.saveRecords();
    this.notifyIntruders();
    return true;
  }

  /**
   * Secret Security Vault PIN (Default: "1234")
   * Prevents unauthorized people from accessing or deleting intruder photos
   */
  public getSecurityPin(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_PIN) || "1234";
    } catch {
      return "1234";
    }
  }

  public setSecurityPin(newPin: string): boolean {
    const clean = newPin.trim();
    if (clean.length < 4) return false;
    try {
      localStorage.setItem(STORAGE_KEY_PIN, clean);
      return true;
    } catch {
      return false;
    }
  }

  public resetSecurityPin(newPin: string = "1234"): boolean {
    const clean = newPin.trim() || "1234";
    try {
      localStorage.setItem(STORAGE_KEY_PIN, clean);
      return true;
    } catch {
      return false;
    }
  }

  public verifySecurityPin(pin: string): boolean {
    return pin.trim() === this.getSecurityPin();
  }
}

export const dontTouchMyPhoneService = new DontTouchMyPhoneService();
// Reset PIN to default 1234 on execution as requested by the user
dontTouchMyPhoneService.resetSecurityPin("1234");
