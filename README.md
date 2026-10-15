# とことこ東京 · Tokotoko Tokyo

A cute voxel walking game set in a tiny Tokyo. You pick an animal buddy, and every real step you take
walks it across a 3D voxel diorama of the city. Your calories live in a **piggy bank**: walking fills it,
snacks spend it, quests add bonus treats. A travel **diary writes itself** from where you went and what you ate.

*Tokotoko (とことこ) is the sound of little feet trotting along.*

## Features

- **Voxel Tokyo** — a procedurally built 160×160 diorama of central Tokyo with 14 hand-made landmarks:
  Shibuya Scramble (with Hachikō), Shinjuku (and the 3D calico-cat billboard), Harajuku & Meiji Jingū's torii,
  Roppongi, Tokyo Tower, the Imperial Palace, Tokyo Station, Ginza's Wakō clock, Tsukiji, Akihabara,
  Ueno (pandas!), Sensō-ji in Asakusa, Skytree and Odaiba with a turning Ferris wheel and the Rainbow Bridge.
  The Yamanote line runs around the loop, yakatabune boats drift down the Sumida, clouds roll by.
- **Real time of day & seasons** — dawn, day, sunset and night palettes follow your clock. At night windows,
  neon, lanterns and Tokyo Tower light up. Trees and falling particles change with the season
  (sakura in spring, fireflies in summer, momiji & ginkgo in autumn, snow in winter).
- **Six chibi voxel buddies** — Shiba Inu, Calico Cat, Bunny, Panda, Tanuki and Kitsune. They walk, blink,
  wag, hop when you pat them, chat in speech bubbles and fall asleep at night. Buddies show as a pink
  X-ray silhouette when a skyscraper hides them.
- **Calorie piggy bank** — each morning it gets your daily allowance. Walking adds the kcal you burn
  (estimated from your weight), snacks you log are paid from it, leftovers roll over and buy outfits.
- **Konbini snack shop** — 22 Japanese foods drawn as pixel art (onigiri, melon pan, taiyaki, takoyaki,
  ramen, matcha…) plus custom entries. Eating a district's local special *in* that district earns a bonus.
- **Daily fun** — seeded daily quests, an omikuji fortune (大吉 to 凶) with lucky food/spot/colour,
  a spot & treat of the day, and a real-world mini mission.
- **Stamp rally** — reach each district to press its eki-style rubber stamp. Collect all 14 for the crown.
- **Auto diary (旅日記)** — a written summary of the day, a timeline of arrivals, meals, train rides,
  quests and milestones, and browsable past days.
- **Wardrobe** — hachimaki, yellow school cap, straw hat, pixel shades, fox mask, randoseru and more.
- **Pixel UI kit** — chunky 9-slice buttons and panels, segmented bars and every icon are generated in
  code from pixel grids, so there are no image assets to load.

## How tracking works

| Source | What it does |
| --- | --- |
| **Location (GPS)** | Inside central Tokyo your buddy follows your real position on the map. Anywhere else your steps carry it on a *virtual trip* between landmarks. GPS distance also counts as steps when the step counter is off, and fast segments are logged as train rides. |
| **Step counter** | Uses the phone's accelerometer to count steps while the app is open. |
| **Sync steps** | Add steps your phone's health app counted while Tokotoko was closed (Buddy → Settings). |
| **Demo walk** | Simulated steps for trying the game on a computer. |

Web apps can't count steps in the background, so keep Tokotoko open on walks or sync steps afterwards.
Location and motion sensors need HTTPS (GitHub Pages works) or `localhost`.

Calories per step are estimated as `weight (kg) × 0.00057`, about 34 kcal per 1,000 steps at 60 kg.

## Run it

It's a static site with no build step. Serve the folder over HTTP:

```sh
npm run dev           # http://localhost:5173  (uses npx http-server)
# or
python3 -m http.server 5173
```

`npm run check` builds and meshes the voxel world headlessly in Node and checks every landmark is reachable.

## Deploy

`.github/workflows/pages.yml` publishes the repo to GitHub Pages on every push to `main`.
Turn it on once under **Settings → Pages → Source: GitHub Actions**. Then open the Pages URL on your
phone and use "Add to Home Screen" — it installs as an offline-capable app.

## Project layout

```
index.html            app shell
styles/app.css        pixel UI kit and layout
src/world/voxel.js    voxel grid, AO mesher, glow material
src/world/tokyo.js    Tokyo generator: coastline, rivers, roads, blocks, parks, landmarks
src/world/pets.js     voxel animal buddies and outfits
src/world/scene.js    renderer, sky & time of day, water, train, boats, camera, x-ray pass
src/game/             state, sensors, pathfinding, quests, diary, game rules
src/ui/               pixel sprites & icons, HUD, sheets, onboarding, sound effects
vendor/               three.js r170 (MIT)
```

## Privacy

Everything is stored in your browser's local storage on your device. Nothing is uploaded.
