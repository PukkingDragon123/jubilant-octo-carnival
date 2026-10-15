// Voxel engine: a dense grid of palette indices, a face-culling mesher with
// baked ambient occlusion and per-voxel colour jitter, and a Lambert material
// that adds a per-vertex emissive glow (window lights, neon, lanterns).
import * as THREE from '../../vendor/three.module.min.js';
import { hash3 } from '../util.js';

export class Palette {
  constructor() {
    this.colors = [null];
    this.byName = Object.create(null);
  }

  // emit: hex glow colour. always: glow in daylight too (neon, screens).
  add(name, hex, { jitter = 0.05, emit = null, always = false, emitStrength = 1 } = {}) {
    const c = new THREE.Color(hex);
    const e = emit ? new THREE.Color(emit) : null;
    const entry = {
      r: c.r, g: c.g, b: c.b, jitter,
      er: e ? e.r * emitStrength : 0,
      eg: e ? e.g * emitStrength : 0,
      eb: e ? e.b * emitStrength : 0,
      always,
    };
    const i = this.colors.length;
    if (i > 255) throw new Error('Palette full');
    this.colors.push(entry);
    this.byName[name] = i;
    return i;
  }

  id(name) {
    const i = this.byName[name];
    if (i === undefined) throw new Error(`Unknown colour ${name}`);
    return i;
  }
}

export class VoxelGrid {
  constructor(w, h, d) {
    this.w = w; this.h = h; this.d = d;
    this.data = new Uint8Array(w * h * d);
    this.solidBelow = false; // treat y < 0 as solid (culls the bottom of a map)
  }

  index(x, y, z) { return x + this.w * (z + this.d * y); }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d;
  }

  get(x, y, z) {
    if (y < 0) return this.solidBelow ? 1 : 0;
    if (!this.inside(x, y, z)) return 0;
    return this.data[this.index(x, y, z)];
  }

  set(x, y, z, c) {
    x |= 0; y |= 0; z |= 0;
    if (this.inside(x, y, z)) this.data[this.index(x, y, z)] = c;
  }

  // Inclusive box fill; coordinates may be given in any order.
  box(x0, y0, z0, x1, y1, z1, c) {
    const ax = Math.min(x0, x1) | 0, bx = Math.max(x0, x1) | 0;
    const ay = Math.min(y0, y1) | 0, by = Math.max(y0, y1) | 0;
    const az = Math.min(z0, z1) | 0, bz = Math.max(z0, z1) | 0;
    for (let y = ay; y <= by; y++)
      for (let z = az; z <= bz; z++)
        for (let x = ax; x <= bx; x++) this.set(x, y, z, c);
  }

  // Box with its 12 edges shaved off — reads as "rounded" at voxel scale.
  roundBox(x0, y0, z0, x1, y1, z1, c) {
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const ex = x === x0 || x === x1;
          const ey = y === y0 || y === y1;
          const ez = z === z0 || z === z1;
          if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
          this.set(x, y, z, c);
        }
  }

  // Vertical cylinder (inclusive y range), centre at (cx, cz) in cell coords.
  cylinder(cx, cz, y0, y1, r, c, hollow = false) {
    const r2 = r * r, ri2 = (r - 1) * (r - 1);
    for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > r2) continue;
        if (hollow && d2 < ri2) continue;
        for (let y = y0; y <= y1; y++) this.set(x, y, z, c);
      }
  }

  sphere(cx, cy, cz, r, c) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dz = z + 0.5 - cz;
          if (dx * dx + dy * dy + dz * dz <= r2) this.set(x, y, z, c);
        }
  }
}

// ---------------------------------------------------------------------------
// Mesher

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
// Each face: axis a, sign s, tangent axes u, v chosen so u × v = +a.
const FACES = [];
for (const a of [0, 1, 2]) {
  for (const s of [1, -1]) {
    const u = (a + 1) % 3, v = (a + 2) % 3;
    const corners = s > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
    // Slight directional shading baked in, so silhouettes read even in flat light.
    const shade = a === 1 ? (s > 0 ? 1.0 : 0.62) : a === 0 ? 0.9 : 0.82;
    FACES.push({ a, s, u, v, corners, shade });
  }
}

class GrowBuffers {
  constructor(faces = 4096) { this.alloc(faces); this.n = 0; }
  alloc(faces) {
    const old = this;
    const pos = new Float32Array(faces * 12);
    const nor = new Int8Array(faces * 12);
    const col = new Uint8Array(faces * 12);
    const emi = new Uint8Array(faces * 16);
    if (old.pos) {
      pos.set(old.pos); nor.set(old.nor); col.set(old.col); emi.set(old.emi);
    }
    this.pos = pos; this.nor = nor; this.col = col; this.emi = emi; this.cap = faces;
  }
  ensure() { if (this.n >= this.cap) this.alloc(this.cap * 2); }
}

/**
 * Build a BufferGeometry for a region of the grid.
 * opts: x0,x1,z0,z1 (half-open), scale, offset [x,y,z], seed (jitter seed)
 */
export function meshGrid(grid, palette, opts = {}) {
  const {
    x0 = 0, x1 = grid.w, z0 = 0, z1 = grid.d, y0 = 0, y1 = grid.h,
    scale = 1, offset = [0, 0, 0], seed = 0, ao = true,
  } = opts;
  const buf = new GrowBuffers();
  const p = [0, 0, 0];
  const L = [0, 0, 0];
  const aoVals = [0, 0, 0, 0];
  const data = grid.data;
  const W = grid.w, D = grid.d;

  const solid = (x, y, z) => grid.get(x, y, z) !== 0;

  for (let y = y0; y < y1; y++) {
    for (let z = z0; z < z1; z++) {
      let i = x0 + W * (z + D * y);
      for (let x = x0; x < x1; x++, i++) {
        const c = data[i];
        if (!c) continue;
        const pc = palette.colors[c];
        const jit = 1 + (hash3(x + seed, y, z) - 0.5) * 2 * pc.jitter;
        p[0] = x; p[1] = y; p[2] = z;
        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          L[0] = x; L[1] = y; L[2] = z;
          L[F.a] += F.s;
          if (solid(L[0], L[1], L[2])) continue;
          buf.ensure();
          const n = buf.n++;
          // AO per corner.
          for (let k = 0; k < 4; k++) {
            if (!ao) { aoVals[k] = 3; continue; }
            const [du, dv] = F.corners[k];
            const su = du ? 1 : -1, sv = dv ? 1 : -1;
            const q = [L[0], L[1], L[2]];
            q[F.u] += su;
            const s1 = solid(q[0], q[1], q[2]) ? 1 : 0;
            q[F.v] += sv;
            const cr = solid(q[0], q[1], q[2]) ? 1 : 0;
            q[F.u] -= su;
            const s2 = solid(q[0], q[1], q[2]) ? 1 : 0;
            aoVals[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
          }
          // Flip the quad diagonal to follow AO and avoid anisotropy artefacts.
          const flip = aoVals[0] + aoVals[2] < aoVals[1] + aoVals[3];
          const order = flip ? [1, 2, 3, 0] : [0, 1, 2, 3];
          for (let kk = 0; kk < 4; kk++) {
            const k = order[kk];
            const [du, dv] = F.corners[k];
            const vx = [p[0], p[1], p[2]];
            if (F.s > 0) vx[F.a] += 1;
            vx[F.u] += du;
            vx[F.v] += dv;
            const o = n * 12 + kk * 3;
            buf.pos[o] = vx[0] * scale + offset[0];
            buf.pos[o + 1] = vx[1] * scale + offset[1];
            buf.pos[o + 2] = vx[2] * scale + offset[2];
            buf.nor[o + F.a] = F.s * 127;
            const shade = jit * F.shade * AO_CURVE[aoVals[k]];
            buf.col[o] = Math.min(255, pc.r * shade * 255);
            buf.col[o + 1] = Math.min(255, pc.g * shade * 255);
            buf.col[o + 2] = Math.min(255, pc.b * shade * 255);
            const e = n * 16 + kk * 4;
            const ej = 0.85 + 0.3 * hash3(x, y + 7, z);
            buf.emi[e] = Math.min(255, pc.er * ej * 255);
            buf.emi[e + 1] = Math.min(255, pc.eg * ej * 255);
            buf.emi[e + 2] = Math.min(255, pc.eb * ej * 255);
            buf.emi[e + 3] = pc.always ? 255 : 0;
          }
        }
      }
    }
  }
  if (buf.n === 0) return null;
  const n = buf.n;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(buf.pos.slice(0, n * 12), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(buf.nor.slice(0, n * 12), 3, true));
  geo.setAttribute('color', new THREE.BufferAttribute(buf.col.slice(0, n * 12), 3, true));
  geo.setAttribute('emit', new THREE.BufferAttribute(buf.emi.slice(0, n * 16), 4, true));
  const idx = new Uint32Array(n * 6);
  for (let f = 0; f < n; f++) {
    const b = f * 4, o = f * 6;
    idx[o] = b; idx[o + 1] = b + 1; idx[o + 2] = b + 2;
    idx[o + 3] = b; idx[o + 4] = b + 2; idx[o + 5] = b + 3;
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

// Uniforms shared by every voxel material (time of day drives glow).
export const voxelUniforms = {
  uNight: { value: 0 },
  uGlowBoost: { value: 1 },
};

export function makeVoxelMaterial(extra = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, ...extra });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = voxelUniforms.uNight;
    shader.uniforms.uGlowBoost = voxelUniforms.uGlowBoost;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 emit;\nvarying vec4 vEmit;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvEmit = emit;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vEmit;\nuniform float uNight;\nuniform float uGlowBoost;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit.rgb * max(vEmit.a * 0.85, uNight) * uGlowBoost;',
      );
  };
  mat.customProgramCacheKey = () => 'voxel-glow';
  return mat;
}

// Mesh a small model grid into a Mesh centred on a pivot (in voxel units).
export function modelMesh(grid, palette, scale, pivot = [0, 0, 0], material) {
  const geo = meshGrid(grid, palette, {
    scale,
    offset: [-pivot[0] * scale, -pivot[1] * scale, -pivot[2] * scale],
  });
  if (!geo) return new THREE.Group();
  const mesh = new THREE.Mesh(geo, material || makeVoxelMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
