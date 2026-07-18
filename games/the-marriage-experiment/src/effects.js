(function () {
  "use strict";

  let audioCtx = null;
  let enabled = true;

  function getContext() {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function tone(freq, dur = 0.12, type = "sine", vol = 0.18, glide) {
    const ctx = getContext();
    if (!ctx || !enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  let musicTimer = null;
  let musicGain = null;
  let beat = 0;

  const BASS_NOTES = [65.41, 55.0, 43.65, 49.0];

  const HOOK = [

    523.25, 659.25, 783.99, 0, 659.25, 523.25, 0, 0,

    440.0, 523.25, 659.25, 0, 523.25, 440.0, 0, 0,

    349.23, 440.0, 523.25, 0, 440.0, 349.23, 0, 0,

    392.0, 493.88, 587.33, 0, 587.33, 493.88, 523.25, 0,
  ];

  const EIGHTH_SEC = 60 / 128 / 2;

  function playPianoNote(ctx, freq, when, duration = 1.0, peak = 0.24) {
    if (!musicGain || !freq) return;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.4;
    filter.frequency.setValueAtTime(freq * 7, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.4), when + duration * 0.7);
    filter.connect(musicGain);

    const partials = [
      { mult: 1, level: 1, decayFrac: 1 },
      { mult: 2, level: 0.32, decayFrac: 0.55 },
      { mult: 3, level: 0.14, decayFrac: 0.32 },
    ];
    partials.forEach(({ mult, level, decayFrac }) => {
      const osc = ctx.createOscillator();
      osc.type = mult === 1 ? "triangle" : "sine";
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      const partialPeak = peak * level;
      const partialDur = duration * decayFrac;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(partialPeak, when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + partialDur);
      osc.connect(g); g.connect(filter);
      osc.start(when); osc.stop(when + partialDur + 0.05);
    });
  }

  function playBass(ctx, freq, when) {
    playPianoNote(ctx, freq, when, 1.5, 0.3);
  }

  function playMelody(ctx, freq, when) {
    playPianoNote(ctx, freq, when, 0.9, 0.22);
  }

  function playFlourish(ctx, when) {
    if (!musicGain) return;
    [1046.5, 1318.5].forEach((freq, i) => {
      playPianoNote(ctx, freq, when + i * 0.09, 0.7, 0.14);
    });
  }

  function startMusic() {
    const ctx = getContext();
    if (!ctx || musicTimer !== null) return;
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.075;
    musicGain.connect(ctx.destination);
    beat = 0;

    const tick = () => {
      const c = getContext();
      if (!c || !musicGain) return;
      const when = c.currentTime + 0.015;
      const step = beat % 8;
      const bar = Math.floor(beat / 8) % BASS_NOTES.length;
      const loopStep = beat % HOOK.length;

      if (loopStep === 0) playFlourish(c, when);
      if (step === 0) playBass(c, BASS_NOTES[bar], when);
      playMelody(c, HOOK[loopStep], when);

      beat++;
    };

    tick();
    musicTimer = window.setInterval(tick, EIGHTH_SEC * 1000);
  }

  function stopMusic() {
    if (musicTimer !== null) { clearInterval(musicTimer); musicTimer = null; }
    if (musicGain) {
      try { musicGain.disconnect(); } catch {  }
      musicGain = null;
    }
  }

  let adInProgress = false;

  function showRewardedAd() {
    if (adInProgress) return Promise.resolve({ success: false, reason: "busy" });
    adInProgress = true;
    return new Promise((resolve) => {

      setTimeout(() => {
        adInProgress = false;
        resolve({ success: true });
      }, 1500);
    });
  }

  const sfx = {
    setEnabled(value) {
      enabled = value;
      if (value) startMusic();
      else stopMusic();
    },
    isEnabled() {
      return enabled;
    },

    primeMusic() {
      if (enabled) startMusic();
    },
    click() {
      tone(620, 0.06, "triangle", 0.12);
    },
    select() {
      tone(740, 0.08, "triangle", 0.14);
      setTimeout(() => tone(980, 0.08, "triangle", 0.12), 50);
    },
    good() {
      tone(660, 0.1, "sine", 0.18);
      setTimeout(() => tone(880, 0.14, "sine", 0.18), 80);
      setTimeout(() => tone(1320, 0.16, "sine", 0.16), 180);
    },
    bad() {
      tone(220, 0.18, "sawtooth", 0.16, 110);
    },
    heart() {
      tone(880, 0.08, "sine", 0.16);
      setTimeout(() => tone(660, 0.12, "sine", 0.16), 110);
    },
    match() {
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        setTimeout(() => tone(f, 0.18, "triangle", 0.18), i * 95),
      );
    },
    vow() {
      tone(523, 0.18, "sine", 0.16);
      setTimeout(() => tone(784, 0.22, "sine", 0.16), 160);
    },
    bell() {
      tone(1320, 0.22, "sine", 0.14);
      setTimeout(() => tone(1760, 0.28, "sine", 0.12), 90);
    },
    whoosh() {
      tone(180, 0.25, "sawtooth", 0.08, 60);
    },
    sparkle() {
      [1568, 1976, 2349, 2637].forEach((f, i) =>
        setTimeout(() => tone(f, 0.08, "sine", 0.1), i * 60),
      );
    },
  };

  window.MAFS = window.MAFS || {};
  window.MAFS.sfx = sfx;
  window.MAFS.showRewardedAd = showRewardedAd;
})();
