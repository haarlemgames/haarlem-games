/* act-play: de gelegenheid beleven (levels 3 verjaardag, 8 kamperen, 13 strand). Eigenaar: agent "play".
   Twee delen met verschillende handelingen + rommelmoment. Zie docs/DESIGN.md §2 en docs/CONTRACT.md §6.
   L3: A sleep-en-plaats versiering, B tik het pootdoelwit -> bal wordt gegooid, hond springt en vangt.
   L8: A sleep houtblokken + lucifer -> kampvuur, B vang vuurvliegjes (tik/veeg) in het potje.
   L13: A parasol slepen, torens bouwen met tikken, vlag slepen, B strandbal-keepy-uppy (tik op het juiste moment). */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  WS.activities = WS.activities || {};

  var PLAY_ART = 'assets/play/';
  var PROP = { table: PLAY_ART + 'play-table.svg', pit: PLAY_ART + 'play-firepit.webp', jar: PLAY_ART + 'play-jar.svg' };
  /* hoogte/breedte van de props (voor plaatsing) */
  var RATIO = { banner: 240 / 900, balloon: 420 / 300, cake: 1, gift: 1, table: 260 / 400, log: 120 / 360, match: 40 / 200, fire: 400 / 300, pit: 170 / 400,
    umbrella: 520 / 560, lamp: 420 / 260, star: 1, starfish: 1, tower: 260 / 220, flag: 200 / 120, pennant: 200 / 160, jar: 260 / 200, paw: 1, firefly: 1, ball: 1, beach: 1 };
  var PROPKEY = { banner: 'banner', balloon: 'balloon-red', cake: 'cake', gift: 'gift', log: 'log', match: 'match', umbrella: 'umbrella', tower: 'sandcastle-tower', flag: 'sandcastle-flag', pennant: 'flag-pennant', lamp: 'lantern', star: 'star', starfish: 'starfish', fire: 'fire-2', paw: 'paw-target', firefly: 'firefly', ball: 'ball', beach: 'beach-ball' };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeIn(t) { return t * t; }
  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function bounce(t) { var n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; } if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; } t -= 2.625 / d; return n * t * t + 0.984375; }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }

  function create(ctx) {
    var scene = ctx.scene, art = WS.art, cfg = ctx.level.cfg || {}, game = cfg.game || 'birthday';
    var stage = scene.stage, dogName = ctx.dog, anchors = scene.getAnchors ? scene.getAnchors() : (art.anchors && art.anchors[dogName]) || {};
    var destroyed = false, paused = false, ended = false, started = false;
    var phase = 'init';                 // 'a' | 'b' | 'end'
    var kbd = false;                    // laatste invoer was toetsenbord
    var timers = [], listeners = [], tweens = [], tickers = [], raf = 0, lastT = 0;
    var propEls = [], layoutFns = [];
    var layer = null, tray = null, live = null, ghost = null, markMouth = null, markHead = null, glow = null;
    var M = null, L = null, lastW = 0, lastH = 0, inLayout = false;
    var items = [], slots = [], held = null, drag = null;
    var pips = null, pipEls = [], pipCount = 0, pipTotal = 1, pipDone = 0;
    var hintShown = null;
    var progA = 0, progB = 0;

    /* ---------- kleine helpers ---------- */
    function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
    function mkImg(src, cls, parent) { var i = mk('img', cls, parent); i.alt = ''; i.draggable = false; i.src = art.abs(src); return i; }
    function propSrc(key) { return art.props[key] || key; }
    function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); }
    function later(fn, ms) {
      var id = ctx.schedule(function () { if (!destroyed) fn(); }, ms);
      timers.push(id); return id;
    }
    function sfx(n) { try { ctx.sfx(n); } catch (e) { /* stil */ } }
    function reducedNow() { return !!ctx.reduced; }
    function sz(f, lo, hi) { return clamp(f * M.unit, lo === undefined ? 40 : lo, hi === undefined ? 150 : hi); }

    /* ---------- eigen tijdlijn (pauzeerbaar) ---------- */
    function tween(dur, update, done, ease) {
      if (reducedNow()) dur = Math.min(dur, 0.06);
      var tw = { t: 0, dur: Math.max(0.001, dur), update: update, done: done, ease: ease || null, dead: false };
      tweens.push(tw); kick(); return tw;
    }
    function wait(sec, fn) { return tween(sec, null, fn); }
    function ticker(fn) { var tk = { fn: fn, dead: false }; tickers.push(tk); kick(); return tk; }
    function kill(x) { if (x) x.dead = true; }
    function kick() { if (!raf && !paused && !destroyed) { lastT = 0; raf = requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      if (destroyed || paused) return;
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
      var list = tweens.slice();
      for (var i = 0; i < list.length; i++) {
        var tw = list[i]; if (tw.dead) continue;
        tw.t += dt; var p = Math.min(1, tw.t / tw.dur);
        if (tw.update) tw.update(tw.ease ? tw.ease(p) : p, p);
        if (p >= 1) { tw.dead = true; if (tw.done) tw.done(); }
      }
      tweens = tweens.filter(function (x) { return !x.dead; });
      var tl = tickers.slice();
      for (var j = 0; j < tl.length; j++) { if (!tl[j].dead) tl[j].fn(dt); }
      tickers = tickers.filter(function (x) { return !x.dead; });
      if (!destroyed && (tweens.length || tickers.length)) raf = requestAnimationFrame(frame);
    }

    /* ---------- geometrie ---------- */
    function dogPoint(a) { return a ? [a[0] / 800, a[1] / 800] : [0.5, 0.3]; }
    function computeLayout() {
      var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return false;
      var b = scene.getDogBox ? scene.getDogBox() : art.dogBox[dogName] || [150, 120, 650, 712], bw = b[2] - b[0], bh = b[3] - b[1], mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2;
      var portrait = W / H < 0.95, dogLeft = portrait && game !== 'birthday', boxW, boxH, cx, bottom, play, zone;
      if (dogLeft) { boxW = Math.min(0.56 * W, 0.46 * H * bw / bh); boxH = boxW * bh / bw; cx = 0.02 * W + boxW / 2; bottom = 0.985 * H; }
      else if (portrait) { boxW = Math.min(0.68 * W, 0.5 * H * bw / bh); boxH = boxW * bh / bw; cx = 0.5 * W; bottom = 0.985 * H; }
      else { boxH = Math.min((game === 'beach' ? 0.7 : 0.88) * H, 0.4 * W * bh / bw); boxW = boxH * bw / bh; cx = 0.03 * W + boxW / 2; bottom = 0.98 * H; }
      var k = boxW / bw, S = 800 * k, ccy = bottom - boxH / 2;
      var place = { x: (cx - (mx - 400) * k) / W, y: (ccy - (my - 400) * k) / H, s: S / W };
      var box = { l: cx - boxW / 2, r: cx + boxW / 2, t: bottom - boxH, b: bottom, w: boxW, h: boxH, cx: cx };
      if (portrait) play = { x0: 0.04 * W, x1: 0.96 * W, y0: 0.025 * H, y1: box.t + 0.07 * boxH };
      else play = { x0: box.r + 0.02 * W, x1: 0.97 * W, y0: 0.05 * H, y1: 0.95 * H };
      play.w = play.x1 - play.x0; play.h = play.y1 - play.y0; play.cx = (play.x0 + play.x1) / 2; play.cy = (play.y0 + play.y1) / 2;
      if (dogLeft) zone = { x0: box.r + 0.005 * W, x1: 0.97 * W, y0: 0.3 * H, y1: 0.97 * H }; else zone = { x0: play.x0, x1: play.x1, y0: play.y0, y1: play.y1 };
      zone.w = zone.x1 - zone.x0; zone.h = zone.y1 - zone.y0; zone.cx = (zone.x0 + zone.x1) / 2; zone.cy = (zone.y0 + zone.y1) / 2;
      M = { W: W, H: H, portrait: portrait, dogLeft: dogLeft, box: box, play: play, zone: zone, place: place, unit: Math.max(120, Math.min(play.w, play.h * 1.15)) };
      return true;
    }
    /* positie in de achtergrondafbeelding (940x1672, cover) naar stage-px; alleen voor camp/beach */
    function bgPt(nx, ny) {
      var vw = window.innerWidth, vh = window.innerHeight, iw = 940, ih = 1672, sc = Math.max(vw / iw, vh / ih), r = stage.getBoundingClientRect();
      return { x: vw / 2 + (nx - 0.5) * iw * sc - r.left, y: vh / 2 + (ny - 0.5) * ih * sc - r.top, k: iw * sc };
    }
    function applyLayout() {
      inLayout = true;
      if (computeLayout()) { lastW = M.W; lastH = M.H; scene.placeDog(M.place); }
      inLayout = false;
      computeNames();
      relayout();
    }
    function onSceneLayout() {
      if (destroyed || inLayout) return;
      var W = stage.clientWidth, H = stage.clientHeight;
      if (W !== lastW || H !== lastH) applyLayout(); else relayout();
    }
    function relayout() { for (var i = 0; i < layoutFns.length; i++) { try { layoutFns[i](); } catch (e) { /* laag al weg */ } } }
    function toStage(ev) { var r = stage.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
    /* props (scene) in px i.p.v. %: de achtergrond staat vast op het venster, het speelveld wordt aan het eind lager; zo blijven props op hun plek */
    function addP(key, o) { var el = scene.addProp(key, o); if (o.layer !== 'dog') pp(el, o.u * M.W, o.v * M.H); return el; }
    function pp(el, x, y) { el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px'; }
    function pct(el, x, y) { el.style.left = (x / M.W * 100) + '%'; el.style.top = (y / M.H * 100) + '%'; }
    function setBox(el, x, y, w, rot) {
      pct(el, x, y); el.style.width = w + 'px'; if (rot !== undefined) el.style.setProperty('--rot', rot + 'deg');
    }
    function markerPos(mk0) {
      var r = mk0.getBoundingClientRect(), s = stage.getBoundingClientRect();
      return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
    }
    function dogBody(dx, dy, rot, sx, sy) {
      var b = scene.body; if (!b) return;
      b.style.transform = 'translate(' + (dx || 0).toFixed(1) + 'px,' + (dy || 0).toFixed(1) + 'px) rotate(' + (rot || 0).toFixed(2) + 'deg) scale(' + (sx || 1).toFixed(4) + ',' + (sy || 1).toFixed(4) + ')';
    }
    function dogReset() { var b = scene.body; if (b) b.style.transform = ''; }

    /* ---------- namen/posities per spel (stage-px) ---------- */
    function P(nx, ny) { return { x: M.play.x0 + nx * M.play.w, y: M.play.y0 + ny * M.play.h }; }
    function Z(nx, ny) { return { x: M.zone.x0 + nx * M.zone.w, y: M.zone.y0 + ny * M.zone.h }; }
    function computeNames() {
      var p = M.portrait, pl = M.play, zn = M.zone, n = {}, kw = {};
      if (game === 'birthday') {
        kw.banner = Math.min(pl.w * 0.92, 520); kw.balloon = sz(p ? 0.24 : 0.2, 40, 90); kw.cake = sz(p ? 0.28 : 0.27, 52, 120); kw.gift = sz(p ? 0.26 : 0.25, 48, 110); kw.pennant = sz(p ? 0.18 : 0.17, 34, 70);
        var bh = kw.banner * RATIO.banner;
        n.banner = { x: pl.cx, y: pl.y0 + bh / 2 + 0.01 * pl.h, w: kw.banner, rot: 0 };
        var rows = p ? [[0.1, 0.55], [0.9, 0.55], [0.5, 0.6], [0.3, 0.38], [0.7, 0.38]] : [[0.13, 0.5], [0.87, 0.5], [0.5, 0.46], [0.3, 0.3], [0.7, 0.3]];
        rows.forEach(function (r, i) { var q = P(r[0], r[1]); n['balloon' + i] = { x: q.x, y: q.y, w: kw.balloon, rot: (i - 1) * 6 }; });
        var c = p ? P(0.2, 0.84) : P(0.26, 0.84), g = p ? P(0.82, 0.88) : P(0.78, 0.9);
        n.cake = { x: c.x, y: c.y, w: kw.cake, rot: 0 }; n.gift = { x: g.x, y: g.y, w: kw.gift, rot: 0 };
        n.table = { x: c.x, y: c.y + kw.cake * 0.4, w: kw.cake * 1.55, rot: 0 };
        var f0 = p ? P(0.4, 0.8) : P(0.4, 0.84), f1 = p ? P(0.62, 0.84) : P(0.62, 0.88);
        n.pennant0 = { x: f0.x, y: f0.y, w: kw.pennant, rot: -6 }; n.pennant1 = { x: f1.x, y: f1.y, w: kw.pennant, rot: 6 };
      } else if (game === 'camp') {
        var horizon = bgPt(0.5, 0.585).y, pitW, px, py;
        var bp = bgPt(0.84, 0.735);
        M.ring = false;   // Codex-achtergrond heeft bewust geen ingebakken ring: altijd de losse rasterring tekenen   // de achtergrond heeft zelf een stenen ring: gebruik die, teken er geen tweede
        if (M.ring) {
          pitW = clamp(bp.k * 0.28, 90, Math.max(100, zn.w * 1.15));
          px = Math.max(Math.min(bp.x, M.W - pitW * 0.58 - 6), M.box.r - 0.1 * M.box.w + pitW / 2); py = clamp(bp.y, horizon + pitW * 0.25, M.H * 0.92);
        } else {
          pitW = sz(0.7, 120, 300); px = zn.cx; py = clamp(Math.max(zn.y0 + 0.66 * zn.h, horizon + pitW * 0.3), zn.y0, zn.y1 - pitW * 0.25);
        }
        n.pit = { x: px, y: py, w: pitW, rot: 0 };
        kw.log = pitW * 0.52;
        n.log0 = { x: px - pitW * 0.15, y: py - pitW * 0.02, w: kw.log, rot: -22 };
        n.log1 = { x: px + pitW * 0.15, y: py - pitW * 0.02, w: kw.log, rot: 22 };
        n.log2 = { x: px, y: py - pitW * 0.1, w: kw.log, rot: 0 };
        n.log3 = { x: px - pitW * 0.08, y: py - pitW * 0.16, w: kw.log, rot: -10 }; n.log4 = { x: px + pitW * 0.08, y: py - pitW * 0.17, w: kw.log, rot: 10 };
        var lw = pitW * 0.3; kw.lamp = lw;
        /* lantaarn naast de vuurplek; nooit achter de hond: past rechts het niet en links ook niet (hond-kader), dan erachter/boven het vuur */
        var lRight = px + pitW / 2 + lw * 0.7 < M.W - 4, lLeft = px - pitW / 2 - lw * 0.9 > M.box.r + 4;
        if (lRight) n.lamp = { x: px + pitW / 2 + lw * 0.45, y: py - lw * RATIO.lamp * 0.38, w: lw, rot: 0 };
        else if (lLeft) n.lamp = { x: px - pitW / 2 - lw * 0.45, y: py - lw * RATIO.lamp * 0.38, w: lw, rot: 0 };
        else n.lamp = { x: clamp(px + pitW * 0.2, lw * 0.6, M.W - lw * 0.6), y: py - pitW * 0.3 - lw * RATIO.lamp * 0.3, w: lw, rot: 0 };
        var fw = pitW * 0.5; kw.fire = fw; kw.match = sz(p ? 0.4 : 0.38, 70, 150);
        n.flame = { x: px, y: py - pitW * 0.01 - fw * RATIO.fire * 0.46, w: fw, rot: 0 };
        var sw = sz(0.22, 46, 84), sy0 = Math.max(120, 0.2 * M.H), sxs = [0.2, 0.5, 0.8], sys = [0, -0.04 * M.H, 0.025 * M.H]; kw.star = sw;
        [0, 1, 2].forEach(function (i) { n['star' + i] = M.dogLeft ? { x: (0.17 + 0.33 * i) * M.W, y: sy0 + sys[i], w: sw, rot: 0 } : { x: zn.x0 + sxs[i] * zn.w, y: sy0 + sys[i], w: sw, rot: 0 }; });
        var jw = sz(0.2, 40, 70);
        n.jar = { x: M.dogLeft ? M.W - jw * 0.5 - 24 : pl.x1 - jw * 0.5 - 4, y: 0, w: jw, rot: 0 };
        n.jar.y = M.dogLeft ? M.H - jw * RATIO.jar * 0.5 - 8 : pl.y1 - jw * RATIO.jar * 0.5 - 2;
        if (!M.dogLeft && Math.abs(n.jar.y - n.pit.y) < jw && n.jar.x > px - pitW / 2) n.jar.x = Math.min(pl.x1 - jw * 0.5 - 4, px + pitW / 2 + jw * 0.6);
      } else {
        var sand = bgPt(0.5, 0.54).y;
        kw.umbrella = clamp(M.dogLeft ? zn.w * 0.8 : sz(0.6, 90, 240), 90, 240); kw.tower = M.dogLeft ? clamp(zn.w * 0.33, 40, 70) : sz(0.2, 44, 96); kw.flag = clamp(kw.tower * 0.62, 30, 56);
        var uh = kw.umbrella * RATIO.umbrella, um;
        if (M.dogLeft) um = { x: zn.cx, y: Math.max(sand + uh * 0.15, zn.y0 + uh * 0.5) };
        else { kw.umbrella = clamp(sz(0.46, 80, 180), 80, 180); uh = kw.umbrella * RATIO.umbrella; um = P(0.84, 0.3); um.y = Math.max(um.y, sand + uh * 0.5); um.x = Math.min(um.x, pl.x1 - kw.umbrella * 0.5); }
        n.umbrella = { x: um.x, y: um.y, w: kw.umbrella, rot: -4 };
        var sfw = M.dogLeft ? clamp(zn.w * 0.22, 40, 56) : sz(0.12, 40, 64); kw.starfish = sfw;
        var sfp = M.dogLeft ? [[0.15, 0.46], [0.8, 0.44], [0.22, 0.62]].map(function (a) { return Z(a[0], a[1]); }) : [[0.68, 0.9], [0.93, 0.84], [0.4, 0.99]].map(function (a) { return P(a[0], a[1]); });
        sfp.forEach(function (q, i) { n['sf' + i] = { x: q.x, y: Math.max(q.y, sand + sfw), w: sfw, rot: [-14, 18, 6][i] }; });
        var ts = M.dogLeft ? [[0.2, 0.9], [0.52, 0.78], [0.84, 0.9]] : [[0.08, 0.84], [0.3, 0.76], [0.52, 0.84]], th = kw.tower * RATIO.tower;
        ts.forEach(function (t, i) { var q = M.dogLeft ? Z(t[0], t[1]) : P(t[0], t[1]); q.y = Math.max(q.y, sand + th * 0.6 + 6); n['tower' + i] = { x: q.x, y: q.y, w: kw.tower * (i === 1 ? 1.25 : 1), rot: 0 }; });
        [0, 1, 2].forEach(function (i) { var tc = n['tower' + i], th1 = tc.w * RATIO.tower, fh = kw.flag * RATIO.flag; n['flag' + i] = { x: tc.x + kw.flag * 0.27, y: tc.y - th1 * 0.37 - fh * 0.43, w: kw.flag, rot: 0 }; });
      }
      L = { n: n, kw: kw };
    }
    function heightOf(kind, w) { return w * (RATIO[kind] || 1); }

    /* ---------- DOM opzetten ---------- */
    function build() {
      layer = mk('div', 'act-play act-play-layer'); layer.setAttribute('data-game', game); stage.appendChild(layer);
      tray = mk('div', 'act-play act-play-tray', ctx.panel); tray.setAttribute('role', 'group'); tray.setAttribute('data-game', game); tray.setAttribute('aria-label', ctx.t('play.tray'));
      live = mk('div', 'act-play act-play-live sr-only', layer); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      if (anchors.mouth || true) {
        markMouth = mk('div', 'act-play act-play-marker', scene.body); var m = dogPoint(anchors.mouth); markMouth.style.left = (m[0] * 100) + '%'; markMouth.style.top = (m[1] * 100) + '%';
        var h = anchors.hat ? [anchors.hat.x / 800, anchors.hat.y / 800] : [0.5, 0.28];
        markHead = mk('div', 'act-play act-play-marker', scene.body); markHead.style.left = (h[0] * 100) + '%'; markHead.style.top = (h[1] * 100) + '%';
      }
      on(document, 'ws-scene-layout', onSceneLayout);
      on(document, 'keydown', function () { kbd = true; }, true);
      on(document, 'pointerdown', function () { kbd = false; }, true);
      on(layer, 'pointerdown', layerDown);
      on(layer, 'pointermove', layerMove);
      on(layer, 'pointerup', layerUp);
      on(layer, 'pointercancel', layerUp);
      on(layer, 'lostpointercapture', layerUp);
    }
    function say(text) { if (live) { live.textContent = ''; live.textContent = text; } }
    function label(k) { return ctx.t('play.item.' + k); }

    /* ---------- hulpstukken: glinster, bits ---------- */
    function sparkle(x, y, size) {
      if (reducedNow() || !layer) return;
      var s = mkImg(art.fx.sparkle, 'act-play act-play-spark', layer); s.style.width = (size || 40) + 'px'; pct(s, x, y);
      later(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 800);
    }
    function bits(x, y, colors, count, spread) {
      if (reducedNow() || !layer) return;
      for (var i = 0; i < count; i++) {
        var b = mk('span', 'act-play act-play-bit', layer), a = ctx.rng() * Math.PI * 2, r = (0.4 + ctx.rng() * 0.8) * (spread || 60);
        b.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px'); b.style.setProperty('--dy', Math.round(Math.sin(a) * r - 24) + 'px');
        b.style.background = colors[i % colors.length]; var s = 6 + Math.round(ctx.rng() * 8); b.style.width = s + 'px'; b.style.height = s + 'px'; pct(b, x, y);
        (function (bb) { later(function () { if (bb.parentNode) bb.parentNode.removeChild(bb); }, 900); })(b);
      }
    }
    function setProgress() { ctx.setProgress(clamp(progA * 0.45 + progB * 0.55, 0, 1)); }
    function hintAt(key, kind, from, to) {
      if (ctx.hintSeen(key)) return;
      hintShown = key;
      scene.hint({ kind: kind, from: { u: clamp(from.x / M.W, 0.02, 0.98), v: clamp(from.y / M.H, 0.02, 0.98) }, to: to ? { u: clamp(to.x / M.W, 0.02, 0.98), v: clamp(to.y / M.H, 0.02, 0.98) } : null });
    }
    function hintDone() { if (hintShown) { ctx.markHint(hintShown); hintShown = null; } scene.clearHint(); }

    /* ================= DEEL A: PLAATSEN ================= */
    function addDecor(src, name, layerName) {
      var el = addP(src, { u: 0.5, v: 0.5, w: 0.2, layer: layerName || 'back' }); propEls.push(el);
      layoutFns.push(function () { var n = L.n[name]; if (!el.parentNode || !n) return; pp(el, n.x, n.y); el.style.setProperty('--w', n.w / M.W); el.style.setProperty('--rot', n.rot + 'deg'); });
      layoutFns[layoutFns.length - 1]();
      return el;
    }
    function defineItem(o) { // {id, kind, prop, rot}
      o.placed = false; items.push(o); return o;
    }
    function defineSlot(o) { // {id, kind, name, layer, z, prop}
      o.filled = false; slots.push(o); return o;
    }
    function slotRect(s) { var n = L.n[s.name], w = n.w, h = heightOf(s.shape || s.kind, w); return { x: n.x, y: n.y, w: w, h: h, rot: n.rot }; }
    function buildSlotEl(s) {
      var b = mk('button', 'act-play act-play-slot', layer); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', ctx.t('play.slot', { item: label(s.labelKey || s.kind) }));
      b.setAttribute('data-slot', s.id);
      var im = mkImg(propSrc(s.sil || PROPKEY[s.kind]), 'act-play act-play-sil', b); s.sil_el = im;
      s.btn = b;
      layoutFns.push(function () { if (!s.btn || !s.btn.parentNode) return; var r = slotRect(s); setBox(b, r.x, r.y, r.w, r.rot); b.style.height = r.h + 'px'; });
      layoutFns[layoutFns.length - 1]();
      on(b, 'click', function (e) { if (paused || ended) return; ctx.interact(); if (held && validFor(held, s)) place(held, s); });
      on(b, 'keydown', function (e) { slotKey(e, s); });
    }
    function validFor(it, s) { return !it.placed && !s.filled && s.kind === it.kind && (!s.enabled || s.enabled()); }
    function activeSlots() { return slots.filter(function (s) { return held && validFor(held, s); }); }
    function refreshSlots() {
      slots.forEach(function (s) {
        if (!s.btn) return;
        var act = !!held && validFor(held, s);
        s.btn.classList.toggle('is-active', act); s.btn.classList.toggle('is-filled', s.filled);
        s.btn.tabIndex = act ? 0 : -1; s.btn.hidden = s.filled || (!!s.enabled && !s.enabled()); s.btn.style.pointerEvents = act && !drag ? 'auto' : 'none';
      });
    }
    function slotKey(e, s) {
      if (!held) return;
      var k = e.key, list = activeSlots(); if (!list.length) return;
      var i = list.indexOf(s), nxt = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') nxt = list[(i + 1) % list.length];
      else if (k === 'ArrowLeft' || k === 'ArrowUp') nxt = list[(i - 1 + list.length) % list.length];
      else if (k === 'Backspace' || k === 'Delete') { var c = held.chip; setHeld(null); if (c) c.focus(); e.preventDefault(); return; }
      if (nxt) { e.preventDefault(); ctx.interact(); nxt.btn.focus(); }
    }
    function addChip(it) {
      var b = mk('button', 'act-play act-play-chip', tray); b.type = 'button'; b.setAttribute('data-item', it.id); b.setAttribute('aria-label', label(it.labelKey || it.kind));
      b.setAttribute('aria-pressed', 'false');
      var im = mkImg(propSrc(it.prop || PROPKEY[it.kind]), 'act-play act-play-chip-img kind-' + it.kind, b);
      it.chip = b; tray.style.setProperty('--n', String(tray.children.length));
      on(b, 'pointerdown', function (e) { chipDown(e, it); });
      on(b, 'pointermove', chipMove);
      on(b, 'pointerup', chipUp);
      on(b, 'pointercancel', chipCancel);
      on(b, 'lostpointercapture', chipCancel);
      on(b, 'click', function (e) { if (e.detail === 0 && !paused && !ended) { ctx.interact(); toggleHeld(it); } });
      on(b, 'keydown', function () { ctx.interact(); });
      if (!reducedNow()) { b.classList.add('is-new'); }
      return b;
    }
    function setHeld(it) {
      held = it;
      items.forEach(function (x) { if (x.chip) { x.chip.classList.toggle('is-held', x === it); x.chip.setAttribute('aria-pressed', x === it ? 'true' : 'false'); } });
      refreshSlots();
      if (it) {
        var act = activeSlots();
        say(ctx.t('play.picked', { item: label(it.labelKey || it.kind) }));
        if (kbd && act[0]) act[0].btn.focus();
      }
    }
    function toggleHeld(it) { if (it.placed) return; hintClearOnly(); setHeld(held === it ? null : it); sfx('click'); }
    function hintClearOnly() { scene.clearHint(); }

    /* sleep vanuit tray */
    function chipDown(e, it) {
      if (paused || ended || it.placed || e.button > 0 || drag) return;
      ctx.interact();
      drag = { it: it, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, touch: e.pointerType === 'touch' };
      try { it.chip.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    }
    function chipMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      ctx.interact();
      if (!drag.moved && dist(e.clientX, e.clientY, drag.x0, drag.y0) > 8) { drag.moved = true; startGhost(drag, e); }
      if (drag.moved) moveGhost(e.clientX, e.clientY);
    }
    function ghostSize(it) { var w = (L.kw[it.kind] || 60); return it.kind === 'match' ? Math.max(w, 90) : w; }
    function startGhost(d, e) {
      var it = d.it; hintClearOnly();
      ghost = mk('div', 'act-play act-play-ghost', ctx.overlay);
      var w = ghostSize(it), im = mkImg(propSrc(it.prop || PROPKEY[it.kind]), 'act-play', ghost); ghost.style.width = w + 'px'; ghost.style.height = heightOf(it.kind, w) + 'px';
      ghost.style.setProperty('--rot', (it.dragRot || 0) + 'deg');
      it.chip.classList.add('is-dragging'); setHeld(it); refreshSlots();
      moveGhost(e.clientX, e.clientY);
    }
    function ghostCenter(cx, cy) { return { x: cx, y: cy - (drag && drag.touch ? 34 : 0) }; }
    function moveGhost(cx, cy) {
      if (!ghost) return; var c = ghostCenter(cx, cy);
      ghost.style.left = c.x + 'px'; ghost.style.top = c.y + 'px';
      var s = nearestSlot(drag.it, c.x, c.y);
      slots.forEach(function (x) { if (x.btn) x.btn.classList.toggle('is-near', x === s); });
    }
    function nearestSlot(it, cx, cy) {
      var r = stage.getBoundingClientRect(), best = null, bd = 1e9;
      slots.forEach(function (s) {
        if (!validFor(it, s)) return;
        var q = slotRect(s), sx = r.left + q.x, sy = r.top + q.y, d = dist(cx, cy, sx, sy), lim = Math.max(54, 0.62 * Math.max(q.w, q.h));
        if (d < lim && d < bd) { bd = d; best = s; }
      });
      return best;
    }
    function endGhost() {
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      items.forEach(function (x) { if (x.chip) x.chip.classList.remove('is-dragging'); });
      slots.forEach(function (x) { if (x.btn) x.btn.classList.remove('is-near'); });
    }
    function chipUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; ctx.interact();
      try { d.it.chip.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
      if (!d.moved) { toggleHeld(d.it); return; }
      var c = ghostCenter(e.clientX, e.clientY), s = nearestSlot(d.it, c.x, c.y);
      var r = stage.getBoundingClientRect(), inStage = c.y > r.top && c.y < r.bottom && c.x > r.left && c.x < r.right;
      endGhost();
      if (s) place(d.it, s);
      else { setHeld(null); if (inStage) { scene.react('oops'); sfx('hit'); } }
    }
    function chipCancel(e) {
      if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      var d = drag; drag = null; endGhost(); if (d.moved) setHeld(null); else refreshSlots();
    }

    function place(it, s) {
      if (it.placed || s.filled || ended) return;
      it.placed = true; s.filled = true; ctx.interact();
      var wasKbd = kbd, r = slotRect(s);
      if (it.chip && it.chip.parentNode) it.chip.parentNode.removeChild(it.chip);
      held = null; endGhost(); drag = null;
      var el = addP(s.placeProp || propSrc(it.prop || PROPKEY[it.kind]), { u: r.x / M.W, v: r.y / M.H, w: r.w / M.W, rot: r.rot, layer: s.layer || 'back', z: s.z });
      propEls.push(el); s.el = el; el.classList.add('act-play-placed');
      layoutFns.push(function () { if (!el.parentNode) return; var q = slotRect(s); pp(el, q.x, q.y); el.style.setProperty('--rot', q.rot + 'deg'); el.style.setProperty('--w', q.w / M.W); });
      refreshSlots(); sfx('pop'); sparkle(r.x, r.y, 46); bits(r.x, r.y, ['#ffd45e', '#ff9fb5', '#9be4c6'], 5, 38);
      scene.react('happy'); hintDone();
      say(ctx.t('play.placed', { item: label(it.labelKey || it.kind) }));
      ctx.log('place', { item: it.id, slot: s.id });
      if (it.onPlaced) it.onPlaced(it, s);
      if (s.onFilled) s.onFilled(it, s);
      var rest = items.filter(function (x) { return !x.placed && x.chip; });
      if (wasKbd && rest[0]) rest[0].chip.focus();
      if (partAStep) partAStep(it, s);
    }
    var partAStep = null;

    function firstSlot(it) { for (var i = 0; i < slots.length; i++) if (validFor(it, slots[i])) return slots[i]; return null; }
    var partADone = false;
    /* gemeenschappelijk: voortgang A, doorgaan naar B, eerste hint */
    function setupA(o) { // {progress:()=>0..1, auto:bool, firstItem}
      refreshSlots();
      partAStep = function (it, s) {
        progA = clamp(o.progress(), 0, 1); setProgress();
        if (o.after) o.after(it, s);
        if (o.auto && progA >= 1 && !partADone) { partADone = true; later(startB, reducedNow() ? 200 : 700); }
      };
      var first = o.firstItem;
      if (first && !ctx.hintSeen('play-' + game + '-a')) {
        later(function () {
          if (phase !== 'a' || hintShown || !first.chip || first.placed) return;
          var s = firstSlot(first); if (!s) return;
          var q = slotRect(s); hintAt('play-' + game + '-a', 'drag', chipFrom(first), { x: q.x, y: q.y });
        }, 500);
      }
    }
    function chipFrom(it) {
      var cr = it.chip.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      return { x: clamp(cr.left + cr.width / 2 - sr.left, 8, M.W - 8), y: clamp(cr.top + cr.height / 2 - sr.top, 8, M.H - 8) };
    }

    /* ---------- A: verjaardag ---------- */
    function runBirthdayA() {
      addDecor(PROP.table, 'table', 'back');
      [['banner', 'banner', 'banner', 2], ['bal0', 'balloon', 'balloon0', 3], ['bal1', 'balloon', 'balloon1', 3], ['bal2', 'balloon', 'balloon2', 3], ['bal3', 'balloon', 'balloon3', 3], ['bal4', 'balloon', 'balloon4', 3], ['cake', 'cake', 'cake', 3], ['gift', 'gift', 'gift', 3]].forEach(function (d) {   // vlaggetjes weg (director 2026-10-27); overige decoratie blijft
        defineSlot({ id: d[0], kind: d[1], name: d[2], layer: 'back', z: d[3] });
      });
      [['banner', 'banner', 'banner'], ['cake', 'cake', 'cake'], ['bal-r', 'balloon', 'balloon-red'], ['bal-b', 'balloon', 'balloon-blue'], ['gift', 'gift', 'gift'], ['bal-y', 'balloon', 'balloon-yellow'], ['bal-r2', 'balloon', 'balloon-red'], ['bal-b2', 'balloon', 'balloon-blue']].forEach(function (d) {
        defineItem({ id: d[0], kind: d[1], prop: d[2], labelKey: d[1] === 'balloon' ? d[2] : d[1] });
      });
      slots.forEach(buildSlotEl);
      var queue = items.slice(5);
      items.slice(0, 5).forEach(addChip);
      setupA({ progress: function () { return items.filter(function (x) { return x.placed; }).length / items.length; }, auto: true, firstItem: items[0],
        after: function () { if (queue.length) { var nx = queue.shift(); addChip(nx); if (kbd && !tray.contains(document.activeElement)) nx.chip.focus({ preventScroll: true }); } } });
    }

    /* ---------- A: kamperen ---------- */
    var logsDone = false, matchItem = null, flameSlot = null;
    function runCampA() {
      if (!M.ring) addDecor(PROP.pit, 'pit', 'back');
      glow = mk('div', 'act-play act-play-glow', layer); glow.style.opacity = '0';
      layoutFns.push(function () { if (!glow) return; var f = L.n.flame; glow.style.left = (f.x / M.W * 100) + '%'; glow.style.top = ((f.y + f.w * 0.2) / M.H * 100) + '%'; glow.style.width = (L.n.pit.w * 2.2) + 'px'; glow.style.height = (L.n.pit.w * 1.9) + 'px'; });
      layoutFns[layoutFns.length - 1]();
      ['log0', 'log1', 'log2', 'log3', 'log4'].forEach(function (nm, i) { defineSlot({ id: 'log' + i, kind: 'log', name: nm, layer: 'back', z: i < 2 ? 2 : 3, labelKey: 'log' }); });
      defineSlot({ id: 'lamp', kind: 'lamp', name: 'lamp', layer: 'back', z: 3, labelKey: 'lamp', onFilled: function (it, s) { if (s.el) s.el.classList.add('act-play-lampon'); } });
      flameSlot = defineSlot({ id: 'flame', kind: 'match', name: 'flame', layer: 'back', z: 4, shape: 'fire', sil: 'fire-2', placeProp: 'match', labelKey: 'flame', enabled: function () { return logsDone; } });
      [0, 1, 2, 3].forEach(function (i) { defineItem({ id: 'log-' + i, kind: 'log', prop: 'log', labelKey: 'log' }); });
      defineItem({ id: 'lamp', kind: 'lamp', prop: 'lantern', labelKey: 'lamp' }); defineItem({ id: 'log-4', kind: 'log', prop: 'log', labelKey: 'log' });
      matchItem = { id: 'match', kind: 'match', prop: 'match', labelKey: 'match', dragRot: -35, placed: false, onPlaced: function (it, s) { lightFire(s); } };
      slots.forEach(buildSlotEl);
      flameSlot.btn.classList.add('is-flame');
      items.forEach(addChip);
      items.forEach(function (it) {
        it.onPlaced = function () {
          if (logsDone || slots.filter(function (s) { return (s.kind === 'log' || s.kind === 'lamp') && s.filled; }).length < 6) return;
          logsDone = true; if (ctx.step) ctx.step('logs', 'complete');   // v1.3: deelstap kampvuur
          later(function () {
            items.push(matchItem); addChip(matchItem); say(ctx.t('play.matchReady')); sfx('click'); refreshSlots(); if (kbd) matchItem.chip.focus({ preventScroll: true });
            if (!ctx.hintSeen('play-camp-a2') && !hintShown) { var q = slotRect(flameSlot); hintAt('play-camp-a2', 'drag', chipFrom(matchItem), { x: q.x, y: q.y + q.h * 0.2 }); }
          }, reducedNow() ? 100 : 450);
        };
      });
      setupA({ progress: function () { return campProgress(); }, auto: false, firstItem: items[0], after: function (it) { if (it.kind === 'star' && starsPlaced() === 3 && !partADone) { partADone = true; later(startB, reducedNow() ? 200 : 900); } } });
    }
    function starsPlaced() { return slots.filter(function (s) { return s.kind === 'star' && s.filled; }).length; }
    function campProgress() {
      var n6 = slots.filter(function (s) { return (s.kind === 'log' || s.kind === 'lamp') && s.filled; }).length;
      return n6 / 6 * 0.5 + (flameSlot && flameSlot.filled ? 0.15 : 0) + Math.min(3, stoked) / 3 * 0.15 + starsPlaced() / 3 * 0.2;
    }
    function startStars() {
            [0, 1, 2].forEach(function (i) {
        var sl = defineSlot({ id: 'star' + i, kind: 'star', name: 'star' + i, layer: 'back', z: 3, labelKey: 'star', onFilled: function (it, s2) { if (s2.el) s2.el.classList.add('act-play-staron'); } });
        buildSlotEl(sl);
        var it = defineItem({ id: 'star-' + i, kind: 'star', prop: 'star', labelKey: 'star' }); addChip(it);
      });
      refreshSlots(); sfx('click'); say(ctx.t('play.starsReady')); relayout();
      if (kbd && items[items.length - 3].chip) items[items.length - 3].chip.focus({ preventScroll: true });
      if (!ctx.hintSeen('play-camp-a4') && !hintShown) { var q = slotRect(slots[slots.length - 2]); hintAt('play-camp-a4', 'drag', chipFrom(items[items.length - 2]), { x: q.x, y: q.y }); }
    }
    var fireEl = null, fireTick = null, fireFrame = 0, fireK = 0.5, stokeBtn = null, stoked = 0;
    function applyFire(k) { fireK = k; if (fireEl) { fireEl.style.transform = 'translate(-50%,-50%) scale(' + k.toFixed(3) + ')'; fireEl.style.transformOrigin = '50% 90%'; } if (glow) { glow.style.transform = 'translate(-50%,-50%) scale(' + (0.55 + 0.5 * k).toFixed(3) + ')'; } }
    function lightFire(s) {
      try { ctx.sfx('fire-on'); } catch (e) { /* geluid optioneel */ }
      var m = s.el; if (m) m.classList.add('is-lit');
      sfx('whoosh');
      var f = L.n.flame;
      fireEl = addP('fire-1', { u: f.x / M.W, v: f.y / M.H, w: f.w / M.W, layer: 'back', z: 5 }); propEls.push(fireEl);
      fireEl.classList.add('act-play-fire'); fireEl.style.opacity = '0';
      layoutFns.push(function () { if (!fireEl || !fireEl.parentNode) return; var q2 = L.n.flame; pp(fireEl, q2.x, q2.y); fireEl.style.setProperty('--w', q2.w / M.W); positionStoke(); });
      var imgs = ['fire-1', 'fire-2', 'fire-3'];
      if (reducedNow()) fireEl.src = art.abs(propSrc('fire-2'));
      tween(0.7, function (p) {
        fireEl.style.opacity = String(Math.min(1, p * 2.2)); applyFire(lerp(0.2, 0.5, easeOut(p)));
        if (glow) glow.style.opacity = String(p * 0.55);
        if (m) m.style.opacity = String(1 - Math.min(1, p * 2));
      }, function () {
        if (m && m.parentNode) m.parentNode.removeChild(m);
        sfx('pop'); scene.react('wow'); sparkle(f.x, f.y - f.w * 0.4, 46);
        if (!reducedNow()) {
          var acc = 0;
          fireTick = ticker(function (dt) { acc += dt; if (acc > 0.17) { acc = 0; fireFrame = (fireFrame + 1) % 3; fireEl.src = art.abs(propSrc(imgs[fireFrame])); if (glow) glow.style.opacity = String(Math.min(0.95, 0.35 + 0.18 * stoked + 0.08 * (fireFrame % 2))); } });
        }
        progA = campProgress(); setProgress();
        // vuurtje opblazen: 3 keer tikken op het vlammetje
        stokeBtn = mk('button', 'act-play act-play-target act-play-stoke', layer); stokeBtn.type = 'button'; stokeBtn.setAttribute('aria-label', ctx.t('play.stoke'));
        positionStoke();
        on(stokeBtn, 'pointerdown', function (e) { if (paused || ended) return; ctx.interact(); kbd = false; e.preventDefault(); e.stopPropagation(); stokeTap(); });
        on(stokeBtn, 'click', function (e) { if (e.detail === 0 && !paused && !ended) { ctx.interact(); stokeTap(); } });
        on(stokeBtn, 'keydown', function () { ctx.interact(); });
        if (kbd) stokeBtn.focus({ preventScroll: true });
        if (!ctx.hintSeen('play-camp-a3') && !hintShown) { var q = L.n.flame; hintAt('play-camp-a3', 'tap', { x: q.x, y: q.y }, null); }
      });
    }
    function positionStoke() { if (!stokeBtn || !stokeBtn.parentNode) return; var f = L.n.flame, sz2 = Math.max(64, f.w * 1.3); setBox(stokeBtn, f.x, f.y - 0.1 * f.w * RATIO.fire, sz2, 0); stokeBtn.style.height = sz2 + 'px'; }
    function stokeTap() {
      if (stoked >= 3 || !stokeBtn) return;
      stoked++; hintDone(); var f = L.n.flame, k0 = fireK, k1 = 0.5 + stoked * 0.2;
      sfx('whoosh'); scene.react('wow'); sparkle(f.x, f.y - f.w * 0.5, 44); bits(f.x, f.y - f.w * 0.5, ['#ffb84d', '#ff7a3d', '#ffe27a'], 7, 50);
      tween(0.35, function (p) { applyFire(lerp(k0, k1, easeOut(p)) * (1 + 0.08 * Math.sin(p * Math.PI))); }, function () { applyFire(k1); });
      if (glow) glow.style.opacity = String(Math.min(0.95, 0.35 + 0.18 * stoked));
      progA = campProgress(); setProgress(); ctx.log('stoke', { n: stoked });
      if (stoked >= 3) {
        if (stokeBtn.parentNode) stokeBtn.parentNode.removeChild(stokeBtn); stokeBtn = null;
        sfx('win'); progA = campProgress(); setProgress();
        later(startStars, reducedNow() ? 150 : 600);
      }
    }

    /* ---------- A: strand ---------- */
    var beachFlags = [], TAPS = 4, TK = [0.36, 0.58, 0.8, 1], towerState = [0, 0, 0], towerEls = [null, null, null], towerBtns = [], beachFlag = null, beachFlagSlot = null;
    function runBeachA() {
      defineSlot({ id: 'umbrella', kind: 'umbrella', name: 'umbrella', layer: 'back', z: 2 });
      defineItem({ id: 'umbrella', kind: 'umbrella', prop: 'umbrella', labelKey: 'umbrella' });
      [0, 1, 2].forEach(function (i) { defineSlot({ id: 'flag' + i, kind: 'flag', name: 'flag' + i, layer: 'front', z: 11, enabled: function () { return towersBuilt() === 3; } }); });
      beachFlags = [0, 1, 2].map(function (i) { return { id: 'flag' + i, kind: 'flag', prop: 'sandcastle-flag', labelKey: 'flag', placed: false }; });
      [0, 1, 2].forEach(function (i) {
        defineSlot({ id: 'sf' + i, kind: 'starfish', name: 'sf' + i, layer: 'back', z: 3, labelKey: 'starfish', onFilled: function (it, s2) { if (s2.el) s2.el.classList.add('act-play-starfish'); } });
        defineItem({ id: 'sf-' + i, kind: 'starfish', prop: 'starfish', labelKey: 'starfish' });
      });
      slots.forEach(buildSlotEl); items.forEach(addChip);
      for (var i = 0; i < 3; i++) (function (i) {
        var b = mk('button', 'act-play act-play-slot act-play-spot is-active', layer); b.type = 'button'; b.setAttribute('aria-label', ctx.t('play.towerSpot', { n: i + 1 })); b.setAttribute('data-spot', String(i));
        mkImg(propSrc('sandcastle-tower'), 'act-play act-play-sil', b);
        towerBtns[i] = b; b.style.pointerEvents = 'auto'; b.tabIndex = 0;
        layoutFns.push(function () { if (!b.parentNode) return; var n = L.n['tower' + i]; setBox(b, n.x, n.y, n.w, 0); b.style.height = heightOf('tower', n.w) + 'px'; });
        layoutFns[layoutFns.length - 1]();
        on(b, 'pointerdown', function (e) { if (paused || ended || phase !== 'a') return; ctx.interact(); kbd = false; e.preventDefault(); e.stopPropagation(); tapTower(i); });
        on(b, 'click', function (e) { if (e.detail === 0 && !paused && !ended && phase === 'a') { ctx.interact(); tapTower(i); } });
        on(b, 'keydown', function () { ctx.interact(); });
      })(i);
      var umb = items[0];
      beachIdle(ctx.hintSeen('play-beach-a') ? 3000 : 6000);
      setupA({ progress: function () { return beachProgress(); }, auto: false, firstItem: umb, after: function (it) {
        scene.clearHint(); beachIdle(it === umb && towersBuilt() === 0 ? 450 : 3500);
        if (it.kind === 'flag' && beachFlags.every(function (f) { return f.placed; }) && !partADone) { partADone = true; later(startB, reducedNow() ? 200 : 900); }
      } });
    }
    function towersBuilt() { return towerState.filter(function (s) { return s >= TAPS; }).length; }
    /* Strand deel A (director 2026-10-06: 'geen hint hoe de zandkastelen groeien'): na elke voortgang start een korte timer;
       zonder nieuwe voortgang wijst de hand de volgende handeling aan (parasol slepen -> kasteel tikken -> vlag slepen -> zeester slepen). */
    var beachT = null;
    function beachNext() {
      if (phase !== 'a' || ended) return null;
      var umb = items[0];
      if (umb && !umb.placed && umb.chip) { var s0 = firstSlot(umb); if (s0) { var r0 = slotRect(s0); return { kind: 'drag', from: chipFrom(umb), to: { x: r0.x, y: r0.y } }; } }
      for (var i = 0; i < 3; i++) if (towerState[i] < TAPS && towerBtns[i] && !towerBtns[i].hidden) { var n = L.n['tower' + i]; return { kind: 'tap', from: { x: n.x, y: n.y } }; }
      var rest = items.filter(function (x) { return !x.placed && x.chip; });
      for (var k = 0; k < rest.length; k++) { var s1 = firstSlot(rest[k]); if (s1) { var r1 = slotRect(s1); return { kind: 'drag', from: chipFrom(rest[k]), to: { x: r1.x, y: r1.y } }; } }
      return null;
    }
    function beachIdle(ms) {
      if (beachT !== null) { ctx.cancel(beachT); timers = timers.filter(function (x) { return x !== beachT; }); beachT = null; }
      if (phase !== 'a') return;
      beachT = later(function () {
        beachT = null; if (paused || hintShown) { beachIdle(1500); return; }
        var h = beachNext(); if (!h) return;
        scene.hint({ kind: h.kind, from: { u: clamp(h.from.x / M.W, 0.02, 0.98), v: clamp(h.from.y / M.H, 0.02, 0.98) }, to: h.to ? { u: clamp(h.to.x / M.W, 0.02, 0.98), v: clamp(h.to.y / M.H, 0.02, 0.98) } : null });
      }, ms === undefined ? 3500 : ms);
    }
    function beachProgress() {
      return ((items[0] && items[0].placed ? 1 : 0) + towerState.reduce(function (a, s) { return a + s / TAPS; }, 0) + beachFlags.filter(function (f) { return f.placed; }).length + items.filter(function (f) { return f.kind === 'starfish' && f.placed; }).length) / 10;
    }
    function tapTower(i) {
      if (towerState[i] >= TAPS) return;
      hintDone(); towerState[i]++; beachIdle(towerState[i] < TAPS ? 2500 : 3500);
      var n = L.n['tower' + i], full = towerState[i] === TAPS, k = TK[towerState[i] - 1], el = towerEls[i];
      if (!el) {
        el = addP('sandcastle-tower', { u: n.x / M.W, v: n.y / M.H, w: n.w * k / M.W, layer: 'back', z: 4 }); propEls.push(el); towerEls[i] = el;
        el.classList.add('act-play-placed');
        layoutFns.push(function () { if (!el.parentNode) return; var q = L.n['tower' + i], kk = TK[Math.max(0, towerState[i] - 1)]; pp(el, q.x, q.y + (1 - kk) * heightOf('tower', q.w) * 0.5); el.style.setProperty('--w', q.w * kk / M.W); });
      }
      relayout();
      el.classList.remove('act-play-grow'); void el.offsetWidth; el.classList.add('act-play-grow');
      sfx(full ? 'pop' : 'tick'); sparkle(n.x, n.y, 44); bits(n.x, n.y + heightOf('tower', n.w) * 0.3, ['#e9c98b', '#d8b06a', '#f4dca8'], full ? 9 : 6, 40);
      scene.react(full ? 'happy' : 'wow');
      if (full) { towerBtns[i].hidden = true; towerBtns[i].tabIndex = -1; if (kbd) { var nx = towerBtns.filter(function (b) { return !b.hidden; })[0]; if (nx) nx.focus({ preventScroll: true }); } }
      say(ctx.t('play.towerBuilt', { n: towersBuilt() }));
      ctx.log('tower', { i: i, state: towerState[i] });
      progA = beachProgress(); setProgress();
      if (towersBuilt() === 3) {
        if (ctx.step) ctx.step('towers', 'complete');   // v1.3: deelstap zandkastelen
        later(function () {
          beachFlags.forEach(function (f) { items.push(f); addChip(f); }); refreshSlots(); sfx('click'); say(ctx.t('play.flagReady'));
          if (!ctx.hintSeen('play-beach-a3') && !hintShown) { var q = slotRect(slots.filter(function (x) { return x.kind === 'flag'; })[1]); hintAt('play-beach-a3', 'drag', chipFrom(beachFlags[0]), { x: q.x, y: q.y }); }
          if (kbd) beachFlags[0].chip.focus({ preventScroll: true });
        }, reducedNow() ? 100 : 400);
      }
    }

    /* ================= Overgang A -> B ================= */
    function clearTrayAndPips(total, pipKey) {
      items.forEach(function (it) { if (it.chip && it.chip.parentNode) it.chip.parentNode.removeChild(it.chip); });
      tray.textContent = ''; tray.classList.add('is-pips'); tray.removeAttribute('aria-label');
      pips = mk('div', 'act-play act-play-pips', tray); pips.setAttribute('role', 'img'); pipEls = []; pipCount = 0; pips.__total = total; pipTotal = total; pipDone = 0;
      for (var i = 0, np = Math.min(total, 12); i < np; i++) { var p = mkImg(propSrc(pipKey), 'act-play act-play-pip', pips); pipEls.push(p); }
      setPipLabel(pipEls.length);
      slots.forEach(function (s) { if (s.btn && s.btn.parentNode) s.btn.parentNode.removeChild(s.btn); s.btn = null; });
      towerBtns.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
      towerBtns = [];
    }
    function setPipLabel() { pips.setAttribute('aria-label', ctx.t('play.count', { n: pipDone, total: pipTotal })); }
    function addPip() {
      pipDone = Math.min(pipTotal, pipDone + 1);
      var want = Math.floor(pipDone * pipEls.length / pipTotal);
      while (pipCount < want) { pipEls[pipCount].classList.add('is-on'); pipCount++; }
      setPipLabel(); progB = pipDone / pipTotal; setProgress();
    }
    function startB() {
      if (destroyed || phase !== 'a') return;
      phase = 'b'; hintDone(); setHeld(null); if (typeof beachT !== 'undefined' && beachT !== null) { ctx.cancel(beachT); beachT = null; } scene.react('happy'); sfx('complete');
      progA = 1; setProgress(); ctx.log('phase', { p: 'b', game: game });
      if (ctx.step) { ctx.step('decor', 'complete'); ctx.step(game === 'birthday' ? 'fetch' : 'play', 'start'); }
      if (game === 'birthday') runFetch(FETCH_TOTAL);
      else if (game === 'camp') runFireflies(Math.max(cfg.rounds || 0, 18));
      else runKeepy(KEEPY_TOTAL);
    }

    /* ================= DEEL B ================= */
    /* ---- verjaardag: apporteren ---- */
    var targets = [], fetchBusy = false, fetchPending = null, thrown = 0, roundIdx = 0, orderIdx = 0, fetchTotal = 5, ballEl = null;
    var FETCH_ORDER = [[0.2, 0.32], [0.82, 0.26], [0.7, 0.62], [0.22, 0.62], [0.5, 0.2], [0.86, 0.6], [0.14, 0.5], [0.66, 0.3], [0.36, 0.48]];
    var FETCH_ROUNDS = [1, 1, 1];   // verjaardag (2026-10-06): precies drie worpen, steeds één doel; daarna tikt de speler zelf op de taart
    var FETCH_TOTAL = 3, HINT_IDLE = 4000, cakeBtn = null, cakeSlot = null, idleT = null;
    function idleHint(getPt) { // hand terug na stilstand; latere tikken stellen deze timer niet uit
      if (idleT !== null) return;
      idleT = later(function () { idleT = null; if (ended || paused) { idleHint(getPt); return; } var q = getPt(); if (q) scene.hint({ kind: 'tap', from: { u: clamp(q.x / M.W, 0.02, 0.98), v: clamp(q.y / M.H, 0.02, 0.98) }, to: null }); }, HINT_IDLE);
    }
    function idleStop() { if (idleT !== null) { ctx.cancel(idleT); timers = timers.filter(function (x) { return x !== idleT; }); idleT = null; } }
    function runFetch(total) {
      fetchTotal = total; clearTrayAndPips(total, 'paw-target');
      ballEl = mkImg(propSrc('ball'), 'act-play act-play-ball', layer); ballEl.hidden = true;
      layer.classList.add('is-hot');
      // mis-tik op het veld: doelen wiebelen, niets gaat verloren
      on(layer, 'pointerdown', function (e) {
        if (phase === 'cake' && cakeBtn && !cakeBtn.contains(e.target)) { ctx.interact(); cakeHintNow(); return; }
        if (phase !== 'b' || !targets.length || targets.indexOf(e.target) >= 0) return;
        for (var k = 0; k < targets.length; k++) { if (targets[k].contains(e.target)) return; }
        ctx.interact(); targets.forEach(function (t) { t.classList.remove('act-play-wiggle'); void t.offsetWidth; t.classList.add('act-play-wiggle'); });
      });
      spawnRound(true);
    }
    function spawnRound(first) {
      var left = fetchTotal - thrown - targets.length - (fetchPending ? 1 : 0); if (left <= 0) return;
      var n = Math.min(FETCH_ROUNDS[roundIdx % FETCH_ROUNDS.length], left); roundIdx++;
      for (var k = 0; k < n; k++) addTarget(first && k === 0);
    }
    function addTarget(hintIt) {
      var o = FETCH_ORDER[orderIdx++ % FETCH_ORDER.length], btn = mk('button', 'act-play act-play-target', layer);
      btn.type = 'button'; btn.setAttribute('aria-label', ctx.t('play.target')); mkImg(propSrc('paw-target'), 'act-play act-play-target-img', btn);
      btn.__n = o; targets.push(btn);
      layoutFns.push(function () { if (!btn.parentNode) return; var p2 = P(o[0], o[1]), w = Math.max(60, sz(0.27, 60, 110)); setBox(btn, p2.x, p2.y, w, 0); btn.style.height = w + 'px'; });
      layoutFns[layoutFns.length - 1]();
      on(btn, 'pointerdown', function (e) { if (paused || ended) return; ctx.interact(); kbd = false; e.preventDefault(); e.stopPropagation(); tapTarget(btn); });
      on(btn, 'click', function (e) { if (e.detail === 0 && !paused && !ended) { ctx.interact(); tapTarget(btn); } });
      on(btn, 'keydown', function () { ctx.interact(); });
      if (kbd && targets.length === 1) btn.focus({ preventScroll: true });
      if (hintIt && !ctx.hintSeen('play-birthday-b')) { var q = P(o[0], o[1]); hintAt('play-birthday-b', 'tap', { x: q.x, y: q.y }, null); }
      idleStop(); idleHint(function () { var b = targets.filter(function (x) { return !x.__used; })[0]; return phase === 'b' && b ? P(b.__n[0], b.__n[1]) : null; });
    }
    function tapTarget(btn) {
      if (btn.__used || phase !== 'b') return;
      btn.__used = true; hintDone(); idleStop();
      if (fetchBusy) { fetchPending = btn; btn.classList.add('is-queued'); return; }   // tik tijdens een worp telt mee: volgt direct
      fireAt(btn);
    }
    function fireAt(btn) {
      fetchBusy = true;
      var o = btn.__n, p0 = P(o[0], o[1]); targets = targets.filter(function (t) { return t !== btn; });
      if (btn.parentNode) btn.parentNode.removeChild(btn);
      throwBall(p0, function () {                    // gevangen: teller + volgende doelen meteen
        addPip(); thrown++; ctx.log('fetch', { round: thrown }); if (ctx.step) ctx.step('catch-' + thrown, 'complete');
        if (kbd && targets[0]) targets[0].focus({ preventScroll: true });
        if (!targets.length && !fetchPending) spawnRound(false);
      }, function () {                                // geland: wachtende tik meteen afhandelen
        fetchBusy = false;
        if (fetchPending) { var b = fetchPending; fetchPending = null; if (b.parentNode) { fireAt(b); return; } }
        if (thrown >= fetchTotal) later(game === 'birthday' ? startCake : finish, reducedNow() ? 100 : 250);
      });
    }

    /* ---- verjaardag: na de derde vangst tikt de speler zelf op de taart ---- */
    function cakePt() { var r = slotRect(cakeSlot); return { x: r.x, y: r.y }; }
    function cakeHintNow() { idleStop(); if (phase !== 'cake' || !cakeSlot) return; var q = cakePt(); scene.hint({ kind: 'tap', from: { u: clamp(q.x / M.W, 0.02, 0.98), v: clamp(q.y / M.H, 0.02, 0.98) }, to: null }); }
    function startCake() {
      if (destroyed || ended || phase !== 'b') return;
      cakeSlot = slots.filter(function (s) { return s.id === 'cake'; })[0];
      if (!cakeSlot || !cakeSlot.el) { finish(); return; }
      phase = 'cake'; ctx.log('phase', { p: 'cake', game: game }); if (ctx.step) { ctx.step('fetch', 'complete'); ctx.step('cake', 'start'); }
      scene.react('happy');
      cakeSlot.el.classList.add('act-play-cakehot');
      var b = mk('button', 'act-play act-play-cakebtn', layer); b.type = 'button'; b.setAttribute('aria-label', ctx.t('play.cake')); cakeBtn = b;
      layoutFns.push(function () { if (!b.parentNode) return; var r = slotRect(cakeSlot), w = Math.max(88, r.w * 1.7); setBox(b, r.x, r.y - r.w * 0.1, w, 0); b.style.height = w + 'px'; });
      layoutFns[layoutFns.length - 1]();
      on(b, 'pointerdown', function (e) { if (paused || ended) return; ctx.interact(); kbd = false; e.preventDefault(); e.stopPropagation(); tapCake(); });
      on(b, 'click', function () { if (!paused && !ended) { ctx.interact(); tapCake(); } });
      if (kbd) b.focus({ preventScroll: true });
      say(ctx.t('play.cake'));
      if (!ctx.hintSeen('play-birthday-cake')) { hintShown = 'play-birthday-cake'; cakeHintNow(); }
      else idleHint(function () { return phase === 'cake' ? cakePt() : null; });
    }
    function tapCake() {
      if (phase !== 'cake' || ended || destroyed) return;
      if (ctx.step) ctx.step('cake', 'complete');
      ctx.log('cake', {}); idleStop(); hintDone();
      if (cakeBtn && cakeBtn.parentNode) cakeBtn.parentNode.removeChild(cakeBtn); cakeBtn = null;
      if (cakeSlot && cakeSlot.el) cakeSlot.el.classList.remove('act-play-cakehot');
      scene.react('wow'); sfx('pop');
      finish();
    }
    function throwBall(p0, onCatch, done) {
      var bw = Math.max(36, sz(0.19, 36, 72)), restM = markerPos(markMouth);
      ballEl.hidden = false; ballEl.style.width = bw + 'px'; ballEl.style.height = bw + 'px'; ballEl.style.opacity = '1'; ballEl.style.transform = 'translate(-50%,-50%)';
      var side = p0.x < M.box.cx ? -1 : 1;
      var J = clamp((restM.y - p0.y) * 0.5, 0.06 * M.box.h, 0.2 * M.box.h), DX = clamp((p0.x - M.box.cx) * 0.22, -0.1 * M.box.w, 0.1 * M.box.w);
      var arc = clamp(Math.abs(restM.y - p0.y) * 0.35 + 40, 40, 160);
      sfx('whoosh');
      if (reducedNow()) {
        var m = markerPos(markMouth); pct(ballEl, m.x, m.y - 4); sparkle(m.x, m.y, 50); scene.react('wow'); sfx('pop'); onCatch();
        later(function () { ballEl.hidden = true; scene.react('happy'); done(); }, 350); return;
      }
      tween(0.1, function (p) { dogBody(0, 0.012 * M.box.h * p, 0, 1 + 0.02 * p, 1 - 0.05 * p); pct(ballEl, p0.x, p0.y); ballEl.style.transform = 'translate(-50%,-50%) scale(' + (0.6 + 0.4 * p) + ')'; }, function () {
        tween(0.6, function (e, raw) {
          var jp = easeOut(raw);
          dogBody(DX * jp, -J * jp, side * 4 * jp, 1 - 0.02 * jp, 1 + 0.04 * jp);
          var m2 = markerPos(markMouth), ee = easeIO(raw);
          pct(ballEl, lerp(p0.x, m2.x, ee), lerp(p0.y, m2.y, ee) - arc * Math.sin(Math.PI * ee)); ballEl.style.transform = 'translate(-50%,-50%) rotate(' + (raw * 520 * -side) + 'deg)';
        }, function () {
          var m3 = markerPos(markMouth); sparkle(m3.x, m3.y, 56); scene.burst(0.5, 0.35, 'x', false); sfx('pop'); scene.react('happy');
          onCatch();
          tween(0.28, function (p) { // landen met de bal in de bek, daarna verdwijnt de bal
            var jp = 1 - easeIn(p); dogBody(DX * jp, -J * jp, side * 4 * jp, 1 + 0.02 * p * (1 - p) * 4, 1 - 0.03 * p * (1 - p) * 4);
            var m4 = markerPos(markMouth); pct(ballEl, m4.x + 2, m4.y + bw * 0.08); ballEl.style.transform = 'translate(-50%,-50%) scale(' + (1 - 0.3 * p) + ')'; ballEl.style.opacity = String(p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4);
          }, function () { dogReset(); ballEl.hidden = true; ballEl.style.transform = ''; sfx('hit'); done(); });
        }, null);
      }, null);
    }

    /* ---- kamperen: vuurvliegjes ---- */
    var flies = [], jar = null, jarFill = null, caught = 0, swipe = null, flyTick = null, flyT = 0;
    function runFireflies(total) {
      clearTrayAndPips(total, 'firefly');
      layer.classList.add('is-hot');
      jar = mk('div', 'act-play act-play-jar', layer); jar.setAttribute('role', 'img'); jar.setAttribute('aria-label', ctx.t('play.jar'));
      mkImg(PROP.jar, 'act-play act-play-jar-img', jar); jarFill = mk('div', 'act-play act-play-jar-fill', jar);
      layoutFns.push(function () { if (!jar.parentNode) return; var n = L.n.jar; jar.style.left = (n.x / M.W * 100) + '%'; jar.style.top = (n.y / M.H * 100) + '%'; jar.style.width = n.w + 'px'; jar.style.height = heightOf('jar', n.w) + 'px'; });
      layoutFns[layoutFns.length - 1]();
      var rng = ctx.rng;
      for (var i = 0; i < total; i++) {
        var f = { i: i, nx: 0.12 + 0.76 * ((i * 0.381966 + 0.1) % 1), ny: 0.14 + 0.62 * ((i * 0.618034 + 0.3) % 1), ax: 0.06 + rng() * 0.07, ay: 0.05 + rng() * 0.07, wx: 0.28 + rng() * 0.22, wy: 0.24 + rng() * 0.22, px: rng() * 6.28, py: rng() * 6.28, slow: 1, free: true, x: 0, y: 0, ph: 0 };
        var b = mk('button', 'act-play act-play-fly', layer); b.type = 'button'; b.setAttribute('aria-label', ctx.t('play.firefly')); mkImg(propSrc('firefly'), 'act-play act-play-fly-img', b);
        b.style.animationDelay = (i * 0.12) + 's'; f.el = b; flies.push(f);
        (function (f) {
          on(f.el, 'click', function (e) { if (e.detail === 0 && !paused && !ended) { ctx.interact(); catchFly(f); } });
          on(f.el, 'keydown', function () { ctx.interact(); });
          on(f.el, 'focus', function () { f.focus = true; }); on(f.el, 'blur', function () { f.focus = false; });
          on(f.el, 'pointerenter', function (e) { if (e.pointerType === 'mouse') f.hover = true; }); on(f.el, 'pointerleave', function () { f.hover = false; });
        })(f);
      }
      layoutFns.push(function () { placeFlies(0); });
      var hinted = false;
      flyTick = ticker(function (dt) {
        if (paused) return;
        flyT += dt;
        placeFlies(dt);
        if (!hinted && flies[0] && !ctx.hintSeen('play-camp-b')) { hinted = true; var f0 = flies[0]; hintAt('play-camp-b', 'tap', { x: f0.x, y: f0.y }, null); }
      });
      var first = flies[0]; if (kbd && first) first.el.focus({ preventScroll: true });
    }
    function flyPos(f, t) {
      var pl = M.play;
      return { x: pl.x0 + (f.nx + f.ax * Math.sin(f.wx * t + f.px)) * pl.w, y: pl.y0 + (f.ny + f.ay * Math.sin(f.wy * t + f.py)) * pl.h };
    }
    var flyPhase = 0;
    function placeFlies(dt) {
      if (!M) return;
      flyPhase += dt * 1;
      flies.forEach(function (f) {
        if (!f.free) return;
        var target = (f.focus || f.hover || (f.i === 0 && hintShown === 'play-camp-b')) ? 0.1 : 1; f.slow = lerp(f.slow, target, 0.15);
        if (!reducedNow()) f.ph += dt * f.slow;
        var p = flyPos(f, reducedNow() ? 0 : f.ph); f.x = p.x; f.y = p.y; pct(f.el, f.x, f.y);
      });
    }
    function layerDown(e) {
      if (paused || ended || e.button > 0) return;
      if (phase === 'b' && game === 'camp') { ctx.interact(); kbd = false; swipe = { id: e.pointerId }; try { layer.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } swipeHit(e); }
      else if (phase === 'b' && game === 'beach') { ctx.interact(); kbd = false; attemptBump(e); }
    }
    function layerMove(e) { if (swipe && e.pointerId === swipe.id && !paused) { ctx.interact(); swipeHit(e); } }
    function layerUp(e) { if (swipe && (!e || e.pointerId === undefined || e.pointerId === swipe.id)) { swipe = null; } }
    function swipeHit(e) {
      var p = toStage(e), r = e.pointerType === 'touch' ? 40 : 32;
      var best = null, bd = 1e9;
      flies.forEach(function (f) { if (!f.free) return; var d = dist(p.x, p.y, f.x, f.y); if (d < r && d < bd) { bd = d; best = f; } });
      if (best) catchFly(best);
    }
    function catchFly(f) {
      if (!f.free || ended) return;
      f.free = false; hintDone();
      var x0 = f.x, y0 = f.y, n = L.n.jar, jx = n.x, jy = n.y - heightOf('jar', n.w) * 0.2;
      var el = f.el, wasFocus = document.activeElement === el;
      el.classList.add('is-caught'); el.tabIndex = -1; el.disabled = true; el.style.pointerEvents = 'none';
      sfx('clean'); sparkle(x0, y0, 36); scene.react('wow');
      if (wasFocus && kbd) { var nx = flies.filter(function (g) { return g.free; })[0]; if (nx) nx.el.focus({ preventScroll: true }); }
      ctx.log('catch', { i: f.i });
      var arcH = 40 + ctx.rng() * 30;
      tween(0.55, function (p) {
        var e = easeIO(p), x = lerp(x0, M.W * 0 + L.n.jar.x, e), y = lerp(y0, L.n.jar.y - heightOf('jar', L.n.jar.w) * 0.2, e) - arcH * Math.sin(Math.PI * e);
        pct(el, x, y); el.style.transform = 'translate(-50%,-50%) scale(' + (1 - 0.4 * e) + ')';
      }, function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        var jf = mkImg(propSrc('firefly'), 'act-play act-play-jar-fly', jarFill), k = caught, cols = 5;
        jf.style.left = (24 + (k % cols) * 13 + (Math.floor(k / cols) % 2) * 5) + '%'; jf.style.top = (44 + Math.floor(k / cols) * 15 + (k % 2) * 3) + '%'; jf.style.animationDelay = (k * 0.3) + 's';
        caught++; jar.style.setProperty('--glow', String(Math.min(1, caught / flies.length)));
        sfx('pop'); addPip(); sparkle(jx, jy, 42);
        if (caught >= flies.length) { flyTick && kill(flyTick); jar.classList.add('is-full'); later(finish, reducedNow() ? 150 : 700); }
      });
    }

    /* ---- strand: keepy-uppy ---- */
    var ball = null, kp = null, haloEl = null, bumpBtn = null, bumps = 0, kpTotal = 6, kpTick = null, KEEPY_TOTAL = 12;
    function runKeepy(total) {
      kpTotal = total; clearTrayAndPips(total, 'beach-ball');
      layer.classList.add('is-hot');
      ball = mkImg(propSrc('beach-ball'), 'act-play act-play-ball act-play-beachball', layer);
      haloEl = mk('div', 'act-play act-play-halo', layer);
      bumpBtn = mk('button', 'act-play act-play-bump', layer); bumpBtn.type = 'button'; bumpBtn.setAttribute('aria-label', ctx.t('play.bump'));
      on(bumpBtn, 'click', function (e) { if (e.detail === 0 && !paused && !ended) { ctx.interact(); attemptBump(); } });
      on(bumpBtn, 'keydown', function (e) { ctx.interact(); });
      if (kbd) bumpBtn.focus({ preventScroll: true });
      kp = { state: 'fall', t: 0, dur: 1.2, apex: 200, side: 1, drift: 0, ready: false, soft: 0, y0: 0, spin: 0, shown: false, restNext: false, over: false, flash: 0 };
      kpGeom(); kp.apex = kp.maxApex * 0.9; kp.dur = fallDur(kp.apex); kp.t = 0; kp.state = 'fall';
      layoutFns.push(function () { kpGeom(); });
      kpTick = ticker(kpStep);
      ctx.log('keepy', { total: total });
    }
    function fallDur(h) { return 0.5 + 0.34 * h / 300; }
    function contact() {
      var h = markerPos(markHead), bw = ballW();
      return { x: h.x, y: h.y - bw * 0.42 };
    }
    function ballW() { return Math.max(52, sz(0.3, 52, 100)); }
    function kpGeom() {
      var c = contact(), bw = ballW();
      kp.maxApex = clamp(c.y - (M.play.y0 + bw * 0.6), 60, 330);
      ball.style.width = bw + 'px'; ball.style.height = bw + 'px';
      haloEl.style.width = (bw * 1.45) + 'px'; haloEl.style.height = (bw * 1.45) + 'px';
      bumpBtn.style.width = Math.max(64, bw * 1.5) + 'px'; bumpBtn.style.height = Math.max(64, bw * 1.5) + 'px';
    }
    /* Ritme-koppen (director 2026-10-06): de ring om de kop wordt ORANJE zodra de bal er bijna is = tikken. Goed getimed = kopbal + combo.
       Te vroeg tikken = kort geen effect (spammen helpt niet). Mis je het moment, dan valt de bal op de grond: combo weg, maar de voortgang blijft
       en de bal wordt meteen opnieuw opgegooid. Reduced motion: bal rust op de kop (statisch), elke tik telt. */
    var WIN = 0.55, LATE = 0.16, combo = 0, bestCombo = 0, comboEl = null, cool = 0, drops = 0;
    function showCombo(n, broke) {
      if (!comboEl) { comboEl = mk('div', 'act-play act-play-combo', layer); comboEl.setAttribute('aria-hidden', 'true'); }
      var h = contact(); pct(comboEl, clamp(h.x + ballW() * 1.25, 40, M.W - 40), h.y - ballW() * 0.2);
      comboEl.classList.remove('is-pop', 'is-broke'); void comboEl.offsetWidth;
      if (broke) { comboEl.textContent = '×' + n; comboEl.classList.add('is-broke'); return; }
      comboEl.textContent = n >= 2 ? '×' + n : '';
      if (n >= 2) comboEl.classList.add('is-pop');
      comboEl.classList.toggle('is-hot', n >= 5);
    }
    function comboBreak() {
      if (combo >= 2) { showCombo(combo, true); say(ctx.t('play.comboLost')); }
      combo = 0; drops++;
    }
    function kpStep(dt) {
      if (paused || ended || !kp || kp.over) return;
      var c = contact(); kp.t += dt; if (cool > 0) cool -= dt;
      var u = Math.min(1, kp.t / kp.dur), x = c.x, y = c.y;
      if (reducedNow()) {
        var yy = kp.state === 'hop' ? c.y - kp.apex * 0.55 : c.y - 6; pct(ball, c.x, yy); kp.ready = kp.state !== 'hop'; haloEl.classList.toggle('is-ready', kp.ready); pct(haloEl, c.x, c.y); pct(bumpBtn, c.x, c.y);
        if (kp.state === 'hop' && kp.t > 0.45) { kp.state = 'fall'; kp.t = 0; }
        if (!kp.hintOn && !ctx.hintSeen('play-beach-b') && !hintShown) { kp.hintOn = true; hintAt('play-beach-b', 'tap', { x: c.x, y: c.y - 0.2 * ballW() }, null); }
        return;
      }
      if (kp.state === 'fall') {
        y = c.y - kp.apex * (1 - u * u); x = c.x + kp.side * kp.drift * Math.cos(Math.PI / 2 * u);
        kp.ready = u >= WIN; kp.spin += dt * 40 * kp.side;
        if (u >= 1) { kp.state = 'late'; kp.t = 0; kp.dur = LATE; }
      } else if (kp.state === 'late') { // bal raakt de kop: nog heel even op tijd
        y = c.y; x = c.x; kp.ready = true;
        if (u >= 1) { // gemist: bal stuitert van de kop en valt op de grond
          kp.state = 'drop'; kp.t = 0; kp.dur = 0.7; kp.ready = false; kp.side = ctx.rng() < 0.5 ? -1 : 1; kp.y0 = c.y; kp.x0 = c.x;
          kp.ground = Math.min(M.H - ballW() * 0.6, c.y + M.box.h * 0.55); sfx('miss'); scene.react('oops'); comboBreak(); ctx.log('drop', { n: drops });
          dogBody(0, 0.012 * M.box.h, 0, 1, 0.985);
        }
      } else if (kp.state === 'drop') {
        var dx = kp.side * M.box.w * 0.32 * u; x = kp.x0 + dx; y = kp.y0 - 60 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (u < 0.6 ? 1 : 0) + (u > 0.35 ? (kp.ground - kp.y0) * bounce((u - 0.35) / 0.65) : 0);
        kp.spin += dt * 200 * kp.side; kp.ready = false; if (u > 0.25) dogReset();
        if (u >= 1) { kp.state = 'serve'; kp.t = 0; kp.dur = 0.55; kp.y0 = y; kp.x0 = x; kp.apex = kp.maxApex * 0.8; }
      } else if (kp.state === 'serve') { // de bal wordt opnieuw opgegooid boven de kop
        var e2 = 1 - (1 - u) * (1 - u); x = lerp(kp.x0, c.x, u); y = lerp(kp.y0, c.y - kp.apex, e2); kp.spin += dt * 120; kp.ready = false;
        if (u >= 1) { kp.state = 'fall'; kp.t = 0; kp.side = 0; kp.drift = 0; kp.dur = fallDur(kp.apex) * 1.1; }
      } else if (kp.state === 'rise') {
        var ee = 1 - (1 - u) * (1 - u); y = lerp(kp.y0, c.y - kp.apex, ee); x = c.x + kp.side * kp.drift * Math.sin(Math.PI / 2 * u); kp.ready = false; kp.spin += dt * 120 * kp.side;
        if (u >= 1) { kp.state = 'fall'; kp.t = 0; kp.dur = fallDur(kp.apex); if (bumps >= kpTotal) { kpEnd(); return; } }
      }
      if (kp.flash > 0) {
        kp.flash -= dt; var f = 1 - Math.max(0, kp.flash) / 0.42, dy = f < 0.3 ? 0.014 * M.box.h * (f / 0.3) : -0.02 * M.box.h * Math.sin(Math.PI * (f - 0.3) / 0.7);
        dogBody(kp.side * -2, dy, -kp.side * 3.2 * Math.sin(Math.PI * f), 1 + (f < 0.3 ? 0.02 : -0.01), f < 0.3 ? 1 - 0.05 * (f / 0.3) : 1 + 0.02 * Math.sin(Math.PI * (f - 0.3) / 0.7));
        if (kp.flash <= 0) dogReset();
      }
      x = clamp(x, ballW() * 0.5, M.W - ballW() * 0.5);
      pct(ball, x, y); ball.style.transform = 'translate(-50%,-50%) rotate(' + (kp.spin % 360).toFixed(1) + 'deg)';
      var hc = contact(); pct(haloEl, hc.x, hc.y); pct(bumpBtn, hc.x, hc.y);
      haloEl.classList.toggle('is-ready', kp.ready);
      // hand: eerste keer, en na een gemiste bal opnieuw (tot er weer raak getikt wordt)
      if (kp.ready && !kp.hintOn && !hintShown && (!ctx.hintSeen('play-beach-b') || kp.needHint)) { kp.hintOn = true; scene.hint({ kind: 'tap', from: { u: clamp(hc.x / M.W, 0.02, 0.98), v: clamp((hc.y - 0.2 * ballW()) / M.H, 0.02, 0.98) }, to: null }); hintShown = 'play-beach-b'; }
      if (kp.state === 'drop' && drops <= 3) { kp.needHint = true; kp.hintOn = false; }
    }
    function attemptBump(e) {
      if (!kp || kp.over || ended || phase !== 'b') return;
      var c = contact();
      if (e && !reducedNow()) { // richten: tik in de buurt van bal of kop (ruim)
        var st = stage.getBoundingClientRect(), bx0 = (parseFloat(ball.style.left) / 100) * M.W, by0 = (parseFloat(ball.style.top) / 100) * M.H, px = e.clientX - st.left, py = e.clientY - st.top;
        if (Math.min(dist(px, py, bx0, by0), dist(px, py, c.x, c.y)) > Math.max(120, ballW() * 2.4)) return;
      }
      if (cool > 0) { ctx.log('early', { cool: true, state: kp.state }); return; }
      if (!kp.ready) { ctx.log('early', { state: kp.state, u: +(kp.t / kp.dur).toFixed(2) }); // te vroeg (of de bal ligt op de grond): kleine wiebel, kort geen effect
        if (!reducedNow() && (kp.state === 'rise' || (kp.state === 'fall' && kp.t / kp.dur < WIN - 0.15))) cool = 0.18;   // alleen ver te vroeg: kort geen effect; vlak voor oranje telt de volgende tik gewoon
        ball.classList.remove('act-play-wobble'); void ball.offsetWidth; ball.classList.add('act-play-wobble'); sfx('tick');
        return;
      }
      haloEl.classList.remove('is-ready');   // ring meteen uit: de volgende oranje ring is een nieuw moment
      hintDone(); kp.needHint = false; kp.hintOn = true; bumps++; combo++; if (ctx.step && bumps === Math.ceil(kpTotal / 2)) ctx.step('heading-half', 'complete'); bestCombo = Math.max(bestCombo, combo); addPip(); sfx(combo >= 5 ? 'pop' : 'hit');
      var bx = reducedNow() ? c.x : (parseFloat(ball.style.left) / 100) * M.W, by = reducedNow() ? c.y : (parseFloat(ball.style.top) / 100) * M.H;
      sparkle(bx, by, combo >= 5 ? 70 : 52); bits(bx, by, combo >= 5 ? ['#ffb84d', '#ffd45e', '#ff8a3d'] : ['#fff', '#ffd45e', '#9fd8ff'], combo >= 5 ? 10 : 6, 44);
      showCombo(combo, false); if (combo >= 2) say(ctx.t('play.combo', { n: combo }));
      ctx.log('bump', { n: bumps, combo: combo });
      if (reducedNow()) { kp.state = 'hop'; kp.t = 0; kp.apex = kp.maxApex * 0.7; if (bumps >= kpTotal) kpEnd(); return; }
      kp.side = bumps % 2 ? 1 : -1;
      kp.drift = Math.min(M.play.w * 0.28, 0.6 * M.box.w) * (0.5 + ctx.rng() * 0.5);
      // hoe hoger de combo, hoe iets sneller het ritme (begrensd)
      kp.apex = bumps >= kpTotal ? Math.min(kp.maxApex * 0.5, 120) : kp.maxApex * (0.5 + ctx.rng() * 0.3) * (1 - Math.min(0.25, combo * 0.025));
      kp.state = 'rise'; kp.t = 0; kp.y0 = by; kp.flash = 0.42; kp.ready = false;
      kp.dur = Math.max(0.36, 0.32 + 0.3 * kp.apex / 300);
    }
    function kpEnd() {
      kp.over = true; kill(kpTick); dogReset();
      var c = contact();
      // laatste: bal landt zacht op de kop en blijft even liggen
      tween(0.55, function (p) { var cc = contact(); var yy = lerp(c.y - 80, cc.y, bounce(p)); pct(ball, cc.x, yy); }, function () {
        scene.react('wow'); sfx('pop'); later(finish, reducedNow() ? 100 : 500);
      });
    }

    function addSoot() { // lichte as/blaadjes in eigen laag (de roet-PNG is op de zwarte herder nauwelijks zichtbaar), afgemaakt met het hondsilhouet
      try {
        var el = scene.addProp(PLAY_ART + 'play-soot.svg', { layer: 'dog', fx: 0.5, fy: 0.5, w: 1, z: 4 }); propEls.push(el);
        var m = scene.dogMaskUrl(); el.style.webkitMaskImage = m; el.style.maskImage = m; el.style.webkitMaskSize = '100% 100%'; el.style.maskSize = '100% 100%';
        el.style.webkitMaskRepeat = 'no-repeat'; el.style.maskRepeat = 'no-repeat'; el.classList.add('act-play-soot'); el.style.pointerEvents = 'none';
      } catch (e) { /* stil */ }
    }
    /* ================= EINDE: rommelmoment ================= */
    function finish() {
      if (destroyed || ended || phase === 'end') return;
      phase = 'end'; hintDone(); idleStop(); scene.clearHint(); dogReset();
      if (layer) layer.classList.remove('is-hot');
      var mid = { x: M.box.cx, y: M.box.t + M.box.h * 0.5 };
      var colors = game === 'birthday' ? ['#fff4f0', '#ff9fb5', '#ffd45e', '#ffe9ef'] : game === 'camp' ? ['#4b4039', '#7a6a60', '#ffb84d', '#a89a8e'] : ['#e9c98b', '#d8b06a', '#8fd3ff', '#fff'];
      var splashDone = function () {
        scene.setMess(cfg.mess || 'party'); if (game === 'camp') addSoot(); sfx(game === 'beach' ? 'splash' : 'hit'); scene.react('oops');
        bits(mid.x, mid.y - M.box.h * 0.12, colors, 16, M.box.w * 0.45);
        later(function () { scene.react('happy'); sfx('pop'); }, reducedNow() ? 300 : 650);
        if (ctx.step && game !== 'birthday') ctx.step('play', 'complete');
        later(function () { if (ended) return; ended = true; ctx.log('end', { game: game }); ctx.complete({}); }, reducedNow() ? 700 : 1250);
      };
      if (game === 'birthday' && !reducedNow()) {
        // de taart vliegt naar de hond en spat uit elkaar
        var cake = slots.filter(function (s) { return s.id === 'cake'; })[0], q = cake ? slotRect(cake) : { x: M.play.cx, y: M.play.cy }, c = markerPos(markHead);
        var fly = mkImg(propSrc('cake'), 'act-play act-play-cakefly', layer); fly.style.width = (q.w || 70) + 'px';
        if (cake && cake.el && cake.el.parentNode) cake.el.style.visibility = 'hidden';
        sfx('whoosh');
        pct(fly, q.x, q.y);
        tween(0.18, function (p) { pct(fly, q.x, q.y - 26 * Math.sin(Math.PI * p)); fly.style.transform = 'translate(-50%,-50%) scale(' + (1 + 0.18 * Math.sin(Math.PI * p)) + ',' + (1 - 0.12 * Math.sin(Math.PI * p)) + ')'; }, function () {
        tween(0.5, function (e) { var x = lerp(q.x, c.x, e), y = lerp(q.y, c.y + 0.1 * M.box.h, e) - 90 * Math.sin(Math.PI * e); pct(fly, x, y); fly.style.transform = 'translate(-50%,-50%) rotate(' + (e * 300) + 'deg) scale(' + (1 - 0.15 * e) + ')'; }, function () {
          if (fly.parentNode) fly.parentNode.removeChild(fly); splashDone();
        }, easeIn);
        });
      } else if (game === 'camp' && !reducedNow() && fireEl) {
        sfx('whoosh'); bits(L.n.flame.x, L.n.flame.y, ['#ffb84d', '#ff7a3d', '#ffe27a'], 10, 70);
        wait(0.35, splashDone);
      } else splashDone();
    }

    /* ================= levenscyclus ================= */
    function start() {
      if (started || destroyed) return; started = true; phase = 'a';
      build(); applyLayout();
      if (game === 'birthday') runBirthdayA(); else if (game === 'camp') runCampA(); else runBeachA();
      relayout(); scene.react('happy');
      ctx.log('start', { game: game });
      if (ctx.step) ctx.step('decor', 'start');
    }
    function pause() {
      if (destroyed || paused) return; paused = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (drag) { var d = drag; drag = null; endGhost(); if (d.moved) setHeld(null); }
      swipe = null;
      if (layer) layer.classList.add('is-paused');
    }
    function resume() {
      if (destroyed || !paused) return; paused = false; lastT = 0;
      if (layer) layer.classList.remove('is-paused');
      kick(); relayout();
    }
    function destroy() {
      if (destroyed) return; destroyed = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      tweens = []; tickers = [];
      timers.forEach(function (id) { try { ctx.cancel(id); } catch (e) { /* ok */ } }); timers = [];
      listeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* ok */ } }); listeners = [];
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null;
      dogReset();
      [layer, tray, markMouth, markHead].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      layer = tray = markMouth = markHead = null; cakeBtn = null; idleT = null; beachT = null; comboEl = null;
      // na voltooien blijven de decor-props staan voor het eindscherm (de volgende scene.setup ruimt ze op); bij retry/home gaan ze weg
      if (!ended) { propEls.forEach(function (el) { try { scene.removeProp(el); } catch (e) { /* ok */ } }); }
      propEls = []; layoutFns = []; items = []; slots = [];
      scene.clearHint(); try { scene.setCursor(null); } catch (e) { /* ok */ }
    }
    return { start: start, pause: pause, resume: resume, destroy: destroy };
  }

  WS.activities.play = { create: create };
})();
