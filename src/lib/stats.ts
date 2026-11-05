import { PLAN, type Exercise } from "../data/plan";
import type { DayData, SetRow } from "./db";
import { weekday, weekNo } from "./dates";

export interface DayStats {
  pct: number; done: number; total: number;
  protein: number; kcal: number; proteinTarget: number; kcalTarget: number;
  exDone: number; exTotal: number;
}

export function dayStats(date: string, d: DayData = {}): DayStats {
  const P = PLAN[weekday(date)];
  const meals = d.meals ?? {}, ex = d.ex ?? {}, prep = d.prep ?? {};
  let done = 0, protein = 0, kcal = 0;
  P.meals.forEach((m, i) => { if (meals[i]) { done++; protein += m.protein; kcal += m.kcal; } });
  const exDone = P.ex.filter((e) => ex[e.id]).length;
  done += exDone;
  if ((d.water ?? 0) >= 7) done++;
  if (d.steps) done++;
  if (d.sleep) done++;
  const prepItems = P.prep ?? [];
  prepItems.forEach((_, i) => { if (prep[i]) done++; });
  const total = P.meals.length + P.ex.length + 3 + prepItems.length;
  return {
    pct: Math.round((done / total) * 100), done, total, protein, kcal,
    proteinTarget: P.meals.reduce((a, m) => a + m.protein, 0),
    kcalTarget: P.meals.reduce((a, m) => a + m.kcal, 0),
    exDone, exTotal: P.ex.length,
  };
}

/** Weeks 1–2 are light: 3 sets for the first lift, 2 for the rest. */
export function setCount(date: string, e: Exercise): number {
  if (e.log === "none" || !e.sets) return 0;
  const wn = weekNo(date);
  if (wn < 1 || wn > 2) return e.sets;
  const first = PLAN[weekday(date)].ex.find((x) => x.log !== "none");
  return first?.id === e.id ? Math.min(3, e.sets) : Math.min(2, e.sets);
}
export const isLightWeek = (date: string) => { const w = weekNo(date); return w >= 1 && w <= 2; };

export function topSet(rows: SetRow[] | undefined): [number, number] | null {
  let best: [number, number] | null = null;
  (rows ?? []).forEach((r) => {
    if (!r) return;
    const [w, n] = r;
    if (!w || !n || w <= 0 || n <= 0) return;
    if (!best || w > best[0] || (w === best[0] && n > best[1])) best = [w, n];
  });
  return best;
}
