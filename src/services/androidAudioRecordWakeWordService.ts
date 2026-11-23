/**
 * AndroidAudioRecordWakeWordService
 * 
 * Bridges and implements Android's AudioRecord API architecture for continuous, low-latency
 * background wake-word detection ("Hey Zoya", "Suno Zoya", "Zoya") to activate Zoya hands-free.
 * 
 * Architecture:
 * 1. Native Android Path: When running inside the Android APK with ZoyaWakeWordBridge,
 *    delegates directly to the native Android Foreground Service (ZoyaAudioRecordWakeWordService.java)
 *    running on an AudioRecord PCM thread with PARTIAL_WAKE_LOCK and FOREGROUND_SERVICE_MICROPHONE.
 * 2. Web / PWA Path: When running in browser / PWA, emulates Android's AudioRecord pipeline using
 *    Web Audio API with 16kHz 16-bit PCM buffer sampling, real-time RMS voice activity detection (VAD),
 *    and acoustic phonetic matching.
 */

export interface AudioRecordWakeEvent {
  wakeWord: string;
  confidence: number;
  timestamp: number;
  isNativeAudioRecord: boolean;
  trailingCommand?: string;
}

export type WakeWordTarget = "Hey Zoya" | "Zoya" | "Suno Zoya" | "Okay Zoya";

export interface AudioRecordServiceStatus {
  isListening: boolean;
  isNativeBridgeAvailable: boolean;
  targetWakeWord: WakeWordTarget;
  sensitivity: number; // 0.1 to 1.0
  sampleRateHz: number;
  bufferSizeBytes: number;
  lastRmsLevel: number;
  lastDetectedAt?: number;
}

type WakeListener = (event: AudioRecordWakeEvent) => void;
type StateListener = (isListening: boolean, isNative: boolean) => void;
type LevelListener = (rms: number) => void;

class AndroidAudioRecordWakeWordService {
  private isEnabled: boolean = true;
  private isListening: boolean = false;
  private targetWakeWord: WakeWordTarget = "Hey Zoya";
  private sensitivity: number = 0.65; // 0.1 to 1.0
  private lastRmsLevel: number = 0;
  private lastDetectedAt: number = 0;

  private wakeListeners: Set<WakeListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private levelListeners: Set<LevelListener> = new Set();

  // Web AudioRecord Emulation Pipeline
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private speechRecognizer: any = null;
  private restartTimeout: any = null;

  constructor() {
    this.loadPersistedSettings();
    this.registerNativeBridgeCallbacks();
  }

  private loadPersistedSettings(): void {
    try {
      const savedEnabled = localStorage.getItem("zoya_audiorecord_enabled");
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === "true";
      }

      const savedWord = localStorage.getItem("zoya_audiorecord_target_wakeword");
      if (savedWord && ["Hey Zoya", "Zoya", "Suno Zoya", "Okay Zoya"].includes(savedWord)) {
        this.targetWakeWord = savedWord as WakeWordTarget;
      }

      const savedSens = localStorage.getItem("zoya_audiorecord_sensitivity");
      if (savedSens) {
        const parsed = parseFloat(savedSens);
        if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 1.0) {
          this.sensitivity = parsed;
        }
      }
    } catch {}
  }

  private persistSettings(): void {
    try {
      localStorage.setItem("zoya_audiorecord_enabled", String(this.isEnabled));
      localStorage.setItem("zoya_audiorecord_target_wakeword", this.targetWakeWord);
      localStorage.setItem("zoya_audiorecord_sensitivity", String(this.sensitivity));
    } catch {}
  }

  /**
   * Registers global window hooks for the native Android JavascriptInterface bridge.
   */
  private registerNativeBridgeCallbacks(): void {
    if (typeof window === "undefined") return;

    // Hook called from ZoyaWakeWordBridge.java
    (window as any).onAndroidWakeWordDetected = (wakeWord: string, confidence: number) => {
      this.handleWakeDetected({
        wakeWord: wakeWord || this.targetWakeWord,
        confidence: confidence || 0.88,
        timestamp: Date.now(),
        isNativeAudioRecord: true,
      });
    };

    (window as any).onAndroidAudioRecordLevel = (rms: number) => {
      this.lastRmsLevel = rms;
      this.levelListeners.forEach((fn) => {
        try {
          fn(rms);
        } catch {}
      });
    };

    (window as any).onAndroidAudioRecordError = (err: string) => {
      console.warn("[Native AudioRecord Error]", err);
    };
  }

  /**
   * Checks if native Android AudioRecord JavascriptInterface bridge is present.
   */
  public isNativeBridgeAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).ZoyaWakeWordBridge ||
        (window as any).AndroidAudioRecordBridge ||
        (window as any).AndroidWakeWordBridge
    );
  }

  private getNativeBridge(): any {
    if (typeof window === "undefined") return null;
    return (
      (window as any).ZoyaWakeWordBridge ||
      (window as any).AndroidAudioRecordBridge ||
      (window as any).AndroidWakeWordBridge ||
      null
    );
  }

  /**
   * Starts the AudioRecord background wake-word detection service.
   */
  public async start(): Promise<void> {
    this.isEnabled = true;
    this.persistSettings();

    const nativeBridge = this.getNativeBridge();
    if (nativeBridge && typeof nativeBridge.startAudioRecordWakeWord === "function") {
      try {
        nativeBridge.startAudioRecordWakeWord(this.targetWakeWord, this.sensitivity);
        this.isListening = true;
        this.notifyState(true, true);
        return;
      } catch (err) {
        console.warn("Failed to start native Android AudioRecord service:", err);
      }
    }

    // On pure Web / PWA without native Android bridge, wake word detection is unified
    // and handled by HandsFreeWakeWordDetector (wakeWordService.ts).
    // Do NOT start a competing WebAudio pipeline or duplicate SpeechRecognition instance here,
    // as running two speech recognizers simultaneously causes continuous mic on/off flickering!
    this.isListening = false;
    this.notifyState(false, false);
  }

  /**
   * Stops the AudioRecord background wake-word detection service.
   */
  public stop(): void {
    this.isEnabled = false;
    this.persistSettings();

    const nativeBridge = this.getNativeBridge();
    if (nativeBridge && typeof nativeBridge.stopAudioRecordWakeWord === "function") {
      try {
        nativeBridge.stopAudioRecordWakeWord();
      } catch {}
    }

    this.stopWebAudioRecordPipeline();
    this.isListening = false;
    this.notifyState(false, this.isNativeBridgeAvailable());
  }

  public setTargetWakeWord(word: WakeWordTarget): void {
    this.targetWakeWord = word;
    this.persistSettings();

    const nativeBridge = this.getNativeBridge();
    if (nativeBridge && typeof nativeBridge.setWakeWord === "function") {
      try {
        nativeBridge.setWakeWord(word);
      } catch {}
    }
  }

  public setSensitivity(val: number): void {
    this.sensitivity = Math.max(0.1, Math.min(1.0, val));
    this.persistSettings();
  }

  public getStatus(): AudioRecordServiceStatus {
    return {
      isListening: this.isListening,
      isNativeBridgeAvailable: this.isNativeBridgeAvailable(),
      targetWakeWord: this.targetWakeWord,
      sensitivity: this.sensitivity,
      sampleRateHz: 16000,
      bufferSizeBytes: 1280, // 640 samples * 2 bytes (16-bit PCM)
      lastRmsLevel: this.lastRmsLevel,
      lastDetectedAt: this.lastDetectedAt || undefined,
    };
  }

  /**
   * Pauses the detection pipeline while Live Voice chat is active to avoid mic contention.
   */
  public pauseForLiveVoice(): void {
    if (this.isListening) {
      const nativeBridge = this.getNativeBridge();
      if (nativeBridge && typeof nativeBridge.stopAudioRecordWakeWord === "function") {
        try {
          nativeBridge.stopAudioRecordWakeWord();
        } catch {}
      }
      this.stopWebAudioRecordPipeline();
      this.isListening = false;
      this.notifyState(false, this.isNativeBridgeAvailable());
    }
  }

  /**
   * Resumes detection after Live Voice chat ends.
   */
  public resumeAfterLiveVoice(): void {
    if (this.isEnabled) {
      setTimeout(() => {
        this.start().catch(() => {});
      }, 700);
    }
  }

  /**
   * Web Audio API PCM processor matching Android AudioRecord 16kHz mono buffer.
   */
  private async startWebAudioRecordPipeline(): Promise<void> {
    if (this.isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      this.audioContext = ctx;

      const sourceNode = ctx.createMediaStreamSource(stream);
      // 1024 or 512 frame buffer size to calculate real-time RMS
      const scriptNode = ctx.createScriptProcessor(1024, 1, 1);
      this.scriptNode = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.lastRmsLevel = rms;

        this.levelListeners.forEach((fn) => {
          try {
            fn(rms);
          } catch {}
        });
      };

      sourceNode.connect(scriptNode);
      scriptNode.connect(ctx.destination);

      // Initialize keyword spotter speech recognition for phonetic wake-word detection
      this.startContinuousSpeechPatternSpotter();

      this.isListening = true;
      this.notifyState(true, false);
    } catch (err) {
      console.warn("Web AudioRecord pipeline initiation failed:", err);
      this.isListening = false;
      this.notifyState(false, false);
    }
  }

  private stopWebAudioRecordPipeline(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.scriptNode) {
      try {
        this.scriptNode.disconnect();
      } catch {}
      this.scriptNode = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.speechRecognizer) {
      try {
        this.speechRecognizer.onend = null;
        this.speechRecognizer.onerror = null;
        this.speechRecognizer.onresult = null;
        this.speechRecognizer.abort();
      } catch {}
      this.speechRecognizer = null;
    }
  }

  private startContinuousSpeechPatternSpotter(): void {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN"; // Covers Hinglish, English, Hindi accents

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += " " + (event.results[i]?.[0]?.transcript || "");
        }
        const clean = transcript.trim().toLowerCase();
        if (!clean) return;

        // Check if matches the target wake-word
        if (this.matchesTargetWakeWord(clean)) {
          const now = Date.now();
          if (now - this.lastDetectedAt > 3000) {
            this.lastDetectedAt = now;
            this.handleWakeDetected({
              wakeWord: this.targetWakeWord,
              confidence: 0.92,
              timestamp: now,
              isNativeAudioRecord: false,
              trailingCommand: this.extractTrailingCommand(clean),
            });
          }
        }
      };

      rec.onerror = () => {
        // Ignored; automatic restart in onend
      };

      rec.onend = () => {
        if (this.isEnabled && this.isListening) {
          this.restartTimeout = setTimeout(() => {
            this.startContinuousSpeechPatternSpotter();
          }, 450);
        }
      };

      this.speechRecognizer = rec;
      rec.start();
    } catch {}
  }

  private matchesTargetWakeWord(text: string): boolean {
    const target = this.targetWakeWord.toLowerCase();

    if (target.includes("hey zoya")) {
      return (
        text.includes("hey zoya") ||
        text.includes("hi zoya") ||
        text.includes("hello zoya") ||
        text.includes("oye zoya") ||
        text.includes("ok zoya") ||
        text.includes("suno zoya") ||
        text.includes("hey joya") ||
        text === "zoya"
      );
    }

    if (target.includes("suno zoya")) {
      return (
        text.includes("suno zoya") ||
        text.includes("suno joya") ||
        text.includes("zoya suno") ||
        text.includes("zoya sun") ||
        text.includes("hey zoya")
      );
    }

    if (target === "zoya") {
      return (
        text.includes("zoya") ||
        text.includes("joya") ||
        text.includes("hey zoya") ||
        text.includes("hi zoya")
      );
    }

    if (target.includes("okay zoya")) {
      return (
        text.includes("okay zoya") ||
        text.includes("ok zoya") ||
        text.includes("ok joya") ||
        text.includes("hey zoya")
      );
    }

    return text.includes(target);
  }

  private extractTrailingCommand(text: string): string {
    const patterns = [
      /^(?:hey|hi|hello|ok|okay|suno|oye)?\s*zoya\s*[,.:!?-]?\s*/i,
      /^(?:hey|hi|hello|ok|okay|suno|oye)?\s*joya\s*[,.:!?-]?\s*/i,
    ];
    let res = text;
    for (const p of patterns) {
      res = res.replace(p, "").trim();
    }
    return res;
  }

  private handleWakeDetected(event: AudioRecordWakeEvent): void {
    this.lastDetectedAt = event.timestamp;
    this.wakeListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.warn("Wake listener error:", e);
      }
    });
  }

  public subscribeWake(listener: WakeListener): () => void {
    this.wakeListeners.add(listener);
    return () => this.wakeListeners.delete(listener);
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.isListening, this.isNativeBridgeAvailable());
    return () => this.stateListeners.delete(listener);
  }

  public subscribeLevel(listener: LevelListener): () => void {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
  }

  private notifyState(isListening: boolean, isNative: boolean): void {
    this.stateListeners.forEach((fn) => {
      try {
        fn(isListening, isNative);
      } catch {}
    });
  }

  /**
   * Manual trigger for testing audio record wake detection in UI.
   */
  public triggerTestWake(wakeWord?: string): void {
    this.handleWakeDetected({
      wakeWord: wakeWord || this.targetWakeWord,
      confidence: 0.99,
      timestamp: Date.now(),
      isNativeAudioRecord: this.isNativeBridgeAvailable(),
      trailingCommand: "test activation",
    });
  }
}

export const androidAudioRecordWakeWordService = new AndroidAudioRecordWakeWordService();
