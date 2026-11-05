import { useEffect, useState } from "react";
import { addDays, mondayOf, nice, parse, SHORT_DAYS, todayKey, weekday } from "./lib/dates";
import { dayStats } from "./lib/stats";
import { useDays, useSync, useToday } from "./lib/store";
import { Ring } from "./components/Visuals";
import { RestTimerProvider } from "./components/Media";
import { TodayView } from "./components/TodayView";
import { ProgressView } from "./components/ProgressView";
import { PlanView } from "./components/PlanView";

type View = "today" | "progress" | "plan";
const viewFromHash = (): View => { const h = location.hash.slice(1); return h === "progress" || h === "plan" ? h : "today"; };

export default function App() {
  const days = useDays();
  const today = useToday(todayKey);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>(viewFromHash);
  const sync = useSync();

  useEffect(() => { const f = () => setView(viewFromHash()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = (v: View) => { history.replaceState(null, "", v === "today" ? location.pathname : `#${v}`); setView(v); window.scrollTo(0, 0); };
  const open = (k: string) => { setDate(k); go("today"); };

  const syncLine = sync.state === "off" ? "Saved on this device" : sync.state === "synced" ? "Synced" : sync.state === "syncing" ? "Syncing…"
    : sync.state === "signed-out" ? "Sync: sign in on the Plan tab" : "Sync problem: see the Plan tab";

  return (
    <RestTimerProvider>
      <header className="top">
        <div className="wrap">
          {view === "today" ? (
            <>
              <div className="datebar">
                <button type="button" className="iconbtn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
                <h2>{nice(date)}</h2>
                {date !== today && <button type="button" className="todaybtn" onClick={() => setDate(today)}>Today</button>}
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
                      <small>{SHORT_DAYS[weekday(k)].slice(0, 2)}</small>
                      <Ring pct={k > today ? 0 : st.pct} label={parse(k).getDate()} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : <div className="datebar"><h2>{view === "progress" ? "Progress" : "Your plan"}</h2></div>}
          <p className="savestate">{syncLine}</p>
        </div>
      </header>

      <main>
        <div className="wrap stack">
          {!days ? <p className="note">Loading your log…</p>
            : view === "today" ? <TodayView date={date} days={days} />
            : view === "progress" ? <ProgressView days={days} today={today} openDay={open} />
            : <PlanView gotoWeekday={(wd) => { let k = today; for (let i = 0; i < 7; i++) { k = addDays(today, i); if (weekday(k) === wd) break; } open(k); }} />}
        </div>
      </main>

      <nav className="nav" aria-label="Sections">
        <div className="wrap">
          <button type="button" aria-current={view === "today" ? "page" : undefined} onClick={() => go("today")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h2m12 0h2M6 8v8M18 8v8M8 10v4M16 10v4M8 12h8" /></svg>Today</button>
          <button type="button" aria-current={view === "progress" ? "page" : undefined} onClick={() => go("progress")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19h16M6 15l4-4 3 3 5-6" /></svg>Progress</button>
          <button type="button" aria-current={view === "plan" ? "page" : undefined} onClick={() => go("plan")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>Plan</button>
        </div>
      </nav>
    </RestTimerProvider>
  );
}
