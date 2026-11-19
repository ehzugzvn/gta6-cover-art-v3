// Vice Coast Cover Press — the cover renderer.
// Pure canvas work: layout templates cut the frame into panels, each panel holds one photo with its own
// crop position and zoom, a colour grade is applied per panel, and bold lettering plus original sticker
// art are drawn on top. No Rockstar artwork, logos or fonts anywhere: every mark here is drawn from paths.

/** The four layout templates, as panel polygons in unit space (x and y in 0..1), in reading order. */
export const TEMPLATES = {
  hero5: {
    label: 'Hero 5',
    panels: [
      [[0, 0], [0.56, 0], [0.56, 1], [0, 1]],
      [[0.56, 0], [0.78, 0], [0.78, 0.5], [0.56, 0.5]],
      [[0.78, 0], [1, 0], [1, 0.5], [0.78, 0.5]],
      [[0.56, 0.5], [0.78, 0.5], [0.78, 1], [0.56, 1]],
      [[0.78, 0.5], [1, 0.5], [1, 1], [0.78, 1]],
    ],
  },
  slash4: {
    label: 'Slash 4',
    panels: [
      [[0, 0], [0.66, 0], [0.54, 0.58], [0, 0.58]],
      [[0.66, 0], [1, 0], [1, 0.58], [0.54, 0.58]],
      [[0, 0.58], [0.54, 0.58], [0.42, 1], [0, 1]],
      [[0.54, 0.58], [1, 0.58], [1, 1], [0.42, 1]],
    ],
  },
  grid6: {
    label: 'Grid 6',
    panels: [
      [[0, 0], [1 / 3, 0], [1 / 3, 0.5], [0, 0.5]],
      [[1 / 3, 0], [2 / 3, 0], [2 / 3, 0.5], [1 / 3, 0.5]],
      [[2 / 3, 0], [1, 0], [1, 0.5], [2 / 3, 0.5]],
      [[0, 0.5], [1 / 3, 0.5], [1 / 3, 1], [0, 1]],
      [[1 / 3, 0.5], [2 / 3, 0.5], [2 / 3, 1], [1 / 3, 1]],
      [[2 / 3, 0.5], [1, 0.5], [1, 1], [2 / 3, 1]],
    ],
  },
  duo: {
    label: 'Duo',
    panels: [
      [[0, 0], [0.5, 0], [0.5, 1], [0, 1]],
      [[0.5, 0], [1, 0], [1, 1], [0.5, 1]],
    ],
  },
};

/** Colour grades: a canvas filter string plus an overlay painter keyed by name in GRADE_OVERLAYS. */
export const GRADES = {
  sunset: { label: 'Sunset Vice', filter: 'saturate(1.38) contrast(1.09) brightness(1.04)' },
  neon: { label: 'Neon Nights', filter: 'saturate(1.55) contrast(1.16) brightness(0.97)' },
  golden: { label: 'Golden Hour', filter: 'saturate(1.22) sepia(0.34) contrast(1.06) brightness(1.07)' },
  comic: { label: 'Comic Pop', filter: 'saturate(1.75) contrast(1.32) brightness(1.06)' },
  noir: { label: 'Noir', filter: 'grayscale(1) contrast(1.22) brightness(1.03)' },
};

/** The three export formats the studio ships. */
export const FORMATS = {
  landscape: { label: 'Landscape 1920 × 1080', w: 1920, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
};

/** A fresh per-panel placement: which photo, its crop offset (-1..1) and its zoom (1..3). */
export function blankPanel(photo) {
  return { photo, ox: 0, oy: 0, zoom: 1 };
}

/** The panels of a template scaled to a w × h frame, as pixel polygons. */
export function panelPolys(template, w, h) {
  return TEMPLATES[template].panels.map((poly) => poly.map(([x, y]) => [x * w, y * h]));
}

/** The axis-aligned box a polygon sits in. */
function polyBox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Whether a point falls inside a polygon (ray cast). Used by the editor's drag handling. */
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** The grade's colour wash, painted inside the current clip. */
function gradeOverlay(ctx, grade, box) {
  const { x, y, w, h } = box;
  let g;
  if (grade === 'sunset') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255, 140, 40, 0.16)');
    g.addColorStop(0.55, 'rgba(255, 70, 110, 0.10)');
    g.addColorStop(1, 'rgba(190, 30, 130, 0.34)');
  } else if (grade === 'neon') {
    g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(0, 220, 255, 0.20)');
    g.addColorStop(0.5, 'rgba(60, 0, 120, 0.08)');
    g.addColorStop(1, 'rgba(255, 0, 150, 0.30)');
  } else if (grade === 'golden') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255, 210, 90, 0.20)');
    g.addColorStop(1, 'rgba(200, 90, 20, 0.22)');
  } else if (grade === 'comic') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255, 235, 0, 0.10)');
    g.addColorStop(1, 'rgba(255, 40, 140, 0.16)');
  } else {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(30, 30, 40, 0.10)');
    g.addColorStop(1, 'rgba(255, 150, 50, 0.26)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** One panel: its photo cover-fitted into the polygon's box, graded, washed, clipped to the polygon. */
function drawPanel(ctx, state, poly, panel) {
  const box = polyBox(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  ctx.fillStyle = '#241430';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const img = panel ? state.photos[panel.photo]?.img : null;
  if (img) {
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * (panel.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const spareX = Math.max(0, pw - box.w);
    const spareY = Math.max(0, ph - box.h);
    const dx = box.x + (box.w - pw) / 2 + (panel.ox || 0) * (spareX / 2);
    const dy = box.y + (box.h - ph) / 2 + (panel.oy || 0) * (spareY / 2);
    ctx.filter = GRADES[state.grade].filter;
    ctx.drawImage(img, dx, dy, pw, ph);
    ctx.filter = 'none';
  }
  gradeOverlay(ctx, state.grade, box);
  ctx.restore();
}

/** A five-point star path centred on (cx, cy). */
function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A spiky burst badge path centred on (cx, cy). */
function burst(ctx, cx, cy, r) {
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.8;
    const a = (i * Math.PI) / spikes;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** An original palm-tree stamp: a curved trunk and five fronds inside a ring. */
function palmStamp(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = '#19d3c5';
  ctx.fillStyle = 'rgba(10, 40, 50, 0.55)';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#aef7ee';
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  ctx.beginPath(); // trunk
  ctx.moveTo(cx - r * 0.08, cy + r * 0.62);
  ctx.quadraticCurveTo(cx + r * 0.02, cy, cx + r * 0.16, cy - r * 0.34);
  ctx.stroke();
  for (const a of [-2.75, -2.2, -1.65, -1.05, -0.45]) { // fronds
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.16, cy - r * 0.34);
    ctx.quadraticCurveTo(
      cx + r * 0.16 + Math.cos(a) * r * 0.42, cy - r * 0.34 + Math.sin(a) * r * 0.42 - r * 0.14,
      cx + r * 0.16 + Math.cos(a) * r * 0.72, cy - r * 0.34 + Math.sin(a) * r * 0.62,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The toggleable stickers: wanted-style stars, the EST. 2026 burst, the rating box, the palm stamp.
 * Drawn in two layers: the bottom-corner pair (rating box, burst) goes UNDER the lettering so a wide
 * title stays fully legible, the top pair (stars, palm stamp) goes over everything.
 */
function drawStickers(ctx, state, w, h, layer) {
  const s = state.stickers;
  const u = Math.min(w, h);
  if (layer === 'under') {
    drawRating(ctx, state, w, h, u);
    drawBurst(ctx, state, w, h, u);
    return;
  }
  if (s.stars) {
    const r = u * 0.028;
    for (let i = 0; i < 5; i++) {
      const cx = w - u * 0.055 - i * r * 2.35;
      const cy = u * 0.062;
      star(ctx, cx, cy, r);
      ctx.fillStyle = '#ffd83d';
      ctx.fill();
      ctx.lineWidth = r * 0.18;
      ctx.strokeStyle = '#20130a';
      ctx.stroke();
    }
  }
  if (s.palm) {
    palmStamp(ctx, w - u * 0.075, u * 0.19, u * 0.052);
  }
}

/** The original rating box, bottom left: RATED V over VICE COAST, its headline shrunk to fit the box. */
function drawRating(ctx, state, w, h, u) {
  if (!state.stickers.rating) return;
  const bw = u * 0.185;
  const bh = u * 0.128;
  const x = u * 0.035;
  const y = h - stateBarH(state, w, h) - bh - u * 0.035;
  ctx.fillStyle = 'rgba(8, 8, 12, 0.92)';
  ctx.fillRect(x, y, bw, bh);
  ctx.lineWidth = u * 0.006;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  let rs = bh * 0.4;
  ctx.font = `900 ${rs}px Impact, 'Arial Black', sans-serif`;
  while (ctx.measureText('RATED V').width > bw * 0.88 && rs > 8) {
    rs -= 2;
    ctx.font = `900 ${rs}px Impact, 'Arial Black', sans-serif`;
  }
  ctx.fillText('RATED V', x + bw / 2, y + bh * 0.48);
  ctx.font = `700 ${bh * 0.2}px 'Arial Narrow', Arial, sans-serif`;
  ctx.fillStyle = '#ffd83d';
  ctx.fillText('VICE COAST', x + bw / 2, y + bh * 0.78);
}

/** The EST. 2026 burst badge, bottom right. */
function drawBurst(ctx, state, w, h, u) {
  if (!state.stickers.burst) return;
  const r = u * 0.085;
  const cx = w - r - u * 0.03;
  const cy = h - stateBarH(state, w, h) - r - u * 0.03;
  burst(ctx, cx, cy, r);
  ctx.fillStyle = '#ff2e88';
  ctx.fill();
  ctx.lineWidth = u * 0.005;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `900 ${r * 0.42}px Impact, 'Arial Black', sans-serif`;
  ctx.fillText('EST.', cx, cy - r * 0.02);
  ctx.fillText('2026', cx, cy + r * 0.42);
}

/** The tagline bar's height: lettering and stickers both leave room for it. */
function stateBarH(state, w, h) {
  return state.tagline && state.tagline.trim() ? h * 0.075 : 0;
}

/** Kicker pill, script subtitle, the giant gradient title and the tagline bar. */
function drawLettering(ctx, state, w, h) {
  const u = Math.min(w, h);
  const barH = stateBarH(state, w, h);
  // Kicker badge, top left.
  ctx.save();
  ctx.font = `800 ${u * 0.026}px 'Arial Narrow', Arial, sans-serif`;
  const kick = '★ COVER PRESS ★';
  const kw = ctx.measureText(kick).width + u * 0.045;
  const kh = u * 0.052;
  const kx = u * 0.035;
  const ky = u * 0.035;
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath();
  ctx.roundRect(kx, ky, kw, kh, kh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kick, kx + kw / 2, ky + kh / 2 + 1);
  ctx.restore();

  const title = (state.title || '').trim().toUpperCase();
  const base = h - barH;
  if (title) {
    let size = u * 0.155 * (state.titleSize || 1);
    const stack = `900 ${size}px Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif`;
    ctx.font = stack;
    while (ctx.measureText(title).width > w * 0.94 && size > 14) {
      size -= 3;
      ctx.font = `900 ${size}px Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif`;
    }
    const ty = base - u * 0.035;
    ctx.save();
    ctx.translate(w / 2, ty);
    ctx.scale(0.88, 1); // condense the lettering, poster style
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#180826';
    ctx.strokeText(title, 0, 0);
    const g = ctx.createLinearGradient(0, -size, 0, size * 0.25);
    g.addColorStop(0, '#fff6b0');
    g.addColorStop(0.45, '#ffb03a');
    g.addColorStop(0.8, '#ff4e8a');
    g.addColorStop(1, '#c81cff');
    ctx.fillStyle = g;
    ctx.fillText(title, 0, 0);
    ctx.lineWidth = size * 0.02;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(title, 0, 0);
    ctx.restore();
    // Script subtitle, overlapping the title's top right.
    const sub = (state.subtitle || '').trim();
    if (sub) {
      ctx.save();
      const ss = size * 0.36;
      ctx.font = `italic 700 ${ss}px 'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive`;
      ctx.translate(w * 0.72, ty - size * 0.98);
      ctx.rotate(-0.05);
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
      ctx.shadowBlur = ss * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, 0, 0);
      ctx.restore();
    }
  }
  if (barH > 0) {
    ctx.fillStyle = 'rgba(10, 6, 20, 0.88)';
    ctx.fillRect(0, h - barH, w, barH);
    ctx.fillStyle = '#ffd83d';
    ctx.fillRect(0, h - barH, w, Math.max(2, h * 0.006));
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let ts = barH * 0.44;
    ctx.font = `800 ${ts}px 'Arial Narrow', Arial, sans-serif`;
    const tag = state.tagline.trim().toUpperCase();
    while (ctx.measureText(tag).width > w * 0.92 && ts > 10) {
      ts -= 2;
      ctx.font = `800 ${ts}px 'Arial Narrow', Arial, sans-serif`;
    }
    try { ctx.letterSpacing = `${Math.round(ts * 0.32)}px`; } catch { /* older engines */ }
    ctx.fillText(tag, w / 2, h - barH / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }
}

/**
 * Draws the whole cover onto a canvas at the canvas's own size.
 * state: { photos, panels, template, grade, borderColor, borderWidth, title, subtitle, tagline,
 *          titleSize, stickers: { stars, burst, rating, palm } }
 * opts.editor adds the selected-panel highlight (never on exports).
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = state.borderColor === 'black' ? '#0a0a0e' : '#f5f2ea';
  ctx.fillRect(0, 0, w, h);
  const polys = panelPolys(state.template, w, h);
  polys.forEach((poly, i) => drawPanel(ctx, state, poly, state.panels[i]));
  // Panel borders: stroke every polygon so the seams and the outer frame read as one border.
  const bw = Math.max(0, state.borderWidth || 0);
  if (bw > 0) {
    ctx.lineWidth = bw;
    ctx.strokeStyle = state.borderColor === 'black' ? '#0a0a0e' : '#f5f2ea';
    ctx.lineJoin = 'round';
    for (const poly of polys) {
      tracePoly(ctx, poly);
      ctx.stroke();
    }
  }
  // A soft vignette over the panels only, so the poster edges fall off like a printed cover.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, 'rgba(10, 2, 20, 0)');
  vg.addColorStop(1, 'rgba(10, 2, 20, 0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  drawStickers(ctx, state, w, h, 'under');
  drawLettering(ctx, state, w, h);
  drawStickers(ctx, state, w, h, 'over');
  if (opts.editor && opts.selected >= 0 && polys[opts.selected]) {
    tracePoly(ctx, polys[opts.selected]);
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.strokeStyle = '#19d3c5';
    ctx.setLineDash([18, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  return polys;
}
