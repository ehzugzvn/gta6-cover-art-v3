// Vice Coast Cover Press — the editor wiring.
// State lives here; src/cover.js only draws it. Photos (uploads + built-in samples) fill the panels of
// the chosen template, each panel keeps its own crop and zoom, and every control redraws the live
// preview. Exports render the same state onto a fresh full-size canvas.
import { drawCover, blankPanel, panelPolys, pointInPoly, TEMPLATES, FORMATS } from './cover.js';
import { readShot, shotBodyClass } from './shots.js';

const SAMPLES = [
  ['supercar', 'Orange supercar'],
  ['convertible', 'Convertible at sunset'],
  ['boardwalk', 'Neon boardwalk'],
  ['harbour', 'Harbour at dusk'],
  ['skyline', 'Rooftop skyline'],
  ['portrait', 'Smiling portrait'],
  ['fisherman', 'Fisherman on a pier'],
  ['boulevard', 'Palm boulevard'],
  ['pier', 'The pier'],
];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');

const state = {
  photos: [], // { img, name }
  panels: [],
  template: 'hero5',
  grade: 'sunset',
  format: 'landscape',
  borderColor: 'white',
  borderWidth: 14,
  title: 'VICE COAST',
  subtitle: 'cover press',
  tagline: 'YOUR CITY. YOUR COVER.',
  titleSize: 1,
  stickers: { stars: true, burst: true, rating: true, palm: true },
};
let selected = 0; // the panel being edited
let pickedPhoto = 0; // the photo the sample strip / uploads have armed for placement
let lastPolys = [];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function say(text) {
  status.textContent = text;
}

/** Keeps the panel list the size of the template, reusing placements where they exist. */
function fitPanels() {
  const count = TEMPLATES[state.template].panels.length;
  while (state.panels.length < count) state.panels.push(blankPanel(state.panels.length % Math.max(1, state.photos.length)));
  state.panels.length = count;
  if (selected >= count) selected = 0;
}

/** Gives panel i the i-th photo, wrapping around: the one-click magazine spread. */
function spread() {
  fitPanels();
  state.panels.forEach((panel, i) => {
    panel.photo = state.photos.length ? i % state.photos.length : 0;
  });
}

function redraw() {
  fitPanels();
  // The dashed selection frame belongs to the editor only: a cover shot is an export, frame-free.
  const inEditor = !document.body.classList.contains('shot-cover');
  lastPolys = drawCover(canvas, state, { editor: inEditor, selected });
  syncPanelUi();
}

function syncPanelUi() {
  const panel = state.panels[selected];
  document.getElementById('panel-label').textContent =
    `Panel ${selected + 1} of ${state.panels.length} selected — drag it on the cover to reframe, scroll to zoom.`;
  if (panel) document.getElementById('zoom').value = panel.zoom;
  document.querySelectorAll('#samples button').forEach((btn, i) => btn.classList.toggle('on', i === pickedPhoto));
}

/** Marks one of a button group as the active choice. */
function markOn(groupId, attr, value) {
  document.querySelectorAll(`#${groupId} button`).forEach((btn) => btn.classList.toggle('on', btn.dataset[attr] === value));
}

async function addPhoto(img, name) {
  state.photos.push({ img, name });
  pickedPhoto = state.photos.length - 1;
  buildSampleStrip();
  if (state.panels.every((p) => p.photo === 0)) spread();
  redraw();
}

/** The photo strip: built-in samples first, then the user's uploads, each a clickable thumbnail. */
function buildSampleStrip() {
  const strip = document.getElementById('samples');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${photo.name} — pick, then click a panel to place it`;
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      pickedPhoto = i;
      say(`Picked “${photo.name}” — now click a panel to place it there.`);
      syncPanelUi();
    });
    strip.appendChild(btn);
  });
}

function wireControls() {
  document.getElementById('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    }
    if (files.length) say(`Added ${files.length} photo${files.length > 1 ? 's' : ''} — the last one is picked, click a panel to place it.`);
    e.target.value = '';
  });
  document.getElementById('fill-all').addEventListener('click', () => {
    state.panels.forEach((panel) => { panel.photo = pickedPhoto; });
    redraw();
    say('Every panel now shows the picked photo — drag each one to a different crop.');
  });
  document.getElementById('spread').addEventListener('click', () => {
    spread();
    redraw();
    say('Photos spread across the panels, one each.');
  });
  document.getElementById('templates').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-template]');
    if (!btn) return;
    state.template = btn.dataset.template;
    markOn('templates', 'template', state.template);
    fitPanels();
    redraw();
  });
  document.getElementById('formats').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-format]');
    if (!btn) return;
    setFormat(btn.dataset.format);
  });
  document.getElementById('border-white').addEventListener('click', () => setBorder('white'));
  document.getElementById('border-black').addEventListener('click', () => setBorder('black'));
  document.getElementById('border-width').addEventListener('input', (e) => {
    state.borderWidth = Number(e.target.value);
    redraw();
  });
  document.getElementById('grades').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    markOn('grades', 'grade', state.grade);
    redraw();
  });
  for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['tagline', 'tagline']]) {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
  }
  document.getElementById('title-size').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    redraw();
  });
  for (const [id, key] of [['st-stars', 'stars'], ['st-burst', 'burst'], ['st-rating', 'rating'], ['st-palm', 'palm']]) {
    document.getElementById(id).addEventListener('change', (e) => {
      state.stickers[key] = e.target.checked;
      redraw();
    });
  }
  document.getElementById('zoom').addEventListener('input', (e) => {
    const panel = state.panels[selected];
    if (panel) panel.zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('panel-prev-photo').addEventListener('click', () => cyclePanelPhoto(-1));
  document.getElementById('panel-next-photo').addEventListener('click', () => cyclePanelPhoto(1));
  document.getElementById('panel-center').addEventListener('click', () => {
    const panel = state.panels[selected];
    if (panel) { panel.ox = 0; panel.oy = 0; panel.zoom = 1; }
    redraw();
  });
}

function cyclePanelPhoto(step) {
  const panel = state.panels[selected];
  if (!panel || !state.photos.length) return;
  panel.photo = (panel.photo + step + state.photos.length) % state.photos.length;
  redraw();
}

function setBorder(color) {
  state.borderColor = color;
  document.getElementById('border-white').classList.toggle('on', color === 'white');
  document.getElementById('border-black').classList.toggle('on', color === 'black');
  redraw();
}

function setFormat(format) {
  state.format = format;
  const { w, h } = FORMATS[format];
  canvas.width = w;
  canvas.height = h;
  markOn('formats', 'format', format);
  redraw();
}

/** Pointer editing on the live canvas: click selects (and places the picked photo), drag reframes, wheel zooms. */
function wirePanelEditing() {
  let drag = null;
  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    ];
  };
  const panelAt = (x, y) => lastPolys.findIndex((poly) => pointInPoly(x, y, poly));
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = toCanvas(e);
    const hit = panelAt(x, y);
    if (hit < 0) return;
    selected = hit;
    drag = { x, y, moved: 0, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [x, y] = toCanvas(e);
    const dx = x - drag.x;
    const dy = y - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    const panel = state.panels[selected];
    panel.ox = clamp(drag.ox + dx / (canvas.width * 0.35), -1, 1);
    panel.oy = clamp(drag.oy + dy / (canvas.height * 0.35), -1, 1);
    redraw();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const wasClick = drag.moved < canvas.width * 0.006;
    drag = null;
    if (wasClick && pickedPhoto !== state.panels[selected].photo) {
      state.panels[selected].photo = pickedPhoto;
      say(`Placed “${state.photos[pickedPhoto].name}” in panel ${selected + 1}.`);
    }
    redraw();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = toCanvas(e);
    const hit = panelAt(x, y);
    if (hit < 0) return;
    selected = hit;
    const panel = state.panels[hit];
    panel.zoom = clamp(panel.zoom * (e.deltaY < 0 ? 1.07 : 0.93), 1, 3);
    redraw();
  }, { passive: false });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Keyboard framing for the selected panel: arrows nudge, [ ] swap its photo, + / − zoom. */
function wireKeys() {
  window.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? '')) return;
    const panel = state.panels[selected];
    if (!panel) return;
    const step = e.shiftKey ? 0.12 : 0.04;
    if (e.key === 'ArrowLeft') panel.ox = clamp(panel.ox - step, -1, 1);
    else if (e.key === 'ArrowRight') panel.ox = clamp(panel.ox + step, -1, 1);
    else if (e.key === 'ArrowUp') panel.oy = clamp(panel.oy - step, -1, 1);
    else if (e.key === 'ArrowDown') panel.oy = clamp(panel.oy + step, -1, 1);
    else if (e.key === '[') return cyclePanelPhoto(-1);
    else if (e.key === ']') return cyclePanelPhoto(1);
    else if (e.key === '+' || e.key === '=') panel.zoom = clamp(panel.zoom * 1.08, 1, 3);
    else if (e.key === '-' || e.key === '_') panel.zoom = clamp(panel.zoom / 1.08, 1, 3);
    else return;
    e.preventDefault();
    redraw();
  });
}

/** Renders the current state at a format's full size and downloads it as a PNG. */
function exportPng(format) {
  const { w, h } = FORMATS[format];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, {});
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say(`Saved vice-coast-cover-${w}x${h}.png`);
  }, 'image/png');
}

function wireExports() {
  document.getElementById('export-landscape').addEventListener('click', () => exportPng('landscape'));
  document.getElementById('export-portrait').addEventListener('click', () => exportPng('portrait'));
  document.getElementById('export-square').addEventListener('click', () => exportPng('square'));
}

/** Applies a ?shot= scene over the defaults: samples in the named order, then every named knob. */
function applyShot(scene) {
  document.body.classList.add(shotBodyClass(scene.shot));
  if (scene.format && FORMATS[scene.format]) {
    state.format = scene.format;
    canvas.width = FORMATS[scene.format].w;
    canvas.height = FORMATS[scene.format].h;
    markOn('formats', 'format', scene.format);
  }
  if (scene.template && TEMPLATES[scene.template]) {
    state.template = scene.template;
    markOn('templates', 'template', scene.template);
  }
  if (scene.grade) {
    state.grade = scene.grade;
    markOn('grades', 'grade', scene.grade);
  }
  for (const key of ['title', 'subtitle', 'tagline']) {
    if (scene[key] !== undefined) {
      state[key] = scene[key];
      document.getElementById(key).value = scene[key];
    }
  }
  if (scene.border) setBorderSilent(scene.border);
  if (scene.borderWidth) {
    state.borderWidth = Number(scene.borderWidth);
    document.getElementById('border-width').value = scene.borderWidth;
  }
  if (scene.titleSize) {
    state.titleSize = Number(scene.titleSize);
    document.getElementById('title-size').value = scene.titleSize;
  }
  if (scene.panel !== undefined) selected = clamp(Number(scene.panel) || 0, 0, state.panels.length - 1);
  if (scene.stickers) {
    for (const key of Object.keys(state.stickers)) state.stickers[key] = scene.stickers.includes(key);
    for (const [id, key] of [['st-stars', 'stars'], ['st-burst', 'burst'], ['st-rating', 'rating'], ['st-palm', 'palm']]) {
      document.getElementById(id).checked = state.stickers[key];
    }
  }
}

function setBorderSilent(color) {
  state.borderColor = color;
  document.getElementById('border-white').classList.toggle('on', color === 'white');
  document.getElementById('border-black').classList.toggle('on', color === 'black');
}

/** Boots the studio: controls, the built-in samples in order, the default Hero 5 spread, any shot scene. */
async function init() {
  wireControls();
  wirePanelEditing();
  wireKeys();
  wireExports();
  const scene = readShot(new URLSearchParams(location.search));
  const wanted = scene?.photos?.length
    ? SAMPLES.filter(([name]) => scene.photos.includes(name)).sort((a, b) => scene.photos.indexOf(a[0]) - scene.photos.indexOf(b[0]))
    : SAMPLES;
  for (const [name, label] of wanted) {
    try {
      state.photos.push({ img: await loadImage(`samples/${name}.jpg`), name: label });
    } catch { /* a missing sample never blocks the studio */ }
  }
  buildSampleStrip();
  spread();
  if (scene) applyShot(scene);
  redraw();
  if (scene) requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

init();
