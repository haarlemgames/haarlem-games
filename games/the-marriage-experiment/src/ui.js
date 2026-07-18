(function () {
  "use strict";

  const { CONFIG, ORIENTATIONS, RELIGIONS, GENDERS, CHARACTER_TRAITS, VOWS, COUNTRIES, ANYWHERE_COUNTRY, CREST_EMOJIS, CREST_COLORS, CREST_BORDERS, HOME_STYLES, sfx, showRewardedAd } = window.MAFS;

  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value !== undefined && value !== null && value !== false) {
        el.setAttribute(key, value === true ? "" : String(value));
      }
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function mount(root, el) {
    const active = document.activeElement;
    const isTextInput = active && root.contains(active) && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
    const fieldName = isTextInput ? active.getAttribute("name") : null;

    let selectionStart = null;
    let selectionEnd = null;
    if (isTextInput) {
      try {
        selectionStart = active.selectionStart;
        selectionEnd = active.selectionEnd;
      } catch {

      }
    }

    clear(root);
    root.appendChild(el);

    if (fieldName) {
      const restored = root.querySelector(`[name="${fieldName}"]`);
      if (restored) {
        restored.focus();
        if (typeof restored.setSelectionRange === "function" && selectionStart !== null) {
          try {
            restored.setSelectionRange(selectionStart, selectionEnd);
          } catch {

          }
        }
      }
    }
  }

  function heartIcon(size = 14, filled = true) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", filled ? "currentColor" : "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M12 21s-7.5-4.6-10-9.1C0.3 8.4 1.7 4.8 5 3.7c2.2-0.7 4.4 0.2 5.6 2C11.6 5.7 12 6 12 6s0.4-0.3 1.4-1.3c1.2-1.8 3.4-2.7 5.6-2C22.3 4.8 23.7 8.4 22 11.9 19.5 16.4 12 21 12 21z",
    );
    svg.appendChild(path);
    return svg;
  }

  function videoAdIcon(size = 16) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", "2");
    rect.setAttribute("y", "4");
    rect.setAttribute("width", "20");
    rect.setAttribute("height", "14");
    rect.setAttribute("rx", "2");

    const tri = document.createElementNS(ns, "polygon");
    tri.setAttribute("points", "9.5,8.5 9.5,15.5 16,12");
    tri.setAttribute("fill", "currentColor");
    tri.setAttribute("stroke", "none");

    const stand = document.createElementNS(ns, "line");
    stand.setAttribute("x1", "8");
    stand.setAttribute("y1", "20");
    stand.setAttribute("x2", "16");
    stand.setAttribute("y2", "20");
    svg.appendChild(rect);
    svg.appendChild(tri);
    svg.appendChild(stand);
    return svg;
  }

  function buildCrestSvg(size, bg, border, emoji) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 100 100");
    const shield = document.createElementNS("http://www.w3.org/2000/svg", "path");

    shield.setAttribute(
      "d",
      "M50 4 L90 16 V48 C90 74 72 90 50 97 C28 90 10 74 10 48 V16 Z",
    );
    shield.setAttribute("fill", bg);
    shield.setAttribute("stroke", border);
    shield.setAttribute("stroke-width", "4");
    svg.appendChild(shield);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "50");
    text.setAttribute("y", "58");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "38");
    text.textContent = emoji;
    svg.appendChild(text);
    return svg;
  }

  function drawCrestOnCanvas(ctx, x, y, size, bg, border, emoji) {
    const scale = size / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(50, 4);
    ctx.lineTo(90, 16);
    ctx.lineTo(90, 48);
    ctx.bezierCurveTo(90, 74, 72, 90, 50, 97);
    ctx.bezierCurveTo(28, 90, 10, 74, 10, 48);
    ctx.lineTo(10, 16);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.font = "38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(emoji, 50, 58);
    ctx.restore();
  }

  const STEP_DEFS = [
    { id: "preferences", label: "Prefs" },
    { id: "quiz", label: "Experts" },
    { id: "altar", label: "Altar" },
    { id: "honeymoon", label: "Moon" },
    { id: "decision", label: "D-Day" },
  ];
  const PHASE_ORDER = [
    "intro", "preferences", "quiz", "matching", "altar",
    "honeymoon", "dumped", "decision", "blindsided", "divorceReaction", "ending", "family",
  ];

  const SIDE_PHASE_LABELS = {
    single: "✈ Solo Adventure",
    album: "📖 Wedding Album",
    achievements: "🏆 Achievements",
  };

  function renderTopBar(state, game) {
    const sideLabel = SIDE_PHASE_LABELS[state.phase];
    const left = sideLabel
      ? h("div", { class: "eyebrow" }, [sideLabel])
      : h(
          "div",
          { class: "step-track" },
          STEP_DEFS.map((s) => {
            const active = PHASE_ORDER.indexOf(state.phase) >= PHASE_ORDER.indexOf(s.id);
            return h("span", { class: "step-pill" + (active ? " active" : "") }, [s.label]);
          }),
        );

    const soundBtn = h(
      "button",
      {
        class: "icon-btn",
        "aria-label": state.soundOn ? "Mute sound & music" : "Enable sound & music",
        title: state.soundOn ? "Mute sound & music" : "Enable sound & music",
        onclick: () => {
          const next = !state.soundOn;
          sfx.setEnabled(next);
          game.setSoundOn(next);
        },
      },
      [state.soundOn ? "🔊" : "🔇"],
    );

    return h("div", { class: "top-bar" }, [left, soundBtn]);
  }

  function renderIntro(state, game) {
    const nameInput = h("input", {
      type: "text",
      name: "intro-name",
      class: "input-hero",
      placeholder: "Your first name",
      value: state.name,
      oninput: (e) => game.setName(e.target.value),
      onkeydown: (e) => {
        if (e.key === "Enter" && state.name.trim()) {
          sfx.select();
          game.goToPhase("preferences");
        }
      },
    });

    const submitBtn = h(
      "button",
      {
        class: "btn btn-primary mt-2",
        disabled: !state.name.trim(),
        onclick: () => {
          sfx.select();
          game.goToPhase("preferences");
        },
      },
      ["Apply for the experiment →"],
    );

    const pointsLine = state.points > 0
      ? h("div", { class: "tiny muted mt-1" }, [
          "You have ",
          h("strong", { class: "accent-text" }, [String(state.points)]),
          " growth points.",
        ])
      : null;

    const unlockedCount = game.getAchievements().filter((a) => a.unlocked).length;
    const totalCount = game.getAchievements().length;
    const savedCount = game.getSavedWeddings().length;

    const achievementsBtn = h(
      "button",
      {
        class: "btn btn-outline",
        onclick: () => {
          sfx.click();
          game.goToPhase("achievements");
        },
      },
      [`🏆 Achievements (${unlockedCount}/${totalCount})`],
    );

    const albumBtn = h(
      "button",
      {
        class: "btn btn-outline",
        onclick: () => {
          sfx.click();
          game.goToPhase("album");
        },
      },
      [savedCount > 0 ? `📖 Wedding Album (${savedCount})` : "📖 Wedding Album"],
    );

    return h("div", { class: "text-center" }, [
      h("div", { class: "badge" }, ["✨ A Social Experiment"]),
      h("h1", { class: "mt-2" }, [
        "The Marriage ",
        h("span", { class: "accent-text" }, ["Experiment!"]),
      ]),
      h("p", { class: "small muted mt-1" }, [
        "Tell the experts who you are. Meet a stranger at the altar. Decide if it's forever.",
      ]),
      pointsLine,
      h("div", { class: "mt-2" }, [nameInput]),
      submitBtn,
      h("div", { class: "btn-row-2 mt-2" }, [achievementsBtn, albumBtn]),
    ]);
  }

  function buildCountryOptions(selectedCountry) {
    const isAnywhere = selectedCountry === ANYWHERE_COUNTRY;
    const options = [
      h("option", { value: "anywhere", selected: isAnywhere || !selectedCountry }, ["🌍 Anywhere (skip country matching)"]),
    ];
    COUNTRIES.forEach((country) => {
      options.push(
        h("option", { value: country, selected: !isAnywhere && selectedCountry === country }, [country]),
      );
    });
    return options;
  }

  function renderPrefsStepAbout(state, game) {
    const nameInput = h("input", {
      type: "text",
      name: "prefs-name",
      placeholder: "First name",
      value: state.name,
      oninput: (e) => game.setName(e.target.value),
    });

    const ageValueEl = h("span", {}, [String(state.age)]);

    const ageInput = h("input", {
      type: "range",
      name: "prefs-age",
      min: CONFIG.MIN_AGE,
      max: CONFIG.MAX_AGE,
      value: state.age,

      oninput: (e) => {
        ageValueEl.textContent = e.target.value;
      },
      onchange: (e) => game.setAge(parseInt(e.target.value, 10)),
    });

    const genderGrid = h(
      "div",
      { class: "choice-grid" },
      GENDERS.map((g) =>
        h(
          "button",
          {
            class: "chip" + (state.gender === g.id ? " active" : ""),
            onclick: () => {
              sfx.click();
              game.setGender(g.id);
            },
          },
          [g.label],
        ),
      ),
    );

    const orientationGrid = h(
      "div",
      { class: "choice-grid-6" },
      ORIENTATIONS.map((o) =>
        h(
          "button",
          {
            class: "chip" + (state.orientation === o.id ? " active" : ""),
            onclick: () => {
              sfx.click();
              game.setOrientation(o.id);
            },
          },
          [o.label],
        ),
      ),
    );

    const countryPicker = h(
      "select",
      {
        name: "prefs-country",
        class: "city-select",
        onchange: (e) => {
          sfx.click();
          const value = e.target.value;
          game.setPlayerCountry(value === "anywhere" ? ANYWHERE_COUNTRY : value);
        },
      },
      buildCountryOptions(state.playerCountry),
    );

    const nextBtn = h(
      "button",
      {
        class: "btn btn-primary mt-3",
        disabled: !state.name.trim(),
        onclick: () => {
          sfx.select();
          game.setPrefsStep(1);
        },
      },
      ["Next — what you want →"],
    );

    return h("div", {}, [
      h("div", { class: "eyebrow text-center" }, ["👤 About you · 1 / 2"]),
      h("h2", { class: "text-center mt-1" }, ["Tell the experts about yourself"]),
      h("div", { class: "grid-2 mt-2" }, [
        h("label", { class: "field" }, [
          h("span", { class: "field-label" }, ["Name"]),
          nameInput,
        ]),
        h("label", { class: "field" }, [
          h("span", { class: "field-label" }, ["Age (", ageValueEl, ")"]),
          ageInput,
        ]),
      ]),
      h("div", { class: "mt-2" }, [
        h("div", { class: "small", style: "font-weight:600;margin-bottom:0.25rem" }, ["Gender"]),
        genderGrid,
      ]),
      h("div", { class: "mt-2" }, [
        h("div", { class: "small", style: "font-weight:600;margin-bottom:0.25rem" }, ["Orientation"]),
        orientationGrid,
      ]),
      h("div", { class: "mt-2" }, [
        h("label", { class: "field" }, [
          h("span", { class: "field-label" }, ["📍 Your country"]),
          countryPicker,
        ]),
        h("p", { class: "tiny muted mt-1" }, [
          "The experts only match within your country.",
        ]),
      ]),
      nextBtn,
    ]);
  }

  function renderPrefsStepWant(state, game) {
    const religionGrid = h(
      "div",
      { class: "choice-grid" },
      RELIGIONS.map((r) =>
        h(
          "button",
          {
            class: "chip" + (state.religion === r.id ? " active" : ""),
            onclick: () => {
              sfx.click();
              game.setReligion(r.id);
            },
          },
          [r.label],
        ),
      ),
    );

    const traitCount = h("span", {
      class: "tiny" + (state.desiredTraits.length === CONFIG.MAX_DESIRED_TRAITS ? " accent-text" : " muted"),
      style: "font-weight:700",
    }, [`${state.desiredTraits.length}/${CONFIG.MAX_DESIRED_TRAITS}`]);

    const traitGrid = h(
      "div",
      { class: "choice-grid" },
      CHARACTER_TRAITS.map((t) => {
        const on = state.desiredTraits.includes(t.id);
        const atMax = state.desiredTraits.length >= CONFIG.MAX_DESIRED_TRAITS && !on;
        return h(
          "button",
          {
            class: "chip" + (on ? " active" : ""),
            disabled: atMax,
            onclick: () => {
              sfx.click();
              game.toggleTrait(t.id);
            },
          },
          [t.emoji + " " + t.label],
        );
      }),
    );

    const backBtn = h(
      "button",
      {
        class: "btn btn-outline",
        onclick: () => {
          sfx.click();
          game.setPrefsStep(0);
        },
      },
      ["← Back"],
    );

    const continueBtn = h(
      "button",
      {
        class: "btn btn-primary",
        disabled: state.desiredTraits.length === 0,
        onclick: () => {
          sfx.select();
          game.goToPhase("quiz");
        },
      },
      ["Continue to Experts →"],
    );

    return h("div", {}, [
      h("div", { class: "eyebrow text-center" }, ["Partner preferences · 2 / 2"]),
      h("h2", { class: "text-center mt-1" }, ["Who should the experts find?"]),
      h("div", { class: "mt-2" }, [
        h("div", { class: "small", style: "font-weight:600;margin-bottom:0.25rem" }, [
          "What religion would you prefer your partner to have?",
        ]),
        religionGrid,
      ]),
      h("div", { class: "mt-2" }, [
        h("div", { class: "row-between mb-1" }, [
          h("div", { class: "small", style: "font-weight:600" }, [
            "Traits you want ",
            h("span", { class: "muted" }, ["(1–3)"]),
          ]),
          traitCount,
        ]),
        traitGrid,
      ]),
      h("div", { class: "btn-row-2 mt-3" }, [backBtn, continueBtn]),
    ]);
  }

  function renderPreferences(state, game) {
    return state.prefsStep === 0 ? renderPrefsStepAbout(state, game) : renderPrefsStepWant(state, game);
  }

  function renderQuiz(state, game) {
    const quiz = game.getQuiz();
    const current = quiz[state.qIndex];

    const options = h(
      "div",
      { class: "option-list mt-2" },
      current.opts.map((opt) =>
        h(
          "button",
          {
            class: "option-btn",
            onclick: () => {
              sfx.click();
              const wasLast = state.qIndex + 1 >= quiz.length;
              game.answerQuizQuestion(opt.trait, opt.weight);
              if (wasLast) sfx.match();
            },
          },
          [opt.label],
        ),
      ),
    );

    const progressPct = ((state.qIndex + 1) / quiz.length) * 100;

    const backBtn = state.qIndex > 0
      ? h("div", { class: "text-center mt-1" }, [
          h(
            "button",
            {
              class: "btn btn-outline",
              style: "width:auto;padding:0.35rem 0.75rem;font-size:0.72rem;min-height:0",
              onclick: () => {
                sfx.click();
                game.undoQuizAnswer();
              },
            },
            ["← Change your last answer"],
          ),
        ])
      : null;

    return h("div", {}, [
      h("div", { class: "eyebrow text-center" }, [`Experts' Interview · ${state.qIndex + 1} / ${quiz.length}`]),
      h("h2", { class: "text-center mt-1" }, [current.q]),
      options,
      backBtn,
      h("div", { class: "progress-track mt-2" }, [
        h("div", { class: "progress-fill", style: `width:${progressPct}%` }),
      ]),
      h("div", { class: "tiny muted text-center mt-1" }, ["Fresh questions every session."]),
    ]);
  }

  function renderMatching() {
    const floatingHearts = Array.from({ length: 8 }).map((_, i) => {
      const el = h("div", { class: "floating-heart" }, [heartIcon(10 + (i % 4) * 4)]);
      el.style.left = `${20 + (i * 8) % 70}%`;
      el.style.top = `${30 + (i * 13) % 40}%`;
      el.style.animationDelay = `${i * 0.15}s`;
      return el;
    });

    return h("div", { class: "matching-wrap" }, [
      h("div", { class: "matching-orb" }, [
        h("div", { class: "matching-ring" }),
        h("div", { class: "matching-ring delay" }),
        h("div", { class: "matching-core" }, [heartIcon(40)]),
      ]),
      ...floatingHearts,
      h("p", { class: "mt-2", style: "font-weight:600" }, ["The experts are deliberating…"]),
      h("p", { class: "tiny muted" }, ["Cross-referencing 1,247 markers"]),
    ]);
  }

  function renderAltar(state, game) {
    const match = game.getMatch();
    const partnerTraitMeta = CHARACTER_TRAITS.find((t) => t.id === match.partnerTrait);
    const partnerTraitLabel = partnerTraitMeta ? `${partnerTraitMeta.emoji} ${partnerTraitMeta.label}` : match.partnerTrait;
    const partnerGenderLabel = GENDERS.find((g) => g.id === match.bio.gender)?.label ?? match.bio.gender;

    const matchCard = h("div", { class: "match-card mt-2" }, [
      h("div", { class: "match-header" }, [
        h("span", { style: "font-size:1.6rem" }, ["💎"]),
        h("div", {}, [
          h("div", { class: "match-name" }, [`${match.bio.name}, ${match.bio.age}`]),
          h("div", { class: "match-tagline" }, [match.bio.oneLiner]),
        ]),
      ]),
      h("div", { class: "match-details" }, [
        h("div", {}, [
          h("span", { style: "opacity:.75" }, ["From: "]),
          match.bio.country,
        ]),
        h("div", {}, [h("span", { style: "opacity:.75" }, ["Gender: "]), partnerGenderLabel]),
        h("div", {}, [h("span", { style: "opacity:.75" }, ["Core trait: "]), partnerTraitLabel]),
        h("div", { class: "span-2" }, [h("span", { style: "opacity:.75" }, ["Family: "]), match.bio.family]),
        match.bio.cultureNote
          ? h("div", { class: "span-2" }, [h("span", { style: "opacity:.75" }, ["🌍 "]), match.bio.cultureNote])
          : null,
        h("div", { class: "span-2" }, [h("span", { style: "opacity:.75" }, ["Past: "]), match.bio.heartbreak]),
        h("div", { class: "span-2" }, [h("span", { style: "opacity:.75" }, ["Hopes for: "]), match.bio.hope]),
        h("div", { class: "span-2 match-flags" }, [
          h("div", {}, ["💚 ", h("span", { style: "opacity:.9" }, ["Green flag: "]), match.bio.greenFlag]),
          h("div", {}, ["🚩 ", h("span", { style: "opacity:.9" }, ["Red flag: "]), match.bio.redFlag]),
        ]),
      ]),
    ]);

    const vowGrid = h(
      "div",
      { class: "vow-grid" },
      VOWS.map((v) => {
        const on = state.chosenVow?.id === v.id;
        return h(
          "button",
          {
            class: "vow-card" + (on ? " active" : ""),
            onclick: () => {
              sfx.click();
              game.setChosenVow(v);
            },
          },
          [
            h("div", { class: "vow-title" }, [v.label]),
            h("div", { class: "vow-line" }, [`"${v.line}"`]),
          ],
        );
      }),
    );

    const runAwayBtn = h(
      "button",
      {
        class: "btn btn-danger-outline",
        onclick: () => {
          sfx.bad();
          game.runAway();
        },
      },
      ["Run away"],
    );

    const iDoBtn = h(
      "button",
      {
        class: "btn btn-primary",
        disabled: !state.chosenVow,
        onclick: () => {
          sfx.vow();
          game.sayIDo();
        },
      },
      ["I do 💍"],
    );

    return h("div", {}, [
      h("div", { class: "eyebrow text-center" }, ["👑 The Altar"]),
      h("h2", { class: "text-center mt-1" }, ["Meet your match"]),
      matchCard,
      h("p", { class: "tiny muted text-center mt-1" }, [
        "Baseline compatibility: ",
        h("strong", { style: "color:var(--color-text)" }, [`${match.baseCompat}%`]),
      ]),
      h("div", { class: "mt-2" }, [
        h("div", { class: "small", style: "font-weight:600;margin-bottom:0.25rem" }, ["Choose your vows"]),
        vowGrid,
      ]),
      h("div", { class: "btn-row-2 mt-2" }, [runAwayBtn, iDoBtn]),
    ]);
  }

  function deltaBadge(delta) {
    return typeof delta === "number"
      ? h("span", { class: "msg-delta " + (delta >= 0 ? "positive" : "negative") }, [
          (delta >= 0 ? "+" : "") + delta + "%",
        ])
      : null;
  }

  function watchAdThen(game, onSuccess) {
    game.setRewardedAdLoading(true);
    showRewardedAd().then((result) => {
      if (result.success) {
        sfx.match();
        onSuccess();
      } else {
        sfx.bad();
        const msg = result.reason === "busy"
          ? "A video is already playing."
          : "No video is available right now. Try again later.";
        game.setRewardedAdMessage(msg);
      }
    });
  }

  function renderHoneymoon(state, game) {
    const dates = game.getDates();
    const date = dates[state.dateIndex];
    const match = game.getMatch();
    const isLoading = state.rewardedAdLoading;

    const affectionReadout = h("div", { class: "affection-readout" }, [
      heartIcon(12, true),
      ` ${state.affection}%`,
    ]);

    const header = h("div", { class: "row-between mb-1" }, [
      h("div", { class: "tiny muted" }, [`Date ${state.dateIndex + 1}/${dates.length}`]),
      affectionReadout,
    ]);

    const progress = h("div", { class: "progress-track mb-2" }, [
      h("div", {
        class: "progress-fill",
        style: `width:${Math.max(0, Math.min(100, state.affection))}%`,
      }),
    ]);

    const sceneBanner = h("div", { class: "scene-banner" }, [
      h("div", { class: "scene-title" }, [`${date.emoji} ${date.title}`]),
    ]);

    const transcriptEl = h("div", { class: "transcript" }, []);
    state.transcript.forEach((line) => {
      if (line.moment) {

        const tag = line.tone === "negative" ? "👀 Getting to know them" : "✨ Signature move";
        transcriptEl.appendChild(
          h("div", { class: "msg-row" }, [
            h("div", { class: "avatar" }, [match.bio.name[0]]),
            h("div", { class: "msg-col" }, [
              h("div", { class: "moment-tag" + (line.tone === "negative" ? " dealbreaker-reveal" : "") }, [tag]),
              h("div", { class: "bubble partner" + (line.tone === "negative" ? " dealbreaker" : " fun") }, [line.text]),
            ]),
          ]),
        );
      } else if (line.who === "partner") {
        transcriptEl.appendChild(
          h("div", { class: "msg-row" }, [
            h("div", { class: "avatar" }, [match.bio.name[0]]),
            h("div", { class: "msg-col" }, [
              h("div", { class: "msg-meta" }, [match.bio.name, deltaBadge(line.delta)]),
              h("div", { class: "bubble partner" }, [line.text]),
            ]),
          ]),
        );
      } else {
        transcriptEl.appendChild(
          h("div", { class: "msg-row from-you" }, [
            h("div", { class: "msg-col align-right" }, [
              h("div", { class: "msg-meta" }, ["You", deltaBadge(line.delta)]),
              h("div", { class: "bubble you" }, [line.text]),
            ]),
          ]),
        );
      }
    });

    let decisionBlock;

    if (state.honeymoonStep === "reply") {
      const optionsList = h(
        "div",
        { class: "option-list" },
        date.replies.map((opt) => {
          const isRewarded = !!opt.rewarded;
          return h(
            "button",
            {
              class: "option-btn" + (isRewarded ? " option-btn-rewarded" : ""),
              disabled: isLoading,
              onclick: () => {
                if (isLoading) return;
                if (isRewarded) {
                  watchAdThen(game, () => game.useRewardedReply());
                  return;
                }
                game.chooseDateReply(opt);
                if (opt.delta >= 0) sfx.heart();
                else sfx.bad();
              },
            },
            isRewarded
              ? [videoAdIcon(14), " ", isLoading ? "Loading video…" : opt.label]
              : [opt.label],
          );
        }),
      );
      decisionBlock = h("div", { class: "reply-section" }, [
        h("div", { class: "eyebrow mb-1" }, ["Your reply"]),
        optionsList,
        state.rewardedAdMessage ? h("div", { class: "rewarded-msg" }, [state.rewardedAdMessage]) : null,
      ]);
    } else if (state.honeymoonStep === "question") {
      const optionsList = h(
        "div",
        { class: "option-list" },
        date.questions.map((opt) => {
          const isRewarded = !!opt.rewarded;
          return h(
            "button",
            {
              class: "option-btn" + (isRewarded ? " option-btn-rewarded" : ""),
              disabled: isLoading,
              onclick: () => {
                if (isLoading) return;
                if (isRewarded) {
                  watchAdThen(game, () => game.useRewardedQuestion());
                  return;
                }
                game.chooseDateQuestion(opt);
                sfx.select();
              },
            },
            isRewarded
              ? [videoAdIcon(14), " ", isLoading ? "Loading video…" : opt.label]
              : [opt.label],
          );
        }),
      );
      decisionBlock = h("div", { class: "reply-section" }, [
        h("div", { class: "eyebrow mb-1" }, [date.questionPrompt]),
        optionsList,
        state.rewardedAdMessage ? h("div", { class: "rewarded-msg" }, [state.rewardedAdMessage]) : null,
      ]);
    } else {
      const isLastDate = state.dateIndex + 1 >= dates.length;
      decisionBlock = h("div", { class: "reply-section text-center" }, [
        h(
          "button",
          {
            class: "btn btn-primary",
            style: "width:auto;padding-left:1.4rem;padding-right:1.4rem;display:inline-flex",
            onclick: () => {
              sfx.select();
              game.continueDate();
            },
          },
          [isLastDate ? "Head to Decision Day →" : "Continue to next date →"],
        ),
      ]);
    }

    const wrap = h("div", {}, [header, progress, sceneBanner, transcriptEl, decisionBlock]);

    requestAnimationFrame(() => {
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
    });

    return wrap;
  }

  function renderDumped(state, game) {
    const match = game.getMatch();
    return h("div", { class: "text-center" }, [
      h("div", { class: "result-emoji" }, ["💔"]),
      h("h2", {}, [`${match.bio.name} filed for divorce`]),
      h("p", { class: "small muted mt-1", style: "font-style:italic" }, [
        `"I'm sorry, ${state.name || "love"}. I tried. I can't do this anymore." — ${match.bio.name}`,
      ]),
      h("div", { class: "result-card" }, [
        h("div", { class: "eyebrow" }, ["The Experts Say"]),
        h("p", { class: "small mt-1", style: "color:var(--color-text)" }, [
          "Final affection landed at ",
          h("strong", { class: "accent-text" }, [`${state.affection}%`]),
          ` — below the ${CONFIG.PARTNER_LEAVE_THRESHOLD}% line. They walked. It's okay. Heal first.`,
        ]),
      ]),
      h(
        "button",
        {
          class: "btn btn-primary",
          style: "width:auto;padding-left:1.4rem;padding-right:1.4rem;display:inline-flex",
          onclick: () => {
            sfx.click();
            game.goToPhase("single");
          },
        },
        ["Start the solo journey →"],
      ),
    ]);
  }

  function renderDecision(state, game) {
    const match = game.getMatch();
    return h("div", { class: "text-center" }, [
      h("div", { class: "eyebrow" }, ["📅 Decision Day"]),
      h("h2", { class: "mt-1" }, ["Eight weeks later…"]),
      h("p", { class: "small muted mt-1" }, [
        "You and ",
        h("strong", { style: "color:var(--color-text)" }, [match.bio.name]),
        " stand across from each other.",
      ]),
      h("div", { class: "mt-3 mb-1" }, [
        h("div", { class: "big-stat" }, [`${state.affection}%`]),
        h("div", { class: "tiny muted" }, ["final affection"]),
      ]),
      h("p", { class: "small", style: "font-weight:600" }, ["Do you stay married?"]),
      h("div", { class: "btn-row-2 mt-2" }, [
        h(
          "button",
          {
            class: "btn btn-danger-outline",
            onclick: () => {
              sfx.whoosh();
              game.chooseDivorce();
            },
          },
          ["Divorce"],
        ),
        h(
          "button",
          {
            class: "btn btn-primary",
            onclick: () => {
              game.chooseStayTogether();

              if (game.getState().phase === "blindsided") sfx.bad();
              else sfx.good();
            },
          },
          ["Stay together"],
        ),
      ]),
    ]);
  }

  function renderBlindsided(state, game) {
    const match = game.getMatch();
    return h("div", { class: "text-center" }, [
      h("div", { class: "result-emoji" }, ["⚡"]),
      h("h2", {}, [`${match.bio.name} calls it off`]),
      h("p", { class: "small muted mt-1", style: "font-style:italic" }, [
        `"I know I said I would. I know we both did. I just froze up at the last second — I can't sign the papers. I'm so sorry, ${state.name || "love"}." — ${match.bio.name}`,
      ]),
      h("div", { class: "result-card" }, [
        h("div", { class: "eyebrow" }, ["The Experts Say"]),
        h("p", { class: "small mt-1", style: "color:var(--color-text)" }, [
          "Nobody saw this coming — not even the experts. At ",
          h("strong", { class: "accent-text" }, [`${state.affection}%`]),
          ", this was supposed to be a happy ending. Sometimes even a great match gets cold feet at the finish line.",
        ]),
      ]),
      h(
        "button",
        {
          class: "btn btn-primary",
          style: "width:auto;padding-left:1.4rem;padding-right:1.4rem;display:inline-flex",
          onclick: () => {
            sfx.click();
            game.goToPhase("single");
          },
        },
        ["Start the solo journey →"],
      ),
    ]);
  }

  function renderDivorceReaction(state, game) {
    const reaction = state.divorceReaction;
    if (!reaction) {

      return h("div", { class: "text-center" }, [
        h(
          "button",
          { class: "btn btn-primary", onclick: () => { sfx.click(); game.goToPhase("single"); } },
          ["Start the solo journey →"],
        ),
      ]);
    }
    return h("div", { class: "text-center" }, [
      h("div", { class: "divorce-reaction-card divorce-effect-" + reaction.effect, style: `--reaction-tint:${reaction.tint}` }, [
        h("div", { class: "divorce-reaction-emoji" }, [reaction.emoji]),
        reaction.effect === "cry" ? h("div", { class: "divorce-tears" }, [
          h("span", {}, ["💧"]), h("span", {}, ["💧"]), h("span", {}, ["💧"]),
        ]) : null,
      ]),
      h("h2", { class: "mt-2" }, ["Their reaction..."]),
      h("p", { class: "small mt-1", style: "font-style:italic" }, [reaction.text]),
      h(
        "button",
        {
          class: "btn btn-primary mt-3",
          style: "width:auto;padding-left:1.4rem;padding-right:1.4rem;display:inline-flex",
          onclick: () => {
            sfx.click();
            game.goToPhase("single");
          },
        },
        ["Start the solo journey →"],
      ),
    ]);
  }

  function renderEnding(state, game) {
    const verdict = game.getVerdict();
    const match = game.getMatch();
    const stayed = state.decision === "stay";
    const isLoading = state.rewardedAdLoading;

    const futureLabel = stayed
      ? "📺 Watch video — Fast-forward 5 years"
      : "📺 Watch video — See where you are in 5 years";

    const futureBtn = h(
      "button",
      {
        class: "btn btn-primary rewarded-cta" + (isLoading ? " rewarded-loading" : ""),
        disabled: isLoading,
        onclick: () => {
          if (isLoading) return;
          game.setRewardedAdLoading(true);
          showRewardedAd().then((result) => {
            if (result.success) {
              sfx.good();
              game.unlockFamilyEpilogue();
            } else {
              game.setRewardedAdMessage(
                result.reason === "busy"
                  ? "A video is already playing."
                  : "No video is available right now. Try again later.",
              );
            }
          });
        },
      },
      isLoading
        ? [videoAdIcon(16), " Loading video…"]
        : [videoAdIcon(16), " ", futureLabel],
    );

    return h("div", { class: "text-center" }, [
      h("div", { class: "result-emoji" }, [verdict.emoji]),
      h("h2", { style: "font-size:1.4rem" }, [verdict.title]),
      h("p", { class: "small muted mt-1", style: "font-style:italic" }, [`"${verdict.msg}"`]),
      h("div", { class: "result-card" }, [
        h("div", { class: "eyebrow" }, ["The Experts Say"]),
        h("p", { class: "small mt-1", style: "color:var(--color-text)" }, [
          `${state.name || "You"} & ${match.bio.name} — `,
          h("strong", { class: "accent-text" }, [`${state.affection}% compatible`]),
          ". ",
          state.affection >= 70 ? "A success story." : "Brave to choose love anyway.",
        ]),
      ]),
      h("div", { class: "result-card", style: "margin-top:0.5rem" }, [
        h("div", { class: "eyebrow" }, [stayed ? "See your future together" : "Where are you now?"]),
        h("p", { class: "small mt-1", style: "color:var(--color-text-muted)" }, [
          stayed
            ? "Discover where you live, whether you started a family, what pets you adopted and what happened to your relationship."
            : "Find out where life took you after this experiment — it might surprise you.",
        ]),
        h("div", { class: "mt-2" }, [futureBtn]),
        state.rewardedAdMessage
          ? h("div", { class: "rewarded-msg mt-1" }, [state.rewardedAdMessage])
          : null,
      ]),
      h("div", { class: "btn-row-2 mt-2" }, [
        h(
          "button",
          {
            class: "btn btn-primary",
            onclick: () => {
              sfx.click();
              game.reset(true);
            },
          },
          ["✨ Apply for a New Experiment"],
        ),
        h(
          "button",
          {
            class: "btn btn-outline",
            onclick: () => {
              sfx.click();
              game.goToPhase("album");
            },
          },
          ["📖 View Wedding Album"],
        ),
      ]),
      h(
        "button",
        {
          class: "btn btn-outline mt-2",
          onclick: () => {
            sfx.click();
            game.goToPhase("intro");
          },
        },
        ["🏠 Back to menu"],
      ),
    ]);
  }

  function downloadFamilyPhoto(state, match, family) {
    const W = 800;
    const H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#fdf2f6");
    bgGrad.addColorStop(1, "#fbe0ea");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const pad = 48;
    const cardX = pad;
    const cardY = 110;
    const cardW = W - pad * 2;
    const cardH = H - cardY - pad;
    const radius = 28;
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, radius);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY, radius);
    ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
    ctx.closePath();
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardGrad.addColorStop(0, "#f0789e");
    cardGrad.addColorStop(1, "#e0457b");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.fillStyle = "#3a1f2b";
    ctx.textAlign = "center";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("Five years later", W / 2, 60);

    drawCrestOnCanvas(ctx, W / 2 - 60, cardY + 30, 120, state.crestBg, state.crestBorder, state.crestEmoji);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`${state.name || "You"} & ${match.bio.name}`, W / 2, cardY + 210);

    ctx.font = "22px sans-serif";
    ctx.textAlign = "left";
    const lines = [
      `🏠  You live in ${family.home}.`,
      `${family.kidsEmoji}  ${family.kidsLine}`,
      `💞  ${family.milestone}`,
      `📈  Compatibility today: ${family.compatibilityToday}%`,
    ];
    const lineX = cardX + 36;
    let lineY = cardY + 270;
    lines.forEach((line) => {
      wrapCanvasText(ctx, line, lineX, lineY, cardW - 72, 30);
      lineY += 70;
    });

    ctx.textAlign = "center";
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("The Marriage Experiment!", W / 2, cardY + cardH - 24);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (state.name || "you").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `family-${safeName}-and-${match.bio.name.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let cursorY = y;
    words.forEach((word) => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, cursorY);
  }

  function renderFamily(state, game) {
    const match = game.getMatch();
    const family = game.getFamily();

    const crestPreview = h("div", { class: "crest-preview" }, [
      buildCrestSvg(96, state.crestBg, state.crestBorder, state.crestEmoji),
    ]);

    const emojiPicker = h(
      "div",
      { class: "crest-emoji-grid" },
      CREST_EMOJIS.map((emoji) =>
        h(
          "button",
          {
            class: "chip crest-emoji-btn" + (state.crestEmoji === emoji ? " active" : ""),
            onclick: () => {
              sfx.click();
              game.setCrestEmoji(emoji);
            },
          },
          [emoji],
        ),
      ),
    );

    const colorPicker = h(
      "div",
      { class: "crest-color-grid" },
      CREST_COLORS.map((c) =>
        h("button", {
          class: "crest-color-swatch" + (state.crestBg === c.bg ? " active" : ""),
          style: `background:${c.bg}`,
          title: c.label,
          "aria-label": c.label,
          onclick: () => {
            sfx.click();

            game.setCrestColors(c.bg, state.crestBorder);
          },
        }),
      ),
    );

    const borderPicker = h(
      "div",
      { class: "crest-color-grid" },
      (CREST_BORDERS || []).map((b) =>
        h("button", {
          class: "crest-color-swatch crest-border-swatch" + (state.crestBorder === b.border ? " active" : ""),
          style: `background:${b.border};border:2px solid ${state.crestBg}`,
          title: b.label,
          "aria-label": b.label,
          onclick: () => {
            sfx.click();
            game.setCrestColors(state.crestBg, b.border);
          },
        }),
      ),
    );

    const homeStylePicker = h(
      "div",
      { class: "home-style-grid" },
      (HOME_STYLES || []).map((homeOpt) =>
        h(
          "button",
          {
            class: "chip home-style-btn" + (state.homeStyle === homeOpt.id ? " active" : ""),
            title: homeOpt.desc,
            onclick: () => {
              sfx.click();
              game.setHomeStyle(homeOpt.id);
            },
          },
          [homeOpt.emoji + " " + homeOpt.label],
        ),
      ),
    );

    const card = h("div", { class: "result-card-love mt-2" }, [
      h("div", { class: "text-center mb-1" }, [crestPreview]),
      h("div", { class: "text-center", style: "font-size:1.05rem;font-weight:700" }, [
        `${state.name || "You"} & ${match.bio.name}`,
      ]),
      h("ul", { class: "mt-2", style: "margin:0;padding-left:1.1rem;display:grid;gap:0.25rem" }, [
        h("li", {}, ["🏠 You live in ", h("strong", {}, [family.home]), "."]),
        h("li", {}, [family.kidsEmoji + " ", family.kidsLine]),
        h("li", {}, ["💞 ", family.milestone]),
        h("li", {}, ["📈 Compatibility today: ", h("strong", {}, [`${family.compatibilityToday}%`])]),
      ]),
    ]);

    const customizer = h("div", { class: "crest-customizer mt-2" }, [
      h("div", { class: "tiny muted mb-1", style: "font-weight:600;text-align:left" }, ["Customize your family crest"]),
      emojiPicker,
      h("div", { class: "mt-1" }, [colorPicker]),
      h("div", { class: "tiny muted mt-1 mb-1", style: "text-align:left" }, ["Border"]),
      h("div", {}, [borderPicker]),
    ]);

    const homeCustomizer = h("div", { class: "crest-customizer mt-2" }, [
      h("div", { class: "tiny muted mb-1", style: "font-weight:600;text-align:left" }, ["Choose where you live"]),
      homeStylePicker,
    ]);

    const saveBtn = h(
      "button",
      {
        class: "btn btn-outline mt-2",
        onclick: () => {
          sfx.sparkle();
          downloadFamilyPhoto(state, match, family);
        },
      },
      ["📷 Save photo"],
    );

    const saveAlbumBtn = h(
      "button",
      {
        class: "btn btn-outline mt-2",
        disabled: state.weddingSaved,
        onclick: () => {
          sfx.sparkle();
          game.saveWedding();
        },
      },
      [state.weddingSaved ? "✓ Saved to album" : "💾 Save to album"],
    );

    return h("div", { class: "text-center" }, [
      h("div", { class: "eyebrow" }, ["👶 Five years later"]),
      h("h2", { class: "mt-1" }, ["Your family today"]),
      card,
      homeCustomizer,
      customizer,
      h("div", { class: "btn-row-2 mt-2" }, [saveBtn, saveAlbumBtn]),
      h(
        "button",
        {
          class: "btn btn-primary mt-2",
          onclick: () => {
            sfx.click();
            game.reset(true);
          },
        },
        ["↻ Start a new experiment"],
      ),
      h("div", { class: "btn-row-2 mt-2" }, [
        h(
          "button",
          {
            class: "btn btn-outline",
            onclick: () => {
              sfx.click();
              game.goToPhase("intro");
            },
          },
          ["🏠 Back to menu"],
        ),
        h(
          "button",
          {
            class: "btn btn-outline",
            onclick: () => {
              sfx.click();
              game.goToPhase("album");
            },
          },
          ["📖 Wedding Album"],
        ),
      ]),
    ]);
  }

  function renderSingle(state, game) {
    if (state.points >= CONFIG.REPLAY_COST) {
      return h("div", {}, [
        h("div", { class: "progress-track mb-2" }, [h("div", { class: "progress-fill", style: "width:100%" })]),
        h("div", { class: "text-center mt-1" }, [
          h("div", { style: "font-size:2.75rem;margin-bottom:0.2rem" }, ["✨"]),
          h("h2", {}, ["You're ready for love again"]),
          h("p", { class: "small muted mt-1" }, [`${state.points} growth points unlocked. New match incoming.`]),
          h(
            "button",
            {
              class: "btn btn-primary mt-2",
              style: "width:auto;padding-left:1.4rem;padding-right:1.4rem;display:inline-flex",
              onclick: () => {
                sfx.match();
                game.reapplyForExperiment();
              },
            },
            ["↻ Apply again"],
          ),
        ]),
      ]);
    }

    const soloRound = game.getSoloRound();
    const scene = soloRound[state.singleIdx % soloRound.length];
    const progressPct = Math.min(100, (state.points / CONFIG.REPLAY_COST) * 100);

    const replyLine = state.lastSingleReply
      ? h("div", { class: "tiny muted text-center mt-1", style: "font-style:italic" }, [state.lastSingleReply])
      : null;

    const options = h(
      "div",
      { class: "option-list mt-2" },
      scene.options.map((opt) =>
        h(
          "button",
          {
            class: "option-btn",
            onclick: () => {
              sfx.heart();
              game.chooseSoloOption(opt);
            },
          },
          [opt.label],
        ),
      ),
    );

    return h("div", {}, [
      h("div", { class: "row-between mb-1" }, [
        h("div", { class: "accent-text", style: "font-weight:700;display:flex;align-items:center;gap:0.25rem" }, [
          `✨ ${state.points} / ${CONFIG.REPLAY_COST}`,
        ]),
        h("div", { class: "tiny muted" }, [`Scene ${Math.min(state.singleIdx + 1, soloRound.length)} / ${soloRound.length}`]),
      ]),
      h("div", { class: "progress-track mb-2" }, [h("div", { class: "progress-fill", style: `width:${progressPct}%` })]),
      h("h2", { class: "text-center", style: "font-size:1rem" }, [scene.scene]),
      replyLine,
      options,
      h("p", { class: "tiny muted text-center mt-2" }, [
        `🔒 Earn ${CONFIG.REPLAY_COST} growth points to apply again. Fresh scenes every session.`,
      ]),
    ]);
  }

  function renderAchievements(state, game) {
    const achievements = game.getAchievements();
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    const grid = h(
      "div",
      { class: "achievement-grid mt-2" },
      achievements.map((a) =>
        h("div", { class: "achievement-card" + (a.unlocked ? " unlocked" : " locked") }, [
          h("div", { class: "achievement-emoji" }, [a.unlocked ? a.emoji : "🔒"]),
          h("div", { class: "achievement-body" }, [
            h("div", { class: "achievement-label" }, [a.label]),
            h("div", { class: "achievement-desc" }, [a.desc]),
          ]),
        ]),
      ),
    );

    return h("div", {}, [
      h("h2", { class: "text-center mt-1" }, [`${unlockedCount} / ${achievements.length} unlocked`]),
      grid,
      h(
        "button",
        {
          class: "btn btn-outline mt-3",
          onclick: () => {
            sfx.click();
            game.goToPhase("intro");
          },
        },
        ["← Back"],
      ),
    ]);
  }

  function formatSavedDate(ts) {
    try {
      return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function renderAlbum(state, game) {
    const weddings = game.getSavedWeddings();

    const backBtn = h(
      "button",
      {
        class: "btn btn-outline mt-3",
        onclick: () => {
          sfx.click();
          game.goToPhase("intro");
        },
      },
      ["← Back"],
    );

    if (weddings.length === 0) {
      return h("div", { class: "text-center" }, [
        h("h2", { class: "mt-1" }, ["No weddings saved yet"]),
        h("p", { class: "small muted mt-1" }, [
          "Finish a playthrough, watch \"Fast-forward 5 years\", then save it from the Five Years Later screen.",
        ]),
        backBtn,
      ]);
    }

    const cards = weddings.map((w) => {
      const crest = h("div", { class: "crest-preview" }, [
        buildCrestSvg(56, w.crestBg, w.crestBorder, w.crestEmoji),
      ]);
      const familyLines = w.family
        ? [
            h("div", { class: "tiny mt-1" }, [w.family.kidsEmoji + " ", w.family.kidsLine]),
            h("div", { class: "tiny mt-1" }, ["💞 ", w.family.milestone]),
          ]
        : [h("div", { class: "tiny muted mt-1" }, ["Five Years Later wasn't unlocked for this one."])];

      return h("div", { class: "wedding-card mt-2" }, [
        h("div", { class: "row-between" }, [
          crest,
          h(
            "button",
            {
              class: "icon-btn",
              "aria-label": "Delete this saved wedding",
              title: "Delete this saved wedding",
              onclick: () => {
                sfx.click();
                game.deleteSavedWedding(w.id);
              },
            },
            ["🗑"],
          ),
        ]),
        h("div", { class: "text-center", style: "font-weight:700;font-size:0.95rem" }, [
          `${w.playerName} & ${w.partnerName}`,
        ]),
        h("div", { class: "text-center tiny muted" }, [formatSavedDate(w.savedAt)]),
        h("div", { class: "text-center mt-1" }, [
          `${w.verdictEmoji} ${w.verdictTitle} — `,
          h("strong", {}, [`${w.affection}%`]),
        ]),
        h("div", { class: "tiny muted text-center mt-1" }, [w.partnerOneLiner]),
        h("div", { class: "tiny text-center mt-1" }, [`Vows: ${w.vowLabel}`]),
        ...familyLines,
      ]);
    });

    return h("div", {}, [
      h("h2", { class: "text-center mt-1" }, [
        `${weddings.length} saved wedding${weddings.length === 1 ? "" : "s"}`,
      ]),
      ...cards,
      backBtn,
    ]);
  }

  function getToastLayer() {
    let layer = document.getElementById("achievement-toast-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "achievement-toast-layer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function showAchievementToast(achievement) {
    const toast = h("div", { class: "achievement-toast" }, [
      h("div", { class: "achievement-toast-emoji" }, [achievement.emoji]),
      h("div", {}, [
        h("div", { class: "achievement-toast-title" }, ["Achievement unlocked"]),
        h("div", { class: "achievement-toast-label" }, [achievement.label]),
      ]),
    ]);
    getToastLayer().appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  const RENDERERS = {
    intro: renderIntro,
    preferences: renderPreferences,
    quiz: renderQuiz,
    matching: (state) => renderMatching(state),
    altar: renderAltar,
    honeymoon: renderHoneymoon,
    dumped: renderDumped,
    decision: renderDecision,
    blindsided: renderBlindsided,
    divorceReaction: renderDivorceReaction,
    ending: renderEnding,
    family: renderFamily,
    single: renderSingle,
    achievements: renderAchievements,
    album: renderAlbum,
  };

  let lastRenderedPhase = null;

  function render(root, state, game) {
    let card = root.querySelector(".app-card");
    if (!card || state.phase !== lastRenderedPhase) {
      const freshCard = h("section", { class: "app-card" });
      if (card) card.replaceWith(freshCard);
      else root.appendChild(freshCard);
      card = freshCard;
      lastRenderedPhase = state.phase;
    }

    const content = document.createDocumentFragment();
    content.appendChild(renderTopBar(state, game));
    content.appendChild(RENDERERS[state.phase](state, game));
    mount(card, content);

    if (state.recentlyUnlocked && state.recentlyUnlocked.length > 0) {
      const achievements = game.getAchievements();
      state.recentlyUnlocked.forEach((id) => {
        const a = achievements.find((x) => x.id === id);
        if (a) showAchievementToast(a);
      });
      game.acknowledgeAchievements();
    }
  }

  const BG_HEART_COLORS = ["#f0a8c0", "#e0457b", "#8a2142", "#d4af78"];

  function renderBackgroundHearts(container) {
    const COUNT = 16;
    for (let i = 0; i < COUNT; i++) {

      const roll = Math.random();
      const layer = roll < 0.4 ? "back" : roll < 0.75 ? "mid" : "front";
      const size = layer === "back" ? 10 + Math.random() * 8
        : layer === "mid" ? 16 + Math.random() * 10
        : 22 + Math.random() * 14;
      const maxOpacity = layer === "back" ? 0.08 + Math.random() * 0.06
        : layer === "mid" ? 0.14 + Math.random() * 0.08
        : 0.2 + Math.random() * 0.1;
      const duration = layer === "back" ? 20 + Math.random() * 8
        : layer === "mid" ? 14 + Math.random() * 6
        : 9 + Math.random() * 5;
      const blur = layer === "back" ? 1.5 + Math.random() * 1.5
        : layer === "mid" ? Math.random() * 0.8
        : 0;
      const glow = layer === "front" && Math.random() < 0.6 ? 3 + Math.random() * 4 : 0;

      const el = h("div", { class: "bg-heart" }, [heartIcon(1)]);
      el.style.setProperty("--x", `${Math.random() * 96}%`);
      el.style.setProperty("--y-start", `${-15 - Math.random() * 25}`);
      el.style.setProperty("--size", `${size}px`);
      el.style.setProperty("--max-opacity", maxOpacity.toFixed(2));
      el.style.setProperty("--duration", `${duration.toFixed(1)}s`);
      el.style.setProperty("--delay", `${(-Math.random() * duration).toFixed(1)}s`);
      el.style.setProperty("--drift", `${(10 + Math.random() * 22).toFixed(0)}px`);
      el.style.setProperty("--rot-start", `${(Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 8)}deg`);
      el.style.setProperty("--blur", `${blur.toFixed(1)}px`);
      el.style.setProperty("--glow", `${glow.toFixed(1)}px`);
      el.style.setProperty("--heart-color", BG_HEART_COLORS[i % BG_HEART_COLORS.length]);
      container.appendChild(el);
    }
  }

  window.MAFS = window.MAFS || {};
  window.MAFS.render = render;
  window.MAFS.renderBackgroundHearts = renderBackgroundHearts;
})();
