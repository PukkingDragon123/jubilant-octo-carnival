// Persistent game state. Everything lives in one JSON blob in localStorage.
import { dayKey } from '../util.js';

const KEY = 'tokotoko.v1';
const KEEP_DAYS = 120;

export function defaultState() {
  return {
    v: 1,
    onboarded: false,
    profile: {
      petName: 'Kinako',
      species: 'shiba',
      weightKg: 60,
      stepGoal: 8000,
      budget: 1800,
      strideM: 0.7,
      timeMode: 'auto',
      sound: true,
      demo: false,
      demoSpeed: 15,
      gps: false,
      motion: false,
    },
    coins: 0,
    xp: 0,
    outfit: {},
    owned: [],
    stamps: {},
    pos: null,
    dest: null,
    lifetime: { steps: 0, meters: 0, burned: 0, eaten: 0, days: 0 },
    days: {},
    today: null,
  };
}

export function newDay(key, profile) {
  return {
    key,
    steps: 0,
    meters: 0,
    burned: 0,
    eaten: 0,
    deposit: profile.budget,
    bonus: 0,
    entries: [],
    ledger: [],
    visited: [],
    foods: [],
    quests: [],
    omikuji: null,
    missionDone: false,
    pats: 0,
    newStamps: 0,
    rides: 0,
    lastFood: 0,
    goalHit: false,
    milestones: [],
  };
}

function migrate(s) {
  const d = defaultState();
  const out = { ...d, ...s, profile: { ...d.profile, ...(s.profile || {}) }, lifetime: { ...d.lifetime, ...(s.lifetime || {}) } };
  out.outfit = s.outfit || {};
  out.owned = s.owned || [];
  out.stamps = s.stamps || {};
  out.days = s.days || {};
  return out;
}

function prune(state) {
  const keys = Object.keys(state.days).sort();
  while (keys.length > KEEP_DAYS) delete state.days[keys.shift()];
}

export const storage = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('Could not read saved data', e);
    }
    return null;
  },
  save(state) {
    try {
      prune(state);
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  },
};

export { dayKey };
