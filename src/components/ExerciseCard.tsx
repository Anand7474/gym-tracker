import { useState } from "react";
import type { Exercise } from "../data/plan";
import library from "../data/library.json";
import { VIDEOS } from "../data/videos";
import { updateDay, type DayData, type SetRow } from "../lib/db";
import { fmtRest, nice } from "../lib/dates";
import { setCount, isLightWeek } from "../lib/stats";
import { FrameLoop, MuscleMap, MUSCLE_LABEL } from "./Visuals";
import { useRestTimer, VideoPlayer } from "./Media";

type Lib = Record<string, { name: string; steps: string[]; frames: string[] }>;
const LIB = library as Lib;

export const CHECK = (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const num = (v: string): number | null => { const t = v.trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
const rowTxt = (r: SetRow, log: Exercise["log"]) => !r ? "–" : log === "wr" ? `${r[0] ?? "–"}×${r[1] ?? "–"}` : log === "s" ? `${r[1] ?? "–"} s` : `${r[1] ?? "–"}`;

type Panel = "muscles" | "video" | "howto";

export function ExerciseCard({ e, index, total, date, day, prev }: {
  e: Exercise; index: number; total: number; date: string; day: DayData; prev: { date: string; rows: SetRow[] } | null;
}) {
  const timer = useRestTimer();
  const [panel, setPanel] = useState<Panel>("muscles");
  const done = !!day.ex?.[e.id];
  const n = setCount(date, e);
  const lib = LIB[e.img];
  const rows = day.sets?.[e.id] ?? [];
  const light = isLightWeek(date) && e.log !== "none";
  const videos = VIDEOS[e.id] ?? VIDEOS[e.img];

  const toggle = () => updateDay(date, (d) => ({ ...d, ex: { ...d.ex, [e.id]: !d.ex?.[e.id] } }));

  const onSet = (i: number, f: 0 | 1, value: string, card: HTMLElement | null) => {
    const v = num(value);
    const allReps = card ? Array.from(card.querySelectorAll<HTMLInputElement>('input[data-f="1"]')).every((x) => x.value.trim() !== "") : false;
    updateDay(date, (d) => {
      const sets = { ...(d.sets ?? {}) };
      const arr = [...(sets[e.id] ?? [])];
      while (arr.length <= i) arr.push(null);
      const r: [number | null, number | null] = arr[i] ? [...arr[i]!] as [number | null, number | null] : [null, null];
      r[f] = v;
      arr[i] = r[0] === null && r[1] === null ? null : r;
      sets[e.id] = arr;
      const ex = allReps && !d.ex?.[e.id] ? { ...d.ex, [e.id]: true } : d.ex;
      return { ...d, sets, ex };
    });
  };

  return (
    <article className={`ex${done ? " done" : ""}`} id={`ex-${e.id}`}>
      <div className="media">
        {lib && <FrameLoop frames={lib.frames} alt={e.name} />}
        <span className="num-badge">{index + 1}</span>
        <span className="tag">{done ? "Done ✓" : "Tap photo to pause"}</span>
        <div className="over">
          <small>Exercise {index + 1} of {total}</small>
          <h3>{e.name}</h3>
        </div>
        <button type="button" className="tick" aria-pressed={done} aria-label={`Mark ${e.name} done`} onClick={toggle}>{CHECK}</button>
      </div>

      <div className="ex-inner">
        <div className="ex-chips">
          {e.log === "none" ? <span className="chip blue">{e.dur}</span>
            : <span className="chip blue num">{n} × {e.reps}{light ? " · light" : ""}</span>}
          {e.rest && <span className="chip num">Rest {fmtRest(e.rest)}</span>}
          {e.pri.slice(0, 2).map((m) => <span key={m} className="chip">{MUSCLE_LABEL[m]}</span>)}
        </div>
        <p className="cue">{e.cue}</p>

        <div className="seg" role="group" aria-label="Show">
          {(["muscles", "video", "howto"] as Panel[]).map((p) => (
            <button key={p} type="button" aria-pressed={panel === p} onClick={() => setPanel(p)}>
              {p === "muscles" ? "Muscles" : p === "video" ? "▶ Video" : "How to"}
            </button>
          ))}
        </div>

        <div className="panel fade-in" key={panel}>
          {panel === "muscles" && <>
            <MuscleMap pri={e.pri} sec={e.sec} />
            <p className="legend"><span><i style={{ background: "var(--accent)" }} />Main muscle</span><span><i style={{ background: "var(--musc-2)" }} />Also works</span></p>
          </>}
          {panel === "video" && <VideoPlayer videos={videos} search={e.q} name={e.name} />}
          {panel === "howto" && (lib?.steps.length
            ? <ol className="howto">{lib.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            : <p className="note">No step-by-step text for this one. Watch the video instead.</p>)}
        </div>

        {n > 0 && (
          <div className="sets">
            {Array.from({ length: n }, (_, i) => {
              const r = rows[i], p = prev?.rows[i];
              return (
                <div className={`setrow${e.log === "wr" ? "" : " one"}`} key={`${date}-${i}`}>
                  <span>SET {i + 1}</span>
                  {e.log === "wr" && <>
                    <input id={`w-${e.id}-${i}`} inputMode="decimal" autoComplete="off" aria-label={`Set ${i + 1} weight in kg`}
                      placeholder={p?.[0] != null ? String(p[0]) : "kg"} defaultValue={r?.[0] ?? ""}
                      onChange={(ev) => onSet(i, 0, ev.target.value, ev.target.closest("article"))} />
                    <span>KG ×</span>
                  </>}
                  <input id={`r-${e.id}-${i}`} data-f="1" inputMode="numeric" autoComplete="off"
                    aria-label={`Set ${i + 1} ${e.log === "s" ? "seconds" : "reps"}`}
                    placeholder={p?.[1] != null ? String(p[1]) : e.log === "s" ? "sec" : "reps"} defaultValue={r?.[1] ?? ""}
                    onChange={(ev) => onSet(i, 1, ev.target.value, ev.target.closest("article"))} />
                  <span>{e.log === "s" ? "SEC" : "REPS"}</span>
                </div>
              );
            })}
            <p className="last num">
              {prev ? <>Last time ({nice(prev.date)}): {prev.rows.filter(Boolean).map((r) => rowTxt(r, e.log)).join(" · ")}. Beat it by 1 rep or the next weight.</>
                : <>First time: start light and get the form right. Next session, the grey numbers show what you did today.</>}
            </p>
          </div>
        )}

        {e.rest && <button type="button" className="btn primary wide" onClick={() => timer.start(e.rest!, e.name)}>Start {fmtRest(e.rest)} rest</button>}
      </div>
    </article>
  );
}
