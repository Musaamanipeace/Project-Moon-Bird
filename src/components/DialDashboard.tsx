import React, { useState, useEffect } from "react";
import { Compass, Calendar, RefreshCw, ArrowLeft, ArrowRight, AlertCircle, Eye, HelpCircle, Sun, Moon, Info, Cloud, Thermometer, Wind, Globe2, Clock, Waves } from "lucide-react";
import { getLunarStatus, getMoonPhaseDetails, getIllumination, SYNODIC_MONTH } from "../lib/lunar";
import { getSeason, getNextActiveEvent, getMoonRiseSetTimes } from "../lib/events";

interface DialDashboardProps {
  locationText: string;
  birthDate: string;
  nickname: string;
  xp: number;
  onAddXp: (amount: number) => void;
  onNavigateToView?: (view: string) => void;
}

export default function DialDashboard({ locationText, birthDate, nickname, xp, onAddXp, onNavigateToView }: DialDashboardProps) {
  const [showSun, setShowSun] = useState(true);
  const [showRealistic, setShowRealistic] = useState(true);

  // Three lunar-clock display modes described in the MoonDial vision:
  // "compass" = hour-hand compass clock, "wave" = equator/horizon wave, "globe" = 3D earth + orbit
  const [displayMode, setDisplayMode] = useState<"compass" | "wave" | "globe">("wave");
  
  // Custom Date / Time Toggles
  const [isLiveSync, setIsLiveSync] = useState(true);
  const [liveTick, setLiveTick] = useState(0);

  const [customDateStr, setCustomDateStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  
  const [customTimeStr, setCustomTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // Cycle ahead offset for upcoming lunar phases
  const [cyclePhaseOffset, setCyclePhaseOffset] = useState(0);

  // Track active hovered line descriptions
  const [lineHoverInfo, setLineHoverInfo] = useState<string | null>(null);

  // Weather & Facts
  const [weather, setWeather] = useState<{ temp: number; wind: number; code: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [didYouKnow, setDidYouKnow] = useState("");

  // Geocoded observer coordinates (used for latitude-aware globe placement)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const moonFacts = [
    "The Moon is slowly moving away from Earth at about 3.8 cm per year.",
    "A full moon is roughly 9 times brighter than a half moon.",
    "The Moon has no atmosphere, so footprints left by astronauts will stay for millions of years.",
    "The Moon's surface is covered in a fine dust called regolith.",
    "A lunar day (sunrise to sunrise) lasts about 29.5 Earth days.",
    "The Moon is the fifth largest natural satellite in the Solar System.",
    "Tides on Earth are primarily caused by the Moon's gravitational pull.",
    "The Moon's core is about 20% of its radius, much smaller than Earth's core.",
    "The far side of the Moon is sometimes called the 'dark side' because it's invisible from Earth, not because it lacks sunlight.",
    "Moonquakes can last up to half an hour due to the Moon's dry, fragmented crust."
  ];

  // Local sunrise reference (calibrated by user coordinates)
  const [sunriseHour, setSunriseHour] = useState(() => {
    const savedLoc = localStorage.getItem("mb_location") || "Nairobi, Kenya";
    if (savedLoc.toLowerCase().includes("kenya") || savedLoc.toLowerCase().includes("kisumu") || savedLoc.toLowerCase().includes("nairobi")) {
      return 6.68; // 6:41 AM (leads to precise 4:12 AM moonrise for today!)
    }
    return 6.0;
  });

  // Keep ticking live date synced
  useEffect(() => {
    if (isLiveSync) {
      const now = new Date();
      setCustomDateStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setCustomTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
  }, [isLiveSync, liveTick]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTick(t => t + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Rotate Did You Know facts
  useEffect(() => {
    const factInterval = setInterval(() => {
      setDidYouKnow(moonFacts[Math.floor(Math.random() * moonFacts.length)]);
    }, 8000);
    setDidYouKnow(moonFacts[Math.floor(Math.random() * moonFacts.length)]);
    return () => clearInterval(factInterval);
  }, []);

  // Fetch weather from Open-Meteo (no API key required)
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationText)}&count=1`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          const { latitude, longitude } = geoData.results[0];
          setCoords({ lat: latitude, lon: longitude });
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          if (weatherData.current_weather) {
            setWeather({
              temp: Math.round(weatherData.current_weather.temperature),
              wind: Math.round(weatherData.current_weather.windspeed),
              code: weatherData.current_weather.weathercode
            });
          }
        }
      } catch (e) {
        console.error("Weather fetch failed:", e);
      } finally {
        setWeatherLoading(false);
      }
    };
    if (locationText) fetchWeather();
  }, [locationText]);

  const getActiveDate = () => {
    if (isLiveSync) return new Date();
    const [y, m, d] = customDateStr.split("-").map(Number);
    const [h, min] = customTimeStr.split(":").map(Number);
    if (!y || !m || !d || isNaN(h) || isNaN(min)) return new Date();
    return new Date(y, m - 1, d, h, min, 0, 0);
  };

  const activeDate = getActiveDate();
  const lunarStatus = getLunarStatus(activeDate);

  // Calculate moon rise and set decimal hours
  const activeRiseSet = getMoonRiseSetTimes(lunarStatus.age, sunriseHour);
  const mRiseHour = activeRiseSet.riseDecimal;
  const mSetHour = activeRiseSet.setDecimal;

  // ---- Declination model (drives wave amplitude) ----
  // The Sun's overhead latitude (declination) varies seasonally between ±23.44°.
  // The Moon's declination is offset from the Sun because the lunar orbit is
  // tilted ~5.14° to the ecliptic. We approximate the Moon's declination and
  // express the wave as "degrees off from the Sun's overhead latitude".
  const dayOfYear = Math.floor(
    (activeDate.getTime() - Date.UTC(activeDate.getUTCFullYear(), 0, 0)) / 86400000
  );
  const sunDeclination = 23.44 * Math.sin(((dayOfYear - 81) / 365.25) * 2 * Math.PI);
  // Moon's orbital phase relative to the ecliptic node (rough): full cycle per anomalistic-ish period
  const moonOrbitPhase = (lunarStatus.age / 27.32) * 2 * Math.PI;
  const moonDeclination = sunDeclination + 5.14 * Math.sin(moonOrbitPhase);
  // Degrees the Moon is off from the Sun's overhead latitude (can be ±)
  const declinationOffsetDeg = Number((moonDeclination - sunDeclination).toFixed(1));

  // Pixels per degree on the viewport (Sun's max seasonal amplitude ~23.44° -> 180px)
  const PX_PER_DEG = 180 / 23.44;
  const sunAmp = Math.max(40, Math.abs(sunDeclination) * PX_PER_DEG);
  // Moon amplitude = how far its overhead latitude sits from the horizon, measured
  // from the Sun's overhead latitude. We render the Moon relative to the Sun line.
  const moonAmp = sunAmp + declinationOffsetDeg * PX_PER_DEG;

  // Curvature coordinates generators
  const getMoonPositionAndPath = (h: number, riseH: number, setH: number) => {
    const x = 1000 - (h / 24) * 1000;
    const visibleDuration = (setH - riseH + 24) % 24;
    const invisibleDuration = 24 - visibleDuration;
    const dt = (h - riseH + 24) % 24;

    let y = 500;
    let isVisible = false;

    if (dt < visibleDuration) {
      const pct = dt / visibleDuration;
      const angle = pct * Math.PI;
      y = 500 - Math.abs(moonAmp) * Math.sin(angle); // Sway Northward (above horizon)
      isVisible = true;
    } else {
      const pct = (dt - visibleDuration) / invisibleDuration;
      const angle = pct * Math.PI;
      y = 500 + Math.abs(moonAmp) * Math.sin(angle); // Sway Southward (below horizon)
      isVisible = false;
    }

    return { x, y, isVisible };
  };

  // Sun Path position generator - goes above and below horizon
  const getSunPositionAndPath = (h: number, riseH: number, setH: number) => {
    const x = 1000 - (h / 24) * 1000;
    const visibleDuration = (setH - riseH + 24) % 24;
    const invisibleDuration = 24 - visibleDuration;
    const dt = (h - riseH + 24) % 24;

    let y = 500;
    let isVisible = false;

    if (dt < visibleDuration) {
      const pct = dt / visibleDuration;
      const angle = pct * Math.PI;
      y = 500 - sunAmp * Math.sin(angle); // Sun goes above horizon during day
      isVisible = true;
    } else {
      const pct = (dt - visibleDuration) / invisibleDuration;
      const angle = pct * Math.PI;
      y = 500 + sunAmp * Math.sin(angle); // Sun goes below horizon at night
      isVisible = false;
    }

    return { x, y, isVisible };
  };

  const steps = 120;
  const moonVisibleSegments: string[] = [];
  const moonInvisibleSegments: string[] = [];
  
  let currentMoonSeg: [number, number][] = [];
  let currentMoonSegIsVisible = false;
  
  for (let i = 0; i <= steps; i++) {
    const h = (i / steps) * 24;
    const pos = getMoonPositionAndPath(h, mRiseHour, mSetHour);
    
    if (i === 0) {
      currentMoonSegIsVisible = pos.isVisible;
    }
    
    if (pos.isVisible !== currentMoonSegIsVisible) {
      if (currentMoonSeg.length > 0) {
        const pathStr = `M ${currentMoonSeg.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
        if (currentMoonSegIsVisible) moonVisibleSegments.push(pathStr);
        else moonInvisibleSegments.push(pathStr);
      }
      const prevH = ((i - 1) / steps) * 24;
      const prevPos = getMoonPositionAndPath(prevH, mRiseHour, mSetHour);
      currentMoonSeg = [[prevPos.x, prevPos.y], [pos.x, pos.y]];
      currentMoonSegIsVisible = pos.isVisible;
    } else {
      currentMoonSeg.push([pos.x, pos.y]);
    }
  }
  if (currentMoonSeg.length > 0) {
    const pathStr = `M ${currentMoonSeg.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
    if (currentMoonSegIsVisible) moonVisibleSegments.push(pathStr);
    else moonInvisibleSegments.push(pathStr);
  }

  // Generate Sun segments: Sunrise path (above) and Sunset path (below)
  const sunVisibleSegments: string[] = [];
  const sunInvisibleSegments: string[] = [];
  
  const sunRiseHour = sunriseHour;
  const sunSetHour = (sunriseHour + 12) % 24;

  let currentSunSeg: [number, number][] = [];
  let currentSunSegIsVisible = false;

  for (let i = 0; i <= steps; i++) {
    const h = (i / steps) * 24;
    const pos = getSunPositionAndPath(h, sunRiseHour, sunSetHour);
    
    if (i === 0) {
      currentSunSegIsVisible = pos.isVisible;
    }
    
    if (pos.isVisible !== currentSunSegIsVisible) {
      if (currentSunSeg.length > 0) {
        const pathStr = `M ${currentSunSeg.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
        if (currentSunSegIsVisible) sunVisibleSegments.push(pathStr);
        else sunInvisibleSegments.push(pathStr);
      }
      const prevH = ((i - 1) / steps) * 24;
      const prevPos = getSunPositionAndPath(prevH, sunRiseHour, sunSetHour);
      currentSunSeg = [[prevPos.x, prevPos.y], [pos.x, pos.y]];
      currentSunSegIsVisible = pos.isVisible;
    } else {
      currentSunSeg.push([pos.x, pos.y]);
    }
  }
  if (currentSunSeg.length > 0) {
    const pathStr = `M ${currentSunSeg.map(p => `${p[0]},${p[1]}`).join(" L ")}`;
    if (currentSunSegIsVisible) sunVisibleSegments.push(pathStr);
    else sunInvisibleSegments.push(pathStr);
  }

  const currentHourDecimal = activeDate.getHours() + activeDate.getMinutes() / 60;
  
  // Sun actual active coordinates
  const activeSunPos = getSunPositionAndPath(currentHourDecimal, sunRiseHour, sunSetHour);
  const activeSunX = activeSunPos.x;
  const activeSunY = activeSunPos.y;

  const isDaytime = activeSunY < 500; // Sun is above horizon

  // Moon actual active coordinates
  const activeMoonX = 1000 - (currentHourDecimal / 24) * 1000;
  const activeMoonPos = getMoonPositionAndPath(currentHourDecimal, mRiseHour, mSetHour);
  const activeMoonY = activeMoonPos.y;

  const getMoonVisibilityDetails = () => {
    const isAboveHorizon = activeMoonY < 500;
    if (!isAboveHorizon) {
      return {
        status: "INVISIBLE",
        badgeColor: "text-red-400 bg-red-950/20 border-red-900/30",
        reason: "Below Horizon: The Moon is physically on the other side of the Earth, occulted below our horizon line."
      };
    }

    const illumination = getIllumination(lunarStatus.age);
    const isNearNewMoon = lunarStatus.age < 2.0 || lunarStatus.age > 27.5;

    if (isNearNewMoon) {
      return {
        status: "INVISIBLE",
        badgeColor: "text-amber-500 bg-amber-950/20 border-amber-900/30",
        reason: `New Moon Glare: Though above the horizon, the Moon is extremely close to the Sun's path. Solar glare completely washes it out.`
      };
    }

    if (isDaytime) {
      if (illumination < 15) {
        return {
          status: "INVISIBLE",
          badgeColor: "text-amber-500 bg-amber-950/20 border-amber-900/30",
          reason: `Washed Out (Daylight): Though above the horizon, the thin crescent (${illumination}% illuminated) is too close to the Sun's bright daytime path.`
        };
      }
      return {
        status: "VISIBLE",
        badgeColor: "text-emerald-400 bg-emerald-950/20 border-emerald-900/30",
        reason: `Visible (Daytime): The Moon is above the horizon and sufficiently illuminated (${illumination}%) to pierce through the daytime sky glare.`
      };
    }

    return {
      status: "VISIBLE",
      badgeColor: "text-emerald-400 bg-emerald-950/20 border-emerald-900/30",
      reason: `Highly Visible (Night): The Moon is above the horizon in the clear night sky, illuminated at ${illumination}%, and easily seen.`
    };
  };

  const moonVisibility = getMoonVisibilityDetails();

  function getMoonPhasePathLocal(age: number, radius: number = 40) {
    const k = age / 29.530588853;
    const phi = k * 2 * Math.PI;
    const illumPct = (1 - Math.cos(phi)) / 2;

    if (age < 0.2 || age > 29.33) return "";

    const isWaxing = age < 14.765;
    let termRadius = radius * Math.abs(1 - 2 * illumPct);
    if (termRadius < 3.5) termRadius = 3.5;

    const outerSweep = isWaxing ? 1 : 0;
    const termSweep = isWaxing ? (illumPct > 0.5 ? 1 : 0) : (illumPct > 0.5 ? 0 : 1);
    
    return `M 50 ${50 - radius} A ${radius} ${radius} 0 0 ${outerSweep} 50 ${50 + radius} A ${termRadius} ${radius} 0 0 ${termSweep} 50 ${50 - radius} Z`;
  }

  // ---- Display 1 (Compass Clock) geometry ----
  // East at 3 o'clock, West at 9 o'clock, Zenith (North) at 12 o'clock.
  // The visible portion of the day sweeps East -> Zenith -> West; once the moon
  // sets it continues West -> Nadir -> East, i.e. it appears to move backwards.
  const compassHours = 24;
  const compassCenter = 200;
  const compassRadius = 150;

  // Position angle (degrees, 0 = East/right, increasing clockwise) for a given hour.
  const getCompassAngle = (h: number) => (h / compassHours) * 360;

  // Build the visible arc (moonrise -> zenith -> moonset) and the invisible arc
  // (moonset -> nadir -> moonrise, traversed backwards).
  const buildCompassArc = (fromH: number, toH: number) => {
    const pts: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const h = fromH + ((toH - fromH) * i) / steps;
      const ang = (getCompassAngle(h) * Math.PI) / 180;
      const x = compassCenter + compassRadius * Math.cos(ang);
      const y = compassCenter - compassRadius * Math.sin(ang);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${pts.join(" L ")}`;
  };

  const visibleArc = buildCompassArc(mRiseHour, mSetHour);
  const invisibleArc = buildCompassArc(mSetHour, mRiseHour + 24);

  // Current moon tip marker on the compass
  const currentCompassAngle = (getCompassAngle(currentHourDecimal) * Math.PI) / 180;
  const currentMoonCompass = {
    x: compassCenter + compassRadius * Math.cos(currentCompassAngle),
    y: compassCenter - compassRadius * Math.sin(currentCompassAngle)
  };
  const currentSunCompass = {
    x: compassCenter + compassRadius * Math.cos((getCompassAngle(activeSunPos.x === 0 ? 0 : (1000 - activeSunX) / 1000 * 24) * Math.PI) / 180),
    y: compassCenter - compassRadius * Math.sin((getCompassAngle((1000 - activeSunX) / 1000 * 24) * Math.PI) / 180)
  };

  // ---- Display 3 (3D Globe) geometry ----
  // A 3D earth (circle) with a tilted 3D orbital ring. The observer is always at
  // the middle longitude (sub-solar front point). Moon position mapped onto the ring.
  const globeCx = 200;
  const globeCy = 200;
  const globeR = 70;
  const orbitRx = 150;
  const orbitRy = 55;
  const orbitTilt = -18; // degrees

  // Moon's angular progress along its orbit for the active time (rise->set mapped on front arc)
  const moonOrbitFrac = ((currentHourDecimal - mRiseHour + 24) % 24) / 24;
  // Angle on the ellipse (0 at far-east rise on the right, sweeping over the top)
  const moonOrbitAngle = (moonOrbitFrac * 2 * Math.PI) - Math.PI / 2;
  const moonGlobeX = globeCx + orbitRx * Math.cos(moonOrbitAngle);
  const moonGlobeY = globeCy + orbitRy * Math.sin(moonOrbitAngle);
  const moonGlobeVisible = activeMoonY < 500;

  // Observer dot on the central (middle) longitude, placed at the observer's
  // actual latitude. Latitude maps to vertical position on the globe disc:
  // +90° (North Pole) at the top, 0° (equator) at centre, -90° (South Pole) at bottom.
  const observerLat = coords ? coords.lat : 0;
  const observerX = globeCx;
  const observerY = globeCy - (observerLat / 90) * globeR;

  return (
    <div className="space-y-8 p-4 max-w-5xl mx-auto text-slate-200">
      
      {/* 1. Dashboard Header Banner */}
      <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-yellow-400 uppercase tracking-wider">
              🌙 Celestial Moon Dial
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Location Coordinated: {locationText} | Passive Sync</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSun(!showSun)}
              className={`px-3 py-1 rounded-lg border text-[10px] font-mono font-bold transition-colors ${
                showSun ? "border-yellow-500 bg-yellow-500/10 text-yellow-300" : "border-slate-850 bg-slate-950 text-slate-500"
              }`}
            >
              ☀️ Sun Toggle
            </button>
            <button
              onClick={() => setShowRealistic(!showRealistic)}
              className={`px-3 py-1 rounded-lg border text-[10px] font-mono font-bold transition-colors ${
                showRealistic ? "border-yellow-500 bg-yellow-500/10 text-yellow-300" : "border-slate-850 bg-slate-950 text-slate-500"
              }`}
            >
              🌕 Realistic View
            </button>
          </div>
        </div>

        {/* DISPLAY MODE SWITCHER — three lunar-clock visualizations */}
        <div className="p-3 mb-4 rounded-xl border border-slate-800/60 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Eye className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Lunar Clock Display</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "compass", label: "Compass", icon: <Clock className="w-3.5 h-3.5" />, desc: "Hour-hand compass: East=3, West=9, Zenith at top. Moves backwards once set." },
              { id: "wave", label: "Horizon Wave", icon: <Waves className="w-3.5 h-3.5" />, desc: "Equator/horizon wave: moon path mapped against the sun's path by hour." },
              { id: "globe", label: "3D Globe", icon: <Globe2 className="w-3.5 h-3.5" />, desc: "3D Earth with tilted orbit ring showing the moon's live position for your location." }
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setDisplayMode(m.id)}
                title={m.desc}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] font-mono font-bold transition-colors ${
                  displayMode === m.id
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                    : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* INTERACTIVE CUSTOM TIME CONTROL BLOCK */}
        <div className="p-3 mb-4 rounded-xl border border-slate-800/60 bg-slate-950/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Interactive Sky Clock</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Date:</label>
              <input
                type="date"
                value={customDateStr}
                onChange={(e) => {
                  setCustomDateStr(e.target.value);
                  setIsLiveSync(false);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-xs text-yellow-400 focus:outline-none focus:border-yellow-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Time:</label>
              <input
                type="time"
                value={customTimeStr}
                onChange={(e) => {
                  setCustomTimeStr(e.target.value);
                  setIsLiveSync(false);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-xs text-yellow-400 focus:outline-none focus:border-yellow-500 font-mono"
              />
            </div>

            <button
              onClick={() => {
                setIsLiveSync(true);
                setLiveTick(t => t + 1);
              }}
              className={`px-3 py-1 rounded-lg border text-[9px] font-mono font-bold flex items-center gap-1 transition-all ${
                isLiveSync
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLiveSync ? "animate-spin" : ""}`} />
              <span>{isLiveSync ? "LIVE SYNCED" : "FREEZED (Click to Sync)"}</span>
            </button>
          </div>
        </div>

        {/* CLOCK CALIBRATION SLIDER BLOCK */}
        <div className="p-3 mb-4 rounded-xl border border-indigo-950 bg-indigo-950/20 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4.5 h-4.5 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Clock Calibration Coordinates</span>
              <span className="text-[9px] text-slate-400">Calibrate local reference sunrise to match your exact coordinates and observations</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto sm:flex-nowrap">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-mono text-slate-400 uppercase whitespace-nowrap">Sunrise:</span>
              <input
                type="range"
                min="5.0"
                max="8.0"
                step="0.01"
                value={sunriseHour}
                onChange={(e) => setSunriseHour(parseFloat(e.target.value))}
                className="w-full sm:w-40 accent-yellow-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-yellow-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 min-w-[70px] text-center">
                {(() => {
                  const h = Math.floor(sunriseHour);
                  const m = Math.floor((sunriseHour - h) * 60);
                  return `${h}:${String(m).padStart(2, '0')} AM`;
                })()}
              </span>
            </div>

            <div className="text-[9px] font-mono text-indigo-300 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/30">
              Today's Moonrise: <span className="font-bold text-yellow-400">{activeRiseSet.rise}</span>
            </div>
          </div>
        </div>

        {/* THE CELESTIAL GRAPHICS VIEWPORT BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

          {/* WAVE VIEWPORT — Display 2 */}
          {displayMode === "wave" && (
          <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[360px] md:max-w-full bg-[#05060b] border border-slate-800 rounded-2xl mx-auto shadow-2xl flex items-center justify-center overflow-hidden p-2">
            {lunarStatus.isEclipse && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <span className="px-2 py-0.5 rounded border border-red-500 bg-red-950/80 text-red-400 text-[8px] font-mono font-bold uppercase animate-pulse">
                  Solar Eclipse In Alignment
                </span>
              </div>
            )}

            <svg viewBox="0 0 1000 1000" className="w-full h-full text-slate-500">
              {/* Grid lines for coordinate precision */}
              <line x1="100" y1="0" x2="100" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="200" y1="0" x2="200" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="300" y1="0" x2="300" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="400" y1="0" x2="400" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="500" y1="0" x2="500" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="600" y1="0" x2="600" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="700" y1="0" x2="700" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="800" y1="0" x2="800" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="900" y1="0" x2="900" y2="1000" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              
              <line x1="0" y1="200" x2="1000" y2="200" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="350" x2="1000" y2="350" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="650" x2="1000" y2="650" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="800" x2="1000" y2="800" stroke="#11131f" strokeWidth="1" strokeDasharray="5,5" />

              {/* Info readout message at the top */}
              <text
                x="500"
                y="65"
                fill="#f59e0b"
                fontSize="21"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {lineHoverInfo ? `ℹ️ ${lineHoverInfo}` : "ℹ️ Hover paths for spatial parameters"}
              </text>

              {/* North Sky and South Sky Region Labels */}
              <text
                x="500"
                y="130"
                fill="#a16207"
                fontSize="23"
                fontWeight="black"
                fontFamily="monospace"
                textAnchor="middle"
                opacity="0.25"
              >
                ▲ ABOVE HORIZON (Visible Zenith)
              </text>
              <text
                x="500"
                y="870"
                fill="#3b82f6"
                fontSize="23"
                fontWeight="black"
                fontFamily="monospace"
                textAnchor="middle"
                opacity="0.25"
              >
                ▼ BELOW HORIZON (Occulted Underworld)
              </text>

              {/* Declination offset readout: how many degrees the Moon's overhead
                  latitude is off from the Sun's overhead latitude */}
              <text
                x="500"
                y="935"
                fill="#93c5fd"
                fontSize="20"
                fontWeight="black"
                fontFamily="monospace"
                textAnchor="middle"
              >
                ☾ Moon is {declinationOffsetDeg >= 0 ? "+" : ""}{declinationOffsetDeg}° off the Sun's overhead latitude
              </text>
              {/* Reference line for the Sun's peak overhead latitude */}
              <line x1="0" y1={500 - sunAmp} x2="1000" y2={500 - sunAmp} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="10,8" opacity="0.35" />
              <text x="14" y={500 - sunAmp - 6} fill="#f59e0b" fontSize="14" fontFamily="monospace" opacity="0.6">☀ Sun overhead</text>

              {/* ---------------- CELESTIAL HORIZON TIME RULER ---------------- */}
              {/* Thick bold light-brown horizon ruler replacement */}
              <line x1="0" y1="500" x2="1000" y2="500" stroke="#a16207" strokeWidth="12" strokeLinecap="round" />

              <text
                x="500"
                y="545"
                fill="#b45309"
                fontSize="18"
                fontWeight="black"
                fontFamily="monospace"
                textAnchor="middle"
                opacity="0.8"
              >
                🌅 EAST HORIZON TIME RULER 🌇
              </text>

              {/* Ticks on the brown horizon */}
              {Array.from({ length: 25 }).map((_, h) => {
                const tickX = 1000 - (h / 24) * 1000;
                const isSpecial = [0, 3, 6, 9, 12, 15, 18, 21, 24].includes(h);
                
                let labelText = "";
                if (h === 0) labelText = "00h";
                else if (h === 6) labelText = "06h";
                else if (h === 12) labelText = "12h";
                else if (h === 18) labelText = "18h";
                else if (h === 24) labelText = "24h";

                return (
                  <g key={h}>
                    <line
                      x1={tickX}
                      y1={isSpecial ? "475" : "485"}
                      x2={tickX}
                      y2={isSpecial ? "525" : "515"}
                      stroke="#d97706"
                      strokeWidth={isSpecial ? "4.5" : "2"}
                      opacity={isSpecial ? "0.95" : "0.5"}
                    />
                    {isSpecial && labelText && (
                      <text
                        x={tickX}
                        y="445"
                        fill="#d97706"
                        fontSize="20"
                        fontWeight="extrabold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {labelText}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ---------------- SUN'S PATH (Curved above & below horizon) ---------------- */}
              {showSun && (
                <>
                  {/* Sunrise Path (Sun is above horizon line, y < 500) */}
                  {sunVisibleSegments.map((seg, sIdx) => (
                    <g key={`sun-vis-${sIdx}`}>
                      <path
                        d={seg}
                        stroke="#fbbf24"
                        strokeWidth="10"
                        fill="none"
                        opacity="0.15"
                        strokeLinecap="round"
                      />
                      <path
                        d={seg}
                        stroke="#f59e0b"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.8"
                        strokeLinecap="round"
                      />
                      <path
                        d={seg}
                        stroke="transparent"
                        strokeWidth="35"
                        fill="none"
                        className="cursor-pointer"
                        onMouseEnter={() => setLineHoverInfo("Sunrise Path: The Sun sweeps above the horizon line (06:00 to 18:00) during daytime.")}
                        onMouseLeave={() => setLineHoverInfo(null)}
                      />
                    </g>
                  ))}

                  {/* Sunset Path (Sun is below horizon line, y > 500) */}
                  {sunInvisibleSegments.map((seg, sIdx) => (
                    <g key={`sun-invis-${sIdx}`}>
                      <path
                        d={seg}
                        stroke="#d97706"
                        strokeWidth="3.5"
                        strokeDasharray="6,6"
                        fill="none"
                        opacity="0.5"
                        strokeLinecap="round"
                      />
                      <path
                        d={seg}
                        stroke="transparent"
                        strokeWidth="35"
                        fill="none"
                        className="cursor-pointer"
                        onMouseEnter={() => setLineHoverInfo("Sunset Path: The Sun dips below the horizon line (18:00 to 06:00), lighting the outer hemisphere.")}
                        onMouseLeave={() => setLineHoverInfo(null)}
                      />
                    </g>
                  ))}
                </>
              )}

              {/* ---------------- MOON'S PATH (Curved above & below horizon) ---------------- */}
              {/* Moonrise Path (Moon is above horizon line, y < 500) */}
              {moonVisibleSegments.map((seg, sIdx) => (
                <g key={`moon-vis-${sIdx}`}>
                  <path
                    d={seg}
                    stroke="#60a5fa"
                    strokeWidth="9"
                    fill="none"
                    opacity="0.15"
                    strokeLinecap="round"
                  />
                  <path
                    d={seg}
                    stroke="#3b82f6"
                    strokeWidth="4"
                    fill="none"
                    opacity="0.85"
                    strokeLinecap="round"
                  />
                  <path
                    d={seg}
                    stroke="transparent"
                    strokeWidth="35"
                    fill="none"
                    className="cursor-pointer"
                    onMouseEnter={() => setLineHoverInfo("Moon Rise Path: The Moon sweeps above the horizon, visible based on illumination and daylight glare filters.")}
                    onMouseLeave={() => setLineHoverInfo(null)}
                  />
                </g>
              ))}

              {/* Moonset Path (Moon is below horizon line, y > 500) */}
              {moonInvisibleSegments.map((seg, sIdx) => (
                <g key={`moon-invis-${sIdx}`}>
                  <path
                    d={seg}
                    stroke="#818cf8"
                    strokeWidth="3.5"
                    strokeDasharray="6,6"
                    fill="none"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={seg}
                    stroke="transparent"
                    strokeWidth="35"
                    fill="none"
                    className="cursor-pointer"
                    onMouseEnter={() => setLineHoverInfo("Moon Set Path: The Moon dips into the occulted South horizon quadrant, completely hidden from human sight.")}
                    onMouseLeave={() => setLineHoverInfo(null)}
                  />
                </g>
              ))}

               {/* ---------------- ACTIVE BODIES NODES ---------------- */}
               {/* Sun Active Body node */}
               {showSun && (
                 <g transform={`translate(${activeSunX}, ${activeSunY})`} className="transition-all duration-500">
                   {isDaytime && (
                     <circle r="35" fill="#f59e0b" opacity="0.3" className="animate-pulse" />
                   )}
                   {/* Horizon glow when near rise/set */}
                   {Math.abs(activeSunY - 500) < 80 && (
                     <circle r="55" fill="#fbbf24" opacity="0.15" className="animate-pulse" />
                   )}
                   <text
                     x="0"
                     y="12"
                     textAnchor="middle"
                     fontSize="42"
                     style={{
                       filter: isDaytime ? "drop-shadow(0px 0px 10px rgba(245, 158, 11, 0.95))" : "grayscale(100%) opacity(0.3)"
                     }}
                   >
                     ☀️
                   </text>
                   <text
                     x="0"
                     y="-35"
                     textAnchor="middle"
                     fill="#f59e0b"
                     fontSize="18"
                     fontWeight="black"
                     fontFamily="monospace"
                   >
                     Sun
                   </text>
                 </g>
               )}

               {/* Moon Active Body node */}
               <g transform={`translate(${activeMoonX}, ${activeMoonY})`} className="transition-all duration-500">
                 {/* Horizon glow when near rise/set */}
                 {Math.abs(activeMoonY - 500) < 80 && (
                   <circle r="55" fill="#3b82f6" opacity="0.2" className="animate-pulse" />
                 )}
                 {activeMoonY < 500 && (
                   <circle r="35" fill="#3b82f6" opacity="0.3" className="animate-pulse" />
                 )}
                 <text
                   x="0"
                   y="12"
                   textAnchor="middle"
                   fontSize="42"
                   style={{
                     filter: activeMoonY < 500 ? "drop-shadow(0px 0px 8px rgba(59, 130, 246, 0.8))" : "grayscale(100%) opacity(0.3)"
                   }}
                 >
                   {lunarStatus.phase.emoji}
                 </text>
                 <text
                   x="0"
                   y="-35"
                   textAnchor="middle"
                   fill="#93c5fd"
                   fontSize="18"
                   fontWeight="black"
                   fontFamily="monospace"
                 >
                   Moon
                 </text>
                 <text
                   x="0"
                   y="48"
                   textAnchor="middle"
                   fill={moonVisibility.status === "VISIBLE" ? "#4ade80" : (activeMoonY < 500 ? "#fbbf24" : "#f87171")}
                   fontSize="16"
                   fontWeight="black"
                   fontFamily="monospace"
                 >
                   {moonVisibility.status}
                 </text>
               </g>

               {/* Current Time Indicator Vertical Line */}
               <line x1={1000 - (currentHourDecimal / 24) * 1000} y1="0" x2={1000 - (currentHourDecimal / 24) * 1000} y2="1000" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="3,3" opacity="0.4" />

                {/* Observer Dot ("You are here") */}
                <g transform="translate(500, 520)">
                  <circle r="8" fill="#fbbf24" opacity="0.9" />
                  <circle r="12" fill="#fbbf24" opacity="0.3" className="animate-ping" />
                  <text x="0" y="30" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="black" fontFamily="monospace">
                    👁️ YOU
                  </text>
                </g>
             </svg>
           </div>
          )}

          {/* COMPASS CLOCK VIEWPORT — Display 1 */}
          {displayMode === "compass" && (
            <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[360px] md:max-w-full bg-[#05060b] border border-slate-800 rounded-2xl mx-auto shadow-2xl flex items-center justify-center overflow-hidden p-2">
              <svg viewBox="0 0 400 400" className="w-full h-full text-slate-500">
                {/* Cardinal ring */}
                <circle cx={compassCenter} cy={compassCenter} r={compassRadius + 18} fill="none" stroke="#1e293b" strokeWidth="1" />
                <circle cx={compassCenter} cy={compassCenter} r={compassRadius} fill="none" stroke="#a16207" strokeWidth="6" opacity="0.6" />

                {/* Cardinal labels: East=3 (right), West=9 (left), Zenith/North=12 (top), Nadir/South=6 (bottom) */}
                <text x={compassCenter + compassRadius + 22} y={compassCenter + 5} fill="#fbbf24" fontSize="18" fontWeight="black" fontFamily="monospace" textAnchor="middle">E</text>
                <text x={compassCenter - compassRadius - 22} y={compassCenter + 5} fill="#fbbf24" fontSize="18" fontWeight="black" fontFamily="monospace" textAnchor="middle">W</text>
                <text x={compassCenter} y={compassCenter - compassRadius - 14} fill="#a16207" fontSize="18" fontWeight="black" fontFamily="monospace" textAnchor="middle">ZENITH</text>
                <text x={compassCenter} y={compassCenter + compassRadius + 30} fill="#3b82f6" fontSize="18" fontWeight="black" fontFamily="monospace" textAnchor="middle">INVISIBLE</text>

                {/* Hour ticks */}
                {Array.from({ length: 24 }).map((_, h) => {
                  const ang = (getCompassAngle(h) * Math.PI) / 180;
                  const x1 = compassCenter + (compassRadius - 8) * Math.cos(ang);
                  const y1 = compassCenter - (compassRadius - 8) * Math.sin(ang);
                  const x2 = compassCenter + compassRadius * Math.cos(ang);
                  const y2 = compassCenter - compassRadius * Math.sin(ang);
                  const isSpecial = h % 3 === 0;
                  return (
                    <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isSpecial ? "#fbbf24" : "#475569"} strokeWidth={isSpecial ? 3 : 1.5} opacity={isSpecial ? 0.9 : 0.5} />
                  );
                })}

                {/* Visible arc (moonrise -> zenith -> moonset) */}
                <path d={visibleArc} fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                {/* Invisible arc (moonset -> nadir -> moonrise, traversed backwards) */}
                <path d={invisibleArc} fill="none" stroke="#818cf8" strokeWidth="3" strokeDasharray="5,5" opacity="0.5" />

                {/* Sun marker */}
                {showSun && (
                  <g transform={`translate(${currentSunCompass.x}, ${currentSunCompass.y})`} className="transition-all duration-500">
                    <text x="0" y="14" textAnchor="middle" fontSize="34" style={{ filter: isDaytime ? "drop-shadow(0px 0px 8px rgba(245,158,11,0.9))" : "grayscale(100%) opacity(0.3)" }}>☀️</text>
                  </g>
                )}

                {/* Moon tip marker */}
                <g transform={`translate(${currentMoonCompass.x}, ${currentMoonCompass.y})`} className="transition-all duration-500">
                  {activeMoonY < 500 && <circle r="30" fill="#3b82f6" opacity="0.25" className="animate-pulse" />}
                  <text x="0" y="14" textAnchor="middle" fontSize="34" style={{ filter: activeMoonY < 500 ? "drop-shadow(0px 0px 8px rgba(59,130,246,0.85))" : "grayscale(100%) opacity(0.3)" }}>{lunarStatus.phase.emoji}</text>
                </g>

                {/* Observer dot at centre */}
                <g transform={`translate(${compassCenter}, ${compassCenter})`}>
                  <circle r="6" fill="#fbbf24" opacity="0.9" />
                  <circle r="10" fill="#fbbf24" opacity="0.3" className="animate-ping" />
                  <text x="0" y={-2} textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="black" fontFamily="monospace">YOU</text>
                </g>
              </svg>
            </div>
          )}

          {/* 3D GLOBE VIEWPORT — Display 3 */}
          {displayMode === "globe" && (
            <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[360px] md:max-w-full bg-[#05060b] border border-slate-800 rounded-2xl mx-auto shadow-2xl flex items-center justify-center overflow-hidden p-2">
              <svg viewBox="0 0 400 400" className="w-full h-full text-slate-500">
                {/* Back half of the orbital ring (behind earth) */}
                <ellipse cx={globeCx} cy={globeCy} rx={orbitRx} ry={orbitRy} fill="none" stroke="#1e3a8a" strokeWidth="3" opacity="0.45" transform={`rotate(${orbitTilt} ${globeCx} ${globeCy})`} strokeDasharray="2,6" />

                {/* 3D Earth */}
                <circle cx={globeCx} cy={globeCy} r={globeR} fill="#0b1220" stroke="#1d4ed8" strokeWidth="2" />
                <circle cx={globeCx} cy={globeCy} r={globeR} fill="url(#earthGrad)" opacity="0.6" />
                <defs>
                  <radialGradient id="earthGrad" cx="35%" cy="30%" r="80%">
                    <stop offset="0%" stopColor="#1e40af" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
                  </radialGradient>
                </defs>
                {/* equator line */}
                <line x1={globeCx - globeR} y1={globeCy} x2={globeCx + globeR} y2={globeCy} stroke="#22d3ee" strokeWidth="1" opacity="0.4" strokeDasharray="3,4" />

                {/* Front half of the orbital ring (in front of earth) */}
                <path
                  d={(() => {
                    const pts: string[] = [];
                    const steps = 80;
                    for (let i = 0; i <= steps; i++) {
                      const a = Math.PI + (Math.PI * i) / steps; // front arc over the top
                      const x = globeCx + orbitRx * Math.cos(a);
                      const y = globeCy + orbitRy * Math.sin(a);
                      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                    }
                    return `M ${pts.join(" L ")}`;
                  })()}
                  fill="none"
                  stroke={moonGlobeVisible ? "#3b82f6" : "#818cf8"}
                  strokeWidth="4"
                  opacity="0.9"
                  transform={`rotate(${orbitTilt} ${globeCx} ${globeCy})`}
                />

                {/* Moon on its orbit */}
                <g transform={`translate(${moonGlobeX}, ${moonGlobeY}) rotate(${orbitTilt})`} className="transition-all duration-500">
                  {moonGlobeVisible && <circle r="22" fill="#3b82f6" opacity="0.3" className="animate-pulse" />}
                  <text x="0" y="12" textAnchor="middle" fontSize="32" style={{ filter: moonGlobeVisible ? "drop-shadow(0px 0px 8px rgba(59,130,246,0.85))" : "grayscale(100%) opacity(0.3)" }}>{lunarStatus.phase.emoji}</text>
                </g>

                {/* Observer dot at the middle longitude (front-centre of the globe) */}
                <g transform={`translate(${observerX}, ${observerY})`}>
                  <circle r="6" fill="#fbbf24" opacity="0.95" />
                  <circle r="10" fill="#fbbf24" opacity="0.3" className="animate-ping" />
                  <text x="0" y="26" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="black" fontFamily="monospace">YOU</text>
                </g>

                <text x="200" y="388" fill="#334155" fontSize="11" fontFamily="monospace" textAnchor="middle">
                  Middle Longitude · Live Moon Position
                </text>
              </svg>
            </div>
          )}

          {/* Right column: Explanatory indicators and stats */}
          <div className="space-y-4">
            {/* Human Eye Visibility Analyzer */}
            <div className="p-4 rounded-2xl border border-indigo-900/50 bg-indigo-950/40 text-slate-300 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  👁️ Eye Visibility Analyzer
                </h4>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${moonVisibility.badgeColor}`}>
                  {moonVisibility.status}
                </span>
              </div>
              <p className="text-[11.5px] font-sans text-slate-200 leading-relaxed font-semibold">
                {moonVisibility.reason}
              </p>
              <p className="text-[10px] font-sans text-slate-400 leading-relaxed border-t border-slate-800/60 pt-2.5">
                💡 <span className="text-slate-300 font-semibold">Observation Rule:</span> Above the horizon line, visibility is calculated dynamically by matching the Moon's coordinates relative to the Sun's path. Solar glare or daylight scatters thin illumination, rendering them <span className="text-amber-400 font-bold">INVISIBLE</span>.
              </p>
            </div>

            {/* Scientific explanation — adapts to the active display */}
            <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 text-slate-300 space-y-2.5">
              <h4 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                {displayMode === "compass" && "🧭 Compass Clock Representation"}
                {displayMode === "wave" && "🌍 Horizon & Wave Trajectories"}
                {displayMode === "globe" && "🌐 3D Earth & Orbit Representation"}
              </h4>
              <p className="text-[10.5px] font-mono text-slate-400 leading-normal">
                {displayMode === "compass" &&
                  "Your hour-hand reads the Moon's perceptual position: East at 3, West at 9, Zenith overhead at 12. The solid arc is when the Moon is up; once it sets it sweeps the lower arc backwards. The dot at centre is you."}
                {displayMode === "wave" &&
                  "The bold horizon ruler represents East/West coordinates. The Sun sweeps above (daytime) and below (nighttime) the horizon. The Moon's path is mapped dynamically based on synodic age sways, rise, and set configurations."}
                {displayMode === "globe" &&
                  "A 3D Earth with a tilted orbital ring. The Moon is plotted live on that ring for your location; the dot at the globe's front is you, always at the middle longitude. Dimmed when below your horizon."}
              </p>
            </div>

            {/* Numeric Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Current Phase</span>
                <span className="text-xs font-bold text-slate-200 block mt-0.5">
                  {lunarStatus.phase.name} {lunarStatus.phase.emoji}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Illumination</span>
                <span className="text-xs font-bold text-slate-200 block mt-0.5">
                  {lunarStatus.illumination}%
                </span>
              </div>

              {/* Dynamic Season Label */}
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Season Parameter</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm">{getSeason(activeDate).icon}</span>
                  <span className="text-xs font-bold text-slate-200 block truncate">
                    {getSeason(activeDate).name}
                  </span>
                </div>
                <span className="text-[8.5px] text-slate-500 font-mono block mt-1 leading-none">
                  {getSeason(activeDate).desc}
                </span>
              </div>

              {/* Next active Astronomical Event */}
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Next Astro Event</span>
                <span className="text-xs font-bold text-yellow-400 block mt-0.5 truncate">
                  {getNextActiveEvent(activeDate).title}
                </span>
                <div className="flex items-center justify-between mt-1 text-[8px] font-mono">
                  <span className="text-slate-400">{getNextActiveEvent(activeDate).date}</span>
                  <span className="px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-yellow-500 uppercase font-extrabold">
                    {getNextActiveEvent(activeDate).rarity}
                  </span>
                </div>
              </div>

              {/* Declination offset from Sun's overhead latitude */}
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 col-span-2">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Moon vs Sun Overhead Latitude</span>
                <span className="text-xs font-bold text-blue-300 block mt-0.5">
                  {declinationOffsetDeg >= 0 ? "+" : ""}{declinationOffsetDeg}° {declinationOffsetDeg >= 0 ? "North of" : "South of"} the Sun
                </span>
                <span className="text-[8.5px] text-slate-500 font-mono block mt-1 leading-none">
                  Sun declination {sunDeclination.toFixed(1)}° · Moon declination {moonDeclination.toFixed(1)}°
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Today's Moon */}
      {showRealistic && (() => {
        let targetAge = (lunarStatus.age + cyclePhaseOffset * 3.69) % SYNODIC_MONTH;
        if (targetAge < 0) targetAge += SYNODIC_MONTH;
        const targetPhase = getMoonPhaseDetails(targetAge);
        const targetRiseSet = getMoonRiseSetTimes(targetAge);
        const targetIllum = getIllumination(targetAge);

        // Calculate the actual target date!
        const targetDate = new Date(activeDate.getTime() + cyclePhaseOffset * 3.69 * 24 * 60 * 60 * 1000);
        const formattedTargetDate = targetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });

        return (
          <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-1">
              <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
                🌕 Today's Moon
              </h3>
              
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-xs font-bold text-slate-200">
                <button
                  onClick={() => setCyclePhaseOffset(prev => prev - 1)}
                  className="text-slate-400 hover:text-yellow-400 p-0.5 transition-colors focus:outline-none"
                  title="Previous Phase"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 shrink-0 text-yellow-400">
                  {cyclePhaseOffset === 0 ? "Current Cycle" : `Forecast ${cyclePhaseOffset > 0 ? "+" : ""}${cyclePhaseOffset} (${formattedTargetDate})`}
                </span>
                <button
                  onClick={() => setCyclePhaseOffset(prev => prev + 1)}
                  className="text-slate-400 hover:text-yellow-400 p-0.5 transition-colors focus:outline-none"
                  title="Next Phase"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-2">
              <div className="space-y-3.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Dynamic Age sway</span>
                  <span className="text-sm font-bold font-mono text-yellow-400 block mt-0.5">
                    🌕 {targetAge.toFixed(2)} Days
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Orbital Proximity</span>
                  <span className="text-sm font-bold font-mono text-indigo-400 block mt-0.5">
                    🚀 {lunarStatus.proximityState}
                  </span>
                </div>
              </div>

              {/* Central high-contrast Realistic SVG Rendering */}
              <div className="flex flex-col items-center py-2">
                <div className="relative w-28 h-28 rounded-full overflow-hidden bg-slate-950 border-2 border-slate-850 shadow-2xl flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <pattern id="crater-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="1.5" fill="#1e293b" opacity="0.3" />
                      </pattern>
                      <radialGradient id="moon-shadow-grad">
                        <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                        <stop offset="95%" stopColor="#000000" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="1" />
                      </radialGradient>
                    </defs>

                    {/* 1. Underlying dark side/ash-glow background */}
                    <circle cx="50" cy="50" r="42" fill="#1e293b" opacity="0.25" />

                    {/* 2. Lighted crescent segment using custom spherical terminator math */}
                    <path
                      d={getMoonPhasePathLocal(targetAge, 42)}
                      fill="#fef08a"
                      className="transition-all duration-500"
                      style={{ filter: "drop-shadow(0px 0px 4px rgba(254, 240, 138, 0.5))" }}
                    />

                    {/* 3. Crater outlines overlay */}
                    <g opacity="0.45" pointerEvents="none">
                      <circle cx="42" cy="38" r="4" fill="#92400e" opacity="0.2" />
                      <circle cx="41" cy="37" r="2" fill="#78350f" opacity="0.25" />

                      <circle cx="58" cy="48" r="6.5" fill="#92400e" opacity="0.25" />
                      <circle cx="56" cy="46" r="4" fill="#78350f" opacity="0.3" />

                      <circle cx="56" cy="68" r="5.5" fill="#92400e" opacity="0.25" />
                      <circle cx="54.5" cy="66.5" r="3" fill="#78350f" opacity="0.3" />

                      <circle cx="44" cy="52" r="4" fill="#92400e" opacity="0.2" />
                      <circle cx="62" cy="28" r="3.5" fill="#92400e" opacity="0.2" />
                    </g>

                    {/* 4. 3D Spherical Shadow overlay to give depth */}
                    <circle cx="50" cy="50" r="42" fill="url(#moon-shadow-grad)" pointerEvents="none" />
                  </svg>
                </div>
                <span className="text-[11px] font-mono text-slate-400 mt-2 font-bold">
                  {targetPhase.name} {targetPhase.emoji}
                </span>
              </div>

              {/* Rise and Set metrics inside the phase card */}
              <div className="space-y-3.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Moon Rise Time</span>
                  <span className="text-sm font-bold font-mono text-yellow-400 flex items-center gap-1.5 mt-0.5">
                    🌅 {targetRiseSet.rise}
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Moon Set Time</span>
                  <span className="text-sm font-bold font-mono text-indigo-400 flex items-center gap-1.5 mt-0.5">
                    🌇 {targetRiseSet.set}
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-2 flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Illumination:</span>
                  <span className="font-bold text-slate-300">{targetIllum}%</span>
                </div>
              </div>
            </div>

            <p className="text-[9.5px] font-mono text-slate-500 leading-normal">
              Forecast parameters are based on simulated synodic sways. Use arrows at top-right to forecast future cycles.
            </p>
          </section>
        );
      })()}

      {/* 3. Weather & Local Conditions */}
      <section className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest mb-3">
          🌤️ Local Weather Conditions
        </h3>
        {weatherLoading ? (
          <p className="text-[10px] font-mono text-slate-400">Fetching weather data...</p>
        ) : weather ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Temperature</span>
              <span className="text-sm font-bold text-slate-200 font-mono flex items-center justify-center gap-1 mt-1">
                <Thermometer className="w-3.5 h-3.5 text-red-400" /> {weather.temp}°C
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Wind Speed</span>
              <span className="text-sm font-bold text-slate-200 font-mono flex items-center justify-center gap-1 mt-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" /> {weather.wind} km/h
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Condition</span>
              <span className="text-sm font-bold text-slate-200 font-mono flex items-center justify-center gap-1 mt-1">
                <Cloud className="w-3.5 h-3.5 text-slate-400" /> {weather.code === 0 ? 'Clear' : weather.code < 50 ? 'Cloudy' : 'Rain'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-slate-500">Weather data unavailable. Ensure location is set.</p>
        )}
      </section>

      {/* 4. Did You Know? */}
      <section className="bg-indigo-950/20 border border-indigo-900/30 p-5 rounded-2xl backdrop-blur-md">
        <h3 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> Did You Know?
        </h3>
        <p className="text-xs text-slate-300 font-sans leading-relaxed italic">
          {didYouKnow}
        </p>
      </section>

    </div>
  );
}
