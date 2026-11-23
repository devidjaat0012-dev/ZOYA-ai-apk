let activeAudioCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeAnalyser: AnalyserNode | null = null;
let activeFreqData: Uint8Array | null = null;
let activeLevelAnimId: number | null = null;

export type PcmAudioLevelCallback = (data: { level: number; frequencyData: number[] }) => void;
const pcmAudioListeners = new Set<PcmAudioLevelCallback>();

export function subscribePcmAudio(callback: PcmAudioLevelCallback): () => void {
  pcmAudioListeners.add(callback);
  return () => {
    pcmAudioListeners.delete(callback);
  };
}

function notifyPcmAudio(level: number, frequencyData: number[]) {
  pcmAudioListeners.forEach((cb) => {
    try {
      cb({ level, frequencyData });
    } catch {}
  });
}

export function stopPCM(): void {
  if (activeLevelAnimId) {
    cancelAnimationFrame(activeLevelAnimId);
    activeLevelAnimId = null;
  }
  notifyPcmAudio(0, []);
  activeAnalyser = null;
  activeFreqData = null;

  if (activeSource) {
    try {
      activeSource.stop();
      activeSource.disconnect();
    } catch {}
    activeSource = null;
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch {}
    activeAudioCtx = null;
  }
}

export async function playPCM(
  base64Data: string,
  volume: number = 1.0,
  onEnded?: () => void,
  characterPreset?: "zoya" | "friday" | "jarvis" | "venom"
): Promise<void> {
  stopPCM();

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      onEnded?.();
      return;
    }
    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    activeAudioCtx = audioCtx;

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = new Int16Array(bytes.buffer);
    const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = buffer[i] / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    activeSource = source;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.45;
    activeAnalyser = analyser;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    activeFreqData = freqData;

    if (characterPreset === "venom") {
      const bass = audioCtx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 120;
      bass.gain.value = 11;

      const mid = audioCtx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 240;
      mid.gain.value = 5.5;

      const ws = audioCtx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 2.2);
      }
      ws.curve = curve;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(ws);
      ws.connect(analyser);
      analyser.connect(gainNode);
    } else if (characterPreset === "jarvis") {
      const bass = audioCtx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 260;
      bass.gain.value = 3.5;

      const pres = audioCtx.createBiquadFilter();
      pres.type = "peaking";
      pres.frequency.value = 2700;
      pres.gain.value = 3.2;

      source.connect(bass);
      bass.connect(pres);
      pres.connect(analyser);
      analyser.connect(gainNode);
    } else if (characterPreset === "friday") {
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 160;

      const pres = audioCtx.createBiquadFilter();
      pres.type = "peaking";
      pres.frequency.value = 3300;
      pres.gain.value = 4.5;

      source.connect(hp);
      hp.connect(pres);
      pres.connect(analyser);
      analyser.connect(gainNode);
    } else {
      source.connect(analyser);
      analyser.connect(gainNode);
    }

    gainNode.connect(audioCtx.destination);
    source.start();

    // 60FPS audio analyzer loop for real-time lip sync matching chat audio
    const pollLevels = () => {
      if (!activeAnalyser || !activeFreqData) return;
      activeAnalyser.getByteFrequencyData(activeFreqData);
      const bars = 16;
      const step = Math.max(1, Math.floor(activeFreqData.length / bars));
      const freqs: number[] = new Array(bars);
      let sum = 0;
      for (let i = 0; i < bars; i++) {
        const v = activeFreqData[i * step] || 0;
        freqs[i] = v / 255;
        sum += v;
      }
      const rawLevel = Math.min(1, sum / bars / 135);
      notifyPcmAudio(rawLevel, freqs);
      activeLevelAnimId = requestAnimationFrame(pollLevels);
    };
    activeLevelAnimId = requestAnimationFrame(pollLevels);

    return new Promise<void>((resolve) => {
      source.onended = () => {
        if (activeLevelAnimId) {
          cancelAnimationFrame(activeLevelAnimId);
          activeLevelAnimId = null;
        }
        notifyPcmAudio(0, []);
        activeAnalyser = null;
        activeFreqData = null;

        if (activeSource === source) {
          activeSource = null;
        }
        try {
          audioCtx.close();
        } catch {}
        if (activeAudioCtx === audioCtx) {
          activeAudioCtx = null;
        }
        onEnded?.();
        resolve();
      };
    });
  } catch (error) {
    console.warn("Error playing audio:", error);
    if (activeLevelAnimId) {
      cancelAnimationFrame(activeLevelAnimId);
      activeLevelAnimId = null;
    }
    notifyPcmAudio(0, []);
    activeAnalyser = null;
    activeFreqData = null;
    onEnded?.();
  }
}
