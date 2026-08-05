/**
 * Moonbug Lunar Calculations Engine
 * UTC-based formulas for moon age, phase, illumination, distance (perigee/apogee), and birth calculations.
 */

export const SYNODIC_MONTH = 29.530588853;
export const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export const ANOMALISTIC_MONTH = 27.55454988;
export const REF_PERIGEE = Date.UTC(1999, 11, 22, 22, 30, 0);

export interface MoonPhase {
  name: string;
  emoji: string;
  code: string;
  index: number;
}

export interface MoonStatus {
  age: number;
  illumination: number;
  phase: MoonPhase;
  distanceKm: number;
  proximityState: "Perigee (Supermoon)" | "Apogee (Micromoon)" | "Average";
  sunAngle: number;
  moonAngle: number;
  isEclipse: boolean;
}

/**
 * Calculates current lunar age in days (0 - 29.53)
 */
export function getLunarAge(date: Date): number {
  const msDiff = date.getTime() - REF_NEW_MOON;
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  let age = daysDiff % SYNODIC_MONTH;
  if (age < 0) {
    age += SYNODIC_MONTH;
  }
  return Number(age.toFixed(2));
}

/**
 * Calculates percentage of moon surface illuminated
 */
export function getIllumination(age: number): number {
  const angle = (age / SYNODIC_MONTH) * 2 * Math.PI;
  const illumination = ((1 - Math.cos(angle)) / 2) * 100;
  return Number(illumination.toFixed(1));
}

/**
 * Gets phase details based on lunar age
 */
export function getMoonPhaseDetails(age: number): MoonPhase {
  const pct = age / SYNODIC_MONTH;
  if (pct < 0.03 || pct >= 0.97) return { name: 'New Moon', emoji: '🌑', code: 'new-moon', index: 0 };
  if (pct < 0.22) return { name: 'Waxing Crescent', emoji: '🌒', code: 'waxing-crescent', index: 1 };
  if (pct < 0.28) return { name: 'First Quarter', emoji: '🌓', code: 'first-quarter', index: 2 };
  if (pct < 0.47) return { name: 'Waxing Gibbous', emoji: '🌔', code: 'waxing-gibbous', index: 3 };
  if (pct < 0.53) return { name: 'Full Moon', emoji: '🌕', code: 'full-moon', index: 4 };
  if (pct < 0.72) return { name: 'Waning Gibbous', emoji: '🌖', code: 'waning-gibbous', index: 5 };
  if (pct < 0.78) return { name: 'Last Quarter', emoji: '🌗', code: 'last-quarter', index: 6 };
  return { name: 'Waning Crescent', emoji: '🌘', code: 'waning-crescent', index: 7 };
}

/**
 * Calculates distance in km and whether it is Perigee or Apogee
 */
export function getMoonDistance(date: Date): { distanceKm: number; state: "Perigee (Supermoon)" | "Apogee (Micromoon)" | "Average" } {
  const msDiff = date.getTime() - REF_PERIGEE;
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  let anomalisticAge = daysDiff % ANOMALISTIC_MONTH;
  if (anomalisticAge < 0) anomalisticAge += ANOMALISTIC_MONTH;

  const anomalyAngle = (anomalisticAge / ANOMALISTIC_MONTH) * 2 * Math.PI;
  const distanceKm = 384400 - 26300 * Math.cos(anomalyAngle);

  let state: "Perigee (Supermoon)" | "Apogee (Micromoon)" | "Average" = 'Average';
  if (distanceKm < 370000) state = 'Perigee (Supermoon)';
  else if (distanceKm > 398000) state = 'Apogee (Micromoon)';

  return { distanceKm: Math.round(distanceKm), state };
}

/**
 * Calculates approximate Sun position angle (0 - 360)
 */
export function getSunAngle(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000);
  let angle = ((dayOfYear + 80) * 360 / 365.25) % 360;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  angle = (angle + hours * 15) % 360;
  return Number(angle.toFixed(1));
}

/**
 * Main function returning full status
 */
export function getLunarStatus(date: Date = new Date()): MoonStatus {
  const age = getLunarAge(date);
  const illumination = getIllumination(age);
  const phase = getMoonPhaseDetails(age);
  const distance = getMoonDistance(date);
  const sunAngle = getSunAngle(date);
  const moonAngle = (age / SYNODIC_MONTH) * 360;
  
  // Eclipse check: sun and moon angles overlap within 12 degrees
  const angleDiff = Math.abs(moonAngle - sunAngle);
  const isEclipse = angleDiff < 12 || angleDiff > 348;

  return {
    age,
    illumination,
    phase,
    distanceKm: distance.distanceKm,
    proximityState: distance.state,
    sunAngle,
    moonAngle,
    isEclipse
  };
}

/**
 * Calculate full cycles since birth
 */
export function getCyclesSinceBirth(birthDate: Date, currentDate: Date = new Date()): number {
  const diffMs = currentDate.getTime() - birthDate.getTime();
  if (diffMs <= 0) return 0;
  const cycles = diffMs / (1000 * 60 * 60 * 24 * SYNODIC_MONTH);
  return Number(cycles.toFixed(2));
}
