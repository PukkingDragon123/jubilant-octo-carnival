// Sanity check: build the voxel world headlessly, mesh it, and report stats.
import { buildTokyo, LANDMARKS, W, D } from '../src/world/tokyo.js';
import { meshGrid } from '../src/world/voxel.js';

let t = performance.now();
const world = buildTokyo({ date: new Date(2026, 9, 15), season: 'autumn' });
console.log(`build: ${(performance.now() - t).toFixed(0)} ms`);
t = performance.now();
let faces = 0, chunks = 0;
const C = 32;
for (let cz = 0; cz < D; cz += C)
  for (let cx = 0; cx < W; cx += C) {
    const geo = meshGrid(world.grid, world.palette, { x0: cx, x1: cx + C, z0: cz, z1: cz + C });
    if (geo) { faces += geo.index.count / 6; chunks++; }
  }
console.log(`mesh: ${(performance.now() - t).toFixed(0)} ms, ${chunks} chunks, ${faces} faces`);
let solid = 0;
for (const v of world.grid.data) if (v) solid++;
console.log(`solid voxels: ${solid}`);
// Landmark reachability: nearest walkable cell to each landmark.
for (const l of LANDMARKS) {
  let best = null;
  for (let r = 0; r < 12 && !best; r++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.floor(l.x) + dx, z = Math.floor(l.z) + dz;
        if (world.walkable(x, z)) { const d = Math.hypot(x + 0.5 - l.x, z + 0.5 - l.z); if (!best || d < best.d) best = { x, z, d }; }
      }
  console.log(l.id.padEnd(14), best ? `entry (${best.x},${best.z}) d=${best.d.toFixed(1)} r=${l.r}` : 'UNREACHABLE');
  if (!best) process.exitCode = 1;
}
if (faces < 10000) { console.error('Suspiciously small mesh'); process.exitCode = 1; }
