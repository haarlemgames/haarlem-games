/* Invoer voor Verzorgen (wissen, wassen, borstelen). Twee delen:
   1) Pure wiskunde (geen DOM): raster-coverage per plek, zone-treffer, haal-criterium. Unit-testbaar in Node.
   2) attach(): Pointer Events op #spots (muis en touch, één codepad), tik/Enter/Space-alternatief.
   Alle coordinaten in de wiskunde zijn fracties (0..1) van het hondcanvas. Spelregels zelf staan in rules.js. */
(function (root) {
  "use strict";

  var GRID = 5;

  /* ---------- pure wiskunde ---------- */

  /* Celindexen (0..24, rij*5+kol) van een plek die door een cursor op (fx,fy) geraakt worden.
     De plek is een vierkant met zijde 2r rond (x,y); celmiddelpunten liggen op een 5x5 raster.
     Cursorstraal = radiusFactor * plekbreedte (2r), standaard 0,5. */
  function cellsHitByPoint(spot, fx, fy, radiusFactor) {
    var rf = radiusFactor === undefined ? 0.5 : radiusFactor;
    var w = spot.r * 2, rad = rf * w, hit = [];
    for (var row = 0; row < GRID; row++) {
      for (var col = 0; col < GRID; col++) {
        var cx = spot.x - spot.r + (col + 0.5) * w / GRID;
        var cy = spot.y - spot.r + (row + 0.5) * w / GRID;
        var dx = cx - fx, dy = cy - fy;
        if (dx * dx + dy * dy <= rad * rad) hit.push(row * GRID + col);
      }
    }
    return hit;
  }

  /* Geraakte cellen langs een lijnstuk a->b (bemonsterd per kwart celbreedte, dus geen gaten bij snel slepen). */
  function cellsHitBySegment(spot, a, b, radiusFactor) {
    var w = spot.r * 2, step = w / GRID / 4;
    var len = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    var n = Math.max(1, Math.ceil(len / step)), seen = {}, out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, hits = cellsHitByPoint(spot, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radiusFactor);
      for (var j = 0; j < hits.length; j++) if (!seen[hits[j]]) { seen[hits[j]] = true; out.push(hits[j]); }
    }
    return out;
  }

  function coverageRatio(cells) { return cells.length / (GRID * GRID); }

  function pointInZone(zone, fx, fy) {
    var dx = (fx - zone.x) / zone.rx, dy = (fy - zone.y) / zone.ry;
    return dx * dx + dy * dy <= 1;
  }

  /* Zone-id waarin het punt ligt (de zone met het kleinste genormeerde afstandsgetal wint bij overlap). */
  function zoneAt(zones, fx, fy) {
    var best = null, bestD = Infinity;
    zones.forEach(function (z) {
      var dx = (fx - z.x) / z.rx, dy = (fy - z.y) / z.ry, d = dx * dx + dy * dy;
      if (d <= 1 && d < bestD) { best = z; bestD = d; }
    });
    return best;
  }

  /* Een haal telt als de afgelegde weg >= strokeFraction (0,4) x zonebreedte (2*rx). */
  function strokeQualifies(zone, pathLength, strokeFraction) {
    var f = strokeFraction === undefined ? 0.4 : strokeFraction;
    return pathLength >= f * zone.rx * 2 - 1e-9;
  }

  /* Spot-element onder een punt: de plek zelf (cirkel, met ruimte voor vingers) of null. */
  function spotAt(spots, fx, fy, slack) {
    var best = null, bestD = Infinity, s = slack === undefined ? 1 : slack;
    spots.forEach(function (sp) {
      if (sp.kind === "zone") { if (pointInZone(sp, fx, fy)) { var d0 = 0.5; if (d0 < bestD) { best = sp; bestD = d0; } } return; }
      var dx = fx - sp.x, dy = fy - sp.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= sp.r * (1 + s) && d < bestD) { best = sp; bestD = d; }
    });
    return best;
  }

  /* ---------- hint-timer (pure: scheduler en weergave worden geinjecteerd; geen DOM) ----------
     opts: delayMs (inactiviteit; <= 0 = geen herhaalhints), schedule(fn, ms) -> id, cancel(id), canShow() -> bool,
     nextTarget() -> spot-id|null, show({kind:'drag'|'tap', targetId}), hide(), onFirstShown() (optioneel).
     Gedrag: start(true) toont direct een 'drag'-hint (eerste gebruik van een gereedschap); daarna volgt bij elke
     inactiviteit opnieuw een hint op het volgende open doel, met 'tap' na twee 'drag'-hints. activity() (pointerdown of
     succes) verbergt de hint direct en start de wachttijd opnieuw; stop() verbergt en ruimt de timer op. */
  function createHintController(o) {
    var timer = null, running = false, shown = false, drags = 0;
    function clear() { if (timer !== null) { o.cancel(timer); timer = null; } }
    function hide() { if (shown) { shown = false; o.hide(); } }
    function arm() { clear(); if (running && o.delayMs > 0) timer = o.schedule(fire, o.delayMs); }
    function fire() {
      timer = null; if (!running) return;
      if (o.canShow()) {
        var id = o.nextTarget();
        if (id !== null && id !== undefined) {
          var kind = drags >= 2 ? "tap" : "drag"; drags = kind === "tap" ? 0 : drags + 1;
          shown = true; o.show({ kind: kind, targetId: id });
        }
      }
      arm();
    }
    function stop() { running = false; clear(); hide(); }
    return {
      start: function (first) {
        stop(); running = true; drags = 0;
        if (first && o.canShow()) {
          var id = o.nextTarget();
          if (id !== null && id !== undefined) { shown = true; drags = 1; o.show({ kind: "drag", targetId: id }); if (o.onFirstShown) o.onFirstShown(); }
        }
        arm();
      },
      activity: function () { if (!running) return; hide(); arm(); },
      resume: function () { if (running) return; running = true; arm(); },
      stop: stop,
      isShown: function () { return shown; },
      isRunning: function () { return running; }
    };
  }

  /* ---------- pointer-afhandeling (alleen in de browser) ---------- */

  /* opts: el (#spots), stage (WS.stage), getTargets() -> spots van het huidige gereedschap (leveldata-vorm),
     isClean(id), isEnabled() -> mag invoer verwerken?, onCover(id, cellIdx[]), onTap(id), onStroke(id),
     radiusFactor, stroke (drempel), tapSlopPx. Geeft { detach, cancel } terug. */
  function attach(opts) {
    var el = opts.el, stage = opts.stage || {};
    var radiusFactor = opts.radiusFactor === undefined ? 0.5 : opts.radiusFactor;
    var strokeFraction = opts.stroke === undefined ? 0.4 : opts.stroke;
    var slop = opts.tapSlopPx === undefined ? 8 : opts.tapSlopPx;
    var drag = null;

    function frac(ev) {
      var r = stage.dogRect ? stage.dogRect() : el.getBoundingClientRect();
      if (!r || !r.width || !r.height) return null;
      return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
    }
    function targets() { return (opts.getTargets() || []).filter(function (t) { return !opts.isClean(t.id); }); }
    function cursor(p) { if (stage.moveCursor) { if (p) stage.moveCursor(p.x, p.y); else stage.moveCursor(null); } }
    function endDrag() { drag = null; cursor(null); }

    function sweep(a, b) {
      targets().forEach(function (t) {
        if (t.kind === "zone") return;
        var cells = cellsHitBySegment(t, a, b, radiusFactor);
        if (cells.length) opts.onCover(t.id, cells);
      });
    }

    function onDown(ev) {
      if (!opts.isEnabled() || (ev.button !== undefined && ev.button > 0)) return;
      var p = frac(ev); if (!p) return;
      var list = targets();
      var fromEl = ev.target && ev.target.closest ? ev.target.closest("[data-spot]") : null;
      var tapSpot = null;
      if (fromEl) { for (var i = 0; i < list.length; i++) if (list[i].id === fromEl.getAttribute("data-spot")) tapSpot = list[i]; }
      if (!tapSpot) tapSpot = spotAt(list, p.x, p.y);
      var zone = zoneAt(list.filter(function (t) { return t.kind === "zone"; }), p.x, p.y);
      drag = { id: ev.pointerId, last: p, startPx: { x: ev.clientX, y: ev.clientY }, movedPx: 0, path: 0,
        tapSpot: tapSpot, zone: zone, stroked: false };
      try { if (el.setPointerCapture && ev.pointerId !== undefined) el.setPointerCapture(ev.pointerId); } catch (e) { /* capture niet nodig */ }
      cursor(p);
      sweep(p, p); // een aanraking telt al als cursor-punt
    }

    function onMove(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      if (!opts.isEnabled()) { endDrag(); return; }
      var p = frac(ev); if (!p) return;
      drag.movedPx = Math.max(drag.movedPx, Math.hypot(ev.clientX - drag.startPx.x, ev.clientY - drag.startPx.y));
      drag.path += Math.hypot(p.x - drag.last.x, p.y - drag.last.y);
      cursor(p);
      sweep(drag.last, p);
      if (drag.zone && !drag.stroked && strokeQualifies(drag.zone, drag.path, strokeFraction)) {
        drag.stroked = true; opts.onStroke(drag.zone.id);
      }
      drag.last = p;
    }

    function onUp(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var d = drag; endDrag();
      try { if (el.releasePointerCapture && ev.pointerId !== undefined) el.releasePointerCapture(ev.pointerId); } catch (e) { /* al losgelaten */ }
      if (!opts.isEnabled()) return;
      if (d.movedPx <= slop && !d.stroked && d.tapSpot && !opts.isClean(d.tapSpot.id)) opts.onTap(d.tapSpot.id);
    }

    function onCancel(ev) { if (drag && ev.pointerId === drag.id) endDrag(); }

    /* click met detail 0 = toetsenbord (Enter/Space) of element.click(): direct klaar. Klikken met detail > 0
       komen uit een pointer-reeks die onUp al verwerkte (voorkomt dubbel tellen). */
    function onClick(ev) {
      if (ev.detail > 0 || !opts.isEnabled()) return;
      var btn = ev.target && ev.target.closest ? ev.target.closest("[data-spot]") : null;
      if (!btn) return;
      var id = btn.getAttribute("data-spot");
      if (!opts.isClean(id)) opts.onTap(id);
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("lostpointercapture", onCancel);
    el.addEventListener("click", onClick);
    return {
      cancel: endDrag,
      detach: function () {
        el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onCancel);
        el.removeEventListener("lostpointercapture", onCancel); el.removeEventListener("click", onClick);
      }
    };
  }

  var api = { GRID: GRID, cellsHitByPoint: cellsHitByPoint, cellsHitBySegment: cellsHitBySegment, coverageRatio: coverageRatio,
    createHintController: createHintController, pointInZone: pointInZone, zoneAt: zoneAt, strokeQualifies: strokeQualifies, spotAt: spotAt, attach: attach };
  root.WS = root.WS || {}; root.WS.groom = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
