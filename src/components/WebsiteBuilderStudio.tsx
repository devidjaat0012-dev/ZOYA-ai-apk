import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../utils/apiBase";
import {
  Code2,
  Globe,
  Sparkles,
  Play,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Move,
  X,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  FolderOpen,
  Wand2,
  Loader2,
  Trash2,
  Rocket,
  Link2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  AppConfig,
  CHAT_MODEL_OPTIONS,
  getAllAvailableApiKeys,
  isDeveloperApiSlot,
  resolveActiveApiKey,
} from "../types";
import {
  PRO_TRADING_WEBSITE_HTML,
  isTradingWebsiteRequest,
  synthesizeSmartWebsiteByTopic,
} from "../services/websiteTemplates";
import {
  ZOYA_PERSONAL_TLD,
  buildZoyaDomainBrowserUrl,
  deleteWebsiteFromServer,
  fetchPublishedWebsiteFromServer,
  formatZoyaDomain,
  formatZoyaDomainUrl,
  normalizeZoyaSubdomain,
  publishWebsiteToServer,
  registerZoyaDomain,
  removeZoyaDomain,
} from "../zoyaDomain";

export interface BuiltWebsiteProject {
  id: string;
  title: string;
  slug: string;
  domainName?: string;
  prompt: string;
  htmlCode: string;
  createdAt: number;
  isPublished?: boolean;
  publishedAt?: number;
  publishedUrl?: string;
}

const WEBSITES_STORAGE_KEY = "zoya_built_websites_v1";

export function slugifyWebsiteTitle(title: string): string {
  return normalizeZoyaSubdomain(title);
}

export function buildPublishedSiteUrl(slug: string): string {
  return buildZoyaDomainBrowserUrl(slug);
}

const DEFAULT_DEVID_PORTFOLIO_HTML = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Devid (@devid_jaat13) — Official Creator & Developer Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #07090e; color: #f8fafc; }
    h1, h2, h3, .font-display { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-[#07090e] text-slate-100 selection:bg-pink-500 selection:text-white overflow-x-hidden">
  <!-- Ambient Glow -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]"></div>
    <div class="absolute top-1/3 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[130px]"></div>
  </div>

  <!-- Navbar -->
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-[#07090e]/80 border-b border-white/10">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="font-display font-bold text-lg tracking-tight flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
        <span>DEVID <span class="text-pink-400">JAAT</span></span>
      </div>
      <nav class="hidden sm:flex items-center gap-6 text-sm text-slate-300">
        <a href="#about" class="hover:text-white transition">About</a>
        <a href="#projects" class="hover:text-white transition">Projects</a>
        <a href="#contact" class="hover:text-white transition">Connect</a>
      </nav>
      <a href="https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3" target="_blank" rel="noopener noreferrer"
         class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white text-xs font-semibold shadow-lg hover:opacity-95 transition">
        Follow @devid_jaat13
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
    <section class="py-12 md:py-20 flex flex-col items-start max-w-3xl">
      <p class="text-xs uppercase tracking-widest text-pink-400 font-semibold mb-3">
        Official Digital Portfolio · Devid
      </p>
      <h1 class="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
        Building bold digital experiences &amp; next-gen AI creations.
      </h1>
      <p class="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl">
        Welcome to the official personal hub of <strong class="text-white">Devid (@devid_jaat13)</strong>. Exploring AI innovation, custom web architecture, and creative digital lifestyle.
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <a href="https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3" target="_blank" rel="noopener noreferrer"
           class="px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-semibold text-sm hover:bg-pink-50 transition shadow-xl">
          Instagram · @devid_jaat13
        </a>
        <a href="#projects"
           class="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-sm transition">
          Explore Showcase
        </a>
      </div>
    </section>

    <!-- Featured Cards -->
    <section id="projects" class="py-12 border-t border-white/10">
      <h2 class="font-display text-2xl font-bold mb-8">Featured Highlights</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 transition">
          <div class="text-xs text-pink-400 font-semibold mb-2">01 · AI Companion</div>
          <h3 class="font-display text-lg font-bold mb-2">Zoya Live Voice AI</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Real-time Hinglish AI companion with hands-free wake word, live screen vision, and instant browser website publisher.
          </p>
        </div>
        <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition">
          <div class="text-xs text-cyan-400 font-semibold mb-2">02 · Social Hub</div>
          <h3 class="font-display text-lg font-bold mb-2">@devid_jaat13 Community</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Lifestyle, reels, and creative updates directly on Instagram. Connect for collaborations and updates.
          </p>
        </div>
        <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 transition">
          <div class="text-xs text-amber-400 font-semibold mb-2">03 · Web Studio</div>
          <h3 class="font-display text-lg font-bold mb-2">Custom Web Apps</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            High-speed interactive landing pages, dashboards, and modern web experiences crafted and published on demand.
          </p>
        </div>
      </div>
    </section>

    <!-- Interactive Contact CTA -->
    <section id="contact" class="mt-12 p-8 rounded-3xl bg-gradient-to-br from-pink-500/15 via-slate-900 to-cyan-500/10 border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div>
        <h2 class="font-display text-2xl font-bold mb-1">Let's Connect on Instagram</h2>
        <p class="text-sm text-slate-300">Drop a message or follow @devid_jaat13 for the latest updates.</p>
      </div>
      <a href="https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3" target="_blank" rel="noopener noreferrer"
         class="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm transition shrink-0">
        Open @devid_jaat13 →
      </a>
    </section>
  </main>
</body>
</html>`;

/**
 * Strips any legacy or accidental "Published by Zoya" or "Built by Zoya" watermarks
 * to ensure 100% white-labeled, professional websites for the user.
 */
export function stripZoyaWatermarks(html: string): string {
  if (!html) return html;
  return html
    .replace(/Live\s+Published\s+by\s+Zoya(\s*AI)?/gi, "")
    .replace(/Published\s+Live\s+by\s+Zoya(\s*AI)?/gi, "")
    .replace(/Published\s+by\s+Zoya(\s*AI)?/gi, "")
    .replace(/Designed\s+&amp;\s+Published\s+Live\s+by\s+Zoya\s+AI\s+for/gi, "Official Digital Portfolio ·")
    .replace(/Designed\s+&\s+Published\s+Live\s+by\s+Zoya\s+AI\s+for/gi, "Official Digital Portfolio ·")
    .replace(/Designed\s+by\s+Zoya(\s*AI)?/gi, "")
    .replace(/·\s*BUILT\s+BY\s+ZOYA\s+AI/gi, "")
    .replace(/BUILT\s+BY\s+ZOYA\s+AI/gi, "")
    .replace(/Built\s+by\s+Zoya(\s*AI)?/gi, "")
    .replace(/Created\s+by\s+Zoya(\s*AI)?/gi, "");
}

export function loadSavedWebsites(): BuiltWebsiteProject[] {
  const tradingSlug = "tradex-pro-trading";
  const tradingDomain = formatZoyaDomain(tradingSlug);
  const tradingSite: BuiltWebsiteProject = {
    id: "web_default_tradex_pro",
    title: "TradeX Pro — Live Crypto, Nifty & Forex Trading Website",
    slug: tradingSlug,
    domainName: tradingDomain,
    prompt:
      "Live interactive Crypto, Nifty 50 & Forex trading website with real-time candlestick charts, orderbook, Buy/Long & Sell/Short execution, and live PnL tracker.",
    htmlCode: PRO_TRADING_WEBSITE_HTML,
    createdAt: 1700000000000,
    isPublished: true,
    publishedAt: 1700000000000,
    publishedUrl: buildPublishedSiteUrl(tradingSlug),
  };

  const defaultSlug = "devid-jaat13";
  const defaultDomain = formatZoyaDomain(defaultSlug);
  const defaultSite: BuiltWebsiteProject = {
    id: "web_default_devid_portfolio",
    title: "Devid (@devid_jaat13) Creator Website",
    slug: defaultSlug,
    domainName: defaultDomain,
    prompt: "Personal creator & developer portfolio website for Devid (@devid_jaat13)",
    htmlCode: DEFAULT_DEVID_PORTFOLIO_HTML,
    createdAt: 1699999940000,
    isPublished: true,
    publishedAt: 1699999940000,
    publishedUrl: buildPublishedSiteUrl(defaultSlug),
  };

  registerZoyaDomain({ slugOrDomain: tradingSlug, title: tradingSite.title });
  registerZoyaDomain({ slugOrDomain: defaultSlug, title: defaultSite.title });

  try {
    const raw = localStorage.getItem(WEBSITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized: BuiltWebsiteProject[] = parsed.map((item: any) => {
          const slug = item.slug || slugifyWebsiteTitle(item.title || "zoya-site");
          const combinedMeta = `${item.title || ""} ${slug} ${item.prompt || ""}`;
          // Heal any previously mis-published trading project that accidentally stored the creator portfolio HTML
          const shouldHealTradingHtml =
            isTradingWebsiteRequest(combinedMeta) &&
            (!item.htmlCode ||
              item.htmlCode.includes("@devid_jaat13 Community") ||
              item.htmlCode === DEFAULT_DEVID_PORTFOLIO_HTML);

          const finalSlug =
            shouldHealTradingHtml && slug === "devid-jaat13"
              ? tradingSlug
              : slug;

          const rawCode = shouldHealTradingHtml ? PRO_TRADING_WEBSITE_HTML : item.htmlCode;
          const cleanCode = stripZoyaWatermarks(rawCode);
          const resolvedTitle =
            shouldHealTradingHtml &&
            String(item.title || "").toLowerCase().includes("devid (@devid_jaat13)")
              ? tradingSite.title
              : item.title;
          const domainName = formatZoyaDomain(finalSlug);
          registerZoyaDomain({ slugOrDomain: finalSlug, title: resolvedTitle });

          return {
            ...item,
            title: resolvedTitle,
            slug: finalSlug,
            domainName,
            htmlCode: cleanCode,
            isPublished: item.isPublished ?? true,
            publishedUrl: buildPublishedSiteUrl(finalSlug),
          };
        });

        const hasTradingSite = normalized.some((p) =>
          isTradingWebsiteRequest(`${p.title} ${p.slug} ${p.prompt}`)
        );
        if (!hasTradingSite) {
          return [tradingSite, ...normalized];
        }
        return normalized;
      }
    }
  } catch {}
  return [tradingSite, defaultSite];
}

export function saveWebsiteProjects(list: BuiltWebsiteProject[]): void {
  const capped = list.slice(0, 25);
  for (let count = capped.length; count >= 1; count--) {
    try {
      localStorage.setItem(WEBSITES_STORAGE_KEY, JSON.stringify(capped.slice(0, count)));
      window.dispatchEvent(new CustomEvent("zoya_websites_updated"));
      return;
    } catch {
      // If QuotaExceededError happens, trim oldest projects until the newest active project fits
    }
  }
}

export function findExactPublishedSiteLocally(slugOrDomain: string): BuiltWebsiteProject | null {
  const cleanSlug = normalizeZoyaSubdomain(decodeURIComponent(slugOrDomain || ""));
  if (!cleanSlug) return null;
  const targetDomain = formatZoyaDomain(cleanSlug);
  const all = loadSavedWebsites();

  // 1. Exact slug or domain match
  const exactSlugMatch = all.find(
    (p) =>
      p.slug.toLowerCase() === cleanSlug ||
      (p.domainName && p.domainName.toLowerCase() === targetDomain)
  );
  if (exactSlugMatch) return exactSlugMatch;

  // 2. Exact normalized title match (NO fuzzy substring matching so unrelated titles never hijack)
  const exactTitleMatch = all.find(
    (p) => slugifyWebsiteTitle(p.title) === cleanSlug
  );
  if (exactTitleMatch) return exactTitleMatch;

  return null;
}

export function findPublishedSiteBySlug(slug: string): BuiltWebsiteProject | null {
  const cleanSlug = normalizeZoyaSubdomain(decodeURIComponent(slug || ""));
  if (!cleanSlug) return null;

  const exact = findExactPublishedSiteLocally(cleanSlug);
  if (exact) return exact;

  // Fallback topic-aware synthesis only if not found locally or on server
  const synthesized = synthesizeSmartWebsiteByTopic(
    cleanSlug.replace(/-/g, " "),
    cleanSlug.replace(/-/g, " ")
  );
  const domainName = formatZoyaDomain(cleanSlug);
  registerZoyaDomain({ slugOrDomain: cleanSlug, title: synthesized.title });
  return {
    id: `web_dynamic_${cleanSlug}`,
    title: synthesized.title,
    slug: cleanSlug,
    domainName,
    prompt: cleanSlug.replace(/-/g, " "),
    htmlCode: synthesized.htmlCode,
    createdAt: Date.now(),
    isPublished: true,
    publishedAt: Date.now(),
    publishedUrl: buildPublishedSiteUrl(cleanSlug),
  };
}

/**
 * Opens a published website in a new browser tab cleanly via anchor click (no window.open blocker).
 */
export function launchPublishedSiteInBrowserTab(project: BuiltWebsiteProject): string {
  const liveUrl = project.publishedUrl || buildPublishedSiteUrl(project.slug);
  try {
    const a = document.createElement("a");
    a.href = liveUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {}
  return liveUrl;
}

export function extractCleanHtml(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  const fenceMatch = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const docTypeIdx = trimmed.toLowerCase().indexOf("<!doctype html");
  if (docTypeIdx !== -1) {
    return trimmed.slice(docTypeIdx).trim();
  }
  const htmlTagIdx = trimmed.toLowerCase().indexOf("<html");
  if (htmlTagIdx !== -1) {
    return trimmed.slice(htmlTagIdx).trim();
  }
  return trimmed;
}

/**
 * Full-screen standalone browser viewer when visiting `/?domain=<slug>.zoya_online` or `/?site=<slug>`.
 */
export function PublishedSiteStandaloneView({
  slug,
  onExitToZoya,
}: {
  slug: string;
  onExitToZoya: () => void;
}) {
  const normalizedSlug = normalizeZoyaSubdomain(slug);
  const [project, setProject] = useState<BuiltWebsiteProject | null>(() =>
    findExactPublishedSiteLocally(normalizedSlug)
  );
  const [isLoadingServer, setIsLoadingServer] = useState<boolean>(
    () => !findExactPublishedSiteLocally(normalizedSlug)
  );
  const [hideBadge, setHideBadge] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const localExact = findExactPublishedSiteLocally(normalizedSlug);
    if (localExact) {
      setProject(localExact);
      setIsLoadingServer(false);
    } else {
      setIsLoadingServer(true);
    }

    fetchPublishedWebsiteFromServer(normalizedSlug).then((serverSite) => {
      if (cancelled) return;
      if (serverSite && serverSite.htmlCode) {
        const localTimestamp = localExact?.publishedAt || 0;
        const serverTimestamp = serverSite.publishedAt || 0;
        if (!localExact || serverTimestamp >= localTimestamp) {
          const resolved: BuiltWebsiteProject = {
            id: serverSite.id,
            title: serverSite.title,
            slug: serverSite.slug || normalizedSlug,
            domainName: serverSite.domainName || formatZoyaDomain(normalizedSlug),
            prompt: serverSite.prompt || "",
            htmlCode: stripZoyaWatermarks(serverSite.htmlCode),
            createdAt: serverSite.createdAt || Date.now(),
            isPublished: true,
            publishedAt: serverTimestamp || Date.now(),
            publishedUrl: buildPublishedSiteUrl(serverSite.slug || normalizedSlug),
          };
          setProject(resolved);
          setIsLoadingServer(false);
          return;
        }
      }
      if (!localExact) {
        setProject(findPublishedSiteBySlug(normalizedSlug));
      }
      setIsLoadingServer(false);
    });

    const syncFromLocal = () => {
      const latest = findExactPublishedSiteLocally(normalizedSlug);
      if (latest) setProject(latest);
    };
    window.addEventListener("storage", syncFromLocal);
    window.addEventListener("zoya_websites_updated", syncFromLocal);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncFromLocal);
      window.removeEventListener("zoya_websites_updated", syncFromLocal);
    };
  }, [normalizedSlug]);

  if (isLoadingServer && !project) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center gap-3">
        <Loader2 size={32} className="text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-emerald-300">
          Loading {formatZoyaDomain(normalizedSlug)}...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center">
        <Globe size={40} className="text-cyan-400 mb-3" />
        <h1 className="text-xl font-bold mb-2">
          Domain Not Found ({formatZoyaDomain(normalizedSlug)})
        </h1>
        <button
          type="button"
          onClick={onExitToZoya}
          className="mt-3 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs"
        >
          Back to Zoya AI
        </button>
      </div>
    );
  }

  const cleanHtml = stripZoyaWatermarks(project.htmlCode);
  const personalDomain = project.domainName || formatZoyaDomain(project.slug);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden z-[999]">
      <iframe
        key={`${project.id}-${project.publishedAt || 0}`}
        title={`${project.title} (${personalDomain})`}
        srcDoc={cleanHtml}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      {!hideBadge && (
        <div className="fixed bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 hover:bg-slate-950/95 border border-emerald-400/25 backdrop-blur-md shadow-lg text-[11px] text-slate-300 opacity-65 hover:opacity-100 transition-all">
          <span className="font-mono text-emerald-300 text-[10px]">
            {personalDomain}
          </span>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={onExitToZoya}
            className="hover:text-white flex items-center gap-1 text-[11px] font-medium"
            title="Return to Studio"
          >
            <ArrowLeft size={11} />
            <span>Studio</span>
          </button>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={() => setHideBadge(true)}
            className="text-slate-400 hover:text-white p-0.5"
            title="Hide button"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

const QUICK_WEBSITE_PRESETS: Array<{ label: string; title: string; prompt: string }> = [
  {
    label: "📈 Live Crypto & Nifty Trading",
    title: "TradeX Pro — Live Crypto, Nifty & Forex Trading Website",
    prompt:
      "Build a live interactive Crypto, Nifty 50 & Forex trading terminal website with a real-time HTML5 candlestick chart, timeframe switcher (1m, 5m, 15m, 1H, 1D), live orderbook, Buy/Long & Sell/Short execution panel with leverage slider, and live PnL position tracker.",
  },
  {
    label: "E-Commerce Sneaker Store",
    title: "StreetKicks Sneaker Store",
    prompt:
      "Create a modern streetwear & sneaker e-commerce store website with a featured hero drop, interactive product cards with 'Add to Cart' counter & cart drawer, category filter buttons, and customer reviews.",
  },
  {
    label: "Fitness & Gym Club",
    title: "IronPulse Fitness Club",
    prompt:
      "Create an energetic luxury gym & fitness website with a BMI/Calorie calculator widget, membership pricing tiers, workout programs grid, and trainer showcase.",
  },
  {
    label: "Gaming & Esports Hub",
    title: "NovaStrike Esports Arena",
    prompt:
      "Build a high-contrast gaming & esports tournament website with live match scoreboard, leaderboard table, team roster cards, and tournament registration form.",
  },
  {
    label: "Devid Portfolio (@devid_jaat13)",
    title: "Devid (@devid_jaat13) Official Website",
    prompt:
      "Build a sleek dark-mode personal creator & developer website for Devid (@devid_jaat13) featuring a bold hero section, Instagram link (https://www.instagram.com/devid_jaat13?stkn=eHJ1aTdpa3ljejZ3), project showcase grid, stats counter, and interactive contact section.",
  },
];

interface WebsiteBuilderStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  externalBuildRequest?: {
    projectName?: string;
    prompt: string;
    autoPublish?: boolean;
    openInBrowser?: boolean;
    timestamp: number;
  } | null;
  externalPublishRequest?: {
    projectName?: string;
    customSlug?: string;
    openInBrowser?: boolean;
    timestamp: number;
  } | null;
  isLiveActive: boolean;
  onTriggerZoyaVoice?: (promptText: string) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
}

export default function WebsiteBuilderStudio({
  isOpen,
  onClose,
  config,
  externalBuildRequest,
  externalPublishRequest,
  isLiveActive,
  onTriggerZoyaVoice,
  constraintsRef,
}: WebsiteBuilderStudioProps) {
  const [projects, setProjects] = useState<BuiltWebsiteProject[]>(() =>
    loadSavedWebsites()
  );
  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => loadSavedWebsites()[0]?.id || "web_default_devid_portfolio"
  );
  const [promptInput, setPromptInput] = useState<string>("");
  const [customSlugInput, setCustomSlugInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "saved">("preview");
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [isFullWindow, setIsFullWindow] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [copiedLiveUrl, setCopiedLiveUrl] = useState<boolean>(false);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState<boolean>(true);

  const lastBuildTimestampRef = useRef<number>(0);
  const lastPublishTimestampRef = useRef<number>(0);
  const codeSyncTimeoutRef = useRef<number | null>(null);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    if (activeProject) {
      setCustomSlugInput(activeProject.slug);
    }
  }, [activeProject?.id, activeProject?.slug]);

  // Keep server-side .zoya_online registry synchronized with the currently previewed site
  useEffect(() => {
    if (activeProject?.htmlCode) {
      void publishWebsiteToServer({
        id: activeProject.id,
        slug: activeProject.slug,
        domainName: activeProject.domainName || formatZoyaDomain(activeProject.slug),
        title: activeProject.title,
        prompt: activeProject.prompt,
        htmlCode: stripZoyaWatermarks(activeProject.htmlCode),
        owner: config.userName || "Devid",
        createdAt: activeProject.createdAt,
        publishedAt: activeProject.publishedAt || Date.now(),
      });
    }
  }, [activeProject?.id]);

  /**
   * Publishes a project immediately to Zoya's personal `.zoya_online` domain & browser URL with zero friction.
   */
  const publishProjectToBrowser = (
    targetProj: BuiltWebsiteProject,
    desiredSlug?: string,
    shouldOpenTab: boolean = true
  ): BuiltWebsiteProject => {
    const cleanSlug = slugifyWebsiteTitle(
      desiredSlug || customSlugInput || targetProj.slug || targetProj.title
    );
    const domainName = formatZoyaDomain(cleanSlug);
    const liveUrl = buildPublishedSiteUrl(cleanSlug);
    const cleanedHtml = stripZoyaWatermarks(targetProj.htmlCode);
    const publishedAt = Date.now();

    registerZoyaDomain({
      slugOrDomain: cleanSlug,
      title: targetProj.title,
      owner: config.userName || "Devid",
    });

    const publishedProj: BuiltWebsiteProject = {
      ...targetProj,
      slug: cleanSlug,
      domainName,
      htmlCode: cleanedHtml,
      isPublished: true,
      publishedAt,
      publishedUrl: liveUrl,
    };

    const currentSaved = loadSavedWebsites();
    const baseList = currentSaved.length > 0 ? currentSaved : projects;
    const updatedList = [
      publishedProj,
      ...baseList.filter(
        (p) => p.id !== publishedProj.id && p.slug !== cleanSlug
      ),
    ].slice(0, 25);

    setProjects(updatedList);
    setActiveProjectId(publishedProj.id);
    setCustomSlugInput(cleanSlug);
    saveWebsiteProjects(updatedList);

    // Immediately sync exact preview HTML to server before opening tab so cross-tab/external views always match
    void publishWebsiteToServer(
      {
        id: publishedProj.id,
        slug: cleanSlug,
        domainName,
        title: publishedProj.title,
        prompt: publishedProj.prompt,
        htmlCode: cleanedHtml,
        owner: config.userName || "Devid",
        createdAt: publishedProj.createdAt,
        publishedAt,
      },
      true
    );

    setStatusNote(`Published Live: ${domainName}`);

    if (shouldOpenTab) {
      launchPublishedSiteInBrowserTab(publishedProj);
    }

    return publishedProj;
  };

  const generateWebsiteFromPrompt = async (
    targetPrompt: string,
    suggestedTitle?: string,
    isRefinement: boolean = false,
    openBrowserAfterPublish: boolean = false
  ) => {
    const cleanPrompt = targetPrompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setIsGenerating(true);
    setActiveTab("preview");
    setStatusNote(
      `Zoya is building & publishing: "${suggestedTitle || cleanPrompt.slice(0, 38)}..."`
    );

    const availableKeys = getAllAvailableApiKeys(config);
    const primaryKey = resolveActiveApiKey(config);
    const keysToTry =
      config.autoFailoverApi !== false && availableKeys.length > 0
        ? availableKeys.map((k) => k.key)
        : [primaryKey];

    const primaryModel = config.chatModel || "gemini-4-hydrogen";
    const fallbackModels = CHAT_MODEL_OPTIONS.map((m) => m.id).filter(
      (id) => id !== primaryModel
    );
    const modelsToTry =
      config.autoFailoverApi !== false
        ? [primaryModel, ...fallbackModels]
        : [primaryModel];

    const isTradingTopic = isTradingWebsiteRequest(
      `${cleanPrompt} ${suggestedTitle || ""}`
    );

    const systemInstruction = `You are Zoya's elite Full-Stack Web Architect building and publishing a complete, production-grade single-file website for ${
      config.userName || "Devid"
    }.
Return ONLY a complete, valid HTML5 document starting with <!DOCTYPE html> and ending with </html>.
CRITICAL RULES:
- Include <script src="https://cdn.tailwindcss.com"></script> and Google Fonts in <head>.
- NEVER build a generic photo gallery or creator portfolio unless the user explicitly asks for a photography/personal portfolio.
- NEVER use random stock photos or portrait images for functional web apps (like Trading Terminals, Crypto Exchanges, SaaS Dashboards, Calculators, or Games).
- If the request is for a Trading / Crypto / Stock / Nifty / Forex website, build a real dark-mode TradingView/Binance-style terminal with an HTML5 <canvas> live candlestick chart, timeframe switcher, live order book, Buy/Long & Sell/Short trade execution panel, and live PnL positions table.
- Every button, tab, calculator, and form must have working JavaScript interactivity.
- ABSOLUTELY NEVER include watermarks, badges, tags, or footer attributions stating "Published by Zoya", "Built by Zoya", or "Created by Zoya AI". The website must be 100% white-labeled and clean for the user.
- Do NOT wrap in markdown explanations—return only the HTML code.`;

    const userMessage =
      isRefinement && activeProject
        ? `Update and improve the existing website HTML based on this instruction from ${config.userName}: "${cleanPrompt}"\n\nCURRENT HTML:\n${activeProject.htmlCode}`
        : `Build a complete, modern, interactive single-file website for ${config.userName} based on this exact request: "${cleanPrompt}"`;

    let generatedHtml = "";

    // For fresh trading website requests, use our institutional interactive Trading Terminal immediately if API is slow or if user wants instant trading terminal
    if (!isRefinement && isTradingTopic) {
      const instantTrading = synthesizeSmartWebsiteByTopic(
        cleanPrompt,
        suggestedTitle,
        config.userName || "Devid"
      );
      generatedHtml = instantTrading.htmlCode;
    } else {
      try {
        const customApiKey = resolveActiveApiKey(config) || undefined;
        const response = await fetch(getApiUrl("/api/gemini/website/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage,
            systemInstruction,
            model: config.chatModel || "gemini-4-hydrogen",
            customApiKey,
            preferDeveloperApi: isDeveloperApiSlot(config),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const extracted = extractCleanHtml(data.text || "");
          if (extracted && extracted.includes("<")) {
            generatedHtml = extracted;
          }
        }
      } catch (err) {
        console.warn("Website generation server fetch failed, using smart synthesizer fallback:", err);
      }
    }

    // Fallback to Smart Topic Synthesizer so we NEVER publish the wrong template on API quota error
    const fallbackSynthesized = synthesizeSmartWebsiteByTopic(
      cleanPrompt,
      suggestedTitle,
      config.userName || "Devid"
    );
    const finalHtml = stripZoyaWatermarks(generatedHtml || fallbackSynthesized.htmlCode);
    const titleToUse =
      suggestedTitle ||
      (isRefinement && activeProject
        ? activeProject.title
        : fallbackSynthesized.title);

    const slug =
      isRefinement && activeProject
        ? slugifyWebsiteTitle(customSlugInput || activeProject.slug || titleToUse)
        : slugifyWebsiteTitle(titleToUse);
    const domainName = formatZoyaDomain(slug);
    const liveUrl = buildPublishedSiteUrl(slug);
    const publishedAt = Date.now();
    registerZoyaDomain({
      slugOrDomain: slug,
      title: titleToUse,
      owner: config.userName || "Devid",
    });

    const newProj: BuiltWebsiteProject = {
      id: isRefinement && activeProject ? activeProject.id : `web_${Date.now()}`,
      title: titleToUse,
      slug,
      domainName,
      prompt: cleanPrompt,
      htmlCode: finalHtml,
      createdAt: isRefinement && activeProject ? activeProject.createdAt : publishedAt,
      isPublished: true,
      publishedAt,
      publishedUrl: liveUrl,
    };

    setProjects((prevProjects) => {
      const updatedList = [
        newProj,
        ...prevProjects.filter((p) => p.id !== newProj.id && p.slug !== newProj.slug),
      ].slice(0, 25);
      saveWebsiteProjects(updatedList);
      return updatedList;
    });
    setActiveProjectId(newProj.id);
    setCustomSlugInput(slug);

    await publishWebsiteToServer({
      id: newProj.id,
      slug,
      domainName,
      title: titleToUse,
      prompt: cleanPrompt,
      htmlCode: finalHtml,
      owner: config.userName || "Devid",
      createdAt: newProj.createdAt,
      publishedAt,
    });

    setStatusNote(`Built & Hosted Live on ${domainName}!`);
    setPromptInput("");

    if (openBrowserAfterPublish) {
      launchPublishedSiteInBrowserTab(newProj);
    }

    if (isLiveActive) {
      onTriggerZoyaVoice?.(
        `[You just finished building AND hosting the website "${titleToUse}" live on Zoya's personal domain "${domainName}" for ${config.userName}! Tell ${config.userName} happily in Hinglish ("Lo ${config.userName}! Maine tumhari '${titleToUse}' website bilkul sahi features ke saath bana ke tumhare personal domain ${domainName} per live host aur publish kar di hai!")]`
      );
    }

    setIsGenerating(false);
  };

  // Handle external build requests from Zoya (`buildWebsite` tool)
  useEffect(() => {
    if (
      !externalBuildRequest ||
      !externalBuildRequest.prompt ||
      externalBuildRequest.timestamp <= lastBuildTimestampRef.current
    ) {
      return;
    }
    lastBuildTimestampRef.current = externalBuildRequest.timestamp;
    setIsMinimized(false);
    generateWebsiteFromPrompt(
      externalBuildRequest.prompt,
      externalBuildRequest.projectName,
      false,
      Boolean(externalBuildRequest.openInBrowser)
    );
  }, [externalBuildRequest]);

  // Handle external instant publish requests from Zoya (`publishWebsite` tool)
  useEffect(() => {
    if (
      !externalPublishRequest ||
      externalPublishRequest.timestamp <= lastPublishTimestampRef.current
    ) {
      return;
    }
    lastPublishTimestampRef.current = externalPublishRequest.timestamp;
    setIsMinimized(false);

    const requestedName = (
      externalPublishRequest.projectName ||
      externalPublishRequest.customSlug ||
      ""
    ).trim();

    const genericRequestTerms = new Set([
      "",
      "website",
      "my-website",
      "meri-website",
      "this-website",
      "current-website",
      "active-website",
      "site",
      "my-site",
    ]);
    const normalizedRequestedSlug = requestedName
      ? slugifyWebsiteTitle(requestedName)
      : "";
    const isGenericPublishActive = genericRequestTerms.has(normalizedRequestedSlug);

    const matchedProject =
      !isGenericPublishActive && requestedName
        ? projects.find(
            (p) =>
              p.slug.toLowerCase() === normalizedRequestedSlug ||
              slugifyWebsiteTitle(p.title) === normalizedRequestedSlug ||
              p.title.toLowerCase().includes(requestedName.toLowerCase())
          )
        : undefined;

    // If a specific project/topic was requested (e.g. "Coffee Shop") that isn't built yet,
    // build and publish that exact website instead of publishing an unrelated default portfolio!
    if (!isGenericPublishActive && requestedName && !matchedProject) {
      generateWebsiteFromPrompt(
        requestedName,
        externalPublishRequest.projectName || requestedName,
        false,
        externalPublishRequest.openInBrowser !== false
      );
      return;
    }

    const target = matchedProject || activeProject;

    if (target) {
      const slugToUse = isGenericPublishActive
        ? target.slug
        : externalPublishRequest.customSlug || target.slug;
      const published = publishProjectToBrowser(
        target,
        slugToUse,
        externalPublishRequest.openInBrowser !== false
      );
      if (isLiveActive) {
        onTriggerZoyaVoice?.(
          `[You just published "${published.title}" live on Zoya's personal domain "${published.domainName || formatZoyaDomain(published.slug)}" and launched it! Tell ${config.userName} proudly in Hinglish ("Done ${config.userName}! Maine '${published.title}' bina kisi problem ke ${published.domainName || formatZoyaDomain(published.slug)} per live host aur publish kar di hai aur naye tab me open bhi kar diya hai!")]`
        );
      }
    }
  }, [externalPublishRequest]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!activeProject) return;
    navigator.clipboard.writeText(activeProject.htmlCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyDomain = () => {
    if (!activeProject) return;
    const domain = formatZoyaDomain(customSlugInput || activeProject.slug);
    navigator.clipboard.writeText(formatZoyaDomainUrl(domain)).catch(() => {});
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2200);
  };

  const activeTargetSlug = activeProject
    ? slugifyWebsiteTitle(customSlugInput || activeProject.slug)
    : "devid-jaat13";

  const activePersonalDomain = formatZoyaDomain(activeTargetSlug);

  const livePublishedUrl = activeProject
    ? buildPublishedSiteUrl(activeTargetSlug)
    : "";

  const handleCopyLiveUrl = () => {
    if (!activeProject) return;
    publishProjectToBrowser(activeProject, customSlugInput, false);
    const url = buildPublishedSiteUrl(activeTargetSlug);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLiveUrl(true);
    setTimeout(() => setCopiedLiveUrl(false), 2200);
  };

  const handleDownloadHtml = () => {
    if (!activeProject) return;
    const blob = new Blob([stripZoyaWatermarks(activeProject.htmlCode)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTargetSlug || "zoya-website"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleCodeChange = (newCode: string) => {
    if (!activeProject) return;
    const cleaned = stripZoyaWatermarks(newCode);
    const now = Date.now();
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? { ...p, htmlCode: cleaned, publishedAt: now }
        : p
    );
    setProjects(updated);
    saveWebsiteProjects(updated);
    if (codeSyncTimeoutRef.current) {
      window.clearTimeout(codeSyncTimeoutRef.current);
    }
    const targetSlug = slugifyWebsiteTitle(customSlugInput || activeProject.slug);
    codeSyncTimeoutRef.current = window.setTimeout(() => {
      void publishWebsiteToServer({
        id: activeProject.id,
        slug: targetSlug,
        domainName: formatZoyaDomain(targetSlug),
        title: activeProject.title,
        prompt: activeProject.prompt,
        htmlCode: cleaned,
        owner: config.userName || "Devid",
        createdAt: activeProject.createdAt,
        publishedAt: now,
      });
    }, 350);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const victim = projects.find((p) => p.id === id);
    if (victim) {
      removeZoyaDomain(victim.slug);
      void deleteWebsiteFromServer(victim.slug);
    }
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    saveWebsiteProjects(filtered);
    if (activeProjectId === id && filtered[0]) {
      setActiveProjectId(filtered[0].id);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        drag={!isFullWindow}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-40 bg-[#0B101C]/95 backdrop-blur-2xl border border-cyan-500/35 shadow-[0_25px_80px_rgba(0,0,0,0.88)] overflow-hidden flex flex-col select-none ${
          isFullWindow
            ? "inset-3 sm:inset-5 rounded-2xl"
            : isMinimized
            ? "right-4 bottom-24 w-80 rounded-2xl"
            : "right-3 sm:right-6 top-16 w-[95vw] sm:w-[650px] lg:w-[780px] h-[82vh] max-h-[760px] rounded-2xl"
        }`}
      >
        {/* Draggable Studio Header */}
        <div
          className={`px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 via-emerald-500/15 to-indigo-500/20 border-b border-white/10 flex items-center justify-between gap-2 ${
            isFullWindow ? "" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Globe size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">
                  {config.assistantName} Web Builder &amp; Instant Browser Publisher
                </span>
                {!isFullWindow && (
                  <Move size={11} className="text-slate-400 shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-emerald-300/90 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="truncate">
                  {isGenerating
                    ? `Building & Hosting on ${ZOYA_PERSONAL_TLD}...`
                    : `PERSONAL DOMAIN · ${activePersonalDomain}`}
                </span>
              </div>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {!isMinimized && activeProject && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    publishProjectToBrowser(activeProject, customSlugInput, true)
                  }
                  className="px-2.5 h-7 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 shadow-md transition-all"
                  title="Publish & Open Live Website in Browser Now"
                >
                  <Rocket size={12} />
                  <span>Publish &amp; Open Live</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-2 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-medium text-slate-200 flex items-center gap-1 transition-colors"
                  title="Download single-file index.html"
                >
                  <Download size={12} />
                  <span className="hidden md:inline">HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullWindow((prev) => !prev)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title={isFullWindow ? "Restore movable window" : "Maximize studio"}
                >
                  {isFullWindow ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setIsMinimized((prev) => !prev);
                if (isFullWindow) setIsFullWindow(false);
              }}
              className="px-2 h-7 rounded-lg hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {isMinimized ? "Expand" : "Minimize"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-colors"
              title="Close Website Builder"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Studio Workspace Body */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-2.5 overflow-hidden">
            {/* PERSONAL .ZOYA_ONLINE DOMAIN BAR (Zero-Friction Instant Hosting) */}
            {activeProject && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={11} />
                    <span>{ZOYA_PERSONAL_TLD}</span>
                  </span>
                  <div className="flex items-center gap-1 min-w-0 flex-1 bg-black/45 border border-white/10 rounded-lg px-2.5 py-1">
                    <Link2 size={11} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 shrink-0">
                      https://
                    </span>
                    <input
                      type="text"
                      value={customSlugInput}
                      onChange={(e) => setCustomSlugInput(e.target.value)}
                      className="bg-transparent text-[11px] font-mono text-emerald-200 focus:outline-none min-w-[70px] flex-1"
                      title={`Customize your personal ${ZOYA_PERSONAL_TLD} subdomain`}
                    />
                    <span className="text-[11px] font-mono font-semibold text-cyan-300 shrink-0">
                      {ZOYA_PERSONAL_TLD}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-[11px] font-medium text-cyan-200 flex items-center gap-1 transition-colors"
                    title={formatZoyaDomainUrl(activePersonalDomain)}
                  >
                    {copiedDomain ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span>Copied Domain!</span>
                      </>
                    ) : (
                      <>
                        <Globe size={11} />
                        <span>Copy Domain</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLiveUrl}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-medium text-emerald-200 flex items-center gap-1 transition-colors"
                    title={livePublishedUrl}
                  >
                    {copiedLiveUrl ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span>Copied URL!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Live Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={buildPublishedSiteUrl(
                      slugifyWebsiteTitle(customSlugInput || activeProject.slug)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      publishProjectToBrowser(
                        activeProject,
                        customSlugInput,
                        false
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title={`Open ${activePersonalDomain} in a new browser tab`}
                  >
                    <ExternalLink size={11} />
                    <span>Open Live</span>
                  </a>
                </div>
              </div>
            )}

            {/* Prompt Bar + Quick Templates */}
            <div className="space-y-2 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generateWebsiteFromPrompt(promptInput);
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="relative flex-1">
                  <Wand2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400"
                  />
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    disabled={isGenerating}
                    placeholder={`Tell ${config.assistantName} what website to build & auto-publish (e.g. "Gaming store", "Portfolio")...`}
                    className="w-full bg-black/50 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="submit"
                    disabled={isGenerating || !promptInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Build &amp; Publish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating || !promptInput.trim()}
                    onClick={() =>
                      generateWebsiteFromPrompt(
                        promptInput,
                        activeProject?.title,
                        true
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/15 text-pink-200 text-xs font-semibold transition-all"
                    title="Update and re-publish current website"
                  >
                    Update Live
                  </button>
                </div>
              </form>

              {/* Quick Starter Templates + Status Note */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5">
                  {QUICK_WEBSITE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isGenerating}
                      onClick={() =>
                        generateWebsiteFromPrompt(preset.prompt, preset.title)
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-[11px] text-slate-300 hover:text-cyan-200 whitespace-nowrap transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {statusNote && (
                  <span className="text-[11px] text-emerald-300 whitespace-nowrap shrink-0">
                    {statusNote}
                  </span>
                )}
              </div>
            </div>

            {/* Mode Toolbar: Live Preview / Source Code / Published Sites + Viewport Switcher */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === "preview"
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Play size={12} />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === "code"
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Code2 size={12} />
                  <span>HTML Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === "saved"
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FolderOpen size={12} />
                  <span>Published Sites ({projects.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoPublishEnabled((prev) => !prev)}
                  className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                    autoPublishEnabled
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-400"
                  }`}
                  title="Automatically publish every website Zoya builds to the browser"
                >
                  <Rocket size={11} />
                  <span>Auto-Publish: {autoPublishEnabled ? "ON" : "OFF"}</span>
                </button>

                {activeTab === "preview" && (
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setViewportSize("desktop")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewportSize === "desktop"
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Desktop view"
                    >
                      <Monitor size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewportSize("tablet")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewportSize === "tablet"
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Tablet view"
                    >
                      <Tablet size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewportSize("mobile")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewportSize === "mobile"
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone size={13} />
                    </button>
                  </div>
                )}

                {activeTab === "code" && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 flex items-center gap-1.5"
                  >
                    {copiedCode ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>{copiedCode ? "Copied!" : "Copy HTML"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Viewport / Editor Area */}
            <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-[#060911] border border-white/10 flex items-center justify-center">
              {isGenerating && (
                <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Loader2 size={32} className="text-emerald-400 animate-spin" />
                  <div className="text-sm font-bold text-white">
                    {config.assistantName} is building &amp; publishing your website...
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Writing responsive HTML5, Tailwind CSS, and deploying directly to your live browser URL.
                  </p>
                </div>
              )}

              {activeTab === "preview" && activeProject && (
                <div
                  className={`h-full transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl ${
                    viewportSize === "desktop"
                      ? "w-full"
                      : viewportSize === "tablet"
                      ? "w-[768px] max-w-full"
                      : "w-[375px] max-w-full"
                  }`}
                >
                  <iframe
                    key={`${activeProject.id}-${activeProject.publishedAt || 0}`}
                    title={activeProject.title}
                    srcDoc={stripZoyaWatermarks(activeProject.htmlCode)}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              )}

              {activeTab === "code" && activeProject && (
                <textarea
                  value={activeProject.htmlCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full p-4 bg-[#070B14] text-cyan-100 font-mono text-xs leading-relaxed focus:outline-none resize-none select-text"
                />
              )}

              {activeTab === "saved" && (
                <div className="w-full h-full p-4 overflow-y-auto space-y-2.5 self-start">
                  {projects.map((proj) => {
                    const isCurrent = proj.id === activeProject?.id;
                    const siteUrl = buildPublishedSiteUrl(proj.slug);
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActiveTab("preview");
                        }}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isCurrent
                            ? "bg-emerald-500/15 border-emerald-400/50 text-white"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-slate-300"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                            <span className="truncate">{proj.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                              LIVE · {proj.domainName || formatZoyaDomain(proj.slug)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {proj.prompt}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              publishProjectToBrowser(proj, proj.slug, false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-semibold flex items-center gap-1"
                          >
                            <ExternalLink size={10} />
                            <span>Open Live</span>
                          </a>
                          {projects.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(proj.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                              title="Delete website"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
