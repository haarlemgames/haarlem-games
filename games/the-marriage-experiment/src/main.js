(function () {
  "use strict";

  const { createGame, render, renderBackgroundHearts, sfx } = window.MAFS;

  function start() {
    const root = document.getElementById("app");
    const bgLayer = document.getElementById("bg-hearts-layer");

    renderBackgroundHearts(bgLayer);

    const game = createGame((state) => {
      render(root, state, game);
    });

    render(root, game.getState(), game);

    document.body.addEventListener("pointerdown", () => sfx.primeMusic(), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
