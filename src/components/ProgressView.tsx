import { ALL_EXERCISES, GOAL_WEIGHT, KEY_LIFTS, PLAN, START_DATE, START_WEIGHT, type MuscleKey } from "../data/plan";
import type { DayData } from "../lib/db";
import { MONTHS, addDays, mondayOf, nice, parse, weekNo, weekday } from "../lib/dates";
import { dayStats, topSet } from "../lib/stats";
import { MuscleMap } from "./Visuals";

function WeightChart({ points }: { points: { k: string; v: number }[] }) {
  const byDay: Record<string, number> = { [START_DATE]: START_WEIGHT };
  points.forEach((p) => { byDay[p.k] = p.v; });
  const arr = Object.entries(byDay).map(([k, v]) => ({ k, v })).sort((a, b) => (a.k < b.k ? -1 : 1));
  const W = 340, H = 180, L = 34, R = 14, T = 14, B = 26;
  const t0 = parse(arr[0].k).getTime();
  const t1 = Math.max(parse(arr[arr.length - 1].k).getTime(), t0 + 28 * 864e5);
  const vs = arr.map((p) => p.v).concat([GOAL_WEIGHT, START_WEIGHT]);
  const lo = Math.floor(Math.min(...vs) - 1), hi = Math.ceil(Math.max(...vs) + 1);
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const step = hi - lo > 12 ? 5 : 2;
  const grid: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) grid.push(v);
  const line = arr.map((p, i) => `${i ? "L" : "M"}${x(parse(p.k).getTime()).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const last = arr[arr.length - 1], lx = x(parse(last.k).getTime()), ly = y(last.v);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight from ${START_WEIGHT} kg to ${last.v} kg on ${nice(last.k)}. Goal ${GOAL_WEIGHT} kg.`}>
      {grid.map((v) => <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="lbl" x={L - 6} y={y(v) + 3.5} textAnchor="end">{v}</text></g>)}
      <line className="goal" x1={L} x2={W - R} y1={y(GOAL_WEIGHT)} y2={y(GOAL_WEIGHT)} />
      <text className="lbl" x={W - R} y={y(GOAL_WEIGHT) - 5} textAnchor="end" style={{ fill: "var(--done)" }}>Goal {GOAL_WEIGHT}</text>
      {arr.length > 1 && <>
        <path className="area" d={`${line} L${lx.toFixed(1)} ${H - B} L${x(t0).toFixed(1)} ${H - B} Z`} />
        <path className="line" d={line} />
      </>}
      {arr.slice(0, -1).map((p) => <circle key={p.k} className="dot" cx={x(parse(p.k).getTime())} cy={y(p.v)} r={2.5} />)}
      <circle className="end" cx={lx} cy={ly} r={4.5} />
      <text className="lbl" x={Math.min(lx + 8, W - R - 34)} y={ly - 8} style={{ fill: "var(--ink)" }}>{last.v} kg</text>
      {[t0, (t0 + t1) / 2, t1].map((t, i) => { const d = new Date(t); return <text key={i} className="lbl" x={x(t)} y={H - 8} textAnchor={(["start", "middle", "end"] as const)[i]}>{d.getDate()} {MONTHS[d.getMonth()]}</text>; })}
    </svg>
  );
}

export function ProgressView({ days, today, openDay }: { days: Record<string, DayData>; today: string; openDay: (k: string) => void }) {
  const weights = Object.keys(days).filter((k) => typeof days[k].weight === "number").sort().map((k) => ({ k, v: days[k].weight as number }));
  const latest = weights.length ? weights[weights.length - 1].v : null;

  let streak = 0, k = today;
  if (dayStats(k, days[k]).pct < 70) k = addDays(k, -1);
  while (k >= START_DATE && dayStats(k, days[k]).pct >= 70) { streak++; k = addDays(k, -1); }

  const mon = mondayOf(today);
  let trainDone = 0, trainTotal = 0, sum = 0, cnt = 0;
  const counts: Partial<Record<MuscleKey, number>> = {};
  for (let i = 0; i < 7; i++) {
    const dk = addDays(mon, i);
    if (dk > today || dk < START_DATE) continue;
    const s = dayStats(dk, days[dk]); sum += s.pct; cnt++;
    if (weekday(dk) !== 0) { trainTotal++; if (s.exDone >= Math.ceil(s.exTotal / 2)) trainDone++; }
    PLAN[weekday(dk)].ex.forEach((e) => {
      if (!days[dk]?.ex?.[e.id]) return;
      e.pri.forEach((m) => { counts[m] = (counts[m] ?? 0) + 2; });
      e.sec.forEach((m) => { counts[m] = (counts[m] ?? 0) + 1; });
    });
  }

  const weeks: string[] = [];
  for (let m = mondayOf(today); m >= mondayOf(START_DATE) && weeks.length < 8; m = addDays(m, -7)) weeks.push(m);

  const lifts = KEY_LIFTS.map((id) => {
    const logs = Object.keys(days).sort().map((dk) => ({ dk, top: topSet(days[dk].sets?.[id]) })).filter((o) => o.top);
    return logs.length ? { id, first: logs[0], last: logs[logs.length - 1] } : null;
  }).filter(Boolean) as { id: string; first: { dk: string; top: [number, number] }; last: { dk: string; top: [number, number] } }[];

  const waists = Object.keys(days).filter((dk) => typeof days[dk].waist === "number").sort().reverse();

  return (
    <>
      <div className="tiles">
        <div className="tile"><small>Weight</small><b className="num">{latest ?? "—"}</b> <span>{latest !== null ? `kg · ${latest - START_WEIGHT <= 0 ? "−" : "+"}${Math.abs(latest - START_WEIGHT).toFixed(1)} from start` : "log it on Today"}</span></div>
        <div className="tile"><small>Streak</small><b className="num">{streak}</b> <span>day{streak === 1 ? "" : "s"} at 70%+</span></div>
        <div className="tile"><small>This week</small><b className="num">{trainDone}/{trainTotal}</b> <span>gym sessions done</span></div>
        <div className="tile"><small>Avg this week</small><b className="num">{cnt ? Math.round(sum / cnt) : 0}%</b> <span>of daily ticks</span></div>
      </div>

      <section className="card"><h2>Weight trend <small>Goal {GOAL_WEIGHT} kg</small></h2>
        <WeightChart points={weights} />
        <p className="note">Judge the weekly trend, not single days. Expect about 0.5–0.8 kg a week after the first 2 weeks.</p>
      </section>

      <section className="card"><h2>Muscles this week <small>darker = more work</small></h2>
        {Object.keys(counts).length ? <MuscleMap counts={counts} /> : <p className="note">Tick exercises on Today and the muscles you trained light up here.</p>}
      </section>

      <section className="card"><h2>Consistency <small>tap a day to open it</small></h2>
        <div className="heat">
          <span />{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i} className="h">{x}</span>)}
          {weeks.map((m) => [
            <span key={m} className="wk">W{weekNo(m)}</span>,
            ...Array.from({ length: 7 }, (_, i) => {
              const dk = addDays(m, i);
              if (dk > today || dk < START_DATE) return <span key={dk} className="cell future" aria-hidden="true" />;
              const p = dayStats(dk, days[dk]).pct;
              const c = p >= 70 ? "c3" : p >= 40 ? "c2" : p > 0 ? "c1" : "";
              return <button key={dk} type="button" className={`cell ${c}`} aria-label={`${nice(dk)}: ${p}%`} onClick={() => openDay(dk)} />;
            }),
          ])}
        </div>
        <p className="legend"><span><i style={{ background: "var(--line)" }} />0%</span><span><i style={{ background: "var(--accent-soft)" }} />under 40%</span><span><i style={{ background: "var(--accent)" }} />40–69%</span><span><i style={{ background: "var(--done)" }} />70%+</span></p>
      </section>

      <section className="card"><h2>Strength <small>best set, kg × reps</small></h2>
        {lifts.length ? (
          <table><thead><tr><th>Lift</th><th>First</th><th>Latest</th></tr></thead>
            <tbody>{lifts.map((l) => (
              <tr key={l.id}><td>{ALL_EXERCISES[l.id].name}</td><td className="n">{l.first.top[0]}×{l.first.top[1]}</td>
                <td className="n">{l.last.top[0]}×{l.last.top[1]}<br /><small className="muted">{nice(l.last.dk)}</small></td></tr>
            ))}</tbody></table>
        ) : <p className="note">Log your sets on Today and your main lifts show up here. Going up while the scale goes down means you're keeping muscle.</p>}
      </section>

      <section className="card"><h2>Waist <small>every Sunday</small></h2>
        {waists.length ? (
          <table><thead><tr><th>Date</th><th>Waist</th></tr></thead>
            <tbody>{waists.map((dk) => <tr key={dk}><td>{nice(dk)}</td><td className="n">{days[dk].waist} in</td></tr>)}</tbody></table>
        ) : <p className="note">Measure on Sundays. Under 36 in is the first milestone; 33–34 in is the finish line.</p>}
      </section>
    </>
  );
}
