import React, { useState } from "react";
import {
  Download,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Share,
  Laptop,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  HelpCircle,
  AlertTriangle,
  Wrench,
  FolderOpen,
  Settings,
  CheckCircle,
  Mic,
  Zap,
  Radio,
  Trash2,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface InstallAppCardProps {
  compact?: boolean;
}

export default function InstallAppCard({ compact = false }: InstallAppCardProps) {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<
    "full_potential" | "fix_webview" | "apk" | "pkg_fix" | "ios" | "desktop"
  >("full_potential");
  const [installSuccess, setInstallSuccess] = useState(false);
  const [apkDownloading, setApkDownloading] = useState(false);
  const [apkDownloaded, setApkDownloaded] = useState(false);

  const handleDownloadApk = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setApkDownloading(true);

    try {
      const link = document.createElement("a");
      link.href = "/zoya-ai-voice-assistant.apk";
      link.setAttribute("download", "Zoya-AI-Voice-Assistant.apk");
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.assign("/zoya-ai-voice-assistant.apk");
    }

    setTimeout(() => {
      setApkDownloading(false);
      setApkDownloaded(true);
      setTimeout(() => setApkDownloaded(false), 12000);
    }, 1200);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      } else {
        setActiveGuideTab("full_potential");
        setShowGuide(true);
      }
    } else {
      setActiveGuideTab("full_potential");
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#111624] to-pink-500/10 border border-cyan-500/35 space-y-3.5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500/30 via-sky-500/20 to-pink-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Zoya AI Official Android App</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  Full Potential
                </span>
              </span>
              <p className="text-[10px] text-slate-400">
                Standalone App • Name on Phone: <strong className="text-pink-300">&quot;Zoya AI&quot;</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold">
              v3.3.0
            </span>
          </div>
        </div>

        {/* Core Message & Full Potential Features */}
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {isInstalled
            ? "Zoya standalone app mode me chal rahi hai! Isme Zoya ke paas microphone, continuous voice, background audio aur screen share ka 100% full access hai."
            : "Zoya ko apne Android phone me install karein! Yeh official Google WebAPK engine se install hoti hai, jisse yeh bina kisi WebView restriction ke poore potential ke sath kaam karti hai."}
        </p>

        {/* Full Potential Capability Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 py-0.5">
          <div className="px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 text-[10px] text-slate-200">
            <Mic size={12} className="text-emerald-400 shrink-0" />
            <span className="truncate">Full Mic Access</span>
          </div>
          <div className="px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 text-[10px] text-slate-200">
            <Radio size={12} className="text-cyan-400 shrink-0" />
            <span className="truncate">Background Voice</span>
          </div>
          <div className="px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 text-[10px] text-slate-200">
            <Zap size={12} className="text-pink-400 shrink-0" />
            <span className="truncate">60FPS No WebView Lag</span>
          </div>
        </div>

        {/* "My WebView" Problem Clarification Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/40 via-[#181324] to-amber-950/30 border border-rose-500/30 text-[11px] space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-rose-200 font-bold block">
                &quot;My WebView&quot; me open ho raha hai ya mic theek se kaam nahi kar raha?
              </span>
              <p className="text-slate-300 text-[10px] leading-relaxed mt-0.5">
                Purana sample wrapper Android ke restricted webview me khulta tha. Niche diye gaye{" "}
                <strong className="text-cyan-300">&quot;Install Zoya AI App&quot;</strong> button par tap karein—yeh Google ke native engine se sidha{" "}
                <strong className="text-white">&quot;Zoya AI&quot;</strong> ke naam se install hogi aur microphone, voice aur screen share poore potential se chalenge!
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setActiveGuideTab("fix_webview");
                setShowGuide(true);
              }}
              className="text-[10px] text-rose-300 hover:text-white font-bold underline flex items-center gap-1"
            >
              <span>See How to Fix &quot;My WebView&quot;</span>
              <ArrowRight size={10} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {installSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Zoya AI App installation started! Phone ke Home Screen / App Drawer me dekhein.</span>
          </div>
        )}

        {apkDownloaded && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-semibold space-y-1 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="font-bold text-white">
                Zoya-AI-Voice-Assistant.apk Downloaded!
              </span>
            </div>
            <p className="text-[10px] text-emerald-300 leading-tight">
              Phone ke <strong>Files / My Files ➔ Downloads</strong> folder se tap karke Package Installer se install karein.
            </p>
          </div>
        )}

        {/* Primary Action Hero: 1-Click Full Potential App Installation */}
        <div className="space-y-2 pt-0.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98]"
          >
            <Sparkles size={16} className="shrink-0 text-amber-200 animate-pulse" />
            <span>
              {isInstalled
                ? "Zoya App Installed (Full Potential Active) ✓"
                : isInstallable
                ? "Install Zoya AI App (Full Potential Android App)"
                : "Install Zoya AI App (1-Click)"}
            </span>
          </button>

          {/* Secondary Action: Direct APK File */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
            <button
              type="button"
              onClick={handleDownloadApk}
              disabled={apkDownloading}
              className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors text-xs font-medium"
              title="Download raw Android APK package file"
            >
              <Download size={13} className="text-emerald-400" />
              <span>{apkDownloading ? "Downloading APK..." : "Download APK File (.apk)"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveGuideTab("full_potential");
                setShowGuide(true);
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline flex items-center gap-1"
            >
              <HelpCircle size={12} />
              <span>Step-by-Step Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Installation Guide & APK Walkthrough Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-[#0F1424] border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/50 via-[#10162A] to-pink-950/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-cyan-500/30 to-pink-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Install Zoya AI Official App</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      Full Potential
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Standalone Android App • Name on Phone: &quot;Zoya AI&quot;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="p-3 pb-0 shrink-0">
              <div className="grid grid-cols-5 gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-[10px] sm:text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("full_potential")}
                  className={`py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeGuideTab === "full_potential"
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={11} />
                  <span>Full App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("fix_webview")}
                  className={`py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeGuideTab === "fix_webview"
                      ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-sm"
                      : "text-rose-300 hover:text-white"
                  }`}
                >
                  <Trash2 size={11} />
                  <span>Fix WebView</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("apk")}
                  className={`py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeGuideTab === "apk"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Package size={11} />
                  <span>APK File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("ios")}
                  className={`py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeGuideTab === "ios"
                      ? "bg-pink-500 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone size={11} />
                  <span>iOS Safari</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("desktop")}
                  className={`py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeGuideTab === "desktop"
                      ? "bg-white text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Laptop size={11} />
                  <span>PC / Mac</span>
                </button>
              </div>
            </div>

            {/* Platform Specific Instructions Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {/* TAB 1: FULL POTENTIAL APP (RECOMMENDED) */}
              {activeGuideTab === "full_potential" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-sky-950/30 to-pink-950/40 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                          ✓
                        </span>
                        <h4 className="font-bold text-white text-xs">
                          Official Full Potential Zoya AI App
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        100% Working
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Google ka official WebAPK engine Zoya ko aapke phone me standalone native package ke roop me install karta hai. Isme Zoya ka naam phone me hamesha <strong className="text-white">&quot;Zoya AI&quot;</strong> hota hai aur sare features full potential ke sath chalte hain.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowGuide(false);
                        handleInstallClick();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all mt-1"
                    >
                      <Sparkles size={14} />
                      <span>Tap Here to Install Zoya AI App</span>
                    </button>
                  </div>

                  {/* Manual Chrome 3-Dot Install Steps */}
                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl space-y-3 text-xs">
                    <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <Smartphone size={14} className="text-cyan-400" />
                      <span>Chrome Me Install Karne Ke 3 Aasan Steps:</span>
                    </h4>

                    <div className="space-y-2.5 text-slate-300 pl-1 text-[11px]">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <p>
                          Google Chrome ke top-right corner me <strong>3 dots (⋮)</strong> menu par tap karein.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <p>
                          Menu me se <strong>&quot;Install app&quot;</strong> (या <strong>&quot;Add to Home screen&quot;</strong>) par tap karein.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <p>
                          <strong>&quot;Install&quot;</strong> dabayein. Google Chrome aapke phone me sidha <strong className="text-white">&quot;Zoya AI&quot;</strong> app add kar dega!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FIX "MY WEBVIEW" */}
              {activeGuideTab === "fix_webview" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <AlertTriangle size={15} className="text-rose-400" />
                      <span>&quot;My WebView&quot; Problem Kyun Hoti Hai?</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Android me kisi generic APK wrapper se app install karne par uska naam &quot;My WebView&quot; show hota hai aur Android OS security ki wajah se microphone access aur continuous background voice ko block kar deta hai.
                    </p>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl space-y-3 text-xs">
                    <h4 className="font-bold text-white text-xs">Isko Theek Karne Ke 2 Steps:</h4>

                    <div className="space-y-2.5 text-slate-300 pl-1 text-[11px]">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <p>
                          Phone ke App Drawer ya Settings me jakar purane <strong>&quot;My WebView&quot;</strong> app ko <strong>Uninstall</strong> kar dein.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <p>
                          Neeche diye gaye button par tap karke ya Chrome menu (⋮) se <strong>&quot;Install app&quot;</strong> karke naya standalone app lagayein. Yeh official <strong>&quot;Zoya AI&quot;</strong> ke naam se install hogi jisme Microphone aur Live Voice bina kisi rok-tok ke poore potential ke sath chalega!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowGuide(false);
                        handleInstallClick();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md mt-2"
                    >
                      <Sparkles size={14} />
                      <span>Install Official &quot;Zoya AI&quot; App Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: APK FILE */}
              {activeGuideTab === "apk" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Zoya-AI-Voice-Assistant.apk
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400/20 text-emerald-300 font-mono font-bold">
                          v3.3.0 · 16.6 MB
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Manual APK package file for sideloading.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadApk}
                      disabled={apkDownloading}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shrink-0"
                    >
                      <Download size={13} className="stroke-[2.5]" />
                      <span>{apkDownloading ? "Downloading..." : "Download APK"}</span>
                    </button>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl space-y-3 text-xs">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Phone Ke &quot;Files&quot; App Se Install Karne Ka Tarika:</span>
                    </h4>

                    <div className="space-y-2 text-slate-300 text-[11px] pl-1">
                      <p>
                        1. APK download hone ke baad phone ke <strong>Files by Google / My Files</strong> app ko kholein.
                      </p>
                      <p>
                        2. <strong>Downloads</strong> folder me jayein aur <code className="text-cyan-300 font-mono">Zoya-AI-Voice-Assistant.apk</code> par tap karein.
                      </p>
                      <p>
                        3. <strong>Package Installer</strong> select karein aur Install dabayein.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: iOS Safari */}
              {activeGuideTab === "ios" && (
                <div className="space-y-2.5 bg-black/40 border border-white/10 p-3.5 rounded-2xl text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-300">
                      Open this website in <strong>Safari</strong> on your iPhone or iPad.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-300">
                      Tap the <strong>Share</strong> button (
                      <Share size={12} className="inline mx-1 text-pink-400" />) in Safari toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-300">
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot; (➕)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <p className="text-slate-300">
                      Tap <strong>Add</strong> in the top right. App title will be <strong>&quot;Zoya AI&quot;</strong>!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: Desktop PC / Mac */}
              {activeGuideTab === "desktop" && (
                <div className="space-y-2.5 bg-black/40 border border-white/10 p-3.5 rounded-2xl text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-300">
                      In <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-300">
                      Click the <strong>Install</strong> icon in the address bar or menu &gt; <strong>Install Zoya AI</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0A0D17] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  handleInstallClick();
                }}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Sparkles size={13} />
                <span>Install Zoya AI App</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
