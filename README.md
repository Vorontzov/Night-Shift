# Night Shift

A first-person 3D horror game set in the Willow Creek convenience store. Play as Jimmy, the night clerk, and survive two nights. Click **Clock In** to choose either level; both are available immediately.

## Play in your browser

**[Play Night Shift](https://vorontzov.github.io/Night-Shift/)**

No installation or local server is needed. The GitHub Pages site opens the game directly from this repository. Click **Clock In**, then choose Level 1 or Level 2.

Pages publishes from `main` at `/ (root)`. The root `index.html` displays the game in `dist/`, and `.nojekyll` keeps the bundled assets unchanged. Updates pushed to `main` publish automatically through GitHub's built-in Pages deployment.

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
| Shift | Run |
| E | Interact with the nearby objective |
| M | Check the mirror from the counter |
| C | Check the security camera / return to the store |
| Escape | Pause, master/music volume, brightness, subtitles, reduced camera movement, level selection |

Touch controls are also available. Pointer lock falls back to dragging when a browser does not allow it.

## Level 1

1. Check a normal customer's reflection and give them their change.
2. Follow knocking to the freezer. Release the trapped customer, who explains that a monster shoved them inside.
3. Return to the counter. Inspect the Grinner on the camera, then close the security shutter within **20 seconds**. Keep it shut while the Grinner knocks and asks Jimmy for cookies.
4. Serve another real customer.
5. Stop the independently crawling shadow with the emergency floodlights within **15 seconds**, then politely ask its customer to leave.

Failed timed encounters have checkpoint retries. Pausing stops both the encounter timers and audio.

## Level 2 — All eyes on you

1. Jimmy is hungry. Walk to the marked chips on the left shelf and press **E**.
2. The **Visionary**, a tall shadowy figure covered in 47 eyes, whispers: “Oh, Kimmy… you’re so kiiiind.” Run around the left end of the counter to the red phone. You have **25 seconds** to call the police before it catches you.
3. The shutter closes while you call. Two officers arrive with flashing patrol-car lights and escort the Visionary out.
4. Open the shutter, check the next customer's reflection, and give them their change.
5. The Grinner returns. Check the camera and close the shutter within **20 seconds**. Its new line ends: “I saved you the last biiite.” Wait for it to leave, then open the shutter to complete the shift.

The Visionary retry starts at the snack objective; the Grinner retry starts at the camera check. Restart retains the selected level. Level selection is also available from pause and completion screens.

## Art and sound

- Original procedural 3D store, illustrated product packaging, animated characters, real mirror reflection, dynamic shadows, and emergency lighting.
- Twenty-two bundled synthetic dialogue clips, including the Visionary, dispatcher, officers, and the Grinner's new performance.
- Procedural footsteps, register, freezer knocks, shutter, doorbell, ambience, and monster effects.
- Original procedural horror music with calm and threat arrangements. It lowers during dialogue, pauses with gameplay, and has its own music volume slider (set it to 0% to mute).

All game assets are bundled locally. The voices were rendered with Windows speech synthesis and processed for character delivery; they are synthetic performances. Three.js r170 and its Reflector helper are distributed under the MIT license in `dist/vendor/THREE-LICENSE.txt`.

## Development

`dist/game.js` manages the level and controls; `world.js` builds the store; `characters.js` builds and animates the cast; `audio.js` handles voice playback and sound effects. `index.html` and `style.css` provide the interface.

```sh
npm run check
npm test
```

The tests cover both scripted levels using a simulated renderer, level selection, interaction ranges, reflection gates, countdown boundaries, paused timers, checkpoint resets, cancellation when switching levels, queued dialogue cancellation, music lifecycle/ducking, audio restart, pause/resume, and sound-effect dispatch. They do not replace testing WebGL visuals in a browser.
