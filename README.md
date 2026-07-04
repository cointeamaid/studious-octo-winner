# 🐾 Porch Cats

A small, no-backend web app for logging sightings of the neighborhood's stray cats
and keeping a running leaderboard of who's the most reliable breakfast guest.

It started when I noticed the same orange tabby showing up on my porch every
morning at 7am sharp, rain or shine. I named him **Mr. Pancakes**. Then came a
gray one I call **The Accountant**, because he sits very still and seems to be
quietly judging my life choices. This is where I keep track of them.

## Features

- Log a sighting: which cat, what time, their mood, and a note
- Automatic leaderboard ranking cats by number of visits
- Recent-sightings feed
- Everything saves in your browser (localStorage) — no server needed
- Cat roster loaded from a simple `cats.json` file

## Run it

It's just static files. Either:

- Open `index.html` in your browser, **or**
- Serve the folder (so `cats.json` loads cleanly):

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Files

| File | What it does |
|------|--------------|
| `index.html` | The page structure |
| `style.css` | Styling |
| `app.js` | All the logic (rendering, saving, leaderboard) |
| `cats.json` | The roster of tracked cats |

## The current standings

Mr. Pancakes holds a commanding lead. The Accountant is a distant second.
A mysterious black cat known only as `??` has appeared exactly once and haunts
my thoughts. More features coming whenever the cats feel like cooperating.
