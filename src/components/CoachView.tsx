import { useMemo, useState } from "react";
import type { DayData } from "../lib/db";
import { coachReport, coachTips, type Tip } from "../lib/coach";
import { Icon, SecHead } from "./Icons";

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
    <section className="card sec coach" id="sec-coach" aria-labelledby="coach">
      <SecHead id="coach" icon={Icon.coach} title="Coach" sub="From your last 2 weeks of logs" meta={`${tips.length} tip${tips.length === 1 ? "" : "s"}`} />
      <TipList tips={tips.slice(0, 2)} />
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
      <section className="card sec coach"><SecHead icon={Icon.coach} title="This week's tips" sub="Based on weight, steps, sleep, meals and lifts" meta={tips.length} /><TipList tips={tips} /></section>
      <section className="card sec workout"><SecHead icon={Icon.prep} title="Coach report" sub="Last 14 days, ready to send to Claude" />
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
