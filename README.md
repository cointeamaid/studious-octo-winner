# 🐾 Cat Lab

A small, no-backend collection of browser tools for the neighborhood's cats.
Open `index.html` and pick a tool.

## Tools

### 🐱 Cat Companion (`virtual-cat.html`)
Adopt one of the roster cats and care for it like a virtual pet:

- Four cats to choose from, each with a distinct **personality** (friendly,
  judgmental, cryptic, or high-maintenance) that changes how it reacts.
- Four needs that drift over **real time**: Hunger, Energy, Happiness, and a
  slowly-growing Bond.
- Care actions: **Feed, Treat, Pet, Play, Brush, Nap, Talk** — each nudges the
  stats (playing is fun but tiring; napping restores energy; petting builds bond).
- The cat's **face and mood change** with its state (content, happy, hungry,
  grumpy, sleepy), drawn as inline SVG.
- Saves per-cat in your browser, so each cat remembers how you treat it.

### 📋 Porch Cats Tracker (`porch-cats.html`)
Log real-world sightings of the strays — who showed up, when, and their mood —
and keep a leaderboard of the most reliable breakfast guests.

## The roster

| Cat | Breed | Temperament |
|-----|-------|-------------|
| Mr. Pancakes | orange tabby | Friendly & reliable — shows up at 7am sharp |
| The Accountant | gray shorthair | Dry & judgmental — silently auditing you |
| ?? | black | Cryptic & elusive — appeared exactly once |
| Duchess | calico | High-maintenance royalty — very particular |

## Run it

It's just static files. Either open `index.html` directly, or serve the folder
so `cats.json` loads cleanly:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The Cat Lab portal / home page |
| `virtual-cat.html` + `cat.css` + `cat.js` | The Cat Companion virtual pet |
| `porch-cats.html` + `style.css` + `app.js` | The sighting tracker |
| `base.css` | Shared theme |
| `portal.css` | Portal styles |
| `cats.json` | The shared cat roster (names, colors, personalities, art palettes) |
