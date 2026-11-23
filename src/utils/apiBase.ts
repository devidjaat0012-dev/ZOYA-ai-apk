/**
 * API & WebSocket Base URL Resolver
 *
 * - In standard Web / Dev / Hosted environments: returns relative `/api/...` URLs unchanged.
 * - Inside the standalone Android APK (WebViewAssetLoader `appassets.androidplatform.net`,
 *   `capacitor://`, or `file://` origins): resolves `/api/...` and `/api/live` against the
 *   configured Zoya backend origin (`VITE_API_BASE_URL`, `localStorage.zoya_backend_url`,
 *   or the default hosted server URL).
 */

const DEFAULT_ANDROID_BACKEND_URL =
  "https://ais-pre-btkucojko3kpkfpeusfvun-149154139710.asia-east1.run.app";

export function isAndroidNativeContainer(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  const proto = window.location.protocol || "";
  return (
    host === "appassets.androidplatform.net" ||
    proto === "capacitor:" ||
    proto === "file:" ||
    Boolean((window as any).ZoyaNativeAppBridge)
  );
}

export function getConfiguredBackendOrigin(): string {
  if (typeof window === "undefined") return "";

  try {
    const saved = window.localStorage.getItem("zoya_backend_url")?.trim();
    if (saved && /^https?:\/\//i.test(saved)) {
      return saved.replace(/\/+$/, "");
    }
  } catch {}

  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && /^https?:\/\//i.test(envUrl.trim())) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (isAndroidNativeContainer()) {
    return DEFAULT_ANDROID_BACKEND_URL;
  }

  return "";
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getConfiguredBackendOrigin();
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function getLiveWsUrl(query: string = ""): string {
  const origin = getConfiguredBackendOrigin();
  if (origin) {
    try {
      const parsed = new URL(origin);
      const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProto}//${parsed.host}/api/live${query}`;
    } catch {}
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/live${query}`;
}
