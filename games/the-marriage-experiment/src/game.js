(function () {
  "use strict";

  const CONFIG = window.MAFS.CONFIG;
  const COUNTRIES = window.MAFS.COUNTRIES;
  const ANYWHERE_COUNTRY = window.MAFS.ANYWHERE_COUNTRY;
  const ACHIEVEMENTS = window.MAFS.ACHIEVEMENTS;
  const NEGATIVE_TRAITS = window.MAFS.NEGATIVE_TRAITS;
  const HOME_STYLES = window.MAFS.HOME_STYLES;
  const storage = window.MAFS.storage;
  const {
    buildPartner,
    hashStr,
    pickQuestions,
    pickSoloScenes,
    pickDateSet,
    pickFamilyOutcome,
    pickTraitMoments,
    pickDivorceReaction,
    pickOne,
    hasNameEasterEgg,
    buildNameEasterEggPartner,
  } = window.MAFS;

  function randomSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  function defaultAchievementStats() {
    return {
      marriagesStarted: 0,
      marriagesCompleted: 0,
      divorces: 0,
      dumped: 0,
      blindsided: 0,
      ranAway: 0,
      soulmates: 0,
      realLove: 0,
      countriesMatched: [],
      vowsUsed: [],
      weddingsSaved: 0,
      chaosAgentMatch: false,
      anywhereUsed: false,
      rewardedUsed: false,
      perfectHoneymoons: 0,
      reapplyCount: 0,
      partner45: false,
      partner60: false,
      fiveYearsUnlocked: false,
      soloPlayed: false,
      soloMastered: false,
      marriedNegativeTrait: false,
    };
  }

  const ACHIEVEMENT_CHECKS = {
    first_marriage: (s) => s.marriagesStarted >= 1,
    ran_away: (s) => s.ranAway >= 1,
    rewarded_used: (s) => s.rewardedUsed,
    perfect_honeymoon: (s) => s.perfectHoneymoons >= 1,
    dumped: (s) => s.dumped >= 1,
    divorced: (s) => s.divorces >= 1,
    stayed_together: (s) => s.marriagesCompleted >= 1,
    blindsided: (s) => s.blindsided >= 1,
    real_love: (s) => s.realLove >= 1,
    soulmates: (s) => s.soulmates >= 1,
    five_years: (s) => s.fiveYearsUnlocked,
    first_save: (s) => s.weddingsSaved >= 1,
    collector: (s) => s.weddingsSaved >= 5,
    silver_fox: (s) => s.partner45,
    golden_years: (s) => s.partner60,
    globe_trotter: (s) => s.countriesMatched.length >= 5,
    anywhere: (s) => s.anywhereUsed,
    chaos_agent: (s) => s.chaosAgentMatch,
    glow_up: (s) => s.reapplyCount >= 1,
    serial_dater: (s) => s.marriagesStarted >= 3,
    vow_collector: (s) => s.vowsUsed.length >= 4,
    solo_debut: (s) => s.soloPlayed,
    solo_master: (s) => s.soloMastered,
    married_the_chaos: (s) => s.marriedNegativeTrait,
    world_tour: (s) => s.countriesMatched.length >= COUNTRIES.length,
  };

  function updateAchievements(state) {
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach((a) => {
      if (state.unlockedAchievements.includes(a.id)) return;
      const check = ACHIEVEMENT_CHECKS[a.id];
      if (check && check(state.achievementStats)) {
        state.unlockedAchievements.push(a.id);
        newlyUnlocked.push(a.id);
      }
    });
    state.recentlyUnlocked = newlyUnlocked;
    if (storage) {
      storage.setJSON("achievements", {
        unlocked: state.unlockedAchievements,
        stats: state.achievementStats,
      });
    }
  }

  function freshState(sessionSeed = randomSeed()) {

    const savedAchievements = storage ? storage.getJSON("achievements", null) : null;
    const unlockedAchievements = savedAchievements?.unlocked ? [...savedAchievements.unlocked] : [];
    const achievementStats = Object.assign(defaultAchievementStats(), savedAchievements?.stats || {});

    return {
      sessionSeed,
      phase: "intro",

      unlockedAchievements,
      achievementStats,
      recentlyUnlocked: [],

      weddingSaved: false,

      honeymoonBoldPicks: 0,

      name: "",
      age: CONFIG.DEFAULT_AGE,
      gender: "woman",
      playerCountry: null,

      orientation: "straight",
      religion: "any",
      desiredTraits: [],
      prefsStep: 0,

      answers: [],
      qIndex: 0,

      dates: null,
      dateIndex: 0,
      honeymoonStep: "reply",
      affection: 0,
      transcript: [],

      traitMomentsSchedule: null,

      chosenVow: null,
      decision: null,
      divorceReaction: null,

      singleIdx: 0,
      points: 0,
      lastSingleReply: null,

      crestEmoji: "💞",
      crestBg: "#e0457b",
      crestBorder: "#fffbfc",

      homeStyle: null,

      rewardedAdLoading: false,
      rewardedAdMessage: null,
      familyUnlocked: false,

      soundOn: true,
    };
  }

  function computeDominantTrait(state) {
    const tally = {};
    state.answers.forEach((a) => {
      tally[a.trait] = (tally[a.trait] || 0) + a.weight;
    });
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "romantic";
  }

  const ALL_GENDERS = ["woman", "man", "nonbinary", "other"];

  function partnerGenderPool(state) {
    if (state.orientation === "straight") {
      if (state.gender === "woman") return ["man"];
      if (state.gender === "man") return ["woman"];
      return ["woman", "man"];
    }
    if (state.orientation === "gay") {
      if (state.gender === "woman") return ["woman"];
      if (state.gender === "man") return ["man"];
      return ["nonbinary", "other"];
    }
    return ALL_GENDERS;
  }

  function computeMatch(state) {
    const dominantTrait = computeDominantTrait(state);
    const countryKey = state.playerCountry || "";
    const seed = hashStr(
      state.name +
        dominantTrait +
        state.orientation +
        state.religion +
        state.desiredTraits.join("") +
        countryKey +
        state.sessionSeed,
    );
    const genderPool = partnerGenderPool(state);
    let partnerGender = pickOne(genderPool, seed >>> 18);

    const eggTriggered = hasNameEasterEgg(state.name);
    if (eggTriggered) partnerGender = "woman";

    const bio = eggTriggered
      ? buildNameEasterEggPartner(state.name, partnerGender, state.age, CONFIG.AGE_BRACKETS)
      : buildPartner(seed, partnerGender, state.playerCountry, COUNTRIES, state.age, CONFIG.AGE_BRACKETS, state.desiredTraits);

    const allTraits = ["adventurous", "homebody", "romantic", "ambitious", "playful", "loyal", "sweet", "leader"];
    const traitPool = state.desiredTraits.length > 0 ? state.desiredTraits : allTraits;

    const coreTrait = pickOne(traitPool, seed >>> 5);

    const overlap = state.desiredTraits.filter((t) => t === dominantTrait || t === coreTrait).length;
    const consistencyBonus = Math.min(15, state.answers.length * 2);
    const baseCompat = Math.min(95, 55 + overlap * 8 + consistencyBonus + (seed % 8));

    return { bio, partnerTrait: coreTrait, coreTrait, baseCompat, dominantTrait };
  }

  function computeVerdict(affection) {
    if (affection >= 85) return { title: "Soulmates", emoji: "💞", msg: "The experts knew." };
    if (affection >= 70) return { title: "Real Love", emoji: "💕", msg: "Worth fighting for." };
    if (affection >= 55) return { title: "Promising", emoji: "💗", msg: "Rocky start, real future." };
    if (affection >= 40) return { title: "Complicated", emoji: "💔", msg: "Sparks, also storms." };
    return { title: "Mismatch", emoji: "🚪", msg: "The experts owe you both an apology." };
  }

  function computeFamily(state, match) {
    const seed = hashStr(state.name + match.bio.name + "family" + state.sessionSeed);
    const affection = state.affection;
    const pet = ["a golden retriever named Biscuit", "a black cat named Pluto", "two chaotic kittens"][seed % 3];

    const chosenHome = HOME_STYLES && state.homeStyle
      ? HOME_STYLES.find((h) => h.id === state.homeStyle)
      : null;
    const home = chosenHome
      ? chosenHome.desc
      : affection >= 75
        ? "a sun-drenched house with a garden"
        : affection >= 55
          ? "a cozy city apartment"
          : "a small place you're slowly making yours";

    const matchInfo = {
      partnerName: match.bio.name,
      partnerJob: match.bio.job,
      partnerQuirk: match.bio.quirk,
      partnerCountry: match.bio.country,
      partnerGreenFlag: match.bio.greenFlag,
      vowLabel: state.chosenVow?.label || null,
    };
    const { kidsLine, kidsEmoji, milestone } = pickFamilyOutcome(seed, state.age, affection, pet, matchInfo);
    return { kidsLine, kidsEmoji, pet, home, milestone, compatibilityToday: Math.min(100, affection + 6) };
  }

  function createGame(notify) {
    let state = freshState();

    function emit() {
      notify(state);
    }

    function getQuiz() {
      return pickQuestions(state.sessionSeed, CONFIG.QUIZ_PER_ROUND);
    }
    function getSoloRound() {
      return pickSoloScenes(state.sessionSeed ^ 0x5a5a5a, CONFIG.SOLO_PER_ROUND);
    }
    function resetState(keepPoints) {
      const pointsToKeep = keepPoints ? state.points : 0;
      const soundOn = state.soundOn;
      state = freshState();
      state.points = pointsToKeep;
      state.soundOn = soundOn;
    }

    const actions = {
      getState() {
        return state;
      },
      getQuiz,
      getSoloRound,
      getMatch() {
        return computeMatch(state);
      },
      getVerdict() {
        return computeVerdict(state.affection);
      },
      getFamily() {
        return computeFamily(state, computeMatch(state));
      },

      getAchievements() {
        return ACHIEVEMENTS.map((a) => ({
          ...a,
          unlocked: state.unlockedAchievements.includes(a.id),
        }));
      },

      acknowledgeAchievements() {
        state.recentlyUnlocked = [];
      },

      setName(name) {
        state.name = name;
        emit();
      },
      setAge(age) {
        state.age = age;
        emit();
      },
      setGender(gender) {
        state.gender = gender;
        emit();
      },

      setPlayerCountry(country) {
        state.playerCountry = country;
        emit();
      },
      setOrientation(orientation) {
        state.orientation = orientation;
        emit();
      },
      setReligion(religion) {
        state.religion = religion;
        emit();
      },
      setPrefsStep(step) {
        state.prefsStep = step;
        emit();
      },
      toggleTrait(trait) {
        const i = state.desiredTraits.indexOf(trait);
        if (i >= 0) {
          state.desiredTraits.splice(i, 1);
        } else if (state.desiredTraits.length < CONFIG.MAX_DESIRED_TRAITS) {
          state.desiredTraits.push(trait);
        }
        emit();
      },
      goToPhase(phase) {
        state.phase = phase;
        emit();
      },

      answerQuizQuestion(trait, weight) {
        state.answers.push({ trait, weight });
        const quiz = getQuiz();
        if (state.qIndex + 1 < quiz.length) {
          state.qIndex += 1;
          emit();
        } else {
          state.phase = "matching";
          emit();

          setTimeout(() => {
            state.phase = "altar";
            emit();
          }, 2400);
        }
      },

      undoQuizAnswer() {
        if (state.phase !== "quiz" || state.qIndex === 0 || state.answers.length === 0) return;
        state.answers = state.answers.slice(0, -1);
        state.qIndex -= 1;
        emit();
      },

      setChosenVow(vow) {
        state.chosenVow = vow;
        emit();
      },
      runAway() {
        state.decision = "leave";
        state.phase = "single";
        state.achievementStats.ranAway += 1;
        updateAchievements(state);
        emit();
      },
      sayIDo() {
        if (!state.chosenVow) return;
        const match = computeMatch(state);
        state.affection = Math.max(0, Math.min(100, match.baseCompat + (state.chosenVow?.bonus ?? 0)));

        state.dates = pickDateSet(hashStr("dateset" + state.sessionSeed));
        state.dateIndex = 0;
        state.honeymoonStep = "reply";
        state.transcript = [{ who: "partner", text: state.dates[0].opener }];
        state.phase = "honeymoon";
        state.honeymoonBoldPicks = 0;
        state.weddingSaved = false;

        const stats = state.achievementStats;
        stats.marriagesStarted += 1;
        if (match.bio.country && !stats.countriesMatched.includes(match.bio.country)) {
          stats.countriesMatched.push(match.bio.country);
        }
        if (state.chosenVow?.id && !stats.vowsUsed.includes(state.chosenVow.id)) {
          stats.vowsUsed.push(state.chosenVow.id);
        }
        if (match.bio.age >= 45) stats.partner45 = true;
        if (match.bio.age >= 60) stats.partner60 = true;
        if (state.playerCountry === ANYWHERE_COUNTRY) stats.anywhereUsed = true;
        const negativeCount = state.desiredTraits.filter((t) => NEGATIVE_TRAITS.includes(t)).length;
        if (negativeCount >= 2) stats.chaosAgentMatch = true;
        updateAchievements(state);

        state.traitMomentsSchedule = pickTraitMoments(state.desiredTraits, match.bio.name, hashStr("traits" + state.sessionSeed));

        emit();
      },

      getDates() {
        return state.dates;
      },

      currentReplyReward() {
        const date = state.dates[state.dateIndex];
        return date.replies.find((r) => r.rewarded) || null;
      },

      currentQuestionReward() {
        const date = state.dates[state.dateIndex];
        return date.questions.find((q) => q.rewarded) || null;
      },

      setRewardedAdLoading(loading) {
        state.rewardedAdLoading = loading;
        state.rewardedAdMessage = null;
        emit();
      },

      setRewardedAdMessage(msg) {
        state.rewardedAdLoading = false;
        state.rewardedAdMessage = msg;
        emit();
      },

      useRewardedReply() {
        state.rewardedAdLoading = false;
        state.rewardedAdMessage = null;
        const reward = actions.currentReplyReward();
        if (!reward) return;
        actions.chooseDateReply(reward);
      },

      useRewardedQuestion() {
        state.rewardedAdLoading = false;
        state.rewardedAdMessage = null;
        const reward = actions.currentQuestionReward();
        if (!reward) return;
        actions.chooseDateQuestion(reward);
      },

      unlockFamilyEpilogue() {
        state.familyUnlocked = true;
        state.phase = "family";
        state.achievementStats.fiveYearsUnlocked = true;
        updateAchievements(state);
        emit();
      },

      chooseDateReply(reply) {
        state.affection = Math.max(0, Math.min(100, state.affection + reply.delta));
        state.transcript = [
          ...state.transcript,
          { who: "you", text: reply.label, delta: reply.delta },
          { who: "partner", text: reply.reaction },
        ];
        state.honeymoonStep = "question";
        if (reply.rewarded) {
          state.honeymoonBoldPicks += 1;
          state.achievementStats.rewardedUsed = true;
          updateAchievements(state);
        }
        emit();
      },

      chooseDateQuestion(question) {
        state.affection = Math.max(0, Math.min(100, state.affection + question.delta));
        state.transcript = [
          ...state.transcript,
          { who: "you", text: question.label, delta: question.delta },
          { who: "partner", text: question.answer },
        ];
        state.honeymoonStep = "end";
        if (question.rewarded) {
          state.honeymoonBoldPicks += 1;
          state.achievementStats.rewardedUsed = true;
          updateAchievements(state);
        }
        emit();
      },

      continueDate() {
        const hasNextDate = state.dateIndex + 1 < state.dates.length;
        if (hasNextDate) {
          state.dateIndex += 1;
          state.honeymoonStep = "reply";
          state.transcript = [...state.transcript, { who: "partner", text: state.dates[state.dateIndex].opener }];

          const moments = state.traitMomentsSchedule?.[state.dateIndex] || [];
          moments.forEach((m) => {
            state.transcript = [...state.transcript, { who: "partner", text: m.text, moment: true, tone: m.tone }];
          });
          emit();
          return;
        }
        emit();
        setTimeout(() => {
          const dumped = state.affection < CONFIG.PARTNER_LEAVE_THRESHOLD;
          state.phase = dumped ? "dumped" : "decision";

          if (state.honeymoonBoldPicks >= state.dates.length * 2) {
            state.achievementStats.perfectHoneymoons += 1;
          }
          if (dumped) {
            state.achievementStats.dumped += 1;
          }
          updateAchievements(state);
          emit();
        }, 800);
      },

      chooseDivorce() {
        const match = computeMatch(state);
        state.decision = "leave";
        state.divorceReaction = pickDivorceReaction(match.bio.name);
        state.phase = "divorceReaction";
        state.achievementStats.divorces += 1;
        updateAchievements(state);
        emit();
      },
      chooseStayTogether() {

        const blindsided = Math.random() < 0.02;
        if (blindsided) {
          state.decision = "blindsided";
          state.phase = "blindsided";
          state.achievementStats.blindsided += 1;
          updateAchievements(state);
          emit();
          return;
        }
        state.decision = "stay";
        state.phase = "ending";
        state.achievementStats.marriagesCompleted += 1;
        if (state.affection >= 85) state.achievementStats.soulmates += 1;
        else if (state.affection >= 70) state.achievementStats.realLove += 1;
        if (state.desiredTraits.some((t) => NEGATIVE_TRAITS.includes(t))) {
          state.achievementStats.marriedNegativeTrait = true;
        }
        updateAchievements(state);
        emit();
      },

      chooseSoloOption(option) {
        state.points += option.points;
        state.lastSingleReply = option.reply;
        state.singleIdx += 1;
        state.achievementStats.soloPlayed = true;
        if (state.points >= CONFIG.REPLAY_COST) state.achievementStats.soloMastered = true;
        updateAchievements(state);
        emit();
      },

      reapplyForExperiment() {
        state.achievementStats.reapplyCount += 1;
        updateAchievements(state);

        const justUnlocked = state.recentlyUnlocked;
        const keep = {
          name: state.name,
          age: state.age,
          gender: state.gender,
          playerCountry: state.playerCountry,
          orientation: state.orientation,
          religion: state.religion,
          desiredTraits: [...state.desiredTraits],
          points: state.points,
          soundOn: state.soundOn,
        };
        state = freshState();
        Object.assign(state, keep);
        state.phase = "quiz";
        state.recentlyUnlocked = justUnlocked;
        emit();
      },

      reset(keepPoints = false) {
        resetState(keepPoints);
        emit();
      },

      setCrestEmoji(emoji) {
        state.crestEmoji = emoji;
        emit();
      },
      setCrestColors(bg, border) {
        state.crestBg = bg;
        if (border !== undefined) state.crestBorder = border;
        emit();
      },

      setHomeStyle(id) {
        state.homeStyle = id;
        emit();
      },

      saveWedding() {
        if (state.weddingSaved || !storage) return;
        const match = computeMatch(state);
        const verdict = computeVerdict(state.affection);
        const family = state.familyUnlocked ? computeFamily(state, match) : null;
        const record = {
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          savedAt: Date.now(),
          playerName: state.name || "You",
          partnerName: match.bio.name,
          partnerAge: match.bio.age,
          partnerJob: match.bio.job,
          partnerCountry: match.bio.country,
          partnerOneLiner: match.bio.oneLiner,
          vowLabel: state.chosenVow?.label || "—",
          affection: state.affection,
          verdictTitle: verdict.title,
          verdictEmoji: verdict.emoji,
          decision: state.decision,
          family,
          crestEmoji: state.crestEmoji,
          crestBg: state.crestBg,
          crestBorder: state.crestBorder,
        };
        const existing = storage.getJSON("weddings", []);

        const updated = [record, ...existing].slice(0, 30);
        storage.setJSON("weddings", updated);
        state.weddingSaved = true;
        state.achievementStats.weddingsSaved += 1;
        updateAchievements(state);
        emit();
      },

      getSavedWeddings() {
        return storage ? storage.getJSON("weddings", []) : [];
      },

      deleteSavedWedding(id) {
        if (!storage) return;
        const existing = storage.getJSON("weddings", []);
        storage.setJSON("weddings", existing.filter((w) => w.id !== id));
        emit();
      },

      setSoundOn(on) {
        state.soundOn = on;
        emit();
      },
    };

    return actions;
  }

  window.MAFS = window.MAFS || {};
  window.MAFS.createGame = createGame;
})();
