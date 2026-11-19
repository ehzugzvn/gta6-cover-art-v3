// Vice Coast Cover Press — a gta6-cover-art-01 entry (Node 22, standard library only): the app is this
// directory's app/ folder, plain static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. The app is a full cover studio: four multi-panel layout templates, five
// colour grades, drag/zoom panel framing, gradient lettering with a script subtitle, original canvas-drawn
// stickers, and one-click PNG exports at 1920 x 1080, 1080 x 1350 and 1080 x 1080. Its sample photos
// (app/samples/) were made for make.fun with an image model and are free to use. Before handing in, the
// program checks the screenshots against the scorer's own caps so a bad shot fails here, not at the gate.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight, in the scorer's own terms: the entry stands or falls on its screenshots (3 or 4 of them,
// each at most 256 KiB, the first by name the cover), so refuse early with a readable reason when one is
// missing or oversized instead of letting the dossier build fail on the same fact further away.
const SHOT_MAX_BYTES = 262144;
function checkScreenshots(dir: string): string[] {
  if (!existsSync(dir)) throw new Error('Vice Coast Cover Press: no screenshots/ folder beside main.ts');
  const shots = readdirSync(dir).filter((name) => /\.(?:png|jpe?g)$/i.test(name)).sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`Vice Coast Cover Press: screenshots/ holds ${shots.length} images, the entry needs 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > SHOT_MAX_BYTES) {
      throw new Error(`Vice Coast Cover Press: screenshots/${name} is ${bytes} bytes, over the ${SHOT_MAX_BYTES} allowed`);
    }
  }
  return shots;
}

const shotNames = checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Vice Coast Cover Press: handed in the app and ${shotNames.length} screenshots (cover: ${shotNames[0]}).`);
