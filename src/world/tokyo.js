// Procedural voxel diorama of central Tokyo.
// The map is a 160×160 grid covering roughly lon 139.685–139.825 and
// lat 35.615–35.725 (≈ 78 m per voxel). Landmarks are hand-placed on top of a
// generated city of streets, blocks, parks, rivers and the Yamanote loop.
import { VoxelGrid, Palette } from './voxel.js';
import { hash3, clamp, mulberry32 } from '../util.js';

export const W = 160;
export const D = 160;
export const H = 76;
export const Y0 = 6; // walking surface height
export const GEO = { lonMin: 139.685, lonMax: 139.825, latMin: 35.615, latMax: 35.725 };
export const METERS_PER_UNIT = 78;

export function geoToMap(lat, lon) {
  return {
    x: ((lon - GEO.lonMin) / (GEO.lonMax - GEO.lonMin)) * W,
    z: ((GEO.latMax - lat) / (GEO.latMax - GEO.latMin)) * D,
  };
}

export function inTokyo(lat, lon) {
  return lat > GEO.latMin && lat < GEO.latMax && lon > GEO.lonMin && lon < GEO.lonMax;
}

// Cell types
export const T = {
  URBAN: 0, WATER: 1, ROAD: 2, PARK: 3, PLAZA: 4, RAIL: 5, FOREST: 6,
  BRIDGE: 7, STREET: 8, BUILT: 9, BEACH: 10,
};
const WALKABLE = new Set([T.ROAD, T.PARK, T.PLAZA, T.FOREST, T.BRIDGE, T.STREET, T.BEACH]);

// Paint layer for ground decoration
const PAINT = { NONE: 0, STRIPE: 1, GRAVEL: 2, CHECK: 3, LINE: 4, SIDEWALK: 5 };

export const LANDMARKS = [
  {
    id: 'shinjuku', name: 'Shinjuku', jp: '新宿', x: 21, z: 47, r: 5, ink: '#3c6fd8', icon: 'tower',
    food: 'yakitori',
    fact: 'Shinjuku Station is the busiest station on Earth: about 3.5 million riders a day. Look for the giant 3D calico cat on the east side!',
  },
  {
    id: 'harajuku', name: 'Harajuku', jp: '原宿', x: 22, z: 79, r: 5, ink: '#e4508f', icon: 'torii',
    food: 'crepe',
    fact: 'Meiji Jingū’s forest was planted by hand with 100,000 trees donated from all over Japan. Takeshita Street is right across the tracks.',
  },
  {
    id: 'shibuya', name: 'Shibuya', jp: '渋谷', x: 18, z: 98, r: 5, ink: '#2a9d8f', icon: 'buddy',
    food: 'bubbletea',
    fact: 'Up to 3,000 people cross the Scramble at once. Hachikō the loyal Akita waits by the station exit.',
  },
  {
    id: 'roppongi', name: 'Roppongi', jp: '六本木', x: 52, z: 91, r: 4, ink: '#6a4fc4', icon: 'tower',
    food: 'pancake',
    fact: 'Mori Tower’s rooftop Sky Deck is one of the few open-air observation decks in Tokyo.',
  },
  {
    id: 'tokyotower', name: 'Tokyo Tower', jp: '東京タワー', x: 68, z: 98, r: 7, ink: '#e8552d', icon: 'tower',
    food: 'softserve',
    fact: '333 m of “International Orange” steel, repainted by hand every five years. It glows warm orange after dark.',
  },
  {
    id: 'imperial', name: 'Imperial Palace', jp: '皇居', x: 83.5, z: 62, r: 4, ink: '#2f7d5b', icon: 'castle',
    food: 'matcha',
    fact: 'The palace moat is home to swans and carp, and the East Gardens are free to stroll most days.',
  },
  {
    id: 'tokyostation', name: 'Tokyo Station', jp: '東京駅', x: 89, z: 64, r: 4, ink: '#b8432f', icon: 'train',
    food: 'ekiben',
    fact: 'The 1914 red-brick Marunouchi building got its twin domes back in a 2012 restoration.',
  },
  {
    id: 'ginza', name: 'Ginza', jp: '銀座', x: 95, z: 81, r: 4, ink: '#a68a3a', icon: 'clock',
    food: 'anpan',
    fact: 'The Wakō clock tower has watched over Ginza 4-chōme since 1932. Kimuraya nearby invented anpan in 1874.',
  },
  {
    id: 'tsukiji', name: 'Tsukiji', jp: '築地', x: 98, z: 91, r: 4, ink: '#2f6fb0', icon: 'fish',
    food: 'tamagoyaki',
    fact: 'The tuna auctions moved to Toyosu, but the outer market still sells tamagoyaki on a stick.',
  },
  {
    id: 'akihabara', name: 'Akihabara', jp: '秋葉原', x: 101, z: 39, r: 5, ink: '#d83cc0', icon: 'bolt',
    food: 'omurice',
    fact: 'Akiba started as a post-war radio parts market. Now it’s arcades, anime shops and capsule toys.',
  },
  {
    id: 'ueno', name: 'Ueno', jp: '上野', x: 101, z: 12, r: 5, ink: '#e06a8b', icon: 'panda',
    food: 'pandabun',
    fact: 'Ueno Zoo welcomed Japan’s first giant pandas, Kang Kang and Lan Lan, in 1972.',
  },
  {
    id: 'asakusa', name: 'Asakusa', jp: '浅草', x: 124, z: 17, r: 6, ink: '#d23b2f', icon: 'lantern',
    food: 'melonpan',
    fact: 'Sensō-ji is Tokyo’s oldest temple (628 AD). The Kaminarimon lantern weighs about 700 kg.',
  },
  {
    id: 'skytree', name: 'Skytree', jp: 'スカイツリー', x: 144, z: 22, r: 6, ink: '#4a7fd8', icon: 'tower',
    food: 'dango',
    fact: 'At 634 m it’s the world’s tallest tower. 6-3-4 can be read “Mu-sa-shi”, the old name of this region.',
  },
  {
    id: 'odaiba', name: 'Odaiba', jp: 'お台場', x: 105, z: 143, r: 7, ink: '#2aa3c9', icon: 'wheel',
    food: 'takoyaki',
    fact: 'Built as sea forts (daiba) in the 1850s. Today it has a beach, a Ferris wheel and the Rainbow Bridge.',
  },
];

// Yamanote line loop, clockwise from Shinjuku.
export const RAIL_LOOP = [
  [21, 40], [22, 24], [27, 10], [36, 4], [60, 3], [82, 3], [94, 5], [104, 9], [108, 17],
  [106, 28], [103, 38], [100, 50], [97, 58], [97, 70], [93, 77], [88, 84], [84, 100],
  [74, 116], [62, 138], [52, 150], [44, 145], [35, 132], [29, 114], [24, 100], [21, 88],
  [20, 70], [20, 58],
];
export const STATIONS = [
  [21, 47], [20, 80], [24, 98], [97, 64], [103, 38], [107, 20], [62, 138], [88, 84],
];

export const SUMIDA = [
  [137, -2], [135, 8], [133, 18], [130, 30], [125, 42], [120, 58], [115, 70], [110, 80],
  [106, 90], [104, 101], [104, 106],
];

const ROADS = [
  ['shinjuku', 'harajuku', [[25, 58], [24, 74]]],
  ['harajuku', 'shibuya', [[17, 86], [17, 94]]],
  ['shibuya', 'roppongi', [[36, 93]]],
  ['harajuku', 'roppongi', [[36, 85]]],
  ['roppongi', 'tokyotower', []],
  ['shinjuku', 'imperial', [[40, 52], [61, 57], [61, 69], [84, 69]]],
  ['imperial', 'tokyostation', []],
  ['tokyostation', 'ginza', [[91, 72]]],
  ['ginza', 'tsukiji', []],
  ['tokyotower', 'ginza', [[82, 92]]],
  ['tokyostation', 'akihabara', [[92, 52]]],
  ['akihabara', 'ueno', [[102, 26]]],
  ['ueno', 'asakusa', [[112, 16]]],
  ['asakusa', 'skytree', [[136, 18]]],
  ['tsukiji', 'odaiba', [[104, 100], [104, 112], [106, 128]]],
  ['tokyotower', 'odaiba', [[76, 112], [82, 121], [96, 135]]],
  ['akihabara', 'skytree', [[122, 40], [138, 30]]],
  ['shinjuku', 'akihabara', [[50, 42], [80, 40]]],
];
// Extra avenues that only add texture to the city.
const EXTRA_ROADS = [
  [[18, 98], [4, 112]], [[18, 98], [26, 124], [30, 158]], [[68, 98], [60, 122], [56, 158]],
  [[21, 47], [4, 52]], [[21, 47], [30, 20], [34, 0]], [[101, 39], [100, 20], [96, 0]],
  [[124, 17], [124, 0]], [[144, 22], [158, 40]], [[144, 22], [140, 70], [134, 92]],
  [[89, 64], [118, 66], [158, 66]], [[52, 91], [40, 120], [36, 158]], [[50, 42], [56, 70], [52, 91]],
  [[0, 30], [21, 40]], [[61, 69], [64, 84], [68, 98]],
];

// Seasonal tree palettes keyed by kind.
function leafColors(season) {
  switch (season) {
    case 'spring': return { park: ['sakura', 'sakura2', 'leaf', 'leaf2'], street: ['leaf', 'leaf2'] };
    case 'summer': return { park: ['leaf', 'leaf2', 'leafDeep'], street: ['leaf', 'leaf2'] };
    case 'autumn': return { park: ['momiji', 'momiji2', 'ginkgo', 'leaf', 'leaf2'], street: ['ginkgo', 'ginkgo2'] };
    default: return { park: ['bare', 'pine', 'leafDeep'], street: ['bare'] };
  }
}

function makePalette(date) {
  const p = new Palette();
  const add = (n, hex, o) => p.add(n, hex, o);
  add('stone', '#4b3f52', { jitter: 0.05 });
  add('dirt', '#7d5642', { jitter: 0.06 });
  add('dirtDark', '#694738', { jitter: 0.06 });
  add('grass', '#86c65e', { jitter: 0.07 });
  add('grassDark', '#68ad50', { jitter: 0.07 });
  add('pave', '#d6cfc5', { jitter: 0.03 });
  add('plazaA', '#ece2d0', { jitter: 0.02 });
  add('plazaB', '#ddd1bd', { jitter: 0.02 });
  add('gravel', '#efe9dc', { jitter: 0.05 });
  add('road', '#5a566a', { jitter: 0.03 });
  add('street', '#757082', { jitter: 0.03 });
  add('lineWhite', '#f6f3ec', { jitter: 0.02 });
  add('lineYellow', '#f2c14e', { jitter: 0.02 });
  add('sand', '#f4e1a8', { jitter: 0.05 });
  add('ballast', '#8e837c', { jitter: 0.08 });
  add('sleeper', '#6b5547', { jitter: 0.05 });
  add('waterBed', '#2b5d8f', { jitter: 0.04 });
  add('waterEdge', '#4f9fd8', { jitter: 0.02 });
  add('bridge', '#cfccd6', { jitter: 0.03 });
  add('bridgeRail', '#f0eef6', { jitter: 0.02 });
  // Walls
  add('wall_cream', '#f0e2c6', { jitter: 0.03 });
  add('wall_white', '#f5f2ec', { jitter: 0.02 });
  add('wall_gray', '#c0bdc8', { jitter: 0.03 });
  add('wall_beige', '#dec7a4', { jitter: 0.03 });
  add('wall_pink', '#f4c9c6', { jitter: 0.03 });
  add('wall_brown', '#b38661', { jitter: 0.03 });
  add('wall_blue', '#bccde0', { jitter: 0.03 });
  add('wall_mint', '#c7e6d2', { jitter: 0.03 });
  add('wall_lav', '#d8cdf2', { jitter: 0.03 });
  add('wall_yellow', '#f8e3a0', { jitter: 0.03 });
  add('wall_tile', '#cc9772', { jitter: 0.05 });
  add('wall_dark', '#76738a', { jitter: 0.03 });
  add('roof_gray', '#5f6a7c', { jitter: 0.05 });
  add('roof_blue', '#50698f', { jitter: 0.05 });
  add('roof_red', '#b9584d', { jitter: 0.05 });
  add('roof_green', '#5f8d6d', { jitter: 0.05 });
  add('roof_brown', '#80604f', { jitter: 0.05 });
  add('roofTop', '#aaa6b2', { jitter: 0.04 });
  add('roofTop2', '#9c98a6', { jitter: 0.04 });
  add('win_dark', '#4c6790', { jitter: 0.05 });
  add('win_lit', '#8eb0d6', { jitter: 0.05, emit: '#ffd77e', emitStrength: 0.9 });
  add('win_shop', '#ffe6ad', { jitter: 0.04, emit: '#ffc46a', emitStrength: 1.1 });
  add('glass', '#86add2', { jitter: 0.03 });
  add('glass_lit', '#86add2', { jitter: 0.03, emit: '#ffe3a6', emitStrength: 0.8 });
  add('glass_dark', '#5f80a8', { jitter: 0.03 });
  add('spandrel', '#a2adbd', { jitter: 0.02 });
  add('aviation', '#d84040', { emit: '#ff3030', emitStrength: 1.5 });
  add('tank', '#e3ecf2', { jitter: 0.03 });
  add('ac', '#b9bcc6', { jitter: 0.05 });
  add('neon_pink', '#ff70b8', { emit: '#ff4fa3', always: true });
  add('neon_cyan', '#62f0ff', { emit: '#3fe6ff', always: true });
  add('neon_yellow', '#ffe55e', { emit: '#ffd23f', always: true });
  add('neon_green', '#80ff9c', { emit: '#4fff7a', always: true });
  add('neon_purple', '#b98eff', { emit: '#9a6bff', always: true });
  add('neon_red', '#ff5d5d', { emit: '#ff3434', always: true });
  add('screen_dark', '#26305a', { emit: '#1d2a66', always: true, emitStrength: 0.6 });
  // Trees
  add('trunk', '#7d5336', { jitter: 0.06 });
  add('leaf', '#62b552', { jitter: 0.1 });
  add('leaf2', '#4f9f49', { jitter: 0.1 });
  add('leafDeep', '#3f8a46', { jitter: 0.1 });
  add('pine', '#2f6c49', { jitter: 0.08 });
  add('sakura', '#ffc2d8', { jitter: 0.06 });
  add('sakura2', '#ffa2c4', { jitter: 0.06 });
  add('momiji', '#e65a3f', { jitter: 0.08 });
  add('momiji2', '#f28a3b', { jitter: 0.08 });
  add('ginkgo', '#f6cf4b', { jitter: 0.06 });
  add('ginkgo2', '#eab437', { jitter: 0.06 });
  add('bare', '#8f6d58', { jitter: 0.06 });
  add('bamboo', '#7bc46b', { jitter: 0.08 });
  // Landmarks
  add('tt_orange', '#ff6a2b', { jitter: 0.03, emit: '#ff8f3d', emitStrength: 0.9 });
  add('tt_white', '#f6f0e8', { jitter: 0.02, emit: '#ffd7a0', emitStrength: 0.7 });
  add('tt_deck', '#e2ebf5', { jitter: 0.02, emit: '#fff1c4', emitStrength: 0.9 });
  const miyabi = date.getDate() % 2 === 1;
  add('st_white', '#e8eef6', { jitter: 0.02, emit: miyabi ? '#c49cff' : '#8fc4ff', emitStrength: 0.8 });
  add('st_glass', '#c0e0ff', { jitter: 0.02, emit: '#cfeeff', emitStrength: 1 });
  add('st_gray', '#a9b4c3', { jitter: 0.03 });
  add('temple_red', '#d6402f', { jitter: 0.04 });
  add('temple_dark', '#5b2c2b', { jitter: 0.04 });
  add('temple_roof', '#3e4252', { jitter: 0.05 });
  add('gold', '#f4c64e', { jitter: 0.04, emit: '#ffcf5a', emitStrength: 0.4 });
  add('bronze', '#6c5a3e', { jitter: 0.05 });
  add('stone_base', '#bdb6aa', { jitter: 0.05 });
  add('lantern_red', '#ea422f', { emit: '#ff6a3a', always: true, emitStrength: 0.7 });
  add('lantern_black', '#2b2626');
  add('brick', '#b85b3f', { jitter: 0.07 });
  add('brick_trim', '#f0e6d4', { jitter: 0.02 });
  add('dome', '#5d7280', { jitter: 0.04 });
  add('palace_wall', '#f6f3ec', { jitter: 0.02 });
  add('palace_roof', '#4e706b', { jitter: 0.04 });
  add('stone_wall', '#a8a196', { jitter: 0.09 });
  add('torii', '#9c6a45', { jitter: 0.04 });
  add('torii_dark', '#4c3b34', { jitter: 0.04 });
  add('copper', '#6ea697', { jitter: 0.05 });
  add('wood', '#a5714a', { jitter: 0.05 });
  add('cream_stone', '#eee2c8', { jitter: 0.03 });
  add('clock_face', '#fbf7ea', { emit: '#fff1c2', emitStrength: 0.8 });
  add('clock_hand', '#2b2b35');
  add('awning_red', '#e45f52', { jitter: 0.03 });
  add('awning_blue', '#4f8fe0', { jitter: 0.03 });
  add('awning_white', '#fafafa', { jitter: 0.02 });
  add('fish_blue', '#5f8fcf', { jitter: 0.03 });
  add('fish_silver', '#cfdbe6', { jitter: 0.03 });
  add('silver', '#d9dee6', { jitter: 0.03 });
  add('sphere', '#e9eef4', { jitter: 0.02, emit: '#e8f0ff', emitStrength: 0.4 });
  add('cable', '#f5f7fc', { emit: '#e9f1ff', emitStrength: 1 });
  add('pillar_white', '#eef1f5', { jitter: 0.02, emit: '#f2f6ff', emitStrength: 0.5 });
  add('panda_w', '#f7f7f7');
  add('panda_k', '#2a2a2e');
  add('hachiko', '#d2a774', { jitter: 0.03 });
  add('cat_w', '#ffffff', { emit: '#fff8f0', always: true });
  add('cat_o', '#ffa04a', { emit: '#ff9a3c', always: true });
  add('cat_k', '#3a3446', { emit: '#2a2440', always: true, emitStrength: 0.4 });
  add('cat_p', '#ff9fbf', { emit: '#ff8fb5', always: true });
  add('crepe', '#e9b46f', { jitter: 0.03 });
  add('cream', '#fff6ee', { jitter: 0.02 });
  add('berry', '#ff5a7a', { jitter: 0.03 });
  add('lotus', '#4e9c5a', { jitter: 0.08 });
  return p;
}

// ---------------------------------------------------------------------------

export function buildTokyo({ date = new Date(), season = 'autumn' } = {}) {
  const pal = makePalette(date);
  const P = new Proxy({}, { get: (_, n) => pal.id(n) });
  const g = new VoxelGrid(W, H, D);
  g.solidBelow = true;
  const type = new Uint8Array(W * D);
  const paint = new Uint8Array(W * D);
  const major = new Uint8Array(W * D);
  const zone = new Uint8Array(W * D); // 1 neon, 2 kawaii, 3 luxury, 4 palace, 5 sakura-spot
  const rand = mulberry32(20261015);
  const ci = (x, z) => x + z * W;
  const inMap = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const getT = (x, z) => (inMap(x, z) ? type[ci(x, z)] : T.WATER);
  const setT = (x, z, t) => { if (inMap(x, z)) type[ci(x, z)] = t; };

  // Thick polyline stamp.
  function stampLine(pts, radius, fn) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(len * 3));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        const r = Math.ceil(radius);
        for (let dz = -r; dz <= r; dz++)
          for (let dx = -r; dx <= r; dx++) {
            const x = Math.floor(px + dx), z = Math.floor(pz + dz);
            const ddx = x + 0.5 - px, ddz = z + 0.5 - pz;
            if (ddx * ddx + ddz * ddz <= radius * radius && inMap(x, z)) fn(x, z);
          }
      }
    }
  }
  function rect(x0, z0, x1, z1, fn) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inMap(x, z)) fn(x, z);
  }
  function ellipse(cx, cz, rx, rz, fn) {
    rect(Math.floor(cx - rx), Math.floor(cz - rz), Math.ceil(cx + rx), Math.ceil(cz + rz), (x, z) => {
      const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
      if (dx * dx + dz * dz <= 1) fn(x, z);
    });
  }

  // --- 1. Water: Tokyo Bay coastline, Sumida river, moats, ponds -----------
  const coast = [[0, 999], [70, 999], [74, 160], [82, 128], [88, 112], [96, 104], [110, 100], [130, 96], [160, 92]];
  const coastZ = (x) => {
    for (let i = 0; i < coast.length - 1; i++) {
      const [ax, az] = coast[i], [bx, bz] = coast[i + 1];
      if (x >= ax && x <= bx) return az + ((x - ax) / (bx - ax)) * (bz - az);
    }
    return 92;
  };
  rect(0, 0, W - 1, D - 1, (x, z) => {
    const wob = Math.sin(x * 0.35) * 0.8 + Math.sin(x * 0.13 + 1) * 1.2;
    if (z > coastZ(x) + wob) setT(x, z, T.WATER);
  });
  // Reclaimed islands
  ellipse(103, 110, 6, 7, (x, z) => setT(x, z, T.URBAN)); // Harumi
  ellipse(117, 111, 7.5, 9, (x, z) => setT(x, z, T.URBAN)); // Toyosu
  ellipse(107, 96, 5, 6, (x, z) => setT(x, z, T.URBAN)); // Tsukishima
  ellipse(106, 144, 12.5, 10, (x, z) => setT(x, z, T.URBAN)); // Odaiba
  ellipse(132, 112, 9, 8, (x, z) => setT(x, z, T.URBAN)); // Ariake/Shinonome
  // Odaiba beach on the north-west shore
  rect(93, 132, 112, 140, (x, z) => {
    if (getT(x, z) === T.URBAN && (getT(x - 2, z - 2) === T.WATER || getT(x, z - 3) === T.WATER)) setT(x, z, T.BEACH);
  });
  // Sumida river
  stampLine(SUMIDA, 1.7, (x, z) => setT(x, z, T.WATER));
  // Small canals
  stampLine([[110, 80], [128, 82], [160, 80]], 0.9, (x, z) => setT(x, z, T.WATER));
  stampLine([[94, 46], [112, 48], [125, 46]], 0.8, (x, z) => setT(x, z, T.WATER)); // Kanda river
  // Imperial Palace moat ring
  rect(64, 48, 81, 67, (x, z) => {
    if (x <= 65 || x >= 80 || z <= 49 || z >= 66) setT(x, z, T.WATER);
  });
  // Shinobazu pond
  ellipse(96.5, 18, 3.2, 3, (x, z) => setT(x, z, T.WATER));

  // --- 2. Parks & forests ---------------------------------------------------
  const park = (x0, z0, x1, z1, t = T.PARK) => rect(x0, z0, x1, z1, (x, z) => { if (getT(x, z) !== T.WATER) setT(x, z, t); });
  park(5, 63, 15, 81, T.FOREST); // Meiji Jingu
  park(4, 82, 15, 91); // Yoyogi
  park(26, 54, 34, 61); // Shinjuku Gyoen
  park(66, 50, 79, 65); // Palace grounds
  park(84, 69, 87, 73); // Hibiya
  park(94, 4, 106, 21); // Ueno
  park(63, 104, 73, 108); // Shiba
  park(86, 93, 92, 101); // Hama-rikyu
  park(127, 6, 131, 28); // Sumida park
  park(54, 73, 58, 78); // Akasaka palace gardens
  park(140, 100, 150, 108); // Kasai-ish green
  rect(113, 136, 120, 140, (x, z) => { if (getT(x, z) === T.URBAN) setT(x, z, T.PARK); }); // Odaiba seaside park
  rect(66, 50, 79, 65, (x, z) => { zone[ci(x, z)] = 4; });
  rect(94, 4, 106, 21, (x, z) => { zone[ci(x, z)] = 5; });
  rect(127, 6, 131, 28, (x, z) => { zone[ci(x, z)] = 5; });
  park(36, 112, 41, 117); // Small neighbourhood parks
  park(116, 56, 120, 60);
  park(46, 20, 50, 25);
  park(140, 60, 145, 65);

  // --- 3. Rails (Yamanote loop) ----------------------------------------------
  const railCurve = catmull(RAIL_LOOP, true, 10);
  stampLine(railCurve, 1.0, (x, z) => { if (getT(x, z) !== T.WATER) setT(x, z, T.RAIL); });

  // --- 4. Roads --------------------------------------------------------------
  const lm = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));
  const roadCell = (x, z) => {
    const t = getT(x, z);
    if (t === T.WATER || t === T.BRIDGE) setT(x, z, T.BRIDGE);
    else setT(x, z, T.ROAD);
    major[ci(x, z)] = 1;
  };
  for (const [a, b, via] of ROADS) {
    const pts = [[lm[a].x, lm[a].z], ...via, [lm[b].x, lm[b].z]];
    stampLine(pts, 1.05, roadCell);
  }
  for (const pts of EXTRA_ROADS) stampLine(pts, 0.95, roadCell);
  // Sidewalks along the avenues
  rect(0, 0, W - 1, D - 1, (x, z) => {
    if (getT(x, z) !== T.URBAN) return;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (getT(x + dx, z + dz) === T.ROAD && major[ci(x + dx, z + dz)]) {
        setT(x, z, T.PLAZA); paint[ci(x, z)] = PAINT.SIDEWALK; return;
      }
    }
  });

  // Minor street grid (irregular — random segments dropped)
  rect(0, 0, W - 1, D - 1, (x, z) => {
    if (getT(x, z) !== T.URBAN) return;
    const vx = x % 7 === 3 && hash3(x, 11, Math.floor(z / 7)) > 0.22;
    const hz = z % 7 === 3 && hash3(Math.floor(x / 7), 13, z) > 0.22;
    if (vx || hz) setT(x, z, T.STREET);
  });

  // --- 5. Landmark plazas ----------------------------------------------------
  const plaza = (x0, z0, x1, z1) => rect(x0, z0, x1, z1, (x, z) => {
    const t = getT(x, z);
    if (t === T.URBAN || t === T.STREET || t === T.PARK) setT(x, z, T.PLAZA);
  });
  const plazaDisk = (cx, cz, r) => ellipse(cx, cz, r, r, (x, z) => {
    const t = getT(x, z);
    if (t === T.URBAN || t === T.STREET || t === T.PARK) setT(x, z, T.PLAZA);
  });
  plazaDisk(21, 47, 3); // Shinjuku station square
  plaza(14, 94, 22, 102); // Shibuya scramble block
  plazaDisk(52, 91, 3);
  plazaDisk(68, 98, 7.5);
  plaza(82, 55, 86, 68); // Kokyo Gaien
  plaza(87, 58, 91, 70); // Marunouchi square
  plazaDisk(95, 81, 3);
  plaza(95, 88, 101, 94); // Tsukiji outer market
  plazaDisk(101, 39, 3.5);
  plaza(98, 9, 104, 15); // Ueno park plaza
  plaza(113, 4, 131, 27); // Senso-ji grounds
  plazaDisk(144, 22, 6.5);
  plaza(101, 139, 110, 148); // Odaiba plaza
  plaza(6, 77, 17, 80); // Meiji Jingu sando
  plaza(7, 68, 13, 76);

  // Park paths (gravel)
  const path = (pts) => stampLine(pts, 0.75, (x, z) => {
    const t = getT(x, z);
    if (t === T.PARK || t === T.FOREST || t === T.PLAZA) { setT(x, z, T.PLAZA); paint[ci(x, z)] = PAINT.GRAVEL; }
  });
  path([[17, 79], [10, 79], [10, 72]]);
  path([[4, 86], [15, 86]]); path([[10, 82], [10, 91]]);
  path([[26, 57], [34, 57]]); path([[30, 54], [30, 61]]);
  path([[95, 12], [106, 12]]); path([[101, 4], [101, 21]]); path([[99, 16], [104, 21]]);
  path([[67, 58], [79, 58]]); path([[72, 51], [72, 64]]); path([[79, 62], [84, 62]]);
  path([[129, 6], [129, 28]]);
  path([[87, 96], [92, 96]]);
  path([[63, 106], [73, 106]]);
  rect(82, 55, 86, 68, (x, z) => { paint[ci(x, z)] = PAINT.GRAVEL; });
  rect(6, 77, 17, 80, (x, z) => { paint[ci(x, z)] = PAINT.GRAVEL; });
  rect(7, 68, 13, 76, (x, z) => { paint[ci(x, z)] = PAINT.GRAVEL; });

  // Zones that change the building style
  const zoneDisk = (cx, cz, r, v) => ellipse(cx, cz, r, r, (x, z) => { zone[ci(x, z)] = v; });
  zoneDisk(27, 38, 6, 1); // Kabukicho
  zoneDisk(103, 40, 6.5, 1); // Akihabara
  zoneDisk(18, 98, 9, 1); // Shibuya
  zoneDisk(27, 77, 4.5, 2); // Takeshita-dori
  zoneDisk(96, 81, 6, 3); // Ginza

  // --- 6. Ground voxels -------------------------------------------------------
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      const t = type[ci(x, z)];
      g.set(x, 0, z, P.stone); g.set(x, 1, z, P.stone);
      g.set(x, 2, z, P.dirtDark); g.set(x, 3, z, P.dirt);
      const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1;
      if (t === T.WATER) {
        g.set(x, 4, z, P.waterBed);
        if (edge) g.set(x, 5, z, P.waterEdge);
        continue;
      }
      if (t === T.BRIDGE) {
        g.set(x, 4, z, P.waterBed);
        g.set(x, 5, z, P.bridge);
        continue;
      }
      g.set(x, 4, z, P.dirt);
      let top = P.pave;
      const pt = paint[ci(x, z)];
      switch (t) {
        case T.ROAD: top = P.road; break;
        case T.STREET: top = P.street; break;
        case T.PARK: top = P.grass; break;
        case T.FOREST: top = P.grassDark; break;
        case T.BEACH: top = P.sand; break;
        case T.RAIL: top = (x + z) % 3 === 0 ? P.sleeper : P.ballast; break;
        case T.PLAZA: top = pt === PAINT.GRAVEL ? P.gravel : pt === PAINT.SIDEWALK ? P.pave : (x + z) % 2 ? P.plazaA : P.plazaB; break;
        default: top = P.pave;
      }
      g.set(x, 5, z, top);
    }
  // Bridge railings where a bridge cell borders open water.
  rect(0, 0, W - 1, D - 1, (x, z) => {
    if (getT(x, z) !== T.BRIDGE) return;
    let water = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (getT(x + dx, z + dz) === T.WATER) water++;
    if (water >= 1 && water <= 2 && hash3(x, 3, z) > 0.3) g.set(x, Y0, z, P.bridgeRail);
  });

  const ctx = { g, P, setT, getT, rect, ellipse, stampLine, paint, ci, type };

  // --- 7. Landmarks ----------------------------------------------------------
  buildShinjuku(ctx);
  buildShibuya(ctx);
  buildHarajuku(ctx);
  buildRoppongi(ctx);
  buildTokyoTower(ctx, 68, 98);
  buildPalace(ctx);
  buildTokyoStation(ctx);
  buildGinza(ctx);
  buildTsukiji(ctx);
  buildAkihabara(ctx);
  buildUeno(ctx);
  buildSensoji(ctx, 124, 17);
  buildSkytree(ctx, 144, 22);
  const ferris = buildOdaiba(ctx);
  buildRainbowBridge(ctx, [82, 121], [96, 135]);
  buildStations(ctx, railCurve);

  // --- 8. City blocks -----------------------------------------------------------
  const centers = [
    [9, 42, 1.0, 6], [26, 45, 0.6, 5], [24, 52, 0.6, 4], [19, 98, 0.6, 5], [27, 100, 0.75, 3],
    [88, 54, 0.85, 6], [86, 45, 0.75, 5], [99, 62, 0.6, 5], [96, 82, 0.45, 5], [86, 89, 0.8, 4],
    [52, 89, 0.75, 4], [56, 72, 0.6, 5], [102, 41, 0.45, 5], [61, 140, 0.7, 6], [33, 6, 0.6, 5],
    [106, 142, 0.45, 5], [117, 111, 0.55, 5], [103, 110, 0.5, 4], [106, 26, 0.35, 4], [95, 46, 0.4, 5],
    [29, 113, 0.4, 4], [36, 132, 0.35, 4], [72, 118, 0.5, 5], [132, 112, 0.45, 5], [140, 40, 0.3, 5],
  ];
  const density = (x, z) => {
    let d = 0.06 + 0.1 * hash3(Math.floor(x / 9), 5, Math.floor(z / 9));
    for (const [cx, cz, pk, s] of centers) {
      const dd = ((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s);
      d = Math.max(d, pk * Math.exp(-dd));
    }
    return d;
  };
  const built = new Uint8Array(W * D);
  const free = (x, z) => inMap(x, z) && type[ci(x, z)] === T.URBAN && !built[ci(x, z)];
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      if (!free(x, z)) continue;
      const d = density(x, z);
      const tall = d > 0.5;
      let lw = tall ? 3 + Math.floor(hash3(x, 1, z) * 3) : 2 + Math.floor(hash3(x, 2, z) * 2);
      let ld = tall ? 3 + Math.floor(hash3(x, 3, z) * 3) : 2 + Math.floor(hash3(x, 4, z) * 2);
      // shrink lot until it fits
      const fits = (w, dd) => {
        for (let zz = z; zz < z + dd; zz++) for (let xx = x; xx < x + w; xx++) if (!free(xx, zz)) return false;
        return true;
      };
      while (lw > 1 || ld > 1) {
        if (fits(lw, ld)) break;
        if (lw >= ld && lw > 1) lw--; else ld--;
      }
      if (!fits(lw, ld)) { lw = 1; ld = 1; }
      for (let zz = z; zz < z + ld; zz++) for (let xx = x; xx < x + lw; xx++) built[ci(xx, zz)] = 1;
      building(ctx, x, z, x + lw - 1, z + ld - 1, d, zone[ci(x, z)], rand);
    }

  // --- 9. Trees -----------------------------------------------------------------
  const leaves = leafColors(season);
  const trunkAt = new Uint8Array(W * D);
  const nearTree = (x, z, r) => {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inMap(x + dx, z + dz) && trunkAt[ci(x + dx, z + dz)]) return true;
    return false;
  };
  for (let z = 1; z < D - 1; z++)
    for (let x = 1; x < W - 1; x++) {
      const t = type[ci(x, z)];
      const h = hash3(x, 21, z);
      if (t === T.FOREST && h < 0.42 && !nearTree(x, z, 1)) {
        trunkAt[ci(x, z)] = 1;
        tree(ctx, x, z, h < 0.12 ? 'big' : 'round', ['leaf', 'leaf2', 'leafDeep', 'pine']);
      } else if (t === T.PARK && h < 0.2 && !nearTree(x, z, 1)) {
        trunkAt[ci(x, z)] = 1;
        const zn = zone[ci(x, z)];
        if (zn === 4) tree(ctx, x, z, 'pine', ['pine']);
        else if (zn === 5) tree(ctx, x, z, season === 'spring' ? 'sakura' : 'round', season === 'spring' ? ['sakura', 'sakura2'] : leaves.park);
        else tree(ctx, x, z, h < 0.07 ? 'cone' : 'round', leaves.park);
      }
    }
  // Street trees along the avenues (ginkgo — Tokyo's symbol tree)
  for (let z = 1; z < D - 1; z++)
    for (let x = 1; x < W - 1; x++) {
      if (type[ci(x, z)] !== T.ROAD || hash3(x, 31, z) > 0.12) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (getT(nx, nz) === T.PLAZA && paint[ci(nx, nz)] === PAINT.SIDEWALK && !nearTree(nx, nz, 2) && g.get(nx, Y0, nz) === 0) {
          trunkAt[ci(nx, nz)] = 1;
          tree(ctx, nx, nz, 'small', leaves.street);
          break;
        }
      }
    }

  // --- 10. Walkability -----------------------------------------------------------
  const blocked = new Uint8Array(W * D);
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      const t = type[ci(x, z)];
      let b = !WALKABLE.has(t);
      if (!b) for (let y = Y0; y <= Y0 + 1; y++) if (g.get(x, y, z)) { b = true; break; }
      blocked[ci(x, z)] = b ? 1 : 0;
    }

  return {
    grid: g, palette: pal, type, blocked, ferris, railCurve,
    walkable: (x, z) => inMap(x, z) && !blocked[ci(x | 0, z | 0)],
    cellType: (x, z) => getT(x | 0, z | 0),
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers

export function catmull(points, closed, samplesPerSeg = 8) {
  const out = [];
  const n = points.length;
  const get = (i) => (closed ? points[(i + n) % n] : points[clamp(i, 0, n - 1)]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (closed) out.push(out[0]);
  else out.push(points[n - 1]);
  return out;
}

function line3(g, a, b, c) {
  const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])) * 2) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), c);
  }
}

// ---------------------------------------------------------------------------
// Generic city building

const HOUSE_WALLS = ['wall_cream', 'wall_white', 'wall_beige', 'wall_gray', 'wall_brown', 'wall_blue', 'wall_cream', 'wall_white'];
const HOUSE_ROOFS = ['roof_gray', 'roof_blue', 'roof_red', 'roof_green', 'roof_brown', 'roof_gray'];
const MID_WALLS = ['wall_cream', 'wall_white', 'wall_gray', 'wall_beige', 'wall_tile', 'wall_pink', 'wall_mint', 'wall_white', 'wall_dark'];
const KAWAII_WALLS = ['wall_pink', 'wall_mint', 'wall_lav', 'wall_yellow', 'wall_white'];
const NEON = ['neon_pink', 'neon_cyan', 'neon_yellow', 'neon_green', 'neon_purple', 'neon_red'];

function building(ctx, x0, z0, x1, z1, d, zone, rand) {
  const { g, P } = ctx;
  const w = x1 - x0 + 1, dd = z1 - z0 + 1;
  const h0 = hash3(x0, 41, z0), h1 = hash3(x0, 42, z0), h2 = hash3(x0, 43, z0);
  const small = w * dd <= 1;
  if (small) {
    // 1×1 lots: vending corner, tiny shrine, or little house
    if (h0 < 0.08) {
      g.set(x0, Y0, z0, P.torii); g.set(x0, Y0 + 1, z0, P.temple_red);
    } else {
      const wall = P[HOUSE_WALLS[Math.floor(h1 * HOUSE_WALLS.length)]];
      g.set(x0, Y0, z0, wall);
      g.set(x0, Y0 + 1, z0, P[HOUSE_ROOFS[Math.floor(h2 * HOUSE_ROOFS.length)]]);
    }
    return;
  }

  let kind = 'house';
  if (d > 0.5) kind = 'tower';
  else if (d > 0.27) kind = 'mid';
  else if (d > 0.15) kind = h0 < 0.5 ? 'mid' : 'house';
  if (zone === 2) kind = 'kawaii';

  if (kind === 'house') {
    const wall = P[HOUSE_WALLS[Math.floor(h1 * HOUSE_WALLS.length)]];
    const roof = P[HOUSE_ROOFS[Math.floor(h2 * HOUSE_ROOFS.length)]];
    const hw = h0 < 0.45 ? 1 : 2;
    for (let y = Y0; y < Y0 + hw; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const per = x === x0 || x === x1 || z === z0 || z === z1;
          const win = per && y === Y0 + hw - 1 && (x + z) % 2 === 0 && hash3(x, y, z) < 0.6;
          g.set(x, y, z, win ? (hash3(x, y + 9, z) < 0.45 ? P.win_lit : P.win_dark) : wall);
        }
    // Gabled roof along the long axis
    const alongX = w >= dd;
    const span = alongX ? dd : w;
    for (let k = 0; k * 2 < span; k++) {
      const y = Y0 + hw + k;
      if (alongX) g.box(x0, y, z0 + k, x1, y, z1 - k, roof);
      else g.box(x0 + k, y, z0, x1 - k, y, z1, roof);
    }
    return;
  }

  if (kind === 'kawaii') {
    const wall = P[KAWAII_WALLS[Math.floor(h1 * KAWAII_WALLS.length)]];
    const hgt = 2 + Math.floor(h2 * 3);
    g.box(x0, Y0, z0, x1, Y0 + hgt - 1, z1, wall);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const per = x === x0 || x === x1 || z === z0 || z === z1;
        if (!per) continue;
        g.set(x, Y0, z, hash3(x, 5, z) < 0.6 ? P.win_shop : wall);
        if (hash3(x, 6, z) < 0.35) g.set(x, Y0 + 1, z, P[NEON[Math.floor(hash3(x, 7, z) * 3)]]);
      }
    g.box(x0, Y0 + hgt, z0, x1, Y0 + hgt, z1, P.roofTop);
    return;
  }

  let hgt;
  if (kind === 'tower') hgt = Math.round(10 + (d - 0.5) * 38 + h1 * 6);
  else hgt = Math.round(3 + d * 12 + h1 * 3);
  hgt = clamp(hgt, 3, 34);
  const lux = zone === 3;
  const neon = zone === 1;
  let wallName = MID_WALLS[Math.floor(h2 * MID_WALLS.length)];
  if (lux) wallName = h2 < 0.5 ? 'wall_white' : 'cream_stone';
  const wall = P[wallName];
  const glassy = kind === 'tower' && h0 < 0.75;
  const glassRows = glassy ? (h2 < 0.5 ? 'glass' : 'glass_dark') : null;
  for (let y = Y0; y < Y0 + hgt; y++) {
    const ry = y - Y0;
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const per = x === x0 || x === x1 || z === z0 || z === z1;
        const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        let c = wall;
        if (per && !corner) {
          if (ry === 0) {
            c = hash3(x, 1, z) < 0.55 ? P.win_shop : wall;
          } else if (glassy) {
            const band = ry % 3 === 0 ? P.spandrel : (hash3(x, y, z) < 0.42 ? P.glass_lit : P[glassRows]);
            c = band;
          } else if (ry % 2 === 1 || kind === 'tower') {
            c = hash3(x, y, z) < 0.45 ? P.win_lit : P.win_dark;
          }
        } else if (glassy && corner && ry > 0) {
          c = P.spandrel;
        }
        g.set(x, y, z, c);
      }
  }
  // Neon sign strips
  if (neon) {
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const per = x === x0 || x === x1 || z === z0 || z === z1;
        if (!per || hash3(x, 77, z) > 0.4) continue;
        const col = P[NEON[Math.floor(hash3(x, 78, z) * NEON.length)]];
        const top = Math.min(hgt - 1, 2 + Math.floor(hash3(x, 79, z) * 6));
        for (let ry = 1; ry <= top; ry++) g.set(x, Y0 + ry, z, col);
      }
  }
  // Roof & rooftop details
  const yr = Y0 + hgt;
  g.box(x0, yr, z0, x1, yr, z1, P.roofTop);
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++) {
      const per = x === x0 || x === x1 || z === z0 || z === z1;
      if (lux && per) g.set(x, yr, z, P.gold);
      else if (per && kind === 'tower' && hash3(x, 88, z) < 0.5) g.set(x, yr, z, P.roofTop2);
    }
  if (w >= 2 && dd >= 2) {
    const r = hash3(x1, 51, z1);
    const mx = x0 + 1 + Math.floor(hash3(x0, 52, z1) * Math.max(1, w - 2));
    const mz = z0 + 1 + Math.floor(hash3(x1, 53, z0) * Math.max(1, dd - 2));
    if (kind === 'tower' && hgt > 16) {
      g.set(mx, yr + 1, mz, P.roofTop2);
      g.set(mx, yr + 2, mz, P.roofTop2);
      g.set(mx, yr + 3, mz, P.aviation);
    } else if (r < 0.4) {
      g.set(mx, yr + 1, mz, P.tank);
    } else if (r < 0.75) {
      g.set(mx, yr + 1, mz, P.ac);
    } else if (neon && r < 0.95) {
      g.box(x0, yr + 1, mz, Math.min(x1, x0 + 2), yr + 2, mz, P[NEON[Math.floor(r * 100) % NEON.length]]);
    }
  }
}

// ---------------------------------------------------------------------------
// Trees

function tree(ctx, x, z, kind, colors) {
  const { g, P } = ctx;
  const col = (i) => P[colors[Math.floor(hash3(x, 60 + i, z) * colors.length) % colors.length]];
  const base = col(0);
  const alt = col(1);
  const pickC = (a, b, c) => (hash3(a, b, c) < 0.5 ? base : alt);
  if (kind === 'small') {
    g.set(x, Y0, z, P.trunk);
    g.set(x, Y0 + 1, z, base);
    g.set(x, Y0 + 2, z, hash3(x, 9, z) < 0.6 ? base : 0);
    return;
  }
  if (kind === 'pine') {
    g.set(x, Y0, z, P.trunk);
    g.set(x, Y0 + 1, z, P.trunk);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dz) === 2 && hash3(x + dx, 3, z + dz) < 0.6) continue;
        g.set(x + dx, Y0 + 2, z + dz, P.pine);
      }
    g.set(x, Y0 + 3, z, P.pine);
    g.set(x + (hash3(x, 4, z) < 0.5 ? 1 : -1), Y0 + 3, z, P.pine);
    return;
  }
  if (kind === 'cone') {
    g.set(x, Y0, z, P.trunk);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) g.set(x + dx, Y0 + 1, z + dz, pickC(x + dx, 1, z + dz));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dz) < 2) g.set(x + dx, Y0 + 2, z + dz, pickC(x + dx, 2, z + dz));
    g.set(x, Y0 + 3, z, base);
    return;
  }
  if (kind === 'big') {
    g.set(x, Y0, z, P.trunk); g.set(x, Y0 + 1, z, P.trunk);
    for (let y = 0; y < 3; y++) {
      const r = y === 1 ? 2.3 : 1.6;
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          if (g.get(x + dx, Y0 + 2 + y, z + dz)) continue;
          g.set(x + dx, Y0 + 2 + y, z + dz, pickC(x + dx, y, z + dz));
        }
    }
    return;
  }
  if (kind === 'sakura') {
    g.set(x, Y0, z, P.trunk); g.set(x, Y0 + 1, z, P.trunk);
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= 5 && hash3(x + dx, 1, z + dz) < 0.9) g.set(x + dx, Y0 + 2, z + dz, pickC(x + dx, 2, z + dz));
        if (d2 <= 2) g.set(x + dx, Y0 + 3, z + dz, pickC(x + dx, 3, z + dz));
      }
    return;
  }
  if (base === P.bare) {
    g.set(x, Y0, z, P.trunk); g.set(x, Y0 + 1, z, P.trunk); g.set(x, Y0 + 2, z, P.bare);
    g.set(x + 1, Y0 + 2, z, P.bare); g.set(x, Y0 + 3, z - 1, P.bare);
    return;
  }
  // round
  g.set(x, Y0, z, P.trunk);
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const corner = Math.abs(dx) + Math.abs(dz) === 2;
      if (!corner || hash3(x + dx, 5, z + dz) < 0.5) g.set(x + dx, Y0 + 1, z + dz, pickC(x + dx, 1, z + dz));
      if (!corner) g.set(x + dx, Y0 + 2, z + dz, pickC(x + dx, 2, z + dz));
    }
  if (hash3(x, 6, z) < 0.5) g.set(x, Y0 + 3, z, base);
}

// ---------------------------------------------------------------------------
// Landmark builders

function occupy(ctx, x0, z0, x1, z1) {
  ctx.rect(x0, z0, x1, z1, (x, z) => {
    const t = ctx.getT(x, z);
    if (t !== T.WATER && t !== T.RAIL) ctx.setT(x, z, T.BUILT);
  });
}

function facade(ctx, x0, y0, z0, x1, y1, z1, wall, opts = {}) {
  const { g, P } = ctx;
  const { glass = false, lit = 0.45 } = opts;
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const per = x === x0 || x === x1 || z === z0 || z === z1;
        const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        let c = wall;
        if (per && !corner && y > y0) {
          if (glass) c = (y - y0) % 3 === 0 ? P.spandrel : hash3(x, y, z) < lit ? P.glass_lit : P.glass;
          else if ((y - y0) % 2 === 1) c = hash3(x, y, z) < lit ? P.win_lit : P.win_dark;
        } else if (per && !corner && y === y0) c = P.win_shop;
        g.set(x, y, z, c);
      }
}

function buildShinjuku(ctx) {
  const { g, P } = ctx;
  // Tokyo Metropolitan Government Building (twin towers)
  occupy(ctx, 4, 42, 13, 50);
  facade(ctx, 4, Y0, 42, 13, Y0 + 11, 50, P.wall_gray);
  facade(ctx, 5, Y0 + 12, 43, 8, Y0 + 26, 48, P.wall_gray);
  facade(ctx, 9, Y0 + 12, 43, 12, Y0 + 26, 48, P.wall_gray);
  g.box(5, Y0 + 27, 44, 7, Y0 + 30, 47, P.wall_gray);
  g.box(10, Y0 + 27, 44, 12, Y0 + 30, 47, P.wall_gray);
  for (let y = Y0 + 27; y <= Y0 + 30; y += 2) {
    g.box(5, y, 44, 5, y, 47, P.win_lit); g.box(12, y, 44, 12, y, 47, P.win_lit);
  }
  g.set(6, Y0 + 31, 45, P.aviation); g.set(11, Y0 + 31, 46, P.aviation);
  // The famous 3D cat billboard on the east side.
  occupy(ctx, 26, 40, 30, 45);
  facade(ctx, 26, Y0, 40, 30, Y0 + 9, 45, P.wall_dark);
  const cat = [
    'O....K',
    'OO..KK',
    'WWWWWW',
    'WEWWEW',
    'WWPPWW',
    '.WWWW.',
  ];
  const map = { O: P.cat_o, K: P.cat_k, W: P.cat_w, E: P.cat_k, P: P.cat_p, '.': P.screen_dark };
  cat.forEach((row, i) => {
    for (let j = 0; j < 6; j++) g.set(26, Y0 + 8 - i, 40 + j, map[row[j]]);
  });
  // A couple of skyscrapers to the north of Tocho.
  occupy(ctx, 6, 33, 10, 37);
  facade(ctx, 6, Y0, 33, 10, Y0 + 24, 37, P.glass_dark, { glass: true });
  g.set(8, Y0 + 25, 35, P.aviation);
  occupy(ctx, 13, 34, 16, 38);
  facade(ctx, 13, Y0, 34, 16, Y0 + 19, 38, P.wall_white, { glass: true, lit: 0.5 });
}

function buildShibuya(ctx) {
  const { g, P, rect, setT, paint, ci } = ctx;
  const cx = 18, cz = 98;
  rect(cx - 4, cz - 4, cx + 4, cz + 4, (x, z) => {
    setT(x, z, T.ROAD);
    const dx = x - cx, dz = z - cz;
    const ax = Math.abs(dx), az = Math.abs(dz);
    const crosswalk = (az === 3 && ax <= 2 && x % 2 === 0) || (ax === 3 && az <= 2 && z % 2 === 0);
    const diag = ax === az && ax >= 1 && ax <= 2;
    const stripe = crosswalk || diag;
    g.set(x, Y0 - 1, z, stripe ? P.lineWhite : P.road);
    paint[ci(x, z)] = 0;
  });
  // Hachikō
  g.set(cx + 3, Y0, cz + 6, P.stone_base);
  g.set(cx + 3, Y0 + 1, cz + 6, P.hachiko);
  // 109 tower
  occupy(ctx, cx - 11, cz - 6, cx - 6, cz - 1);
  g.cylinder(cx - 8.5, cz - 3.5, Y0, Y0 + 10, 2.5, P.silver);
  for (let y = Y0 + 1; y <= Y0 + 9; y += 2) g.cylinder(cx - 8.5, cz - 3.5, y, y, 2.5, P.win_lit, true);
  g.cylinder(cx - 8.5, cz - 3.5, Y0 + 11, Y0 + 11, 1.6, P.neon_red);
  // QFRONT with its big screen facing the crossing
  occupy(ctx, cx - 2, cz - 10, cx + 2, cz - 6);
  facade(ctx, cx - 2, Y0, cz - 10, cx + 2, Y0 + 9, cz - 6, P.wall_dark);
  const scr = ['ccppc', 'cyyyc', 'pykyp', 'cyyyc', 'ppcpp', 'cpppc'];
  const sm = { c: P.neon_cyan, p: P.neon_pink, y: P.neon_yellow, k: P.screen_dark };
  scr.forEach((row, i) => { for (let j = 0; j < 5; j++) g.set(cx - 2 + j, Y0 + 8 - i, cz - 6, sm[row[j]]); });
  // Scramble Square tower east of the tracks
  occupy(ctx, cx + 8, cz - 4, cx + 11, cz + 1);
  facade(ctx, cx + 8, Y0, cz - 4, cx + 11, Y0 + 26, cz + 1, P.glass, { glass: true, lit: 0.55 });
  g.box(cx + 8, Y0 + 27, cz - 4, cx + 11, Y0 + 27, cz + 1, P.roofTop2);
  g.set(cx + 9, Y0 + 28, cz - 2, P.aviation);
}

function buildHarajuku(ctx) {
  const { g, P } = ctx;
  // Great torii at the forest gate
  const tx = 16;
  g.box(tx, Y0, 77, tx, Y0 + 5, 77, P.torii);
  g.box(tx, Y0, 81, tx, Y0 + 5, 81, P.torii);
  g.box(tx, Y0 + 4, 76, tx, Y0 + 4, 82, P.torii);
  g.box(tx, Y0 + 6, 76, tx, Y0 + 6, 82, P.torii_dark);
  g.set(tx, Y0 + 7, 75, P.torii_dark); g.set(tx, Y0 + 7, 83, P.torii_dark);
  g.set(tx, Y0 + 6, 75, P.torii_dark); g.set(tx, Y0 + 6, 83, P.torii_dark);
  g.set(tx, Y0 + 5, 79, P.torii);
  // Meiji Jingu shrine hall
  g.box(7, Y0, 68, 13, Y0, 72, P.stone_base);
  g.box(8, Y0 + 1, 69, 12, Y0 + 2, 71, P.wood);
  g.box(9, Y0 + 1, 71, 11, Y0 + 1, 71, P.temple_dark);
  g.box(6, Y0 + 3, 67, 14, Y0 + 3, 73, P.copper);
  g.box(7, Y0 + 4, 68, 13, Y0 + 4, 72, P.copper);
  g.box(8, Y0 + 5, 69, 12, Y0 + 5, 71, P.copper);
  g.box(9, Y0 + 6, 70, 11, Y0 + 6, 70, P.copper);
  g.set(6, Y0 + 4, 67, P.copper); g.set(14, Y0 + 4, 67, P.copper); g.set(6, Y0 + 4, 73, P.copper); g.set(14, Y0 + 4, 73, P.copper);
  occupy(ctx, 7, 68, 13, 72);
  // Giant crepe on a Takeshita-dori rooftop
  occupy(ctx, 25, 74, 28, 76);
  g.box(25, Y0, 74, 28, Y0 + 2, 76, P.wall_pink);
  g.box(25, Y0, 74, 28, Y0, 74, P.win_shop);
  g.box(25, Y0 + 1, 74, 28, Y0 + 1, 74, P.neon_pink);
  g.set(26, Y0 + 3, 75, P.crepe); g.set(27, Y0 + 3, 75, P.crepe);
  g.box(26, Y0 + 4, 75, 27, Y0 + 4, 75, P.crepe);
  g.box(25, Y0 + 5, 75, 28, Y0 + 5, 75, P.cream);
  g.set(26, Y0 + 6, 75, P.berry); g.set(27, Y0 + 6, 75, P.cream);
}

function buildRoppongi(ctx) {
  const { g, P } = ctx;
  occupy(ctx, 47, 84, 52, 88);
  facade(ctx, 47, Y0, 84, 52, Y0 + 29, 88, P.glass_dark, { glass: true, lit: 0.5 });
  g.box(48, Y0 + 30, 85, 51, Y0 + 30, 87, P.roofTop);
  g.box(48, Y0 + 31, 85, 51, Y0 + 31, 85, P.neon_cyan);
  g.set(50, Y0 + 32, 86, P.aviation);
}

function buildTokyoTower(ctx, cx, cz) {
  const { g, P } = ctx;
  occupy(ctx, cx - 6, cz - 6, cx + 6, cz + 6);
  // FootTown building
  facade(ctx, cx - 3, Y0, cz - 3, cx + 3, Y0 + 2, cz + 3, P.tt_white);
  for (let h = 0; h <= 22; h++) {
    const w = Math.round(5.5 * Math.pow(1 - h / 25, 1.5));
    const col = Math.floor(h / 3) % 2 === 0 ? P.tt_orange : P.tt_white;
    const y = Y0 + h;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        g.set(cx + sx * w, y, cz + sz * w, col);
        if (w >= 4) { g.set(cx + sx * (w - 1), y, cz + sz * w, col); g.set(cx + sx * w, y, cz + sz * (w - 1), col); }
      }
    if (h % 3 === 0 && w >= 1 && h > 0) {
      for (let t = -w; t <= w; t++) {
        g.set(cx + t, y, cz - w, col); g.set(cx + t, y, cz + w, col);
        g.set(cx - w, y, cz + t, col); g.set(cx + w, y, cz + t, col);
      }
    }
  }
  // Main deck
  for (let y = Y0 + 9; y <= Y0 + 10; y++)
    for (let z = cz - 3; z <= cz + 3; z++)
      for (let x = cx - 3; x <= cx + 3; x++) {
        const per = Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
        g.set(x, y, z, per ? P.tt_deck : P.tt_white);
      }
  g.box(cx - 3, Y0 + 11, cz - 3, cx + 3, Y0 + 11, cz + 3, P.tt_orange);
  // Top deck
  g.box(cx - 1, Y0 + 17, cz - 1, cx + 1, Y0 + 17, cz + 1, P.tt_deck);
  g.box(cx - 1, Y0 + 18, cz - 1, cx + 1, Y0 + 18, cz + 1, P.tt_white);
  // Antenna
  for (let h = 19; h <= 33; h++) g.set(cx, Y0 + h, cz, h % 3 === 0 ? P.tt_white : P.tt_orange);
  g.set(cx, Y0 + 34, cz, P.aviation);
}

function buildPalace(ctx) {
  const { g, P, rect } = ctx;
  // Stone walls along the inner moat edge
  rect(66, 50, 79, 65, (x, z) => {
    const edge = x === 66 || x === 79 || z === 50 || z === 65;
    const gate = x === 79 && (z === 61 || z === 62);
    if (edge && !gate) { g.set(x, Y0, z, P.stone_wall); g.set(x, Y0 + 1, z, hash3(x, 2, z) < 0.5 ? P.stone_wall : P.palace_wall); }
  });
  // Nijūbashi bridge to the plaza
  for (let x = 80; x <= 81; x++) for (const z of [61, 62]) { ctx.setT(x, z, T.BRIDGE); g.set(x, Y0 - 2, z, P.stone_wall); g.set(x, Y0 - 1, z, P.stone_wall); }
  g.set(80, Y0, 60, P.bridgeRail); g.set(81, Y0, 60, P.bridgeRail); g.set(80, Y0, 63, P.bridgeRail); g.set(81, Y0, 63, P.bridgeRail);
  // Fushimi-yagura turret
  occupy(ctx, 69, 59, 74, 63);
  g.box(70, Y0, 60, 73, Y0, 62, P.stone_wall);
  g.box(70, Y0 + 1, 60, 73, Y0 + 2, 62, P.palace_wall);
  g.box(69, Y0 + 3, 59, 74, Y0 + 3, 63, P.palace_roof);
  g.box(71, Y0 + 4, 60, 72, Y0 + 4, 62, P.palace_wall);
  g.box(70, Y0 + 5, 60, 73, Y0 + 5, 62, P.palace_roof);
  g.box(71, Y0 + 6, 61, 72, Y0 + 6, 61, P.palace_roof);
  // Main hall (Kyūden)
  occupy(ctx, 70, 52, 78, 56);
  g.box(71, Y0, 53, 77, Y0 + 1, 55, P.palace_wall);
  g.box(70, Y0 + 2, 52, 78, Y0 + 2, 56, P.palace_roof);
  g.box(71, Y0 + 3, 53, 77, Y0 + 3, 55, P.palace_roof);
  g.box(72, Y0 + 4, 54, 76, Y0 + 4, 54, P.palace_roof);
}

function buildTokyoStation(ctx) {
  const { g, P } = ctx;
  occupy(ctx, 92, 56, 94, 72);
  for (let y = Y0; y <= Y0 + 3; y++)
    for (let z = 56; z <= 72; z++)
      for (let x = 92; x <= 94; x++) {
        let c = (y - Y0) % 2 === 1 && x === 92 && z % 2 === 0 ? P.win_lit : (y === Y0 + 1 || y === Y0 + 3) && x === 92 ? P.brick_trim : P.brick;
        if (y === Y0 && x === 92 && (z === 63 || z === 64 || z === 65)) c = P.win_shop;
        g.set(x, y, z, c);
      }
  g.box(92, Y0 + 4, 56, 94, Y0 + 4, 72, P.dome);
  g.box(92, Y0 + 4, 62, 94, Y0 + 5, 66, P.brick);
  g.box(92, Y0 + 6, 63, 94, Y0 + 6, 65, P.dome);
  for (const dz of [58, 70]) {
    g.box(91, Y0, dz - 2, 95, Y0 + 4, dz + 2, P.brick);
    g.box(91, Y0 + 1, dz - 2, 91, Y0 + 1, dz + 2, P.brick_trim);
    g.box(91, Y0 + 3, dz - 1, 91, Y0 + 3, dz + 1, P.win_lit);
    g.box(91, Y0 + 5, dz - 2, 95, Y0 + 5, dz + 2, P.dome);
    g.box(92, Y0 + 6, dz - 1, 94, Y0 + 6, dz + 1, P.dome);
    g.set(93, Y0 + 7, dz, P.dome);
    g.set(93, Y0 + 8, dz, P.gold);
  }
  occupy(ctx, 91, 56, 95, 60); occupy(ctx, 91, 68, 95, 72);
}

function buildGinza(ctx) {
  const { g, P } = ctx;
  // Wakō clock tower on the corner
  occupy(ctx, 91, 76, 94, 79);
  for (let y = Y0; y <= Y0 + 6; y++)
    for (let z = 76; z <= 79; z++)
      for (let x = 91; x <= 94; x++) {
        if (x === 94 && z === 79) continue; // rounded corner
        const per = x === 91 || x === 94 || z === 76 || z === 79;
        g.set(x, y, z, per && (y - Y0) % 2 === 1 ? P.win_lit : per && y === Y0 ? P.win_shop : P.cream_stone);
      }
  g.box(92, Y0 + 7, 77, 93, Y0 + 9, 78, P.cream_stone);
  g.set(92, Y0 + 8, 79, P.clock_face); g.set(93, Y0 + 8, 79, P.clock_face);
  g.set(94, Y0 + 8, 77, P.clock_face); g.set(94, Y0 + 8, 78, P.clock_face);
  g.box(92, Y0 + 10, 77, 93, Y0 + 10, 78, P.dome);
  g.set(92, Y0 + 11, 77, P.gold);
}

function buildTsukiji(ctx) {
  const { g, P } = ctx;
  const awn = [P.awning_red, P.awning_blue, P.awning_white];
  for (let i = 0; i < 4; i++) {
    const z = 89 + i * 1.5 | 0;
    for (let x = 95; x <= 101; x += 2) {
      if ((x + z) % 3 === 0) continue;
      g.set(x, Y0, z, P.win_shop);
      g.set(x, Y0 + 1, z, awn[(x + i) % 3]);
    }
  }
  // Giant tuna sign
  occupy(ctx, 96, 86, 100, 87);
  g.box(96, Y0, 86, 100, Y0 + 2, 87, P.wall_white);
  g.box(96, Y0, 86, 100, Y0, 86, P.win_shop);
  g.box(96, Y0 + 3, 87, 99, Y0 + 3, 87, P.fish_blue);
  g.box(96, Y0 + 4, 87, 99, Y0 + 4, 87, P.fish_silver);
  g.set(100, Y0 + 3, 87, P.fish_blue); g.set(100, Y0 + 4, 87, P.fish_blue);
  g.set(95, Y0 + 3, 87, P.fish_blue); g.set(95, Y0 + 5, 87, P.fish_blue);
  g.set(97, Y0 + 4, 87, P.clock_hand);
}

function buildAkihabara(ctx) {
  const { g, P } = ctx;
  occupy(ctx, 105, 34, 109, 37);
  facade(ctx, 105, Y0, 34, 109, Y0 + 9, 37, P.wall_dark);
  const cols = [P.neon_pink, P.neon_yellow, P.neon_cyan, P.neon_green, P.neon_purple];
  for (let x = 105; x <= 109; x++)
    for (let y = Y0 + 1; y <= Y0 + 8; y++) if ((x + y) % 3 !== 0) g.set(x, y, 37, cols[(x * 3 + Math.floor(y / 2)) % cols.length]);
  // Capsule toy machine row
  for (let x = 97; x <= 99; x++) { g.set(x, Y0, 36, P.neon_red); g.set(x, Y0 + 1, 36, P.tank); }
}

function buildUeno(ctx) {
  const { g, P, ellipse } = ctx;
  // Bentendo on its island in Shinobazu pond
  ellipse(96.5, 18, 1.2, 1.2, (x, z) => { ctx.setT(x, z, T.BUILT); g.set(x, Y0 - 1, z, P.stone_base); });
  g.set(96, Y0, 18, P.temple_red); g.set(96, Y0 + 1, 18, P.temple_roof); g.set(97, Y0 + 1, 18, P.temple_roof); g.set(95, Y0 + 1, 18, P.temple_roof);
  // Lotus pads
  ellipse(96.5, 18, 3, 2.8, (x, z) => { if (ctx.getT(x, z) === T.WATER && hash3(x, 4, z) < 0.35) g.set(x, Y0 - 1, z, P.lotus); });
  // Panda enclosure with bamboo
  occupy(ctx, 96, 5, 99, 8);
  g.box(96, Y0, 5, 99, Y0, 8, P.grass);
  for (const [x, z] of [[96, 5], [99, 5], [96, 8], [99, 8], [97, 5]]) { g.set(x, Y0 + 1, z, P.bamboo); g.set(x, Y0 + 2, z, P.bamboo); g.set(x, Y0 + 3, z, P.leaf); }
  g.set(98, Y0 + 1, 7, P.panda_w); g.set(97, Y0 + 1, 7, P.panda_k); g.set(98, Y0 + 2, 7, P.panda_w);
  // National Museum
  occupy(ctx, 102, 4, 106, 7);
  g.box(102, Y0, 4, 106, Y0 + 2, 7, P.cream_stone);
  for (let x = 102; x <= 106; x += 2) g.box(x, Y0, 7, x, Y0 + 2, 7, P.wall_white);
  g.box(101, Y0 + 3, 3, 107, Y0 + 3, 8, P.roof_gray);
  g.box(102, Y0 + 4, 4, 106, Y0 + 4, 7, P.roof_gray);
  g.box(103, Y0 + 5, 5, 105, Y0 + 5, 6, P.roof_gray);
}

function buildSensoji(ctx, cx, cz) {
  const { g, P } = ctx;
  // Kaminarimon gate
  const gz = cz + 8;
  occupy(ctx, cx - 4, gz - 1, cx - 2, gz + 1); occupy(ctx, cx + 2, gz - 1, cx + 4, gz + 1);
  g.box(cx - 4, Y0, gz - 1, cx - 2, Y0 + 3, gz + 1, P.temple_red);
  g.box(cx + 2, Y0, gz - 1, cx + 4, Y0 + 3, gz + 1, P.temple_red);
  g.box(cx - 3, Y0 + 1, gz + 1, cx - 3, Y0 + 2, gz + 1, P.temple_dark);
  g.box(cx + 3, Y0 + 1, gz + 1, cx + 3, Y0 + 2, gz + 1, P.temple_dark);
  g.box(cx - 4, Y0 + 4, gz - 1, cx + 4, Y0 + 4, gz + 1, P.temple_red);
  g.box(cx - 5, Y0 + 5, gz - 2, cx + 5, Y0 + 5, gz + 2, P.temple_roof);
  g.box(cx - 4, Y0 + 6, gz - 1, cx + 4, Y0 + 6, gz + 1, P.temple_roof);
  g.box(cx - 3, Y0 + 7, gz, cx + 3, Y0 + 7, gz, P.temple_roof);
  for (const sx of [-5, 5]) for (const sz of [-2, 2]) g.set(cx + sx, Y0 + 6, gz + sz, P.temple_roof);
  // The great red lantern
  g.box(cx - 1, Y0 + 2, gz - 1, cx + 1, Y0 + 3, gz + 1, P.lantern_red);
  g.box(cx - 1, Y0 + 1, gz, cx + 1, Y0 + 1, gz, P.lantern_black);
  g.set(cx, Y0 + 2, gz + 1, P.lantern_black);
  // Nakamise shopping street
  for (let z = cz - 2; z <= cz + 5; z++) {
    for (const x of [cx - 4, cx + 4]) {
      const shop = Math.floor(z / 2) % 2 === 0 ? P.wall_white : P.temple_red;
      g.set(x, Y0, z, x < cx ? (z % 2 ? P.win_shop : shop) : z % 2 ? shop : P.win_shop);
      g.set(x, Y0 + 1, z, shop);
      g.set(x, Y0 + 2, z, P.temple_roof);
      g.set(x + (x < cx ? 1 : -1), Y0 + 2, z, z % 3 === 0 ? P.lantern_red : 0);
    }
  }
  occupy(ctx, cx - 4, cz - 2, cx - 4, cz + 5); occupy(ctx, cx + 4, cz - 2, cx + 4, cz + 5);
  // Incense burner
  g.set(cx, Y0, cz - 1, P.bronze);
  // Main hall
  const hz0 = cz - 11, hz1 = cz - 4;
  occupy(ctx, cx - 6, hz0, cx + 6, hz1);
  g.box(cx - 6, Y0, hz0, cx + 6, Y0, hz1, P.stone_base);
  for (let y = Y0 + 1; y <= Y0 + 3; y++)
    for (let z = hz0 + 1; z <= hz1 - 1; z++)
      for (let x = cx - 5; x <= cx + 5; x++) {
        const per = x === cx - 5 || x === cx + 5 || z === hz0 + 1 || z === hz1 - 1;
        g.set(x, y, z, per && (x + z) % 2 === 0 ? P.temple_red : per ? P.temple_dark : P.temple_red);
      }
  const roofLayers = [[7, -1, 4], [6, 0, 5], [5, 1, 6], [3, 2, 7], [2, 3, 8]];
  for (const [rx, inset, ry] of roofLayers) g.box(cx - rx, Y0 + ry, hz0 + inset, cx + rx, Y0 + ry, hz1 - inset, P.temple_roof);
  for (const sx of [-7, 7]) { g.set(cx + sx, Y0 + 5, hz0 - 1, P.temple_roof); g.set(cx + sx, Y0 + 5, hz1 + 1, P.temple_roof); }
  g.set(cx - 2, Y0 + 9, hz0 + 3, P.gold); g.set(cx + 2, Y0 + 9, hz0 + 3, P.gold);
  g.box(cx - 1, Y0, hz1 + 1, cx + 1, Y0, hz1 + 1, P.stone_base);
  // Five-storey pagoda
  const px = cx - 8, pz = cz - 1;
  occupy(ctx, px - 2, pz - 2, px + 2, pz + 2);
  g.box(px - 2, Y0, pz - 2, px + 2, Y0, pz + 2, P.stone_base);
  for (let i = 0; i < 5; i++) {
    const yb = Y0 + 1 + i * 3;
    g.box(px - 1, yb, pz - 1, px + 1, yb + 1, pz + 1, P.temple_red);
    g.set(px, yb + 1, pz + 1, P.temple_dark);
    g.box(px - 2, yb + 2, pz - 2, px + 2, yb + 2, pz + 2, P.temple_roof);
    for (const sx of [-2, 2]) for (const sz of [-2, 2]) g.set(px + sx, yb + 3, pz + sz, P.temple_roof);
  }
  for (let y = Y0 + 16; y <= Y0 + 20; y++) g.set(px, y, pz, P.gold);
}

function buildSkytree(ctx, cx, cz) {
  const { g, P } = ctx;
  occupy(ctx, cx - 5, cz - 5, cx + 5, cz + 5);
  // Solamachi base
  g.box(cx - 4, Y0, cz + 3, cx + 4, Y0 + 2, cz + 5, P.glass_dark);
  for (let h = 0; h <= 52; h++) {
    let r;
    if (h < 8) r = 4.6 - (h / 8) * 1.4;
    else if (h < 33) r = 3.2 - ((h - 8) / 25) * 1.0;
    else if (h < 44) r = 2.2;
    else r = 1.6;
    const y = Y0 + h;
    for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r + 1); z++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = x + 0.5 - (cx + 0.5), dz = z + 0.5 - (cz + 0.5);
        const d = Math.hypot(dx, dz);
        if (Math.abs(d - r) < 0.55) {
          const a = Math.atan2(dz, dx);
          const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
          if ((k + Math.floor(h / 2)) % 2 === 0 || h < 2) g.set(x, y, z, P.st_white);
        } else if (d < 1.1) g.set(x, y, z, P.st_gray);
      }
  }
  // Observation decks
  const deck = (y0, r) => {
    g.cylinder(cx + 0.5, cz + 0.5, y0, y0, r, P.st_white);
    g.cylinder(cx + 0.5, cz + 0.5, y0 + 1, y0 + 2, r, P.st_glass, true);
    g.cylinder(cx + 0.5, cz + 0.5, y0 + 3, y0 + 3, r, P.st_white);
  };
  deck(Y0 + 33, 4.2);
  deck(Y0 + 44, 3.2);
  for (let y = Y0 + 53; y <= Y0 + 64; y++) g.set(cx, y, cz, P.st_white);
  g.set(cx, Y0 + 65, cz, P.aviation);
}

function buildOdaiba(ctx) {
  const { g, P } = ctx;
  // Fuji TV building with its silver sphere
  occupy(ctx, 101, 140, 107, 145);
  facade(ctx, 101, Y0, 140, 102, Y0 + 11, 145, P.silver);
  facade(ctx, 106, Y0, 140, 107, Y0 + 11, 145, P.silver);
  for (let y = Y0 + 3; y <= Y0 + 11; y += 4) g.box(101, y, 140, 107, y, 145, P.silver);
  g.box(101, Y0 + 12, 140, 107, Y0 + 12, 145, P.silver);
  g.sphere(104.5, Y0 + 9, 142.5, 2.2, P.sphere);
  // Ferris wheel supports (the wheel itself is animated in the scene)
  const fx = 113, fz = 147, fy = Y0 + 9;
  occupy(ctx, fx - 3, fz - 1, fx + 3, fz + 1);
  line3(g, [fx - 3, Y0, fz - 1], [fx, fy, fz - 1], P.silver);
  line3(g, [fx + 3, Y0, fz - 1], [fx, fy, fz - 1], P.silver);
  line3(g, [fx - 3, Y0, fz + 1], [fx, fy, fz + 1], P.silver);
  line3(g, [fx + 3, Y0, fz + 1], [fx, fy, fz + 1], P.silver);
  return { x: fx + 0.5, y: fy + 0.5, z: fz + 0.5, r: 7.5 };
}

function buildRainbowBridge(ctx, a, b) {
  const { g, P } = ctx;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len;
  const towerT = [0.3, 0.7];
  const deckY = Y0 - 1;
  const cableY = (t) => {
    if (t < towerT[0]) return deckY + 1 + (t / towerT[0]) * 12;
    if (t > towerT[1]) return deckY + 1 + ((1 - t) / (1 - towerT[1])) * 12;
    const m = (t - towerT[0]) / (towerT[1] - towerT[0]);
    return deckY + 4 + 9 * (2 * m - 1) ** 2;
  };
  const steps = Math.ceil(len * 3);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    for (const side of [-1.6, 1.6]) {
      const cx = px + nx * side, cz = pz + nz * side;
      g.set(Math.floor(cx), Math.round(cableY(t)), Math.floor(cz), P.cable);
      if (s % 6 === 0 && cableY(t) > deckY + 3) {
        for (let y = deckY + 2; y < Math.round(cableY(t)); y++) g.set(Math.floor(cx), y, Math.floor(cz), P.cable);
      }
    }
  }
  for (const t of towerT) {
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    for (const side of [-1.6, 1.6]) {
      const cx = Math.floor(px + nx * side), cz = Math.floor(pz + nz * side);
      g.box(cx, Y0 - 2, cz, cx, deckY + 13, cz, P.pillar_white);
    }
    for (const y of [deckY + 8, deckY + 13]) line3(g, [px - nx * 1.6, y, pz - nz * 1.6], [px + nx * 1.6, y, pz + nz * 1.6], P.pillar_white);
  }
}

function buildStations(ctx, curve) {
  const { g, P } = ctx;
  for (const [sx, sz] of STATIONS) {
    for (const [px, pz] of curve) {
      if (Math.hypot(px - sx, pz - sz) > 3.2) continue;
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = Math.floor(px + dx), z = Math.floor(pz + dz);
          const t = ctx.getT(x, z);
          if (t === T.RAIL || t === T.PLAZA || t === T.ROAD || t === T.STREET) {
            if (g.get(x, Y0 + 2, z) === 0) g.set(x, Y0 + 2, z, P.roof_gray);
          }
        }
    }
  }
}
