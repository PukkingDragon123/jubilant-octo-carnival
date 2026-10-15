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

export const localStore = {
  kind: 'local',
  async load() {
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
    } catch {
      return false;
    }
  },
  flush() {},
  async clear() {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  },
};

// Private per-viewer cloud save for the hosted Artifact preview: one core
// document plus one document per day (each well under the 256 KiB cap).
class CloudStore {
  constructor(db, uid) {
    this.kind = 'cloud';
    this.core = db.doc(`data/users/${uid}/tokotoko`);
    this.days = this.core.collection('days');
    this.written = new Map();
    this.timer = null;
    this.busy = null;
    this.pending = null;
  }

  async load() {
    try {
      const snap = await this.core.get();
      if (!snap.exists) return localStore.load();
      const state = JSON.parse(JSON.stringify(snap.data()));
      state.days = {};
      const q = await this.days.limit(KEEP_DAYS + 10).get();
      for (const d of q.docs) {
        state.days[d.id] = JSON.parse(JSON.stringify(d.data()));
        this.written.set('day:' + d.id, JSON.stringify(state.days[d.id]));
      }
      const { days, ...core } = state;
      this.written.set('core', JSON.stringify(core));
      return migrate(state);
    } catch (e) {
      console.warn('Cloud load failed, using this device', e);
      return localStore.load();
    }
  }

  save(state) {
    localStore.save(state);
    this.pending = state;
    if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 6000);
  }

  async flush() {
    const state = this.pending;
    if (!state) return;
    if (this.busy) { await this.busy; }
    this.busy = (async () => {
      const { days, ...core } = state;
      const writes = [['core', this.core, core]];
      for (const [k, d] of Object.entries(days)) writes.push(['day:' + k, this.days.doc(k), d]);
      for (const [key, ref, body] of writes) {
        const json = JSON.stringify(body);
        if (this.written.get(key) === json) continue;
        try {
          await ref.set(JSON.parse(json));
          this.written.set(key, json);
        } catch (e) {
          console.warn('Cloud save failed', e && e.code);
          if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'quota_exceeded')) break;
        }
      }
      // Drop day documents that were pruned locally.
      for (const key of [...this.written.keys()]) {
        if (key.startsWith('day:') && !days[key.slice(4)]) {
          try { await this.days.doc(key.slice(4)).delete(); this.written.delete(key); } catch { /* retry next time */ }
        }
      }
    })();
    await this.busy;
    this.busy = null;
  }

  async clear() {
    await localStore.clear();
    try {
      for (const key of this.written.keys()) if (key.startsWith('day:')) await this.days.doc(key.slice(4)).delete();
      await this.core.delete();
    } catch { /* best effort */ }
  }
}

// Picks cloud storage inside the Claude artifact viewer when available.
export async function openStorage() {
  const c = typeof window !== 'undefined' ? window.claude : null;
  if (!c || typeof c.use !== 'function') return localStore;
  try {
    const timeout = new Promise((r) => setTimeout(() => r(null), 5000));
    const pick = (async () => {
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      if (!db || !user) return null;
      const uid = await user.id();
      return uid ? new CloudStore(db, uid) : null;
    })();
    return (await Promise.race([pick, timeout])) || localStore;
  } catch {
    return localStore;
  }
}

export { dayKey };
