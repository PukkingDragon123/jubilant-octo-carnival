// UI shell: HUD, map chrome, overlay labels & bubbles, toasts, modals, FX.
import { $, $$, fillIcons, setBar, heartsHtml, icon } from './common.js';
import { stampURL } from './pixel.js';
import { sfx, setSound } from './sfx.js';
import { LANDMARKS, Y0 } from '../world/tokyo.js';
import { PET_HEIGHT } from '../world/pets.js';
import { FOOD_BY_ID, OMIKUJI, LUCKY_COLORS, xpForLevel } from '../game/data.js';
import { fmt, fmtKm, hhmm, esc, jpDate } from '../util.js';
import { Sheets } from './sheets.js';
import { Onboarding } from './onboarding.js';

const LABEL_Y = { tokyotower: 36, skytree: 70, shinjuku: 34, roppongi: 34, shibuya: 30, odaiba: 16, asakusa: 22, imperial: 9, tokyostation: 11, ginza: 14, tsukiji: 9, akihabara: 14, ueno: 10, harajuku: 10 };

export class UI {
  constructor(game, world, tracker) {
    this.game = game;
    this.world = world;
    this.tracker = tracker;
    this.tab = 'map';
    this.labels = new Map();
    this.floats = [];
    this.bubble = null;
    this.bubbleUntil = 0;
    this.lastFloat = 0;
    this.sheets = new Sheets(this);
    this.onboarding = new Onboarding(this);
  }

  init() {
    fillIcons();
    setSound(this.game.profile.sound);
    this.buildLabels();
    this.wire();
    this.refreshPortrait();
    this.renderAll();
    setInterval(() => this.renderClock(), 20000);
    this.renderClock();
    if (!this.game.state.onboarded) this.onboarding.open();
  }

  wire() {
    const g = this.game, w = this.world;
    $$('#nav button').forEach((b) => b.addEventListener('click', () => { sfx.click(); this.openTab(b.dataset.tab); }));
    $('#sheet-close').addEventListener('click', () => { sfx.close(); this.openTab('map'); });
    $('#hud-piggy').addEventListener('click', () => { sfx.open(); this.openTab('piggy'); });
    $('#hud-buddy').addEventListener('click', () => { sfx.open(); this.openTab('buddy'); });
    $('#tool-omikuji').addEventListener('click', () => this.omikujiModal());
    $('#tool-overview').addEventListener('click', () => { sfx.click(); this.overview = !this.overview; if (this.overview) w.overview(); else w.recenter(); });
    $('#tool-recenter').addEventListener('click', () => { sfx.click(); this.overview = false; w.recenter(); });
    $('#today-pill').addEventListener('click', () => { sfx.open(); this.openTab('quests'); });
    $('#dest-chip').addEventListener('click', () => {
      const r = g.remaining();
      const lm = r && LANDMARKS.find((l) => l.id === r.dest);
      if (lm) this.landmarkModal(lm); else w.recenter();
    });
    const walkBtn = $('#demo-walk');
    walkBtn.addEventListener('click', () => {
      sfx.click();
      this.tracker.setDemoWalking(!this.tracker.demo.walking);
      this.renderDemo();
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (!$('#modal').hidden) this.closeModal(); else if (this.tab !== 'map') this.openTab('map'); }
    });

    w.on('follow', (f) => { $('#tool-recenter').hidden = f; if (f) this.overview = false; });
    w.on('landmarkTap', (lm) => { sfx.click(); this.landmarkModal(lm); });
    w.on('groundTap', (pt) => { if (this.tab === 'map' && g.state.onboarded) g.tapGround(pt); });

    g.on('change', (what) => this.onChange(what));
    g.on('coins', ({ amt, reason }) => this.onCoins(amt, reason));
    g.on('toast', ({ text, icon: ic }) => this.toast(text, ic));
    g.on('say', (text) => this.say(text));
    g.on('stamp', (lm) => this.stampModal(lm));
    g.on('levelUp', (lvl) => { sfx.fanfare(); this.confetti(30); this.toast(`Level up! ${g.profile.petName} is now level ${lvl}.`, 'sparkle'); });
    g.on('goal', () => { sfx.fanfare(); this.confetti(40); this.toast(`Step goal reached! ${fmt(g.profile.stepGoal)} steps.`, 'star'); });
    g.on('outfit', () => this.refreshPortrait());
    g.on('hearts', () => this.renderHud());
    g.on('tracker', () => { this.renderDemo(); if (this.tab === 'buddy') this.sheets.render(); });
    g.on('mode', (m) => this.toast(m === 'real' ? 'You’re in Tokyo! Your buddy now follows your real location.' : 'Virtual trip mode: your steps move your buddy across the map.', 'pin'));
    g.on('newday', () => { if (this.tab !== 'map') this.sheets.render(); });
  }

  onChange(what) {
    this.renderHud();
    this.renderDest();
    this.renderToday();
    this.renderBadge();
    if (this.tab !== 'map' && !['steps'].includes(what)) this.sheets.render();
    else if (this.tab !== 'map' && what === 'steps') this.sheets.softUpdate();
  }

  renderAll() {
    this.renderHud();
    this.renderDest();
    this.renderToday();
    this.renderBadge();
    this.renderDemo();
  }

  // ---------------------------------------------------------------- HUD
  refreshPortrait() {
    try { $('#hud-portrait').src = this.world.portrait(96); } catch (e) { console.warn(e); }
  }

  renderHud() {
    const g = this.game, d = g.day;
    if (!d) return;
    $('#hud-name').textContent = g.profile.petName;
    $('#hud-level').textContent = `Lv.${g.level}`;
    $('#hud-hearts').innerHTML = heartsHtml(g.hearts(), 14);
    setBar($('#hud-steps-bar'), d.steps / g.profile.stepGoal, 12);
    $('#hud-steps-label').textContent = `${fmt(d.steps)} / ${fmt(g.profile.stepGoal)} steps`;
    const c = $('#hud-coins');
    const coins = Math.floor(g.coins);
    c.textContent = fmt(coins);
    c.classList.toggle('neg', coins < 0);
    const pig = $('#hud-pig');
    if (!pig.dataset.filled) { pig.innerHTML = icon('pig', 26); pig.dataset.filled = 1; }
  }

  renderClock() {
    const now = new Date();
    const phase = this.world.phase;
    $('#hud-clock').innerHTML = `${icon(phase === 'night' ? 'moon' : 'sun', 12)} ${hhmm(now)}`;
  }

  renderBadge() {
    const n = this.game.questsReady();
    const b = $('#badge-quests');
    b.hidden = !n;
    b.textContent = n;
  }

  renderDest() {
    const chip = $('#dest-chip');
    const g = this.game;
    const r = g.remaining();
    if (!r || !g.state.onboarded || this.tab !== 'map') { chip.hidden = true; return; }
    const lm = LANDMARKS.find((l) => l.id === r.dest);
    if (g.mode === 'real') {
      chip.hidden = false;
      chip.innerHTML = `${icon('pin', 22)}<span class="dc-main"><b>Live in Tokyo</b><small>Near ${esc(g.placeName())} · GPS ±${Math.round(this.tracker.gps.accuracy || 0)} m</small></span>`;
      return;
    }
    chip.hidden = false;
    const name = lm ? `${lm.name} ${lm.jp}` : 'Custom spot';
    const done = r.units < 0.05;
    chip.innerHTML = `${icon(lm ? lm.icon : 'pin', 22)}<span class="dc-main"><b>${done ? 'Arrived · ' : '→ '}${esc(name)}</b><small>${done ? 'Choosing the next stop…' : `${fmt(r.steps)} steps · ${fmtKm(r.meters)} to go`}</small></span>`;
  }

  renderToday() {
    const pill = $('#today-pill');
    const g = this.game, d = g.day;
    if (!d || !d.picks || !g.state.onboarded || this.tab !== 'map') { pill.hidden = true; return; }
    pill.hidden = false;
    const ready = g.questsReady();
    if (ready) {
      pill.innerHTML = `${icon('gift', 24)}<span class="tp-text"><span class="tp-label">Rewards ready</span>${ready} quest${ready > 1 ? 's' : ''} to claim</span>`;
    } else if (!d.missionDone) {
      pill.innerHTML = `${icon('star', 24)}<span class="tp-text"><span class="tp-label">Today’s mission</span>${esc(d.picks.mission)}</span>`;
    } else {
      const f = FOOD_BY_ID[d.picks.treat];
      pill.innerHTML = `${icon(f.id, 26)}<span class="tp-text"><span class="tp-label">Treat of the day</span>${esc(f.name)}</span>`;
    }
  }

  renderDemo() {
    const t = this.tracker;
    const btn = $('#demo-walk');
    btn.hidden = !t.demo.on || this.tab !== 'map' || !this.game.state.onboarded;
    btn.classList.toggle('on', t.demo.walking);
    $('#demo-walk-label').textContent = t.demo.walking ? 'Walking… tap to stop' : 'Demo walk';
  }

  // ---------------------------------------------------------------- tabs & sheets
  openTab(tab) {
    if (tab === this.tab && tab !== 'map') tab = 'map';
    const prev = this.tab;
    this.tab = tab;
    $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (tab === 'piggy' ? 'map' : tab)));
    const sheet = $('#sheet');
    if (tab === 'map') {
      sheet.hidden = true;
      document.body.classList.remove('sheet-open');
    } else {
      sheet.hidden = false;
      document.body.classList.add('sheet-open');
      sheet.classList.toggle('half', tab === 'buddy');
      this.sheets.open(tab);
    }
    if (prev === 'buddy' && tab !== 'buddy') this.world.setCloseup(false);
    if (tab === 'buddy') this.world.setCloseup(true);
    $('#map-tools').hidden = tab !== 'map' && window.innerWidth < 900;
    this.renderDest();
    this.renderToday();
    this.renderDemo();
  }

  // ---------------------------------------------------------------- overlay
  buildLabels() {
    const ov = $('#overlay');
    for (const l of LANDMARKS) {
      const el = document.createElement('div');
      el.className = 'lm-label';
      ov.appendChild(el);
      this.labels.set(l.id, el);
    }
    this.renderLabels();
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    this.bubble.hidden = true;
    ov.appendChild(this.bubble);
  }

  renderLabels() {
    const g = this.game;
    for (const l of LANDMARKS) {
      const el = this.labels.get(l.id);
      const stamped = !!g.state.stamps[l.id];
      el.innerHTML = `${icon(l.icon, 14)}<span>${l.jp}</span><small>${l.name}</small>${stamped ? icon('check', 12) : ''}`;
    }
  }

  frame() {
    const w = this.world;
    const dist = w.rig.dist;
    const dest = this.game.state.dest;
    for (const l of LANDMARKS) {
      const el = this.labels.get(l.id);
      const p = w.project(l.x, Y0 + (LABEL_Y[l.id] || 12), l.z);
      const vis = p && p.x > -60 && p.y > -30 && p.x < innerWidth + 60 && p.y < innerHeight + 30;
      if (!vis) { if (!el.classList.contains('far')) el.classList.add('far'); continue; }
      el.classList.remove('far');
      el.classList.toggle('compact', dist > 110 && l.id !== dest);
      el.classList.toggle('dest', l.id === dest);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.zIndex = String(1000 - Math.round(p.depth * 1000));
    }
    const pp = w.pet.root.position;
    const head = w.project(pp.x, pp.y + PET_HEIGHT + 0.7, pp.z);
    this.headPos = head;
    if (this.bubble && !this.bubble.hidden) {
      if (performance.now() > this.bubbleUntil || !head) this.bubble.hidden = true;
      else this.bubble.style.transform = `translate(${head.x.toFixed(1)}px, ${(head.y - 8).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  say(text) {
    if (!this.bubble || this.tab === 'buddy' && false) return;
    this.bubble.textContent = text;
    this.bubble.hidden = false;
    this.bubbleUntil = performance.now() + 3600;
  }

  floatNum(amt, ic = 'coin') {
    const head = this.headPos;
    if (!head) return;
    const el = document.createElement('div');
    el.className = 'float-num' + (amt < 0 ? ' minus' : '');
    el.innerHTML = `${icon(ic, 16)}${amt > 0 ? '+' : ''}${fmt(amt)}`;
    el.style.transform = `translate(${head.x + (Math.random() * 30 - 15)}px, ${head.y - 30}px) translate(-50%, 0)`;
    $('#overlay').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  onCoins(amt, reason) {
    const pig = $('#hud-pig');
    pig.classList.remove('bump'); void pig.offsetWidth; pig.classList.add('bump');
    if (reason === 'walk') {
      const now = performance.now();
      if (now - this.lastFloat > 900) { this.lastFloat = now; this.floatNum(amt); sfx.coin(); }
    } else if (amt < 0) {
      this.floatNum(amt, 'flame');
      sfx.spend();
    } else {
      this.floatNum(amt);
      sfx.claim();
    }
  }

  // ---------------------------------------------------------------- toasts
  toast(text, ic = 'sparkle') {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast panel-light';
    el.innerHTML = `${icon(ic, 20)}<span>${esc(text)}</span>`;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
  }

  // ---------------------------------------------------------------- modals
  modal(html, mount) {
    const m = $('#modal');
    const card = $('#modal-card');
    card.innerHTML = html;
    fillIcons(card);
    m.hidden = false;
    if (mount) mount(card);
    const first = card.querySelector('button.btn');
    if (first) first.focus({ preventScroll: true });
  }

  closeModal() {
    $('#modal').hidden = true;
    $('#modal-card').innerHTML = '';
    if (this.afterModal) { const f = this.afterModal; this.afterModal = null; f(); }
  }

  confirm({ title, jp = '', body, ok = 'OK', okClass = 'green', cancel = 'Cancel', heroIcon = null, onOk }) {
    this.modal(`
      <div class="m-head">${heroIcon ? icon(heroIcon, 56) : ''}<div><h2>${title}</h2>${jp ? `<div class="m-jp">${jp}</div>` : ''}</div></div>
      <p>${body}</p>
      <div class="modal-actions">
        <button class="btn gray" data-act="cancel"><span>${cancel}</span></button>
        <button class="btn ${okClass}" data-act="ok"><span>${ok}</span></button>
      </div>`, (card) => {
      card.querySelector('[data-act=cancel]').onclick = () => { sfx.close(); this.closeModal(); };
      card.querySelector('[data-act=ok]').onclick = () => { this.closeModal(); onOk && onOk(); };
    });
  }

  landmarkModal(lm) {
    const g = this.game;
    const st = g.state.stamps[lm.id];
    const food = Object.values(FOOD_BY_ID).find((f) => f.spot === lm.id);
    const pts = g.pf.find(g.visualPos(), g.entries[lm.id]);
    let stepsAway = null;
    if (pts) {
      let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      stepsAway = Math.round((L * 78) / g.profile.strideM);
    }
    const isDest = g.state.dest === lm.id;
    const here = g.nearbyLandmark() === lm;
    this.modal(`
      <div class="m-head">
        ${st ? `<img src="${stampURL(lm, jpDate(st.day))}" width="84" height="84" alt="${lm.name} stamp">` : icon(lm.icon, 56)}
        <div><h2>${lm.name}</h2><div class="m-jp">${lm.jp}</div></div>
      </div>
      <p>${esc(lm.fact)}</p>
      ${food ? `<div class="card pick"><span class="pk-ico">${icon(food.id, 34)}</span><div><b>Local special</b><p>${esc(food.name)} ${food.jp} · ${food.kcal} kcal. Eat it here for a +25 bonus.</p></div></div>` : ''}
      <p class="note">${here ? 'You’re here now!' : stepsAway !== null ? `About ${fmt(stepsAway)} steps (${fmtKm(stepsAway * g.profile.strideM)}) away.` : ''} ${st ? 'Stamp collected.' : 'Stamp not collected yet.'}</p>
      <div class="modal-actions">
        <button class="btn gray" data-act="close"><span>Close</span></button>
        ${here ? '<button class="btn pink" data-act="eat"><span>Snack here</span></button>' : `<button class="btn pink" data-act="go" ${isDest ? 'disabled' : ''}><span>${isDest ? 'Heading here' : 'Walk here'}</span></button>`}
      </div>`, (card) => {
      card.querySelector('[data-act=close]').onclick = () => { sfx.close(); this.closeModal(); };
      const go = card.querySelector('[data-act=go]');
      if (go) go.onclick = () => { sfx.click(); this.closeModal(); g.setDestination(lm.id); this.world.recenter(); };
      const eat = card.querySelector('[data-act=eat]');
      if (eat) eat.onclick = () => { this.closeModal(); this.openTab('shop'); };
    });
  }

  foodModal(food) {
    const g = this.game;
    const after = Math.floor(g.coins - food.kcal);
    const here = g.nearbyLandmark();
    const local = food.spot && here && here.id === food.spot;
    this.confirm({
      title: food.name, jp: food.jp || '', heroIcon: FOOD_BY_ID[food.id] ? food.id : 'bowl',
      body: `${food.kcal ? `Spend <b>${fmt(food.kcal)} kcal</b> from the piggy bank. It will have <b>${fmt(after)} kcal</b> left.` : 'Free! Zero calories.'}${local ? ' <b>Local special bonus +25!</b>' : ''} This gets written in today’s diary.`,
      ok: 'Itadakimasu!', okClass: 'pink',
      onOk: () => g.eat(food),
    });
  }

  omikujiModal() {
    const g = this.game, d = g.day;
    if (!g.state.onboarded) return;
    sfx.open();
    if (d.omikuji) { this.showSlip(d.omikuji); return; }
    this.modal(`
      <h2>Omikuji</h2><div class="m-jp">おみくじ · today’s fortune</div>
      <div class="omikuji-box" id="ob"><span class="ob">${icon('omikuji', 96)}</span></div>
      <p>Shake the box to draw today’s fortune. One draw per day, with a lucky bonus for the piggy bank.</p>
      <div class="modal-actions"><button class="btn red big" data-act="draw"><span>Shake!</span></button></div>`, (card) => {
      card.querySelector('[data-act=draw]').onclick = (e) => {
        e.currentTarget.disabled = true;
        $('#ob', card).classList.add('shake');
        sfx.shake();
        setTimeout(() => { const res = g.drawOmikuji(); this.showSlip(res, true); }, 1100);
      };
    });
  }

  showSlip(res, fresh = false) {
    const o = OMIKUJI[res.idx];
    const f = FOOD_BY_ID[res.food];
    const lm = LANDMARKS.find((l) => l.id === res.spot);
    const col = LUCKY_COLORS[res.color];
    if (fresh) { sfx.fanfare(); if (res.idx <= 1) this.confetti(50); }
    this.modal(`
      <h2>No.${res.no} · ${o.en}</h2><div class="m-jp">${o.kana}</div>
      <div class="slip" style="margin-top:10px">
        <div class="rank-v">${o.rank}</div>
        <div>
          <p style="margin-top:0">${esc(res.line)}</p>
          <dl>
            <dt>Lucky food</dt><dd>${icon(f.id, 22)} ${esc(f.name)}</dd>
            <dt>Lucky spot</dt><dd>${icon(lm.icon, 18)} ${esc(lm.name)} ${lm.jp}</dd>
            <dt>Lucky colour</dt><dd><span class="swatch" style="background:${col.hex}"></span>${col.name}</dd>
            <dt>Bonus</dt><dd>${icon('coin', 16)} +${res.bonus} kcal</dd>
          </dl>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn gray" data-act="close"><span>Close</span></button>
        <button class="btn pink" data-act="go"><span>Walk to ${esc(lm.name)}</span></button>
      </div>`, (card) => {
      card.querySelector('[data-act=close]').onclick = () => { sfx.close(); this.closeModal(); };
      card.querySelector('[data-act=go]').onclick = () => { this.closeModal(); this.game.setDestination(lm.id); this.world.recenter(); };
    });
  }

  stampModal(lm) {
    sfx.stamp();
    this.renderLabels();
    setTimeout(() => { sfx.fanfare(); this.confetti(60); }, 250);
    const n = Object.keys(this.game.state.stamps).length;
    const show = () => this.modal(`
      <div class="m-hero"><img src="${stampURL(lm, jpDate(this.game.day.key))}" width="180" height="180" alt="${lm.name} stamp" style="animation: pop .5s cubic-bezier(.2,1.6,.4,1)"></div>
      <h2 style="text-align:center">New stamp: ${lm.name}</h2>
      <div class="m-jp" style="text-align:center">${lm.jp} · ${n} / ${LANDMARKS.length} collected</div>
      <p>${esc(lm.fact)}</p>
      <div class="modal-actions"><button class="btn green big" data-act="ok"><span>Sugoi!</span></button></div>`, (card) => {
      card.querySelector('[data-act=ok]').onclick = () => { sfx.click(); this.closeModal(); };
    });
    if (!$('#modal').hidden) this.afterModal = show; else show();
  }

  // ---------------------------------------------------------------- FX
  confetti(n = 40) {
    const fx = $('#fx');
    const cols = ['#ff7fae', '#ffd23f', '#78c95c', '#4fa8ff', '#a98bff', '#ffffff'];
    const cx = innerWidth / 2, cy = innerHeight * 0.4;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'confetti';
      el.style.left = `${cx}px`; el.style.top = `${cy}px`;
      el.style.background = cols[i % cols.length];
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 220;
      el.style.setProperty('--dx', `${Math.cos(a) * r}px`);
      el.style.setProperty('--dy', `${Math.sin(a) * r + 140}px`);
      el.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      fx.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
  }

  coinBurst(fromEl, n = 8) {
    const fx = $('#fx');
    const to = $('#hud-pig').getBoundingClientRect();
    const from = fromEl.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'coin-fly';
      el.innerHTML = icon('coin', 22);
      const x = from.left + from.width / 2 + (Math.random() * 40 - 20);
      const y = from.top + from.height / 2 + (Math.random() * 20 - 10);
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      el.style.setProperty('--dx', `${to.left + to.width / 2 - x}px`);
      el.style.setProperty('--dy', `${to.top + to.height / 2 - y}px`);
      el.style.animationDelay = `${i * 0.05}s`;
      fx.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  }

  xpInfo() {
    const g = this.game;
    const lvl = g.level;
    const a = xpForLevel(lvl), b = xpForLevel(lvl + 1);
    return { lvl, cur: g.state.xp - a, need: b - a, p: (g.state.xp - a) / (b - a) };
  }
}
