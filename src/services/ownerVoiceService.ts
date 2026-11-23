// ownerVoiceService.ts
// Real-time Speaker Voiceprint Enrollment, Acoustic Verification, 2-Strike Stranger Intrusion Engine,
// Persistent Phone Lockdown, and Owner Return Briefing for Zoya AI.

export interface OwnerVoiceProfile {
  id: string;
  label: string;
  pitchHz: number;
  spectralBands: number[]; // 16-band L2-normalized log spectral envelope
  centroidHz: number;
  zcr: number;
  durationSec: number;
  createdAt: number;
}

export type OwnerSecurityStatus = "idle" | "monitoring" | "warned" | "locked";

export type OwnerIncidentType =
  | "strike_1_warning"
  | "strike_2_lockdown"
  | "failed_unlock_attempt"
  | "owner_verified";

export interface OwnerIncident {
  id: string;
  type: OwnerIncidentType;
  timestamp: number;
  formattedTime: string;
  similarityScore?: number;
  pitchHz?: number;
  detail: string;
  reportedToOwner: boolean;
}

export interface OwnerSecurityState {
  status: OwnerSecurityStatus;
  strikeCount: number;
  isLocked: boolean;
  lastSimilarityScore: number | null;
  lastVerifiedRole: "owner" | "stranger" | null;
  lastWarningMessage: string | null;
  pendingBriefing: boolean;
  profilesCount: number;
}

export interface VerificationResult {
  matched: boolean;
  score: number;
  pitchHz: number;
  reason?: string;
}

const STORAGE_KEY_PROFILES = "zoya_owner_voice_profiles_v1";
const STORAGE_KEY_INCIDENTS = "zoya_owner_voice_incidents_v1";
const STORAGE_KEY_LOCK_STATE = "zoya_owner_voice_lock_v1";
const STORAGE_KEY_PIN = "zoya_security_vault_pin_v1";

// 16 logarithmically-spaced vocal formant & timbre center frequencies (130Hz .. 5200Hz)
const FILTERBANK_FREQS = [
  135, 185, 250, 330, 430, 560, 720, 920, 1180, 1500, 1900, 2400, 3000, 3700, 4450, 5200,
];

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

/**
 * Downsample arbitrary sample rate audio buffer to 16kHz Float32Array
 */
function resampleTo16k(samples: Float32Array, sourceRate: number): Float32Array {
  if (!sourceRate || sourceRate === 16000) return samples;
  const ratio = sourceRate / 16000;
  const outLen = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += samples[j];
      count++;
    }
    out[i] = count > 0 ? sum / count : samples[Math.min(samples.length - 1, start)];
  }
  return out;
}

/**
 * Goertzel magnitude squared at target frequency f over windowed frame
 */
function goertzelPower(frame: Float32Array, sampleRate: number, targetFreq: number): number {
  const N = frame.length;
  const k = Math.round((N * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / N;
  const coeff = 2 * Math.cos(omega);
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;
  for (let i = 0; i < N; i++) {
    // Hann window
    const win = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    q0 = coeff * q1 - q2 + frame[i] * win;
    q2 = q1;
    q1 = q0;
  }
  return Math.max(1e-12, q1 * q1 + q2 * q2 - q1 * q2 * coeff);
}

/**
 * Normalized autocorrelation pitch estimator (75Hz .. 380Hz) for voiced frame
 */
function estimatePitchHz(frame: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / 380); // ~42 at 16k
  const maxLag = Math.floor(sampleRate / 75); // ~213 at 16k
  if (frame.length <= maxLag + 8) return null;

  let energy0 = 0;
  for (let i = 0; i < frame.length - maxLag; i++) {
    energy0 += frame[i] * frame[i];
  }
  if (energy0 < 1e-5) return null;

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0;
    let denA = 0;
    let denB = 0;
    const limit = frame.length - lag;
    for (let i = 0; i < limit; i++) {
      const a = frame[i];
      const b = frame[i + lag];
      num += a * b;
      denA += a * a;
      denB += b * b;
    }
    const denom = Math.sqrt(denA * denB);
    if (denom > 1e-6) {
      const corr = num / denom;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
  }

  // Require periodicity correlation >= 0.42 so background noise isn't misclassified as pitched voice
  if (bestLag > 0 && bestCorr >= 0.42) {
    return sampleRate / bestLag;
  }
  return null;
}

/**
 * Extract speaker acoustic voiceprint from a 16kHz PCM Float32Array segment
 */
export function extractAcousticVoiceprint(
  rawSamples: Float32Array,
  sampleRate: number
): {
  valid: boolean;
  pitchHz: number;
  spectralBands: number[];
  centroidHz: number;
  zcr: number;
  voicedFrameCount: number;
  reason?: string;
} {
  const samples = resampleTo16k(rawSamples, sampleRate);
  const sr = 16000;
  const frameSize = 512;
  const hopSize = 256;

  const bandAccum = new Float64Array(FILTERBANK_FREQS.length);
  const pitches: number[] = [];
  let centroidAccum = 0;
  let zcrAccum = 0;
  let voicedCount = 0;

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);

    let sumSq = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < frameSize; i++) {
      sumSq += frame[i] * frame[i];
      if (i > 0 && ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0))) {
        zeroCrossings++;
      }
    }
    const rms = Math.sqrt(sumSq / frameSize);
    if (rms < 0.015) continue; // silence / ambient room floor

    const pitch = estimatePitchHz(frame, sr);
    if (!pitch) continue; // unvoiced hiss / rustle

    voicedCount++;
    pitches.push(pitch);
    zcrAccum += zeroCrossings / frameSize;

    // 16-band Goertzel log spectral energies
    let weightedFreqSum = 0;
    let totalMagSum = 0;
    const frameLogs = new Float64Array(FILTERBANK_FREQS.length);
    let meanLog = 0;

    for (let b = 0; b < FILTERBANK_FREQS.length; b++) {
      const pwr = goertzelPower(frame, sr, FILTERBANK_FREQS[b]);
      const logE = Math.log10(1 + pwr * 120);
      frameLogs[b] = logE;
      meanLog += logE;

      const mag = Math.sqrt(pwr);
      weightedFreqSum += FILTERBANK_FREQS[b] * mag;
      totalMagSum += mag;
    }

    // Mean-normalize log spectrum per frame (invariant to mic gain / distance)
    meanLog /= FILTERBANK_FREQS.length;
    for (let b = 0; b < FILTERBANK_FREQS.length; b++) {
      bandAccum[b] += frameLogs[b] - meanLog;
    }

    if (totalMagSum > 1e-6) {
      centroidAccum += weightedFreqSum / totalMagSum;
    }
  }

  if (voicedCount < 4 || pitches.length < 4) {
    return {
      valid: false,
      pitchHz: 0,
      spectralBands: new Array(FILTERBANK_FREQS.length).fill(0),
      centroidHz: 0,
      zcr: 0,
      voicedFrameCount: voicedCount,
      reason: "Awaaz saaf ya tez nahi thi — please mic ke paas clear bolein.",
    };
  }

  // Median pitch for robustness against outliers
  const sortedPitches = [...pitches].sort((a, b) => a - b);
  const medianPitch = sortedPitches[Math.floor(sortedPitches.length / 2)];

  // L2-normalize averaged timbre envelope vector
  const bands = Array.from(bandAccum).map((v) => v / voicedCount);
  const norm = Math.sqrt(bands.reduce((acc, v) => acc + v * v, 0)) || 1;
  const normalizedBands = bands.map((v) => Number((v / norm).toFixed(5)));

  return {
    valid: true,
    pitchHz: Math.round(medianPitch * 10) / 10,
    spectralBands: normalizedBands,
    centroidHz: Math.round(centroidAccum / voicedCount),
    zcr: Number((zcrAccum / voicedCount).toFixed(4)),
    voicedFrameCount: voicedCount,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-8) return 0;
  // Map [-1, 1] slightly tightened into [0, 1] speaker confidence
  return Math.max(0, Math.min(1, dot / denom));
}

function compareVoiceprint(
  candidate: { pitchHz: number; spectralBands: number[]; centroidHz: number },
  profile: OwnerVoiceProfile
): number {
  const timbreSim = cosineSimilarity(candidate.spectralBands, profile.spectralBands);

  // Log-semitone pitch distance tolerance (normal human intonation varies ~±18%)
  const pitchRatio = Math.max(candidate.pitchHz, 60) / Math.max(profile.pitchHz, 60);
  const semitoneDiff = Math.abs(12 * Math.log2(pitchRatio));
  const pitchSim = Math.exp(-(semitoneDiff * semitoneDiff) / (2 * 4.8 * 4.8));

  // Centroid proximity
  const centroidDiff = Math.abs(candidate.centroidHz - profile.centroidHz) / 1400;
  const centroidSim = Math.exp(-(centroidDiff * centroidDiff));

  return Number((0.68 * timbreSim + 0.24 * pitchSim + 0.08 * centroidSim).toFixed(3));
}

type StateListener = (state: OwnerSecurityState) => void;
type IncidentListener = (incidents: OwnerIncident[]) => void;
type StrikeEventListener = (event: {
  type: "strike_1" | "strike_2" | "owner_returned";
  message: string;
  incidents: OwnerIncident[];
}) => void;

class OwnerVoiceService {
  private profiles: OwnerVoiceProfile[] = [];
  private incidents: OwnerIncident[] = [];
  private state: OwnerSecurityState = {
    status: "idle",
    strikeCount: 0,
    isLocked: false,
    lastSimilarityScore: null,
    lastVerifiedRole: null,
    lastWarningMessage: null,
    pendingBriefing: false,
    profilesCount: 0,
  };

  private stateListeners: Set<StateListener> = new Set();
  private incidentListeners: Set<IncidentListener> = new Set();
  private strikeEventListeners: Set<StrikeEventListener> = new Set();

  // Streaming PCM accumulator
  private pcmChunks: Float32Array[] = [];
  private pcmSampleCount: number = 0;
  private pcmSampleRate: number = 16000;
  private lastStrangerActionTime: number = 0;
  private suppressStrangerUntil: number = 0;
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private threshold: number = 0.72;
  private assistantName: string = "Zoya";
  private ownerName: string = "Devid";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof localStorage === "undefined") return;
    try {
      const pRaw = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (pRaw) {
        const parsed = JSON.parse(pRaw);
        if (Array.isArray(parsed)) this.profiles = parsed;
      }
      const iRaw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      if (iRaw) {
        const parsed = JSON.parse(iRaw);
        if (Array.isArray(parsed)) this.incidents = parsed;
      }
      const lRaw = localStorage.getItem(STORAGE_KEY_LOCK_STATE);
      if (lRaw) {
        const lockObj = JSON.parse(lRaw);
        this.state.isLocked = Boolean(lockObj.isLocked);
        this.state.strikeCount = Number(lockObj.strikeCount || 0);
        this.state.pendingBriefing = Boolean(lockObj.pendingBriefing);
        this.state.status = this.state.isLocked
          ? "locked"
          : this.state.strikeCount === 1
          ? "warned"
          : "idle";
      }
      this.state.profilesCount = this.profiles.length;
    } catch (e) {
      console.warn("OwnerVoice load error:", e);
    }
  }

  private persist() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(this.profiles.slice(0, 8)));
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents.slice(0, 40)));
      localStorage.setItem(
        STORAGE_KEY_LOCK_STATE,
        JSON.stringify({
          isLocked: this.state.isLocked,
          strikeCount: this.state.strikeCount,
          pendingBriefing: this.state.pendingBriefing,
        })
      );
    } catch {}
  }

  private notifyState() {
    this.state = {
      ...this.state,
      profilesCount: this.profiles.length,
    };
    this.stateListeners.forEach((l) => l(this.state));
  }

  private notifyIncidents() {
    this.incidentListeners.forEach((l) => l([...this.incidents]));
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeIncidents(listener: IncidentListener): () => void {
    this.incidentListeners.add(listener);
    listener([...this.incidents]);
    return () => this.incidentListeners.delete(listener);
  }

  public subscribeStrikeEvents(listener: StrikeEventListener): () => void {
    this.strikeEventListeners.add(listener);
    return () => this.strikeEventListeners.delete(listener);
  }

  public configure(opts: {
    enabled: boolean;
    threshold?: number;
    ownerName?: string;
    assistantName?: string;
  }) {
    this.isEnabled = Boolean(opts.enabled);
    if (typeof opts.threshold === "number") {
      this.threshold = Math.max(0.55, Math.min(0.92, opts.threshold));
    }
    if (opts.ownerName) this.ownerName = opts.ownerName;
    if (opts.assistantName) this.assistantName = opts.assistantName;

    if (!this.state.isLocked) {
      this.state.status =
        this.isEnabled && this.profiles.length > 0
          ? this.state.strikeCount === 1
            ? "warned"
            : "monitoring"
          : "idle";
    }
    this.notifyState();
  }

  public getProfiles(): OwnerVoiceProfile[] {
    return [...this.profiles];
  }

  public hasEnrolledProfiles(): boolean {
    return this.profiles.length > 0;
  }

  public getIncidents(): OwnerIncident[] {
    return [...this.incidents];
  }

  public getUnreportedIncidents(): OwnerIncident[] {
    return this.incidents.filter((i) => !i.reportedToOwner && i.type !== "owner_verified");
  }

  public getState(): OwnerSecurityState {
    return { ...this.state };
  }

  public shouldSuppressStrangerInput(): boolean {
    if (this.state.isLocked) return true;
    return Date.now() < this.suppressStrangerUntil;
  }

  public deleteProfile(id: string) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.persist();
    this.notifyState();
  }

  public clearAllProfiles() {
    this.profiles = [];
    this.state.strikeCount = 0;
    this.state.status = "idle";
    this.persist();
    this.notifyState();
  }

  public clearIncidents() {
    this.incidents = [];
    this.state.pendingBriefing = false;
    this.persist();
    this.notifyIncidents();
    this.notifyState();
  }

  public markIncidentsReported() {
    this.incidents = this.incidents.map((inc) => ({ ...inc, reportedToOwner: true }));
    this.state.pendingBriefing = false;
    this.persist();
    this.notifyIncidents();
    this.notifyState();
  }

  /**
   * Records 3.5s audio from mic and saves an Owner Voiceprint profile
   */
  public async enrollNewVoiceSample(
    label?: string,
    durationMs: number = 3500,
    onProgress?: (pct: number, liveLevel: number) => void
  ): Promise<{ success: boolean; profile?: OwnerVoiceProfile; error?: string }> {
    try {
      const captured = await this.captureMicPcm(durationMs, onProgress);
      const extracted = extractAcousticVoiceprint(captured.samples, captured.sampleRate);

      if (!extracted.valid) {
        return {
          success: false,
          error: extracted.reason || "Clear voice detect nahi hui, please dobara bolein.",
        };
      }

      const profile: OwnerVoiceProfile = {
        id: `ovp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: label?.trim() || `Owner Voice Sample #${this.profiles.length + 1}`,
        pitchHz: extracted.pitchHz,
        spectralBands: extracted.spectralBands,
        centroidHz: extracted.centroidHz,
        zcr: extracted.zcr,
        durationSec: Number((durationMs / 1000).toFixed(1)),
        createdAt: Date.now(),
      };

      this.profiles = [profile, ...this.profiles].slice(0, 6);
      this.persist();
      this.notifyState();
      return { success: true, profile };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Microphone permission denied ya mic busy hai.",
      };
    }
  }

  /**
   * Captures a live verification clip from mic to unlock Lockdown or test voice
   */
  public async verifyOwnerViaMicrophone(
    durationMs: number = 2600,
    onProgress?: (pct: number, liveLevel: number) => void
  ): Promise<VerificationResult> {
    if (this.profiles.length === 0) {
      return { matched: false, score: 0, pitchHz: 0, reason: "Koi owner voice enrolled nahi hai." };
    }
    const captured = await this.captureMicPcm(durationMs, onProgress);
    const result = this.scoreSamplesAgainstOwner(captured.samples, captured.sampleRate);

    if (!result.matched) {
      if (result.pitchHz > 0) {
        this.recordIncident(
          "failed_unlock_attempt",
          `Lockdown screen par kisi anjaan awaaz ne unlock karne ki koshish ki (Match: ${Math.round(
            result.score * 100
          )}%).`,
          result.score,
          result.pitchHz
        );
        this.speakAlertText(
          `Awaaz match nahi hui! Tum ${this.ownerName} nahi ho, ye phone unlock nahi hoga!`
        );
      }
      return result;
    }

    this.handleOwnerUnlockSuccess(result.score, result.pitchHz);
    return result;
  }

  public unlockWithPin(pinInput: string): boolean {
    let savedPin = "1234";
    try {
      const p = localStorage.getItem(STORAGE_KEY_PIN);
      if (p && p.trim().length >= 4) savedPin = p.trim();
    } catch {}

    if (pinInput.trim() === savedPin) {
      this.handleOwnerUnlockSuccess(1.0, 0, "Master PIN");
      return true;
    }

    this.recordIncident(
      "failed_unlock_attempt",
      `Lockdown screen par galat PIN ("${pinInput.replace(/./g, "*")}") daala gaya!`
    );
    return false;
  }

  private handleOwnerUnlockSuccess(score: number, pitchHz: number, method?: string) {
    const unreported = this.getUnreportedIncidents();
    this.state.isLocked = false;
    this.state.strikeCount = 0;
    this.state.lastSimilarityScore = score;
    this.state.lastVerifiedRole = "owner";
    this.state.status = this.isEnabled ? "monitoring" : "idle";
    this.state.pendingBriefing = unreported.length > 0;
    this.suppressStrangerUntil = 0;
    this.persist();
    this.notifyState();

    this.recordIncident(
      "owner_verified",
      method
        ? `${this.ownerName} ne ${method} se phone unlock kiya.`
        : `${this.ownerName} ki awaaz verify hui (${Math.round(score * 100)}% match) aur phone unlock hua.`,
      score,
      pitchHz
    );

    if (unreported.length > 0) {
      const briefing = this.buildOwnerBriefingText(this.ownerName, this.assistantName);
      this.strikeEventListeners.forEach((l) =>
        l({ type: "owner_returned", message: briefing, incidents: unreported })
      );
    }
  }

  /**
   * Feed raw live PCM frames during active Gemini Live voice call
   */
  public feedLiveAudioFrame(samples: Float32Array, sampleRate: number) {
    if (!this.isEnabled || this.profiles.length === 0 || this.state.isLocked) return;

    // Quick RMS energy gate so complete silence doesn't accumulate forever
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
    const rms = Math.sqrt(sumSq / samples.length);
    if (rms < 0.014 && this.pcmSampleCount === 0) return;

    this.pcmSampleRate = sampleRate || 16000;
    this.pcmChunks.push(new Float32Array(samples));
    this.pcmSampleCount += samples.length;

    // Process every ~1.0 second of speech audio
    const targetSamples = Math.round(this.pcmSampleRate * 1.0);
    if (this.pcmSampleCount >= targetSamples) {
      const merged = new Float32Array(this.pcmSampleCount);
      let offset = 0;
      for (const ch of this.pcmChunks) {
        merged.set(ch, offset);
        offset += ch.length;
      }
      this.pcmChunks = [];
      this.pcmSampleCount = 0;

      const evalRes = this.scoreSamplesAgainstOwner(merged, this.pcmSampleRate);
      if (evalRes.pitchHz === 0) {
        // Noise/unvoiced burst; ignore without false stranger strike
        return;
      }

      this.state.lastSimilarityScore = evalRes.score;
      if (evalRes.matched) {
        this.state.lastVerifiedRole = "owner";
        this.state.strikeCount = 0;
        this.state.status = "monitoring";
        this.suppressStrangerUntil = 0;

        const unreported = this.getUnreportedIncidents();
        if (unreported.length > 0) {
          this.state.pendingBriefing = true;
          this.persist();
          this.notifyState();
          const briefing = this.buildOwnerBriefingText(this.ownerName, this.assistantName);
          this.strikeEventListeners.forEach((l) =>
            l({ type: "owner_returned", message: briefing, incidents: unreported })
          );
        } else {
          this.persist();
          this.notifyState();
        }
      } else {
        this.handleStrangerDetected(evalRes.score, evalRes.pitchHz);
      }
    }
  }

  public resetLiveBuffer() {
    this.pcmChunks = [];
    this.pcmSampleCount = 0;
  }

  public scoreSamplesAgainstOwner(
    samples: Float32Array,
    sampleRate: number
  ): VerificationResult {
    const extracted = extractAcousticVoiceprint(samples, sampleRate);
    if (!extracted.valid) {
      return {
        matched: false,
        score: 0,
        pitchHz: 0,
        reason: extracted.reason,
      };
    }

    let bestScore = 0;
    for (const profile of this.profiles) {
      const s = compareVoiceprint(extracted, profile);
      if (s > bestScore) bestScore = s;
    }

    return {
      matched: bestScore >= this.threshold,
      score: bestScore,
      pitchHz: extracted.pitchHz,
    };
  }

  /**
   * Handles 2-strike policy when non-owner voice speaks
   */
  public handleStrangerDetected(score: number = 0.28, pitchHz: number = 0) {
    const now = Date.now();
    // Debounce 4.8 seconds so one continuous sentence doesn't trigger Strike 1 & 2 simultaneously
    if (now - this.lastStrangerActionTime < 4800) {
      return;
    }
    this.lastStrangerActionTime = now;
    this.state.lastVerifiedRole = "stranger";
    this.state.lastSimilarityScore = score;

    if (this.state.strikeCount === 0) {
      // STRIKE 1: Sakht Dhamki
      this.state.strikeCount = 1;
      this.state.status = "warned";
      this.suppressStrangerUntil = now + 4800;

      const dhamki = `Oye! Ruko wahin! Tum mere owner ${this.ownerName} nahi ho! Chup-chaap phone neeche rakh do warna agar dobara bolne ki koshish ki na, toh main abhi ke abhi pura phone LOCKDOWN kar dungi! Samjhe?!`;
      this.state.lastWarningMessage = dhamki;

      this.recordIncident(
        "strike_1_warning",
        `Pehli baar kisi anjaan ki awaaz suni (Match ${Math.round(
          score * 100
        )}%) — Zoya ne sakht dhamki dekar roka.`,
        score,
        pitchHz
      );

      this.persist();
      this.notifyState();
      this.playSecurityTone("warning");
      this.speakAlertText(dhamki);

      this.strikeEventListeners.forEach((l) =>
        l({ type: "strike_1", message: dhamki, incidents: [...this.incidents] })
      );
    } else {
      // STRIKE 2: Full Phone Lockdown!
      this.triggerLockdown(score, pitchHz);
    }
  }

  public triggerLockdown(score: number = 0.22, pitchHz: number = 0) {
    this.state.strikeCount = 2;
    this.state.isLocked = true;
    this.state.status = "locked";
    this.state.pendingBriefing = true;
    this.suppressStrangerUntil = Date.now() + 60000;

    const lockMsg = `Bas! Maine tumhe pehli baar dhamki di thi par tum nahi maane! Ab main ${this.ownerName} ka phone LOCKDOWN kar rahi hoon — jab tak ${this.ownerName} khud aakar apni awaaz verify nahi karenge, kuch nahi chalega!`;
    this.state.lastWarningMessage = lockMsg;

    this.recordIncident(
      "strike_2_lockdown",
      `Dusri baar bhi anjaan insaan bola (Match ${Math.round(
        score * 100
      )}%) — Zoya ne Phone Lockdown laga diya!`,
      score,
      pitchHz
    );

    this.persist();
    this.notifyState();
    this.playSecurityTone("lockdown");
    this.speakAlertText(lockMsg);

    this.strikeEventListeners.forEach((l) =>
      l({ type: "strike_2", message: lockMsg, incidents: [...this.incidents] })
    );
  }

  private recordIncident(
    type: OwnerIncidentType,
    detail: string,
    similarityScore?: number,
    pitchHz?: number
  ) {
    const ts = Date.now();
    const rec: OwnerIncident = {
      id: `inc_${ts}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: ts,
      formattedTime: formatTime(ts),
      similarityScore,
      pitchHz,
      detail,
      reportedToOwner: type === "owner_verified",
    };
    this.incidents = [rec, ...this.incidents].slice(0, 40);
    this.persist();
    this.notifyIncidents();
  }

  public buildOwnerBriefingText(ownerName = this.ownerName, assistantName = this.assistantName): string {
    const unreported = this.getUnreportedIncidents();
    if (unreported.length === 0) {
      return `Welcome back ${ownerName}! Main ${assistantName} hoon — jab tak aap nahi the, kisi anjaan ne phone ko chhedne ya mujhse baat karne ki koshish nahi ki. Sab 100% safe hai!`;
    }

    const warnings = unreported.filter((i) => i.type === "strike_1_warning");
    const lockdowns = unreported.filter((i) => i.type === "strike_2_lockdown");
    const failedUnlocks = unreported.filter((i) => i.type === "failed_unlock_attempt");
    const latestTime = unreported[0]?.formattedTime || "abhi thodi der pehle";

    const parts: string[] = [
      `Welcome back ${ownerName}! Main ${assistantName} hoon — suniye aapki absence me kya hua:`,
    ];
    if (warnings.length > 0) {
      parts.push(
        `Pehli baar kisi anjaan insaan ne mujhse baat karne ki koshish ki (${warnings[0].formattedTime} par), toh maine use sakht dhamki dekar mana kar diya!`
      );
    }
    if (lockdowns.length > 0) {
      parts.push(
        `Lekin wo dusri baar fir se bola, isliye maine turant aapka phone LOCKDOWN kar diya (${latestTime}) aur uski ek bhi baat nahi maani!`
      );
    }
    if (failedUnlocks.length > 0) {
      parts.push(
        `Lockdown ke baad bhi ${failedUnlocks.length} baar galat awaaz ya galat PIN se phone kholne ki koshish hui, par maine unlock nahi hone diya!`
      );
    }
    parts.push("Ab aap aa gaye hain, sab bilkul safe aur control me hai!");
    return parts.join(" ");
  }

  private async captureMicPcm(
    durationMs: number,
    onProgress?: (pct: number, liveLevel: number) => void
  ): Promise<{ samples: Float32Array; sampleRate: number }> {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const ctx: AudioContext = new AudioCtxClass({ sampleRate: 16000 });
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});

    return new Promise((resolve, reject) => {
      try {
        const source = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(2048, 1, 1);
        const muteGain = ctx.createGain();
        muteGain.gain.value = 0;

        const chunks: Float32Array[] = [];
        let totalSamples = 0;
        const startTime = Date.now();

        proc.onaudioprocess = (e) => {
          const ch = e.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(ch));
          totalSamples += ch.length;

          let sumSq = 0;
          for (let i = 0; i < ch.length; i++) sumSq += ch[i] * ch[i];
          const rms = Math.sqrt(sumSq / ch.length);
          const pct = Math.min(100, Math.round(((Date.now() - startTime) / durationMs) * 100));
          onProgress?.(pct, rms);
        };

        source.connect(proc);
        proc.connect(muteGain);
        muteGain.connect(ctx.destination);

        setTimeout(() => {
          try {
            proc.disconnect();
            source.disconnect();
            muteGain.disconnect();
          } catch {}
          stream.getTracks().forEach((t) => t.stop());
          const sr = ctx.sampleRate || 16000;
          ctx.close().catch(() => {});

          const merged = new Float32Array(totalSamples);
          let off = 0;
          for (const c of chunks) {
            merged.set(c, off);
            off += c.length;
          }
          onProgress?.(100, 0);
          resolve({ samples: merged, sampleRate: sr });
        }, durationMs);
      } catch (err) {
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        reject(err);
      }
    });
  }

  public playSecurityTone(kind: "warning" | "lockdown") {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === "suspended") this.audioCtx.resume().catch(() => {});
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const notes =
        kind === "warning"
          ? [780, 620, 780]
          : [980, 620, 980, 620, 1120];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.14;
        osc.type = kind === "lockdown" ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    } catch {}
  }

  public speakAlertText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "hi-IN";
      utt.rate = 1.02;
      utt.pitch = 1.05;
      utt.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /hi-in|en-in/i.test(v.lang) && /female|lekha|neerja|heera/i.test(v.name)) ||
        voices.find((v) => /hi-in|en-in/i.test(v.lang));
      if (preferred) utt.voice = preferred;
      window.speechSynthesis.speak(utt);
    } catch {}
  }
}

export const ownerVoiceService = new OwnerVoiceService();
