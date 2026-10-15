// Tiny chiptune sound effects with WebAudio (no audio files).
let ctx = null;
let enabled = true;

export function setSound(on) { enabled = on; }

function ac() {
  if (!enabled) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.05, when = 0, slide = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.08, when = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(g).connect(a.destination);
  s.start(t);
}

export const sfx = {
  click: () => tone(720, 0.05, { vol: 0.03 }),
  open: () => { tone(520, 0.05, { vol: 0.03 }); tone(780, 0.07, { vol: 0.03, when: 0.04 }); },
  close: () => { tone(620, 0.05, { vol: 0.03 }); tone(420, 0.07, { vol: 0.03, when: 0.04 }); },
  coin: () => { tone(988, 0.05, { vol: 0.035 }); tone(1319, 0.1, { vol: 0.035, when: 0.05 }); },
  spend: () => tone(520, 0.14, { type: 'triangle', vol: 0.07, slide: -220 }),
  pat: () => { tone(880, 0.06, { type: 'triangle', vol: 0.05 }); tone(1175, 0.08, { type: 'triangle', vol: 0.05, when: 0.06 }); },
  stamp: () => { noise(0.12, 0.12); tone(160, 0.18, { vol: 0.08, slide: -60 }); },
  shake: () => { for (let i = 0; i < 6; i++) noise(0.04, 0.05, i * 0.09); },
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.3 : 0.1, { vol: 0.045, when: i * 0.09 })),
  claim: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.08, { vol: 0.04, when: i * 0.06 })),
  step: () => tone(300 + Math.random() * 60, 0.03, { type: 'triangle', vol: 0.02 }),
};
