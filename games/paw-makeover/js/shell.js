/* Shell van Paw Makeover v2: schermen, levelvolgorde (story.js), activity-lifecycle, pauze, instellingen, metingen, Poki-hooks.
   Zie docs/CONTRACT.md §6-§7. Alle spelertekst via WS.i18n.t. Geen tijdslimiet, geen verliezen. */
(function () {
  "use strict";
  var WS = window.WS, story = WS.story, art = WS.art, scene = WS.scene;
  var t = WS.i18n.t;
  var LAST = story.MAX_LEVEL;

  /* ---------- opslag ---------- */
  var store = WS.storage.createSaveStore({ gameId: "paw-makeover", version: story.SAVE_VERSION, defaults: story.defaultSave(), validate: story.validateSave, migrate: story.migrate });
  var data = store.load();
  function persist() { store.save(data); renderSaveInfo(); }

  /* ---------- audio + Poki ---------- */
  var adMuted = false, continuePending = false, playedOnce = false;
  var audio = WS.audio.createAudio(function () { return adMuted ? { music: false, sfx: false } : data.settings; });
  var measured = [];   // lokale kopie van alle measure-events (QA; geen netwerk)
  var BUILD_ID = "v1-3";   // Poki-buildlabel = versie 1.3 (director 2026-10-27); bij elke nieuwe Poki-build ophogen
  var platform = {
    init: function () {}, loadingFinished: function () {}, userGesture: function () {},
    start: function () {}, stop: function () {}, levelStart: function () {},
    levelComplete: function () {}, step: function () {}, exit: function () {},
    canBreak: function () { return false; }, isBlocked: function () { return false; },
    commercialBreak: function () { return Promise.resolve(false); }
  };
  ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "click", "keydown", "keyup", "wheel"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (platform.isBlocked()) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
  });
  document.addEventListener("keydown", function (e) {
    if (machine && machine.get() === "playing" && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) >= 0 && !isFormControl(e.target)) e.preventDefault();
  });
  function isFormControl(el) { return el && el.closest && !!el.closest("button,input,select,textarea,[role=slider],[tabindex]"); }
  document.addEventListener("wheel", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("dragstart", function (e) { e.preventDefault(); }, true);
  document.addEventListener("selectstart", function (e) { if (!e.target.closest || !e.target.closest("input,textarea")) e.preventDefault(); }, true);
  function unlockOnce() { if (!platform.isBlocked()) audio.unlock(); }
  /* iOS Safari/Chrome Android: alleen loslaten (touchend/pointerup/click) of een toets telt als toestemming voor geluid; touchstart/pointerdown
     niet. Zonder klik (autostart, automatisch door naar level 2) bleef de muziek in level 1-2 daardoor stil op mobiel (director 2026-10-06). */
  ["pointerdown", "keydown", "touchstart", "touchend", "pointerup", "click"].forEach(function (ev) { document.addEventListener(ev, unlockOnce, { passive: true }); });

  /* ---------- DOM ---------- */
  function $(id) { return document.getElementById(id); }
  function q(sel) { return document.querySelector(sel); }
  function setText(id, text) { var e = $(id); if (e) e.textContent = text; }
  function reducedMotion() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  var screens = { home: q('[data-screen="home"]'), game: q('[data-screen="game"]'), settings: q('[data-screen="settings"]'), paused: q('[data-screen="paused"]') };
  var visibleFor = { home: ["home"], settings: ["settings"], playing: ["game"], paused: ["game", "paused"], reveal: ["game"] };
  var focusFor = { home: "btn-play", settings: "btn-back", paused: "btn-resume" };
  function modalOpen() { return !!document.body.dataset.modal; }

  /* ---------- toestand van het huidige level ---------- */
  var currentLevel = 1, attempt = 0, level = null, act = null, ended = false, lastResult = null;
  var timers = [], timerSeq = 0, paused = false;
  var debug = { events: [], timing: { perLevel: {}, total: 0 }, level: null, attempt: 0 };
  var lastInteract = 0, activeMs = 0;

  /* pauzeerbare timers voor activities */
  function schedule(fn, ms) {
    var tm = { id: ++timerSeq, fn: fn, left: Math.max(0, ms), t0: Date.now(), h: null };
    timers.push(tm);
    if (!paused) arm(tm);
    return tm.id;
  }
  function arm(tm) { tm.t0 = Date.now(); tm.h = setTimeout(function () { drop(tm.id); try { tm.fn(); } catch (e) { console.error(e); } }, tm.left); }
  function drop(id) { timers = timers.filter(function (x) { return x.id !== id; }); }
  function cancel(id) { timers.forEach(function (x) { if (x.id === id && x.h) clearTimeout(x.h); }); drop(id); }
  function clearTimers() { timers.forEach(function (x) { if (x.h) clearTimeout(x.h); }); timers = []; }
  function pauseTimers() { paused = true; timers.forEach(function (x) { if (x.h) { clearTimeout(x.h); x.h = null; x.left = Math.max(0, x.left - (Date.now() - x.t0)); } }); }
  function resumeTimers() { paused = false; timers.forEach(function (x) { if (!x.h) arm(x); }); }

  function rngFor(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var r = Math.imul(a ^ (a >>> 15), 1 | a); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

  function interact() {
    var now = Date.now();
    if (level && !ended && !firstInput) { firstInput = true; platform.step(level.id, 'first-input', 'complete'); }   // v1.3: deed de speler iets in dit level?
    if (!ended && !paused && level) { if (lastInteract) activeMs += Math.min(now - lastInteract, 3000); lastInteract = now; recordTiming(); }
  }
  var priorMs = 0;
  function recordTiming() {
    if (!level) return;
    debug.timing.perLevel[level.id] = priorMs + activeMs;
    var sum = 0; Object.keys(debug.timing.perLevel).forEach(function (k) { sum += debug.timing.perLevel[k]; });
    debug.timing.total = sum;
  }

  function makeCtx(lv) {
    var seen = JSON.parse(JSON.stringify(data));
    var rng = rngFor(lv.id * 1009 + attempt * 7919);
    return {
      level: lv, dog: lv.dog, save: seen, scene: scene,
      panel: $("act-panel"), overlay: $("act-overlay"),
      t: t, sfx: function (n) { audio.sfx(n); },
      setProgress: setProgress, interact: interact, schedule: schedule, cancel: cancel,
      isPaused: function () { return paused; }, reduced: reducedMotion(), rng: rng,
      hintSeen: function (k) { return !!data.hintsSeen[k]; },
      markHint: function (k) { if (!data.hintsSeen[k]) { data = story.markHintSeen(data, k); persist(); } },
      setOutfit: function (slot, outfit) { data = story.setOutfit(data, lv.dog, slot, outfit); persist(); },
      complete: function (res) { onComplete(lv, res); },
      step: function (id, action) { if (level === lv && !ended) platform.step(lv.id, id, action); },
      log: function (evt, d) { debug.events.push({ t: Date.now(), level: lv.id, evt: evt, data: d }); if (debug.events.length > 2000) debug.events.shift(); }
    };
  }

  function setProgress(p) {
    p = Math.max(0, Math.min(1, Number(p) || 0));
    var el = $("progress"); if (!el) return;
    el.setAttribute("aria-valuenow", String(Math.round(p * 100))); el.setAttribute("aria-label", t("progressAria"));
    el.style.setProperty("--pct", Math.round(p * 100) + "%");
  }

  /* ---------- weergave ---------- */
  function renderSaveInfo() {
    var st = store.getStatus();
    var msg = { unavailable: t("saveUnavailable"), "write-failed": t("saveFailed"), corrupt: t("saveCorrupt") }[st] || "";
    var banner = $("save-banner"); if (banner) { banner.textContent = msg; banner.hidden = !msg; }
    setText("save-status", t("saveStatus", { status: st, key: store.key }));
  }
  function renderHome() { setText("btn-play", t("playLevel", { level: story.finished(data) ? 1 : data.unlockedLevel })); }
  function renderSettings() {
    var m = data.settings.music, s = data.settings.sfx, any = m || s;
    var mu = $("set-music"), sf = $("set-sfx");
    if (mu) { mu.textContent = t("music", { state: t(m ? "on" : "off") }); mu.setAttribute("aria-checked", String(m)); }
    if (sf) { sf.textContent = t("sfx", { state: t(s ? "on" : "off") }); sf.setAttribute("aria-checked", String(s)); }
    var bs = $("btn-sound");
    if (bs) { bs.setAttribute("aria-pressed", String(any)); bs.setAttribute("aria-label", t(any ? "mute" : "unmute")); }
    var ic = $("sound-icon"); if (ic) ic.src = "assets/icons/" + (any ? "sound.svg" : "muted.svg");
    var r = $("btn-reset"); if (r) { r.textContent = t("reset"); r.dataset.armed = ""; }
  }
  function renderHud() {
    if (!level) return;
    setText("hud-theme", t(level.themeKey)); setText("hud-level", t("levelOf", { level: level.id, total: LAST }));
    var ht = $("hud-theme"); if (ht) ht.setAttribute("aria-label", t("themeAria", { theme: t(level.themeKey) }));
  }
  var autoNext = 0;
  function renderEnd() {
    if (!level || !lastResult) return;
    var last = level.id === LAST, note;
    if (last) note = t("end.final");
    else if (lastResult.verdict && level.themeKind) note = t("verdict." + level.themeKind + "." + lastResult.verdict);
    else note = t("end." + level.beat);
    setText("end-note", note);
    var fin = $("end-finale");
    if (last) {
      if (!fin) { fin = document.createElement("div"); fin.id = "end-finale"; fin.className = "end-finale"; fin.setAttribute("aria-hidden", "true"); var en = $("end-note"); en.parentNode.insertBefore(fin, en); }
      fin.textContent = ""; var fi = document.createElement("img"); fi.alt = ""; fi.src = art.abs(art.finale); fin.appendChild(fi);
    } else if (fin) fin.remove();
    var nx = $("btn-end-next"); if (nx) { var lab = last ? t("playAgain") : t("next"); nx.setAttribute("aria-label", lab); var im = nx.querySelector("img"); if (im) im.src = last ? "assets/icons/play.svg" : "assets/icons/next.svg"; }
    var rt = $("btn-end-retry"); if (rt) rt.hidden = level.beat === "dress" || level.beat === "bed" ? false : false;
  }
  /* Eindscherm na level 15: eigen scherm met de drie pups op een willekeurige achtergrond. */
  var FINALE_BG = ["garden", "trail", "yard", "party", "camp", "beach", "birthday", "bedroom", "dress-party", "dress-camp", "dress-beach"];
  function showFinale(show) {
    var f = $("finale");
    if (!show) { if (f) f.hidden = true; return; }
    if (!f) {
      f = document.createElement("div"); f.id = "finale"; f.className = "finale"; f.setAttribute("role", "region"); f.setAttribute("aria-label", t("end.final"));
      var bg = document.createElement("div"); bg.className = "finale-bg"; bg.id = "finale-bg"; f.appendChild(bg);
      var card = document.createElement("div"); card.className = "finale-card";
      var im = document.createElement("img"); im.alt = ""; im.className = "finale-dogs"; im.src = art.abs(art.finale); card.appendChild(im);
      var p = document.createElement("p"); p.className = "finale-note"; p.id = "finale-note"; card.appendChild(p);
      var b = document.createElement("button"); b.type = "button"; b.id = "btn-finale-again"; b.className = "btn btn-primary finale-btn";
      var bi = document.createElement("img"); bi.alt = ""; bi.src = "assets/icons/play.svg"; b.appendChild(bi); card.appendChild(b);
      b.addEventListener("click", function () { audio.sfx("click"); playFrom(1); });
      f.appendChild(card); document.body.appendChild(f);
    }
    var keys = FINALE_BG.filter(function (k) { return art.scenes[k]; });
    var pick = keys[Math.floor(Math.random() * keys.length)] || "garden";
    $("finale-bg").style.backgroundImage = 'url("' + art.abs(art.scenes[pick]) + '")';
    setText("finale-note", t("end.final")); var bt = $("btn-finale-again"); if (bt) bt.setAttribute("aria-label", t("playAgain"));
    f.hidden = false;
    setTimeout(function () { if (bt && !f.hidden) bt.focus(); }, 400);
  }
  function showEnd(show) {
    var end = $("act-end"), panel = $("act-panel");
    if (end) end.hidden = !show; if (panel) panel.hidden = !!show;
    document.body.dataset.end = show ? "1" : "";
  }

  /* ---------- level starten / beëindigen ---------- */
  function destroyActivity() {
    if (act) { try { act.destroy(); } catch (e) { console.error(e); } act = null; }
    clearTimers();
    var p = $("act-panel"), o = $("act-overlay"); if (p) p.textContent = ""; if (o) o.textContent = "";
  }
  var firstInput = false;
  function startLevel(n, isRetry) {
    firstInput = false;
    if (autoNext) { clearTimeout(autoNext); autoNext = 0; }
    destroyActivity();
    attempt = isRetry ? attempt + 1 : 0; ended = false; lastResult = null; paused = false;
    level = story.levelById(n); currentLevel = n;
    activeMs = 0; lastInteract = 0; priorMs = isRetry ? (debug.timing.perLevel[n] || 0) : 0; debug.timing.perLevel[n] = priorMs;
    debug.level = n; debug.attempt = attempt;
    document.body.dataset.level = String(n); document.body.dataset.beat = level.beat; document.body.dataset.dog = level.dog;
    showEnd(false); setProgress(0);
    try { audio.setScene(WS.audioMap ? WS.audioMap.sceneFor(level) : null); } catch (e) { console.warn("audio scene", e); }
    try { var sel = window.getSelection && window.getSelection(); if (sel && sel.removeAllRanges) sel.removeAllRanges(); } catch (e) { /* ok */ }
    scene.setup({ dog: level.dog, bg: level.bg, tint: level.cfg && level.cfg.tint, pose: level.beat === "clean" ? "sad" : "happy", outfit: story.outfitForLevel(data, level) });
    renderHud();
    var type = level.beat, A = WS.activities && WS.activities[type];
    if (!A && WS.debugStubs) A = WS.debugStubs[type];
    if (!A) { console.error("Activity ontbreekt: " + type); return; }
    var ctx = makeCtx(level);
    act = A.create(ctx);
    platform.levelStart(n);   // eerst de poging openen: stap-events van act.start() horen erbij
    act.start();
  }
  function onComplete(lv, res) {
    if (ended || !level || lv !== level) return;
    ended = true; lastResult = res || {};
    recordTiming();
    data = story.completeLevel(data, lv.id);
    if (lastResult.outfit) {
      if (lv.beat === "dress") data = story.setOutfit(data, lv.dog, "party", lastResult.outfit);
      if (lv.beat === "bed") data = story.setOutfit(data, lv.dog, "pyjama", lastResult.outfit);
    }
    persist();
    setProgress(1);
    debug.events.push({ t: Date.now(), level: lv.id, evt: "complete", data: lastResult });
    destroyActivity();
    platform.levelComplete(lv.id);
    if (lv.beat === "dress" && lv.id < LAST) { playFrom(lv.id + 1); return; }   // outfit klaar: de blije hond is al getoond, direct door naar de gelegenheid (geen eindscherm)
    machine.send("reveal");
  }
  function suspendActivity() { pauseTimers(); if (act && !ended) { try { act.pause(); } catch (e) { console.error(e); } } }
  function resumeActivity() { resumeTimers(); lastInteract = 0; if (act && !ended) { try { act.resume(); } catch (e) { console.error(e); } } }

  /* ---------- machine ---------- */
  var machine = WS.machine.createMachine("home", function (state, from, event) {
    document.body.dataset.state = state;
    if (state !== "playing") platform.stop();
    if (state !== "reveal") showFinale(false);
    var show = visibleFor[state];
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = show.indexOf(k) < 0; });
    if (state === "home") {
      destroyActivity(); audio.stopMusic(); level = null; ended = false; showEnd(false);
      ["level", "beat", "dog", "end"].forEach(function (k) { delete document.body.dataset[k]; });
      renderHome(); renderSaveInfo();
    }
    if (state === "settings") { renderSettings(); renderSaveInfo(); }
    if (state === "playing") {
      if (event === "resume") { audio.resume(); resumeActivity(); var pb = $("btn-pause"); if (pb) pb.focus(); }
      else { startLevel(currentLevel, event === "retry"); audio.startMusic(); audio.resume(); }
      renderSettings();
    }
    if (state === "paused") { if (from === "playing") { suspendActivity(); if (level && !ended && !document.hidden) platform.exit(level.id, 'pause'); } audio.suspend(); }
    if (state === "reveal" && level && level.id === LAST) {
      audio.hush(true); audio.sfx("win"); showEnd(false); showFinale(true); if (autoNext) { clearTimeout(autoNext); autoNext = 0; }
    } else if (state === "reveal") {
      audio.hush(true); audio.sfx("win"); renderEnd(); showEnd(true);
      var se = $("stage"); scene.cheer(); scene.celebrate(se);
      if (autoNext) { clearTimeout(autoNext); autoNext = 0; }
      if (level && level.id < LAST) { var lvAtEnd = level.id; autoNext = setTimeout(function () { autoNext = 0; if (machine.get() === "reveal" && level && level.id === lvAtEnd && !modalOpen()) playFrom(lvAtEnd + 1); }, 2200); }
      var nx = $("btn-end-next"); if (nx) { nx.disabled = true; setTimeout(function () { nx.disabled = false; if (machine.get() === "reveal" && !modalOpen()) nx.focus(); }, reducedMotion() ? 0 : 500); }
    }
    var f = $(focusFor[state]); if (f && !f.disabled) f.focus();
    if (state === "playing") {
      if (document.hidden) machine.send("pause");
      else if (!modalOpen()) platform.start();
    }
  });

  function continuePlay(fn) {
    if (continuePending || platform.isBlocked()) return;
    continuePending = true;
    var opportunity = playedOnce;
    playedOnce = true;
    var done = function () { continuePending = false; fn(); };
    if (!opportunity || !platform.canBreak()) { done(); return; }
    platform.commercialBreak().then(done, done);
  }
  function playFrom(n) { continuePlay(function () { currentLevel = n; var s = machine.get(); if (s === "reveal") machine.send("next"); else if (s === "home") machine.send("play"); else if (s === "paused") machine.send("retry"); else if (s === "playing") machine.send("next"); }); }

  /* ---------- knoppen ---------- */
  function on(id, fn) { var e = $(id); if (e) e.addEventListener("click", function () { audio.sfx("click"); fn(); }); }
  on("btn-play", function () { playFrom(story.finished(data) ? 1 : data.unlockedLevel); });
  on("btn-settings", function () { machine.send("settings"); });
  on("btn-pause", function () { machine.send("pause"); });
  on("btn-resume", function () { continuePlay(function () { machine.send("resume"); }); });
  on("btn-retry-paused", function () { if (level && !ended) platform.exit(level.id, 'retry'); continuePlay(function () { machine.send("retry"); }); });
  on("btn-settings-paused", function () { machine.send("settings"); });
  on("btn-home-paused", function () { if (level && !ended) platform.exit(level.id, 'home'); machine.send("home"); });
  on("btn-back", function () { machine.send("back"); });
  on("btn-end-home", function () { machine.send("home"); });
  on("btn-end-retry", function () { continuePlay(function () { machine.send("retry"); }); });
  on("btn-end-next", function () { playFrom(level && level.id < LAST ? level.id + 1 : 1); });

  var lastSoundPref = null;
  function setSetting(k) { lastSoundPref = null; data.settings[k] = !data.settings[k]; persist(); audio.applySettings(); renderSettings(); audio.sfx("click"); }
  var mu = $("set-music"), sf = $("set-sfx");
  if (mu) mu.addEventListener("click", function () { setSetting("music"); });
  if (sf) sf.addEventListener("click", function () { setSetting("sfx"); });
  var bs = $("btn-sound");
  if (bs) bs.addEventListener("click", function () {
    var any = data.settings.music || data.settings.sfx;
    if (any) { lastSoundPref = { music: data.settings.music, sfx: data.settings.sfx }; data.settings.music = data.settings.sfx = false; }
    else { var p = lastSoundPref && (lastSoundPref.music || lastSoundPref.sfx) ? lastSoundPref : { music: true, sfx: true }; data.settings.music = p.music; data.settings.sfx = p.sfx; lastSoundPref = null; }
    persist(); audio.applySettings(); renderSettings();
  });
  var rb = $("btn-reset");
  if (rb) rb.addEventListener("click", function () {
    if (!rb.dataset.armed) { rb.dataset.armed = "1"; rb.textContent = t("confirmReset"); return; }
    data = store.reset(); persist(); audio.applySettings(); renderSettings(); renderHome();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || modalOpen()) return;
    var s = machine.get();
    if (s === "playing") machine.send("pause"); else if (s === "paused") continuePlay(function () { machine.send("resume"); }); else if (s === "settings") machine.send("back");
  });
  // v1.3: tab/app sluiten tijdens een level = 'leave' (best effort; flush kan na pagehide wegvallen)
  window.addEventListener("pagehide", function () { if (level && !ended) platform.exit(level.id, 'leave'); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && machine.get() === "playing") machine.send("pause");
    if (document.hidden) audio.suspend(); else if (machine.get() === "playing" && !platform.isBlocked()) audio.resume();
  });
  document.addEventListener("languagechange", function () {
    var armed = rb && rb.dataset.armed;
    renderHome(); renderSettings(); renderSaveInfo();
    if (rb && armed) { rb.dataset.armed = armed; rb.textContent = t("confirmReset"); }
    if (level) { renderHud(); if (ended) renderEnd(); }
  });

  /* ---------- start ---------- */
  debug.audioState = audio.state; debug.audio = audio.info; debug.audioMeter = audio.meter; debug.audioSfx = audio.sfx; debug.saveKey = store.key; debug.saveStatus = store.getStatus;
  debug.getSave = function () { return JSON.parse(JSON.stringify(data)); };
  debug.state = function () { return machine.get(); };
  debug.startLevel = function (n) { // alleen voor tests: springt naar level n (zonder opslag te wijzigen)
    if (machine.get() === "playing" || machine.get() === "paused" || machine.get() === "reveal") { currentLevel = n; machine.send("home"); }
    currentLevel = n; machine.send("play");
  };
  debug.activeMs = function () { return activeMs; };
  debug.measured = function () { return measured.slice(); };
  WS.debug = debug;
  WS.template.configure({ unlocks: false });
  scene.mount($("stage"));
  var homeDog = q('img[data-art="dog"]'); if (homeDog) homeDog.src = art.home.dog;
  (function homeBg() {
    var root = document.documentElement, p = WS.art.abs(art.scenes.salonHome);
    root.style.setProperty("--home-background", 'url("' + p + '")'); root.setAttribute("data-bg-art", "home");
    var im = new Image(); im.onerror = function () { root.style.removeProperty("--home-background"); root.removeAttribute("data-bg-art"); }; im.src = p;
  })();
  try { if (/^nl\b/i.test(navigator.language || "")) WS.i18n.setLocale("nl"); } catch (e) { /* ok */ }
  renderHome();
  /* FTUX: een nieuwe speler (geen voltooide levels, niets opgeslagen) begint direct in level 1, zonder startscherm. ?home in de URL houdt het startscherm (QA). */
  /* Director 2026-10-06: ALTIJD direct in het level starten (nieuwe en terugkerende spelers), nooit eerst het startscherm met "Play level N".
     Het startscherm blijft bereikbaar via pauze -> home. ?home in de URL houdt het startscherm (QA). */
  var freshPlayer = !/[?&]home\b/.test(location.search || "");
  platform.init();
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { platform.userGesture(); }, { capture: true, passive: true }); });
  var localImages = Array.prototype.slice.call(document.querySelectorAll("img")).filter(function (img) { return !!img.getAttribute("src"); });
  Promise.all(localImages.map(function (img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function (resolve) { img.addEventListener("load", resolve, { once: true }); img.addEventListener("error", resolve, { once: true }); });
  })).then(function () { platform.loadingFinished(); if (freshPlayer && machine.get() === "home") { playFrom(story.finished(data) ? 1 : data.unlockedLevel); setTimeout(function () { if (screens.home) screens.home.style.visibility = ""; document.documentElement.removeAttribute("data-autostart"); }, 400); } });
  if (typeof MutationObserver !== "undefined") new MutationObserver(function () {
    if (modalOpen()) platform.stop();
    else if (machine.get() === "playing" && !document.hidden && !platform.isBlocked()) platform.start();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-modal"] });
  renderHome(); renderSettings(); renderSaveInfo();
  document.body.dataset.state = "home";
  Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = k !== "home"; });
  if (freshPlayer && screens.home) screens.home.style.visibility = "hidden";
  story.LEVELS.forEach(function (lv) { scene.preloadLevel(lv); });
})();
