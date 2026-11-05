import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { init as initSync } from "./lib/sync";
import { initHealth, isNativeApp } from "./lib/health";
import "./styles.css";

initSync();
void initHealth();

// The service worker is only for the website (offline + install). The Android app ships its files.
if (!isNativeApp()) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
