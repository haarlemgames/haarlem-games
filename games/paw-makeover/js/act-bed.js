/* WS.activities.bed — Paw Makeover: pyjama kiezen + bedritueel + slapen (levels 5, 10, 15).
   Opbouw: 1) WS.dressPicker (pyjamakeuze, beoordeling na bevestigen) 2) ritueel (cfg.steps) 3) slaappose, zzz, nachtachtergrond, ctx.complete.
   Alle posities in fracties van het 800-canvas van de hond (0..1), omgezet via de basis-rect van .scene-dog-wrap (niet beinvloed door de hop-transform van dogEl).
   Interactieve objecten zijn knoppen in ctx.overlay; het slottableau (bed, deken, knuffel, lamp, zzz) wordt als scene-props (laag 'dog') achtergelaten zodat het
   eindscherm de slapende hond toont. Zie docs/CONTRACT.md §6. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  WS.activities = WS.activities || {};

  var SIZE = { blanket: [800, 400], book: [360, 280], lamp: [260, 420], moon: [240, 240], star: [120, 120], firefly: [80, 80], teddy: [360, 420],
    'tooth-brush': [400, 120], 'tooth-paste': [320, 120], zzz: [200, 200], 'dog-bed': [1, 1], pillow: [500, 260] };
  var RAIL_ICON = { pillow: 'pillow', hop: 'dog-bed', cuddle: 'icon:eye-sleep', teeth: 'tooth-brush', story: 'book', teddy: 'teddy', stars: 'star', blanket: 'blanket', lamp: 'lamp' };
  var POS = { pick: { x: 0, y: 0 }, floor: { x: 0.17, y: 0.07 }, bed: { x: 0, y: 0 }, sleep: { x: 0, y: 0 } };
  /* Bed in hondencanvas-fracties: zelfde plek als het slottableau (fx .5, fy .58, w 1, css-scale 1.15).
     Zichtbaar deel van pm-dog-bed.webp (alpha-bbox 100,413-700,680 op 800) => tikvlak hieronder. */
  var BED = { fx: 0.5, fy: 0.58, w: 1, vis: [0.125, 0.516, 0.875, 0.85] };   // vis = alpha-bbox als fractie van het bedbeeld
  var HINT_FIRST = 350, HINT_AGAIN = 400, HINT_IDLE = 2500;   // director 2026-10-27: elke bedtijdhandeling direct uitgelicht
  var BLANKET = { startFy: 0.98, targetFy: 0.74, w: 0.62, sleep: { fx: 0.63, fy: 0.71, w: 0.42, rot: -3 } };
  var TEDDY = { target: { fx: 0.76, fy: 0.64 }, start: { fx: 0.22, fy: 0.9 }, w: 0.22, sleep: { fx: 0.8, fy: 0.62 } };
  var BRUSH = { w: 0.3, tipDx: 0.4 };   // borstelkop (hotspot) ligt op 0.1 van de breedte: midden = tip + 0.4 * w
  var LAMP_W = 0.17;
  var BOOK_PAGES = ['moon', 'zzz'];   // director 2026-10-27: verhaal korter (was 3 pagina's)
  var ASSIST_MS = 3000;   // bedtijdhulp: 3 s zonder betekenisvolle voortgang -> huidige handeling wordt afgemaakt

  function mk(tag, cls, attrs) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }

  function create(ctx) {
    var scene = ctx.scene, art = WS.art, story = WS.story, t = ctx.t, level = ctx.level, cfg = level.cfg || {}, dogId = ctx.dog;
    var N = clamp(Math.round(level.id / 5), 1, 3);
    var anchors = (art.anchors && art.anchors[dogId]) || {};
    if (scene.getAnchors) anchors = scene.getAnchors();
    var mouth = anchors.mouth ? [anchors.mouth[0] / 800, anchors.mouth[1] / 800] : [0.5, 0.5];
    var baseSteps = (cfg.steps && cfg.steps.length ? cfg.steps : ['blanket', 'lamp']).filter(function (s) { return RAIL_ICON[s]; }), steps = [];
    baseSteps.forEach(function (s) { if (s === 'lamp') steps.push('cuddle'); steps.push(s); });
    if (steps.indexOf('cuddle') < 0) steps.splice(Math.max(0, steps.length - 1), 0, 'cuddle');
    var destroyed = false, paused = false, started = false, completed = false, finalStarted = false, busy = false;
    var picker = null, outfit = null, evalRes = null;
    var root = null, railEl = null, dimEl = null, liveEl = null, hintEl = null, bedBack = null, bedFront = null;
    var items = [], props = [], anims = [], cleanups = [], aborts = [];
    var stepIdx = -1, dogAt = 'pick', dogPos = POS.pick, fitState = null, lampItem = null, teddyItem = null;
    var hintTimer = null, hintArm = null, starItems = [], kbd = false, eyesEl = null;
    var assistT = null, assistFn = null;

    function blocked() { return destroyed || paused || busy || (ctx.isPaused && ctx.isPaused()); }
    function after(ms, fn) { return ctx.schedule(function () { if (!destroyed) fn(); }, ms); }

    /* ---------- geometrie ---------- */
    function wrapEl() { return scene.dogEl && scene.dogEl.parentNode; }
    function geo() {
      var w = wrapEl(), wr = w ? w.getBoundingClientRect() : { left: 0, top: 0, width: 1 }, or = ctx.overlay.getBoundingClientRect();
      return { l: wr.left - or.left, t: wr.top - or.top, S: wr.width || 1 };
    }
    function evCanvas(ev) { var w = wrapEl(), r = w.getBoundingClientRect(); return { fx: (ev.clientX - r.left) / r.width, fy: (ev.clientY - r.top) / r.height }; }
    function visRect() {
      var w = wrapEl(), wr = w.getBoundingClientRect(), sr = scene.stage.getBoundingClientRect();
      return { x0: (sr.left - wr.left) / wr.width, x1: (sr.right - wr.left) / wr.width, y0: (sr.top - wr.top) / wr.height, y1: (sr.bottom - wr.top) / wr.height };
    }
    function fit() {
      var st = scene.stage; if (!st) return;
      var W = st.clientWidth, H = st.clientHeight; if (!W || !H) return;
      var s = Math.min(1.0, 1.07 * H / W), S = s * W, slack = Math.max(0, H - 0.93 * S), y = (slack * 0.55 + 0.44 * S) / H;
      if (!fitState || Math.abs(fitState.s - s) > 0.0005 || Math.abs(fitState.y - y) > 0.0005) { fitState = { s: s, y: y }; scene.placeDog({ x: 0.5, y: y, s: s }); }
    }
    function placeItem(it, g) {
      g = g || geo();
      it.el.style.left = (g.l + it.fx * g.S) + 'px'; it.el.style.top = (g.t + it.fy * g.S) + 'px';
      it.el.style.width = Math.max(it.w * g.S, it.minW || 0) + 'px';
      if (it.h) it.el.style.height = Math.max(it.h * g.S, 44) + 'px';
    }
    /* Bed hangt in de hondenwrap (naast, niet in de hond): beweegt niet mee met de hop-transform. Achterkant onder de hond,
       voorrand (alleen zolang de hond in bed staat) erboven, zodat de hond echt IN het bed staat. */
    function bedEl(front) {
      var w = wrapEl(); if (!w) return null;
      var im = mk('img', 'prop prop-dog act-bed-prop act-bed-bed' + (front ? ' act-bed-bedfront' : ' act-bed-bedback'));
      im.alt = ''; im.draggable = false; im.setAttribute('aria-hidden', 'true'); im.src = art.abs(art.props['dog-bed']);
      im.style.left = (BED.fx * 100) + '%'; im.style.top = (BED.fy * 100) + '%'; im.style.setProperty('--w', String(BED.w));
      if (front) w.appendChild(im); else w.insertBefore(im, scene.dogEl);
      props.push(im); return im;
    }
    function rim(on) {
      // Director 2026-10-18: staande Bichon blijft voor het hele bed (geen voorrand over hond/shirt); slaaptableau heeft eigen rand.
      if (on && !bedFront && !finalStarted && dogId !== 'bichon') bedFront = bedEl(true);
      if (!on && bedFront) { if (bedFront.parentNode) bedFront.parentNode.removeChild(bedFront); bedFront = null; }
    }
    /* zichtbaar bed in hondencanvas-fracties, gemeten op het echte element (css-scale verschuift het beeld iets) */
    function bedVis() {
      var w = wrapEl(), b = bedBack; if (!w || !b) return { x0: 0.07, y0: 0.6, x1: 0.93, y1: 0.98 };
      var wr = w.getBoundingClientRect(), br = b.getBoundingClientRect(), v = BED.vis;
      return { x0: (br.left + v[0] * br.width - wr.left) / wr.width, y0: (br.top + v[1] * br.height - wr.top) / wr.height,
        x1: (br.left + v[2] * br.width - wr.left) / wr.width, y1: (br.top + v[3] * br.height - wr.top) / wr.height };
    }
    function bedTarget(on) { if (bedBack) bedBack.classList.toggle('is-target', !!on); }
    function relayout() {
      if (destroyed || !root) return;
      fit(); var g = geo();
      items.forEach(function (it) { placeItem(it, g); });
      if (hintEl && hintArm) showHint(hintArm.kind, hintArm.a, hintArm.b);
    }
    function onLayout() { relayout(); }

    /* ---------- objecten (knoppen in de overlay) ---------- */
    function addObj(key, o) {
      var b = mk(o.deco ? 'div' : 'button', 'act-bed-obj act-bed-' + key + (o.cls ? ' ' + o.cls : ''));
      if (!o.deco) { b.type = 'button'; b.setAttribute('aria-label', o.label); } else b.setAttribute('aria-hidden', 'true');
      var im = mk('img'); im.alt = ''; im.draggable = false; im.src = art.abs(art.props[key] || key); b.appendChild(im);
      var sz = SIZE[key] || [1, 1]; b.style.aspectRatio = sz[0] + ' / ' + sz[1]; b.style.zIndex = String(o.z || 5);
      var it = { el: b, fx: o.fx, fy: o.fy, w: o.w, minW: o.minW === undefined ? 44 : o.minW, key: key };
      items.push(it); root.appendChild(b); placeItem(it); return it;
    }
    function addHit(o) {
      var b = mk('button', 'act-bed-hit' + (o.cls ? ' ' + o.cls : ''), { type: 'button', 'aria-label': o.label });
      if (o.icon) { var im = mk('img', 'act-bed-hit-img'); im.alt = ''; im.draggable = false; im.src = o.icon; b.appendChild(im); }
      b.style.zIndex = String(o.z || 4);
      var it = { el: b, fx: o.fx, fy: o.fy, w: o.w, h: o.h || o.w, minW: 44 };
      items.push(it); root.appendChild(b); placeItem(it); return it;
    }
    function removeItem(it) {
      if (!it) return; var i = items.indexOf(it); if (i >= 0) items.splice(i, 1);
      if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
    }
    function setPos(it, fx, fy) { it.fx = fx; it.fy = fy; placeItem(it); }
    function activeOn(it, on) { if (it && it.el) it.el.classList.toggle('is-active', on !== false); }
    function lockItem(it) { it.el.classList.remove('is-active'); it.el.classList.add('is-set'); it.el.tabIndex = -1; it.el.setAttribute('aria-hidden', 'true'); if (it.el.blur) it.el.blur(); }

    /* ---------- invoer: slepen / toetsenbord ---------- */
    function makeDraggable(it, h) {
      var el = it.el, drag = null;
      el.classList.add('is-drag-able');
      el.addEventListener('pointerdown', function (ev) {
        if (blocked() || drag || el.classList.contains('is-set')) return;
        ctx.interact(); bump();
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        var p = evCanvas(ev);
        drag = { id: ev.pointerId, dx: it.fx - p.fx, dy: it.fy - p.fy };
        el.classList.add('is-drag'); if (h.onStart) h.onStart(p, ev);
        ev.preventDefault();
      });
      el.addEventListener('pointermove', function (ev) {
        if (!drag || ev.pointerId !== drag.id || blocked() || el.classList.contains('is-set')) return;
        ctx.interact(); var p = evCanvas(ev);
        h.onMove({ fx: p.fx + drag.dx, fy: p.fy + drag.dy }, ev, p);
      });
      function end(ev, cancel) {
        if (!drag || (ev && ev.pointerId !== undefined && ev.pointerId !== drag.id)) return;
        var d = drag; drag = null; el.classList.remove('is-drag');
        try { el.releasePointerCapture(d.id); } catch (e) { /* ignore */ }
        if (cancel) { if (h.onCancel) h.onCancel(); } else if (h.onEnd && !blocked()) h.onEnd();
        else if (h.onCancel) h.onCancel();
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false); });
      el.addEventListener('pointercancel', function (ev) { end(ev, true); });
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true); });
      aborts.push(function () { end(null, true); });
      el.addEventListener('keydown', function (e) {
        var k = e.key, dir = k === 'ArrowUp' ? 'up' : k === 'ArrowDown' ? 'down' : k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : null;
        if (!dir && k !== 'Enter' && k !== ' ') return;
        e.preventDefault();
        if (blocked()) return;
        ctx.interact(); bump();
        if (dir) { if (h.onKey) h.onKey(dir); } else if (h.onActivate) h.onActivate();
      });
      el.addEventListener('keyup', function (e) { if (e.key === ' ') e.preventDefault(); });
    }
    function onTap(it, fn) {
      it.el.addEventListener('click', function () { if (blocked()) return; ctx.interact(); bump(); fn(); });
    }

    /* ---------- hint (eigen laag in de overlay, boven de objecten) ---------- */
    function hideHint() { if (hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl); hintEl = null; }
    function showHint(kind, a, b) {
      hideHint(); if (!root) return;
      var g = geo(), x0 = g.l + a.fx * g.S, y0 = g.t + a.fy * g.S, x1 = b ? g.l + b.fx * g.S : x0, y1 = b ? g.t + b.fy * g.S : y0;
      hintEl = mk('div', 'act-bed-hint is-' + (kind === 'drag' ? 'drag' : 'tap') + (ctx.reduced ? ' is-static' : '') + (hintArm && hintArm.big ? ' is-big' : ''));
      hintEl.setAttribute('aria-hidden', 'true');
      hintEl.style.setProperty('--x0', x0 + 'px'); hintEl.style.setProperty('--y0', y0 + 'px');
      hintEl.style.setProperty('--dx', (x1 - x0) + 'px'); hintEl.style.setProperty('--dy', (y1 - y0) + 'px');
      hintEl.appendChild(mk('span', 'act-bed-hint-ring'));
      if (kind === 'drag') { var tg = mk('span', 'act-bed-hint-target'); tg.style.left = x1 + 'px'; tg.style.top = y1 + 'px'; hintEl.appendChild(tg); }
      var hand = mk('img', 'act-bed-hint-hand'); hand.alt = ''; hand.src = art.abs(art.fx.hintHand); hintEl.appendChild(hand);
      root.appendChild(hintEl);
    }
    /* Hint-regels: eerste keer vrijwel direct; daarna na korte stilte. Een poging op het actieve object verbergt de hand
       en zet EENMALIG een terugkeer-timer (volgende pogingen stellen die niet uit). Een tik naast het doel toont de hand meteen. */
    function hintNow() { if (hintTimer !== null) { ctx.cancel(hintTimer); hintTimer = null; } if (hintArm && !blocked()) showHint(hintArm.kind, hintArm.a, hintArm.b); }
    function armHint(key, kind, a, b) {
      disarmHint(false); hintArm = { key: key, kind: kind, a: a, b: b };
      var seen = ctx.hintSeen('bed-' + key);
      hintTimer = after(key === 'cuddle' && !seen ? 150 : seen ? HINT_AGAIN : HINT_FIRST, function () { hintTimer = null; hintNow(); });
    }
    function bump() { // poging op het actieve object: hand weg, terug na HINT_IDLE zonder succes
      progressed();
      if (!hintArm) return; hideHint();
      if (hintTimer === null) hintTimer = after(HINT_IDLE, function () { hintTimer = null; hintNow(); });
    }
    function onStagePointer(e) { // tik naast het actieve object: hint direct tonen
      if (destroyed || !hintArm || hintEl || blocked()) return;
      var tg = e.target; if (!tg || !tg.closest) return;
      if (tg.closest('.act-bed-obj, .act-bed-hit')) return;
      if (!(scene.stage && scene.stage.contains(tg)) && !(ctx.overlay && ctx.overlay.contains(tg))) return;
      hintNow();
    }
    function disarmHint(success) {
      if (hintTimer !== null) { ctx.cancel(hintTimer); hintTimer = null; }
      hideHint();
      if (success && hintArm) ctx.markHint('bed-' + hintArm.key);
      hintArm = null;
    }
    /* ---------- bedtijdhulp (director 2026-10-27) ----------
       Elke (deel)handeling registreert hoe hij zichzelf afmaakt. Na ASSIST_MS zonder voortgang voert de hulp dat uit;
       echte voortgang of een poging zet de timer opnieuw. Pauzeerbare ctx-timers: stil bij pauze/verborgen tab. */
    function assistOff() { assistFn = null; if (assistT !== null) { ctx.cancel(assistT); assistT = null; } }
    function armAssist() {
      if (assistT !== null) { ctx.cancel(assistT); assistT = null; }
      if (!assistFn || destroyed || finalStarted) return;
      assistT = after(ASSIST_MS, function () {
        assistT = null; if (!assistFn || finalStarted) return;
        if (blocked()) { armAssist(); return; }
        var f = assistFn, name = steps[stepIdx]; assistFn = null;
        if (ctx.log) ctx.log('bed-assist', { step: name }); if (ctx.step) ctx.step(name, 'assist');
        f();
      });
    }
    function assistOn(fn) { assistFn = fn; armAssist(); }
    function progressed() { if (assistFn) armAssist(); }

    /* ---------- hond verplaatsen (hop) ---------- */
    function tf(p) { return 'translate(' + (p.x * 100) + '%,' + (p.y * 100) + '%)'; }
    function applyDog(p) { scene.dogEl.style.transform = (p.x || p.y) ? tf(p) : ''; }
    function moveDog(name, o, done) {
      var from = dogPos, to = POS[name]; dogAt = name; dogPos = to; o = o || {};
      var ms = ctx.reduced ? 0 : (o.ms || 420);
      if (name !== 'bed') rim(false);
      var land = done; done = function () { if (name === 'bed') rim(true); if (land) land(); };
      if (!ms || !scene.dogEl.animate) { applyDog(to); done(); return; }
      var kf = [{ transform: tf(from) }];
      if (o.arc) kf.push({ transform: tf({ x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - o.arc }), offset: 0.5 });
      kf.push({ transform: tf(to) });
      busy = true;
      var a = scene.dogEl.animate(kf, { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
      anims.push(a);
      a.onfinish = function () {
        var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1);
        if (destroyed) return;
        applyDog(to); try { a.cancel(); } catch (e) { /* ignore */ }
        busy = false; if (done) done();
      };
    }

    /* ---------- rail (pictogrammen van de stappen) ---------- */
    function buildRail() {
      railEl = mk('div', 'act-bed act-bed-rail', { role: 'list', 'aria-label': t('bed.rail') });
      steps.forEach(function (s) {
        var c = mk('div', 'act-bed-chip', { role: 'listitem', 'data-step': s });
        var im = mk('img'); im.alt = ''; im.draggable = false; var ic = RAIL_ICON[s]; im.src = art.abs(ic.indexOf('icon:') === 0 ? 'assets/icons/' + ic.slice(5) + '.svg' : art.props[ic]); c.appendChild(im);
        c.appendChild(mk('span', 'act-bed-tick'));
        railEl.appendChild(c);
      });
      ctx.panel.appendChild(railEl);
      updateRail();
    }
    function updateRail() {
      if (!railEl) return;
      Array.prototype.forEach.call(railEl.children, function (c, i) {
        var done = i < stepIdx || stepIdx >= steps.length, now = i === stepIdx;
        c.classList.toggle('is-done', done); c.classList.toggle('is-now', now);
        c.setAttribute('aria-label', t('bed.step.' + steps[i]) + ', ' + t(done ? 'bed.state.done' : now ? 'bed.state.now' : 'bed.state.todo'));
        if (now) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current');
      });
    }
    function focusIt(it) { if (kbd && it && it.el && !destroyed) { try { it.el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
    function onDocKey(e) { if (e.key !== 'Escape') kbd = true; }
    function onDocPointer() { kbd = false; }
    function say(text) { if (liveEl) liveEl.textContent = text; }

    /* ---------- stappen ---------- */
    function burstAt(fx, fy, big) { try { scene.burst(fx - dogPos.x, fy - dogPos.y, 'sparkle', !!big); } catch (e) { /* ignore */ } }
    function stepDone(name, delay) {
      if (ctx.step) ctx.step(name, 'complete');
      assistOff(); disarmHint(true);
      ctx.sfx('complete'); scene.react('happy');
      cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      after(delay === undefined ? 520 : delay, nextStep);
    }
    function nextStep() {
      if (destroyed || finalStarted) return;
      stepIdx++; updateRail();
      ctx.setProgress(0.15 + 0.8 * Math.min(1, stepIdx / steps.length));
      if (stepIdx >= steps.length) { finalSeq(null); return; }
      var name = steps[stepIdx], needBed = !(name === 'hop' || name === 'teeth');
      var go = function () { if (ctx.log) ctx.log('bed-step', { step: name }); if (ctx.step) ctx.step(name, 'start'); STEPS[name](); };
      if (needBed && dogAt !== 'bed') moveDog('bed', { ms: 520, arc: 0.12 }, go);
      else if (!needBed && dogAt !== 'floor') moveDog('floor', { ms: 380 }, go);
      else go();
    }

    var STEPS = {
      pillow: function () {
        var vis = visRect(), floorFy = Math.min(0.97, vis.y1 - 0.12), tg = { fx: 0.27, fy: 0.7 };
        var it = addObj('pillow', { fx: Math.max(0.22, vis.x0 + 0.2), fy: floorFy, w: 0.3, z: 6, label: t('bed.act.pillow') });
        var zoneEl = addObj('star', { fx: tg.fx, fy: tg.fy, w: 0.1, z: 2, deco: true, cls: 'act-bed-target' });
        zoneEl.el.firstChild.src = art.abs(art.fx.sparkle);
        cleanups.push(function () { removeItem(zoneEl); });
        activeOn(it); armHint('pillow', 'drag', { fx: it.fx, fy: it.fy }, tg); focusIt(it);
        function place() {
          if (it.placed) return; it.placed = true;
          disarmHint(true); setPos(it, tg.fx, tg.fy); lockItem(it); it.el.classList.add('is-placed'); ctx.sfx('pop'); burstAt(tg.fx, tg.fy - 0.04, false);
          stepDone('pillow', 420);
        }
        assistOn(place);
        makeDraggable(it, {
          onStart: function () { bump(); },
          onMove: function (pos) { setPos(it, clamp(pos.fx, 0.05, 0.95), clamp(pos.fy, 0.15, 0.98)); },
          onEnd: function () { if (dist(it.fx, it.fy, tg.fx, tg.fy) < 0.17) place(); },
          onActivate: place,
          onKey: function (dir) {
            var d = 0.07; setPos(it, clamp(it.fx + (dir === 'left' ? -d : dir === 'right' ? d : 0), 0.05, 0.95), clamp(it.fy + (dir === 'up' ? -d : dir === 'down' ? d : 0), 0.15, 0.98));
            if (dist(it.fx, it.fy, tg.fx, tg.fy) < 0.17) place();
          }
        });
      },

      cuddle: function () {
        var e = anchors.eyes, c = e && e.l && e.r ? [(e.l[0] + e.r[0]) / 1600, (e.l[1] + e.r[1]) / 1600] : [0.5, 0.4];
        var cx = c[0] + dogPos.x, cy = c[1] + dogPos.y, zone = { x: c[0], y: c[1] - 0.01, rx: 0.22, ry: 0.2 };
        var hit = addHit({ fx: cx, fy: cy - 0.01, w: 0.46, h: 0.4, label: t('bed.act.cuddle'), cls: 'act-bed-hit-head', z: 8 });
        // frontale Canva-pose: eigen gesloten-ogenlaag op hetzelfde 800-canvas (tools/build-front-eyes-closed.py); oude ooglidart past alleen op de schuine pose
        var eyesSrc = scene.isFrontPose ? 'assets/dog/front-eyes-closed/' + dogId + '.webp' : (art.dogs[dogId] || {}).eyesClosed || '';
        var eyes = scene.addProp(eyesSrc, { layer: 'dog', fx: 0.5, fy: 0.5, w: 1, z: 4, id: 'bed-eyes' });
        eyes.classList.add('act-bed-prop', 'act-bed-eyes'); eyes.style.opacity = '0'; props.push(eyes); eyesEl = eyes;
        cleanups.push(function () { removeItem(hit); });
        var progress = 0, finished = false, last = null, down = null, lastSfx = 0, NEED = 1.1, tapAt = null;
        armHint('cuddle', 'drag', { fx: cx - 0.13, fy: cy }, { fx: cx + 0.13, fy: cy }); focusIt(hit);
        assistOn(function () { try { scene.burst(zone.x, zone.y, 'stroke', true); } catch (er) { /* ignore */ } add(1, null); });
        function add(d, lo) {
          if (finished) return; progress = clamp(progress + d, 0, 1); eyes.style.opacity = String(progress); progressed();
          var now = Date.now(); if (now - lastSfx > 140) { lastSfx = now; ctx.sfx('wipe'); if (lo) { try { scene.burst(lo.fx, lo.fy, 'stroke', false); } catch (er) { /* ignore */ } } }
          if (progress >= 1) { finished = true; disarmHint(true); scene.react('sleepy'); stepDone('cuddle', 600); }
        }
        hit.el.addEventListener('pointerdown', function (ev) {
          if (blocked() || down) return; ctx.interact(); bump(); last = null; tapAt = { x: ev.clientX, y: ev.clientY, t: Date.now() };
          down = ev.pointerId; try { hit.el.setPointerCapture(ev.pointerId); } catch (er) { /* ignore */ } ev.preventDefault();
        });
        hit.el.addEventListener('pointermove', function (ev) {
          if (down !== ev.pointerId || blocked()) return; ctx.interact();
          var lo = scene.eventToDog(ev); if (!lo) return;
          var dx = (lo.fx - zone.x) / zone.rx, dy = (lo.fy - zone.y) / zone.ry;
          if (dx * dx + dy * dy <= 1) { if (last) add(dist(lo.fx, lo.fy, last.fx, last.fy) / NEED, lo); last = lo; } else last = null;
        });
        function up(ev) { if (down === null || (ev && ev.pointerId !== down)) return; down = null; last = null;
          // tik op het hoofd telt ook (director 2026-10-27): 3 tikjes = ogen dicht
          if (ev && ev.type === 'pointerup' && tapAt && Math.hypot(ev.clientX - tapAt.x, ev.clientY - tapAt.y) < 14 && Date.now() - tapAt.t < 600 && !blocked()) { var lo = scene.eventToDog(ev); add(0.34, lo || { fx: zone.x, fy: zone.y }); }
          tapAt = null; try { hit.el.releasePointerCapture(ev.pointerId); } catch (er) { /* ignore */ } }
        hit.el.addEventListener('pointerup', up); hit.el.addEventListener('pointercancel', up); hit.el.addEventListener('lostpointercapture', up);
        aborts.push(function () { down = null; last = null; });
        hit.el.addEventListener('keydown', function (ev) {
          var k = ev.key; if (k !== 'Enter' && k !== ' ' && k.indexOf('Arrow') !== 0) return;
          ev.preventDefault(); if (blocked()) return; ctx.interact(); bump(); add(0.15, { fx: zone.x, fy: zone.y });
        });
        hit.el.addEventListener('keyup', function (ev) { if (ev.key === ' ') ev.preventDefault(); });
      },

      hop: function () {
        // het hele zichtbare bed (plus marge) is een tikvlak boven de hond: ook een tik op de hond-voor-het-bed telt
        var v = bedVis(), mx = 0.03, my = 0.05;
        var hit = addHit({ fx: (v.x0 + v.x1) / 2, fy: (v.y0 + v.y1) / 2, w: v.x1 - v.x0 + 2 * mx, h: v.y1 - v.y0 + 2 * my, label: t('bed.act.hop'), cls: 'act-bed-hit-bed', z: 12 });
        bedTarget(true);
        cleanups.push(function () { removeItem(hit); bedTarget(false); });
        // hand op het vrije (linker) deel van het bed, naast de hond
        armHint('hop', 'tap', { fx: v.x0 + 0.3 * (v.x1 - v.x0), fy: (v.y0 + v.y1) / 2 + 0.02 }); hintArm.big = true; focusIt(hit);
        function hop() {
          if (hit.el.disabled) return;
          hit.el.disabled = true; disarmHint(true); bedTarget(false);
          scene.react('wow'); ctx.sfx('whoosh');   // directe reactie, dan de sprong
          moveDog('bed', { ms: 560, arc: 0.2 }, function () { ctx.sfx('pop'); scene.react('happy'); burstAt(0.5, 0.74, true); stepDone('hop', 380); });
        }
        onTap(hit, hop); assistOn(hop);
      },

      teeth: function () {
        var vis = visRect(), floorFy = Math.min(0.97, vis.y1 - 0.11), tx = Math.max(0.2, vis.x0 + 0.14);
        var tube = addObj('tooth-paste', { fx: tx, fy: floorFy - 0.03, w: 0.2, z: 5, label: t('bed.act.paste') });
        var brush = addObj('tooth-brush', { fx: tx + 0.3, fy: floorFy + 0.02, w: BRUSH.w, z: 6, label: t('bed.act.brush') });
        var pasted = false, finished = false, progress = 0, path = 0, last = null, foam = [], lastBurst = 0;
        var NEED = 1.0; // weg binnen de zone, in canvasbreedtes (circa 5 heen-en-weer-halen; director 2026-10-27 korter, was 2.2)
        var zone = { rx: 0.13, ry: 0.1 };
        cleanups.push(function () { removeItem(tube); removeItem(brush); foam.forEach(removeItem); });
        armHint('paste', 'drag', { fx: brush.fx - BRUSH.w * BRUSH.tipDx, fy: brush.fy }, { fx: tube.fx, fy: tube.fy });
        function mouthCanvas() { return { fx: mouth[0] + dogPos.x, fy: mouth[1] + dogPos.y }; }
        function applyPaste(noMove) {
          if (pasted) return; pasted = true; ctx.sfx('pop');
          var blob = mk('span', 'act-bed-paste'); brush.el.appendChild(blob);
          tube.el.classList.add('is-squeezed'); activeOn(tube, false); activeOn(brush); if (noMove !== true) setPos(brush, tube.fx + 0.03, tube.fy + 0.09);
          disarmHint(true); var m = mouthCanvas(); assistOn(assistTeeth);
          armHint('scrub', 'drag', { fx: brush.fx - BRUSH.w * BRUSH.tipDx, fy: brush.fy }, { fx: m.fx, fy: m.fy });
          if (document.activeElement === tube.el) brush.el.focus();
        }
        function addFoam() {
          var m = mouthCanvas(), n = foam.length;
          if (n >= 9) return;
          var a = n * 2.4, r = 0.035 + (n % 3) * 0.018;
          var f = addObj('zzz', { fx: m.fx + Math.cos(a) * r * 2.2, fy: m.fy + 0.02 + Math.sin(a) * r, w: 0.05 + (n % 3) * 0.012, z: 7, deco: true, minW: 0 });
          f.el.firstChild.src = art.abs(art.fx.bubble); f.el.classList.add('act-bed-foam'); f.el.style.aspectRatio = '1 / 1';
          foam.push(f);
        }
        function addProgress(d, fxy) {
          progress = clamp(progress + d, 0, 1); progressed();
          var want = Math.floor(progress * 9); while (foam.length < want) addFoam();
          ctx.sfx('brush');
          var now = Date.now();
          if (fxy && now - lastBurst > 120) { lastBurst = now; try { scene.burst(fxy.fx, fxy.fy, 'bubbles', false); } catch (e) { /* ignore */ } }
          if (progress >= 1) finishTeeth();
        }
        function finishTeeth() {
          if (finished) return; finished = true;
          var m = mouthCanvas(); burstAt(m.fx, m.fy, true);
          foam.forEach(function (f) { f.el.classList.add('is-pop'); });
          brush.el.classList.add('is-out'); lockItem(brush);
          stepDone('teeth', 600);
        }
        function assistTeeth() {   // eerst tandpasta, daarna poetsen: elke deelhandeling krijgt eigen 3 s
          if (!pasted) { applyPaste(); return; }
          var m = mouthCanvas(); setPos(brush, m.fx + BRUSH.w * BRUSH.tipDx, m.fy); addProgress(1, { fx: mouth[0], fy: mouth[1] });
        }
        activeOn(tube); onTap(tube, function () { applyPaste(); }); focusIt(tube); assistOn(assistTeeth);
        makeDraggable(brush, {
          onStart: function () { last = null; },
          onMove: function (pos, ev, p) {
            setPos(brush, p.fx + BRUSH.w * BRUSH.tipDx, p.fy);
            var lo = scene.eventToDog(ev); if (!lo) return;
            var m = mouth, dx = (lo.fx - m[0]) / zone.rx, dy = (lo.fy - m[1]) / zone.ry;
            var inside = dx * dx + dy * dy <= 1;
            if (inside && !pasted) applyPaste(true);
            if (inside) { if (last) { var d = dist(lo.fx, lo.fy, last.fx, last.fy); path += d; addProgress(d / NEED, lo); } last = lo; } else last = null;
          },
          onEnd: function () {
            if (!pasted) {
              var tip = { fx: brush.fx - BRUSH.w * BRUSH.tipDx, fy: brush.fy };
              if (dist(tip.fx, tip.fy, tube.fx, tube.fy) < 0.11) applyPaste();
            }
          },
          onActivate: function () { keyScrub(); }, onKey: function () { keyScrub(); }
        });
        function keyScrub() {
          if (!pasted) { applyPaste(); return; }
          var m = mouthCanvas();
          setPos(brush, m.fx + BRUSH.w * BRUSH.tipDx + (progress * 10 % 2 < 1 ? 0.02 : -0.02), m.fy);
          addProgress(0.1, { fx: mouth[0], fy: mouth[1] });
        }
      },

      story: function () {
        var vis = visRect();
        var book = addObj('book', { fx: 0.5, fy: 0.8, w: 0.36, z: 6, label: t('bed.act.book') });
        var card = mk('div', 'act-bed-card'), cim = mk('img'); cim.alt = ''; cim.draggable = false; card.appendChild(cim);
        var dots = mk('div', 'act-bed-dots'); BOOK_PAGES.forEach(function () { dots.appendChild(mk('span')); }); card.appendChild(dots);
        card.setAttribute('aria-hidden', 'true'); card.hidden = true; root.appendChild(card); card.style.zIndex = '7';
        var cardIt = { el: card, fx: Math.min(0.8, vis.x1 - 0.17), fy: 0.3, w: 0.26, h: 0.26, minW: 90 };
        items.push(cardIt); placeItem(cardIt);
        var page = 0, down = null;
        cleanups.push(function () { removeItem(book); removeItem(cardIt); });
        activeOn(book); armHint('story', 'tap', { fx: 0.5, fy: 0.8 }); focusIt(book);
        assistOn(function storyAssist() { turn(); if (page < BOOK_PAGES.length) assistOn(storyAssist); });   // per pagina
        function turn() {
          if (page >= BOOK_PAGES.length) return;
          var key = BOOK_PAGES[page]; page++;
          cim.src = art.abs(art.props[key]); card.hidden = false;
          Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('is-on', i < page); });
          card.classList.remove('is-flip'); void card.offsetWidth; card.classList.add('is-flip');
          book.el.classList.remove('is-bump'); void book.el.offsetWidth; book.el.classList.add('is-bump');
          ctx.sfx('pop'); disarmHint(true); say(t('bed.page', { n: page, total: BOOK_PAGES.length })); progressed();
          if (page >= BOOK_PAGES.length) { book.el.disabled = true; lockItem(book); stepDone('story', 900); }
        }
        book.el.addEventListener('pointerdown', function (ev) {
          if (blocked()) return; ctx.interact(); bump();
          down = { id: ev.pointerId, x: ev.clientX, y: ev.clientY }; try { book.el.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
          ev.preventDefault();
        });
        book.el.addEventListener('pointermove', function (ev) { if (down) ctx.interact(); });
        book.el.addEventListener('pointerup', function (ev) {
          if (!down || ev.pointerId !== down.id) return; down = null;
          try { book.el.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
          if (!blocked()) turn();
        });
        book.el.addEventListener('pointercancel', function () { down = null; });
        book.el.addEventListener('lostpointercapture', function () { down = null; });
        book.el.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault(); if (blocked()) return; ctx.interact(); bump(); turn();
        });
        book.el.addEventListener('keyup', function (e) { if (e.key === ' ') e.preventDefault(); });
        aborts.push(function () { down = null; });
      },

      teddy: function () {
        var st = TEDDY.start, tg = TEDDY.target;
        var it = addObj('teddy', { fx: st.fx, fy: st.fy, w: TEDDY.w, z: 9, label: t('bed.act.teddy') });
        var zoneEl = addObj('star', { fx: tg.fx, fy: tg.fy, w: 0.1, z: 2, deco: true, cls: 'act-bed-target' });
        zoneEl.el.firstChild.src = art.abs(art.fx.sparkle);
        cleanups.push(function () { removeItem(zoneEl); });
        teddyItem = it;
        activeOn(it); armHint('teddy', 'drag', { fx: st.fx, fy: st.fy }, { fx: tg.fx, fy: tg.fy }); focusIt(it);
        function place() {
          if (it.placed) return; it.placed = true;
          disarmHint(true); setPos(it, tg.fx, tg.fy); lockItem(it); ctx.sfx('pop'); burstAt(tg.fx, tg.fy - 0.05, false);
          it.el.classList.add('is-placed'); stepDone('teddy', 480);
        }
        assistOn(place);
        makeDraggable(it, {
          onStart: function () { bump(); },
          onMove: function (pos) { setPos(it, clamp(pos.fx, 0.05, 0.95), clamp(pos.fy, 0.15, 0.95)); },
          onEnd: function () { if (dist(it.fx, it.fy, tg.fx, tg.fy) < 0.17) place(); },
          onActivate: place,
          onKey: function (dir) {
            var d = 0.07; setPos(it, clamp(it.fx + (dir === 'left' ? -d : dir === 'right' ? d : 0), 0.05, 0.95), clamp(it.fy + (dir === 'up' ? -d : dir === 'down' ? d : 0), 0.15, 0.95));
            if (dist(it.fx, it.fy, tg.fx, tg.fy) < 0.17) place();
          }
        });
      },

      stars: function () {
        var vis = visRect(), W = vis.x1 - vis.x0, bandTop = vis.y0 + 0.06, bandBot = Math.min(0.02, vis.y0 + 0.5), bh = bandBot - bandTop;
        var kinds = ['star', 'firefly', 'moon', 'firefly', 'star'], spots;
        if (bh >= 0.13) spots = [[vis.x0 + 0.2 * W, bandTop + 0.5 * bh], [vis.x0 + 0.5 * W, bandTop + 0.05 * bh], [vis.x0 + 0.8 * W, bandTop + 0.55 * bh], [vis.x0 + 0.07, 0.28], [vis.x1 - 0.07, 0.28]];
        else spots = [[vis.x0 + 0.07, 0.0], [vis.x1 - 0.07, 0.02], [vis.x0 + 0.07, 0.24], [vis.x1 - 0.07, 0.26], [vis.x0 + 0.07, 0.48]];
        spots = spots.map(function (q) { return [clamp(q[0], vis.x0 + 0.08, vis.x1 - 0.08), clamp(q[1], vis.y0 + 0.08, vis.y1 - 0.22)]; });
        var lit = 0, list = [];
        spots.forEach(function (s, i) {
          var k = kinds[i], w = k === 'firefly' ? 0.12 : k === 'moon' ? 0.14 : 0.13;
          var it = addObj(k, { fx: s[0], fy: s[1], w: w, z: 5, label: t('bed.act.star'), cls: 'is-dim' });
          list.push(it);
          onTap(it, function () { light(it); });
        });
        function light(it) {
            if (it.on) return; it.on = true; lit++; progressed(); it.el.classList.remove('is-dim'); it.el.classList.add('is-lit'); lockItem(it);
            ctx.sfx('pop'); burstAt(it.fx, it.fy, false); disarmHint(true); scene.react('wow');
            if (lit >= list.length) stepDone('stars', 600); else { armHint('stars', 'tap', nextDim()); focusIt(list.filter(function (x) { return !x.on; })[0]); }
        }
        function nextDim() { var d = list.filter(function (x) { return !x.on; })[0]; return d ? { fx: d.fx, fy: d.fy } : { fx: 0.5, fy: 0.1 }; }
        starItems = list; // blijven branden tot het slottableau
        armHint('stars', 'tap', nextDim()); focusIt(list[0]);
        assistOn(function () { list.filter(function (x) { return !x.on; }).forEach(function (x, i) { after(i * 160, function () { light(x); }); }); });
      },

      blanket: function () {
        var startFy = Math.min(BLANKET.startFy, visRect().y1 - 0.1), targetFy = BLANKET.targetFy, prog = 0;
        var it = addObj('blanket', { fx: 0.5, fy: startFy, w: BLANKET.w, z: 6, label: t('bed.act.blanket') });
        activeOn(it); armHint('blanket', 'drag', { fx: 0.5, fy: startFy }, { fx: 0.5, fy: targetFy }); focusIt(it);
        var isCovered = false;
        function setProg(p) { var np = clamp(p, 0, 1); if (np > prog + 0.05) progressed(); prog = np; setPos(it, 0.5, startFy + (targetFy - startFy) * prog); }
        function covered() {
          if (isCovered) return; isCovered = true;
          setProg(1); disarmHint(true); lockItem(it); ctx.sfx('whoosh'); scene.react('wow');
          it.el.classList.add('is-on-dog'); tuck();
        }
        makeDraggable(it, {
          onStart: function () { bump(); },
          onMove: function (pos) { setProg((startFy - pos.fy) / (startFy - targetFy)); },
          onEnd: function () { if (prog >= 0.78) covered(); },
          onKey: function (dir) { if (dir === 'up' || dir === 'right') { setProg(prog + 0.34); if (prog >= 0.99) covered(); } else setProg(prog - 0.34); },
          onActivate: function () { setProg(prog + 0.5); if (prog >= 0.99) covered(); }
        });
        assistOn(covered);
        function tuck() {
          var left = 0.2, right = 0.8, n = 0, hits = [];
          [left, right].forEach(function (fx) {
            var h = addHit({ fx: fx, fy: targetFy + 0.01, w: 0.2, h: 0.2, label: t('bed.act.tuck'), cls: 'act-bed-spark', icon: art.abs(art.fx.sparkle), z: 8 });
            h.fxT = fx; hits.push(h);
            h.tuck = function () {
              if (h.done) return; h.done = true;
              ctx.sfx('pop'); burstAt(fx, targetFy, false); n++; removeItem(h); scene.react('happy'); progressed();
              it.el.classList.remove('is-tuck'); void it.el.offsetWidth; it.el.classList.add('is-tuck');
              hits = hits.filter(function (x) { return x !== h; });
              if (n >= 2) stepDone('blanket', 420); else { armHint('tuck', 'tap', { fx: hits[0].fxT, fy: targetFy + 0.01 }); focusIt(hits[0]); }
            };
            onTap(h, h.tuck);
          });
          assistOn(function () { hits.slice().forEach(function (h, i) { after(i * 200, h.tuck); }); });
          cleanups.push(function () { hits.forEach(removeItem); });
          armHint('tuck', 'tap', { fx: left, fy: targetFy + 0.01 });
          focusIt(hits[0]);
        }
        cleanups.push(function () { /* deken blijft staan tot het slottableau */ });
      },

      lamp: function () {
        var vis = visRect(), onRight = N !== 3, fx = onRight ? Math.min(0.88, vis.x1 - 0.09) : Math.max(0.12, vis.x0 + 0.09);
        var it = addObj('lamp', { fx: fx, fy: Math.min(0.97, vis.y1 - 0.13), w: LAMP_W, z: 5, label: t('bed.act.lamp'), cls: 'act-bed-lamp-on' });
        lampItem = it;
        activeOn(it); armHint('lamp', 'tap', { fx: it.fx, fy: it.fy - 0.03 }); focusIt(it);
        function lampOff() { if (finalStarted) return; if (ctx.step) ctx.step('lamp', 'complete'); disarmHint(true); finalSeq(it); }
        onTap(it, lampOff); assistOn(lampOff);
      }
    };

    /* ---------- slot: lamp uit, slaappose, tableau ---------- */
    function addDogProp(key, fx, fy, w, z, cls) {
      var el = scene.addProp(key, { layer: 'dog', fx: fx, fy: fy, w: w, z: z, id: 'bed-' + key });
      el.classList.add('act-bed-prop'); if (cls) cls.split(' ').forEach(function (c) { el.classList.add(c); });
      props.push(el); return el;
    }
    function dim(on) { if (dimEl) dimEl.classList.toggle('is-on', !!on); }
    function finalSeq(lamp) {
      if (finalStarted) return; finalStarted = true; busy = true; assistOff();
      cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      disarmHint(true); updateRail();
      ctx.setProgress(0.95);
      if (lamp && lamp.el) lamp.el.classList.add('is-off');
      ctx.sfx('click'); ctx.sfx('lights-out'); dim(true);
      after(ctx.reduced ? 0 : 280, function () {
        // onder de dimmer: alles wisselt naar het slottableau (scene-props blijven staan voor het eindscherm)
        anims.splice(0).forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
        dogAt = 'sleep'; dogPos = POS.sleep; applyDog(POS.sleep);
        scene.setBackground('bed-night-' + N, 0);
        scene.setPose('sleep', true);
        var lampFx = lampItem ? lampItem.fx : 0.9, lampFy = lampItem ? lampItem.fy : 0.9;
        if (bedBack && bedBack.parentNode) bedBack.parentNode.removeChild(bedBack); bedBack = null;
        if (bedFront && bedFront.parentNode) bedFront.parentNode.removeChild(bedFront); bedFront = null;
        items.slice().forEach(function (it) { removeItem(it); });
        hideHint();
        if (eyesEl) { try { scene.removeProp(eyesEl); } catch (er) { /* ignore */ } eyesEl = null; }
        addDogProp('dog-bed', 0.5, 0.58, 1, 1, 'act-bed-bed');
        addDogProp('dog-bed', 0.5, 0.58, 1, 10, 'act-bed-bed act-bed-bedfront');
        addDogProp('lamp', lampFx, lampFy, LAMP_W, 6, 'act-bed-lamp-off');
        var b = BLANKET.sleep; var bl = addDogProp('blanket', b.fx, b.fy, b.w, 8, 'act-bed-blanket-sleep'); bl.style.setProperty('--rot', (b.rot || 0) + 'deg');
        if (teddyItem) addDogProp('teddy', TEDDY.sleep.fx, TEDDY.sleep.fy, TEDDY.w, 9, 'act-bed-teddy-sleep');
        starItems.forEach(function (it) { var el = addDogProp(it.key, it.fx, it.fy, it.w, 4, 'act-bed-star-lit'); if (!el) return; });
        addDogProp('zzz', 0.62, 0.34, 0.16, 14, 'act-bed-zzz');
        scene.react('sleepy'); ctx.sfx('tick'); dim(false);
        say(t('bed.live.asleep'));
        after(ctx.reduced ? 120 : 760, function () {
          if (completed) return; completed = true; busy = false;
          ctx.complete({ verdict: evalRes ? evalRes.verdict : 'okay', outfit: outfit });
        });
      });
    }

    /* ---------- begin / levenscyclus ---------- */
    function beginRitual() {
      if (picker) { try { picker.destroy(); } catch (e) { console.error(e); } picker = null; }
      ctx.panel.textContent = '';
      buildRail();
      ctx.setProgress(0.15);
      scene.setOutfit(outfit || story.emptyOutfit());
      relayout();
      nextStep();
    }
    function start() {
      if (started || destroyed) return; started = true;
      root = mk('div', 'act-bed act-bed-root'); ctx.overlay.appendChild(root);
      dimEl = mk('div', 'act-bed-dim'); dimEl.setAttribute('aria-hidden', 'true'); root.appendChild(dimEl);
      liveEl = mk('div', 'act-bed-sr', { 'aria-live': 'polite' }); root.appendChild(liveEl);
      root.addEventListener('pointerdown', function () { if (!destroyed) ctx.interact(); }, true);
      root.addEventListener('keydown', function () { if (!destroyed) ctx.interact(); }, true);
      document.addEventListener('ws-scene-layout', onLayout);
      document.addEventListener('keydown', onDocKey, true); document.addEventListener('pointerdown', onDocPointer, true);
      scene.setBackground('bed-' + N, 0);
      fit();
      bedBack = bedEl(false);
      document.addEventListener('pointerdown', onStagePointer, true);
      var pyj = level.pyjama || (story.PYJAMA && story.PYJAMA[dogId]);
      var P = WS.dressPicker;
      if (P && P.create) {
        picker = P.create(ctx, { kind: 'bed', cfg: pyj, onConfirm: function (o, ev) { outfit = story.normalizeOutfit(o); evalRes = ev; if (ctx.step) ctx.step('pyjama', 'complete'); beginRitual(); } });
        picker.start(); if (ctx.step) ctx.step('pyjama', 'start');
      } else {
        console.error('WS.dressPicker ontbreekt');
        outfit = story.emptyOutfit(); evalRes = story.evaluateOutfit('bed', outfit); beginRitual();
      }
    }
    function pause() {
      paused = true;
      if (picker) picker.pause();
      aborts.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      anims.forEach(function (a) { try { a.pause(); } catch (e) { /* ignore */ } });
      if (root) root.classList.add('is-paused');
    }
    function resume() {
      paused = false;
      if (picker) picker.resume();
      anims.forEach(function (a) { try { a.play(); } catch (e) { /* ignore */ } });
      if (root) root.classList.remove('is-paused');
    }
    function destroy() {
      if (destroyed) return; destroyed = true; assistOff();
      document.removeEventListener('ws-scene-layout', onLayout);
      document.removeEventListener('keydown', onDocKey, true); document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('pointerdown', onStagePointer, true);
      if (hintTimer !== null) { ctx.cancel(hintTimer); hintTimer = null; }
      anims.splice(0).forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
      if (picker) { try { picker.destroy(); } catch (e) { /* ignore */ } picker = null; }
      aborts.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      try { if (scene.dogEl) scene.dogEl.style.transform = ''; } catch (e) { /* ignore */ }
      if (!completed) {
        props.forEach(function (p) { try { scene.removeProp(p); } catch (e) { /* ignore */ } });
        try { scene.placeDog(null); } catch (e) { /* ignore */ }
      }
      props = []; items = [];
      if (railEl && railEl.parentNode) railEl.parentNode.removeChild(railEl);
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = railEl = hintEl = dimEl = liveEl = bedBack = bedFront = null;
    }
    return { start: start, pause: pause, resume: resume, destroy: destroy };
  }

  WS.activities.bed = { create: create };
})();
