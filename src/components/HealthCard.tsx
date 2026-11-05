import type { HealthDay } from "../lib/db";
import { connectHealth, isNativeApp, openHealthSettings, syncHealth } from "../lib/health";
import { useHealthState } from "../lib/store";

function Mini({ pct, color }: { pct: number; color: string }) {
  const r = 15, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <svg className="mini" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx={19} cy={19} r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
      {p > 0 && <circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(C * p) / 100} ${C}`} transform="rotate(-90 19 19)" />}
    </svg>
  );
}
const ago = (t?: number) => { if (!t) return "not yet"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

export function HealthCard({ h, isToday }: { h?: HealthDay; isToday: boolean }) {
  const hs = useHealthState();

  if (!isNativeApp()) return null;
  if (!hs.available) {
    return (
      <section className="card"><h2>Health data</h2>
        <p className="note">Health Connect isn't available on this phone{hs.reason ? ` (${hs.reason})` : ""}.</p>
      </section>
    );
  }
  if (!hs.connected) {
    return (
      <section className="card"><h2>Connect your health data</h2>
        <p className="note" style={{ marginBottom: 12 }}>Pull steps, sleep, heart rate, calories and workouts from vivo Health and Fitbit through Health Connect. Steps and sleep then tick themselves.</p>
        <button className="btn primary wide" type="button" onClick={() => connectHealth()}>Connect Health Connect</button>
        {hs.error && <p className="note warn">{hs.error}</p>}
      </section>
    );
  }
  const steps = h?.steps ?? 0, sleepH = (h?.sleepMin ?? 0) / 60;
  return (
    <section className="card" aria-labelledby="hc"><h2 id="hc">Health <small>{isToday ? "today so far" : "that day"}</small></h2>
      <div className="hgrid">
        <div className="htile"><small>Steps</small><b className="num">{steps ? steps.toLocaleString("en-IN") : "—"}</b><Mini pct={(steps / 8000) * 100} color="var(--done)" /><span>Goal 8,000{h?.distanceKm ? ` · ${h.distanceKm} km` : ""}</span></div>
        <div className="htile"><small>Sleep</small><b className="num">{sleepH ? `${Math.floor(sleepH)}h ${Math.round((sleepH % 1) * 60)}m` : "—"}</b><Mini pct={(sleepH / 7) * 100} color="var(--accent)" /><span>Goal 7 h</span></div>
        <div className="htile"><small>Resting HR</small><b className="num">{h?.restingHr ?? h?.hrMin ?? "—"}</b><span>{h?.hrAvg ? `bpm · avg ${h.hrAvg}, max ${h.hrMax}` : "bpm"}</span></div>
        <div className="htile"><small>Active burn</small><b className="num">{h?.activeKcal ?? "—"}</b><span>kcal{h?.workouts?.length ? ` · ${h.workouts.length} workout${h.workouts.length > 1 ? "s" : ""}` : ""}</span></div>
      </div>
      <div className="hsrc">
        <span>Health Connect · synced {ago(hs.lastSync)}</span>
        <span className="actions">
          <button className="btn small" type="button" onClick={() => syncHealth(14)}>Sync</button>
          <button className="btn small ghost" type="button" onClick={() => openHealthSettings()}>Access</button>
        </span>
      </div>
      {hs.error && <p className="note warn">{hs.error}</p>}
    </section>
  );
}
