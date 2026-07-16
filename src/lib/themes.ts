// WHITE Search — theme system
// Eight variations of WHITE. Clean. Calm. Considered.

import type { AccentName, Density, FontScale, WhiteTheme } from "@/lib/types";

export interface ThemeDef {
  id: WhiteTheme;
  name: string;
  swatch: string; // background color
  surface: string; // card surface
  whisper: string; // subtle tint for hover/muted
  description: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "pure",
    name: "Pure White",
    swatch: "#ffffff",
    surface: "#ffffff",
    whisper: "#fafafa",
    description: "The original. Absolute clarity. Nothing in the way.",
  },
  {
    id: "ivory",
    name: "Ivory",
    swatch: "#fffff0",
    surface: "#fffdf5",
    whisper: "#f7f3e3",
    description: "Warm paper. Easier on the eyes for long reading.",
  },
  {
    id: "snow",
    name: "Snow",
    swatch: "#fffafa",
    surface: "#fffefe",
    whisper: "#fbeaea",
    description: "A breath of crimson inside white. Soft, awake.",
  },
  {
    id: "pearl",
    name: "Pearl",
    swatch: "#f8f8ff",
    surface: "#fcfcff",
    whisper: "#ececf7",
    description: "Ghost white with a mineral glow.",
  },
  {
    id: "alabaster",
    name: "Alabaster",
    swatch: "#fafafa",
    surface: "#ffffff",
    whisper: "#f0f0f0",
    description: "Studio white. Neutral, professional, quiet.",
  },
  {
    id: "ghost",
    name: "Ghost",
    swatch: "#f7f7f8",
    surface: "#fbfbfc",
    whisper: "#ededee",
    description: "The faintest gray. Maximum focus, minimum glare.",
  },
  {
    id: "seashell",
    name: "Seashell",
    swatch: "#fff5ee",
    surface: "#fffaf3",
    whisper: "#f3e6d5",
    description: "Warm coastal light. Gentle, human.",
  },
  {
    id: "mint",
    name: "Mint Cream",
    swatch: "#f5fffa",
    surface: "#fafffc",
    whisper: "#dcefdf",
    description: "A whisper of green. Clean as morning air.",
  },
  // Dark themes — the same clean philosophy, inverted
  {
    id: "midnight",
    name: "Midnight",
    swatch: "#0a0a0b",
    surface: "#131316",
    whisper: "#1c1c20",
    description: "Pure dark. The night sky of search.",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    swatch: "#18181b",
    surface: "#1e1e22",
    whisper: "#27272a",
    description: "Warm dark gray. Easy on the eyes after sunset.",
  },
  {
    id: "slate",
    name: "Slate Dark",
    swatch: "#1e293b",
    surface: "#243044",
    whisper: "#334155",
    description: "Cool blue-dark. Focused and calm.",
  },
];

export const THEME_MAP: Record<WhiteTheme, ThemeDef> = THEMES.reduce(
  (acc, t) => ((acc[t.id] = t), acc),
  {} as Record<WhiteTheme, ThemeDef>
);

export interface AccentDef {
  id: AccentName;
  name: string;
  color: string; // hex used for the focus ring / active accent
  soft: string; // soft background tint
}

export const ACCENTS: AccentDef[] = [
  { id: "graphite", name: "Graphite", color: "#1a1a1a", soft: "rgba(26,26,26,0.06)" },
  { id: "sage", name: "Sage", color: "#5a7a5a", soft: "rgba(90,122,90,0.08)" },
  { id: "rose", name: "Rose", color: "#b56576", soft: "rgba(181,101,118,0.08)" },
  { id: "amber", name: "Amber", color: "#b8860b", soft: "rgba(184,134,11,0.08)" },
  { id: "slate", name: "Slate", color: "#475569", soft: "rgba(71,85,105,0.08)" },
];

export const ACCENT_MAP: Record<AccentName, AccentDef> = ACCENTS.reduce(
  (acc, a) => ((acc[a.id] = a), acc),
  {} as Record<AccentName, AccentDef>
);

export const DENSITY_PADDING: Record<Density, { card: string; gap: string; list: string }> = {
  comfortable: { card: "p-5", gap: "gap-4", list: "gap-4" },
  compact: { card: "p-3", gap: "gap-2", list: "gap-2" },
  airy: { card: "p-7", gap: "gap-7", list: "gap-6" },
};

export const FONT_SCALE_CLASS: Record<FontScale, string> = {
  small: "text-[13px]",
  base: "text-[15px]",
  large: "text-[17px]",
};

// Dark theme detection
export const DARK_THEMES: WhiteTheme[] = ["midnight", "charcoal", "slate"];
export function isDarkTheme(theme: WhiteTheme): boolean {
  return DARK_THEMES.includes(theme);
}

// Apply a theme + accent + density to :root as CSS custom properties + data attrs.
// If customAccentHex is provided, it overrides the preset accent color.
export function applyTheme(
  theme: WhiteTheme,
  accent: AccentName,
  density?: Density,
  fontScale?: FontScale,
  customAccentHex?: string | null
) {
  if (typeof document === "undefined") return;
  const t = THEME_MAP[theme];
  const a = ACCENT_MAP[accent];
  const root = document.documentElement;
  root.style.setProperty("--ws-bg", t.swatch);
  root.style.setProperty("--ws-surface", t.surface);
  root.style.setProperty("--ws-whisper", t.whisper);
  const accentColor = customAccentHex || a.color;
  const soft = customAccentHex ? hexToSoft(customAccentHex) : a.soft;
  root.style.setProperty("--ws-accent", accentColor);
  root.style.setProperty("--ws-accent-soft", soft);
  root.style.setProperty("--ws-accent-rgb", hexToRgb(accentColor));
  root.dataset.wsTheme = theme;
  root.dataset.wsAccent = customAccentHex ? "custom" : accent;

  // Set foreground color based on whether this is a dark theme
  const dark = isDarkTheme(theme);
  root.style.setProperty("--foreground", dark ? "#e8e8ea" : "#1a1a1a");
  root.style.setProperty("--background", t.swatch);
  root.style.setProperty("--card", t.surface);
  root.style.setProperty("--card-foreground", dark ? "#e8e8ea" : "#1a1a1a");
  root.style.setProperty("--border", dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)");
  root.style.setProperty("--input", dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)");
  root.style.setProperty("--muted-foreground", dark ? "rgba(232,232,234,0.55)" : "rgba(26,26,26,0.55)");
  root.style.colorScheme = dark ? "dark" : "light";

  if (density) root.dataset.density = density;
  if (fontScale) root.dataset.fontScale = fontScale;
}

function hexToSoft(hex: string): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb}, 0.08)`;
}

function hexToRgb(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
