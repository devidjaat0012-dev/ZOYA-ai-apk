import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  EyeOff,
  Gauge,
  Globe,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { AppConfig, isDeveloperApiSlot } from "../types";
import {
  ApiLogEntry,
  DeveloperTelemetryState,
  developerTelemetryService,
} from "../services/developerTelemetryService";

interface DeveloperConsoleProps {
  config: AppConfig;
  onUpdateConfig: (partial: Partial<AppConfig>) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
}

type LogFilter = "all" | "http" | "ws" | "errors";

function formatClockTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

function formatUptime(sec: number | null): string {
  if (sec === null || sec < 0) return "--";
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
}

export default function DeveloperConsole({
  config,
  onUpdateConfig,
  constraintsRef,
}: DeveloperConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [telemetry, setTelemetry] = useState<DeveloperTelemetryState>(() =>
    developerTelemetryService.getState()
  );

  const isVisible =
    config.developerCareEnabled !== false && config.developerConsoleEnabled !== false;
  const developerModeActive = isDeveloperApiSlot(config);

  useEffect(() => {
    const unsub = developerTelemetryService.subscribe(setTelemetry);
    return unsub;
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    developerTelemetryService.refreshSystemHealth();
    const interval = setInterval(() => {
      developerTelemetryService.refreshSystemHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const filteredLogs = useMemo<ApiLogEntry[]>(() => {
    if (filter === "http") {
      return telemetry.logs.filter((l) => l.kind === "http" || l.kind === "system");
    }
    if (filter === "ws") {
      return telemetry.logs.filter((l) => l.kind === "ws");
    }
    if (filter === "errors") {
      return telemetry.logs.filter((l) => !l.ok);
    }
    return telemetry.logs;
  }, [telemetry.logs, filter]);

  if (!isVisible) {
    return null;
  }

  const { metrics, system } = telemetry;
  const successRate =
    metrics.totalRequests > 0
      ? Math.round((metrics.successCount / metrics.totalRequests) * 100)
      : 100;
  const maxSample = Math.max(120, ...metrics.recentSamples, 1);

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0.05}
      className="fixed top-16 right-3 sm:right-5 z-40 max-w-[calc(100vw-1.5rem)] touch-none select-none"
    >
      <div className="rounded-2xl bg-[#0B101B]/95 backdrop-blur-xl border border-emerald-400/35 shadow-[0_14px_40px_rgba(0,0,0,0.65)] overflow-hidden text-slate-100">
        {/* Collapsible Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-slate-900/80 border-b border-white/10 cursor-grab active:cursor-grabbing">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 min-w-0 text-left"
            title={isExpanded ? "Collapse Developer Console" : "Expand Developer Console"}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                system.lastError || system.wsState === "error"
                  ? "bg-rose-400 animate-pulse"
                  : system.serverOnline
                  ? "bg-emerald-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <Terminal size={13} className="text-emerald-300 shrink-0" />
            <span className="text-[11px] font-bold tracking-wide text-white whitespace-nowrap">
              Developer Console
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                developerModeActive
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
              }`}
            >
              {developerModeActive ? "DEV KEY" : "DEFAULT"}
            </span>
            {metrics.lastLatencyMs !== null && (
              <span className="hidden xs:inline sm:inline text-[10px] font-mono text-cyan-300 whitespace-nowrap">
                {metrics.lastLatencyMs}ms
              </span>
            )}
            {metrics.errorCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/25 text-rose-300 border border-rose-400/40">
                {metrics.errorCount} ERR
              </span>
            )}
          </button>

          <div
            className="flex items-center gap-1 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isExpanded && (
              <>
                <button
                  type="button"
                  onClick={() => developerTelemetryService.refreshSystemHealth()}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Ping /api/health"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => developerTelemetryService.clearLogs()}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Clear API Logs"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ developerConsoleEnabled: false })}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                  title="Turn Off Developer Console (Re-enable in Settings)"
                >
                  <EyeOff size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-emerald-300 transition-colors"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse Developer Console" : "Expand Developer Console"}
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Expanded Telemetry Body */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-[90vw] sm:w-[430px] max-w-full overflow-hidden flex flex-col"
            >
              <div className="p-3 space-y-2.5 max-h-[68dvh] overflow-y-auto">
                {/* System Status Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-black/45 border border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Server size={11} className="text-emerald-400" />
                        Backend Server
                      </span>
                      <span className="font-mono text-slate-300">
                        {formatUptime(system.uptimeSec)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold flex items-center gap-1 ${
                          system.serverOnline ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {system.serverOnline ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <AlertTriangle size={11} />
                        )}
                        {system.serverOnline ? "Online" : "Unreachable"}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {metrics.healthPingMs !== null ? `${metrics.healthPingMs}ms ping` : "--"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-black/45 border border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={11} className="text-cyan-400" />
                        Developer Auth
                      </span>
                      <span className="font-mono text-emerald-300">
                        {system.activeLiveRoute}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-white truncate">
                        {system.hasDeveloperApiKey ? "Dev Key Ready" : "Default Server"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {developerModeActive ? "Active" : "Standby"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-black/45 border border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Radio size={11} className="text-pink-400" />
                        Live WebSocket
                      </span>
                      <span className="font-mono text-cyan-300">
                        {metrics.wsHandshakeMs !== null ? `${metrics.wsHandshakeMs}ms` : "--"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span
                        className={`text-[11px] font-bold capitalize ${
                          system.wsState === "connected"
                            ? "text-emerald-300"
                            : system.wsState === "connecting"
                            ? "text-amber-300"
                            : system.wsState === "error"
                            ? "text-rose-300"
                            : "text-slate-400"
                        }`}
                      >
                        {system.wsState}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[95px]">
                        {(config.liveModel || system.wsModel).replace("gemini-", "")}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-black/45 border border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Globe size={11} className="text-amber-300" />
                        Network &amp; Model
                      </span>
                      <span className="font-mono text-slate-300">
                        {system.environment}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span
                        className={`text-[11px] font-bold ${
                          system.browserOnline ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {system.browserOnline ? "Online" : "Offline"}
                      </span>
                      <span className="text-[9px] font-mono text-cyan-300 truncate max-w-[105px]">
                        {(config.chatModel || "gemini-4-hydrogen").replace("gemini-", "")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Latency Metrics & Sparkline */}
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Gauge size={12} />
                      Latency Metrics
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {metrics.totalRequests} reqs · {successRate}% ok
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] text-slate-400">Last</div>
                      <div className="text-[11px] font-mono font-bold text-white">
                        {metrics.lastLatencyMs !== null ? `${metrics.lastLatencyMs}ms` : "--"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] text-slate-400">Avg</div>
                      <div className="text-[11px] font-mono font-bold text-cyan-300">
                        {metrics.avgLatencyMs !== null ? `${metrics.avgLatencyMs}ms` : "--"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] text-slate-400">Min</div>
                      <div className="text-[11px] font-mono font-bold text-emerald-300">
                        {metrics.minLatencyMs !== null ? `${metrics.minLatencyMs}ms` : "--"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] text-slate-400">Max</div>
                      <div className="text-[11px] font-mono font-bold text-amber-300">
                        {metrics.maxLatencyMs !== null ? `${metrics.maxLatencyMs}ms` : "--"}
                      </div>
                    </div>
                  </div>

                  {/* SVG Latency Sparkline */}
                  <div className="h-9 w-full rounded-lg bg-black/50 border border-white/5 px-1.5 py-1 flex items-center">
                    {metrics.recentSamples.length > 0 ? (
                      <svg
                        viewBox="0 0 180 28"
                        className="w-full h-full overflow-visible"
                        preserveAspectRatio="none"
                      >
                        {metrics.recentSamples.map((val, idx) => {
                          const barH = Math.max(3, Math.round((val / maxSample) * 24));
                          const x = idx * 10;
                          const y = 26 - barH;
                          const fill =
                            val > 2500 ? "#fb7185" : val > 900 ? "#fbbf24" : "#34d399";
                          return (
                            <rect
                              key={`${idx}-${val}`}
                              x={x + 1}
                              y={y}
                              width="7"
                              height={barH}
                              rx="1.5"
                              fill={fill}
                              opacity="0.9"
                            />
                          );
                        })}
                      </svg>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono mx-auto">
                        Waiting for API requests...
                      </span>
                    )}
                  </div>
                </div>

                {/* Real-Time API Logs Feed */}
                <div className="rounded-xl bg-black/55 border border-white/10 overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 bg-white/[0.03]">
                    <span className="text-[10.5px] font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Activity size={12} />
                      Real-Time API Logs
                    </span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "http", label: "HTTP" },
                          { id: "ws", label: "Live WS" },
                          { id: "errors", label: "Errors" },
                        ] as { id: LogFilter; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFilter(tab.id)}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors ${
                            filter === tab.id
                              ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto divide-y divide-white/[0.06] font-mono text-[10px]">
                    {filteredLogs.length === 0 ? (
                      <div className="p-3 text-center text-slate-500">
                        No matching API events captured yet.
                      </div>
                    ) : (
                      filteredLogs.map((entry) => (
                        <div
                          key={entry.id}
                          className="px-2.5 py-1.5 flex items-start justify-between gap-2 hover:bg-white/[0.03]"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500">
                                {formatClockTime(entry.timestamp)}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                  entry.kind === "ws"
                                    ? "bg-pink-500/20 text-pink-300"
                                    : "bg-cyan-500/20 text-cyan-300"
                                }`}
                              >
                                {entry.method}
                              </span>
                              <span className="text-white truncate max-w-[175px]">
                                {entry.endpoint}
                              </span>
                            </div>
                            {entry.detail && (
                              <div className="text-[9.5px] text-slate-400 truncate">
                                {entry.route === "developer" ? "[DEV]" : "[STD]"} {entry.detail}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                entry.ok
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/25 text-rose-300"
                              }`}
                            >
                              {entry.status}
                            </span>
                            <span className="text-slate-400 w-11 text-right">
                              {entry.latencyMs}ms
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Footer Note */}
                <div className="flex items-center justify-between text-[9.5px] text-slate-500 px-0.5">
                  <span className="flex items-center gap-1">
                    <Cpu size={10} />
                    Active when Developer Care Mode is ON
                  </span>
                  <span>Keys &amp; tokens masked</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
