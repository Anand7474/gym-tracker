import { Capacitor } from "@capacitor/core";
import { Health, type HealthDataType } from "@capgo/capacitor-health";
import { db, updateDay, type HealthDay } from "./db";
import { addDays, keyOf, todayKey } from "./dates";

/**
 * Health Connect bridge (Android app only). Reads what vivo Health, Fitbit and other apps
 * write into Health Connect and stores a per-day summary on each day record.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

const READ: HealthDataType[] = ["steps", "distance", "calories", "heartRate", "restingHeartRate", "sleep", "weight", "workouts"];
const WRITE: HealthDataType[] = ["weight"];
const CONNECTED_KEY = "gym-health-connected";

export type HealthState = { available: boolean; connected: boolean; reason?: string; lastSync?: number; error?: string };
let state: HealthState = { available: false, connected: localStorage.getItem(CONNECTED_KEY) === "1" };
const listeners = new Set<() => void>();
const emit = (s: Partial<HealthState>) => { state = { ...state, ...s }; listeners.forEach((l) => l()); };
export const subscribeHealth = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getHealth = () => state;

export async function initHealth() {
  if (!isNativeApp()) { emit({ available: false, reason: "web" }); return; }
  try {
    const a = await Health.isAvailable();
    emit({ available: a.available, reason: a.reason });
    if (a.available && state.connected) await syncHealth(14);
  } catch (e) { emit({ available: false, reason: String(e) }); }
}

export async function connectHealth() {
  try {
    const st = await Health.requestAuthorization({ read: READ, write: WRITE });
    const ok = st.readAuthorized.length > 0;
    localStorage.setItem(CONNECTED_KEY, ok ? "1" : "0");
    emit({ connected: ok, error: ok ? undefined : "No access was granted. Open Health Connect settings to allow it." });
    if (ok) await syncHealth(30);
  } catch (e) { emit({ error: e instanceof Error ? e.message : String(e) }); }
}
export const openHealthSettings = () => Health.openHealthConnectSettings().catch(() => {});

const dayKeyOfIso = (iso: string) => keyOf(new Date(iso));
const startOf = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

let syncing = false;
export async function syncHealth(days = 7) {
  if (!isNativeApp() || !state.connected || syncing) return;
  syncing = true;
  try {
    const end = new Date(startOf(addDays(todayKey(), 1)));
    const start = new Date(startOf(addDays(todayKey(), -(days - 1))));
    const range = { startDate: start.toISOString(), endDate: end.toISOString() };
    const out: Record<string, HealthDay> = {};
    const day = (k: string) => (out[k] ??= {});

    const agg = async (dataType: HealthDataType, aggregation: "sum" | "average", apply: (k: string, v: number, values: Record<string, number | undefined>) => void, multi?: ("average" | "min" | "max")[]) => {
      try {
        const { samples } = await Health.queryAggregated({ dataType, ...range, bucket: "day", aggregation: multi ?? aggregation });
        samples.forEach((s) => { if (s.value != null && !Number.isNaN(s.value)) apply(dayKeyOfIso(s.startDate), s.value, s.values as Record<string, number | undefined>); });
      } catch { /* type not granted or no data */ }
    };
    await agg("steps", "sum", (k, v) => { day(k).steps = Math.round(v); });
    await agg("calories", "sum", (k, v) => { day(k).activeKcal = Math.round(v); });
    await agg("distance", "sum", (k, v) => { day(k).distanceKm = Math.round(v / 10) / 100; });
    await agg("restingHeartRate", "average", (k, v) => { day(k).restingHr = Math.round(v); });
    await agg("heartRate", "average", (k, _v, vals) => {
      const d = day(k);
      if (vals.average) d.hrAvg = Math.round(vals.average);
      if (vals.min) d.hrMin = Math.round(vals.min);
      if (vals.max) d.hrMax = Math.round(vals.max);
    }, ["average", "min", "max"]);

    // Sleep: sessions are credited to the day you wake up; awake/in-bed segments are excluded.
    try {
      const { samples } = await Health.readSamples({ dataType: "sleep", startDate: new Date(start.getTime() - 864e5).toISOString(), endDate: range.endDate, limit: 500 });
      samples.forEach((s) => {
        if (s.sleepState === "awake" || s.sleepState === "inBed") return;
        const k = dayKeyOfIso(s.endDate);
        if (k < keyOf(start)) return;
        day(k).sleepMin = (day(k).sleepMin ?? 0) + Math.round(s.value);
      });
    } catch { /* ignore */ }

    try {
      const { samples } = await Health.readSamples({ dataType: "weight", ...range, limit: 200, ascending: true });
      samples.forEach((s) => { day(dayKeyOfIso(s.startDate)).weight = Math.round(s.value * 10) / 10; });
    } catch { /* ignore */ }

    try {
      const { workouts } = await Health.queryWorkouts({ ...range, limit: 100, ascending: true });
      workouts.forEach((w) => {
        const d = day(dayKeyOfIso(w.startDate));
        (d.workouts ??= []).push({ type: String(w.workoutType), min: Math.round(w.duration / 60), kcal: w.totalEnergyBurned ? Math.round(w.totalEnergyBurned) : undefined, source: w.sourceName });
      });
    } catch { /* ignore */ }

    for (const [k, h] of Object.entries(out)) {
      const cur = (await db.days.get(k))?.data;
      if (JSON.stringify(cur?.health ?? {}) === JSON.stringify(h)) continue;
      await updateDay(k, (d) => ({ ...d, health: h, ...(d.weight == null && h.weight != null ? { weight: h.weight } : {}) }));
    }
    emit({ lastSync: Date.now(), error: undefined });
  } catch (e) {
    emit({ error: e instanceof Error ? e.message : String(e) });
  } finally { syncing = false; }
}

/** Save a weight the user typed into Health Connect too (once per day, on blur). */
export async function pushWeight(kg: number, date: string) {
  if (!isNativeApp() || !state.connected) return;
  const now = new Date();
  const when = date === todayKey() ? now : new Date(startOf(date).getTime() + 7 * 3600e3);
  try { await Health.saveSample({ dataType: "weight", value: kg, startDate: when.toISOString(), endDate: when.toISOString() }); } catch { /* write not granted */ }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void syncHealth(3); });
}
