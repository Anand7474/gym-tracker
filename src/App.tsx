import { useEffect, useState } from "react";
import { addDays, mondayOf, nice, parse, SHORT_DAYS, todayKey, weekday } from "./lib/dates";
import { dayStats } from "./lib/stats";
import { useDays, useSync, useToday } from "./lib/store";
import { Ring } from "./components/Visuals";
import { RestTimerProvider } from "./components/Media";
import { TodayView } from "./components/TodayView";
import { ProgressView } from "./components/ProgressView";
import { PlanView } from "./components/PlanView";
import { CoachView } from "./components/CoachView";

type View = "today" | "progress" | "coach" | "plan";
const VIEWS: View[] = ["today", "progress", "coach", "plan"];
const viewFromHash = (): View => { const h = location.hash.slice(1) as View; return VIEWS.includes(h) ? h : "today"; };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning, Anand" : h < 17 ? "Good afternoon, Anand" : "Good evening, Anand"; };

const ICONS: Record<View, JSX.Element> = {
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h2m14 0h2M6 7v10M18 7v10M8.5 9v6M15.5 9v6M8.5 12h7" /></svg>,
  progress: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M6 15l4-4 3 3 5-6" /></svg>,
  coach: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z" /></svg>,
  plan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="4" width="14" height="16" rx="3" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>,
};
const LABEL: Record<View, string> = { today: "Today", progress: "Progress", coach: "Coach", plan: "Plan" };

export default function App() {
  const days = useDays();
  const today = useToday(todayKey);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>(viewFromHash);
  const sync = useSync();

  useEffect(() => { const f = () => setView(viewFromHash()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = (v: View) => { history.replaceState(null, "", v === "today" ? location.pathname : `#${v}`); setView(v); window.scrollTo(0, 0); };
  const open = (k: string) => { setDate(k); go("today"); };

  const dot = sync.state === "synced" ? "ok" : sync.state === "syncing" ? "busy" : sync.state === "error" ? "err" : "";
  const syncLine = sync.state === "off" ? "Saved on this phone" : sync.state === "synced" ? "Synced" : sync.state === "syncing" ? "Syncing…"
    : sync.state === "signed-out" ? "Sign in to sync" : "Sync problem";

  return (
    <RestTimerProvider>
      <header className="top">
        <div className="wrap">
          {view === "today" ? (
            <>
              <div className="titlebar">
                <div className="t">
                  <small><span className={`syncdot ${dot}`} />{date === today ? greeting() : syncLine}</small>
                  <h2>{date === today ? "Today" : nice(date)}</h2>
                </div>
                {date !== today && <button type="button" className="chipbtn" onClick={() => setDate(today)}>Today</button>}
                <button type="button" className="iconbtn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
                <button type="button" className="iconbtn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M7 3l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="week">
                {Array.from({ length: 7 }, (_, i) => {
                  const k = addDays(mondayOf(date), i), st = dayStats(k, days?.[k]);
                  return (
                    <button key={k} type="button" className={`wd${k === date ? " sel" : ""}${k === today ? " is-today" : ""}`}
                      aria-label={`${nice(k)}, ${st.pct}% done`} aria-current={k === date ? "date" : undefined} onClick={() => setDate(k)}>
                      <small>{SHORT_DAYS[weekday(k)].slice(0, 3).toUpperCase()}</small>
                      <Ring pct={k > today ? 0 : st.pct} label={parse(k).getDate()} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="titlebar"><div className="t"><small><span className={`syncdot ${dot}`} />{syncLine}</small>
              <h2>{view === "progress" ? "Progress" : view === "coach" ? "Coach" : "Your plan"}</h2></div></div>
          )}
        </div>
      </header>

      <main>
        <div className="wrap stack">
          {!days ? <p className="note">Loading your log…</p>
            : view === "today" ? <TodayView date={date} days={days} openCoach={() => go("coach")} />
            : view === "progress" ? <ProgressView days={days} today={today} openDay={open} />
            : view === "coach" ? <CoachView days={days} today={today} />
            : <PlanView gotoWeekday={(wd) => { let k = today; for (let i = 0; i < 7; i++) { k = addDays(today, i); if (weekday(k) === wd) break; } open(k); }} />}
        </div>
      </main>

      <nav className="nav" aria-label="Sections">
        <div className="wrap">
          {VIEWS.map((v) => (
            <button key={v} type="button" aria-current={view === v ? "page" : undefined} onClick={() => go(v)}>{ICONS[v]}{LABEL[v]}</button>
          ))}
        </div>
      </nav>
    </RestTimerProvider>
  );
}
