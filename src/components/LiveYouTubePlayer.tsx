import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Youtube,
  X,
  Move,
  Minimize2,
  Maximize2,
  Mic,
  Heart,
  Search,
  Sparkles,
  Play,
  ExternalLink,
  Music2,
} from "lucide-react";

export interface WatchTogetherVideo {
  id: string;
  title: string;
  artistOrChannel: string;
  category: "fav" | "bollywood" | "desi_vibe" | "lofi";
  lyricsSnippet?: string;
}

export const CURATED_WATCH_TOGETHER_VIDEOS: WatchTogetherVideo[] = [
  {
    id: "BddP6PYo2gs",
    title: "Kesariya - Brahmāstra",
    artistOrChannel: "Arijit Singh · Pritam",
    category: "bollywood",
    lyricsSnippet:
      "Mujhko itna bataye koi, kaise tujhse dil na lagaye koi... Rabba ne tujhko banane mein kardi hai husn ki khali tijoriyan, Kajal ki siyaahi se likhi hai tune jaane kitno ki love storiyan... Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun!",
  },
  {
    id: "RLzC55ai0eo",
    title: "Heeriye (Official Video)",
    artistOrChannel: "Jasleen Royal · Arijit Singh",
    category: "bollywood",
    lyricsSnippet:
      "Heeriye, Heeriye, aa... Teri hoke maraan जिंद जान करां, Heeriye, Heeriye, aa... Neendan vi tutt tutt gaiyan, chundi main taare rahiyaan, sochan vich teri paiyaan, haaniya!",
  },
  {
    id: "k3g_WjLCsXM",
    title: "Apna Bana Le - Bhediya",
    artistOrChannel: "Arijit Singh · Sachin-Jigar",
    category: "bollywood",
    lyricsSnippet:
      "Tu mera koi na hoke bhi kuch laage... किया रे जो भी तूने कैसे किया रे, जिया को मेरे बाँध ऐसे लिया रे, समझ के भी ना समझ मैं सकूँ... Apna bana le piya, apna bana le piya, dil ke nagar mein shehar tu basa le piya!",
  },
  {
    id: "vB0V3iCSzQw",
    title: "295 / Desi Hip-Hop Vibe",
    artistOrChannel: "Sidhu Moose Wala",
    category: "desi_vibe",
    lyricsSnippet:
      "Sach bolenga taan milu 295, je karenga tarakki putt hani...!",
  },
  {
    id: "VuG7ge_8I2Y",
    title: "Maan Meri Jaan",
    artistOrChannel: "King",
    category: "bollywood",
    lyricsSnippet:
      "Main teri aankhon mein udaasi kabhi dekh sakda nahi, tujhe khush main rakhunga soneya... Main tere hothon pe khamoshi kabhi dekh sakda nahi, saari baatein main sununga soneya... Tu maan meri jaan, main tujhe jaane na dunga!",
  },
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio - Late Night Chill",
    artistOrChannel: "Lofi Girl · Live Stream",
    category: "lofi",
    lyricsSnippet:
      "Hmm-hmm-hmmm... late night chill lo-fi melody with you...",
  },
];

const FAV_SONG_STORAGE_KEY = "zoya_user_fav_song_v1";

export interface SavedFavSong {
  title: string;
  youtubeId?: string;
  lyricsSnippet?: string;
}

export function loadSavedFavSong(): SavedFavSong {
  try {
    const raw = localStorage.getItem(FAV_SONG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.title) return parsed;
    }
  } catch {}
  return {
    title: "Kesariya (Tera Ishq Hai Piya)",
    youtubeId: "BddP6PYo2gs",
    lyricsSnippet:
      "Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun... Din beete saara teri fikar mein, raina saari teri khair manaaun!",
  };
}

export function saveUserFavSong(song: SavedFavSong): void {
  try {
    localStorage.setItem(FAV_SONG_STORAGE_KEY, JSON.stringify(song));
  } catch {}
}

/**
 * Extracts a 11-character YouTube video ID if the user pastes a YouTube URL or ID.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  // Direct 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Standard watch?v=, youtu.be/, embed/, shorts/
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const reg of patterns) {
    const match = clean.match(reg);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface LiveYouTubePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  assistantName: string;
  isLiveActive: boolean;
  externalSearchOrUrl?: { query: string; timestamp: number } | null;
  onTriggerZoyaVoice: (promptText: string) => void;
  onSaveMemoryFact?: (fact: string) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
}

export default function LiveYouTubePlayer({
  isOpen,
  onClose,
  userName,
  assistantName,
  isLiveActive,
  externalSearchOrUrl,
  onTriggerZoyaVoice,
  onSaveMemoryFact,
  constraintsRef,
}: LiveYouTubePlayerProps) {
  const [favSong, setFavSong] = useState<SavedFavSong>(() => loadSavedFavSong());
  const [activeVideo, setActiveVideo] = useState<WatchTogetherVideo>(
    () =>
      CURATED_WATCH_TOGETHER_VIDEOS.find((v) => v.id === favSong.youtubeId) ||
      CURATED_WATCH_TOGETHER_VIDEOS[0]
  );
  const [searchQueryOrUrl, setSearchQueryOrUrl] = useState<string>("");
  const [customEmbedMode, setCustomEmbedMode] = useState<
    | { type: "video"; videoId: string; title: string }
    | { type: "search"; query: string }
    | null
  >(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isExpandedSize, setIsExpandedSize] = useState<boolean>(false);
  const [customFavInput, setCustomFavInput] = useState<string>("");
  const [showFavEditor, setShowFavEditor] = useState<boolean>(false);

  // Respond when Zoya or voice command passes a YouTube song/video query
  useEffect(() => {
    if (!externalSearchOrUrl || !externalSearchOrUrl.query) return;
    const raw = externalSearchOrUrl.query.trim();
    if (!raw) return;

    const extractedId = extractYouTubeVideoId(raw);
    if (extractedId) {
      setCustomEmbedMode({
        type: "video",
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
      });
      return;
    }

    // Check if it matches one of our curated videos
    const lower = raw.toLowerCase();
    const matchedCurated = CURATED_WATCH_TOGETHER_VIDEOS.find(
      (v) =>
        v.title.toLowerCase().includes(lower) ||
        lower.includes(v.title.toLowerCase().split(" ")[0]) ||
        v.artistOrChannel.toLowerCase().includes(lower)
    );
    if (matchedCurated) {
      setActiveVideo(matchedCurated);
      setCustomEmbedMode(null);
    } else {
      setCustomEmbedMode({
        type: "search",
        query: raw,
      });
    }
  }, [externalSearchOrUrl]);

  if (!isOpen) return null;

  const currentDisplayTitle =
    customEmbedMode?.type === "video"
      ? customEmbedMode.title
      : customEmbedMode?.type === "search"
      ? `YouTube: ${customEmbedMode.query}`
      : activeVideo.title;

  const currentIframeSrc =
    customEmbedMode?.type === "video"
      ? `https://www.youtube.com/embed/${customEmbedMode.videoId}?autoplay=1&rel=0&modestbranding=1`
      : customEmbedMode?.type === "search"
      ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
          customEmbedMode.query
        )}&autoplay=1`
      : `https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`;

  const currentYoutubeWatchUrl =
    customEmbedMode?.type === "video"
      ? `https://www.youtube.com/watch?v=${customEmbedMode.videoId}`
      : customEmbedMode?.type === "search"
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
          customEmbedMode.query
        )}`
      : `https://www.youtube.com/watch?v=${activeVideo.id}`;

  const handleLoadUrlOrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQueryOrUrl.trim();
    if (!clean) return;

    const extractedId = extractYouTubeVideoId(clean);
    if (extractedId) {
      setCustomEmbedMode({
        type: "video",
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
      });
      if (isLiveActive) {
        onTriggerZoyaVoice(
          `[${userName} just loaded a YouTube video (${extractedId}) in the Watch-Together player! React excitedly in Hinglish ("Oho! Chalo sath me dekhte hain ye video!")]`
        );
      }
    } else {
      const lower = clean.toLowerCase();
      const matchedCurated = CURATED_WATCH_TOGETHER_VIDEOS.find(
        (v) =>
          v.title.toLowerCase().includes(lower) ||
          v.artistOrChannel.toLowerCase().includes(lower)
      );
      if (matchedCurated) {
        setActiveVideo(matchedCurated);
        setCustomEmbedMode(null);
        if (isLiveActive) {
          onTriggerZoyaVoice(
            `[${userName} just started playing "${matchedCurated.title}" by ${matchedCurated.artistOrChannel} in the Watch-Together player! React warmly in Hinglish and hum or sing a line along!]`
          );
        }
      } else {
        setCustomEmbedMode({
          type: "search",
          query: clean,
        });
        if (isLiveActive) {
          onTriggerZoyaVoice(
            `[${userName} searched and started watching "${clean}" on our YouTube Watch-Together player! React in Hinglish ("Wah ${userName}, '${clean}' dekh rahe hain hum sath me! Batao kaisa lag raha hai?")]`
          );
        }
      }
    }
    setSearchQueryOrUrl("");
  };

  const handleSelectCurated = (video: WatchTogetherVideo) => {
    setActiveVideo(video);
    setCustomEmbedMode(null);
    if (isLiveActive) {
      onTriggerZoyaVoice(
        `[${userName} switched the YouTube Watch-Together player to "${video.title}" (${video.artistOrChannel}). React with excitement in Hinglish and hum/sing a line of it!]`
      );
    }
  };

  const handleSetCurrentAsFav = () => {
    const newFav: SavedFavSong = {
      title: currentDisplayTitle,
      youtubeId:
        customEmbedMode?.type === "video"
          ? customEmbedMode.videoId
          : customEmbedMode === null
          ? activeVideo.id
          : undefined,
      lyricsSnippet:
        customEmbedMode === null ? activeVideo.lyricsSnippet : undefined,
    };
    setFavSong(newFav);
    saveUserFavSong(newFav);
    onSaveMemoryFact?.(
      `${userName}'s favourite song is "${newFav.title}"${
        newFav.lyricsSnippet ? ` (Lyrics: ${newFav.lyricsSnippet})` : ""
      }`
    );
    if (isLiveActive) {
      onTriggerZoyaVoice(
        `[${userName} just set "${newFav.title}" as their Favourite Song! Tell them sweetly in Hinglish that you've remembered "${newFav.title}" as their favourite song and sing a couple of lines of it for them right now!]`
      );
    }
  };

  const handleSaveCustomFavSong = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customFavInput.trim();
    if (!clean) return;
    const newFav: SavedFavSong = {
      title: clean,
    };
    setFavSong(newFav);
    saveUserFavSong(newFav);
    onSaveMemoryFact?.(`${userName}'s favourite song is "${clean}"`);
    setCustomFavInput("");
    setShowFavEditor(false);
    if (isLiveActive) {
      onTriggerZoyaVoice(
        `[${userName} just told you their favourite song is "${clean}"! You have FULL PERMISSION to sing! Immediately sing "${clean}" melodiously with real vocal expression, humming, and heartfelt lyrics in Hinglish/Hindi for ${userName}!]`
      );
    }
  };

  const handleAskZoyaToSingFav = () => {
    onTriggerZoyaVoice(
      `[SINGING PERMISSION GRANTED: ${userName} wants you to sing their favourite song "${favSong.title}" right now! ${
        favSong.lyricsSnippet
          ? `Here are lyrics you can sing: "${favSong.lyricsSnippet}"`
          : ""
      } Do NOT just read the words flatly—sing it melodiously with sweet vocal rhythm, humming ("Hmm-hmm-hmmm 🎶"), stretched musical notes, and romantic Hinglish charm for ${userName}!]`
    );
  };

  const handleAskZoyaToSingCurrent = () => {
    const lyricsHint =
      customEmbedMode === null && activeVideo.lyricsSnippet
        ? `Lyrics to sing: "${activeVideo.lyricsSnippet}"`
        : "";
    onTriggerZoyaVoice(
      `[SINGING PERMISSION GRANTED: ${userName} and you are watching "${currentDisplayTitle}" together! Sing along to "${currentDisplayTitle}" right now with melodic vocal expression, humming ("La-la-la / Hmm-hmm 🎶"), and real singing rhythm! ${lyricsHint}]`
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-40 left-3 sm:left-6 bottom-24 bg-[#0D121F]/95 backdrop-blur-2xl border border-rose-500/35 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col select-none ${
          isMinimized
            ? "w-72"
            : isExpandedSize
            ? "w-[94vw] sm:w-[480px]"
            : "w-[90vw] sm:w-[370px]"
        }`}
      >
        {/* Draggable Top Bar */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-500/20 via-pink-500/15 to-amber-500/15 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-500/25 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
              <Youtube size={14} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="truncate">Watch Together &amp; Sing</span>
                <Move size={11} className="text-slate-400 shrink-0" />
              </div>
              <div className="text-[10px] text-rose-200/80 truncate">
                Movable Player · Fav: {favSong.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setIsExpandedSize((prev) => !prev)}
                className="w-6 h-6 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title={isExpandedSize ? "Standard size" : "Expand video player"}
              >
                {isExpandedSize ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="px-1.5 h-6 rounded-lg hover:bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title={isMinimized ? "Restore player" : "Minimize to mini bar"}
            >
              {isMinimized ? "Show" : "Hide"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-lg hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-colors"
              title="Close Watch-Together Player"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body (Hidden when minimized so audio can keep playing or stay compact) */}
        <div className={isMinimized ? "hidden" : "p-3 space-y-2.5"}>
          {/* Embedded YouTube Player */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
            <iframe
              key={currentIframeSrc}
              src={currentIframeSrc}
              title={currentDisplayTitle}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Current Track + Direct YouTube Link */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentDisplayTitle}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {customEmbedMode === null
                  ? activeVideo.artistOrChannel
                  : "Playing in Co-Watch Mode with Zoya"}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleSetCurrentAsFav}
                className="px-2 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 text-pink-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                title="Save current video/song as your Favourite Song for Zoya to sing"
              >
                <Heart size={10} className="fill-pink-400 text-pink-400" />
                <span>Set Fav</span>
              </button>
              <a
                href={currentYoutubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Zoya Sing-Along & Co-Watch Voice Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleAskZoyaToSingFav}
              className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all"
              title={`Ask ${assistantName} to sing your favourite song (${favSong.title})`}
            >
              <Mic size={12} />
              <span className="truncate">Sing My Fav Song</span>
            </button>

            <button
              type="button"
              onClick={handleAskZoyaToSingCurrent}
              className="px-2.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-pink-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              title={`Ask ${assistantName} to sing along or react to this video`}
            >
              <Sparkles size={12} className="text-pink-400" />
              <span className="truncate">Sing / React Now</span>
            </button>
          </div>

          {/* Favourite Song Customizer Toggle */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span className="truncate">
              Fav Song: <strong className="text-pink-300">{favSong.title}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowFavEditor((prev) => !prev)}
              className="text-pink-400 hover:text-pink-300 font-medium underline underline-offset-2 shrink-0 ml-2"
            >
              {showFavEditor ? "Cancel" : "Change Fav Song"}
            </button>
          </div>

          {showFavEditor && (
            <form onSubmit={handleSaveCustomFavSong} className="flex items-center gap-1.5">
              <input
                type="text"
                value={customFavInput}
                onChange={(e) => setCustomFavInput(e.target.value)}
                placeholder="Type your favourite song name (e.g., Tum Hi Ho, 295)..."
                className="flex-1 bg-black/40 border border-pink-500/35 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-semibold shrink-0"
              >
                Save &amp; Sing
              </button>
            </form>
          )}

          {/* Paste YouTube Link or Search Video Input */}
          <form onSubmit={handleLoadUrlOrSearch} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQueryOrUrl}
                onChange={(e) => setSearchQueryOrUrl(e.target.value)}
                placeholder="Paste YouTube link or search song/video..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Play size={11} />
              <span>Watch</span>
            </button>
          </form>

          {/* Quick Curated Watch-Together Playlists */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CURATED_WATCH_TOGETHER_VIDEOS.map((vid) => {
              const isSelected =
                customEmbedMode === null && activeVideo.id === vid.id;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => handleSelectCurated(vid)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap flex items-center gap-1 border transition-all ${
                    isSelected
                      ? "bg-rose-500/25 border-rose-500/50 text-rose-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Music2 size={10} />
                  <span>{vid.title.split(" - ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
