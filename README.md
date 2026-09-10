# Nightshift — Alpine Sprint

A browser 3D time-attack racer. Open `index.html` in a modern browser to play. No installation or build step is required: Three.js 0.160.1 is bundled locally under its MIT license (`THREE-LICENSE.txt`). Optional Google Fonts fall back to system fonts when offline.

The original procedural sedan is inspired by the supplied BMW M5 CS photograph: deep green paint, bronze kidney surrounds and split-spoke wheels, yellow running lights, four-door body, wheel arches, hood contours, carbon roof and quad exhausts. Three.js provides physical materials, environment reflections, tone mapping and cast shadows. It is a reference-inspired model, not an official BMW asset or an exact photogrammetry recreation. The reference photograph is not redistributed with the game.

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

Complete the 4 km course before the timer expires. Each of the three checkpoints adds 25 seconds. Traffic changes lanes; close passes add score, a temporary multiplier and nitro. Traffic collisions remove 40% condition, barriers remove 18%, and collisions briefly grant damage immunity. Running out of time or condition ends the race. Finish with time remaining for a score bonus. Best score is saved locally when storage is available. Leaving the window automatically pauses the game.

## Verification

Run `node tests/race.test.cjs` for countdown, driving, checkpoint bonuses, damage/immunity, win/loss, persistence and restart checks. Actual Chrome testing also covers WebGL startup, keyboard steering, boost, pause/resume, both cameras, restart and mobile rendering.

`scene.js` owns the model, lighting, road and cameras; `game.js` owns the race simulation, input, audio and HUD. `style.css` and `race.css` style the interface.
