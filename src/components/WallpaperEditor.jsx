import { useState, useRef, useMemo } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { ANIMATED_WALLPAPERS } from "../services/wallpaperService";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "solid", label: "Solid Colors" },
  { id: "gradient", label: "Gradient" },
  { id: "dark", label: "Dark" },
  { id: "nature", label: "Nature" },
  { id: "space", label: "Space" },
  { id: "abstract", label: "Abstract" },
  { id: "neon", label: "Neon" },
  { id: "anime", label: "Anime Style" },
  { id: "gaming", label: "Gaming" },
  { id: "minimal", label: "Minimal" },
  { id: "glass", label: "Glass" },
  { id: "blur", label: "Blur" },
  { id: "ai", label: "AI Wallpapers" },
  { id: "animated", label: "Animated" },
];

const WALLPAPERS = [
  // Solid Colors (20)
  { id: "solid-1", cat: "solid", name: "Midnight Blue", bg: "#0f172a" },
  { id: "solid-2", cat: "solid", name: "Slate", bg: "#1e293b" },
  { id: "solid-3", cat: "solid", name: "Charcoal", bg: "#1f2937" },
  { id: "solid-4", cat: "solid", name: "Deep Purple", bg: "#1e1b4b" },
  { id: "solid-5", cat: "solid", name: "Navy", bg: "#0c0e1a" },
  { id: "solid-6", cat: "solid", name: "Dark Teal", bg: "#0d1b1e" },
  { id: "solid-7", cat: "solid", name: "Ebony", bg: "#0a0a0a" },
  { id: "solid-8", cat: "solid", name: "Oxblood", bg: "#1a0c0c" },
  { id: "solid-9", cat: "solid", name: "Forest", bg: "#0d1a0d" },
  { id: "solid-10", cat: "solid", name: "Indigo", bg: "#13102a" },
  { id: "solid-11", cat: "solid", name: "Cocoa", bg: "#1a1410" },
  { id: "solid-12", cat: "solid", name: "Steel", bg: "#1a202c" },
  { id: "solid-13", cat: "solid", name: "Graphite", bg: "#171717" },
  { id: "solid-14", cat: "solid", name: "Obsidian", bg: "#090909" },
  { id: "solid-15", cat: "solid", name: "Mahogany", bg: "#1a0f0a" },
  { id: "solid-16", cat: "solid", name: "Royal Purple", bg: "#2d1b69" },
  { id: "solid-17", cat: "solid", name: "Ocean Blue", bg: "#0f3460" },
  { id: "solid-18", cat: "solid", name: "Night Sky", bg: "#16213e" },
  { id: "solid-19", cat: "solid", name: "Deep Black", bg: "#0b090a" },
  { id: "solid-20", cat: "solid", name: "Violet", bg: "#10002b" },

  // Gradients (20)
  { id: "grad-1", cat: "gradient", name: "Purple Haze", bg: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
  { id: "grad-2", cat: "gradient", name: "Royal", bg: "linear-gradient(135deg, #1a0a2e, #2d1b69, #16213e)" },
  { id: "grad-3", cat: "gradient", name: "Ocean", bg: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)" },
  { id: "grad-4", cat: "gradient", name: "Cosmic", bg: "linear-gradient(135deg, #240046, #3c096c, #5a189a)" },
  { id: "grad-5", cat: "gradient", name: "Cyber", bg: "linear-gradient(135deg, #0d0221, #150734, #0a0020)" },
  { id: "grad-6", cat: "gradient", name: "Mint", bg: "linear-gradient(135deg, #0b1a1a, #1a2f2f, #0d1d1d)" },
  { id: "grad-7", cat: "gradient", name: "Rose", bg: "linear-gradient(135deg, #1a0a0f, #2d1b1b, #1a0f0a)" },
  { id: "grad-8", cat: "gradient", name: "Aurora", bg: "linear-gradient(135deg, #0a1628, #1a2f3f, #0d1d2d)" },
  { id: "grad-9", cat: "gradient", name: "Sakura", bg: "linear-gradient(135deg, #1a0f1a, #2d1b2d, #1a0f14)" },
  { id: "grad-10", cat: "gradient", name: "Gold", bg: "linear-gradient(135deg, #1a1408, #2d2410, #1a1408)" },
  { id: "grad-11", cat: "gradient", name: "Plasma", bg: "linear-gradient(135deg, #0a0015, #1a0030, #0d0015)" },
  { id: "grad-12", cat: "gradient", name: "Coral", bg: "linear-gradient(135deg, #1a0a0a, #2d1515, #1a0f0f)" },
  { id: "grad-13", cat: "gradient", name: "Arctic", bg: "linear-gradient(135deg, #0f1a2a, #1a2f3f, #0f1a2a)" },
  { id: "grad-14", cat: "gradient", name: "Lush", bg: "linear-gradient(135deg, #0a1a0a, #1a2f1a, #0d1d0d)" },
  { id: "grad-15", cat: "gradient", name: "Twilight", bg: "linear-gradient(135deg, #0c0c1a, #1a1a3f, #0c0c1a)" },
  { id: "grad-16", cat: "gradient", name: "Amethyst", bg: "linear-gradient(135deg, #10002b, #240046, #3c096c)" },
  { id: "grad-17", cat: "gradient", name: "Lagoon", bg: "linear-gradient(135deg, #001219, #005f73, #0a9396)" },
  { id: "grad-18", cat: "gradient", name: "Ember", bg: "linear-gradient(135deg, #370617, #6a040f, #9d0208)" },
  { id: "grad-19", cat: "gradient", name: "Azure", bg: "linear-gradient(135deg, #03045e, #0077b6, #00b4d8)" },
  { id: "grad-20", cat: "gradient", name: "Mystic", bg: "linear-gradient(135deg, #10002b, #240046, #3c096c)" },

  // Dark (15)
  { id: "dark-1", cat: "dark", name: "Dark Void", bg: "#020202" },
  { id: "dark-2", cat: "dark", name: "Deep Space", bg: "#0a0a14" },
  { id: "dark-3", cat: "dark", name: "Shadow", bg: "#080808" },
  { id: "dark-4", cat: "dark", name: "Abyss", bg: "#040408" },
  { id: "dark-5", cat: "dark", name: "Pitch", bg: "#000000" },
  { id: "dark-6", cat: "dark", name: "Dark Matter", bg: "#0e0e12" },
  { id: "dark-7", cat: "dark", name: "Vanta", bg: "#050508" },
  { id: "dark-8", cat: "dark", name: "Umbra", bg: "#0c0c10" },
  { id: "dark-9", cat: "dark", name: "Penumbra", bg: "#121216" },
  { id: "dark-10", cat: "dark", name: "Nightfall", bg: "#0a0e1a" },
  { id: "dark-11", cat: "dark", name: "Midnight", bg: "#02040a" },
  { id: "dark-12", cat: "dark", name: "Eclipse", bg: "#0a0a0e" },
  { id: "dark-13", cat: "dark", name: "Obsidian", bg: "#060608" },
  { id: "dark-14", cat: "dark", name: "Raven", bg: "#0e0a10" },
  { id: "dark-15", cat: "dark", name: "Smoke", bg: "#0a0604" },

  // Nature (15)
  { id: "nat-1", cat: "nature", name: "Forest Dark", bg: "#0a140a" },
  { id: "nat-2", cat: "nature", name: "Mountain", bg: "#0f1520" },
  { id: "nat-3", cat: "nature", name: "Lake", bg: "#0a1420" },
  { id: "nat-4", cat: "nature", name: "Jungle", bg: "#0a1a0a" },
  { id: "nat-5", cat: "nature", name: "Desert Night", bg: "#1a1410" },
  { id: "nat-6", cat: "nature", name: "Ocean Deep", bg: "#0a0a1a" },
  { id: "nat-7", cat: "nature", name: "Rainforest", bg: "#0c1a0c" },
  { id: "nat-8", cat: "nature", name: "Arctic Night", bg: "#0f1a1a" },
  { id: "nat-9", cat: "nature", name: "Canyon", bg: "#1a120a" },
  { id: "nat-10", cat: "nature", name: "Meadow Dark", bg: "#0a1a10" },
  { id: "nat-11", cat: "nature", name: "Twilight Grove", bg: "#1a0a0a" },
  { id: "nat-12", cat: "nature", name: "Moss", bg: "#0a1a14" },
  { id: "nat-13", cat: "nature", name: "Fern", bg: "#141a0a" },
  { id: "nat-14", cat: "nature", name: "Dusk", bg: "#1a1a0a" },
  { id: "nat-15", cat: "nature", name: "Glacier", bg: "#0a141a" },

  // Space (15)
  { id: "spc-1", cat: "space", name: "Nebula", bg: "#0a0015" },
  { id: "spc-2", cat: "space", name: "Galaxy", bg: "#0a0020" },
  { id: "spc-3", cat: "space", name: "Constellation", bg: "#0a0a1a" },
  { id: "spc-4", cat: "space", name: "Cosmos", bg: "#050510" },
  { id: "spc-5", cat: "space", name: "Andromeda", bg: "#0a0018" },
  { id: "spc-6", cat: "space", name: "Orion", bg: "#080818" },
  { id: "spc-7", cat: "space", name: "Supernova", bg: "#1a0a0a" },
  { id: "spc-8", cat: "space", name: "Milky Way", bg: "#0a0a1a" },
  { id: "spc-9", cat: "space", name: "Event Horizon", bg: "#020010" },
  { id: "spc-10", cat: "space", name: "Solar Flare", bg: "#040015" },
  { id: "spc-11", cat: "space", name: "Dark Matter", bg: "#080010" },
  { id: "spc-12", cat: "space", name: "Pulsar", bg: "#0c0018" },
  { id: "spc-13", cat: "space", name: "Quasar", bg: "#060012" },
  { id: "spc-14", cat: "space", name: "Stardust", bg: "#0a0010" },
  { id: "spc-15", cat: "space", name: "Nova", bg: "#0e001a" },

  // Abstract (10)
  { id: "abs-1", cat: "abstract", name: "Geometric", bg: "linear-gradient(135deg, #0f0a1a, #1a0f2d, #0f0a1a)" },
  { id: "abs-2", cat: "abstract", name: "Fluid", bg: "linear-gradient(135deg, #0a1a14, #1a0f1a, #0a1a14)" },
  { id: "abs-3", cat: "abstract", name: "Waves", bg: "linear-gradient(135deg, #0a0f1a, #141a2d, #0a0f1a)" },
  { id: "abs-4", cat: "abstract", name: "Mosaic", bg: "linear-gradient(135deg, #0a0a0a, #1a1a2e, #0a0a0a)" },
  { id: "abs-5", cat: "abstract", name: "Fractal", bg: "linear-gradient(135deg, #0a0010, #1a0030, #0a0010)" },
  { id: "abs-6", cat: "abstract", name: "Canvas", bg: "linear-gradient(135deg, #0f0f0f, #1a1a1a, #0f0f0f)" },
  { id: "abs-7", cat: "abstract", name: "Dots", bg: "linear-gradient(135deg, #0a0f14, #141a1f, #0a0f14)" },
  { id: "abs-8", cat: "abstract", name: "Hex", bg: "linear-gradient(135deg, #0a0a14, #14142a, #0a0a14)" },
  { id: "abs-9", cat: "abstract", name: "Vortex", bg: "linear-gradient(135deg, #0a0a0a, #1f1f2f, #0a0a0a)" },
  { id: "abs-10", cat: "abstract", name: "Prism", bg: "linear-gradient(135deg, #0a0a14, #14142a, #1a1a3f)" },

  // Neon (10)
  { id: "neo-1", cat: "neon", name: "Cyberpunk", bg: "linear-gradient(135deg, #0a0015, #2d004d, #0a0015)" },
  { id: "neo-2", cat: "neon", name: "Synthwave", bg: "linear-gradient(135deg, #0a0015, #3f0040, #0a0015)" },
  { id: "neo-3", cat: "neon", name: "Pixel", bg: "linear-gradient(135deg, #0a0a14, #002d4d, #0a0a14)" },
  { id: "neo-4", cat: "neon", name: "Glow", bg: "linear-gradient(135deg, #0f000f, #3f003f, #0f000f)" },
  { id: "neo-5", cat: "neon", name: "Matrix", bg: "linear-gradient(135deg, #000a00, #002d00, #000a00)" },
  { id: "neo-6", cat: "neon", name: "Vapor", bg: "linear-gradient(135deg, #0a0014, #2d004d, #0a0014)" },
  { id: "neo-7", cat: "neon", name: "Laser", bg: "linear-gradient(135deg, #14000a, #4d002d, #14000a)" },
  { id: "neo-8", cat: "neon", name: "Retro", bg: "linear-gradient(135deg, #0a0a14, #2d0030, #0a0a14)" },
  { id: "neo-9", cat: "neon", name: "Neon Green", bg: "linear-gradient(135deg, #001400, #003000, #001400)" },
  { id: "neo-10", cat: "neon", name: "Electric", bg: "linear-gradient(135deg, #000014, #00003f, #000028)" },

  // Anime (10)
  { id: "ani-1", cat: "anime", name: "Sakura Night", bg: "linear-gradient(135deg, #1a0f1a, #2d1b2d, #1a0f14)" },
  { id: "ani-2", cat: "anime", name: "Moonlight", bg: "linear-gradient(135deg, #0a0a1a, #1a1a3f, #0a0a1a)" },
  { id: "ani-3", cat: "anime", name: "Spirit", bg: "linear-gradient(135deg, #0a0f14, #1a2d2d, #0a0f14)" },
  { id: "ani-4", cat: "anime", name: "Fantasy", bg: "linear-gradient(135deg, #0a001a, #1a0a3f, #0a001a)" },
  { id: "ani-5", cat: "anime", name: "Shoujo", bg: "linear-gradient(135deg, #1a0f14, #2d1b2d, #1a0f0f)" },
  { id: "ani-6", cat: "anime", name: "Shonen", bg: "linear-gradient(135deg, #0a0f0a, #1a2d1a, #0a0f0a)" },
  { id: "ani-7", cat: "anime", name: "Studio", bg: "linear-gradient(135deg, #0f0f1a, #1f1f3f, #0f0f1a)" },
  { id: "ani-8", cat: "anime", name: "Magical", bg: "linear-gradient(135deg, #1a0a1a, #2d1b3f, #1a0a14)" },
  { id: "ani-9", cat: "anime", name: "Twilight Sky", bg: "linear-gradient(135deg, #1a0f0f, #2d1b1b, #1a0f0f)" },
  { id: "ani-10", cat: "anime", name: "Celestial", bg: "linear-gradient(135deg, #0a0a1a, #1a1a3f, #2d1b4d)" },

  // Gaming (10)
  { id: "gam-1", cat: "gaming", name: "Console", bg: "#0a0a0a" },
  { id: "gam-2", cat: "gaming", name: "Arcade", bg: "linear-gradient(135deg, #0a0015, #1a0030, #0a0015)" },
  { id: "gam-3", cat: "gaming", name: "RPG", bg: "linear-gradient(135deg, #0a0f0a, #1a2d1a, #0a0f0a)" },
  { id: "gam-4", cat: "gaming", name: "FPS", bg: "#0f0f0a" },
  { id: "gam-5", cat: "gaming", name: "Puzzle", bg: "linear-gradient(135deg, #0a0a14, #1a1a2e, #0a0a14)" },
  { id: "gam-6", cat: "gaming", name: "Retro Game", bg: "linear-gradient(135deg, #0a0014, #2d0030, #0a0014)" },
  { id: "gam-7", cat: "gaming", name: "Battle", bg: "#0f0a0a" },
  { id: "gam-8", cat: "gaming", name: "Stealth", bg: "#060606" },
  { id: "gam-9", cat: "gaming", name: "Open World", bg: "#0a0f0a" },
  { id: "gam-10", cat: "gaming", name: "Quest", bg: "#0a0a0f" },

  // Minimal (10)
  { id: "min-1", cat: "minimal", name: "Clean", bg: "#121212" },
  { id: "min-2", cat: "minimal", name: "Zen", bg: "#0f1414" },
  { id: "min-3", cat: "minimal", name: "Pebble", bg: "#14141a" },
  { id: "min-4", cat: "minimal", name: "Frost", bg: "#0f1520" },
  { id: "min-5", cat: "minimal", name: "Bamboo", bg: "#0a140f" },
  { id: "min-6", cat: "minimal", name: "Stone", bg: "#141a14" },
  { id: "min-7", cat: "minimal", name: "Sand", bg: "#1a1814" },
  { id: "min-8", cat: "minimal", name: "Snow", bg: "#1a1a1f" },
  { id: "min-9", cat: "minimal", name: "Clay", bg: "#0f0f14" },
  { id: "min-10", cat: "minimal", name: "Linen", bg: "#141418" },

  // Glass (10)
  { id: "gls-1", cat: "glass", name: "Frosted", bg: "#1a1a2e" },
  { id: "gls-2", cat: "glass", name: "Crystal", bg: "#0f1525" },
  { id: "gls-3", cat: "glass", name: "Ice", bg: "#141828" },
  { id: "gls-4", cat: "glass", name: "Prism", bg: "#1a1a2e" },
  { id: "gls-5", cat: "glass", name: "Quartz", bg: "#151525" },
  { id: "gls-6", cat: "glass", name: "Diamond", bg: "#0d0d1f" },
  { id: "gls-7", cat: "glass", name: "Pearl", bg: "#1a1a2a" },
  { id: "gls-8", cat: "glass", name: "Crystal Clear", bg: "#101020" },
  { id: "gls-9", cat: "glass", name: "Stained", bg: "#121224" },
  { id: "gls-10", cat: "glass", name: "Lens", bg: "#161628" },

  // Blur (10)
  { id: "blr-1", cat: "blur", name: "Soft", bg: "#0f0f1a" },
  { id: "blr-2", cat: "blur", name: "Mist", bg: "#141420" },
  { id: "blr-3", cat: "blur", name: "Fog", bg: "#0a0a14" },
  { id: "blr-4", cat: "blur", name: "Haze", bg: "#12122a" },
  { id: "blr-5", cat: "blur", name: "Smoke", bg: "#0e0e1e" },
  { id: "blr-6", cat: "blur", name: "Cloud", bg: "#161626" },
  { id: "blr-7", cat: "blur", name: "Vapor", bg: "#101018" },
  { id: "blr-8", cat: "blur", name: "Dream", bg: "#0a0a20" },
  { id: "blr-9", cat: "blur", name: "Mirage", bg: "#0c0c1c" },
  { id: "blr-10", cat: "blur", name: "Ethereal", bg: "#141428" },

  // AI Wallpapers (15)
  { id: "ai-1", cat: "ai", name: "Neural Dream", bg: "linear-gradient(135deg, #0a0a2e, #1a1a5f, #2d1b7f)" },
  { id: "ai-2", cat: "ai", name: "Deep Learning", bg: "linear-gradient(135deg, #0a001a, #2d004d, #1a0030)" },
  { id: "ai-3", cat: "ai", name: "AI Night", bg: "linear-gradient(135deg, #0f0f2d, #1a1a4d, #0f0f2d)" },
  { id: "ai-4", cat: "ai", name: "Sentient", bg: "linear-gradient(135deg, #0a0a3e, #1f1f5f, #1a1a3f)" },
  { id: "ai-5", cat: "ai", name: "Digital Realm", bg: "linear-gradient(135deg, #050520, #0f0f4d, #050520)" },
  { id: "ai-6", cat: "ai", name: "Consciousness", bg: "linear-gradient(135deg, #0a0515, #1f0a3f, #0a0515)" },
  { id: "ai-7", cat: "ai", name: "Machine Vision", bg: "linear-gradient(135deg, #050a25, #0f1a4f, #050a25)" },
  { id: "ai-8", cat: "ai", name: "Algorithm", bg: "linear-gradient(135deg, #10052a, #2d0a4d, #10052a)" },
  { id: "ai-9", cat: "ai", name: "Neural Net", bg: "linear-gradient(135deg, #0f001a, #2d003f, #1f0a2d)" },
  { id: "ai-10", cat: "ai", name: "Deep Blue", bg: "linear-gradient(135deg, #0a0010, #2d0030, #1a0525)" },
  { id: "ai-11", cat: "ai", name: "AI Void", bg: "#0f0520" },
  { id: "ai-12", cat: "ai", name: "Cyber Mind", bg: "#1a0a30" },
  { id: "ai-13", cat: "ai", name: "Matrix Dark", bg: "#0f0025" },
  { id: "ai-14", cat: "ai", name: "Synaptic", bg: "#050515" },
  { id: "ai-15", cat: "ai", name: "Data Stream", bg: "#0f0525" },

  // Animated (10)
  { id: "anm-1", cat: "animated", name: "Moving Gradient", bg: "animated-gradient" },
  { id: "anm-2", cat: "animated", name: "Starry Night", bg: "animated-stars" },
  { id: "anm-3", cat: "animated", name: "Particles", bg: "animated-particles" },
  { id: "anm-4", cat: "animated", name: "Aurora Borealis", bg: "animated-aurora" },
  { id: "anm-5", cat: "animated", name: "Rainy Day", bg: "animated-rain" },
  { id: "anm-6", cat: "animated", name: "Snowfall", bg: "animated-snow" },
  { id: "anm-7", cat: "animated", name: "Neon Rings", bg: "animated-neon-rings" },
  { id: "anm-8", cat: "animated", name: "Digital Rain", bg: "animated-matrix" },
  { id: "anm-9", cat: "animated", name: "Ripple Effect", bg: "animated-ripple" },
  { id: "anm-10", cat: "animated", name: "Fireflies", bg: "animated-fireflies" },
];

const ANIMATED_CSS = {
  "animated-gradient": `
    @keyframes wpGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    background: linear-gradient(-45deg, #0f0c29, #302b63, #24243e, #1a0a2e);
    background-size: 400% 400%;
    animation: wpGradient 15s ease infinite;
  `,
  "animated-stars": `
    background: #020202;
    position: relative;
    overflow: hidden;
  `,
  "animated-particles": `
    background: #0a0a14;
    position: relative;
    overflow: hidden;
  `,
  "animated-aurora": `
    @keyframes wpAurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    background: linear-gradient(-45deg, #0a1628, #1a2f3f, #0d1d2d, #0a1628);
    background-size: 400% 400%;
    animation: wpAurora 20s ease infinite;
  `,
  "animated-rain": `
    background: #0a0a1a;
    position: relative;
    overflow: hidden;
  `,
  "animated-snow": `
    background: #0f1a1a;
    position: relative;
    overflow: hidden;
  `,
  "animated-neon-rings": `
    background: #0a0015;
    position: relative;
    overflow: hidden;
  `,
  "animated-matrix": `
    background: #000000;
    position: relative;
    overflow: hidden;
  `,
  "animated-ripple": `
    background: #0a0a14;
    position: relative;
    overflow: hidden;
  `,
  "animated-fireflies": `
    background: #0a140a;
    position: relative;
    overflow: hidden;
  `,
};

export default function WallpaperEditor({
  settings,
  onWallpaperChange,
  onWallpaperEffectsChange,
  onClose,
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallpaper, setSelectedWallpaper] = useState(settings.wallpaper || "aurora");
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customWallpaper, setCustomWallpaper] = useState(null);
  const fileInputRef = useRef(null);

  // Effects state
  const [opacity, setOpacity] = useState(settings.wallpaperOpacity ?? 0.9);
  const [blur, setBlur] = useState(settings.wallpaperBlur ?? 0);
  const [brightness, setBrightness] = useState(settings.wallpaperBrightness ?? 100);
  const [darkOverlay, setDarkOverlay] = useState(settings.wallpaperDarkOverlay ?? 0);
  const [pattern, setPattern] = useState(settings.wallpaperPattern ?? "none");
  const [perChat, setPerChat] = useState(settings.perChatWallpapers ?? false);
  const patterns = ["none", "dots", "lines", "grid", "cross", "circles"];

  // Filter wallpapers
  const filteredWallpapers = useMemo(() => {
    let result = WALLPAPERS;
    if (activeCategory !== "all") {
      result = result.filter((w) => w.cat === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q));
    }
    return result;
  }, [activeCategory, searchQuery]);

  const getSelectedWallpaperData = () => {
    if (customWallpaper) return { bg: `url(${customWallpaper})` };
    const wp = WALLPAPERS.find((w) => w.id === selectedWallpaper);
    return wp || WALLPAPERS[0];
  };

  const selectedData = getSelectedWallpaperData();
  const isAnimated = ANIMATED_WALLPAPERS.has(selectedWallpaper);

  const handleUploadWallpaper = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }
    setUploading(true);
    try {
      const imageRef = storageRef(storage, `wallpapers/${Date.now()}-${file.name}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      setCustomWallpaper(url);
      setSelectedWallpaper("custom");
      setShowPreview(true);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload wallpaper");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    const wallpaperData = customWallpaper
      ? `url(${customWallpaper})`
      : selectedWallpaper;

    onWallpaperChange(wallpaperData);
    onWallpaperEffectsChange({
      wallpaperOpacity: opacity,
      wallpaperBlur: blur,
      wallpaperBrightness: brightness,
      wallpaperDarkOverlay: darkOverlay,
      wallpaperPattern: pattern,
      perChatWallpapers: perChat,
    });
    onClose();
  };

  const wallpaperStyle = selectedData?.bg
    ? isAnimated
      ? {}
      : { background: selectedData.bg }
    : {};

  return (
    <div className="wallpaper-editor">
      {/* Header */}
      <div className="wallpaper-header">
        <button className="wallpaper-back" onClick={onClose}>←</button>
        <h2>Chat Wallpaper</h2>
      </div>

      {/* Search */}
      <div className="wallpaper-search">
        <span className="wallpaper-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search wallpapers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="wallpaper-search-input"
        />
        {searchQuery && (
          <button className="wallpaper-search-clear" onClick={() => setSearchQuery("")}>✕</button>
        )}
      </div>

      {/* Categories */}
      <div className="wallpaper-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`wallpaper-cat-chip ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="wallpaper-layout">
        {/* Left: Wallpaper grid */}
        <div className="wallpaper-grid-section">
          {/* Upload card */}
          <div className="wallpaper-upload-card" onClick={() => fileInputRef.current?.click()}>
            <span className="wallpaper-upload-icon">📁</span>
            <div className="wallpaper-upload-text">
              <span>Upload from Computer</span>
              <span className="wallpaper-upload-hint">JPG, PNG, WEBP</span>
            </div>
            {uploading && <span className="wallpaper-upload-spinner" />}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleUploadWallpaper}
            />
          </div>

          {/* Wallpaper grid */}
          <div className="wallpaper-grid">
            {filteredWallpapers.map((wp) => {
              const isSelected = wp.id === selectedWallpaper && !customWallpaper;
              const wpIsAnimated = wp.bg && ANIMATED_WALLPAPERS.has(wp.id);
              return (
                <button
                  key={wp.id}
                  className={`wallpaper-card ${isSelected ? "selected" : ""} ${wpIsAnimated ? "animated-badge" : ""}`}
                  onClick={() => {
                    setSelectedWallpaper(wp.id);
                    setCustomWallpaper(null);
                    setShowPreview(true);
                  }}
                  title={wp.name}
                >
                  <div
                    className={`wallpaper-card-preview ${wpIsAnimated ? "wp-animated" : ""}`}
                    style={
                      wpIsAnimated
                        ? { background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }
                        : { background: wp.bg }
                    }
                  >
                    {wpIsAnimated && <span className="wp-animated-badge">▶</span>}
                  </div>
                  {isSelected && <span className="wallpaper-check">✓</span>}
                  <span className="wallpaper-card-name">{wp.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Preview panel */}
        {showPreview && selectedData && (
          <div className="wallpaper-preview-panel">
            <div className="wallpaper-preview-header">
              <h3>Preview</h3>
              <span className="wallpaper-preview-name">
                {customWallpaper ? "Custom Upload" : selectedData.name}
              </span>
            </div>

            {/* Chat preview */}
            <div
              className={`wallpaper-chat-preview ${isAnimated ? "wp-animated-bg" : ""}`}
              data-animated={isAnimated ? selectedData.bg : ""}
              style={wallpaperStyle}
            >
              <div
                className="wallpaper-chat-overlay"
                style={{
                  opacity: darkOverlay,
                  backgroundColor: "rgba(0,0,0,1)",
                }}
              />
              <div className="wallpaper-preview-messages" style={{ filter: `brightness(${brightness}%)` }}>
                <div className="wp-msg received" style={{ opacity }}>
                  Hey! How are you?
                </div>
                <div className="wp-msg sent" style={{ opacity }}>
                  I'm good, thanks! 😊
                </div>
                <div className="wp-msg received" style={{ opacity }}>
                  Want to grab coffee later?
                </div>
                <div className="wp-msg sent" style={{ opacity }}>
                  Sure! Sounds great ☕
                </div>
                <div className="wp-msg received" style={{ opacity }}>
                  Meet at the usual place?
                </div>
                <div className="wp-msg sent" style={{ opacity }}>
                  Perfect! See you at 3pm 👍
                </div>
              </div>
            </div>

            {/* Effects */}
            <div className="wallpaper-effects">
              <div className="wallpaper-effect-group">
                <label>Opacity <span>{Math.round(opacity * 100)}%</span></label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                />
              </div>

              <div className="wallpaper-effect-group">
                <label>Blur <span>{blur}px</span></label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={blur}
                  onChange={(e) => setBlur(parseInt(e.target.value))}
                />
              </div>

              <div className="wallpaper-effect-group">
                <label>Brightness <span>{brightness}%</span></label>
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                />
              </div>

              <div className="wallpaper-effect-group">
                <label>Dark Overlay <span>{Math.round(darkOverlay * 100)}%</span></label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={darkOverlay}
                  onChange={(e) => setDarkOverlay(parseFloat(e.target.value))}
                />
              </div>

              <div className="wallpaper-effect-group">
                <label>Pattern Overlay</label>
                <div className="wallpaper-patterns">
                  {patterns.map((p) => (
                    <button
                      key={p}
                      className={`wallpaper-pattern-btn ${pattern === p ? "active" : ""}`}
                      onClick={() => setPattern(p)}
                    >
                      {p === "none" ? "None" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wallpaper-effect-group">
                <label>Per-Chat Wallpapers</label>
                <div className="wallpaper-toggle-row">
                  <span>Use different wallpaper for each chat</span>
                  <button
                    className={`wallpaper-toggle ${perChat ? "active" : ""}`}
                    onClick={() => setPerChat(!perChat)}
                  >
                    <span className="wallpaper-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="wallpaper-actions">
              <button className="wallpaper-btn secondary" onClick={() => setShowPreview(false)}>
                Cancel
              </button>
              <button className="wallpaper-btn primary" onClick={handleApply}>
                Apply Wallpaper
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile apply bar */}
      {!showPreview && (
        <div className="wallpaper-mobile-apply">
          <button className="wallpaper-btn primary" onClick={handleApply}>
            Apply Wallpaper
          </button>
        </div>
      )}
    </div>
  );
}