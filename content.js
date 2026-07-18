(function () {
  "use strict";

  const CONFIG = {

    QUIZ_PER_ROUND: 5,
    SOLO_PER_ROUND: 6,

    REPLAY_COST: 80,

    PARTNER_LEAVE_THRESHOLD: 70,

    MIN_AGE: 18,
    MAX_AGE: 70,
    DEFAULT_AGE: 30,

    MAX_DESIRED_TRAITS: 3,

    AGE_BRACKETS: [
      [18, 29],
      [30, 39],
      [40, 49],
      [50, 59],
      [60, 75],
    ],
  };

  const ORIENTATIONS = [
    { id: "straight", label: "Straight" },
    { id: "gay", label: "Gay" },
    { id: "bi", label: "Bi" },
    { id: "pansexual", label: "Pan" },
    { id: "queer", label: "Queer" },
    { id: "asexual", label: "Ace" },
  ];

  const RELIGIONS = [
    { id: "any", label: "Any" },
    { id: "christian", label: "Christian" },
    { id: "muslim", label: "Muslim" },
    { id: "jewish", label: "Jewish" },
    { id: "hindu", label: "Hindu" },
    { id: "buddhist", label: "Buddhist" },
    { id: "spiritual", label: "Spiritual" },
    { id: "atheist", label: "Atheist" },
  ];

  const GENDERS = [
    { id: "woman", label: "Woman" },
    { id: "man", label: "Man" },
    { id: "nonbinary", label: "Non-binary" },
    { id: "other", label: "Other" },
  ];

  const CHARACTER_TRAITS = [
    { id: "sweet", label: "Sweet", emoji: "🍯" },
    { id: "loyal", label: "Caring", emoji: "🤲" },
    { id: "leader", label: "Leader", emoji: "👑" },
    { id: "playful", label: "Playful", emoji: "🎈" },
    { id: "ambitious", label: "Ambitious", emoji: "🚀" },
    { id: "romantic", label: "Romantic", emoji: "🌹" },
    { id: "adventurous", label: "Bold", emoji: "🧗" },
    { id: "homebody", label: "Homey", emoji: "🏡" },
    { id: "cheerful", label: "Cheerful", emoji: "😄" },
    { id: "bookworm", label: "Bookworm", emoji: "📚" },
    { id: "creative", label: "Creative", emoji: "🎨" },
    { id: "genius", label: "Genius", emoji: "🧠" },
    { id: "familyoriented", label: "Family-Oriented", emoji: "👨‍👩‍👧" },
    { id: "outgoing", label: "Outgoing", emoji: "🎉" },
    { id: "perfectionist", label: "Perfectionist", emoji: "📏" },
    { id: "neat", label: "Neat", emoji: "🧼" },
    { id: "foodie", label: "Foodie", emoji: "🍔" },
    { id: "musiclover", label: "Music Lover", emoji: "🎵" },
    { id: "artlover", label: "Art Lover", emoji: "🖼️" },
    { id: "active", label: "Active", emoji: "🏃" },
    { id: "goofball", label: "Goofball", emoji: "🤪" },
    { id: "selfassured", label: "Self-Assured", emoji: "💪" },
    { id: "loner", label: "Loner", emoji: "🌙" },
    { id: "materialistic", label: "Materialistic", emoji: "💎" },
    { id: "snob", label: "Snob", emoji: "🎩" },
    { id: "hotheaded", label: "Hot-Headed", emoji: "🔥" },
    { id: "glutton", label: "Glutton", emoji: "🍕" },
    { id: "nightowl", label: "Night Owl", emoji: "🦉" },
    { id: "frugal", label: "Frugal", emoji: "💰" },
    { id: "clumsy", label: "Clumsy", emoji: "🤸" },
    { id: "jealous", label: "Jealous", emoji: "😒" },
    { id: "gloomy", label: "Gloomy", emoji: "🌧️" },
    { id: "evil", label: "Evil", emoji: "😈" },
    { id: "slob", label: "Slob", emoji: "🧦" },
    { id: "mean", label: "Mean", emoji: "😏" },
    { id: "childish", label: "Childish", emoji: "🧸" },
    { id: "insider", label: "Insider", emoji: "📱" },
    { id: "kleptomaniac", label: "Kleptomaniac", emoji: "🧤" },
  ];

  const NEGATIVE_TRAITS = [
    "loner", "materialistic", "snob", "hotheaded", "glutton", "nightowl",
    "frugal", "clumsy", "jealous", "gloomy", "evil", "slob", "mean",
    "childish", "insider", "kleptomaniac",
  ];

  const VOWS = [
    { id: "classic", label: "Classic", line: "I promise to love you in sickness and in health, today and always.", bonus: 4, bestTrait: "loyal" },
    { id: "funny", label: "Funny", line: "I vow to share my fries, always — even the crispy ones.", bonus: 4, bestTrait: "playful" },
    { id: "poetic", label: "Poetic", line: "You are the quiet between my heartbeats. I choose you.", bonus: 6, bestTrait: "romantic" },
    { id: "wild", label: "Wild", line: "Let's burn the map and build a life nobody else dares to.", bonus: 5, bestTrait: "adventurous" },
  ];

  const COUNTRIES = [
    "United States", "Canada", "Mexico",
    "Brazil", "Argentina", "Chile", "Colombia", "Peru",
    "United Kingdom", "Ireland", "France", "Germany", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Spain", "Italy",
    "Denmark", "Sweden", "Norway", "Finland", "Iceland",
    "Poland", "Czechia", "Hungary", "Romania", "Greece", "Ukraine",
    "Turkey", "Israel", "United Arab Emirates", "Saudi Arabia",
    "South Africa", "Egypt", "Nigeria", "Kenya", "Morocco",
    "India", "Pakistan", "Bangladesh", "Thailand", "Singapore", "Malaysia",
    "Indonesia", "Philippines", "Vietnam", "Hong Kong", "China", "South Korea", "Japan",
    "Australia", "New Zealand",
  ].sort((a, b) => a.localeCompare(b));

  const ANYWHERE_COUNTRY = "Anywhere";

  const ACHIEVEMENTS = [
    { id: "first_marriage", emoji: "💍", label: "Say I Do", desc: "Complete the altar and begin your first honeymoon." },
    { id: "ran_away", emoji: "🏃", label: "Cold Feet", desc: "Run away from the altar before saying I do." },
    { id: "rewarded_used", emoji: "📺", label: "Worth The Wait", desc: "Unlock a bold choice by watching a rewarded video." },
    { id: "perfect_honeymoon", emoji: "🎬", label: "No Filter", desc: "Pick the bold option on every reply and question in one honeymoon." },
    { id: "dumped", emoji: "💔", label: "Reality Check", desc: "Get dumped by your partner before Decision Day." },
    { id: "divorced", emoji: "📝", label: "It's Not You, It's Me", desc: "Choose to divorce on Decision Day." },
    { id: "stayed_together", emoji: "🤝", label: "For Better or Worse", desc: "Choose to stay together on Decision Day." },
    { id: "blindsided", emoji: "⚡", label: "Left Hanging", desc: "Rare (~2%): your partner calls it off right after you chose to stay together." },
    { id: "real_love", emoji: "💕", label: "Real Love", desc: "Reach a \"Real Love\" verdict (70%+ affection)." },
    { id: "soulmates", emoji: "💞", label: "Soulmates", desc: "Reach a \"Soulmates\" verdict (85%+ affection)." },
    { id: "five_years", emoji: "⏩", label: "Fast Forward", desc: "Unlock the Five Years Later epilogue." },
    { id: "first_save", emoji: "💾", label: "Sentimental", desc: "Save your first wedding to the album." },
    { id: "collector", emoji: "📚", label: "Hopeless Romantic", desc: "Save 5 weddings to the album." },
    { id: "silver_fox", emoji: "🥂", label: "September Song", desc: "Get matched with a partner aged 45 or older." },
    { id: "golden_years", emoji: "👵", label: "Golden Years", desc: "Get matched with a partner aged 60 or older." },
    { id: "globe_trotter", emoji: "🌍", label: "Passport Stamped", desc: "Get matched with partners from 5 different countries." },
    { id: "anywhere", emoji: "🧭", label: "Open to Anywhere", desc: "Get matched after choosing \"Anywhere\" for location." },
    { id: "chaos_agent", emoji: "🔥", label: "Chaos Agent", desc: "Deliberately pick 2+ difficult traits (jealous, mean, evil...) for your ideal partner — and get matched anyway." },
    { id: "glow_up", emoji: "✨", label: "Glow Up", desc: "Earn enough growth points to reapply for the experiment." },
    { id: "serial_dater", emoji: "🔁", label: "Serial Dater", desc: "Start 3 separate marriages." },
    { id: "vow_collector", emoji: "📜", label: "Vow Collector", desc: "Use all 4 vow types across your marriages." },
    { id: "solo_debut", emoji: "🎮", label: "Solo Debut", desc: "Make your first choice in Solo Adventure." },
    { id: "solo_master", emoji: "🏅", label: "Solo Master", desc: "Earn enough growth points to reapply for the experiment." },
    { id: "married_the_chaos", emoji: "😈", label: "Married The Chaos", desc: "Choose to stay together after deliberately picking a difficult trait (mean, evil, jealous...) for your partner." },
    { id: "world_tour", emoji: "🌎", label: "World Tour", desc: "Get matched with a partner from every country in the list." },
  ];

  const CREST_EMOJIS = [
    "💞", "❤️", "🏡", "🌿", "⭐", "🌙", "🦋", "🌸", "🕊️", "🔥", "🌊", "🐾",
    "👑", "💍", "🍀", "🌻", "🎻", "⚜️", "🕯️", "🍯", "🦢", "🌹", "✨", "🍷",
  ];
  const CREST_COLORS = [
    { id: "rose", bg: "#e0457b", label: "Rose" },
    { id: "sunset", bg: "#e8743b", label: "Sunset" },
    { id: "gold", bg: "#c99a2e", label: "Gold" },
    { id: "forest", bg: "#3f7d5c", label: "Forest" },
    { id: "ocean", bg: "#2f6f9e", label: "Ocean" },
    { id: "plum", bg: "#6b4a87", label: "Plum" },
    { id: "slate", bg: "#4a5568", label: "Slate" },
    { id: "berry", bg: "#a13b6b", label: "Berry" },
    { id: "teal", bg: "#2b7a72", label: "Teal" },
    { id: "midnight", bg: "#2c2f6b", label: "Midnight" },
    { id: "rust", bg: "#a4482a", label: "Rust" },
    { id: "charcoal", bg: "#33363d", label: "Charcoal" },
  ];

  const CREST_BORDERS = [
    { id: "ivory", border: "#fffbfc", label: "Ivory" },
    { id: "champagne", border: "#f0dfb4", label: "Champagne" },
    { id: "royalgold", border: "#d9b23a", label: "Royal Gold" },
    { id: "silver", border: "#c7ccd1", label: "Silver" },
    { id: "rosegold", border: "#e3b8a8", label: "Rose Gold" },
    { id: "ink", border: "#22242b", label: "Ink" },
  ];

  const HOME_STYLES = [
    { id: "garden_house", emoji: "🏡", label: "House with a garden", desc: "a sun-drenched house with a garden" },
    { id: "city_apartment", emoji: "🏙️", label: "City apartment", desc: "a cozy city apartment with a view of the skyline" },
    { id: "beach_cottage", emoji: "🏖️", label: "Beach cottage", desc: "a little cottage two blocks from the beach" },
    { id: "mountain_cabin", emoji: "⛰️", label: "Mountain cabin", desc: "a wood-stove cabin up in the mountains" },
    { id: "farmhouse", emoji: "🚜", label: "Countryside farmhouse", desc: "an old farmhouse you're slowly fixing up together" },
    { id: "downtown_loft", emoji: "🏢", label: "Downtown loft", desc: "a converted loft in the middle of downtown" },
    { id: "tiny_studio", emoji: "🛖", label: "Cozy tiny home", desc: "a tiny, ruthlessly cozy home you built out yourselves" },
    { id: "houseboat", emoji: "🛥️", label: "Houseboat", desc: "a houseboat that never quite stops rocking" },
    { id: "vineyard", emoji: "🍇", label: "Vineyard house", desc: "a stone house out among a small vineyard" },
    { id: "starter_place", emoji: "🔑", label: "Your first place", desc: "a small place you're slowly making yours" },
  ];

  window.MAFS = window.MAFS || {};
  window.MAFS.CONFIG = CONFIG;
  window.MAFS.ORIENTATIONS = ORIENTATIONS;
  window.MAFS.RELIGIONS = RELIGIONS;
  window.MAFS.GENDERS = GENDERS;
  window.MAFS.CHARACTER_TRAITS = CHARACTER_TRAITS;
  window.MAFS.NEGATIVE_TRAITS = NEGATIVE_TRAITS;
  window.MAFS.VOWS = VOWS;
  window.MAFS.ACHIEVEMENTS = ACHIEVEMENTS;
  window.MAFS.COUNTRIES = COUNTRIES;
  window.MAFS.ANYWHERE_COUNTRY = ANYWHERE_COUNTRY;
  window.MAFS.CREST_EMOJIS = CREST_EMOJIS;
  window.MAFS.CREST_COLORS = CREST_COLORS;
  window.MAFS.CREST_BORDERS = CREST_BORDERS;
  window.MAFS.HOME_STYLES = HOME_STYLES;
})();
