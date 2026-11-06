/** Theme preference: follow the phone ("auto") or force light/dark. Saved per device. */
export type ThemeMode = "auto" | "light" | "dark";
const KEY = "gym-theme";

export function getTheme(): ThemeMode {
  try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; }
}

export function applyTheme(mode: ThemeMode = getTheme()) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", mode);
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#060a14" : "#eef1f6");
}

export function setTheme(mode: ThemeMode) {
  try { if (mode === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  applyTheme(mode);
}

export const nextTheme = (m: ThemeMode): ThemeMode => (m === "auto" ? "light" : m === "light" ? "dark" : "auto");

if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (getTheme() === "auto") applyTheme("auto"); });
}
