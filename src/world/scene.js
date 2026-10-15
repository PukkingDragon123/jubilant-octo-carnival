// Three.js scene: renderer, sky & time of day, the meshed Tokyo diorama,
// animated water, Yamanote train, Ferris wheel, boats, seasonal particles,
// the buddy, and a touch-friendly follow camera.
import * as THREE from '../../vendor/three.module.min.js';
import { meshGrid, makeVoxelMaterial, voxelUniforms, VoxelGrid, Palette, modelMesh } from './voxel.js';
import { buildTokyo, W, D, Y0, LANDMARKS, SUMIDA, catmull } from './tokyo.js';
import { Pet, PET_HEIGHT } from './pets.js';
import { clamp, lerp, smooth, seasonOf } from '../util.js';

THREE.ColorManagement.enabled = false;

const SKY = {
  // [top, horizon, sun colour, sun intensity, hemi sky, hemi ground, hemi intensity]
  dawn: ['#7fa3e0', '#ffc7b8', '#ffd2b0', 2.1, '#bcd0ff', '#8a6a7a', 1.45],
  day: ['#5fb4ff', '#cdeeff', '#fff4dd', 2.5, '#d6ecff', '#8c8a70', 1.55],
  sunset: ['#6b74c9', '#ffb27a', '#ffb98a', 2.0, '#ffd2c0', '#7a5a70', 1.4],
  night: ['#1a1d4a', '#45407e', '#a9bcff', 1.25, '#7c86d6', '#2a2448', 1.7],
};

function mixHex(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export class World {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.date = opts.date || new Date();
    this.season = opts.season || seasonOf(this.date);
    this.timeMode = 'auto';
    this.listeners = {};
    this.clock = new THREE.Clock();
    this.elapsed = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);

    this.buildSky();
    this.buildLights();

    const t0 = performance.now();
    this.map = buildTokyo({ date: this.date, season: this.season });
    this.material = makeVoxelMaterial();
    this.buildMapMeshes();
    this.buildWater();
    this.buildBase();
    this.buildTrain();
    this.buildFerris();
    this.buildBoats();
    this.buildClouds();
    this.buildParticles();
    this.buildMarkers();
    this.buildTimeAt = performance.now() - t0;

    this.pet = new Pet(opts.species || 'shiba', opts.outfit || {});
    this.scene.add(this.pet.root);
    // A little lantern glow that keeps the buddy readable after dark.
    this.petLight = new THREE.PointLight('#ffd49a', 0, 9, 1.2);
    this.scene.add(this.petLight);
    this.petPos = new THREE.Vector3(LANDMARKS[2].x, Y0, LANDMARKS[2].z);
    this.petYaw = 0;
    this.pet.root.position.copy(this.petPos);

    // Camera rig
    this.rig = {
      target: this.petPos.clone(),
      yaw: -0.65, pitch: 1.04, dist: 44,
      wantYaw: -0.65, wantPitch: 1.04, wantDist: 44,
      follow: true, focus: null,
    };
    this.raycaster = new THREE.Raycaster();
    // X-ray pass: the buddy shows as a pink silhouette wherever buildings hide it.
    this.xrayMat = new THREE.MeshBasicMaterial({ color: '#ff7fae', transparent: true, opacity: 0.55, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false });
    this.renderer.autoClear = false;
    this.renderer.shadowMap.autoUpdate = false;
    this.raycaster.layers.enableAll();
    for (const l of [this.hemi, this.sun, this.petLight]) l.layers.enable(1);
    this.setPet(opts.species || 'shiba', opts.outfit || {});
    this.setupControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.applyTimeOfDay(true);
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }

  // ---------------------------------------------------------------- building
  buildSky() {
    const geo = new THREE.SphereGeometry(600, 24, 12);
    this.skyUniforms = {
      top: { value: new THREE.Color('#5fb4ff') },
      horizon: { value: new THREE.Color('#cdeeff') },
      stars: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 horizon; uniform float stars; varying vec3 vDir;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){
          float t = clamp(vDir.y * 1.6, 0.0, 1.0);
          vec3 c = mix(horizon, top, pow(t, 0.7));
          // pixel bands for a retro gradient
          c = floor(c * 24.0) / 24.0;
          vec2 g = floor(vec2(atan(vDir.z, vDir.x) * 120.0, vDir.y * 120.0));
          float s = step(0.996, h(g)) * stars * smoothstep(0.05, 0.35, vDir.y);
          gl_FragColor = vec4(c + s, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog('#cdeeff', 160, 480);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#d6ecff', '#8c8a70', 1.55);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff4dd', 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    const sc = this.sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  buildMapMeshes() {
    const C = 32;
    this.chunks = new THREE.Group();
    for (let cz = 0; cz < D; cz += C)
      for (let cx = 0; cx < W; cx += C) {
        const geo = meshGrid(this.map.grid, this.map.palette, { x0: cx, x1: cx + C, z0: cz, z1: cz + C });
        if (!geo) continue;
        const m = new THREE.Mesh(geo, this.material);
        m.castShadow = true;
        m.receiveShadow = true;
        this.chunks.add(m);
      }
    this.scene.add(this.chunks);
  }

  buildWater() {
    // Shore mask: distance (in cells) from each water cell to land, packed in a texture.
    const size = W;
    const mask = new Uint8Array(W * D * 4);
    const { type } = this.map;
    for (let z = 0; z < D; z++)
      for (let x = 0; x < W; x++) {
        let near = 3;
        if (type[x + z * W] === 1) {
          for (let dz = -2; dz <= 2; dz++)
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx, nz = z + dz;
              if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
              if (type[nx + nz * W] !== 1 && type[nx + nz * W] !== 7) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dz)));
            }
        } else near = 0;
        const i = (x + z * W) * 4;
        mask[i] = (near / 3) * 255;
        mask[i + 3] = 255;
      }
    const tex = new THREE.DataTexture(mask, size, D, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this.waterUniforms = {
      uTime: { value: 0 },
      uShore: { value: tex },
      uDeep: { value: new THREE.Color('#3f8fd6') },
      uShallow: { value: new THREE.Color('#7cd0f2') },
      uNight: voxelUniforms.uNight,
      fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms, transparent: true, fog: true, depthWrite: false,
      vertexShader: `
        varying vec2 vCell; varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz; vCell = wp.xz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime; uniform sampler2D uShore; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uNight;
        varying vec2 vCell; varying vec3 vWorld;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 uv = vCell / vec2(${W}.0, ${D}.0);
          float shore = texture2D(uShore, uv).r;
          if (shore < 0.01) discard;
          // quantise to a 4×4 sub-pixel grid per voxel for a pixel-art shimmer
          vec2 px = floor(vCell * 4.0);
          float wave = sin(px.x * 0.35 + uTime * 1.3) * sin(px.y * 0.3 - uTime * 1.1);
          float sparkle = step(0.985, h(px + floor(uTime * 2.0)));
          vec3 c = mix(uShallow, uDeep, smoothstep(0.3, 1.0, shore));
          c += wave * 0.035;
          float foam = step(shore, 0.34) * step(0.55, h(px + floor(uTime * 1.5) * 3.1));
          c = mix(c, vec3(1.0), foam * 0.75);
          c += sparkle * 0.5 * (1.0 - uNight * 0.6);
          c *= mix(1.0, 0.42, uNight);
          gl_FragColor = vec4(c, 0.86);
          #include <fog_fragment>
        }`,
    });
    const geo = new THREE.PlaneGeometry(W, D, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(W / 2, Y0 - 0.32, D / 2);
    this.water.renderOrder = 2;
    this.scene.add(this.water);
  }

  buildBase() {
    // A soft drop shadow "table" under the diorama.
    const geo = new THREE.PlaneGeometry(W * 3, D * 3);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: '#6d5b8f' });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.position.set(W / 2, -0.05, D / 2);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  buildTrain() {
    const p = new Palette();
    p.add('body', '#e9edf2', { jitter: 0.02 });
    p.add('green', '#79c943', { jitter: 0.02 });
    p.add('win', '#3b4f6e', { emit: '#ffe9a8', emitStrength: 0.9 });
    p.add('dark', '#4b4f5c');
    p.add('light', '#fff6c8', { emit: '#fff3b0', always: true });
    const car = (front) => {
      const g = new VoxelGrid(5, 5, 14);
      g.box(0, 1, 0, 4, 4, 13, p.id('body'));
      g.box(0, 0, 1, 4, 0, 12, p.id('dark'));
      g.box(0, 2, 0, 4, 2, 13, p.id('green'));
      for (let z = 1; z < 13; z++) if (z % 3) { g.set(0, 3, z, p.id('win')); g.set(4, 3, z, p.id('win')); }
      if (front) { g.box(1, 3, 13, 3, 3, 13, p.id('win')); g.set(1, 1, 13, p.id('light')); g.set(3, 1, 13, p.id('light')); }
      return g;
    };
    const mat = makeVoxelMaterial();
    this.trainCars = [];
    for (let i = 0; i < 5; i++) {
      const m = modelMesh(car(i === 0), p, 0.2, [2.5, 0, 7], mat);
      this.scene.add(m);
      this.trainCars.push(m);
    }
    const pts = this.map.railCurve.map(([x, z]) => new THREE.Vector3(x, Y0 + 0.02, z));
    this.railPath = new THREE.CatmullRomCurve3(pts, true);
    this.railLen = this.railPath.getLength();
    this.trainS = 0;
  }

  buildFerris() {
    const f = this.map.ferris;
    const p = new Palette();
    p.add('frame', '#eef2f8', { jitter: 0.02, emit: '#bfe8ff', emitStrength: 0.7 });
    const cabColors = ['#ff7aa8', '#ffd25a', '#5fd4ff', '#8ee07a', '#c49cff', '#ff9a5a'];
    cabColors.forEach((c, i) => p.add('cab' + i, c, { jitter: 0.03, emit: c, emitStrength: 0.8 }));
    const R = 15;
    const g = new VoxelGrid(2 * R + 3, 2 * R + 3, 2);
    const c = R + 1;
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      g.set(Math.round(c + Math.cos(a) * R), Math.round(c + Math.sin(a) * R), 0, p.id('frame'));
      g.set(Math.round(c + Math.cos(a) * R), Math.round(c + Math.sin(a) * R), 1, p.id('frame'));
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      for (let r = 0; r < R; r += 0.5) g.set(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), k % 2, p.id('frame'));
    }
    const mat = makeVoxelMaterial();
    const s = f.r / R;
    this.ferris = new THREE.Group();
    this.ferris.position.set(f.x, f.y, f.z);
    const wheel = modelMesh(g, p, s, [c + 0.5, c + 0.5, 1], mat);
    this.ferris.add(wheel);
    this.ferrisCabs = [];
    for (let k = 0; k < 12; k++) {
      const cg = new VoxelGrid(3, 3, 3);
      cg.roundBox(0, 0, 0, 2, 2, 2, p.id('cab' + (k % cabColors.length)));
      cg.box(0, 0, 0, 2, 2, 2, p.id('cab' + (k % cabColors.length)));
      const cab = modelMesh(cg, p, s * 1.1, [1.5, 2.6, 1.5], mat);
      this.ferris.add(cab);
      this.ferrisCabs.push({ mesh: cab, a: (k / 12) * Math.PI * 2 });
    }
    this.ferrisWheel = wheel;
    this.scene.add(this.ferris);
  }

  buildBoats() {
    const p = new Palette();
    p.add('hull', '#8a5a3c', { jitter: 0.04 });
    p.add('roof', '#e8e2d2');
    p.add('lantern', '#ff6040', { emit: '#ff7040', always: true });
    p.add('win', '#ffe3a0', { emit: '#ffcc66', emitStrength: 1 });
    const g = new VoxelGrid(3, 3, 7);
    g.box(0, 0, 0, 2, 0, 6, p.id('hull'));
    g.box(0, 1, 1, 2, 1, 5, p.id('win'));
    g.box(0, 2, 1, 2, 2, 5, p.id('roof'));
    g.set(1, 1, 0, p.id('lantern'));
    g.set(1, 1, 6, p.id('lantern'));
    const mat = makeVoxelMaterial();
    const river = catmull(SUMIDA.slice(1, -1), false, 12).map(([x, z]) => new THREE.Vector3(x, Y0 - 0.45, z));
    this.riverPath = new THREE.CatmullRomCurve3(river);
    this.boats = [];
    for (let i = 0; i < 3; i++) {
      const m = modelMesh(g, p, 0.33, [1.5, 0, 3.5], mat);
      this.scene.add(m);
      this.boats.push({ mesh: m, s: i / 3, dir: i % 2 ? 1 : -1 });
    }
  }

  buildClouds() {
    const p = new Palette();
    p.add('c', '#ffffff', { jitter: 0.03 });
    p.add('c2', '#eef2ff', { jitter: 0.03 });
    const mat = makeVoxelMaterial({ transparent: true, opacity: 0.82, depthWrite: false });
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const g = new VoxelGrid(12, 4, 8);
      const rnd = (n) => Math.abs(Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
      for (let k = 0; k < 5; k++) {
        const cx = 2 + rnd(k) * 7, cz = 2 + rnd(k + 9) * 4, r = 1.6 + rnd(k + 3) * 1.6;
        g.sphere(cx, 1.2, cz, r, rnd(k + 5) < 0.5 ? p.id('c') : p.id('c2'));
      }
      for (let z = 0; z < 8; z++) for (let x = 0; x < 12; x++) g.set(x, 0, z, g.get(x, 1, z) ? p.id('c2') : 0);
      const m = modelMesh(g, p, 1.5, [6, 0, 4], mat);
      m.castShadow = true;
      m.receiveShadow = false;
      m.position.set(rnd(1) * W, 56 + rnd(2) * 14, rnd(3) * D);
      this.scene.add(m);
      this.clouds.push({ mesh: m, speed: 1 + rnd(4) * 1.5 });
    }
  }

  buildParticles() {
    const N = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    this.particleSeeds = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 4; k++) this.particleSeeds[i * 4 + k] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colors = { spring: '#ffb7d0', summer: '#fff6a8', autumn: '#ff8a3d', winter: '#ffffff' };
    const mat = new THREE.PointsMaterial({ color: colors[this.season], size: this.season === 'summer' ? 0.35 : 0.45, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.particles = new THREE.Points(geo, mat);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  buildMarkers() {
    // Destination beacon: a bobbing voxel pin.
    const p = new Palette();
    p.add('pin', '#ff5f8f', { emit: '#ff5f8f', always: true, emitStrength: 0.5 });
    p.add('pinLight', '#ffd0df', { emit: '#ffd0df', always: true, emitStrength: 0.5 });
    const g = new VoxelGrid(5, 7, 5);
    g.roundBox(0, 3, 0, 4, 6, 4, p.id('pin'));
    g.set(1, 5, 2, p.id('pinLight')); g.set(1, 6, 2, p.id('pinLight'));
    g.box(1, 1, 1, 3, 2, 3, p.id('pin'));
    g.set(2, 0, 2, p.id('pin'));
    const mat = makeVoxelMaterial();
    this.destPin = modelMesh(g, p, 0.45, [2.5, 0, 2.5], mat);
    this.destPin.visible = false;
    this.scene.add(this.destPin);
    // Soft blob shadow + ring under the pet
    const blobGeo = new THREE.CircleGeometry(0.85, 20);
    blobGeo.rotateX(-Math.PI / 2);
    this.blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ color: '#1b1530', transparent: true, opacity: 0.3, depthWrite: false }));
    this.blob.renderOrder = 3;
    this.scene.add(this.blob);
    const ringGeo = new THREE.RingGeometry(0.9, 1.15, 24);
    ringGeo.rotateX(-Math.PI / 2);
    this.petRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ff86b0', transparent: true, opacity: 0.85, depthWrite: false }));
    this.petRing.renderOrder = 3;
    this.scene.add(this.petRing);
    // Path trail dots
    this.trail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), new THREE.MeshBasicMaterial({ color: '#ff86b0' }), 400);
    this.trail.count = 0;
    this.trail.renderOrder = 3;
    this.scene.add(this.trail);
  }

  setTrail(points) {
    const m = new THREE.Matrix4();
    let n = 0;
    if (points && points.length > 1) {
      let acc = 0;
      for (let i = 1; i < points.length && n < 400; i++) {
        const a = points[i - 1], b = points[i];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        for (let d = acc; d < len && n < 400; d += 1.1) {
          const t = d / len;
          m.makeTranslation(a.x + (b.x - a.x) * t, Y0 + 0.06, a.z + (b.z - a.z) * t);
          this.trail.setMatrixAt(n++, m);
        }
        acc = 0;
      }
    }
    this.trail.count = n;
    this.trail.instanceMatrix.needsUpdate = true;
  }

  setDestination(lm) {
    this.dest = lm;
    this.destPin.visible = !!lm;
  }

  // ----------------------------------------------------------------- pet
  setPet(species, outfit) {
    this.pet.build(species, outfit);
    this.pet.root.traverse((o) => { if (o.isMesh) o.layers.set(1); });
  }

  // ----------------------------------------------------------------- controls
  setupControls() {
    const el = this.canvas;
    const pointers = new Map();
    let downAt = null;
    let moved = 0;
    let pinch = null;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button }; moved = 0; }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.rig.wantDist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) {
        if (downAt && (downAt.button === 2 || e.shiftKey)) this.pan(dx, dy);
        else {
          this.rig.wantYaw -= dx * 0.008;
          this.rig.wantPitch = clamp(this.rig.wantPitch + dy * 0.006, 0.3, 1.45);
        }
      } else if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.rig.wantDist = clamp(pinch.dist * (pinch.d / d), 8, 230);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this.pan(mx - pinch.mx, my - pinch.my);
        pinch.mx = mx; pinch.my = my;
      }
    });
    const up = (e) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (wasSingle && downAt && moved < 10 && performance.now() - downAt.t < 450) this.tap(e.clientX, e.clientY);
      if (pointers.size === 0) downAt = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.rig.wantDist = clamp(this.rig.wantDist * Math.exp(e.deltaY * 0.0012), 8, 230);
    }, { passive: false });
  }

  pan(dx, dy) {
    const r = this.rig;
    const k = r.dist * 0.0022;
    const s = Math.sin(r.yaw), c = Math.cos(r.yaw);
    r.target.x += (-c * dx - s * dy) * k;
    r.target.z += (s * dx - c * dy) * k;
    r.target.x = clamp(r.target.x, -10, W + 10);
    r.target.z = clamp(r.target.z, -10, D + 10);
    if (r.follow) { r.follow = false; this.emit('follow', false); }
  }

  recenter() {
    this.rig.follow = true;
    this.rig.focus = null;
    this.emit('follow', true);
  }

  overview() {
    this.rig.follow = false;
    this.rig.target.set(W / 2, Y0, D / 2 + 6);
    this.rig.wantDist = 210;
    this.rig.wantPitch = 1.05;
    this.emit('follow', false);
  }

  focusOn(x, z, dist = 34) {
    this.rig.follow = false;
    this.rig.focus = new THREE.Vector3(x, Y0, z);
    this.rig.wantDist = dist;
    this.emit('follow', false);
  }

  // closeup: true frames the pet for the buddy screen
  setCloseup(on, shift = 0.24) {
    this.closeup = on;
    this.wantShift = on ? shift : 0;
    if (on) {
      this.savedRig = { dist: this.rig.wantDist, pitch: this.rig.wantPitch };
      this.rig.follow = true;
      this.rig.wantDist = 9;
      this.rig.wantPitch = 0.32;
      this.rig.wantYaw = this.petYaw + Math.PI * 0.12;
    } else if (this.savedRig) {
      this.rig.wantDist = this.savedRig.dist;
      this.rig.wantPitch = this.savedRig.pitch;
    }
  }

  tap(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // Pet?
    const hitPet = this.raycaster.intersectObject(this.pet.root, true);
    if (hitPet.length) { this.pet.hop(); this.emit('petTap'); return; }
    // Ground plane hit → nearest landmark
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y0);
    const hits = this.raycaster.intersectObjects(this.chunks.children, false);
    const pt = hits.length ? hits[0].point : this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!pt) return;
    let best = null, bd = Infinity;
    for (const l of LANDMARKS) {
      const d = Math.hypot(pt.x - l.x, pt.z - l.z);
      if (d < bd) { bd = d; best = l; }
    }
    const reach = Math.max(9, this.rig.dist * 0.08);
    if (best && bd < reach) this.emit('landmarkTap', best);
    else this.emit('groundTap', { x: pt.x, z: pt.z });
  }

  // -------------------------------------------------------------- time of day
  phaseFor(date) {
    if (this.timeMode !== 'auto') return this.timeMode;
    const h = date.getHours() + date.getMinutes() / 60;
    if (h >= 5 && h < 7.5) return 'dawn';
    if (h >= 7.5 && h < 16.5) return 'day';
    if (h >= 16.5 && h < 18.5) return 'sunset';
    return 'night';
  }

  setTimeMode(mode) { this.timeMode = mode; this.applyTimeOfDay(true); }

  applyTimeOfDay(instant = false) {
    const phase = this.phaseFor(new Date());
    const s = SKY[phase];
    const k = instant ? 1 : 0.02;
    const cur = this._sky || { top: new THREE.Color(s[0]), hor: new THREE.Color(s[1]), sun: new THREE.Color(s[2]), si: s[3], hs: new THREE.Color(s[4]), hg: new THREE.Color(s[5]), hi: s[6], night: phase === 'night' ? 1 : 0 };
    cur.top.lerp(new THREE.Color(s[0]), k); cur.hor.lerp(new THREE.Color(s[1]), k);
    cur.sun.lerp(new THREE.Color(s[2]), k); cur.si = lerp(cur.si, s[3], k);
    cur.hs.lerp(new THREE.Color(s[4]), k); cur.hg.lerp(new THREE.Color(s[5]), k); cur.hi = lerp(cur.hi, s[6], k);
    const wantNight = phase === 'night' ? 1 : phase === 'sunset' ? 0.45 : phase === 'dawn' ? 0.25 : 0;
    cur.night = lerp(cur.night, wantNight, k);
    this._sky = cur;
    this.phase = phase;
    this.skyUniforms.top.value.copy(cur.top);
    this.skyUniforms.horizon.value.copy(cur.hor);
    this.skyUniforms.stars.value = cur.night;
    this.scene.fog.color.copy(cur.hor);
    this.sun.color.copy(cur.sun);
    this.sun.intensity = cur.si;
    this.hemi.color.copy(cur.hs);
    this.hemi.groundColor.copy(cur.hg);
    this.hemi.intensity = cur.hi;
    voxelUniforms.uNight.value = cur.night;
    const deep = mixHex('#3f8fd6', '#1f3f7a', cur.night);
    this.waterUniforms.uDeep.value.copy(deep);
    this.waterUniforms.uShallow.value.copy(mixHex('#7cd0f2', '#3a6aa8', cur.night));
    this.ground.material.color.copy(mixHex('#6d5b8f', '#231d3d', cur.night));
    // sun direction: low and warm at dawn/sunset
    const elev = phase === 'day' ? 1.0 : phase === 'night' ? 0.9 : 0.45;
    this.sunDir = new THREE.Vector3(-0.55, elev, 0.4).normalize();
  }

  // ----------------------------------------------------------------- frame
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait phones need a wider vertical FOV to keep the map readable.
    this.camera.fov = w < h ? 46 : 34;
    this.camera.updateProjectionMatrix();
  }

  // Called every frame by the app with the pet's walking state.
  update(petState) {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    const t = this.elapsed;
    this.waterUniforms.uTime.value = t;
    if (Math.floor(t * 2) !== this._todTick) { this._todTick = Math.floor(t * 2); }
    this.applyTimeOfDay(false);

    // Pet transform
    const p = this.pet.root.position;
    p.lerp(this.petPos, Math.min(1, dt * 10));
    const yawDiff = Math.atan2(Math.sin(this.petYaw - this.pet.root.rotation.y), Math.cos(this.petYaw - this.pet.root.rotation.y));
    this.pet.root.rotation.y += yawDiff * Math.min(1, dt * 8);
    this.pet.update(dt, petState);
    this.petRing.position.set(p.x, Y0 + 0.05, p.z);
    this.blob.position.set(p.x, Y0 + 0.04, p.z);
    const lift = Math.max(0, this.pet.inner.position.y);
    this.blob.scale.setScalar(1 - Math.min(0.5, lift * 0.5));
    this.petLight.position.set(p.x + 0.8, Y0 + 3.2, p.z + 1.4);
    this.petLight.intensity = voxelUniforms.uNight.value * 9;
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    this.petRing.scale.set(pulse, 1, pulse);

    // Destination pin
    if (this.dest) {
      this.destPin.position.set(this.dest.x, Y0 + 9 + Math.sin(t * 3) * 0.6, this.dest.z);
      this.destPin.rotation.y = t * 1.5;
    }

    // Train
    this.trainS = (this.trainS + dt * 3.2) % this.railLen;
    for (let i = 0; i < this.trainCars.length; i++) {
      const s = (((this.trainS - i * 2.95) % this.railLen) + this.railLen) % this.railLen;
      const u = s / this.railLen;
      const pos = this.railPath.getPointAt(u);
      const tan = this.railPath.getTangentAt(u);
      this.trainCars[i].position.copy(pos);
      this.trainCars[i].rotation.y = Math.atan2(tan.x, tan.z);
    }

    // Ferris wheel
    const fa = t * 0.12;
    this.ferrisWheel.rotation.z = fa;
    const R = this.map.ferris.r * 0.97;
    for (const c of this.ferrisCabs) {
      c.mesh.position.set(Math.cos(c.a + fa) * R, Math.sin(c.a + fa) * R, 0);
    }

    // Boats
    for (const b of this.boats) {
      b.s = (b.s + dt * 0.006 * b.dir + 1) % 1;
      const pos = this.riverPath.getPointAt(b.s);
      const tan = this.riverPath.getTangentAt(b.s);
      b.mesh.position.copy(pos);
      b.mesh.position.y += Math.sin(t * 2 + b.s * 20) * 0.04;
      b.mesh.rotation.y = Math.atan2(tan.x * b.dir, tan.z * b.dir);
    }

    // Clouds drift east
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > W + 40) c.mesh.position.x = -40;
    }

    this.updateParticles(t);
    this.updateCamera(dt);

    // Shadow camera follows the view target; widen it when zoomed out.
    const tgt = this.rig.target;
    const span = clamp(this.rig.dist * 0.9, 40, 120);
    const sc = this.sun.shadow.camera;
    if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
    this.sun.target.position.copy(tgt);
    this.sun.position.copy(tgt).addScaledVector(this.sunDir, 160);

    // Pass 1: the city (layer 0). Pass 2: x-ray silhouette where the buddy is
    // hidden. Pass 3: the buddy itself (layer 1), lit and shadow-receiving.
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.clear();
    this.camera.layers.set(0);
    this.renderer.render(this.scene, this.camera);
    this.camera.layers.set(1);
    if (!this.closeup) {
      this.scene.overrideMaterial = this.xrayMat;
      this.renderer.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
    }
    this.renderer.render(this.scene, this.camera);
    this.camera.layers.set(0);
  }

  updateParticles(t) {
    const pos = this.particles.geometry.attributes.position.array;
    const c = this.rig.target;
    const area = clamp(this.rig.dist * 1.2, 30, 140);
    const seeds = this.particleSeeds;
    const fall = this.season === 'summer' ? 0 : this.season === 'winter' ? 2.2 : 1.4;
    for (let i = 0; i < pos.length / 3; i++) {
      const s0 = seeds[i * 4], s1 = seeds[i * 4 + 1], s2 = seeds[i * 4 + 2], s3 = seeds[i * 4 + 3];
      const life = (t * (0.05 + s3 * 0.05) + s0) % 1;
      let x = c.x + (s1 - 0.5) * area + Math.sin(t * 0.7 + s2 * 20) * 2;
      let z = c.z + (s2 - 0.5) * area + Math.cos(t * 0.6 + s1 * 20) * 2;
      let y = Y0 + 30 * (1 - life) * (fall ? 1 : 0.2) + (fall ? 0 : 1 + Math.sin(t * 2 + s0 * 30) * 1.5);
      if (this.season === 'summer') { y = Y0 + 1 + s3 * 4 + Math.sin(t * 1.5 + s0 * 40) * 0.6; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    // Summer fireflies only glow at night.
    this.particles.material.opacity = this.season === 'summer' ? voxelUniforms.uNight.value * 0.95 : 0.9;
  }

  updateCamera(dt) {
    const r = this.rig;
    if (r.follow) {
      const want = this.pet.root.position.clone();
      want.y = Y0 + (this.closeup ? PET_HEIGHT * 0.55 : 1);
      r.target.lerp(want, Math.min(1, dt * 4));
    } else if (r.focus) {
      r.target.lerp(r.focus, Math.min(1, dt * 3));
    }
    const k = Math.min(1, dt * 6);
    // Shift the projection so the buddy sits above bottom sheets in close-up.
    this.shift = (this.shift || 0) + ((this.wantShift || 0) - (this.shift || 0)) * k;
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    if (Math.abs(this.shift) > 0.002) this.camera.setViewOffset(w, h, 0, h * this.shift, w, h);
    else if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();
    r.yaw += (r.wantYaw - r.yaw) * k;
    r.pitch += (r.wantPitch - r.pitch) * k;
    r.dist += (r.wantDist - r.dist) * k;
    const cp = Math.cos(r.pitch), sp = Math.sin(r.pitch);
    this.camera.position.set(
      r.target.x + Math.sin(r.yaw) * cp * r.dist,
      r.target.y + sp * r.dist,
      r.target.z + Math.cos(r.yaw) * cp * r.dist,
    );
    this.camera.lookAt(r.target);
  }

  // Project a world point to screen pixels (null when behind the camera).
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const rect = this.canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, depth: v.z };
  }

  // Render a square portrait of the buddy's face into a data URL.
  portrait(size = 96) {
    const p = this.pet.root;
    const saved = { pos: p.position.clone(), rot: p.rotation.y, parent: p.parent };
    const url = this.renderPortrait(p, size);
    saved.parent.add(p);
    p.position.copy(saved.pos);
    p.rotation.y = saved.rot;
    return url;
  }

  // Portrait of any species/outfit combination (cached), e.g. for pickers.
  portraitFor(species, outfit = {}, size = 72) {
    const key = `${species}|${JSON.stringify(outfit)}|${size}`;
    this._portraits ||= new Map();
    if (this._portraits.has(key)) return this._portraits.get(key);
    const tmp = new Pet(species, outfit);
    const url = this.renderPortrait(tmp.root, size);
    tmp.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    this._portraits.set(key, url);
    return url;
  }

  renderPortrait(root, size) {
    const rt = new THREE.WebGLRenderTarget(size, size);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    cam.layers.enableAll();
    const holder = new THREE.Scene();
    holder.add(new THREE.HemisphereLight('#ffffff', '#b0a0c0', 2.2));
    const dl = new THREE.DirectionalLight('#ffffff', 1.6);
    dl.position.set(2, 4, 5);
    holder.add(dl);
    holder.add(root);
    root.position.set(0, 0, 0);
    root.rotation.y = 0.35;
    cam.position.set(0.9, PET_HEIGHT * 0.78, 4.4);
    cam.lookAt(0, PET_HEIGHT * 0.7, 0);
    const prevNight = voxelUniforms.uNight.value;
    voxelUniforms.uNight.value = 0;
    this.renderer.setRenderTarget(rt);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(holder, cam);
    const buf = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    this.renderer.setRenderTarget(null);
    voxelUniforms.uNight.value = prevNight;
    holder.remove(root);
    rt.dispose();
    const cvs = document.createElement('canvas');
    cvs.width = size; cvs.height = size;
    const ctx = cvs.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    return cvs.toDataURL();
  }
}
