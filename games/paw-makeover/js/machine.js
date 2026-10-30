/* Kleine toestandsmachine voor de shell: home, settings, playing, paused, reveal.
   Binnen 'playing' zijn Verzorgen/Aankleden shell-subtoestanden (zie body[data-step]). */
(function (root) {
  "use strict";

  var TRANSITIONS = {
    home:     { play: "playing", settings: "settings" },
    settings: { back: "@return" },
    playing:  { pause: "paused", reveal: "reveal", home: "home", next: "playing" },
    paused:   { resume: "playing", retry: "playing", settings: "settings", home: "home" },
    reveal:   { next: "playing", retry: "playing", home: "home" }
  };

  function createMachine(initial, onChange) {
    var state = initial, returnTo = initial;
    function send(event) {
      var target = (TRANSITIONS[state] || {})[event];
      if (!target) return false; // ongeldige gebeurtenis in deze toestand: negeren
      var from = state;
      if (target === "@return") target = returnTo;
      if (event === "settings") returnTo = from;
      state = target;
      if (onChange) onChange(state, from, event);
      return true;
    }
    return { send: send, get: function () { return state; } };
  }

  var api = { createMachine: createMachine, TRANSITIONS: TRANSITIONS };
  root.WS = root.WS || {}; root.WS.machine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
