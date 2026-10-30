/* act-shower: agent shower. Douche/shampoo-level (levels 4, 9, 14). Zie docs/DESIGN.md §2 en docs/CONTRACT.md §6.
   Mechanic: verf/bedek over het hondsilhouet. Een 64x64 dekkingsraster (binnen het silhouet) houdt per stap bij wat al nat/ingeschuimd/
   afgespoeld/afgedroogd/gepluisd is; drie canvassen (nat, glans, schuim) tonen dat, geclipt met scene.dogMaskUrl().
   Alle DOM draagt de prefix act-shower; niets globaals behalve WS.activities.shower. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  WS.activities = WS.activities || {};

  var N = 64;          // dekkingsraster (cellen per zijde) over het 800-hondcanvas
  var CV = 256;        // canvasresolutie van de verflagen
  var DS = 0.012;      // afstand tussen dabs langs een streek (fractie hondcanvas)
  var DONE_FRAC = 0.86;
  var ICON = 'assets/shower/shower-step-';
  var BASKET = 'assets/shower/shower-basket.svg';
  var TOWEL = 'assets/shower/shower-towel.webp';

  /* tool = sleutel in WS.art.tools; R = penseelstraal (fractie canvas); rate = dekking per dab; mode up/down. */
  var STEPS = {
    wet:     { tool: 'shower',  mode: 'up',   R: 0.075, rate: 0.3, need: 1, sfx: 'wash',  hint: { a: [0.45, 0.3], b: [0.52, 0.64] } },
    shampoo: { tool: 'shampoo', mode: 'up',   R: 0.066, rate: 0.15, need: 1, sfx: 'wash',  hint: { a: [0.4, 0.5], b: [0.6, 0.5] } },
    rinse:   { tool: 'shower',  mode: 'down', R: 0.076, rate: 0.22, need: 0, sfx: 'wash',  hint: { a: [0.45, 0.3], b: [0.52, 0.64] } },
    towel:   { tool: 'towel',   mode: 'down', R: 0.09,  rate: 0.17, need: 0, sfx: 'wipe',  hint: { a: [0.4, 0.55], b: [0.6, 0.55] } },
    dryer:   { tool: 'dryer',   mode: 'up',   R: 0.1,   rate: 0.13,  need: 1, sfx: 'whoosh', hint: { a: [0.38, 0.35], b: [0.6, 0.55] } }
  };

  /* Gerichte plekken (L9 'details'): ellipsen [cx, cy, rx, ry] in px op het 800-canvas, afgemeten op de happy-poses. */
  var DETAIL = {
    pup:      [['earL', 305, 235, 62, 72], ['earR', 555, 330, 62, 78], ['pawL', 335, 672, 70, 56], ['pawR', 490, 672, 70, 56], ['tail', 575, 515, 46, 72]],
    shepherd: [['earL', 370, 215, 62, 82], ['earR', 535, 262, 62, 82], ['pawL', 350, 672, 70, 56], ['pawR', 500, 672, 70, 56], ['tail', 570, 530, 50, 72]],
    bichon:   [['earL', 275, 285, 62, 82], ['earR', 555, 335, 62, 82], ['pawL', 350, 672, 70, 56], ['pawR', 500, 672, 70, 56], ['tail', 575, 530, 56, 76]]
  };
  var DETAIL_NEED = 1.25;

  function mk(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function create(ctx) {
    var scene = ctx.scene, art = WS.art, story = WS.story;
    var cfg = ctx.level.cfg || {};
    var variant = cfg.variant || 'basic';
    /* easy (L4/L14, director 2026-10-27): een paar brede halen is genoeg, geen volledige dekking; grotere straal, sneller, hint direct en na 3 s */
    var EASY = !!cfg.easy, EASY_FRAC = 0.62, R_K = EASY ? 1.5 : 1, RATE_K = EASY ? 1.7 : 1, IDLE_HINT = EASY ? 3000 : 6500;
    function fr(r) { return r.frac || (EASY ? EASY_FRAC : DONE_FRAC); }
    var list = (cfg.steps || []).filter(function (s) { return STEPS[s]; });
    if (!list.length) list = ['wet', 'shampoo', 'rinse', 'towel'];

    var destroyed = false, paused = false, finished = false, started = false, locked = false;
    var root, field, fxLayer, kcur, panelRow, live, paintWrap, markersEl, basket;
    var cWet, cGloss, cFoam, xWet, xGloss, xFoam;
    var badges = [], anims = [], messEl = null;
    var inside = new Uint8Array(N * N), insideCount = 0, maskReady = false, centroid = { x: 0.5, y: 0.5 };
    var arrs = { wet: new Float32Array(N * N), foam: new Float32Array(N * N), fluff: new Float32Array(N * N) };
    var idx = -1, def = null, stepName = '', arr = null, arrKey = '', regions = [], regOf = new Int8Array(N * N), doneFlag = new Uint8Array(N * N), sum = 0, stepP = 0;
    var markerEls = [];
    var pressed = false, ptrId = null, last = null, kb = false, latched = false, kx = 0.5, ky = 0.5, lastInput = 'ptr';
    var distAcc = 0, fxAcc = 0, lastDrop = 0, lastPct = -1;
    var hintTimer = null, hintOn = false, lastActivity = 0;
    var listeners = [], dropCount = 0, puffs = [], puffsEl = null;
    var mouseIn = false, stamp = false, lastProgressAt = 0, lastP = 0, watchTimer = null;

    function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); }
    function messKind() { var p = story.PLAY && story.PLAY[ctx.dog]; return p && p.mess; }

    /* ---------- masker: wat binnen het silhouet valt ---------- */
    function buildMask() {
      var im = new Image();
      im.onload = function () {
        if (destroyed) return;
        try {
          var c = document.createElement('canvas'); c.width = N; c.height = N;
          var g = c.getContext('2d'); g.drawImage(im, 0, 0, N, N);
          var d = g.getImageData(0, 0, N, N).data, any = 0;
          for (var i = 0; i < N * N; i++) { if (d[i * 4 + 3] > 90) { inside[i] = 1; any++; } }
          if (any < 100) throw new Error('mask');
        } catch (e) { fallbackMask(); }
        maskDone();
      };
      im.onerror = function () { if (destroyed) return; fallbackMask(); maskDone(); };
      var dm = WS.dogMasks && WS.dogMasks[ctx.dog]; im.src = dm && dm.happy ? dm.happy : art.abs(art.dogs[ctx.dog].happy);   // data-URI: werkt ook via file://
    }
    function fallbackMask() {
      var b = art.dogBox[ctx.dog] || [190, 130, 640, 712];
      var cx = (b[0] + b[2]) / 1600, cy = (b[1] + b[3]) / 1600, rx = (b[2] - b[0]) / 1600, ry = (b[3] - b[1]) / 1600;
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var dx = ((x + 0.5) / N - cx) / rx, dy = ((y + 0.5) / N - cy) / ry; inside[y * N + x] = dx * dx + dy * dy <= 1 ? 1 : 0; }
    }
    function maskDone() {
      var sx = 0, sy = 0, n = 0;
      for (var i = 0; i < N * N; i++) if (inside[i]) { n++; sx += (i % N) + 0.5; sy += Math.floor(i / N) + 0.5; }
      insideCount = Math.max(1, n); centroid = { x: sx / insideCount / N, y: sy / insideCount / N };
      kx = centroid.x; ky = centroid.y;
      maskReady = true;
      if (started && idx < 0) nextStep();
    }

    /* ---------- DOM ---------- */
    function build() {
      root = mk('div', 'act-shower act-shower-root');
      field = mk('div', 'act-shower-field'); field.tabIndex = 0; field.setAttribute('role', 'application'); field.setAttribute('aria-label', ctx.t('shower.field'));
      fxLayer = mk('div', 'act-shower-fx'); fxLayer.setAttribute('aria-hidden', 'true');
      kcur = mk('div', 'act-shower-kcursor'); kcur.setAttribute('aria-hidden', 'true'); kcur.hidden = true;
      root.appendChild(fxLayer); root.appendChild(field); root.appendChild(kcur);
      ctx.overlay.appendChild(root);

      paintWrap = mk('div', 'act-shower-paint'); paintWrap.setAttribute('aria-hidden', 'true');
      var mu = scene.dogMaskUrl();
      paintWrap.style.webkitMaskImage = mu; paintWrap.style.maskImage = mu;
      markersEl = mk('div', 'act-shower-markers'); markersEl.setAttribute('aria-hidden', 'true');
      cWet = mk('canvas', 'act-shower-cv act-shower-cv-wet'); cGloss = mk('canvas', 'act-shower-cv act-shower-cv-gloss'); cFoam = mk('canvas', 'act-shower-cv act-shower-cv-foam');
      [cWet, cGloss, cFoam].forEach(function (c) { c.width = CV; c.height = CV; });
      xWet = cWet.getContext('2d'); xGloss = cGloss.getContext('2d'); xFoam = cFoam.getContext('2d');
      paintWrap.appendChild(cWet); paintWrap.appendChild(cGloss); paintWrap.appendChild(cFoam); puffsEl = mk('div', 'act-shower-puffs'); paintWrap.appendChild(puffsEl); paintWrap.appendChild(markersEl);
      (scene.spots || scene.body).appendChild(paintWrap);

      panelRow = mk('div', 'act-shower act-shower-steps'); panelRow.setAttribute('role', 'list'); panelRow.setAttribute('aria-label', ctx.t('shower.steps'));
      list.forEach(function (s, i) {
        var b = mk('div', 'act-shower act-shower-badge'); b.setAttribute('role', 'listitem'); b.dataset.step = s;
        var im = mk('img', 'act-shower-badge-img'); im.alt = ''; im.draggable = false; im.src = ICON + s + '.svg';
        var ck = mk('span', 'act-shower-badge-check'); ck.setAttribute('aria-hidden', 'true');
        b.appendChild(im); b.appendChild(ck); panelRow.appendChild(b); badges.push(b);
        if (i < list.length - 1) { var sep = mk('span', 'act-shower-sep'); sep.setAttribute('aria-hidden', 'true'); panelRow.appendChild(sep); }
      });
      live = mk('div', 'act-shower act-shower-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      ctx.panel.appendChild(panelRow); ctx.panel.appendChild(live);
      refreshBadges();
    }
    function stepLabel(s) { return ctx.t('shower.step.' + s); }
    function refreshBadges() {
      badges.forEach(function (b, i) {
        var st = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        b.dataset.state = st; b.classList.toggle('is-current', st === 'current'); b.classList.toggle('is-done', st === 'done');
        b.setAttribute('aria-label', stepLabel(list[i]) + ', ' + ctx.t('shower.state.' + st));
        b.setAttribute('aria-current', st === 'current' ? 'step' : 'false');
        if (st !== 'current') b.style.setProperty('--p', st === 'done' ? 100 : 0);
      });
    }
    function setBadgeProgress(p) {
      var pc = Math.round(clamp(p, 0, 1) * 100);
      if (pc === lastPct) return; lastPct = pc;
      if (badges[idx]) badges[idx].style.setProperty('--p', pc);
    }

    /* ---------- coördinaten ---------- */
    function dogPt(ev) { var p = scene.eventToDog(ev); return p ? { x: p.fx, y: p.fy } : null; }
    function stagePct(fx, fy) { var p = scene.dogToStage(fx, fy); return { l: p.u * 100, t: p.v * 100 }; }
    function brushR() { return (def ? def.R : 0.07) * R_K * (lastInput === 'key' ? (stamp ? 2 : 1.5) : 1); }

    /* ---------- stappen ---------- */
    function nextStep() {
      idx++;
      if (idx >= list.length) { finishAll(); return; }
      stepName = list[idx]; def = STEPS[stepName]; locked = false; if (ctx.step) ctx.step(stepName, 'start'); stepP = 0; lastP = 0; lastPct = -1; lastProgressAt = Date.now();
      arrKey = def.mode === 'down' ? (stepName === 'rinse' ? 'foam' : 'wet') : (stepName === 'wet' ? 'wet' : stepName === 'shampoo' ? 'foam' : 'fluff');
      arr = arrs[arrKey];
      if (def.mode === 'down') { for (var i = 0; i < N * N; i++) arr[i] = inside[i] ? 1 : 0; }
      buildRegions();
      scene.setCursor(def.tool);
      if (def.tool === 'towel') { var ce = scene.stage && scene.stage.querySelector('.tool-cursor'); if (ce) ce.src = art.abs(TOWEL); }
      if (stepName === 'rinse') messEl = (scene.body && scene.body.querySelector('.layer-mess')) || null;
      refreshBadges(); setBadgeProgress(0);
      live.textContent = stepLabel(stepName);
      ctx.log('shower-step', { step: stepName, idx: idx });
      if (kb) positionKcursor();
      showHintSoon(true);
      updateProgress();
    }
    function buildRegions() {
      regions = []; sum = 0;
      var details = variant === 'details' && stepName === 'shampoo';
      regions.push({ name: 'rest', need: def.need, total: 0, done: 0, cx: centroid.x, cy: centroid.y });
      if (details) {
        (DETAIL[ctx.dog] || DETAIL.pup).forEach(function (d) {
          regions.push({ name: d[0], frac: 0.75, need: DETAIL_NEED, total: 0, done: 0, cx: d[1] / 800, cy: d[2] / 800, rx: d[3] * 1.2 / 800, ry: d[4] * 1.15 / 800 });
          var r = regions[regions.length - 1]; r.cx = d[1] / 800; r.cy = d[2] / 800;
        });
      }
      for (var i = 0; i < N * N; i++) {
        doneFlag[i] = 0; regOf[i] = -1;
        if (!inside[i]) continue;
        var x = ((i % N) + 0.5) / N, y = (Math.floor(i / N) + 0.5) / N, ri = 0;
        for (var k = 1; k < regions.length; k++) {
          var r = regions[k], dx = (x - r.cx) / r.rx, dy = (y - r.cy) / r.ry;
          if (dx * dx + dy * dy <= 1) { ri = k; break; }
        }
        regOf[i] = ri; regions[ri].total++;
        sum += arr[i];
      }
      // plekken zonder cellen (bv. masker mist) verwijderen
      regions.forEach(function (r) { r.skip = r.total < 4; });
      markersEl.textContent = ''; markerEls = [];
      if (details) {
        var dirt = (art.dirt && art.dirt.spots && art.dirt.spots.mud) || [];
        regions.forEach(function (r, k) {
          if (k === 0 || r.skip) return;
          var m = mk('div', 'act-shower-marker');
          var im = mk('img', 'act-shower-marker-img'); im.alt = ''; im.draggable = false; if (dirt.length) im.src = art.abs(dirt[(k - 1) % dirt.length]);
          m.appendChild(im);
          m.style.left = (r.cx * 100) + '%'; m.style.top = (r.cy * 100) + '%'; var mw = Math.max(r.rx * 2, 0.17) * 100; m.style.width = mw + '%'; m.style.height = mw + '%';
          markersEl.appendChild(m); r.marker = m; markerEls.push(m);
        });
      }
      // beginstand van de 'klaar'-vlaggen (bij 'down' is alles nog niet klaar, bij 'up' ook niet)
      regions.forEach(function (r) { r.done = 0; });
    }
    function cellDone(i) { var r = regions[regOf[i]]; return def.mode === 'up' ? arr[i] >= r.need : arr[i] <= 0.08; }
    function refreshDone(i) {
      var nd = cellDone(i) ? 1 : 0;
      if (nd !== doneFlag[i]) { doneFlag[i] = nd; regions[regOf[i]].done += nd ? 1 : -1; }
    }
    function evaluate() {
      var tot = 0, got = 0, ok = true, goal = 0;
      regions.forEach(function (r) {
        if (r.skip) return;
        tot += r.total; goal += r.total * fr(r); got += Math.min(r.done, r.total * fr(r));
        var f = r.total ? r.done / r.total : 1;
        if (f < fr(r)) ok = false;
        if (f >= fr(r) && !r.ringed && r.marker) { r.ringed = true; zoneRing(r.cx, r.cy); ctx.sfx('pop'); }
        if (r.marker) { var p = clamp(f / fr(r), 0, 1); r.marker.style.setProperty('--m', (1 - p).toFixed(2)); r.marker.classList.toggle('is-clean', p >= 1); }
      });
      stepP = goal ? got / goal : 1;
      if (stepP > lastP + 0.003) { lastProgressAt = Date.now(); lastP = stepP; unheat(); }
      setBadgeProgress(stepP); updateProgress();
      if (stepName === 'rinse' && messEl) messEl.style.opacity = String((1 - stepP).toFixed(2));
      if ((stepName === 'rinse' || stepName === 'towel') && scene.body) scene.body.style.filter = 'saturate(' + (1.06 + 0.12 * stepP).toFixed(2) + ') brightness(' + (1.02 + 0.05 * stepP).toFixed(2) + ')';
      if (stepName === 'towel') scene.setWet(1 - stepP);
      if (stepName === 'dryer') setFluff(stepP);
      if (ok && !locked && !finished) completeStep();
    }
    function updateProgress() { ctx.setProgress(Math.min(0.995, (Math.max(0, idx) + stepP) / list.length)); }

    /* nooit vastlopen: tik/Enter op een nog niet klaar gebied (na even stilstaan) of een watchdog maakt het af */
    function unheat() { markerEls.forEach(function (m) { m.classList.remove('is-hot'); }); }
    function fillRegion(k) {
      var r = regions[k]; if (!r || !def) return;
      for (var i = 0; i < N * N; i++) {
        if (regOf[i] !== k) continue;
        var x = ((i % N) + 0.5) / N, y = (Math.floor(i / N) + 0.5) / N, t = i % 3 === 0;
        var o0 = arr[i];
        if (def.mode === 'up') { arr[i] = Math.max(arr[i], r.need); if (t) { if (stepName === 'shampoo') { foamDab(x, y, 0.04, 2, 1); } else if (stepName === 'wet') wetDab(x, y, 0.04, 3); } }
        else { arr[i] = 0; if (t) { if (stepName === 'rinse') eraseDab(xFoam, x, y, 0.04); else if (stepName === 'towel') { eraseDab(xWet, x, y, 0.04); eraseDab(xGloss, x, y, 0.04); } } }
        sum += arr[i] - o0; refreshDone(i);
      }
      if (stepName === 'shampoo') growPuff(r.cx, r.cy, 1);
      if (r.marker) zoneRing(r.cx, r.cy);
      ctx.sfx('pop');
    }
    function zoneTap(p) {
      if (!def || locked || Date.now() - lastProgressAt < 2000) return false;
      for (var k = 1; k < regions.length; k++) {
        var r = regions[k]; if (r.skip || !r.marker || r.total === 0 || r.done >= r.total * fr(r)) continue;
        var dx = (p.x - r.cx) / (r.rx * 1.4), dy = (p.y - r.cy) / (r.ry * 1.4);
        if (dx * dx + dy * dy <= 1) { fillRegion(k); evaluate(); lastProgressAt = Date.now(); return true; }
      }
      return false;
    }
    function watch() {
      watchTimer = null; if (destroyed || finished) return;
      if (def && !locked && !paused) {
        var idle = Date.now() - lastProgressAt;
        if (idle > 3000 && stepP > 0.4) markerEls.forEach(function (m) { if (!m.classList.contains('is-clean')) m.classList.add('is-hot'); });
        if (EASY ? (idle > 2500 && stepP >= 0.35) : (idle > 7000 && stepP >= 0.7)) {   // easy: kleine gemiste plekjes worden vanzelf afgemaakt
          regions.forEach(function (r, k) { if (!r.skip && r.total && r.done < r.total * fr(r)) fillRegion(k); });
          if (ctx.step) ctx.step(stepName, 'assist'); if (ctx.log) ctx.log('shower-assist', { step: stepName });
          evaluate();
        }
      }
      watchTimer = ctx.schedule(watch, 1500);
    }
    function completeStep() {
      locked = true; pressed = false; last = null; hideHint(); cancelHintTimer();
      if (ctx.step) ctx.step(stepName, 'complete');
      ctx.markHint('shower.' + stepName);
      finalizeVisual();
      stepP = 1; setBadgeProgress(1); updateProgress();
      badges[idx] && badges[idx].classList.add('is-pop');
      scene.react('happy');
      var c = stagePct(centroid.x, centroid.y - 0.12);
      sparkBurst(c.l, c.t, 7);
      ctx.sfx(stepName === 'wet' ? 'splash' : stepName === 'shampoo' ? 'pop' : 'clean');
      ctx.log('shower-step-done', { step: stepName });
      if (idx === list.length - 1) { scene.setMess(null); scene.setWet(0); clearMessStyle(); }
      ctx.schedule(function () { if (destroyed) return; refreshBadgesAfter(); nextStep(); }, 650);
    }
    function refreshBadgesAfter() { /* badges worden door nextStep vernieuwd */ }

    function finalizeVisual() {
      var i, x, y;
      if (stepName === 'wet') {
        for (i = 0; i < N * N; i++) if (inside[i] && arrs.wet[i] < 0.6) { x = ((i % N) + 0.5) / N; y = (Math.floor(i / N) + 0.5) / N; wetDab(x, y, 0.045, 3); }
        for (i = 0; i < N * N; i++) arrs.wet[i] = inside[i] ? 1 : 0;
        scene.setWet(1);
      } else if (stepName === 'shampoo') {
        for (i = 0; i < N * N; i++) if (inside[i] && arrs.foam[i] < 0.7) { x = ((i % N) + 0.5) / N; y = (Math.floor(i / N) + 0.5) / N; foamDab(x, y, 0.045, 2, 1); }
        for (i = 0; i < N * N; i += 9) if (inside[i] && arrs.foam[i] < 0.7) { x = ((i % N) + 0.5) / N; y = (Math.floor(i / N) + 0.5) / N; growPuff(x, y, 1); }
        for (i = 0; i < N * N; i++) arrs.foam[i] = inside[i] ? 1 : 0;
        regions.forEach(function (r) { if (r.marker) { r.marker.classList.add('is-clean'); if (!ctx.reduced) { var p = stagePct(r.cx, r.cy); sparkBurst(p.l, p.t, 3); } } });
      } else if (stepName === 'rinse') {
        cFoam.classList.add('act-shower-fadeout');
        puffs.slice().forEach(function (pf, i) { popPuff(pf, i * 18); });
        for (i = 0; i < N * N; i++) arrs.foam[i] = 0;
        if (messEl) messEl.style.opacity = '0';
        ctx.schedule(function () { if (destroyed) return; xFoam.clearRect(0, 0, CV, CV); cFoam.classList.remove('act-shower-fadeout'); }, 450);
      } else if (stepName === 'towel') {
        xWet.clearRect(0, 0, CV, CV); xGloss.clearRect(0, 0, CV, CV);
        for (i = 0; i < N * N; i++) arrs.wet[i] = 0;
        scene.setWet(0);
      } else if (stepName === 'dryer') {
        setFluff(1);
        if (scene.body) scene.body.classList.remove('act-shower-drying');
      }
    }
    function finishAll() {
      if (finished) return; finished = true;
      scene.setCursor(null); scene.moveCursor(null); hideKcursor();
      scene.setMess(null); scene.setWet(0); clearMessStyle();
      scene.react('happy'); scene.cheer(); ctx.sfx('win');
      live.textContent = ctx.t('shower.done');
      ctx.setProgress(1);
      ctx.schedule(function () { if (!destroyed) ctx.complete({}); }, 900);
    }
    function clearMessStyle() { if (messEl) messEl.style.opacity = ''; var m = scene.body && scene.body.querySelector('.layer-mess'); if (m) m.style.opacity = ''; }

    /* ---------- verf: raster + canvassen ---------- */
    function forCells(fx, fy, R, fn) {
      var gx0 = Math.max(0, Math.floor((fx - R) * N)), gx1 = Math.min(N - 1, Math.ceil((fx + R) * N));
      var gy0 = Math.max(0, Math.floor((fy - R) * N)), gy1 = Math.min(N - 1, Math.ceil((fy + R) * N));
      for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
        var dx = (gx + 0.5) / N - fx, dy = (gy + 0.5) / N - fy, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= R) fn(gy * N + gx, 0.45 + 0.55 * (1 - d / R));
      }
    }
    function wetDab(fx, fy, R, a) {
      var x = fx * CV, y = fy * CV, r = R * CV * 1.1;
      var g = xWet.createRadialGradient(x, y, r * 0.15, x, y, r);
      var al = 0.028 * (a || 1);
      g.addColorStop(0, 'rgba(96,150,225,' + al + ')'); g.addColorStop(1, 'rgba(96,150,225,0)');
      xWet.fillStyle = g; xWet.beginPath(); xWet.arc(x, y, r, 0, 6.2832); xWet.fill();
      if (Math.random() < 0.4) {
        var ax = x + (Math.random() - 0.5) * r * 1.3, ay = y + (Math.random() - 0.5) * r * 1.3;
        xGloss.fillStyle = 'rgba(255,255,255,0.55)'; xGloss.beginPath(); xGloss.ellipse(ax, ay, 1.2 + Math.random() * 2.2, 0.8 + Math.random() * 1.6, -0.6, 0, 6.2832); xGloss.fill();
      }
    }
    function foamDab(fx, fy, R, count, grow) {
      var gr = grow === undefined ? 1 : grow;
      for (var k = 0; k < count; k++) {
        var a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * R * 0.9;
        var x = (fx + Math.cos(a) * d) * CV, y = (fy + Math.sin(a) * d) * CV;
        var r = (0.013 + Math.random() * 0.017) * CV * (0.35 + 0.9 * gr);
        var g = xFoam.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#fbfdff'); g.addColorStop(1, '#dbeafd');
        xFoam.fillStyle = g; xFoam.beginPath(); xFoam.arc(x, y, r, 0, 6.2832); xFoam.fill();
        xFoam.strokeStyle = 'rgba(150,185,230,0.7)'; xFoam.lineWidth = 0.9; xFoam.stroke();
        xFoam.fillStyle = 'rgba(255,255,255,0.95)'; xFoam.beginPath(); xFoam.arc(x - r * 0.35, y - r * 0.4, r * 0.22, 0, 6.2832); xFoam.fill();
      }
      peekHoles(fx, fy, R + 0.05);
    }
    /* ogen en mond blijven vrij van schuim: de hond kijkt tevreden door het schuim heen */
    function peekHoles(fx, fy, reach) {
      var a = art.anchors && art.anchors[ctx.dog]; if (!a) return;
      var pts = [];
      if (a.eyes) { pts.push([a.eyes.l[0] / 800, a.eyes.l[1] / 800, a.eyes.rad / 800 * 1.25]); pts.push([a.eyes.r[0] / 800, a.eyes.r[1] / 800, a.eyes.rad / 800 * 1.25]); }
      if (a.mouth) pts.push([a.mouth[0] / 800, a.mouth[1] / 800, 0.032]);
      pts.forEach(function (q) { if (Math.hypot(q[0] - fx, q[1] - fy) < reach + q[2]) eraseDab(xFoam, q[0], q[1], q[2]); });
    }
    function eraseDab(c2d, fx, fy, R) {
      var x = fx * CV, y = fy * CV, r = R * CV;
      c2d.globalCompositeOperation = 'destination-out';
      var g = c2d.createRadialGradient(x, y, r * 0.6, x, y, r * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c2d.fillStyle = g; c2d.beginPath(); c2d.arc(x, y, r * 1.05, 0, 6.2832); c2d.fill();
      c2d.globalCompositeOperation = 'source-over';
    }

    function dab(fx, fy) {
      if (!def || locked || !maskReady) return;
      var R = brushR(), kbBoost0 = lastInput === 'key' ? (stamp ? 3.5 : 2.5) : 1, cap = stepName === 'shampoo' && variant === 'details' ? 1.6 : 1.05, d = def;
      var local = 0, n = 0;
      forCells(fx, fy, R * 0.92, function (i, w) {
        if (!inside[i]) return;
        var o = arr[i], kbBoost = kbBoost0 * (regions[regOf[i]].need > 1 ? 1.8 : 1), v = d.mode === 'up' ? Math.min(cap, o + d.rate * RATE_K * kbBoost * w) : Math.max(0, o - d.rate * RATE_K * kbBoost * w);
        if (v !== o) { arr[i] = v; sum += v - o; refreshDone(i); }
        local += v; n++;
      });
      var amtLocal = n ? local / n : 0;
      if (stepName === 'wet') wetDab(fx, fy, R, 1);
      else if (stepName === 'shampoo') { foamDab(fx, fy, R, 2, Math.min(1, amtLocal)); growPuff(fx + (Math.random() - 0.5) * R, fy + (Math.random() - 0.5) * R, amtLocal); }
      else if (stepName === 'rinse') { eraseDab(xFoam, fx, fy, R * 0.95); popNear(fx, fy, R); }
      else if (stepName === 'towel') { eraseDab(xWet, fx, fy, R * 0.95); eraseDab(xGloss, fx, fy, R * 0.95); }
    }
    function stroke(a, b) {
      var len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / DS));
      for (var i = 1; i <= n; i++) { var t = i / n; dab(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }
      distAcc += len; fxAcc += len;
      effects(b, len);
      evaluate();
    }
    function tapDab(p) { dab(p.x, p.y); effects(p, 0.05); distAcc += 0.05; evaluate(); }

    /* ---------- effecten ---------- */
    function sparkBurst(l, t, n) {
      if (ctx.reduced) return;
      for (var i = 0; i < n; i++) {
        if (fxLayer.children.length > 60) return;
        var s = mk('img', 'act-shower-fxbit act-shower-spark'); s.alt = ''; s.draggable = false; s.src = art.abs(art.fx.sparkle);
        s.style.left = l + '%'; s.style.top = t + '%'; s.style.width = (3.5 + Math.random() * 3) + '%';
        var a = i / n * 6.2832 + Math.random() * 0.6, rr = 20 + Math.random() * 30;
        s.style.setProperty('--dx', Math.round(Math.cos(a) * rr) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * rr - 14) + 'px');
        fxLayer.appendChild(s); s.addEventListener('animationend', function (e) { if (e.target.parentNode) e.target.remove(); });
      }
    }
    function spawn(kind, fx, fy) {
      if (ctx.reduced || fxLayer.children.length > 48) return;
      var p = stagePct(fx, fy);
      var e = mk('img', 'act-shower-fxbit act-shower-' + kind); e.alt = ''; e.draggable = false;
      e.src = art.abs(kind === 'drop' ? art.props['water-drop'] : kind === 'wind' ? art.fx.sparkle : art.fx.bubble);
      if (kind === 'pop') e.classList.add('act-shower-bubble-pop');
      e.style.left = (p.l + (Math.random() - 0.5) * 8) + '%'; e.style.top = (p.t + (Math.random() - 0.5) * 4) + '%';
      e.style.width = (kind === 'drop' ? 2.4 + Math.random() * 1.6 : 2.2 + Math.random() * 3.2) + '%';
      e.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 36) + 'px');
      fxLayer.appendChild(e); e.addEventListener('animationend', function (ev) { if (ev.target.parentNode) ev.target.remove(); });
    }
    /* schuimwolkjes (props foam-puff-*): groeien bij elk schrobben, knappen bij het spoelen */
    function growPuff(fx, fy, amt) {
      if (!puffsEl) return;
      var best = null, bd = 0.045;
      for (var i = 0; i < puffs.length; i++) { var d = Math.hypot(puffs[i].x - fx, puffs[i].y - fy); if (d < bd) { bd = d; best = puffs[i]; } }
      if (best) { best.k = Math.min(1.7, best.k + 0.12); best.el.style.setProperty('--k', best.k.toFixed(2)); return; }
      if (puffs.length >= 56) return;
      var e = mk('img', 'act-shower-puff'); e.alt = ''; e.draggable = false;
      e.src = art.abs(art.props['foam-puff-' + (1 + Math.floor(ctx.rng() * 3))]);
      e.style.left = (fx * 100) + '%'; e.style.top = (fy * 100) + '%'; e.style.width = (7 + ctx.rng() * 5) + '%';
      e.style.setProperty('--k', '0.5'); e.style.setProperty('--r', Math.round((ctx.rng() - 0.5) * 30) + 'deg');
      puffsEl.appendChild(e); puffs.push({ el: e, x: fx, y: fy, k: 0.5 });
    }
    function popPuff(pf, delay) {
      var i = puffs.indexOf(pf); if (i >= 0) puffs.splice(i, 1);
      var e = pf.el;
      if (ctx.reduced) { e.remove(); return; }
      e.style.animationDelay = (delay || 0) + 'ms'; e.classList.add('is-pop');
      e.addEventListener('animationend', function () { if (e.parentNode) e.remove(); });
    }
    function popNear(fx, fy, R) {
      puffs.slice().forEach(function (pf) { if (Math.hypot(pf.x - fx, pf.y - fy) < R * 1.1) { popPuff(pf, 0); if (!ctx.reduced && Math.random() < 0.5) { spawn('pop', pf.x, pf.y); } } });
    }
    function zoneRing(fx, fy) {
      var p = stagePct(fx, fy);
      sparkBurst(p.l, p.t, 5);
      if (ctx.reduced) return;
      var r = mk('span', 'act-shower-ring'); r.style.left = p.l + '%'; r.style.top = p.t + '%';
      fxLayer.appendChild(r); r.addEventListener('animationend', function () { if (r.parentNode) r.remove(); });
    }
    function effects(p, len) {
      if (distAcc > 0.07) { distAcc = 0; ctx.sfx(def.sfx); }
      if (fxAcc > (stepName === 'shampoo' ? 0.02 : 0.03)) {
        fxAcc = 0;
        if (stepName === 'wet' || stepName === 'rinse') { spawn('drop', p.x, p.y - 0.02); spawn('drop', p.x + 0.03, p.y); }
        else if (stepName === 'shampoo') { spawn('bubble', p.x, p.y); spawn('bubble', p.x + 0.02, p.y - 0.02); }
        else if (stepName === 'towel') { if (Math.random() < 0.5) spawn('drop', p.x, p.y + 0.02); }
        else if (stepName === 'dryer') { spawn('wind', p.x, p.y); }
      }
      if (stepName === 'wet') scene.setWet(clamp(sum / insideCount, 0, 1));
      if (stepName === 'dryer') { if (scene.body) scene.body.classList.add('act-shower-drying'); }
    }
    function setFluff(p) {
      var b = scene.body; if (!b) return;
      p = clamp(p, 0, 1);
      b.classList.add('act-shower-fluff'); b.style.setProperty('--fl', p.toFixed(3));
      b.style.scale = String(1 + 0.045 * p);
      b.style.filter = p > 0.02 ? 'drop-shadow(0 0 ' + (7 * p).toFixed(1) + 'px rgba(255,255,255,.75))' : '';
    }

    /* ---------- hints ---------- */
    function hintPts() {
      var h = def.hint, a = h.a, b = h.b;
      if (variant === 'details' && stepName === 'shampoo') { var r = regions.filter(function (x) { return x.marker && x.done < x.total * fr(x); })[0]; if (r) { a = [r.cx - 0.06, r.cy]; b = [r.cx + 0.06, r.cy]; } }
      else if (stepName === 'wet' || stepName === 'rinse' || stepName === 'shampoo' || stepName === 'towel' || stepName === 'dryer') { a = [centroid.x + (a[0] - 0.5) * 0.7, centroid.y + (a[1] - 0.5) * 0.9]; b = [centroid.x + (b[0] - 0.5) * 0.7, centroid.y + (b[1] - 0.5) * 0.9]; }
      return { from: scene.dogToStage(a[0], a[1]), to: scene.dogToStage(b[0], b[1]) };
    }
    function showHint() {
      if (destroyed || paused || locked || finished || !def || pressed) return;
      var h = hintPts(); scene.hint({ kind: 'drag', from: h.from, to: h.to }); hintOn = true;
    }
    function hideHint() { if (hintOn) { scene.clearHint(); hintOn = false; } }
    function cancelHintTimer() { if (hintTimer !== null) { ctx.cancel(hintTimer); hintTimer = null; } }
    function showHintSoon(first) {
      cancelHintTimer();
      var delay = first ? (ctx.hintSeen('shower.' + stepName) && !EASY ? 6000 : 350) : IDLE_HINT;
      hintTimer = ctx.schedule(function () { hintTimer = null; showHint(); armIdle(); }, delay);
    }
    function armIdle() { cancelHintTimer(); hintTimer = ctx.schedule(function () { hintTimer = null; showHint(); armIdle(); }, IDLE_HINT); }
    function activity() { ctx.interact(); if (hintOn) hideHint(); if (!locked && !finished) { cancelHintTimer(); armIdle(); } }

    /* ---------- toetsenbord-cursor ---------- */
    function positionKcursor() {
      if (!def) return;
      var p = scene.dogToStage(kx, ky), dr = scene.dogRect(), sr = scene.stageRect();
      if (!sr.width) return;
      var size = brushR() * 2 * dr.width;
      kcur.style.left = (p.u * 100) + '%'; kcur.style.top = (p.v * 100) + '%'; kcur.style.width = size + 'px'; kcur.style.height = size + 'px';
      scene.moveCursorDog(kx, ky);
    }
    function showKcursor() { if (!kb || !def || finished) return; kcur.hidden = false; positionKcursor(); }
    function hideKcursor() { kcur.hidden = true; }

    /* ---------- invoer ---------- */
    function onDown(ev) {
      if (destroyed || paused || finished) return;
      if (ev.button !== undefined && ev.button > 0) return;
      lastInput = 'ptr'; kb = false; hideKcursor();
      activity();
      if (locked || !def) return;
      var p = dogPt(ev); if (!p) return;
      pressed = true; ptrId = ev.pointerId; last = p;
      try { field.setPointerCapture(ev.pointerId); } catch (e) { /* geen capture nodig */ }
      scene.moveCursorDog(p.x, p.y);
      if (!zoneTap(p)) tapDab(p);
    }
    function onMove(ev) {
      if (destroyed || paused || finished) return;
      if (ev.pointerType === 'mouse' || pressed) ctx.interact();
      lastInput = 'ptr';
      var p = dogPt(ev); if (!p) return;
      if (def && !locked && (pressed || ev.pointerType === 'mouse')) scene.moveCursorDog(p.x, p.y);
      if (!pressed || ev.pointerId !== ptrId || locked) return;
      if (hintOn) hideHint();
      if (last) stroke(last, p);
      last = p;
    }
    function endPtr(ev) {
      if (ev && ptrId !== null && ev.pointerId !== undefined && ev.pointerId !== ptrId) return;
      pressed = false; last = null; ptrId = null;
      if (ev && ev.pointerType && ev.pointerType !== 'mouse') scene.moveCursor(null);
    }
    function onUp(ev) { endPtr(ev); try { field.releasePointerCapture(ev.pointerId); } catch (e) { /* al los */ } }
    function onLeave(ev) { if (ev.pointerType === 'mouse' && !pressed) scene.moveCursor(null); }

    function onKey(ev) {
      if (destroyed || paused || finished) return;
      var k = ev.key, dx = 0, dy = 0;
      if (k === 'ArrowLeft') dx = -1; else if (k === 'ArrowRight') dx = 1; else if (k === 'ArrowUp') dy = -1; else if (k === 'ArrowDown') dy = 1;
      var act = k === ' ' || k === 'Spacebar' || k === 'Enter';
      if (!dx && !dy && !act) return;
      ev.preventDefault();
      lastInput = 'key'; kb = true; activity();
      if (locked || !def) return;
      if (dx || dy) {
        var from = { x: kx, y: ky }, step = ev.shiftKey ? 0.14 : 0.07;
        kx = clamp(kx + dx * step, 0.04, 0.96); ky = clamp(ky + dy * step, 0.04, 0.96);
        showKcursor();
        stroke(from, { x: kx, y: ky });      // pijltjes schilderen langs het pad
      } else if (!ev.repeat) {
        stamp = true; showKcursor(); if (!zoneTap({ x: kx, y: ky })) tapDab({ x: kx, y: ky }); stamp = false;   // Space/Enter: grote stempel
        kcur.classList.add('is-latched'); ctx.schedule(function () { if (kcur) kcur.classList.remove('is-latched'); }, 220);
      }
    }
    function onFocus() { if (lastInput === 'key' || kbFocusVisible()) { kb = true; showKcursor(); } }
    function kbFocusVisible() { try { return field.matches(':focus-visible'); } catch (e) { return true; } }
    function onBlur() { hideKcursor(); if (def) scene.moveCursor(null); }
    function onLayout() { if (kb && !kcur.hidden) positionKcursor(); }

    /* ---------- wasmand: de gedragen outfit wordt opgeborgen ---------- */
    function laundry() {
      var arcs = ctx.save && ctx.save.arcs, o = story.normalizeOutfit(arcs && arcs[ctx.dog] && arcs[ctx.dog].party);
      var ids = story.outfitIds(o).filter(function (id) { return art.items[id] && art.items[id].icon; });
      if (!ids.length) return;
      basket = mk('img', 'act-shower-basket'); basket.alt = ''; basket.draggable = false; basket.src = BASKET; basket.setAttribute('aria-hidden', 'true');
      root.appendChild(basket);
      var pts = { head: [0.4, 0.2], face: [0.42, 0.3], neck: [0.5, 0.45], body: [0.5, 0.58] };
      var a = art.anchors && art.anchors[ctx.dog];
      var br = basket.getBoundingClientRect(), sr = scene.stageRect();
      var bx = br.width ? (br.left + br.width / 2 - sr.left) / sr.width * 100 : 14, by = br.width ? (br.top + br.height * 0.35 - sr.top) / sr.height * 100 : 86;
      ids.forEach(function (id, i) {
        var slot = story.categoryOf(id), p = pts[slot] || pts.body;
        if (a) {
          if (slot === 'head' && a.hat) p = [a.hat.x / 800, a.hat.y / 800 - 0.03];
          else if (slot === 'face' && a.eyes) p = [(a.eyes.l[0] + a.eyes.r[0]) / 1600, (a.eyes.l[1] + a.eyes.r[1]) / 1600];
          else if (slot === 'neck' && a.collar) p = [a.collar.pts[1][0] / 800, a.collar.pts[1][1] / 800];
          else if (slot === 'body' && a.torso) { var sx = 0, sy = 0; a.torso.forEach(function (q) { sx += q[0]; sy += q[1]; }); p = [sx / a.torso.length / 800, sy / a.torso.length / 800]; }
        }
        var sp = stagePct(p[0], p[1]);
        var im = mk('img', 'act-shower-flyer'); im.alt = ''; im.draggable = false; im.src = art.abs(art.items[id].icon); im.setAttribute('aria-hidden', 'true');
        im.style.left = sp.l + '%'; im.style.top = sp.t + '%';
        root.appendChild(im);
        if (ctx.reduced || !im.animate) { im.style.left = bx + '%'; im.style.top = by + '%'; im.style.transform = 'translate(-50%,-50%) scale(.6)'; return; }
        var dx = (bx - sp.l) / 100 * sr.width, dy = (by - sp.t) / 100 * sr.height;
        var an = im.animate([
          { transform: 'translate(-50%,-50%) scale(.5) rotate(0deg)', opacity: 0, offset: 0 },
          { transform: 'translate(-50%,-50%) translate(' + (dx * 0.1) + 'px,' + (-sr.height * 0.08) + 'px) scale(1) rotate(-10deg)', opacity: 1, offset: 0.25 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.45) rotate(24deg)', opacity: 1, offset: 0.9 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.2) rotate(30deg)', opacity: 0, offset: 1 }
        ], { duration: 650, delay: i * 130, easing: 'cubic-bezier(.4,.1,.5,1)', fill: 'both' });
        anims.push(an);
      });
      var total = ctx.reduced ? 1300 : 650 + (ids.length - 1) * 130 + 150;
      if (!ctx.reduced && basket.animate) anims.push(basket.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.12)', offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 260, delay: total - 330 }));
      ctx.schedule(function () { if (destroyed) return; anims.forEach(function (x) { try { x.cancel(); } catch (e) { /* weg */ } }); anims = []; Array.prototype.slice.call(root.querySelectorAll('.act-shower-flyer, .act-shower-basket')).forEach(function (n) { n.remove(); }); basket = null; }, Math.min(1200, total) + 50);
      ctx.sfx('whoosh');
    }

    /* ---------- lifecycle ---------- */
    function resetFluff(b) { if (b) { b.classList.remove('act-shower-fluff', 'act-shower-drying'); b.style.removeProperty('--fl'); b.style.scale = ''; b.style.filter = ''; } }
    /* Eindstaat: de pluizige hond blijft op het eindscherm staan en wordt opgeruimd zodra de shell het eindscherm verlaat. */
    function keepFluffUntilNextLevel(b) {
      if (typeof MutationObserver === 'undefined') { resetFluff(b); return; }
      var obs = new MutationObserver(function () {
        if (document.body.dataset.state === 'reveal') return;
        obs.disconnect();
        if (!b.dataset.showerLive) resetFluff(b);
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['data-state', 'data-level', 'data-end'] });
    }
    var inst = {
      start: function () {
        if (started || destroyed) return; started = true;
        if (scene.body) { scene.body.dataset.showerLive = '1'; resetFluff(scene.body); }
        build();
        scene.setWet(0); scene.setMess(messKind() || 'party');
        messEl = scene.body && scene.body.querySelector('.layer-mess'); if (messEl) messEl.style.opacity = '';
        on(field, 'pointerdown', onDown); on(field, 'pointermove', onMove); on(field, 'pointerup', onUp); on(field, 'pointercancel', onUp);
        on(field, 'lostpointercapture', endPtr); on(field, 'pointerleave', onLeave);
        on(field, 'keydown', onKey); on(field, 'focus', onFocus); on(field, 'blur', onBlur);
        on(document, 'ws-scene-layout', onLayout);
        buildMask();
        watchTimer = ctx.schedule(watch, 1500);
        laundry();
        if (maskReady) nextStep();
      },
      pause: function () {
        if (destroyed || paused) return; paused = true; pressed = false; last = null;
        hideHint(); scene.moveCursor(null);
        if (root) root.classList.add('act-shower-paused');
        anims.forEach(function (a) { try { a.pause(); } catch (e) { /* weg */ } });
      },
      resume: function () {
        if (destroyed || !paused) return; paused = false;
        if (root) root.classList.remove('act-shower-paused');
        anims.forEach(function (a) { try { a.play(); } catch (e) { /* weg */ } });
        if (kb && !kcur.hidden) positionKcursor();
        if (!locked && !finished && def) armIdle();
      },
      destroy: function () {
        if (destroyed) return; destroyed = true;
        cancelHintTimer(); if (watchTimer !== null) ctx.cancel(watchTimer);
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = [];
        anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* weg */ } }); anims = [];
        try { scene.clearHint(); scene.setCursor(null); scene.moveCursor(null); scene.setWet(0); } catch (e) { /* scene weg */ }
        clearMessStyle();
        var b = scene.body;
        if (b) { delete b.dataset.showerLive; b.classList.remove('act-shower-drying'); }
        if (b && finished && b.classList.contains('act-shower-fluff')) keepFluffUntilNextLevel(b);
        else resetFluff(b);
        [root, paintWrap, panelRow, live].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
        root = paintWrap = panelRow = live = field = kcur = fxLayer = null;
      }
    };
    return inst;
  }

  WS.activities.shower = { create: create };
})();
