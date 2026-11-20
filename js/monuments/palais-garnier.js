import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #4 : LE PALAIS GARNIER — OPÉRA NATIONAL DE PARIS (1:1)
 * Haute fidélité architecturale Second Empire (Charles Garnier, 1861 – 1875)
 * Position GPS : 48.8720° N, 2.3316° E -> (-980, 0, -956)
 * Orientation : +Z local pointe exactement vers Place de l'Opéra (-922, -778)
 *               et l'Avenue de l'Opéra -> GARNIER_ROT_Y = atan2(58, 178)
 * ============================================================================
 */

export const GARNIER_WORLD_POS = new THREE.Vector3(-980, 0, -956);
export const GARNIER_ROT_Y = Math.atan2(58, 178);

const COS_R = Math.cos(GARNIER_ROT_Y);
const SIN_R = Math.sin(GARNIER_ROT_Y);

export function garnierLocalToWorld(lx, ly, lz) {
  return new THREE.Vector3(
    GARNIER_WORLD_POS.x + lx * COS_R + lz * SIN_R,
    GARNIER_WORLD_POS.y + ly,
    GARNIER_WORLD_POS.z - lx * SIN_R + lz * COS_R
  );
}

export function worldToGarnierLocal(wx, wz) {
  const dx = wx - GARNIER_WORLD_POS.x;
  const dz = wz - GARNIER_WORLD_POS.z;
  return {
    lx: dx * COS_R - dz * SIN_R,
    lz: dx * SIN_R + dz * COS_R,
  };
}

// ============================================================================
// TEXTURES PROCÉDURALES SECOND EMPIRE (CanvasTexture haute définition)
// ============================================================================

function createGarnierStoneTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ece0c8';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 22) {
    const shade = ((y * 11) % 15) - 7;
    ctx.fillStyle = `rgba(${232 + shade}, ${220 + shade}, ${195 + shade}, 0.5)`;
    ctx.fillRect(0, y, size, 21);
    ctx.fillStyle = 'rgba(116, 102, 82, 0.22)';
    ctx.fillRect(0, y + 21, size, 1.3);
  }

  ctx.strokeStyle = 'rgba(122, 108, 86, 0.16)';
  ctx.lineWidth = 1.1;
  for (let row = 0; row < 24; row++) {
    const y0 = row * 22;
    const off = (row % 2) * 32;
    for (let x = off; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + 22);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 4000; i++) {
    const x = (i * 173) % size;
    const y = (i * 277) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,252,244,0.08)' : 'rgba(92,80,62,0.065)';
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

function createMarbleTexture(baseHex, veinHex, veinLightHex) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 28; i++) {
    ctx.strokeStyle = i % 3 === 0 ? veinLightHex : veinHex;
    ctx.lineWidth = 0.7 + (i % 3) * 0.85;
    ctx.globalAlpha = 0.24 + (i % 4) * 0.08;
    ctx.beginPath();
    let x = (i * 37) % size;
    let y = 0;
    ctx.moveTo(x, y);
    for (let s = 1; s <= 12; s++) {
      y = (s / 12) * size;
      x += Math.sin(s * 1.4 + i) * 16 + ((i % 2) * 8 - 4);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCopperPatinaTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#5ea88e');
  g.addColorStop(0.5, '#4b9279');
  g.addColorStop(1, '#36755f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Joints debout verticaux & feuilles horizontales de cuivre oxydé
  for (let x = 0; x < size; x += 32) {
    ctx.fillStyle = 'rgba(26, 58, 46, 0.34)';
    ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = 'rgba(176, 232, 210, 0.16)';
    ctx.fillRect(x + 2, 0, 1.5, size);
  }
  for (let y = 0; y < size; y += 64) {
    ctx.fillStyle = 'rgba(24, 52, 41, 0.22)';
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let i = 0; i < 2400; i++) {
    const px = (i * 157) % size;
    const py = (i * 263) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(182, 238, 216, 0.12)' : 'rgba(22, 54, 42, 0.1)';
    ctx.fillRect(px, py, 3, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMullionedWindowTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Vitrage profond Second Empire avec reflets chauds intérieurs
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1f2e40');
  grad.addColorStop(0.42, '#4a473a');
  grad.addColorStop(1, '#2a241c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Reflets chauds de lustres intérieurs
  const rad = ctx.createRadialGradient(w * 0.5, h * 0.55, 8, w * 0.5, h * 0.55, w * 0.48);
  rad.addColorStop(0, 'rgba(255, 218, 140, 0.45)');
  rad.addColorStop(1, 'rgba(255, 195, 95, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  // Grand cadre mouluré & petits bois dorés
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 10);
  ctx.lineTo(w * 0.5, h - 10);
  [0.24, 0.44, 0.64, 0.82].forEach((f) => {
    ctx.moveTo(10, h * f);
    ctx.lineTo(w - 10, h * f);
  });
  ctx.stroke();

  // Imposte rayonnante en éventail en haut de la baie
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.24, w * 0.42, Math.PI, 0);
  for (let i = 1; i <= 5; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    ctx.moveTo(w * 0.5, h * 0.24);
    ctx.lineTo(w * 0.5 + Math.cos(a) * w * 0.42, h * 0.24 + Math.sin(a) * w * 0.42);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSalviatiMosaicTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#c8952e');
  g.addColorStop(0.5, '#ebd074');
  g.addColorStop(1, '#b67d22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Bordure grecque polychrome bleu lapis & rouge
  ctx.strokeStyle = '#7e1e24';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = '#1b477d';
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // Médaillons d'apparat
  [128, 256, 384].forEach((cx) => {
    ctx.fillStyle = '#204d82';
    ctx.beginPath();
    ctx.arc(cx, h * 0.5, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff0b8';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#f2ca63';
    ctx.beginPath();
    ctx.arc(cx, h * 0.5, 22, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tesselles brillantes subtiles
  for (let y = 0; y < h; y += 8) {
    for (let x = 0; x < w; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillStyle = 'rgba(255, 250, 225, 0.14)';
        ctx.fillRect(x, y, 6, 6);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBalconyCartoucheTexture() {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#8b6826';
  ctx.fillRect(0, 0, w, h);

  // Moulures haute & basse en or vif
  ctx.fillStyle = '#efd074';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 14, w, 14);

  // Cartouches elliptiques Second Empire & guirlandes
  [86, 256, 426].forEach((cx) => {
    ctx.fillStyle = '#5f1119';
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.5, 54, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f6dc84';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#f2ca62';
    ctx.beginPath();
    ctx.arc(cx, h * 0.5, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStageCurtainTexture() {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Plis verticaux ombrés en trompe-l'œil façon velours cramoisi
  for (let x = 0; x < w; x++) {
    const fold = Math.sin((x / w) * Math.PI * 12) * 0.5 + 0.5;
    const drapeCurve = Math.sin((x / w) * Math.PI) * 18;
    const r = Math.round(92 + fold * 78 + drapeCurve * 0.4);
    const g = Math.round(10 + fold * 14);
    const b = Math.round(16 + fold * 18);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, 0, 1, h);
  }

  // Galon brodé d'or en bas & grand lambrequin supérieur drapé
  const goldGrad = ctx.createLinearGradient(0, 0, 0, 96);
  goldGrad.addColorStop(0, '#c89b38');
  goldGrad.addColorStop(0.5, '#f6db82');
  goldGrad.addColorStop(1, '#986c1c');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, w, 46);
  ctx.fillRect(0, h - 58, w, 42);

  // Festons et glands dorés
  for (let cx = 42; cx < w; cx += 84) {
    ctx.strokeStyle = '#f6db82';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, 44, 38, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#f6db82';
    ctx.fillRect(cx - 4, h - 78, 8, 56);
  }

  // Embrasses diagonales dorées
  ctx.strokeStyle = '#f3d26b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  ctx.quadraticCurveTo(w * 0.25, h * 0.58, 0, h * 0.72);
  ctx.moveTo(w, h * 0.42);
  ctx.quadraticCurveTo(w * 0.75, h * 0.58, w, h * 0.72);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createParquetVersaillesTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#754e28';
  ctx.fillRect(0, 0, size, size);

  const half = size * 0.5;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const ox = col * half;
      const oy = row * half;
      ctx.strokeStyle = '#4f3216';
      ctx.lineWidth = 4;
      ctx.strokeRect(ox + 2, oy + 2, half - 4, half - 4);
      ctx.fillStyle = (row + col) % 2 === 0 ? '#855a30' : '#6c4723';
      ctx.fillRect(ox + 6, oy + 6, half - 12, half - 12);
      ctx.strokeStyle = 'rgba(54, 34, 15, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ox + 6, oy + 6);
      ctx.lineTo(ox + half - 6, oy + half - 6);
      ctx.moveTo(ox + half - 6, oy + 6);
      ctx.lineTo(ox + 6, oy + half - 6);
      ctx.moveTo(ox + half * 0.5, oy + 6);
      ctx.lineTo(ox + half * 0.5, oy + half - 6);
      ctx.moveTo(ox + 6, oy + half * 0.5);
      ctx.lineTo(ox + half - 6, oy + half * 0.5);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGranitePavingTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#c8c0b1';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 8; col++) {
      const shade = ((r * 13 + col * 19) % 14) - 7;
      ctx.fillStyle = `rgb(${200 + shade}, ${192 + shade}, ${178 + shade})`;
      ctx.fillRect(col * step + 1, r * step + 1, step - 2, step - 2);
      ctx.strokeStyle = 'rgba(118, 110, 96, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(col * step, r * step, step, step);
    }
  }
  // Filets clairs de calepinage géométrique
  ctx.strokeStyle = 'rgba(242, 236, 224, 0.42)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHaussmannFacadeTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e4d7be';
  ctx.fillRect(0, 0, w, h);

  // Bandeaux horizontaux haussmanniens (haut v=1 en haut du Canvas, RdC v=0 en bas y=400..505)
  ctx.fillStyle = '#cbbca0';
  [85, 190, 295, 395].forEach((y) => ctx.fillRect(0, y, w, 10));

  // Fenêtres à petits bois + garde-corps fer forgé par étage (haut -> bas)
  const floors = [
    { y: 18, h: 56 },
    { y: 105, h: 72 },
    { y: 208, h: 74 },
    { y: 312, h: 68 },
  ];
  floors.forEach((fl, fIdx) => {
    for (let x = 22; x < w - 30; x += 62) {
      ctx.fillStyle = '#253140';
      ctx.fillRect(x, fl.y, 34, fl.h);
      ctx.strokeStyle = '#d6c8ad';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 2, fl.y - 2, 38, fl.h + 4);
      ctx.strokeStyle = '#a59a86';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 17, fl.y);
      ctx.lineTo(x + 17, fl.y + fl.h);
      ctx.stroke();
      if (fIdx === 0 || fIdx === 2) {
        ctx.fillStyle = '#252930';
        ctx.fillRect(x - 4, fl.y + fl.h - 10, 42, 4);
      }
    }
  });

  // Arcades commerciales chaudes du rez-de-chaussée (tout en bas de l'immeuble)
  for (let x = 18; x < w - 30; x += 96) {
    ctx.fillStyle = '#3b2c1d';
    ctx.fillRect(x, 412, 74, 90);
    ctx.fillStyle = 'rgba(255, 210, 128, 0.38)';
    ctx.fillRect(x + 6, 418, 62, 78);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createOperaInscriptionTexture() {
  const w = 1024;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#4f201f';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#f3d26b';
  ctx.font = 'bold 46px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ACADÉMIE NATIONALE DE MUSIQUE', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createVaultCeilingTexture(variant = 'pils') {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  if (variant === 'baudry') {
    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 24, size * 0.5, size * 0.5, size * 0.55);
    grad.addColorStop(0, '#f6de9e');
    grad.addColorStop(0.55, '#c99340');
    grad.addColorStop(1, '#6f4b1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#fae5a8';
    ctx.lineWidth = 6;
    for (let y = 64; y < size; y += 128) {
      ctx.strokeRect(24, y - 48, size - 48, 96);
    }
    [110, 256, 402].forEach((cx) => {
      ctx.fillStyle = '#5a88b8';
      ctx.beginPath();
      ctx.ellipse(cx, size * 0.5, 44, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f3cf68';
      ctx.lineWidth = 5;
      ctx.stroke();
    });
  } else {
    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 32, size * 0.5, size * 0.5, size * 0.56);
    grad.addColorStop(0, '#b9daf2');
    grad.addColorStop(0.45, '#ebd092');
    grad.addColorStop(0.8, '#b57b42');
    grad.addColorStop(1, '#784824');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#f3d16c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.5, 198, 198, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const mx = size * 0.5 + Math.cos(ang) * 145;
      const my = size * 0.5 + Math.sin(ang) * 145;
      ctx.fillStyle = a % 2 === 0 ? 'rgba(220, 120, 88, 0.58)' : 'rgba(95, 148, 198, 0.58)';
      ctx.beginPath();
      ctx.arc(mx, my, 36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChagallCeilingTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#f6efe0';
  ctx.fillRect(0, 0, size, size);

  const sectors = [
    { start: -0.25, end: 1.05, color: '#1b55a8', rMax: 490 },
    { start: 1.05, end: 2.35, color: '#d8352a', rMax: 490 },
    { start: 2.35, end: 3.65, color: '#2b9c5b', rMax: 490 },
    { start: 3.65, end: 5.05, color: '#f3be24', rMax: 490 },
    { start: 5.05, end: 6.04, color: '#f4e8cd', rMax: 490 },
  ];

  sectors.forEach((sec) => {
    ctx.fillStyle = sec.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, sec.rMax, sec.start, sec.end);
    ctx.closePath();
    ctx.fill();
  });

  const splashes = [
    [cx - 210, cy - 160, 130, 'rgba(243, 190, 36, 0.72)'],
    [cx + 195, cy - 175, 135, 'rgba(27, 85, 168, 0.68)'],
    [cx + 190, cy + 175, 138, 'rgba(216, 53, 42, 0.72)'],
    [cx - 190, cy + 185, 135, 'rgba(43, 156, 91, 0.68)'],
    [cx, cy - 290, 100, 'rgba(235, 128, 42, 0.65)'],
    [cx, cy + 285, 100, 'rgba(130, 62, 168, 0.55)'],
  ];
  splashes.forEach(([sx, sy, sr, col]) => {
    const g = ctx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dist = 240 + (i % 3) * 62;
    const fx = cx + Math.cos(a) * dist;
    const fy = cy + Math.sin(a) * dist;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a + Math.PI * 0.5);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 250, 236, 0.8)' : 'rgba(24, 34, 62, 0.62)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 46, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -46, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255, 245, 214, 0.88)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx + 210, cy - 110);
  ctx.lineTo(cx + 235, cy - 235);
  ctx.lineTo(cx + 260, cy - 110);
  ctx.stroke();

  const centerGlow = ctx.createRadialGradient(cx, cy, 12, cx, cy, 148);
  centerGlow.addColorStop(0, '#fff7dc');
  centerGlow.addColorStop(0.55, '#f2cc63');
  centerGlow.addColorStop(1, 'rgba(242, 204, 99, 0)');
  ctx.fillStyle = centerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 148, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 482, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 462, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildPalaisGarnierMonument(scene) {
  const root = new THREE.Group();
  root.name = 'PalaisGarnier_Root';
  root.position.copy(GARNIER_WORLD_POS);
  root.rotation.y = GARNIER_ROT_Y;
  scene.add(root);

  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'Garnier_Exterior';
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'Garnier_Interior';
  const envGroup = new THREE.Group();
  envGroup.name = 'Garnier_Env';
  root.add(exteriorGroup, interiorGroup, envGroup);

  // --- MATÉRIAUX PARTAGÉS (~23 matériaux pour rester bien sous < 250 Draw Calls) ---
  const stoneTex = createGarnierStoneTexture();
  const matStone = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xf1e5ce, roughness: 0.76 });
  const matStoneSculp = new THREE.MeshStandardMaterial({ color: 0xf5ebd8, roughness: 0.7 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xe6be56, roughness: 0.28, metalness: 0.84 });
  const matCopperDome = new THREE.MeshStandardMaterial({
    map: createCopperPatinaTexture(),
    color: 0xffffff,
    roughness: 0.54,
    metalness: 0.34,
  });
  const matZincRoof = new THREE.MeshStandardMaterial({ color: 0x566473, roughness: 0.52, metalness: 0.38 });
  const matSlate = new THREE.MeshStandardMaterial({ color: 0x343f4e, roughness: 0.62, metalness: 0.22 });
  const matBronze = new THREE.MeshStandardMaterial({ color: 0x5c4f3d, roughness: 0.42, metalness: 0.6 });
  const matMetroGreen = new THREE.MeshStandardMaterial({ color: 0x1e5c45, roughness: 0.48, metalness: 0.28 });
  const matRoseMarble = new THREE.MeshStandardMaterial({
    map: createMarbleTexture('#b87467', '#6a2f2a', '#e8cfc5'),
    roughness: 0.34,
  });
  const matGreenMarble = new THREE.MeshStandardMaterial({
    map: createMarbleTexture('#2e5c4a', '#163327', '#86b59f'),
    roughness: 0.35,
  });
  const matWhiteMarble = new THREE.MeshStandardMaterial({
    map: createMarbleTexture('#f4efe6', '#bfb6a8', '#ffffff'),
    roughness: 0.3,
  });
  const matVelvetRed = new THREE.MeshStandardMaterial({ color: 0x8f1722, roughness: 0.88 });
  const matBalconyGold = new THREE.MeshStandardMaterial({
    map: createBalconyCartoucheTexture(),
    roughness: 0.34,
    metalness: 0.62,
  });
  const matStageCurtain = new THREE.MeshStandardMaterial({
    map: createStageCurtainTexture(),
    roughness: 0.76,
  });
  const matParquet = new THREE.MeshStandardMaterial({
    map: createParquetVersaillesTexture(),
    roughness: 0.44,
  });
  const matMullionGlass = new THREE.MeshStandardMaterial({
    map: createMullionedWindowTexture(),
    emissive: new THREE.Color(0xffc972),
    emissiveIntensity: 0.22,
    roughness: 0.22,
    metalness: 0.4,
  });
  const matMosaicGold = new THREE.MeshStandardMaterial({
    map: createSalviatiMosaicTexture(),
    emissive: new THREE.Color(0xd49a38),
    emissiveIntensity: 0.14,
    roughness: 0.36,
    metalness: 0.55,
  });
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff4d6,
    emissive: new THREE.Color(0xffd27a),
    emissiveIntensity: 0.48,
    roughness: 0.2,
  });
  const matGranite = new THREE.MeshStandardMaterial({
    map: createGranitePavingTexture(),
    roughness: 0.86,
  });
  const matHaussmannStone = new THREE.MeshStandardMaterial({
    map: createHaussmannFacadeTexture(),
    roughness: 0.76,
  });
  const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x363a42, roughness: 0.9 });
  const matInscription = new THREE.MeshStandardMaterial({ map: createOperaInscriptionTexture(), roughness: 0.42 });
  const matPilsCeiling = new THREE.MeshStandardMaterial({
    map: createVaultCeilingTexture('pils'),
    emissive: new THREE.Color(0xffdca0),
    emissiveIntensity: 0.22,
    roughness: 0.52,
    side: THREE.DoubleSide,
  });
  const matBaudryCeiling = new THREE.MeshStandardMaterial({
    map: createVaultCeilingTexture('baudry'),
    emissive: new THREE.Color(0xffe0a6),
    emissiveIntensity: 0.24,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
  const matChagallCeiling = new THREE.MeshStandardMaterial({
    map: createChagallCeilingTexture(),
    emissive: new THREE.Color(0xfff1cf),
    emissiveIntensity: 0.5,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const matPythieWater = new THREE.MeshStandardMaterial({
    color: 0x1e4d4f,
    roughness: 0.15,
    metalness: 0.35,
  });

  // --- HELPERS GÉOMÉTRIQUES SECOND EMPIRE (FUSIONNÉS À 0 DRAW CALL SUPPLÉMENTAIRE) ---
  const addBox = (w, h, d, x, y, z, mat, parent, { cast = true, receive = true, rotY = 0, rotX = 0, rotZ = 0 } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    if (rotX) m.rotation.x = rotX;
    if (rotZ) m.rotation.z = rotZ;
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  };

  const addCyl = (rt, rb, h, seg, x, y, z, mat, parent, { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  };

  /**
   * Véritable travée d'arcade en plein cintre (ExtrudeGeometry) + clé d'arc saillante
   */
  function addArchWall(
    w,
    h,
    archR,
    springY,
    depth,
    x,
    yBottom,
    z,
    mat,
    parent,
    { rotY = 0, keystone = true, keystoneMat = null } = {}
  ) {
    const shape = new THREE.Shape();
    const hw = w * 0.5;
    const r = Math.min(archR, hw - 0.12);
    shape.moveTo(-hw, 0);
    if (springY > 0.02) {
      shape.lineTo(-r, 0);
      shape.lineTo(-r, springY);
      shape.absarc(0, springY, r, Math.PI, 0, true);
      shape.lineTo(r, 0);
    } else {
      shape.lineTo(-r, 0);
      shape.absarc(0, 0, r, Math.PI, 0, true);
    }
    shape.lineTo(hw, 0);
    shape.lineTo(hw, h);
    shape.lineTo(-hw, h);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -depth * 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yBottom, z);
    if (rotY) mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    if (keystone) {
      const ky = yBottom + springY + r + 0.18;
      const ks = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.95, depth + 0.42), keystoneMat || mat);
      ks.position.set(x, ky, z);
      if (rotY) ks.rotation.y = rotY;
      parent.add(ks);
    }
  }

  /**
   * Colonne corinthienne : socle mouluré + fût + bague + chapiteau doré à double couronne + tailloir
   */
  function addCorinthianColumn(r, h, x, yBottom, z, shaftMat, parent, { baseMat = matGold, capMat = matGold } = {}) {
    addBox(r * 2.75, 0.48, r * 2.75, x, yBottom + 0.24, z, baseMat, parent, { cast: false });
    addCyl(r * 1.18, r * 1.32, 0.28, 10, x, yBottom + 0.62, z, baseMat, parent, { cast: false });
    const shaftH = Math.max(1.2, h - 1.56);
    addCyl(r * 0.88, r, shaftH, 10, x, yBottom + 0.76 + shaftH * 0.5, z, shaftMat, parent);
    addCyl(r * 1.12, r * 0.92, 0.34, 8, x, yBottom + h - 0.63, z, capMat, parent, { cast: false });
    addCyl(r * 1.48, r * 1.06, 0.48, 8, x, yBottom + h - 0.34, z, capMat, parent, { cast: false });
    addBox(r * 2.9, 0.24, r * 2.9, x, yBottom + h - 0.08, z, capMat, parent, { cast: false });
  }

  /**
   * Garde-corps / balustrade à balustres tournés entre deux points
   */
  function addBalustradeRow(x1, z1, x2, z2, yBottom, h, count, balusterMat, railMat, parent) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const rotY = -Math.atan2(dz, dx);
    const cx = (x1 + x2) * 0.5;
    const cz = (z1 + z2) * 0.5;

    addBox(len, 0.22, 0.46, cx, yBottom + 0.11, cz, railMat, parent, { rotY, cast: false });
    addBox(len, 0.22, 0.52, cx, yBottom + h - 0.11, cz, railMat, parent, { rotY, cast: false });

    const bH = Math.max(0.3, h - 0.44);
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const bx = x1 + dx * t;
      const bz = z1 + dz * t;
      addCyl(0.11, 0.16, bH, 6, bx, yBottom + 0.22 + bH * 0.5, bz, balusterMat, parent, { cast: false });
    }
  }

  /**
   * Sculptures allégoriques Second Empire : 'danse' | 'pier-allegory' | 'gumery' | 'apollon' | 'pegase'
   */
  function addHeroicSculpture(x, y, z, { mat = matGold, scale = 1, variant = 'pier-allegory', parent = exteriorGroup } = {}) {
    if (variant === 'apollon') {
      addBox(3.4 * scale, 1.0 * scale, 2.6 * scale, x, y + 0.5 * scale, z, matStone, parent);
      // Apollon debout central brandissant la grande lyre d'or
      addCyl(0.45 * scale, 0.68 * scale, 2.7 * scale, 10, x, y + 2.3 * scale, z, mat, parent);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 10, 8), mat);
      head.position.set(x, y + 3.95 * scale, z);
      parent.add(head);
      // Deux figures allégoriques (Poésie & Musique) encadrant Apollon
      [-1.15, 1.15].forEach((side) => {
        const mus = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.58 * scale, 2.0 * scale, 8), mat);
        mus.position.set(x + side * scale, y + 1.9 * scale, z + 0.2 * scale);
        mus.rotation.z = side * -0.22;
        parent.add(mus);
      });
      // Grande lyre d'or ajourée avec cordes rayonnantes
      [-0.28, 0.28].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 1.6 * scale, 6), mat);
        arm.position.set(x + ax * scale, y + 4.35 * scale, z);
        arm.rotation.z = ax * -0.45;
        parent.add(arm);
      });
      const lyre = new THREE.Mesh(new THREE.TorusGeometry(0.92 * scale, 0.14 * scale, 8, 16), matGold);
      lyre.position.set(x, y + 5.75 * scale, z);
      parent.add(lyre);
      [-0.36, 0, 0.36].forEach((cx) => {
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1.55 * scale, 4), matGold);
        str.position.set(x + cx * scale, y + 5.75 * scale, z);
        parent.add(str);
      });
      return;
    }

    if (variant === 'pegase') {
      addBox(2.4 * scale, 0.9 * scale, 2.2 * scale, x, y + 0.45 * scale, z, matStone, parent);
      // Cheval ailé cabré en bronze (corps incliné, encolure, antérieurs & éventail d'ailes)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.58 * scale, 2.3 * scale, 8), mat);
      body.position.set(x, y + 2.0 * scale, z);
      body.rotation.x = 0.55;
      parent.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.4 * scale, 1.45 * scale, 8), mat);
      neck.position.set(x, y + 3.1 * scale, z + 0.65 * scale);
      neck.rotation.x = -0.35;
      parent.add(neck);
      const headP = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.45 * scale, 0.85 * scale), mat);
      headP.position.set(x, y + 3.75 * scale, z + 0.95 * scale);
      headP.rotation.x = 0.38;
      parent.add(headP);
      [-1, 1].forEach((side) => {
        for (let f = 0; f < 3; f++) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7 * scale, 0.48 * scale, 0.16 * scale), mat);
          wing.position.set(x + side * 1.15 * scale, y + (2.75 + f * 0.48) * scale, z - 0.15 * scale);
          wing.rotation.z = side * (0.28 + f * 0.22);
          wing.rotation.y = side * -0.25;
          parent.add(wing);
        }
      });
      return;
    }

    if (variant === 'danse') {
      addBox(3.4 * scale, 1.9 * scale, 2.5 * scale, x, y + 0.95 * scale, z, matStone, parent);
      // Plaque dorée du socle
      addBox(2.2 * scale, 0.55 * scale, 0.16 * scale, x, y + 1.0 * scale, z + 1.28 * scale, matGold, parent, { cast: false });
      const baseY = y + 1.9 * scale;
      // Génie central ailé bondissant brandissant un tambourin au-dessus de la ronde
      addCyl(0.32 * scale, 0.44 * scale, 2.6 * scale, 8, x, baseY + 1.65 * scale, z + 0.15 * scale, mat, parent);
      const hGen = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 8, 8), mat);
      hGen.position.set(x, baseY + 3.1 * scale, z + 0.15 * scale);
      parent.add(hGen);
      const tamb = new THREE.Mesh(new THREE.TorusGeometry(0.45 * scale, 0.08 * scale, 6, 12), mat);
      tamb.position.set(x + 0.25 * scale, baseY + 3.7 * scale, z + 0.22 * scale);
      parent.add(tamb);
      [-1, 1].forEach((side) => {
        for (let f = 0; f < 3; f++) {
          const wMesh = new THREE.Mesh(new THREE.BoxGeometry(1.45 * scale, 0.44 * scale, 0.16 * scale), mat);
          wMesh.position.set(x + side * 0.95 * scale, baseY + (2.6 + f * 0.36) * scale, z - 0.22 * scale);
          wMesh.rotation.z = side * (0.26 + f * 0.18);
          parent.add(wMesh);
        }
      });
      // Ronde de 4 bacchantes autour du génie
      [
        [-1.08, 0.28, 0.22],
        [-0.55, -0.35, -0.15],
        [0.58, -0.32, 0.16],
        [1.12, 0.25, -0.22],
      ].forEach(([dx, dz, tilt]) => {
        const dMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 1.95 * scale, 7), mat);
        dMesh.position.set(x + dx * scale, baseY + 1.05 * scale, z + dz * scale);
        dMesh.rotation.z = tilt;
        parent.add(dMesh);
        const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 7, 6), mat);
        dHead.position.set(x + (dx - tilt * 0.8) * scale, baseY + 2.15 * scale, z + dz * scale);
        parent.add(dHead);
      });
      return;
    }

    // 'gumery' & 'pier-allegory'
    addBox(2.4 * scale, 1.0 * scale, 2.0 * scale, x, y + 0.5 * scale, z, matStone, parent);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.72 * scale, 2.5 * scale, 8), mat);
    body.position.set(x, y + 2.2 * scale, z);
    body.castShadow = true;
    parent.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38 * scale, 10, 8), mat);
    head.position.set(x, y + 3.68 * scale, z);
    parent.add(head);

    [-0.95, 0.95].forEach((side) => {
      const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.52 * scale, 1.9 * scale, 7), mat);
      fig.position.set(x + side * scale, y + 1.82 * scale, z + 0.18 * scale);
      fig.rotation.z = side * -0.2;
      parent.add(fig);
    });

    if (variant === 'gumery') {
      [-1, 1].forEach((side) => {
        for (let f = 0; f < 3; f++) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75 * scale, 0.5 * scale, 0.18 * scale), mat);
          wing.position.set(x + side * 1.18 * scale, y + (2.9 + f * 0.48) * scale, z - 0.25 * scale);
          wing.rotation.z = side * (0.22 + f * 0.2);
          wing.rotation.y = side * -0.22;
          parent.add(wing);
        }
      });
    }
  }

  // ==========================================================================
  // 1. ARCHITECTURE EXTÉRIEURE SECOND EMPIRE
  // ==========================================================================
  // A. Grand Perron à 7 degrés (lz = +82.2..+89.2 -> y = 0.22 -> 1.40 m) & murets d'échiffre
  for (let s = 0; s < 7; s++) {
    const hStep = 0.22 + ((s + 1) / 7) * 1.18;
    const stepD = 1.05;
    const sz = 88.6 - s * stepD;
    addBox(78 - s * 1.2, hStep, stepD + 0.15, 0, hStep * 0.5, sz, matStone, exteriorGroup, { cast: false });
  }
  [-38, -28, 28, 38].forEach((bx) => {
    addBox(2.9, 2.5, 2.9, bx, 1.25, 86.5, matStone, exteriorGroup);
    addBox(3.2, 0.35, 3.2, bx, 2.55, 86.5, matStone, exteriorGroup);
  });

  // B. Façade Principale Sud à 7 VRAIES ARCADES EN PLEIN CINTRE (3 centrales ouvertes pour FPS!)
  const pierXs = [-35, -25, -15, -5, 5, 15, 25, 35];
  pierXs.forEach((px) => {
    addBox(3.4, 9.2, 4.3, px, 5.2, 80.6, matStone, exteriorGroup);
    addBox(4.0, 1.0, 4.9, px, 1.45, 80.6, matStone, exteriorGroup);
    // Bossages rustiques horizontaux Second Empire sur les piles
    for (let by = 2.6; by <= 8.2; by += 1.4) {
      addBox(3.7, 0.42, 4.6, px, by, 80.6, matStone, exteriorGroup, { cast: false });
    }
  });

  for (let a = 0; a < 7; a++) {
    const cx = -30 + a * 10;
    // Écoinçon en plein cintre avec véritable découpe circulaire & clé d'arc saillante !
    addArchWall(7.0, 8.8, 3.3, 4.2, 4.1, cx, 1.4, 80.6, matStone, exteriorGroup, {
      keystone: true,
      keystoneMat: matStoneSculp,
    });
    // Médaillons dorés aux écoinçons supérieurs
    [-3.4, 3.4].forEach((mx) => {
      const spandrel = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.28, 10), matGold);
      spandrel.rotation.x = Math.PI * 0.5;
      spandrel.position.set(cx + mx, 8.7, 82.68);
      exteriorGroup.add(spandrel);
    });
    // Les 3 arcades centrales (a = 2, 3, 4) restent 100 % ouvertes jusqu'au sol pour entrer à pied !
    if (a < 2 || a > 4) {
      addBox(6.8, 7.6, 0.35, cx, 5.2, 79.2, matMullionGlass, exteriorGroup, { cast: false });
      for (let gx = -2.4; gx <= 2.4; gx += 1.2) {
        addCyl(0.06, 0.06, 4.8, 6, cx + gx, 3.8, 80.1, matGold, exteriorGroup, { cast: false });
      }
    }
  }

  // Avant-corps latéraux Sud (lx = ±42.5) : niche basse, grande baie serlienne, fronton cintré & Gumery dorés
  [-42.5, 42.5].forEach((ax) => {
    const sign = Math.sign(ax);
    addBox(11.6, 30.8, 7.6, ax, 15.4, 80.2, matStone, exteriorGroup);
    addBox(12.4, 1.25, 8.4, ax, 10.4, 80.6, matStone, exteriorGroup);
    addBox(12.6, 1.5, 8.6, ax, 23.6, 80.6, matStone, exteriorGroup);
    addBox(12.4, 1.5, 8.4, ax, 30.8, 80.6, matStone, exteriorGroup);
    // Grande baie centrale de l'avant-corps encadrée de colonnes jumelées & fronton cintré
    addBox(5.0, 9.6, 0.45, ax, 17.2, 83.85, matMullionGlass, exteriorGroup, { cast: false });
    [-3.3, 3.3].forEach((cx) => {
      addCorinthianColumn(0.42, 11.0, ax + cx, 11.1, 84.3, matRoseMarble, exteriorGroup);
    });
    // Fronton cintré en pierre & oculus doré au sommet de la baie
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-4.4, 0);
    pedShape.lineTo(4.4, 0);
    pedShape.quadraticCurveTo(0, 3.2, -4.4, 0);
    const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 1.1, bevelEnabled: false, curveSegments: 12 });
    const segPed = new THREE.Mesh(pedGeo, matStone);
    segPed.position.set(ax, 22.05, 83.6);
    exteriorGroup.add(segPed);
    // Niche basse & médaillon doré
    addBox(3.8, 5.8, 0.45, ax, 5.0, 83.85, matMullionGlass, exteriorGroup, { cast: false });
    addHeroicSculpture(ax + sign * 0.1, 2.2, 84.4, {
      mat: matGold,
      scale: 0.72,
      variant: 'pier-allegory',
      parent: exteriorGroup,
    });
    // Groupes ailés dorés de Charles Gumery (L'Harmonie & La Poésie) sur dômes d'angle
    addCyl(3.8, 4.2, 1.2, 12, ax, 31.6, 80.5, matStone, exteriorGroup, { cast: false });
    addHeroicSculpture(ax, 32.0, 80.5, { mat: matGold, scale: 1.42, variant: 'gumery', parent: exteriorGroup });
  });

  // C. Les 4 grands groupes sculptés de façade (dont « La Danse » de Carpeaux à lx = +15)
  [-25, -15, 15, 25].forEach((gx) => {
    const isDanse = gx === 15;
    addHeroicSculpture(gx, 1.4, 83.4, {
      mat: isDanse ? matStoneSculp : matStone,
      scale: isDanse ? 1.06 : 0.98,
      variant: isDanse ? 'danse' : 'pier-allegory',
      parent: exteriorGroup,
    });
  });

  // D. Grande Loggia du 1er Étage (y = 10.2..31.0 m) : colonnes corinthiennes, mosaïque d'or, bustes & modillons
  addBox(74, 1.1, 6.4, 0, 10.3, 80.4, matStone, exteriorGroup);
  pierXs.forEach((px) => {
    // Paire de grandes colonnes corinthiennes en marbre rosé devant chaque pile
    [-1.08, 1.08].forEach((offX) => {
      addCorinthianColumn(0.45, 12.1, px + offX, 10.85, 82.45, matRoseMarble, exteriorGroup);
    });
    // Colonnette serpentine verte intérieure
    addCorinthianColumn(0.32, 8.2, px, 10.9, 79.35, matGreenMarble, exteriorGroup);
  });

  // Plafond de la Loggia tapissé de mosaïque vénitienne d'or Salviati (lz = 77.5..82.5, y = 22.8)
  addBox(72, 0.35, 5.2, 0, 22.85, 79.8, matMosaicGold, exteriorGroup, { cast: false });

  // Balustrades ajourées de marbre vert + portes-fenêtres à meneaux + oculus avec bustes dorés
  for (let a = 0; a < 7; a++) {
    const mx = -30 + a * 10;
    addBalustradeRow(mx - 3.6, 82.55, mx + 3.6, 82.55, 10.85, 1.15, 7, matGreenMarble, matGreenMarble, exteriorGroup);
    // Arcade vitrée cintrée & meneaux dorés au fond de la Loggia (lz = 76.6)
    addBox(6.6, 8.4, 0.38, mx, 15.2, 76.6, matMullionGlass, exteriorGroup, { cast: false });
    addArchWall(7.0, 2.8, 3.2, 0.0, 0.9, mx, 17.0, 76.9, matStone, exteriorGroup, { keystone: true, keystoneMat: matGold });
    // Cadre circulaire doré & buste doré de compositeur au-dessus de chaque travée
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.16, 8, 16), matGold);
    ring.position.set(mx, 21.1, 82.68);
    exteriorGroup.add(ring);
    const bustPed = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.32, 12), matGreenMarble);
    bustPed.rotation.x = Math.PI * 0.5;
    bustPed.position.set(mx, 21.1, 82.52);
    exteriorGroup.add(bustPed);
    addCyl(0.28, 0.44, 0.72, 8, mx, 20.95, 82.82, matGold, exteriorGroup, { cast: false });
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), matGold);
    bHead.position.set(mx, 21.48, 82.82);
    exteriorGroup.add(bHead);
  }

  // Entablement, 36 modillons, frise dorée « ACADÉMIE NATIONALE DE MUSIQUE », attique sculpté & crête faîtière
  addBox(76, 1.8, 5.4, 0, 23.55, 80.8, matStone, exteriorGroup);
  addBox(74, 0.55, 5.7, 0, 25.35, 81.0, matStone, exteriorGroup);
  for (let mx = -36; mx <= 36; mx += 2.05) {
    addBox(0.32, 0.48, 0.65, mx, 25.02, 83.45, matGold, exteriorGroup, { cast: false });
  }
  addBox(56, 1.45, 0.38, 0, 24.45, 83.35, matInscription, exteriorGroup, { cast: false });
  addBox(74, 4.6, 4.5, 0, 27.6, 80.4, matStone, exteriorGroup);
  addBox(76, 1.15, 4.9, 0, 30.2, 80.5, matStone, exteriorGroup);
  // 7 Cartouches/médaillons & guirlandes dorés sur l'attique + crête faîtière ajourée
  for (let a = 0; a < 7; a++) {
    const ax = -30 + a * 10;
    addBox(5.8, 2.2, 0.28, ax, 27.7, 82.72, matMosaicGold, exteriorGroup, { cast: false });
    addBox(0.9, 4.2, 0.55, ax - 4.4, 27.6, 82.7, matStone, exteriorGroup, { cast: false });
  }
  addBox(72, 0.24, 0.24, 0, 31.15, 82.3, matGold, exteriorGroup, { cast: false });
  for (let gx = -34; gx <= 34; gx += 3.4) {
    addCyl(0.28, 0.45, 1.15, 6, gx, 31.55, 82.3, matGold, exteriorGroup, { cast: false });
  }

  // E. Ailes latérales creuses (laissant |lx| < 18, lz ∈ [-24, +62] et Grand Foyer |lx| < 28, lz ∈ [+62, +76] vides)
  [-1, 1].forEach((side) => {
    addBox(20, 29.8, 108, side * 38, 14.9, 24, matStone, exteriorGroup);
    addBox(20.6, 1.5, 108.8, side * 38, 30.2, 24, matStone, exteriorGroup);
    addBox(18.5, 4.2, 106, side * 38, 32.8, 24, matSlate, exteriorGroup);
    addBox(10, 30.2, 89, side * 23, 15.1, 16.5, matStone, exteriorGroup);

    // Corniches intermédiaires & crêtes dorées sur les toits des ailes
    addBox(20.8, 0.65, 109, side * 38, 10.4, 24, matStone, exteriorGroup, { cast: false });
    addBox(20.8, 0.65, 109, side * 38, 23.8, 24, matStone, exteriorGroup, { cast: false });
    addBox(0.3, 0.6, 104, side * 38, 35.15, 24, matGold, exteriorGroup, { cast: false });

    // Fenêtres à meneaux dorés, pilastres et lucarnes sur les façades Est & Ouest
    for (let fz = -24; fz <= 70; fz += 11) {
      addBox(0.45, 6.4, 4.0, side * 48.1, 16.8, fz, matMullionGlass, exteriorGroup, { cast: false });
      addBox(0.45, 4.6, 3.6, side * 48.1, 5.8, fz, matMullionGlass, exteriorGroup, { cast: false });
      addBox(1.15, 28, 1.85, side * 48.2, 14.8, fz + 5.5, matStone, exteriorGroup, { cast: false });
      // Lucarne mansardée en pierre + pointe d'or sur le brisis du toit latéral
      addBox(2.2, 2.8, 2.8, side * 47.0, 32.4, fz, matStone, exteriorGroup, { cast: false });
      addBox(0.3, 1.8, 2.0, side * 48.1, 32.4, fz, matMullionGlass, exteriorGroup, { cast: false });
    }
  });

  // Rotonde du Glacier côté Est (lx = +44, lz = +46)
  addCyl(9.2, 9.6, 18.5, 18, 44, 9.25, 46, matStone, exteriorGroup);
  addCyl(9.9, 9.9, 0.85, 18, 44, 18.6, 46, matStone, exteriorGroup, { cast: false });
  const glacierDome = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    matCopperDome
  );
  glacierDome.position.set(44, 18.6, 46);
  exteriorGroup.add(glacierDome);
  addCyl(0.4, 0.9, 2.8, 8, 44, 28.4, 46, matGold, exteriorGroup, { cast: false });

  // F. Pavillon de l'Empereur (Ouest lx = -54) & Pavillon des Abonnés (Est lx = +54) à colonnade & lucarnes
  [-1, 1].forEach((side) => {
    const px = side * 54;
    addCyl(13.2, 13.8, 24.5, 22, px, 12.25, -6, matStone, exteriorGroup);
    addCyl(14.1, 14.1, 1.35, 22, px, 10.5, -6, matStone, exteriorGroup, { cast: false });
    addCyl(14.3, 14.3, 1.6, 22, px, 24.8, -6, matStone, exteriorGroup);

    // 10 colonnes engagées & baies cintrées à meneaux + œils-de-bœuf sur le dôme
    for (let a = 0; a < 10; a++) {
      const th = (a / 10) * Math.PI * 2;
      const cx = px + Math.cos(th) * 13.4;
      const cz = -6 + Math.sin(th) * 13.4;
      addBox(2.3, 7.6, 0.55, cx, 16.5, cz, matMullionGlass, exteriorGroup, {
        rotY: -th + Math.PI * 0.5,
        cast: false,
      });
      const colTh = th + Math.PI / 10;
      addCorinthianColumn(
        0.36,
        12.4,
        px + Math.cos(colTh) * 13.55,
        11.2,
        -6 + Math.sin(colTh) * 13.55,
        matRoseMarble,
        exteriorGroup
      );
      if (a % 2 === 0) {
        addBox(2.4, 2.7, 2.8, px + Math.cos(th) * 12.0, 26.9, -6 + Math.sin(th) * 12.0, matStone, exteriorGroup, {
          rotY: -th + Math.PI * 0.5,
          cast: false,
        });
        addBox(1.5, 1.9, 0.2, px + Math.cos(th) * 13.45, 26.85, -6 + Math.sin(th) * 13.45, matMullionGlass, exteriorGroup, {
          rotY: -th + Math.PI * 0.5,
          cast: false,
        });
        addBox(2.7, 0.55, 3.0, px + Math.cos(th) * 12.0, 28.45, -6 + Math.sin(th) * 12.0, matGold, exteriorGroup, {
          rotY: -th + Math.PI * 0.5,
          cast: false,
        });
      }
    }
    const pavDome = new THREE.Mesh(
      new THREE.SphereGeometry(12.8, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      matCopperDome
    );
    pavDome.scale.set(1, 0.78, 1);
    pavDome.position.set(px, 25.2, -6);
    exteriorGroup.add(pavDome);
    // Côtes dorées du dôme de pavillon + lanterneau d'or
    for (let r = 0; r < 8; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(12.9, 0.16, 4, 12, Math.PI * 0.45), matGold);
      rib.position.set(px, 25.2, -6);
      rib.scale.set(1, 0.78, 1);
      rib.rotation.y = (r / 8) * Math.PI * 2;
      exteriorGroup.add(rib);
    }
    addCyl(0.7, 1.5, 4.0, 10, px, 36.2, -6, matGold, exteriorGroup);
  });

  // Double rampe carrossable du Pavillon de l'Empereur dotée d'arches porteuses & garde-corps
  [-1, 1].forEach((rDir) => {
    const rzCenter = -6 + rDir * 16.5;
    addBox(6.8, 1.1, 22, -61.5, 2.2, rzCenter, matStone, exteriorGroup, {
      rotY: rDir * -0.26,
      rotX: rDir * 0.11,
    });
    // Garde-corps pierre & arches de soutènement sous la rampe
    addBox(0.55, 1.1, 22, -64.6, 3.25, rzCenter, matStone, exteriorGroup, {
      rotY: rDir * -0.26,
      rotX: rDir * 0.11,
      cast: false,
    });
    addBox(6.2, 2.4, 2.2, -61.5, 1.2, rzCenter + rDir * 4.5, matStone, exteriorGroup, {
      rotY: rDir * -0.26,
    });
  });
  addBox(8.6, 7.6, 16, -63.5, 3.8, -6, matStone, exteriorGroup);
  addBox(10.6, 1.4, 18, -63.5, 7.9, -6, matZincRoof, exteriorGroup);
  addBox(10.4, 0.35, 0.35, -63.5, 8.75, -6, matGold, exteriorGroup, { cast: false });

  // G. Toitures mansardées et VERRIÈRES ZÉNITHALES au-dessus du Grand Foyer et du Grand Escalier
  // Toiture du Grand Foyer (lz = +62..+78) avec lanterneau verrier & crête d'or
  addBox(56, 2.0, 16.5, 0, 29.7, 69.5, matStone, exteriorGroup);
  addBox(54, 3.8, 15.0, 0, 32.4, 69.5, matSlate, exteriorGroup);
  addBox(42, 2.1, 7.2, 0, 34.8, 69.5, matMullionGlass, exteriorGroup, { cast: false });
  addBox(44, 0.55, 7.6, 0, 36.0, 69.5, matZincRoof, exteriorGroup, { cast: false });
  addBox(44, 0.45, 0.28, 0, 36.5, 69.5, matGold, exteriorGroup, { cast: false });

  // Toiture pyramidale / verrière zénithale du Grand Escalier (lz = +22..+60)
  addBox(38, 1.8, 38, 0, 31.1, 41, matStone, exteriorGroup);
  addBox(34, 3.6, 34, 0, 33.6, 41, matSlate, exteriorGroup);
  addBox(24, 2.4, 24, 0, 36.0, 41, matMullionGlass, exteriorGroup, { cast: false });
  addBox(26, 1.0, 26, 0, 37.5, 41, matZincRoof, exteriorGroup, { cast: false });
  addBox(26, 0.65, 0.35, 0, 38.3, 41, matGold, exteriorGroup, { cast: false });

  // H. LA GRANDE COUPOLE DE CUIVRE VERT-DE-GRIS & TAMBOUR À ŒILS-DE-BŒUF (lz = -4)
  const drumRing = new THREE.Mesh(new THREE.CylinderGeometry(23.6, 24.5, 8.2, 28, 1, true), matStone);
  drumRing.position.set(0, 32.2, -4);
  drumRing.castShadow = true;
  exteriorGroup.add(drumRing);
  const drumCornice = new THREE.Mesh(new THREE.TorusGeometry(23.9, 0.9, 8, 28), matStone);
  drumCornice.rotation.x = Math.PI * 0.5;
  drumCornice.position.set(0, 35.8, -4);
  exteriorGroup.add(drumCornice);

  // 16 pilastres + 16 œils-de-bœuf encadrés d'or + urnes sur le tambour de la coupole
  for (let d = 0; d < 16; d++) {
    const a = (d / 16) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const rotY = -a + Math.PI * 0.5;
    addBox(1.15, 7.6, 0.9, dx * 24.1, 32.2, -4 + dz * 24.1, matStone, exteriorGroup, { rotY, cast: false });
    // Cadre œil-de-bœuf entre les pilastres
    const oa = a + Math.PI / 16;
    const oRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 6, 12), matGold);
    oRing.position.set(Math.cos(oa) * 24.0, 32.8, -4 + Math.sin(oa) * 24.0);
    oRing.rotation.y = -oa + Math.PI * 0.5;
    exteriorGroup.add(oRing);
    // Urne dorée sur l'acrotère du tambour
    addCyl(0.32, 0.48, 1.35, 8, dx * 24.0, 36.8, -4 + dz * 24.0, matGold, exteriorGroup, { cast: false });
  }

  const mainDome = new THREE.Mesh(
    new THREE.SphereGeometry(23.2, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.48),
    matCopperDome
  );
  mainDome.scale.set(1, 0.58, 1);
  mainDome.position.set(0, 35.4, -4);
  mainDome.castShadow = true;
  exteriorGroup.add(mainDome);

  for (let r = 0; r < 24; r++) {
    const a = (r / 24) * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(23.38, r % 2 === 0 ? 0.25 : 0.16, 5, 14, Math.PI * 0.44),
      r % 3 === 0 ? matGold : matCopperDome
    );
    rib.position.set(0, 35.4, -4);
    rib.scale.set(1, 0.58, 1);
    rib.rotation.y = a;
    exteriorGroup.add(rib);
  }

  // Lanterneau impérial ajouré de 8 colonnettes dorées & couronne sommitale
  addCyl(4.2, 4.7, 1.1, 16, 0, 48.0, -4, matStone, exteriorGroup);
  for (let k = 0; k < 8; k++) {
    const ka = (k / 8) * Math.PI * 2;
    addCyl(0.22, 0.26, 2.8, 6, Math.cos(ka) * 3.4, 49.8, -4 + Math.sin(ka) * 3.4, matGold, exteriorGroup, { cast: false });
  }
  const lanternDome = new THREE.Mesh(new THREE.ConeGeometry(4.1, 3.8, 12), matGold);
  lanternDome.position.set(0, 52.8, -4);
  exteriorGroup.add(lanternDome);

  // I. LA GRANDE CAGE DE SCÈNE, FRONTON D'APOLLON & PÉGASES (lz = -22..-86 m)
  addBox(62, 46.5, 44, 0, 23.25, -44.5, matStone, exteriorGroup);
  addBox(64.6, 1.8, 46.6, 0, 46.8, -44.5, matStone, exteriorGroup);
  // Pilastres colossaux, bandeaux & baies hautes sur les flancs de la cage de scène
  [-1, 1].forEach((side) => {
    for (let sz = -62; sz <= -26; sz += 9) {
      addBox(1.2, 22, 2.2, side * 31.2, 35.5, sz, matStone, exteriorGroup, { cast: false });
      addBox(0.5, 7.2, 3.4, side * 31.2, 35.5, sz + 4.5, matMullionGlass, exteriorGroup, { cast: false });
    }
  });
  addBox(32.5, 1.4, 44.5, -15.2, 51.6, -44.5, matSlate, exteriorGroup, { rotZ: 0.33 });
  addBox(32.5, 1.4, 44.5, 15.2, 51.6, -44.5, matSlate, exteriorGroup, { rotZ: -0.33 });

  // Frontons triangulaires Sud & Nord à corniches rampantes et tympan doré
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-30.8, 0);
  gableShape.lineTo(30.8, 0);
  gableShape.lineTo(0, 10.6);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 3.2, bevelEnabled: false });
  [-24.0, -66.8].forEach((gz) => {
    const gableMesh = new THREE.Mesh(gableGeo, matStone);
    gableMesh.position.set(0, 46.5, gz);
    gableMesh.castShadow = true;
    exteriorGroup.add(gableMesh);
  });
  // Bas-relief solaire doré au tympan du fronton Sud + corniches rampantes saillantes
  const tympanSun = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.45, 16), matGold);
  tympanSun.rotation.x = Math.PI * 0.5;
  tympanSun.position.set(0, 50.8, -20.6);
  exteriorGroup.add(tympanSun);
  addBox(33.2, 1.1, 4.2, -15.4, 52.0, -22.2, matStone, exteriorGroup, { rotZ: 0.33, cast: false });
  addBox(33.2, 1.1, 4.2, 15.4, 52.0, -22.2, matStone, exteriorGroup, { rotZ: -0.33, cast: false });

  // Apollon brandissant sa grande lyre d'or + les 2 Pégases cabrés aux angles du fronton
  addHeroicSculpture(0, 56.8, -22.6, { mat: matGold, scale: 1.55, variant: 'apollon', parent: exteriorGroup });
  [-29.2, 29.2].forEach((px) => {
    addHeroicSculpture(px, 47.4, -22.6, { mat: matBronze, scale: 1.12, variant: 'pegase', parent: exteriorGroup });
  });

  // Aile Nord arrière (vers Boulevard Haussmann, lz = -66..-86)
  addBox(82, 26, 20, 0, 13, -76, matStone, exteriorGroup);
  addBox(84, 1.5, 21.5, 0, 26.2, -76, matStone, exteriorGroup);
  addBox(80, 4.5, 18, 0, 29, -76, matZincRoof, exteriorGroup);
  for (let nx = -34; nx <= 34; nx += 11) {
    addBox(3.8, 11.5, 0.55, nx, 16, -86.2, matMullionGlass, exteriorGroup, { cast: false });
  }

  // ==========================================================================
  // 2. INTÉRIEUR VISITABLE HAUTE FIDÉLITÉ (LOD 0 UNIQUEMENT)
  // ==========================================================================
  // 2A. VESTIBULE D'ENTRÉE (lz = +54..+82, sol y = 1.40 m, plafond à caissons y = 9.75 m)
  addBox(54, 1.4, 29, 0, 0.7, 67.8, matWhiteMarble, interiorGroup, { cast: false });
  addBox(56, 0.85, 17, 0, 10.08, 69.5, matStone, interiorGroup, { cast: false });
  // Piliers & 4 statues assises des maîtres de la musique (Rameau, Lully, Gluck, Haendel)
  [-15.5, -6.5, 6.5, 15.5].forEach((vx) => {
    addCorinthianColumn(0.54, 8.2, vx, 1.4, 70, matWhiteMarble, interiorGroup);
    addCorinthianColumn(0.54, 8.2, vx, 1.4, 60.5, matWhiteMarble, interiorGroup);
    // Socle + figure assise en marbre blanc devant chaque pilier arrière
    addBox(1.6, 1.3, 1.6, vx, 2.05, 63.5, matStone, interiorGroup, { cast: false });
    addCyl(0.45, 0.58, 1.65, 8, vx, 3.5, 63.5, matWhiteMarble, interiorGroup, { cast: false });
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), matWhiteMarble);
    sh.position.set(vx, 4.45, 63.5);
    interiorGroup.add(sh);
  });

  // 2B. LE GRAND ESCALIER D'HONNEUR (lz = +20..+58, hauteur y = 1.40 -> 29.8 m)
  addBox(35, 1.4, 38, 0, 0.7, 39, matWhiteMarble, interiorGroup, { cast: false });

  // Volée centrale ascendante (lz = +53 -> +40.5, y = 1.40 -> 5.60 m) — 22 marches & tapis rouge
  const centralSteps = 22;
  for (let s = 0; s < centralSteps; s++) {
    const t = (s + 0.5) / centralSteps;
    const sy = 1.4 + t * 4.2;
    const sz = 53.0 - t * 12.5;
    addBox(10.6, sy, 0.72, 0, sy * 0.5, sz, matWhiteMarble, interiorGroup, { cast: false });
    addBox(5.2, 0.08, 0.74, 0, sy + 0.03, sz, matVelvetRed, interiorGroup, { cast: false });
  }
  // Limons inclinés d'onyx rouge & main-courante en marbre vert le long de la volée centrale
  [-5.25, 5.25].forEach((rx) => {
    addBox(0.55, 1.15, 13.8, rx, 4.05, 46.8, matRoseMarble, interiorGroup, { rotX: 0.32, cast: false });
    addBox(0.62, 0.22, 14.0, rx, 4.65, 46.8, matGreenMarble, interiorGroup, { rotX: 0.32, cast: false });
  });

  // 2 Grandes Torchères féminines de Carrier-Belleuse à 5 globes lumineux (lx = ±5.6, lz = 53.2)
  [-5.6, 5.6].forEach((tx) => {
    addCyl(0.58, 0.78, 2.2, 10, tx, 2.5, 53.2, matRoseMarble, interiorGroup);
    addCyl(0.32, 0.48, 2.5, 8, tx, 4.85, 53.2, matBronze, interiorGroup);
    const thHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), matBronze);
    thHead.position.set(tx, 6.25, 53.2);
    interiorGroup.add(thHead);
    addCyl(0.14, 0.28, 1.15, 6, tx, 6.8, 53.2, matGold, interiorGroup, { cast: false });
    const cGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), matLampGlow);
    cGlobe.position.set(tx, 7.65, 53.2);
    interiorGroup.add(cGlobe);
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2 + 0.4;
      const gx = tx + Math.cos(ba) * 0.72;
      const gz = 53.2 + Math.sin(ba) * 0.72;
      const gOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), matLampGlow);
      gOrb.position.set(gx, 7.25, gz);
      interiorGroup.add(gOrb);
    }
  });

  // Palier central & Grotte / Niche voûtée abritant la Pythie de Marcello (lz = 35.6)
  addBox(25, 5.6, 4.4, 0, 2.8, 38.6, matWhiteMarble, interiorGroup, { cast: false });
  addArchWall(7.4, 5.8, 3.0, 2.0, 1.8, 0, 5.6, 34.4, matStone, interiorGroup, {
    keystone: true,
    keystoneMat: matGold,
  });
  addCyl(2.75, 3.05, 0.9, 18, 0, 6.0, 35.6, matGreenMarble, interiorGroup);
  addCyl(2.25, 2.25, 0.12, 18, 0, 6.42, 35.6, matPythieWater, interiorGroup, { cast: false });
  addCyl(0.75, 0.95, 1.8, 10, 0, 7.1, 35.6, matStone, interiorGroup);
  addHeroicSculpture(0, 7.9, 35.6, { mat: matBronze, scale: 0.76, variant: 'pier-allegory', parent: interiorGroup });

  // Double volée divergente gauche & droite (y = 5.60 -> 10.50 m) + rampes onyx/vert
  const upperSteps = 20;
  [-1, 1].forEach((side) => {
    for (let s = 0; s < upperSteps; s++) {
      const t = (s + 0.5) / upperSteps;
      const sy = 5.6 + t * 4.9;
      const sz = 37.5 - t * 13.5;
      const sx = side * (6.8 + t * 2.6);
      addBox(6.8, sy, 0.78, sx, sy * 0.5, sz, matWhiteMarble, interiorGroup, { cast: false });
      addBox(3.4, 0.08, 0.8, sx, sy + 0.03, sz, matVelvetRed, interiorGroup, { cast: false });
    }
    // Rampes intérieures & extérieures des volées divergentes
    [4.8, 11.4].forEach((off) => {
      addBox(0.5, 1.1, 14.5, side * off, 8.6, 30.8, matRoseMarble, interiorGroup, {
        rotX: 0.34,
        rotY: side * 0.18,
        cast: false,
      });
      addBox(0.56, 0.2, 14.6, side * off, 9.2, 30.8, matGreenMarble, interiorGroup, {
        rotX: 0.34,
        rotY: side * 0.18,
        cast: false,
      });
    });
  });

  // Balustrades tournées d'onyx autour des galeries du 1er étage (y = 10.50 m)
  [-15.2, 15.2].forEach((cx) => {
    addBox(5.6, 0.8, 42, cx, 10.1, 41, matWhiteMarble, interiorGroup, { cast: false });
    const railX = cx - Math.sign(cx) * 2.5;
    addBalustradeRow(railX, 24.5, railX, 56.0, 10.5, 1.15, 22, matRoseMarble, matGreenMarble, interiorGroup);
  });
  addBox(36, 0.8, 5.2, 0, 10.1, 21.8, matWhiteMarble, interiorGroup, { cast: false });
  addBalustradeRow(-12.5, 24.1, 12.5, 24.1, 10.5, 1.15, 18, matRoseMarble, matGreenMarble, interiorGroup);
  addBox(36, 0.8, 5.2, 0, 10.1, 58.6, matWhiteMarble, interiorGroup, { cast: false });
  addBalustradeRow(-12.5, 56.2, 12.5, 56.2, 10.5, 1.15, 18, matRoseMarble, matGreenMarble, interiorGroup);

  // Galeries supérieures sur 2 étages, vraies arcades en plein cintre & 20 colonnes jumelées de sérancolin
  [16.8, 22.8].forEach((lvlY) => {
    [-16.2, 16.2].forEach((bx) => {
      addBox(3.6, 0.7, 36, bx, lvlY, 41, matStone, interiorGroup, { cast: false });
      const rx = bx - Math.sign(bx) * 1.5;
      addBox(0.55, 0.95, 34, rx, lvlY + 0.82, 41, matBalconyGold, interiorGroup, { cast: false });
    });
    addBox(34, 0.7, 3.6, 0, lvlY, 58.5, matStone, interiorGroup, { cast: false });
    addBox(34, 0.7, 3.6, 0, lvlY, 22.0, matStone, interiorGroup, { cast: false });
    addBox(26, 0.95, 0.55, 0, lvlY + 0.82, 56.9, matBalconyGold, interiorGroup, { cast: false });
    addBox(26, 0.95, 0.55, 0, lvlY + 0.82, 23.6, matBalconyGold, interiorGroup, { cast: false });
  });

  [24.5, 31.5, 38.5, 45.5, 52.5].forEach((cz) => {
    [-13.4, 13.4].forEach((cx) => {
      addCorinthianColumn(0.4, 12.0, cx, 10.9, cz, matRoseMarble, interiorGroup);
    });
  });
  // Arcades longitudinales du Grand Escalier aux niveaux hauts
  [28.0, 35.0, 42.0, 49.0].forEach((az) => {
    [-13.4, 13.4].forEach((ax) => {
      addArchWall(7.0, 3.4, 2.8, 0.2, 0.85, ax, 20.0, az, matStone, interiorGroup, {
        rotY: Math.PI * 0.5,
        keystone: true,
        keystoneMat: matGold,
      });
    });
  });

  // Arcs-doubleaux dorés encadrant le plafond voûté peint d'Isidore Pils
  for (let cz = 25; cz <= 55; cz += 10) {
    addBox(34, 0.95, 0.85, 0, 28.5, cz, matGold, interiorGroup, { cast: false });
  }
  const pilsCeiling = new THREE.Mesh(new THREE.PlaneGeometry(34, 38), matPilsCeiling);
  pilsCeiling.rotation.x = Math.PI * 0.5;
  pilsCeiling.position.set(0, 29.0, 40.5);
  interiorGroup.add(pilsCeiling);

  // 2C. LE GRAND FOYER DORÉ (« Le Versailles de l'Opéra », 54 m × 13 m × 18 m, parquet Versailles & 10 lustres)
  addBox(54, 0.14, 13, 0, 10.52, 68.5, matParquet, interiorGroup, { cast: false });
  // Murs Est/Ouest avec cheminées monumentales dorées, cariatides et grands miroirs cintrés
  [-27.2, 27.2].forEach((fx) => {
    const inward = -Math.sign(fx);
    addBox(0.9, 18.2, 13.5, fx, 19.6, 68.5, matGold, interiorGroup);
    addBox(0.95, 3.2, 5.2, fx + inward * 0.45, 12.1, 68.5, matRoseMarble, interiorGroup, { cast: false });
    addBox(0.28, 10.6, 5.4, fx + inward * 0.55, 19.2, 68.5, matMullionGlass, interiorGroup, { cast: false });
  });
  // Mur Nord (miroirs & portes ouvertes vers Grand Escalier) + Mur Sud (7 grandes arcades vers la Loggia)
  [-20, -10, 10, 20].forEach((wx) => {
    addBox(5.0, 18.2, 1.1, wx, 19.6, 61.6, matGold, interiorGroup);
  });
  addBox(55, 6.4, 1.1, 0, 25.4, 61.6, matGold, interiorGroup);
  for (let wx = -25; wx <= 25; wx += 10) {
    addBox(3.4, 18.2, 1.0, wx, 19.6, 75.3, matStone, interiorGroup);
  }
  addBox(55, 6.2, 1.0, 0, 25.5, 75.3, matStone, interiorGroup);
  for (let gx = -20; gx <= 20; gx += 10) {
    addBox(6.6, 11.4, 0.25, gx, 16.5, 75.4, matMullionGlass, interiorGroup, { cast: false });
    addArchWall(7.0, 4.2, 3.2, 0.2, 1.0, gx, 19.2, 75.3, matGold, interiorGroup, { keystone: true });
    // Lyre dorée au tympan côté Nord
    const lyreMir = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.14, 6, 12), matGold);
    lyreMir.position.set(gx, 23.6, 62.2);
    interiorGroup.add(lyreMir);
  }

  // 20 Colonnes corinthiennes cannelées dorées sur piédestaux de marbre rosé
  for (let gx = -24; gx <= 24; gx += 6) {
    addCorinthianColumn(0.4, 13.6, gx, 10.58, 62.6, matGold, interiorGroup, { baseMat: matRoseMarble });
    addCorinthianColumn(0.4, 13.6, gx, 10.58, 74.2, matGold, interiorGroup, { baseMat: matRoseMarble });
  }
  // 10 Grands lustres baroques multi-bras du Grand Foyer
  for (let lx = -22.5; lx <= 22.5; lx += 5) {
    addCyl(0.08, 0.08, 4.4, 6, lx, 26.2, 68.5, matGold, interiorGroup, { cast: false });
    addCyl(0.32, 0.18, 2.2, 8, lx, 23.8, 68.5, matGold, interiorGroup, { cast: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, 14), matGold);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.set(lx, 23.2, 68.5);
    interiorGroup.add(ring);
    for (let b = 0; b < 6; b++) {
      const ba = (b / 6) * Math.PI * 2;
      const gOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), matLampGlow);
      gOrb.position.set(lx + Math.cos(ba) * 1.15, 23.45, 68.5 + Math.sin(ba) * 1.15);
      interiorGroup.add(gOrb);
    }
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), matLampGlow);
    core.position.set(lx, 22.4, 68.5);
    interiorGroup.add(core);
  }
  // Corniches à voussures dorées & plafond peint de Paul Baudry
  addBox(55, 0.8, 1.4, 0, 27.9, 62.2, matGold, interiorGroup, { cast: false });
  addBox(55, 0.8, 1.4, 0, 27.9, 74.8, matGold, interiorGroup, { cast: false });
  const baudryCeiling = new THREE.Mesh(new THREE.PlaneGeometry(54, 13), matBaudryCeiling);
  baudryCeiling.rotation.x = Math.PI * 0.5;
  baudryCeiling.position.set(0, 28.4, 68.5);
  interiorGroup.add(baudryCeiling);

  // 2D. LA GRANDE SALLE À L'ITALIENNE ROUGE & OR + LOGES CLOISONNÉES + LUSTRE AJOURÉ + PLAFOND CHAGALL
  addBox(34, 0.6, 38, 0, 4.7, -2, matVelvetRed, interiorGroup, { cast: false });
  for (let row = 0; row < 12; row++) {
    const rz = 7.5 - row * 2.1;
    const ry = 5.45 - row * 0.07;
    const wRow = 16.5 - Math.abs(row - 6) * 0.4;
    addBox(wRow * 0.44, 0.85, 0.72, -wRow * 0.28, ry, rz, matVelvetRed, interiorGroup, { cast: false });
    addBox(wRow * 0.44, 0.85, 0.72, wRow * 0.28, ry, rz, matVelvetRed, interiorGroup, { cast: false });
  }
  addBox(18, 1.1, 3.6, 0, 5.1, -18.2, matParquet, interiorGroup, { cast: false });
  addBalustradeRow(-8.8, -16.4, 8.8, -16.4, 5.3, 0.95, 14, matGold, matVelvetRed, interiorGroup);

  [-17.6, 17.6].forEach((sx) => {
    addBox(0.6, 26.2, 39, sx, 17.4, -2, matVelvetRed, interiorGroup, { cast: false });
  });
  for (let wIdx = 0; wIdx < 12; wIdx++) {
    const ang = -0.14 + (wIdx / 11) * (Math.PI + 0.28);
    const wx = Math.cos(ang) * 17.5;
    const wz = -3.0 + Math.sin(ang) * (17.5 * 1.16);
    if (Math.abs(wx) < 4.8 && wz > 13.0) continue;
    addBox(6.4, 26.2, 0.8, wx, 17.4, wz, matVelvetRed, interiorGroup, {
      rotY: -ang + Math.PI * 0.5,
      cast: false,
    });
  }
  addBox(12.0, 13.2, 1.2, 0, 23.8, 17.3, matVelvetRed, interiorGroup, { cast: false });

  // 4 Niveaux superposés de loges en fer à cheval : cartouches dorés, cloisons rouges & colonnettes d'or !
  const levelHeights = [10.4, 15.0, 19.6, 24.2];
  levelHeights.forEach((ly, lIdx) => {
    const segs = 13;
    for (let s = 0; s < segs; s++) {
      const ang = -0.18 + (s / (segs - 1)) * (Math.PI + 0.36);
      const rad = 14.5 + lIdx * 0.35;
      const bx = Math.cos(ang) * rad;
      const bz = -3.0 + Math.sin(ang) * (rad * 1.18);
      if (lIdx === 0 && Math.abs(bx) < 4.8 && bz > 10.5) continue;

      const rot = -ang + Math.PI * 0.5;
      const rx = Math.cos(ang) * (rad - 1.45);
      const rz = -3.0 + Math.sin(ang) * (rad - 1.45) * 1.18;
      // Plancher rouge, devant de loge galbé à cartouches dorés & boudin d'appui cramoisi
      addBox(4.3, 0.45, 3.4, bx, ly - 0.25, bz, matVelvetRed, interiorGroup, { rotY: rot, cast: false });
      addBox(4.4, 1.28, 0.35, rx, ly + 0.45, rz, matBalconyGold, interiorGroup, { rotY: rot, cast: false });
      addBox(4.5, 0.28, 0.48, rx, ly + 1.18, rz, matVelvetRed, interiorGroup, { rotY: rot, cast: false });
      // Cloisons séparatives et colonnette dorée entre chaque loge
      const pAng = ang + (Math.PI + 0.36) / (segs - 1) * 0.5;
      addCyl(0.14, 0.16, 4.4, 6, Math.cos(pAng) * (rad - 1.25), ly + 2.2, -3.0 + Math.sin(pAng) * (rad - 1.25) * 1.18, matGold, interiorGroup, {
        cast: false,
      });
    }
  });

  // Grand Cadre de Scène doré à colonnes géantes, cartouche impérial & Rideau en trompe-l'œil
  [-11.8, -8.8, 8.8, 11.8].forEach((px) => {
    addCorinthianColumn(0.55, 22.0, px, 5.2, -20.5, matGold, interiorGroup);
  });
  addBox(25.5, 3.6, 3.2, 0, 26.8, -21.0, matGold, interiorGroup);
  const proscShield = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.7, 16), matGold);
  proscShield.rotation.x = Math.PI * 0.5;
  proscShield.position.set(0, 26.8, -19.2);
  interiorGroup.add(proscShield);
  // Rideau de scène en trompe-l'œil drapé (texturé plis + broderies d'or)
  addBox(16.8, 18.8, 0.65, 0, 15.2, -21.6, matStageCurtain, interiorGroup, { cast: false });

  // LE PLAFOND DE MARC CHAGALL (1964) sous la Coupole (y = 27.88 m, couronne & 12 lunettes dorées)
  const chagallDisc = new THREE.Mesh(new THREE.CircleGeometry(16.6, 36), matChagallCeiling);
  chagallDisc.rotation.x = Math.PI * 0.5;
  chagallDisc.rotation.z = 0.2;
  chagallDisc.position.set(0, 27.88, -4.0);
  interiorGroup.add(chagallDisc);
  const hallSoffitRing = new THREE.Mesh(new THREE.RingGeometry(16.2, 24.4, 32), matGold);
  hallSoffitRing.rotation.x = Math.PI * 0.5;
  hallSoffitRing.position.set(0, 27.82, -4.0);
  interiorGroup.add(hallSoffitRing);
  const chagallRim = new THREE.Mesh(new THREE.TorusGeometry(16.4, 0.68, 8, 36), matGold);
  chagallRim.rotation.x = Math.PI * 0.5;
  chagallRim.position.set(0, 27.68, -4.0);
  interiorGroup.add(chagallRim);

  // LE GRAND LUSTRE AJOURÉ DE 8 TONNES (5 couronnes fines ciselées + 24 foyers de cristal, sans masquer la scène !)
  addCyl(0.14, 0.14, 3.6, 8, 0, 26.0, -4.0, matGold, interiorGroup, { cast: false });
  [
    { y: 24.5, r: 2.15, lights: 8 },
    { y: 23.3, r: 2.95, lights: 12 },
    { y: 22.1, r: 2.25, lights: 8 },
    { y: 21.1, r: 1.25, lights: 6 },
  ].forEach((tier) => {
    const ringG = new THREE.Mesh(new THREE.TorusGeometry(tier.r, 0.14, 6, 20), matGold);
    ringG.rotation.x = Math.PI * 0.5;
    ringG.position.set(0, tier.y, -4.0);
    interiorGroup.add(ringG);
    for (let i = 0; i < tier.lights; i++) {
      const a = (i / tier.lights) * Math.PI * 2;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), matLampGlow);
      orb.position.set(Math.cos(a) * tier.r, tier.y + 0.16, -4.0 + Math.sin(a) * tier.r);
      interiorGroup.add(orb);
    }
  });
  const lustreDrop = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 1), matLampGlow);
  lustreDrop.position.set(0, 20.1, -4.0);
  interiorGroup.add(lustreDrop);

  // 5 PointLights intérieures optimisées (coupées dès que caméra > 155 m ou LOD > 0)
  const interiorLights = [];
  [
    { pos: [0, 7.2, 66], color: 0xffdfab, base: 14, night: 42, dist: 28 },
    { pos: [0, 17.5, 40], color: 0xffe4b5, base: 24, night: 64, dist: 38 },
    { pos: [-12, 20, 68.5], color: 0xffe6b8, base: 20, night: 54, dist: 34 },
    { pos: [12, 20, 68.5], color: 0xffe6b8, base: 20, night: 54, dist: 34 },
    { pos: [0, 19.5, -4.0], color: 0xffd79b, base: 28, night: 74, dist: 44 },
  ].forEach((spec) => {
    const pt = new THREE.PointLight(spec.color, spec.base, spec.dist, 1.45);
    pt.position.set(...spec.pos);
    pt.castShadow = false;
    interiorGroup.add(pt);
    interiorLights.push({ light: pt, base: spec.base, night: spec.night });
  });

  // ==========================================================================
  // 3. ENVIRONNEMENT PLACE DE L'OPÉRA, MÉTRO OPÉRA & CAFÉ DE LA PAIX (LOD < 2)
  // ==========================================================================
  addBox(202, 0.28, 322, 0, -0.055, 56, matAsphalt, envGroup, { cast: false });
  addBox(128, 0.24, 178, 0, 0.1, -2, matGranite, envGroup, { cast: false });
  addBox(96, 0.28, 38, 0, 0.08, 105, matGranite, envGroup, { cast: false });

  // Deux terre-pleins centraux de Place de l'Opéra & Bouches du Métro Opéra (balustrades Cassien-Bernard)
  [
    { z: 138, w: 26, d: 15, metroSide: 1 },
    { z: 194, w: 20, d: 14, metroSide: -1 },
  ].forEach((isl) => {
    addBox(isl.w, 0.3, isl.d, 0, 0.08, isl.z, matGranite, envGroup, { cast: false });
    addBalustradeRow(-4.3, isl.z - 2.3, 4.3, isl.z - 2.3, 0.22, 1.05, 8, matStone, matStone, envGroup);
    addBalustradeRow(-4.3, isl.z - 2.3, -4.3, isl.z + 2.3, 0.22, 1.05, 4, matStone, matStone, envGroup);
    addBalustradeRow(4.3, isl.z - 2.3, 4.3, isl.z + 2.3, 0.22, 1.05, 4, matStone, matStone, envGroup);
    addBox(8.2, 0.08, 4.2, 0, 0.14, isl.z, matSlate, envGroup, { cast: false });
    addBox(2.4, 0.52, 0.18, 0, 3.35, isl.z + isl.metroSide * 2.2, matMetroGreen, envGroup, { cast: false });
    [-1.4, 1.4].forEach((mx) => {
      addCyl(0.09, 0.12, 3.6, 8, mx, 2.0, isl.z + isl.metroSide * 2.2, matBronze, envGroup);
      const gm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), matLampGlow);
      gm.position.set(mx, 3.9, isl.z + isl.metroSide * 2.2);
      envGroup.add(gm);
    });
  });

  function buildCornerHaussmannPalace({ x, z, w, d, rotY = 0, isCafeDeLaPaix = false }) {
    const bGrp = new THREE.Group();
    bGrp.position.set(x, 0, z);
    bGrp.rotation.y = rotY;
    envGroup.add(bGrp);

    addBox(w + 7, 0.28, d + 7, 0, 0.08, 0, matGranite, bGrp, { cast: false });
    addBox(w, 21.5, d, 0, 10.75, 0, matHaussmannStone, bGrp);
    addBox(w + 0.8, 0.65, d + 0.8, 0, 9.8, 0, matStone, bGrp, { cast: false });
    addBox(w + 0.9, 0.65, d + 0.9, 0, 21.2, 0, matStone, bGrp, { cast: false });
    addBox(w - 1.4, 4.8, d - 1.4, 0, 23.6, 0, matSlate, bGrp);

    // Rotonde d'angle face à Place de l'Opéra
    const rx = x < 0 ? w * 0.44 : -w * 0.44;
    const rz = z < 160 ? d * 0.44 : -d * 0.44;
    addCyl(7.6, 7.8, 22.0, 14, rx, 11.0, rz, matHaussmannStone, bGrp);
    const cornerDome = new THREE.Mesh(
      new THREE.SphereGeometry(7.6, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54),
      matSlate
    );
    cornerDome.scale.set(1, 0.88, 1);
    cornerDome.position.set(rx, 22.0, rz);
    bGrp.add(cornerDome);
    addCyl(0.35, 0.85, 3.2, 8, rx, 29.4, rz, matGold, bGrp, { cast: false });

    // Terrasse & stores du mythique Café de la Paix (InterContinental Le Grand)
    if (isCafeDeLaPaix) {
      addBox(2.8, 0.45, d * 0.86, w * 0.5 + 1.4, 4.4, 0, matMetroGreen, bGrp, { rotZ: -0.28, cast: false });
      addBox(w * 0.84, 0.45, 2.8, 0, 4.4, d * 0.5 + 1.4, matMetroGreen, bGrp, { rotX: 0.28, cast: false });
      addBox(w * 0.84, 0.18, 0.22, 0, 3.9, d * 0.5 + 2.7, matGold, bGrp, { cast: false });
      // Petites tables & parasols verts sur le trottoir du Café de la Paix
      for (let tz = -14; tz <= 14; tz += 7) {
        addCyl(0.55, 0.55, 0.08, 8, w * 0.5 + 2.1, 1.0, tz, matWhiteMarble, bGrp, { cast: false });
        addCyl(0.08, 0.14, 0.85, 6, w * 0.5 + 2.1, 0.58, tz, matBronze, bGrp, { cast: false });
      }
    }
  }

  buildCornerHaussmannPalace({ x: -78, z: 120, w: 36, d: 44, isCafeDeLaPaix: true });
  buildCornerHaussmannPalace({ x: 78, z: 124, w: 36, d: 46, isCafeDeLaPaix: false });
  buildCornerHaussmannPalace({ x: -50, z: 208, w: 42, d: 28, rotY: 0.08 });
  buildCornerHaussmannPalace({ x: 50, z: 208, w: 42, d: 28, rotY: -0.08 });

  // Candélabres rostraux Second Empire à 3 globes (2 InstancedMesh)
  const lampCoords = [
    [-38, 86.5, 2.55], [-28, 86.5, 2.55], [28, 86.5, 2.55], [38, 86.5, 2.55],
    [-42, 102, 0.22], [-42, 118, 0.22], [42, 102, 0.22], [42, 118, 0.22],
    [-11, 138, 0.23], [11, 138, 0.23], [-9, 194, 0.23], [9, 194, 0.23],
    [-56, 146, 0.22], [56, 149, 0.22], [-28, 194, 0.22], [28, 194, 0.22],
  ];
  const polesInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.22, 4.6, 8), matBronze, lampCoords.length);
  const globesInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 8, 8), matLampGlow, lampCoords.length * 3);
  const dummy = new THREE.Object3D();
  let gIdx = 0;
  lampCoords.forEach(([lx, lz, baseY], idx) => {
    dummy.position.set(lx, baseY + 2.3, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    polesInst.setMatrixAt(idx, dummy.matrix);

    [
      [0, 4.85, 0],
      [-0.45, 4.45, 0],
      [0.45, 4.45, 0],
    ].forEach(([ox, oy, oz]) => {
      dummy.position.set(lx + ox, baseY + oy, lz + oz);
      dummy.updateMatrix();
      globesInst.setMatrixAt(gIdx++, dummy.matrix);
    });
  });
  polesInst.instanceMatrix.needsUpdate = true;
  globesInst.instanceMatrix.needsUpdate = true;
  envGroup.add(polesInst, globesInst);

  // Alignement d'arbres parisiens le long des boulevards latéraux hors rampes des Pavillons (2 InstancedMesh)
  const treeCoords = [];
  for (let tz = -72; tz <= 84; tz += 18) {
    if (tz >= -24 && tz <= 14) continue;
    treeCoords.push([-74, tz], [74, tz]);
  }
  const trunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 4.4, 6), matBronze, treeCoords.length);
  const crownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.8, 1), matMetroGreen, treeCoords.length);
  treeCoords.forEach(([tx, tz], idx) => {
    dummy.position.set(tx, 2.2, tz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunksInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tx, 5.6, tz);
    dummy.scale.set(1.12, 0.9, 1.12);
    dummy.updateMatrix();
    crownsInst.setMatrixAt(idx, dummy.matrix);
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  crownsInst.instanceMatrix.needsUpdate = true;
  envGroup.add(trunksInst, crownsInst);

  // Fusion haute performance de chaque groupe par matériau (< 25 Draw Calls par vue !)
  mergeStaticGroupByMaterial(exteriorGroup);
  mergeStaticGroupByMaterial(interiorGroup);
  mergeStaticGroupByMaterial(envGroup);

  // ==========================================================================
  // 4. COLLIDERS ROTATIONNÉS & SOL VISITABLE MULTI-NIVEAUX (FPS)
  // ==========================================================================
  const colliders = [];
  const circleColliders = [];

  function addWallCircles(x1, z1, x2, z2, r = 0.8) {
    const len = Math.hypot(x2 - x1, z2 - z1) || 1;
    const steps = Math.max(1, Math.ceil(len / (r * 1.1)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wp = garnierLocalToWorld(THREE.MathUtils.lerp(x1, x2, t), 0, THREE.MathUtils.lerp(z1, z2, t));
      circleColliders.push({ x: wp.x, z: wp.z, r });
    }
  }

  addWallCircles(-46, 80.5, -14.8, 80.5, 1.2);
  addWallCircles(14.8, 80.5, 46, 80.5, 1.2);
  addWallCircles(-18, 20, -18, 61, 0.85);
  addWallCircles(18, 20, 18, 61, 0.85);
  const pythieWorld = garnierLocalToWorld(0, 0, 35.6);
  circleColliders.push({ x: pythieWorld.x, z: pythieWorld.z, r: 2.9 });
  addWallCircles(-17, -21, 17, -21, 1.1);
  addWallCircles(-95, 98, -59, 98, 2.2);
  addWallCircles(-59, 98, -59, 142, 2.2);
  addWallCircles(59, 100, 95, 100, 2.2);
  addWallCircles(59, 100, 59, 146, 2.2);

  function getFloorHeightAt(wx, wz, currentY = 1.75) {
    const { lx, lz } = worldToGarnierLocal(wx, wz);

    if (currentY > 8.2) {
      if (lz >= 61.2 && lz <= 75.5 && Math.abs(lx) <= 27.2) return 10.52;
      if (lz >= 20.0 && lz <= 61.5 && Math.abs(lx) <= 17.5) {
        if (Math.abs(lx) >= 11.8 || lz <= 25.0 || lz >= 55.8) return 10.50;
      }
      if (lz >= 10.5 && lz <= 20.5 && Math.abs(lx) <= 15.5) return 10.50;
    }

    if (lz >= 23.5 && lz <= 53.5 && Math.abs(lx) <= 13.0) {
      if (lz >= 40.5 && Math.abs(lx) <= 5.6) {
        const t = THREE.MathUtils.clamp((53.0 - lz) / 12.5, 0, 1);
        return 1.4 + t * 4.2;
      }
      if (lz >= 37.2 && lz < 40.5 && Math.abs(lx) <= 12.5) return 5.6;
      if (lz >= 23.5 && lz < 37.5 && Math.abs(lx) >= 4.2 && Math.abs(lx) <= 12.6) {
        const t = THREE.MathUtils.clamp((37.5 - lz) / 13.5, 0, 1);
        return 5.6 + t * 4.9;
      }
    }

    if (lz >= -19.0 && lz <= 21.0 && Math.abs(lx) <= 15.2) {
      return 5.15;
    }

    if (lz >= 20.0 && lz <= 82.2 && Math.abs(lx) <= 26.5) return 1.4;

    if (lz > 82.2 && lz <= 89.2 && Math.abs(lx) <= 39.0) {
      const t = THREE.MathUtils.clamp((89.2 - lz) / 7.0, 0, 1);
      return 0.22 + t * 1.18;
    }

    if (lz >= 85 && lz <= 124 && Math.abs(lx) <= 48) return 0.22;
    if (lz >= 130 && lz <= 146 && Math.abs(lx) <= 13) return 0.23;
    if (lz >= 187 && lz <= 201 && Math.abs(lx) <= 10) return 0.23;
    return 0.09;
  }

  // ==========================================================================
  // 5. PROLOGUE 360° & 7 POINTS D'INTÉRÊT HISTORIQUES DU PALAIS GARNIER
  // (Textes conservés à l'identique pour préserver 100 % du cache audio Laurent)
  // ==========================================================================
  const introChapter = {
    id: 'garnier-intro-360',
    title: 'Histoire du Palais Garnier — Tour 360°',
    era: '1861 – 1875 • Second Empire (Charles Garnier)',
    location: 'Place de l’Opéra • 9e arr., Paris',
    history:
      "Chef-d'œuvre absolu du style éclectique Second Empire, le Palais Garnier fut conçu par Charles Garnier à l'issue du grand concours lancé en 1861 par Napoléon III dans le cadre des transformations haussmanniennes de Paris. Long de 173 mètres et large de 125 mètres, il fut inauguré le 5 janvier 1875.",
    anecdote:
      "Lorsque l'impératrice Eugénie demanda à Charles Garnier quel était ce style si foisonnant qui n'était ni grec ni Louis XVI, le jeune architecte de 35 ans répondit avec aplomb : « C'est du Napoléon III, Madame ! »",
    voiceover:
      "Bienvenue devant le Palais Garnier, l'Opéra national de Paris. " +
      "Pendant ce tour panoramique à 360 degrés, plongeons dans l'aventure extraordinaire de ce palais dédié aux arts lyriques. " +
      "En 1861, Charles Garnier, alors architecte presque inconnu de trente-cinq ans, remporte contre les plus grands maîtres le concours impérial voulu par Napoléon Trois. " +
      "Le chantier dure quatorze ans, retardé par une nappe phréatique souterraine qui inspira la légende du Fantôme de l'Opéra, puis par la guerre de 1870 et la chute de l'Empire. " +
      "Inauguré en grande pompe en janvier 1875 face à la toute nouvelle Place de l'Opéra, ce temple de marbre polychrome, d'or et de velours cramoisi déploie sept lieux légendaires, de la façade sculptée par Carpeaux jusqu'au Grand Escalier et au plafond de Marc Chagall.",
  };

  function makePoi(spec) {
    return {
      ...spec,
      markerPos: garnierLocalToWorld(...spec.localMarker),
      cameraPos: garnierLocalToWorld(...spec.localCam),
      target: garnierLocalToWorld(...spec.localTarget),
      fpsPos: garnierLocalToWorld(...spec.localFps),
    };
  }

  const pois = [
    makePoi({
      id: 'garnier-facade-loggia',
      title: 'La Façade Second Empire, Loggia & « La Danse » de Carpeaux',
      shortTitle: 'Façade & La Danse',
      era: '1865 – 1872 • Polychromie & Sculptures',
      location: 'Parvis Sud • Place Charles-Garnier',
      localMarker: [14, 15, 84],
      localCam: [14, 17, 134],
      localTarget: [4, 16, 81],
      localFps: [10, 0.22, 108],
      history:
        "Charles Garnier orchestra la façade principale comme une partition musicale : au rez-de-chaussée, sept arcades encadrées par quatre grands groupes allégoriques dont « La Danse » de Jean-Baptiste Carpeaux ; au premier étage, la loggia scandée de seize colonnes corinthiennes jumelées en marbre rosé, médaillons dorés de compositeurs et frise « Académie Nationale de Musique ».",
      anecdote:
        "Jugée scandaleusement sensuelle lors de son dévoilement en 1869, « La Danse » de Carpeaux fut aspergée d'encre noire la nuit par un passant indigné : la statue originale est aujourd'hui conservée au musée d'Orsay et remplacée sur la façade par un moulage fidèle.",
    }),
    makePoi({
      id: 'garnier-coupole-apollon',
      title: 'La Coupole de Cuivre Vert-de-Gris & l’Apollon à la Lyre d’Or',
      shortTitle: 'Coupole & Apollon',
      era: '1867 – 1869 • Bronze doré d’Aimé Millet',
      location: 'Toitures • 63 mètres de haut',
      localMarker: [0, 56, -15],
      localCam: [54, 56, 48],
      localTarget: [0, 44, -18],
      localFps: [28, 0.22, 114],
      history:
        "De l'extérieur, la silhouette du Palais Garnier lit à ciel ouvert la fonction de chaque espace : la coupole côtelée en cuivre patiné vert-de-gris coiffe exactement la salle circulaire du public, tandis que derrière elle surgit l'immense pignon de la cage de scène, culminant à soixante-trois mètres sous le groupe doré « Apollon, la Poésie et la Musique » d'Aimé Millet.",
      anecdote:
        "Aux quatre angles et sur la façade, les statues ailées de bronze doré et les deux Pégases d'Eugène Lequesne scintillent dans le ciel parisien, autrefois dorés à la feuille d'or fin pour résister aux intempéries.",
    }),
    makePoi({
      id: 'garnier-grand-escalier',
      title: 'Le Grand Escalier d’Honneur en Marbres Polychromes',
      shortTitle: 'Grand Escalier',
      era: '1866 – 1875 • Chef-d’œuvre théâtral',
      location: 'Nef d’entrée • Intérieur (30 m sous voûte)',
      localMarker: [0, 12.6, 38],
      localCam: [0, 12.2, 54.2],
      localTarget: [0, 8.6, 33],
      localFps: [0, 1.4, 54],
      history:
        "Pour Charles Garnier, le spectacle commençait bien avant le lever de rideau : dans cette nef haute de trente mètres, le public gravissait la volée centrale de marbre blanc jusqu'à la Pythie de Marcello, avant que l'escalier ne se dédouble en deux rampes vers les balcons d'où les spectateurs pouvaient voir et être vus.",
      anecdote:
        "L'escalier marie plus de trente variétés de marbres venus de toute la France et d'Europe : balustrades d'onyx rouge antique, marches de Seravezza blanc, colonnes en brèche violette et sérancolin des Pyrénées, éclairées par les torchères féminines de Carrier-Belleuse.",
    }),
    makePoi({
      id: 'garnier-grand-foyer',
      title: 'Le Grand Foyer Doré — Le « Versailles de l’Opéra »',
      shortTitle: 'Grand Foyer Doré',
      era: '1875 • Paul Baudry & Galeries dorées',
      location: '1er Étage noble (+10,5 m) • Galerie 54 m',
      localMarker: [0, 14.5, 68.5],
      localCam: [-22.5, 16.4, 68.5],
      localTarget: [16, 15.2, 68.5],
      localFps: [-16, 10.5, 68.5],
      history:
        "Long de cinquante-quatre mètres et haut de dix-huit mètres au-dessus du vestibule, le Grand Foyer était la promenade privilégiée du tout-Paris durant les entractes. Inspiré des galeries des châteaux de la Renaissance et de la Galerie des Glaces de Versailles, il déploie dix grands lustres de cristal, vingt colonnes corinthiennes et de vastes miroirs dorés face aux baies de la loggia.",
      anecdote:
        "Lors de l'inauguration en 1875, le peintre Paul Baudry acheva ses grandes toiles du plafond dédiées à l'Histoire de la Musique après dix ans de travail : l'or des boiseries était si lumineux qu'il attira d'emblée autant les regards que les œuvres de la scène.",
    }),
    makePoi({
      id: 'garnier-grande-salle-chagall',
      title: 'La Grande Salle Rouge & Or, Grand Lustre & Plafond de Chagall',
      shortTitle: 'Grande Salle & Chagall',
      era: '1875 & 1964 • 1 979 places à l’italienne',
      location: 'Coupole intérieure • Parterre & Corbeille',
      localMarker: [0, 18.5, -4],
      localCam: [0, 20.6, 12.8],
      localTarget: [0, 19.6, -8.5],
      localFps: [0, 10.5, 12],
      history:
        "Conçue à l'italienne en fer à cheval, la Grande Salle marie exclusivement le rouge cramoisi impérial du velours, l'or des loges à quatre niveaux et le trompe-l'œil spectaculaire du rideau de scène. Au centre pend l'illustre Grand Lustre de cristal et de bronze doré pesant près de huit tonnes.",
      anecdote:
        "En 1964, sur commande d'André Malraux, Marc Chagall peignit à soixante-dix-sept ans un plafond moderne suspendu sous la coupole d'origine : deux cent vingt mètres carrés de couleurs éclatantes célébrant Mozart, Wagner, Ravel ou Stravinsky autour du lustre.",
    }),
    makePoi({
      id: 'garnier-pavillon-empereur',
      title: 'Le Pavillon de l’Empereur & le Mythe du Fantôme de l’Opéra',
      shortTitle: 'Pavillon de l’Empereur',
      era: '1868 • Architecture sécuritaire & Légende',
      location: 'Façade Ouest • Rue Scribe & Double Rampe',
      localMarker: [-54, 16, -6],
      localCam: [-94, 18.5, 28],
      localTarget: [-54, 15, -6],
      localFps: [-74, 0.22, 16],
      history:
        "Sur le flanc Ouest, côté rue Scribe, Charles Garnier édifia une rotonde monumentale précédée d'une double rampe carrossable couverte permettant aux voitures de Napoléon III et de l'impératrice Eugénie d'accéder directement jusqu'à la loge impériale sans descendre sur la chaussée.",
      anecdote:
        "L'Empereur n'emprunta jamais cette rampe : l'Empire tomba avant la fin des travaux en 1870 ! Quant à l'immense cuve en béton creusée sous la scène pour contenir la nappe phréatique souterraine, elle donna naissance au célèbre roman de Gaston Leroux, « Le Fantôme de l'Opéra », publié en 1910.",
    }),
    makePoi({
      id: 'garnier-place-opera',
      title: 'La Place de l’Opéra, le Café de la Paix & Perspective du Louvre',
      shortTitle: 'Place de l’Opéra',
      era: '1860 – 1900 • Urbanisme haussmannien',
      location: 'Carrefour des 7 Rues • Métro Opéra',
      localMarker: [0, 6, 166],
      localCam: [-4, 22, 214],
      localTarget: [-6, 17, 94],
      localFps: [18, 0.23, 144],
      history:
        "Le Baron Haussmann dessina autour du nouvel Opéra un théâtre urbain grandiose où convergent sept artères majeures — dont le boulevard des Capucines et la large avenue de l'Opéra percée sans arbres afin de ne jamais masquer la façade de Garnier depuis le Louvre. Sur l'angle Ouest trône le mythique Café de la Paix inauguré en 1862.",
      anecdote:
        "Au centre du carrefour s'ouvrent les balustrades en pierre sculptée des bouches du Métro Opéra dessinées par Jean-Baptiste Cassien-Bernard : ce fut l'un des plus complexes nœuds du métropolitain parisien, où se croisent trois lignes dès les années 1904 à 1910.",
    }),
  ];

  // ==========================================================================
  // 6. GESTION LOD À 3 NIVEAUX & ILLUMINATION NOCTURNE SECOND EMPIRE
  // ==========================================================================
  let currentLod = 0;
  let currentCamDist = 90;

  function setLodLevel(level, camDist = 90) {
    currentLod = level;
    currentCamDist = camDist;
    exteriorGroup.visible = true;
    interiorGroup.visible = level === 0;
    envGroup.visible = level < 2;
  }

  function update(dt, nightFactor = 0.1, isActiveMonument = false) {
    const glow = Math.max(0, (nightFactor - 0.16) / 0.84);

    const useInteriorLights = (isActiveMonument || currentLod === 0) && currentCamDist < 155;
    for (let i = 0; i < interiorLights.length; i++) {
      const entry = interiorLights[i];
      entry.light.visible = useInteriorLights;
      if (useInteriorLights) {
        entry.light.intensity = THREE.MathUtils.lerp(entry.base, entry.night, nightFactor);
      }
    }

    matStone.emissive.setHex(0xd49b4c);
    matStone.emissiveIntensity = glow * 0.24;
    matGold.emissive.setHex(0xc88d2c);
    matGold.emissiveIntensity = glow * 0.34;
    matMullionGlass.emissiveIntensity = 0.22 + glow * 1.15;
    matMosaicGold.emissiveIntensity = 0.14 + glow * 0.55;
    matLampGlow.emissiveIntensity = 0.48 + glow * 1.6;
    matChagallCeiling.emissiveIntensity = 0.5 + nightFactor * 0.35;

    void dt;
  }

  return {
    id: 'palais-garnier',
    name: 'Palais Garnier (Opéra)',
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: GARNIER_WORLD_POS.x - 165,
      maxX: GARNIER_WORLD_POS.x + 175,
      minZ: GARNIER_WORLD_POS.z - 140,
      maxZ: GARNIER_WORLD_POS.z + 250,
    },
    fpsSpawnPos: garnierLocalToWorld(0, 0.22, 114),
    fpsSpawnTarget: garnierLocalToWorld(0, 19, 80),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
