import { useMemo, useState } from "react";
import type { DayData } from "../lib/db";
import { coachReport, coachTips, type Tip } from "../lib/coach";

const ICON: Record<Tip["tone"], string> = { good: "✓", warn: "!", info: "i" };

export function TipList({ tips }: { tips: Tip[] }) {
  return <div>{tips.map((t, i) => (
    <div key={i} className={`tip ${t.tone}`}>
      <span className="ico" aria-hidden="true">{ICON[t.tone]}</span>
      <div><b>{t.title}</b><p>{t.body}</p></div>
    </div>
  ))}</div>;
}

export function CoachMini({ days, today, open }: { days: Record<string, DayData>; today: string; open: () => void }) {
  const tips = useMemo(() => coachTips(days, today), [days, today]);
  return (
    <section className="card" aria-labelledby="coach"><h2 id="coach">Coach <small>{tips.length} tip{tips.length === 1 ? "" : "s"}</small></h2>
      <TipList tips={tips.slice(0, 1)} />
      <button className="btn ghost wide" type="button" style={{ marginTop: 10 }} onClick={open}>See all tips and your coach report</button>
    </section>
  );
}

export function CoachView({ days, today }: { days: Record<string, DayData>; today: string }) {
  const tips = useMemo(() => coachTips(days, today), [days, today]);
  const report = useMemo(() => coachReport(days, today), [days, today]);
  const [msg, setMsg] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setMsg("Copied. Paste it into your chat with Claude."); }
    catch { setMsg("Couldn't copy automatically. Press and hold the text below to copy it."); }
  };
  const share = async () => {
    try { await navigator.share({ title: "Gym Tracker report", text: report }); } catch { /* cancelled */ }
  };
  return (
    <>
      <section className="card"><h2>This week's tips</h2><TipList tips={tips} /></section>
      <section className="card"><h2>Coach report <small>last 14 days</small></h2>
        <p className="note" style={{ marginBottom: 12 }}>A summary of your weight, meals, workouts, lifts, steps and sleep. Send it to Claude for a full review and plan changes.</p>
        <div className="actions" style={{ marginBottom: 12 }}>
          <button className="btn primary" type="button" onClick={copy}>Copy report</button>
          {"share" in navigator && <button className="btn" type="button" onClick={share}>Share…</button>}
        </div>
        {msg && <p className="note" style={{ marginBottom: 10 }}>{msg}</p>}
        <textarea className="report" readOnly value={report} aria-label="Coach report text" />
      </section>
    </>
  );
}
