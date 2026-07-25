import { useState, useRef, useMemo, useEffect } from "react";

// A comprehensive set of commonly used emojis organized by category
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑",
      "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄",
      "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮",
      "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😡", "🤬", "😈", "👿", "💀",
      "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹",
      "😻", "😼", "😽", "🙀", "😿", "😾",
    ],
  },
  {
    name: "Gestures",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘",
      "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛",
      "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦵",
      "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅",
      "👄",
    ],
  },
  {
    name: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "🫶",
    ],
  },
  {
    name: "Objects",
    icon: "👑",
    emojis: [
      "👑", "💎", "💍", "👓", "🕶️", "🥽", "🥼", "🦺", "👔", "👕", "👖", "🧣",
      "🧤", "🧥", "🧦", "👗", "👘", "🥻", "🩱", "🩲", "🩳", "👙", "👚", "👛",
      "👜", "👝", "🎒", "🩴", "👞", "👟", "🥾", "🥿", "👠", "👡", "🩰", "👢",
      "🎩", "🎓", "🧢", "⛑️", "📿", "💄", "💋", "👣",
    ],
  },
  {
    name: "Nature",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣",
      "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋",
      "🐌", "🐞", "🐜", "🦟", "🦗", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙",
      "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊",
      "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘",
      "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩",
      "🦮", "🐕‍🦺", "🐈", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇",
      "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔", "🐾", "🐉",
      "🐲", "🌵", "🎄", "🌲", "🌳", "🌴", "☘️", "🍀", "🍁", "🍂", "🍃", "🌿",
      "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛",
      "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎",
      "🌍", "🌏", "🪐", "💫", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌪️",
      "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️",
      "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔", "☂️", "🌊", "🌫️",
    ],
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒",
      "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️",
      "🫑", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🫘", "🥐", "🍞", "🥖", "🥨",
      "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭",
      "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘",
      "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙",
      "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁",
      "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯",
      "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂",
      "🍷", "🫗", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🥣", "🍽️",
      "🥡", "🥢", "🧂",
    ],
  },
  {
    name: "Activity",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓",
      "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿",
      "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂",
      "🏋️", "🤼", "🤸", "🤺", "⛹️", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽",
      "🚣", "🧗", "🚵", "🚴", "🎯", "🎮", "🕹️", "🎲", "♠️", "♥️", "♦️", "♣️",
      "🃏", "🀄", "🎴", "🎭", "🎨", "🧩", "🎪", "🎟️", "🎫", "🎬", "🎤", "🎧",
      "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲",
    ],
  },
  {
    name: "Travel",
    icon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
      "🚛", "🚜", "🏍️", "🛵", "🛺", "🚲", "🛴", "🛹", "🚏", "🛣️", "🛤️", "⛽",
      "🛞", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "🛟", "⛵", "🛶", "🚤", "🛳️",
      "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚁", "🚟", "🚠",
      "🚡", "🛰️", "🚀", "🛸", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏢", "🏭", "🏣",
      "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏯", "🏰", "💒", "🗼",
      "🗽", "⛪", "🕌", "🛕", "🕍", "⛩️", "🕋", "⛲", "⛺", "🌁", "🌃", "🏙️",
      "🌄", "🌅", "🌆", "🌇", "🌉", "🗾", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️",
      "🏜️", "🏝️", "🏞️",
    ],
  },
];

const RECENT_EMOJIS_KEY = "chatsphere-recent-emojis";

function loadRecentEmojis() {
  try {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(emojis) {
  try {
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(emojis.slice(0, 30)));
  } catch {
    // ignore quota errors
  }
}

export default function EmojiPicker({ onEmojiSelect }) {
  const [activeCategory, setActiveCategory] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState(loadRecentEmojis);
  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Flatten all emojis for search
  const allEmojis = useMemo(() => {
    const all = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((e) => {
        if (!all.includes(e)) all.push(e);
      });
    });
    return all;
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allEmojis.filter((emoji) => {
      // Match by emoji name using a basic keyword mapping
      const emojiNames = {
        "😀": "grinning face happy smile",
        "😂": "joy laugh tears cry",
        "😍": "heart eyes love",
        "🥰": "smiling hearts love",
        "😊": "blush smile happy",
        "👍": "thumbs up like",
        "❤️": "heart love red",
        "🔥": "fire hot",
        "💀": "skull dead",
        "🎉": "party celebration",
        "✨": "sparkles star",
        "💪": "muscle strong flex",
        "👏": "clap applause",
        "🙏": "pray please thank you",
        "🎂": "birthday cake",
        "🌟": "star glowing",
        "⭐": "star",
        "💯": "100 perfect",
        "✅": "check mark done",
        "❌": "cross wrong",
        "❤️‍🔥": "heart fire",
        "🫶": "heart hands",
      };
      const name = emojiNames[emoji] || "";
      return name.includes(q);
    });
  }, [searchQuery, allEmojis]);

  const handleEmojiClick = (emoji) => {
    // Add to recent emojis
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 30);
      saveRecentEmojis(next);
      return next;
    });
    if (onEmojiSelect) onEmojiSelect(emoji);
  };

  const handleCategoryClick = (catName) => {
    setActiveCategory(catName);
    if (catName === "recent") {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = scrollRef.current?.querySelector(`[data-category="${catName}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderEmojiGrid = (emojis) => {
    return (
      <div className="emoji-grid-modern">
        {emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            className="emoji-item-modern"
            onClick={() => handleEmojiClick(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="emoji-picker-modern">
      {/* Search */}
      <div className="emoji-search-wrap">
        <span className="emoji-search-icon">🔍</span>
        <input
          ref={searchInputRef}
          className="emoji-search-input"
          type="text"
          placeholder="Search emoji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="emoji-search-clear" onClick={() => setSearchQuery("")}>
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="emoji-categories-modern">
        <button
          className={`emoji-cat-modern ${activeCategory === "recent" ? "active" : ""}`}
          onClick={() => handleCategoryClick("recent")}
          title="Recent"
        >
          🕐
        </button>
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            className={`emoji-cat-modern ${activeCategory === cat.name ? "active" : ""}`}
            onClick={() => handleCategoryClick(cat.name)}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="emoji-grid-scroll-modern" ref={scrollRef}>
        {searchQuery ? (
          searchResults && searchResults.length > 0 ? (
            <div>
              <div className="emoji-category-label">Search results</div>
              {renderEmojiGrid(searchResults)}
            </div>
          ) : (
            <div className="emoji-no-results">No emojis found</div>
          )
        ) : (
          <>
            {/* Recent emojis */}
            {recentEmojis.length > 0 && (
              <div data-category="recent">
                <div className="emoji-category-label">Frequently used</div>
                {renderEmojiGrid(recentEmojis)}
              </div>
            )}

            {/* All categories */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.name} data-category={cat.name}>
                <div className="emoji-category-label">{cat.name}</div>
                {renderEmojiGrid(cat.emojis)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}