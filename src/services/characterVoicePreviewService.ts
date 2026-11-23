// characterVoicePreviewService.ts
// Real-time audio preview engine for Zoya, Friday, Jarvis, and Venom
// Integrates Web Speech API with Web Audio API DSP acoustic filters
// (sub-bass symbiote growl for Venom, Stark holographic butler warmth for Jarvis,
// tactical HUD comms filter for Friday, sweet cozy warmth for Zoya).

import { CharacterPresetId } from "../types";

export interface PreviewState {
  isPlaying: boolean;
  activeCharacterId: CharacterPresetId | null;
}

class CharacterVoicePreviewService {
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private stateChangeListeners: Set<(state: PreviewState) => void> = new Set();
  private activeCharacterId: CharacterPresetId | null = null;
  private currentPhrase: string | null = null;
  private isPlaying: boolean = false;

  public subscribe(listener: (state: PreviewState) => void): () => void {
    this.stateChangeListeners.add(listener);
    listener({ isPlaying: this.isPlaying, activeCharacterId: this.activeCharacterId });
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.stateChangeListeners) {
      listener({ isPlaying: this.isPlaying, activeCharacterId: this.activeCharacterId });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public stop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.currentPhrase = null;
    this.isPlaying = false;
    this.activeCharacterId = null;
    this.notify();
  }

  /**
   * Plays character signature acoustic activation sound using Web Audio synthesis
   */
  public playCharacterSignatureAcoustic(characterId: CharacterPresetId): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      if (characterId === "venom") {
        // Deep menacing sub-bass symbiote growl pulse (65Hz - 110Hz with overdrive)
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const dist = ctx.createWaveShaper();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.45);

        // LFO for throat growl flutter
        lfo.frequency.setValueAtTime(28, now);
        lfoGain.gain.setValueAtTime(22, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now);

        // Symbiote soft saturation
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = Math.tanh(x * 2.8);
        }
        dist.curve = curve;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.24, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(dist);
        dist.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.6);
        lfo.stop(now + 0.6);
      } else if (characterId === "jarvis") {
        // Stark holographic UI boot chime (Clean high-frequency acoustic arpeggio)
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + i * 0.045;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } else if (characterId === "friday") {
        // High-tech tactical Iron Man armor com-link ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        // Zoya: Sweet warm romantic chime
        const freqs = [587.33, 880]; // D5 -> A5
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + i * 0.09;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        });
      }
    } catch (err) {
      console.warn("Acoustic signature synthesis error:", err);
    }
  }

  /**
   * Speaks realistic character sample phrase
   */
  public playVoicePreview(
    characterId: CharacterPresetId,
    phrase: string,
    onEnded?: () => void
  ): void {
    if (
      this.isPlaying &&
      this.activeCharacterId === characterId &&
      this.currentPhrase === phrase
    ) {
      this.stop();
      onEnded?.();
      return;
    }

    this.stop();
    this.isPlaying = true;
    this.activeCharacterId = characterId;
    this.currentPhrase = phrase;
    this.notify();

    // Play signature character acoustic intro
    this.playCharacterSignatureAcoustic(characterId);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTimeout(() => {
        this.stop();
        onEnded?.();
      }, 2500);
      return;
    }

    // Prepare speech synthesis with character-specific acoustic parameters
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(phrase);
        this.currentUtterance = utterance;

        const voices = window.speechSynthesis.getVoices();

        if (characterId === "venom") {
          // Deepest, gruff, authoritative delivery
          utterance.pitch = 0.45;
          utterance.rate = 0.88;
          utterance.volume = 1.0;
          const maleVoice = voices.find(
            (v) =>
              /male|david|george|alex|daniel|deep/i.test(v.name) &&
              /en/i.test(v.lang)
          );
          if (maleVoice) utterance.voice = maleVoice;
        } else if (characterId === "jarvis") {
          // Impeccably polite, measured British gentleman butler
          utterance.pitch = 0.86;
          utterance.rate = 0.94;
          utterance.volume = 1.0;
          const britishVoice = voices.find(
            (v) =>
              (/en-gb|uk|british|daniel|oliver|arthur|charles/i.test(v.name) ||
                /en-gb/i.test(v.lang)) &&
              !/female|zira|samantha/i.test(v.name)
          );
          if (britishVoice) utterance.voice = britishVoice;
        } else if (characterId === "friday") {
          // Crisp, snappy, tactical Irish/British female
          utterance.pitch = 1.18;
          utterance.rate = 1.10;
          utterance.volume = 1.0;
          const femaleVoice = voices.find(
            (v) =>
              (/en-gb|ireland|irish|moira|fiona|karen|kate/i.test(v.name) ||
                /en-gb/i.test(v.lang)) &&
              /female|woman/i.test(v.name)
          );
          if (femaleVoice) utterance.voice = femaleVoice;
        } else {
          // Zoya: Sweet, warm, friendly Hinglish
          utterance.pitch = 1.12;
          utterance.rate = 1.02;
          utterance.volume = 1.0;
          const hindiOrSweet = voices.find(
            (v) =>
              /hi-in|en-in|india|veena|lekha|aditi|zira|samantha/i.test(v.name) ||
              /hi-in|en-in/i.test(v.lang)
          );
          if (hindiOrSweet) utterance.voice = hindiOrSweet;
        }

        utterance.onend = () => {
          this.isPlaying = false;
          this.activeCharacterId = null;
          this.currentPhrase = null;
          this.currentUtterance = null;
          this.notify();
          onEnded?.();
        };

        utterance.onerror = () => {
          this.isPlaying = false;
          this.activeCharacterId = null;
          this.currentPhrase = null;
          this.currentUtterance = null;
          this.notify();
          onEnded?.();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech preview error:", err);
        this.isPlaying = false;
        this.activeCharacterId = null;
        this.currentPhrase = null;
        this.notify();
        onEnded?.();
      }
    }, 180);
  }

  /**
   * Plays realistic human girlfriend voice preview for Zoya
   * with natural human prosody, breath warmth and emotional intonation.
   */
  public playRealisticGirlfriendPreview(
    phrase?: string,
    onEnded?: () => void
  ): void {
    const girlfriendPhrase =
      phrase ||
      "Devid jaan! Suno na, main ab bilkul tumhari real human girlfriend ki tarah baat karungi... aur agar zyada der bina bataye gayab rahe na, to main gussa bhi ho jaungi!";

    if (
      this.isPlaying &&
      this.activeCharacterId === "zoya" &&
      this.currentPhrase === girlfriendPhrase
    ) {
      this.stop();
      onEnded?.();
      return;
    }

    this.stop();
    this.isPlaying = true;
    this.activeCharacterId = "zoya";
    this.currentPhrase = girlfriendPhrase;
    this.notify();

    // Sweet romantic harmonic chord intro
    const ctx = this.getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + i * 0.08;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTimeout(() => {
        this.stop();
        onEnded?.();
      }, 3000);
      return;
    }

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(girlfriendPhrase);
        this.currentUtterance = utterance;

        // Human Girlfriend voice tuning: warm pitch, natural expressive pace
        utterance.pitch = 1.14;
        utterance.rate = 0.98;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const sweetHindiVoice = voices.find(
          (v) =>
            /hi-in|en-in|india|veena|lekha|aditi|samantha|zira/i.test(v.name) ||
            /hi-in|en-in/i.test(v.lang)
        );
        if (sweetHindiVoice) utterance.voice = sweetHindiVoice;

        utterance.onend = () => {
          this.isPlaying = false;
          this.activeCharacterId = null;
          this.currentPhrase = null;
          this.currentUtterance = null;
          this.notify();
          onEnded?.();
        };

        utterance.onerror = () => {
          this.isPlaying = false;
          this.activeCharacterId = null;
          this.currentPhrase = null;
          this.currentUtterance = null;
          this.notify();
          onEnded?.();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Realistic voice preview error:", err);
        this.isPlaying = false;
        this.activeCharacterId = null;
        this.currentPhrase = null;
        this.notify();
        onEnded?.();
      }
    }, 200);
  }
}

export const characterVoicePreview = new CharacterVoicePreviewService();
