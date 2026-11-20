import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #5 : CATHÉDRALE NOTRE-DAME DE PARIS (ÉCHELLE RÉELLE 1:1)
 * Haute fidélité gothique & restauration 2024 sur l'Île de la Cité
 * Position GPS : 48.8530° N, 2.3499° E -> (+358, +0.45, +1156)
 * Axes locaux :
 *   -X = Ouest (Façade, Tours 69 m, Parvis Jean-Paul-II & Point Zéro)
 *   +X = Est (Chœur, Chevet à arcs-boutants & Square Jean-XXIII)
 *   -Z = Nord (Rose Nord, Hôtel-Dieu & Bras Marie)
 *   +Z = Sud (Rose Sud, Petit Bras & Rive Gauche)
 * ============================================================================
 */

export const NOTRE_DAME_WORLD_POS = new THREE.Vector3(358, 0.45, 1156);
export const NOTRE_DAME_ROT_Y = -0.6727;

const COS_R = Math.cos(NOTRE_DAME_ROT_Y);
const SIN_R = Math.sin(NOTRE_DAME_ROT_Y);

export function notreDameLocalToWorld(lx, ly, lz) {
  return new THREE.Vector3(
    NOTRE_DAME_WORLD_POS.x + lx * COS_R + lz * SIN_R,
    NOTRE_DAME_WORLD_POS.y + ly,
    NOTRE_DAME_WORLD_POS.z - lx * SIN_R + lz * COS_R
  );
}

export function worldToNotreDameLocal(wx, wz) {
  const dx = wx - NOTRE_DAME_WORLD_POS.x;
  const dz = wz - NOTRE_DAME_WORLD_POS.z;
  return {
    lx: dx * COS_R - dz * SIN_R,
    lz: dx * SIN_R + dz * COS_R,
  };
}

// ============================================================================
// TEXTURES PROCÉDURALES GOTHIQUES & RESTAURATION 2024 (CanvasTexture HD)
// ============================================================================

function createLimestoneTexture({ warmBright = false } = {}) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = warmBright ? '#f3ebd8' : '#dfd2b8';
  ctx.fillRect(0, 0, size, size);

  const rowH = 22;
  for (let y = 0; y < size; y += rowH) {
    const shade = ((y * 13) % 14) - 7;
    const baseR = warmBright ? 242 : 221;
    const baseG = warmBright ? 233 : 208;
    const baseB = warmBright ? 214 : 182;
    ctx.fillStyle = `rgba(${baseR + shade}, ${baseG + shade}, ${baseB + shade}, 0.52)`;
    ctx.fillRect(0, y, size, rowH - 1);
    ctx.fillStyle = warmBright ? 'rgba(138, 124, 98, 0.16)' : 'rgba(104, 92, 72, 0.25)';
    ctx.fillRect(0, y + rowH - 1, size, 1.3);
  }

  ctx.strokeStyle = warmBright ? 'rgba(140, 126, 102, 0.14)' : 'rgba(98, 86, 68, 0.2)';
  ctx.lineWidth = 1.1;
  for (let row = 0; row < Math.ceil(size / rowH); row++) {
    const y0 = row * rowH;
    const off = (row % 2) * 32;
    for (let x = off; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + rowH);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 4200; i++) {
    const x = (i * 197) % size;
    const y = (i * 313) % size;
    ctx.fillStyle = i % 2 === 0
      ? (warmBright ? 'rgba(255,252,244,0.1)' : 'rgba(252,246,232,0.07)')
      : (warmBright ? 'rgba(128,114,90,0.05)' : 'rgba(72,62,48,0.08)');
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createLeadRoofTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#5f6972';
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 16) {
    const tone = ((x * 7) % 12) - 6;
    ctx.fillStyle = `rgb(${94 + tone}, ${104 + tone}, ${114 + tone})`;
    ctx.fillRect(x, 0, 14, size);
    ctx.fillStyle = '#3d454d';
    ctx.fillRect(x + 14, 0, 2, size);
    ctx.fillStyle = 'rgba(218, 228, 236, 0.24)';
    ctx.fillRect(x + 13, 0, 1, size);
  }

  for (let y = 0; y < size; y += 36) {
    ctx.fillStyle = 'rgba(42, 48, 54, 0.32)';
    ctx.fillRect(0, y, size, 1.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRoseWindowTexture(variant = 'west') {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;
  const R = size * 0.475;

  ctx.fillStyle = '#12151e';
  ctx.fillRect(0, 0, size, size);

  const palettes = {
    west: ['#193b88', '#8f1b32', '#c88c28', '#1d6952', '#4c2c7a', '#245d9c'],
    north: ['#163580', '#482474', '#1d6a98', '#8a1b44', '#2c8a9e', '#c08b32'],
    south: ['#941a32', '#c87e22', '#1c428a', '#7c1858', '#d4a63a', '#215f58'],
  };
  const pal = palettes[variant] || palettes.west;
  const sectors = variant === 'west' ? 12 : 24;

  const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, R);
  bg.addColorStop(0, '#ffd878');
  bg.addColorStop(0.14, pal[2]);
  bg.addColorStop(0.42, pal[0]);
  bg.addColorStop(0.75, pal[1]);
  bg.addColorStop(1, '#10131c');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(14, 16, 22, 0.55)';
  ctx.lineWidth = 2;
  for (let r = R * 0.14; r < R * 0.94; r += R * 0.048) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < sectors * 3; k++) {
    const ka = (k / (sectors * 3)) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ka) * R * 0.12, cy + Math.sin(ka) * R * 0.12);
    ctx.lineTo(cx + Math.cos(ka) * R * 0.94, cy + Math.sin(ka) * R * 0.94);
    ctx.stroke();
  }

  for (let s = 0; s < sectors; s++) {
    const a0 = (s / sectors) * Math.PI * 2;
    const a1 = ((s + 1) / sectors) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const da = a1 - a0;

    ctx.fillStyle = pal[s % pal.length];
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.43, a0 + da * 0.08, a1 - da * 0.08);
    ctx.arc(cx, cy, R * 0.17, a1 - da * 0.12, a0 + da * 0.12, true);
    ctx.closePath();
    ctx.fill();

    const mr = R * 0.54;
    const mx1 = cx + Math.cos(am) * mr;
    const my1 = cy + Math.sin(am) * mr;
    ctx.fillStyle = pal[(s + 2) % pal.length];
    ctx.beginPath();
    ctx.arc(mx1, my1, R * (variant === 'west' ? 0.072 : 0.048), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#181a22';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = pal[(s + 4) % pal.length];
    ctx.beginPath();
    ctx.arc(mx1, my1, R * (variant === 'west' ? 0.032 : 0.022), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal[(s + 1) % pal.length];
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.84, a0 + da * 0.1, a1 - da * 0.1);
    ctx.arc(cx, cy, R * 0.65, a1 - da * 0.12, a0 + da * 0.12, true);
    ctx.closePath();
    ctx.fill();

    const ox = cx + Math.cos(am) * R * 0.88;
    const oy = cy + Math.sin(am) * R * 0.88;
    ctx.fillStyle = pal[(s + 3) % pal.length];
    ctx.beginPath();
    ctx.arc(ox, oy, R * (variant === 'west' ? 0.056 : 0.036), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#181a22';
    ctx.lineWidth = 4;
    ctx.stroke();

    const ax = cx + Math.cos(a0) * R * 0.91;
    const ay = cy + Math.sin(a0) * R * 0.91;
    ctx.fillStyle = '#c89b3c';
    ctx.beginPath();
    ctx.arc(ax, ay, R * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#171a22';
  [
    [0.16, 10],
    [0.43, 12],
    [0.64, 12],
    [0.83, 10],
    [0.95, 16],
  ].forEach(([rf, lw]) => {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, R * rf, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.lineWidth = variant === 'west' ? 11 : 7;
  for (let s = 0; s < sectors; s++) {
    const a = (s / sectors) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.14, cy + Math.sin(a) * R * 0.14);
    ctx.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
    ctx.stroke();
  }

  ctx.fillStyle = '#c98e2b';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.125, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal[1];
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#161820';
  ctx.lineWidth = 8;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGothicLancetTexture() {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Fond profond bleu de Chartres & bordure pierre sombre
  ctx.fillStyle = '#0f1b3d';
  ctx.fillRect(0, 0, w, h);

  const jewelPal = ['#16398c', '#8a1b34', '#c28b2c', '#1c6352', '#4c2b78', '#22569a'];
  const drawLancetStrip = (lx, lw, seedOffset) => {
    const topY = 230;
    const bgGrad = ctx.createLinearGradient(lx, topY, lx, h);
    bgGrad.addColorStop(0, '#183c92');
    bgGrad.addColorStop(0.5, '#122962');
    bgGrad.addColorStop(1, '#1a326e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(lx, topY, lw, h - topY);

    ctx.fillStyle = '#7c1d34';
    ctx.fillRect(lx + 4, topY, 16, h - topY);
    ctx.fillRect(lx + lw - 20, topY, 16, h - topY);
    ctx.fillStyle = '#bf8b2c';
    for (let y = topY + 12; y < h - 10; y += 28) {
      ctx.fillRect(lx + 7, y, 10, 10);
      ctx.fillRect(lx + lw - 17, y, 10, 10);
    }

    // Réseau de losanges de plomb (grilles obliques authentiques)
    ctx.strokeStyle = 'rgba(14, 16, 22, 0.72)';
    ctx.lineWidth = 2.4;
    for (let d = -h; d < h + lw; d += 22) {
      ctx.beginPath();
      ctx.moveTo(lx, topY + d);
      ctx.lineTo(lx + lw, topY + d + lw);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + lw, topY + d);
      ctx.lineTo(lx, topY + d + lw);
      ctx.stroke();
    }

    // 5 médaillons gothiques quadrilobés fins par lancette (sans anneaux vifs « cible »)
    for (let m = 0; m < 5; m++) {
      const cy = topY + 76 + m * 144;
      const cx = lx + lw * 0.5;
      const rad = lw * 0.22;
      const lobeOff = rad * 0.62;

      [[-lobeOff, 0], [lobeOff, 0], [0, -lobeOff], [0, lobeOff]].forEach(([ox, oy], li) => {
        ctx.fillStyle = jewelPal[(m + seedOffset + li) % jewelPal.length];
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, rad * 0.58, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#141720';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      });

      // Petit losange central serti au plomb sombre
      ctx.fillStyle = jewelPal[(m + seedOffset + 2) % jewelPal.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy - rad * 0.42);
      ctx.lineTo(cx + rad * 0.42, cy);
      ctx.lineTo(cx, cy + rad * 0.42);
      ctx.lineTo(cx - rad * 0.42, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#141720';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  };

  drawLancetStrip(22, 212, 0);
  drawLancetStrip(278, 212, 3);

  // Zone supérieure : rose sexlobée & écoinçons (y = 0..235)
  ctx.fillStyle = '#151820';
  ctx.fillRect(0, 0, w, 232);
  const rx = w * 0.5;
  const ry = 114;
  ctx.fillStyle = '#16398c';
  ctx.beginPath();
  ctx.arc(rx, ry, 86, 0, Math.PI * 2);
  ctx.fill();
  for (let p = 0; p < 8; p++) {
    const pa = (p / 8) * Math.PI * 2;
    ctx.fillStyle = jewelPal[p % jewelPal.length];
    ctx.beginPath();
    ctx.arc(rx + Math.cos(pa) * 44, ry + Math.sin(pa) * 44, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#151820';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.fillStyle = '#c8922e';
  ctx.beginPath();
  ctx.arc(rx, ry, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#151820';
  ctx.lineWidth = 6;
  ctx.stroke();

  [128, 384].forEach((tx, idx) => {
    ctx.fillStyle = jewelPal[idx * 2 + 1];
    ctx.beginPath();
    ctx.moveTo(tx, 118);
    ctx.lineTo(tx - 82, 232);
    ctx.lineTo(tx + 82, 232);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#151820';
    ctx.lineWidth = 8;
    ctx.stroke();
  });

  ctx.fillStyle = '#151820';
  ctx.fillRect(0, 0, 22, h);
  ctx.fillRect(w - 22, 0, 22, h);
  ctx.fillRect(w * 0.5 - 22, 210, 44, h - 210);
  for (let y = 232; y < h; y += 72) {
    ctx.fillRect(0, y, w, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGothicExteriorGrisailleTexture() {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Verre ancien sombre et grisaille vue de l'extérieur en plein jour
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#131924');
  bg.addColorStop(0.5, '#1b2434');
  bg.addColorStop(1, '#141a26');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const muted = ['#21304d', '#293954', '#33283d', '#233b3b', '#3b3328', '#1d273b'];
  const drawBayGrisaille = (lx, lw, offset) => {
    const topY = 230;
    const step = 28;
    for (let y = topY; y < h; y += step) {
      for (let x = lx; x < lx + lw; x += step) {
        const idx = Math.floor(x / step + y / step + offset);
        ctx.fillStyle = muted[idx % muted.length];
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      }
    }
    for (let m = 0; m < 5; m++) {
      const cy = topY + 76 + m * 144;
      const cx = lx + lw * 0.5;
      ctx.fillStyle = m % 2 === 0 ? '#1b356e' : '#5e1b2c';
      ctx.beginPath();
      ctx.arc(cx, cy, lw * 0.23, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0e1016';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#735828';
      ctx.beginPath();
      ctx.arc(cx, cy, lw * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#0e1016';
    ctx.lineWidth = 2.6;
    for (let d = -h; d < h + lw; d += 22) {
      ctx.beginPath();
      ctx.moveTo(lx, topY + d);
      ctx.lineTo(lx + lw, topY + d + lw);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + lw, topY + d);
      ctx.lineTo(lx, topY + d + lw);
      ctx.stroke();
    }
  };

  drawBayGrisaille(24, 210, 0);
  drawBayGrisaille(278, 210, 2);

  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, w, 232);
  ctx.fillStyle = '#1d325e';
  ctx.beginPath();
  ctx.arc(w * 0.5, 114, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d323e';
  ctx.lineWidth = 10;
  ctx.stroke();
  for (let p = 0; p < 8; p++) {
    const pa = (p / 8) * Math.PI * 2;
    ctx.fillStyle = p % 2 === 0 ? '#5c1d2d' : '#1b3869';
    ctx.beginPath();
    ctx.arc(w * 0.5 + Math.cos(pa) * 42, 114 + Math.sin(pa) * 42, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#cfc2a8';
  ctx.fillRect(w * 0.5 - 18, 200, 36, h - 200);
  ctx.fillStyle = '#111319';
  ctx.fillRect(0, 0, 22, h);
  ctx.fillRect(w - 22, 0, 22, h);
  for (let y = 232; y < h; y += 72) {
    ctx.fillRect(0, y, w, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createPortalTympanumTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ddd0b7';
  ctx.fillRect(0, 0, w, h);

  const bands = [76, 148, 218];
  bands.forEach((by, bi) => {
    ctx.fillStyle = '#b9aa8e';
    ctx.fillRect(14, by - 4, w - 28, 7);
    const count = 9 - bi * 2;
    for (let i = 0; i < count; i++) {
      const fx = 52 + (i / Math.max(1, count - 1)) * (w - 104);
      ctx.fillStyle = i % 2 === 0 ? '#efe3cb' : '#d2c2a3';
      ctx.fillRect(fx - 9, by - 48, 18, 42);
      ctx.beginPath();
      ctx.arc(fx, by - 54, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = '#e7d8ba';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 62, 34, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a59578';
  ctx.lineWidth = 4;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createClotureChoeurTexture() {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e2d5bc';
  ctx.fillRect(0, 0, w, h);

  const panelColors = ['#203b6e', '#7e222f', '#284a3d', '#6e4e22'];
  for (let p = 0; p < 12; p++) {
    const px = 16 + p * 83;
    ctx.fillStyle = panelColors[p % panelColors.length];
    ctx.fillRect(px, 34, 74, 152);
    for (let f = 0; f < 3; f++) {
      ctx.fillStyle = f === 1 ? '#e5c16c' : '#f4ebda';
      ctx.fillRect(px + 14 + f * 18, 86, 12, 72);
      ctx.beginPath();
      ctx.arc(px + 20 + f * 18, 76, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#c89b3c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px - 2, 42);
    ctx.lineTo(px + 37, 10);
    ctx.lineTo(px + 76, 42);
    ctx.stroke();
  }
  ctx.fillStyle = '#b9a88b';
  ctx.fillRect(0, 190, w, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createOrganPipesTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#2d1c10';
  ctx.fillRect(0, 0, w, h);

  // Buffet de chêne sculpté
  ctx.fillStyle = '#472c18';
  ctx.fillRect(6, 12, w - 12, h - 18);

  // Tuyaux d'étain brillants répartis en 5 tourelles & plates-faces
  const numPipes = 58;
  const pipeW = (w - 28) / numPipes;
  for (let i = 0; i < numPipes; i++) {
    const px = 14 + i * pipeW;
    const norm = i / (numPipes - 1);
    const wave =
      Math.abs(Math.sin(norm * Math.PI * 3.0)) * 42 +
      (norm < 0.14 || norm > 0.86 || Math.abs(norm - 0.5) < 0.09 ? 36 : 0);
    const topY = 14 + Math.max(0, 74 - wave);
    const g = ctx.createLinearGradient(px, 0, px + pipeW, 0);
    g.addColorStop(0, '#7c828a');
    g.addColorStop(0.45, '#e8eef5');
    g.addColorStop(1, '#646a72');
    ctx.fillStyle = g;
    ctx.fillRect(px + 1, topY, Math.max(2, pipeW - 2), h - 28 - topY);
  }

  // Boiserie inférieure
  ctx.fillStyle = '#3a2313';
  ctx.fillRect(10, h - 32, w - 20, 26);
  ctx.strokeStyle = '#c89b44';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 12, w - 20, h - 20);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMarbleCheckerTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e7dfd0';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3a3b40';
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);

  // Légères veines de marbre
  ctx.strokeStyle = 'rgba(200, 190, 172, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 41) % size, 0);
    ctx.lineTo(((i * 67) % size), size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createParvisStoneTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d3cab7';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    for (let x = 0; x < size; x += 64) {
      const shade = ((x * 5 + y * 9) % 16) - 8;
      ctx.fillStyle = `rgb(${210 + shade}, ${201 + shade}, ${182 + shade})`;
      ctx.fillRect(x + ((y / 32) % 2) * 16, y, 62, 30);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHotelDieuTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e8deca';
  ctx.fillRect(0, 0, size, size);

  // Rappel CanvasTexture flipY = true : y=0 = sommet / corniche, y=size = rez-de-chaussée
  ctx.fillStyle = '#c8bca6';
  ctx.fillRect(0, 0, size, 24);
  ctx.fillStyle = '#bdb09a';
  ctx.fillRect(0, size - 95, size, 95);

  const cols = 6;
  const stepX = size / cols;
  for (let i = 0; i < cols; i++) {
    const cx = (i + 0.5) * stepX;
    // Étage supérieur & 1er étage
    [68, 210].forEach((wy) => {
      ctx.fillStyle = '#2d3b4d';
      ctx.beginPath();
      ctx.arc(cx, wy + 20, 18, Math.PI, 0);
      ctx.lineTo(cx + 18, wy + 82);
      ctx.lineTo(cx - 18, wy + 82);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b9ab92';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    // Arcades rez-de-chaussée
    ctx.fillStyle = '#232833';
    ctx.beginPath();
    ctx.arc(cx, size - 56, 22, Math.PI, 0);
    ctx.lineTo(cx + 22, size - 4);
    ctx.lineTo(cx - 22, size - 4);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPointZeroTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#8b8a88';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#a49f96';
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#605c55';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Étoile des vents en bronze doré
  ctx.fillStyle = '#c89b3c';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 74 : 26;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7e6022';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// GÉOMÉTRIES EXTRUDÉES GOTHIQUES (Arcs brisés & Arcs-boutants sur mesure)
// ============================================================================

/**
 * Crée un mur rectangulaire percé d'un véritable arc brisé gothique (ogive).
 */
function createPointedArchGeometry(outerW, outerH, innerW, springY, apexY, depth) {
  const hw = outerW * 0.5;
  const iw = Math.min(innerW * 0.5, hw - 0.14);
  const sY = Math.max(0.05, Math.min(springY, outerH - 0.3));
  const aY = Math.min(Math.max(apexY, sY + 0.3), outerH - 0.14);

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, outerH);
  shape.lineTo(-hw, outerH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-iw, 0);
  hole.lineTo(iw, 0);
  hole.lineTo(iw, sY);
  hole.quadraticCurveTo(iw * 0.86, THREE.MathUtils.lerp(sY, aY, 0.72), 0, aY);
  hole.quadraticCurveTo(-iw * 0.86, THREE.MathUtils.lerp(sY, aY, 0.72), -iw, sY);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Crée un véritable arc-boutant incliné (Jean Ravy) entre culée externe (x=0) et nef (x=reach).
 */
function createFlyingButtressGeometry(reach, rise, thick, depth) {
  const shape = new THREE.Shape();
  const steps = 10;
  // Extrados incliné en pente rectiligne
  shape.moveTo(0, thick);
  shape.lineTo(reach, rise + thick);
  shape.lineTo(reach, rise);
  // Intrados courbé vers le bas
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = t * reach;
    const archCurve = Math.sin(t * Math.PI) * 1.45;
    const y = t * rise + archCurve - 0.35;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Crée un pignon triangulaire pointu gothique extrudé.
 */
function createGableGeometry(baseW, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-baseW * 0.5, 0);
  shape.lineTo(baseW * 0.5, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Crée un mur rectangulaire percé d'une baie circulaire exacte (pour rosaces).
 */
function createCircularRoseWallGeometry(outerW, outerH, radius, centerY, depth) {
  const hw = outerW * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, outerH);
  shape.lineTo(-hw, outerH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, centerY, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

// ============================================================================
// CONSTRUCTION PRINCIPALE DE LA CATHÉDRALE NOTRE-DAME DE PARIS (1:1)
// ============================================================================

export function buildNotreDameMonument(scene) {
  const root = new THREE.Group();
  root.name = 'Monument_NotreDame';
  root.position.copy(NOTRE_DAME_WORLD_POS);
  root.rotation.y = NOTRE_DAME_ROT_Y;
  scene.add(root);

  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'NotreDame_Exterior';
  root.add(exteriorGroup);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'NotreDame_Interior';
  root.add(interiorGroup);

  const envGroup = new THREE.Group();
  envGroup.name = 'NotreDame_Environment';
  root.add(envGroup);

  // --- MATÉRIAUX PARTAGÉS (optimisés mergeStaticGroupByMaterial) ---
  const texStoneExt = createLimestoneTexture({ warmBright: false });
  const texStoneInt = createLimestoneTexture({ warmBright: true });
  const texLeadRoof = createLeadRoofTexture();
  const texRoseWest = createRoseWindowTexture('west');
  const texRoseNorth = createRoseWindowTexture('north');
  const texRoseSouth = createRoseWindowTexture('south');
  const texLancet = createGothicLancetTexture();
  const texExtGrisaille = createGothicExteriorGrisailleTexture();
  const texPortalTympanum = createPortalTympanumTexture();
  const texClotureChoeur = createClotureChoeurTexture();
  const texOrgan = createOrganPipesTexture();
  const texMarbleFloor = createMarbleCheckerTexture();
  const texParvis = createParvisStoneTexture();
  const texHotelDieu = createHotelDieuTexture();
  const texPointZero = createPointZeroTexture();

  const matStoneExt = new THREE.MeshStandardMaterial({
    map: texStoneExt,
    color: 0xf2e7d0,
    roughness: 0.82,
    metalness: 0.02,
  });
  const matStoneSculpt = new THREE.MeshStandardMaterial({
    color: 0xf5ecda,
    roughness: 0.76,
    metalness: 0.03,
  });
  const matStoneDark = new THREE.MeshStandardMaterial({
    color: 0xd4c6ab,
    roughness: 0.86,
  });
  const matStoneInt = new THREE.MeshStandardMaterial({
    map: texStoneInt,
    color: 0xfbf5e6,
    roughness: 0.76,
    metalness: 0.02,
  });
  const matMarbleFloor = new THREE.MeshStandardMaterial({
    map: texMarbleFloor,
    color: 0xf4eee0,
    roughness: 0.44,
    metalness: 0.08,
  });
  const matMarbleWhite = new THREE.MeshStandardMaterial({
    color: 0xfbf8f2,
    roughness: 0.28,
    metalness: 0.05,
  });
  const matLeadRoof = new THREE.MeshStandardMaterial({
    map: texLeadRoof,
    color: 0x9aa4ae,
    roughness: 0.56,
    metalness: 0.34,
  });
  const matLeadDark = new THREE.MeshStandardMaterial({
    color: 0x454d55,
    roughness: 0.52,
    metalness: 0.42,
  });
  const matPatinaCopper = new THREE.MeshStandardMaterial({
    color: 0x5c8b78,
    roughness: 0.5,
    metalness: 0.38,
  });
  const matBronze = new THREE.MeshStandardMaterial({
    color: 0x3b3126,
    roughness: 0.46,
    metalness: 0.68,
  });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xe0b24e,
    emissive: new THREE.Color(0x503608),
    emissiveIntensity: 0.16,
    roughness: 0.24,
    metalness: 0.86,
  });
  const matOak = new THREE.MeshStandardMaterial({
    color: 0x5b3b22,
    roughness: 0.76,
  });
  const matOrgan = new THREE.MeshStandardMaterial({
    map: texOrgan,
    color: 0xf0e8da,
    roughness: 0.48,
    metalness: 0.25,
  });

  const matRoseWest = new THREE.MeshStandardMaterial({
    map: texRoseWest,
    emissiveMap: texRoseWest,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.22,
    roughness: 0.2,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });
  const matRoseNorth = new THREE.MeshStandardMaterial({
    map: texRoseNorth,
    emissiveMap: texRoseNorth,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.24,
    roughness: 0.2,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });
  const matRoseSouth = new THREE.MeshStandardMaterial({
    map: texRoseSouth,
    emissiveMap: texRoseSouth,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.24,
    roughness: 0.2,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });
  const matLancetGlass = new THREE.MeshStandardMaterial({
    map: texLancet,
    emissiveMap: texLancet,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.26,
    roughness: 0.2,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  const matWindowExt = new THREE.MeshStandardMaterial({
    map: texExtGrisaille,
    emissiveMap: texExtGrisaille,
    emissive: new THREE.Color(0xffdfa8),
    emissiveIntensity: 0.06,
    roughness: 0.14,
    metalness: 0.28,
    side: THREE.DoubleSide,
  });
  const matTinPipes = new THREE.MeshStandardMaterial({
    color: 0xd2d8de,
    roughness: 0.24,
    metalness: 0.86,
  });
  const matPortalTympanum = new THREE.MeshStandardMaterial({
    map: texPortalTympanum,
    color: 0xf4ead4,
    roughness: 0.78,
  });
  const matClotureChoeur = new THREE.MeshStandardMaterial({
    map: texClotureChoeur,
    color: 0xf5ebd7,
    roughness: 0.72,
  });
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5d8,
    emissive: new THREE.Color(0xffca66),
    emissiveIntensity: 0.75,
    roughness: 0.18,
  });
  const matParvisStone = new THREE.MeshStandardMaterial({
    map: texParvis,
    color: 0xded5c2,
    roughness: 0.86,
  });
  const matPointZero = new THREE.MeshStandardMaterial({
    map: texPointZero,
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.22,
  });
  const matHotelDieu = new THREE.MeshStandardMaterial({
    map: texHotelDieu,
    color: 0xefe5d2,
    roughness: 0.82,
  });
  const matSlate = new THREE.MeshStandardMaterial({
    color: 0x3b4452,
    roughness: 0.58,
    metalness: 0.24,
  });
  const matLawn = new THREE.MeshStandardMaterial({
    color: 0x4b7439,
    roughness: 0.92,
  });
  const matGravel = new THREE.MeshStandardMaterial({
    color: 0xd5c9b0,
    roughness: 0.9,
  });
  const matAsphalt = new THREE.MeshStandardMaterial({
    color: 0x3a3d45,
    roughness: 0.88,
  });
  const matBridgeStone = new THREE.MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.82,
  });
  const matIron = new THREE.MeshStandardMaterial({
    color: 0x22272c,
    roughness: 0.46,
    metalness: 0.64,
  });
  const matRustIron = matIron;
  const matBouquiniste = new THREE.MeshStandardMaterial({
    color: 0x1d4732,
    roughness: 0.72,
    metalness: 0.18,
  });

  function addMesh(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, recv = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = cast;
    m.receiveShadow = recv;
    parent.add(m);
    return m;
  }

  function addBox(parent, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, recv = true) {
    return addMesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz, cast, recv);
  }

  function addCyl(parent, rt, rb, h, seg, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, recv = true) {
    return addMesh(parent, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx, ry, rz, cast, recv);
  }

  function addStatue(parent, mat, x, y, z, h = 2.4, ry = 0, crowned = false) {
    const s = h / 2.4;
    addBox(parent, 0.75 * s, 0.4 * s, 0.75 * s, matStoneDark, x, y + 0.2 * s, z, 0, ry, 0, false, true);
    addCyl(parent, 0.24 * s, 0.34 * s, 1.45 * s, 8, mat, x, y + 1.12 * s, z, 0, ry, 0, false, true);
    addMesh(parent, new THREE.SphereGeometry(0.21 * s, 8, 7), mat, x, y + 2.04 * s, z, 0, ry, 0, false, true);
    if (crowned) {
      addCyl(parent, 0.22 * s, 0.18 * s, 0.18 * s, 8, matGold, x, y + 2.26 * s, z, 0, ry, 0, false, false);
    }
  }

  function addPinnacle(parent, x, y, z, w, spireH) {
    addBox(parent, w, w * 1.1, w, matStoneExt, x, y + w * 0.55, z, 0, 0, 0, true, true);
    addMesh(parent, new THREE.ConeGeometry(w * 0.54, spireH, 4), matStoneSculpt, x, y + w * 1.1 + spireH * 0.5, z, 0, Math.PI * 0.25, 0, true, true);
    addMesh(parent, new THREE.OctahedronGeometry(w * 0.16, 0), matStoneSculpt, x, y + w * 1.1 + spireH + w * 0.1, z, 0, 0, 0, false, false);
  }

  // ==========================================================================
  // 1. EXTÉRIEUR GOTHIQUE HAUTE FIDÉLITÉ (Façade, Tours 69m, Flèche 96m, Chevet)
  // ==========================================================================

  // --- A. FAÇADE OCCIDENTALE (lx = -60 .. -51, largeur 41,6 m, Tours 69 m) ---
  // 4 grands contreforts verticaux scandant les trois portails
  [-19.6, -6.5, 6.5, 19.6].forEach((bz) => {
    addBox(exteriorGroup, 6.4, 20.0, 2.5, matStoneExt, -58.6, 10.0, bz);
    addBox(exteriorGroup, 5.8, 23.0, 2.2, matStoneExt, -58.2, 31.5, bz);
    // Dais & niches sculptées sur les contreforts
    if (Math.abs(bz) > 10) {
      addStatue(exteriorGroup, matStoneSculpt, -61.85, 6.2, bz, 2.5, -Math.PI * 0.5, false);
      addBox(exteriorGroup, 0.9, 1.4, 1.2, matStoneSculpt, -61.8, 9.6, bz, 0, 0, 0, false, true);
    }
  });

  // 3 Portails Occidentaux profondément ébrasés (Portail central Jugement Dernier OUVERT)
  const archCentral = createPointedArchGeometry(10.6, 14.2, 5.8, 5.6, 8.6, 1.4);
  [0, 1, 2].forEach((order) => {
    const sc = 1 - order * 0.08;
    const archM = addMesh(exteriorGroup, archCentral, order % 2 === 0 ? matStoneExt : matStoneSculpt, -60.5 + order * 1.4, 0.1, 0, 0, -Math.PI * 0.5, 0);
    archM.scale.set(sc, 1 - order * 0.04, 1);
  });
  // Mur de refend derrière le portail central encadrant le passage libre |lz| < 2.9 m, ly < 7.6 m
  addBox(exteriorGroup, 2.8, 6.6, 10.6, matStoneExt, -56.4, 10.9, 0);
  // Tympan du Jugement Dernier sculpté (au-dessus du passage ouvert ly > 7.4 m) + gable
  addBox(exteriorGroup, 1.0, 3.0, 5.1, matStoneSculpt, -58.9, 8.8, 0);
  addBox(exteriorGroup, 0.25, 2.7, 4.7, matPortalTympanum, -59.5, 8.75, 0, 0, 0, 0, false, false);
  addStatue(exteriorGroup, matStoneSculpt, -60.4, 0.1, 0, 3.2, -Math.PI * 0.5, true); // Beau Dieu au trumeau
  addMesh(exteriorGroup, new THREE.ConeGeometry(0.45, 1.05, 6), matStoneSculpt, -60.4, 4.05, 0); // Dais du Beau Dieu

  // Portails Nord (Vierge, lz = -13.1) & Sud (Sainte-Anne, lz = +13.1)
  const archSide = createPointedArchGeometry(10.8, 14.2, 4.8, 5.2, 8.4, 1.5);
  [-13.1, 13.1].forEach((pz, idx) => {
    [0, 1].forEach((order) => {
      const m = addMesh(exteriorGroup, archSide, order === 0 ? matStoneExt : matStoneSculpt, -60.3 + order * 1.5, 0.1, pz, 0, -Math.PI * 0.5, 0);
      m.scale.set(1 - order * 0.09, 1 - order * 0.04, 1);
    });
    // Vantaux de chêne avec pentures en fer forgé de Biscornet & tympan sculpté
    addBox(exteriorGroup, 1.2, 6.8, 4.5, matOak, -57.4, 3.5, pz);
    [1.6, 3.3, 5.1].forEach((hy) => {
      addBox(exteriorGroup, 0.12, 0.22, 4.2, matIron, -58.05, hy, pz, 0, 0, 0, false, false);
    });
    addBox(exteriorGroup, 1.4, 5.8, 4.8, matStoneSculpt, -58.0, 9.6, pz);
    addBox(exteriorGroup, 0.25, 2.6, 4.3, matPortalTympanum, -58.75, 8.7, pz, 0, 0, 0, false, false);
    // Pignon triangulaire à fleuron (portail de la Vierge plus haut au Nord)
    addMesh(exteriorGroup, createGableGeometry(idx === 0 ? 7.2 : 6.4, idx === 0 ? 4.8 : 3.2, 0.9), matStoneSculpt, -60.55, 9.8, pz, 0, -Math.PI * 0.5, 0);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.28, 1.15, 4), matStoneSculpt, -60.55, idx === 0 ? 15.0 : 13.4, pz);
    // Statues-colonnes & dais dans les ébrasements des 3 portails
    [-2.5, -1.9, 1.9, 2.5].forEach((off) => {
      addStatue(exteriorGroup, matStoneSculpt, -60.0, 1.8, pz + off, 2.0, -Math.PI * 0.5, false);
      addMesh(exteriorGroup, new THREE.ConeGeometry(0.32, 0.72, 6), matStoneSculpt, -60.0, 4.15, pz + off);
    });
  });

  // Bandes d'assises horizontales + 4 contreforts continus verticaux de façade (ly = 0 -> 42.6 m)
  [14.2, 19.6, 33.4, 42.4].forEach((hy) => {
    addBox(exteriorGroup, 8.2, 0.65, 42.4, matStoneDark, -58.4, hy, 0);
  });
  [-20.1, -6.9, 6.9, 20.1].forEach((bz) => {
    addBox(exteriorGroup, 2.8, 19.6, 1.85, matStoneSculpt, -59.8, 9.8, bz);
    addBox(exteriorGroup, 2.2, 23.0, 1.55, matStoneSculpt, -59.6, 31.1, bz);
  });
  // Articulation des flancs Nord & Sud du massif occidental (lz = ±20.4, ly = 0 -> 42.6 m)
  [-1, 1].forEach((sideSign) => {
    const flankZ = sideSign * 20.4;
    [-59.2, -55.2, -50.8].forEach((fx) => {
      addBox(exteriorGroup, 1.65, 42.6, 1.2, matStoneSculpt, fx, 21.3, flankZ);
    });
    [14.2, 19.6, 33.4, 42.4].forEach((hy) => {
      addBox(exteriorGroup, 12.8, 0.55, 1.4, matStoneDark, -55.4, hy, flankZ);
    });
    // Baies gothiques latérales aux étages 2 et 3 des tours
    addBox(exteriorGroup, 2.4, 7.6, 0.3, matWindowExt, -55.2, 26.2, sideSign * 20.05, 0, 0, 0, false, false);
    addBox(exteriorGroup, 0.28, 7.6, 0.35, matStoneSculpt, -55.2, 26.2, flankZ, 0, 0, 0, false, false);
    addBox(exteriorGroup, 3.6, 3.8, 0.35, matStoneDark, -55.2, 16.9, flankZ);
  });

  // Galerie des Rois (28 Rois de Juda sous arcatures trilobées, ly = 14.5 -> 19.3 m)
  addBox(exteriorGroup, 5.2, 4.8, 41.2, matStoneDark, -56.2, 16.9, 0);
  for (let i = 0; i < 28; i++) {
    const kz = -19.2 + (i / 27) * 38.4;
    addBox(exteriorGroup, 1.4, 4.6, 0.34, matStoneSculpt, -60.9, 16.9, kz, 0, 0, 0, false, true);
    addStatue(exteriorGroup, matStoneSculpt, -60.4, 14.7, kz, 3.1, -Math.PI * 0.5, true);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.42, 0.95, 4), matStoneSculpt, -60.5, 18.8, kz, 0, Math.PI * 0.25, 0, false, false);
  }

  // Étage de la Grande Rose Occidentale (9,6 m de diamètre, ly = 26,8 m) & baies géminées
  addBox(exteriorGroup, 5.4, 13.4, 15.8, matStoneExt, -55.8, 26.5, -12.9);
  addBox(exteriorGroup, 5.4, 13.4, 15.8, matStoneExt, -55.8, 26.5, 12.9);
  const westRoseWallGeo = createCircularRoseWallGeometry(10.6, 13.4, 4.9, 6.9, 5.4);
  addMesh(exteriorGroup, westRoseWallGeo, matStoneExt, -55.8, 19.8, 0, 0, -Math.PI * 0.5, 0);
  // Grande Rose Ouest rayonnante + double anneau de remplage pierre & 12 rayons
  addCyl(exteriorGroup, 4.95, 4.95, 0.55, 36, matRoseWest, -57.2, 26.8, 0, 0, 0, Math.PI * 0.5, false, false);
  addMesh(exteriorGroup, new THREE.TorusGeometry(4.95, 0.36, 8, 36), matStoneSculpt, -57.58, 26.8, 0, 0, Math.PI * 0.5, 0);
  addMesh(exteriorGroup, new THREE.TorusGeometry(2.65, 0.16, 6, 28), matStoneSculpt, -57.62, 26.8, 0, 0, Math.PI * 0.5, 0);
  for (let spoke = 0; spoke < 6; spoke++) {
    addBox(exteriorGroup, 0.22, 9.5, 0.22, matStoneSculpt, -57.68, 26.8, 0, spoke * (Math.PI / 6), 0, 0, false, false);
  }
  // Vierge à l'Enfant accompagnée de deux Anges devant la Rose Ouest (ly = 20.1 m)
  addStatue(exteriorGroup, matStoneSculpt, -60.8, 19.9, 0, 3.1, -Math.PI * 0.5, true);
  addStatue(exteriorGroup, matStoneSculpt, -60.6, 19.9, -2.2, 2.3, -Math.PI * 0.5, false);
  addStatue(exteriorGroup, matStoneSculpt, -60.6, 19.9, 2.2, 2.3, -Math.PI * 0.5, false);

  // Baies latérales Nord & Sud à l'étage de la Rose : verre ancien sombre extérieur + meneaux 3D
  const bayArchGeo = createPointedArchGeometry(10.2, 13.0, 6.2, 6.8, 11.4, 1.4);
  [-13.1, 13.1].forEach((bz) => {
    addMesh(exteriorGroup, bayArchGeo, matStoneExt, -59.6, 20.0, bz, 0, -Math.PI * 0.5, 0);
    [-1.4, 1.4].forEach((lo) => {
      addBox(exteriorGroup, 0.35, 8.6, 2.0, matWindowExt, -58.65, 25.0, bz + lo, 0, 0, 0, false, false);
      addBox(exteriorGroup, 0.22, 7.2, 0.24, matStoneSculpt, -58.85, 23.8, bz + lo, 0, 0, 0, false, false);
    });
    addBox(exteriorGroup, 0.42, 8.8, 0.44, matStoneSculpt, -58.88, 24.4, bz);
    addMesh(exteriorGroup, new THREE.TorusGeometry(1.15, 0.16, 6, 18), matStoneSculpt, -58.9, 30.2, bz, 0, Math.PI * 0.5, 0);
    addCyl(exteriorGroup, 1.12, 1.12, 0.32, 16, matRoseWest, -58.8, 30.2, bz, 0, 0, Math.PI * 0.5, false, false);
  });

  // Grande Galerie des Chimères (colonnade ajourée ly = 33.8 -> 42.4 m LAISSANT LE CENTRE OUVERT ENTRE LES 2 TOURS !)
  // Massifs d'appui uniquement sous les tours Nord & Sud (|lz| >= 7.0 m), vide central réel au-dessus de la Rose
  [-13.4, 13.4].forEach((tz) => {
    addBox(exteriorGroup, 6.8, 9.2, 12.6, matStoneExt, -55.2, 38.0, tz);
  });
  addBox(exteriorGroup, 1.8, 1.15, 41.4, matStoneDark, -59.6, 42.1, 0);
  addBox(exteriorGroup, 1.8, 0.9, 41.4, matStoneDark, -59.6, 33.9, 0);
  for (let i = 0; i <= 24; i++) {
    const cz = -19.6 + (i / 24) * 39.2;
    addCyl(exteriorGroup, 0.2, 0.24, 7.6, 8, matStoneSculpt, -60.2, 37.9, cz, 0, 0, 0, false, true);
  }
  addBox(exteriorGroup, 1.3, 1.25, 41.8, matStoneSculpt, -60.4, 42.9, 0);
  // Chimères célèbres (Le Stryge & monstres) perchés sur la balustrade à 43,6 m
  [-18.8, -14.2, -9.2, -4.5, 0, 4.5, 9.2, 14.2, 18.8].forEach((gz, gi) => {
    addBox(exteriorGroup, 1.9, 1.15, 0.68, gi % 2 === 0 ? matStoneDark : matStoneSculpt, -61.0, 44.1, gz, -0.18, 0, 0, false, false);
    addMesh(exteriorGroup, new THREE.SphereGeometry(0.32, 7, 6), matStoneDark, -61.9, 44.65, gz, 0, 0, 0, false, false);
  });

  // --- B. LES DEUX TOURS OCCIDENTALES (69 m de hauteur : Tour Nord & Tour Sud) ---
  const belfryArchGeo = createPointedArchGeometry(4.4, 18.2, 2.6, 13.0, 17.0, 1.1);
  [-13.4, 13.4].forEach((tz, towerIdx) => {
    const tx = -55.2;
    const tw = 12.6;
    const th = 26.2; // 42.6 -> 68.8 m
    const outerSign = towerIdx === 0 ? -1 : 1;

    // Core des tours + retrait intérieur + contreforts d'angle prolongeant ceux d'en bas (0 -> 69.8 m)
    addBox(exteriorGroup, tw, th, tw, matStoneExt, tx, 42.6 + th * 0.5, tz);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([cx, cz]) => {
      addBox(exteriorGroup, 2.1, th + 1.4, 2.1, matStoneSculpt, tx + cx * 5.9, 42.6 + th * 0.5, tz + cz * 5.9);
      addMesh(exteriorGroup, new THREE.ConeGeometry(1.15, 2.4, 4), matStoneSculpt, tx + cx * 5.9, 70.4, tz + cz * 5.9, 0, Math.PI * 0.25, 0);
    });

    // Tourelle d'escalier octogonale CONTINUE du sol jusqu'à 71,2 m (fût ancré au sol, zéro cylindre flottant !)
    const stairX = tx + 1.8;
    const stairZ = tz + outerSign * 6.0;
    addCyl(exteriorGroup, 2.05, 2.15, 42.6, 8, matStoneSculpt, stairX, 21.3, stairZ);
    addCyl(exteriorGroup, 1.82, 1.92, th + 1.0, 8, matStoneSculpt, stairX, 42.6 + (th + 1.0) * 0.5, stairZ);
    [14.2, 19.6, 33.4, 42.6, 68.2].forEach((ry) => {
      addMesh(exteriorGroup, new THREE.TorusGeometry(2.05, 0.22, 6, 12), matStoneDark, stairX, ry, stairZ, Math.PI * 0.5, 0, 0);
    });
    addMesh(exteriorGroup, new THREE.ConeGeometry(2.0, 2.9, 8), matStoneSculpt, stairX, 71.1, stairZ);

    // Doubles baies géminées de beffroi avec fond sombre, meneaux 3D, oculus, gable & abat-sons
    [-2.55, 2.55].forEach((off) => {
      // Faces Ouest & Est
      [-6.1, 6.1].forEach((fx) => {
        const rotY = fx < 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        const nSign = Math.sign(fx);
        addMesh(exteriorGroup, belfryArchGeo, matStoneSculpt, tx + fx, 44.2, tz + off, 0, rotY, 0);
        addBox(exteriorGroup, 0.4, 15.2, 2.5, matLeadDark, tx + fx * 0.91, 52.0, tz + off);
        addBox(exteriorGroup, 0.28, 12.2, 0.28, matStoneSculpt, tx + fx + nSign * 0.12, 50.6, tz + off);
        addMesh(exteriorGroup, new THREE.TorusGeometry(0.88, 0.14, 6, 14), matStoneSculpt, tx + fx + nSign * 0.14, 58.6, tz + off, 0, Math.PI * 0.5, 0);
        for (let l = 0; l < 13; l++) {
          addBox(exteriorGroup, 0.34, 0.22, 2.2, matOak, tx + fx * 0.95, 45.8 + l * 1.05, tz + off, 0, 0, nSign * 0.42, false, false);
        }
      });
      // Faces Nord & Sud
      [-6.1, 6.1].forEach((fz) => {
        const nSign = Math.sign(fz);
        addMesh(exteriorGroup, belfryArchGeo, matStoneSculpt, tx + off, 44.2, tz + fz, 0, fz < 0 ? Math.PI : 0, 0);
        addBox(exteriorGroup, 2.5, 15.2, 0.4, matLeadDark, tx + off, 52.0, tz + fz * 0.91);
        addBox(exteriorGroup, 0.28, 12.2, 0.28, matStoneSculpt, tx + off, 50.6, tz + fz + nSign * 0.12);
        addMesh(exteriorGroup, new THREE.TorusGeometry(0.88, 0.14, 6, 14), matStoneSculpt, tx + off, 58.6, tz + fz + nSign * 0.14, 0, 0, 0);
        for (let l = 0; l < 13; l++) {
          addBox(exteriorGroup, 2.2, 0.22, 0.34, matOak, tx + off, 45.8 + l * 1.05, tz + fz * 0.95, -nSign * 0.42, 0, 0, false, false);
        }
      });
    });

    // Grand Bourdon « Emmanuel » (13 t) suspendu au cœur de la Tour Sud
    if (towerIdx === 1) {
      addBox(exteriorGroup, 4.4, 1.4, 4.4, matOak, tx, 54.0, tz);
      addCyl(exteriorGroup, 1.35, 2.15, 2.6, 16, matBronze, tx, 51.8, tz);
    }

    // Corniche sommitale à 68,5 m & terrasse à balustrade ajourée (69 m)
    addBox(exteriorGroup, 14.2, 1.5, 14.2, matStoneDark, tx, 68.1, tz);
    [-6.4, 6.4].forEach((eb) => {
      addBox(exteriorGroup, 13.4, 0.32, 0.65, matStoneSculpt, tx, 69.8, tz + eb);
      addBox(exteriorGroup, 0.65, 0.32, 13.4, matStoneSculpt, tx + eb, 69.8, tz);
      for (let b = -4; b <= 4; b++) {
        addCyl(exteriorGroup, 0.14, 0.16, 1.05, 6, matStoneSculpt, tx + b * 1.35, 69.2, tz + eb, 0, 0, 0, false, false);
        addCyl(exteriorGroup, 0.14, 0.16, 1.05, 6, matStoneSculpt, tx + eb, 69.2, tz + b * 1.35, 0, 0, 0, false, false);
      }
    });
  });

  // --- C. NEF, BAS-CÔTÉS, CHAPELLES LATÉRALES & CLAIRE-VOIE (lx = -51 .. +46) ---
  // Murs des chapelles latérales (lx = -49 .. +3.5 et +18.5 .. +41)
  const aisleBayGeo = createPointedArchGeometry(7.2, 11.4, 4.2, 6.2, 9.6, 0.9);
  const clerestoryGeo = createPointedArchGeometry(7.2, 14.6, 4.4, 8.8, 13.2, 0.85);

  const naveBayXs = [-45.5, -38.3, -31.1, -23.9, -16.7, -9.5, -2.3];
  const choirBayXs = [21.5, 28.7, 35.9];
  const allSideBayXs = [...naveBayXs, ...choirBayXs];

  [-1, 1].forEach((sideSign) => {
    // Chapelles latérales (lz = ±20.0, ly = 0 -> 11.4 m) : verre grisaille sombre + meneau 3D + oculus + pignon à crochets
    allSideBayXs.forEach((bx) => {
      addMesh(exteriorGroup, aisleBayGeo, matStoneExt, bx, 0, sideSign * 20.0, 0, 0, 0);
      addBox(exteriorGroup, 4.2, 9.2, 0.24, matWindowExt, bx, 5.1, sideSign * 19.78, 0, 0, 0, false, false);
      // Meneau vertical, traverse & oculus de remplage en pierre calcaire (extérieur)
      addBox(exteriorGroup, 0.28, 8.6, 0.34, matStoneSculpt, bx, 4.6, sideSign * 19.92, 0, 0, 0, false, false);
      addBox(exteriorGroup, 4.0, 0.28, 0.34, matStoneSculpt, bx, 6.2, sideSign * 19.92, 0, 0, 0, false, false);
      addMesh(exteriorGroup, new THREE.TorusGeometry(0.95, 0.14, 6, 16), matStoneSculpt, bx, 8.2, sideSign * 19.94, 0, 0, 0);
      // Corniche, balustrade ajourée de terrasse basse & pignon Viollet-le-Duc surmonté d'un fleuron
      addBox(exteriorGroup, 7.2, 0.45, 0.85, matStoneDark, bx, 11.1, sideSign * 20.05);
      addMesh(exteriorGroup, createGableGeometry(5.6, 3.8, 0.55), matStoneSculpt, bx, 10.6, sideSign * 20.1, 0, 0, 0, false, true);
      addMesh(exteriorGroup, new THREE.ConeGeometry(0.24, 0.95, 4), matStoneSculpt, bx, 14.6, sideSign * 20.1);

      // Mur haut de la Claire-voie (lz = ±8.8, ly = 19.6 -> 34.4 m) : grisaille extérieure + meneau & double oculus + balustrade haute
      addMesh(exteriorGroup, clerestoryGeo, matStoneExt, bx, 19.6, sideSign * 8.8, 0, 0, 0);
      addBox(exteriorGroup, 4.4, 12.6, 0.24, matWindowExt, bx, 26.2, sideSign * 8.6, 0, 0, 0, false, false);
      addBox(exteriorGroup, 0.28, 11.4, 0.32, matStoneSculpt, bx, 25.4, sideSign * 8.75, 0, 0, 0, false, false);
      addBox(exteriorGroup, 4.2, 0.26, 0.32, matStoneSculpt, bx, 27.6, sideSign * 8.75, 0, 0, 0, false, false);
      addMesh(exteriorGroup, new THREE.TorusGeometry(1.05, 0.14, 6, 16), matStoneSculpt, bx, 30.8, sideSign * 8.78, 0, 0, 0);
      // Garde-corps gothique au sommet de la claire-voie (ly = 33.9..34.8 m)
      addBox(exteriorGroup, 7.2, 0.35, 0.72, matStoneDark, bx, 33.75, sideSign * 8.85);
      addBox(exteriorGroup, 7.2, 0.22, 0.45, matStoneSculpt, bx, 34.75, sideSign * 8.85);
      [-2.4, -1.2, 0, 1.2, 2.4].forEach((bpx) => {
        addBox(exteriorGroup, 0.24, 0.85, 0.3, matStoneSculpt, bx + bpx, 34.25, sideSign * 8.85, 0, 0, 0, false, false);
      });
    });

    // Toits pentus des tribunes (entre lz = ±8.8 et ±19.8)
    addBox(exteriorGroup, 53.0, 1.1, 11.8, matLeadRoof, -23.5, 15.6, sideSign * 14.3, sideSign * 0.44, 0, 0);
    addBox(exteriorGroup, 22.8, 1.1, 11.8, matLeadRoof, 29.6, 15.6, sideSign * 14.3, sideSign * 0.44, 0, 0);
  });

  // Arrière des tours rejoignant la Nef (lx = -51)
  [-13.2, 13.2].forEach((tz) => {
    addBox(exteriorGroup, 4.5, 19.6, 12.2, matStoneExt, -50.2, 9.8, tz);
  });

  // --- D. 18 GRANDS ARCS-BOUTANTS À SIMPLE VOLÉE (Nef + Chevet de Jean Ravy) ---
  const flyerGeo = createFlyingButtressGeometry(12.2, 10.8, 1.05, 0.85);
  const flyerStrutGeo = createFlyingButtressGeometry(12.0, 9.2, 0.55, 0.48);
  const navePierXs = [-41.9, -34.7, -27.5, -20.3, -13.1, -5.9, 1.3];
  const choirPierXs = [25.1, 32.3, 39.5];
  [...navePierXs, ...choirPierXs].forEach((px) => {
    [-1, 1].forEach((s) => {
      // Culée à retraits sur 2 niveaux (lz = ±21.4) + niche à statue + pinacle à crochets + gargouille
      addBox(exteriorGroup, 2.4, 12.4, 3.4, matStoneExt, px, 6.2, s * 21.5);
      addBox(exteriorGroup, 2.0, 10.8, 2.8, matStoneExt, px, 17.6, s * 21.3);
      addBox(exteriorGroup, 2.55, 0.45, 3.55, matStoneDark, px, 12.4, s * 21.5);
      addStatue(exteriorGroup, matStoneSculpt, px, 13.2, s * 22.8, 2.2, s > 0 ? 0 : Math.PI, true);
      addPinnacle(exteriorGroup, px, 23.0, s * 21.3, 1.95, 8.4);
      addBox(exteriorGroup, 0.48, 0.55, 2.4, matStoneDark, px, 22.4, s * 23.2, s * 0.14, 0, 0, false, false);
      // Volée principale + sous-arc fin d'entretoise gothique + colonnettes d'écoinçon
      addMesh(exteriorGroup, flyerGeo, matStoneSculpt, px, 21.2, s * 20.8, 0, s > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0);
      addMesh(exteriorGroup, flyerStrutGeo, matStoneDark, px, 19.6, s * 20.6, 0, s > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0);
      [0.32, 0.62].forEach((t) => {
        const cz = s * (20.2 - t * 11.4);
        const cy = 22.4 + t * 9.0;
        addCyl(exteriorGroup, 0.14, 0.16, 1.8, 6, matStoneSculpt, px, cy - 0.85, cz, 0, 0, 0, false, false);
      });
    });
  });

  // --- E. CHEVET SEMI-CIRCULAIRE, DÉAMBULATOIRE & 7 ARCS-BOUTANTS RAYONNANTS ---
  const apseCx = 41.0;
  const apseOuterGeo = new THREE.CylinderGeometry(19.8, 19.8, 11.6, 20, 1, true, 0, Math.PI);
  const matStoneExtDouble = matStoneExt.clone();
  matStoneExtDouble.side = THREE.DoubleSide;
  const matStoneIntDouble = matStoneInt.clone();
  matStoneIntDouble.side = THREE.DoubleSide;
  addMesh(exteriorGroup, apseOuterGeo, matStoneExtDouble, apseCx, 5.8, 0);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(9.2, 19.8, 6.2, 20, 1, true, 0, Math.PI), matLeadRoof, apseCx, 14.5, 0);

  // Triforium / mur plein courbe du Chœur (ly = 10.6 -> 19.6 m) fermant l'abside sous les fenêtres hautes
  addMesh(interiorGroup, new THREE.CylinderGeometry(8.65, 8.65, 9.4, 20, 1, true, 0, Math.PI), matStoneIntDouble, apseCx, 15.1, 0);
  // Bague de pierre continue fermant le mur courbe de l'abside en sommet (ly = 33.8 m)
  addMesh(exteriorGroup, new THREE.CylinderGeometry(8.9, 8.9, 1.4, 20, 1, true, 0, Math.PI), matStoneExtDouble, apseCx, 33.9, 0);

  // Pignons de chapelles rayonnantes, piliers d'abside, verrières & 7 arcs-boutants rayonnants
  const chevetAngles = [-1.24, -0.82, -0.41, 0, 0.41, 0.82, 1.24];
  const apseClerestoryBay = createPointedArchGeometry(4.1, 14.6, 2.5, 8.6, 13.0, 0.85);
  const apseArcadeBay = createPointedArchGeometry(4.1, 5.8, 2.8, 1.8, 5.0, 0.85);
  const apseFlyerGeo = createFlyingButtressGeometry(12.0, 10.6, 0.95, 0.78);
  chevetAngles.forEach((ang) => {
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    const pr = 21.2;
    const px = apseCx + ux * pr;
    const pz = uz * pr;

    // Colonnes basses & grandes arcades du rond-point du Chœur (r = 8.45 m)
    addCyl(interiorGroup, 0.56, 0.62, 10.0, 10, matStoneInt, apseCx + ux * 8.45, 5.2, uz * 8.45);
    addMesh(interiorGroup, apseArcadeBay, matStoneInt, apseCx + ux * 8.45, 9.8, uz * 8.45, 0, Math.PI * 0.5 - ang, 0);

    // Claire-voie haute percée de l'abside (grisaille extérieure + meneau 3D + vitrail intérieur)
    addMesh(exteriorGroup, apseClerestoryBay, matStoneExt, apseCx + ux * 8.85, 19.6, uz * 8.85, 0, Math.PI * 0.5 - ang, 0);
    addBox(exteriorGroup, 2.5, 12.2, 0.24, matWindowExt, apseCx + ux * 8.85, 26.2, uz * 8.85, 0, Math.PI * 0.5 - ang, 0, false, false);
    addBox(exteriorGroup, 0.24, 11.4, 0.28, matStoneSculpt, apseCx + ux * 8.95, 25.4, uz * 8.95, 0, Math.PI * 0.5 - ang, 0, false, false);
    addBox(interiorGroup, 2.4, 12.0, 0.08, matLancetGlass, apseCx + ux * 8.62, 26.2, uz * 8.62, 0, Math.PI * 0.5 - ang, 0, false, false);

    // Verrière des chapelles du chevet (grisaille extérieure + pignon)
    addBox(exteriorGroup, 0.26, 8.4, 3.0, matWindowExt, apseCx + ux * 19.65, 5.4, uz * 19.65, 0, -ang, 0, false, false);
    addBox(exteriorGroup, 0.28, 7.6, 0.24, matStoneSculpt, apseCx + ux * 19.75, 4.9, uz * 19.75, 0, -ang, 0, false, false);
    addBox(interiorGroup, 0.08, 8.2, 2.9, matLancetGlass, apseCx + ux * 19.4, 5.4, uz * 19.4, 0, -ang, 0, false, false);

    // Culée à retraits + statue + pinacle + arc-boutant rayonnant sur l'abside
    addBox(exteriorGroup, 2.8, 12.4, 2.1, matStoneExt, px, 6.2, pz, 0, -ang, 0);
    addBox(exteriorGroup, 2.4, 10.8, 1.85, matStoneExt, px, 17.6, pz, 0, -ang, 0);
    addPinnacle(exteriorGroup, px, 23.0, pz, 1.75, 7.6);
    addBox(exteriorGroup, 2.2, 0.45, 0.45, matStoneDark, px + ux * 0.9, 22.4, pz + uz * 0.9, 0, -ang, -0.14, false, false);
    addMesh(exteriorGroup, apseFlyerGeo, matStoneSculpt, px - ux * 0.6, 21.2, pz - uz * 0.6, 0, Math.PI - ang, 0);
  });

  // --- F. FAÇADES DES TRANSEPTS NORD & SUD + GRANDES ROSACES DE 13,1 M ---
  const transeptX = 11.0;
  const transeptW = 14.4;
  const trPortalArch = createPointedArchGeometry(13.6, 14.0, 5.4, 5.2, 8.6, 1.5);
  const trRoseWallGeo = createCircularRoseWallGeometry(14.4, 16.6, 6.4, 7.6, 1.2);
  [-1, 1].forEach((sideSign) => {
    const zFace = sideSign * 24.4;
    const rotY = sideSign < 0 ? Math.PI : 0;

    // Piliers & tourelles latérales des façades de transept (culminant à 49 m)
    [-6.6, 6.6].forEach((ox) => {
      addBox(exteriorGroup, 2.6, 38.0, 2.8, matStoneExt, transeptX + ox, 19.0, zFace);
      addPinnacle(exteriorGroup, transeptX + ox, 38.0, zFace, 2.1, 11.2);
    });

    // Portail du Cloître (Nord) & Portail Saint-Étienne (Sud)
    addMesh(exteriorGroup, trPortalArch, matStoneSculpt, transeptX, 0.1, zFace, 0, rotY, 0);
    addBox(exteriorGroup, 5.2, 7.2, 1.2, matOak, transeptX, 3.6, zFace - sideSign * 0.7);
    addBox(exteriorGroup, 4.8, 2.8, 0.24, matPortalTympanum, transeptX, 8.9, zFace + sideSign * 0.12, 0, 0, 0, false, false);
    addMesh(exteriorGroup, createGableGeometry(7.8, 5.8, 0.9), matStoneSculpt, transeptX, 9.5, zFace + sideSign * 0.3, 0, rotY, 0);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.28, 1.2, 4), matStoneSculpt, transeptX, 15.8, zFace + sideSign * 0.3);

    // Claire-voie vitrée horizontale au-dessus du portail (grisaille extérieure + vitrail intérieur & colonnettes)
    addBox(exteriorGroup, 11.6, 4.2, 0.3, matWindowExt, transeptX, 16.0, zFace - sideSign * 0.25, 0, 0, 0, false, false);
    addBox(interiorGroup, 11.4, 4.0, 0.08, matLancetGlass, transeptX, 16.0, zFace - sideSign * 0.52, 0, 0, 0, false, false);
    for (let tc = -4.6; tc <= 4.61; tc += 1.54) {
      addCyl(exteriorGroup, 0.14, 0.15, 4.2, 6, matStoneSculpt, transeptX + tc, 16.0, zFace - sideSign * 0.05, 0, 0, 0, false, false);
      addCyl(interiorGroup, 0.13, 0.14, 4.1, 6, matStoneInt, transeptX + tc, 16.0, zFace - sideSign * 0.62, 0, 0, 0, false, false);
    }
    addBox(exteriorGroup, 13.6, 0.8, 1.6, matStoneDark, transeptX, 18.2, zFace);

    // Étage de la Grande Rose (diamètre 13,1 m ! double anneau tracery 3D + 12 rayons)
    const roseMat = sideSign < 0 ? matRoseNorth : matRoseSouth;
    addMesh(exteriorGroup, trRoseWallGeo, matStoneExt, transeptX, 18.2, zFace, 0, rotY, 0);
    addCyl(exteriorGroup, 6.45, 6.45, 0.52, 36, roseMat, transeptX, 25.8, zFace - sideSign * 0.1, Math.PI * 0.5, 0, 0, false, false);
    [sideSign * 0.16, -sideSign * 0.42].forEach((zOff) => {
      addMesh(exteriorGroup, new THREE.TorusGeometry(6.48, 0.38, 8, 36), matStoneSculpt, transeptX, 25.8, zFace + zOff, 0, 0, 0);
      addMesh(exteriorGroup, new THREE.TorusGeometry(3.45, 0.18, 6, 32), matStoneSculpt, transeptX, 25.8, zFace + zOff, 0, 0, 0);
      for (let sp = 0; sp < 6; sp++) {
        addBox(exteriorGroup, 0.22, 12.6, 0.24, matStoneSculpt, transeptX, 25.8, zFace + zOff * 1.05, 0, 0, sp * (Math.PI / 6), false, false);
      }
    });

    // Grand pignon triangulaire à crochets & oculus du transept (ly = 34.4 -> 44.8 m)
    addBox(exteriorGroup, 14.4, 1.0, 2.0, matStoneDark, transeptX, 34.5, zFace);
    addMesh(exteriorGroup, createGableGeometry(14.4, 10.6, 1.4), matStoneExt, transeptX, 34.8, zFace, 0, rotY, 0);
    addCyl(exteriorGroup, 1.9, 1.9, 1.6, 16, roseMat, transeptX, 39.2, zFace, Math.PI * 0.5, 0, 0, false, false);
    addMesh(exteriorGroup, new THREE.TorusGeometry(1.92, 0.22, 6, 20), matStoneSculpt, transeptX, 39.2, zFace + sideSign * 0.78, 0, 0, 0);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.35, 2.2, 4), matStoneSculpt, transeptX, 46.5, zFace);

    // Murs latéraux des bras du transept (grisaille extérieure + meneau + vitrail intérieur)
    [-6.6, 6.6].forEach((ox) => {
      addBox(exteriorGroup, 1.2, 34.6, 16.4, matStoneExt, transeptX + ox, 17.3, sideSign * 16.5);
      addBox(exteriorGroup, 0.26, 12.2, 8.2, matWindowExt, transeptX + ox + Math.sign(ox) * 0.48, 25.5, sideSign * 16.5, 0, 0, 0, false, false);
      addBox(exteriorGroup, 0.34, 11.8, 0.32, matStoneSculpt, transeptX + ox + Math.sign(ox) * 0.6, 25.5, sideSign * 16.5, 0, 0, 0, false, false);
      addBox(interiorGroup, 0.08, 12.0, 8.0, matLancetGlass, transeptX + ox - Math.sign(ox) * 0.52, 25.5, sideSign * 16.5, 0, 0, 0, false, false);
    });
    // Jonctions Nef (lx = 1..4.5) et Chœur (lx = 17.5..19.5) au niveau de la claire-voie & bas-côtés
    addBox(exteriorGroup, 3.6, 34.4, 1.4, matStoneExt, 2.8, 17.2, sideSign * 8.8);
    addBox(exteriorGroup, 2.6, 34.4, 1.4, matStoneExt, 18.2, 17.2, sideSign * 8.8);
    addBox(exteriorGroup, 3.6, 11.4, 1.4, matStoneExt, 2.8, 5.7, sideSign * 20.0);
    addBox(exteriorGroup, 2.6, 11.4, 1.4, matStoneExt, 18.2, 5.7, sideSign * 20.0);
  });

  // --- F2. SACRISTIE NÉOGOTHIQUE DE VIOLLET-LE-DUC (Flanc Sud du Chœur, lx = 22..43, lz = +20.2..+30.2) ---
  addBox(exteriorGroup, 21.0, 10.6, 9.8, matStoneExt, 32.5, 5.3, 25.2);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(4.4, 4.4, 10.6, 8), matStoneExt, 43.2, 5.3, 25.2);
  addBox(exteriorGroup, 21.4, 3.2, 10.2, matSlate, 32.5, 12.2, 25.2);
  addMesh(exteriorGroup, new THREE.ConeGeometry(4.6, 4.4, 8), matSlate, 43.2, 12.8, 25.2);
  addBox(exteriorGroup, 21.0, 0.55, 0.25, matGold, 32.5, 14.0, 25.2, 0, 0, 0, false, false);
  [23.5, 28.0, 32.5, 37.0, 41.5].forEach((sx) => {
    addBox(exteriorGroup, 0.95, 11.0, 0.85, matStoneSculpt, sx, 5.5, 30.2);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.55, 2.2, 4), matStoneSculpt, sx, 12.1, 30.2, 0, Math.PI * 0.25, 0);
    if (sx < 40) {
      addBox(exteriorGroup, 2.4, 6.2, 0.24, matWindowExt, sx + 2.25, 5.4, 30.05, 0, 0, 0, false, false);
      addBox(exteriorGroup, 0.2, 5.8, 0.24, matStoneSculpt, sx + 2.25, 5.3, 30.18, 0, 0, 0, false, false);
    }
  });

  // --- G. CHARPENTE « LA FORÊT » EN PLOMB (ly = 34.4 -> 43.2 m) & FLÈCHE DE VIOLLET-LE-DUC (96 m) ---
  const roofProfile = new THREE.Shape();
  roofProfile.moveTo(-8.8, 0);
  roofProfile.lineTo(8.8, 0);
  roofProfile.lineTo(0, 9.2);
  roofProfile.closePath();

  const mainRoofGeo = new THREE.ExtrudeGeometry(roofProfile, { depth: 92.0, bevelEnabled: false });
  mainRoofGeo.rotateY(Math.PI * 0.5);
  addMesh(exteriorGroup, mainRoofGeo, matLeadRoof, -50.5, 34.2, 0);
  addMesh(exteriorGroup, new THREE.ConeGeometry(9.0, 9.4, 18, 1, true, 0, Math.PI), matLeadRoof, apseCx, 38.9, 0);
  const trRoofGeo = new THREE.ExtrudeGeometry(roofProfile, { depth: 48.6, bevelEnabled: false });
  trRoofGeo.translate(0, 0, -24.3);
  addMesh(exteriorGroup, trRoofGeo, matLeadRoof, transeptX, 34.2, 0);

  // Lucarnes en plomb le long des versants de La Forêt
  [-36, -20, -4, 28].forEach((lx) => {
    [-4.8, 4.8].forEach((lz) => {
      addBox(exteriorGroup, 1.5, 1.8, 1.8, matLeadDark, lx, 38.4, lz);
      addMesh(exteriorGroup, new THREE.ConeGeometry(1.15, 2.0, 4), matLeadRoof, lx, 40.3, lz, 0, Math.PI * 0.25, 0);
    });
  });

  // Crête faîtière dorée / patinée le long de la grande toiture & Ange au chevet
  addBox(exteriorGroup, 90.0, 1.2, 0.35, matGold, -5.5, 43.8, 0, 0, 0, 0, false, false);
  addBox(exteriorGroup, 0.35, 1.2, 47.0, matGold, transeptX, 43.8, 0, 0, 0, 0, false, false);
  addCyl(exteriorGroup, 0.25, 0.55, 2.8, 8, matPatinaCopper, apseCx, 44.5, 0);

  // FLÈCHE DE VIOLLET-LE-DUC (culminant exactement à ly = 96,0 m)
  const spireX = transeptX;
  addCyl(exteriorGroup, 4.4, 5.2, 9.2, 8, matLeadDark, spireX, 44.6, 0);
  addCyl(exteriorGroup, 3.6, 4.3, 4.5, 8, matLeadRoof, spireX, 50.8, 0);

  // 4 contreforts diagonaux abritant les 12 Apôtres & 4 Évangélistes en cuivre vert-de-gris
  for (let d = 0; d < 4; d++) {
    const da = d * (Math.PI * 0.5) + Math.PI * 0.25;
    const ux = Math.cos(da);
    const uz = Math.sin(da);
    for (let st = 0; st < 4; st++) {
      const dist = 5.6 - st * 0.9;
      const sy = 42.6 + st * 2.15;
      addBox(exteriorGroup, 1.35, 2.1, 1.35, matLeadDark, spireX + ux * dist, sy + 1.0, uz * dist, 0, -da, 0);
      addCyl(exteriorGroup, 0.28, 0.42, 1.65, 7, matPatinaCopper, spireX + ux * (dist + 0.5), sy + 2.55, uz * (dist + 0.5), 0, 0, 0, false, true);
      addMesh(exteriorGroup, new THREE.SphereGeometry(0.24, 7, 6), matPatinaCopper, spireX + ux * (dist + 0.5), sy + 3.55, uz * (dist + 0.5), 0, 0, 0, false, false);
    }
  }

  // Deux étages de lanterne gothique VÉRITABLEMENT AJOURÉE (8 colonnettes + gâbles percés) ly = 53 -> 67,5 m
  const lanternArch1 = createPointedArchGeometry(2.4, 7.6, 1.4, 5.2, 6.8, 0.35);
  const lanternArch2 = createPointedArchGeometry(1.85, 6.4, 1.05, 4.2, 5.6, 0.3);
  addCyl(exteriorGroup, 1.6, 1.85, 8.0, 8, matLeadDark, spireX, 57.0, 0);
  addCyl(exteriorGroup, 1.1, 1.35, 6.6, 8, matLeadDark, spireX, 64.4, 0);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(2.6, 3.2, 0.65, 8), matLeadRoof, spireX, 60.8, 0);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(1.95, 2.4, 0.6, 8), matLeadRoof, spireX, 67.4, 0);
  for (let side = 0; side < 8; side++) {
    const a = (side / 8) * Math.PI * 2;
    const am = ((side + 0.5) / 8) * Math.PI * 2;
    // Colonnettes d'angle & pinacles
    addCyl(exteriorGroup, 0.22, 0.26, 8.2, 6, matLeadRoof, spireX + Math.cos(am) * 3.15, 56.9, Math.sin(am) * 3.15, 0, 0, 0, false, false);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.38, 2.8, 4), matLeadRoof, spireX + Math.cos(am) * 3.15, 62.2, Math.sin(am) * 3.15, 0, -am, 0, false, false);
    addCyl(exteriorGroup, 0.18, 0.22, 6.6, 6, matLeadRoof, spireX + Math.cos(am) * 2.42, 64.2, Math.sin(am) * 2.42, 0, 0, 0, false, false);
    addMesh(exteriorGroup, new THREE.ConeGeometry(0.3, 2.2, 4), matLeadRoof, spireX + Math.cos(am) * 2.42, 68.5, Math.sin(am) * 2.42, 0, -am, 0, false, false);
    // Arcades ajourées entre colonnettes
    addMesh(exteriorGroup, lanternArch1, matLeadRoof, spireX + Math.cos(a) * 2.85, 53.0, Math.sin(a) * 2.85, 0, Math.PI * 0.5 - a, 0, false, false);
    addMesh(exteriorGroup, lanternArch2, matLeadRoof, spireX + Math.cos(a) * 2.15, 61.0, Math.sin(a) * 2.15, 0, Math.PI * 0.5 - a, 0, false, false);
  }

  // Grande aiguille octogonale à crochets (ly = 67,5 -> 92,4 m)
  addMesh(exteriorGroup, new THREE.ConeGeometry(1.95, 25.0, 8), matLeadRoof, spireX, 79.9, 0);
  for (let ring = 0; ring < 9; ring++) {
    const ry = 69.2 + ring * 2.4;
    const rr = 1.78 - ring * 0.175;
    for (let k = 0; k < 8; k++) {
      const ka = k * (Math.PI * 0.25) + ring * 0.19;
      addMesh(exteriorGroup, new THREE.OctahedronGeometry(0.24, 0), matLeadDark, spireX + Math.cos(ka) * rr, ry, Math.sin(ka) * rr, 0, 0, 0, false, false);
    }
  }

  // Sommet restauré : Croix ajourée & Coq Doré de 2023-2024 culminant à 96,0 m !
  addCyl(exteriorGroup, 0.14, 0.24, 2.8, 8, matGold, spireX, 93.4, 0, 0, 0, 0, false, false);
  addBox(exteriorGroup, 1.4, 0.22, 0.22, matGold, spireX, 94.1, 0, 0, 0, 0, false, false);
  addMesh(exteriorGroup, new THREE.SphereGeometry(0.28, 7, 6), matGold, spireX, 95.15, 0, 0, 0, 0, false, false);
  addMesh(exteriorGroup, new THREE.ConeGeometry(0.24, 0.82, 5), matGold, spireX - 0.35, 95.45, 0, 0, 0, 0.85, false, false); // Queue du Coq
  addMesh(exteriorGroup, new THREE.ConeGeometry(0.16, 0.52, 5), matGold, spireX + 0.3, 95.5, 0, 0, 0, -0.45, false, false); // Tête & crête du Coq

  mergeStaticGroupByMaterial(exteriorGroup);
  exteriorGroup.traverse((c) => {
    c.frustumCulled = false;
  });

  // ==========================================================================
  // 2. INTÉRIEUR VISITABLE LUMINEUX (Restauration 2024, LOD 0)
  // ==========================================================================

  // Dallage en marbre damier noir & blanc (ly = 0.20 m — au-dessus de parvis 0.12 m)
  addBox(interiorGroup, 108.0, 0.16, 38.6, matMarbleFloor, -1.0, 0.12, 0, 0, 0, 0, false, true);
  addBox(interiorGroup, 13.8, 0.16, 46.8, matMarbleFloor, transeptX, 0.12, 0, 0, 0, 0, false, true);
  addCyl(interiorGroup, 19.2, 19.2, 0.16, 20, matMarbleFloor, apseCx, 0.12, 0, 0, 0, 0, false, true);

  // Voûtes d'ogives gothiques restaurées (pierre blonde très lumineuse à 33 m !)
  const arcadeIntGeo = createPointedArchGeometry(7.2, 5.8, 5.2, 1.6, 5.2, 0.9);
  const tribuneIntGeo = createPointedArchGeometry(7.2, 7.0, 4.6, 3.2, 6.2, 0.85);
  const pillarXs = [-49.1, -41.9, -34.7, -27.5, -20.3, -13.1, -5.9, 1.3, 21.5, 28.7, 35.9, 43.1];

  pillarXs.forEach((px, idx) => {
    const isPier = idx === 7 || idx === 8;
    [-6.9, 6.9].forEach((pz) => {
      // Colonne monocylindrique gothique + socle + chapiteau corinthien à crochets
      addBox(interiorGroup, 1.85, 0.9, 1.85, matStoneInt, px, 0.65, pz);
      addCyl(interiorGroup, isPier ? 0.88 : 0.62, isPier ? 0.96 : 0.68, 9.2, 12, matStoneInt, px, 5.6, pz);
      addCyl(interiorGroup, 0.98, 0.66, 0.85, 10, matStoneSculpt, px, 10.4, pz);
      // Colonnettes engagées montant jusqu'à la retombée des voûtes (24 m)
      addCyl(interiorGroup, 0.24, 0.26, 14.5, 8, matStoneInt, px, 17.8, pz - Math.sign(pz) * 0.55);
    });
    // Colonnes intermédiaires séparant le 1er & 2e bas-côté (lz = ±13.2)
    if (px < 40) {
      [-13.4, 13.4].forEach((sz) => {
        addCyl(interiorGroup, 0.48, 0.54, 10.2, 10, matStoneInt, px, 5.2, sz);
        addCyl(interiorGroup, 0.72, 0.48, 0.6, 8, matStoneSculpt, px, 10.4, sz);
      });
    }
  });

  // 4 grands piliers fasciculés de la Croisée du Transept (lx = 4.2 & 17.8, lz = ±6.9)
  [4.2, 17.8].forEach((cx) => {
    [-6.9, 6.9].forEach((cz) => {
      addBox(interiorGroup, 2.3, 1.2, 2.3, matStoneInt, cx, 0.8, cz);
      addCyl(interiorGroup, 1.12, 1.2, 26.0, 14, matStoneInt, cx, 14.2, cz);
    });
  });

  // Grandes arcades, Tribunes à triple colonnette & vitraux intérieurs lumineux (travées Nef & Chœur)
  [...naveBayXs, ...choirBayXs].forEach((bx) => {
    [-6.9, 6.9].forEach((sz) => {
      addMesh(interiorGroup, arcadeIntGeo, matStoneInt, bx, 10.6, sz, 0, 0, 0);
      addMesh(interiorGroup, tribuneIntGeo, matStoneInt, bx, 16.4, sz, 0, 0, 0);
      [-1.05, 1.05].forEach((ox) => {
        addCyl(interiorGroup, 0.14, 0.16, 5.2, 6, matStoneInt, bx + ox, 19.0, sz);
      });
      addBox(interiorGroup, 5.2, 0.45, 0.48, matStoneSculpt, bx, 16.5, sz);
    });
    [-1, 1].forEach((sideSign) => {
      addBox(interiorGroup, 4.3, 12.2, 0.08, matLancetGlass, bx, 26.2, sideSign * 8.38, 0, 0, 0, false, false);
      addBox(interiorGroup, 4.1, 9.0, 0.08, matLancetGlass, bx, 5.1, sideSign * 19.55, 0, 0, 0, false, false);
    });
  });

  // Voûtes sexpartites en berceau brisé scindées proprement de part et d'autre de la Croisée (ly = 34,2 m)
  const naveVaultMat = new THREE.MeshStandardMaterial({
    map: texStoneInt,
    color: 0xfbf5e6,
    roughness: 0.78,
    side: THREE.BackSide,
  });
  // Voûte Nef (lx = -51 .. +4.2) & Voûte Chœur (lx = +17.8 .. +41)
  const makeVaultSeg = (len, cx) => {
    const geo = new THREE.CylinderGeometry(7.0, 7.0, len, 14, 1, true, 0, Math.PI);
    geo.rotateZ(Math.PI * 0.5);
    addMesh(interiorGroup, geo, naveVaultMat, cx, 27.2, 0, 0, 0, 0, false, true);
  };
  makeVaultSeg(55.2, -23.4);
  makeVaultSeg(23.2, 29.4);

  // Voûte de la Croisée + Bras Nord/Sud du Transept (axe Z, voûté vers +Y)
  addBox(interiorGroup, 14.2, 0.5, 14.2, matStoneInt, transeptX, 34.1, 0, 0, 0, 0, false, true);
  [-15.5, 15.5].forEach((tz) => {
    const trArmGeo = new THREE.CylinderGeometry(7.0, 7.0, 17.2, 14, 1, true, 0, Math.PI);
    trArmGeo.rotateZ(Math.PI * 0.5);
    trArmGeo.rotateY(Math.PI * 0.5);
    addMesh(interiorGroup, trArmGeo, naveVaultMat, transeptX, 27.2, tz, 0, 0, 0, false, true);
  });

  // Cul-de-four du Chevet (+X est) & plafond annulaire du déambulatoire (laissant le Chœur ouvert jusqu'à 34 m)
  const apseShellInt = new THREE.CylinderGeometry(19.3, 19.3, 11.4, 20, 1, true, 0, Math.PI);
  addMesh(interiorGroup, apseShellInt, matStoneIntDouble, apseCx, 5.7, 0, 0, 0, 0, false, true);
  const apseDomeInt = new THREE.SphereGeometry(8.6, 16, 10, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.5);
  addMesh(interiorGroup, apseDomeInt, naveVaultMat, apseCx, 27.2, 0, 0, 0, 0, false, true);
  const ambCeilGeo = new THREE.RingGeometry(8.5, 19.4, 20, 1, -Math.PI * 0.5, Math.PI);
  ambCeilGeo.rotateX(Math.PI * 0.5);
  addMesh(interiorGroup, ambCeilGeo, matStoneIntDouble, apseCx, 11.4, 0, 0, 0, 0, false, true);

  // Doubleaux & véritables croisées d'ogives courbes + Clés de voûte dorées (épousant le berceau !)
  pillarXs.forEach((px) => {
    addMesh(interiorGroup, new THREE.TorusGeometry(6.92, 0.24, 6, 16, Math.PI), matStoneSculpt, px, 27.2, 0, 0, Math.PI * 0.5, 0, false, false);
  });
  [...naveBayXs, transeptX, ...choirBayXs].forEach((bx) => {
    addMesh(interiorGroup, new THREE.CylinderGeometry(0.45, 0.45, 0.35, 8), matGold, bx, 34.05, 0, 0, 0, 0, false, false);
    addMesh(interiorGroup, new THREE.TorusGeometry(7.35, 0.18, 5, 14, Math.PI), matStoneSculpt, bx, 26.8, 0, 0, 0.52, 0, false, false);
    addMesh(interiorGroup, new THREE.TorusGeometry(7.35, 0.18, 5, 14, Math.PI), matStoneSculpt, bx, 26.8, 0, 0, -0.52, 0, false, false);
  });

  // Plafonds voûtés des bas-côtés (ly = 11.4 m) & fonds lumineux en pierre derrière les Tribunes (ly = 11.4 -> 22.8 m)
  [-10.2, 10.2, -16.6, 16.6].forEach((az) => {
    addBox(interiorGroup, 54.0, 0.45, 6.4, matStoneInt, -23.0, 11.4, az, 0, 0, 0, false, true);
    addBox(interiorGroup, 24.0, 0.45, 6.4, matStoneInt, 30.0, 11.4, az, 0, 0, 0, false, true);
  });
  [-14.6, 14.6].forEach((tz) => {
    addBox(interiorGroup, 53.0, 10.8, 0.45, matStoneInt, -23.5, 16.8, tz, 0, 0, 0, false, true);
    addBox(interiorGroup, 24.0, 10.8, 0.45, matStoneInt, 30.0, 16.8, tz, 0, 0, 0, false, true);
  });
  [-10.6, 10.6].forEach((tz) => {
    addBox(interiorGroup, 53.0, 0.45, 8.2, matStoneInt, -23.5, 20.6, tz, 0, 0, 0, false, true);
    addBox(interiorGroup, 24.0, 0.45, 8.2, matStoneInt, 30.0, 20.6, tz, 0, 0, 0, false, true);
  });

  // Grand Orgue Cavaillé-Coll (8 000 tuyaux, sur tribune ouest lx = -50.2, laissant le passage bas OUVERT)
  addBox(interiorGroup, 5.2, 1.1, 13.8, matStoneInt, -50.6, 9.6, 0);
  // Deux piliers encadrant la travée libre centrale du portail
  [-4.8, 4.8].forEach((oz) => {
    addCyl(interiorGroup, 0.55, 0.62, 9.2, 10, matStoneInt, -49.2, 4.8, oz);
  });
  addBox(interiorGroup, 2.2, 10.8, 12.6, matOak, -51.4, 15.5, 0);
  addBox(interiorGroup, 0.45, 9.6, 11.8, matOrgan, -50.2, 15.6, 0, 0, 0, 0, false, true);
  // 5 tourelles 3D de tuyaux d'étain en façade du buffet d'orgue
  [[-5.0, 7.6], [-2.5, 8.6], [0, 9.6], [2.5, 8.6], [5.0, 7.6]].forEach(([pz, ph], pi) => {
    [-0.45, -0.15, 0.15, 0.45].forEach((dz) => {
      addCyl(interiorGroup, 0.11, 0.11, ph, 8, matTinPipes, -49.85, 11.2 + ph * 0.5, pz + dz, 0, 0, 0, false, false);
    });
    if (pi % 2 === 0) {
      addMesh(interiorGroup, new THREE.ConeGeometry(pi === 2 ? 1.15 : 0.9, 2.3, 6), matOak, -49.9, 12.3 + ph, pz);
    }
  });

  // Vierge du Pilier (Notre-Dame de Paris, XIVe siècle) au pilier Sud-Est de la Croisée
  addBox(interiorGroup, 1.15, 1.7, 1.15, matStoneSculpt, 16.4, 1.05, 5.6);
  addStatue(interiorGroup, matStoneSculpt, 16.4, 1.9, 5.6, 2.2, -Math.PI * 0.75, true);

  // Couronnes de lumière (8 grands lustres en bronze suspendus le long de la Nef & Chœur)
  [-38.3, -23.9, -9.5, 1.3, 25.1, 35.9].forEach((lx) => {
    addCyl(interiorGroup, 0.04, 0.04, 21.0, 6, matIron, lx, 24.0, 0, 0, 0, 0, false, false);
    addMesh(interiorGroup, new THREE.TorusGeometry(2.15, 0.14, 6, 18), matBronze, lx, 13.4, 0, Math.PI * 0.5, 0, 0, false, false);
    for (let c = 0; c < 8; c++) {
      const ca = (c / 8) * Math.PI * 2;
      addMesh(interiorGroup, new THREE.SphereGeometry(0.14, 6, 5), matLampGlow, lx + Math.cos(ca) * 2.15, 13.68, Math.sin(ca) * 2.15, 0, 0, 0, false, false);
    }
  });

  // Podium liturgique & Autel en bronze 2024 à la Croisée (lx = 11, lz = 0)
  addCyl(interiorGroup, 5.8, 6.2, 0.52, 24, matStoneInt, transeptX, 0.42, 0, 0, 0, 0, false, true);
  addCyl(interiorGroup, 1.32, 0.58, 1.12, 16, matBronze, transeptX, 1.24, 0);
  addBox(interiorGroup, 0.65, 1.25, 0.65, matBronze, transeptX - 2.6, 1.3, -2.9); // Ambon

  // Stalles du Chœur & Clôture du Chœur polychrome sculptée (lx = 21 .. 41, lz = ±7.0)
  [-6.8, 6.8].forEach((cz) => {
    addBox(interiorGroup, 19.5, 2.5, 1.35, matOak, 31.0, 1.45, cz);
    addBox(interiorGroup, 19.5, 4.2, 0.55, matStoneSculpt, 31.0, 2.3, cz + Math.sign(cz) * 0.9);
    addBox(interiorGroup, 19.2, 2.6, 0.14, matClotureChoeur, 31.0, 2.55, cz + Math.sign(cz) * 1.22, 0, 0, 0, false, false);
    for (let px = 21.5; px <= 40.6; px += 2.4) {
      addCyl(interiorGroup, 0.1, 0.11, 4.2, 6, matStoneSculpt, px, 2.3, cz + Math.sign(cz) * 1.26, 0, 0, 0, false, false);
    }
    addBox(interiorGroup, 19.5, 0.65, 0.6, matGold, 31.0, 4.5, cz + Math.sign(cz) * 0.9, 0, 0, 0, false, false);
  });

  // Maître-autel, Pietà de Nicolas Coustou, Louis XIII & Louis XIV, et Gloire Dorée (lx = 44.5)
  addBox(interiorGroup, 4.6, 0.55, 11.2, matStoneInt, 44.8, 0.45, 0);
  addBox(interiorGroup, 2.4, 2.4, 4.8, matMarbleWhite, 45.2, 1.9, 0);
  // Pietà en marbre blanc + croix glorieuse dorée derrière
  addStatue(interiorGroup, matMarbleWhite, 45.1, 3.1, 0, 2.9, -Math.PI * 0.5, false);
  addStatue(interiorGroup, matMarbleWhite, 44.2, 0.72, -3.6, 2.3, -Math.PI * 0.2, true); // Louis XIII
  addStatue(interiorGroup, matMarbleWhite, 44.2, 0.72, 3.6, 2.3, -Math.PI * 0.8, true); // Louis XIV
  addBox(interiorGroup, 0.4, 6.6, 0.75, matGold, 46.8, 7.6, 0, 0, 0, 0, false, false);
  addBox(interiorGroup, 0.4, 0.68, 4.6, matGold, 46.8, 9.2, 0, 0, 0, 0, false, false);
  // Rayons de la Gloire baroque
  for (let ray = -3; ray <= 3; ray++) {
    addBox(interiorGroup, 0.25, 5.2, 0.18, matGold, 47.0, 9.2, 0, ray * 0.28, 0, 0, false, false);
  }

  // Rangées de chaises en chêne de la restauration 2024 via InstancedMesh (laissant allée centrale |lz| < 2.6 libre)
  const chairSpots = [];
  for (let row = 0; row < 12; row++) {
    const rx = -41.5 + row * 3.1;
    [-4.8, -4.0, -3.2, 3.2, 4.0, 4.8].forEach((rz) => {
      chairSpots.push([rx, 0.22, rz]);
    });
  }
  const chairInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.82, 0.44), matOak, chairSpots.length);
  chairInst.castShadow = false;
  chairInst.receiveShadow = true;
  const dummyChair = new THREE.Object3D();
  chairSpots.forEach(([cx, cy, cz], i) => {
    dummyChair.position.set(cx, cy + 0.41, cz);
    dummyChair.updateMatrix();
    chairInst.setMatrixAt(i, dummyChair.matrix);
  });
  chairInst.instanceMatrix.needsUpdate = true;

  // 3 Lumières intérieures ponctuelles activées uniquement en LOD 0 (< 165 m, haut rendement FPS)
  const interiorLights = [];
  [
    { pos: [-22, 17, 0], color: 0xffd796, base: 1.9, night: 5.2, dist: 68 },
    { pos: [11, 20, 0], color: 0xffe6ba, base: 2.3, night: 6.4, dist: 72 },
    { pos: [38, 12, 0], color: 0xffca68, base: 2.1, night: 5.8, dist: 52 },
  ].forEach((spec) => {
    const light = new THREE.PointLight(spec.color, spec.base, spec.dist, 1.3);
    light.position.set(...spec.pos);
    light.castShadow = false;
    interiorGroup.add(light);
    interiorLights.push({ light, base: spec.base, night: spec.night });
  });

  mergeStaticGroupByMaterial(interiorGroup);
  interiorGroup.add(chairInst);

  // ==========================================================================
  // 3. ENVIRONNEMENT ÎLE DE LA CITÉ (Parvis, Point Zéro, Charlemagne, Square, Ponts)
  // ==========================================================================

  // A. Parvis Notre-Dame — Place Jean-Paul-II (lx = -60 .. -152, lz = -42 .. +42)
  addBox(envGroup, 94.0, 0.24, 84.0, matParvisStone, -106.0, 0.0, 0, 0, 0, 0, false, true);
  // Tracés archéologiques au sol (ancienne Rue Neuve-Notre-Dame & Sainte-Geneviève-des-Ardents)
  addBox(envGroup, 58.0, 0.05, 1.1, matStoneDark, -104.0, 0.13, -11.5, 0, 0, 0, false, true);
  addBox(envGroup, 58.0, 0.05, 1.1, matStoneDark, -104.0, 0.13, 11.5, 0, 0, 0, false, true);
  addBox(envGroup, 14.0, 0.05, 14.0, matStoneDark, -118.0, 0.13, 19.0, 0, 0, 0, false, true);
  // Marches / gradins Ouest du Parvis & garde-corps Crypte archéologique
  addBox(envGroup, 4.0, 0.65, 62.0, matBridgeStone, -149.0, 0.32, 0, 0, 0, 0, false, true);
  addBox(envGroup, 14.0, 0.95, 0.45, matStoneSculpt, -132.0, 0.58, -16.5);
  addBox(envGroup, 0.45, 0.95, 5.2, matStoneSculpt, -125.2, 0.58, -19.0);

  // Point Zéro des Routes de France (médaillon bronze octogonal à lx = -94, lz = 0)
  addCyl(envGroup, 2.3, 2.3, 0.06, 24, matPointZero, -94.0, 0.14, 0, 0, 0, 0, false, true);

  // Statue équestre de Charlemagne et ses Leudes (lx = -88, lz = +28)
  addCyl(envGroup, 2.3, 2.7, 3.6, 8, matBridgeStone, -88.0, 1.9, 28.0);
  addBox(envGroup, 2.9, 1.35, 1.1, matBronze, -88.0, 4.45, 28.0, 0, -0.3, 0); // Cheval
  addCyl(envGroup, 0.42, 0.42, 1.45, 8, matBronze, -88.1, 5.5, 28.0); // Empereur
  addCyl(envGroup, 0.34, 0.44, 2.2, 8, matBronze, -86.1, 2.9, 29.3); // Roland
  addCyl(envGroup, 0.34, 0.44, 2.2, 8, matBronze, -89.8, 2.9, 26.8); // Olivier

  // Helper d'îlot parisien à cour intérieure & toiture mansardée d'ardoise
  const addCourtyardBlock = (cx, cz, w, d, h, courtW, courtD, bodyMat = matHotelDieu) => {
    const sideX = (w - courtW) * 0.5;
    const sideZ = (d - courtD) * 0.5;
    if (sideX > 1.5 && sideZ > 1.5 && courtW > 2 && courtD > 2) {
      // 4 ailes encadrant une cour intérieure verdoyante
      const wings = [
        [cx, cz - d * 0.5 + sideZ * 0.5, w, sideZ],
        [cx, cz + d * 0.5 - sideZ * 0.5, w, sideZ],
        [cx - w * 0.5 + sideX * 0.5, cz, sideX, courtD],
        [cx + w * 0.5 - sideX * 0.5, cz, sideX, courtD],
      ];
      wings.forEach(([wx, wz, ww, wd]) => {
        addBox(envGroup, ww, h, wd, bodyMat, wx, h * 0.5, wz);
        addBox(envGroup, ww + 0.6, 3.2, wd + 0.6, matSlate, wx, h + 1.6, wz);
      });
      addBox(envGroup, courtW - 0.4, 0.18, courtD - 0.4, matLawn, cx, 0.08, cz, 0, 0, 0, false, true);
    } else {
      addBox(envGroup, w, h, d, bodyMat, cx, h * 0.5, cz);
      addBox(envGroup, w + 0.8, 3.4, d + 0.8, matSlate, cx, h + 1.7, cz);
    }
  };

  // B. Hôtel-Dieu (grand quadrilatère Second Empire à 2 cours arborées au Nord du Parvis, lx = -66 .. -148, lz = -43 .. -71)
  addBox(envGroup, 82.0, 17.5, 8.2, matHotelDieu, -107.0, 8.75, -46.8);
  addBox(envGroup, 83.0, 3.4, 9.0, matSlate, -107.0, 19.2, -46.8);
  addBox(envGroup, 82.0, 17.5, 7.6, matHotelDieu, -107.0, 8.75, -67.6);
  addBox(envGroup, 83.0, 3.4, 8.4, matSlate, -107.0, 19.2, -67.6);
  // Ailes Ouest, Centrale & Est délimitant les 2 cours intérieures
  [-143.5, -107.0, -70.5].forEach((wx, wIdx) => {
    const aw = wIdx === 1 ? 10.5 : 8.5;
    addBox(envGroup, aw, 17.5, 25.0, matHotelDieu, wx, 8.75, -57.2);
    addBox(envGroup, aw + 0.8, 3.4, 25.8, matSlate, wx, 19.2, -57.2);
  });
  // Pavillon central d'entrée sur le Parvis + dôme d'ardoise
  addBox(envGroup, 18.0, 20.5, 11.2, matHotelDieu, -107.0, 10.25, -47.2);
  addMesh(envGroup, new THREE.ConeGeometry(9.6, 5.4, 4), matSlate, -107.0, 23.2, -47.2, 0, Math.PI * 0.25, 0);
  [-125.2, -88.8].forEach((kx) => {
    addBox(envGroup, 26.0, 0.18, 12.6, matLawn, kx, 0.08, -57.2, 0, 0, 0, false, true);
  });

  // B2. QUARTIER CHANOINESSE & ANCIEN CLOÎTRE (rive Nord de Notre-Dame, lz = -38 .. -71, lx = -58 .. +62)
  addCourtyardBlock(-44.0, -54.5, 24.0, 25.0, 15.8, 9.5, 10.0, matHotelDieu);
  addCourtyardBlock(-12.5, -54.5, 26.0, 25.0, 16.4, 11.0, 10.0, matHotelDieu);
  addCourtyardBlock(19.5, -54.5, 25.0, 24.0, 15.2, 10.0, 9.5, matHotelDieu);
  // Jardin & Maison des Chantres près du Chevet Nord (lx = +48, lz = -52)
  addBox(envGroup, 18.0, 13.8, 18.0, matHotelDieu, 48.0, 6.9, -56.0);
  addBox(envGroup, 18.8, 3.2, 18.8, matSlate, 48.0, 15.4, -56.0);
  addBox(envGroup, 26.0, 0.22, 11.0, matLawn, 48.0, 0.05, -41.5, 0, 0, 0, false, true);

  // C. Square Jean-XXIII derrière le Chevet (lx = +62 .. +134, lz = -34 .. +34)
  addBox(envGroup, 72.0, 0.22, 68.0, matGravel, 98.0, 0.0, 0, 0, 0, 0, false, true);
  [[-16], [16]].forEach(([lz]) => {
    addBox(envGroup, 42.0, 0.26, 20.0, matLawn, 90.0, 0.04, lz, 0, 0, 0, false, true);
  });
  addCyl(envGroup, 14.0, 14.0, 0.26, 16, matLawn, 118.0, 0.04, 0, 0, 0, 0, false, true);

  // Fontaine néogothique de la Vierge au cœur du Square Jean-XXIII (lx = +96, lz = 0)
  addCyl(envGroup, 3.8, 4.1, 0.72, 8, matBridgeStone, 96.0, 0.45, 0);
  addCyl(envGroup, 0.85, 1.35, 3.4, 8, matStoneSculpt, 96.0, 2.5, 0);
  addStatue(envGroup, matStoneSculpt, 96.0, 4.1, 0, 1.8, 0, false);
  addMesh(envGroup, new THREE.ConeGeometry(1.15, 5.2, 4), matStoneSculpt, 96.0, 8.2, 0, 0, Math.PI * 0.25, 0);

  // D. Rues, quais de l'Île de la Cité, parapets, réverbères & bouquinistes
  // Rue du Cloître (Nord, lz = -33.0) & Quai de l'Archevêché (Sud, lz = +36.2 dégageant la Sacristie)
  addBox(envGroup, 290.0, 0.20, 9.6, matAsphalt, -10.0, -0.02, -33.2, 0, 0, 0, false, true);
  addBox(envGroup, 212.0, 0.20, 9.2, matAsphalt, -48.0, -0.02, 36.2, 0, 0, 0, false, true);
  addBox(envGroup, 84.0, 0.20, 9.2, matAsphalt, 92.0, -0.02, 39.0, 0, 0, 0, false, true);
  addBox(envGroup, 290.0, 0.22, 24.0, matGravel, -10.0, 0.0, 56.0, 0, 0, 0, false, true);

  // Parapets en pierre le long de l'Île de la Cité (|lz| ≈ 74) & boîtes vertes de bouquinistes
  [-74.0, 74.0].forEach((qz, qIdx) => {
    addBox(envGroup, 280.0, 1.05, 0.65, matBridgeStone, -10.0, 0.55, qz);
    if (qIdx === 1) {
      for (let bx = -115; bx <= 65; bx += 18) {
        addBox(envGroup, 4.8, 1.25, 0.95, matBouquiniste, bx, 0.75, qz - 1.2, 0, 0, 0, false, true);
      }
    }
  });

  // Réverbères parisiens (Parvis, Cloître, Promenade Sud & Square Jean-XXIII)
  const lampPositions = [
    [-142, -31], [-116, -31], [-88, -31], [-142, 33], [-116, 33], [-88, 33],
    [-42, -29], [12, -29], [64, -29], [-42, 41.2], [12, 41.2], [60, 41.2],
    [82, -18], [108, -18], [82, 18], [108, 18],
  ];
  lampPositions.forEach(([lx, lz]) => {
    addCyl(envGroup, 0.09, 0.16, 4.4, 8, matIron, lx, 2.25, lz, 0, 0, 0, false, true);
    addMesh(envGroup, new THREE.SphereGeometry(0.28, 8, 6), matLampGlow, lx, 4.65, lz, 0, 0, 0, false, false);
  });

  // E. 4 PONTS AUTHENTIQUES RELIANT NOTRE-DAME AUX DEUX RIVES (Bras Marie & Petit Bras)
  function addSeineBridge(lx, zStart, zEnd, width, style = 'stone') {
    const zMid = (zStart + zEnd) * 0.5;
    const span = Math.abs(zEnd - zStart);
    const bodyMat = style === 'iron' ? matRustIron : style === 'arcole' ? matIron : matBridgeStone;

    addBox(envGroup, width, 1.4, span, bodyMat, lx, 0.95, zMid);
    addBox(envGroup, width - 3.0, 0.24, span + 1.5, style === 'double' ? matGravel : matAsphalt, lx, 1.72, zMid, 0, 0, 0, false, true);
    addBox(envGroup, 0.45, 1.05, span, style === 'stone' ? matBridgeStone : matIron, lx - width * 0.47, 2.15, zMid);
    addBox(envGroup, 0.45, 1.05, span, style === 'stone' ? matBridgeStone : matIron, lx + width * 0.47, 2.15, zMid);
    // Courtes rampes d'approche vers les quais à ly = 0
    [zStart, zEnd].forEach((ze) => {
      const sign = ze < zMid ? -1 : 1;
      addBox(envGroup, width, 1.4, 12.0, bodyMat, lx, 0.15, ze + sign * 5.0, sign * 0.12, 0, 0, false, true);
    });
  }

  addSeineBridge(-132, 74, 152, 20.0, 'stone');   // Petit-Pont — Cardinal-Lustiger
  addSeineBridge(-26, 75, 152, 12.0, 'iron');     // Pont au Double devant la Nef Sud
  addSeineBridge(-132, -74, -152, 19.0, 'arcole'); // Pont d'Arcole (Bras Marie)
  addSeineBridge(118, 64, 146, 12.0, 'stone');    // Pont de l'Archevêché

  // Arbres du Square Jean-XXIII, des cours de l'Hôtel-Dieu, du Cloître & des berges (InstancedMesh, 2 Draw Calls)
  const ndTreeCoords = [
    [70, -24], [82, -26], [96, -25], [112, -23], [124, -14],
    [70, 24], [82, 26], [96, 25], [112, 23], [124, 14],
    [-146, -24], [-146, 24],
    [-132, 50], [-102, 50], [-72, 50], [-36, 50], [-2, 50], [32, 50], [64, 50],
    [-132, 66], [-92, 66], [-48, 66], [4, 66], [48, 66],
    [-125, -57], [-89, -57], [-12, -54], [48, -42], [60, -42],
  ];
  const matTreeTrunk = new THREE.MeshStandardMaterial({ color: 0x524030, roughness: 0.92 });
  const matTreeLeaf = new THREE.MeshStandardMaterial({ color: 0x4f7d3d, roughness: 0.85 });
  const trunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.36, 4.4, 6), matTreeTrunk, ndTreeCoords.length);
  const crownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.8, 1), matTreeLeaf, ndTreeCoords.length);
  crownsInst.receiveShadow = true;

  const dummyT = new THREE.Object3D();
  ndTreeCoords.forEach(([tx, tz], i) => {
    const sc = 0.86 + ((i * 19) % 7) * 0.06;
    dummyT.position.set(tx, 2.2 * sc, tz);
    dummyT.rotation.set(0, (i * 1.3) % 6.28, 0);
    dummyT.scale.set(sc, sc, sc);
    dummyT.updateMatrix();
    trunksInst.setMatrixAt(i, dummyT.matrix);

    dummyT.position.set(tx, 5.6 * sc, tz);
    dummyT.scale.set(sc * 1.15, sc * 0.9, sc * 1.1);
    dummyT.updateMatrix();
    crownsInst.setMatrixAt(i, dummyT.matrix);
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  crownsInst.instanceMatrix.needsUpdate = true;

  mergeStaticGroupByMaterial(envGroup);
  envGroup.add(trunksInst);
  envGroup.add(crownsInst);

  // ==========================================================================
  // 4. COLLIDERS ROTATIONNÉS & SOL VISITABLE ÎLE DE LA CITÉ (FPS)
  // ==========================================================================
  const colliders = [];
  const circleColliders = [];

  function addWallCircles(x1, z1, x2, z2, r = 0.9) {
    const len = Math.hypot(x2 - x1, z2 - z1) || 1;
    const steps = Math.max(1, Math.ceil(len / (r * 1.1)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wp = notreDameLocalToWorld(THREE.MathUtils.lerp(x1, x2, t), 0, THREE.MathUtils.lerp(z1, z2, t));
      circleColliders.push({ x: wp.x, z: wp.z, r });
    }
  }

  // Façade Ouest avec ouverture libre au Portail Central (|lz| < 2.9 m)
  addWallCircles(-59.5, -20.5, -59.5, -3.4, 1.1);
  addWallCircles(-59.5, 3.4, -59.5, 20.5, 1.1);
  const trumeauW = notreDameLocalToWorld(-60.4, 0, 0);
  circleColliders.push({ x: trumeauW.x, z: trumeauW.z, r: 0.42 });

  // Murs des bas-côtés & transepts
  addWallCircles(-55, -20.2, 4, -20.2, 1.1);
  addWallCircles(-55, 20.2, 4, 20.2, 1.1);
  addWallCircles(18, -20.2, 42, -20.2, 1.1);
  addWallCircles(18, 20.2, 42, 20.2, 1.1);
  addWallCircles(3.8, -24.4, 18.2, -24.4, 1.0);
  addWallCircles(3.8, 24.4, 18.2, 24.4, 1.0);

  // Colonnes intérieures & stalles du chœur
  pillarXs.forEach((px) => {
    [-6.9, 6.9].forEach((pz) => {
      const w = notreDameLocalToWorld(px, 0, pz);
      circleColliders.push({ x: w.x, z: w.z, r: 0.92 });
    });
  });
  addWallCircles(21, -7.2, 41, -7.2, 0.8);
  addWallCircles(21, 7.2, 41, 7.2, 0.8);

  const altarW = notreDameLocalToWorld(transeptX, 0, 0);
  circleColliders.push({ x: altarW.x, z: altarW.z, r: 1.5 });
  const charlemagneW = notreDameLocalToWorld(-88, 0, 28);
  circleColliders.push({ x: charlemagneW.x, z: charlemagneW.z, r: 3.1 });
  const fountW = notreDameLocalToWorld(96, 0, 0);
  circleColliders.push({ x: fountW.x, z: fountW.z, r: 4.1 });

  function getFloorHeightAt(wx, wz) {
    const { lx, lz } = worldToNotreDameLocal(wx, wz);
    const inChurch =
      (lx >= -57 && lx <= 42 && Math.abs(lz) <= 19.5) ||
      (lx >= 4 && lx <= 18 && Math.abs(lz) <= 23.8) ||
      Math.hypot(lx - 41, lz) <= 19.2;

    if (inChurch) {
      if (Math.hypot(lx - transeptX, lz) <= 5.8) return 0.45 + 0.68;
      if (lx >= 42.5 && lx <= 47.0 && Math.abs(lz) <= 5.5) return 0.45 + 0.72;
      return 0.45 + 0.21;
    }
    if (lx >= -152 && lx <= -60 && Math.abs(lz) <= 42) return 0.45 + 0.13;
    if (lx >= 62 && lx <= 134 && Math.abs(lz) <= 34) return 0.45 + 0.12;
    return 0.45;
  }

  // ==========================================================================
  // 5. PROLOGUE 360° & 7 POINTS D'INTÉRÊT HISTORIQUES (Budget TTS optimisé)
  // ==========================================================================
  const introChapter = {
    id: 'nd-intro-360',
    title: 'Histoire de Notre-Dame de Paris — Tour 360°',
    era: '1163 – 1345 & 2024 • Gothique & Viollet-le-Duc',
    location: 'Île de la Cité • 4e arr., Paris',
    history:
      "Posée au cœur de l'Île de la Cité dès 1163 sous Maurice de Sully, Notre-Dame incarne l'apogée du gothique français, restaurée par Viollet-le-Duc puis rouverte en décembre 2024.",
    anecdote:
      "Sauvée lors de l'incendie d'avril 2019, sa charpente de chêne et sa flèche de 96 m ont été rebâties en cinq ans par plus de deux mille artisans.",
    voiceover:
      "Bienvenue sur l'Île de la Cité devant Notre-Dame de Paris, cœur et kilomètre zéro de la France. " +
      "Pendant ce tour à 360 degrés, admirons ce chef-d'œuvre commencé en 1163 : ses tours de 69 m, ses arcs-boutants et la flèche de Viollet-le-Duc reconstruite à 96 m. " +
      "Entrons ensuite découvrir la nef en pierre blonde restaurée, les rosaces et le chœur.",
  };

  function makePoi(spec) {
    return {
      ...spec,
      markerPos: notreDameLocalToWorld(...spec.localMarker),
      cameraPos: notreDameLocalToWorld(...spec.localCam),
      target: notreDameLocalToWorld(...spec.localTarget),
      fpsPos: notreDameLocalToWorld(...spec.localFps),
    };
  }

  const pois = [
    makePoi({
      id: 'nd-facade-portails',
      title: 'La Façade Occidentale, les Trois Portails & la Galerie des Rois',
      shortTitle: 'Façade & Portails',
      era: '1200 – 1250 • Statuaire gothique',
      location: 'Parvis • Côté Ouest',
      localMarker: [-60.5, 16.5, 0],
      localCam: [-106, 17.5, 14],
      localTarget: [-58, 15.5, 0],
      localFps: [-82, 0.13, 0],
      history:
        "La façade s'ordonne en trois portails du Jugement Dernier, de la Vierge et de Sainte-Anne, surmontés des 28 Rois de Juda et de la Rose ouest large de près de 10 m.",
      anecdote:
        "Décapités en 1793 par erreur révolutionnaire, plusieurs visages originaux des Rois ont été retrouvés enfouis à Paris en 1977.",
    }),
    makePoi({
      id: 'nd-tours-chimeres',
      title: 'Les Tours de 69 m, le Bourdon Emmanuel & la Galerie des Chimères',
      shortTitle: 'Tours & Chimères',
      era: '1240 & 1850 • Beffrois & Viollet-le-Duc',
      location: 'Tours Nord & Sud • 69 m',
      localMarker: [-58, 46.0, 12],
      localCam: [-108, 49.0, 26],
      localTarget: [-56, 46.5, 6],
      localFps: [-92, 0.13, 14],
      history:
        "Soulignées par la Galerie des Chimères ajourée, les tours de 69 m abritent les cloches derrière leurs abat-sons de chêne, dont l'illustre bourdon Emmanuel de 1681.",
      anecdote:
        "Les chimères célèbres comme Le Stryge ont été créées par Viollet-le-Duc au XIXe siècle pour veiller sur Paris depuis la balustrade.",
    }),
    makePoi({
      id: 'nd-fleche-charpente',
      title: 'La Flèche de Viollet-le-Duc à 96 m, les Apôtres & le Coq d’Or',
      shortTitle: 'Flèche 96 m & Apôtres',
      era: '1859 & 2024 • Charpente & Plomb',
      location: 'Croisée du Transept • Ciel de Paris',
      localMarker: [11, 70.0, 0],
      localCam: [-38, 72.0, 56],
      localTarget: [11, 68.0, 0],
      localFps: [-48, 0.13, 44],
      history:
        "À 96 m au-dessus de la toiture en plomb de « la Forêt », la flèche octogonale réunit les douze Apôtres et les quatre Évangélistes en cuivre patiné vert-de-gris.",
      anecdote:
        "Saint Thomas porte les traits de Viollet-le-Duc se retournant vers sa flèche, couronnée fin 2023 d'un nouveau coq phénix doré.",
    }),
    makePoi({
      id: 'nd-grande-nef',
      title: 'La Grande Nef Gothique Restaurée & les Voûtes à 33 m',
      shortTitle: 'Grande Nef (33 m)',
      era: '1180 – 1225 & 2024 • Pierre blonde nettoyée',
      location: 'Intérieur • Grande Nef centrale',
      localMarker: [-14, 15.0, 0],
      localCam: [-43, 14.5, 0],
      localTarget: [12, 13.2, 0],
      localFps: [-44, 0.21, 0],
      history:
        "Nettoyée lors de la restauration de 2024, la pierre calcaire blonde rayonne sous les voûtes sexpartites à 33 m, portées par les colonnes et les tribunes.",
      anecdote:
        "Dans la nef se répondent les doubles bas-côtés et des lustres contemporains en bronze éclairant l'espace restauré.",
    }),
    makePoi({
      id: 'nd-roses-vitraux',
      title: 'La Croisée du Transept & les Grandes Rosaces du XIIIe Siècle',
      shortTitle: 'Grandes Rosaces',
      era: 'Vers 1250 – 1265 • Jean de Chelles',
      location: 'Intérieur • Croisée & Transepts',
      localMarker: [11, 24.0, -21],
      localCam: [11, 21.5, 14],
      localTarget: [11, 20.2, -23],
      localFps: [11, 0.68, 8],
      history:
        "Larges de 13,1 m, les rosaces Nord et Sud figurent parmi les plus vastes d'Europe et baignent la croisée et le nouvel autel de reflets saphir, rubis et or.",
      anecdote:
        "Épargnée en 2019, la Rose Nord conserve aujourd'hui encore la plus grande part de ses verrières médiévales d'origine.",
    }),
    makePoi({
      id: 'nd-choeur-pieta',
      title: 'Le Chœur, la Pietà du Vœu de Louis XIII & le Grand Orgue',
      shortTitle: 'Chœur, Pietà & Orgue',
      era: 'XVIIe – XIXe siècle • Coustou & Cavaillé-Coll',
      location: 'Intérieur • Sanctuaire & Tribune Ouest',
      localMarker: [44.5, 6.2, 0],
      localCam: [16, 8.8, 0],
      localTarget: [45, 7.5, 0],
      localFps: [22, 0.21, 0],
      history:
        "Encadré de ses stalles et d'une clôture sculptée, le sanctuaire met à l'honneur la Pietà de Nicolas Coustou entre Louis XIII et Louis XIV, face au Grand Orgue.",
      anecdote:
        "Nettoyés un à un après l'incendie, les huit mille tuyaux de l'orgue Cavaillé-Coll résonnent de nouveau vers la Gloire dorée du chœur.",
    }),
    makePoi({
      id: 'nd-chevet-parvis',
      title: 'Les Arcs-Boutants du Chevet, le Square Jean-XXIII & le Point Zéro',
      shortTitle: 'Chevet & Point Zéro',
      era: '1320 • Arcs-boutants de Jean Ravy',
      location: 'Pointe Est • Île de la Cité & Seine',
      localMarker: [64, 24.0, 12],
      localCam: [114, 28.0, 44],
      localTarget: [42, 22.0, 0],
      localFps: [90, 0.12, 8],
      history:
        "Depuis le Square Jean-XXIII et les quais se déploient les grands arcs-boutants à simple volée d'environ 15 m soutenant tout le chevet gothique au-dessus de la Seine.",
      anecdote:
        "Sur le parvis devant les portails, repère l'étoile de bronze du Point Zéro d'où se mesurent toutes les routes de France.",
    }),
  ];

  // ==========================================================================
  // 6. GESTION LOD À 3 NIVEAUX & ILLUMINATION NOCTURNE / VITRAUX
  // ==========================================================================
  let currentLod = 0;
  let currentCamDist = 110;

  function setLodLevel(level, camDist = 110) {
    currentLod = level;
    currentCamDist = camDist;
    exteriorGroup.visible = true;
    interiorGroup.visible = level === 0;
    envGroup.visible = camDist < 2600;
  }

  function update(dt, nightFactor = 0.1, glassGlow = 0.1, isActiveMonument = false) {
    const glow = Math.max(0, (nightFactor - 0.16) / 0.84);
    const gg = Math.max(glow, glassGlow);

    const useInteriorLights = (isActiveMonument || currentLod === 0) && currentCamDist < 165;
    for (let i = 0; i < interiorLights.length; i++) {
      const entry = interiorLights[i];
      entry.light.visible = useInteriorLights;
      if (useInteriorLights) {
        entry.light.intensity = THREE.MathUtils.lerp(entry.base, entry.night, nightFactor);
      }
    }

    matStoneExt.emissive.setHex(0xd49c48);
    matStoneExt.emissiveIntensity = glow * 0.22;
    matGold.emissiveIntensity = 0.16 + glow * 0.36;
    matRoseWest.emissiveIntensity = 0.2 + gg * 0.9;
    matRoseNorth.emissiveIntensity = 0.22 + gg * 0.95;
    matRoseSouth.emissiveIntensity = 0.22 + gg * 0.95;
    matLancetGlass.emissiveIntensity = 0.24 + gg * 0.88;
    matWindowExt.emissiveIntensity = 0.04 + glow * 0.85;
    matLampGlow.emissiveIntensity = 0.45 + glow * 1.7;

    void dt;
  }

  return {
    id: 'notre-dame',
    name: 'Cathédrale Notre-Dame de Paris',
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: NOTRE_DAME_WORLD_POS.x - 190,
      maxX: NOTRE_DAME_WORLD_POS.x + 190,
      minZ: NOTRE_DAME_WORLD_POS.z - 190,
      maxZ: NOTRE_DAME_WORLD_POS.z + 190,
    },
    fpsSpawnPos: notreDameLocalToWorld(-88, 0.13, 0),
    fpsSpawnTarget: notreDameLocalToWorld(-56, 18.0, 0),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
