// Client-side Weather Glyph helpers — mirrors WeatherGlyph.sol logic.

export type ClimateZone = "Unset" | "Temperate" | "Tropical" | "Arid" | "Arctic" | "Oceanic";
export type Season = "Spring" | "Summer" | "Autumn" | "Winter";
export type Hemisphere = "Northern" | "Southern";

export const ZONE_LABELS: ClimateZone[] = ["Unset", "Temperate", "Tropical", "Arid", "Arctic", "Oceanic"];
export const ZONE_IDS: Record<ClimateZone, number> = {
  Unset: 0, Temperate: 1, Tropical: 2, Arid: 3, Arctic: 4, Oceanic: 5,
};

export function currentSeason(utcMonth: number, hemisphere: "Northern" | "Southern"): Season {
  let northSeason: Season;
  if (utcMonth >= 3 && utcMonth <= 5)        northSeason = "Spring";
  else if (utcMonth >= 6 && utcMonth <= 8)   northSeason = "Summer";
  else if (utcMonth >= 9 && utcMonth <= 11)  northSeason = "Autumn";
  else                                        northSeason = "Winter";

  if (hemisphere === "Northern") return northSeason;
  const seasons: Season[] = ["Spring", "Summer", "Autumn", "Winter"];
  return seasons[(seasons.indexOf(northSeason) + 2) % 4];
}

// Map season × zone → ambient theme override for HeraldryDisplay
export interface AmbientTheme {
  primary: string;
  bg: string;
  glow1: string;
  glow2: string;
  label: string;
}

const SEASONAL_THEMES: Record<Season, Record<ClimateZone, AmbientTheme>> = {
  Winter: {
    Unset:     { primary: "#94a3b8", bg: "#050810", glow1: "rgba(148,163,184,0.28)", glow2: "rgba(100,140,200,0.18)", label: "Winter" },
    Temperate: { primary: "#b0c4de", bg: "#050810", glow1: "rgba(176,196,222,0.28)", glow2: "rgba(80,120,180,0.18)", label: "Temperate Winter" },
    Tropical:  { primary: "#34d399", bg: "#030806", glow1: "rgba(52,211,153,0.28)",  glow2: "rgba(16,185,129,0.18)", label: "Tropical Dry Season" },
    Arid:      { primary: "#d4a030", bg: "#060400", glow1: "rgba(212,160,48,0.28)",  glow2: "rgba(180,83,9,0.18)",   label: "Arid Cool Season" },
    Arctic:    { primary: "#e2e8f0", bg: "#020508", glow1: "rgba(226,232,240,0.30)", glow2: "rgba(148,163,184,0.20)", label: "Polar Winter" },
    Oceanic:   { primary: "#60a5fa", bg: "#030508", glow1: "rgba(96,165,250,0.28)",  glow2: "rgba(37,99,235,0.18)",  label: "Oceanic Winter" },
  },
  Spring: {
    Unset:     { primary: "#86efac", bg: "#030604", glow1: "rgba(134,239,172,0.28)", glow2: "rgba(74,222,128,0.18)", label: "Spring" },
    Temperate: { primary: "#a7f3d0", bg: "#030604", glow1: "rgba(167,243,208,0.28)", glow2: "rgba(52,211,153,0.18)", label: "Temperate Spring" },
    Tropical:  { primary: "#34d399", bg: "#030806", glow1: "rgba(52,211,153,0.30)",  glow2: "rgba(16,185,129,0.20)", label: "Tropical Wet Season" },
    Arid:      { primary: "#fbbf24", bg: "#060400", glow1: "rgba(251,191,36,0.28)",  glow2: "rgba(245,158,11,0.18)", label: "Arid Bloom" },
    Arctic:    { primary: "#7dd3fc", bg: "#030608", glow1: "rgba(125,211,252,0.28)", glow2: "rgba(56,189,248,0.18)", label: "Arctic Thaw" },
    Oceanic:   { primary: "#6ee7b7", bg: "#030604", glow1: "rgba(110,231,183,0.28)", glow2: "rgba(52,211,153,0.18)", label: "Oceanic Spring" },
  },
  Summer: {
    Unset:     { primary: "#fbbf24", bg: "#060400", glow1: "rgba(251,191,36,0.32)",  glow2: "rgba(245,158,11,0.22)", label: "Summer" },
    Temperate: { primary: "#fcd34d", bg: "#060500", glow1: "rgba(252,211,77,0.30)",  glow2: "rgba(251,191,36,0.20)", label: "Temperate Summer" },
    Tropical:  { primary: "#f97316", bg: "#070300", glow1: "rgba(249,115,22,0.32)",  glow2: "rgba(234,88,12,0.22)",  label: "Tropical High Summer" },
    Arid:      { primary: "#ef4444", bg: "#070200", glow1: "rgba(239,68,68,0.32)",   glow2: "rgba(220,38,38,0.22)",  label: "Arid Heat" },
    Arctic:    { primary: "#a5f3fc", bg: "#030608", glow1: "rgba(165,243,252,0.28)", glow2: "rgba(103,232,249,0.18)", label: "Arctic Midnight Sun" },
    Oceanic:   { primary: "#1e8cff", bg: "#030508", glow1: "rgba(30,140,255,0.30)",  glow2: "rgba(59,130,246,0.20)", label: "Oceanic Summer" },
  },
  Autumn: {
    Unset:     { primary: "#fb923c", bg: "#060300", glow1: "rgba(251,146,60,0.30)",  glow2: "rgba(234,88,12,0.20)",  label: "Autumn" },
    Temperate: { primary: "#f97316", bg: "#060300", glow1: "rgba(249,115,22,0.30)",  glow2: "rgba(180,60,0,0.20)",   label: "Temperate Autumn" },
    Tropical:  { primary: "#34d399", bg: "#030806", glow1: "rgba(52,211,153,0.28)",  glow2: "rgba(16,185,129,0.18)", label: "Tropical Transition" },
    Arid:      { primary: "#d4a030", bg: "#060400", glow1: "rgba(212,160,48,0.28)",  glow2: "rgba(180,83,9,0.18)",   label: "Arid Cooling" },
    Arctic:    { primary: "#94a3b8", bg: "#050608", glow1: "rgba(148,163,184,0.28)", glow2: "rgba(100,116,139,0.18)", label: "Arctic Freeze" },
    Oceanic:   { primary: "#a78bfa", bg: "#050408", glow1: "rgba(167,139,250,0.28)", glow2: "rgba(139,92,246,0.18)", label: "Oceanic Autumn" },
  },
};

export function getAmbientTheme(zone: ClimateZone, season: Season): AmbientTheme {
  return SEASONAL_THEMES[season][zone] ?? SEASONAL_THEMES[season]["Unset"];
}

export function nowUtcMonth(): number {
  return new Date().getUTCMonth() + 1; // 1-indexed
}
