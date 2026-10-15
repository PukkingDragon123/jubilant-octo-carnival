// Movement sensing: GPS (geolocation), an accelerometer pedometer, and a demo
// walker for desktops. Emits 'steps', 'walk' (metres), 'position', 'ride',
// and 'status' events.
import { haversine } from '../util.js';
import { inTokyo, geoToMap } from '../world/tokyo.js';

export class Tracker {
  constructor() {
    this.listeners = {};
    this.gps = { state: 'off', watch: null, last: null, ride: 0, accuracy: null, inTokyo: false };
    this.motion = { state: 'off', g: 9.8, f: 0, armed: true, lastStep: 0, recent: 0 };
    this.demo = { on: false, walking: false, speed: 15, acc: 0 };
    this.onMotion = this.onMotion.bind(this);
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }

  get pedometerActive() {
    return this.motion.state === 'on' && performance.now() - this.motion.recent < 20000;
  }

  // ------------------------------------------------------------ GPS
  startGPS() {
    if (!('geolocation' in navigator)) {
      this.gps.state = 'unsupported';
      this.emit('status');
      return;
    }
    if (this.gps.watch !== null) return;
    this.gps.state = 'asking';
    this.emit('status');
    try {
      this.gps.watch = navigator.geolocation.watchPosition(
        (p) => this.onFix(p),
        (err) => {
          this.gps.state = err.code === 1 ? 'denied' : 'error';
          if (err.code === 1) this.stopGPS(false);
          this.emit('status');
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 30000 },
      );
    } catch {
      this.gps.state = 'error';
      this.emit('status');
    }
  }

  stopGPS(reset = true) {
    if (this.gps.watch !== null) navigator.geolocation.clearWatch(this.gps.watch);
    this.gps.watch = null;
    if (reset) this.gps.state = 'off';
    this.gps.last = null;
    this.emit('status');
  }

  onFix(p) {
    const { latitude: lat, longitude: lon, accuracy } = p.coords;
    const t = p.timestamp || Date.now();
    this.gps.state = 'on';
    this.gps.accuracy = accuracy;
    this.gps.inTokyo = inTokyo(lat, lon);
    const pos = { lat, lon, accuracy, inTokyo: this.gps.inTokyo, ...(this.gps.inTokyo ? geoToMap(lat, lon) : {}) };
    this.emit('position', pos);
    if (accuracy > 60) { this.emit('status'); return; }
    const last = this.gps.last;
    if (last) {
      const d = haversine(last.lat, last.lon, lat, lon);
      const dt = Math.max(1, (t - last.t) / 1000);
      const speed = d / dt;
      if (d < Math.max(4, accuracy * 0.25)) { this.emit('status'); return; } // jitter
      if (speed > 90 || dt > 3 * 3600) {
        // Teleport (flight, long gap, bad fix): start fresh without counting it.
        this.gps.ride = 0;
      } else if (speed <= 2.8) {
        if (this.gps.ride > 400) this.emit('ride', { meters: this.gps.ride });
        this.gps.ride = 0;
        this.emit('walk', { meters: d });
      } else if (speed > 3.5) {
        this.gps.ride += d;
      }
    }
    this.gps.last = { lat, lon, t };
    this.emit('status');
  }

  // ------------------------------------------------------------ pedometer
  // iOS needs requestPermission() from a user gesture.
  async startMotion() {
    if (typeof DeviceMotionEvent === 'undefined') {
      this.motion.state = 'unsupported';
      this.emit('status');
      return false;
    }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res !== 'granted') { this.motion.state = 'denied'; this.emit('status'); return false; }
      }
    } catch {
      this.motion.state = 'denied';
      this.emit('status');
      return false;
    }
    window.addEventListener('devicemotion', this.onMotion);
    this.motion.state = 'listening';
    this.emit('status');
    // If no sensor events arrive (desktop), report it.
    setTimeout(() => {
      if (this.motion.state === 'listening' && !this.motion.got) { this.motion.state = 'nosensor'; this.emit('status'); }
    }, 2500);
    return true;
  }

  stopMotion() {
    window.removeEventListener('devicemotion', this.onMotion);
    this.motion.state = 'off';
    this.emit('status');
  }

  onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    const m = this.motion;
    if (!m.got) { m.got = true; m.state = 'on'; this.emit('status'); }
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    m.g = m.g * 0.96 + mag * 0.04; // slow gravity estimate
    const v = mag - m.g;
    m.f = m.f * 0.65 + v * 0.35; // smoothed dynamic acceleration
    const now = performance.now();
    if (m.armed && m.f > 1.25) {
      const gap = now - m.lastStep;
      if (gap > 280) {
        m.lastStep = now;
        m.recent = now;
        if (gap < 2000) this.emit('steps', { n: 1, source: 'motion' });
      }
      m.armed = false;
    } else if (!m.armed && m.f < 0.2) {
      m.armed = true;
    }
  }

  // ------------------------------------------------------------ demo
  setDemo(on, speed) {
    this.demo.on = on;
    if (speed) this.demo.speed = speed;
    if (!on) this.demo.walking = false;
    this.emit('status');
  }

  setDemoWalking(walking) {
    this.demo.walking = walking && this.demo.on;
    this.emit('status');
  }

  tick(dt) {
    const d = this.demo;
    if (!d.on || !d.walking) return;
    d.acc += dt * 1.8 * d.speed;
    if (d.acc >= 1) {
      const n = Math.floor(d.acc);
      d.acc -= n;
      this.emit('steps', { n, source: 'demo' });
    }
  }
}
