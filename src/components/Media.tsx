import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Video } from "../data/videos";
import { fmtClock } from "../lib/dates";

/* ---------- inline YouTube player (loads the iframe only on tap) ---------- */
export function VideoPlayer({ videos, search, name }: { videos?: Video[]; search: string; name: string }) {
  const [on, setOn] = useState(false);
  const [pick, setPick] = useState(0);
  const video = videos?.[pick];
  if (!video) {
    return (
      <a className="btn video" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(search).replace(/%20/g, "+")}`}
        target="_blank" rel="noopener noreferrer">▶ Find form videos</a>
    );
  }
  const src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${video.id}`;
  return (
    <div className="video">
      <div className={`player${video.short ? " short" : ""}`}>
        {on ? (
          <iframe src={src} title={`${name}: ${video.title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <button type="button" className="poster" onClick={() => setOn(true)} aria-label={`Play form video: ${video.title}`}>
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="#fff" /></svg></span>
            <span className="credit">{video.channel}</span>
          </button>
        )}
      </div>
      <div className="video-meta">
        <span>{video.title} · {video.channel}</span>
        {videos && videos.length > 1 && (
          <button type="button" className="btn ghost small" onClick={() => { setPick((p) => (p + 1) % videos.length); setOn(true); }}>
            Other video ({(pick + 1) % videos.length + 1}/{videos.length})
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- rest timer shared across the page ---------- */
interface TimerApi { start: (sec: number, label: string) => void }
const TimerCtx = createContext<TimerApi>({ start: () => {} });
export const useRestTimer = () => useContext(TimerCtx);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [end, setEnd] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [now, setNow] = useState(Date.now());
  const audio = useRef<AudioContext | null>(null);
  const fired = useRef(false);

  const start = useCallback((sec: number, l: string) => {
    try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { /* no audio */ }
    fired.current = false; setLabel(l); setEnd(Date.now() + sec * 1000); setNow(Date.now());
  }, []);

  useEffect(() => {
    if (end === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [end]);

  const left = end === null ? 0 : Math.max(0, Math.round((end - now) / 1000));
  const done = end !== null && left === 0;

  useEffect(() => {
    if (!done || fired.current) return;
    fired.current = true;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
    const ctx = audio.current;
    if (ctx) {
      [0, 0.25].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
      });
    }
    const id = window.setTimeout(() => setEnd(null), 5000);
    return () => window.clearTimeout(id);
  }, [done]);

  return (
    <TimerCtx.Provider value={{ start }}>
      {children}
      {end !== null && (
        <div className={`timer${done ? " go" : ""}`} role="timer" aria-live="polite">
          <div className="wrap"><div>
            <b className="num">{fmtClock(left)}</b>
            <span>{done ? "Next set" : `Rest · ${label}`}</span>
            <button type="button" onClick={() => setEnd((e) => (e ? e + 30000 : e))} disabled={done}>+30 s</button>
            <button type="button" onClick={() => setEnd(null)}>{done ? "Close" : "Skip"}</button>
          </div></div>
        </div>
      )}
    </TimerCtx.Provider>
  );
}
