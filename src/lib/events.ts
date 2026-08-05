export interface AstroEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'eclipse' | 'transit' | 'meteor-shower' | 'supermoon' | 'alignment';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  imagePlaceholder: string;
  comments: any[];
}

export const astroCatalogue: AstroEvent[] = [
  {
    id: "quadrantids-2026",
    title: "Quadrantids Meteor Shower Peak",
    description: "The first major meteor shower of the year. Known for producing bright blue meteors running at 41 km/s, peaking under dark pre-dawn skies with up to 120 meteors per hour.",
    date: "2026-01-03",
    type: "meteor-shower",
    rarity: "rare",
    imagePlaceholder: "quadrantids_preview",
    comments: []
  },
  {
    id: "apogee-feb-2026",
    title: "Lunar Apogee (Farthest Moon)",
    description: "The Moon reaches its maximum orbital distance from Earth (approximately 406,500 km). During this apogee, the lunar disk appears 14% smaller than a Supermoon, referred to as a Micromoon.",
    date: "2026-02-17",
    type: "alignment",
    rarity: "uncommon",
    imagePlaceholder: "apogee_preview",
    comments: []
  },
  {
    id: "total-lunar-eclipse-2026",
    title: "Total Lunar Eclipse (Blood Moon)",
    description: "A legendary alignment where the Earth passes directly between the Sun and Moon. The Earth's shadow fully covers the moon, refracting amber light to create a dramatic deep-red Blood Moon.",
    date: "2026-03-03",
    type: "eclipse",
    rarity: "legendary",
    imagePlaceholder: "lunar_eclipse_preview",
    comments: []
  },
  {
    id: "lyrids-2026",
    title: "Lyrids Meteor Shower Peak",
    description: "One of the oldest recorded meteor showers. The debris from Comet C/1861 G1 Thatcher collides with our atmosphere, leaving glowing dust trains that can persist for several seconds.",
    date: "2026-04-22",
    type: "meteor-shower",
    rarity: "uncommon",
    imagePlaceholder: "lyrids_preview",
    comments: []
  },
  {
    id: "eta-aquariids-2026",
    title: "Eta Aquariids Meteor Shower",
    description: "Debris from the famous Halley's Comet peaks tonight. Skywatchers in equatorial regions will enjoy high-velocity meteors visible in the eastern sky right before dawn.",
    date: "2026-05-05",
    type: "meteor-shower",
    rarity: "rare",
    imagePlaceholder: "eta_aquariids_preview",
    comments: []
  },
  {
    id: "jupiter-opposition-2026",
    title: "Jupiter Oppositional Alignment",
    description: "The gas giant is positioned directly opposite the Sun from our perspective. It rises at sunset, shines brighter than any star at magnitude -2.9, and its four Galilean moons are visible with simple binoculars.",
    date: "2026-06-15",
    type: "alignment",
    rarity: "rare",
    imagePlaceholder: "jupiter_opposition_preview",
    comments: []
  },
  {
    id: "iss-lunar-transit-2026",
    title: "ISS Lunar Transit",
    description: "A high-precision transit where the International Space Station flies directly across the face of the Moon. Visible in a narrow path, the silhouette crosses in less than a second.",
    date: "2026-07-15",
    type: "transit",
    rarity: "epic",
    imagePlaceholder: "iss_moon_transit",
    comments: []
  },
  {
    id: "buck-supermoon-2026",
    title: "Buck Supermoon (Lunar Perigee)",
    description: "The Moon reaches its absolute perigee (closest approach to Earth at 356,800 km) coinciding with a Full Moon. It glows 30% brighter and appears 14% larger than average.",
    date: "2026-07-21",
    type: "supermoon",
    rarity: "uncommon",
    imagePlaceholder: "supermoon_preview",
    comments: []
  },
  {
    id: "eclipse-aug-2026",
    title: "Total Solar Eclipse 2026",
    description: "The highly anticipated Total Solar Eclipse of August 12, 2026. The path of totality sweeps over the Arctic Ocean, Greenland, Iceland, and northern Spain, revealing a stellar corona.",
    date: "2026-08-12",
    type: "eclipse",
    rarity: "legendary",
    imagePlaceholder: "eclipse_2026_preview",
    comments: []
  },
  {
    id: "perseids-2026",
    title: "Perseids Meteor Shower Peak",
    description: "Considered the best annual meteor shower. Known for producing fast, bright meteors and fireballs. Under peak conditions, up to 100 meteors per hour can be tracked in dark skies.",
    date: "2026-08-13",
    type: "meteor-shower",
    rarity: "rare",
    imagePlaceholder: "perseids_meteor_preview",
    comments: []
  },
  {
    id: "autumnal-equinox-2026",
    title: "Autumnal Equinox Alignment",
    description: "The Sun crosses the celestial equator going south, marking the official start of Autumn in the northern hemisphere. Day and night are of precisely equal length worldwide.",
    date: "2026-09-21",
    type: "alignment",
    rarity: "common",
    imagePlaceholder: "equinox_preview",
    comments: []
  },
  {
    id: "orionids-2026",
    title: "Orionids Meteor Shower",
    description: "A medium-strength shower originating from Halley's Comet dust. Known for fast meteors that occasionally leave persistent trains and produce brilliant fireballs.",
    date: "2026-10-21",
    type: "meteor-shower",
    rarity: "uncommon",
    imagePlaceholder: "orionids_preview",
    comments: []
  },
  {
    id: "leonids-2026",
    title: "Leonids Meteor Shower Peak",
    description: "Peaking tonight with fast-moving meteors (71 km/s). Leonids are famous for producing spectacular meteor storms about every 33 years, leaving green-colored ionized gas trails.",
    date: "2026-11-17",
    type: "meteor-shower",
    rarity: "rare",
    imagePlaceholder: "leonids_preview",
    comments: []
  },
  {
    id: "geminids-2026",
    title: "Geminids Meteor Shower Peak",
    description: "The undisputed king of meteor showers. Driven by the asteroid 3200 Phaethon rather than a comet, Geminids are highly active, colorful, and slow-moving, peaking at 150 meteors/hour.",
    date: "2026-12-14",
    type: "meteor-shower",
    rarity: "epic",
    imagePlaceholder: "geminids_preview",
    comments: []
  },
  {
    id: "winter-solstice-2026",
    title: "Winter Solstice Supermoon",
    description: "The longest night of the year is super-charged by a lunar perigee alignment. The Full Cold Moon rises exceptionally high in the winter sky, casting sharp shadows over snowy landscapes.",
    date: "2026-12-21",
    type: "supermoon",
    rarity: "rare",
    imagePlaceholder: "winter_solstice_preview",
    comments: []
  }
];

export function getSeason(date: Date): { name: string; icon: string; desc: string } {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();
  
  if ((month === 11 && day >= 21) || month === 0 || month === 1 || (month === 2 && day < 20)) {
    return { name: "Winter Solstice Season", icon: "❄️", desc: "Deep solar slumber, high lunar culmination" };
  }
  if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day < 21)) {
    return { name: "Vernal Equinox Season", icon: "🌱", desc: "Balanced day and night, rapid greening" };
  }
  if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day < 22)) {
    return { name: "Summer Solstice Season", icon: "☀️", desc: "Maximum solar zenith, low crescent paths" };
  }
  return { name: "Autumnal Equinox Season", icon: "🍂", desc: "Celestial balance, harvest and descent" };
}

export function getNextActiveEvent(date: Date): AstroEvent {
  const sorted = [...astroCatalogue].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = sorted.find(e => new Date(e.date).getTime() >= date.getTime());
  return next || sorted[0];
}

export function getMoonRiseSetTimes(age: number, sunriseHour: number = 6) {
  // Offset of moon rise from sun rise in hours
  const riseHourOffset = (age / 29.53) * 24;
  let riseHour = (sunriseHour + riseHourOffset) % 24;
  let setHour = (riseHour + 12) % 24;

  const formatHour = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    const ampm = hh >= 12 ? "PM" : "AM";
    const displayHour = hh % 12 === 0 ? 12 : hh % 12;
    return `${displayHour}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  return {
    rise: formatHour(riseHour),
    set: formatHour(setHour),
    riseDecimal: riseHour,
    setDecimal: setHour
  };
}
