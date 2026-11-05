import { useState } from "react";
import { PLAN } from "../data/plan";
import { db, type DayRecord } from "../lib/db";
import { SHORT_DAYS } from "../lib/dates";
import { readConfig, saveConfig, signIn, signOut, syncNow } from "../lib/sync";
import { useSync } from "../lib/store";

function SyncCard() {
  const s = useSync();
  const cfg = readConfig();
  const [url, setUrl] = useState(cfg?.url ?? "");
  const [key, setKey] = useState(cfg?.key ?? "");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <section className="card" aria-labelledby="sync"><h2 id="sync">Sync across devices <small>{s.state === "off" ? "off" : s.state === "synced" ? "on" : s.state}</small></h2>
      {s.state === "off" || !s.configured ? (
        <form className="form" onSubmit={(e) => { e.preventDefault(); if (url && key) saveConfig({ url: url.trim(), key: key.trim() }); }}>
          <p className="note">Your log is saved on this device. To see it on your phone and laptop, connect a free Supabase project (steps in the README).</p>
          <label htmlFor="sb-url">Project URL</label>
          <input id="sb-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoComplete="off" />
          <label htmlFor="sb-key">Anon public key</label>
          <input id="sb-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" autoComplete="off" />
          <button className="btn primary" type="submit">Connect</button>
        </form>
      ) : s.email ? (
        <div className="form">
          <p className="note">Signed in as <b>{s.email}</b>. {s.message}</p>
          <div className="actions">
            <button className="btn primary" type="button" onClick={() => syncNow()}>Sync now</button>
            <button className="btn" type="button" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={async (e) => { e.preventDefault(); setMsg("Sending…"); const err = await signIn(email.trim()); setMsg(err ?? "Check your email and open the link on this device."); }}>
          <p className="note">{s.state === "error" ? s.message : "Sign in with a one-time link. No password."}</p>
          <label htmlFor="sb-email">Email</label>
          <input id="sb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" />
          <div className="actions">
            <button className="btn primary" type="submit">Email me a sign-in link</button>
            <button className="btn ghost" type="button" onClick={() => saveConfig(null)}>Disconnect project</button>
          </div>
          {msg && <p className="note">{msg}</p>}
        </form>
      )}
      {s.email && s.state === "error" && <p className="note warn">{s.message}</p>}
    </section>
  );
}

function BackupCard() {
  const [msg, setMsg] = useState("");
  const exportData = async () => {
    const rows = await db.days.toArray();
    const blob = new Blob([JSON.stringify({ app: "gym-tracker", version: 1, days: rows }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `gym-log-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };
  const importData = async (file: File) => {
    try {
      const j = JSON.parse(await file.text());
      const rows: DayRecord[] = (j.days ?? []).filter((r: DayRecord) => r && typeof r.date === "string" && r.data);
      await db.days.bulkPut(rows.map((r) => ({ ...r, dirty: 1 as const })));
      setMsg(`Imported ${rows.length} days.`);
    } catch { setMsg("That file isn't a gym-tracker backup."); }
  };
  return (
    <section className="card"><h2>Backup</h2>
      <p className="note">Download your full log as a file, or restore one. Handy before switching phones.</p>
      <div className="actions">
        <button className="btn" type="button" onClick={exportData}>Download backup</button>
        <label className="btn">Restore backup<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} /></label>
      </div>
      {msg && <p className="note">{msg}</p>}
    </section>
  );
}

export function PlanView({ gotoWeekday }: { gotoWeekday: (wd: number) => void }) {
  return (
    <>
      <section className="card"><h2>Daily targets</h2>
        <table><tbody>
          <tr><td>Calories</td><td className="n">2,200–2,300 kcal</td></tr>
          <tr><td>Protein</td><td className="n">140–160 g</td></tr>
          <tr><td>Water · steps · sleep</td><td className="n">4 L · 8,000+ · 7–8 h</td></tr>
          <tr><td>Start → goal</td><td className="n">103 kg → 80–85 kg</td></tr>
          <tr><td>Milestones</td><td className="n">95 kg Feb · 90 kg Apr · 85 kg mid-2027</td></tr>
        </tbody></table>
      </section>

      <section className="card"><h2>Weekly split <small>tap to open that day</small></h2>
        <div className="split">
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
            const P = PLAN[wd];
            return (
              <button key={wd} type="button" onClick={() => gotoWeekday(wd)}>
                <b>{SHORT_DAYS[wd]}</b>
                <span>{P.title}<br /><small>{P.food} · {P.meals.reduce((a, m) => a + m.kcal, 0)} kcal · {P.meals.reduce((a, m) => a + m.protein, 0)} g protein</small></span>
                <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card"><h2>Training rules</h2><ol className="plain">
        <li>Warm up 8–10 min, plus 1–2 light sets of your first lift.</li>
        <li>Weeks 1–2: 2 sets each (3 for the first lift), 3 reps in the tank.</li>
        <li>After that, finish the last set 1–2 reps short of failure.</li>
        <li>Hit the top of the rep range on every set with clean form, then add the smallest step: 2.5 kg on a barbell, 1–2 kg on dumbbells.</li>
        <li>Rest 2–3 min on big lifts, 60–90 s on small ones. Use the Rest button.</li>
        <li>Cardio after weights, never before. Week 8 is a deload: half the sets.</li>
        <li>Sharp joint pain, not muscle burn: stop and ask your trainer.</li>
      </ol></section>

      <section className="card"><h2>Food rules</h2><ol className="plain">
        <li>Protein at every meal. Eat it first, then roti; half the plate sabzi or salad.</li>
        <li>3–4 tsp oil a day in total, measured with a spoon.</li>
        <li>No sugar in tea or coffee, max 2 teas. No cold drinks or packaged juice.</li>
        <li>PG breakfast: 3 idli or 2 plain dosa with sambar, plus 2 boiled eggs (non-veg day) or 200 g curd (veg day).</li>
        <li>One flex meal a week, usually Sunday lunch: 1 plate, no starters, drinks or dessert.</li>
        <li>Whey: 1 Amul sachet a day (25 g protein).</li>
      </ol></section>

      <section className="card"><h2>When to adjust</h2>
        <table><tbody>
          <tr><td>Weekly average drops less than 0.3 kg, 2 weeks running</td><td>1 roti less at dinner, or +2,000 steps</td></tr>
          <tr><td>Losing more than 1.2 kg a week after month 1</td><td>Add 1 roti or 20 g peanuts</td></tr>
          <tr><td>Strength falling for 2+ weeks</td><td>Fix sleep first, then protein</td></tr>
          <tr><td>Waist down, scale flat</td><td>Keep going: that's muscle gain</td></tr>
        </tbody></table>
      </section>

      <SyncCard />
      <BackupCard />

      <p className="credits">Exercise photos and how-to steps: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener noreferrer">free-exercise-db</a> (public domain). Muscle maps: react-body-highlighter (MIT). Videos play from YouTube; credit shown on each.</p>
    </>
  );
}
