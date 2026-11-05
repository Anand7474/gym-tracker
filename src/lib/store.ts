import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, useSyncExternalStore } from "react";
import { db, type DayData } from "./db";
import { getSync, subscribeSync } from "./sync";

/** All logged days, keyed by date. Re-renders whenever IndexedDB changes. */
export function useDays(): Record<string, DayData> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.days.toArray();
    const out: Record<string, DayData> = {};
    rows.forEach((r) => { out[r.date] = r.data; });
    return out;
  }, []);
}

let snap = getSync();
export function useSync() {
  return useSyncExternalStore(
    (cb) => subscribeSync(() => { snap = getSync(); cb(); }),
    () => snap,
  );
}

/** Re-render at midnight so "today" rolls over while the app stays open. */
export function useToday(todayKey: () => string) {
  const [t, setT] = useState(todayKey());
  useEffect(() => {
    const id = window.setInterval(() => { const n = todayKey(); setT((p) => (p === n ? p : n)); }, 30000);
    return () => window.clearInterval(id);
  }, [todayKey]);
  return t;
}
