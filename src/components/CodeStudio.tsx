import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Code2,
  Play,
  Copy,
  Check,
  Download,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  Terminal,
  Eye,
  FileCode,
  Wand2,
  Bug,
  HelpCircle,
  Zap,
  ExternalLink,
  ChevronDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AppConfig } from "../types";
import {
  SUPPORTED_LANGUAGES,
  MASTER_CODE_TEMPLATES,
  generateCodeWithZoya,
  executeCodeInBrowser,
  CodeExecutionResult,
} from "../services/codingMasterService";

interface CodeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: Partial<AppConfig>;
  initialCode?: string;
  initialLanguage?: string;
  initialPrompt?: string;
  initialTitle?: string;
  executeImmediately?: boolean;
}

export default function CodeStudio({
  isOpen,
  onClose,
  config,
  initialCode,
  initialLanguage = "python",
  initialPrompt = "",
  initialTitle,
  executeImmediately = false,
}: CodeStudioProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage);
  const [code, setCode] = useState<string>(
    initialCode ||
      MASTER_CODE_TEMPLATES[0].code
  );
  const [activeTab, setActiveTab] = useState<"split" | "code" | "output">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "code" : "split"
  );
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isOutputCopied, setIsOutputCopied] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
    if (initialLanguage) {
      setSelectedLanguage(initialLanguage.toLowerCase());
    }
    if (initialPrompt) {
      setPromptInput(initialPrompt);
    }
    if (executeImmediately && initialCode) {
      handleRunCode(initialCode, initialLanguage || selectedLanguage);
    }
  }, [initialCode, initialLanguage, initialPrompt, executeImmediately]);

  // Handle Ctrl+Enter to run code, Ctrl+S to download
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleDownloadCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, selectedLanguage]);

  if (!isOpen) return null;

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const isHtmlOrReact = selectedLanguage === "html" || selectedLanguage === "react";

  const handleRunCode = async (codeToRun = code, langToRun = selectedLanguage) => {
    setIsRunning(true);
    setStatusMessage("Executing code...");
    try {
      const result = await executeCodeInBrowser(codeToRun, langToRun);
      setExecutionResult(result);
      if (activeTab === "code") {
        setActiveTab(
          typeof window !== "undefined" && window.innerWidth < 768 ? "output" : "split"
        );
      }
      if (result.success) {
        setStatusMessage(`Executed successfully in ${result.executionTimeMs}ms`);
      } else {
        setStatusMessage(`Error: ${result.error || "Execution failed"}`);
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        output: "",
        error: err?.message || String(err),
        executionTimeMs: 0,
        logs: [],
      });
      setStatusMessage("Execution error occurred");
    } finally {
      setIsRunning(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleGenerateCode = async (customPrompt?: string, actionType: "generate" | "explain" | "debug" | "optimize" = "generate") => {
    const targetPrompt = customPrompt || promptInput;
    if (!targetPrompt && actionType === "generate") {
      setStatusMessage("Kuch prompt likhein ya bolein!");
      return;
    }

    setIsGenerating(true);
    setStatusMessage(
      actionType === "explain"
        ? "Zoya code analyze kar rahi hai..."
        : actionType === "debug"
        ? "Zoya bugs scan aur fix kar rahi hai..."
        : actionType === "optimize"
        ? "Zoya code optimize kar rahi hai..."
        : "Zoya master-grade code likh rahi hai..."
    );

    try {
      const res = await generateCodeWithZoya({
        prompt: targetPrompt,
        language: selectedLanguage,
        existingCode: code,
        action: actionType,
        config,
      });

      if (actionType === "explain") {
        setAiExplanation(res.explanation);
        setShowExplanationModal(true);
      } else {
        setCode(res.code);
        setSelectedLanguage(res.language || selectedLanguage);
        setAiExplanation(res.explanation);
        setStatusMessage("🌸 Code ready! Run karke test karein.");
        // Auto-run if HTML
        if (res.language === "html" || selectedLanguage === "html") {
          handleRunCode(res.code, res.language || selectedLanguage);
        }
      }
    } catch (err: any) {
      console.error("Code generation error:", err);
      setStatusMessage(`Error: ${err?.message || "Generation failed"}`);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setStatusMessage("📋 Generated code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2200);
      setTimeout(() => setStatusMessage(null), 2800);
    } catch (err) {
      console.warn("Clipboard copy failed, using fallback:", err);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyOutput = () => {
    if (!executionResult?.output) return;
    navigator.clipboard.writeText(executionResult.output);
    setIsOutputCopied(true);
    setStatusMessage("📋 Output copied to clipboard!");
    setTimeout(() => setIsOutputCopied(false), 2000);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDownloadCode = (customFilename?: string) => {
    try {
      if (!code || !code.trim()) {
        setStatusMessage("Koi code nahi hai download karne ke liye!");
        return;
      }

      // Generate a clean filename based on prompt, title, or language
      let fileName = customFilename;
      if (!fileName) {
        const rawTitle = initialTitle || promptInput;
        const cleanTitle = rawTitle
          ? rawTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 32)
          : "";
        fileName = cleanTitle
          ? `${cleanTitle}.${currentLangObj.ext}`
          : `zoya_${selectedLanguage}_${new Date().toISOString().slice(0, 10)}.${currentLangObj.ext}`;
      }

      const mimeTypeMap: Record<string, string> = {
        py: "text/x-python;charset=utf-8",
        js: "application/javascript;charset=utf-8",
        ts: "application/typescript;charset=utf-8",
        html: "text/html;charset=utf-8",
        jsx: "text/jsx;charset=utf-8",
        cpp: "text/x-c++src;charset=utf-8",
        java: "text/x-java-source;charset=utf-8",
        rs: "text/rust;charset=utf-8",
        go: "text/x-go;charset=utf-8",
        sql: "application/sql;charset=utf-8",
        sh: "application/x-sh;charset=utf-8",
        php: "application/x-php;charset=utf-8",
        kt: "text/x-kotlin;charset=utf-8",
        dart: "application/dart;charset=utf-8",
      };

      const mimeType = mimeTypeMap[currentLangObj.ext] || "text/plain;charset=utf-8";
      const blob = new Blob([code], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsDownloaded(true);
      setStatusMessage(`💾 "${fileName}" downloaded to your local machine!`);
      setTimeout(() => setIsDownloaded(false), 2200);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Failed to download code file:", err);
      setStatusMessage(`Download failed: ${err?.message || "Unknown error"}`);
    }
  };

  const handleSelectTemplate = (template: typeof MASTER_CODE_TEMPLATES[0]) => {
    setSelectedLanguage(template.language);
    setCode(template.code);
    setExecutionResult(null);
    setStatusMessage(`Loaded "${template.title}"`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Build sandboxed HTML document for iframe live preview
  const generatePreviewDoc = () => {
    if (selectedLanguage === "html") {
      return code;
    }
    if (selectedLanguage === "react") {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body { background: #020617; color: white; font-family: system-ui, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    // Render either App, ZoyaCalculator, or first exported function
    try {
      if (typeof App !== 'undefined') {
        root.render(<App />);
      } else if (typeof ZoyaCalculator !== 'undefined') {
        root.render(<ZoyaCalculator />);
      }
    } catch(err) {
      document.body.innerHTML = '<div style="color:#f43f5e;padding:20px;font-family:monospace;"><b>React Render Error:</b><br>' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
    }
    return `<!DOCTYPE html><html><body style="background:#090d16;color:#94a3b8;font-family:monospace;padding:24px;">Select HTML or React to view Live Visual Sandbox</body></html>`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className={`bg-[#0a0f1d] sm:border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isMaximized
            ? "w-full h-[100dvh] rounded-none border-none"
            : "w-full max-w-6xl h-[100dvh] sm:h-[92dvh] rounded-none sm:rounded-2xl"
        }`}
      >
        {/* Top Header Bar (Stacks cleanly into 2 compact rows on mobile) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#0e162b] border-b border-cyan-500/20 text-xs text-slate-200 select-none shrink-0">
          {/* Row 1: Brand Title + Quick Window Controls */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] shrink-0">
                <Code2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold tracking-wider text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-300 to-purple-400 truncate">
                    ZOYA CODING MASTER
                  </span>
                  <span className="hidden lg:inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                    ANY CODE GENERATOR
                  </span>
                </div>
                <span className="hidden sm:block text-[10px] text-slate-400 font-mono truncate">
                  Principal Engineer & Universal IDE · Dev: Devid
                </span>
              </div>
            </div>

            {/* Mobile-first compact Window Controls (shown on right of row 1 on <md, or moves right on md+) */}
            <div className="flex items-center gap-1.5 md:hidden shrink-0">
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 transition-all"
                title="Copy Code"
              >
                {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-cyan-400" />}
              </button>
              <button
                onClick={() => handleDownloadCode()}
                className={`p-1.5 rounded-lg border transition-all ${
                  isDownloaded
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30 text-pink-200"
                }`}
                title={`Download .${currentLangObj.ext}`}
              >
                {isDownloaded ? <Check size={14} className="text-emerald-400" /> : <Download size={14} className="text-pink-400" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                title="Close Code Studio"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Center Controls: Language + Templates + Run Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Language Selector Dropdown */}
            <div className="relative flex-1 md:flex-initial min-w-0">
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === e.target.value);
                  if (lang) {
                    setCode(lang.defaultTemplate);
                  }
                }}
                className="w-full appearance-none bg-[#141f3d] hover:bg-[#1a2952] border border-cyan-500/40 text-cyan-200 font-mono text-[11px] sm:text-xs rounded-xl px-2.5 sm:px-3 py-1.5 pr-6 sm:pr-7 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer truncate"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.tag} {lang.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none"
              />
            </div>

            {/* Template Selector (accessible on mobile too!) */}
            <div className="relative flex-1 md:flex-initial min-w-0">
              <select
                onChange={(e) => {
                  const tmpl = MASTER_CODE_TEMPLATES.find((t) => t.id === e.target.value);
                  if (tmpl) handleSelectTemplate(tmpl);
                }}
                defaultValue=""
                className="w-full appearance-none bg-[#141f3d] hover:bg-[#1a2952] border border-pink-500/40 text-pink-200 font-mono text-[11px] sm:text-xs rounded-xl px-2.5 sm:px-3 py-1.5 pr-6 sm:pr-7 focus:outline-none focus:ring-1 focus:ring-pink-400 transition-all cursor-pointer truncate"
              >
                <option value="" disabled>
                  📚 Templates
                </option>
                {MASTER_CODE_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunCode()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-[11px] sm:text-xs shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-50 shrink-0"
              title="Run Code (Ctrl + Enter)"
            >
              <Play size={13} className={isRunning ? "animate-spin" : "fill-current"} />
              <span className="sm:hidden">{isRunning ? "Run..." : "Run"}</span>
              <span className="hidden sm:inline">{isRunning ? "Running..." : "Run (Ctrl+↵)"}</span>
            </button>
          </div>

          {/* Desktop Right Window Controls */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 hover:text-white transition-all text-xs font-mono cursor-pointer"
              title="Copy Code to Clipboard"
            >
              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-cyan-400" />}
              <span className="hidden lg:inline">{isCopied ? "Copied!" : "Copy Code"}</span>
            </button>
            <button
              onClick={() => handleDownloadCode()}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                isDownloaded
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold"
                  : "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30 text-pink-200 hover:text-white"
              }`}
              title={`Download ${currentLangObj.name} file (.${currentLangObj.ext}) to your local machine (Ctrl + S)`}
            >
              {isDownloaded ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Download size={14} className="text-pink-400" />
                  <span className="hidden lg:inline">Download (.{currentLangObj.ext})</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={isMaximized ? "Restore window" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
              title="Close Code Studio"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* View Mode & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-3 sm:px-4 py-1.5 bg-[#0b1224] border-b border-white/5 text-xs shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("split")}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "split"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={12} />
              <span className="sm:hidden">Split</span>
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "code"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode size={12} />
              <span className="sm:hidden">Code</span>
              <span className="hidden sm:inline">Code Only</span>
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "output"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isHtmlOrReact ? <Eye size={12} /> : <Terminal size={12} />}
              <span className="sm:hidden">{isHtmlOrReact ? "Preview" : "Output"}</span>
              <span className="hidden sm:inline">{isHtmlOrReact ? "Live Preview" : "Console Output"}</span>
            </button>
          </div>

          {/* AI Helper Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleGenerateCode(undefined, "explain")}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 text-[11px] font-mono transition-all shrink-0"
              title="Line-by-line explanation of code in Hinglish"
            >
              <HelpCircle size={12} />
              <span>Explain</span>
            </button>
            <button
              onClick={() => handleGenerateCode(undefined, "debug")}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[11px] font-mono transition-all shrink-0"
              title="Scan and auto-fix bugs in code"
            >
              <Bug size={12} />
              <span>Fix Bugs</span>
            </button>
            <button
              onClick={() => handleGenerateCode(undefined, "optimize")}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-[11px] font-mono transition-all shrink-0"
              title="Optimize time/space complexity"
            >
              <Zap size={12} />
              <span>Optimize</span>
            </button>
          </div>
        </div>

        {/* Central Workspace: Vertical Stack on Mobile, Horizontal Split on Desktop */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Code Editor Panel */}
          {(activeTab === "split" || activeTab === "code") && (
            <div
              className={`flex flex-col bg-[#070b16] min-h-0 min-w-0 ${
                activeTab === "split"
                  ? "w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10"
                  : "w-full h-full"
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1 bg-[#090e1c] border-b border-white/5 text-[11px] text-slate-400 font-mono shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                  <span className="text-cyan-400 font-bold uppercase shrink-0">{selectedLanguage}</span>
                  <span>•</span>
                  <span className="shrink-0">{code.split("\n").length}L</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{code.length} chars</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyCode}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 text-xs font-mono transition-all border border-white/10 hover:border-cyan-500/30 cursor-pointer"
                    title="Copy Code to Clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-300 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-cyan-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadCode()}
                    className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      isDownloaded
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-medium"
                        : "bg-white/5 hover:bg-pink-500/20 text-slate-300 hover:text-pink-200 border-white/10 hover:border-pink-500/30"
                    }`}
                    title={`Download code as .${currentLangObj.ext} file`}
                  >
                    {isDownloaded ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Download size={12} className="text-pink-400" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setCode("")}
                    className="px-2 py-0.5 rounded bg-white/5 sm:bg-transparent text-slate-400 hover:text-rose-400 transition-colors text-[10.5px]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative flex-1 flex overflow-hidden min-h-0">
                {/* Line Numbers */}
                <div className="w-8 sm:w-12 py-2.5 sm:py-3 bg-[#050811] text-slate-600 font-mono text-[11px] sm:text-xs text-right pr-1.5 sm:pr-3 select-none overflow-hidden shrink-0">
                  {code.split("\n").map((_, i) => (
                    <div key={i} className="leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Textarea Code Editor */}
                <textarea
                  ref={editorTextareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    // Handle Tab key
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      const newCode = code.substring(0, start) + "  " + code.substring(end);
                      setCode(newCode);
                      setTimeout(() => {
                        if (editorTextareaRef.current) {
                          editorTextareaRef.current.selectionStart =
                            editorTextareaRef.current.selectionEnd = start + 2;
                        }
                      }, 0);
                    }
                  }}
                  spellCheck={false}
                  className="flex-1 p-2.5 sm:p-3 bg-transparent text-slate-100 font-mono text-[11.5px] sm:text-xs leading-6 resize-none focus:outline-none overflow-auto selection:bg-cyan-500/30"
                />
              </div>
            </div>
          )}

          {/* Live Preview / Output Terminal Panel */}
          {(activeTab === "split" || activeTab === "output") && (
            <div
              className={`flex flex-col bg-[#060a14] min-h-0 min-w-0 ${
                activeTab === "split"
                  ? "w-full h-1/2 md:w-1/2 md:h-full"
                  : "w-full h-full"
              }`}
            >
              {/* Output Header */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#090e1c] border-b border-white/5 text-[11px] font-mono shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isHtmlOrReact ? (
                    <>
                      <Eye size={13} className="text-cyan-400 shrink-0" />
                      <span className="text-slate-300 font-bold truncate">
                        <span className="sm:hidden">Preview</span>
                        <span className="hidden sm:inline">Interactive Sandbox Preview</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Terminal size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-slate-300 font-bold truncate">
                        <span className="sm:hidden">Console</span>
                        <span className="hidden sm:inline">Execution Console</span>
                      </span>
                    </>
                  )}
                  {executionResult && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                        executionResult.success
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {executionResult.executionTimeMs}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Dedicated Copy to Clipboard Button on Code Output */}
                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-mono font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
                      isCopied
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-gradient-to-r from-cyan-600/30 to-pink-600/30 hover:from-cyan-600/50 hover:to-pink-600/50 border-cyan-500/50 hover:border-cyan-400 text-cyan-200 hover:text-white"
                    }`}
                    title="Copy generated code to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-cyan-400" />
                        <span className="sm:hidden">Copy</span>
                        <span className="hidden sm:inline">Copy to Clipboard</span>
                      </>
                    )}
                  </button>

                  {/* Dedicated Download Code File Button on Code Output */}
                  <button
                    onClick={() => handleDownloadCode()}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
                      isDownloaded
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-pink-500/15 hover:bg-pink-500/30 border-pink-500/40 hover:border-pink-400 text-pink-200 hover:text-white"
                    }`}
                    title={`Download code as .${currentLangObj.ext} file to your local computer`}
                  >
                    {isDownloaded ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span>Saved .{currentLangObj.ext}!</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} className="text-pink-400" />
                        <span>Download (.{currentLangObj.ext})</span>
                      </>
                    )}
                  </button>

                  {/* Copy Console Output Logs button if non-HTML and logs exist */}
                  {!isHtmlOrReact && executionResult?.output && (
                    <button
                      onClick={handleCopyOutput}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-300 text-[11px] font-mono transition-colors cursor-pointer"
                      title="Copy console output logs to clipboard"
                    >
                      {isOutputCopied ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Terminal size={12} className="text-emerald-400" />
                          <span>Logs</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleRunCode()}
                    className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Rerun execution"
                  >
                    <RotateCcw size={12} />
                    <span>Rerun</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Container */}
              <div className="flex-1 relative overflow-hidden bg-black flex flex-col min-h-0">
                {isHtmlOrReact ? (
                  <div className="relative w-full h-full flex flex-col">
                    {/* Floating Quick Action in Live Preview */}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a0f1d]/90 hover:bg-[#141f3d] backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:text-white text-[11px] font-mono shadow-xl transition-all active:scale-95 cursor-pointer"
                        title="Copy generated code to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-300 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} className="text-cyan-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadCode()}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-mono shadow-xl transition-all active:scale-95 cursor-pointer ${
                          isDownloaded
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-300 font-semibold"
                            : "bg-[#0a0f1d]/90 hover:bg-[#141f3d] border-pink-500/40 hover:border-pink-400 text-pink-200 hover:text-white"
                        }`}
                        title={`Download code as .${currentLangObj.ext} file`}
                      >
                        {isDownloaded ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Download size={11} className="text-pink-400" />
                            <span>.{currentLangObj.ext}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <iframe
                      ref={previewIframeRef}
                      srcDoc={generatePreviewDoc()}
                      title="Zoya Live Preview"
                      sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                      className="w-full h-full border-none bg-black"
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-3 sm:p-4 font-mono text-[11.5px] sm:text-xs overflow-auto text-slate-200 space-y-2 select-text">
                    <div className="text-slate-500 pb-2 border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="truncate">$ zoya --lang={selectedLanguage}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">Devid's Sandbox</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white text-[11px] font-mono transition-all cursor-pointer"
                          title="Copy generated code to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} className="text-cyan-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadCode()}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                            isDownloaded
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-medium"
                              : "bg-pink-500/15 hover:bg-pink-500/30 border-pink-500/40 text-pink-200 hover:text-white"
                          }`}
                          title={`Download code as .${currentLangObj.ext} file`}
                        >
                          {isDownloaded ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Download size={11} className="text-pink-400" />
                              <span>.{currentLangObj.ext}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isRunning && (
                      <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                        <Terminal size={14} />
                        <span>Compiling and executing {selectedLanguage} script...</span>
                      </div>
                    )}

                    {executionResult && (
                      <div>
                        {executionResult.output && (
                          <pre className="whitespace-pre-wrap text-emerald-300 leading-relaxed font-mono">
                            {executionResult.output}
                          </pre>
                        )}
                        {executionResult.error && (
                          <div className="mt-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {executionResult.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {!executionResult && !isRunning && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-12">
                        <Terminal size={32} className="text-slate-600" />
                        <p>Click "Run (Ctrl+Enter)" to execute this code.</p>
                        <p className="text-[11px] text-slate-600">
                          Python, JS, C++, Java, Go, Rust, Bash & SQL supported!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Toast Line */}
        {statusMessage && (
          <div className="px-4 py-1 bg-cyan-950/80 border-t border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* AI Code Generator Prompt Bar at Bottom */}
        <div className="px-2.5 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3 bg-[#0d152a] border-t border-cyan-500/20 flex flex-col gap-2 shrink-0">
          {/* Prompt Suggestions Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-mono text-slate-400 no-scrollbar">
            <span className="text-slate-500 shrink-0">Bolo Devid:</span>
            <button
              onClick={() => handleGenerateCode("Make a fully responsive animated Flappy Bird game in HTML5 Canvas")}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-all shrink-0"
            >
              🎮 Flappy Bird Game
            </button>
            <button
              onClick={() => handleGenerateCode("Python script to scrape YouTube video metadata and download thumbnails")}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-all shrink-0"
            >
              🐍 Python YouTube Scraper
            </button>
            <button
              onClick={() => handleGenerateCode("React cryptocurrency live price tracker dashboard with sparkline chart")}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-all shrink-0"
            >
              ⚛️ React Crypto Dashboard
            </button>
            <button
              onClick={() => handleGenerateCode("C++ AVL self-balancing binary search tree with visual print")}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-all shrink-0"
            >
              💻 C++ AVL Tree
            </button>
            <button
              onClick={() => handleGenerateCode("FastAPI authentication service with JWT and password hashing")}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-all shrink-0"
            >
              🌐 FastAPI JWT Backend
            </button>
          </div>

          {/* Generator Input Box */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) {
                    handleGenerateCode();
                  }
                }}
                placeholder="Batao Devid, kiska code generate karu?..."
                className="w-full pl-3 pr-8 sm:px-4 sm:pr-10 py-2 sm:py-2.5 rounded-xl bg-[#141f3d] border border-cyan-500/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
              />
              <Sparkles
                size={15}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none"
              />
            </div>

            <button
              onClick={() => handleGenerateCode()}
              disabled={isGenerating || !promptInput.trim()}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-pink-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Wand2 size={15} className={isGenerating ? "animate-spin" : ""} />
              <span className="sm:hidden">{isGenerating ? "..." : "Generate"}</span>
              <span className="hidden sm:inline">{isGenerating ? "Generating..." : "Generate Code"}</span>
            </button>
          </div>
        </div>

        {/* AI Explanation / Analysis Modal */}
        <AnimatePresence>
          {showExplanationModal && aiExplanation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4"
            >
              <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 max-h-[88dvh] overflow-hidden">
                <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm min-w-0">
                    <Sparkles size={15} className="shrink-0" />
                    <span className="truncate">Zoya Code Insights</span>
                  </div>
                  <button
                    onClick={() => setShowExplanationModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="overflow-y-auto pr-2 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 font-sans">
                  {aiExplanation.split("\n\n").map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setShowExplanationModal(false)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Samajh gaya Zoya! 👍
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
