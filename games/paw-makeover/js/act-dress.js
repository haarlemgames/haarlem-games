/* act-dress: WS.dressPicker (herbruikbaar: dress-levels 2/7/12 en pyjamakeuze in bed-levels) + WS.activities.dress.
   Picker-API: WS.dressPicker.create(ctx, { kind:'birthday'|'camp'|'beach'|'bed', cfg:{cats, items}, onConfirm(outfit, evaluation), onChange?(outfit) })
   -> { start, pause, resume, destroy, getOutfit }. De picker roept NOOIT ctx.complete aan; de host doet dat in onConfirm.
   Beoordeling (badges, hondreactie) verschijnt uitsluitend na bevestigen. Geen sterren/scores/doelmarkering. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  var story = WS.story, art = WS.art;
  var CONFIRM_DELAY = 2000, AUTO_MS = 2800, QUICK_MS = 1500;   // outfit-show blijft 2 s staan en gaat dan vanzelf door (AUTO_MS/QUICK_MS alleen voor opts.quick, standaard uit)
  var CAT_ICON = { head: 'assets/dress/dress-cat-head.svg', face: 'assets/dress/dress-cat-face.svg', neck: 'assets/dress/dress-cat-neck.svg', body: 'assets/dress/dress-cat-body.svg' };
  var BADGE = { fit: 'assets/dress/dress-badge-fit.svg', ok: 'assets/dress/dress-badge-ok.svg', off: 'assets/dress/dress-badge-off.svg' };

  function mk(tag, cls, attrs) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function icon(src, cls) { var i = mk('img', cls, { alt: '', draggable: 'false' }); i.src = art.abs(src); return i; }

  function create(ctx, opts) {
    opts = opts || {};
    var kind = opts.kind || 'birthday', cfg = opts.cfg || { cats: [], items: {} };
    var scene = ctx.scene, t = ctx.t;
    var cats = (cfg.cats || []).filter(function (s) { return story.SLOTS.indexOf(s) >= 0 && cfg.items && cfg.items[s] && cfg.items[s].length; });
    var outfit = story.emptyOutfit();
    var active = 0, locked = false, destroyed = false, started = false, paused = false;
    var root, tabsEl, tabEls = [], cardsEl, barEl, removeBtn, confirmBtn, cardEls = [];
    var idleWrap = null, idleEyes = null;

    // One parent moves the original dog and every clothing layer together.
    // Keep reactions on scene.body and outfit-show animations on dogEl independent.
    function idleState() {
      if (idleWrap) idleWrap.classList.toggle('is-paused', paused || document.hidden);
    }
    function stopIdle() {
      document.removeEventListener('visibilitychange', idleState);
      if (idleEyes) idleEyes.remove();
      idleEyes = null;
      if (idleWrap) {
        if (idleWrap.parentNode && scene.body && scene.body.parentNode === idleWrap) {
          idleWrap.parentNode.insertBefore(scene.body, idleWrap);
        }
        idleWrap.remove(); idleWrap = null;
      }
    }
    function startIdle() {
      if (idleWrap || !scene.body || !scene.body.parentNode) return;
      idleWrap = mk('div', 'act-dress-idle');
      scene.body.parentNode.insertBefore(idleWrap, scene.body);
      idleWrap.appendChild(scene.body);
      var dog = ctx.dog, d = art.dogs[dog] || {};
      var src = scene.isFrontPose ? 'assets/dog/front-eyes-closed/' + dog + '.webp' : d.eyesClosed;
      if (src) {
        idleEyes = mk('img', 'layer act-dress-idle-eyes', { alt: '', 'aria-hidden': 'true', draggable: 'false' });
        var eyes = idleEyes;
        eyes.addEventListener('load', function () { if (eyes === idleEyes) eyes.classList.add('is-ready'); });
        eyes.addEventListener('error', function () { eyes.remove(); });
        eyes.src = art.abs(src);
        scene.body.appendChild(eyes);
      }
      document.addEventListener('visibilitychange', idleState);
      idleState();
    }

    function itemsOf(slot) { return (cfg.items[slot] || []).filter(function (id) { return art.items[id] && art.items[id].cat === slot; }); }
    function filled() { return story.outfitIds(outfit).length; }
    var visited = {};
    function complete() { return filled() >= 1 && cats.every(function (c) { return visited[c]; }); }   // klaar-knop pas actief als elke categorie bekeken is (item kiezen hoeft niet) en er minstens 1 item is
    function blocked() { return locked || destroyed || paused || (ctx.isPaused && ctx.isPaused()); }

    /* ---------- opbouw ---------- */
    function build() {
      root = mk('div', 'act-dress');
      root.setAttribute('data-kind', kind);
      tabsEl = mk('div', 'act-dress-tabs', { role: 'tablist', 'aria-label': t('dress.tabs') });
      cats.forEach(function (slot, i) {
        var b = mk('button', 'act-dress-tab', { type: 'button', role: 'tab', 'aria-label': t('dress.cat.' + slot), 'data-slot': slot, id: 'act-dress-tab-' + slot });
        b.appendChild(icon(CAT_ICON[slot], 'act-dress-tab-img'));
        b.appendChild(mk('span', 'act-dress-dot'));
        b.addEventListener('click', function () { if (blocked()) return; ctx.interact(); ctx.sfx('click'); showCat(i, false); });
        b.addEventListener('keydown', function (e) { tabKey(e, i); });
        tabEls.push(b); tabsEl.appendChild(b);
      });
      cardsEl = mk('div', 'act-dress-cards', { role: 'group' });
      barEl = mk('div', 'act-dress-bar');
      removeBtn = mk('button', 'act-dress-remove', { type: 'button' });
      removeBtn.appendChild(icon('assets/icons/remove.svg', 'act-dress-btn-img'));
      removeBtn.addEventListener('click', function () { if (mode === 'result') { again(); return; } if (blocked()) return; ctx.interact(); removeActive(); });
      confirmBtn = mk('button', 'act-dress-confirm', { type: 'button', 'aria-label': t('dress.confirm') });
      confirmBtn.appendChild(icon('assets/icons/check.svg', 'act-dress-btn-img'));
      confirmBtn.addEventListener('click', function () { if (mode === 'result') { if (!destroyed && !locked) finish(); return; } confirm(); });
      barEl.appendChild(removeBtn); barEl.appendChild(confirmBtn);
      root.appendChild(tabsEl); root.appendChild(cardsEl); root.appendChild(barEl);
      root.addEventListener('pointerdown', function () { if (!locked && !destroyed) ctx.interact(); });
      root.addEventListener('keydown', function () { if (!locked && !destroyed) ctx.interact(); });
      ctx.panel.appendChild(root);
      if (!ctx.hintSeen('dress-pick')) cardsEl.classList.add('is-hint');
    }

    function tabKey(e, i) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d || blocked()) return;
      e.preventDefault();
      var n = (i + d + cats.length) % cats.length;
      showCat(n, true);
    }
    function cardKey(e, i) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d || blocked()) return;
      e.preventDefault();
      var n = (i + d + cardEls.length) % cardEls.length;
      cardEls[n].focus();
    }

    function showCat(i, focusTab) {
      active = i;
      var slot = cats[i], ids = itemsOf(slot);
      visited[slot] = true;
      tabEls.forEach(function (b, k) { var on = k === i; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; b.classList.toggle('is-active', on); });
      if (focusTab) tabEls[i].focus();
      cardsEl.textContent = ''; cardEls = [];
      cardsEl.setAttribute('aria-labelledby', 'act-dress-tab-' + slot);
      cardsEl.style.setProperty('--n', String(Math.max(1, ids.length)));
      ids.forEach(function (id, k) {
        var c = mk('button', 'act-dress-card', { type: 'button', 'aria-label': t('item.' + id), 'data-item': id });
        c.appendChild(icon(art.items[id].icon, 'act-dress-card-img'));
        c.addEventListener('click', function () { if (blocked()) return; ctx.interact(); pick(slot, id); });
        c.addEventListener('keydown', function (e) { cardKey(e, k); });
        cardEls.push(c); cardsEl.appendChild(c);
      });
      refresh();
    }

    function refresh() {
      var slot = cats[active];
      cardEls.forEach(function (c) { var on = outfit[slot] === c.getAttribute('data-item'); c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      tabEls.forEach(function (b, k) { b.classList.toggle('has-item', !!outfit[cats[k]]); });
      removeBtn.disabled = !outfit[slot] || locked;
      removeBtn.setAttribute('aria-label', t('dress.removeCat', { cat: t('dress.cat.' + slot) }));
      var n = filled();
      confirmBtn.disabled = !complete() || locked;
      if (autoMode && !destroyed) { if (autoT !== null) { ctx.cancel(autoT); autoT = null; } if (complete() && !locked && mode === 'pick') autoT = ctx.schedule(function () { autoT = null; if (!blocked() && mode === 'pick' && complete()) confirm(); }, AUTO_MS); }
      confirmBtn.classList.toggle('is-ready', complete() && !locked && !ctx.hintSeen('dress-confirm'));
    }

    /* ---------- keuzes ---------- */
    function apply(isNew) {
      scene.setOutfit(outfit, true);
      if (isNew) scene.react('wow');
      if (opts.onChange) { try { opts.onChange(story.normalizeOutfit(outfit)); } catch (e) { console.error(e); } }
      refresh();
    }
    function pick(slot, id) {
      if (outfit[slot] === id) { outfit[slot] = null; ctx.sfx('click'); apply(false); return; }
      outfit[slot] = id;
      ctx.sfx('hit');
      if (cardsEl.classList.contains('is-hint')) { cardsEl.classList.remove('is-hint'); ctx.markHint('dress-pick'); }
      apply(true);
    }
    function removeActive() {
      var slot = cats[active];
      if (!outfit[slot]) return;
      outfit[slot] = null; ctx.sfx('click'); apply(false);
      if (document.activeElement === removeBtn) tabEls[active].focus(); // knop is nu uitgeschakeld
    }

    /* ---------- bevestigen en beoordeling ---------- */
    var seq = [], fxEl = null, mode = 'pick', finished = false, autoT = null, autoMode = opts.quick === true;   // automatisch bevestigen is uit: de speler drukt zelf op klaar
    function sched(fn, ms) {
      var id = ctx.schedule(function () { seq = seq.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms);
      seq.push(id); return id;
    }
    function clearSeq() { seq.forEach(function (id) { ctx.cancel(id); }); seq = []; }
    function dogAnim(name, ms) {
      var d = scene.dogEl; if (!d) return;
      d.classList.remove('act-dress-hop', 'act-dress-wag', 'act-dress-nod', 'act-dress-oops'); void d.offsetWidth;
      d.classList.add('act-dress-' + name);
      sched(function () { d.classList.remove('act-dress-' + name); }, ms);
    }
    function anchorOf(slot) {
      var a = art.anchors && art.anchors[ctx.dog]; if (!a) return { fx: .5, fy: .35 };
      if (slot === 'head' && a.hat) return { fx: a.hat.x / 800, fy: (a.hat.y - 30) / 800 };
      if (slot === 'face' && a.eyes) return { fx: (a.eyes.l[0] + a.eyes.r[0]) / 1600, fy: (a.eyes.l[1] + a.eyes.r[1]) / 1600 };
      if (slot === 'neck' && a.collar) return { fx: a.collar.pts[1][0] / 800, fy: a.collar.pts[1][1] / 800 };
      if (slot === 'body' && a.torso) { var x = 0, y = 0; a.torso.forEach(function (p) { x += p[0]; y += p[1]; }); return { fx: x / a.torso.length / 800, fy: y / a.torso.length / 800 }; }
      return { fx: .5, fy: .4 };
    }
    function floaters(src, n, at, cls) {
      if (!fxEl) return;
      var p = scene.dogToStage(at.fx, at.fy);
      for (var i = 0; i < n; i++) {
        var im = icon(src, 'act-dress-float ' + (cls || ''));
        im.style.left = (p.u * 100 + (i - (n - 1) / 2) * 6) + '%'; im.style.top = (p.v * 100 - (i % 2) * 4) + '%';
        im.style.setProperty('--d', (i * 110) + 'ms'); im.style.setProperty('--dx', ((i % 2 ? 1 : -1) * (6 + i * 2)) + 'px');
        fxEl.appendChild(im);
      }
    }
    function verdictShow(v) {
      var head = anchorOf('head'), mid = { fx: .5, fy: .4 };
      if (v === 'great') {
        dogAnim('hop', 1200); scene.react('happy'); floaters('assets/dress/dress-heart.svg', 7, head); scene.burst(.5, .3, 'sparkle', true);
        if (!ctx.reduced) scene.celebrate(scene.stage);
        ctx.sfx('complete'); sched(function () { ctx.sfx('win'); }, 220);
      } else if (v === 'good') {
        dogAnim('wag', 1100); scene.burst(head.fx, head.fy, 'sparkle', true); sched(function () { scene.burst(.62, .45, 'sparkle', true); }, 350);
        ctx.sfx('hit'); sched(function () { ctx.sfx('hit'); }, 140);
      } else if (v === 'okay') {
        dogAnim('nod', 1000); ctx.sfx('click');
      } else {
        dogAnim('oops', 900); scene.react('oops'); floaters('assets/dress/dress-oops.svg', 1, head, 'is-oops'); ctx.sfx('miss');
      }
    }
    function confirm() {
      if (mode === 'result') { finish(); return; }
      if (blocked() || !complete()) return;
      ctx.interact(); locked = true; mode = 'result';
      stopIdle();
      ctx.markHint('dress-confirm');
      var final = story.normalizeOutfit(outfit);
      var ev = story.evaluateOutfit(kind, final);
      ctx.setOutfit(kind === 'bed' ? 'pyjama' : 'party', final);
      if (ctx.log) ctx.log('dress-confirm', { kind: kind, outfit: final, verdict: ev.verdict });
      last = { outfit: final, ev: ev };
      if (autoMode) {   // korte blije hond, geen beoordeling en geen knoppen: meteen verder
        if (autoT !== null) { ctx.cancel(autoT); autoT = null; }
        root.classList.add('is-quick'); tabEls.forEach(function (b) { b.disabled = true; });
        if (ctx.overlay) { fxEl = mk('div', 'act-dress-fx'); fxEl.setAttribute('aria-hidden', 'true'); ctx.overlay.appendChild(fxEl); }
        verdictShow('great');
        sched(function () { finish(); }, QUICK_MS);
        return;
      }
      showResult(final, ev);
      if (!opts.allowRetry) sched(function () { finish(); }, opts.confirmDelay || CONFIRM_DELAY);
    }
    function finish() {
      if (finished || destroyed || !last) return;
      finished = true; ctx.interact(); clearSeq();
      confirmBtn.disabled = true; removeBtn.disabled = true;
      opts.onConfirm && opts.onConfirm(last.outfit, last.ev);
    }
    var last = null;

    function setBarMode(m) {
      var isRes = m === 'result';
      removeBtn.querySelector('img').src = art.abs(isRes ? 'assets/icons/retry.svg' : 'assets/icons/remove.svg');
      confirmBtn.querySelector('img').src = art.abs(isRes ? 'assets/icons/next.svg' : 'assets/icons/check.svg');
      confirmBtn.setAttribute('aria-label', t(isRes ? 'dress.next' : 'dress.confirm'));
      removeBtn.classList.toggle('is-again', isRes);
    }
    function clearShow() {
      clearSeq();
      if (fxEl && fxEl.parentNode) fxEl.parentNode.removeChild(fxEl); fxEl = null;
      if (scene.dogEl) scene.dogEl.classList.remove('act-dress-hop', 'act-dress-wag', 'act-dress-nod', 'act-dress-oops');
    }

    function showResult(final, ev) {
      root.classList.add('is-result'); setBarMode('result');
      tabEls.forEach(function (b) { b.disabled = true; });
      cardsEl.classList.remove('is-hint'); cardsEl.textContent = ''; cardsEl.removeAttribute('aria-labelledby');
      cardsEl.setAttribute('aria-label', t('dress.result.group'));
      cardsEl.classList.add('is-result'); cardsEl.setAttribute('role', 'list');
      cardsEl.style.setProperty('--n', String(Math.max(1, filled())));
      removeBtn.disabled = true; confirmBtn.disabled = true; confirmBtn.classList.remove('is-ready');
      removeBtn.setAttribute('aria-label', t('dress.again'));
      if (ctx.overlay) { fxEl = mk('div', 'act-dress-fx'); fxEl.setAttribute('aria-hidden', 'true'); ctx.overlay.appendChild(fxEl); }
      if (fxEl && !ctx.reduced) fxEl.appendChild(mk('div', 'act-dress-flash'));
      var i = 0, cards = [];
      story.SLOTS.forEach(function (slot) {
        var id = final[slot]; if (!id) return;
        var mood = ev.perItem[id] || 'off';
        var c = mk('div', 'act-dress-card is-final', { role: 'listitem', 'aria-label': t('dress.result', { item: t('item.' + id), mood: t('dress.badge.' + mood) }), 'data-item': id, 'data-mood': mood });
        c.appendChild(icon(art.items[id].icon, 'act-dress-card-img'));
        cardsEl.appendChild(c); cards.push([c, slot, id, mood]);
      });
      verdictShow(ev.verdict);
      cards.forEach(function (x, k) {
        sched(function () {
          var bd = icon(BADGE[x[3]], 'act-dress-badge'); x[0].appendChild(bd);
          var n = scene.body && scene.body.querySelector('.item-front.slot-' + x[1]);
          if (n) { n.classList.remove('just-on'); void n.offsetWidth; n.classList.add('just-on'); sched(function () { n.classList.remove('just-on'); }, 320); }
          var a = anchorOf(x[1]); scene.burst(a.fx, a.fy, 'sparkle', false);
          ctx.sfx('click');
        }, 300 + k * 320);
      });
      var live = mk('span', 'sr-only', { 'aria-live': 'polite' }); live.textContent = t('dress.done'); root.appendChild(live);
      if (opts.allowRetry) sched(function () {
        removeBtn.disabled = false; confirmBtn.disabled = false; locked = false;
        confirmBtn.classList.add('is-ready'); try { confirmBtn.focus({ preventScroll: true }); } catch (e) { /* */ }
      }, 300 + cards.length * 320 + 450);
    }

    function again() { // terug naar kiezen met de huidige outfit; geen complete
      if (mode !== 'result' || destroyed || finished || (ctx.isPaused && ctx.isPaused()) || locked) return;
      ctx.interact(); ctx.sfx('click');
      clearShow(); mode = 'pick'; last = null;
      startIdle();
      root.classList.remove('is-result'); setBarMode('pick');
      Array.prototype.forEach.call(root.querySelectorAll('.sr-only'), function (n) { n.remove(); });
      cardsEl.classList.remove('is-result'); cardsEl.setAttribute('role', 'group'); cardsEl.removeAttribute('aria-label');
      tabEls.forEach(function (b) { b.disabled = false; });
      showCat(active, false);
      try { tabEls[active].focus({ preventScroll: true }); } catch (e) { /* */ }
    }

    /* ---------- levenscyclus ---------- */
    function start() {
      if (started || destroyed) return; started = true;
      build();
      scene.setOutfit(story.emptyOutfit());
      startIdle();
      showCat(0, false);
    }
    function pause() { paused = true; idleState(); if (root) root.classList.add('is-paused'); }
    function resume() { paused = false; idleState(); if (root) root.classList.remove('is-paused'); }
    function destroy() {
      if (destroyed) return; destroyed = true;
      clearShow();
      stopIdle();
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null; tabEls = []; cardEls = [];
    }
    return { start: start, pause: pause, resume: resume, destroy: destroy, getOutfit: function () { return story.normalizeOutfit(outfit); } };
  }

  WS.dressPicker = { create: create };

  WS.activities = WS.activities || {};
  WS.activities.dress = {
    create: function (ctx) {
      var level = ctx.level, picker, best = 0, n = (level.cfg.cats || []).length || 1;
      picker = create(ctx, {
        kind: level.themeKind, cfg: level.cfg,
        onChange: function (o) {
          var f = story.outfitIds(o).length; var k = Math.min(f, n);
          if (k > best) { best = k; ctx.setProgress(0.9 * best / n); }
        },
        allowRetry: false, confirmDelay: 2000,
        onConfirm: function (outfit, ev) { ctx.complete({ verdict: ev.verdict, outfit: outfit }); }
      });
      return picker;
    }
  };
})();
