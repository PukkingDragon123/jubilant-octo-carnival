// Game content: the snack menu, omikuji fortunes, daily mini-missions,
// buddy chatter and levels.

// kcal values are typical single servings; "spot" marks a local speciality.
export const FOODS = [
  { id: 'onigiri', name: 'Salmon Onigiri', jp: '鮭おにぎり', kcal: 180, cat: 'snack', tags: ['rice'] },
  { id: 'melonpan', name: 'Melon Pan', jp: 'メロンパン', kcal: 350, cat: 'snack', tags: ['sweet', 'bakery'], spot: 'asakusa' },
  { id: 'anpan', name: 'Anpan', jp: 'あんパン', kcal: 280, cat: 'snack', tags: ['sweet', 'bakery'], spot: 'ginza' },
  { id: 'taiyaki', name: 'Taiyaki', jp: 'たい焼き', kcal: 220, cat: 'snack', tags: ['sweet', 'street'] },
  { id: 'dango', name: 'Mitarashi Dango', jp: 'みたらし団子', kcal: 200, cat: 'snack', tags: ['sweet', 'street'], spot: 'skytree' },
  { id: 'daifuku', name: 'Ichigo Daifuku', jp: 'いちご大福', kcal: 230, cat: 'snack', tags: ['sweet'] },
  { id: 'crepe', name: 'Rainbow Crepe', jp: 'クレープ', kcal: 420, cat: 'snack', tags: ['sweet', 'street'], spot: 'harajuku' },
  { id: 'takoyaki', name: 'Takoyaki', jp: 'たこ焼き', kcal: 380, cat: 'snack', tags: ['street'], spot: 'odaiba' },
  { id: 'tamagoyaki', name: 'Tamagoyaki Stick', jp: '玉子焼き', kcal: 120, cat: 'snack', tags: ['street'], spot: 'tsukiji' },
  { id: 'yakitori', name: 'Yakitori', jp: '焼き鳥', kcal: 200, cat: 'snack', tags: ['street'], spot: 'shinjuku' },
  { id: 'pandabun', name: 'Panda Bun', jp: 'パンダまん', kcal: 240, cat: 'snack', tags: ['sweet', 'street'], spot: 'ueno' },
  { id: 'softserve', name: 'Soft Serve', jp: 'ソフトクリーム', kcal: 210, cat: 'snack', tags: ['sweet'], spot: 'tokyotower' },
  { id: 'purin', name: 'Purin', jp: 'プリン', kcal: 180, cat: 'snack', tags: ['sweet'] },
  { id: 'kakigori', name: 'Kakigōri', jp: 'かき氷', kcal: 160, cat: 'snack', tags: ['sweet'] },
  { id: 'ramen', name: 'Shoyu Ramen', jp: '醤油ラーメン', kcal: 550, cat: 'meal', tags: ['noodle'] },
  { id: 'sushi', name: 'Sushi Set', jp: 'お寿司', kcal: 480, cat: 'meal', tags: ['rice', 'fish'] },
  { id: 'ekiben', name: 'Ekiben Bento', jp: '駅弁', kcal: 750, cat: 'meal', tags: ['rice'], spot: 'tokyostation' },
  { id: 'omurice', name: 'Omurice', jp: 'オムライス', kcal: 650, cat: 'meal', tags: ['rice'], spot: 'akihabara' },
  { id: 'pancake', name: 'Soufflé Pancakes', jp: 'パンケーキ', kcal: 520, cat: 'meal', tags: ['sweet'], spot: 'roppongi' },
  { id: 'matcha', name: 'Matcha Latte', jp: '抹茶ラテ', kcal: 190, cat: 'drink', tags: ['matcha'], spot: 'imperial' },
  { id: 'bubbletea', name: 'Bubble Tea', jp: 'タピオカ', kcal: 360, cat: 'drink', tags: ['sweet'], spot: 'shibuya' },
  { id: 'greentea', name: 'Green Tea', jp: '緑茶', kcal: 0, cat: 'drink', tags: ['matcha'] },
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export const TAG_LABEL = {
  sweet: 'something sweet', street: 'street food', rice: 'a rice dish', noodle: 'noodles',
  matcha: 'something matcha', fish: 'something from the sea', bakery: 'a bakery treat',
};

export const OMIKUJI = [
  { rank: '大吉', kana: 'だいきち', en: 'Great Blessing', weight: 12, bonus: 88, lines: [
    'Everything you touch turns to mochi. Walk boldly!',
    'A wonderful encounter waits around the next corner.',
    'Your steps today will echo for a whole week.',
  ] },
  { rank: '中吉', kana: 'ちゅうきち', en: 'Middle Blessing', weight: 18, bonus: 50, lines: [
    'Good things come to those who take the long way.',
    'A small detour leads to a big smile.',
  ] },
  { rank: '小吉', kana: 'しょうきち', en: 'Small Blessing', weight: 22, bonus: 30, lines: [
    'Little joys add up. Notice three of them today.',
    'Share a snack and the luck doubles.',
  ] },
  { rank: '吉', kana: 'きち', en: 'Blessing', weight: 22, bonus: 40, lines: [
    'Steady steps, steady heart.',
    'Today is a good day to try something new on the menu.',
  ] },
  { rank: '末吉', kana: 'すえきち', en: 'Future Blessing', weight: 16, bonus: 20, lines: [
    'Luck is warming up. It arrives after sunset.',
    'Patience now, taiyaki later.',
  ] },
  { rank: '凶', kana: 'きょう', en: 'Curse', weight: 10, bonus: 10, lines: [
    'Tie this fortune to the rack and walk it off. 1,000 steps breaks the spell!',
    'Even bad luck gets tired if you keep walking.',
  ] },
];

export const LUCKY_COLORS = [
  { name: 'Sakura pink', hex: '#ff9fc2' }, { name: 'Matcha green', hex: '#7cc56b' },
  { name: 'Sky blue', hex: '#6fc3ff' }, { name: 'Persimmon', hex: '#ff8a3d' },
  { name: 'Indigo', hex: '#5a5fd0' }, { name: 'Gold', hex: '#ffcd3c' },
];

export const MISSIONS = [
  'Spot a vending machine drink you have never tried.',
  'Find a manhole cover with art on it.',
  'Say “arigatō” to someone who helps you today.',
  'Take a photo of something pink.',
  'Find a lucky cat (maneki-neko) waving at you.',
  'Count three torii gates or shrines.',
  'Try a konbini snack you have never had.',
  'Watch a train go by for one whole minute.',
  'Spot someone walking a Shiba Inu.',
  'Sit on a bench and people-watch for five minutes.',
  'Find a gachapon capsule machine.',
  'Notice one seasonal decoration.',
  'Drink a glass of water before lunch.',
  'Take the stairs instead of the escalator once.',
  'Stretch for two minutes while waiting at a crossing.',
  'Find the tallest building you can see and wave at it.',
];

export const SPEECH = {
  idle: ['Let’s go somewhere!', 'Tokotoko~ ♪', 'Where to next?', 'I smell taiyaki…', 'Nice weather for a walk!'],
  walking: ['Tokotoko tokotoko!', 'Ooh, look at that!', 'Wheee~', 'Keep going!', 'So many shops!'],
  hungry: ['Onaka suita… (I’m hungry)', 'Snack time?', 'My tummy is rumbling!'],
  full: ['So full~', 'Gochisōsama!', 'That was delicious!'],
  arrive: ['We made it!', 'Sugoi!', 'New place, new stamp!'],
  night: ['Zzz…', 'Oyasumi~', 'The city is sparkly at night.'],
  pat: ['Ehehe~', '♥ ♥ ♥', 'Again! Again!', 'Purr…', 'Hehe, that tickles!'],
  goal: ['We hit our step goal!', 'Banzai!'],
  lowCoins: ['Piggy bank is getting light…', 'Let’s walk to refill the piggy!'],
};

// XP needed for level n → total xp = 60 * n * (n-1) / 2 * … simple quadratic curve.
export function levelFromXp(xp) {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}
export function xpForLevel(n) {
  return Math.round(40 * (n - 1) * (n - 1) + 60 * (n - 1));
}
