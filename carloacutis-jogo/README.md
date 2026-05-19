# Carlo Acutis: Bicycle of Light

Playable Phaser prototype for a short browser game inspired by the life of Carlo Acutis.

## Run locally

Because this project uses ES modules, serve the folder with a simple static server.

Options:

- `python3 -m http.server 4173`
- `npx serve .`

Then open:

- `http://localhost:4173`

## Fastest test

For the quickest possible local test, just double-click:

- `quick-play.html`

This standalone file does not need a local server and is meant for fast feedback loops.
The main modular Phaser version remains in `index.html` + `src/`.

## Current prototype

- Intro top-down hall scene
- Single-lane runner inspired by the Google browser game
- Auto-acceleration
- Obstacles with instant game over
- Memory moments worth 10 points and triggered by passing them
- Eucharist popup with slowdown and safe state
- Mobile controls with jump/start support
- External asset loading with fallback placeholders
- Simplified monochrome runner presentation

## Asset replacement plan

Place production files into `assets/` using the paths listed in `assets/README.md`.
The loader manifest is in `src/assets/manifest.js`.
If a file is missing, the game falls back to generated placeholder art so development can continue without breaking the build.

## Next expansion

- Add map progression: Milan -> Road -> Assisi
- Add proper cinematic ending with VHS close-up
- Plug in final film URL
- Replace placeholder visuals with production assets
