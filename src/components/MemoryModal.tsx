import React, { useState } from "react";
import {
  Brain,
  X,
  Plus,
  Trash2,
  Mic,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { MemoryCategory, MemoryItem } from "../types";
import {
  addSavedMemory,
  clearAllSavedMemories,
  removeSavedMemoryById,
} from "../services/memoryService";

interface MemoryModalProps {
  memories: MemoryItem[];
  assistantName: string;
  userName: string;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: MemoryCategory; label: string; badgeClass: string }[] = [
  {
    id: "personal",
    label: "Personal",
    badgeClass: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
  {
    id: "preference",
    label: "Preference",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "relationship",
    label: "People & Vibe",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  {
    id: "goal",
    label: "Goal",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "work_study",
    label: "Work / Study",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  {
    id: "important",
    label: "Important",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
];

export default function MemoryModal({
  memories,
  assistantName,
  userName,
  onClose,
}: MemoryModalProps) {
  const [newFact, setNewFact] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>("personal");

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    addSavedMemory(newFact.trim(), selectedCategory, "manual");
    setNewFact("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl bg-[#0F1420] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#131929] border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/25 to-cyan-500/25 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
              <Brain size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{assistantName} Saved Info & Memory</span>
                <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 text-xs font-semibold">
                  {memories.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Google Gemini-style memory across Chat & Live Voice for {userName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add New Memory Form */}
        <form
          onSubmit={handleAddMemory}
          className="p-4 bg-[#111726] border-b border-white/[0.07] flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder={`Add something for ${assistantName} to always remember...`}
              className="flex-1 bg-[#090C14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/60"
            />
            <button
              type="submit"
              disabled={!newFact.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-xs sm:text-sm font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus size={16} />
              <span>Save</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    selectedCategory === cat.id
                      ? cat.badgeClass
                      : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {memories.length > 0 && (
              <button
                type="button"
                onClick={clearAllSavedMemories}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </form>

        {/* Saved Memories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 chat-scroll">
          {memories.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
                <Sparkles size={22} />
              </div>
              <div className="text-sm font-semibold text-slate-200">
                No saved memories yet
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Whenever you tell {assistantName} something in <strong>Chat</strong> or{" "}
                <strong>Live Voice</strong> (like <em>"Zoya yaad rakhna..."</em> or share your
                preferences, goals, or daily life), she automatically saves it here and
                remembers it forever!
              </p>
            </div>
          ) : (
            memories.map((item) => {
              const catInfo =
                CATEGORY_OPTIONS.find((c) => c.id === item.category) ||
                CATEGORY_OPTIONS[0];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#141B2D] border border-white/[0.07] hover:border-white/15 flex items-start justify-between gap-3 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed break-words">
                        {item.fact}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${catInfo.badgeClass}`}
                        >
                          {catInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          {item.source === "live_voice" ? (
                            <>
                              <Mic size={11} className="text-pink-400" />
                              <span>Saved from Live Voice</span>
                            </>
                          ) : item.source === "chat" ? (
                            <>
                              <MessageSquare size={11} className="text-cyan-400" />
                              <span>Saved from Chat</span>
                            </>
                          ) : (
                            <span>Added manually</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSavedMemoryById(item.id)}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                    title="Delete memory"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
