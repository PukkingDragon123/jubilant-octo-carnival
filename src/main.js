// Boot: build the voxel world, wire sensors + game + UI, run the frame loop.
import { World } from './world/scene.js';
import { Tracker } from './game/tracker.js';
import { Game } from './game/game.js';
import { UI } from './ui/ui.js';
import { installSprites } from './ui/pixel.js';
import { setBar } from './ui/common.js';
import { LANDMARKS } from './world/tokyo.js';

const loading = document.getElementById('loading');
const bar = document.getElementById('loading-bar');
const text = document.getElementById('loading-text');

function progress(p, msg) {
  setBar(bar, p, 12);
  if (msg) text.textContent = msg;
}

function fail(err) {
  console.error(err);
  text.textContent = 'Tokotoko needs WebGL to draw its tiny Tokyo. Try another browser or device.';
}

async function boot() {
  installSprites();
  progress(0.15, 'Sharpening pixels…');
  await new Promise((r) => requestAnimationFrame(r));
  try {
    // Fonts help the stamp book render crisply; don't block for long.
    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  } catch { /* fonts are optional */ }
  progress(0.35, 'Building a tiny Tokyo…');
  await new Promise((r) => setTimeout(r, 30));

  let world;
  try {
    world = new World(document.getElementById('world'));
  } catch (e) {
    fail(e);
    return;
  }
  progress(0.8, 'Waking up your buddy…');
  await new Promise((r) => setTimeout(r, 30));

  const tracker = new Tracker();
  const game = new Game(world, tracker);
  const ui = new UI(game, world, tracker);
  game.init();
  ui.init();
  window.tokotoko = { world, game, ui, tracker, landmarks: LANDMARKS };

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const petState = game.frame(dt);
    world.pet.sleeping = petState.sleeping;
    world.update(petState);
    ui.frame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  progress(1, 'Itte kimasu!');
  setTimeout(() => loading.classList.add('done'), 250);
  setTimeout(() => loading.remove(), 900);

  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
