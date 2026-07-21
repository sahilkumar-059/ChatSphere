/**
 * Premium wallpaper resolution service.
 * Maps wallpaper IDs to CSS background values.
 * Supports animated, AI, and user-uploaded wallpapers.
 */

export const WALLPAPER_MAP = {
  // Solid Colors
  "solid-1": "#0f172a",
  "solid-2": "#1e293b",
  "solid-3": "#1f2937",
  "solid-4": "#1e1b4b",
  "solid-5": "#0c0e1a",
  "solid-6": "#0d1b1e",
  "solid-7": "#0a0a0a",
  "solid-8": "#1a0c0c",
  "solid-9": "#0d1a0d",
  "solid-10": "#13102a",
  "solid-11": "#1a1410",
  "solid-12": "#1a202c",
  "solid-13": "#171717",
  "solid-14": "#090909",
  "solid-15": "#1a0f0a",
  "solid-16": "#2d1b69",
  "solid-17": "#0f3460",
  "solid-18": "#16213e",
  "solid-19": "#0b090a",
  "solid-20": "#10002b",

  // Gradients
  "grad-1": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  "grad-2": "linear-gradient(135deg, #1a0a2e, #2d1b69, #16213e)",
  "grad-3": "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  "grad-4": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  "grad-5": "linear-gradient(135deg, #0d0221, #150734, #0a0020)",
  "grad-6": "linear-gradient(135deg, #0b1a1a, #1a2f2f, #0d1d1d)",
  "grad-7": "linear-gradient(135deg, #1a0a0f, #2d1b1b, #1a0f0a)",
  "grad-8": "linear-gradient(135deg, #0a1628, #1a2f3f, #0d1d2d)",
  "grad-9": "linear-gradient(135deg, #1a0f1a, #2d1b2d, #1a0f14)",
  "grad-10": "linear-gradient(135deg, #1a1408, #2d2410, #1a1408)",
  "grad-11": "linear-gradient(135deg, #0a0015, #1a0030, #0d0015)",
  "grad-12": "linear-gradient(135deg, #1a0a0a, #2d1515, #1a0f0f)",
  "grad-13": "linear-gradient(135deg, #0f1a2a, #1a2f3f, #0f1a2a)",
  "grad-14": "linear-gradient(135deg, #0a1a0a, #1a2f1a, #0d1d0d)",
  "grad-15": "linear-gradient(135deg, #0c0c1a, #1a1a3f, #0c0c1a)",
  "grad-16": "linear-gradient(135deg, #240046, #3c096c, #5a189a)",
  "grad-17": "linear-gradient(135deg, #001219, #005f73, #0a9396)",
  "grad-18": "linear-gradient(135deg, #370617, #6a040f, #9d0208)",
  "grad-19": "linear-gradient(135deg, #03045e, #0077b6, #00b4d8)",
  "grad-20": "linear-gradient(135deg, #10002b, #240046, #3c096c)",

  // Dark
  "dark-1": "#020202",
  "dark-2": "#0a0a14",
  "dark-3": "#080808",
  "dark-4": "#040408",
  "dark-5": "#000000",
  "dark-6": "#0e0e12",
  "dark-7": "#050508",
  "dark-8": "#0c0c10",
  "dark-9": "#121216",
  "dark-10": "#0a0e1a",
  "dark-11": "#02040a",
  "dark-12": "#0a0a0e",
  "dark-13": "#060608",
  "dark-14": "#0e0a10",
  "dark-15": "#0a0604",

  // Nature
  "nat-1": "#0a140a",
  "nat-2": "#0f1520",
  "nat-3": "#0a1420",
  "nat-4": "#0a1a0a",
  "nat-5": "#1a1410",
  "nat-6": "#0a0a1a",
  "nat-7": "#0c1a0c",
  "nat-8": "#0f1a1a",
  "nat-9": "#1a120a",
  "nat-10": "#0a1a10",
  "nat-11": "#1a0a0a",
  "nat-12": "#0a1a14",
  "nat-13": "#141a0a",
  "nat-14": "#1a1a0a",
  "nat-15": "#0a141a",

  // Space
  "spc-1": "#0a0015",
  "spc-2": "#0a0020",
  "spc-3": "#0a0a1a",
  "spc-4": "#050510",
  "spc-5": "#0a0018",
  "spc-6": "#080818",
  "spc-7": "#1a0a0a",
  "spc-8": "#0a0a1a",
  "spc-9": "#020010",
  "spc-10": "#040015",
  "spc-11": "#080010",
  "spc-12": "#0c0018",
  "spc-13": "#060012",
  "spc-14": "#0a0010",
  "spc-15": "#0e001a",

  // Abstract
  "abs-1": "linear-gradient(135deg, #0f0a1a, #1a0f2d, #0f0a1a)",
  "abs-2": "linear-gradient(135deg, #0a1a14, #1a0f1a, #0a1a14)",
  "abs-3": "linear-gradient(135deg, #0a0f1a, #141a2d, #0a0f1a)",
  "abs-4": "linear-gradient(135deg, #0a0a0a, #1a1a2e, #0a0a0a)",
  "abs-5": "linear-gradient(135deg, #0a0010, #1a0030, #0a0010)",
  "abs-6": "linear-gradient(135deg, #0f0f0f, #1a1a1a, #0f0f0f)",
  "abs-7": "linear-gradient(135deg, #0a0f14, #141a1f, #0a0f14)",
  "abs-8": "linear-gradient(135deg, #0a0a14, #14142a, #0a0a14)",
  "abs-9": "linear-gradient(135deg, #0a0a0a, #1f1f2f, #0a0a0a)",
  "abs-10": "linear-gradient(135deg, #0a0a14, #14142a, #1a1a3f)",

  // Neon
  "neo-1": "linear-gradient(135deg, #0a0015, #2d004d, #0a0015)",
  "neo-2": "linear-gradient(135deg, #0a0015, #3f0040, #0a0015)",
  "neo-3": "linear-gradient(135deg, #0a0a14, #002d4d, #0a0a14)",
  "neo-4": "linear-gradient(135deg, #0f000f, #3f003f, #0f000f)",
  "neo-5": "linear-gradient(135deg, #000a00, #002d00, #000a00)",
  "neo-6": "linear-gradient(135deg, #0a0014, #2d004d, #0a0014)",
  "neo-7": "linear-gradient(135deg, #14000a, #4d002d, #14000a)",
  "neo-8": "linear-gradient(135deg, #0a0a14, #2d0030, #0a0a14)",
  "neo-9": "linear-gradient(135deg, #001400, #003000, #001400)",
  "neo-10": "linear-gradient(135deg, #000014, #00003f, #000028)",

  // Anime
  "ani-1": "linear-gradient(135deg, #1a0f1a, #2d1b2d, #1a0f14)",
  "ani-2": "linear-gradient(135deg, #0a0a1a, #1a1a3f, #0a0a1a)",
  "ani-3": "linear-gradient(135deg, #0a0f14, #1a2d2d, #0a0f14)",
  "ani-4": "linear-gradient(135deg, #0a001a, #1a0a3f, #0a001a)",
  "ani-5": "linear-gradient(135deg, #1a0f14, #2d1b2d, #1a0f0f)",
  "ani-6": "linear-gradient(135deg, #0a0f0a, #1a2d1a, #0a0f0a)",
  "ani-7": "linear-gradient(135deg, #0f0f1a, #1f1f3f, #0f0f1a)",
  "ani-8": "linear-gradient(135deg, #1a0a1a, #2d1b3f, #1a0a14)",
  "ani-9": "linear-gradient(135deg, #1a0f0f, #2d1b1b, #1a0f0f)",
  "ani-10": "linear-gradient(135deg, #0a0a1a, #1a1a3f, #2d1b4d)",

  // Gaming
  "gam-1": "#0a0a0a",
  "gam-2": "linear-gradient(135deg, #0a0015, #1a0030, #0a0015)",
  "gam-3": "linear-gradient(135deg, #0a0f0a, #1a2d1a, #0a0f0a)",
  "gam-4": "#0f0f0a",
  "gam-5": "linear-gradient(135deg, #0a0a14, #1a1a2e, #0a0a14)",
  "gam-6": "linear-gradient(135deg, #0a0014, #2d0030, #0a0014)",
  "gam-7": "#0f0a0a",
  "gam-8": "#060606",
  "gam-9": "#0a0f0a",
  "gam-10": "#0a0a0f",

  // Minimal
  "min-1": "#121212",
  "min-2": "#0f1414",
  "min-3": "#14141a",
  "min-4": "#0f1520",
  "min-5": "#0a140f",
  "min-6": "#141a14",
  "min-7": "#1a1814",
  "min-8": "#1a1a1f",
  "min-9": "#0f0f14",
  "min-10": "#141418",

  // Glass
  "gls-1": "#1a1a2e",
  "gls-2": "#0f1525",
  "gls-3": "#141828",
  "gls-4": "#1a1a2e",
  "gls-5": "#151525",
  "gls-6": "#0d0d1f",
  "gls-7": "#1a1a2a",
  "gls-8": "#101020",
  "gls-9": "#121224",
  "gls-10": "#161628",

  // Blur
  "blr-1": "#0f0f1a",
  "blr-2": "#141420",
  "blr-3": "#0a0a14",
  "blr-4": "#12122a",
  "blr-5": "#0e0e1e",
  "blr-6": "#161626",
  "blr-7": "#101018",
  "blr-8": "#0a0a20",
  "blr-9": "#0c0c1c",
  "blr-10": "#141428",

  // AI Wallpapers
  "ai-1": "linear-gradient(135deg, #0a0a2e, #1a1a5f, #2d1b7f)",
  "ai-2": "linear-gradient(135deg, #0a001a, #2d004d, #1a0030)",
  "ai-3": "linear-gradient(135deg, #0f0f2d, #1a1a4d, #0f0f2d)",
  "ai-4": "linear-gradient(135deg, #0a0a3e, #1f1f5f, #1a1a3f)",
  "ai-5": "linear-gradient(135deg, #050520, #0f0f4d, #050520)",
  "ai-6": "linear-gradient(135deg, #0a0515, #1f0a3f, #0a0515)",
  "ai-7": "linear-gradient(135deg, #050a25, #0f1a4f, #050a25)",
  "ai-8": "linear-gradient(135deg, #10052a, #2d0a4d, #10052a)",
  "ai-9": "linear-gradient(135deg, #0f001a, #2d003f, #1f0a2d)",
  "ai-10": "linear-gradient(135deg, #0a0010, #2d0030, #1a0525)",
  "ai-11": "#0f0520",
  "ai-12": "#1a0a30",
  "ai-13": "#0f0025",
  "ai-14": "#050515",
  "ai-15": "#0f0525",

  // Animated wallpapers
  "anm-1": "animated-gradient",
  "anm-2": "animated-stars",
  "anm-3": "animated-particles",
  "anm-4": "animated-aurora",
  "anm-5": "animated-rain",
  "anm-6": "animated-snow",
  "anm-7": "animated-neon-rings",
  "anm-8": "animated-matrix",
  "anm-9": "animated-ripple",
  "anm-10": "animated-fireflies",

  // Legacy
  "aurora": "linear-gradient(135deg, #0a1628, #1a2f3f, #0d1d2d)",
};

export const ANIMATED_WALLPAPERS = new Set([
  "anm-1", "anm-2", "anm-3", "anm-4", "anm-5",
  "anm-6", "anm-7", "anm-8", "anm-9", "anm-10",
]);

/**
 * Resolve a wallpaper value to a CSS background value.
 */
export function resolveWallpaper(wallpaper) {
  if (!wallpaper) return "linear-gradient(135deg, #0a1628, #1a2f3f, #0d1d2d)";

  if (wallpaper.startsWith("url(") || wallpaper.startsWith("linear-gradient") || wallpaper.startsWith("radial-gradient") || wallpaper.startsWith("#")) {
    return wallpaper;
  }

  const resolved = WALLPAPER_MAP[wallpaper];
  if (resolved) return resolved;

  return "linear-gradient(135deg, #0a1628, #1a2f3f, #0d1d2d)";
}