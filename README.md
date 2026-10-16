# After You

A local two-player strategy game for macOS. You make two possible shots. Your opponent chooses which one fires.

## Play

Open **After You.app**. Two people share a mouse.

1. Click two numbered pucks.
2. Drag forward from the first puck. The second gets the same strength in the opposite direction. Release to commit.
3. Your opponent clicks either highlighted puck to release it.
4. Let everything settle. The chooser makes the next offer.

All pucks are shared. Amber owns the upper-left and lower-right corners in the default view; Blue owns the other two. Pockets always score for their owner. At least four points ends the match after the whole shot settles; higher score wins, equal scores draw. Otherwise compare scores after twelve offers each. Rematches exchange the starting player.

Click **Try the clever bit** for the two-stage interactive example. Click **New match** to return to normal play. The example and full match use the same engine.

Right-drag to orbit, scroll to zoom, or choose **Overhead** for precision. Return an aiming drag to its starting puck, or press Escape, to cancel before committing. Sound can be muted for the current session.

The app works offline. Matches are local to the current window. This first prototype has no computer opponent or network multiplayer. Physics behavior has automated checks; strategic balance and human replay appeal remain playtest questions.

## Development

Requires Node.js and npm. Run `npm ci`, then `node node_modules/electron/install.js` if the Electron binary was not installed automatically. `npm start` opens the app, `npm test` tests physics and server isolation, and `npm run check` checks entry-point syntax. `npm run package` produces a locally ad-hoc-signed Apple silicon app under `release/`.

For native UI regression checks, launch `npm start -- --inspect-ui` and pass the loopback DevTools URL printed by Electron to `node scripts/verify-ui.mjs http://127.0.0.1:PORT`. The harness uses actual pointer and button events against the Electron window.

The renderer follows the [Three.js documentation](https://threejs.org/docs/); the local shell follows the [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security). All table geometry, procedural materials, sounds, and icon artwork are generated locally in this project. Three.js and Electron retain their bundled third-party licenses. Ad-hoc signing supports use on this Mac; this is not a notarized public-distribution release.
