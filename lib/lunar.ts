// Moon-Bird lunar calculations (UTC-based), ported from backend/internal/lunar/lunar.go.
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
] as const;

/**
 * The index cascade below always lands in 0..7, but under
 * noUncheckedIndexedAccess a `number` index is still `T | undefined`. Narrowing
 * the index type carries that guarantee into the type system without a
 * non-null assertion.
 */
type PhaseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Map a phase fraction (0..1 through the synodic month) to a PHASES index.
 *
 * The quarter phases get narrow 6%-wide bands and the crescent/gibbous phases
 * get the wide spans between them, so "First Quarter" names a few days around
 * the actual quarter rather than a quarter of the month.
 *
 * Returning a narrowed index rather than `number` is what lets PHASES[i] type
 * as defined under noUncheckedIndexedAccess.
 */
function phaseIndex(fraction: number): PhaseIndex {
  if (fraction < 0.03 || fraction >= 0.97) return 0;
  if (fraction < 0.22) return 1;
  if (fraction < 0.28) return 2;
  if (fraction < 0.47) return 3;
  if (fraction < 0.53) return 4;
  if (fraction < 0.72) return 5;
  if (fraction < 0.78) return 6;
  return 7;
}

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

  const phase = PHASES[phaseIndex(pct)];

  const daysUntilNext = (target: number) => {
    let delta = target - pct;
    if (delta < 0) delta += 1;
    return delta * SYNODIC_MONTH;
  };

  return {
    age,
    illumination,
    phase: phase.name,
    phaseCode: phase.code,
    phaseEmoji: phase.emoji,
    daysUntilFull: daysUntilNext(0.5),
    daysUntilNew: daysUntilNext(0),
  };
}

export function phaseInfoForDate(date: Date) {
  const a = ageFor(date);
  const p = a / SYNODIC_MONTH;
  const angle = p * 2 * Math.PI;
  const illumination = ((1 - Math.cos(angle)) / 2) * 100;
  return { ...PHASES[phaseIndex(p)], illumination: Math.round(illumination) };
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

export function phaseName(age: number): string {
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

export function phaseEmoji(age: number): string {
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

export function phaseCode(age: number): string {
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
