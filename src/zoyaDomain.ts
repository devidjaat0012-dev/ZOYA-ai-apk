import { getApiUrl } from "./utils/apiBase";

export const ZOYA_PERSONAL_TLD = ".zoya_online" as const;
export const ZOYA_PRIMARY_SUBDOMAIN = "zoya" as const;
export const ZOYA_PRIMARY_DOMAIN = `${ZOYA_PRIMARY_SUBDOMAIN}${ZOYA_PERSONAL_TLD}`;
export const ZOYA_DOMAIN_REGISTRY_KEY = "zoya_domain_registry_v1";

export interface ZoyaDomainRecord {
  domain: string;
  slug: string;
  title: string;
  owner: string;
  status: "ACTIVE" | "RESERVED";
  ssl: boolean;
  browserUrl: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Normalizes a website title, slug, or `.zoya_online` URL into a clean DNS subdomain slug.
 */
export function normalizeZoyaSubdomain(raw: string): string {
  const cleanedInput = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/\.zoya_online$/i, "")
    .replace(/@/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return cleanedInput || `site-${Date.now().toString(36)}`;
}

/**
 * Formats any slug, title, or host into Zoya's personal domain `<subdomain>.zoya_online`.
 */
export function formatZoyaDomain(slugOrDomain: string): string {
  const subdomain = normalizeZoyaSubdomain(slugOrDomain);
  return `${subdomain}${ZOYA_PERSONAL_TLD}`;
}

/**
 * Formats the display HTTPS URL for Zoya's personal domain (`https://<subdomain>.zoya_online`).
 */
export function formatZoyaDomainUrl(slugOrDomain: string): string {
  return `https://${formatZoyaDomain(slugOrDomain)}`;
}

/**
 * Returns true if the supplied URL or hostname targets Zoya's personal `.zoya_online` TLD.
 */
export function isZoyaOnlineDomain(input: string): boolean {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return false;
  return /(?:^|https?:\/\/|\/)[a-z0-9-]+\.zoya_online(?:[/?#:]|$)/i.test(value) || value.endsWith(ZOYA_PERSONAL_TLD);
}

/**
 * Extracts the subdomain slug from a `.zoya_online` domain, URL, or query string.
 */
export function extractSlugFromZoyaDomain(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const withoutProtocol = raw.replace(/^https?:\/\//i, "").split("?")[0].split("#")[0];
  const hostPart = withoutProtocol.split("/")[0].toLowerCase();
  if (hostPart.endsWith(ZOYA_PERSONAL_TLD)) {
    const sub = hostPart.slice(0, -ZOYA_PERSONAL_TLD.length);
    return normalizeZoyaSubdomain(sub);
  }

  const pathMatch = withoutProtocol.match(/\/zoya_online\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return normalizeZoyaSubdomain(pathMatch[1]);
  }

  if (isZoyaOnlineDomain(raw)) {
    return normalizeZoyaSubdomain(raw);
  }

  return null;
}

/**
 * Builds the live browser URL that resolves the `.zoya_online` site inside Zoya's standalone host viewer.
 */
export function buildZoyaDomainBrowserUrl(slugOrDomain: string): string {
  const slug = normalizeZoyaSubdomain(slugOrDomain);
  const domain = formatZoyaDomain(slug);
  if (typeof window === "undefined") {
    return `/?domain=${encodeURIComponent(domain)}&site=${encodeURIComponent(slug)}`;
  }
  const origin = window.location.origin;
  const pathname = window.location.pathname.startsWith("/zoya_online")
    ? "/"
    : window.location.pathname;
  return `${origin}${pathname}?domain=${encodeURIComponent(domain)}&site=${encodeURIComponent(slug)}`;
}

/**
 * Reads `?domain=<slug>.zoya_online`, `?site=<slug>`, or `/zoya_online/<slug>` from the current browser URL.
 */
export function getDomainSlugFromCurrentUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get("domain");
    if (domainParam) {
      return extractSlugFromZoyaDomain(domainParam) || normalizeZoyaSubdomain(domainParam);
    }
    const siteParam = params.get("site");
    if (siteParam) {
      return extractSlugFromZoyaDomain(siteParam) || normalizeZoyaSubdomain(siteParam);
    }
    const pathMatch = window.location.pathname.match(/^\/zoya_online\/([^/]+)/i);
    if (pathMatch && pathMatch[1]) {
      return extractSlugFromZoyaDomain(decodeURIComponent(pathMatch[1])) || normalizeZoyaSubdomain(decodeURIComponent(pathMatch[1]));
    }
  } catch {}
  return null;
}

export function getRegisteredZoyaDomains(): ZoyaDomainRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ZOYA_DOMAIN_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function registerZoyaDomain(params: {
  slugOrDomain: string;
  title: string;
  owner?: string;
}): ZoyaDomainRecord {
  const slug = normalizeZoyaSubdomain(params.slugOrDomain);
  const domain = formatZoyaDomain(slug);
  const browserUrl = buildZoyaDomainBrowserUrl(slug);
  const now = Date.now();

  const existing = getRegisteredZoyaDomains();
  const prev = existing.find((r) => r.slug === slug || r.domain === domain);

  const record: ZoyaDomainRecord = {
    domain,
    slug,
    title: (params.title || slug).trim(),
    owner: (params.owner || "Devid").trim(),
    status: "ACTIVE",
    ssl: true,
    browserUrl,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  if (typeof window !== "undefined") {
    try {
      const updated = [record, ...existing.filter((r) => r.slug !== slug && r.domain !== domain)].slice(0, 50);
      localStorage.setItem(ZOYA_DOMAIN_REGISTRY_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("zoya_domains_updated", { detail: record }));
    } catch {}
  }

  return record;
}

export function resolveZoyaDomainRecord(domainOrSlug: string): ZoyaDomainRecord | null {
  const slug = extractSlugFromZoyaDomain(domainOrSlug) || normalizeZoyaSubdomain(domainOrSlug);
  const domain = formatZoyaDomain(slug);
  const list = getRegisteredZoyaDomains();
  return list.find((r) => r.slug === slug || r.domain === domain) || null;
}

export function removeZoyaDomain(domainOrSlug: string): void {
  if (typeof window === "undefined") return;
  const slug = extractSlugFromZoyaDomain(domainOrSlug) || normalizeZoyaSubdomain(domainOrSlug);
  const domain = formatZoyaDomain(slug);
  try {
    const updated = getRegisteredZoyaDomains().filter(
      (r) => r.slug !== slug && r.domain !== domain
    );
    localStorage.setItem(ZOYA_DOMAIN_REGISTRY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zoya_domains_updated"));
  } catch {}
}

/**
 * Resolves a target URL for `openWebsite` / browser navigation:
 * if it uses Zoya's personal `.zoya_online` domain, maps it to the live app viewer URL.
 */
export function resolveOpenWebsiteTarget(rawUrl: string): {
  isZoyaDomain: boolean;
  resolvedUrl: string;
  domainName?: string;
  slug?: string;
} {
  const trimmed = String(rawUrl || "").trim();
  if (isZoyaOnlineDomain(trimmed)) {
    const slug = extractSlugFromZoyaDomain(trimmed) || ZOYA_PRIMARY_SUBDOMAIN;
    const domainName = formatZoyaDomain(slug);
    return {
      isZoyaDomain: true,
      resolvedUrl: buildZoyaDomainBrowserUrl(slug),
      domainName,
      slug,
    };
  }

  const normalizedUrl =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  return {
    isZoyaDomain: false,
    resolvedUrl: normalizedUrl,
  };
}

export interface ServerPublishedWebsitePayload {
  id: string;
  slug: string;
  domainName?: string;
  title: string;
  prompt: string;
  htmlCode: string;
  owner?: string;
  createdAt?: number;
  publishedAt?: number;
}

function getDomainApiUrl(path: string): string {
  return getApiUrl(path);
}

export async function publishWebsiteToServer(
  site: ServerPublishedWebsitePayload,
  useBeaconIfAvailable: boolean = false
): Promise<boolean> {
  if (typeof window === "undefined" || !site?.htmlCode) return false;
  const slug = normalizeZoyaSubdomain(site.slug || site.domainName || site.title);
  const payload = JSON.stringify({
    ...site,
    slug,
    domainName: formatZoyaDomain(slug),
    publishedAt: site.publishedAt || Date.now(),
  });
  const url = getDomainApiUrl("/api/zoya-domain/publish");

  if (useBeaconIfAvailable && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) {
        return true;
      }
    } catch {}
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPublishedWebsiteFromServer(
  slugOrDomain: string
): Promise<ServerPublishedWebsitePayload | null> {
  if (typeof window === "undefined") return null;
  const slug = extractSlugFromZoyaDomain(slugOrDomain) || normalizeZoyaSubdomain(slugOrDomain);
  try {
    const res = await fetch(
      getDomainApiUrl(`/api/zoya-domain/site/${encodeURIComponent(slug)}`),
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok && data?.site?.htmlCode) {
      return data.site as ServerPublishedWebsitePayload;
    }
  } catch {}
  return null;
}

export async function deleteWebsiteFromServer(slugOrDomain: string): Promise<void> {
  if (typeof window === "undefined") return;
  const slug = extractSlugFromZoyaDomain(slugOrDomain) || normalizeZoyaSubdomain(slugOrDomain);
  try {
    await fetch(
      getDomainApiUrl(`/api/zoya-domain/site/${encodeURIComponent(slug)}`),
      { method: "DELETE" }
    );
  } catch {}
}
