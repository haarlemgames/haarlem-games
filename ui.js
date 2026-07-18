:root {

  --color-bg-top: #fdf2f6;
  --color-bg-bottom: #fbe4ec;
  --color-card: #fffbfc;
  --color-card-alt: #fdeef3;
  --color-text: #3a1f2b;
  --color-text-muted: #8a6b75;
  --color-border: #f0d9e1;

  --color-primary: #e0457b;
  --color-primary-dark: #c2185b;
  --gradient-love: linear-gradient(135deg, #f0789e, #e0457b);
  --gradient-bg: linear-gradient(180deg, #fdf2f6, #fbe0ea);

  --color-success: #1a9c6e;
  --color-danger: #d33a4f;

  --shadow-heart: 0 20px 50px -10px rgba(224, 69, 123, 0.35);
  --shadow-soft: 0 2px 10px rgba(58, 31, 43, 0.06);

  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
  --radius-pill: 999px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--gradient-bg);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

button,
input {
  font-family: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  position: relative;
  overflow: hidden;
}

.bg-hearts {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse at 30% 15%, rgba(240, 120, 158, 0.10), transparent 55%),
    radial-gradient(ellipse at 80% 85%, rgba(194, 24, 91, 0.08), transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(212, 175, 120, 0.06), transparent 65%);
}

.bg-heart {
  position: absolute;
  left: var(--x, 50%);
  bottom: calc(var(--y-start, 0) * 1%);
  width: var(--size, 16px);
  height: var(--size, 16px);
  color: var(--heart-color, var(--color-primary));
  opacity: 0;
  filter: blur(var(--blur, 0px)) drop-shadow(0 0 var(--glow, 0px) var(--heart-color, var(--color-primary)));
  animation: heart-rise var(--duration, 14s) linear infinite;
  animation-delay: var(--delay, 0s);
  will-change: transform, opacity;
}

.bg-heart svg {
  display: block;
  width: 100%;
  height: 100%;
}

.app-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 780px;
  max-height: 96vh;
  max-height: 96dvh;
  overflow-y: auto;
  background: rgba(255, 251, 252, 0.97);
  backdrop-filter: blur(6px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-heart);
  padding: 0.85rem;
  font-size: 0.9rem;
  animation: fade-in 0.35s ease both;
}

@media (min-width: 480px) {
  .app-card {
    padding: 1.1rem;
  }
}

@media (min-width: 860px) {
  .app-shell {
    padding: 1.5rem;
  }
  .app-card {
    max-width: 920px;
    padding: 1.6rem 1.8rem;
    font-size: 0.95rem;
  }
  h1 {
    font-size: 1.85rem;
  }
}

@media (min-width: 1200px) {
  .app-shell {
    padding: 2.5rem;
  }
  .app-card {
    max-width: 1080px;
    padding: 2rem 2.25rem;
    font-size: 1rem;
  }
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.step-track {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.step-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-card-alt);
  white-space: nowrap;
}

.step-pill.active {
  color: #fff;
  background: var(--gradient-love);
}

.eyebrow {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-btn {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background-color 0.15s;
}

.icon-btn:hover {
  background: var(--color-card-alt);
}

h1,
h2 {
  margin: 0;
  color: var(--color-text);
}

h1 {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

h2 {
  font-size: 1.15rem;
  font-weight: 700;
}

.text-center {
  text-align: center;
}

.muted {
  color: var(--color-text-muted);
}

.tiny {
  font-size: 0.68rem;
}

.small {
  font-size: 0.78rem;
}

.accent-text {
  color: var(--color-primary-dark);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-pill);
  background: var(--gradient-love);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
}

.field {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text);
}

.field-label {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

input[type="text"],
input[type="number"] {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: var(--radius-md);
  padding: 0.5rem 0.6rem;

  font-size: 1rem;
  min-height: 2.5rem;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

input[type="text"]:focus,
input[type="number"]:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(224, 69, 123, 0.15);
}

.city-select {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: var(--radius-md);
  padding: 0.5rem 0.6rem;
  font-size: 1rem;
  color: var(--color-text);
  outline: none;
  min-height: 2.5rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.city-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(224, 69, 123, 0.15);
}

.input-hero {
  text-align: center;
  font-size: 1rem;
  padding: 0.65rem 0.75rem;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--color-primary);
  margin-top: 0.4rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.choice-grid-6 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

@media (min-width: 420px) {
  .choice-grid-6 {
    grid-template-columns: repeat(6, 1fr);
  }
}

.chip {
  padding: 0.5rem 0.4rem;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text);
  text-align: center;
  transition: border-color 0.15s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-height: 2.75rem;
}

.chip:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.chip.active {
  border-color: transparent;
  background: var(--gradient-love);
  color: #fff;
}

.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-xl);
  border: none;
  font-size: 0.92rem;
  font-weight: 600;
  transition: transform 0.12s ease;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  color: #fff;
  background: var(--gradient-love);
  box-shadow: var(--shadow-heart);
}

.btn-primary:hover:not(:disabled) {
  transform: scale(1.01);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-card-alt);
}

.btn-danger-outline {
  background: transparent;
  border: 1px solid var(--color-primary-dark);
  color: var(--color-primary-dark);
}

.btn-danger-outline:hover {
  background: var(--color-card-alt);
}

.btn-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.option-btn {
  display: block;
  width: 100%;
  text-align: left;
  min-height: 2.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text);
  font-size: 0.8rem;
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
}

.option-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-card-alt);
  transform: translateX(2px);
}

.option-btn-rewarded {
  border: 1.5px solid #16a34a;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  color: #14532d;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.option-btn-rewarded:hover:not(:disabled) {
  border-color: #15803d;
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  transform: translateX(2px);
}

.option-btn-rewarded:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.option-list {
  display: grid;
  gap: 0.4rem;
}

.rewarded-msg {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.2rem 0;
}

.rewarded-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  background: linear-gradient(135deg, #22c55e, #16a34a) !important;
  box-shadow: 0 4px 16px rgba(22, 163, 74, 0.3);
}

.rewarded-cta:hover:not(:disabled) {
  transform: scale(1.01);
}

.rewarded-loading {
  opacity: 0.7;
}

.progress-track {
  width: 100%;
  height: 0.3rem;
  background: var(--color-card-alt);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-track.thick {
  height: 0.4rem;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-love);
  transition: width 0.5s ease;
}

.matching-wrap {
  text-align: center;
  padding: 2rem 0;
  position: relative;
}

.matching-orb {
  position: relative;
  margin: 0 auto;
  width: 7rem;
  height: 7rem;
}

.matching-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--gradient-love);
  opacity: 0.3;
  animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.matching-ring.delay {
  inset: 0.5rem;
  opacity: 0.4;
  animation-delay: 0.3s;
}

.matching-core {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--gradient-love);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  animation: scale-in 0.3s ease both;
}

.floating-heart {
  position: absolute;
  color: var(--color-primary);
  animation: fade-in 0.4s ease both;
}

.match-card {
  border-radius: var(--radius-lg);
  padding: 0.9rem;
  color: #fff;
  background: var(--gradient-love);
  animation: scale-in 0.3s ease both;
}

.match-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.match-name {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.match-tagline {
  font-size: 0.7rem;
  opacity: 0.9;
  font-style: italic;
}

.match-details {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.2rem;
  font-size: 0.7rem;
}

@media (min-width: 480px) {
  .match-details {
    grid-template-columns: 1fr 1fr;
  }
}

.match-details .span-2 {
  grid-column: 1 / -1;
}

.match-flags {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
}

.vow-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.4rem;
}

@media (min-width: 480px) {
  .vow-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.vow-card {
  text-align: left;
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: #fff;
}

.vow-card.active {
  border-color: transparent;
  background: var(--gradient-love);
  color: #fff;
}

.vow-title {
  font-size: 0.78rem;
  font-weight: 700;
}

.vow-line {
  font-size: 0.66rem;
  margin-top: 0.15rem;
  font-style: italic;
  line-height: 1.25;
  color: var(--color-text-muted);
}

.vow-card.active .vow-line {
  color: rgba(255, 255, 255, 0.9);
}

.scene-banner {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-card-alt);
  padding: 0.4rem 0.6rem;
  text-align: center;
  margin-bottom: 0.5rem;
}

.scene-title {
  font-size: 0.78rem;
  font-weight: 700;
}

.transcript {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  animation: fade-in 0.25s ease both;
}

.msg-row.from-you {
  justify-content: flex-end;
}

.avatar {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--gradient-love);
}

.msg-meta {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  margin: 0 0.2rem 0.15rem;
}

.msg-delta {
  font-weight: 700;
  margin-left: 0.25rem;
}

.msg-delta.positive {
  color: var(--color-success);
}

.msg-delta.negative {
  color: var(--color-danger);
}

.bubble {
  border-radius: 1rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.76rem;
  display: inline-block;
  max-width: 100%;
}

.bubble.partner {
  border-top-left-radius: 0.25rem;
  background: var(--color-card-alt);
  color: var(--color-text);
}

.moment-tag {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted);
  margin: 0 0.2rem 0.15rem;
  animation: fade-in 0.25s ease both;
}

.moment-tag.dealbreaker-reveal {
  color: var(--color-danger);
}

.bubble.partner.fun,
.bubble.partner.dealbreaker {
  border: 1px dashed var(--color-primary);
  background: rgba(224, 69, 123, 0.08);
}

.bubble.you {
  border-top-right-radius: 0.25rem;
  background: var(--gradient-love);
  color: #fff;
  text-align: left;
}

.msg-col {
  min-width: 0;
}

.msg-col.align-right {
  text-align: right;
  max-width: 85%;
}

.reply-section {
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

.affection-readout {
  font-weight: 700;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-primary-dark);
}

.result-emoji {
  font-size: 3rem;
  margin-bottom: 0.2rem;
  animation: scale-in 0.3s ease both;
}

.divorce-reaction-card {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
  margin: 0.5rem auto 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--reaction-tint, var(--color-primary)) 16%, white);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--reaction-tint, var(--color-primary)) 35%, white);
  animation: scale-in 0.35s ease both;
}

.divorce-reaction-emoji {
  font-size: 2.75rem;
  line-height: 1;
}

.divorce-tears {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.divorce-tears span {
  position: absolute;
  top: 55%;
  font-size: 1rem;
  opacity: 0;
  animation: divorce-tear-fall 1.6s ease-in infinite;
}

.divorce-tears span:nth-child(1) { left: 30%; animation-delay: 0s; }
.divorce-tears span:nth-child(2) { left: 50%; animation-delay: 0.35s; }
.divorce-tears span:nth-child(3) { left: 68%; animation-delay: 0.7s; }

@keyframes divorce-tear-fall {
  0% { opacity: 0; transform: translateY(0) scale(0.7); }
  15% { opacity: 1; }
  80% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(2.2rem) scale(1); }
}

.divorce-effect-cry .divorce-reaction-emoji {
  animation: divorce-wobble 2.2s ease-in-out infinite;
}

.divorce-effect-shake {
  animation: divorce-shake 0.5s ease both, scale-in 0.35s ease both;
}

.divorce-effect-chaos {
  animation: divorce-pulse-glow 1.1s ease-in-out infinite, scale-in 0.35s ease both;
}

.divorce-effect-flee .divorce-reaction-emoji {
  animation: divorce-flee 1.8s ease-in-out infinite;
}

.divorce-effect-cold {
  animation: fade-in 0.6s ease both;
}

@keyframes divorce-wobble {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

@keyframes divorce-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px) rotate(-3deg); }
  40% { transform: translateX(7px) rotate(3deg); }
  60% { transform: translateX(-5px) rotate(-2deg); }
  80% { transform: translateX(4px) rotate(2deg); }
}

@keyframes divorce-pulse-glow {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--reaction-tint, var(--color-primary)) 35%, white); }
  50% { box-shadow: 0 0 0 9px color-mix(in srgb, var(--reaction-tint, var(--color-primary)) 20%, white); }
}

@keyframes divorce-flee {
  0%, 15% { transform: translateX(0); }
  50% { transform: translateX(2.2rem) rotate(8deg); }
  85%, 100% { transform: translateX(0); }
}

.result-card {
  margin: 0.75rem 0;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-card-alt);
  padding: 0.75rem;
  font-size: 0.78rem;
  text-align: left;
}

.result-card-love {
  margin: 0.75rem 0;
  border-radius: var(--radius-lg);
  background: var(--gradient-love);
  color: #fff;
  padding: 1rem;
  text-align: left;
  font-size: 0.78rem;
  animation: scale-in 0.3s ease both;
}

.big-stat {
  font-size: 2.75rem;
  font-weight: 700;
  color: var(--color-primary-dark);
  animation: scale-in 0.3s ease both;
}

.crest-preview {
  display: flex;
  justify-content: center;
}

.crest-customizer {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-card-alt);
  padding: 0.7rem;
}

.crest-emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.35rem;
}

.crest-emoji-btn {
  font-size: 1.1rem;
  min-height: 2.5rem;
  padding: 0.3rem;
}

.crest-color-grid {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.crest-color-swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--color-border);
  padding: 0;
  transition: transform 0.12s ease;
}

.crest-color-swatch:hover {
  transform: scale(1.08);
}

.crest-color-swatch.active {
  box-shadow: 0 0 0 2px var(--color-primary);
  transform: scale(1.1);
}

.crest-border-swatch.active {
  box-shadow: 0 0 0 2px var(--color-primary);
}

.home-style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
}

@media (min-width: 480px) {
  .home-style-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.home-style-btn {
  font-size: 0.72rem;
  min-height: 2.6rem;
  padding: 0.4rem 0.3rem;
}

.achievement-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

@media (min-width: 480px) {
  .achievement-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.achievement-card {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: #fff;
  padding: 0.6rem 0.7rem;
}

.achievement-card.unlocked {
  border-color: transparent;
  background: linear-gradient(135deg, #fff7ee, #ffeedd);
  box-shadow: 0 0 0 1px rgba(224, 69, 123, 0.15);
}

.achievement-card.locked {
  opacity: 0.55;
}

.achievement-emoji {
  font-size: 1.4rem;
  line-height: 1;
  flex-shrink: 0;
}

.achievement-body {
  min-width: 0;
}

.achievement-label {
  font-size: 0.8rem;
  font-weight: 700;
}

.achievement-desc {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  margin-top: 0.1rem;
  line-height: 1.3;
}

#achievement-toast-layer {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
  pointer-events: none;
  width: 100%;
  padding: 0 0.5rem;
}

.achievement-toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 320px;
  width: 100%;
  border-radius: var(--radius-lg);
  background: var(--gradient-love);
  color: #fff;
  padding: 0.55rem 0.8rem;
  box-shadow: var(--shadow-heart);
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.achievement-toast.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.achievement-toast-emoji {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.achievement-toast-title {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.9;
}

.achievement-toast-label {
  font-size: 0.85rem;
  font-weight: 700;
}

.wedding-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-card-alt);
  padding: 0.7rem;
  text-align: left;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mt-1 {
  margin-top: 0.4rem;
}
.mt-2 {
  margin-top: 0.6rem;
}
.mt-3 {
  margin-top: 0.85rem;
}
.mb-1 {
  margin-bottom: 0.4rem;
}
.mb-2 {
  margin-bottom: 0.6rem;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  75%,
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes pulse-fade {
  0%,
  100% {
    opacity: 0.08;
  }
  50% {
    opacity: 0.2;
  }
}

@keyframes heart-rise {
  0% {
    transform: translate(0, 0) translateX(0) rotate(var(--rot-start, -6deg));
    opacity: 0;
  }
  12% {
    opacity: var(--max-opacity, 0.18);
  }
  25% {
    transform: translate(0, -28vh) translateX(var(--drift, 14px)) rotate(0deg);
  }
  50% {
    transform: translate(0, -55vh) translateX(calc(var(--drift, 14px) * -1)) rotate(var(--rot-start, -6deg));
  }
  75% {
    transform: translate(0, -82vh) translateX(var(--drift, 14px)) rotate(0deg);
  }
  88% {
    opacity: var(--max-opacity, 0.18);
  }
  100% {
    transform: translate(0, -108vh) translateX(0) rotate(var(--rot-start, -6deg));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 380px) {
  .choice-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
