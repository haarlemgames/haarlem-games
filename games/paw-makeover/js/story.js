/* WS.story â€” levelreeks, honden, kleding en regels van Paw Makeover v2. Puur: geen DOM, geen opslag, geen audio.
   Klassiek script (window.WS.story) en Node-module. Zie docs/CONTRACT.md Â§2/Â§3. */
(function (root) {
  "use strict";

  var SAVE_VERSION = 2;
  var BEATS = ["clean", "dress", "play", "shower", "bed"];
  var SLOTS = ["head", "face", "neck", "wrist", "body"];
  var DOG_IDS = ["pup", "shepherd", "bichon"];
  var OCCASIONS = ["birthday", "camp", "beach"];

  var DOGS = {
    pup: { id: "pup", dir: "assets/dog", occasion: "birthday", levels: [1, 5] },
    shepherd: { id: "shepherd", dir: "assets/dog/german-shepherd", occasion: "camp", levels: [6, 10] },
    bichon: { id: "bichon", dir: "assets/dog/fluffy", occasion: "beach", levels: [11, 15] }
  };

  /* Thema-waarde per item: fit = past duidelijk bij de gelegenheid, ok = neutraal/prima, off = past niet (grappig).
     Sleutels: birthday, camp, beach, bed (pyjama-keuze). */
  function th(b, c, s, n) { return { birthday: b, camp: c, beach: s, bed: n }; }
  var ITEMS = {
    "party-hat":       { id: "party-hat", cat: "head", theme: th("fit", "off", "ok", "off") },
    "crown":           { id: "crown", cat: "head", theme: th("fit", "off", "ok", "off") },
    "straw-hat":       { id: "straw-hat", cat: "head", theme: th("ok", "ok", "fit", "off") },
    "ranger-hat":      { id: "ranger-hat", cat: "head", theme: th("off", "fit", "ok", "off") },
    "cap":             { id: "cap", cat: "head", theme: th("ok", "ok", "ok", "off") },
    "bowler":          { id: "bowler", cat: "head", theme: th("ok", "off", "off", "off") },
    "beanie":          { id: "beanie", cat: "head", theme: th("off", "fit", "off", "ok") },
    "nightcap":        { id: "nightcap", cat: "head", theme: th("off", "off", "off", "fit") },
    "sunglasses":      { id: "sunglasses", cat: "face", theme: th("ok", "off", "fit", "off") },
    "star-glasses":    { id: "star-glasses", cat: "face", theme: th("fit", "off", "ok", "off") },
    "bandana-blue":    { id: "bandana-blue", cat: "neck", theme: th("ok", "fit", "ok", "off") },
    "bandana-mint":    { id: "bandana-mint", cat: "neck", theme: th("ok", "fit", "ok", "off") },
    "bandana-yellow":  { id: "bandana-yellow", cat: "neck", theme: th("fit", "ok", "ok", "off") },
    "bow-tie":         { id: "bow-tie", cat: "neck", theme: th("fit", "off", "off", "off") },
    "scarf":           { id: "scarf", cat: "neck", theme: th("off", "fit", "off", "ok") },
    "flower-lei":      { id: "flower-lei", cat: "neck", theme: th("ok", "off", "fit", "off") },
    "party-vest":      { id: "party-vest", cat: "body", theme: th("fit", "off", "off", "off") },
    "hiking-vest":     { id: "hiking-vest", cat: "body", theme: th("off", "fit", "off", "off") },
    "hawaiian-shirt":  { id: "hawaiian-shirt", cat: "body", theme: th("ok", "off", "fit", "off") },
    "pyjama-stripes":  { id: "pyjama-stripes", cat: "body", theme: th("off", "off", "off", "fit") },
    "pyjama-moons":    { id: "pyjama-moons", cat: "body", theme: th("off", "off", "off", "fit") }
  };
  // Director Canva-lagen: alle delen delen hetzelfde canvas en passen alleen op de frontale herder.
  var CANVA_SHIRTS = ["grey", "black", "red", "green", "blue", "pink", "purple", "lila"].map(function (color) {
    var id = "canva-shirt-" + color;
    ITEMS[id] = { id: id, cat: "body", dogs: ["shepherd"], theme: th("ok", "fit", "ok", "off") };
    return id;
  });
  var CANVA_WATCHES = ["purple", "black"].map(function (color) {
    var id = "canva-watch-" + color;
    ITEMS[id] = { id: id, cat: "wrist", dogs: ["shepherd"], theme: th("ok", "fit", "ok", "off") };
    return id;
  });
  var CANVA_PYJAMAS = ["moon", "galaxy", "sheep", "elephant", "heart", "bear", "panda"].map(function (design) {
    var id = "canva-pj-" + design;
    ITEMS[id] = { id: id, cat: "body", dogs: ["shepherd"], theme: th("off", "off", "off", "fit") };
    return id;
  });
  var DIRECTOR_ITEMS = [{"id": "director-67-shirt-pup", "source": "67-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "67 shirt pup"}, {"id": "director-black-gold-watch-pup", "source": "black-gold-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "black gold watch pup"}, {"id": "director-black-watch-pup", "source": "black-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "black watch pup"}, {"id": "director-blue-watch-pup", "source": "blue-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "blue watch pup"}, {"id": "director-blueshirt-pup", "source": "blueshirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "blueshirt pup"}, {"id": "director-bowtie-blue-pup", "source": "bowtie-blue-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie blue pup"}, {"id": "director-bowtie-purple-pup", "source": "bowtie-purple-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie purple pup"}, {"id": "director-bowtie-red-pup", "source": "bowtie-red-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie red pup"}, {"id": "director-darkgreen-shirt-pup", "source": "darkgreen-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "darkgreen shirt pup"}, {"id": "director-fancy-black-shirt-pup-2", "source": "fancy-black-shirt-pup (2).webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy black shirt pup 2"}, {"id": "director-fancy-black-shirt-pup", "source": "fancy-black-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy black shirt pup"}, {"id": "director-fancy-brown-shirt-pup", "source": "fancy-brown-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy brown shirt pup"}, {"id": "director-fancy-shirt-grey-pup", "source": "fancy-shirt-grey-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy shirt grey pup"}, {"id": "director-fancy-shirt-pink-pup", "source": "fancy-shirt-pink-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy shirt pink pup"}, {"id": "director-green-shirt-pup", "source": "green-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "green shirt pup"}, {"id": "director-pj-animal-shirt-pup", "source": "PJ-animal-shirt-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "PJ animal shirt pup"}, {"id": "director-pj-cloud-shirt-whitedog", "source": "pj-cloud-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj cloud shirt whitedog"}, {"id": "director-pj-moon-shirt-whitedog", "source": "pj-moon-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj moon shirt whitedog"}, {"id": "director-pj-nightmare-shirt-whitedog", "source": "pj-nightmare-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj nightmare shirt whitedog"}, {"id": "director-pj-pink-unircorn-shirt-whitedog", "source": "pj-pink-unircorn-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj pink unircorn shirt whitedog"}, {"id": "director-pj-pinkflower-shirt-whitedog", "source": "pj-pinkflower-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj pinkflower shirt whitedog"}, {"id": "director-pj-purple-shirt-whitedog", "source": "pj-purple-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj purple shirt whitedog"}, {"id": "director-pj-purple-unicorn-whiteshirt", "source": "pj-purple-unicorn-whiteshirt.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj purple unicorn whiteshirt"}, {"id": "director-pj-rave-shirt-whitedog", "source": "pj-rave-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj rave shirt whitedog"}, {"id": "director-pj-red-meme-whitedog", "source": "pj-red-meme-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj red meme whitedog"}, {"id": "director-pj-shirt-blue-dream-pup", "source": "pj-shirt-blue-dream-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt blue dream pup"}, {"id": "director-pj-shirt-blue-pup", "source": "pj-shirt-blue-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt blue pup"}, {"id": "director-pj-shirt-pink-moon-pup", "source": "pj-shirt-pink-moon-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt pink moon pup"}, {"id": "director-pj-shirt-pink-pup", "source": "pj-shirt-pink-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt pink pup"}, {"id": "director-purple-funny-shirt-pup", "source": "purple-funny- shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "purple funny  shirt pup"}, {"id": "director-roblox-shirt-pup", "source": "roblox-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "roblox shirt pup"}];
  DIRECTOR_ITEMS.forEach(function (e) { ITEMS[e.id] = { id: e.id, cat: e.cat, dogs: [e.breed], theme: e.phase === "bed" ? th("off", "off", "off", "fit") : th("fit", "off", "off", "off") }; });
  var ITEM_IDS = Object.keys(ITEMS);

  /* ---------- levelconfiguratie ---------- */
  var DRESS = {
    birthday: { cats: ["head", "neck", "body"], items: { head: ["party-hat", "crown", "straw-hat", "bowler"], neck: ["bow-tie", "bandana-yellow", "scarf", "flower-lei"], body: ["party-vest", "hiking-vest", "hawaiian-shirt"] } },
    camp: { cats: ["body", "wrist"], items: { body: CANVA_SHIRTS, wrist: CANVA_WATCHES } },
    beach: { cats: ["head", "face", "neck", "body"], items: { head: ["straw-hat", "cap", "beanie"], face: ["sunglasses", "star-glasses"], neck: ["flower-lei", "bandana-blue", "scarf"], body: ["hawaiian-shirt", "hiking-vest", "party-vest"] } }
  };
  var PYJAMA = {
    pup: { cats: ["head", "body"], items: { head: ["nightcap", "beanie", "cap"], body: ["pyjama-stripes", "pyjama-moons", "hawaiian-shirt"] } },
    shepherd: { cats: ["body"], items: { body: CANVA_PYJAMAS } },
    bichon: { cats: ["head", "body"], items: { head: ["nightcap", "straw-hat", "party-hat"], body: ["pyjama-stripes", "pyjama-moons", "party-vest"] } }
  };

  DRESS.birthday = {"cats": ["body", "wrist", "neck"], "items": {"body": ["director-67-shirt-pup", "director-blueshirt-pup", "director-darkgreen-shirt-pup", "director-fancy-black-shirt-pup-2", "director-fancy-black-shirt-pup", "director-fancy-brown-shirt-pup", "director-fancy-shirt-grey-pup", "director-fancy-shirt-pink-pup", "director-green-shirt-pup", "director-purple-funny-shirt-pup", "director-roblox-shirt-pup"], "wrist": ["director-black-gold-watch-pup", "director-black-watch-pup", "director-blue-watch-pup"], "neck": ["director-bowtie-blue-pup", "director-bowtie-purple-pup", "director-bowtie-red-pup"]}};
  PYJAMA.pup = {"cats": ["body"], "items": {"body": ["director-pj-animal-shirt-pup", "director-pj-shirt-blue-dream-pup", "director-pj-shirt-blue-pup", "director-pj-shirt-pink-moon-pup", "director-pj-shirt-pink-pup"]}};
  PYJAMA.bichon = {"cats": ["body"], "items": {"body": ["director-pj-cloud-shirt-whitedog", "director-pj-moon-shirt-whitedog", "director-pj-nightmare-shirt-whitedog", "director-pj-pink-unircorn-shirt-whitedog", "director-pj-pinkflower-shirt-whitedog", "director-pj-purple-shirt-whitedog", "director-pj-purple-unicorn-whiteshirt", "director-pj-rave-shirt-whitedog", "director-pj-red-meme-whitedog"]}};

  /* Achtergrondsleutels verwijzen naar WS.art.scenes. */
  var CLEAN = {
    pup:      { bg: "garden", mood: "sad", easy: true, steps: [ { tool: "wipe", art: "mud", count: 4 }, { tool: "brush", strokes: 3 } ] },   // director 2026-10-27: minder herhaling, ruim gebaar
    shepherd: { bg: "trail",  mood: "sad", steps: [ { tool: "pick", art: "burr", count: 6 }, { tool: "wash", art: "mud", count: 3 }, { tool: "brush", strokes: 6, comb: true } ] },
    bichon:   { bg: "yard",   mood: "sad", easy: true, steps: [ { tool: "wipe", art: "sticky", count: 3 }, { tool: "wash", art: "sticky", count: 2 }, { tool: "brush", strokes: 3, fluff: true } ] }
  };
  var PLAY = {
    pup:      { bg: "birthday", game: "birthday", rounds: 3, mess: "party" },   // precies 3 keer apporteren, dan taart tikken (2026-10-06)
    shepherd: { bg: "camp",     game: "camp",     rounds: 7, mess: "camp" },
    bichon:   { bg: "beach",    game: "beach",    rounds: 6, mess: "beach" }
  };
  var SHOWER = {
    pup:      { bg: "bath-1", variant: "basic", easy: true, steps: ["wet", "shampoo", "rinse", "towel"] },
    shepherd: { bg: "bath-2", variant: "details", steps: ["wet", "shampoo", "rinse", "towel"] },
    bichon:   { bg: "bath-3", variant: "fluff", easy: true, steps: ["wet", "shampoo", "rinse", "towel", "dryer"] }
  };
  var BED = {
    pup:      { bg: "bedroom", tint: 0,    routine: "blanket", steps: ["hop", "blanket", "lamp"] },
    shepherd: { bg: "bedroom", tint: 38,   routine: "story",   steps: ["teeth", "story", "blanket", "lamp"] },
    bichon:   { bg: "bedroom", tint: -35,  routine: "teddy",   steps: ["teddy", "stars", "blanket", "lamp"] }
  };
  var DRESS_BG = { birthday: "dress-party", camp: "dress-camp", beach: "dress-beach" };

  function buildLevel(n) {
    var dogIdx = Math.floor((n - 1) / 5), dog = DOG_IDS[dogIdx], beat = BEATS[(n - 1) % 5], occ = DOGS[dog].occasion;
    var L = { id: n, dog: dog, beat: beat, occasion: occ, arc: dogIdx, indexInArc: (n - 1) % 5, themeKey: "theme." + beat + "." + occ };
    if (beat === "clean") { L.cfg = CLEAN[dog]; L.bg = CLEAN[dog].bg; L.themeKey = "theme.clean." + dog; }
    if (beat === "dress") { L.cfg = DRESS[occ]; L.bg = DRESS_BG[occ]; L.themeKey = "theme.dress." + occ; L.themeKind = occ; }
    if (beat === "play") { L.cfg = PLAY[dog]; L.bg = PLAY[dog].bg; L.themeKey = "theme.play." + occ; }
    if (beat === "shower") { L.cfg = SHOWER[dog]; L.bg = SHOWER[dog].bg; L.themeKey = "theme.shower"; }
    if (beat === "bed") { L.cfg = BED[dog]; L.bg = BED[dog].bg; L.themeKey = "theme.bed"; L.themeKind = "bed"; L.pyjama = PYJAMA[dog]; }
    return L;
  }
  var LEVELS = [];
  for (var i = 1; i <= 15; i++) LEVELS.push(buildLevel(i));
  var MAX_LEVEL = LEVELS.length;

  function levelById(n) { n = n | 0; return n >= 1 && n <= MAX_LEVEL ? LEVELS[n - 1] : null; }
  function itemById(id) { return ITEMS[id] || null; }
  function categoryOf(id) { return ITEMS[id] ? ITEMS[id].cat : null; }

  /* ---------- outfit ---------- */
  function emptyOutfit() { return { head: null, face: null, neck: null, wrist: null, body: null }; }
  function normalizeOutfit(o) {
    var r = emptyOutfit();
    if (!o || typeof o !== "object") return r;
    SLOTS.forEach(function (s) { var id = o[s]; if (typeof id === "string" && ITEMS[id] && ITEMS[id].cat === s) r[s] = id; });
    return r;
  }
  function outfitIds(o) { o = normalizeOutfit(o); return SLOTS.map(function (s) { return o[s]; }).filter(Boolean); }
  function sameOutfit(a, b) { a = normalizeOutfit(a); b = normalizeOutfit(b); return SLOTS.every(function (s) { return a[s] === b[s]; }); }

  /* Beoordeling pas NA bevestigen. kind: 'birthday'|'camp'|'beach'|'bed'.
     verdict: silly (>=1 off) | great (>=2 fit, 0 off) | good (1 fit, 0 off) | okay (0 fit, 0 off). */
  function evaluateOutfit(kind, outfit) {
    var ids = outfitIds(outfit), per = {}, fit = 0, ok = 0, off = 0;
    ids.forEach(function (id) { var v = (ITEMS[id].theme[kind]) || "off"; per[id] = v; if (v === "fit") fit++; else if (v === "ok") ok++; else off++; });
    var verdict = !ids.length ? "okay" : off > 0 ? "silly" : fit >= 2 ? "great" : fit === 1 ? "good" : "okay";
    return { verdict: verdict, fit: fit, ok: ok, off: off, count: ids.length, perItem: per };
  }

  /* ---------- save v2 ---------- */
  function defaultSave() {
    var arcs = {}; DOG_IDS.forEach(function (d) { arcs[d] = { party: null, pyjama: null }; });
    return { unlockedLevel: 1, completed: {}, arcs: arcs, hintsSeen: {}, settings: { music: true, sfx: true } };
  }
  function clampInt(n, a, b, d) { n = Number(n); if (!isFinite(n)) return d; n = Math.floor(n); return n < a ? a : n > b ? b : n; }
  function validateSave(x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    var d = defaultSave();
    d.unlockedLevel = clampInt(x.unlockedLevel, 1, MAX_LEVEL, 1);
    if (x.completed && typeof x.completed === "object") {
      for (var k in x.completed) { var n = clampInt(k, 1, MAX_LEVEL, 0); if (n && x.completed[k]) d.completed[n] = true; }
    }
    // voortgang is altijd consistent: elk voltooid level ontgrendelt het volgende
    var maxDone = 0; for (var c in d.completed) maxDone = Math.max(maxDone, Number(c));
    d.unlockedLevel = Math.min(MAX_LEVEL, Math.max(d.unlockedLevel, maxDone + 1));
    if (x.arcs && typeof x.arcs === "object") {
      DOG_IDS.forEach(function (dog) {
        var a = x.arcs[dog];
        if (a && typeof a === "object") {
          d.arcs[dog].party = a.party ? normalizeOutfit(a.party) : null;
          d.arcs[dog].pyjama = a.pyjama ? normalizeOutfit(a.pyjama) : null;
        }
      });
    }
    if (x.hintsSeen && typeof x.hintsSeen === "object") for (var h in x.hintsSeen) if (x.hintsSeen[h] === true && /^[a-z0-9_-]{1,40}$/i.test(h)) d.hintsSeen[h] = true;
    if (x.settings && typeof x.settings === "object") { d.settings.music = x.settings.music !== false; d.settings.sfx = x.settings.sfx !== false; }
    return d;
  }
  /* v1 -> v2: alleen instellingen en hints; progressie begint opnieuw (v1-levels zijn niet gelijkwaardig). */
  function migrate(old, fromVersion) {
    var d = defaultSave();
    if (old && typeof old === "object" && fromVersion === 1) {
      if (old.settings && typeof old.settings === "object") { d.settings.music = old.settings.music !== false; d.settings.sfx = old.settings.sfx !== false; }
      if (old.hintsSeen && typeof old.hintsSeen === "object") for (var h in old.hintsSeen) if (old.hintsSeen[h] === true && /^[a-z0-9_-]{1,40}$/i.test(h)) d.hintsSeen[h] = true;
      return d;
    }
    return null;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function completeLevel(save, n) {
    var s = clone(save); n = n | 0;
    if (n < 1 || n > MAX_LEVEL) return s;
    s.completed[n] = true;
    s.unlockedLevel = Math.min(MAX_LEVEL, Math.max(s.unlockedLevel, n + 1));
    return s;
  }
  function setOutfit(save, dog, slot, outfit) {
    var s = clone(save);
    if (!s.arcs[dog] || (slot !== "party" && slot !== "pyjama")) return s;
    s.arcs[dog][slot] = outfit ? normalizeOutfit(outfit) : null;
    return s;
  }
  function markHintSeen(save, key) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(String(key)) || save.hintsSeen[key]) return save;
    var s = clone(save); s.hintsSeen[key] = true; return s;
  }
  /* Welke outfit hoort bij een level: play/shower tonen party; bed (na keuze) pyjama. */
  function outfitForLevel(save, level) {
    var a = save && save.arcs && save.arcs[level.dog];
    if (!a) return emptyOutfit();
    if (level.beat === "play") return normalizeOutfit(a.party);
    
    return emptyOutfit();
  }
  function finished(save) { return !!(save && save.completed && save.completed[MAX_LEVEL]); }

  var api = {
    SAVE_VERSION: SAVE_VERSION, BEATS: BEATS, SLOTS: SLOTS, DOG_IDS: DOG_IDS, DOGS: DOGS, OCCASIONS: OCCASIONS,
    ITEMS: ITEMS, ITEM_IDS: ITEM_IDS, LEVELS: LEVELS, MAX_LEVEL: MAX_LEVEL, DRESS: DRESS, PYJAMA: PYJAMA, CLEAN: CLEAN, PLAY: PLAY, SHOWER: SHOWER, BED: BED,
    levelById: levelById, itemById: itemById, categoryOf: categoryOf,
    emptyOutfit: emptyOutfit, normalizeOutfit: normalizeOutfit, outfitIds: outfitIds, sameOutfit: sameOutfit, evaluateOutfit: evaluateOutfit,
    defaultSave: defaultSave, validateSave: validateSave, migrate: migrate, completeLevel: completeLevel, setOutfit: setOutfit,
    markHintSeen: markHintSeen, outfitForLevel: outfitForLevel, finished: finished
  };
  root.WS = root.WS || {}; root.WS.story = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
