import { getApiUrl } from "../utils/apiBase";

export type TelemetryKind = "http" | "ws" | "system";
export type TelemetryRoute = "developer" | "default" | "custom";

export interface ApiLogEntry {
  id: string;
  timestamp: number;
  kind: TelemetryKind;
  method: string;
  endpoint: string;
  route: TelemetryRoute;
  status: string;
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

export interface LatencyMetrics {
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  wsHandshakeMs: number | null;
  healthPingMs: number | null;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  recentSamples: number[];
}

export interface SystemStatusSnapshot {
  serverOnline: boolean;
  hasApiKey: boolean;
  hasDeveloperApiKey: boolean;
  developerCareActive: boolean;
  uptimeSec: number | null;
  environment: string;
  activeLiveRoute: string;
  wsState: "disconnected" | "connecting" | "connected" | "error";
  wsModel: string;
  browserOnline: boolean;
  lastHealthCheckAt: number | null;
  lastError: string | null;
}

export interface DeveloperTelemetryState {
  logs: ApiLogEntry[];
  metrics: LatencyMetrics;
  system: SystemStatusSnapshot;
}

type TelemetryListener = (state: DeveloperTelemetryState) => void;

const MAX_LOGS = 80;
const MAX_SAMPLES = 18;

function sanitizeSensitiveText(input: string): string {
  return String(input || "")
    .replace(/([?&](?:key|apiKey|token|secret)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/AQ\.Ab[A-Za-z0-9_\-]+/g, "[DEVELOPER_KEY]")
    .replace(/AIza[A-Za-z0-9_\-]+/g, "[API_KEY]");
}

function normalizeEndpoint(rawUrl: string): string {
  const sanitized = sanitizeSensitiveText(rawUrl);
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(sanitized, base);
    const qs = parsed.searchParams;
    const cleanParams: string[] = [];
    qs.forEach((val, key) => {
      if (key.toLowerCase().includes("key") || key.toLowerCase().includes("token")) {
        cleanParams.push(`${key}=[REDACTED]`);
      } else {
        cleanParams.push(`${key}=${val}`);
      }
    });
    return cleanParams.length > 0
      ? `${parsed.pathname}?${cleanParams.join("&")}`
      : parsed.pathname;
  } catch {
    return sanitized;
  }
}

class DeveloperTelemetryService {
  private listeners = new Set<TelemetryListener>();
  private fetchInstalled = false;
  private isRefreshingHealth = false;

  private state: DeveloperTelemetryState = {
    logs: [],
    metrics: {
      lastLatencyMs: null,
      avgLatencyMs: null,
      minLatencyMs: null,
      maxLatencyMs: null,
      wsHandshakeMs: null,
      healthPingMs: null,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      recentSamples: [],
    },
    system: {
      serverOnline: false,
      hasApiKey: false,
      hasDeveloperApiKey: false,
      developerCareActive: true,
      uptimeSec: null,
      environment: "runtime",
      activeLiveRoute: "v1beta",
      wsState: "disconnected",
      wsModel: "gemini-3.8-live",
      browserOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      lastHealthCheckAt: null,
      lastError: null,
    },
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.updateSystem({ browserOnline: true });
      });
      window.addEventListener("offline", () => {
        this.updateSystem({ browserOnline: false });
      });
    }
  }

  public getState(): DeveloperTelemetryState {
    return this.state;
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public clearLogs() {
    this.state = {
      ...this.state,
      logs: [],
    };
    this.emit();
  }

  public updateSystem(partial: Partial<SystemStatusSnapshot>) {
    this.state = {
      ...this.state,
      system: {
        ...this.state.system,
        ...partial,
      },
    };
    this.emit();
  }

  public recordEntry(entry: Omit<ApiLogEntry, "id" | "timestamp">, countAsRequest = true) {
    const cleanEntry: ApiLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      kind: entry.kind,
      method: entry.method,
      endpoint: normalizeEndpoint(entry.endpoint),
      route: entry.route,
      status: sanitizeSensitiveText(entry.status),
      ok: entry.ok,
      latencyMs: Math.max(0, Math.round(entry.latencyMs)),
      detail: entry.detail ? sanitizeSensitiveText(entry.detail) : undefined,
    };

    const nextLogs = [cleanEntry, ...this.state.logs].slice(0, MAX_LOGS);

    let nextMetrics = { ...this.state.metrics };
    if (countAsRequest) {
      const samples = [...nextMetrics.recentSamples, cleanEntry.latencyMs].slice(-MAX_SAMPLES);
      const totalRequests = nextMetrics.totalRequests + 1;
      const successCount = nextMetrics.successCount + (cleanEntry.ok ? 1 : 0);
      const errorCount = nextMetrics.errorCount + (cleanEntry.ok ? 0 : 1);
      const sum = samples.reduce((acc, v) => acc + v, 0);
      nextMetrics = {
        ...nextMetrics,
        lastLatencyMs: cleanEntry.latencyMs,
        avgLatencyMs: samples.length > 0 ? Math.round(sum / samples.length) : null,
        minLatencyMs:
          nextMetrics.minLatencyMs === null
            ? cleanEntry.latencyMs
            : Math.min(nextMetrics.minLatencyMs, cleanEntry.latencyMs),
        maxLatencyMs:
          nextMetrics.maxLatencyMs === null
            ? cleanEntry.latencyMs
            : Math.max(nextMetrics.maxLatencyMs, cleanEntry.latencyMs),
        totalRequests,
        successCount,
        errorCount,
        recentSamples: samples,
      };
    }

    this.state = {
      ...this.state,
      logs: nextLogs,
      metrics: nextMetrics,
    };
    this.emit();
  }

  public recordWsEvent(params: {
    event: string;
    route: TelemetryRoute;
    ok: boolean;
    latencyMs?: number;
    model?: string;
    wsState?: SystemStatusSnapshot["wsState"];
    detail?: string;
  }) {
    if (params.wsState || params.model) {
      this.state = {
        ...this.state,
        system: {
          ...this.state.system,
          ...(params.wsState ? { wsState: params.wsState } : {}),
          ...(params.model ? { wsModel: params.model } : {}),
        },
        metrics:
          typeof params.latencyMs === "number" && params.event === "CONNECTED"
            ? {
                ...this.state.metrics,
                wsHandshakeMs: Math.max(0, Math.round(params.latencyMs)),
              }
            : this.state.metrics,
      };
    }

    this.recordEntry(
      {
        kind: "ws",
        method: "WS",
        endpoint: "/api/live",
        route: params.route,
        status: params.event,
        ok: params.ok,
        latencyMs: params.latencyMs ?? 0,
        detail: params.detail,
      },
      params.event === "CONNECTED" || !params.ok
    );
  }

  public async refreshSystemHealth(): Promise<void> {
    if (this.isRefreshingHealth) return;
    this.isRefreshingHealth = true;
    const started = performance.now();
    try {
      const res = await fetch(getApiUrl("/api/health"));
      const elapsed = Math.round(performance.now() - started);
      if (!res.ok) {
        this.state = {
          ...this.state,
          system: {
            ...this.state.system,
            serverOnline: false,
            lastHealthCheckAt: Date.now(),
            lastError: `HTTP ${res.status}`,
          },
          metrics: {
            ...this.state.metrics,
            healthPingMs: elapsed,
          },
        };
        this.emit();
        return;
      }

      const data = await res.json();
      this.state = {
        ...this.state,
        system: {
          ...this.state.system,
          serverOnline: data.status === "ok",
          hasApiKey: Boolean(data.hasApiKey),
          hasDeveloperApiKey: Boolean(data.hasDeveloperApiKey),
          developerCareActive: Boolean(data.developerCareActive),
          uptimeSec: typeof data.uptimeSec === "number" ? data.uptimeSec : null,
          environment: data.environment || "runtime",
          activeLiveRoute: data.activeLiveRoute || "v1beta",
          browserOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
          lastHealthCheckAt: Date.now(),
          lastError: null,
        },
        metrics: {
          ...this.state.metrics,
          healthPingMs: elapsed,
        },
      };
      this.emit();
    } catch (err: any) {
      this.state = {
        ...this.state,
        system: {
          ...this.state.system,
          serverOnline: false,
          lastHealthCheckAt: Date.now(),
          lastError: sanitizeSensitiveText(err?.message || "Health check unreachable"),
        },
      };
      this.emit();
    } finally {
      this.isRefreshingHealth = false;
    }
  }

  private resourceObserverInstalled = false;

  private installResourceObserverFallback() {
    if (
      this.resourceObserverInstalled ||
      typeof window === "undefined" ||
      typeof PerformanceObserver === "undefined"
    ) {
      return;
    }
    this.resourceObserverInstalled = true;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType !== "resource") continue;
          const resEntry = entry as PerformanceResourceTiming;
          if (!resEntry.name || !resEntry.name.includes("/api/")) continue;
          const status =
            typeof (resEntry as any).responseStatus === "number" &&
            (resEntry as any).responseStatus > 0
              ? (resEntry as any).responseStatus
              : 200;
          this.recordEntry({
            kind: resEntry.name.includes("/api/health") ? "system" : "http",
            method: "API",
            endpoint: resEntry.name,
            route: "developer",
            status: `${status}`,
            ok: status >= 200 && status < 400,
            latencyMs: Math.round(resEntry.duration || 0),
            detail: "Observed",
          });
        }
      });
      observer.observe({ type: "resource", buffered: false });
    } catch {
      // PerformanceObserver not supported cleanly in this runtime
    }
  }

  public installFetchInterceptor() {
    if (this.fetchInstalled || typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }
    this.fetchInstalled = true;

    const nativeFetch = window.fetch.bind(window);
    const service = this;

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const isApiCall = rawUrl.includes("/api/");
      if (!isApiCall) {
        return nativeFetch(input, init);
      }

      const method = (
        init?.method ||
        (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET") ||
        "GET"
      ).toUpperCase();
      let route: TelemetryRoute = "default";
      let modelHint: string | undefined;

      if (typeof init?.body === "string" && init.body.trim().startsWith("{")) {
        try {
          const parsedBody = JSON.parse(init.body);
          if (parsedBody.preferDeveloperApi) {
            route = "developer";
          } else if (parsedBody.customApiKey) {
            route = "custom";
          }
          if (typeof parsedBody.model === "string") {
            modelHint = parsedBody.model;
          }
        } catch {
          // Ignore non-JSON bodies
        }
      }

      const started = performance.now();
      try {
        const response = await nativeFetch(input, init);
        const latencyMs = Math.round(performance.now() - started);

        service.recordEntry({
          kind: rawUrl.includes("/api/health") ? "system" : "http",
          method,
          endpoint: rawUrl,
          route,
          status: `${response.status}`,
          ok: response.ok,
          latencyMs,
          detail: modelHint ? `model=${modelHint}` : response.ok ? "OK" : response.statusText || "HTTP Error",
        });

        return response;
      } catch (err: any) {
        const latencyMs = Math.round(performance.now() - started);
        service.recordEntry({
          kind: "http",
          method,
          endpoint: rawUrl,
          route,
          status: "ERR",
          ok: false,
          latencyMs,
          detail: err?.message || "Network request failed",
        });
        throw err;
      }
    };

    try {
      const ownDesc = Object.getOwnPropertyDescriptor(window, "fetch");
      if (ownDesc && !ownDesc.configurable && !ownDesc.writable && !ownDesc.set) {
        this.installResourceObserverFallback();
        return;
      }
      Object.defineProperty(window, "fetch", {
        value: wrappedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // Fallback safely when browser/sandbox exposes window.fetch as a read-only getter
      this.installResourceObserverFallback();
    }
  }
}

export const developerTelemetryService = new DeveloperTelemetryService();
