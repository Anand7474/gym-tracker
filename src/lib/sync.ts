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
export const getSync = () => ({ state, message, email: session?.user.email ?? null, configured: !!client });
const set = (s: SyncState, m = "") => { state = s; message = m; listeners.forEach((l) => l()); };

export function readConfig(): SyncConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
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
      if (!local || (remoteAt > local.updatedAt)) {
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
