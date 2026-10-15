// First-run flow: pick a buddy, set the piggy allowance, choose tracking.
import { $, fillIcons, icon } from './common.js';
import { sfx } from './sfx.js';
import { SPECIES } from '../world/pets.js';
import { esc } from '../util.js';

const ORDER = Object.keys(SPECIES);

export class Onboarding {
  constructor(ui) {
    this.ui = ui;
    this.step = 0;
    this.data = null;
  }

  open() {
    const g = this.ui.game;
    this.data = {
      species: g.profile.species,
      petName: SPECIES[g.profile.species].defaultName,
      budget: g.profile.budget,
      stepGoal: g.profile.stepGoal,
      weightKg: g.profile.weightKg,
      gps: false,
      demo: !('ontouchstart' in window),
    };
    this.nameTouched = false;
    document.body.classList.add('onboarding');
    this.ui.world.setCloseup(true, innerHeight > innerWidth ? 0.2 : 0.1);
    $('#onboard').hidden = false;
    this.render();
  }

  close() {
    document.body.classList.remove('onboarding');
    $('#onboard').hidden = true;
    $('#onboard').innerHTML = '';
    this.ui.world.setCloseup(false);
  }

  render() {
    const d = this.data;
    const sp = SPECIES[d.species];
    const dots = `<div class="ob-dots">${[0, 1, 2].map((i) => `<i class="${i === this.step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (this.step === 0) {
      body = `
        <div class="ob-step">
          <h2>Choose your travel buddy</h2>
          <p>They’ll walk across Tokyo with every step you take.</p>
          <div class="ob-species">
            <button class="btn cream icon-btn" data-act="prev" aria-label="Previous buddy"><span>${icon('left', 16, { outline: null, tint: '#2a2140' })}</span></button>
            <div class="sp-name"><b>${sp.name}</b><span>${sp.jp}</span></div>
            <button class="btn cream icon-btn" data-act="next" aria-label="Next buddy"><span>${icon('right', 16, { outline: null, tint: '#2a2140' })}</span></button>
          </div>
          <p class="note" style="text-align:center;margin:0 auto 10px">${esc(sp.blurb)}</p>
          <button class="btn pink big wide" data-act="go"><span>This one!</span></button>
        </div>`;
    } else if (this.step === 1) {
      body = `
        <div class="ob-step">
          <h2>Name & piggy bank</h2>
          <p>Each morning your piggy bank gets a calorie allowance. Walking adds to it and snacks spend it.</p>
          <div class="field" style="margin-bottom:10px"><label for="ob-name">Buddy’s name</label><input id="ob-name" maxlength="16" value="${esc(d.petName)}"></div>
          <div class="form-row" style="grid-template-columns:1fr 1fr 1fr">
            <div class="field"><label for="ob-budget">Allowance kcal</label><input id="ob-budget" type="number" inputmode="numeric" min="800" max="5000" value="${d.budget}"></div>
            <div class="field"><label for="ob-goal">Step goal</label><input id="ob-goal" type="number" inputmode="numeric" min="1000" max="40000" step="500" value="${d.stepGoal}"></div>
            <div class="field"><label for="ob-weight">Weight kg</label><input id="ob-weight" type="number" inputmode="decimal" min="25" max="250" value="${d.weightKg}"></div>
          </div>
          <p class="note">Weight is only used to estimate calories per step. You can change all of this later.</p>
          <div class="modal-actions">
            <button class="btn gray" data-act="back"><span>Back</span></button>
            <button class="btn pink" data-act="go"><span>Next</span></button>
          </div>
        </div>`;
    } else {
      const t = this.ui.tracker;
      const gpsLabel = { on: 'On', asking: 'Asking…', denied: 'Denied', error: 'Waiting', unsupported: 'Unavailable' }[t.gps.state];
      const motionLabel = { on: 'On', listening: 'Listening…', denied: 'Denied', unsupported: 'Unavailable', nosensor: 'No sensor' }[t.motion.state];
      body = `
        <div class="ob-step">
          <h2>How do we track walks?</h2>
          <p>In Tokyo, ${esc(d.petName)} follows you live. Anywhere else, your steps carry ${esc(d.petName)} on a virtual trip between landmarks.</p>
          <div class="perm">${icon('pin', 30)}<div><b>Location</b><small>Live position, distance and train rides.</small></div>
            <button class="btn sky" style="min-height:40px" data-act="gps" ${t.gps.state === 'on' || t.gps.state === 'asking' ? 'disabled' : ''}><span>${gpsLabel || 'Allow'}</span></button></div>
          <div class="perm">${icon('paw', 30)}<div><b>Step counter</b><small>Counts steps with the motion sensor while the app is open.</small></div>
            <button class="btn green" style="min-height:40px" data-act="motion" ${t.motion.state === 'on' ? 'disabled' : ''}><span>${motionLabel || 'Allow'}</span></button></div>
          <div class="perm">${icon('walk', 30)}<div><b>Demo walk</b><small>On a computer? Simulated steps let you explore right away.</small></div>
            <button class="toggle" data-act="demo" aria-pressed="${d.demo}" aria-label="Demo walk"></button></div>
          <p class="note">Your data stays on this device.</p>
          <div class="modal-actions">
            <button class="btn gray" data-act="back"><span>Back</span></button>
            <button class="btn pink big" data-act="finish"><span>いってきます!</span></button>
          </div>
        </div>`;
    }
    const el = $('#onboard');
    el.innerHTML = `
      <div class="ob-top"><div class="logo"><span class="logo-jp">とことこ東京</span><span class="logo-en">TOKOTOKO TOKYO</span></div></div>
      <div class="ob-card panel">${body}${dots}</div>`;
    fillIcons(el);
    el.onclick = (e) => this.onClick(e);
  }

  readFields() {
    const d = this.data;
    const v = (id) => document.getElementById(id);
    if (!v('ob-name')) return;
    const name = v('ob-name').value.trim().slice(0, 16);
    if (name) d.petName = name;
    const num = (id, min, max, def) => { const n = +v(id).value; return Number.isFinite(n) && n > 0 ? Math.max(min, Math.min(max, n)) : def; };
    d.budget = Math.round(num('ob-budget', 800, 5000, 1800));
    d.stepGoal = Math.round(num('ob-goal', 1000, 40000, 8000));
    d.weightKg = num('ob-weight', 25, 250, 60);
  }

  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const d = this.data;
    const t = this.ui.tracker;
    const g = this.ui.game;
    switch (el.dataset.act) {
      case 'prev':
      case 'next': {
        sfx.pat();
        const i = ORDER.indexOf(d.species);
        d.species = ORDER[(i + (el.dataset.act === 'next' ? 1 : ORDER.length - 1)) % ORDER.length];
        d.petName = SPECIES[d.species].defaultName;
        this.ui.world.setPet(d.species, {});
        this.ui.world.pet.hop();
        this.render();
        break;
      }
      case 'go':
        sfx.click();
        if (this.step === 1) this.readFields();
        this.step++;
        this.render();
        break;
      case 'back':
        sfx.close();
        if (this.step === 1) this.readFields();
        this.step = Math.max(0, this.step - 1);
        this.render();
        break;
      case 'gps':
        sfx.click();
        d.gps = true;
        t.on('status', () => { if (this.step === 2 && !$('#onboard').hidden) this.render(); });
        t.startGPS();
        this.render();
        break;
      case 'motion':
        sfx.click();
        t.startMotion().then(() => this.render());
        break;
      case 'demo':
        sfx.click();
        d.demo = !d.demo;
        this.render();
        break;
      case 'finish': {
        sfx.fanfare();
        const noSensors = t.motion.state !== 'on' && t.gps.state !== 'on';
        g.completeOnboarding({
          species: d.species, petName: d.petName, budget: d.budget, stepGoal: d.stepGoal, weightKg: d.weightKg,
          gps: d.gps, motion: t.motion.state === 'on', demo: d.demo || (noSensors && !('ontouchstart' in window)),
        });
        this.close();
        this.ui.refreshPortrait();
        this.ui.renderAll();
        this.ui.renderLabels();
        this.ui.confetti(50);
        this.ui.toast(`${d.petName} put on their walking shoes! Today’s allowance of ${d.budget.toLocaleString('en-US')} kcal is in the piggy bank.`, 'pig');
        const hint = g.profile.demo
          ? 'Tap “Demo walk” to start walking, or tap a landmark to pick a destination.'
          : 'Start walking! Every real step moves your buddy. Tap a landmark to pick where to go.';
        this.ui.afterModal = () => setTimeout(() => this.ui.toast(hint, 'walk'), 400);
        break;
      }
      default:
    }
  }
}
