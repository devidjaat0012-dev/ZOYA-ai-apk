import React, { useState } from "react";
import { Check, Copy, Download, Play } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  onOpenInCodeStudio?: (code: string, language: string) => void;
  isLight?: boolean;
}

const EXTENSION_MAP: Record<string, string> = {
  python: "py",
  py: "py",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  html: "html",
  react: "jsx",
  jsx: "jsx",
  tsx: "tsx",
  cpp: "cpp",
  c: "c",
  java: "java",
  rust: "rs",
  rs: "rs",
  go: "go",
  sql: "sql",
  bash: "sh",
  sh: "sh",
  php: "php",
  kotlin: "kt",
  dart: "dart",
  css: "css",
  json: "json",
};

const CodeBlock: React.FC<{
  language: string;
  code: string;
  onOpenInCodeStudio?: (code: string, language: string) => void;
}> = ({ language, code, onOpenInCodeStudio }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const ext = EXTENSION_MAP[(language || "").toLowerCase()] || "txt";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zoya_${(language || "code").toLowerCase()}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.warn("Download code failed:", err);
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#07090e] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06] text-xs text-white/60 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold uppercase">{language || "code"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenInCodeStudio && (
            <button
              type="button"
              onClick={() => onOpenInCodeStudio(code, language || "python")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/30 font-medium transition-colors cursor-pointer"
              title="Open and Run in Zoya Code Studio"
            >
              <Play size={11} className="fill-current text-cyan-400" />
              <span>Run in Studio</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-pink-300 transition-colors cursor-pointer"
            title={`Download as .${ext} file`}
          >
            {downloaded ? <Check size={13} className="text-emerald-400" /> : <Download size={13} />}
            <span>{downloaded ? "Saved" : "Download"}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-[13px] font-mono leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function parseInline(text: string, isLight: boolean = false): React.ReactNode[] {
  // Handle inline code `...`, bold **...**, italic *...*, and links [label](url)
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[0.88em] ${
            isLight
              ? "bg-slate-200/80 text-rose-700"
              : "bg-white/10 text-pink-200"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong
          key={idx}
          className={`font-semibold ${isLight ? "text-slate-950" : "text-white"}`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em
          key={idx}
          className={`italic ${isLight ? "text-slate-800" : "text-white/90"}`}
        >
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-4 transition-colors ${
            isLight
              ? "text-sky-700 hover:text-sky-600"
              : "text-cyan-400 hover:text-cyan-300"
          }`}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

export default function MarkdownRenderer({
  content,
  onOpenInCodeStudio,
  isLight = false,
}: MarkdownRendererProps) {
  if (!content) return null;

  // Split by fenced code blocks first
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div
      className={`space-y-2.5 text-[15px] leading-[1.68] tracking-[0.005em] ${
        isLight ? "text-slate-800" : "text-slate-200"
      }`}
    >
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const lines = segment.slice(3, -3).split("\n");
          const firstLine = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n");
          return (
            <CodeBlock
              key={segIdx}
              language={firstLine}
              code={code}
              onOpenInCodeStudio={onOpenInCodeStudio}
            />
          );
        }

        const lines = segment.split("\n");
        const blocks: React.ReactNode[] = [];
        let listItems: string[] = [];
        let orderedItems: string[] = [];

        const flushLists = (keyPrefix: string) => {
          if (listItems.length > 0) {
            blocks.push(
              <ul
                key={`${keyPrefix}-ul`}
                className={`list-disc pl-5 space-y-1.5 my-2 ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {listItems.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {parseInline(item, isLight)}
                  </li>
                ))}
              </ul>
            );
            listItems = [];
          }
          if (orderedItems.length > 0) {
            blocks.push(
              <ol
                key={`${keyPrefix}-ol`}
                className={`list-decimal pl-5 space-y-1.5 my-2 ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {orderedItems.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {parseInline(item, isLight)}
                  </li>
                ))}
              </ol>
            );
            orderedItems = [];
          }
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            flushLists(`${segIdx}-${lineIdx}`);
            return;
          }

          // Bullet list item
          if (/^[-*•]\s+/.test(trimmed)) {
            if (orderedItems.length > 0) flushLists(`${segIdx}-${lineIdx}`);
            listItems.push(trimmed.replace(/^[-*•]\s+/, ""));
            return;
          }

          // Numbered list item
          if (/^\d+\.\s+/.test(trimmed)) {
            if (listItems.length > 0) flushLists(`${segIdx}-${lineIdx}`);
            orderedItems.push(trimmed.replace(/^\d+\.\s+/, ""));
            return;
          }

          flushLists(`${segIdx}-${lineIdx}`);

          if (trimmed.startsWith("### ")) {
            blocks.push(
              <h3
                key={`${segIdx}-${lineIdx}`}
                className={`text-base font-semibold pt-2 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {parseInline(trimmed.slice(4), isLight)}
              </h3>
            );
          } else if (trimmed.startsWith("## ")) {
            blocks.push(
              <h2
                key={`${segIdx}-${lineIdx}`}
                className={`text-lg font-semibold pt-2.5 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {parseInline(trimmed.slice(3), isLight)}
              </h2>
            );
          } else if (trimmed.startsWith("# ")) {
            blocks.push(
              <h1
                key={`${segIdx}-${lineIdx}`}
                className={`text-xl font-semibold pt-3 ${
                  isLight ? "text-slate-950" : "text-white"
                }`}
              >
                {parseInline(trimmed.slice(2), isLight)}
              </h1>
            );
          } else if (trimmed.startsWith("> ")) {
            blocks.push(
              <blockquote
                key={`${segIdx}-${lineIdx}`}
                className={`border-l-2 border-pink-500/50 pl-4 py-0.5 italic my-2 ${
                  isLight ? "text-slate-600" : "text-white/80"
                }`}
              >
                {parseInline(trimmed.slice(2), isLight)}
              </blockquote>
            );
          } else {
            blocks.push(
              <p key={`${segIdx}-${lineIdx}`} className="leading-[1.68]">
                {parseInline(line, isLight)}
              </p>
            );
          }
        });

        flushLists(`${segIdx}-end`);
        return <React.Fragment key={segIdx}>{blocks}</React.Fragment>;
      })}
    </div>
  );
}
