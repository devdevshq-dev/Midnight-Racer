# Nightshift — Endless Run

A browser 3D endless highway racer. Open `index.html` in a modern browser to play. No installation or build step is required: Three.js 0.160.1 and the car asset are bundled locally. Optional Google Fonts fall back to system fonts when offline.

The player car is converted from the user-supplied `22m5/dlc.rpf`, with its detailed body, interior, badges, textures and animated wheels. The previous procedural player car has been removed. Physical materials provide deep green paint, bronze trim, glass reflections and working brake lights; the highway has textured asphalt, shaded terrain and soft shadows. The original GTA shaders are approximated with browser PBR materials, not reproduced pixel-for-pixel. See `assets/MODEL-NOTICE.md` for provenance and usage notes.

Alternatively, serve this folder with `python3 -m http.server 8080` and visit http://localhost:8080.

## Controls

- Left / Right or A / D: steer
- W or Up: full throttle (the car automatically accelerates to cruising speed)
- Space: nitro (recharges when released; close passes give a bonus)
- Down or S: brake
- P or Escape: pause / resume
- C: switch chase / hood camera
- M: mute / unmute synthesized engine audio
- Enter: start or retry
- Touchscreen: on-screen steering, brake and nitro buttons

There is no finish line, distance cap, checkpoint requirement or time limit. Distance and drive time keep increasing. Every 15 seconds of active driving, current speed and cruise/throttle/nitro targets increase by 10%, cumulatively: 1.10× after 15 seconds, 1.21× after 30, 1.331× after 45. Braking remains available. The starting countdown, pauses and background tabs do not advance this timer; restarting resets the progression.

Traffic changes lanes; close passes add score, a temporary multiplier and nitro. Traffic collisions remove 40% condition, barriers remove 18%, and collisions briefly grant damage immunity. A run ends only when condition reaches zero. Best score is saved locally when storage is available. Leaving the window automatically pauses the game.

## Verification

Run `node tests/race.test.cjs` for driving, endless distance/time, damage/immunity, score persistence, cumulative speed increases, pause and restart checks. Run `node tests/model.test.cjs` to validate the GLB and wheel geometry. Actual Chrome testing also covers WebGL startup, keyboard steering, boost, pause/resume, both cameras, restart and mobile rendering.

`car-loader.js` reads the local GLB wrapper; `scene.js` owns lighting, scenery and cameras; `game.js` owns simulation, input, audio and HUD. `style.css` and `race.css` style the interface.

## Rebuild the supplied car asset

`node tools/convert-rpf.cjs /path/to/22m5/dlc.rpf`

This produces `assets/bmw-m5-cs.glb`, a base64 JavaScript wrapper for opening the game directly from disk, and `assets/model-info.json`. The converter supports this unencrypted RPF7 / Gen9 RSC7 model and BC1, BC3 and BGRA8 textures; it is not a general GTA importer. The source archive is read-only and is not copied into the project.
