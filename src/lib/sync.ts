import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { db, hasContent, setLocalChangeListener, type DayData } from "./db";

/**
 * Optional cloud sync. Data always lives in IndexedDB first; when a Supabase project is
 * configured and the user is signed in, days are pushed/pulled with last-write-wins per day.
 */
const CFG_KEY = "gym-sync-config";
export interface SyncConfig { url: string; key: string }
export type SyncState = "off" | "signed-out" | "syncing" | "synced" | "error";

type Listener = () => void;
const listeners = new Set<Listener>();
let state: SyncState = "off";
let message = "";
let session: Session | null = null;
let client: SupabaseClient | null = null;
let pushTimer: number | undefined;
let busy = false;

export const subscribeSync = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
type SyncSnap = { state: SyncState; message: string; email: string | null; configured: boolean };
let snap: SyncSnap = { state, message, email: null, configured: false };
export const getSync = () => snap;
const set = (s: SyncState, m = "") => {
  state = s; message = m;
  snap = { state, message, email: session?.user.email ?? null, configured: !!client };
  listeners.forEach((l) => l());
};

export function readConfig(): SyncConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  try { const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "null"); return c?.url && c?.key ? c : null; } catch { return null; }
}
export function saveConfig(c: SyncConfig | null) {
  if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY);
  init();
}

export function init() {
  const cfg = readConfig();
  client = null; session = null;
  if (!cfg) { set("off"); return; }
  try {
    client = createClient(cfg.url, cfg.key, { auth: { persistSession: true, detectSessionInUrl: true } });
  } catch (e) { set("error", "That Supabase URL doesn't look right."); return; }
  client.auth.getSession().then(({ data }) => {
    session = data.session;
    if (session) syncNow(); else set("signed-out");
  });
  client.auth.onAuthStateChange((_ev, s) => {
    const was = session?.user.id; session = s;
    if (s && s.user.id !== was) syncNow();
    if (!s) set("signed-out");
  });
}

/** Email + password works the same in the browser and in the Android app (no redirect links). */
export async function signIn(email: string, password: string) {
  if (!client) return "Add your Supabase details first.";
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}
export async function signUp(email: string, password: string) {
  if (!client) return "Add your Supabase details first.";
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: "https://anand7474.github.io/gym-tracker/" } });
  if (error) return error.message;
  return data.session ? null : "Account created. Open the confirmation email, tap the link, then sign in here.";
}
export async function signOut() { await client?.auth.signOut(); set("signed-out"); }

const orMap = (a?: Record<string, boolean>, b?: Record<string, boolean>) => {
  const out: Record<string, boolean> = { ...(b ?? {}) };
  Object.entries(a ?? {}).forEach(([k, v]) => { if (v) out[k] = true; });
  return out;
};

/** Field-level merge of two versions of the same day. Ticks are unioned, so nothing done on either device is lost. */
export function mergeDays(local: DayData, remote: DayData, localNewer: boolean): DayData {
  const pick = <T,>(a: T | undefined, b: T | undefined) => (a === undefined ? b : b === undefined ? a : localNewer ? a : b);
  const sets: DayData["sets"] = { ...(remote.sets ?? {}) };
  Object.entries(local.sets ?? {}).forEach(([id, rows]) => {
    const other = sets[id] ?? [];
    const len = Math.max(rows.length, other.length);
    sets[id] = Array.from({ length: len }, (_, i) => rows[i] ?? other[i] ?? null);
  });
  const ls = local.health?.steps ?? -1, rs = remote.health?.steps ?? -1;
  return {
    meals: orMap(local.meals, remote.meals),
    ex: orMap(local.ex, remote.ex),
    prep: orMap(local.prep, remote.prep),
    sets,
    water: Math.max(local.water ?? 0, remote.water ?? 0) || undefined,
    steps: local.steps || remote.steps || undefined,
    sleep: local.sleep || remote.sleep || undefined,
    weight: pick(local.weight, remote.weight),
    waist: pick(local.waist, remote.waist),
    health: ls >= rs ? (local.health ?? remote.health) : remote.health,
  };
}

export async function syncNow() {
  if (!client || !session || busy) return;
  busy = true; set("syncing");
  try {
    // pull
    const { data: rows, error } = await client.from("day_logs").select("date,data,updated_at");
    if (error) throw error;
    for (const r of rows ?? []) {
      const remoteAt = Date.parse(r.updated_at as string);
      const local = await db.days.get(r.date as string);
      if (!local) {
        await db.days.put({ date: r.date as string, data: r.data as DayData, updatedAt: remoteAt, dirty: 0 });
      } else if (local.dirty) {
        // Both sides changed this day: merge instead of letting one overwrite the other.
        const merged = mergeDays(local.data, r.data as DayData, local.updatedAt >= remoteAt);
        await db.days.put({ date: local.date, data: merged, updatedAt: Math.max(Date.now(), remoteAt + 1), dirty: 1 });
      } else if (remoteAt > local.updatedAt) {
        await db.days.put({ date: r.date as string, data: r.data as DayData, updatedAt: remoteAt, dirty: 0 });
      }
    }
    // push
    const dirty = await db.days.where("dirty").equals(1).toArray();
    const toPush = dirty.filter((d) => hasContent(d.data) || (rows ?? []).some((r) => r.date === d.date));
    if (toPush.length) {
      const { error: upErr } = await client.from("day_logs").upsert(
        toPush.map((d) => ({ user_id: session!.user.id, date: d.date, data: d.data, updated_at: new Date(d.updatedAt).toISOString() })),
        { onConflict: "user_id,date" });
      if (upErr) throw upErr;
    }
    for (const d of dirty) {
      const now = await db.days.get(d.date);
      if (now && now.updatedAt === d.updatedAt) await db.days.update(d.date, { dirty: 0 });
    }
    set("synced", `Last synced ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    set("error", /relation|does not exist/i.test(msg) ? "Run supabase/schema.sql in your Supabase SQL editor first." : msg);
  } finally { busy = false; }
}

setLocalChangeListener(() => {
  if (!client || !session) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(syncNow, 1500);
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.setInterval(() => { if (document.visibilityState === "visible") syncNow(); }, 120000);
