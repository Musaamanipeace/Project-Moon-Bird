// Moonbug lunar calculations (UTC-based), ported from backend/internal/lunar/lunar.go.
export const SYNODIC_MONTH = 29.530588853;
const REF_NEW_MOON = 947166000; // Date.UTC(2000, 0, 6, 18, 14, 0) in seconds

export interface MoonStatus {
  age: number;
  illumination: number;
  phase: string;
  phaseCode: string;
  phaseEmoji: string;
  daysUntilFull: number;
  daysUntilNew: number;
}

const PHASES = [
  { name: "New Moon", emoji: "🌑", code: "new-moon" },
  { name: "Waxing Crescent", emoji: "🌒", code: "waxing-crescent" },
  { name: "First Quarter", emoji: "🌓", code: "first-quarter" },
  { name: "Waxing Gibbous", emoji: "🌔", code: "waxing-gibbous" },
  { name: "Full Moon", emoji: "🌕", code: "full-moon" },
  { name: "Waning Gibbous", emoji: "🌖", code: "waning-gibbous" },
  { name: "Last Quarter", emoji: "🌗", code: "last-quarter" },
  { name: "Waning Crescent", emoji: "🌘", code: "waning-crescent" },
];

function ageFor(date: Date): number {
  const days = (date.getTime() / 1000 - REF_NEW_MOON) / 86400;
  let age = days % SYNODIC_MONTH;
  if (age < 0) age += SYNODIC_MONTH;
  return age;
}

export function getMoonStatus(date: Date = new Date()): MoonStatus {
  const age = ageFor(date);
  const pct = age / SYNODIC_MONTH;
  const angle = pct * 2 * Math.PI;
  const illumination = ((1 - Math.cos(angle)) / 2) * 100;

  let idx = 0;
  if (pct < 0.03 || pct >= 0.97) idx = 0;
  else if (pct < 0.22) idx = 1;
  else if (pct < 0.28) idx = 2;
  else if (pct < 0.47) idx = 3;
  else if (pct < 0.53) idx = 4;
  else if (pct < 0.72) idx = 5;
  else if (pct < 0.78) idx = 6;
  else idx = 7;

  const phaseForDate = (d: Date) => {
    const a = ageFor(d);
    const p = a / SYNODIC_MONTH;
    let i = 0;
    if (p < 0.03 || p >= 0.97) i = 0;
    else if (p < 0.22) i = 1;
    else if (p < 0.28) i = 2;
    else if (p < 0.47) i = 3;
    else if (p < 0.53) i = 4;
    else if (p < 0.72) i = 5;
    else if (p < 0.78) i = 6;
    else i = 7;
    return i;
  };

  const daysUntilNext = (target: number) => {
    let delta = target - pct;
    if (delta < 0) delta += 1;
    return delta * SYNODIC_MONTH;
  };

  return {
    age,
    illumination,
    phase: PHASES[idx].name,
    phaseCode: PHASES[idx].code,
    phaseEmoji: PHASES[idx].emoji,
    daysUntilFull: daysUntilNext(0.5),
    daysUntilNew: daysUntilNext(0),
  };
}

export function phaseInfoForDate(date: Date) {
  const a = ageFor(date);
  const p = a / SYNODIC_MONTH;
  const angle = p * 2 * Math.PI;
  const illumination = ((1 - Math.cos(angle)) / 2) * 100;
  let idx = 0;
  if (p < 0.03 || p >= 0.97) idx = 0;
  else if (p < 0.22) idx = 1;
  else if (p < 0.28) idx = 2;
  else if (p < 0.47) idx = 3;
  else if (p < 0.53) idx = 4;
  else if (p < 0.72) idx = 5;
  else if (p < 0.78) idx = 6;
  else idx = 7;
  return { ...PHASES[idx], illumination: Math.round(illumination) };
}

export { PHASES };

export function phaseFraction(age: number): number {
  return (age % SYNODIC_MONTH) / SYNODIC_MONTH;
}

export function moonPosition(
  date: Date,
  latitude: number
): { altitude: number; azimuth: number } {
  const age = ageFor(date);
  const pct = age / SYNODIC_MONTH;
  const decDeg = 5.14 * Math.sin(pct * 2 * Math.PI / 1.0);
  const transitOffsetHours = (age * 24.0) / SYNODIC_MONTH;
  const haHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 -
    transitOffsetHours;
  const haRad = (haHours * Math.PI) / 12;
  const latRad = (latitude * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const alt = Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  );
  const altDeg = alt * (180 / Math.PI);
  const x = Math.sin(haRad);
  const y =
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad);
  const azRad = Math.atan2(-x, y);
  const azDeg = ((azRad * 180) / Math.PI + 360) % 360;
  return { altitude: altDeg, azimuth: azDeg };
}

export function moonPath(
  start: Date,
  hours: number,
  latitude: number
): { altitude: number; azimuth: number }[] {
  const path: { altitude: number; azimuth: number }[] = [];
  for (let i = 0; i <= hours; i++) {
    const t = new Date(start.getTime() + i * 3600000);
    path.push(moonPosition(t, latitude));
  }
  return path;
}

export function refNewMoonTime(): Date {
  return new Date(REF_NEW_MOON * 1000);
}

export function age(date: Date): number {
  const secs = date.getTime() / 1000;
  const days = (secs - REF_NEW_MOON) / 86400;
  let age = days % SYNODIC_MONTH;
  if (age < 0) age += SYNODIC_MONTH;
  return age;
}

export function illumination(age: number): number {
  const angle = (age / SYNODIC_MONTH) * 2 * Math.PI;
  return ((1 - Math.cos(angle)) / 2) * 100;
}

export function daysUntilNext(age: number, target: number): number {
  const pct = age / SYNODIC_MONTH;
  let delta = target - pct;
  if (delta < 0) delta += 1;
  return delta * SYNODIC_MONTH;
}

function phaseName(age: number): string {
  const pct = age / SYNODIC_MONTH;
  if (pct < 0.03 || pct >= 0.97) return "New Moon";
  if (pct < 0.22) return "Waxing Crescent";
  if (pct < 0.28) return "First Quarter";
  if (pct < 0.47) return "Waxing Gibbous";
  if (pct < 0.53) return "Full Moon";
  if (pct < 0.72) return "Waning Gibbous";
  if (pct < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

function phaseEmoji(age: number): string {
  const pct = age / SYNODIC_MONTH;
  if (pct < 0.03 || pct >= 0.97) return "🌑";
  if (pct < 0.22) return "🌒";
  if (pct < 0.28) return "🌓";
  if (pct < 0.47) return "🌔";
  if (pct < 0.53) return "🌕";
  if (pct < 0.72) return "🌖";
  if (pct < 0.78) return "🌗";
  return "🌘";
}

function phaseCode(age: number): string {
  const pct = age / SYNODIC_MONTH;
  if (pct < 0.03 || pct >= 0.97) return "new-moon";
  if (pct < 0.22) return "waxing-crescent";
  if (pct < 0.28) return "first-quarter";
  if (pct < 0.47) return "waxing-gibbous";
  if (pct < 0.53) return "full-moon";
  if (pct < 0.72) return "waning-gibbous";
  if (pct < 0.78) return "last-quarter";
  return "waning-crescent";
}