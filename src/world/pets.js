// Chibi voxel animal buddies, built part-by-part so they can walk, blink,
// wag and hop. Each part is its own little voxel grid meshed with AO.
import * as THREE from '../../vendor/three.module.min.js';
import { VoxelGrid, Palette, modelMesh, makeVoxelMaterial } from './voxel.js';

export const PET_SCALE = 0.115;

export const SPECIES = {
  shiba: {
    name: 'Shiba Inu', jp: '柴犬', defaultName: 'Kinako',
    blurb: 'Loyal, curly-tailed and always up for a walk.',
    main: '#eba155', light: '#fff4e4', dark: '#c47630', inner: '#f7b9a2', nose: '#3a2a2e',
    ears: 'pointy', tail: 'curl', muzzle: true, brows: true, belly: true, socks: 'light',
  },
  cat: {
    name: 'Calico Cat', jp: '三毛猫', defaultName: 'Mochi',
    blurb: 'A lucky maneki-neko in training.',
    main: '#fffaf3', light: '#fffaf3', dark: '#3e3644', patch: '#f5a04a', inner: '#ffbccb', nose: '#ff8fae',
    ears: 'pointy', tail: 'long', calico: true, mouth: 'w',
  },
  bunny: {
    name: 'Bunny', jp: 'うさぎ', defaultName: 'Dango',
    blurb: 'Hops between snack stalls at full speed.',
    main: '#fff7fa', light: '#ffffff', dark: '#e6d4dc', inner: '#ffb3c9', nose: '#ff8fb0',
    ears: 'long', tail: 'pom', mouth: 'dot',
  },
  panda: {
    name: 'Panda', jp: 'パンダ', defaultName: 'Panpan',
    blurb: 'Visiting from Ueno Zoo. Loves bamboo shoots.',
    main: '#fbfbfb', light: '#ffffff', dark: '#2f2c36', inner: '#2f2c36', nose: '#2f2c36',
    ears: 'round', earDark: true, tail: 'pom', patches: true, limbsDark: true, mouth: 'dot',
  },
  tanuki: {
    name: 'Tanuki', jp: 'たぬき', defaultName: 'Ponta',
    blurb: 'A shape-shifting raccoon dog with a magic leaf.',
    main: '#a77a52', light: '#f3dfc4', dark: '#4b3b35', inner: '#4b3b35', nose: '#2f2628',
    ears: 'round', earDark: true, tail: 'bushy', mask: true, belly: true, leaf: true, limbsDark: true, mouth: 'dot',
  },
  fox: {
    name: 'Kitsune', jp: 'きつね', defaultName: 'Kon',
    blurb: 'Messenger of Inari shrines. Fluffy tail included.',
    main: '#f3923d', light: '#fff5e8', dark: '#3d2c2c', inner: '#fff5e8', nose: '#2f2628',
    ears: 'tall', tail: 'fluffy', muzzle: true, belly: true, socks: 'dark',
  },
};

export const COSMETICS = [
  { id: 'hachimaki', name: 'Hachimaki', jp: '鉢巻', slot: 'head', price: 300, blurb: 'Headband of determination. +100% vibes.' },
  { id: 'yellowcap', name: 'School Cap', jp: '黄色い帽子', slot: 'head', price: 450, blurb: 'The famous yellow hat for little explorers.' },
  { id: 'sakura', name: 'Sakura Pin', jp: '桜のピン', slot: 'face', price: 350, blurb: 'A cluster of cherry blossoms.' },
  { id: 'shades', name: 'Pixel Shades', jp: 'サングラス', slot: 'face', price: 600, blurb: 'Cool shades for Shibuya nights.' },
  { id: 'strawhat', name: 'Straw Hat', jp: '麦わら帽子', slot: 'head', price: 700, blurb: 'Perfect for a beach day in Odaiba.' },
  { id: 'scarf', name: 'Red Scarf', jp: 'マフラー', slot: 'neck', price: 500, blurb: 'Cozy for winter walks along the Sumida.' },
  { id: 'kitsune', name: 'Fox Mask', jp: '狐面', slot: 'face', price: 900, blurb: 'A festival mask worn on the side.' },
  { id: 'randoseru', name: 'Randoseru', jp: 'ランドセル', slot: 'back', price: 1200, blurb: 'A shiny red school backpack.' },
  { id: 'crown', name: 'Stamp Crown', jp: '王冠', slot: 'head', price: 0, stamps: 14, blurb: 'Collect all 14 stamps to unlock.' },
];

const sharedMat = makeVoxelMaterial();

function speciesPalette(sp) {
  const p = new Palette();
  p.add('main', sp.main, { jitter: 0.025 });
  p.add('light', sp.light, { jitter: 0.02 });
  p.add('dark', sp.dark, { jitter: 0.03 });
  p.add('inner', sp.inner, { jitter: 0.02 });
  p.add('nose', sp.nose, { jitter: 0 });
  p.add('patch', sp.patch || sp.dark, { jitter: 0.02 });
  p.add('blush', '#ff9db5', { jitter: 0 });
  p.add('mouth', '#4a2e36', { jitter: 0 });
  p.add('leaf', '#5fbf5a', { jitter: 0.05 });
  p.add('leaf2', '#3f9a47', { jitter: 0.05 });
  // cosmetic colours
  p.add('white', '#fbfbfb', { jitter: 0.02 });
  p.add('red', '#e8433a', { jitter: 0.03 });
  p.add('yellow', '#ffd23f', { jitter: 0.03 });
  p.add('straw', '#ecc77a', { jitter: 0.06 });
  p.add('black', '#26222c', { jitter: 0 });
  p.add('pink', '#ffb1cc', { jitter: 0.03 });
  p.add('pink2', '#ff86ae', { jitter: 0.03 });
  p.add('gold', '#ffcd3c', { jitter: 0.04 });
  p.add('gem', '#4fd2ff', { jitter: 0 });
  p.add('leather', '#c93a33', { jitter: 0.03 });
  p.add('buckle', '#e9e1c7', { jitter: 0 });
  return p;
}

// --- Part builders -----------------------------------------------------------
// Head grid: 13 × 17 × 12. Skull occupies x1..11, y0..8, z1..9 (front = z9).

function buildHead(sp, p) {
  const g = new VoxelGrid(13, 17, 12);
  const C = (n) => p.id(n);
  g.roundBox(1, 0, 1, 11, 8, 9, C('main'));
  if (sp.calico) {
    for (let y = 4; y <= 8; y++) for (let z = 1; z <= 9; z++) for (let x = 1; x <= 5; x++) if (g.get(x, y, z) && x + (8 - y) < 7) g.set(x, y, z, C('patch'));
    for (let y = 5; y <= 8; y++) for (let z = 1; z <= 6; z++) for (let x = 8; x <= 11; x++) if (g.get(x, y, z)) g.set(x, y, z, C('dark'));
  }
  // Light lower face / cheeks
  if (sp.muzzle || sp.mask || sp.belly) {
    for (let y = 0; y <= 3; y++) for (let x = 2; x <= 10; x++) for (let z = 7; z <= 9; z++) if (g.get(x, y, z)) g.set(x, y, z, C('light'));
    for (let y = 1; y <= 3; y++) for (let z = 4; z <= 8; z++) { if (g.get(1, y, z)) g.set(1, y, z, C('light')); if (g.get(11, y, z)) g.set(11, y, z, C('light')); }
  }
  if (sp.patches) {
    for (const x0 of [2, 8]) for (let y = 2; y <= 5; y++) for (let x = x0; x <= x0 + 2; x++) {
      if ((y === 5 && x === (x0 === 2 ? x0 : x0 + 2)) || (y === 2 && x === (x0 === 2 ? x0 + 2 : x0))) continue;
      g.set(x, y, 9, C('dark'));
    }
  }
  if (sp.mask) {
    for (const x0 of [2, 8]) for (let y = 3; y <= 4; y++) for (let x = x0; x <= x0 + 2; x++) g.set(x, y, 9, C('dark'));
    for (let y = 3; y <= 4; y++) { g.set(1, y, 8, C('dark')); g.set(11, y, 8, C('dark')); }
  }
  if (sp.brows) { g.set(3, 6, 9, C('light')); g.set(9, 6, 9, C('light')); }
  // Blush
  if (!sp.patches) { g.set(2, 2, 9, C('blush')); g.set(10, 2, 9, C('blush')); }
  else { g.set(2, 1, 9, C('blush')); g.set(10, 1, 9, C('blush')); }
  // Muzzle, nose, mouth
  if (sp.muzzle) {
    g.box(5, 1, 10, 7, 2, 10, C('light'));
    g.set(6, 2, 11, C('nose'));
    g.set(6, 1, 10, C('mouth'));
  } else if (sp.mouth === 'w') {
    g.set(6, 3, 9, C('nose'));
    g.set(5, 2, 9, C('mouth')); g.set(7, 2, 9, C('mouth'));
  } else {
    g.set(6, 3, 9, C('nose'));
    g.set(6, 2, 9, C('mouth'));
  }
  // Ears
  const earC = sp.earDark ? C('dark') : C('main');
  const ear = (side) => {
    const X = (x) => (side < 0 ? x : 12 - x);
    if (sp.ears === 'pointy') {
      const col = sp.calico ? (side < 0 ? C('patch') : C('dark')) : earC;
      for (let z = 4; z <= 6; z++) {
        g.set(X(2), 9, z, col); g.set(X(3), 9, z, col); g.set(X(4), 9, z, col);
        g.set(X(2), 10, z, col); g.set(X(3), 10, z, col);
        g.set(X(2), 11, z, col);
      }
      g.set(X(3), 9, 6, C('inner')); g.set(X(3), 10, 6, C('inner'));
    } else if (sp.ears === 'tall') {
      for (let z = 4; z <= 6; z++) {
        for (let x = 2; x <= 4; x++) g.set(X(x), 9, z, earC);
        for (let x = 2; x <= 4; x++) g.set(X(x), 10, z, earC);
        g.set(X(2), 11, z, C('dark')); g.set(X(3), 11, z, C('dark'));
        g.set(X(2), 12, z, C('dark'));
      }
      g.set(X(3), 9, 6, C('inner')); g.set(X(3), 10, 6, C('inner'));
    } else if (sp.ears === 'long') {
      for (let y = 9; y <= 15; y++) for (let z = 4; z <= 5; z++) for (let x = 3; x <= 4; x++) {
        if (y === 15 && x === 3) continue;
        g.set(X(x), y, z, earC);
      }
      for (let y = 10; y <= 14; y++) g.set(X(4), y, 5, C('inner'));
    } else {
      for (let z = 4; z <= 5; z++) {
        g.set(X(2), 9, z, earC); g.set(X(3), 9, z, earC); g.set(X(4), 9, z, earC);
        g.set(X(3), 10, z, earC); g.set(X(2), 10, z, earC);
      }
    }
  };
  ear(-1); ear(1);
  if (sp.leaf) {
    g.set(6, 9, 4, C('leaf2')); g.set(6, 10, 4, C('leaf')); g.set(7, 10, 4, C('leaf'));
    g.set(6, 11, 4, C('leaf')); g.set(5, 11, 4, C('leaf')); g.set(6, 12, 4, C('leaf2'));
  }
  return g;
}

function buildBody(sp, p) {
  const g = new VoxelGrid(9, 7, 8);
  const C = (n) => p.id(n);
  g.roundBox(1, 0, 1, 7, 5, 6, C('main'));
  if (sp.belly) for (let y = 1; y <= 4; y++) for (let x = 3; x <= 5; x++) g.set(x, y, 6, C('light'));
  if (sp.patches) for (let y = 4; y <= 5; y++) for (let z = 1; z <= 6; z++) for (let x = 1; x <= 7; x++) if (g.get(x, y, z)) g.set(x, y, z, C('dark'));
  if (sp.calico) { g.set(2, 3, 1, C('patch')); g.set(3, 3, 1, C('patch')); g.set(6, 2, 2, C('dark')); g.set(7, 2, 3, C('patch')); }
  return g;
}

function buildLimb(sp, p, h, tip) {
  const g = new VoxelGrid(2, h, 2);
  const base = sp.limbsDark ? p.id('dark') : p.id('main');
  g.box(0, 0, 0, 1, h - 1, 1, base);
  if (tip === 'light') g.box(0, 0, 0, 1, 0, 1, p.id('light'));
  if (tip === 'dark') g.box(0, 0, 0, 1, 1, 1, p.id('dark'));
  return g;
}

function buildTail(sp, p) {
  const C = (n) => p.id(n);
  let g;
  switch (sp.tail) {
    case 'curl':
      g = new VoxelGrid(3, 6, 4);
      g.box(0, 0, 0, 2, 1, 1, C('main'));
      g.box(0, 2, 1, 2, 3, 2, C('main'));
      g.box(0, 4, 1, 2, 5, 3, C('main'));
      g.box(1, 3, 3, 1, 4, 3, C('light'));
      g.set(1, 5, 2, C('light'));
      return { g, pivot: [1.5, 0, 0] };
    case 'long':
      g = new VoxelGrid(2, 8, 3);
      g.box(0, 0, 0, 1, 1, 1, C('main'));
      g.box(0, 2, 1, 1, 5, 1, C('main'));
      g.box(0, 6, 1, 1, 7, 2, C('patch'));
      return { g, pivot: [1, 0, 0] };
    case 'pom':
      g = new VoxelGrid(4, 4, 3);
      g.roundBox(0, 0, 0, 3, 3, 2, sp.limbsDark ? C('main') : C('light'));
      return { g, pivot: [2, 1.5, 0] };
    case 'bushy':
      g = new VoxelGrid(4, 5, 6);
      g.roundBox(0, 0, 0, 3, 4, 5, C('main'));
      for (const z of [1, 3]) for (let y = 0; y <= 4; y++) for (let x = 0; x <= 3; x++) if (g.get(x, y, z)) g.set(x, y, z, C('dark'));
      g.box(0, 0, 5, 3, 4, 5, 0);
      g.roundBox(0, 0, 4, 3, 4, 5, C('dark'));
      return { g, pivot: [2, 1, 0] };
    case 'fluffy':
    default:
      g = new VoxelGrid(5, 6, 7);
      g.roundBox(0, 0, 0, 4, 5, 6, C('main'));
      for (let y = 0; y <= 5; y++) for (let x = 0; x <= 4; x++) { if (g.get(x, y, 6)) g.set(x, y, 6, C('light')); if (g.get(x, y, 5)) g.set(x, y, 5, C('light')); }
      return { g, pivot: [2.5, 1, 0] };
  }
}

// --- Cosmetic builders (in head or body voxel space) ---------------------------

function buildCosmetic(id, p) {
  const C = (n) => p.id(n);
  let g;
  switch (id) {
    case 'hachimaki':
      g = new VoxelGrid(13, 17, 12);
      for (let z = 0; z <= 10; z++) for (let x = 0; x <= 12; x++) {
        const per = x === 0 || x === 12 || z === 0 || z === 10;
        if (per && !((x === 0 || x === 12) && (z === 0 || z === 10))) g.set(x, 6, z, C('white'));
      }
      g.set(6, 6, 10, C('red'));
      g.set(5, 5, 0, C('white')); g.set(7, 5, 0, C('white')); g.set(4, 4, 0, C('white')); g.set(8, 4, 0, C('white'));
      return { g, part: 'head' };
    case 'yellowcap':
      g = new VoxelGrid(13, 17, 13);
      g.roundBox(0, 7, 0, 12, 10, 10, C('yellow'));
      g.box(3, 7, 11, 9, 7, 12, C('yellow'));
      g.set(6, 11, 5, C('yellow'));
      return { g, part: 'head' };
    case 'strawhat':
      g = new VoxelGrid(17, 17, 15);
      g.cylinder(8.5, 7.5, 9, 9, 7.6, C('straw'));
      g.cylinder(8.5, 7.5, 10, 10, 4, C('red'));
      g.cylinder(8.5, 7.5, 11, 12, 4, C('straw'));
      return { g, part: 'head', offset: [-2, 0, -2] };
    case 'sakura':
      g = new VoxelGrid(13, 17, 12);
      for (const [x, y, z] of [[1, 8, 7], [2, 9, 7], [1, 9, 8], [0, 8, 8], [2, 8, 8], [1, 7, 6]]) g.set(x, y, z, C('pink'));
      g.set(1, 8, 8, C('pink2')); g.set(2, 9, 6, C('pink2'));
      return { g, part: 'head' };
    case 'shades':
      g = new VoxelGrid(13, 17, 12);
      g.box(2, 3, 10, 10, 5, 10, C('black'));
      g.box(5, 3, 10, 7, 3, 10, 0);
      g.set(3, 5, 10, C('white')); g.set(9, 5, 10, C('white'));
      g.box(1, 4, 7, 1, 4, 9, C('black')); g.box(11, 4, 7, 11, 4, 9, C('black'));
      return { g, part: 'head' };
    case 'kitsune':
      g = new VoxelGrid(13, 17, 12);
      g.roundBox(8, 6, 5, 12, 10, 7, C('white'));
      g.set(12, 8, 5, C('red')); g.set(12, 8, 7, C('red'));
      g.set(12, 7, 6, C('red'));
      g.set(9, 11, 5, C('white')); g.set(11, 11, 5, C('white')); g.set(9, 11, 6, C('red')); g.set(11, 11, 6, C('red'));
      return { g, part: 'head', offset: [1, 0, 0] };
    case 'crown':
      g = new VoxelGrid(13, 17, 12);
      for (let z = 3; z <= 7; z++) for (let x = 3; x <= 9; x++) {
        const per = x === 3 || x === 9 || z === 3 || z === 7;
        if (per) g.set(x, 9, z, C('gold'));
      }
      for (const [x, z] of [[3, 3], [6, 3], [9, 3], [3, 7], [9, 7], [6, 7], [3, 5], [9, 5]]) g.set(x, 10, z, C('gold'));
      g.set(6, 10, 7, C('gem')); g.set(6, 11, 7, C('gold'));
      return { g, part: 'head' };
    case 'scarf':
      g = new VoxelGrid(9, 7, 9);
      for (let z = 0; z <= 7; z++) for (let x = 0; x <= 8; x++) {
        const per = x === 0 || x === 8 || z === 0 || z === 7;
        if (per && !((x === 0 || x === 8) && (z === 0 || z === 7))) g.set(x, 5, z, C('red'));
      }
      g.box(5, 2, 7, 6, 4, 7, C('red')); g.set(5, 2, 8, C('white')); g.set(6, 2, 8, C('white'));
      return { g, part: 'body', offset: [0, 0, 0] };
    case 'randoseru':
      g = new VoxelGrid(9, 7, 9);
      g.roundBox(1, 0, 0, 7, 6, 2, C('leather'));
      g.box(2, 2, 0, 6, 5, 0, C('red'));
      g.set(4, 2, 0, C('buckle'));
      return { g, part: 'body', offset: [0, 0, -2] };
    default:
      return null;
  }
}

// --- Pet ------------------------------------------------------------------------

export class Pet {
  constructor(species = 'shiba', outfit = {}) {
    this.root = new THREE.Group();
    this.inner = new THREE.Group();
    this.root.add(this.inner);
    this.t = Math.random() * 10;
    this.walkPhase = 0;
    this.moving = 0; // 0..1 blend
    this.blinkTimer = 2;
    this.blink = 0;
    this.jumpT = -1;
    this.sleeping = false;
    this.build(species, outfit);
  }

  build(species, outfit = {}) {
    this.species = species;
    this.outfit = { ...outfit };
    const sp = SPECIES[species] || SPECIES.shiba;
    const p = speciesPalette(sp);
    this.inner.clear();
    const s = PET_SCALE;
    const mesh = (g, pivot) => modelMesh(g, p, s, pivot, sharedMat);

    // Legs
    this.legs = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.7 * s, 3 * s, 0.2 * s);
      pivot.add(mesh(buildLimb(sp, p, 3, sp.socks), [1, 3, 1]));
      this.inner.add(pivot);
      this.legs.push(pivot);
    }
    // Body
    this.body = new THREE.Group();
    this.body.position.set(0, 2.6 * s, 0);
    const bodyMesh = mesh(buildBody(sp, p), [4.5, 0, 4]);
    this.body.add(bodyMesh);
    this.inner.add(this.body);
    // Arms
    this.arms = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 4.1 * s, 5.4 * s, 0.4 * s);
      pivot.add(mesh(buildLimb(sp, p, 4, sp.socks === 'dark' ? 'dark' : sp.socks ? 'light' : null), [1, 4, 1]));
      pivot.rotation.z = side * 0.12;
      this.body.add(pivot);
      this.arms.push(pivot);
    }
    // Tail
    const tail = buildTail(sp, p);
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.6 * s, -2.6 * s);
    const tailMesh = mesh(tail.g, tail.pivot);
    tailMesh.rotation.y = Math.PI;
    this.tail.add(tailMesh);
    this.body.add(this.tail);
    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 5.6 * s, 0.3 * s);
    this.headInner = new THREE.Group();
    this.headInner.add(mesh(buildHead(sp, p), [6.5, 0, 5.5]));
    this.head.add(this.headInner);
    this.body.add(this.head);
    // Eyes (separate so they can blink)
    this.eyes = [];
    const eyeMat = new THREE.MeshLambertMaterial({ color: sp.patches ? 0x15131a : 0x2b2230 });
    const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const ex of [3, 9]) {
      const e = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.BoxGeometry(1.15 * s, 2.1 * s, 0.35 * s), eyeMat);
      const hi = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.1 * s), hiMat);
      hi.position.set(0.25 * s, 0.55 * s, 0.2 * s);
      e.add(ball, hi);
      e.position.set((ex + 0.5 - 6.5) * s, 4 * s, (10 - 5.5 + 0.12) * s);
      this.headInner.add(e);
      this.eyes.push(e);
    }
    // Cosmetics
    this.cosmetics = [];
    for (const id of Object.values(this.outfit)) {
      if (!id) continue;
      const c = buildCosmetic(id, p);
      if (!c) continue;
      const off = c.offset || [0, 0, 0];
      if (c.part === 'head') {
        const m = mesh(c.g, [6.5 - off[0], 0 - off[1], 5.5 - off[2]]);
        this.headInner.add(m);
        this.cosmetics.push(m);
      } else {
        const m = mesh(c.g, [4.5 - off[0], 0 - off[1], 4 - off[2]]);
        this.body.add(m);
        this.cosmetics.push(m);
      }
    }
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  }

  hop() { this.jumpT = 0; }

  // state: { moving (bool), stepRate (steps/s visual), sleeping }
  update(dt, state = {}) {
    this.t += dt;
    const target = state.moving ? 1 : 0;
    this.moving += (target - this.moving) * Math.min(1, dt * 8);
    const rate = state.stepRate || 6;
    this.walkPhase += dt * rate * this.moving;
    const sw = Math.sin(this.walkPhase);
    const m = this.moving;

    this.legs[0].rotation.x = sw * 0.7 * m;
    this.legs[1].rotation.x = -sw * 0.7 * m;
    this.arms[0].rotation.x = -sw * 0.6 * m;
    this.arms[1].rotation.x = sw * 0.6 * m;
    const breathe = Math.sin(this.t * 2.2) * 0.02 * (1 - m);
    this.body.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
    this.inner.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.09 * m;
    this.body.rotation.z = sw * 0.04 * m;
    this.head.rotation.z = Math.sin(this.t * 1.3) * 0.05 * (1 - m) - sw * 0.05 * m;
    this.head.rotation.x = this.sleeping ? 0.25 : Math.sin(this.t * 0.9) * 0.03;
    this.tail.rotation.y = Math.sin(this.t * (this.sleeping ? 1 : 9)) * (this.sleeping ? 0.1 : 0.45);

    // Blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.blink = 0.16; this.blinkTimer = 2 + Math.random() * 3.5; }
    if (this.blink > 0) this.blink -= dt;
    const closed = this.sleeping || this.blink > 0;
    for (const e of this.eyes) e.scale.y += ((closed ? 0.15 : 1) - e.scale.y) * Math.min(1, dt * 30);

    // Hop
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      const T = 0.55;
      const k = this.jumpT / T;
      if (k >= 1) { this.jumpT = -1; this.inner.scale.set(1, 1, 1); }
      else {
        const hgt = Math.sin(k * Math.PI) * 0.9;
        this.inner.position.y += hgt;
        const sq = k < 0.15 ? 1 - Math.sin((k / 0.15) * Math.PI) * 0.18 : 1 + Math.sin(k * Math.PI) * 0.08;
        this.inner.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        this.arms[0].rotation.z = -1.9 * Math.sin(k * Math.PI);
        this.arms[1].rotation.z = 1.9 * Math.sin(k * Math.PI);
      }
    } else {
      this.arms[0].rotation.z += (-0.12 - this.arms[0].rotation.z) * Math.min(1, dt * 10);
      this.arms[1].rotation.z += (0.12 - this.arms[1].rotation.z) * Math.min(1, dt * 10);
    }
  }
}

// Height of the pet's head top in world units (for bubbles / camera framing).
export const PET_HEIGHT = 19 * PET_SCALE;
