// The auto-diary: turns a day's events into a short, cheerful journal entry.
import { LANDMARKS } from '../world/tokyo.js';
import { FOOD_BY_ID, OMIKUJI } from './data.js';
import { fmt, fmtKm } from '../util.js';

const LM = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));

function listJoin(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function article(name) {
  return /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`;
}

export function writeSummary(day, state) {
  const pet = state.profile.petName;
  const parts = [];
  const places = day.visited.map((id) => LM[id]?.name).filter(Boolean);
  if (day.steps > 0) {
    const where = places.length ? ` through ${listJoin(places)}` : ' around the neighbourhood';
    parts.push(`${pet} and I trotted ${fmt(day.steps)} steps (${fmtKm(day.meters)})${where}.`);
  } else if (places.length) {
    parts.push(`${pet} and I visited ${listJoin(places)}.`);
  } else {
    parts.push(`A quiet day so far. ${pet} is stretching and ready to go.`);
  }
  if (day.rides) parts.push(day.rides === 1 ? 'We hopped on a train once.' : `We rode the train ${day.rides} times.`);
  const foods = day.foods.map((f) => (FOOD_BY_ID[f.id]?.name || f.name).toLowerCase());
  if (foods.length) {
    const uniq = [...new Set(foods)];
    parts.push(`We shared ${listJoin(uniq.slice(0, 4).map(article))}${uniq.length > 4 ? ' and more' : ''}.`);
  }
  if (day.omikuji) {
    const o = OMIKUJI[day.omikuji.idx];
    parts.push(`The omikuji said ${o.rank} (${o.en})${day.omikuji.idx === 0 ? '. Lucky!' : '.'}`);
  }
  if (day.newStamps) parts.push(day.newStamps === 1 ? 'We got a brand-new stamp for the book!' : `We collected ${day.newStamps} new stamps!`);
  if (day.goalHit) parts.push('We hit our step goal, banzai!');
  const left = (day.deposit || 0) + day.burned + (day.bonus || 0) - day.eaten;
  if (day.foods.length || day.steps) {
    parts.push(left >= 0 ? `Piggy still has ${fmt(left)} kcal of today’s budget.` : `We went ${fmt(-left)} kcal over budget, so tomorrow calls for a longer walk.`);
  }
  return parts.join(' ');
}

// Merge the day's events into a list ready for rendering (newest last).
export function timeline(day) {
  return day.entries.slice().sort((a, b) => a.t - b.t);
}
