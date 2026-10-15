// Pathfinding over the walkable voxel streets, and movement along a route.
import { W, D } from '../world/tokyo.js';

class Heap {
  constructor() { this.a = []; }
  push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top[1];
  }
  get size() { return this.a.length; }
}

export class Pathfinder {
  constructor(map) {
    this.map = map;
    this.g = new Float32Array(W * D);
    this.from = new Int32Array(W * D);
    this.closed = new Uint8Array(W * D);
  }

  ok(x, z) { return this.map.walkable(x, z); }

  nearestWalkable(x, z, maxR = 24) {
    const cx = Math.floor(x), cz = Math.floor(z);
    if (this.ok(cx, cz)) return { x: cx, z: cz };
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!this.ok(cx + dx, cz + dz)) continue;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = { x: cx + dx, z: cz + dz }; }
        }
      if (best) return best;
    }
    return null;
  }

  // A* with 8-way moves (no corner cutting). Returns smoothed points (cell centres).
  find(from, to) {
    const s = this.nearestWalkable(from.x, from.z);
    const t = this.nearestWalkable(to.x, to.z);
    if (!s || !t) return null;
    const si = s.x + s.z * W, ti = t.x + t.z * W;
    this.g.fill(Infinity);
    this.closed.fill(0);
    this.from.fill(-1);
    const heap = new Heap();
    const h = (x, z) => { const dx = Math.abs(x - t.x), dz = Math.abs(z - t.z); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    this.g[si] = 0;
    heap.push(si, h(s.x, s.z));
    let found = false;
    let iter = 0;
    while (heap.size && iter++ < 60000) {
      const i = heap.pop();
      if (this.closed[i]) continue;
      if (i === ti) { found = true; break; }
      this.closed[i] = 1;
      const x = i % W, z = (i / W) | 0;
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = x + dx, nz = z + dz;
          if (!this.ok(nx, nz)) continue;
          if (dx && dz && (!this.ok(x + dx, z) || !this.ok(x, z + dz))) continue;
          const ni = nx + nz * W;
          if (this.closed[ni]) continue;
          const ng = this.g[i] + (dx && dz ? 1.414 : 1);
          if (ng < this.g[ni]) {
            this.g[ni] = ng;
            this.from[ni] = i;
            heap.push(ni, ng + h(nx, nz));
          }
        }
    }
    if (!found) return null;
    const cells = [];
    for (let i = ti; i !== -1; i = this.from[i]) cells.push({ x: (i % W) + 0.5, z: ((i / W) | 0) + 0.5 });
    cells.reverse();
    return this.smooth(cells);
  }

  lineClear(a, b) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.ceil(len * 4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (!this.ok(Math.floor(x), Math.floor(z))) return false;
      // keep a little clearance so the buddy doesn't graze walls
      if (!this.ok(Math.floor(x + 0.3), Math.floor(z)) || !this.ok(Math.floor(x - 0.3), Math.floor(z))) return false;
      if (!this.ok(Math.floor(x), Math.floor(z + 0.3)) || !this.ok(Math.floor(x), Math.floor(z - 0.3))) return false;
    }
    return true;
  }

  smooth(cells) {
    if (cells.length <= 2) return cells;
    const out = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !this.lineClear(cells[i], cells[j])) j--;
      out.push(cells[j]);
      i = j;
    }
    return out;
  }
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return L;
}

// Point at distance d along a polyline, plus the heading there.
export function pointAlong(pts, d) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (acc + seg >= d) {
      const t = seg ? (d - acc) / seg : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z), i };
    }
    acc += seg;
  }
  const b = pts[pts.length - 1], a = pts[Math.max(0, pts.length - 2)];
  return { x: b.x, z: b.z, yaw: Math.atan2(b.x - a.x, b.z - a.z), i: pts.length - 1 };
}
