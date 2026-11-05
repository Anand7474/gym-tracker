import { PLAN, START_WEIGHT } from "../data/plan";
import { updateDay, type DayData, type SetRow } from "../lib/db";
import { DAY_NAMES, todayKey, weekNo, weekday } from "../lib/dates";
import { dayStats, isLightWeek, sleepDone, stepsDone } from "../lib/stats";
import { pushWeight } from "../lib/health";
import { Barbell } from "./Visuals";
import { CHECK, ExerciseCard } from "./ExerciseCard";
import { HealthCard } from "./HealthCard";
import { CoachMini } from "./CoachView";

function lastSets(days: Record<string, DayData>, id: string, before: string) {
  const keys = Object.keys(days).filter((k) => k < before).sort().reverse();
  for (const k of keys) {
    const rows = days[k].sets?.[id];
    if (rows?.some((r) => r && (r[0] !== null || r[1] !== null))) return { date: k, rows: rows as SetRow[] };
  }
  return null;
}
const num = (v: string): number | undefined => { const t = v.trim().replace(",", "."); if (!t) return undefined; const n = Number(t); return Number.isFinite(n) ? n : undefined; };

export function TodayView({ date, days, openCoach }: { date: string; days: Record<string, DayData>; openCoach: () => void }) {
  const wd = weekday(date), P = PLAN[wd], D = days[date] ?? {}, st = dayStats(date, D);
  const wn = weekNo(date), water = D.water ?? 0, today = todayKey();
  const set = (fn: (d: DayData) => DayData) => updateDay(date, fn);
  const delta = typeof D.weight === "number" ? D.weight - START_WEIGHT : null;
  const habits = [
    { k: "steps" as const, t: "8,000+ steps", s: D.health?.steps != null ? `${D.health.steps.toLocaleString("en-IN")} steps from Health Connect` : "Walk at lunch or after dinner", auto: !D.steps && stepsDone(D) },
    { k: "sleep" as const, t: "Slept 7+ hours", s: D.health?.sleepMin ? `${(D.health.sleepMin / 60).toFixed(1)} h from Health Connect` : "In bed by 11:30 pm", auto: !D.sleep && sleepDone(D) },
  ];

  return (
    <>
      <section className="hero fade-in" aria-label="Day summary">
        <div className="chips">
          {wn >= 1 && <span className="chip">Week {wn}</span>}
          <span className={`chip ${P.food === "Veg" ? "veg" : "nonveg"}`}>{P.food}</span>
          <span className="chip">{P.gym.replace("Gym ", "")}</span>
        </div>
        <div className="hero-top">
          <div>
            <h1>{P.title}</h1>
            <p className="focus">{DAY_NAMES[wd]} · {P.focus}</p>
          </div>
          <div className="pct"><b className="num">{st.pct}</b><small>% done</small></div>
        </div>
        <Barbell pct={st.pct} />
        <div className="meters">
          <div className="meter"><small><span>Protein</span><b className="num">{st.protein} / {st.proteinTarget} g</b></small><div className="bar"><i style={{ width: `${Math.min(100, (st.protein / st.proteinTarget) * 100)}%` }} /></div></div>
          <div className="meter"><small><span>Calories</span><b className="num">{st.kcal} / {st.kcalTarget}</b></small><div className="bar blue"><i style={{ width: `${Math.min(100, (st.kcal / st.kcalTarget) * 100)}%` }} /></div></div>
        </div>
      </section>

      {isLightWeek(date) && wd !== 0 && wd !== 4 && (
        <p className="banner"><b>Light weeks (1–2):</b> 2 sets of each exercise, 3 for the first lift. Leave 3 reps in the tank and focus on form.</p>
      )}
      {date > today && <p className="banner">This day hasn't come yet. You can preview the plan.</p>}

      {date === today && <CoachMini days={days} today={today} open={openCoach} />}
      <HealthCard h={D.health} isToday={date === today} />

      <section className="card" aria-labelledby="hab">
        <h2 id="hab">Daily habits <small>{(stepsDone(D) ? 1 : 0) + (sleepDone(D) ? 1 : 0) + (water >= 7 ? 1 : 0)} / 3</small></h2>
        <div className="water">
          <div className="water-label">Water<small className="num">{(water * 0.5).toFixed(1)} / 4 L · tap a glass</small></div>
          <div className="glasses">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} type="button" className={`glass${i < water ? " on" : ""}`} aria-label={`${(i + 1) * 0.5} litres`}
                onClick={() => set((d) => ({ ...d, water: d.water === i + 1 ? i : i + 1 }))}>
                <svg viewBox="0 0 26 34" width="26" height="34"><path className="fill" d="M6 12h14l-1.6 18H7.6z" /><path className="cup" d="M4 4h18l-2.4 26H6.4z" /></svg>
              </button>
            ))}
          </div>
        </div>
        <div className="rows">
          {habits.map(({ k, t, s, auto }) => {
            const on = k === "steps" ? stepsDone(D) : sleepDone(D);
            return (
              <button key={k} type="button" className={`row${on ? " done" : ""}`} aria-pressed={on} onClick={() => set((d) => ({ ...d, [k]: !d[k] }))}>
                <span className="box">{CHECK}</span><span className="row-main"><b>{t}</b><small>{s}</small></span>
                {auto && <span className="auto">AUTO</span>}
              </button>
            );
          })}
          <div className="field">
            <label htmlFor="wt">Morning weight<small>{delta === null ? "After the toilet, before eating" : `${delta <= 0 ? "Down" : "Up"} ${Math.abs(delta).toFixed(1)} kg from the ${START_WEIGHT} kg start`}</small></label>
            <input id="wt" key={`wt-${date}-${D.health?.weight ?? ""}`} inputMode="decimal" autoComplete="off" placeholder="kg" defaultValue={D.weight ?? ""}
              onChange={(e) => { const v = num(e.target.value); set((d) => { const n = { ...d }; if (v === undefined) delete n.weight; else n.weight = v; return n; }); }}
              onBlur={(e) => { const v = num(e.target.value); if (v && v > 30 && v < 250 && v !== D.health?.weight) void pushWeight(v, date); }} />
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

      <div className="sechead" style={{ margin: "6px 2px -4px" }}><h2 id="wo">{wd === 0 ? "Activity" : "Workout"}</h2><small>{st.exDone} / {st.exTotal} done</small></div>
      {P.ex.map((e, i) => <ExerciseCard key={`${date}-${e.id}`} e={e} index={i} total={P.ex.length} date={date} day={D} prev={lastSets(days, e.id, date)} />)}

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
