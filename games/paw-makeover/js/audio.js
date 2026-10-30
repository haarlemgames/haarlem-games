/* Audio: één AudioContext, pas aangemaakt na een gebruikersinteractie via unlock().
   Effecten: korte procedurele tonen (WebAudio). Achtergrond: scene-engine met naadloze loops (muziek + omgevingsgeluid),
   gestuurd door WS.audioMap (centrale mapping) en WS.soundgen (gegenereerde loops) + het echte Dogdoku-thema (bestand).
   Muziek valt onder de muziekinstelling, omgevingsgeluid onder de geluidsinstelling. Pauze/verborgen tab: ctx.suspend(). */
(function (root) {
  "use strict";

  var SFX = { // [frequentie, duur s, type, eindfrequentie]
    click: [520, 0.05, "sine"], hit: [660, 0.09, "sine", 880], miss: [180, 0.14, "triangle"],
    win: [784, 0.35, "sine", 1175], lose: [220, 0.4, "triangle", 110]
  };

  function createAudio(getSettings) {
    var Ctor = root.AudioContext || root.webkitAudioContext;
    var ctx = null, master = null, sfxGain = null;
    var musicSet = null, musicDuck = null, ambSet = null, ambDuck = null;
    var wantMusic = false, suspendedByPause = false, suspendTimer = null;
    var lastCue = {}, voices = 0;
    var M = root.WS && root.WS.audioMap;
    var an = null, buf = null;
    var sceneKey = null, mods = { musicMul: 1, ambMul: 1, add: {}, remove: {} }, hushed = false;
    var layersLive = {}, building = {}, bufCache = {}, prefetchTimer = null, buildToken = 0;

    function settings() { return getSettings(); }

    function unlock() { // aanroepen vanuit pointerdown/keydown
      if (!Ctor) return false;
      try {
        if (!ctx) {
          ctx = new Ctor();
          master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
          sfxGain = ctx.createGain(); sfxGain.connect(master);
          musicSet = ctx.createGain(); musicDuck = ctx.createGain(); musicSet.connect(musicDuck); musicDuck.connect(master);
          ambSet = ctx.createGain(); ambDuck = ctx.createGain(); ambSet.connect(ambDuck); ambDuck.connect(master);
          applySettings(true);
        }
        // ook iOS 'interrupted'; een mislukte resume (geen toestemming) wordt bij de volgende tik opnieuw geprobeerd
        if (ctx.state !== "running" && !suspendedByPause) { try { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* volgende tik */ } }
        applyScene();
        return true;
      } catch (e) { ctx = null; return false; }
    }

    function ramp(param, v, tc) { var now = ctx.currentTime; try { param.cancelScheduledValues(now); param.setTargetAtTime(v, now, tc); } catch (e) { param.value = v; } }
    function applySettings(immediate) {
      if (!ctx) return;
      var s = settings(), tc = immediate === true ? 0.001 : 0.06;
      ramp(musicSet.gain, s.music ? 1 : 0, tc);
      ramp(ambSet.gain, s.sfx ? 1 : 0, tc);
      sfxGain.gain.value = s.sfx ? 0.5 : 0;
    }
    /* ---- scene-engine ---- */
    function duck() { if (!ctx) return; var now = ctx.currentTime;
      [musicDuck, ambDuck].forEach(function (g) { try { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0.55, now, 0.02); g.gain.setTargetAtTime(1, now + 0.22, 0.3); } catch (e) { /* ignore */ } }); }
    function desired() {
      var out = {}; if (!M || !wantMusic || !sceneKey || !M.SCENES[sceneKey]) return out;
      M.SCENES[sceneKey].forEach(function (l) { out[l.track] = l.vol; });
      Object.keys(mods.add).forEach(function (t) { out[t] = mods.add[t]; });
      Object.keys(mods.remove).forEach(function (t) { delete out[t]; });
      Object.keys(out).forEach(function (t) {
        var bus = M.TRACKS[t].bus; out[t] *= (bus === 'music' ? mods.musicMul : mods.ambMul) * (hushed ? M.HUSH : 1) * M.BUS[bus];
      });
      return out;
    }
    function fadeTo(g, v, sec) { var now = ctx.currentTime; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(v, now + sec); }
    function mkBuffer(sr, data) { var b = ctx.createBuffer(1, data.length, sr); if (b.copyToChannel) b.copyToChannel(data, 0); else b.getChannelData(0).set(data); return b; }
    function trimLoop(ab, xf) { // naadloze loop: staart en kop gaan over in elkaar (gelijk-vermogen crossfade)
      var X = Math.min(Math.round(xf * ab.sampleRate), ab.length >> 2), N = ab.length - X, out = ctx.createBuffer(ab.numberOfChannels, N, ab.sampleRate), c, i;
      var sum = 0;
      for (c = 0; c < ab.numberOfChannels; c++) {
        var src = ab.getChannelData(c), dst = out.getChannelData(c);
        for (i = 0; i < N; i++) dst[i] = src[i];
        for (i = 0; i < X; i++) { var u = i / X; dst[i] = src[i] * Math.sin(u * Math.PI / 2) + src[N + i] * Math.cos(u * Math.PI / 2); }
        for (i = 0; i < N; i += 4) sum += dst[i] * dst[i];
      }
      var rms = Math.sqrt(sum / (N / 4 * ab.numberOfChannels)) || 0.1, k = 0.1 / rms;
      for (c = 0; c < out.numberOfChannels; c++) { var d2 = out.getChannelData(c); for (i = 0; i < N; i++) d2[i] *= k; }
      return out;
    }
    function loadTheme(tr) {
      return new Promise(function (resolve, reject) {
        function fromData() {
          try { var bin = root.atob(root.WS.audioData.theme), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); resolve(u.buffer); } catch (e) { reject(e); }
        }
        if (root.WS && root.WS.audioData && root.WS.audioData[tr.data]) { fromData(); return; }
        function viaScript() {   // base64-variant: alleen nodig bij file:// (fetch werkt daar niet); niet in de Poki-build
          var sc = root.document.createElement('script'); sc.src = 'assets/audio/theme-b64.js?v=1';
          sc.onload = function () { if (root.WS.audioData && root.WS.audioData[tr.data]) fromData(); else reject(new Error('geen themadata')); };
          sc.onerror = function () { reject(new Error('thema niet te laden')); };
          root.document.head.appendChild(sc);
        }
        // v1.3: online eerst de kleinere mp3 (395 KB i.p.v. 527 KB base64), base64 alleen als terugval
        if (root.fetch && /^https?:$/.test(root.location.protocol)) root.fetch(tr.src).then(function (r) { if (!r.ok) throw new Error('mp3 ' + r.status); return r.arrayBuffer(); }).then(resolve, viaScript);
        else viaScript();
      });
    }
    function getBuffer(id) {
      if (bufCache[id]) return bufCache[id];
      var tr = M.TRACKS[id];
      bufCache[id] = new Promise(function (resolve, reject) {
        if (tr.kind === 'gen') { setTimeout(function () { try { var r = root.WS.soundgen.render(tr.gen); resolve(mkBuffer(r.sr, r.data)); } catch (e) { reject(e); } }, 0); return; }
        loadTheme(tr).then(function (ab) { ctx.decodeAudioData(ab, function (dec) { try { resolve(trimLoop(dec, tr.xfade || 0.1)); } catch (e) { reject(e); } }, reject); }, reject);
      });
      bufCache[id].catch(function (e) { delete bufCache[id]; try { root.console.warn('audio: track niet beschikbaar', id, e && e.message); } catch (er) { /* ignore */ } });
      return bufCache[id];
    }
    function startVoice(id, vol, token) {
      building[id] = true;
      getBuffer(id).then(function (buf) {
        delete building[id];
        if (!ctx || token !== buildToken && !desired().hasOwnProperty(id)) return;
        var want = desired(); if (!want.hasOwnProperty(id) || (layersLive[id] && !layersLive[id].dying)) return;
        var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.loop = true;
        g.gain.value = 0; src.connect(g); g.connect(M.TRACKS[id].bus === 'music' ? musicSet : ambSet);
        src.start(0, 0);   // elke voice start aan het begin van de loop
        layersLive[id] = { id: id, src: src, gain: g };
        fadeTo(g, want[id], M.FADE_IN);
      }, function () { delete building[id]; });
    }
    function applyScene() {
      if (!ctx || !M) return;
      var want = desired(), id;
      Object.keys(layersLive).forEach(function (k) {
        if (want.hasOwnProperty(k)) return;
        var v = layersLive[k]; if (v.dying) return;
        if (ctx.state !== 'running') { delete layersLive[k]; try { v.src.stop(); v.src.disconnect(); v.gain.disconnect(); } catch (e) { /* ignore */ } return; }   // pauze/home: stil, dus direct opruimen
        v.dying = true; fadeTo(v.gain, 0, M.FADE_OUT);
        (function kill() {
          v.killTimer = setTimeout(function () {
            if (!ctx) return;
            if (ctx.state !== 'running') { kill(); return; }          // pauze: faden en stoppen wachten mee
            delete layersLive[k]; try { v.src.stop(); v.src.disconnect(); v.gain.disconnect(); } catch (e) { /* ignore */ }
          }, M.FADE_OUT * 1000 + 150);
        })();
      });
      buildToken++;
      Object.keys(want).forEach(function (k) {
        if (layersLive[k]) { var lv = layersLive[k]; if (lv.dying) { lv.dying = false; clearTimeout(lv.killTimer); } fadeTo(lv.gain, want[k], lv.dying ? M.FADE_IN : M.FADE_MOVE); }
        else if (!building[k]) startVoice(k, want[k], buildToken);
        else { /* wordt al geladen; start zodra klaar (desired() wordt dan opnieuw bevraagd) */ }
      });
      // al lopende builds die intussen niet meer gewenst zijn, starten niet (zie startVoice)
      schedulePrefetch();
    }
    function schedulePrefetch() {
      if (prefetchTimer || !ctx || !M) return;
      var ids = Object.keys(M.TRACKS).filter(function (k) { return !bufCache[k]; });
      if (!ids.length) return;
      prefetchTimer = setTimeout(function () { prefetchTimer = null; if (ctx && ids[0] && !bufCache[ids[0]]) getBuffer(ids[0]).then(schedulePrefetch, schedulePrefetch); else schedulePrefetch(); }, 900);
    }
    function setScene(key) { sceneKey = key; mods = { musicMul: 1, ambMul: 1, add: {}, remove: {} }; hushed = false; if (ctx) applyScene(); }
    function event(name) {
      var e = M && M.EVENTS[name]; if (!e) return;
      if (e.add) e.add.forEach(function (l) { mods.add[l.track] = l.vol; delete mods.remove[l.track]; });
      if (e.remove) e.remove.forEach(function (t) { mods.remove[t] = true; delete mods.add[t]; });
      if (e.musicMul !== undefined) mods.musicMul = e.musicMul;
      if (e.ambMul !== undefined) mods.ambMul = e.ambMul;
      if (ctx) applyScene();
    }
    function hush(on) { hushed = !!on; if (ctx) applyScene(); }
    function info() {
      return { scene: sceneKey, wantMusic: wantMusic, hushed: hushed, state: ctx ? ctx.state : 'none', suspendedByPause: suspendedByPause, mods: mods,
        live: Object.keys(layersLive).map(function (k) { return { id: k, gain: +layersLive[k].gain.gain.value.toFixed(3), dying: !!layersLive[k].dying }; }), building: Object.keys(building), cached: Object.keys(bufCache),
        busMusic: musicSet ? +musicSet.gain.value.toFixed(2) : null, busAmb: ambSet ? +ambSet.gain.value.toFixed(2) : null };
    }

    function tone(freq, dur, type, endFreq, dest, when, volume) {
      if (voices >= 14) return;
      var t = when || ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume === undefined ? 0.55 : volume, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.02);
      voices++;
      o.onended = function () { voices = Math.max(0, voices - 1); o.disconnect(); g.disconnect(); };
    }

    function softSwish(kind) {
      var dur = kind === 'brush' ? .11 : .14;
      var count = Math.ceil(ctx.sampleRate * dur), buffer = ctx.createBuffer(1, count, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < count; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / count) * .18;
      var source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = kind === 'brush' ? 1900 : 950;
      gain.gain.value = .55; source.connect(filter); filter.connect(gain); gain.connect(sfxGain);
      source.onended = function () { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start();
    }

    function sfx(name) {
      if (name === 'fire-on' || name === 'fire-off' || name === 'lights-out') { event(name); return; }
      if (name === 'complete' || name === 'win' || name === 'lose') duck();
      if (!ctx || !settings().sfx || ctx.state !== "running" || suspendedByPause) return;
      var now = ctx.currentTime;
      var gap = name === 'click' ? .045 : name === 'hit' ? .085 : .075;
      if (now - (lastCue[name] === undefined ? -10 : lastCue[name]) < gap) return;
      lastCue[name] = now;
      if (name === 'hit' && now - (lastCue.clean === undefined ? -10 : lastCue.clean) < .09) return;
      try {
        if (name === 'wipe' || name === 'brush') { softSwish(name); return; }
        if (name === 'wash') { tone(580 + Math.random() * 160, .07, 'sine', 1000, sfxGain, now, .3); tone(1100, .06, 'sine', 750, sfxGain, now + .035, .22); return; }
        if (name === 'clean') { tone(740 + Math.random() * 90, .13, 'sine', 1250, sfxGain, now, .42); tone(1480, .12, 'sine', null, sfxGain, now + .055, .18); return; }
        if (name === 'complete' || name === 'win') {
          [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, .27, 'sine', null, sfxGain, now + i * .075, .32); }); return;
        }
      } catch (e) { return; }
      var d = SFX[name]; if (!d) return;
      try { tone(d[0], d[1], d[2], d[3], sfxGain); } catch (e) {}
    }

    if (root.document) root.document.addEventListener('ws-groom-feedback', function (event) {
      if (event.detail) sfx(event.detail.kind);
    });

    return {
      unlock: unlock,
      sfx: sfx,
      applySettings: applySettings,
      startMusic: function () { wantMusic = true; if (suspendedByPause === false && master && ctx) master.gain.setTargetAtTime(.8, ctx.currentTime, .025); applyScene(); },
      stopMusic: function () { wantMusic = false; hushed = false; applyScene(); },
      setScene: setScene, event: event, hush: hush, info: info,
      meter: function () { if (!ctx) return null; if (!an) { an = ctx.createAnalyser(); an.fftSize = 4096; master.connect(an); buf = new Float32Array(an.fftSize); } an.getFloatTimeDomainData(buf); var sm = 0, pk = 0; for (var i = 0; i < buf.length; i++) { sm += buf[i] * buf[i]; if (Math.abs(buf[i]) > pk) pk = Math.abs(buf[i]); } return { rms: Math.sqrt(sm / buf.length), peak: pk }; },
      suspend: function () {
        suspendedByPause = true; if (suspendTimer) clearTimeout(suspendTimer);
        if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, .015);
        suspendTimer = setTimeout(function () { suspendTimer = null; if (ctx && suspendedByPause && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } } }, 120);
      },
      resume: function () {
        suspendedByPause = false; if (suspendTimer) { clearTimeout(suspendTimer); suspendTimer = null; }
        if (!ctx) return;
        var go = function () { master.gain.setTargetAtTime(.8, ctx.currentTime, .03); };
        if (ctx.state !== 'running') { try { ctx.resume().then(go, go); } catch (e) { go(); } } else go();
      },
      state: function () { return ctx ? ctx.state : "none"; },
      supported: !!Ctor
    };
  }

  var api = { createAudio: createAudio };
  root.WS = root.WS || {}; root.WS.audio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
