# Night Shift

A first-person 3D horror game set in the Willow Creek convenience store. Play as Jimmy, the night clerk, and survive Level 1.

## Run locally

Requires Node.js 18 or later. No package installation or API keys are needed.

```sh
npm start
```

Open http://127.0.0.1:4173 in a modern browser with WebGL enabled. Serve the `dist` directory on any static host for deployment; opening `index.html` directly from the filesystem will not load JavaScript modules correctly.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse, or click and drag | Look |
| Shift | Walk faster |
| E | Interact with the nearby objective |
| M | Check the mirror from the counter |
| C | Check the security camera / return to the store |
| Escape | Pause, volume, brightness, subtitles, reduced camera movement |

Touch controls are also available. Pointer lock falls back to dragging when a browser does not allow it.

## Level 1

1. Check a normal customer's reflection and give them their change.
2. Follow knocking to the freezer. Release the trapped customer, who explains that a monster shoved them inside.
3. Return to the counter. Inspect the Grinner on the camera, then close the security shutter within **20 seconds**. Keep it shut while the Grinner knocks and asks Jimmy for cookies.
4. Serve another real customer.
5. Stop the independently crawling shadow with the emergency floodlights within **15 seconds**, then politely ask its customer to leave.

Failed timed encounters have checkpoint retries. Pausing stops both the encounter timers and audio.

## Art and sound

- Original procedural 3D store, illustrated product packaging, animated characters, real mirror reflection, dynamic shadows, and emergency lighting.
- Twelve bundled synthetic dialogue clips, including the Grinner's processed voice.
- Procedural footsteps, register, freezer knocks, shutter, doorbell, ambience, and monster effects.
- **No music.**

All game assets are bundled locally. The voices were rendered with Windows speech synthesis and processed for character delivery; they are synthetic performances. Three.js r170 and its Reflector helper are distributed under the MIT license in `dist/vendor/THREE-LICENSE.txt`.

## Development

`dist/game.js` manages the level and controls; `world.js` builds the store; `characters.js` builds and animates the cast; `audio.js` handles voice playback and sound effects. `index.html` and `style.css` provide the interface.

```sh
npm run check
npm test
```

The tests cover the full scripted sequence using a simulated renderer, interaction range, reflection gate, both countdown boundaries, paused timers, checkpoint resets, queued dialogue cancellation, audio restart, pause/resume, and sound-effect dispatch. They do not replace testing WebGL visuals in a browser.
