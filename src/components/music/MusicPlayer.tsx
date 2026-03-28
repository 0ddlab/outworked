import { useCallback, useEffect, useRef, useState } from "react";
import MusicInfoModal from "./MusicInfoModal";

interface Track {
  title: string;
  src: string;
  user?: boolean;
}

interface ElectronMusicAPI {
  music: { listTracks: () => Promise<Track[]> };
  isElectron: boolean;
}

function getMusicAPI(): ElectronMusicAPI["music"] | null {
  const w = window as unknown as { electronAPI?: ElectronMusicAPI };
  return w.electronAPI?.isElectron ? w.electronAPI.music : null;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const orderedRef = useRef<Track[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const api = getMusicAPI();
    if (api) {
      api.listTracks().then((list) => {
        orderedRef.current = list;
        setTracks(list);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const track = tracks[trackIndex] ?? null;
  const userCount = tracks.filter((t) => t.user).length;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.src;
    audio.load();
    if (playing) {
      audio.addEventListener(
        "canplaythrough",
        () => audio.play().catch(console.error),
        { once: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex, track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onError = () => {
      console.error("[MusicPlayer] audio error:", audio.error?.message, track?.src);
    };
    audio.addEventListener("error", onError);
    return () => audio.removeEventListener("error", onError);
  }, [track]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setPlaying((p) => !p);
  }, [playing]);

  const skip = useCallback(
    (dir: 1 | -1) => {
      setTrackIndex((i) => (i + dir + tracks.length) % tracks.length);
    },
    [tracks.length],
  );

  const toggleShuffle = useCallback(() => {
    const current = tracks[trackIndex] ?? null;
    setShuffled((prev) => {
      const next = !prev;
      if (next) {
        const newList = [...orderedRef.current].sort(() => Math.random() - 0.5);
        setTracks(newList);
        setTrackIndex(current ? Math.max(0, newList.findIndex((t) => t.src === current.src)) : 0);
      } else {
        setTracks(orderedRef.current);
        setTrackIndex(current ? Math.max(0, orderedRef.current.findIndex((t) => t.src === current.src)) : 0);
      }
      return next;
    });
  }, [tracks, trackIndex]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted((m) => !m);
  }, [muted]);

  const handleEnded = useCallback(() => {
    setTrackIndex((i) => (i + 1) % tracks.length);
  }, [tracks.length]);

  if (loading || tracks.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 rounded border border-slate-700">
        <span className="text-[11px] font-pixel text-slate-400">
          {loading ? "Loading..." : "No tracks"}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 rounded border border-slate-700">
        <audio ref={audioRef} onEnded={handleEnded} />

        {/* Prev */}
        <button
          onClick={() => skip(-1)}
          className="text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Previous track"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="2" width="2" height="8" />
            <polygon points="11,2 11,10 4,6" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={toggle}
          className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="2" width="3" height="8" />
              <rect x="7" y="2" width="3" height="8" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <polygon points="2,1 11,6 2,11" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => skip(1)}
          className="text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Next track"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="1,2 1,10 8,6" />
            <rect x="9" y="2" width="2" height="8" />
          </svg>
        </button>

        {/* Track name – marquee scroll */}
        <div className="overflow-hidden max-w-[100px]">
          <span
            className="text-[11px] font-pixel text-slate-300 inline-block whitespace-nowrap animate-marquee"
            title={track!.title}
          >
            {track!.title}
          </span>
        </div>

        {/* Shuffle */}
        <button
          onClick={toggleShuffle}
          className={`transition-colors cursor-pointer ${shuffled ? "text-indigo-400 hover:text-indigo-300" : "text-slate-500 hover:text-slate-300"}`}
          title={shuffled ? "Shuffle: on" : "Shuffle: off"}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1,9 L8,2" />
            <path d="M1,3 L8,10" />
            <polyline points="6,2 9,2 9,5" />
            <polyline points="6,10 9,10 9,7" />
          </svg>
        </button>

        {/* Info */}
        <button
          onClick={() => setShowInfo(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          title="Music info & custom tracks"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
            <text x="6" y="9" textAnchor="middle" fontSize="8" fontWeight="bold">?</text>
          </svg>
        </button>
      </div>

      {showInfo && (
        <MusicInfoModal onClose={() => setShowInfo(false)} userCount={userCount} />
      )}
    </>
  );
}
