// AudioStreamer: High-performance audio input & output pipeline for real-time voice
// Handles 16kHz PCM input streaming, 24kHz PCM gapless playback, interruption handling,
// background/minimized browser keep-alive carrier, MediaSession lock-screen integration,
// and frequency/volume analysis for UI visualizers.

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 4096;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

// Create a tiny 1-second silent WAV data URI so HTML5 <audio loop> keeps the OS media session alive when browser is minimized
function createSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Fill with near-zero imperceptible dither so mobile/desktop OS never auto-suspends the audio stream
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true);
  }

  const bytes = new Uint8Array(buffer);
  return `data:audio/wav;base64,${uint8ToBase64(bytes)}`;
}

function downsampleTo16k(
  inputData: Float32Array,
  inputSampleRate: number
): Int16Array {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (
      let i = offsetInput;
      i < nextOffsetInput && i < inputData.length;
      i++
    ) {
      accum += inputData[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

export interface AudioStreamerCallbacks {
  onInputChunk?: (base64Pcm16: string) => void;
  onRawInputFrame?: (samples: Float32Array, sampleRate: number) => void;
  onInputLevel?: (level: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export class AudioStreamer {
  // Input (Microphone)
  private inputContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private inputFreqData: Uint8Array | null = null;

  // Output (Speaker 24kHz)
  private outputContext: AudioContext | null = null;
  private outputGain: GainNode | null = null;
  private characterInputGain: GainNode | null = null;
  private lowCutFilter: BiquadFilterNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midPresenceFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private highCutFilter: BiquadFilterNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private waveShaperGain: GainNode | null = null;
  private cleanPathGain: GainNode | null = null;
  private characterCompressor: DynamicsCompressorNode | null = null;
  private symbioteDelay: DelayNode | null = null;
  private symbioteDelayGain: GainNode | null = null;
  private activeCharacter: "zoya" | "friday" | "jarvis" | "venom" = "zoya";
  private outputAnalyser: AnalyserNode | null = null;
  private outputFreqData: Uint8Array | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime: number = 0;
  private isPlaybackActive: boolean = false;
  private hangoverTimer: any = null;

  // Background Keep-Alive Carrier (allows talking when browser is minimized / backgrounded)
  private bgAudioElement: HTMLAudioElement | null = null;
  private bgKeepAliveOsc: OscillatorNode | null = null;
  private bgHeartbeatWorker: Worker | null = null;
  public backgroundAccessEnabled: boolean = true;

  // Wake lock & state
  private wakeLock: any = null;
  public isMuted: boolean = false;
  public volume: number = 1.0;
  public isMicMuted: boolean = false;

  private callbacks: AudioStreamerCallbacks;
  private boundVisibilityHandler: () => void;

  constructor(callbacks: AudioStreamerCallbacks = {}) {
    this.callbacks = callbacks;
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.boundVisibilityHandler
      );
    }
  }

  private handleVisibilityChange() {
    // Keep audio contexts running BOTH when visible AND when minimized in background!
    if (this.backgroundAccessEnabled || document.visibilityState === "visible") {
      this.ensureContextsRunning();
    }
    if (document.visibilityState === "visible") {
      this.acquireWakeLock();
    }
  }

  public ensureContextsRunning() {
    if (this.inputContext && this.inputContext.state === "suspended") {
      this.inputContext.resume().catch(() => {});
    }
    if (this.outputContext && this.outputContext.state === "suspended") {
      this.outputContext.resume().catch(() => {});
    }
    if (this.bgAudioElement && this.bgAudioElement.paused && this.mediaStream) {
      this.bgAudioElement.play().catch(() => {});
    }
  }

  private startBackgroundKeepAlive() {
    // 1. HTML5 <audio loop> carrier so mobile/desktop browsers treat this tab as an active background voice call
    if (!this.bgAudioElement && typeof document !== "undefined") {
      try {
        const audio = document.createElement("audio");
        audio.src = createSilentWavDataUri();
        audio.loop = true;
        audio.volume = 0.01;
        audio.setAttribute("playsinline", "true");
        audio.play().catch(() => {});
        this.bgAudioElement = audio;
      } catch {}
    } else if (this.bgAudioElement && this.bgAudioElement.paused) {
      this.bgAudioElement.play().catch(() => {});
    }

    // 2. Register MediaSession metadata so OS lock screen / background tray keeps Zoya Live Voice alive
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Zoya — Live Voice Active",
          artist: "Background Voice Mode ON (Speak Anytime)",
          album: "Zoya AI Companion",
        });
        navigator.mediaSession.playbackState = "playing";
        navigator.mediaSession.setActionHandler("play", () => {
          this.ensureContextsRunning();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          this.ensureContextsRunning();
        });
      } catch {}
    }

    // 3. Un-throttled Web Worker heartbeat (browsers throttle window.setInterval when minimized, but NOT Web Workers!)
    if (!this.bgHeartbeatWorker && typeof Worker !== "undefined") {
      try {
        const workerCode = `
          let timer = setInterval(() => {
            postMessage("tick");
          }, 1200);
          onmessage = (e) => {
            if (e.data === "stop") clearInterval(timer);
          };
        `;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = () => {
          if (this.backgroundAccessEnabled) {
            this.ensureContextsRunning();
          }
        };
        this.bgHeartbeatWorker = worker;
      } catch {}
    }
  }

  private stopBackgroundKeepAlive() {
    if (this.bgHeartbeatWorker) {
      try {
        this.bgHeartbeatWorker.postMessage("stop");
        this.bgHeartbeatWorker.terminate();
      } catch {}
      this.bgHeartbeatWorker = null;
    }

    if (this.bgKeepAliveOsc) {
      try {
        this.bgKeepAliveOsc.stop();
        this.bgKeepAliveOsc.disconnect();
      } catch {}
      this.bgKeepAliveOsc = null;
    }

    if (this.bgAudioElement) {
      try {
        this.bgAudioElement.pause();
        this.bgAudioElement.src = "";
      } catch {}
      this.bgAudioElement = null;
    }

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
      } catch {}
    }
  }

  public setCallbacks(callbacks: AudioStreamerCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // --- WAKE LOCK ---
  private async acquireWakeLock() {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch {
        // Safe to ignore if unsupported or restricted
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch {}
      this.wakeLock = null;
    }
  }

  // --- INITIALIZE & START MICROPHONE INPUT ---
  public async startInput(): Promise<void> {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!this.inputContext) {
      try {
        this.inputContext = new AudioContextClass({ sampleRate: 16000 });
      } catch {
        this.inputContext = new AudioContextClass();
      }
      this.inputContext.onstatechange = () => {
        if (
          this.backgroundAccessEnabled &&
          this.inputContext?.state === "suspended"
        ) {
          this.inputContext.resume().catch(() => {});
        }
      };
    }

    if (this.inputContext.state === "suspended") {
      await this.inputContext.resume().catch(() => {});
    }

    if (!this.mediaStream) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    if (!this.micSource && this.inputContext && this.mediaStream) {
      this.micSource = this.inputContext.createMediaStreamSource(
        this.mediaStream
      );
      this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

      this.inputAnalyser = this.inputContext.createAnalyser();
      this.inputAnalyser.fftSize = 64;
      this.inputFreqData = new Uint8Array(
        this.inputAnalyser.frequencyBinCount
      );
      this.micSource.connect(this.inputAnalyser);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Compute volume / RMS
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onInputLevel?.(rms);

        // If assistant is speaking or mic is locally muted, don't send mic stream to prevent echo
        if (this.isPlaybackActive || this.isMicMuted) {
          return;
        }

        const rawSampleRate = this.inputContext?.sampleRate || 16000;
        this.callbacks.onRawInputFrame?.(inputData, rawSampleRate);

        // Downsample to clean 16000Hz PCM
        const pcm16 = downsampleTo16k(
          inputData,
          rawSampleRate
        );
        const uint8 = new Uint8Array(
          pcm16.buffer,
          pcm16.byteOffset,
          pcm16.byteLength
        );
        const base64 = uint8ToBase64(uint8);

        this.callbacks.onInputChunk?.(base64);
      };

      this.micSource.connect(this.processor);

      // Mute local loopback to avoid feedback through device speaker
      const muteGain = this.inputContext.createGain();
      muteGain.gain.value = 0;
      this.processor.connect(muteGain);
      muteGain.connect(this.inputContext.destination);
    }

    await this.acquireWakeLock();
    this.startBackgroundKeepAlive();
  }

  // --- STOP INPUT (CLEANLY RELEASE MICROPHONE HARDWARE) ---
  public stopInput(): void {
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }
    if (this.inputContext && this.inputContext.state !== "closed") {
      try {
        this.inputContext.close().catch(() => {});
      } catch {}
      this.inputContext = null;
    }
  }

  // --- INITIALIZE OUTPUT (SPEAKER 24kHz) ---
  public async initOutput(): Promise<void> {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!this.outputContext) {
      try {
        this.outputContext = new AudioContextClass({ sampleRate: 24000 });
      } catch {
        this.outputContext = new AudioContextClass();
      }
      this.outputContext.onstatechange = () => {
        if (
          this.backgroundAccessEnabled &&
          this.outputContext?.state === "suspended"
        ) {
          this.outputContext.resume().catch(() => {});
        }
      };
    }

    if (this.outputContext.state === "suspended") {
      await this.outputContext.resume().catch(() => {});
    }

    if (!this.outputGain && this.outputContext) {
      this.outputGain = this.outputContext.createGain();
      this.outputGain.gain.value = this.isMuted ? 0 : this.volume;

      // --- Character Voice Acoustic Realism DSP Processing Graph ---
      this.characterInputGain = this.outputContext.createGain();
      this.characterInputGain.gain.value = 1.0;

      this.lowCutFilter = this.outputContext.createBiquadFilter();
      this.bassFilter = this.outputContext.createBiquadFilter();
      this.midPresenceFilter = this.outputContext.createBiquadFilter();
      this.trebleFilter = this.outputContext.createBiquadFilter();
      this.highCutFilter = this.outputContext.createBiquadFilter();
      this.cleanPathGain = this.outputContext.createGain();
      this.waveShaper = this.outputContext.createWaveShaper();
      this.waveShaperGain = this.outputContext.createGain();
      this.symbioteDelay = this.outputContext.createDelay(0.1);
      this.symbioteDelayGain = this.outputContext.createGain();
      this.characterCompressor = this.outputContext.createDynamicsCompressor();

      // DSP Node Connections:
      // characterInputGain -> lowCutFilter -> bassFilter -> midPresenceFilter -> trebleFilter -> highCutFilter
      this.characterInputGain.connect(this.lowCutFilter);
      this.lowCutFilter.connect(this.bassFilter);
      this.bassFilter.connect(this.midPresenceFilter);
      this.midPresenceFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.highCutFilter);

      // Clean Path -> Compressor
      this.highCutFilter.connect(this.cleanPathGain);
      this.cleanPathGain.connect(this.characterCompressor);

      // Symbiote Growl & Saturation Path (Venom)
      this.highCutFilter.connect(this.waveShaper);
      this.waveShaper.connect(this.waveShaperGain);
      this.waveShaperGain.connect(this.characterCompressor);

      // Symbiote Dual-Voice / Hologram Delay Path
      this.highCutFilter.connect(this.symbioteDelay);
      this.symbioteDelay.connect(this.symbioteDelayGain);
      this.symbioteDelayGain.connect(this.characterCompressor);

      // Compressor -> Master Output Gain
      this.characterCompressor.connect(this.outputGain);

      // Apply initial acoustic profile
      this.applyCharacterDSP(this.activeCharacter);

      this.outputAnalyser = this.outputContext.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.outputFreqData = new Uint8Array(
        this.outputAnalyser.frequencyBinCount
      );

      this.outputGain.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputContext.destination);

      // Imperceptible sub-audible keep-alive oscillator so outputContext never suspends in minimized browser
      try {
        const osc = this.outputContext.createOscillator();
        const silentGain = this.outputContext.createGain();
        osc.frequency.value = 20;
        silentGain.gain.value = 0.00001;
        osc.connect(silentGain);
        silentGain.connect(this.outputContext.destination);
        osc.start();
        this.bgKeepAliveOsc = osc;
      } catch {}

      this.nextPlayTime = this.outputContext.currentTime;
    }
  }

  // --- CHARACTER ACOUSTIC DSP TUNING ---
  private applyCharacterDSP(character: "zoya" | "friday" | "jarvis" | "venom"): void {
    if (
      !this.outputContext ||
      !this.lowCutFilter ||
      !this.bassFilter ||
      !this.midPresenceFilter ||
      !this.trebleFilter ||
      !this.highCutFilter ||
      !this.cleanPathGain ||
      !this.waveShaper ||
      !this.waveShaperGain ||
      !this.symbioteDelay ||
      !this.symbioteDelayGain ||
      !this.characterCompressor
    ) {
      return;
    }

    const t = this.outputContext.currentTime;

    if (character === "venom") {
      // 1. VENOM: Monstrous, terrifyingly deep, movie-accurate symbiote voice with sub-octave rumble & wet rasp
      this.lowCutFilter.type = "highpass";
      this.lowCutFilter.frequency.setValueAtTime(32, t); // Allow 32Hz deep chest vibration

      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.setValueAtTime(120, t);
      this.bassFilter.gain.setValueAtTime(14.5, t); // Massive sub-bass symbiote earthquake rumble

      this.midPresenceFilter.type = "peaking";
      this.midPresenceFilter.frequency.setValueAtTime(240, t);
      this.midPresenceFilter.Q.setValueAtTime(1.8, t);
      this.midPresenceFilter.gain.setValueAtTime(8.5, t); // Guttural predator throat rasp resonance

      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.setValueAtTime(4800, t);
      this.trebleFilter.gain.setValueAtTime(-5.5, t); // Darken tone, eliminate thin tinny sibilance

      this.highCutFilter.type = "lowpass";
      this.highCutFilter.frequency.setValueAtTime(7200, t); // Retain pure heavy dark creature body

      // Symbiote aggressive organic saturation curve (Tom Hardy alien vocal cord rasp)
      const nSamples = 1024;
      const curve = new Float32Array(nSamples);
      for (let i = 0; i < nSamples; i++) {
        const x = (i * 2) / nSamples - 1;
        // Non-linear asymmetric saturation for organic monster vocal cord rasp
        curve[i] = Math.tanh(x * 2.8) * 0.92 + 0.08 * Math.sin(x * Math.PI * 2);
      }
      this.waveShaper.curve = curve;
      this.waveShaperGain.gain.setValueAtTime(0.48, t);
      this.cleanPathGain.gain.setValueAtTime(0.64, t);

      // Dual-entity symbiote slapback delay (creates the iconic "WE ARE VENOM" dual vocal-cord doubling)
      this.symbioteDelay.delayTime.setValueAtTime(0.026, t);
      this.symbioteDelayGain.gain.setValueAtTime(0.36, t);

      // Heavy punchy limiter/compressor for thunderous movie dialog presence
      this.characterCompressor.threshold.setValueAtTime(-20, t);
      this.characterCompressor.knee.setValueAtTime(10, t);
      this.characterCompressor.ratio.setValueAtTime(5.5, t);
      this.characterCompressor.attack.setValueAtTime(0.003, t);
      this.characterCompressor.release.setValueAtTime(0.09, t);
    } else if (character === "jarvis") {
      // 2. JARVIS: Refined, impeccably polite British gentleman butler acoustics with pristine studio warmth
      this.lowCutFilter.type = "highpass";
      this.lowCutFilter.frequency.setValueAtTime(75, t);

      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.setValueAtTime(260, t);
      this.bassFilter.gain.setValueAtTime(3.5, t); // Warm British radio broadcast warmth

      this.midPresenceFilter.type = "peaking";
      this.midPresenceFilter.frequency.setValueAtTime(2700, t);
      this.midPresenceFilter.Q.setValueAtTime(1.1, t);
      this.midPresenceFilter.gain.setValueAtTime(3.2, t); // Articulate Paul Bettany diction

      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.setValueAtTime(7600, t);
      this.trebleFilter.gain.setValueAtTime(3.8, t); // Pristine holographic AI air

      this.highCutFilter.type = "lowpass";
      this.highCutFilter.frequency.setValueAtTime(19000, t);

      this.waveShaperGain.gain.setValueAtTime(0.0, t);
      this.cleanPathGain.gain.setValueAtTime(1.0, t);

      // Stark laboratory holographic room reflection
      this.symbioteDelay.delayTime.setValueAtTime(0.016, t);
      this.symbioteDelayGain.gain.setValueAtTime(0.10, t);

      // Elegant, smooth executive compression
      this.characterCompressor.threshold.setValueAtTime(-20, t);
      this.characterCompressor.knee.setValueAtTime(20, t);
      this.characterCompressor.ratio.setValueAtTime(2.2, t);
      this.characterCompressor.attack.setValueAtTime(0.012, t);
      this.characterCompressor.release.setValueAtTime(0.16, t);
    } else if (character === "friday") {
      // 3. FRIDAY: High-tech Iron Man HUD com-link, crisp Irish tactical delivery, zero muddiness
      this.lowCutFilter.type = "highpass";
      this.lowCutFilter.frequency.setValueAtTime(160, t); // Strip low rumble for tactical coms

      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.setValueAtTime(280, t);
      this.bassFilter.gain.setValueAtTime(-1.5, t);

      this.midPresenceFilter.type = "peaking";
      this.midPresenceFilter.frequency.setValueAtTime(3300, t);
      this.midPresenceFilter.Q.setValueAtTime(1.3, t);
      this.midPresenceFilter.gain.setValueAtTime(4.6, t); // Tactical HUD intelligibility

      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.setValueAtTime(9200, t);
      this.trebleFilter.gain.setValueAtTime(4.2, t); // Armor HUD air sheen

      this.highCutFilter.type = "lowpass";
      this.highCutFilter.frequency.setValueAtTime(16000, t);

      this.waveShaperGain.gain.setValueAtTime(0.0, t);
      this.cleanPathGain.gain.setValueAtTime(1.0, t);

      this.symbioteDelay.delayTime.setValueAtTime(0.010, t);
      this.symbioteDelayGain.gain.setValueAtTime(0.05, t);

      // Snappy tactical comms compression
      this.characterCompressor.threshold.setValueAtTime(-16, t);
      this.characterCompressor.knee.setValueAtTime(8, t);
      this.characterCompressor.ratio.setValueAtTime(3.2, t);
      this.characterCompressor.attack.setValueAtTime(0.003, t);
      this.characterCompressor.release.setValueAtTime(0.045, t);
    } else {
      // 4. ZOYA: Intimate, sweet, cozy FaceTime girlfriend presence
      this.lowCutFilter.type = "highpass";
      this.lowCutFilter.frequency.setValueAtTime(70, t);

      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.setValueAtTime(220, t);
      this.bassFilter.gain.setValueAtTime(2.6, t); // Intimate late-night proximity

      this.midPresenceFilter.type = "peaking";
      this.midPresenceFilter.frequency.setValueAtTime(2300, t);
      this.midPresenceFilter.Q.setValueAtTime(1.0, t);
      this.midPresenceFilter.gain.setValueAtTime(2.2, t); // Sweet vocal center

      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.setValueAtTime(11000, t);
      this.trebleFilter.gain.setValueAtTime(-1.2, t); // Soft, comforting, non-fatiguing earphone highs

      this.highCutFilter.type = "lowpass";
      this.highCutFilter.frequency.setValueAtTime(20000, t);

      this.waveShaperGain.gain.setValueAtTime(0.0, t);
      this.cleanPathGain.gain.setValueAtTime(1.0, t);

      this.symbioteDelayGain.gain.setValueAtTime(0.0, t);

      // Warm, natural conversational compression
      this.characterCompressor.threshold.setValueAtTime(-22, t);
      this.characterCompressor.knee.setValueAtTime(18, t);
      this.characterCompressor.ratio.setValueAtTime(2.0, t);
      this.characterCompressor.attack.setValueAtTime(0.02, t);
      this.characterCompressor.release.setValueAtTime(0.2, t);
    }
  }

  public setCharacter(character: "zoya" | "friday" | "jarvis" | "venom"): void {
    this.activeCharacter = character;
    if (this.outputContext) {
      this.applyCharacterDSP(character);
    }
  }

  public getCharacter(): "zoya" | "friday" | "jarvis" | "venom" {
    return this.activeCharacter;
  }

  // --- PLAY RECEIVED 24kHz PCM CHUNK ---
  public playChunk(base64Data: string): void {
    if (!this.outputContext) {
      this.initOutput().then(() => this.playChunk(base64Data));
      return;
    }

    if (this.outputContext.state === "suspended") {
      this.outputContext.resume().catch(() => {});
    }

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = this.outputContext.createBuffer(
        1,
        pcm16.length,
        24000
      );
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      const source = this.outputContext.createBufferSource();
      source.buffer = audioBuffer;

      const isVenom = this.activeCharacter === "venom";
      const pitchRate = isVenom ? 0.84 : 1.0;
      source.playbackRate.value = pitchRate;

      if (this.characterInputGain) {
        source.connect(this.characterInputGain);
      } else if (this.outputGain) {
        this.outputGain.gain.value = this.isMuted ? 0 : this.volume;
        source.connect(this.outputGain);
      } else {
        source.connect(this.outputContext.destination);
      }

      const now = this.outputContext.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.035;
      }

      const startTime = this.nextPlayTime;
      source.start(startTime);
      const effectiveDuration = audioBuffer.duration / pitchRate;
      this.nextPlayTime += effectiveDuration;

      this.activeSources.add(source);

      // Hollywood Venom Dual-Voice Layer: Parallel sub-harmonic deep monster octave (Tom Hardy symbiote voice)
      if (isVenom && this.characterInputGain) {
        try {
          const subSource = this.outputContext.createBufferSource();
          subSource.buffer = audioBuffer;
          subSource.playbackRate.value = 0.74; // Guttural deep sub-pitch

          const subFilter = this.outputContext.createBiquadFilter();
          subFilter.type = "lowpass";
          subFilter.frequency.value = 520; // Only heavy sub-bass chest rumble

          const subGain = this.outputContext.createGain();
          subGain.gain.value = 0.38; // Dual-entity movie blend

          subSource.connect(subFilter);
          subFilter.connect(subGain);
          subGain.connect(this.characterInputGain);

          subSource.start(startTime);
          this.activeSources.add(subSource);
          subSource.onended = () => {
            this.activeSources.delete(subSource);
          };
        } catch (e) {
          console.warn("Venom sub-layer init:", e);
        }
      }

      if (!this.isPlaybackActive) {
        this.isPlaybackActive = true;
        this.callbacks.onPlaybackStateChange?.(true);
      }

      if (this.hangoverTimer) {
        clearTimeout(this.hangoverTimer);
        this.hangoverTimer = null;
      }

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          if (this.hangoverTimer) clearTimeout(this.hangoverTimer);
          this.hangoverTimer = setTimeout(() => {
            if (this.activeSources.size === 0) {
              this.isPlaybackActive = false;
              this.callbacks.onPlaybackStateChange?.(false);
            }
          }, 140);
        }
      };
    } catch (err) {
      console.error("AudioStreamer failed to play audio chunk:", err);
    }
  }

  // --- STOP PLAYBACK IMMEDIATELY (INTERRUPTIONS) ---
  public stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();

    if (this.hangoverTimer) {
      clearTimeout(this.hangoverTimer);
      this.hangoverTimer = null;
    }

    if (this.outputContext) {
      this.nextPlayTime = this.outputContext.currentTime;
    }

    if (this.isPlaybackActive) {
      this.isPlaybackActive = false;
      this.callbacks.onPlaybackStateChange?.(false);
    }
  }

  // --- VOLUME & MUTE CONTROL ---
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.outputGain && this.outputContext) {
      this.outputGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.outputContext.currentTime
      );
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.outputGain && this.outputContext) {
      this.outputGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.outputContext.currentTime
      );
    }
  }

  public setMicMuted(muted: boolean): void {
    this.isMicMuted = muted;
  }

  // --- VISUALIZER FREQUENCY DATA ---
  public getVisualizerData(): {
    speakingLevel: number;
    listeningLevel: number;
    frequencyData: number[];
  } {
    let speakingLevel = 0;
    let listeningLevel = 0;
    const bars = 16;
    const frequencyData = new Array(bars).fill(0);

    if (this.isPlaybackActive && this.outputAnalyser && this.outputFreqData) {
      this.outputAnalyser.getByteFrequencyData(this.outputFreqData);
      let sum = 0;
      const step = Math.floor(this.outputFreqData.length / bars);
      for (let i = 0; i < bars; i++) {
        const val = this.outputFreqData[i * step] || 0;
        frequencyData[i] = val / 255;
        sum += val;
      }
      speakingLevel = Math.min(1, sum / bars / 180);
    } else if (this.inputAnalyser && this.inputFreqData && !this.isMicMuted) {
      this.inputAnalyser.getByteFrequencyData(this.inputFreqData);
      let sum = 0;
      const step = Math.floor(this.inputFreqData.length / bars);
      for (let i = 0; i < bars; i++) {
        const val = this.inputFreqData[i * step] || 0;
        frequencyData[i] = val / 255;
        sum += val;
      }
      listeningLevel = Math.min(1, sum / bars / 180);
    }

    return { speakingLevel, listeningLevel, frequencyData };
  }

  public get isPlaying(): boolean {
    return this.isPlaybackActive;
  }

  // --- CLEAN TEARDOWN ---
  public destroy(): void {
    this.stopPlayback();
    this.stopBackgroundKeepAlive();
    this.stopInput();

    if (this.outputContext) {
      this.outputContext.close().catch(() => {});
      this.outputContext = null;
    }

    this.releaseWakeLock();

    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.boundVisibilityHandler
      );
    }
  }
}
