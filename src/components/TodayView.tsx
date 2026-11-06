import type React from "react";
import { Fragment, type ReactNode } from "react";
import { PLAN, START_WEIGHT } from "../data/plan";
import { updateDay, type DayData, type SetRow } from "../lib/db";
import { DAY_NAMES, todayKey, weekNo, weekday } from "../lib/dates";
import { dayStats, isLightWeek, sleepDone, stepsDone } from "../lib/stats";
import { isNativeApp, pushWeight } from "../lib/health";
import { Barbell } from "./Visuals";
import { CHECK, ExerciseCard } from "./ExerciseCard";
import { HealthCard } from "./HealthCard";
import { CoachMini } from "./CoachView";
import { Icon, SecHead } from "./Icons";

type SecKey = "health" | "habits" | "meals" | "workout" | "prep" | "coach";
const JUMP: Record<SecKey, { label: string; color: string; icon: ReactNode }> = {
  health: { label: "Health", color: "var(--c-health)", icon: Icon.health },
  habits: { label: "Habits", color: "var(--c-habits)", icon: Icon.habits },
  meals: { label: "Meals", color: "var(--c-meals)", icon: Icon.meals },
  workout: { label: "Workout", color: "var(--c-workout)", icon: Icon.workout },
  prep: { label: "Prep", color: "var(--c-prep)", icon: Icon.prep },
  coach: { label: "Coach", color: "var(--c-coach)", icon: Icon.coach },
};

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


  // Most-needed first: what matters at this time of day, finished sections sink to the bottom.
  const hour = new Date().getHours();
  const isToday = date === today;
  const base: SecKey[] = !isToday ? ["workout", "meals", "habits", "prep", "health"]
    : wd === 0 ? (hour < 12 ? ["habits", "meals", "prep", "workout", "health", "coach"] : ["prep", "meals", "habits", "workout", "health", "coach"])
    : hour < 11 ? ["habits", "meals", "workout", "health", "coach"]
    : hour < 18 ? ["meals", "habits", "workout", "health", "coach"]
    : hour < 23 ? ["workout", "meals", "habits", "health", "coach"]
    : ["habits", "meals", "workout", "health", "coach"];
  const finished: Record<SecKey, boolean> = {
    habits: stepsDone(D) && sleepDone(D) && water >= 7 && D.weight != null,
    meals: P.meals.every((_, i) => D.meals?.[i]),
    workout: st.exDone === st.exTotal,
    prep: !P.prep || P.prep.every((_, i) => D.prep?.[i]),
    health: false, coach: false,
  };
  const order = base.filter((k) => k !== "prep" || P.prep).sort((a, b) => Number(finished[a]) - Number(finished[b]));

  const SECTIONS: Record<SecKey, ReactNode> = {
    health: <>
      <HealthCard h={D.health} isToday={date === today} />
      </>,
    habits: <>
      <section className="card sec habits" id="sec-habits" aria-labelledby="hab">
        <SecHead id="hab" icon={Icon.habits} title="Daily habits" sub="Water, steps, sleep, weight" meta={`${(stepsDone(D) ? 1 : 0) + (sleepDone(D) ? 1 : 0) + (water >= 7 ? 1 : 0)} / 3`} />
        <div className="waterbox">
          <div className="big"><b className="num">{(water * 0.5).toFixed(1)} L</b><span>of 4 L water</span><small>tap a glass</small></div>
          <div className="glasses">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} type="button" className={`glass${i < water ? " on" : ""}`} aria-label={`${(i + 1) * 0.5} litres`}
                onClick={() => set((d) => ({ ...d, water: d.water === i + 1 ? i : i + 1 }))}>
                <svg viewBox="0 0 26 34" width="26" height="34"><path className="fill" d="M6 12h14l-1.6 18H7.6z" /><path className="cup" d="M4 4h18l-2.4 26H6.4z" /></svg>
              </button>
            ))}
          </div>
        </div>
        <div className="htiles">
          {habits.map(({ k, t, s, auto }) => {
            const on = k === "steps" ? stepsDone(D) : sleepDone(D);
            return (
              <button key={k} type="button" className={`hbtn${on ? " done" : ""}`} aria-pressed={on} onClick={() => set((d) => ({ ...d, [k]: !d[k] }))}>
                <span className="hi">{k === "steps" ? Icon.steps : Icon.sleep}</span>
                <span className="box">{CHECK}</span>
                {auto && <span className="auto">AUTO</span>}
                <b>{t}</b><small>{s}</small>
              </button>
            );
          })}
        </div>
        <div className="field weightbox">
          <label htmlFor="wt">Morning weight<small>{delta === null ? "After the toilet, before eating" : `${delta <= 0 ? "Down" : "Up"} ${Math.abs(delta).toFixed(1)} kg from the ${START_WEIGHT} kg start`}</small></label>
          <input id="wt" key={`wt-${date}-${D.health?.weight ?? ""}`} inputMode="decimal" autoComplete="off" placeholder="kg" defaultValue={D.weight ?? ""}
            onChange={(e) => { const v = num(e.target.value); set((d) => { const n = { ...d }; if (v === undefined) delete n.weight; else n.weight = v; return n; }); }}
            onBlur={(e) => { const v = num(e.target.value); if (v && v > 30 && v < 250 && v !== D.health?.weight) void pushWeight(v, date); }} />
          <span className="unit">kg</span>
        </div>
        {wd === 0 && (
          <div className="field weightbox">
            <label htmlFor="waist">Waist<small>Tape at the belly button, relaxed</small></label>
            <input id="waist" key={`waist-${date}`} inputMode="decimal" autoComplete="off" placeholder="in" defaultValue={D.waist ?? ""}
              onChange={(e) => { const v = num(e.target.value); set((d) => { const n = { ...d }; if (v === undefined) delete n.waist; else n.waist = v; return n; }); }} />
            <span className="unit">in</span>
          </div>
        )}
      </section>
      </>,
    meals: <>
      <section className="card sec meals" id="sec-meals" aria-labelledby="mls">
        <SecHead id="mls" icon={Icon.meals} title="Meals" sub={`${st.kcalTarget} kcal · ${st.proteinTarget} g protein planned`} meta={`${P.meals.filter((_, i) => D.meals?.[i]).length} / ${P.meals.length}`} />
        <div className="timeline">
          {P.meals.map((m, i) => {
            const on = !!D.meals?.[i];
            const [clock, ampm] = m.time.includes(" ") && /\d/.test(m.time) ? m.time.split(" ") : [m.time, ""];
            return (
              <button key={i} type="button" className={`meal${on ? " done" : ""}`} aria-pressed={on}
                onClick={() => set((d) => ({ ...d, meals: { ...d.meals, [i]: !d.meals?.[i] } }))}>
                <span className="when">{/\d/.test(clock) ? <span style={{ textAlign: "center" }}><b>{clock}</b><br /><small>{ampm.toUpperCase()}</small></span> : <small style={{ textAlign: "center", padding: "0 4px" }}>{m.time}</small>}</span>
                <span className="what"><b>{m.name}</b><small>{m.detail}</small><span className="mac"><span className="p">{m.protein} g protein</span><span>{m.kcal} kcal</span></span></span>
                <span className="box">{CHECK}</span>
              </button>
            );
          })}
        </div>
      </section>
      </>,
    workout: <>
      <section className="wbanner" id="sec-workout" aria-labelledby="wo">
        <SecHead id="wo" icon={Icon.workout} title={wd === 0 ? "Activity" : `Workout: ${P.title}`} sub={`${P.ex.length} ${wd === 0 ? "activities" : "exercises"} · ${P.gym}`} meta={`${st.exDone} / ${st.exTotal}`} />
        <div className="bar"><i style={{ width: `${(st.exDone / st.exTotal) * 100}%` }} /></div>
        {isLightWeek(date) && wd !== 0 && wd !== 4 && <p><b>Light weeks (1–2):</b> 2 sets each, 3 for the first lift. Leave 3 reps in the tank.</p>}
      </section>
      {P.ex.map((e, i) => <ExerciseCard key={`${date}-${e.id}`} e={e} index={i} total={P.ex.length} date={date} day={D} prev={lastSets(days, e.id, date)} />)}
      </>,
    prep: <>
      {P.prep && (
        <section className="card sec prep" id="sec-prep" aria-labelledby="prp">
          <SecHead id="prp" icon={Icon.prep} title="Sunday prep" sub="Set up the week" meta={`${P.prep.filter((_, i) => D.prep?.[i]).length} / ${P.prep.length}`} />
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
      </>,
    coach: <>
      {date === today && <CoachMini days={days} today={today} open={openCoach} />}
      </>,
  };

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

      {date > today && <p className="banner">This day hasn't come yet. You can preview the plan.</p>}

      <nav className="jump" aria-label="Jump to section">
        {order.filter((k) => k !== "health" || D.health || isNativeApp()).map((k) => {
          const c = JUMP[k];
          const n = k === "habits" ? `${(stepsDone(D) ? 1 : 0) + (sleepDone(D) ? 1 : 0) + (water >= 7 ? 1 : 0)}/3`
            : k === "meals" ? `${P.meals.filter((_, i) => D.meals?.[i]).length}/${P.meals.length}`
            : k === "workout" ? `${st.exDone}/${st.exTotal}`
            : k === "prep" && P.prep ? `${P.prep.filter((_, i) => D.prep?.[i]).length}/${P.prep.length}` : "";
          return (
            <a key={k} href={`#sec-${k}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: "smooth" }); }}
              style={{ ["--c" as string]: c.color } as React.CSSProperties}><i>{c.icon}</i>{k === "workout" && wd === 0 ? "Activity" : c.label}{n ? <b>{n}</b> : null}{finished[k] ? " ✓" : ""}</a>
          );
        })}
      </nav>

      {order.map((k) => <Fragment key={k}>{SECTIONS[k]}</Fragment>)}
    </>
  );
}
