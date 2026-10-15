// Bottom sheets: Quests, Konbini (snacks), Diary, Buddy and the Piggy Bank.
import { $, fillIcons, segBar, icon } from './common.js';
import { stampURL } from './pixel.js';
import { sfx, setSound } from './sfx.js';
import { FOODS, FOOD_BY_ID, OMIKUJI } from '../game/data.js';
import { questProgress, questDone } from '../game/quests.js';
import { writeSummary, timeline } from '../game/diary.js';
import { LANDMARKS } from '../world/tokyo.js';
import { SPECIES, COSMETICS } from '../world/pets.js';
import { fmt, fmtKm, hhmm, esc, jpDate, enDate } from '../util.js';

const LM = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));

export class Sheets {
  constructor(ui) {
    this.ui = ui;
    this.sub = { shop: 'snack', diary: 'page', buddy: 'buddy' };
    this.diaryDay = null;
    this.lastSoft = 0;
    $('#sheet-body').addEventListener('click', (e) => this.onClick(e));
    $('#sheet-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sub]');
      if (!b) return;
      sfx.click();
      this.sub[this.tab] = b.dataset.sub;
      this.render(true);
    });
  }

  get game() { return this.ui.game; }

  open(tab) {
    this.tab = tab;
    if (tab === 'diary') this.diaryDay = this.game.state.today;
    this.render(true);
  }

  softUpdate() {
    const now = performance.now();
    if (now - this.lastSoft < 1200) return;
    this.lastSoft = now;
    this.render();
  }

  render(resetScroll = false) {
    const body = $('#sheet-body');
    const keep = body.scrollTop;
    const fn = { quests: this.quests, shop: this.shop, diary: this.diary, buddy: this.buddy, piggy: this.piggy }[this.tab];
    if (!fn) return;
    const { title, sub, tabs, html, after } = fn.call(this);
    $('#sheet-title').textContent = title;
    $('#sheet-sub').innerHTML = sub || '';
    $('#sheet-tabs').innerHTML = (tabs || []).map(([id, label]) => `<button class="tab ${this.sub[this.tab] === id ? 'on' : ''}" data-sub="${id}">${label}</button>`).join('');
    body.innerHTML = html;
    fillIcons(body);
    fillIcons($('#sheet-sub'));
    body.scrollTop = resetScroll ? 0 : keep;
    if (after) after(body);
  }

  // ------------------------------------------------------------------ Quests
  quests() {
    const g = this.game, d = g.day;
    const p = d.picks;
    const spot = LM[p.spot];
    const treat = FOOD_BY_ID[p.treat];
    const omi = d.omikuji ? OMIKUJI[d.omikuji.idx] : null;
    const claimed = d.quests.filter((q) => q.claimed).length;
    const stamps = Object.keys(g.state.stamps).length;
    const html = `
      <div class="section-title"><span>Today in Tokyo</span><span class="jp">今日のおすすめ</span></div>
      <div class="card omikuji-mini">
        ${omi ? `<span class="rank">${omi.rank}</span><div style="flex:1;min-width:0"><b>${omi.en}</b><p class="note" style="margin:2px 0 0">${esc(d.omikuji.line)}</p></div>
          <button class="btn red" data-act="omikuji"><span>View</span></button>`
        : `${icon('omikuji', 40)}<div style="flex:1;min-width:0"><b>Omikuji おみくじ</b><p class="note" style="margin:2px 0 0">Draw today’s fortune for a lucky bonus.</p></div>
          <button class="btn red" data-act="omikuji"><span>Draw</span></button>`}
      </div>
      <div class="today-grid" style="margin-top:12px">
        <div class="card pick"><span class="pk-ico">${icon(spot.icon, 28)}</span><div><b>Spot of the day</b><p>${spot.name} ${spot.jp}</p></div>
          <button class="btn pink" data-act="go" data-id="${spot.id}"><span>Go</span></button></div>
        <div class="card pick"><span class="pk-ico">${icon(treat.id, 34)}</span><div><b>Treat of the day</b><p>${treat.name} · ${treat.kcal} kcal</p></div>
          <button class="btn gold" data-act="eat" data-id="${treat.id}"><span>Eat</span></button></div>
        <div class="card pick"><span class="pk-ico">${icon('star', 28)}</span><div><b>Mini mission</b><p>${esc(p.mission)}</p></div>
          ${d.missionDone ? `<span class="stamp-done">${icon('check', 14)} +20</span>` : '<button class="btn green" data-act="mission"><span>Done!</span></button>'}</div>
      </div>
      <div class="section-title"><span>Daily quests</span><span class="jp">${claimed}/${d.quests.length} claimed</span></div>
      <div class="list">
        ${d.quests.map((q) => {
          const cur = Math.min(q.target, questProgress(q, d));
          const done = questDone(q, d);
          return `<div class="card quest ${q.claimed ? 'done' : ''}">
            <span class="q-ico">${icon(q.icon, 24)}</span>
            <div style="min-width:0">
              <h3>${esc(q.title)}</h3>
              <div class="q-meta"><span class="reward">${icon('coin', 14)} +${q.reward}</span><span>${fmt(cur)} / ${fmt(q.target)}</span></div>
              ${segBar(cur / q.target, 10, done ? 'seg-gold' : 'seg-green')}
            </div>
            ${q.claimed ? `<span class="stamp-done">${icon('check', 16)}</span>` : done ? `<button class="btn gold" data-act="claim" data-id="${q.id}"><span>Claim</span></button>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="section-title"><span>Stamp rally</span><span class="jp">スタンプラリー</span></div>
      <div class="card">
        <div class="q-meta" style="justify-content:space-between;margin-bottom:6px;font:600 14px var(--font-display)"><span>${stamps} / ${LANDMARKS.length} station stamps</span><span>${stamps === LANDMARKS.length ? 'Complete!' : 'Crown at 14'}</span></div>
        ${segBar(stamps / LANDMARKS.length, 14, 'seg-pink')}
        <button class="btn sky wide" style="margin-top:10px" data-act="stampbook"><span>Open stamp book</span></button>
      </div>`;
    return { title: 'Quests', sub: `クエスト · ${enDate(d.key)}`, html };
  }

  // ------------------------------------------------------------------ Shop
  shop() {
    const g = this.game, d = g.day;
    const cat = this.sub.shop;
    const here = g.nearbyLandmark();
    const tabs = [['snack', 'Snacks'], ['meal', 'Meals'], ['drink', 'Drinks'], ['custom', 'My own']];
    let grid;
    if (cat === 'custom') {
      grid = `
        <form class="card" id="custom-form">
          <p class="note" style="margin:0 0 10px">Ate something that isn’t on the menu? Log it here.</p>
          <div class="form-row">
            <div class="field"><label for="cf-name">Food</label><input id="cf-name" maxlength="40" placeholder="e.g. Katsu sando" required></div>
            <div class="field"><label for="cf-kcal">kcal</label><input id="cf-kcal" type="number" inputmode="numeric" min="0" max="5000" placeholder="350" required></div>
          </div>
          <button class="btn pink wide" style="margin-top:10px" type="submit"><span>Log it</span></button>
        </form>`;
    } else {
      const items = FOODS.filter((f) => f.cat === cat).sort((a, b) => (b.spot === here?.id) - (a.spot === here?.id));
      grid = `<div class="shop-grid">${items.map((f) => `
        <button class="food" data-act="food" data-id="${f.id}">
          ${f.spot ? `<span class="spot" ${here && here.id === f.spot ? 'style="background:var(--matcha)"' : ''}>${LM[f.spot].name}</span>` : ''}
          <span class="f-ico">${icon(f.id, 48)}</span>
          <span class="f-name">${f.name}</span>
          <span class="f-jp">${f.jp}</span>
          <span class="price">${icon('flame', 14)} ${fmt(f.kcal)}</span>
        </button>`).join('')}</div>`;
    }
    const eaten = d.foods.slice().reverse();
    const html = `
      ${here ? `<div class="card pick" style="margin-bottom:12px"><span class="pk-ico">${icon(here.icon, 26)}</span><div><b>You’re in ${here.name}</b><p>Local specials here earn a +25 bonus.</p></div></div>` : ''}
      ${grid}
      <div class="section-title"><span>Eaten today</span><span class="jp">${fmt(d.eaten)} kcal</span></div>
      ${eaten.length ? `<div class="card ledger">${eaten.map((f) => `
        <div class="ledger-row"><span>${icon(FOOD_BY_ID[f.id] ? f.id : 'bowl', 24)}</span>
          <span>${esc(f.name)}<small>${hhmm(f.t)}${f.place ? ` · ${LM[f.place].name}` : ''}</small></span>
          <span style="display:flex;gap:8px;align-items:center"><span class="amt minus">−${fmt(f.kcal)}</span><button class="btn gray icon-btn" style="min-height:36px;min-width:36px" data-act="undo" data-t="${f.t}" aria-label="Remove ${esc(f.name)}"><span>${icon('close', 12)}</span></button></span>
        </div>`).join('')}</div>` : '<p class="note">Nothing logged yet. Tap a snack when you eat it and the piggy bank pays for it.</p>'}`;
    return {
      title: 'Konbini',
      sub: `コンビニ · Piggy has ${icon('coin', 14)} <b>${fmt(Math.floor(g.coins))}</b> kcal`,
      tabs, html,
      after: (body) => {
        const f = body.querySelector('#custom-form');
        if (f) f.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = f.querySelector('#cf-name').value.trim() || 'Snack';
          const kcal = Math.max(0, Math.min(5000, Math.round(+f.querySelector('#cf-kcal').value || 0)));
          this.ui.foodModal({ id: 'custom', name, kcal, jp: '' });
        });
      },
    };
  }

  // ------------------------------------------------------------------ Diary
  diary() {
    const g = this.game;
    const tabs = [['page', 'Today’s page'], ['stamps', 'Stamp book']];
    if (this.sub.diary === 'stamps') {
      const n = Object.keys(g.state.stamps).length;
      const html = `
        <p class="note" style="margin-top:0">Walk to each district to press its eki stamp. ${n} of ${LANDMARKS.length} collected.</p>
        <div class="stamp-grid">${LANDMARKS.map((l) => {
          const s = g.state.stamps[l.id];
          return s ? `<figure class="stamp-slot" data-act="lm" data-id="${l.id}" style="margin:0"><img src="${stampURL(l, jpDate(s.day))}" alt="${l.name} stamp"><figcaption>${l.name}</figcaption></figure>`
            : `<figure class="stamp-slot empty" data-act="lm" data-id="${l.id}" style="margin:0"><span>?<br>${l.jp}</span><figcaption>${l.name}</figcaption></figure>`;
        }).join('')}</div>`;
      return { title: 'Diary', sub: '旅日記 · travel journal', tabs, html };
    }
    const keys = Object.keys(g.state.days).sort();
    const key = this.diaryDay && g.state.days[this.diaryDay] ? this.diaryDay : g.state.today;
    const d = g.state.days[key];
    const i = keys.indexOf(key);
    const prev = keys[i - 1], next = keys[i + 1];
    const dayStamps = Object.entries(g.state.stamps).filter(([, s]) => s.day === key).map(([id]) => LM[id]);
    const rows = timeline(d);
    const html = `
      <div class="day-nav">
        <button class="btn cream icon-btn" data-act="day" data-key="${prev || ''}" ${prev ? '' : 'disabled'} aria-label="Previous day"><span>${icon('left', 14, { outline: null, tint: '#2a2140' })}</span></button>
        <span class="dn-label">${key === g.state.today ? 'Today' : enDate(key)}<br>${i + 1} / ${keys.length} days</span>
        <button class="btn cream icon-btn" data-act="day" data-key="${next || ''}" ${next ? '' : 'disabled'} aria-label="Next day"><span>${icon('right', 14, { outline: null, tint: '#2a2140' })}</span></button>
      </div>
      <article class="diary-page">
        <div class="diary-date"><h3>${jpDate(key)}</h3><span>${enDate(key)}</span></div>
        ${dayStamps.length ? `<div class="mini-stamps">${dayStamps.map((l) => `<img src="${stampURL(l, jpDate(key))}" alt="${l.name} stamp">`).join('')}</div>` : ''}
        <p class="diary-text">${esc(writeSummary(d, g.state))}</p>
        <div class="kv" style="margin:6px 0 12px">
          <div><b>${fmt(d.steps)}</b><span>steps</span></div>
          <div><b>${fmtKm(d.meters)}</b><span>walked</span></div>
          <div><b>+${fmt(d.burned)}</b><span>kcal burned</span></div>
          <div><b>−${fmt(d.eaten)}</b><span>kcal eaten</span></div>
        </div>
        <div class="timeline">${rows.length ? rows.map((e) => `
          <div class="tl-row"><time>${hhmm(e.t)}</time><span>${icon(e.icon || 'sparkle', 20)}</span><span>${esc(e.text)}</span>${e.amt ? `<span class="amt ${e.amt > 0 ? 'plus' : 'minus'}">${e.amt > 0 ? '+' : '−'}${fmt(Math.abs(e.amt))}</span>` : '<span></span>'}</div>`).join('')
          : '<p class="note">The diary fills itself in as you walk, visit places and eat.</p>'}</div>
      </article>`;
    return { title: 'Diary', sub: '旅日記 · written automatically', tabs, html };
  }

  // ------------------------------------------------------------------ Buddy
  buddy() {
    const g = this.game, p = g.profile, ui = this.ui, w = ui.world;
    const xp = ui.xpInfo();
    const tabs = [['buddy', 'Buddy'], ['wardrobe', 'Wardrobe'], ['settings', 'Settings']];
    const sub = `Lv.${xp.lvl} · ${fmt(xp.cur)} / ${fmt(xp.need)} XP to next level`;
    const view = this.sub.buddy;
    if (view === 'wardrobe') {
      const nStamps = Object.keys(g.state.stamps).length;
      const html = `
        <p class="note" style="margin-top:0">Outfits cost saved-up calories from the piggy bank. Tap an owned item to wear it or take it off.</p>
        <div class="shop-grid">${COSMETICS.map((c) => {
          const owned = g.state.owned.includes(c.id);
          const worn = g.state.outfit[c.slot] === c.id;
          const locked = c.stamps ? nStamps < c.stamps : false;
          return `<button class="food ${owned ? (worn ? 'owned worn' : 'owned') : ''} ${locked ? 'locked' : ''}" data-act="${owned ? 'equip' : 'buy'}" data-id="${c.id}">
            <span class="f-ico"><img class="px" src="${w.portraitFor(p.species, { [c.slot]: c.id }, 72)}" width="64" height="64" alt=""></span>
            <span class="f-name">${c.name}</span><span class="f-jp">${c.jp}</span>
            ${owned ? `<span class="price" style="background:#e3f6da;box-shadow:0 0 0 2px #78c95c;color:#2f7a2a">${worn ? 'Wearing' : 'Wear'}</span>`
              : c.stamps ? `<span class="price">${icon('stamp', 14)} ${nStamps}/${c.stamps}</span>`
              : `<span class="price">${icon('coin', 14)} ${fmt(c.price)}</span>`}
          </button>`;
        }).join('')}</div>`;
      return { title: p.petName, sub, tabs, html };
    }
    if (view === 'settings') return { title: p.petName, sub, tabs, html: this.settingsHtml(), after: (b) => this.wireSettings(b) };
    const L = g.state.lifetime;
    const html = `
      <div class="field" style="margin-bottom:10px"><label for="bd-name">Buddy name</label><input id="bd-name" maxlength="16" value="${esc(p.petName)}"></div>
      <div class="species-row">${Object.entries(SPECIES).map(([id, s]) => `
        <button class="species ${id === p.species ? 'on' : ''}" data-act="species" data-id="${id}">
          <img src="${w.portraitFor(id, g.state.outfit, 72)}" alt="">
          <span>${s.jp}</span><span style="font:600 11px var(--font-display);color:var(--text-soft)">${s.name}</span>
        </button>`).join('')}</div>
      <div class="section-title"><span>Adventures so far</span><span class="jp">記録</span></div>
      <div class="stats kv">
        <div><b>${fmt(L.steps)}</b><span>steps total</span></div>
        <div><b>${fmtKm(L.meters)}</b><span>walked</span></div>
        <div><b>${Object.keys(g.state.stamps).length}/${LANDMARKS.length}</b><span>stamps</span></div>
        <div><b>${fmt(L.days)}</b><span>days together</span></div>
      </div>
      <p class="note">Tip: tap ${esc(p.petName)} on the map for head pats.</p>`;
    return {
      title: p.petName, sub, tabs, html,
      after: (b) => {
        const inp = b.querySelector('#bd-name');
        inp.addEventListener('change', () => {
          const v = inp.value.trim().slice(0, 16);
          if (v) { g.setProfile({ petName: v }); this.ui.renderHud(); }
        });
      },
    };
  }

  settingsHtml() {
    const g = this.game, p = g.profile, t = this.ui.tracker;
    const gpsState = { off: ['', 'Off'], asking: ['warn', 'Waiting for permission…'], on: ['on', t.gps.inTokyo ? 'On · in Tokyo' : 'On · virtual trip'], denied: ['err', 'Permission denied in browser settings'], error: ['err', 'No signal yet'], unsupported: ['err', 'Not supported here'] }[t.gps.state] || ['', t.gps.state];
    const motionState = { off: ['', 'Off'], listening: ['warn', 'Listening…'], on: ['on', 'Counting steps'], denied: ['err', 'Permission denied'], unsupported: ['err', 'No motion sensor'], nosensor: ['err', 'No motion sensor found'] }[t.motion.state] || ['', t.motion.state];
    const seg = (name, val, opts) => `<div class="seg-control">${opts.map(([v, l]) => `<button data-act="set" data-k="${name}" data-v="${v}" class="${String(val) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    return `
      <div class="section-title"><span>Tracking</span><span class="jp">記録の方法</span></div>
      <div class="card">
        <div class="setting"><div class="s-text"><b>Location (GPS)</b><small><span class="status-dot ${gpsState[0]}"></span>${gpsState[1]}. In Tokyo your buddy follows you live; elsewhere it’s a virtual trip.</small></div>
          <div class="s-ctl"><button class="toggle" data-act="toggle" data-k="gps" aria-pressed="${p.gps}" aria-label="Location"></button></div></div>
        <div class="setting"><div class="s-text"><b>Step counter</b><small><span class="status-dot ${motionState[0]}"></span>${motionState[1]}. Uses the phone’s motion sensor while the app is open.</small></div>
          <div class="s-ctl"><button class="btn green" style="min-height:38px" data-act="motion" ${t.motion.state === 'on' ? 'disabled' : ''}><span>${t.motion.state === 'on' ? 'On' : 'Enable'}</span></button></div></div>
        <div class="setting"><div class="s-text"><b>Demo walk</b><small>Simulated steps for trying Tokotoko on a desktop. Speed:</small>
          <div style="margin-top:6px">${seg('demoSpeed', p.demoSpeed, [[5, '×5'], [15, '×15'], [40, '×40'], [100, '×100']])}</div></div>
          <div class="s-ctl"><button class="toggle" data-act="toggle" data-k="demo" aria-pressed="${p.demo}" aria-label="Demo walk"></button></div></div>
        <div class="setting"><div class="s-text"><b>Sync steps</b><small>Add steps counted by your phone’s health app while Tokotoko was closed.</small></div>
          <div class="s-ctl field"><input id="sync-steps" type="number" inputmode="numeric" min="0" max="60000" placeholder="2500" aria-label="Steps to add"><button class="btn sky" style="min-height:44px" data-act="sync"><span>Add</span></button></div></div>
      </div>
      <div class="section-title"><span>You</span><span class="jp">プロフィール</span></div>
      <div class="card">
        <div class="setting"><div class="s-text"><b>Daily piggy allowance</b><small>kcal deposited each morning (your eating budget).</small></div><div class="s-ctl field"><input data-num="budget" type="number" inputmode="numeric" min="800" max="5000" value="${p.budget}" aria-label="Daily allowance"></div></div>
        <div class="setting"><div class="s-text"><b>Step goal</b><small>Fills the green bar in the HUD.</small></div><div class="s-ctl field"><input data-num="stepGoal" type="number" inputmode="numeric" min="1000" max="40000" step="500" value="${p.stepGoal}" aria-label="Step goal"></div></div>
        <div class="setting"><div class="s-text"><b>Body weight (kg)</b><small>Used to estimate kcal per step (${(g.kcalPerStep * 1000).toFixed(0)} kcal per 1,000 steps).</small></div><div class="s-ctl field"><input data-num="weightKg" type="number" inputmode="decimal" min="25" max="250" value="${p.weightKg}" aria-label="Body weight"></div></div>
        <div class="setting"><div class="s-text"><b>Stride length (cm)</b><small>Converts steps to distance.</small></div><div class="s-ctl field"><input data-num="strideCm" type="number" inputmode="numeric" min="30" max="120" value="${Math.round(p.strideM * 100)}" aria-label="Stride length"></div></div>
      </div>
      <div class="section-title"><span>World</span><span class="jp">設定</span></div>
      <div class="card">
        <div class="setting"><div class="s-text"><b>Time of day</b><small>Auto follows your clock. Night lights up the city.</small>
          <div style="margin-top:6px">${seg('timeMode', p.timeMode, [['auto', 'Auto'], ['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']])}</div></div></div>
        <div class="setting"><div class="s-text"><b>Sound effects</b><small>Chiptune blips and fanfares.</small></div><div class="s-ctl"><button class="toggle" data-act="toggle" data-k="sound" aria-pressed="${p.sound}" aria-label="Sound"></button></div></div>
        <div class="setting"><div class="s-text"><b class="danger">Start over</b><small>Erase the diary, stamps, piggy bank and buddy on this device.</small></div><div class="s-ctl"><button class="btn red" style="min-height:38px" data-act="reset"><span>Reset</span></button></div></div>
      </div>
      <p class="note">Everything is stored on this device only. Tokotoko never uploads your location.</p>`;
  }

  wireSettings(body) {
    const g = this.game;
    for (const inp of body.querySelectorAll('[data-num]')) {
      inp.addEventListener('change', () => {
        const k = inp.dataset.num;
        const v = +inp.value;
        if (!Number.isFinite(v) || v <= 0) return;
        const min = +inp.min || 0, max = +inp.max || 1e9;
        const val = Math.max(min, Math.min(max, v));
        if (k === 'strideCm') g.setProfile({ strideM: val / 100 });
        else g.setProfile({ [k]: Math.round(val) });
        this.ui.toast('Saved.', 'check');
      });
    }
  }

  // ------------------------------------------------------------------ Piggy
  piggy() {
    const g = this.game, d = g.day;
    const coins = Math.floor(g.coins);
    const rows = [
      ...(d.started ? [] : []),
      ...d.ledger.filter((l) => l.kind === 'deposit').map((l) => ({ ...l, icon: 'sun' })),
      ...(d.burned >= 1 ? [{ t: Date.now(), kind: 'walk', label: `Walking · ${fmt(d.steps)} steps`, amt: d.burned, icon: 'paw' }] : []),
      ...d.ledger.filter((l) => l.kind !== 'deposit').map((l) => ({ ...l, icon: { quest: 'gift', food: 'bowl', omikuji: 'omikuji', mission: 'star', buy: 'hanger', bonus: 'sparkle' }[l.kind] || 'coin' })),
    ];
    const totalIn = d.deposit + d.burned + d.bonus;
    const html = `
      <div class="card big-pig">
        ${icon('pig', 64)}
        <div><div class="bp-num ${coins < 0 ? 'neg' : ''}">${fmt(coins)}</div><p>kcal in the piggy bank</p></div>
      </div>
      <div class="section-title"><span>Today’s energy</span><span class="jp">今日</span></div>
      <div class="card">
        <div class="q-meta" style="justify-content:space-between;margin-bottom:6px;font:600 14px var(--font-display)"><span>${icon('flame', 14)} Walked off ${fmt(d.burned)}</span><span>${icon('bowl', 14)} Ate ${fmt(d.eaten)}</span></div>
        ${segBar(totalIn ? Math.max(0, 1 - d.eaten / totalIn) : 1, 12, 'seg-battery')}
        <p class="note">${d.eaten <= totalIn ? `${fmt(totalIn - d.eaten)} kcal of today’s budget left.` : `${fmt(d.eaten - totalIn)} kcal over today’s budget. A walk will refill it.`}</p>
      </div>
      <div class="section-title"><span>Ledger</span><span class="jp">通帳</span></div>
      <div class="card ledger">${rows.map((r) => `
        <div class="ledger-row"><span>${icon(r.icon, 22)}</span><span>${esc(r.label)}<small>${r.kind === 'walk' ? 'Updated live' : hhmm(r.t)}</small></span><span class="amt ${r.amt >= 0 ? 'plus' : 'minus'}">${r.amt >= 0 ? '+' : '−'}${fmt(Math.abs(r.amt))}</span></div>`).join('') || '<p class="note">No activity yet today.</p>'}</div>
      <div class="section-title"><span>How it works</span><span class="jp">しくみ</span></div>
      <p class="note">Every morning the piggy gets your daily allowance (${fmt(d.deposit)} kcal). Walking adds the calories you burn, quests and omikuji add bonus treats, and every snack you log is paid from the piggy. Leftovers roll over, so a thrifty day saves up for outfits.</p>`;
    return { title: 'Piggy Bank', sub: 'ブタの貯金箱 · your calorie wallet', html };
  }

  // ------------------------------------------------------------------ actions
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const g = this.game, ui = this.ui;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'claim':
        if (g.claimQuest(id)) { ui.coinBurst(el, 10); ui.confetti(24); }
        break;
      case 'omikuji': ui.omikujiModal(); break;
      case 'go': sfx.click(); g.setDestination(id); ui.openTab('map'); ui.world.recenter(); break;
      case 'eat': ui.foodModal(FOOD_BY_ID[id]); break;
      case 'food': sfx.click(); ui.foodModal(FOOD_BY_ID[id]); break;
      case 'mission': g.completeMission(); ui.coinBurst(el, 5); sfx.claim(); break;
      case 'stampbook': this.sub.diary = 'stamps'; ui.openTab('diary'); break;
      case 'undo': g.undoFood(+el.dataset.t); sfx.close(); break;
      case 'day': if (el.dataset.key) { sfx.click(); this.diaryDay = el.dataset.key; this.render(true); } break;
      case 'lm': ui.landmarkModal(LM[id]); break;
      case 'species':
        sfx.pat();
        g.setProfile({ species: id });
        this.render();
        break;
      case 'buy': {
        const c = COSMETICS.find((x) => x.id === id);
        if (c.stamps) {
          if (!g.buy(id)) ui.toast(`Collect all ${c.stamps} stamps to unlock the crown.`, 'stamp');
          else { ui.confetti(40); sfx.fanfare(); }
          break;
        }
        ui.confirm({
          title: c.name, jp: c.jp, heroIcon: 'hanger',
          body: `${esc(c.blurb)}<br>Costs <b>${fmt(c.price)} kcal</b> of savings. Piggy has <b>${fmt(Math.floor(g.coins))}</b>.`,
          ok: g.coins >= c.price ? 'Buy it' : 'Not enough', okClass: g.coins >= c.price ? 'gold' : 'gray',
          onOk: () => {
            if (g.buy(id)) { sfx.fanfare(); ui.confetti(30); ui.toast(`${g.profile.petName} is wearing the ${c.name}!`, 'hanger'); }
            else ui.toast('Not enough kcal saved yet. Walk a little more!', 'pig');
          },
        });
        break;
      }
      case 'equip': sfx.click(); g.equip(id); break;
      case 'toggle': {
        const k = el.dataset.k;
        const v = el.getAttribute('aria-pressed') !== 'true';
        g.setProfile({ [k]: v });
        if (k === 'sound') setSound(v);
        if (k === 'demo') ui.renderDemo();
        sfx.click();
        this.render();
        break;
      }
      case 'set': {
        const k = el.dataset.k;
        const v = k === 'demoSpeed' ? +el.dataset.v : el.dataset.v;
        g.setProfile({ [k]: v });
        sfx.click();
        this.render();
        break;
      }
      case 'motion':
        this.ui.tracker.startMotion().then(() => { g.setProfile({ motion: true }); this.render(); });
        break;
      case 'sync': {
        const inp = document.getElementById('sync-steps');
        const n = +inp.value;
        if (n > 0) { g.addManualSteps(n); ui.toast(`Added ${fmt(n)} steps.`, 'paw'); inp.value = ''; }
        break;
      }
      case 'reset':
        ui.confirm({
          title: 'Start over?', body: 'This erases your diary, stamps, piggy bank and outfits on this device. It can’t be undone.',
          ok: 'Erase everything', okClass: 'red', onOk: () => g.resetAll(),
        });
        break;
      default:
    }
  }
}
