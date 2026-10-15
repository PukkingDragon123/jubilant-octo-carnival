// Game orchestrator: piggy-bank economy, movement on the map, visits &
// stamps, quests, omikuji, wardrobe and the auto-diary.
import { storage, defaultState, newDay } from './state.js';
import { Pathfinder, pathLength, pointAlong } from './journey.js';
import { generateQuests, questDone, todaysPicks, drawOmikuji as rollOmikuji } from './quests.js';
import { FOOD_BY_ID, SPEECH, OMIKUJI, levelFromXp } from './data.js';
import { LANDMARKS, METERS_PER_UNIT, Y0 } from '../world/tokyo.js';
import { COSMETICS, SPECIES } from '../world/pets.js';
import { dayKey, fmt, pick } from '../util.js';

const LM = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));
const MILESTONES = [1000, 3000, 5000, 10000, 15000, 20000];

export class Game {
  constructor(world, tracker) {
    this.world = world;
    this.tracker = tracker;
    this.state = storage.load() || defaultState();
    this.pf = new Pathfinder(world.map);
    this.listeners = {};
    this.route = null;
    this.coinAcc = 0;
    this.xpAcc = 0;
    this.lastStepAt = 0;
    this.visitTimer = 0;
    this.chatTimer = 8;
    this.mode = 'virtual';
    this.saveTimer = null;
    this.gpsPos = null;

    // Entry cells & visit radii per landmark.
    this.entries = {};
    for (const l of LANDMARKS) {
      const e = this.pf.nearestWalkable(l.x, l.z) || { x: Math.floor(l.x), z: Math.floor(l.z) };
      const ex = e.x + 0.5, ez = e.z + 0.5;
      this.entries[l.id] = { x: ex, z: ez, r: Math.max(l.r, Math.hypot(ex - l.x, ez - l.z) + 1.6) };
    }
  }

  // ------------------------------------------------------------- basics
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }
  get profile() { return this.state.profile; }
  get day() { return this.state.days[this.state.today]; }
  get coins() { return this.state.coins; }
  get level() { return levelFromXp(this.state.xp); }
  get kcalPerStep() { return this.profile.weightKg * 0.00057; }

  save(now = false) {
    clearTimeout(this.saveTimer);
    if (now) storage.save(this.state);
    else this.saveTimer = setTimeout(() => storage.save(this.state), 1200);
  }

  changed(what = 'all') {
    this.emit('change', what);
    this.save();
  }

  init() {
    const s = this.state;
    if (!s.pos) {
      const e = this.entries.shibuya;
      s.pos = { x: e.x, z: e.z };
    }
    this.ensureToday();
    this.world.setPet(this.profile.species, s.outfit);
    this.world.setTimeMode(this.profile.timeMode);
    this.world.petPos.set(s.pos.x, Y0, s.pos.z);
    this.world.pet.root.position.copy(this.world.petPos);
    if (s.dest && (LM[s.dest] || s.dest.startsWith?.('xy:'))) this.setDestination(s.dest, { silent: true });
    else this.autoDestination(true);

    const t = this.tracker;
    t.on('steps', ({ n, source }) => this.addSteps(n, source));
    t.on('walk', ({ meters }) => this.onWalk(meters));
    t.on('position', (p) => this.onPosition(p));
    t.on('ride', ({ meters }) => this.onRide(meters));
    t.on('status', () => this.emit('tracker'));
    t.setDemo(this.profile.demo, this.profile.demoSpeed);
    if (this.profile.gps) t.startGPS();

    this.world.on('petTap', () => this.pat());
    setInterval(() => this.ensureToday(), 15000);
    const flush = () => { if (document.visibilityState === 'hidden') this.save(true); };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', () => this.save(true));
  }

  // ------------------------------------------------------------- days
  ensureToday() {
    const key = dayKey();
    const s = this.state;
    if (s.today === key && s.days[key]) return false;
    const fresh = !s.days[key];
    s.today = key;
    if (fresh) {
      const d = newDay(key, this.profile);
      s.days[key] = d;
      if (s.onboarded) this.startDay(d);
    }
    this.changed('day');
    this.emit('newday', key);
    return true;
  }

  startDay(d) {
    d.deposit = this.profile.budget;
    this.state.coins += d.deposit;
    d.ledger.push({ t: Date.now(), kind: 'deposit', label: 'Morning allowance', amt: d.deposit });
    d.quests = generateQuests(d.key, this.state);
    d.picks = todaysPicks(d.key);
    d.started = true;
    this.state.lifetime.days++;
    this.entry('wake', `Good morning! ${this.profile.petName} woke up near ${this.placeName()}.`, 'sun');
  }

  completeOnboarding(profile) {
    Object.assign(this.state.profile, profile);
    this.state.onboarded = true;
    const d = this.day;
    if (!d.started) this.startDay(d);
    this.world.setPet(this.profile.species, this.state.outfit);
    this.tracker.setDemo(this.profile.demo, this.profile.demoSpeed);
    this.visitsPausedUntil = performance.now() + 3500;
    this.autoDestination(true);
    this.changed('all');
    this.save(true);
  }

  entry(kind, text, icon, extra = {}) {
    const d = this.day;
    if (!d) return;
    d.entries.push({ t: Date.now(), kind, text, icon, ...extra });
    this.emit('entry', d.entries[d.entries.length - 1]);
  }

  ledger(kind, label, amt) {
    this.day.ledger.push({ t: Date.now(), kind, label, amt });
  }

  addCoins(amt, reason) {
    this.state.coins += amt;
    this.emit('coins', { amt, reason });
  }

  addXp(n) {
    const before = this.level;
    this.state.xp += n;
    const after = this.level;
    if (after > before) {
      this.entry('level', `${this.profile.petName} reached level ${after}!`, 'sparkle');
      this.emit('levelUp', after);
    }
  }

  placeName(pos = this.state.pos) {
    let best = null, bd = Infinity;
    for (const l of LANDMARKS) {
      const d = Math.hypot(l.x - pos.x, l.z - pos.z);
      if (d < bd) { bd = d; best = l; }
    }
    return best ? best.name : 'Tokyo';
  }

  nearbyLandmark(pos = this.state.pos) {
    for (const l of LANDMARKS) {
      const e = this.entries[l.id];
      if (Math.hypot(l.x - pos.x, l.z - pos.z) <= e.r + 0.5) return l;
    }
    return null;
  }

  // ------------------------------------------------------------- steps & money
  addSteps(n, source = 'motion') {
    if (!n || !this.state.onboarded) return;
    const d = this.day;
    if (!d) return;
    const p = this.profile;
    d.steps += n;
    this.state.lifetime.steps += n;
    if (source !== 'gps') {
      d.meters += n * p.strideM;
      this.state.lifetime.meters += n * p.strideM;
    }
    const kcal = n * this.kcalPerStep;
    d.burned += kcal;
    this.state.lifetime.burned += kcal;
    this.state.coins += kcal;
    this.coinAcc += kcal;
    if (this.coinAcc >= 1) {
      const whole = Math.floor(this.coinAcc);
      this.coinAcc -= whole;
      this.emit('coins', { amt: whole, reason: 'walk' });
    }
    this.xpAcc += n;
    if (this.xpAcc >= 100) { const x = Math.floor(this.xpAcc / 100); this.xpAcc -= x * 100; this.addXp(x); }
    this.lastStepAt = performance.now();

    for (const m of MILESTONES) {
      if (d.steps >= m && !d.milestones.includes(m)) {
        d.milestones.push(m);
        this.entry('steps', `Reached ${fmt(m)} steps.`, 'paw');
      }
    }
    if (!d.goalHit && d.steps >= p.stepGoal) {
      d.goalHit = true;
      this.entry('goal', `Step goal reached: ${fmt(p.stepGoal)} steps!`, 'star');
      this.emit('goal');
      this.say('goal');
    }
    // In virtual mode, real steps carry the buddy along the route.
    if (this.mode === 'virtual' && this.route && source !== 'manual') {
      const units = (n * p.strideM) / METERS_PER_UNIT;
      this.advance(units);
    }
    this.changed('steps');
  }

  addManualSteps(n) {
    n = Math.max(0, Math.min(60000, Math.round(n)));
    if (!n) return;
    this.addSteps(n, 'manual');
    this.entry('steps', `Synced ${fmt(n)} steps from another app.`, 'walk');
    this.changed('all');
  }

  onWalk(meters) {
    const d = this.day;
    if (!d || !this.state.onboarded) return;
    d.meters += meters;
    this.state.lifetime.meters += meters;
    if (!this.tracker.pedometerActive) this.addSteps(Math.round(meters / this.profile.strideM), 'gps');
    else this.changed('steps');
  }

  onRide(meters) {
    const d = this.day;
    if (!d) return;
    d.rides++;
    this.entry('ride', `Rode a train for ${(meters / 1000).toFixed(1)} km. Choo choo!`, 'train');
    this.changed('diary');
  }

  onPosition(p) {
    this.gpsPos = p;
    if (!p.inTokyo) {
      if (this.mode !== 'virtual') { this.mode = 'virtual'; this.autoDestination(true); this.emit('mode', this.mode); }
      return;
    }
    if (this.mode !== 'real') { this.mode = 'real'; this.emit('mode', this.mode); this.world.setTrail(null); }
    const target = this.pf.nearestWalkable(p.x, p.z);
    if (!target) return;
    const tx = target.x + 0.5, tz = target.z + 0.5;
    const cur = this.route ? pointAlong(this.route.pts, this.route.d) : this.state.pos;
    if (Math.hypot(cur.x - tx, cur.z - tz) < 0.8) return;
    const from = this.visualPos();
    const far = Math.hypot(from.x - tx, from.z - tz) > 30;
    const pts = far ? null : this.pf.find(from, { x: tx, z: tz });
    if (!pts) {
      this.route = null;
      this.state.pos = { x: tx, z: tz };
      this.world.petPos.set(tx, Y0, tz);
      this.world.pet.root.position.copy(this.world.petPos);
    } else {
      this.route = { pts, len: pathLength(pts), d: 0, vd: 0, dest: null };
      this.route.d = this.route.len;
      this.state.pos = { x: tx, z: tz };
    }
    this.save();
  }

  // ------------------------------------------------------------- destinations & movement
  visualPos() {
    const p = this.world.petPos;
    return { x: p.x, z: p.z };
  }

  setDestination(id, { silent = false } = {}) {
    let target;
    if (id && id.startsWith('xy:')) {
      const [, x, z] = id.split(':');
      target = { x: +x, z: +z };
    } else {
      const lm = LM[id];
      if (!lm) return false;
      target = this.entries[id];
    }
    const from = this.visualPos();
    const pts = this.pf.find(from, target);
    if (!pts) { if (!silent) this.emit('toast', { text: 'Can’t find a walking route there.', icon: 'close' }); return false; }
    this.route = { pts, len: pathLength(pts), d: 0, vd: 0, dest: id };
    this.state.dest = id;
    this.world.setDestination(LM[id] || { ...target, custom: true });
    this.world.setTrail(pts);
    if (!silent) {
      const name = LM[id] ? LM[id].name : 'that spot';
      this.emit('toast', { text: `Heading to ${name}. Every real step moves us!`, icon: 'pin' });
    }
    this.changed('dest');
    return true;
  }

  autoDestination(silent = false) {
    const pos = this.state.pos;
    const d = this.day;
    const visited = new Set(d ? d.visited : []);
    const here = this.nearbyLandmark(pos);
    const candidates = LANDMARKS.filter((l) => !visited.has(l.id) && l !== here);
    const pool = candidates.length ? candidates : LANDMARKS.filter((l) => l !== here);
    pool.sort((a, b) => {
      const sa = this.state.stamps[a.id] ? 1 : 0, sb = this.state.stamps[b.id] ? 1 : 0;
      return (Math.hypot(a.x - pos.x, a.z - pos.z) + sa * 25) - (Math.hypot(b.x - pos.x, b.z - pos.z) + sb * 25);
    });
    if (pool[0]) this.setDestination(pool[0].id, { silent });
  }

  remaining() {
    if (!this.route) return null;
    const units = Math.max(0, this.route.len - this.route.d);
    const meters = units * METERS_PER_UNIT;
    return { units, meters, steps: Math.round(meters / this.profile.strideM), dest: this.route.dest, progress: this.route.len ? this.route.d / this.route.len : 1 };
  }

  advance(units) {
    const r = this.route;
    if (!r) return;
    r.d = Math.min(r.len, r.d + units);
    const p = pointAlong(r.pts, r.d);
    this.state.pos = { x: p.x, z: p.z };
    if (r.d >= r.len - 1e-6) this.arrived();
  }

  arrived() {
    const r = this.route;
    if (!r || r.done) return;
    r.done = true;
    if (r.dest && r.dest.startsWith('xy:')) {
      this.entry('visit', `Wandered to a quiet corner near ${this.placeName()}.`, 'pin');
    }
    this.checkVisits(true);
    if (this.mode === 'virtual') setTimeout(() => this.autoDestination(false), 1800);
  }

  checkVisits() {
    const d = this.day;
    if (!d || !this.state.onboarded || performance.now() < (this.visitsPausedUntil || 0)) return;
    const pos = this.state.pos;
    for (const l of LANDMARKS) {
      if (d.visited.includes(l.id)) continue;
      const e = this.entries[l.id];
      if (Math.hypot(pos.x - l.x, pos.z - l.z) <= e.r || Math.hypot(pos.x - e.x, pos.z - e.z) < 1.2) this.visit(l);
    }
  }

  visit(l) {
    const d = this.day;
    d.visited.push(l.id);
    this.addXp(25);
    const first = !this.state.stamps[l.id];
    if (first) {
      this.state.stamps[l.id] = { day: d.key, t: Date.now() };
      d.newStamps++;
      this.addXp(60);
      this.entry('stamp', `Arrived at ${l.name} ${l.jp} and got its stamp!`, 'stamp', { lm: l.id });
      this.emit('stamp', l);
    } else {
      this.entry('visit', `Arrived at ${l.name} ${l.jp}.`, l.icon, { lm: l.id });
      this.emit('toast', { text: `Arrived at ${l.name}!`, icon: l.icon });
    }
    this.say('arrive');
    this.changed('visit');
  }

  tapGround(pt) {
    if (this.mode === 'real') { this.emit('toast', { text: 'Following your real location in Tokyo.', icon: 'pin' }); return; }
    const c = this.pf.nearestWalkable(pt.x, pt.z, 6);
    if (!c) return;
    this.setDestination(`xy:${(c.x + 0.5).toFixed(1)}:${(c.z + 0.5).toFixed(1)}`);
  }

  // Per-frame update. Returns the pet's animation state.
  frame(dt) {
    this.tracker.tick(dt);
    const w = this.world;
    const r = this.route;
    let moving = false;
    if (r) {
      const lag = r.d - r.vd;
      if (lag > 0.001) {
        const speed = Math.max(2.6, lag * 0.6);
        r.vd = Math.min(r.d, r.vd + speed * dt);
        moving = true;
      }
      const p = pointAlong(r.pts, r.vd);
      w.petPos.set(p.x, Y0, p.z);
      if (moving) w.petYaw = p.yaw;
      // Trim the trail behind the buddy.
      if (moving && Math.random() < 0.1) w.setTrail([{ x: p.x, z: p.z }, ...r.pts.slice(p.i)]);
      if (r.done && r.vd >= r.len - 0.01 && this.mode === 'real') this.route = null;
    }
    const walkingRecently = performance.now() - this.lastStepAt < 1600;
    this.visitTimer -= dt;
    if (this.visitTimer <= 0) { this.visitTimer = 0.3; this.checkVisits(); }
    this.chatTimer -= dt;
    if (this.chatTimer <= 0) { this.chatTimer = 22 + Math.random() * 20; this.chatter(); }
    const night = w.phase === 'night';
    const idle = performance.now() - this.lastStepAt > 25000 && !moving;
    return { moving: moving || walkingRecently, stepRate: moving ? 9 : 6, sleeping: night && idle && !this.awake };
  }

  // ------------------------------------------------------------- actions
  eat(food) {
    const d = this.day;
    if (!d) return;
    const kcal = Math.max(0, Math.round(food.kcal));
    const here = this.nearbyLandmark();
    const local = FOOD_BY_ID[food.id]?.spot && here && FOOD_BY_ID[food.id].spot === here.id;
    this.state.coins -= kcal;
    d.eaten += kcal;
    this.state.lifetime.eaten += kcal;
    d.foods.push({ id: food.id, name: food.name, kcal, t: Date.now(), place: here ? here.id : null });
    d.lastFood = Date.now();
    this.ledger('food', food.name, -kcal);
    this.emit('coins', { amt: -kcal, reason: 'food' });
    const where = here ? ` in ${here.name}` : '';
    this.entry('food', `Ate ${food.name}${where}.`, FOOD_BY_ID[food.id] ? food.id : 'bowl', { amt: -kcal });
    if (local) {
      this.addCoins(25, 'local');
      this.ledger('bonus', `Local special in ${here.name}`, 25);
      this.emit('toast', { text: `Local special! +25 bonus for eating ${food.name} in ${here.name}.`, icon: 'sparkle' });
    }
    this.say('full');
    this.world.pet.hop();
    this.changed('food');
  }

  undoFood(t) {
    const d = this.day;
    const i = d.foods.findIndex((f) => f.t === t);
    if (i < 0) return;
    const f = d.foods[i];
    d.foods.splice(i, 1);
    d.eaten -= f.kcal;
    this.state.lifetime.eaten -= f.kcal;
    this.state.coins += f.kcal;
    d.ledger = d.ledger.filter((l) => !(l.kind === 'food' && Math.abs(l.t - t) < 50));
    d.entries = d.entries.filter((e) => !(e.kind === 'food' && Math.abs(e.t - t) < 50));
    this.changed('food');
  }

  claimQuest(id) {
    const d = this.day;
    const q = d.quests.find((x) => x.id === id);
    if (!q || q.claimed || !questDone(q, d)) return false;
    q.claimed = true;
    this.addCoins(q.reward, 'quest');
    d.bonus += q.reward;
    this.ledger('quest', q.title, q.reward);
    this.addXp(30);
    this.entry('quest', `Quest complete: ${q.title}.`, 'gift', { amt: q.reward });
    this.changed('quest');
    return true;
  }

  questsReady() {
    const d = this.day;
    if (!d) return 0;
    return d.quests.filter((q) => !q.claimed && questDone(q, d)).length;
  }

  drawOmikuji() {
    const d = this.day;
    if (!d || d.omikuji) return d && d.omikuji;
    const res = rollOmikuji(d.key, this.profile.petName);
    d.omikuji = res;
    const o = OMIKUJI[res.idx];
    this.addCoins(res.bonus, 'omikuji');
    this.ledger('omikuji', `Omikuji ${o.rank}`, res.bonus);
    this.addXp(10);
    this.entry('omikuji', `Drew omikuji No.${res.no}: ${o.rank} ${o.en}.`, 'omikuji', { amt: res.bonus });
    this.changed('omikuji');
    return res;
  }

  completeMission() {
    const d = this.day;
    if (!d || d.missionDone) return;
    d.missionDone = true;
    this.addCoins(20, 'mission');
    this.ledger('mission', 'Mini mission', 20);
    this.addXp(15);
    this.entry('mission', `Mini mission done: ${d.picks.mission}`, 'star', { amt: 20 });
    this.changed('mission');
  }

  pat() {
    const d = this.day;
    if (!d) return;
    d.pats++;
    this.awake = true;
    clearTimeout(this.awakeTimer);
    this.awakeTimer = setTimeout(() => { this.awake = false; }, 20000);
    if (d.pats === 5) this.entry('pat', `Gave ${this.profile.petName} lots of head pats.`, 'heart');
    this.say('pat');
    this.emit('hearts');
    this.changed('pat');
  }

  buy(id) {
    const c = COSMETICS.find((x) => x.id === id);
    if (!c || this.state.owned.includes(id)) return false;
    if (c.stamps) {
      if (Object.keys(this.state.stamps).length < c.stamps) return false;
    } else if (this.state.coins < c.price) return false;
    if (c.price) {
      this.state.coins -= c.price;
      this.ledger('buy', c.name, -c.price);
      this.emit('coins', { amt: -c.price, reason: 'buy' });
    }
    this.state.owned.push(id);
    this.entry('buy', `Bought a ${c.name} for ${this.profile.petName}.`, 'hanger', c.price ? { amt: -c.price } : {});
    this.equip(id);
    return true;
  }

  equip(id) {
    const c = COSMETICS.find((x) => x.id === id);
    if (!c || !this.state.owned.includes(id)) return;
    const o = this.state.outfit;
    o[c.slot] = o[c.slot] === id ? null : id;
    this.world.setPet(this.profile.species, o);
    this.emit('outfit');
    this.changed('outfit');
  }

  setProfile(patch) {
    const p = this.profile;
    const before = { species: p.species };
    Object.assign(p, patch);
    if ('species' in patch && patch.species !== before.species) {
      this.world.setPet(p.species, this.state.outfit);
      this.emit('outfit');
    }
    if ('timeMode' in patch) this.world.setTimeMode(p.timeMode);
    if ('demo' in patch || 'demoSpeed' in patch) this.tracker.setDemo(p.demo, p.demoSpeed);
    if ('gps' in patch) { if (p.gps) this.tracker.startGPS(); else { this.tracker.stopGPS(); this.mode = 'virtual'; this.emit('mode', this.mode); } }
    if ('budget' in patch && this.day && this.day.started) {
      const diff = p.budget - this.day.deposit;
      if (diff) {
        this.day.deposit = p.budget;
        this.state.coins += diff;
        const row = this.day.ledger.find((l) => l.kind === 'deposit');
        if (row) row.amt = p.budget;
      }
    }
    this.changed('profile');
  }

  resetAll() {
    storage.clear();
    this.state = defaultState();
    location.reload();
  }

  // ------------------------------------------------------------- mood & chatter
  hearts() {
    const d = this.day;
    if (!d) return 3;
    let h = 2;
    if (d.steps >= this.profile.stepGoal * 0.3) h++;
    if (d.steps >= this.profile.stepGoal) h++;
    if (Date.now() - (d.lastFood || 0) < 5 * 3600 * 1000) h++;
    if (d.pats > 0) h++;
    if (this.state.coins < 0) h--;
    return Math.max(0, Math.min(5, h));
  }

  say(kind) {
    const lines = SPEECH[kind];
    if (lines) this.emit('say', pick(Math.random, lines));
  }

  chatter() {
    const d = this.day;
    if (!d || !this.state.onboarded) return;
    if (this.world.phase === 'night' && performance.now() - this.lastStepAt > 25000) return this.say('night');
    if (this.state.coins < 150) return this.say('lowCoins');
    if (Date.now() - (d.lastFood || 0) > 4 * 3600 * 1000 && Math.random() < 0.4) return this.say('hungry');
    if (performance.now() - this.lastStepAt < 3000) return this.say('walking');
    this.say('idle');
  }

  speciesInfo() { return SPECIES[this.profile.species]; }
}
