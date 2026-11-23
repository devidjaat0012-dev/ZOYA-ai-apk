export interface WakeWordMatch {
  wakePhrase: string;
  trailingCommand: string;
  fullTranscript: string;
}

interface WakeWordServiceCallbacks {
  onWakeDetected: (match: WakeWordMatch) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onHeardPreview?: (transcript: string) => void;
}

const WAKE_PATTERNS: RegExp[] = [
  /\b(hey\s+zoya|hi\s+zoya|hello\s+zoya|oye\s+zoya|ok\s+zoya|okay\s+zoya|suno\s+zoya|wake\s+up\s+zoya)\b/i,
  /\b(hey\s+friday|hi\s+friday|hello\s+friday|ok\s+friday|okay\s+friday|wake\s+up\s+friday|friday)\b/i,
  /\b(hey\s+jarvis|hi\s+jarvis|hello\s+jarvis|ok\s+jarvis|okay\s+jarvis|wake\s+up\s+jarvis|jarvis)\b/i,
  /\b(hey\s+venom|hi\s+venom|hello\s+venom|ok\s+venom|we\s+are\s+venom|venom)\b/i,
  /\b(hey\s+google|ok\s+google|okay\s+google|hey\s+gemini|ok\s+gemini)\b/i,
  // Common Hindi/Hinglish phonetic variations transcribed by Web Speech API for "Zoya"
  /\b(hey\s+joya|hi\s+joya|oye\s+joya|ok\s+joya|suno\s+joya|hey\s+zoya\s+baby|zoya\s+sun|zoya\s+suno|zoya\s+start)\b/i,
];

/**
 * Plays a crisp Google Gemini / Assistant style two-note activation chime using Web Audio API.
 */
export function playWakeActivationChime(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1: Warm D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.17);

    // Note 2: Bright A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.11);
    gain2.gain.setValueAtTime(0.001, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.18, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Ignore audio context errors if browser blocked autoplay
  }
}

export function matchWakePhrase(rawTranscript: string): WakeWordMatch | null {
  const clean = rawTranscript.trim();
  if (!clean) return null;

  for (const pattern of WAKE_PATTERNS) {
    const match = pattern.exec(clean);
    if (match && match[0]) {
      const wakePhrase = match[0];
      const afterIndex = (match.index ?? 0) + wakePhrase.length;
      const trailingCommand = clean
        .slice(afterIndex)
        .replace(/^[,.\-!?:\s]+/, "")
        .trim();
      return {
        wakePhrase,
        trailingCommand,
        fullTranscript: clean,
      };
    }
  }

  // Also trigger if the user says "Don't touch my phone" or "Turn off don't touch my phone" directly
  const lower = clean.toLowerCase().replace(/[.,!?]/g, "").trim();
  if (
    /^(turn\s+off\s+)?(don'?t|dont)\s+touch\s+(my\s+)?phone(\s+(on|off|activate|band\s+karo))?$/i.test(lower) ||
    /^(band\s+karo|stop)\s+(don'?t|dont)\s+touch\s+(my\s+)?phone$/i.test(lower)
  ) {
    return {
      wakePhrase: clean,
      trailingCommand: clean,
      fullTranscript: clean,
    };
  }

  // Also trigger if the user simply says "Zoya" or "Joya" as a standalone callout
  if (lower === "zoya" || lower === "joya" || lower === "hello zoya" || lower === "hey zoya") {
    return {
      wakePhrase: clean,
      trailingTranscript: "",
      trailingCommand: "",
      fullTranscript: clean,
    } as WakeWordMatch;
  }

  return null;
}

export class HandsFreeWakeWordDetector {
  private recognition: any = null;
  private isEnabled: boolean = false;
  private isPausedForLiveSession: boolean = false;
  private isRunning: boolean = false;
  private restartTimer: any = null;
  private lastTriggerTimestamp: number = 0;
  private consecutiveErrors: number = 0;
  private lastStartTime: number = 0;
  private callbacks: WakeWordServiceCallbacks;

  constructor(callbacks: WakeWordServiceCallbacks) {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public start(): void {
    this.isEnabled = true;
    this.isPausedForLiveSession = false;
    this.consecutiveErrors = 0;
    this.ensureRunning();
  }

  public stop(): void {
    this.isEnabled = false;
    this.consecutiveErrors = 0;
    this.clearRestartTimer();
    this.stopRecognitionInstance();
    this.callbacks.onListeningStateChange?.(false);
  }

  public pauseForLiveSession(): void {
    this.isPausedForLiveSession = true;
    this.clearRestartTimer();
    this.stopRecognitionInstance();
    this.callbacks.onListeningStateChange?.(false);
  }

  public resumeAfterLiveSession(): void {
    this.isPausedForLiveSession = false;
    this.consecutiveErrors = 0;
    if (this.isEnabled) {
      this.clearRestartTimer();
      this.restartTimer = setTimeout(() => {
        this.ensureRunning();
      }, 1000);
    }
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private stopRecognitionInstance(): void {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isRunning = false;
  }

  private ensureRunning(): void {
    if (!this.isEnabled || this.isPausedForLiveSession || this.isRunning) {
      return;
    }
    if (!this.isSupported()) {
      return;
    }

    this.stopRecognitionInstance();

    try {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN"; // Understands English + Hinglish ("Hey Zoya", "Hey Google", "Oye Zoya")

      rec.onstart = () => {
        this.isRunning = true;
        this.lastStartTime = Date.now();
        this.consecutiveErrors = 0;
        this.callbacks.onListeningStateChange?.(true);
      };

      rec.onresult = (event: any) => {
        if (!this.isEnabled || this.isPausedForLiveSession) return;

        let latestTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript || "";
          latestTranscript += " " + piece;
        }
        const cleaned = latestTranscript.trim();
        if (!cleaned) return;

        this.callbacks.onHeardPreview?.(cleaned);

        const now = Date.now();
        if (now - this.lastTriggerTimestamp < 3000) {
          return;
        }

        const matched = matchWakePhrase(cleaned);
        if (matched) {
          this.lastTriggerTimestamp = now;
          playWakeActivationChime();
          this.pauseForLiveSession();
          this.callbacks.onWakeDetected(matched);
        }
      };

      rec.onerror = (event: any) => {
        this.isRunning = false;
        const errCode = String(event?.error || "");
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          // If permission is denied or blocked, permanently stop polling to prevent infinite thrashing
          this.isEnabled = false;
          this.clearRestartTimer();
          this.callbacks.onListeningStateChange?.(false);
          return;
        }
        this.consecutiveErrors++;
      };

      rec.onend = () => {
        this.isRunning = false;
        if (this.isEnabled && !this.isPausedForLiveSession) {
          this.clearRestartTimer();
          // Calculate intelligent restart delay to eliminate rapid mic flickers
          let delay = 1500;
          if (this.consecutiveErrors >= 3) {
            delay = 8000; // Back off on repeated errors
          } else if (Date.now() - this.lastStartTime < 1000) {
            delay = 3000; // Back off if it terminated abnormally fast
          }

          this.restartTimer = setTimeout(() => {
            this.ensureRunning();
          }, delay);
        } else {
          this.callbacks.onListeningStateChange?.(false);
        }
      };

      this.recognition = rec;
      rec.start();
    } catch {
      this.isRunning = false;
      this.consecutiveErrors++;
      if (this.isEnabled && !this.isPausedForLiveSession) {
        this.clearRestartTimer();
        const delay = this.consecutiveErrors >= 3 ? 8000 : 3000;
        this.restartTimer = setTimeout(() => {
          this.ensureRunning();
        }, delay);
      }
    }
  }
}
