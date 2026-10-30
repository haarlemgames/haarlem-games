/* WS.audioMap — Paw Makeover: CENTRALE audiomapping. Alle tracks, volumes en fase->geluid-koppelingen staan hier;
   geen enkel ander bestand bevat audiopaden of -niveaus.
   Opbouw:
     TRACKS  id -> { bus: 'music'|'amb', kind: 'file'|'gen', ... }   music = onder de muziekinstelling, amb = onder de geluidsinstelling
     SCENES  sleutel -> lagen [{ track, vol }]   (vol 0..1 t.o.v. de bus; alle tracks zijn vooraf op gelijke RMS genormaliseerd)
     sceneFor(level) -> sleutel (fase = level.beat, gelegenheid = level.occasion)
     EVENTS  naam -> wijziging van de actieve scene (vuur aan, licht uit)
   Niveaudoelen (gemeten, zie docs/AUDIO.md): achtergrond blijft ver onder de effecten (effectpieken ca. -15 dBFS). */
(function (root) {
  'use strict';

  var TRACKS = {
    theme:      { bus: 'music', kind: 'file', src: 'assets/audio/dogdoku_theme.mp3', data: 'theme', xfade: 0.15 },   // echt Dogdoku-bestand (herkomst: assets/manifest.json)
    birthday:   { bus: 'music', kind: 'gen', gen: 'birthday' },
    beachMusic: { bus: 'music', kind: 'gen', gen: 'beachMusic' },
    lullaby:    { bus: 'music', kind: 'gen', gen: 'lullaby' },
    waves:      { bus: 'amb', kind: 'gen', gen: 'waves' },
    forest:     { bus: 'amb', kind: 'gen', gen: 'forest' },
    fire:       { bus: 'amb', kind: 'gen', gen: 'fire' },
    shower:     { bus: 'amb', kind: 'gen', gen: 'shower' },
    night:      { bus: 'amb', kind: 'gen', gen: 'night' }
  };

  /* busniveau (na normalisatie op RMS 0.1 = -20 dBFS): muziek 0.5 -> ca. -26 dBFS bij vol 1; omgeving idem */
  var BUS = { music: 0.5, amb: 0.5 };

  /* volumes gekalibreerd op gemeten live-uitvoer (docs/AUDIO.md): achtergrond ca. -32 dBFS RMS, pieken <= ca. -18 dBFS; effecten pieken ca. -16 dBFS */
  var SCENES = {
    'clean':          [{ track: 'theme', vol: 0.95 }],
    'dress.birthday': [{ track: 'theme', vol: 0.44 }, { track: 'birthday', vol: 0.34 }],   // sluit aan op het komende feestje
    'dress.camp':     [{ track: 'theme', vol: 0.5 }, { track: 'forest', vol: 0.62 }],      // sluit aan op het komende kamperen
    'dress.beach':    [{ track: 'theme', vol: 0.58 }, { track: 'waves', vol: 0.8 }],       // sluit aan op het komende strand
    'play.birthday':  [{ track: 'birthday', vol: 0.5 }],
    'play.camp':      [{ track: 'forest', vol: 0.7 }],                                     // vuurknetter komt erbij zodra het vuur brandt (EVENTS['fire-on'])
    'play.beach':     [{ track: 'beachMusic', vol: 0.25 }, { track: 'waves', vol: 0.45 }],
    'shower':         [{ track: 'theme', vol: 0.4 }, { track: 'shower', vol: 0.7 }],
    'bed':            [{ track: 'lullaby', vol: 0.5 }, { track: 'night', vol: 0.45 }]
  };

  var EVENTS = {
    'fire-on':    { add: [{ track: 'fire', vol: 0.4 }] },
    'fire-off':   { remove: ['fire'] },
    'lights-out': { musicMul: 0.28, ambMul: 1.0 }                                          // muziek zachter als het licht uit gaat
  };

  var HUSH = 0.38;          // niveau tijdens het eindscherm van een level
  var FADE_IN = 1.6, FADE_OUT = 1.3, FADE_MOVE = 1.0;   // seconden

  function sceneFor(level) {
    if (!level) return null;
    var b = level.beat, o = level.occasion;
    if (b === 'clean' || b === 'shower' || b === 'bed') return b;
    if (b === 'dress' || b === 'play') return b + '.' + o;
    return null;
  }

  var api = { TRACKS: TRACKS, BUS: BUS, SCENES: SCENES, EVENTS: EVENTS, HUSH: HUSH, FADE_IN: FADE_IN, FADE_OUT: FADE_OUT, FADE_MOVE: FADE_MOVE, sceneFor: sceneFor };
  root.WS = root.WS || {}; root.WS.audioMap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
