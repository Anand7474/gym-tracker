import { ALL_EXERCISES, GOAL_WEIGHT, KEY_LIFTS, PLAN, START_DATE, START_WEIGHT } from "../data/plan";
import type { DayData } from "./db";
import { addDays, nice, weekNo, weekday } from "./dates";
import { dayStats, sleepDone, stepsDone, topSet } from "./stats";

export interface Tip { tone: "good" | "warn" | "info"; title: string; body: string }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (n: number) => Math.round(n * 10) / 10;

function window(days: Record<string, DayData>, today: string, from: number, to: number) {
  const keys: string[] = [];
  for (let i = from; i <= to; i++) { const k = addDays(today, -i); if (k >= START_DATE) keys.push(k); }
  return keys.map((k) => ({ k, d: days[k] ?? {} }));
}

/** Rule-based coaching from the last two weeks of logs and Health Connect data. */
export function coachTips(days: Record<string, DayData>, today: string): Tip[] {
  const tips: Tip[] = [];
  const last7 = window(days, today, 0, 6), prev7 = window(days, today, 7, 13);
  const past7 = window(days, today, 1, 7); // completed days, excluding today

  // Weight trend
  const w7 = last7.map((x) => x.d.weight).filter((v): v is number => typeof v === "number");
  const wp = prev7.map((x) => x.d.weight).filter((v): v is number => typeof v === "number");
  const a7 = avg(w7), ap = avg(wp);
  const weeksIn = weekNo(today);
  if (w7.length < 3) {
    tips.push({ tone: "info", title: "Weigh in every morning", body: `You logged weight on ${w7.length} of the last 7 days. Daily weigh-ins give a reliable weekly average, so the plan can adjust calories at the right time.` });
  } else if (a7 !== null && ap !== null && wp.length >= 3) {
    const drop = ap - a7;
    if (weeksIn > 2 && drop < 0.3) tips.push({ tone: "warn", title: `Weight down only ${r1(drop)} kg this week`, body: "If this repeats next week, drop 1 roti at dinner (about 100–150 kcal) or add 2,000 steps a day. Check oil is being measured with a spoon." });
    else if (weeksIn > 4 && drop > 1.2) tips.push({ tone: "warn", title: `Losing fast: ${r1(drop)} kg in a week`, body: "Above 1.2 kg a week risks losing muscle. Add 1 roti or 20 g peanuts a day and keep protein high." });
    else if (drop >= 0.3) tips.push({ tone: "good", title: `Down ${r1(drop)} kg on the weekly average`, body: `Average ${r1(a7)} kg vs ${r1(ap)} kg the week before. That's right on pace. ${r1(a7 - GOAL_WEIGHT)} kg to the ${GOAL_WEIGHT} kg goal.` });
  } else if (a7 !== null) {
    tips.push({ tone: "info", title: `Weekly average ${r1(a7)} kg`, body: `${r1(START_WEIGHT - a7)} kg down from the start. Next week's average will show the real trend.` });
  }

  // Steps
  const stepVals = past7.map((x) => x.d.health?.steps).filter((v): v is number => typeof v === "number");
  if (stepVals.length >= 3) {
    const s = Math.round(avg(stepVals)!);
    if (s < 6000) tips.push({ tone: "warn", title: `Steps averaging ${s.toLocaleString("en-IN")} a day`, body: "That's well under 8,000. A 20-minute walk after lunch and another after dinner adds about 4,000 steps and burns roughly 150–200 kcal." });
    else if (s < 8000) tips.push({ tone: "info", title: `Steps averaging ${s.toLocaleString("en-IN")}`, body: `About ${(8000 - s).toLocaleString("en-IN")} short of 8,000. One 15-minute walk closes the gap.` });
    else tips.push({ tone: "good", title: `Steps averaging ${s.toLocaleString("en-IN")}`, body: "Above the 8,000 target. Daily movement like this does as much for fat loss as the gym sessions." });
  } else {
    const stepDays = past7.filter((x) => stepsDone(x.d)).length;
    if (past7.length >= 3 && stepDays < past7.length / 2) tips.push({ tone: "info", title: `8,000 steps on ${stepDays} of ${past7.length} days`, body: "Walk at lunch or after dinner. Desk jobs need deliberate steps." });
  }

  // Sleep
  const sleepVals = past7.map((x) => x.d.health?.sleepMin).filter((v): v is number => typeof v === "number" && v > 0);
  if (sleepVals.length >= 3) {
    const h = avg(sleepVals)! / 60;
    if (h < 6.5) tips.push({ tone: "warn", title: `Sleeping ${r1(h)} h on average`, body: "Short sleep raises hunger and slows recovery. Aim to be in bed by 11 pm on gym nights; finish dinner by 10." });
    else if (h >= 7) tips.push({ tone: "good", title: `Sleep averaging ${r1(h)} h`, body: "Good recovery. Keep the 11–11:30 pm bedtime." });
  } else {
    const sl = past7.filter((x) => sleepDone(x.d)).length;
    if (past7.length >= 3 && sl < past7.length / 2) tips.push({ tone: "info", title: `7+ hours sleep on ${sl} of ${past7.length} nights`, body: "Recovery is where muscle is built. Try lights-out by 11:30 pm." });
  }

  // Protein from ticked meals
  const prot = past7.filter((x) => Object.values(x.d.meals ?? {}).some(Boolean)).map((x) => { const s = dayStats(x.k, x.d); return s.protein / s.proteinTarget; });
  if (prot.length >= 3) {
    const p = avg(prot)!;
    if (p < 0.8) tips.push({ tone: "warn", title: `Hitting ${Math.round(p * 100)}% of the protein target`, body: "Missed meals usually mean missed protein. If a meal gets skipped, at least have the whey shake or 3 boiled eggs / 200 g curd." });
    else if (p >= 0.95) tips.push({ tone: "good", title: "Protein on target", body: `Averaging ${Math.round(p * 100)}% of planned protein on logged days.` });
  }

  // Training consistency this week
  let planned = 0, done = 0;
  past7.forEach((x) => { const wd = weekday(x.k); if (wd === 0) return; planned++; const s = dayStats(x.k, x.d); if (s.exDone >= Math.ceil(s.exTotal / 2)) done++; });
  if (planned >= 3) {
    if (done / planned < 0.6) tips.push({ tone: "warn", title: `${done} of ${planned} gym sessions done`, body: "Consistency beats intensity. If evenings keep slipping, try a fixed 8 pm slot and pack gym clothes in the morning." });
    else if (done === planned) tips.push({ tone: "good", title: `All ${planned} sessions done`, body: "Perfect week of training. Keep adding a rep or a small weight jump where the log allows." });
  }

  // Resting heart rate trend
  const rhr7 = avg(last7.map((x) => x.d.health?.restingHr).filter((v): v is number => !!v));
  const rhrP = avg(prev7.map((x) => x.d.health?.restingHr).filter((v): v is number => !!v));
  if (rhr7 && rhrP && rhrP - rhr7 >= 2) tips.push({ tone: "good", title: `Resting heart rate down ${Math.round(rhrP - rhr7)} bpm`, body: `Now ${Math.round(rhr7)} bpm. A falling resting HR means your fitness is improving.` });
  if (rhr7 && rhrP && rhr7 - rhrP >= 5) tips.push({ tone: "warn", title: `Resting heart rate up ${Math.round(rhr7 - rhrP)} bpm`, body: "Often a sign of poor sleep, stress or under-recovery. Take Thursday easy and prioritise sleep." });

  // Strength
  KEY_LIFTS.forEach((id) => {
    const logs = Object.keys(days).filter((k) => k <= today).sort().map((k) => ({ k, top: topSet(days[k].sets?.[id]) })).filter((o) => o.top);
    if (logs.length >= 3) {
      const last3 = logs.slice(-3).map((o) => `${o.top![0]}x${o.top![1]}`);
      if (new Set(last3).size === 1) tips.push({ tone: "info", title: `${ALL_EXERCISES[id].name} stuck at ${last3[0].replace("x", " kg × ")}`, body: "Same top set 3 sessions running. Next time, aim for 1 extra rep on the first set, or drop 5% and build back up." });
    }
  });

  if (!tips.length) tips.push({ tone: "info", title: "Keep logging", body: "Tips get sharper once you have a few days of weight, meals, workouts, steps and sleep logged." });
  const order = { warn: 0, good: 1, info: 2 } as const;
  return tips.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** Plain-text summary to paste into a chat with Claude for a plan review. */
export function coachReport(days: Record<string, DayData>, today: string, n = 14): string {
  const rows: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    if (k < START_DATE) continue;
    const d = days[k] ?? {}, s = dayStats(k, d), h = d.health ?? {};
    const P = PLAN[weekday(k)];
    rows.push([
      nice(k), P.title, `${s.pct}%`, `meals ${Object.values(d.meals ?? {}).filter(Boolean).length}/${P.meals.length}`,
      `protein ${s.protein}/${s.proteinTarget}g`, `ex ${s.exDone}/${s.exTotal}`,
      d.weight != null ? `wt ${d.weight}` : "", d.waist != null ? `waist ${d.waist}in` : "",
      h.steps != null ? `steps ${h.steps}` : stepsDone(d) ? "steps ✓" : "",
      h.sleepMin != null ? `sleep ${r1(h.sleepMin / 60)}h` : sleepDone(d) ? "sleep ✓" : "",
      h.restingHr ? `RHR ${h.restingHr}` : "", h.activeKcal ? `active ${h.activeKcal}kcal` : "",
      `water ${((d.water ?? 0) * 0.5).toFixed(1)}L`,
    ].filter(Boolean).join(" | "));
  }
  const lifts = KEY_LIFTS.map((id) => {
    const logs = Object.keys(days).sort().map((k) => ({ k, top: topSet(days[k].sets?.[id]) })).filter((o) => o.top);
    if (!logs.length) return "";
    const f = logs[0], l = logs[logs.length - 1];
    return `${ALL_EXERCISES[id].name}: ${f.top![0]}x${f.top![1]} (${nice(f.k)}) → ${l.top![0]}x${l.top![1]} (${nice(l.k)})`;
  }).filter(Boolean);
  const tips = coachTips(days, today).map((t) => `- ${t.title}`);
  return [
    `Gym Tracker report, last ${n} days to ${nice(today)} (week ${weekNo(today)})`,
    `Plan: fat loss + muscle. 183 cm, start ${START_WEIGHT} kg, goal ${GOAL_WEIGHT} kg. Target 2,200–2,300 kcal, 140–160 g protein, 8k steps, 7 h sleep.`,
    "",
    "Daily log:",
    ...rows,
    "",
    lifts.length ? "Main lifts (best set, first → latest):" : "No lifts logged yet.",
    ...lifts,
    "",
    "App's own flags:",
    ...tips,
    "",
    "Please review my progress and tell me what to adjust in diet and training.",
  ].join("\n");
}
