import type { ReactNode } from "react";

const S = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

export const Icon = {
  coach: S(<path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z" />),
  health: S(<path d="M3 12h4l2-5 4 10 2-5h6" />),
  habits: S(<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />),
  meals: S(<><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M9 7c0-1.5 1-2 1-3M13 7c0-1.5 1-2 1-3" /></>),
  workout: S(<path d="M3 12h2m14 0h2M6 7v10M18 7v10M8.5 9v6M15.5 9v6M8.5 12h7" />),
  prep: S(<><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4.5V3h6v1.5M9 11l2 2 4-4M9 17h6" /></>),
  steps: S(<><path d="M8 4c1.7 0 2.5 1.8 2.5 4S9.5 12 8 12 5.5 10 5.5 8 6.3 4 8 4zM6 14.5h4V17a2 2 0 0 1-4 0z" /><path d="M16 8c1.7 0 2.5 1.8 2.5 4s-1 4-2.5 4-2.5-2-2.5-4 .8-4 2.5-4zM14 18.5h4V20a2 2 0 0 1-4 0z" /></>),
  sleep: S(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />),
  sun: S(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: S(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />),
  auto: S(<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" /></>),
};

export function SecHead({ icon, title, sub, meta, id }: { icon: ReactNode; title: string; sub?: string; meta?: ReactNode; id?: string }) {
  return (
    <div className="sec-head">
      <span className="sec-ico">{icon}</span>
      <div className="tt"><h2 id={id}>{title}</h2>{sub && <span className="sub">{sub}</span>}</div>
      {meta != null && <span className="sec-meta num">{meta}</span>}
    </div>
  );
}
