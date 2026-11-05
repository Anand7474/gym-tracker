import { PLAN, START_WEIGHT } from "../data/plan";
import { updateDay, type DayData, type SetRow } from "../lib/db";
import { DAY_NAMES, todayKey, weekNo, weekday } from "../lib/dates";
import { dayStats, isLightWeek } from "../lib/stats";
import { Barbell } from "./Visuals";
import { CHECK, ExerciseCard } from "./ExerciseCard";

function lastSets(days: Record<string, DayData>, id: string, before: string) {
  const keys = Object.keys(days).filter((k) => k < before).sort().reverse();
  for (const k of keys) {
    const rows = days[k].sets?.[id];
    if (rows?.some((r) => r && (r[0] !== null || r[1] !== null))) return { date: k, rows: rows as SetRow[] };
  }
  return null;
}
const num = (v: string): number | undefined => { const t = v.trim().replace(",", "."); if (!t) return undefined; const n = Number(t); return Number.isFinite(n) ? n : undefined; };

export function TodayView({ date, days }: { date: string; days: Record<string, DayData> }) {
  const wd = weekday(date), P = PLAN[wd], D = days[date] ?? {}, st = dayStats(date, D);
  const wn = weekNo(date), water = D.water ?? 0;
  const set = (fn: (d: DayData) => DayData) => updateDay(date, fn);
  const delta = typeof D.weight === "number" ? D.weight - START_WEIGHT : null;

  return (
    <>
      <section className="hero" aria-label="Day summary">
        <div className="hero-top">
          <div>
            <p className="eyebrow">{wn >= 1 ? `Week ${wn} · ` : ""}{DAY_NAMES[wd]} · {P.food}</p>
            <h1>{P.title}</h1>
            <p className="focus">{P.focus}. {P.gym}</p>
          </div>
          <div className="pct"><b className="num">{st.pct}</b><small>% done</small></div>
        </div>
        <Barbell pct={st.pct} />
        <p className="barcap num">{st.done} of {st.total} ticked · {st.protein} / {st.proteinTarget} g protein · {st.kcal} / {st.kcalTarget} kcal</p>
      </section>

      {isLightWeek(date) && wd !== 0 && wd !== 4 && (
        <p className="banner"><b>Light weeks (1–2):</b> 2 sets of each exercise, 3 for the first lift. Leave 3 reps in the tank and focus on form.</p>
      )}
      {date > todayKey() && <p className="banner">This day hasn't come yet. You can preview the plan.</p>}

      <section className="card" aria-labelledby="hab">
        <h2 id="hab">Daily habits</h2>
        <div className="water">
          <div className="water-label">Water<small className="num">{(water * 0.5).toFixed(1)} / 4 L · tap a glass</small></div>
          <div className="glasses">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} type="button" className={`glass${i < water ? " on" : ""}`} aria-label={`${(i + 1) * 0.5} litres`}
                onClick={() => set((d) => ({ ...d, water: d.water === i + 1 ? i : i + 1 }))}>
                <svg viewBox="0 0 26 34" width="24" height="32"><path className="fill" d="M6 12h14l-1.6 18H7.6z" /><path className="cup" d="M4 4h18l-2.4 26H6.4z" /></svg>
              </button>
            ))}
          </div>
        </div>
        <div className="rows">
          {([["steps", "8,000+ steps", "Walk at lunch or after dinner"], ["sleep", "Slept 7+ hours", "In bed by 11:30 pm"]] as const).map(([k, t, s]) => (
            <button key={k} type="button" className={`row${D[k] ? " done" : ""}`} aria-pressed={!!D[k]} onClick={() => set((d) => ({ ...d, [k]: !d[k] }))}>
              <span className="box">{CHECK}</span><span className="row-main"><b>{t}</b><small>{s}</small></span>
            </button>
          ))}
          <div className="field">
            <label htmlFor="wt">Morning weight<small>{delta === null ? "After the toilet, before eating" : `${delta <= 0 ? "Down" : "Up"} ${Math.abs(delta).toFixed(1)} kg from the ${START_WEIGHT} kg start`}</small></label>
            <input id="wt" key={`wt-${date}`} inputMode="decimal" autoComplete="off" placeholder="kg" defaultValue={D.weight ?? ""}
              onChange={(e) => { const v = num(e.target.value); set((d) => { const n = { ...d }; if (v === undefined) delete n.weight; else n.weight = v; return n; }); }} />
            <span className="unit">kg</span>
          </div>
          {wd === 0 && (
            <div className="field">
              <label htmlFor="waist">Waist<small>Tape at the belly button, relaxed</small></label>
              <input id="waist" key={`waist-${date}`} inputMode="decimal" autoComplete="off" placeholder="in" defaultValue={D.waist ?? ""}
                onChange={(e) => { const v = num(e.target.value); set((d) => { const n = { ...d }; if (v === undefined) delete n.waist; else n.waist = v; return n; }); }} />
              <span className="unit">in</span>
            </div>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="mls">
        <h2 id="mls">Meals <small className="num">{st.kcalTarget} kcal · {st.proteinTarget} g protein</small></h2>
        <div className="rows">
          {P.meals.map((m, i) => {
            const on = !!D.meals?.[i];
            return (
              <button key={i} type="button" className={`row${on ? " done" : ""}`} aria-pressed={on}
                onClick={() => set((d) => ({ ...d, meals: { ...d.meals, [i]: !d.meals?.[i] } }))}>
                <span className="box">{CHECK}</span>
                <span className="row-main"><span className="time">{m.time}</span><b>{m.name}</b><small>{m.detail}</small></span>
                <span className="row-num num">{m.protein} g<small>{m.kcal} kcal</small></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="wo">
        <h2 id="wo">{wd === 0 ? "Activity" : "Workout"} <small>{st.exDone} / {st.exTotal} done</small></h2>
        <p className="legend"><span><i style={{ background: "var(--accent)" }} />Main muscle</span><span><i style={{ background: "var(--accent-soft)" }} />Also works</span><span>Tap a photo to pause it</span></p>
        <div className="stack">
          {P.ex.map((e, i) => <ExerciseCard key={`${date}-${e.id}`} e={e} index={i} date={date} day={D} prev={lastSets(days, e.id, date)} />)}
        </div>
      </section>

      {P.prep && (
        <section className="card" aria-labelledby="prp">
          <h2 id="prp">Sunday prep</h2>
          <div className="rows">
            {P.prep.map((t, i) => {
              const on = !!D.prep?.[i];
              return (
                <button key={i} type="button" className={`row${on ? " done" : ""}`} aria-pressed={on}
                  onClick={() => set((d) => ({ ...d, prep: { ...d.prep, [i]: !d.prep?.[i] } }))}>
                  <span className="box">{CHECK}</span><span className="row-main"><b>{t}</b></span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
