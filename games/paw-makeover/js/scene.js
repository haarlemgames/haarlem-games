/* WS.scene — het speelveld van Paw Makeover v2. Bevat GEEN spelregels. Zie docs/CONTRACT.md §5.
   Twee coördinatenstelsels: STAGE (u,v in 0..1 van het speelveld-element) en DOG (fx,fy in 0..1 van het 800x800-hondcanvas).
   Alle art-paden komen uit WS.art. Klassiek script, geen dependencies. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  var art = WS.art, story = WS.story;
  var SLOT_Z = { wrist: 4, body: 5, neck: 6, face: 7, head: 8 };

  var stage = null, wrap = null, dogEl = null, body = null, spotsEl = null, fxEl = null, propsBack = null, propsFront = null, hintEl = null, cursorEl = null;
  var imgHappy = null, imgSad = null, imgSleep = null, imgMess = null;
  var cur = { dog: 'pup', pose: 'happy', outfit: story.emptyOutfit(), place: null, cursor: null, canva: false };
  var layoutObs = null;

  function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function abs(p) { return WS.art.abs(p); }
  function img(src, cls) { var i = mk('img', cls); i.alt = ''; i.draggable = false; i.decoding = 'async'; if (src) i.src = abs(src); return i; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function t(k, v) { return WS.i18n ? WS.i18n.t(k, v) : k; }

  /* ---------- mount ---------- */
  function mount(el) {
    stage = el || document.getElementById('stage');
    if (!stage) return null;
    stage.textContent = '';
    stage.classList.add('scene-stage');
    propsBack = mk('div', 'scene-props scene-props-back'); stage.appendChild(propsBack);
    wrap = mk('div', 'scene-dog-wrap'); stage.appendChild(wrap);
    dogEl = mk('div', 'dog-stage'); dogEl.id = 'dog'; dogEl.setAttribute('role', 'group'); dogEl.setAttribute('aria-label', t('dogAria'));
    wrap.appendChild(dogEl);
    dogEl.appendChild(img(art.fx.shadow, 'layer layer-shadow'));
    body = mk('div', 'dog-body'); dogEl.appendChild(body);
    imgHappy = img('', 'layer layer-dog layer-happy'); imgSad = img('', 'layer layer-dog layer-sad'); imgSleep = img('', 'layer layer-dog layer-sleep');
    imgMess = img('', 'layer layer-mess'); imgMess.hidden = true;
    body.appendChild(imgHappy); body.appendChild(imgSad); body.appendChild(imgSleep); body.appendChild(imgMess);
    spotsEl = mk('div', 'spots'); spotsEl.id = 'spots'; spotsEl.setAttribute('data-layer', 'spots'); body.appendChild(spotsEl);
    fxEl = mk('div', 'fx-layer'); fxEl.setAttribute('aria-hidden', 'true'); dogEl.appendChild(fxEl);
    propsFront = mk('div', 'scene-props scene-props-front'); stage.appendChild(propsFront);
    cursorEl = mk('img', 'tool-cursor'); cursorEl.alt = ''; cursorEl.draggable = false; cursorEl.hidden = true; stage.appendChild(cursorEl);
    hintEl = mk('div', 'scene-hint'); hintEl.setAttribute('aria-hidden', 'true'); hintEl.hidden = true; stage.appendChild(hintEl);
    if (typeof ResizeObserver !== 'undefined') { layoutObs = new ResizeObserver(layout); layoutObs.observe(stage); }
    window.addEventListener('resize', layout);
    return stage;
  }

  /* ---------- layout ---------- */
  function frontPose() { return cur.canva && art.frontPoses ? art.frontPoses[cur.dog] : null; }
  function currentAnchors() { var f = frontPose(); return f ? f.anchors : art.anchors[cur.dog] || {}; }
  function box() { return frontPose() ? frontPose().box : art.dogBox[cur.dog] || [150, 120, 650, 712]; }
  function layout() {
    if (!stage || !wrap) return;
    var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
    var S, cx, cy;
    if (cur.place) { S = cur.place.s * W; cx = cur.place.x * W; cy = cur.place.y * H; }
    else {
      var b = box(), bw = b[2] - b[0], bh = b[3] - b[1];
      var k = Math.min(W * 0.94 / bw, H * 0.93 / bh); S = 800 * k;
      var mid = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      cx = W / 2 - (mid[0] - 400) * k; cy = H * 0.5 - (mid[1] - 400) * k;
    }
    wrap.style.width = S + 'px'; wrap.style.height = S + 'px';
    wrap.style.left = (cx - S / 2) + 'px'; wrap.style.top = (cy - S / 2) + 'px';
    stage.style.setProperty('--stage-w', W + 'px'); stage.style.setProperty('--stage-h', H + 'px');
    updateCursorSize();
    document.dispatchEvent(new CustomEvent('ws-scene-layout', { detail: { S: S, W: W, H: H } }));
  }
  function placeDog(p) { cur.place = p || null; layout(); }

  /* ---------- coördinaten ---------- */
  function stageRect() { return stage ? stage.getBoundingClientRect() : new DOMRect(0, 0, 0, 0); }
  function dogRect() { return dogEl ? dogEl.getBoundingClientRect() : new DOMRect(0, 0, 0, 0); }
  function eventToStage(ev) { var r = stageRect(); if (!r.width || !r.height) return null; return { u: (ev.clientX - r.left) / r.width, v: (ev.clientY - r.top) / r.height }; }
  function eventToDog(ev) { var r = dogRect(); if (!r.width || !r.height) return null; return { fx: (ev.clientX - r.left) / r.width, fy: (ev.clientY - r.top) / r.height }; }
  function dogToStage(fx, fy) { var s = stageRect(), d = dogRect(); if (!s.width) return { u: 0, v: 0 }; return { u: (d.left + fx * d.width - s.left) / s.width, v: (d.top + fy * d.height - s.top) / s.height }; }
  function stageToDog(u, v) { var s = stageRect(), d = dogRect(); if (!d.width) return { fx: 0, fy: 0 }; return { fx: (s.left + u * s.width - d.left) / d.width, fy: (s.top + v * s.height - d.top) / d.height }; }

  /* ---------- achtergrond en hond ---------- */
  function setBackground(key, tint) {
    var src = art.scenes[key] || art.scenes.salonPlay;
    var root = document.documentElement;
    root.style.setProperty('--scene-bg', 'url("' + abs(src) + '")');
    root.style.setProperty('--scene-tint', (tint || 0) + 'deg');
    root.setAttribute('data-scene', key);
  }
  function dogImgs(dog) {
    var d = art.dogs[dog];
    try { var pc = new Image(); pc.src = abs(d.happyClean); } catch (e) { /* voorladen is optioneel */ }
    [[imgHappy, frontPose() ? frontPose().dog : d.happy], [imgSad, d.sad], [imgSleep, d.sleep]].forEach(function (p) { if (p[0].getAttribute('data-src') !== p[1]) { p[0].setAttribute('data-src', p[1]); p[0].src = abs(p[1]); } });
  }
  function setup(opts) {
    opts = opts || {};
    if (!stage) mount();
    cur.dog = art.dogs[opts.dog] ? opts.dog : 'pup'; cur.place = opts.place || null;
    cur.canva = !!(art.frontPoses && art.frontPoses[cur.dog] && (opts.bg === 'bedroom' || cur.dog === 'pup' && (opts.bg === 'dress-party' || opts.bg === 'birthday') || cur.dog === 'shepherd' && (opts.bg === 'dress-camp' || opts.bg === 'camp')));
    clearProps(); clearSpots(); clearFx(); clearHint(); setCursor(null);
    dogEl.dataset.dog = cur.dog; body.className = 'dog-body';
    dogImgs(cur.dog);
    setBackground(opts.bg, opts.tint);
    setMess(null); setWet(0);
    cur.outfit = story.emptyOutfit();
    setPose(opts.pose || 'happy', true);
    setOutfit(opts.outfit || null);
    layout();
  }
  function setPose(pose, instant) {
    pose = pose === 'sad' ? 'sad' : pose === 'sleep' ? 'sleep' : 'happy';
    cur.pose = pose; dogEl.dataset.pose = pose;
    imgHappy.classList.toggle('is-on', pose === 'happy'); imgSad.classList.toggle('is-on', pose === 'sad'); imgSleep.classList.toggle('is-on', pose === 'sleep');
    if (instant) dogEl.classList.add('no-trans'); else dogEl.classList.remove('no-trans');
    applyOutfitLayers();
  }
  function dogMaskUrl() { if (frontPose() && cur.pose !== 'sad' && cur.pose !== 'sleep') return 'url("' + abs(frontPose().dog) + '")'; var M = WS.dogMasks && WS.dogMasks[cur.dog]; if (M && M[cur.pose === 'sad' ? 'sad' : 'happy']) return 'url("' + M[cur.pose === 'sad' ? 'sad' : 'happy'] + '")'; var d = art.dogs[cur.dog]; return 'url("' + abs(cur.pose === 'sad' ? d.sad : cur.pose === 'sleep' ? d.sleep : d.happy) + '")'; }

  /* ---------- kleding ---------- */
  function clearItemLayers() { Array.prototype.forEach.call(body.querySelectorAll('.item-layer'), function (n) { n.remove(); }); }
  function applyOutfitLayers() {
    clearItemLayers();
    var o = cur.outfit, pose = cur.pose;
    /* penning verdwijnt zodra er een vest/shirt/pyjama of een nek-item (bandana, strik, sjaal, bloemenkrans) aan is: dan tonen we de hondenfoto zonder penning */
    var dd = art.dogs[cur.dog], clean = pose === 'happy' && !!((o.body && !/^pyjama/.test(o.body)) || o.neck);   // pyjama's laten de penning zichtbaar
    var want = frontPose() ? frontPose().dog : clean ? dd.happyClean : dd.happy;   // frontale Canva-basis heeft al geen penning
    if (imgHappy.getAttribute('data-src') !== want) { imgHappy.setAttribute('data-src', want); imgHappy.src = abs(want); }
    if (pose === 'sad') return; // vuile hond draagt niets
    story.SLOTS.forEach(function (slot) {
      var id = o[slot]; if (!id || !art.items[id]) return;
      var it = art.items[id];
      if (!it.layers || !it.layers[cur.dog]) return;
      if (cur.canva && !it.frontPose) return; // Legacy saved layers belong to the old tilted pose.
      if (pose === 'sleep' && slot !== 'head') return; // onder de deken
      function place(node) {
        if (pose === 'sleep') {
          var A = art.anchors[cur.dog] && art.anchors[cur.dog].hat, Z = art.sleepHat[cur.dog];
          if (A && Z) {
            node.style.transformOrigin = (A.x / 8) + '% ' + (A.y / 8) + '%';
            node.style.transform = 'translate(' + ((Z.x - A.x) / 8) + '%,' + ((Z.y - A.y) / 8) + '%) rotate(' + (Z.tilt - A.tilt) + 'deg) scale(' + Z.s + ')';
          }
        }
        return node;
      }
      if (it.back && it.back[cur.dog]) {
        var b = img(it.back[cur.dog], 'layer item-layer item-back slot-' + slot); b.dataset.item = id; b.dataset.part = 'back'; body.insertBefore(place(b), imgHappy);
      }
      var f = img(it.layers[cur.dog], 'layer item-layer item-front slot-' + slot); f.dataset.item = id; f.dataset.part = 'front';
      f.style.zIndex = String(SLOT_Z[slot]); body.insertBefore(place(f), spotsEl);
    });
  }
  function setOutfit(outfit, animate) {
    var prev = cur.outfit; cur.outfit = story.normalizeOutfit(outfit);
    if (cur.canva) story.SLOTS.forEach(function (slot) { var id = cur.outfit[slot]; if (id && (!art.items[id] || !art.items[id].frontPose)) cur.outfit[slot] = null; });
    applyOutfitLayers();
    dogEl.dataset.outfit = story.outfitIds(cur.outfit).join(',');
    if (animate && !cur.canva && !reduced()) {
      story.SLOTS.forEach(function (s) { if (cur.outfit[s] && cur.outfit[s] !== prev[s]) { var n = body.querySelector('.item-front.slot-' + s); if (n) { n.classList.add('just-on'); setTimeout(function () { n.classList.remove('just-on'); }, 280); } } });
    }
  }
  function getOutfit() { return story.normalizeOutfit(cur.outfit); }

  /* ---------- vuil en nat ---------- */
  function setMess(kind) {
    var src = kind && art.dirt.mess[cur.dog] ? art.dirt.mess[cur.dog][kind] : null;
    if (!src) { imgMess.hidden = true; imgMess.classList.remove('is-on'); return; }
    if (imgMess.getAttribute('data-src') !== src) { imgMess.setAttribute('data-src', src); imgMess.src = abs(src); }
    imgMess.hidden = false; void imgMess.offsetWidth; imgMess.classList.add('is-on');
  }
  function setWet(l) {
    l = Math.max(0, Math.min(1, Number(l) || 0));
    dogEl.style.setProperty('--wet', l);
    dogEl.classList.toggle('is-wet', l > 0.02);
  }

  /* ---------- plekken (clean) ---------- */
  function clearSpots() { if (spotsEl) spotsEl.textContent = ''; }
  function spotsHost() { return spotsEl; }

  /* ---------- props ---------- */
  function addProp(key, o) {
    o = o || {};
    var src = art.props[key] || key;
    var im = img(src, 'prop prop-' + String(key).replace(/[^a-z0-9-]/gi, ''));
    if (o.id) im.dataset.propId = o.id;
    var layer = o.layer || 'front';
    if (layer === 'dog') {
      im.classList.add('prop-dog'); im.style.left = (o.fx * 100) + '%'; im.style.top = (o.fy * 100) + '%'; im.style.setProperty('--w', o.w); im.style.zIndex = String(o.z || 10);
      body.appendChild(im);
    } else {
      im.style.left = (o.u * 100) + '%'; im.style.top = (o.v * 100) + '%'; im.style.setProperty('--w', o.w);
      if (o.z !== undefined) im.style.zIndex = String(o.z);
      (layer === 'back' ? propsBack : propsFront).appendChild(im);
    }
    im.style.setProperty('--rot', (o.rot || 0) + 'deg');
    return im;
  }
  function removeProp(x) {
    var el = typeof x === 'string' ? stage.querySelector('[data-prop-id="' + x + '"]') : x;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function clearProps() {
    if (!stage) return;
    [propsBack, propsFront].forEach(function (c) { if (c) c.textContent = ''; });
    Array.prototype.forEach.call(body.querySelectorAll('.prop-dog'), function (n) { n.remove(); });
  }

  /* ---------- cursor (gereedschap in beeld) ---------- */
  function updateCursorSize() {
    if (!cursorEl || !cur.cursor) return;
    var d = art.tools[cur.cursor]; if (!d) return;
    var S = wrap ? wrap.clientWidth : 0;
    cursorEl.style.width = (d.w * S) + 'px';
    cursorEl.style.setProperty('--hx', (d.hx * 100) + '%'); cursorEl.style.setProperty('--hy', (d.hy * 100) + '%');
  }
  function setCursor(tool) {
    if (!cursorEl) return;
    cur.cursor = tool && art.tools[tool] ? tool : null;
    if (!cur.cursor) { cursorEl.hidden = true; return; }
    var src = abs(art.src(art.tools[cur.cursor]));
    if (cursorEl.getAttribute('src') !== src) cursorEl.src = src;
    updateCursorSize(); cursorEl.hidden = true;
  }
  function moveCursor(u, v) {
    if (!cursorEl || !cur.cursor) return;
    if (u === null || u === undefined) { cursorEl.hidden = true; return; }
    cursorEl.style.left = (u * 100) + '%'; cursorEl.style.top = (v * 100) + '%'; cursorEl.hidden = false;
  }
  function moveCursorDog(fx, fy) { if (fx === null || fx === undefined) { moveCursor(null); return; } var p = dogToStage(fx, fy); moveCursor(p.u, p.v); }

  /* ---------- effecten ---------- */
  function clearFx() { if (fxEl) fxEl.textContent = ''; }
  function burst(a, b, kind, big) { // a,b in DOG-coördinaten (fx,fy)
    if (!fxEl || reduced() || isNaN(a) || isNaN(b)) return;
    if (fxEl.children.length > 72) return;
    var count = big ? 12 : kind === 'stroke' ? 2 : 4;
    var made = [];
    for (var i = 0; i < count; i++) {
      var src = kind === 'bubbles' && i % 3 !== 2 ? art.fx.bubble : art.fx.sparkle;
      var p = img(src, 'fx-bit juice-bit' + (big ? ' is-big' : ''));
      p.style.left = (a * 100) + '%'; p.style.top = (b * 100) + '%';
      var angle = i / count * Math.PI * 2, radius = big ? rnd(34, 85) : rnd(12, 32);
      p.style.width = (big ? rnd(2.8, 5.2) : rnd(1.6, 3.5)) + '%';
      p.style.setProperty('--dx', Math.round(Math.cos(angle) * radius) + 'px'); p.style.setProperty('--dy', Math.round(Math.sin(angle) * radius - 20) + 'px');
      fxEl.appendChild(p); made.push(p);
    }
    setTimeout(function () { made.forEach(function (p) { if (p.parentNode) p.parentNode.removeChild(p); }); }, 700);
  }
  function react(kind) {
    if (!body) return;
    ['is-happy-r', 'is-wow-r', 'is-oops-r', 'is-sleepy-r'].forEach(function (c) { body.classList.remove(c); });
    var cls = kind === 'wow' ? 'is-wow-r' : kind === 'oops' ? 'is-oops-r' : kind === 'sleepy' ? 'is-sleepy-r' : 'is-happy-r';
    void body.offsetWidth; body.classList.add(cls);
    clearTimeout(body._rt); body._rt = setTimeout(function () { body.classList.remove(cls); }, reduced() ? 400 : 1100);
  }
  function shake() { react('oops'); }
  function cheer() {
    if (!dogEl) return;
    var old = dogEl.querySelector('.cheer-layer'); if (old) old.remove();
    var layer = mk('div', 'cheer-layer'); layer.setAttribute('aria-hidden', 'true');
    [[0.36, 0.2], [0.52, 0.13], [0.66, 0.22]].forEach(function (p, i) {
      var s = img(art.fx.sparkle, 'cheer-sparkle'); s.style.left = (p[0] * 100) + '%'; s.style.top = (p[1] * 100) + '%'; s.style.setProperty('--d', (i * 0.18) + 's'); layer.appendChild(s);
    });
    dogEl.appendChild(layer); react('happy');
    setTimeout(function () { if (layer.parentNode) layer.remove(); }, reduced() ? 2000 : 1700);
  }
  function celebrate(container) {
    container = container || stage; if (!container) return null;
    Array.prototype.forEach.call(container.querySelectorAll(':scope > .fx-celebrate'), function (n) { clearTimeout(n._timer); n.remove(); });
    if (getComputedStyle(container).position === 'static') container.classList.add('fx-host');
    var layer = mk('div', 'fx-layer fx-celebrate'); layer.setAttribute('aria-hidden', 'true');
    var rm = reduced(), conf = art.fx.confetti;
    for (var i = 0; i < 24; i++) {
      var sp = i >= 18, p = img(sp ? art.fx.sparkle : conf[i % conf.length], 'confetti-piece' + (sp ? ' is-sparkle' : ''));
      p.style.left = rnd(2, 94).toFixed(1) + '%'; p.style.width = (sp ? rnd(5, 7) : rnd(3, 6)).toFixed(1) + '%';
      if (rm) { p.classList.add('is-static'); p.style.top = rnd(4, 72).toFixed(1) + '%'; p.style.transform = 'rotate(' + Math.round(rnd(-40, 40)) + 'deg)'; }
      else { p.style.setProperty('--dur', rnd(1.2, 1.5).toFixed(2) + 's'); p.style.setProperty('--delay', rnd(0, 0.7).toFixed(2) + 's'); p.style.setProperty('--rot', Math.round(rnd(-540, 540)) + 'deg'); p.style.setProperty('--sway', rnd(-6, 6).toFixed(1) + '%'); }
      layer.appendChild(p);
    }
    container.appendChild(layer);
    layer._timer = setTimeout(function () { if (layer.parentNode) layer.remove(); }, 2300);
    return layer;
  }

  /* ---------- hints (geen tekst) ---------- */
  function clearHint() { if (hintEl) { hintEl.hidden = true; hintEl.textContent = ''; hintEl.className = 'scene-hint'; } }
  function hint(o) {
    if (!hintEl) return; clearHint(); if (!o || !o.from) return;
    var kind = o.kind === 'tap' ? 'tap' : 'drag', to = o.to || o.from;
    hintEl.className = 'scene-hint is-' + kind + (reduced() ? ' is-static' : '');
    hintEl.style.setProperty('--u0', o.from.u); hintEl.style.setProperty('--v0', o.from.v); hintEl.style.setProperty('--u1', to.u); hintEl.style.setProperty('--v1', to.v);
    var ring = mk('span', 'hint-ring'); hintEl.appendChild(ring);
    if (art.fx.hintHand) hintEl.appendChild(img(art.fx.hintHand, 'hint-hand-img'));
    if (kind === 'drag') { var tr = mk('span', 'hint-target'); hintEl.appendChild(tr); }
    hintEl.hidden = false;
  }
  function hintDog(o) { // zelfde als hint, maar in dog-coördinaten
    if (!o) return clearHint();
    var a = dogToStage(o.from.fx, o.from.fy), b = o.to ? dogToStage(o.to.fx, o.to.fy) : null;
    hint({ kind: o.kind, from: a, to: b });
  }

  /* ---------- preload ---------- */
  function preload(list) { (list || []).forEach(function (p) { if (!p) return; var i = new Image(); i.src = abs(p); }); }
  function preloadLevel(level) {
    var d = art.dogs[level.dog], list = [d.happy, d.happyClean, d.sad, d.sleep, art.scenes[level.bg]];
    preload(list);
    if (art.frontPoses && art.frontPoses[level.dog]) preload([art.frontPoses[level.dog].dog]);
  }

  document.addEventListener('languagechange', function () { if (dogEl) dogEl.setAttribute('aria-label', t('dogAria')); });

  WS.scene = {
    mount: mount, setup: setup, setPose: setPose, setOutfit: setOutfit, getOutfit: getOutfit, placeDog: placeDog, setBackground: setBackground,
    get stage() { return stage; }, get dogEl() { return dogEl; }, get body() { return body; }, get spots() { return spotsEl; }, get fx() { return fxEl; },
    dogRect: dogRect, stageRect: stageRect, dogToStage: dogToStage, stageToDog: stageToDog, eventToStage: eventToStage, eventToDog: eventToDog,
    addProp: addProp, removeProp: removeProp, clearProps: clearProps, clearSpots: clearSpots, spotsHost: spotsHost, dogMaskUrl: dogMaskUrl,
    setMess: setMess, setWet: setWet, setCursor: setCursor, moveCursor: moveCursor, moveCursorDog: moveCursorDog,
    burst: burst, react: react, shake: shake, cheer: cheer, celebrate: celebrate, clearFx: clearFx,
    hint: hint, hintDog: hintDog, clearHint: clearHint, preload: preload, preloadLevel: preloadLevel, layout: layout,
    get pose() { return cur.pose; }, get dog() { return cur.dog; }, reduced: reduced,
    getDogBox: box, getAnchors: currentAnchors, get isFrontPose() { return !!frontPose(); }
  };
})();
