# Nightshift — Endless Run

A browser 3D endless highway racer. Open `index.html` in a modern browser to play. No installation or build step is required: Three.js 0.160.1 and the car asset are bundled locally. Optional Google Fonts fall back to system fonts when offline.

The player car is converted from the user-supplied `22m5/dlc.rpf`, with its detailed body, interior, badges, textures and animated wheels. The previous procedural player car has been removed. Physical materials provide deep green paint, bronze trim, glass reflections and working brake lights; the highway has textured asphalt, shaded terrain and soft shadows. The original GTA shaders are approximated with browser PBR materials, not reproduced pixel-for-pixel. See `assets/MODEL-NOTICE.md` for provenance and usage notes.

Alternatively, serve this folder with `python3 -m http.server 8080` and visit http://localhost:8080.

## Driving and visual enhancements

Steering uses lateral velocity and tire grip, with reduced steering angle at high speed and a little momentum when you release the controls. Braking gives the car more lateral grip; nitro makes direction changes more deliberate. Barrier contact pushes the car back toward the road. The simulation runs at 120 fixed steps per second, independently of display refresh rate.

The M5 now responds with spring-damped weight transfer: acceleration raises the nose and compresses the rear, braking lowers the nose and raises the rear, and turns compress the outside suspension. The body settles smoothly after load is released while all four wheel assemblies remain attached to the road-level car frame. Road vibration and speed-sensitive front-wheel steering remain active. Both cameras look into turns using the same speed-sensitive steering angle as the front wheels, blended with the car’s travel heading. The chase camera gently swings behind the turn; the hood camera looks farther into the intended line. Steering anticipation is bounded, eases back to center, freezes while paused, and resets on a new countdown. The chase camera also widens with speed and boost and briefly shakes on impact. Warm atmospheric lighting, procedural clouds, working headlight beams, a contact shadow, scrolling asphalt, gravel shoulders, alternating curb strips, reflectors and braking/cornering tire marks add road detail. Traffic now includes distinct sedans, coupes and SUVs with contoured paintwork, windows, grilles, mirrors, detailed rotating wheels, LED lights and lane-change indicators. Fleet templates share geometry and batch static trim by material. Shared roadside meshes use instanced rendering to reduce draw calls. All effects remain local and require no new downloads.

## Working M5 cockpit

Cycle the camera button (or press C twice from chase view) to enter **Cockpit Cam**. It uses the supplied M5 cabin, including its original textured steering wheel, buttons, badge, dashboard and console, with the interior photo as the visual reference. The wheel’s 6,432 triangles are separated from the combined body mesh without removing any original model geometry. A steering-column pivot animates the wheel with speed-sensitive control input; pause freezes it and a restart centers it.

An in-world instrument display shows live km/h, a moving speed needle, RPM, gear and boost status. The driver camera follows steering anticipation and snaps between camera modes to avoid travelling through body panels. This retains the existing model’s interior rather than recreating every detail of the photograph.

## Engine sound and nitro exhaust

The default engine sound is a layered synthesized V8 with combustion pulses, low exhaust rumble, intake noise and subtle turbo sound. Pitch follows RPM, load changes its tone, and gear shifts briefly interrupt the engine note. An eight-speed drivetrain keeps the HUD gear and audio aligned, with bounded RPM and shift hysteresis. This approximates the character of BMW's [M5 CS V8 and eight-speed transmission](https://www.press.bmwgroup.com/global/article/detail/T0324217EN/the-new-bmw-m5-cs?language=en); it is not an exact recording.

The supplied MP3 is retained unchanged in `assets/m5-engine.mp3`, with an offline wrapper available for optional recording mode (`RaceEngineAudio({useRecording:true})` after loading that wrapper). It is not loaded in the default game.

Four animated exhaust jets show blue-white cores and orange trails while nitro is actively boosting, with a warm local light. Flames follow the body's movement and shut off on braking, boost release, empty nitro, pause or crash. These are gameplay effects.

## Phone support

Touch controls suppress text selection and long-press copy menus, accept simultaneous steering and nitro/brake presses, and release safely on pointer cancellation or pause. Portrait and landscape layouts keep buttons above the home indicator and clear of display cutouts. Short menus can scroll. A graphics-context interruption pauses the run until the browser restores graphics.

Mobile optimization preserves the full M5 mesh, texture resolution, lighting, shadows and rendering resolution. Roadside materials are shared across 18 instanced batches, with all 166,724 scenery triangles retained. Stationary menus and paused scenes redraw only when needed; HUD updates run at 15 Hz while driving physics and rendering remain independent. Base64 model decoding avoids a per-byte callback and intermediate array. These changes reduce work without introducing a reduced-quality mode. Performance still depends on the phone GPU and browser; real-device frame rates have not been measured.

## Controls

- Left / Right or A / D: steer
- W or Up: full throttle (the car automatically accelerates to cruising speed)
- Space: nitro (recharges when released; close passes give a bonus)
- Down or S: brake
- P or Escape: pause / resume
- C: cycle chase / hood / cockpit camera
- M: mute / unmute engine audio
- Enter: start or retry
- Touchscreen: on-screen steering, brake and nitro buttons

There is no finish line, distance cap, checkpoint requirement or time limit. Distance and drive time keep increasing. Every 15 seconds of active driving, current speed and cruise/throttle/nitro targets increase by 10%, cumulatively: 1.10× after 15 seconds, 1.21× after 30, 1.331× after 45. Braking remains available. The starting countdown, pauses and background tabs do not advance this timer; restarting resets the progression.

Traffic changes lanes; close passes add score, a temporary multiplier and nitro. Traffic collisions use swept contact detection and transfer momentum according to contact direction and relative speed. Gentle bumps do less damage than fast impacts (3–65% condition); sideswipes preserve forward speed while pushing both cars apart. Contact produces a brief yaw reaction and throttle/boost recovery period. Each traffic car has a 1.2-second damage cooldown, while physical separation remains active. Barriers remove 18% condition and have a brief damage cooldown. A run ends only when condition reaches zero. Best score is saved locally when storage is available. Leaving the window automatically pauses the game.

## Verification

Run `node tests/suspension.test.cjs` for acceleration/braking pitch, outside-wheel cornering load, settling and pause/reset behavior.

Run `node tests/cockpit.test.cjs` for original geometry preservation, steering-wheel animation, pause/reset and live instruments. `node tests/camera.test.cjs` verifies steering anticipation.

Run `node tests/audio.test.cjs` for recording integrity, drivetrain, audio routing and mute/pause checks; `node tests/effects.test.cjs` checks flame activation and shutoff. Audio routing uses a mocked Web Audio graph, so these checks do not establish subjective sound quality or browser MP3 decoding.

Run `node tests/mobile.test.cjs` for multi-touch, cancellation/reset, selection suppression and scenery batching without geometry/material loss.

Run `node tests/race.test.cjs` for driving, endless distance/time, damage/immunity, score persistence, cumulative speed increases, pause and restart checks, plus momentum, grip recovery, barrier deflection, 30/120 Hz consistency, directional collision impulses, damage scaling, per-car cooldowns and swept contact detection. Run `node tests/traffic.test.cjs` for fleet geometry, dimensions, wheel animation isolation and mesh-budget checks. Run `node tests/model.test.cjs` to validate the GLB and wheel geometry. Actual Chrome testing also covers WebGL startup, keyboard steering, boost, pause/resume, both cameras, restart and mobile rendering.

`car-loader.js` reads the local GLB wrapper; `collisions.js` detects swept traffic contacts; `traffic-cars.js` builds the shared procedural traffic fleet; `scene.js` owns lighting, scenery and cameras; `game.js` owns simulation, input, audio and HUD. `style.css` and `race.css` style the interface.

## Rebuild the supplied car asset

`node tools/convert-rpf.cjs /path/to/22m5/dlc.rpf`

This produces `assets/bmw-m5-cs.glb`, a base64 JavaScript wrapper for opening the game directly from disk, and `assets/model-info.json`. The converter supports this unencrypted RPF7 / Gen9 RSC7 model and BC1, BC3 and BGRA8 textures; it is not a general GTA importer. The source archive is read-only and is not copied into the project.
