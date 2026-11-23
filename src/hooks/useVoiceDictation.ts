import { useState, useRef, useEffect, useCallback } from "react";

export type DictationLanguage = "hi-IN" | "en-IN" | "en-US";

export interface DictationLanguageOption {
  code: DictationLanguage;
  label: string;
  flag: string;
}

export const DICTATION_LANGUAGES: DictationLanguageOption[] = [
  { code: "hi-IN", label: "हिन्दी / Hinglish", flag: "🇮🇳" },
  { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
];

/**
 * Plays a pleasant modern audio chime when dictation starts, stops, or errors.
 */
function playChime(type: "start" | "stop" | "error" = "start") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "start") {
      // Pleasant rising tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(784, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "stop") {
      // Subtle downward tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(659, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Soft alert tone
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 400);
  } catch {}
}

export interface UseVoiceDictationOptions {
  onTranscriptUpdate?: (fullText: string, interimText: string) => void;
  onFinalResult?: (finalSegment: string) => void;
  defaultLanguage?: DictationLanguage;
}

export function useVoiceDictation({
  onTranscriptUpdate,
  onFinalResult,
  defaultLanguage = "hi-IN",
}: UseVoiceDictationOptions = {}) {
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [language, setLanguage] = useState<DictationLanguage>(() => {
    try {
      const saved = localStorage.getItem("zoya_dictation_lang");
      if (saved && (saved === "hi-IN" || saved === "en-IN" || saved === "en-US")) {
        return saved as DictationLanguage;
      }
    } catch {}
    return defaultLanguage;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>("");
  const finalSegmentsRef = useRef<string>("");

  // Check Web Speech API availability
  const isSupported =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Persist language choice
  const handleSetLanguage = useCallback((newLang: DictationLanguage) => {
    setLanguage(newLang);
    try {
      localStorage.setItem("zoya_dictation_lang", newLang);
    } catch {}
  }, []);

  const stopDictation = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsDictating(false);
    setInterimTranscript("");
    try {
      window.dispatchEvent(new CustomEvent("zoya_dictation_state", { detail: { isDictating: false } }));
    } catch {}
    playChime("stop");
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([20, 20]);
      }
    } catch {}
  }, []);

  const startDictation = useCallback(
    (existingText: string = "") => {
      if (!isSupported) {
        setErrorMessage(
          "Voice dictation is not supported in this browser. Please use Chrome, Edge, Safari, or an Android browser."
        );
        playChime("error");
        return;
      }

      // Stop previous instance if running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }

      setErrorMessage(null);
      isManuallyStoppedRef.current = false;
      baseTextRef.current = existingText ? existingText.trimEnd() + " " : "";
      finalSegmentsRef.current = "";
      setInterimTranscript("");

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = language;

        recognition.onstart = () => {
          setIsDictating(true);
          try {
            window.dispatchEvent(new CustomEvent("zoya_dictation_state", { detail: { isDictating: true } }));
          } catch {}
          playChime("start");
          try {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([30]);
            }
          } catch {}
        };

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let newFinalAccum = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptChunk = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              newFinalAccum += transcriptChunk + " ";
            } else {
              currentInterim += transcriptChunk;
            }
          }

          if (newFinalAccum) {
            finalSegmentsRef.current += newFinalAccum;
            onFinalResult?.(newFinalAccum.trim());
          }

          setInterimTranscript(currentInterim);

          const fullCombined =
            baseTextRef.current + finalSegmentsRef.current + currentInterim;
          onTranscriptUpdate?.(fullCombined, currentInterim);
        };

        recognition.onerror = (event: any) => {
          const err = event.error;
          if (err === "no-speech") {
            // Ignore benign no-speech timeouts, keep dictating
            return;
          }
          try {
            window.dispatchEvent(new CustomEvent("zoya_dictation_state", { detail: { isDictating: false } }));
          } catch {}
          if (err === "not-allowed" || err === "service-not-allowed") {
            setErrorMessage(
              "Microphone permission was denied. Please allow microphone permissions in your browser or device settings."
            );
          } else if (err === "network") {
            setErrorMessage(
              "Speech network error. Please check your internet connection."
            );
          } else if (err !== "aborted") {
            setErrorMessage(`Speech recognition error: ${err}`);
          }
          playChime("error");
          setIsDictating(false);
          setInterimTranscript("");
        };

        recognition.onend = () => {
          setIsDictating(false);
          setInterimTranscript("");
          try {
            window.dispatchEvent(new CustomEvent("zoya_dictation_state", { detail: { isDictating: false } }));
          } catch {}
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Could not start microphone speech recognition."
        );
        playChime("error");
        setIsDictating(false);
      }
    },
    [isSupported, language, onFinalResult, onTranscriptUpdate]
  );

  const toggleDictation = useCallback(
    (existingText: string = "") => {
      if (isDictating) {
        stopDictation();
      } else {
        startDictation(existingText);
      }
    },
    [isDictating, startDictation, stopDictation]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        window.dispatchEvent(new CustomEvent("zoya_dictation_state", { detail: { isDictating: false } }));
      } catch {}
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return {
    isDictating,
    interimTranscript,
    language,
    setLanguage: handleSetLanguage,
    errorMessage,
    clearError: () => setErrorMessage(null),
    isSupported,
    startDictation,
    stopDictation,
    toggleDictation,
  };
}
