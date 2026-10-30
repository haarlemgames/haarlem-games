/* WS.activities.clean — Paw Makeover: de vieze hond schoonmaken (levels 1, 6, 11).
   Gebaren per gereedschap: wipe (vegen), pick (tikken/plukken), wash (heen-en-weer schrobben), brush (haal), comb (lange haal), fluff (korte haal, vacht veert op).
   Alle coordinaten in dog-fracties (0..1 van het 800-canvas). Zie docs/CONTRACT.md §6. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  WS.activities = WS.activities || {};

  var ICON = {
    wipe: 'tool:wipe', wash: 'tool:wash', brush: 'tool:brush',
    pick: 'assets/clean/clean-tool-pick-grab.svg', comb: 'assets/clean/clean-tool-comb.svg', fluff: 'assets/clean/clean-tool-fluff.svg'
  };
  /* Eigen cursor voor gereedschappen die de scene niet kent: hotspot (fracties van het icoon) en breedte (fractie canvas). */
  var OWN_CURSOR = { comb: { hx: 0.5, hy: 0.45, w: 0.2 }, fluff: { hx: 0.5, hy: 0.45, w: 0.17 } };
  var ZONE_ORDER = ['head', 'back', 'tail'];
  var STROKE_FRAC = { brush: 0.45, comb: 0.65, fluff: 0.35 };   // minimale weg in de zone, als fractie van de zonebreedte
  var WASH_REVERSALS = 6, WASH_T = 0.012, WIPE_DONE = 0.7;
  /* Correcties: ankerplekken die (deels) naast de silhouet van de sad-pose vallen, geschoven naar dichtstbijzijnde volledig bedekte plek.
     [oud x, oud y, nieuw x, nieuw y] op het 800-canvas; alleen toegepast als het anker nog precies zo staat. */
  var NUDGE = {
    pup: [[335, 672, 349, 666], [420, 680, 390, 654]],
    shepherd: [[448, 384, 446, 382], [240, 384, 258, 382], [448, 520, 438, 526], [296, 680, 346, 670], [440, 680, 454, 674], [544, 624, 526, 626]],
    bichon: [[492, 516, 470, 526], [316, 660, 338, 666]]
  };
  var FALLBACK = { spots: [[330, 330, 34], [470, 340, 34], [380, 520, 36], [470, 540, 34], [330, 660, 34], [450, 660, 34]],
    zones: { head: [400, 320, 130, 95], back: [418, 500, 105, 48], tail: [580, 600, 50, 55] } };

  function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function pct(v) { return (v * 100).toFixed(2) + '%'; }

  function create(ctx) {
    var scene = ctx.scene, art = WS.art, groom = WS.groom, t = ctx.t;
    var cfg = (ctx.level && ctx.level.cfg) || { steps: [] };
    /* easy (L1/L11, director 2026-10-27): ruimere raakzone, minder herhaling, hint direct en na 3 s stilstand */
    var EASY = !!cfg.easy, HIT = EASY ? 1.4 : 1, IDLE_MS = EASY ? 3000 : 6000;
    var WIPE_NEED = EASY ? 0.42 : WIPE_DONE, WASH_NEED = EASY ? 3 : WASH_REVERSALS, STROKE_K = EASY ? 0.6 : 1;
    var steps = cfg.steps.map(function (s) {
      var mode = s.tool === 'brush' ? (s.comb ? 'comb' : s.fluff ? 'fluff' : 'brush') : s.tool;
      return { mode: mode, art: s.art || 'mud', count: s.count || s.strokes || 3 };
    });
    var total = steps.reduce(function (a, s) { return a + s.count; }, 0) || 1;
    var anchors = (art.anchors && art.anchors[ctx.dog] && art.anchors[ctx.dog].sad) || FALLBACK;
    var layer = null, panelList = null, ownCursor = null, imgDog = null;
    var stepIdx = -1, step = null, targets = [], doneCount = 0, busy = true, paused = false, destroyed = false, finished = false, firstHintDone = false;
    var kbd = false, drag = null, timers = [], idleId = null, fluffN = 0, lastBurstAt = 0;
    var mode = '';

    /* ---------- timers (pauzeerbaar via ctx.schedule) ---------- */
    function later(fn, ms) {
      var id = ctx.schedule(function () { timers = timers.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms);
      timers.push(id); return id;
    }

    /* ---------- spots kiezen: zo ver mogelijk uit elkaar ---------- */
    function chooseSpots(n, preferLow) {
      var nudge = NUDGE[ctx.dog] || [];
      var all = (anchors.spots || FALLBACK.spots).map(function (s) {
        var x = s[0], y = s[1];
        nudge.forEach(function (n) { if (n[0] === s[0] && n[1] === s[1]) { x = n[2]; y = n[3]; } });
        return { x: x / 800, y: y / 800, r: s[2] / 800 };
      });
      var sel = [];
      if (preferLow) {
        all.slice().sort(function (a, b) { return b.y - a.y; }).slice(0, n).forEach(function (s) { sel.push(s); });
      } else {
        var first = all.slice().sort(function (a, b) { return b.r - a.r; })[0]; sel.push(first);
        while (sel.length < n && sel.length < all.length) {
          var best = null, bd = -1;
          all.forEach(function (c) {
            if (sel.indexOf(c) >= 0) return;
            var md = Math.min.apply(null, sel.map(function (s) { return Math.hypot(s.x - c.x, s.y - c.y); }));
            if (md > bd) { bd = md; best = c; }
          });
          sel.push(best);
        }
      }
      /* Meer plekken dan ankers: hergebruik met kleine verschuiving. */
      var k = 0; while (sel.length < n) { var b = all[k % all.length]; sel.push({ x: b.x + 0.03, y: b.y + 0.03, r: b.r }); k++; }
      sel.sort(function (a, b) { return a.y - b.y || a.x - b.x; }); // tabvolgorde: boven naar beneden
      var md2 = 1; for (var i = 0; i < sel.length; i++) for (var j = i + 1; j < sel.length; j++) md2 = Math.min(md2, Math.hypot(sel[i].x - sel[j].x, sel[i].y - sel[j].y));
      sel.forEach(function (s) {
        var size = Math.max(0.12, Math.min(0.19, s.r * 3.4)); // fractie van het canvas
        size = Math.min(size, Math.max(0.1, md2 * 0.95));
        s.size = size; s.half = size / 2;
      });
      return sel;
    }

    /* ---------- stap opbouwen ---------- */
    function buildStep(i) {
      stepIdx = i; step = steps[i]; mode = step.mode; targets = []; drag = null;
      if (ctx.step) ctx.step((i + 1) + '-' + mode, 'start');
      layer.textContent = ''; layer.setAttribute('data-mode', mode); layer.appendChild(ownCursor);
      scene.clearHint();
      if (ownCursor) ownCursor.hidden = true;
      var sceneTool = (mode === 'wipe' || mode === 'wash' || mode === 'brush') ? mode : null;
      scene.setCursor(sceneTool);
      if (OWN_CURSOR[mode]) { ownCursor.src = art.abs(ICON[mode]); ownCursor.style.width = pct(OWN_CURSOR[mode].w); ownCursor.style.setProperty('--hx', pct(OWN_CURSOR[mode].hx)); ownCursor.style.setProperty('--hy', pct(OWN_CURSOR[mode].hy)); }
      if (mode === 'wipe' || mode === 'pick' || mode === 'wash') {
        var set = chooseSpots(step.count, mode === 'wash'), variants = art.dirt.spots[step.art] || art.dirt.spots.mud;
        set.forEach(function (s, n) {
          var el = mk('button', 'act-clean-spot act-clean-' + mode + ' act-clean-art-' + step.art);
          el.type = 'button';
          el.setAttribute('aria-label', t('clean.aria.' + mode, { n: n + 1, total: step.count }));
          el.style.left = pct(s.x); el.style.top = pct(s.y); el.style.width = pct(s.size);
          el.style.setProperty('--rot', Math.round((ctx.rng() - 0.5) * 50) + 'deg');
          var im = mk('img', 'act-clean-dirt'); im.alt = ''; im.draggable = false; im.src = art.abs(variants[(n + stepIdx) % variants.length]);
          el.appendChild(im);
          var tg = { kind: 'spot', el: el, im: im, x: s.x, y: s.y, r: s.half, cells: {}, ncells: 0, rev: 0, ax: { x: { sgn: 0, run: 0 }, y: { sgn: 0, run: 0 } }, last: null, done: false };
          el.addEventListener('click', function (ev) { if (ev.detail === 0) { kbd = true; activate(tg, 3); } });
          if (mode === 'pick') el.addEventListener('pointerdown', function (ev) {
            if (paused || busy || ev.button > 0) return; ev.preventDefault(); ctx.interact(); kbd = false; userActed(); activate(tg, 1);
          });
          layer.appendChild(el); targets.push(tg);
        });
      } else {
        var names = ZONE_ORDER, base = Math.floor(step.count / 3), extra = step.count % 3;
        names.forEach(function (nm, n) {
          var need = base + (n < extra ? 1 : 0); if (!need) return;
          var z = (anchors.zones && anchors.zones[nm]) || FALLBACK.zones[nm];
          var el = mk('button', 'act-clean-zone act-clean-' + mode);
          el.type = 'button'; el.setAttribute('aria-label', t('clean.aria.' + mode, { n: targets.length + 1, total: ZONE_ORDER.length }));
          el.style.left = pct(z[0] / 800); el.style.top = pct(z[1] / 800); el.style.width = pct(z[2] * 2 / 800); el.style.height = pct(z[3] * 2 / 800);
          var pips = mk('span', 'act-clean-pips'); pips.setAttribute('aria-hidden', 'true');
          for (var p = 0; p < need; p++) pips.appendChild(mk('i', 'act-clean-pip'));
          el.appendChild(pips);
          var tg = { kind: 'zone', name: nm, el: el, pips: pips, x: z[0] / 800, y: z[1] / 800, rx: z[2] / 800, ry: z[3] / 800, need: need, got: 0, acc: 0, from: null, done: false };
          el.addEventListener('click', function (ev) { if (ev.detail === 0) { kbd = true; activate(tg, 3); } });
          layer.appendChild(el); targets.push(tg);
        });
      }
      busy = false; renderPanel();
      if (!ctx.hintSeen('clean-' + mode) || (EASY && stepIdx === 0 && !firstHintDone)) { firstHintDone = true; later(function () { if (!paused) showHint(); }, 350); }
      armIdle();
      if (kbd) focusNext();
    }

    /* ---------- activeren (tik/Enter/Space of voltooiing door gebaar) ---------- */
    function activate(tg, power) {
      if (busy || paused || tg.done || destroyed) return;
      ctx.interact(); userActed();
      if (tg.kind === 'zone') { strokeDone(tg, tg.x - tg.rx * 0.6, tg.y, tg.x + tg.rx * 0.6, tg.y); return; }
      if (mode === 'pick') { completeSpot(tg); return; }
      if (mode === 'wipe') { completeSpot(tg); return; }
      if (mode === 'wash') { if (power >= 3) { tg.rev = WASH_NEED; scrub(tg, 0); } else scrub(tg, power * 2); return; }
    }

    function userActed() { clearHintNow(); armIdle(); }

    function bump(tg) { /* kleine wiebel bij gedeeltelijke voortgang */
      if (ctx.reduced) return; tg.el.classList.remove('is-bump'); void tg.el.offsetWidth; tg.el.classList.add('is-bump');
    }

    function completeSpot(tg) {
      if (tg.done) return;
      tg.done = true; tg.el.disabled = true; tg.el.tabIndex = -1;
      tg.el.classList.add(mode === 'pick' ? 'is-flung' : 'is-gone');
      if (mode === 'pick') { tg.el.style.setProperty('--fx', Math.round((ctx.rng() - 0.3) * 160) + 'px'); tg.el.style.setProperty('--fy', Math.round(-70 - ctx.rng() * 60) + 'px'); }
      itemDone(tg.x, tg.y, mode === 'wash' ? 'bubbles' : null, 'clean');
      later(function () { if (tg.el.parentNode) tg.el.parentNode.removeChild(tg.el); }, 420);
    }

    function itemDone(fx, fy, kind, sfx) {
      ctx.sfx(mode === 'wash' ? 'wash' : mode === 'pick' ? 'pop' : sfx || 'clean');
      if (kind) scene.burst(fx, fy, kind, false); else scene.burst(fx, fy);
      scene.react('happy'); haloAt(fx, fy); squish();
      doneCount++; ctx.setProgress(Math.min(0.97, doneCount / total));
      ctx.markHint('clean-' + mode); clearHintNow();
      ctx.log('clean-item', { step: stepIdx, mode: mode, n: doneCount });
      var left = targets.filter(function (x) { return !x.done; }).length;
      renderPanel();
      if (left === 0) { busy = true; if (ctx.step) ctx.step((stepIdx + 1) + '-' + mode, 'complete'); stepDone(); } else if (kbd) later(focusNext, 60);
    }

    function focusNext() {
      if (paused || destroyed) return;
      var nx = targets.filter(function (x) { return !x.done; })[0];
      if (nx) { try { nx.el.focus({ preventScroll: true }); } catch (e) { /* geen focus mogelijk */ } }
    }

    function stepDone() {
      scene.setCursor(null); if (ownCursor) ownCursor.hidden = true; drag = null;
      later(function () { scene.react('wow'); scene.burst(0.5, 0.45, null, true); }, 80);
      renderPanel();
      if (stepIdx + 1 < steps.length) { later(function () { buildStep(stepIdx + 1); }, 650); }
      else {
        later(function () {
          finished = true; ctx.setProgress(1); scene.setPose('happy'); scene.cheer(); ctx.sfx('complete');
          if (imgDog) { imgDog.style.transform = ''; }
          if (scene.dogEl && !ctx.reduced) { scene.dogEl.classList.add('act-clean-fresh'); later(function () { scene.dogEl.classList.remove('act-clean-fresh'); }, 1100); }
          later(function () { ctx.complete({}); }, 900);
        }, 500);
      }
    }

    /* ---------- wassen: heen-en-weer ---------- */
    function scrub(tg, n) {
      tg.rev += n;
      var k = Math.min(WASH_NEED, tg.rev), prev = tg.foam ? tg.foam.length : 0, want = Math.ceil(k / WASH_NEED * 5);
      tg.foam = tg.foam || [];
      for (var i = prev; i < want; i++) {
        var f = mk('img', 'act-clean-foam'); f.alt = ''; f.draggable = false;
        f.src = art.abs(art.props['foam-puff-' + (1 + (i % 3))]);
        f.style.left = (20 + ctx.rng() * 60).toFixed(0) + '%'; f.style.top = (22 + ctx.rng() * 56).toFixed(0) + '%';
        f.style.setProperty('--s', (0.45 + ctx.rng() * 0.25).toFixed(2));
        tg.el.appendChild(f); tg.foam.push(f);
      }
      for (var b = 0; b < 2; b++) {
        var bb = mk('img', 'act-clean-bubble'); bb.alt = ''; bb.draggable = false; bb.src = art.abs(art.fx.bubble);
        bb.style.left = (15 + ctx.rng() * 70).toFixed(0) + '%'; bb.style.top = (15 + ctx.rng() * 70).toFixed(0) + '%';
        bb.style.setProperty('--bs', (0.5 + ctx.rng() * 0.7).toFixed(2)); tg.el.appendChild(bb);
      }
      tg.im.style.opacity = String(Math.max(0.35, 1 - k / WASH_NEED * 0.65));
      ctx.sfx('wash'); bump(tg);
      if (tg.rev >= WASH_NEED) completeSpot(tg);
    }
    function washMove(a, b) {
      targets.forEach(function (tg) {
        if (tg.done) return;
        if (Math.hypot(b.fx - tg.x, b.fy - tg.y) > tg.r * 1.15 * HIT) { tg.ax.x.run = tg.ax.y.run = 0; tg.ax.x.sgn = tg.ax.y.sgn = 0; return; }
        ['x', 'y'].forEach(function (axn) {
          var d = axn === 'x' ? b.fx - a.fx : b.fy - a.fy; if (Math.abs(d) < 0.0008) return;
          var A = tg.ax[axn], s = d > 0 ? 1 : -1;
          if (A.sgn === 0 || s === A.sgn) { A.sgn = s; A.run += Math.abs(d); }
          else { if (A.run >= WASH_T) { A.sgn = s; A.run = Math.abs(d); scrub(tg, 1); } else { A.sgn = s; A.run = Math.abs(d); } }
        });
        /* vangnet: elk krabbelpatroon telt; weg binnen de plek levert ook voortgang op (0,07 per stap) */
        tg.path = (tg.path || 0) + Math.hypot(b.fx - a.fx, b.fy - a.fy);
        if (tg.path >= 0.07) { tg.path = 0; scrub(tg, 1); }
      });
    }

    /* ---------- vegen: dekking in cellen (groom.js) ---------- */
    function wipeMove(a, b) {
      targets.forEach(function (tg) {
        if (tg.done) return;
        var cells = groom.cellsHitBySegment({ x: tg.x, y: tg.y, r: tg.r }, { x: a.fx, y: a.fy }, { x: b.fx, y: b.fy }, 0.5 * HIT);
        var grew = false;
        cells.forEach(function (c) { if (!tg.cells[c]) { tg.cells[c] = 1; tg.ncells++; grew = true; } });
        if (grew) {
          var cov = groom.coverageRatio({ length: tg.ncells });
          tg.im.style.opacity = String(Math.max(0.1, 1 - cov / WIPE_NEED * 0.9));
          if (cov >= WIPE_NEED) completeSpot(tg);
        }
      });
    }

    /* ---------- haal (brush/comb/fluff) ---------- */
    function strokeMove(a, b) {
      var len = Math.hypot(b.fx - a.fx, b.fy - a.fy), open = targets.filter(function (z) { return !z.done; });
      var hit = null, bd = 2;
      open.forEach(function (z) {
        var dx = (b.fx - z.x) / z.rx, dy = (b.fy - z.y) / z.ry, d = dx * dx + dy * dy;
        if (d <= HIT * HIT && d < bd) { hit = z; bd = d; }
      });
      open.forEach(function (z) { if (z !== hit) z.from = null; });
      if (!hit) return;
      if (!hit.from) hit.from = { fx: a.fx, fy: a.fy };
      hit.acc += len;
      var now = Date.now();
      if (now - lastBurstAt > 140) { lastBurstAt = now; scene.burst(b.fx, b.fy, 'stroke', false); }
      if (hit.acc >= STROKE_FRAC[mode] * STROKE_K * hit.rx * 2) { strokeDone(hit, hit.from.fx, hit.from.fy, b.fx, b.fy); hit.acc = 0; hit.from = null; }
    }
    function strokeDone(z, x0, y0, x1, y1) {
      if (z.done) return;
      z.got++;
      var pip = z.pips.children[z.got - 1]; if (pip) pip.classList.add('is-on');
      effectStroke(mode, x0, y0, x1, y1, z);
      if (z.got >= z.need) { z.done = true; z.el.classList.add('is-gone'); z.el.disabled = true; z.el.tabIndex = -1; later(function () { if (z.el.parentNode) z.el.parentNode.removeChild(z.el); }, 420); }
      if (mode === 'fluff') puffDog();
      itemDone((x0 + x1) / 2, (y0 + y1) / 2, null, 'brush');
      if (!z.done) { z.el.classList.remove('is-bump'); void z.el.offsetWidth; z.el.classList.add('is-bump'); }
    }
    function effectStroke(m, x0, y0, x1, y1, z) {
      if (ctx.reduced) return;
      var e;
      if (m === 'comb') {
        var ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI, L = Math.max(0.1, Math.hypot(x1 - x0, y1 - y0));
        for (var i = -1; i <= 1; i++) {
          e = mk('span', 'act-clean-streak'); e.style.left = pct(x0); e.style.top = pct(y0 + i * 0.022); e.style.width = pct(L); e.style.setProperty('--ang', ang + 'deg');
          layer.appendChild(e); later(rm(e), 650);
        }
      } else if (m === 'fluff') {
        for (var j = 0; j < 4; j++) {
          e = mk('span', 'act-clean-puff'); e.style.left = pct((x0 + x1) / 2 + (ctx.rng() - 0.5) * z.rx); e.style.top = pct((y0 + y1) / 2 + (ctx.rng() - 0.5) * z.ry);
          e.style.setProperty('--d', (j * 0.05) + 's'); layer.appendChild(e); later(rm(e), 700);
        }
      }
    }
    function rm(e) { return function () { if (e.parentNode) e.parentNode.removeChild(e); }; }
    /* ---------- sap: halo, sparkles, sporen, squish, glans ---------- */
    var TRAIL = { wipe: 'wipe', wash: 'wash', brush: 'brush', comb: 'brush', fluff: 'wash' };
    var lastTrail = null;
    function haloAt(fx, fy) {
      var h = mk('span', 'act-clean-halo' + (ctx.reduced ? ' is-static' : '')); h.style.left = pct(fx); h.style.top = pct(fy);
      layer.appendChild(h); later(rm(h), ctx.reduced ? 350 : 650);
      if (ctx.reduced) return;
      for (var i = 0; i < 3; i++) {
        var sp = mk('img', 'act-clean-spark'); sp.alt = ''; sp.draggable = false; sp.src = art.abs(art.fx.sparkle);
        var a = ctx.rng() * Math.PI * 2, d = 0.04 + ctx.rng() * 0.05;
        sp.style.left = pct(fx); sp.style.top = pct(fy); sp.style.setProperty('--dx', pct(Math.cos(a) * d)); sp.style.setProperty('--dy', pct(Math.sin(a) * d - 0.03));
        sp.style.width = (3 + ctx.rng() * 3).toFixed(1) + '%'; layer.appendChild(sp); later(rm(sp), 700);
      }
    }
    function trailAt(a, b) {
      if (ctx.reduced || !TRAIL[mode]) return;
      if (lastTrail && Math.hypot(b.fx - lastTrail.fx, b.fy - lastTrail.fy) < 0.025) return;
      if (layer.querySelectorAll('.act-clean-trail').length > 28) return;
      var e = mk('span', 'act-clean-trail act-clean-trail-' + TRAIL[mode]); e.style.left = pct(b.fx); e.style.top = pct(b.fy);
      e.style.setProperty('--ang', Math.atan2(b.fy - a.fy, b.fx - a.fx) + 'rad'); layer.appendChild(e); later(rm(e), 480); lastTrail = b;
    }
    function squish() {
      var d = scene.dogEl; if (!d || ctx.reduced) return;
      d.classList.remove('act-clean-delighted'); void d.offsetWidth; d.classList.add('act-clean-delighted');
      later(function () { d.classList.remove('act-clean-delighted'); }, 480);
    }
    function puffDog() { /* vacht veert zichtbaar op: subtiele schaal op de hondlaag */
      fluffN++;
      if (!imgDog) imgDog = scene.body && scene.body.querySelector('.layer-dog.is-on');
      if (!imgDog || ctx.reduced) return;
      imgDog.style.transformOrigin = '52% 88%'; imgDog.style.transition = 'opacity .25s ease, transform .35s cubic-bezier(.3,1.6,.5,1)';
      imgDog.style.transform = 'scale(' + (1 + 0.012 * fluffN).toFixed(3) + ',' + (1 + 0.016 * fluffN).toFixed(3) + ')';
    }

    /* ---------- pointer ---------- */
    function dogPoint(ev) { var p = scene.eventToDog(ev); return p; }
    function showCursor(p) {
      if (OWN_CURSOR[mode]) { if (p) { ownCursor.style.left = pct(p.fx); ownCursor.style.top = pct(p.fy); ownCursor.hidden = false; } else ownCursor.hidden = true; }
      else if (mode !== 'pick') scene.moveCursorDog(p ? p.fx : null, p ? p.fy : null);
    }
    function onDown(ev) {
      if (paused || busy || destroyed || (ev.button !== undefined && ev.button > 0)) return;
      ctx.interact(); kbd = false; userActed();
      if (mode === 'pick') return;
      var p = dogPoint(ev); if (!p) return;
      drag = { id: ev.pointerId, last: p, px: ev.clientX, py: ev.clientY, moved: false }; lastTrail = null;
      try { host.setPointerCapture(ev.pointerId); } catch (e) { /* niet nodig */ }
      showCursor(p);
      if (mode === 'wipe') wipeMove(p, p);
    }
    function onMove(ev) {
      if (paused || busy || destroyed || mode === 'pick') return;
      var p = dogPoint(ev); if (!p) return;
      if (!drag) { if (ev.pointerType === 'mouse') showCursor(p); return; }
      if (ev.pointerId !== drag.id) return;
      if (ev.pointerType === 'mouse' && ev.buttons === 0) { endDrag(ev); showCursor(p); return; }
      ctx.interact(); showCursor(p);
      if (Math.hypot(ev.clientX - drag.px, ev.clientY - drag.py) >= 8) drag.moved = true;
      var a = drag.last; drag.last = p; trailAt(a, p);
      if (mode === 'wipe') wipeMove(a, p); else if (mode === 'wash') washMove(a, p); else strokeMove(a, p);
    }
    function onUp(ev) {
      var d = drag;
      if (d && ev.pointerId === d.id && mode === 'wash' && !busy && !paused) {
        var p = dogPoint(ev);
        if (p && Math.hypot(ev.clientX - d.px, ev.clientY - d.py) < 8 && !d.moved) {
          var tg = targets.filter(function (x) { return !x.done && Math.hypot(p.fx - x.x, p.fy - x.y) <= x.r * 1.2; })[0];
          if (tg) { endDrag(ev); activate(tg, 3); return; } /* tik rondt de plek af */
        }
      }
      endDrag(ev);
    }
    function endDrag(ev) {
      if (!drag || (ev && ev.pointerId !== undefined && ev.pointerId !== drag.id)) return;
      drag = null; targets.forEach(function (z) { if (z.kind === 'zone') { z.from = null; } else { tgReset(z); } });
      if (ev && ev.pointerType && ev.pointerType !== 'mouse') showCursor(null);
    }
    function tgReset(tg) { tg.ax.x.run = tg.ax.y.run = 0; tg.ax.x.sgn = tg.ax.y.sgn = 0; }
    function onLeave() { if (!drag) showCursor(null); }
    function onKey(ev) {
      if (paused || busy || destroyed) return;
      var k = ev.key;
      if (k === 'Enter' || k === ' ' || k === 'Spacebar') { kbd = true; ctx.interact(); userActed(); return; } // activatie loopt via click (detail 0)
      if (k.indexOf('Arrow') !== 0) return;
      var tg = targets.filter(function (x) { return x.el === document.activeElement && !x.done; })[0];
      if (!tg) return;
      ev.preventDefault(); kbd = true; ctx.interact(); userActed();
      activate(tg, 1);
    }

    /* ---------- hints ---------- */
    function clearHintNow() { scene.clearHint(); }
    function showHint() {
      if (paused || busy || destroyed) return;
      var tg = targets.filter(function (x) { return !x.done; })[0]; if (!tg) return;
      if (mode === 'pick') { scene.hintDog({ kind: 'tap', from: { fx: tg.x, fy: tg.y } }); return; }
      if (tg.kind === 'zone') {
        var w = tg.rx * (mode === 'fluff' ? 0.5 : 0.8), dy = mode === 'fluff' ? tg.ry * 0.3 : 0;
        scene.hintDog({ kind: 'drag', from: { fx: tg.x - w, fy: tg.y - dy }, to: { fx: tg.x + w, fy: tg.y + dy } }); return;
      }
      var s = mode === 'wash' ? tg.r * 0.6 : tg.r * 0.8;
      scene.hintDog({ kind: 'drag', from: { fx: tg.x - s, fy: tg.y }, to: { fx: tg.x + s, fy: tg.y } });
    }
    function armIdle() {
      if (idleId !== null) { ctx.cancel(idleId); idleId = null; }
      if (destroyed || finished) return;
      idleId = ctx.schedule(function () { idleId = null; if (destroyed) return; showHint(); armIdle(); }, IDLE_MS);
    }

    /* ---------- paneel: gereedschappen met stappenstatus (geen tekst) ---------- */
    function buildPanel() {
      var wrap = mk('div', 'act-clean act-clean-panel');
      panelList = mk('ol', 'act-clean-tools'); panelList.setAttribute('aria-label', t('clean.panelAria'));
      steps.forEach(function (s, i) {
        var li = mk('li', 'act-clean-tool'); li.dataset.i = String(i);
        var ic = mk('span', 'act-clean-tool-ic');
        var im = mk('img', ''); im.alt = ''; im.draggable = false;
        var src = ICON[s.mode]; im.src = art.abs(src.indexOf('tool:') === 0 ? art.src(art.tools[src.slice(5)]) : src);
        ic.appendChild(im);
        var ck = mk('span', 'act-clean-check'); ck.setAttribute('aria-hidden', 'true');
        ck.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        ic.appendChild(ck); li.appendChild(ic);
        var pips = mk('span', 'act-clean-steppips'); pips.setAttribute('aria-hidden', 'true');
        for (var n = 0; n < s.count; n++) pips.appendChild(mk('i', 'act-clean-steppip'));
        li.appendChild(pips);
        panelList.appendChild(li);
      });
      wrap.appendChild(panelList); ctx.panel.appendChild(wrap); return wrap;
    }
    function renderPanel() {
      if (!panelList) return;
      var base = 0;
      Array.prototype.forEach.call(panelList.children, function (li, i) {
        var s = steps[i], n = Math.max(0, Math.min(s.count, doneCount - base)); base += s.count;
        var state = i < stepIdx || (i === stepIdx && n >= s.count) ? 'done' : i === stepIdx ? 'active' : 'todo';
        li.className = 'act-clean-tool is-' + state;
        li.setAttribute('aria-label', t('clean.tool.' + s.mode) + ', ' + t('clean.state.' + state));
        if (state === 'active') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        Array.prototype.forEach.call(li.querySelectorAll('.act-clean-steppip'), function (p, k) { p.classList.toggle('is-on', k < n); });
      });
    }

    /* ---------- lifecycle ---------- */
    var panelWrap = null, host = null;
    function start() {
      if (destroyed) return;
      layer = mk('div', 'act-clean act-clean-layer' + (EASY ? ' is-easy' : '')); layer.setAttribute('role', 'group'); layer.setAttribute('aria-label', t('clean.layerAria'));
      scene.spots.appendChild(layer);
      ownCursor = mk('img', 'act-clean-cursor'); ownCursor.alt = ''; ownCursor.draggable = false; ownCursor.hidden = true; layer.appendChild(ownCursor);
      imgDog = scene.body && scene.body.querySelector('.layer-dog.is-on');
      /* pointer-invoer op het hele speelveld: een gebaar mag buiten de hond beginnen en er overheen lopen */
      host = scene.stage || layer;
      host.addEventListener('pointerdown', onDown); host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerup', onUp); host.addEventListener('pointercancel', endDrag); host.addEventListener('lostpointercapture', endDrag);
      host.addEventListener('pointerleave', onLeave); layer.addEventListener('keydown', onKey);
      panelWrap = buildPanel();
      ctx.setProgress(0);
      buildStep(0);
    }
    function pause() {
      paused = true; drag = null; scene.setCursor(mode === 'wipe' || mode === 'wash' || mode === 'brush' ? mode : null); showCursor(null); scene.clearHint();
      if (layer) layer.classList.add('is-paused');
      if (idleId !== null) { ctx.cancel(idleId); idleId = null; }
    }
    function resume() {
      if (destroyed) return; paused = false; if (layer) layer.classList.remove('is-paused'); armIdle();
    }
    function destroy() {
      if (destroyed) return; destroyed = true;
      timers.forEach(function (id) { ctx.cancel(id); }); timers = [];
      if (idleId !== null) { ctx.cancel(idleId); idleId = null; }
      if (host) {
        host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerup', onUp);
        host.removeEventListener('pointercancel', endDrag); host.removeEventListener('lostpointercapture', endDrag); host.removeEventListener('pointerleave', onLeave);
        try { if (drag) host.releasePointerCapture(drag.id); } catch (e) { /* al losgelaten */ }
        host = null;
      }
      if (layer) {
        if (layer.parentNode) layer.parentNode.removeChild(layer);
      }
      if (panelWrap && panelWrap.parentNode) panelWrap.parentNode.removeChild(panelWrap);
      if (imgDog) { imgDog.style.transform = ''; imgDog.style.transition = ''; }
      if (scene.dogEl) scene.dogEl.classList.remove('act-clean-delighted', 'act-clean-fresh');
      try { scene.setCursor(null); scene.clearHint(); } catch (e) { /* scene al opgeruimd */ }
      layer = null; panelWrap = null; panelList = null; targets = [];
    }
    return { start: start, pause: pause, resume: resume, destroy: destroy };
  }

  WS.activities.clean = { create: create };
})();
