/* WS.soundgen — Paw Makeover: originele, procedureel gegenereerde achtergrondmuziek en omgevingsgeluid.
   Pure DSP (geen WebAudio nodig): elke render() geeft { sr, data: Float32Array, loop: true } terug.
   Alle loops zijn sample-exact naadloos: ruis wordt circulair gefilterd (twee passes) en alle gebeurtenissen
   (krekels, vogels, vuurknalletjes, muzieknoten + hun nagalm) worden modulo de lengte weggeschreven, zodat
   het einde precies in het begin overloopt. Geen samples, geen licentierisico: alles is hier gecomponeerd/gesynthetiseerd.
   Het verjaardagsliedje is de publiek-domein melodie van "Happy Birthday to You" (instrumentaal, zonder zang).
   De track-ID's staan centraal in js/audio-map.js; dit bestand kent geen fases. */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise(n, r) { var a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = r() * 2 - 1; return a; }
  /* één-pool laagdoorlaat, circulair (twee passes; tweede pass levert het periodieke evenwicht) */
  function lp(a, fc, sr) {
    var n = a.length, k = 1 - Math.exp(-TAU * fc / sr), y = 0, p, i;
    for (p = 0; p < 2; p++) for (i = 0; i < n; i++) { y += k * (a[i] - y); if (p === 1) a[i] = y; }
    return a;
  }
  function lp2(a, fc, sr) { return lp(lp(a, fc, sr), fc, sr); }
  function copy(a) { return new Float32Array(a); }
  function hp(a, fc, sr) { var l = lp(copy(a), fc, sr); for (var i = 0; i < a.length; i++) a[i] -= l[i]; return a; }
  function bp(a, lo, hi, sr) { return hp(lp2(a, hi, sr), lo, sr); }
  function add(dst, src, g) { for (var i = 0; i < dst.length; i++) dst[i] += src[i] * g; }
  function wrapAdd(buf, idx, v) { var n = buf.length; idx = idx % n; if (idx < 0) idx += n; buf[idx] += v; }
  function rms(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }
  function peak(a) { var m = 0; for (var i = 0; i < a.length; i++) { var v = Math.abs(a[i]); if (v > m) m = v; } return m; }
  /* normaliseer naar doel-RMS; zacht begrensd zodat de piek nooit boven 0.9 komt (geen clipping, geen sprongen) */
  function normalize(a, target) {
    var g = target / (rms(a) || 1), i;
    for (i = 0; i < a.length; i++) a[i] *= g;
    var pk = peak(a);
    if (pk > 0.9) { var k = 0.9 / pk; for (i = 0; i < a.length; i++) a[i] *= k; }
    return a;
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- omgevingsgeluiden ---------- */
  var AMB_SR = 22050, MUS_SR = 32000;

  function waves() {
    var sr = AMB_SR, secs = 28, n = sr * secs, r = rng(11), i;
    var base = lp2(noise(n, r), 650, sr);
    var foam = hp(lp2(noise(n, r), 4200, sr), 1400, sr);
    var wind = bp(noise(n, r), 220, 700, sr);
    var out = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var t = i / n;
      var e1 = 0.5 + 0.5 * Math.sin(TAU * 3 * t + 0.4), e2 = 0.5 + 0.5 * Math.sin(TAU * 4 * t + 2.1);
      var sw = Math.pow(Math.max(0, 0.62 * e1 + 0.38 * e2), 2);            // brede golfdeining
      var crest = Math.pow(Math.max(0, 0.62 * (0.5 + 0.5 * Math.sin(TAU * 3 * t + 0.4 - 0.55)) + 0.38 * (0.5 + 0.5 * Math.sin(TAU * 4 * t + 2.1 - 0.55))), 3.2);
      var br = 0.5 + 0.5 * Math.sin(TAU * 2 * t + 1.3);
      out[i] = base[i] * (0.22 + 0.78 * sw) * 1.2 + foam[i] * crest * 0.9 + wind[i] * (0.18 + 0.2 * br) * 0.9;
    }
    return normalize(out, 0.1);
  }

  function cricket(out, sr, r, f, rate, phase, amp, wobble) {
    var n = out.length, per = Math.round(sr / rate), k, j, pulses = 3, plen = Math.round(0.016 * sr), gap = Math.round(0.034 * sr), s;
    var count = Math.floor(n / per);
    per = Math.floor(n / count); // past precies in de loop
    for (k = 0; k < count; k++) {
      var rest = 0.5 + 0.5 * Math.sin(TAU * (k / count) * wobble + phase * 3);     // soms zachter (cricket rust uit)
      var a = amp * (0.35 + 0.65 * rest) * (0.85 + 0.3 * r());
      var st = k * per + Math.floor(phase * per) + Math.floor((r() - 0.5) * per * 0.1);
      for (j = 0; j < pulses; j++) {
        for (s = 0; s < plen; s++) {
          var env = Math.sin(Math.PI * s / plen); env *= env;
          wrapAdd(out, st + j * gap + s, a * env * Math.sin(TAU * f * (s / sr)));
        }
      }
    }
  }
  function bird(out, sr, r, t0, f0, f1, notes, amp) {
    var nn, s, len = Math.round(0.11 * sr), gap = Math.round(0.16 * sr);
    for (nn = 0; nn < notes; nn++) {
      var fa = f0 * (1 + 0.06 * nn), fb = f1 * (1 - 0.04 * nn), ph = 0;
      for (s = 0; s < len; s++) {
        var u = s / len, env = Math.sin(Math.PI * u); env = env * env;
        var f = fa + (fb - fa) * u + 90 * Math.sin(TAU * 24 * u);
        ph += TAU * f / sr;
        wrapAdd(out, t0 + nn * gap + s, amp * env * Math.sin(ph));
      }
    }
  }

  function forest() {
    var sr = AMB_SR, secs = 32, n = sr * secs, r = rng(23), i;
    var out = new Float32Array(n);
    var wind = lp2(noise(n, r), 520, sr);
    for (i = 0; i < n; i++) { var t = i / n; out[i] += wind[i] * (0.5 + 0.28 * Math.sin(TAU * 2 * t + 0.8) + 0.12 * Math.sin(TAU * 5 * t)) * 0.9; }
    cricket(out, sr, r, 4350, 2.3, 0.07, 0.09, 3);
    cricket(out, sr, r, 4720, 2.05, 0.41, 0.07, 4);
    cricket(out, sr, r, 5050, 2.6, 0.73, 0.055, 2);
    var times = [2.4, 6.9, 11.2, 14.1, 19.5, 23.3, 27.6, 30.1], k;
    for (k = 0; k < times.length; k++) bird(out, sr, r, Math.round(times[k] * sr), 2300 + r() * 1300, 2500 + r() * 2100, 2 + Math.floor(r() * 3), 0.07 + r() * 0.04);
    return normalize(out, 0.1);
  }

  function fire() {
    var sr = AMB_SR, secs = 20, n = sr * secs, r = rng(37), i, k, s;
    var out = new Float32Array(n);
    var rumble = lp2(noise(n, r), 170, sr), hiss = bp(noise(n, r), 1800, 6000, sr), slow = lp(noise(n, r), 1.6, sr);
    var sm = 0; for (i = 0; i < n; i++) if (Math.abs(slow[i]) > sm) sm = Math.abs(slow[i]);
    for (i = 0; i < n; i++) { var env = 0.55 + 0.45 * (slow[i] / (sm || 1)); out[i] = rumble[i] * 0.35 * env + hiss[i] * 0.05 * (0.4 + 0.6 * env); }
    var count = Math.round(secs * 11);
    for (k = 0; k < count; k++) {
      var t0 = Math.floor(r() * n), a = 0.15 + 0.85 * Math.pow(r(), 3), len = Math.round((0.003 + r() * 0.014) * sr), prev = 0;
      for (s = 0; s < len; s++) { var x = (r() * 2 - 1) * Math.exp(-5 * s / len); wrapAdd(out, t0 + s, a * 0.8 * (x - prev * 0.6)); prev = x; }
    }
    var pops = Math.round(secs * 0.55);
    for (k = 0; k < pops; k++) {
      var tp = Math.floor(r() * n), ap = 0.5 + 0.4 * r(), plen = Math.round(0.03 * sr), ph = 0;
      for (s = 0; s < plen; s++) { var u = s / plen, f = 340 - 190 * u; ph += TAU * f / sr; wrapAdd(out, tp + s, ap * 0.7 * Math.exp(-6 * u) * Math.sin(ph) + ap * 0.25 * (r() * 2 - 1) * Math.exp(-14 * u)); }
    }
    for (i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 3.2) / 3.2;
    return normalize(out, 0.1);
  }

  function shower() {
    var sr = AMB_SR, secs = 12, n = sr * secs, r = rng(41), i;
    var hi = bp(noise(n, r), 650, 7200, sr), body = lp2(noise(n, r), 1800, sr), mod = lp(noise(n, r), 9, sr);
    var out = new Float32Array(n), mm = 0; for (i = 0; i < n; i++) if (Math.abs(mod[i]) > mm) mm = Math.abs(mod[i]);
    for (i = 0; i < n; i++) out[i] = (hi[i] * 0.8 + body[i] * 0.35) * (1 + 0.16 * mod[i] / (mm || 1));
    return normalize(out, 0.1);
  }

  function night() {
    var sr = AMB_SR, secs = 32, n = sr * secs, r = rng(53), i;
    var out = new Float32Array(n);
    var hum = lp2(noise(n, r), 150, sr), air = lp2(noise(n, r), 420, sr);
    for (i = 0; i < n; i++) { var t = i / n; out[i] = hum[i] * 0.5 * (0.7 + 0.3 * Math.sin(TAU * 2 * t)) + air[i] * 0.16 * (0.5 + 0.5 * Math.sin(TAU * 3 * t + 1)); }
    cricket(out, sr, r, 4500, 1.3, 0.2, 0.045, 3);
    cricket(out, sr, r, 4850, 1.1, 0.62, 0.035, 2);
    return normalize(out, 0.1);
  }

  /* ---------- muziek: eenvoudige additieve synth, circulair weggeschreven ---------- */
  var TIMBRE = {
    box:   { partials: [[1, 1, 1.7], [2.01, 0.42, 1.0], [3.03, 0.2, 0.55], [4.2, 0.1, 0.3], [5.4, 0.05, 0.2]], atk: 0.003, len: 3.0 },
    pluck: { partials: [[1, 1, 0.55], [2, 0.5, 0.32], [3, 0.3, 0.22], [4, 0.16, 0.15], [5, 0.08, 0.1]], atk: 0.002, len: 1.2 },
    bell:  { partials: [[1, 1, 1.4], [2.76, 0.35, 0.8], [5.4, 0.12, 0.4], [8.9, 0.05, 0.2]], atk: 0.003, len: 2.6 },
    soft:  { partials: [[1, 1, 1.6], [2, 0.18, 1.1], [3, 0.05, 0.7]], atk: 0.04, len: 3.2 }
  };
  function note(buf, sr, tSec, durSec, midi, amp, timbre) {
    var T = TIMBRE[timbre], f = mtof(midi), n = buf.length, start = Math.round(tSec * sr), total = Math.round((durSec + T.len) * sr), p, s;
    var atk = Math.max(1, Math.round(T.atk * sr)), relK = Math.exp(-1 / (0.25 * sr));
    var holdN = Math.round(durSec * sr), soft = timbre === 'soft';
    start = ((start % n) + n) % n;
    for (p = 0; p < T.partials.length; p++) {
      var pr = T.partials[p], fr = f * pr[0]; if (fr > sr * 0.45) continue;
      var pa = amp * pr[1], tau = pr[2] * (soft ? 1 : (0.6 + 0.4 * 261 / Math.max(120, f)));
      var w = TAU * fr / sr, c2 = 2 * Math.cos(w), y1 = Math.sin(w), y2 = 0, d = Math.exp(-1 / (tau * sr)), env = 1, idx = start, y;
      for (s = 0; s < total; s++) {
        y = s === 0 ? 0 : (s === 1 ? y1 : c2 * y1 - y2);
        if (s >= 2) { y2 = y1; y1 = y; } else if (s === 1) { y2 = 0; }
        var e = env; if (s < atk) e *= s / atk;
        buf[idx] += pa * e * y;
        if (++idx === n) idx = 0;
        env *= d; if (soft && s > holdN) env *= relK;
        if (env < 0.0008 && s > atk) break;
      }
    }
  }
  /* nagalm: twee gedempte echo's, circulair (loop blijft naadloos) */
  function space(dry, sr) {
    var n = dry.length, out = new Float32Array(n), i;
    var d1 = Math.round(0.29 * sr), d2 = Math.round(0.47 * sr), d3 = Math.round(0.83 * sr);
    for (i = 0; i < n; i++) out[i] = dry[i] + 0.2 * dry[(i - d1 + n) % n] + 0.13 * dry[(i - d2 + n) % n] + 0.08 * dry[(i - d3 + n) % n];
    return lp(out, 7500, sr);
  }

  var CH = { C: { bass: 48, st: [60, 64, 67] }, G7: { bass: 43, st: [59, 62, 65, 67] }, C7: { bass: 48, st: [60, 64, 67, 70] }, F: { bass: 41, st: [57, 60, 65] },
    Am: { bass: 45, st: [60, 64, 69] }, G: { bass: 43, st: [59, 62, 67] } };

  function birthday() {
    var sr = MUS_SR, bpm = 96, B = 60 / bpm, passBeats = 28, n = Math.round(2 * passBeats * B * sr), buf = new Float32Array(n);
    var mel = [[0, 0.75, 67], [0.75, 0.25, 67], [1, 1, 69], [2, 1, 67], [3, 1, 72], [4, 2, 71], [6, 0.75, 67], [6.75, 0.25, 67], [7, 1, 69], [8, 1, 67], [9, 1, 74],
      [10, 2, 72], [12, 0.75, 67], [12.75, 0.25, 67], [13, 1, 79], [14, 1, 76], [15, 1, 72], [16, 1, 71], [17, 1, 69], [18, 0.75, 77], [18.75, 0.25, 77],
      [19, 1, 76], [20, 1, 72], [21, 1, 74], [22, 3, 72]];
    var bars = [[1, 'C'], [4, 'G7'], [7, 'G7'], [10, 'C'], [13, 'C7'], [16, 'F'], [19, 'C'], [22, 'C']];
    var pass, k, j;
    for (pass = 0; pass < 2; pass++) {
      var off = pass * passBeats;
      var lead = pass === 0 ? 'box' : 'bell', ampL = pass === 0 ? 0.55 : 0.4;
      for (k = 0; k < mel.length; k++) {
        var m = mel[k]; note(buf, sr, (off + m[0]) * B, m[1] * B * 0.95, m[2] + (pass === 1 && m[0] >= 12 ? 0 : 0), ampL, lead);
        if (pass === 1) note(buf, sr, (off + m[0]) * B, m[1] * B * 0.9, m[2] - 12, 0.14, 'soft');
      }
      for (k = 0; k < bars.length; k++) {
        var b = off + bars[k][0], c = CH[bars[k][1]];
        if (k === 6) { /* bar 7: laatste tel G7 */ }
        note(buf, sr, b * B, 0.9 * B, c.bass, 0.26, 'pluck');
        if (pass === 0) { for (j = 1; j <= 2; j++) c.st.forEach(function (mn, idx) { note(buf, sr, (b + j) * B + idx * 0.012, 0.5 * B, mn, 0.075, 'pluck'); }); }
        else { for (j = 0; j < 6; j++) note(buf, sr, (b + j * 0.5) * B, 0.45 * B, c.st[j % c.st.length] + 12, 0.07, 'pluck'); }
      }
      // pickup-bas voor de volgende maat: kleine stoot op het pickup-moment (tel 6, 12 etc.) blijft weg: melodie draagt
    }
    return normalize(space(buf, sr), 0.1);
  }

  function beachMusic() {
    var sr = MUS_SR, bpm = 100, B = 60 / bpm, passBeats = 32, n = Math.round(2 * passBeats * B * sr), buf = new Float32Array(n);
    var melA = [[0, 1.5, 76], [1.5, 0.5, 74], [2, 1, 72], [3, 1, 76],
      [4, 1, 67], [5, 1, 69], [6, 2, 74],
      [8, 1, 72], [9, 1, 76], [10, 1, 74], [11, 1, 72],
      [12, 2, 69], [14, 1, 72], [15, 1, 69],
      [16, 1.5, 76], [17.5, 0.5, 79], [18, 1, 76], [19, 1, 74],
      [20, 2, 74], [22, 2, 67],
      [24, 1, 69], [25, 1, 72], [26, 1, 74], [27, 1, 72],
      [28, 3, 72]];
    var prog = [['C', 0], ['G', 4], ['Am', 8], ['F', 12], ['C', 16], ['G', 20], ['F', 24], ['C', 28]];
    var pass, k, j;
    for (pass = 0; pass < 2; pass++) {
      var off = pass * passBeats;
      for (k = 0; k < melA.length; k++) {
        var m = melA[k];
        if (pass === 0) note(buf, sr, (off + m[0]) * B, m[1] * B * 0.9, m[2], 0.5, 'pluck');
        else if (m[0] >= 16) note(buf, sr, (off + m[0]) * B, m[1] * B * 0.9, m[2] + 12, 0.34, 'bell');
      }
      for (k = 0; k < prog.length; k++) {
        var c = CH[prog[k][0]], b = off + prog[k][1];
        note(buf, sr, b * B, 1.6 * B, c.bass, 0.3, 'pluck');
        note(buf, sr, (b + 2) * B, 1.4 * B, c.bass + 7, 0.2, 'pluck');
        [0, 1.5, 2, 3.5].forEach(function (bt, ix) {
          var up = ix % 2 === 1;
          (up ? c.st.slice(-2) : c.st).forEach(function (mn, idx) { note(buf, sr, (b + bt) * B + idx * 0.014, 0.4 * B, mn + (up ? 12 : 0), up ? 0.05 : 0.085, 'pluck'); });
        });
        if (pass === 1 && prog[k][1] < 16) for (j = 0; j < 8; j++) note(buf, sr, (b + j * 0.5) * B, 0.45 * B, c.st[j % c.st.length] + 12, 0.075, 'bell');
      }
    }
    return normalize(space(buf, sr), 0.1);
  }

  function lullaby() {
    var sr = MUS_SR, bpm = 56, B = 60 / bpm, passBeats = 27, n = Math.round(2 * passBeats * B * sr), buf = new Float32Array(n);
    var mel = [[0, 1, 64], [1, 1, 67], [2, 1, 72], [3, 2, 71], [5, 1, 67], [6, 1, 69], [7, 1, 67], [8, 1, 64], [9, 2, 62],
      [12, 1, 64], [13, 1, 67], [14, 1, 72], [15, 2, 74], [17, 1, 71], [18, 1, 72], [19, 1, 69], [20, 1, 65], [21, 3, 64]];
    var arp = { C: [48, 52, 55], G: [43, 50, 55], Am: [45, 52, 57], F: [41, 48, 53] };
    var prog = ['C', 'G', 'Am', 'G', 'C', 'G', 'F', 'C'];
    var pass, k, j;
    for (pass = 0; pass < 2; pass++) {
      var off = pass * passBeats;
      for (k = 0; k < mel.length; k++) {
        var m = mel[k];
        if (pass === 0) note(buf, sr, (off + m[0]) * B, m[1] * B, m[2], 0.55, 'box');
        else { note(buf, sr, (off + m[0]) * B, m[1] * B, m[2] + 12, 0.3, 'bell'); note(buf, sr, (off + m[0]) * B, m[1] * B * 1.2, m[2], 0.2, 'soft'); }
      }
      for (k = 0; k < prog.length; k++) {
        var a = arp[prog[k]], b = off + k * 3;
        for (j = 0; j < 3; j++) note(buf, sr, (b + j) * B, 1.6 * B, a[j], j === 0 ? 0.22 : 0.13, pass === 0 ? 'soft' : 'box');
      }
    }
    return normalize(space(buf, sr), 0.1);
  }

  var GEN = { waves: waves, forest: forest, fire: fire, shower: shower, night: night, birthday: birthday, beachMusic: beachMusic, lullaby: lullaby };
  var cache = {};
  function render(name) {
    if (!GEN[name]) return null;
    if (!cache[name]) cache[name] = { sr: (name === 'birthday' || name === 'beachMusic' || name === 'lullaby') ? MUS_SR : AMB_SR, data: GEN[name](), loop: true };
    return cache[name];
  }

  var api = { render: render, names: Object.keys(GEN), rms: rms, peak: peak, _util: { rms: rms, peak: peak } };
  root.WS = root.WS || {}; root.WS.soundgen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
