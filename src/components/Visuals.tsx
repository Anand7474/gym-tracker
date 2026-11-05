import Model, { type IExerciseData, type Muscle } from "react-body-highlighter";
import { useEffect, useRef, useState } from "react";
import type { MuscleKey } from "../data/plan";

/* ---------- barbell progress: plates load as the day fills up ---------- */
const PLATES = [
  { c: "#d23b3b", h: 60 }, { c: "#2c6ae0", h: 55 }, { c: "#e2b12a", h: 49 }, { c: "#2e9b58", h: 42 }, { c: "#eef0f2", h: 34, s: 1 },
];
export function Barbell({ pct }: { pct: number }) {
  const k = Math.max(0, Math.min(5, Math.round(pct / 20)));
  const prev = useRef(k);
  const fresh = k > prev.current ? prev.current : 99;
  useEffect(() => { prev.current = k; }, [k]);
  const plate = (j: number, x: number) => {
    const p = PLATES[j];
    return <rect key={`${x}`} className={j >= fresh ? "plate new" : "plate"} x={x} y={33 - p.h / 2} width={10} height={p.h} rx={2}
      fill={p.c} stroke={p.s ? "var(--steel)" : undefined} strokeWidth={p.s ? 1 : undefined} />;
  };
  return (
    <svg className="barbell" viewBox="0 0 320 66" role="img" aria-label={`${pct}% of today done: ${k} of 5 plates loaded each side`}>
      <rect x={96} y={31} width={128} height={4} rx={2} fill="var(--steel)" />
      <rect x={10} y={29} width={80} height={8} rx={2} fill="var(--steel)" />
      <rect x={230} y={29} width={80} height={8} rx={2} fill="var(--steel)" />
      <rect x={86} y={24} width={10} height={18} rx={2} fill="var(--steel)" />
      <rect x={224} y={24} width={10} height={18} rx={2} fill="var(--steel)" />
      {Array.from({ length: k }, (_, j) => [plate(j, 74 - j * 12), plate(j, 236 + j * 12)])}
    </svg>
  );
}

export function Ring({ pct, label }: { pct: number; label: string | number }) {
  const r = 12, C = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 30 30" aria-hidden="true">
      <circle cx={15} cy={15} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
      {pct > 0 && <circle cx={15} cy={15} r={r} fill="none" stroke={pct >= 70 ? "var(--done)" : "var(--accent)"} strokeWidth={3}
        strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 15 15)" />}
      <text x={15} y={19} textAnchor="middle">{label}</text>
    </svg>
  );
}

/* ---------- anatomical muscle map ---------- */
const MUSCLES: Record<MuscleKey, Muscle[]> = {
  chest: ["chest"], delts: ["front-deltoids"], reardelts: ["back-deltoids"], triceps: ["triceps"], biceps: ["biceps"],
  forearms: ["forearm"], abs: ["abs", "obliques"], quads: ["quadriceps"], hams: ["hamstring"], glutes: ["gluteal"],
  calves: ["calves", "left-soleus", "right-soleus"], lats: ["upper-back"], traps: ["trapezius"], lowerback: ["lower-back"],
};
export const MUSCLE_LABEL: Record<MuscleKey, string> = {
  chest: "chest", delts: "front shoulders", reardelts: "rear shoulders", triceps: "triceps", biceps: "biceps", forearms: "forearms",
  abs: "core", quads: "quads", hams: "hamstrings", glutes: "glutes", calves: "calves", lats: "lats / upper back", traps: "traps", lowerback: "lower back",
};

export function MuscleMap({ pri, sec, counts }: { pri?: MuscleKey[]; sec?: MuscleKey[]; counts?: Partial<Record<MuscleKey, number>> }) {
  const data: IExerciseData[] = [];
  let colors = ["var(--accent-soft)", "var(--accent)"];
  if (counts) {
    (Object.keys(counts) as MuscleKey[]).forEach((m) => data.push({ name: m, muscles: MUSCLES[m], frequency: counts[m] }));
    colors = ["var(--heat1)", "var(--heat2)", "var(--heat3)", "var(--heat4)"];
  } else {
    if (sec?.length) data.push({ name: "Also works", muscles: sec.flatMap((m) => MUSCLES[m]), frequency: 1 });
    if (pri?.length) data.push({ name: "Main", muscles: pri.flatMap((m) => MUSCLES[m]), frequency: 2 });
  }
  const label = counts
    ? "Muscles trained this week"
    : `Main: ${(pri ?? []).map((m) => MUSCLE_LABEL[m]).join(", ") || "full body"}${sec?.length ? `. Also: ${sec.map((m) => MUSCLE_LABEL[m]).join(", ")}` : ""}`;
  return (
    <div className="musclemap" role="img" aria-label={label}>
      <Model type="anterior" data={data} bodyColor="var(--fig)" highlightedColors={colors} />
      <Model type="posterior" data={data} bodyColor="var(--fig)" highlightedColors={colors} />
    </div>
  );
}

/* ---------- two-frame photo loop (start ↔ end position) ---------- */
export function FrameLoop({ frames, alt }: { frames: string[]; alt: string }) {
  const [paused, setPaused] = useState(false);
  const base = import.meta.env.BASE_URL;
  if (!frames.length) return null;
  return (
    <button type="button" className={`frames${paused ? " paused" : ""}`} onClick={() => setPaused((p) => !p)}
      aria-label={`${alt}: start and end position. Tap to ${paused ? "play" : "pause"}.`}>
      {frames.map((f, i) => <img key={f} src={base + f} alt="" loading="lazy" decoding="async" className={`f${i}`} />)}
      <span className="frames-tag">{paused ? "Paused · tap to play" : "Start ↔ finish"}</span>
    </button>
  );
}
