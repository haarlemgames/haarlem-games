# Portfolio website editions

Added 2026-10-30 with director approval of the three-game design.

- `/portfolio/`: responsive portfolio; three real game links, local artwork, and navigation to the studio.
- `/games/paw-makeover/`: standalone website edition 1.0.0-portfolio from the studio-registered paw-makeover-v3 source. Publisher build: haarlem-games, build 20261030T170803Z-c5a73b. The studio central build tool records source hashes, output hashes, ZIP equality and packaging checks. This website exporter removes the external Poki loader and local publisher bridge and uses inert lifecycle hooks; gameplay source and Poki exports are preserved. Original MP3 and optional offline audio fallback are retained.
- `/games/turbo-typer/`: standalone static build from Turbo Typer v2.zip. Original React component and Phaser scene retained; only hosting shell changed to a Vite entry with relative asset URLs for GitHub Pages. No server runtime or publisher SDK.
- `/games/the-marriage-experiment/`: existing standalone game preserved. It matches the local July 22 source after normalizing line endings and contains no Poki references.

Artwork: Paw Makeover uses the existing studio publishing thumbnail. Turbo Typer and The Marriage Experiment use the vector illustrations approved in the portfolio mockup; they are promotional illustrations, not gameplay screenshots. Existing studio artwork provenance remains in the source project.

Targeted checks cover portfolio desktop/mobile rendering, image loading, link destinations, homepage navigation and game startup. This change does not represent a new complete playthrough or phone-device QA of all three existing games.

Verified in Chrome: portfolio at 1440px and 390px; all artwork loaded, no horizontal overflow, all Play links HTTP 200. Paw Makeover entered level 1 and accepted input; Turbo Typer completed A-Z; Marriage Experiment loaded its start screen. No JavaScript errors, local 404s, or Poki network requests were recorded. Physical phones and complete Paw/Marriage playthroughs were not retested. Turbo archive SHA256: e42423b7fcec2bd78faffc16b9a4eca2f3a1781b94dbfaccadd94544c4f4b62d.
