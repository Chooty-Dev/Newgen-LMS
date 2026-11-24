export interface CardTheme {
  id: string;
  name: string;
  description: string;
  category: "light" | "mid";
  swatch: string; // Hex color for the circular swatch icon
  border: string;
  bg: string;
  accent: string;
}

export const CARD_THEMES: CardTheme[] = [
  // --- 1. Light Pastels ---
  {
    id: "default",
    name: "Classic Blue",
    description: "Newgen soft blue & clean slate theme",
    category: "light",
    swatch: "#184880",
    border: "#DDE8F8",
    bg: "#F4F8FD",
    accent: "#184880",
  },
  {
    id: "sage",
    name: "Botanical Sage",
    description: "Gentle mint & botanical sage green",
    category: "light",
    swatch: "#10B981",
    border: "#D5E8DD",
    bg: "#F3F8F5",
    accent: "#0F766E",
  },
  {
    id: "lavender",
    name: "Soft Lavender",
    description: "Delicate lilac with royal violet accents",
    category: "light",
    swatch: "#8B5CF6",
    border: "#E6DCFA",
    bg: "#F8F5FD",
    accent: "#7C3AED",
  },
  {
    id: "amber",
    name: "Warm Amber",
    description: "Golden honey amber with warm starlight",
    category: "light",
    swatch: "#F59E0B",
    border: "#F7E9C4",
    bg: "#FDF9F0",
    accent: "#B45309",
  },
  {
    id: "rose",
    name: "Rose Blush",
    description: "Subtle coral rose with crimson highlights",
    category: "light",
    swatch: "#EC4899",
    border: "#FAD9E0",
    bg: "#FDF5F6",
    accent: "#BE185D",
  },
  {
    id: "sky",
    name: "Cerulean Sky",
    description: "Crisp ocean cerulean and airy blue",
    category: "light",
    swatch: "#0EA5E9",
    border: "#CFE6FD",
    bg: "#F0F8FF",
    accent: "#0284C7",
  },
  {
    id: "pearl",
    name: "Minimal Slate",
    description: "Pure white surface with clean zinc borders",
    category: "light",
    swatch: "#94A3B8",
    border: "#E4E4E7",
    bg: "#FAFAFA",
    accent: "#27272A",
  },

  // --- 2. Fresh Mid-Tones ---
  {
    id: "mint",
    name: "Fresh Mint",
    description: "Fresh botanical green with crisp emerald notes",
    category: "mid",
    swatch: "#059669",
    border: "#BBF7D0",
    bg: "#F0FDF4",
    accent: "#047857",
  },
  {
    id: "violet",
    name: "Royal Violet",
    description: "Vibrant royal violet with soft lavender base",
    category: "mid",
    swatch: "#6D28D9",
    border: "#DDD6FE",
    bg: "#F5F3FF",
    accent: "#5B21B6",
  },
  {
    id: "peach",
    name: "Sun Peach",
    description: "Warm sunrise apricot and soft peach",
    category: "mid",
    swatch: "#F97316",
    border: "#FED7AA",
    bg: "#FFF7ED",
    accent: "#EA580C",
  },
  {
    id: "coral",
    name: "Warm Coral",
    description: "Crimson coral with delicate petal pink",
    category: "mid",
    swatch: "#E11D48",
    border: "#FECDD3",
    bg: "#FFF1F2",
    accent: "#BE123C",
  },
  {
    id: "teal",
    name: "Ocean Teal",
    description: "Coastal turquoise teal and crisp cyan",
    category: "mid",
    swatch: "#0D9488",
    border: "#99F6E4",
    bg: "#F0FDFA",
    accent: "#0F766E",
  },
  {
    id: "indigo",
    name: "Deep Indigo",
    description: "Soft modern indigo with balanced contrast",
    category: "mid",
    swatch: "#4F46E5",
    border: "#C7D2FE",
    bg: "#EEF2FF",
    accent: "#4338CA",
  },
];

// Quick bar presets (shown in the main bar)
export const QUICK_PRESETS = [
  CARD_THEMES[0], // default (#184880)
  CARD_THEMES[1], // sage (#10B981)
  CARD_THEMES[2], // lavender (#8B5CF6)
  CARD_THEMES[3], // amber (#F59E0B)
  CARD_THEMES[5], // sky (#0EA5E9)
  CARD_THEMES[11], // teal (#0D9488)
];
