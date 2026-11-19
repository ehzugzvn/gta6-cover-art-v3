// Fixed scenes for screenshots: ?shot=cover shows one exported-style cover filling the window;
// ?shot=editor shows the studio with a composed cover loaded. Every knob of the editor can be set
// from the query (format, template, grade, title, subtitle, tagline, photos, border) so a screenshot
// is exactly the scene it names. main.js applies the scene and sets window.__shotReady once painted.

const KEYS = ['format', 'template', 'grade', 'title', 'subtitle', 'tagline', 'border', 'borderWidth', 'titleSize', 'panel'];

/** The scene a ?shot= query describes, or null when this is a normal visit. */
export function readShot(query) {
  const shot = query.get('shot');
  if (!shot) return null;
  const scene = { shot };
  for (const key of KEYS) {
    const value = query.get(key);
    if (value !== null) scene[key] = value;
  }
  const photos = query.get('photos');
  if (photos) scene.photos = photos.split(',').map((s) => s.trim()).filter(Boolean);
  const stickers = query.get('stickers');
  if (stickers !== null) scene.stickers = stickers.split(',').map((s) => s.trim());
  return scene;
}

/** The body class that frames a shot: the cover alone, or the full editor. */
export function shotBodyClass(shot) {
  return shot === 'cover' ? 'shot-cover' : 'shot-editor';
}
