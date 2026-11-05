import { START_DATE } from "../data/plan";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const todayKey = () => keyOf(new Date());
export const mondayOf = (k: string) => { const d = parse(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); };
export const weekday = (k: string) => parse(k).getDay();
export const nice = (k: string) => { const d = parse(k); return `${SHORT_DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const weekNo = (k: string) => Math.floor((parse(k).getTime() - parse(mondayOf(START_DATE)).getTime()) / 864e5 / 7) + 1;
export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
export const fmtRest = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}${s % 60 ? ":" + pad(s % 60) : ""} min` : `${s} s`);
