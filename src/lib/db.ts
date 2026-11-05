import Dexie, { type Table } from "dexie";

/** A logged set: [weight kg | null, reps-or-seconds | null] */
export type SetRow = [number | null, number | null] | null;

/** Daily summary read from Health Connect (Android app). */
export interface HealthDay {
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  hrAvg?: number; hrMin?: number; hrMax?: number;
  restingHr?: number;
  sleepMin?: number;
  weight?: number;
  workouts?: { type: string; min: number; kcal?: number; source?: string }[];
}

export interface DayData {
  meals?: Record<string, boolean>;
  ex?: Record<string, boolean>;
  sets?: Record<string, SetRow[]>;
  water?: number;          // glasses of 500 ml
  steps?: boolean;
  sleep?: boolean;
  weight?: number;         // kg, morning
  waist?: number;          // inches, Sundays
  prep?: Record<string, boolean>;
  health?: HealthDay;
}

export interface DayRecord {
  date: string;            // YYYY-MM-DD (local)
  data: DayData;
  updatedAt: number;       // ms epoch, last local or remote change
  dirty: 0 | 1;            // 1 = not yet pushed to Supabase
}

class GymDB extends Dexie {
  days!: Table<DayRecord, string>;
  constructor() {
    super("gym-tracker");
    this.version(1).stores({ days: "date, updatedAt, dirty" });
  }
}

export const db = new GymDB();

let onLocalChange: (() => void) | null = null;
export const setLocalChangeListener = (fn: () => void) => { onLocalChange = fn; };

export async function updateDay(date: string, fn: (d: DayData) => DayData) {
  await db.transaction("rw", db.days, async () => {
    const cur = await db.days.get(date);
    const next = fn(structuredClone(cur?.data ?? {}));
    await db.days.put({ date, data: next, updatedAt: Date.now(), dirty: 1 });
  });
  onLocalChange?.();
}

export function hasContent(d: DayData | undefined) {
  if (!d) return false;
  if (typeof d.weight === "number" || typeof d.waist === "number" || (d.water ?? 0) > 0 || d.steps || d.sleep) return true;
  return [d.meals, d.ex, d.prep].some((o) => o && Object.values(o).some(Boolean)) ||
    Object.values(d.sets ?? {}).some((rows) => rows.some((r) => r && (r[0] !== null || r[1] !== null)));
}
