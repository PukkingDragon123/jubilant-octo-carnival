// Daily quests, picks and omikuji — all seeded by the date so a day is stable.
import { mulberry32, strSeed, pick, shuffle } from '../util.js';
import { LANDMARKS } from '../world/tokyo.js';
import { FOODS, FOOD_BY_ID, TAG_LABEL, MISSIONS, OMIKUJI, LUCKY_COLORS } from './data.js';

const LM = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));

export function generateQuests(key, state) {
  const rand = mulberry32(strSeed('quests:' + key));
  const goal = state.profile.stepGoal;
  const pos = state.pos || { x: LM.shibuya.x, z: LM.shibuya.z };
  const out = [];

  // 1. Steps
  const frac = pick(rand, [0.5, 0.75, 1]);
  const steps = Math.max(1000, Math.round((goal * frac) / 500) * 500);
  out.push({ id: 'steps', kind: 'steps', target: steps, reward: Math.round(steps / 50), icon: 'paw', title: `Walk ${steps.toLocaleString('en-US')} steps` });

  // 2. Exploration
  if (rand() < 0.55) {
    const unstamped = LANDMARKS.filter((l) => !state.stamps[l.id]);
    const pool = (unstamped.length ? unstamped : LANDMARKS).slice().sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z));
    const lm = pool[Math.floor(rand() * Math.min(3, pool.length))];
    out.push({ id: 'visit-' + lm.id, kind: 'visitOne', param: lm.id, target: 1, reward: 120, icon: lm.icon, title: `Visit ${lm.name} ${lm.jp}` });
  } else {
    out.push({ id: 'visitN', kind: 'visitN', target: 2, reward: 100, icon: 'pin', title: 'Explore 2 different districts' });
  }

  // 3. Food
  if (rand() < 0.6) {
    const tag = pick(rand, ['sweet', 'street', 'rice', 'matcha', 'noodle', 'bakery']);
    out.push({ id: 'eat-' + tag, kind: 'eatTag', param: tag, target: 1, reward: 40, icon: 'bowl', title: `Try ${TAG_LABEL[tag]}` });
  } else {
    out.push({ id: 'meals', kind: 'meals', target: 3, reward: 50, icon: 'book', title: 'Log 3 things you ate' });
  }

  // 4. Fun
  const fun = pick(rand, ['pats', 'omikuji', 'mission', 'pats']);
  if (fun === 'pats') out.push({ id: 'pats', kind: 'pats', target: 5, reward: 25, icon: 'heart', title: `Pat ${state.profile.petName} 5 times` });
  else if (fun === 'omikuji') out.push({ id: 'omikuji', kind: 'omikuji', target: 1, reward: 30, icon: 'omikuji', title: 'Draw today’s omikuji' });
  else out.push({ id: 'mission', kind: 'mission', target: 1, reward: 40, icon: 'star', title: 'Finish today’s mini mission' });

  // Bonus: collect a new stamp (only while stamps remain)
  if (Object.keys(state.stamps).length < LANDMARKS.length) {
    out.push({ id: 'stamp', kind: 'newStamp', target: 1, reward: 150, icon: 'stamp', title: 'Collect a new station stamp' });
  }
  return out.map((q) => ({ ...q, claimed: false }));
}

export function questProgress(q, day) {
  switch (q.kind) {
    case 'steps': return day.steps;
    case 'meters': return day.meters;
    case 'visitN': return day.visited.length;
    case 'visitOne': return day.visited.includes(q.param) ? 1 : 0;
    case 'eatTag': return day.foods.filter((f) => (FOOD_BY_ID[f.id]?.tags || []).includes(q.param)).length;
    case 'meals': return day.foods.length;
    case 'pats': return day.pats;
    case 'omikuji': return day.omikuji ? 1 : 0;
    case 'mission': return day.missionDone ? 1 : 0;
    case 'newStamp': return day.newStamps;
    default: return 0;
  }
}

export function questDone(q, day) {
  return questProgress(q, day) >= q.target;
}

// Today's three picks: a spot, a treat and a mini mission.
export function todaysPicks(key) {
  const rand = mulberry32(strSeed('picks:' + key));
  const spot = pick(rand, LANDMARKS);
  const local = FOODS.filter((f) => f.spot === spot.id);
  const treat = local.length && rand() < 0.7 ? local[0] : pick(rand, FOODS.filter((f) => f.kcal > 0));
  const mission = pick(rand, MISSIONS);
  return { spot: spot.id, treat: treat.id, mission };
}

export function drawOmikuji(key, name) {
  const rand = mulberry32(strSeed('omikuji:' + key + ':' + name));
  const total = OMIKUJI.reduce((s, o) => s + o.weight, 0);
  let r = rand() * total;
  let res = OMIKUJI[0];
  for (const o of OMIKUJI) { r -= o.weight; if (r <= 0) { res = o; break; } }
  const idx = OMIKUJI.indexOf(res);
  return {
    idx,
    no: 1 + Math.floor(rand() * 100),
    line: pick(rand, res.lines),
    food: pick(rand, FOODS.filter((f) => f.kcal > 0)).id,
    spot: pick(rand, LANDMARKS).id,
    color: Math.floor(rand() * LUCKY_COLORS.length),
    bonus: res.bonus,
  };
}

export { shuffle };
