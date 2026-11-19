# gta6-cover-art-v3

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ehzugzvn/gta6-cover-art-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ehzugzvn/gta6-cover-art-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Coast Cover Press** — a GTA 6-style cover art maker for the make.fun bounty
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01). Turn your own photos into a
multi-panel Vice Coast poster: pick a layout, drop photos into the panels, drag and zoom to
frame each shot, stamp it, and export a print-ready cover. No Rockstar logos, artwork,
characters or fonts anywhere — every letter and sticker is drawn on canvas by the app itself.

## What the app does

- **Photos** — upload one or more of your own photos (nine AI-made sample photos are built in).
  One photo can fill every panel, or spread several photos across the panels; click a panel to
  place the picked photo, drag a panel to reframe its crop, scroll or use the slider to zoom.
- **Layout templates** — Hero 5 (big hero + 2×2 grid), Slash 4 (diagonal cuts), Grid 6
  (poster matrix) and Duo (two tall panels), with white or black borders and adjustable
  border width.
- **Colour grades** — Sunset Vice, Neon Nights, Golden Hour, Comic Pop and Noir, applied to
  the photos on canvas.
- **Lettering** — a bold condensed gradient title with a script subtitle and a kicker badge;
  title, subtitle and tagline are all editable, with a title-size control.
- **Stickers** — original canvas-drawn extras you can toggle: a five-star row, an
  "EST. 2026" burst badge, a "RATED V — VICE COAST" rating box and a palm stamp.
- **Export** — one click renders the composed cover as a PNG at 1080 × 1080, 1080 × 1350 or
  1920 × 1080, with a live preview while you edit.

## How it runs

The app is plain static files under `app/` (no build step, no network — it works offline in
desktop Chrome). To try it locally with Node 22:

```
node serve.ts          # serves app/ on http://localhost:8080
```

To hand the entry in the way the scorer runs it:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=$PWD/out node main.ts
```

`main.ts` (Node 22, standard library only) checks the screenshots against the scorer's caps,
copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there via
the vendored `vendor/makefun-app.ts`. The first screenshot in `screenshots/` is an exported
landscape Hero-5 cover; the set also shows the editor and portrait/square exports.
