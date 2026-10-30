/* WS.art — ALLE art-paden van Paw Makeover v2 (scene.js en activities lezen alleen hier). Zie docs/CONTRACT.md §4 en docs/ART-BRIEF-V2.md.
   Herkomst en status per bestand: assets/manifest.json, assets/manifest-v2-*.json, assets/art/story-scenes/provenance.json. */
(function () {
  'use strict';
  var WS = window.WS = window.WS || {};
  var DOG_DIR = { pup: 'assets/dog', shepherd: 'assets/dog/german-shepherd', bichon: 'assets/dog/fluffy' };
  var SLEEP_DIR = { pup: 'assets/dog/story-poses/first', shepherd: 'assets/dog/story-poses/german-shepherd', bichon: 'assets/dog/story-poses/fluffy' };
  var DOGS = ['pup', 'shepherd', 'bichon'];

  var dogs = {};
  DOGS.forEach(function (d) {
    dogs[d] = {
      happy: DOG_DIR[d] + '/dog-base.webp',
      sad: DOG_DIR[d] + '/dog-sad-base.webp',
      happyClean: 'assets/dog/clean/' + d + '-base.webp',   // zonder penning: bij kleding op het lijf en bandana's
      sleep: SLEEP_DIR[d] + '/dog-sleep.webp',
      eyesClosed: 'assets/dog/v2/' + d + '-eyes-closed.webp'
    };
  });

  /* Slaap-pose: waar het hoofd ligt (px op 800-canvas) voor kopitems; tilt in graden kloksgewijs. Afgestemd met assets/dog/v2/preview-sleep-*.webp. */
  var SLEEP_HAT = {
    pup: { x: 268, y: 452, tilt: -24, s: 0.95 },
    shepherd: { x: 346, y: 452, tilt: -20, s: 0.9 },
    bichon: { x: 330, y: 412, tilt: -12, s: 0.95 }
  };
  /* Zichtbare omlijsting van de hond (px): union van happy/sad + marge voor hoeden. [x0,y0,x1,y1] */
  var DOG_BOX = {
    pup: [186, 120, 650, 712], shepherd: [190, 140, 610, 712], bichon: [170, 125, 640, 712]
  };

  var ITEM_CATS = {
    'party-hat': 'head', 'crown': 'head', 'straw-hat': 'head', 'ranger-hat': 'head', 'cap': 'head', 'bowler': 'head', 'beanie': 'head', 'nightcap': 'head',
    'sunglasses': 'face', 'star-glasses': 'face',
    'bandana-blue': 'neck', 'bandana-mint': 'neck', 'bandana-yellow': 'neck', 'bow-tie': 'neck', 'scarf': 'neck', 'flower-lei': 'neck',
    'party-vest': 'body', 'hiking-vest': 'body', 'hawaiian-shirt': 'body', 'pyjama-stripes': 'body', 'pyjama-moons': 'body'
  };
  var HAS_BACK = { 'bandana-blue': 1, 'bandana-mint': 1, 'bandana-yellow': 1, 'scarf': 1, 'flower-lei': 1 };
  var items = {};
  Object.keys(ITEM_CATS).forEach(function (id) {
    var layers = {}, back = {};
    DOGS.forEach(function (d) { layers[d] = 'assets/outfit/' + d + '/' + id + '.webp'; if (HAS_BACK[id]) back[d] = 'assets/outfit/' + d + '/' + id + '-back.webp'; });
    items[id] = { cat: ITEM_CATS[id], icon: 'assets/outfit/icons/' + id + '.svg', layers: layers, back: HAS_BACK[id] ? back : null };
  });
  /* Director Canva exports retain their complete 800x800 coordinate frame. */
  var CANVA = 'assets/director/canva-2026-10-08/';
  ['shirt-grey', 'shirt-black', 'shirt-red', 'shirt-green', 'shirt-blue', 'shirt-pink', 'shirt-purple', 'shirt-lila', 'watch-purple', 'watch-black'].forEach(function (id) {
    items['canva-' + id] = { cat: id.indexOf('watch-') === 0 ? 'wrist' : 'body', icon: CANVA + 'icons/' + id + '.webp', layers: { shepherd: CANVA + 'layers/' + id + '.webp' }, back: null, frontPose: true };
  });

  ['moon', 'galaxy', 'sheep', 'elephant', 'heart', 'bear', 'panda'].forEach(function (design) {
    var id = 'pj-' + design, dir = 'assets/director/canva-pyjama-2026-10-08/';
    items['canva-' + id] = { cat: 'body', icon: dir + 'icons/' + id + '.webp', layers: { shepherd: dir + 'layers/' + id + '.webp' }, back: null, frontPose: true };
  });

  var DIRECTOR_CATALOG = [{"id": "director-67-shirt-pup", "source": "67-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "67 shirt pup"}, {"id": "director-black-gold-watch-pup", "source": "black-gold-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "black gold watch pup"}, {"id": "canva-shirt-black", "source": "black-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "black shirt german"}, {"id": "canva-watch-black", "source": "black-watch-german.webp", "breed": "shepherd", "phase": "day", "cat": "wrist", "label": "black watch german"}, {"id": "director-black-watch-pup", "source": "black-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "black watch pup"}, {"id": "canva-shirt-blue", "source": "blue-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "blue shirt german"}, {"id": "director-blue-watch-pup", "source": "blue-watch-pup.webp", "breed": "pup", "phase": "day", "cat": "wrist", "label": "blue watch pup"}, {"id": "director-blueshirt-pup", "source": "blueshirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "blueshirt pup"}, {"id": "director-bowtie-blue-pup", "source": "bowtie-blue-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie blue pup"}, {"id": "director-bowtie-purple-pup", "source": "bowtie-purple-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie purple pup"}, {"id": "director-bowtie-red-pup", "source": "bowtie-red-pup.webp", "breed": "pup", "phase": "day", "cat": "neck", "label": "bowtie red pup"}, {"id": "director-darkgreen-shirt-pup", "source": "darkgreen-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "darkgreen shirt pup"}, {"id": "director-fancy-black-shirt-pup-2", "source": "fancy-black-shirt-pup (2).webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy black shirt pup 2"}, {"id": "director-fancy-black-shirt-pup", "source": "fancy-black-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy black shirt pup"}, {"id": "director-fancy-brown-shirt-pup", "source": "fancy-brown-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy brown shirt pup"}, {"id": "director-fancy-shirt-grey-pup", "source": "fancy-shirt-grey-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy shirt grey pup"}, {"id": "director-fancy-shirt-pink-pup", "source": "fancy-shirt-pink-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "fancy shirt pink pup"}, {"id": "canva-shirt-green", "source": "green-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "green shirt german"}, {"id": "director-green-shirt-pup", "source": "green-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "green shirt pup"}, {"id": "canva-shirt-grey", "source": "grey-shirt-german (3).webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "grey shirt german (3)"}, {"id": "canva-shirt-lila", "source": "lila-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "lila shirt german"}, {"id": "canva-shirt-pink", "source": "pink-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "pink shirt german"}, {"id": "director-pj-animal-shirt-pup", "source": "PJ-animal-shirt-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "PJ animal shirt pup"}, {"id": "canva-pj-bear", "source": "PJ-bear-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "PJ bear shirt german"}, {"id": "director-pj-cloud-shirt-whitedog", "source": "pj-cloud-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj cloud shirt whitedog"}, {"id": "canva-pj-elephant", "source": "pj-elephant-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "pj elephant shirt german"}, {"id": "canva-pj-galaxy", "source": "pj-galaxy-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "pj galaxy shirt german"}, {"id": "canva-pj-heart", "source": "PJ-heart-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "PJ heart shirt german"}, {"id": "canva-pj-moon", "source": "pj-moon-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "pj moon shirt german"}, {"id": "director-pj-moon-shirt-whitedog", "source": "pj-moon-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj moon shirt whitedog"}, {"id": "director-pj-nightmare-shirt-whitedog", "source": "pj-nightmare-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj nightmare shirt whitedog"}, {"id": "canva-pj-panda", "source": "PJ-panda-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "PJ panda shirt german"}, {"id": "director-pj-pink-unircorn-shirt-whitedog", "source": "pj-pink-unircorn-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj pink unircorn shirt whitedog"}, {"id": "director-pj-pinkflower-shirt-whitedog", "source": "pj-pinkflower-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj pinkflower shirt whitedog"}, {"id": "director-pj-purple-shirt-whitedog", "source": "pj-purple-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj purple shirt whitedog"}, {"id": "director-pj-purple-unicorn-whiteshirt", "source": "pj-purple-unicorn-whiteshirt.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj purple unicorn whiteshirt"}, {"id": "director-pj-rave-shirt-whitedog", "source": "pj-rave-shirt-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj rave shirt whitedog"}, {"id": "director-pj-red-meme-whitedog", "source": "pj-red-meme-whitedog.webp", "breed": "bichon", "phase": "bed", "cat": "body", "label": "pj red meme whitedog"}, {"id": "canva-pj-sheep", "source": "PJ-sheep-shirt-german.webp", "breed": "shepherd", "phase": "bed", "cat": "body", "label": "PJ sheep shirt german"}, {"id": "director-pj-shirt-blue-dream-pup", "source": "pj-shirt-blue-dream-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt blue dream pup"}, {"id": "director-pj-shirt-blue-pup", "source": "pj-shirt-blue-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt blue pup"}, {"id": "director-pj-shirt-pink-moon-pup", "source": "pj-shirt-pink-moon-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt pink moon pup"}, {"id": "director-pj-shirt-pink-pup", "source": "pj-shirt-pink-pup.webp", "breed": "pup", "phase": "bed", "cat": "body", "label": "pj shirt pink pup"}, {"id": "director-purple-funny-shirt-pup", "source": "purple-funny- shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "purple funny  shirt pup"}, {"id": "canva-shirt-purple", "source": "purple-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "purple shirt german"}, {"id": "canva-watch-purple", "source": "purple-watch-german.webp", "breed": "shepherd", "phase": "day", "cat": "wrist", "label": "purple watch german"}, {"id": "canva-shirt-red", "source": "red-shirt-german.webp", "breed": "shepherd", "phase": "day", "cat": "body", "label": "red shirt german"}, {"id": "director-roblox-shirt-pup", "source": "roblox-shirt-pup.webp", "breed": "pup", "phase": "day", "cat": "body", "label": "roblox shirt pup"}];
  DIRECTOR_CATALOG.forEach(function (e) { var dir = "assets/director/canva-2026-10-18/", layers = {}; layers[e.breed] = dir + "layers/" + e.id + ".webp"; items[e.id] = { cat: e.cat, icon: dir + "icons/" + e.id + ".webp", layers: layers, back: null, frontPose: true }; });

  var S = 'assets/scenes/', C = 'assets/art/story-scenes/';
  var scenes = {
    garden: S + 'bg-garden.webp', trail: S + 'bg-trail.webp', yard: S + 'bg-yard.webp',
    'dress-party': S + 'bg-dress-party.webp', 'dress-camp': S + 'bg-dress-camp.webp', 'dress-beach': S + 'bg-dress-beach.webp',
    birthday: C + 'pm-bg-birthday.webp', party: S + 'bg-party.webp', camp: S + 'bg-camp.webp', beach: S + 'bg-beach.webp',
    'bath-1': S + 'bg-bath-1.webp', 'bath-2': S + 'bg-bath-2.webp', 'bath-3': S + 'bg-bath-3.webp',
    bedroom: C + 'pm-bg-bedroom.webp',
    'bed-1': S + 'bg-bed-1.webp', 'bed-2': S + 'bg-bed-2.webp', 'bed-3': S + 'bg-bed-3.webp',
    'bed-night-1': S + 'bg-bed-night-1.webp', 'bed-night-2': S + 'bg-bed-night-2.webp', 'bed-night-3': S + 'bg-bed-night-3.webp',
    salonHome: 'assets/art/pm-bg-salon-home.webp', salonPlay: 'assets/art/pm-bg-salon-play.webp'
  };

  var P = 'assets/props/';
  var propNames = ['ball', 'balloon-blue', 'balloon-red', 'balloon-yellow', 'banner', 'beach-ball', 'bed-back', 'bed-front', 'blanket', 'book', 'cake', 'fire-1', 'fire-2', 'fire-3',
    'firefly', 'flag-pennant', 'foam-puff-1', 'foam-puff-2', 'foam-puff-3', 'gift', 'hair-dryer', 'lamp', 'log', 'match', 'moon', 'paw-target', 'pillow', 'rubber-duck',
    'sandcastle-flag', 'sandcastle-tower', 'shampoo-bottle', 'shower-head', 'star', 'teddy', 'tent-icon', 'tooth-brush', 'tooth-paste', 'towel', 'umbrella', 'water-drop', 'zzz'];
  var props = {};
  propNames.forEach(function (n) { props[n] = P + n + '.webp'; });
  props['dog-bed'] = C + 'pm-dog-bed.webp';   // Codex: los hondenbed (800x800)
  props['bath-tub'] = C + 'pm-bath-tub.webp'; // Codex: los bad met douche (800x800)
  /* Afzonderlijke finale props: campinglantaarn en zeester delen geen bedlamp/nachtster meer. */
  props.starfish = P + 'codex-final/starfish.webp';
  props.lantern = P + 'codex-final/lantern.webp';
  props.star = P + 'codex-final/night-star.svg';

  var dirt = { spots: {}, mess: {} };
  [['mud', 5], ['burr', 4], ['sticky', 4], ['sand', 3]].forEach(function (k) {
    dirt.spots[k[0]] = []; for (var i = 1; i <= k[1]; i++) dirt.spots[k[0]].push('assets/dirt/spot-' + k[0] + '-' + i + '.webp');
  });
  DOGS.forEach(function (d) { dirt.mess[d] = { party: 'assets/dirt/' + d + '/party.webp', camp: 'assets/dirt/' + d + '/camp.webp', beach: 'assets/dirt/' + d + '/beach.webp' }; });

  var A = 'assets/art/';
  WS.art = {
    dogs: dogs, dogBox: DOG_BOX, sleepHat: SLEEP_HAT, dogDir: DOG_DIR,
    items: items, scenes: scenes, props: props, dirt: dirt,
    anchors: WS.anchors || {},
    frontPoses: {"pup": {"dog": "assets/director/front-bases-2026-10-16/pup-front-800.webp", "box": [165, 45, 665, 775], "anchors": {"mouth": [397, 301], "eyes": {"l": [340, 200], "r": [451, 200]}, "hat": {"x": 397, "y": 90, "tilt": 0}}}, "bichon": {"dog": "assets/director/front-bases-2026-10-16/bichon-front-800.webp", "box": [180, 40, 655, 775], "anchors": {"mouth": [391, 326], "eyes": {"l": [338, 235], "r": [446, 235]}, "hat": {"x": 391, "y": 90, "tilt": 0}}}, "shepherd": {"dog": "assets/dog/german-shepherd/poses/front-neutral-2026-10-08/dog-front-neutral.webp", "box": [230, 5, 675, 770], "anchors": {"mouth": [390, 317], "eyes": {"l": [345, 229], "r": [445, 229]}, "hat": {"x": 390, "y": 90, "tilt": 0}}}},
    canva: { dog: 'assets/dog/german-shepherd/poses/front-neutral-2026-10-08/dog-front-neutral.webp', box: [230, 5, 675, 770] },
    /* Gereedschappen (cursor): hx/hy = hotspot, w = breedte als fractie van het hondcanvas. */
    tools: {
      wipe: { src: A + 'pm-tool-cloth.svg', hx: 0.5, hy: 0.5, w: 0.2 },
      wash: { src: A + 'pm-tool-sponge.svg', hx: 0.5, hy: 0.5, w: 0.2 },
      brush: { src: A + 'pm-tool-brush.svg', hx: 0.25, hy: 0.25, w: 0.24 },
      pick: { src: A + 'pm-tool-brush.svg', hx: 0.25, hy: 0.25, w: 0.2 },
      shower: { src: P + 'shower-head.webp', hx: 0.5, hy: 0.3, w: 0.26 },
      shampoo: { src: P + 'shampoo-bottle.webp', hx: 0.5, hy: 0.15, w: 0.16 },
      towel: { src: P + 'towel.webp', hx: 0.5, hy: 0.5, w: 0.3 },
      dryer: { src: P + 'hair-dryer.webp', hx: 0.2, hy: 0.4, w: 0.3 },
      toothbrush: { src: P + 'tooth-brush.webp', hx: 0.1, hy: 0.5, w: 0.3 }
    },
    fx: {
      shadow: A + 'pm-shadow-ground.svg', bubble: A + 'pm-bubble.svg', sparkle: A + 'pm-sparkle.svg', hintHand: A + 'pm-hint-hand.svg',
      confetti: [1, 2, 3, 4].map(function (n) { return A + 'pm-confetti-' + n + '.svg'; })
    },
    icons: { pause: 'assets/icons/pause.svg', next: 'assets/icons/next.svg', retry: 'assets/icons/retry.svg', home: 'assets/icons/home.svg', play: 'assets/icons/play.svg', restyle: 'assets/icons/restyle.svg' },
    /* Hond/props art voor home-scherm */
    home: { dog: DOG_DIR.pup + '/dog-base.webp' },
    finale: 'assets/art/finale-three-dogs.webp'
  };
  WS.art.src = function (entry) { return !entry ? '' : (typeof entry === 'string' ? entry : (entry.src || '')); };
  WS.art.abs = function (path) { try { return new URL(path, document.baseURI).href; } catch (e) { return path; } };
})();
