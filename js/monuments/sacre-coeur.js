import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';
import { getParisElevation } from '../paris-data.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #6 : BASILIQUE DU SACRÉ-CŒUR DE MONTMARTRE (ÉCHELLE 1:1)
 * Chef-d'œuvre romano-byzantin de Paul Abadie (1875 – 1914) au sommet de Paris
 * Position GPS : 48.8867° N, 2.3431° E -> (-139, +90, -2591)
 * Axes locaux :
 *   +Z = Sud  (Triple Portique, Parvis, Square Louise-Michel & Funiculaire)
 *   -Z = Nord (Chœur, Chevet à absidioles & Campanile 84 m de la Savoyarde)
 *   -X = Ouest (Funiculaire, Rue Foyatier, Saint-Pierre & Place du Tertre)
 *   +X = Est  (Rue du Chevalier-de-la-Barre & Parc Marcel-Bleustein-Blanchet)
 * ============================================================================
 */

export const SACRE_COEUR_WORLD_POS = new THREE.Vector3(-139, 90, -2591);
export const SACRE_COEUR_ROT_Y = 0;

export function sacreCoeurLocalToWorld(lx, ly, lz) {
  return new THREE.Vector3(
    SACRE_COEUR_WORLD_POS.x + lx,
    SACRE_COEUR_WORLD_POS.y + ly,
    SACRE_COEUR_WORLD_POS.z + lz
  );
}

export function worldToSacreCoeurLocal(wx, wz) {
  return {
    lx: wx - SACRE_COEUR_WORLD_POS.x,
    lz: wz - SACRE_COEUR_WORLD_POS.z,
  };
}

function localGroundY(lx, lz) {
  return getParisElevation(SACRE_COEUR_WORLD_POS.x + lx, SACRE_COEUR_WORLD_POS.z + lz) - SACRE_COEUR_WORLD_POS.y;
}

// ============================================================================
// TEXTURES PROCÉDURALES HD (TRAVERTIN CHÂTEAU-LANDON, MOSAÏQUE D'OR, MONTMARTRE)
// ============================================================================

function createTravertineTexture({ bright = true } = {}) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bright ? '#f5f1e8' : '#e6dfd1';
  ctx.fillRect(0, 0, size, size);

  const rowH = 24;
  for (let y = 0; y < size; y += rowH) {
    const shade = ((y * 17) % 12) - 6;
    const r = (bright ? 244 : 228) + shade;
    const g = (bright ? 240 : 221) + shade;
    const b = (bright ? 231 : 208) + shade;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.56)`;
    ctx.fillRect(0, y, size, rowH - 1.2);

    ctx.fillStyle = bright ? 'rgba(155, 146, 130, 0.22)' : 'rgba(122, 112, 95, 0.28)';
    ctx.fillRect(0, y + rowH - 1.2, size, 1.3);
  }

  ctx.strokeStyle = bright ? 'rgba(150, 142, 128, 0.18)' : 'rgba(116, 106, 90, 0.24)';
  ctx.lineWidth = 1.1;
  for (let row = 0; row < Math.ceil(size / rowH); row++) {
    const y0 = row * rowH;
    const off = (row % 2) * 34;
    for (let x = off; x < size; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + rowH);
      ctx.stroke();
    }
  }

  // Traînées verticales claires de calcite typiques du travertin de Château-Landon
  for (let i = 0; i < 42; i++) {
    const sx = (i * 73) % size;
    const grad = ctx.createLinearGradient(sx, 0, sx, size);
    grad.addColorStop(0, 'rgba(255, 254, 250, 0.24)');
    grad.addColorStop(0.5, 'rgba(255, 254, 250, 0.08)');
    grad.addColorStop(1, 'rgba(176, 166, 148, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, 0, 4 + (i % 6), size);
  }

  for (let i = 0; i < 3600; i++) {
    const x = (i * 197) % size;
    const y = (i * 313) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,252,0.12)' : 'rgba(130,120,104,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createByzantineMosaicTexture() {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Fond d'or byzantin rayonnant (Mosaïque du Christ en Majesté — 475 m², Luc-Olivier Merson)
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 38, w * 0.5, h * 0.44, w * 0.62);
  bg.addColorStop(0, '#fff4be');
  bg.addColorStop(0.24, '#f3ca58');
  bg.addColorStop(0.55, '#c99228');
  bg.addColorStop(0.82, '#8b5e18');
  bg.addColorStop(1, '#182b5c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Voûte étoilée bleu saphir en bordure haute
  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.25);
  topGrad.addColorStop(0, '#102352');
  topGrad.addColorStop(0.65, 'rgba(20, 45, 102, 0.85)');
  topGrad.addColorStop(1, 'rgba(20, 45, 102, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.28);

  // Étoiles dorées dans le ciel saphir
  ctx.fillStyle = '#ffe58a';
  for (let i = 0; i < 72; i++) {
    const sx = ((i * 157 + 41) % (w - 40)) + 20;
    const sy = ((i * 89 + 19) % Math.floor(h * 0.22)) + 16;
    const sr = 2.5 + (i % 4);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rayons de gloire rayonnant autour du Christ
  ctx.save();
  ctx.translate(w * 0.5, h * 0.44);
  for (let r = 0; r < 32; r++) {
    const a = (r / 32) * Math.PI * 2;
    ctx.fillStyle = r % 2 === 0 ? 'rgba(255, 245, 195, 0.24)' : 'rgba(232, 168, 48, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 440, a, a + 0.085);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Mandorle ovale bleu nuit & or encadrant le Christ
  ctx.save();
  ctx.translate(w * 0.5, h * 0.48);
  ctx.strokeStyle = '#ffdf78';
  ctx.lineWidth = 10;
  ctx.fillStyle = 'rgba(24, 46, 98, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 175, 285, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#c8342e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 162, 272, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Personnages secondaires symétriques (Archanges, Vierge, Sainte Jeanne d'Arc, France agenouillée)
  const sideFigures = [
    { x: 185, y: 560, robe: '#264f9c', cloak: '#b8322c', wings: true },
    { x: 300, y: 610, robe: '#8e2828', cloak: '#e4c265', wings: false },
    { x: 724, y: 610, robe: '#244a88', cloak: '#e4c265', wings: false },
    { x: 839, y: 560, robe: '#9b2d26', cloak: '#2c549c', wings: true },
  ];
  sideFigures.forEach((f) => {
    if (f.wings) {
      ctx.fillStyle = 'rgba(255, 241, 200, 0.72)';
      ctx.beginPath();
      ctx.ellipse(f.x - 42, f.y - 36, 26, 68, -0.35, 0, Math.PI * 2);
      ctx.ellipse(f.x + 42, f.y - 36, 26, 68, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    // Auréole
    ctx.fillStyle = '#f8d568';
    ctx.beginPath();
    ctx.arc(f.x, f.y - 84, 30, 0, Math.PI * 2);
    ctx.fill();
    // Robe & manteau
    ctx.fillStyle = f.robe;
    ctx.beginPath();
    ctx.moveTo(f.x - 46, f.y + 150);
    ctx.lineTo(f.x - 28, f.y - 45);
    ctx.lineTo(f.x + 28, f.y - 45);
    ctx.lineTo(f.x + 46, f.y + 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f.cloak;
    ctx.beginPath();
    ctx.moveTo(f.x - 32, f.y - 40);
    ctx.lineTo(f.x + 28, f.y + 20);
    ctx.lineTo(f.x + 36, f.y + 120);
    ctx.lineTo(f.x - 38, f.y + 85);
    ctx.closePath();
    ctx.fill();
    // Tête
    ctx.fillStyle = '#f1cca8';
    ctx.beginPath();
    ctx.arc(f.x, f.y - 82, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  // LE CHRIST EN MAJESTÉ (tunique blanche rayonnante, bras largement ouverts, Sacré-Cœur d'or & rubis)
  const cx = w * 0.5;
  const cy = h * 0.45;
  // Nimbe crucifère doré
  ctx.fillStyle = '#ffe582';
  ctx.beginPath();
  ctx.arc(cx, cy - 125, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b42222';
  ctx.fillRect(cx - 9, cy - 176, 18, 102);
  ctx.fillRect(cx - 50, cy - 134, 100, 18);

  // Bras ouverts en croix (tunique blanche lumineuse)
  ctx.fillStyle = '#fcf8ee';
  ctx.beginPath();
  ctx.moveTo(cx - 195, cy - 42);
  ctx.lineTo(cx + 195, cy - 42);
  ctx.lineTo(cx + 185, cy + 16);
  ctx.lineTo(cx + 68, cy + 28);
  ctx.lineTo(cx + 96, cy + 275);
  ctx.lineTo(cx - 96, cy + 275);
  ctx.lineTo(cx - 68, cy + 28);
  ctx.lineTo(cx - 185, cy + 16);
  ctx.closePath();
  ctx.fill();

  // Plis d'or et d'ombre sur la tunique blanche
  ctx.strokeStyle = 'rgba(206, 166, 74, 0.58)';
  ctx.lineWidth = 4;
  for (let p = -3; p <= 3; p++) {
    ctx.beginPath();
    ctx.moveTo(cx + p * 16, cy + 10);
    ctx.lineTo(cx + p * 24, cy + 268);
    ctx.stroke();
  }

  // Visage & barbe du Christ
  ctx.fillStyle = '#efc8a2';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 124, 24, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c3b22';
  ctx.beginPath();
  ctx.arc(cx, cy - 138, 25, Math.PI, Math.PI * 2);
  ctx.fill();

  // Sacré-Cœur rayonnant rubis & or sur la poitrine
  const heartG = ctx.createRadialGradient(cx, cy - 28, 4, cx, cy - 28, 46);
  heartG.addColorStop(0, '#fff2b0');
  heartG.addColorStop(0.42, '#e22a2a');
  heartG.addColorStop(1, 'rgba(255, 200, 65, 0)');
  ctx.fillStyle = heartG;
  ctx.beginPath();
  ctx.arc(cx, cy - 28, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c81c22';
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 34, 13, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy - 34, 13, 0, Math.PI * 2);
  ctx.moveTo(cx - 22, cy - 30);
  ctx.lineTo(cx, cy - 4);
  ctx.lineTo(cx + 22, cy - 30);
  ctx.closePath();
  ctx.fill();

  // Frise d'inscription latine en bas de la cul-de-four (centrée dans le champ visible sans rognage)
  ctx.fillStyle = '#15254a';
  ctx.fillRect(0, h - 122, w, 122);
  ctx.fillStyle = '#e8bf54';
  ctx.fillRect(0, h - 122, w, 8);
  ctx.fillRect(0, h - 16, w, 8);
  ctx.fillStyle = '#ffe594';
  ctx.font = 'bold 23px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('SACRATISSIMO CORDI JESU • GALLIA POENITENS ET DEVOTA', w * 0.5, h - 56);

  // Fine grille de tesselles de mosaïque pour la brillance byzantine
  ctx.strokeStyle = 'rgba(42, 26, 8, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Miroir horizontal U pour lecture gauche -> droite depuis l'intérieur sur BackSide
  tex.repeat.set(-1, 1);
  tex.offset.set(1, 0);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createByzantineWindowExteriorTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Verre ancien sombre extérieur (gris-ardoise & bleu nuit plombé, authentique vu de dehors)
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a3644');
  g.addColorStop(0.5, '#1e2732');
  g.addColorStop(1, '#141c25');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Arc plein cintre romano-byzantin en pierre claire au sommet
  ctx.strokeStyle = '#cfc7b8';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(w * 0.5, w * 0.5, w * 0.44, Math.PI, 0);
  ctx.stroke();

  // Résille de plomb losangée fine
  ctx.strokeStyle = 'rgba(14, 18, 24, 0.72)';
  ctx.lineWidth = 2.5;
  for (let y = 32; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 24; x < w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Discrets reflets vitrés
  ctx.fillStyle = 'rgba(180, 206, 230, 0.08)';
  ctx.fillRect(24, 90, 54, h - 130);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createByzantineStainedGlassInteriorTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f5d27b');
  g.addColorStop(0.32, '#406cb4');
  g.addColorStop(0.68, '#b5463a');
  g.addColorStop(1, '#2d4d88');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Médaillons romano-byzantins dorés & bleus
  for (let my = 110; my <= 420; my += 110) {
    ctx.fillStyle = '#ffe59c';
    ctx.beginPath();
    ctx.arc(w * 0.5, my, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#244b92';
    ctx.beginPath();
    ctx.arc(w * 0.5, my, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4463c';
    ctx.beginPath();
    ctx.arc(w * 0.5, my, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 4;
  for (let y = 0; y < h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeRect(8, 8, w - 16, h - 16);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBronzeDoorTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#383229';
  ctx.fillRect(0, 0, w, h);

  // 2 vantaux à caissons sculptés en bas-relief bronze
  for (let col = 0; col < 2; col++) {
    const x0 = 12 + col * 120;
    for (let row = 0; row < 4; row++) {
      const y0 = 20 + row * 118;
      ctx.fillStyle = '#4e4537';
      ctx.fillRect(x0, y0, 108, 102);
      ctx.strokeStyle = '#8b7652';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 6, y0 + 6, 96, 90);
      // Bas-relief central
      ctx.fillStyle = '#6f5f45';
      ctx.beginPath();
      ctx.arc(x0 + 54, y0 + 51, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMarbleFloorTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ece3d3';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alt = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = alt ? '#f3ece0' : '#d5c7b2';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      if (alt) {
        ctx.strokeStyle = 'rgba(155, 118, 76, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 10, y + 10, step - 20, step - 20);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createParvisCobbleTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#bfb7a8';
  ctx.fillRect(0, 0, size, size);

  const rowH = 16;
  const colW = 24;
  for (let r = 0; r < size / rowH; r++) {
    const off = (r % 2) * 12;
    for (let col = -1; col < size / colW + 1; col++) {
      const shade = ((r * 23 + col * 37) % 24) - 12;
      ctx.fillStyle = `rgb(${192 + shade}, ${184 + shade}, ${170 + shade})`;
      ctx.fillRect(col * colW + off + 1, r * rowH + 1, colW - 2, rowH - 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMontmartreVillageTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Enduit clair de village montmartrois
  ctx.fillStyle = '#f2e8d6';
  ctx.fillRect(0, 0, w, h);

  // Rez-de-chaussée bistrot / galerie d'art montmartroise
  ctx.fillStyle = '#2d3b32';
  ctx.fillRect(0, h - 108, w, 108);
  for (let i = 0; i < 4; i++) {
    const x = 18 + i * 124;
    ctx.fillStyle = '#1f282e';
    ctx.fillRect(x, h - 92, 96, 84);
    ctx.fillStyle = 'rgba(246, 206, 138, 0.34)';
    ctx.fillRect(x + 8, h - 84, 80, 46);
    // Bandeau bistrot doré
    ctx.fillStyle = '#7e2528';
    ctx.fillRect(x - 4, h - 106, 104, 14);
  }

  // 3 étages de fenêtres à volets persiennes vert sauge / gris bleu
  const rows = 3;
  const cols = 6;
  const cw = w / cols;
  for (let r = 0; r < rows; r++) {
    const fy = 28 + r * 124;
    for (let col = 0; col < cols; col++) {
      const fx = col * cw + 18;
      // Volets ouverts de part et d'autre
      ctx.fillStyle = (r + col) % 2 === 0 ? '#5c7268' : '#7b6c5c';
      ctx.fillRect(fx - 12, fy, 11, 74);
      ctx.fillRect(fx + cw - 35, fy, 11, 74);
      // Encadrement blanc
      ctx.fillStyle = '#faf5eb';
      ctx.fillRect(fx - 2, fy - 3, cw - 32, 80);
      // Vitre sombre
      ctx.fillStyle = '#243240';
      ctx.fillRect(fx, fy, cw - 36, 74);
      // Petits bois
      ctx.fillStyle = '#f2ece0';
      ctx.fillRect(fx + (cw - 36) * 0.5 - 1, fy, 2, 74);
      ctx.fillRect(fx, fy + 34, cw - 36, 2);
      // Garde-corps fer forgé
      ctx.fillStyle = '#202428';
      ctx.fillRect(fx - 1, fy + 58, cw - 34, 14);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMontmartreEmissiveTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Vitrines de bistrots chaleureusement illuminées
  for (let i = 0; i < 4; i++) {
    const x = 26 + i * 124;
    ctx.fillStyle = i % 2 === 0 ? '#ffcf80' : '#ffb862';
    ctx.fillRect(x, h - 84, 80, 48);
  }

  const rows = 3;
  const cols = 6;
  const cw = w / cols;
  for (let r = 0; r < rows; r++) {
    const fy = 28 + r * 124;
    for (let col = 0; col < cols; col++) {
      if ((r * 7 + col * 11) % 5 >= 2) continue;
      const fx = col * cw + 20;
      ctx.fillStyle = (r + col) % 2 === 0 ? '#ffe0a4' : '#ffc272';
      ctx.fillRect(fx, fy + 4, cw - 40, 52);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMontmartreArtworkTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Cadre doré de toile montmartroise
  ctx.fillStyle = '#c89b44';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff9ec';
  ctx.fillRect(10, 10, size - 20, size - 20);

  // Ciel impressionniste de Montmartre au soleil couchant
  const sky = ctx.createLinearGradient(0, 14, 0, 145);
  sky.addColorStop(0, '#4678b8');
  sky.addColorStop(0.55, '#8cb8db');
  sky.addColorStop(1, '#f4cf8e');
  ctx.fillStyle = sky;
  ctx.fillRect(14, 14, size - 28, 130);

  // Silhouette blanche peinte du Sacré-Cœur au loin
  ctx.fillStyle = '#faf6ee';
  ctx.beginPath();
  ctx.ellipse(128, 86, 22, 34, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(92, 86, 72, 46);
  ctx.beginPath();
  ctx.ellipse(98, 96, 12, 18, 0, Math.PI, 0);
  ctx.ellipse(158, 96, 12, 18, 0, Math.PI, 0);
  ctx.fill();

  // Rue montmartroise animée & auvents rouges/verts au premier plan
  ctx.fillStyle = '#d69054';
  ctx.fillRect(14, 118, 66, 90);
  ctx.fillStyle = '#e6c89a';
  ctx.fillRect(176, 118, 66, 90);
  ctx.fillStyle = '#b42c2e';
  ctx.fillRect(14, 152, 68, 14);
  ctx.fillStyle = '#246644';
  ctx.fillRect(174, 152, 68, 14);
  // Pavés & touches impressionnistes colorées
  ctx.fillStyle = '#9e9588';
  ctx.fillRect(14, 182, size - 28, 60);
  const strokes = ['#e05242', '#3a6eb8', '#e8c448', '#428554', '#f4ece0'];
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = strokes[i % strokes.length];
    ctx.fillRect(20 + ((i * 37) % 210), 174 + ((i * 19) % 58), 10, 5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBistroSignTexture(title, subtitle, bgHex = '#7c1f24', accentHex = '#f2cc6e') {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#fff7e4';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w * 0.5, 64);
  ctx.fillStyle = accentHex;
  ctx.font = '600 20px Georgia, serif';
  ctx.fillText(subtitle, w * 0.5, 98);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTableclothTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#fcf7ee';
  ctx.fillRect(0, 0, size, size);
  const sq = 16;
  for (let y = 0; y < size; y += sq) {
    for (let x = 0; x < size; x += sq) {
      if (((x + y) / sq) % 2 === 0) {
        ctx.fillStyle = '#b93236';
        ctx.fillRect(x, y, sq, sq);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// GÉOMÉTRIES ROMANO-BYZANTINES SPÉCIFIQUES (DÔMES OVOÏDES, ARCS PLEIN CINTRE)
// ============================================================================

/**
 * Crée un vrai profil ovoïde romano-byzantin par LatheGeometry (silhouette exacte de Paul Abadie)
 */
function createOvoidDomeGeometry(baseRadius, height, topRadius, radialSegs = 28) {
  const pts = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = base, 1 = couronne sous lanternon
    // Courbe ovoïde tendue (légèrement galbée à la base, ogivale douce au sommet)
    const angle = t * Math.PI * 0.5;
    const bulge = Math.cos(angle);
    const r = topRadius + (baseRadius - topRadius) * Math.pow(bulge, 0.78);
    const y = height * Math.pow(Math.sin(angle), 0.94);
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, radialSegs);
}

/**
 * Mur percé d'une arcade plein cintre (Romano-Byzantin)
 */
function createRoundArchWallGeometry(totalW, totalH, archW, springY, depth) {
  const hw = totalW * 0.5;
  const ahw = archW * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-ahw, 0);
  shape.lineTo(-ahw, springY);
  shape.absarc(0, springY, ahw, Math.PI, 0, true);
  shape.lineTo(ahw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, totalH);
  shape.lineTo(-hw, totalH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Pignon triangulaire / festonné couronnant les façades
 */
function createGableGeo(w, h, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-w * 0.5, 0);
  shape.lineTo(w * 0.5, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

// ============================================================================
// CONSTRUCTION COMPLÈTE DU SACRÉ-CŒUR & DU VILLAGE DE MONTMARTRE
// ============================================================================

export function buildSacreCoeurMonument(scene) {
  const root = new THREE.Group();
  root.name = 'Monument_SacreCoeur_Montmartre';
  root.position.copy(SACRE_COEUR_WORLD_POS);
  root.rotation.y = SACRE_COEUR_ROT_Y;
  scene.add(root);

  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'SacreCoeur_Exterior';
  root.add(exteriorGroup);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'SacreCoeur_Interior';
  root.add(interiorGroup);

  const envGroup = new THREE.Group();
  envGroup.name = 'SacreCoeur_MontmartreEnv';
  root.add(envGroup);

  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'SacreCoeur_Dynamic';
  dynamicGroup.userData.noMerge = true;
  root.add(dynamicGroup);

  // --- MATÉRIAUX PARTAGÉS (Optimisés pour fusion statique) ---
  const texTravBright = createTravertineTexture({ bright: true });
  const texTravSculpt = createTravertineTexture({ bright: false });
  const texMosaic = createByzantineMosaicTexture();
  const texWinExt = createByzantineWindowExteriorTexture();
  const texGlassInt = createByzantineStainedGlassInteriorTexture();
  const texBronzeDoor = createBronzeDoorTexture();
  const texMarbleFloor = createMarbleFloorTexture();
  const texCobble = createParvisCobbleTexture();
  const texVillage = createMontmartreVillageTexture();
  const texVillageEm = createMontmartreEmissiveTexture();

  const matTravertine = new THREE.MeshStandardMaterial({
    map: texTravBright,
    color: 0xffffff,
    emissive: new THREE.Color(0xffe1a8),
    emissiveIntensity: 0.0,
    roughness: 0.72,
  });

  const matTravSculpt = new THREE.MeshStandardMaterial({
    map: texTravSculpt,
    color: 0xf4eee2,
    emissive: new THREE.Color(0xffd792),
    emissiveIntensity: 0.0,
    roughness: 0.76,
  });

  const matTravShadow = new THREE.MeshStandardMaterial({
    color: 0xd2c9b8,
    roughness: 0.84,
  });

  const matTravInt = new THREE.MeshStandardMaterial({
    map: texTravSculpt,
    color: 0xf0e7d6,
    roughness: 0.78,
  });

  const matRoofStone = new THREE.MeshStandardMaterial({
    color: 0xc2b9a8,
    roughness: 0.72,
    metalness: 0.08,
  });

  const matBronzePatina = new THREE.MeshStandardMaterial({
    color: 0x3b6355,
    roughness: 0.44,
    metalness: 0.62,
  });

  const matBronzeDark = new THREE.MeshStandardMaterial({
    map: texBronzeDoor,
    color: 0xa48c68,
    roughness: 0.48,
    metalness: 0.42,
  });

  const matBellBronze = new THREE.MeshStandardMaterial({
    color: 0xa6844b,
    emissive: new THREE.Color(0x4d3716),
    emissiveIntensity: 0.34,
    roughness: 0.34,
    metalness: 0.62,
  });

  const matGold = new THREE.MeshStandardMaterial({
    color: 0xeac258,
    emissive: new THREE.Color(0xd89d28),
    emissiveIntensity: 0.22,
    roughness: 0.26,
    metalness: 0.86,
  });

  const matWindowExt = new THREE.MeshStandardMaterial({
    map: texWinExt,
    emissive: new THREE.Color(0xffbd63),
    emissiveIntensity: 0.05,
    roughness: 0.3,
    metalness: 0.35,
  });

  const matGlassInt = new THREE.MeshStandardMaterial({
    map: texGlassInt,
    emissive: new THREE.Color(0xffc970),
    emissiveMap: texGlassInt,
    emissiveIntensity: 0.48,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });

  const matMosaic = new THREE.MeshStandardMaterial({
    map: texMosaic,
    emissive: new THREE.Color(0xffd778),
    emissiveMap: texMosaic,
    emissiveIntensity: 0.44,
    roughness: 0.32,
    metalness: 0.22,
    side: THREE.BackSide,
  });

  const matMarbleFloor = new THREE.MeshStandardMaterial({
    map: texMarbleFloor,
    roughness: 0.34,
    metalness: 0.08,
  });

  const matOak = new THREE.MeshStandardMaterial({
    color: 0x6f4b2f,
    roughness: 0.62,
  });

  const matOrganPipe = new THREE.MeshStandardMaterial({
    color: 0xe6ecf4,
    emissive: new THREE.Color(0x525c6a),
    emissiveIntensity: 0.16,
    roughness: 0.24,
    metalness: 0.72,
  });

  const matIron = new THREE.MeshStandardMaterial({
    color: 0x252d2b,
    roughness: 0.48,
    metalness: 0.68,
  });

  const matCobble = new THREE.MeshStandardMaterial({
    map: texCobble,
    roughness: 0.88,
  });

  const matAsphalt = new THREE.MeshStandardMaterial({
    color: 0x3b3e44,
    roughness: 0.9,
  });

  const matLawn = new THREE.MeshStandardMaterial({
    color: 0x568341,
    roughness: 0.88,
  });

  const matWater = new THREE.MeshStandardMaterial({
    color: 0x3e8c9e,
    emissive: new THREE.Color(0x164252),
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.25,
  });

  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff2cf,
    emissive: new THREE.Color(0xffc766),
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  const matSlate = new THREE.MeshStandardMaterial({
    color: 0x3b4450,
    roughness: 0.56,
    metalness: 0.22,
  });

  const matTerracotta = new THREE.MeshStandardMaterial({
    color: 0xa4543d,
    roughness: 0.74,
  });

  const matAwningRed = new THREE.MeshStandardMaterial({
    color: 0x9b272a,
    roughness: 0.78,
  });

  const matAwningGreen = new THREE.MeshStandardMaterial({
    color: 0x24563d,
    roughness: 0.78,
  });

  const matAwningCream = new THREE.MeshStandardMaterial({
    color: 0xf4ead6,
    roughness: 0.76,
  });

  const matVillageWall = new THREE.MeshStandardMaterial({
    map: texVillage,
    color: 0xfaf3e6,
    emissive: new THREE.Color(0xffc770),
    emissiveMap: texVillageEm,
    emissiveIntensity: 0.06,
    roughness: 0.82,
  });

  const matVillageOchre = new THREE.MeshStandardMaterial({
    map: texVillage,
    color: 0xf0d6b2,
    emissive: new THREE.Color(0xffc770),
    emissiveMap: texVillageEm,
    emissiveIntensity: 0.06,
    roughness: 0.82,
  });

  const matVillageRose = new THREE.MeshStandardMaterial({
    map: texVillage,
    color: 0xebd1c7,
    emissive: new THREE.Color(0xffc770),
    emissiveMap: texVillageEm,
    emissiveIntensity: 0.06,
    roughness: 0.82,
  });

  const matGlassFunicular = new THREE.MeshStandardMaterial({
    color: 0x9bc4d8,
    emissive: new THREE.Color(0xffe1a4),
    emissiveIntensity: 0.14,
    roughness: 0.16,
    metalness: 0.48,
    transparent: true,
    opacity: 0.78,
  });

  const matRatpJade = new THREE.MeshStandardMaterial({
    color: 0x00a88f,
    roughness: 0.34,
    metalness: 0.22,
  });

  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x67727d,
    roughness: 0.42,
    metalness: 0.65,
  });

  // --- HELPERS GÉOMÉTRIQUES ---
  function addMesh(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, recv = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
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

  // Tourelle d'angle romano-byzantine à colonnettes & petit dôme ovoïde
  function addCornerTurret(parent, x, baseY, z, r = 1.75, shaftH = 12.0, cupolaH = 5.4) {
    addCyl(parent, r * 1.12, r * 1.18, 1.4, 10, matTravSculpt, x, baseY + 0.7, z);
    addCyl(parent, r, r * 1.04, shaftH, 12, matTravertine, x, baseY + 1.4 + shaftH * 0.5, z);
    const drumY = baseY + 1.4 + shaftH;
    addCyl(parent, r * 1.14, r * 1.14, 0.75, 12, matTravSculpt, x, drumY, z);
    // Couronne de 6 colonnettes ajourées au sommet de la tourelle
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      addCyl(parent, 0.16, 0.18, 2.8, 6, matTravSculpt, x + Math.cos(a) * (r * 0.85), drumY + 1.6, z + Math.sin(a) * (r * 0.85), 0, 0, 0, false, true);
    }
    addCyl(parent, r * 0.58, r * 0.62, 2.7, 10, matTravShadow, x, drumY + 1.6, z, 0, 0, 0, false, true);
    addCyl(parent, r * 1.08, r * 1.08, 0.55, 12, matTravSculpt, x, drumY + 3.15, z);
    addMesh(parent, createOvoidDomeGeometry(r * 0.96, cupolaH, 0.14, 14), matTravertine, x, drumY + 3.4, z);
    addCyl(parent, 0.07, 0.12, 1.8, 6, matGold, x, drumY + 3.4 + cupolaH + 0.8, z, 0, 0, 0, false, false);
  }

  // Statue équestre en bronze patiné (Jeanne d'Arc & Saint Louis)
  function addEquestrianStatue(parent, x, y, z, facingSouth = true, withBanner = true) {
    const dir = facingSouth ? 1 : -1;
    // Socle mouluré
    addBox(parent, 2.3, 1.3, 3.6, matTravSculpt, x, y + 0.65, z);
    addBox(parent, 1.9, 0.45, 3.1, matBronzePatina, x, y + 1.5, z);
    // Corps du cheval (tronc, poitrail, encolure, tête, 4 jambes, queue)
    const hy = y + 3.25;
    addCyl(parent, 0.58, 0.62, 2.25, 10, matBronzePatina, x, hy, z, Math.PI * 0.5, 0, 0);
    addMesh(parent, new THREE.SphereGeometry(0.62, 10, 8), matBronzePatina, x, hy + 0.08, z + dir * 1.05);
    addMesh(parent, new THREE.SphereGeometry(0.56, 10, 8), matBronzePatina, x, hy, z - dir * 1.02);
    // Encolure dressée & tête
    addCyl(parent, 0.28, 0.44, 1.35, 8, matBronzePatina, x, hy + 0.78, z + dir * 1.32, dir * 0.42, 0, 0);
    addBox(parent, 0.36, 0.44, 0.92, matBronzePatina, x, hy + 1.36, z + dir * 1.78, dir * 0.32, 0, 0);
    // 4 pattes (une antérieure levée fièrement)
    addCyl(parent, 0.13, 0.11, 1.65, 6, matBronzePatina, x - 0.34, y + 2.45, z - dir * 0.88);
    addCyl(parent, 0.13, 0.11, 1.65, 6, matBronzePatina, x + 0.34, y + 2.45, z - dir * 0.88);
    addCyl(parent, 0.13, 0.11, 1.65, 6, matBronzePatina, x - 0.34, y + 2.45, z + dir * 0.86);
    addCyl(parent, 0.13, 0.11, 1.25, 6, matBronzePatina, x + 0.34, y + 2.75, z + dir * 1.28, dir * 0.72, 0, 0);
    // Queue
    addCyl(parent, 0.1, 0.16, 1.25, 6, matBronzePatina, x, hy - 0.35, z - dir * 1.48, -dir * 0.42, 0, 0);
    // Cavalier en armure + cape + bras levé
    addCyl(parent, 0.32, 0.38, 1.45, 8, matBronzePatina, x, hy + 1.15, z + dir * 0.05);
    addMesh(parent, new THREE.SphereGeometry(0.28, 8, 7), matBronzePatina, x, hy + 2.08, z + dir * 0.08);
    // Étendard dressé de Jeanne d'Arc ou couronne / sceptre de Saint Louis
    if (withBanner) {
      addCyl(parent, 0.055, 0.065, 4.6, 6, matGold, x + 0.42, hy + 2.45, z + dir * 0.35, 0.08, 0, -0.1);
      addBox(parent, 0.08, 1.15, 1.45, matBronzePatina, x + 0.48, hy + 4.1, z - dir * 0.32, 0, 0.16, 0);
    } else {
      addCyl(parent, 0.05, 0.06, 2.4, 6, matGold, x - 0.38, hy + 1.95, z + dir * 0.45, 0.22, 0, 0.12);
      addMesh(parent, new THREE.TorusGeometry(0.26, 0.055, 6, 12), matGold, x + 0.35, hy + 1.9, z + dir * 0.55, 0.4, 0, 0);
    }
  }

  // Baie romano-byzantine géminée extérieure (2 lancettes sombres + meneau pierre + oculus + voussure)
  function addRomanesquePairedWindow(parent, x, y, z, rotY = 0, w = 3.8, h = 7.6) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = rotY;
    // Fond d'embrasure
    addBox(grp, w, h, 0.42, matTravShadow, 0, 0, 0, 0, 0, 0, false, true);
    // Deux lancettes vitrées sombres
    [-w * 0.24, w * 0.24].forEach((ox) => {
      addBox(grp, w * 0.36, h * 0.82, 0.24, matWindowExt, ox, -h * 0.04, 0.18, 0, 0, 0, false, false);
    });
    // Colonnette-meneau centrale + chapiteau
    addCyl(grp, 0.18, 0.21, h * 0.82, 8, matTravSculpt, 0, -h * 0.04, 0.28, 0, 0, 0, false, true);
    addBox(grp, 0.58, 0.34, 0.56, matTravSculpt, 0, h * 0.38, 0.28, 0, 0, 0, false, true);
    // Voussure plein cintre sculptée au sommet + appui mouluré en bas
    addMesh(grp, new THREE.TorusGeometry(w * 0.48, 0.28, 8, 18, Math.PI), matTravSculpt, 0, h * 0.36, 0.32, 0, 0, 0, false, true);
    addBox(grp, w * 1.12, 0.38, 0.64, matTravSculpt, 0, -h * 0.48, 0.22, 0, 0, 0, false, true);
    parent.add(grp);
  }

  // Dôme ovoïde complet avec tambour à colonnade, nervures 3D, lanternon & croix dorée
  function addCompleteOvoidDome(parent, {
    x, baseY, z,
    drumR, drumH,
    cupolaH, lanternBaseR,
    lanternH, numBays = 16,
    doubleCols = false,
    visitableLantern = false,
  }) {
    // Socle octogonal/circulaire du tambour (ouvert dessous sur le Grand Dôme pour la vue intérieure vers la coupole 55 m !)
    addMesh(parent, new THREE.CylinderGeometry(drumR * 1.09, drumR * 1.13, 2.2, numBays, 1, visitableLantern), matTravSculpt, x, baseY + 1.1, z);

    // Tambour circulaire percé de fenêtres étroites et rythmé de colonnes jumelées
    const dY = baseY + 2.2;
    addMesh(parent, new THREE.CylinderGeometry(drumR * 0.96, drumR * 0.99, drumH, Math.max(20, numBays), 1, visitableLantern), matTravertine, x, dY + drumH * 0.5, z);

    for (let i = 0; i < numBays; i++) {
      const a = (i / numBays) * Math.PI * 2;
      const aMid = ((i + 0.5) / numBays) * Math.PI * 2;
      const cx = x + Math.cos(a) * (drumR + 0.45);
      const cz = z + Math.sin(a) * (drumR + 0.45);

      // Colonnes corinthiennes simples ou jumelées sur piédestaux
      if (doubleCols) {
        const tx = -Math.sin(a) * 0.44;
        const tz = Math.cos(a) * 0.44;
        addCyl(parent, 0.26, 0.31, drumH * 0.88, 8, matTravSculpt, cx + tx, dY + drumH * 0.48, cz + tz, 0, 0, 0, true, true);
        addCyl(parent, 0.26, 0.31, drumH * 0.88, 8, matTravSculpt, cx - tx, dY + drumH * 0.48, cz - tz, 0, 0, 0, true, true);
        addBox(parent, 1.35, 1.4, 1.35, matTravSculpt, cx, dY + 0.7, cz, 0, -a, 0, false, true);
      } else {
        addCyl(parent, 0.26, 0.30, drumH * 0.86, 8, matTravSculpt, cx, dY + drumH * 0.48, cz, 0, 0, 0, false, true);
      }

      // Haute baie étroite sombre entre deux paires de colonnes
      const wx = x + Math.cos(aMid) * (drumR - 0.02);
      const wz = z + Math.sin(aMid) * (drumR - 0.02);
      const winW = (2 * Math.PI * drumR / numBays) * 0.44;
      addBox(parent, 0.32, drumH * 0.68, winW, matWindowExt, wx, dY + drumH * 0.5, wz, 0, -aMid, 0, false, false);
      // Petit arc de décharge au sommet de la baie
      addBox(parent, 0.46, 0.42, winW * 1.18, matTravSculpt, wx + Math.cos(aMid) * 0.14, dY + drumH * 0.86, wz + Math.sin(aMid) * 0.14, 0, -aMid, 0, false, true);
    }

    // Corniche saillante à modillons & balustrade circulaire sommitale du tambour
    const cY = dY + drumH;
    if (visitableLantern) {
      addMesh(parent, new THREE.CylinderGeometry(drumR * 1.14, drumR * 1.06, 1.35, Math.max(24, numBays), 1, true), matTravSculpt, x, cY + 0.68, z);
    } else {
      addCyl(parent, drumR * 1.14, drumR * 1.06, 1.35, Math.max(24, numBays), matTravSculpt, x, cY + 0.68, z);
    }
    addMesh(parent, new THREE.TorusGeometry(drumR * 1.07, 0.42, 8, Math.max(24, numBays)), matTravertine, x, cY + 2.0, z, Math.PI * 0.5, 0, 0, false, true);

    // COUPLE OVOÏDE ÉLANCÉE (LatheGeometry fidèle + nervures verticales 3D + bandes moulurées)
    const cupY = cY + 1.3;
    const ovoidGeo = createOvoidDomeGeometry(drumR * 0.99, cupolaH, lanternBaseR * 0.96, Math.max(24, numBays));
    addMesh(parent, ovoidGeo, matTravertine, x, cupY, z);

    // Nervures verticales continues épousant parfaitement le profil ovoïde (TubeGeometry sur courbe exacte)
    const ribCount = Math.min(numBays, 20);
    const ribRadius = visitableLantern ? 0.21 : 0.12;
    const ribPtsCount = 10;
    for (let i = 0; i < ribCount; i++) {
      const a = (i / ribCount) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const curvePts = [];
      for (let s = 0; s <= ribPtsCount; s++) {
        const t = 0.02 + (s / ribPtsCount) * 0.96;
        const ang = t * Math.PI * 0.5;
        const r = lanternBaseR * 0.96 + (drumR * 0.99 - lanternBaseR * 0.96) * Math.pow(Math.cos(ang), 0.78) + ribRadius * 0.42;
        const y = cupY + cupolaH * Math.pow(Math.sin(ang), 0.94);
        curvePts.push(new THREE.Vector3(x + cosA * r, y, z + sinA * r));
      }
      const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePts), 12, ribRadius, 5, false);
      addMesh(parent, ribGeo, matTravSculpt, 0, 0, 0, 0, 0, 0, false, true);
    }

    // Anneaux moulurés horizontaux & oculus ovales sur la coupole
    const midAng = 0.36 * Math.PI * 0.5;
    const midRingR = lanternBaseR * 0.96 + (drumR * 0.99 - lanternBaseR * 0.96) * Math.pow(Math.cos(midAng), 0.78) + 0.08;
    const midRingY = cupY + cupolaH * Math.pow(Math.sin(midAng), 0.94);
    addMesh(parent, new THREE.TorusGeometry(midRingR, visitableLantern ? 0.26 : 0.15, 8, 28), matTravSculpt, x, midRingY, z, Math.PI * 0.5, 0, 0, false, true);

    // LANTERNON COLONNÉ (Belvédère panoramique visitable sur le Grand Dôme !)
    const lantY = cupY + cupolaH;
    addCyl(parent, lanternBaseR * 1.18, lanternBaseR * 1.06, 0.95, 16, matTravSculpt, x, lantY + 0.35, z);
    if (visitableLantern) {
      // Balustrade panoramique à 69 m permettant d'admirer tout Paris
      addMesh(parent, new THREE.TorusGeometry(lanternBaseR * 1.12, 0.24, 8, 24), matTravSculpt, x, lantY + 1.85, z, Math.PI * 0.5, 0, 0);
      for (let b = 0; b < 16; b++) {
        const a = (b / 16) * Math.PI * 2;
        addCyl(parent, 0.1, 0.12, 1.15, 6, matTravertine, x + Math.cos(a) * (lanternBaseR * 1.12), lantY + 1.25, z + Math.sin(a) * (lanternBaseR * 1.12), 0, 0, 0, false, true);
      }
    }

    const colCount = visitableLantern ? 12 : 8;
    const colRingR = visitableLantern ? lanternBaseR * 0.78 : lanternBaseR * 0.82;
    for (let k = 0; k < colCount; k++) {
      const a = (k / colCount) * Math.PI * 2;
      addCyl(parent, 0.2, 0.24, lanternH * 0.62, 8, matTravSculpt, x + Math.cos(a) * colRingR, lantY + 0.8 + lanternH * 0.31, z + Math.sin(a) * colRingR);
    }
    // Noyau vitré intérieur du lanternon
    addCyl(parent, colRingR * 0.62, colRingR * 0.65, lanternH * 0.6, 12, matWindowExt, x, lantY + 0.8 + lanternH * 0.3, z, 0, 0, 0, false, false);
    // Couronne & petit dôme ovoïde sommital du lanternon
    const capY = lantY + 0.8 + lanternH * 0.62;
    addCyl(parent, lanternBaseR * 0.98, lanternBaseR * 0.94, 0.72, 14, matTravSculpt, x, capY + 0.3, z);
    addMesh(parent, createOvoidDomeGeometry(lanternBaseR * 0.84, lanternH * 0.52, 0.2, 14), matTravertine, x, capY + 0.62, z);

    // Orbe & Croix sommitale dorée
    const crossBaseY = capY + 0.62 + lanternH * 0.52;
    const crossH = visitableLantern ? 3.8 : 2.3;
    addMesh(parent, new THREE.SphereGeometry(visitableLantern ? 0.52 : 0.32, 10, 8), matGold, x, crossBaseY + 0.35, z);
    addBox(parent, 0.22, crossH, 0.22, matGold, x, crossBaseY + 0.5 + crossH * 0.5, z, 0, 0, 0, false, false);
    addBox(parent, crossH * 0.54, 0.22, 0.22, matGold, x, crossBaseY + 0.5 + crossH * 0.7, z, 0, 0, 0, false, false);
  }

  // ==========================================================================
  // 1. EXTÉRIEUR ROMANO-BYZANTIN HAUTE FIDÉLITÉ (Travertin blanc Château-Landon)
  // ==========================================================================

  // --- A. SOCLE MONUMENTAL, CRYPTE & GRAND PERRON SUD (ly = -1.5 -> +2.4 m) ---
  // Fondation débordant légèrement sous le niveau du plateau pour zéro jour
  addBox(exteriorGroup, 40.0, 4.4, 78.0, matTravSculpt, 0, 0.2, -2.0);
  addBox(exteriorGroup, 53.6, 4.4, 27.6, matTravSculpt, 0, 0.2, 0.0);
  addCyl(exteriorGroup, 16.5, 16.8, 4.4, 24, matTravSculpt, 0, 0.2, -25.0);
  // Corniche d'assise du soubassement
  addBox(exteriorGroup, 40.8, 0.6, 79.0, matTravertine, 0, 2.4, -2.0);
  addBox(exteriorGroup, 54.4, 0.6, 28.4, matTravertine, 0, 2.4, 0.0);

  // Grand perron de 10 marches montant du Parvis (ly = 0) au Triple Portique (ly = 2.4 m, lz = +41.5..+48.5)
  for (let s = 0; s < 10; s++) {
    const sh = 0.24;
    const sw = 34.4 + (9 - s) * 0.55;
    const sz = 48.2 - s * 0.72;
    addBox(exteriorGroup, sw, sh * (s + 1), 0.76, matTravertine, 0, sh * (s + 1) * 0.5, sz, 0, 0, 0, false, true);
  }
  // Jouées / garde-corps massifs encadrant le grand perron Sud + candélabres bronze
  [-18.8, 18.8].forEach((px) => {
    addBox(exteriorGroup, 2.2, 2.9, 8.2, matTravSculpt, px, 1.45, 44.8);
    addBox(exteriorGroup, 2.6, 0.42, 8.6, matTravertine, px, 2.95, 44.8);
    addCyl(exteriorGroup, 0.14, 0.24, 3.6, 8, matBronzePatina, px, 4.9, 48.0);
    addMesh(parentOrNull(exteriorGroup), new THREE.SphereGeometry(0.42, 8, 6), matLampGlow, px, 6.85, 48.0, 0, 0, 0, false, false);
  });

  function parentOrNull(p) {
    return p;
  }

  // --- B. TRIPLE PORTIQUE SUD, STATUES ÉQUESTRES & GABLE DU CHRIST (lz = +31..+41.8) ---
  // Les 3 grandes arcades plein cintre monumentales en saillie (centre 7,4 m, latérales 5,4 m)
  const centerArchGeo = createRoundArchWallGeometry(12.2, 17.6, 7.2, 10.6, 3.2);
  const sideArchGeo = createRoundArchWallGeometry(9.6, 17.6, 5.2, 10.4, 3.2);
  addMesh(exteriorGroup, centerArchGeo, matTravertine, 0, 2.4, 40.2);
  addMesh(exteriorGroup, sideArchGeo, matTravertine, -10.8, 2.4, 40.2);
  addMesh(exteriorGroup, sideArchGeo, matTravertine, 10.8, 2.4, 40.2);

  // Archivoltes triples concentriques en relief + 4 grands contreforts-piédestaux de façade
  addMesh(exteriorGroup, new THREE.TorusGeometry(3.7, 0.42, 8, 22, Math.PI), matTravSculpt, 0, 13.0, 41.82);
  addMesh(exteriorGroup, new THREE.TorusGeometry(4.25, 0.28, 8, 22, Math.PI), matTravertine, 0, 13.0, 41.92);
  [-10.8, 10.8].forEach((ax) => {
    addMesh(exteriorGroup, new THREE.TorusGeometry(2.7, 0.36, 8, 18, Math.PI), matTravSculpt, ax, 12.8, 41.82);
    addMesh(exteriorGroup, new THREE.TorusGeometry(3.15, 0.24, 8, 18, Math.PI), matTravertine, ax, 12.8, 41.92);
  });

  // 4 Piliers colossaux à colonnes engagées portant les statues équestres et la galerie
  [-15.8, -6.1, 6.1, 15.8].forEach((px, idx) => {
    const isInner = idx === 1 || idx === 2;
    addBox(exteriorGroup, 2.6, 18.2, 4.4, matTravSculpt, px, 11.5, 40.2);
    addCyl(exteriorGroup, 0.48, 0.56, 14.8, 10, matTravertine, px, 10.2, 42.4);
    addBox(exteriorGroup, 2.9, 0.85, 4.9, matTravSculpt, px, 20.4, 40.4);
    if (isInner) {
      // Piédestal élancé supportant Jeanne d'Arc (gauche) & Saint Louis (droite)
      addBox(exteriorGroup, 2.9, 4.4, 4.2, matTravertine, px * 1.42, 22.4, 40.2);
    }
  });

  // Porche voûté profond derrière les 3 arcades (lz = +32..+39) + 3 Portails de bronze
  // Flancs du porche avec petites arcades latérales
  [-16.2, 16.2].forEach((sx) => {
    addBox(exteriorGroup, 2.4, 17.8, 9.6, matTravertine, sx, 11.3, 35.6);
  });
  addBox(exteriorGroup, 34.4, 2.4, 10.2, matTravSculpt, 0, 19.6, 36.2); // Plafond / terrasse du porche

  // Mur de fond du porche (lz = +32.0) : PORTAIL CENTRAL OUVERT (|lx| < 2.6, ly < 9.4) + fermeture complète jusqu'à ly = 29 m !
  addBox(exteriorGroup, 12.6, 18.0, 2.2, matTravertine, -9.2, 11.4, 32.0);
  addBox(exteriorGroup, 12.6, 18.0, 2.2, matTravertine, 9.2, 11.4, 32.0);
  addBox(exteriorGroup, 6.2, 10.6, 2.2, matTravertine, 0, 15.1, 32.0); // Au-dessus du passage libre (ly = 9.8..20.4)
  // Mur supérieur plein de la façade Sud (ly = 20.0..28.8 m) fermant hermétiquement la nef derrière la galerie !
  addBox(exteriorGroup, 35.6, 9.4, 2.6, matTravertine, 0, 24.4, 32.2);
  addBox(exteriorGroup, 36.2, 1.0, 3.0, matTravSculpt, 0, 28.8, 32.2);
  // Vantaux de bronze entrouverts au portail central + linteau & tympan plein cintre sculpté AU-DESSUS de la porte !
  addBox(exteriorGroup, 0.35, 7.0, 2.2, matBronzeDark, -2.75, 5.9, 31.1, 0, 0.38, 0);
  addBox(exteriorGroup, 0.35, 7.0, 2.2, matBronzeDark, 2.75, 5.9, 31.1, 0, -0.38, 0);
  addBox(exteriorGroup, 5.8, 0.52, 0.72, matTravSculpt, 0, 9.75, 33.15);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(2.55, 2.55, 0.42, 20, 1, false, -Math.PI * 0.5, Math.PI), matTravSculpt, 0, 9.95, 33.15, -Math.PI * 0.5, 0, 0);
  addMesh(exteriorGroup, new THREE.TorusGeometry(2.68, 0.26, 8, 20, Math.PI), matTravertine, 0, 9.95, 33.36);
  // Portails latéraux en bronze à bas-reliefs
  [-10.4, 10.4].forEach((px) => {
    addBox(exteriorGroup, 3.8, 6.4, 0.5, matBronzeDark, px, 5.6, 33.1);
    addMesh(exteriorGroup, new THREE.TorusGeometry(2.05, 0.28, 8, 16, Math.PI), matTravSculpt, px, 8.8, 33.2);
  });

  // Galerie haute à arcatures naines sur la façade Sud (ly = 20.6..24.6 m)
  addBox(exteriorGroup, 33.6, 1.1, 2.8, matTravSculpt, 0, 20.9, 40.6);
  for (let i = -10; i <= 10; i++) {
    addCyl(exteriorGroup, 0.14, 0.16, 2.8, 6, matTravertine, i * 1.45, 22.8, 41.1, 0, 0, 0, false, true);
  }
  addBox(exteriorGroup, 33.8, 0.85, 2.6, matTravSculpt, 0, 24.4, 40.6);

  // STATUES ÉQUESTRES EN BRONZE PATINÉ : JEANNE D'ARC (Ouest) & SAINT LOUIS (Est)
  addEquestrianStatue(exteriorGroup, -8.65, 24.6, 40.2, true, true);
  addEquestrianStatue(exteriorGroup, 8.65, 24.6, 40.2, true, false);

  // Grand Gable central Sud (lz = +32.5..+39.0, ly = 24.5..41.6 m) & Niche sculptée du Sacré-Cœur du Christ
  addBox(exteriorGroup, 14.8, 10.6, 6.8, matTravertine, 0, 29.6, 35.6);
  addBox(exteriorGroup, 15.6, 0.85, 7.2, matTravSculpt, 0, 34.8, 35.7);
  addMesh(exteriorGroup, createGableGeo(15.2, 6.8, 6.8), matTravertine, 0, 34.9, 35.6);
  // Rampants moulurés du pignon triangulaire + 2 rosaces sculptées encadrant la niche du Christ
  const gableLen = Math.hypot(7.8, 6.8);
  const gableAng = Math.atan2(6.8, 7.8);
  addBox(exteriorGroup, gableLen, 0.65, 0.9, matTravSculpt, -3.9, 38.4, 39.05, 0, 0, gableAng);
  addBox(exteriorGroup, gableLen, 0.65, 0.9, matTravSculpt, 3.9, 38.4, 39.05, 0, 0, -gableAng);
  [-4.7, 4.7].forEach((rx) => {
    addMesh(exteriorGroup, new THREE.TorusGeometry(1.18, 0.2, 8, 18), matTravSculpt, rx, 29.8, 39.1);
    addCyl(exteriorGroup, 0.95, 0.95, 0.25, 16, matTravShadow, rx, 29.8, 39.0, Math.PI * 0.5, 0, 0, false, true);
    addMesh(exteriorGroup, new THREE.SphereGeometry(0.32, 8, 6), matGold, rx, 29.8, 39.18, 0, 0, 0, false, false);
  });
  // Niche profonde encadrée de colonnettes doubles + voussure sculptée
  addBox(exteriorGroup, 4.6, 8.2, 1.4, matTravShadow, 0, 29.5, 38.6);
  addMesh(exteriorGroup, new THREE.TorusGeometry(2.3, 0.36, 8, 16, Math.PI), matTravSculpt, 0, 33.0, 39.25);
  [-2.35, 2.35].forEach((nx) => {
    addCyl(exteriorGroup, 0.26, 0.3, 7.4, 8, matTravSculpt, nx, 29.3, 39.3);
  });
  // Statue du Christ du Sacré-Cœur (4,7 m, bronze patiné & Sacré-Cœur doré) dans la niche
  addBox(exteriorGroup, 1.5, 1.25, 1.5, matTravSculpt, 0, 25.8, 39.0);
  addCyl(exteriorGroup, 0.48, 0.68, 3.15, 10, matBronzePatina, 0, 28.05, 39.1);
  addMesh(exteriorGroup, new THREE.SphereGeometry(0.42, 8, 7), matBronzePatina, 0, 29.95, 39.1);
  addBox(exteriorGroup, 2.55, 0.36, 0.36, matBronzePatina, 0, 28.85, 39.25);
  addMesh(exteriorGroup, new THREE.SphereGeometry(0.24, 8, 6), matGold, 0, 28.65, 39.55, 0, 0, 0, false, false); // Cœur doré
  addMesh(exteriorGroup, new THREE.TorusGeometry(0.58, 0.085, 6, 14), matGold, 0, 30.05, 38.95); // Auréole d'or
  // Croix sommitale au sommet du pignon Sud
  addBox(exteriorGroup, 0.24, 2.8, 0.24, matGold, 0, 42.6, 36.2, 0, 0, 0, false, false);
  addBox(exteriorGroup, 1.45, 0.22, 0.22, matGold, 0, 43.2, 36.2, 0, 0, 0, false, false);

  // Tourelles d'angle jumelles flanquant la façade Sud
  addCornerTurret(exteriorGroup, -16.8, 19.8, 38.8, 1.9, 11.4, 5.2);
  addCornerTurret(exteriorGroup, 16.8, 19.8, 38.8, 1.9, 11.4, 5.2);

  // --- C. CORPS DE LA BASILIQUE : NEF, TRANSEPTS EST/OUEST & CHEVET À ABSIDIOLES ---
  // Murs extérieurs de la Nef (lx = ±17.2, lz = +11..+32, ly = 2.4..27.5 m)
  [-17.2, 17.2].forEach((wx) => {
    const sign = Math.sign(wx);
    addBox(exteriorGroup, 2.6, 25.2, 22.0, matTravertine, wx, 15.0, 21.5);
    // Corniche supérieure + balustrade + contreforts rythmés
    addBox(exteriorGroup, 3.4, 1.15, 22.8, matTravSculpt, wx + sign * 0.25, 27.6, 21.5);
    [13.5, 21.5, 29.5].forEach((pz) => {
      addBox(exteriorGroup, 1.8, 25.4, 1.85, matTravSculpt, wx + sign * 1.1, 15.1, pz);
    });
    // 2 grandes baies romano-byzantines géminées par flanc de nef
    [17.5, 25.5].forEach((wz) => {
      addRomanesquePairedWindow(exteriorGroup, wx + sign * 1.25, 16.4, wz, sign > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 4.4, 8.6);
      addRomanesquePairedWindow(exteriorGroup, wx + sign * 1.25, 6.8, wz, sign > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 3.6, 5.2);
    });
  });
  // Toiture en pierre/plomb de la Nef (au-dessus de ly = 27.5 m)
  addBox(exteriorGroup, 32.0, 2.2, 24.0, matRoofStone, 0, 27.8, 21.5);

  // Bras du Transept Ouest (lx = -25.8) & Est (lx = +25.8), lz = -12.5..+12.5
  [-1, 1].forEach((sx) => {
    // Murs Nord & Sud du bras de transept
    [-12.5, 12.5].forEach((tz) => {
      addBox(exteriorGroup, 11.4, 26.2, 2.4, matTravertine, sx * 20.6, 15.5, tz);
      addBox(exteriorGroup, 12.2, 1.15, 3.1, matTravSculpt, sx * 20.6, 28.6, tz);
      addRomanesquePairedWindow(exteriorGroup, sx * 20.8, 16.4, tz + Math.sign(tz) * 1.15, tz > 0 ? 0 : Math.PI, 4.0, 8.4);
    });
    // Façade pignon monumentale du transept (lx = ±25.8) avec grande rose-oculus + triple baie + 2 tourelles
    const fx = sx * 25.6;
    addBox(exteriorGroup, 2.6, 26.8, 26.4, matTravertine, fx, 15.8, 0);
    addMesh(exteriorGroup, createGableGeo(24.0, 8.8, 2.8), matTravertine, fx, 29.0, 0, 0, sx * Math.PI * 0.5, 0);
    // Grande rosace romano-byzantine en oculus du transept (ly = 21.5 m)
    addMesh(exteriorGroup, new THREE.TorusGeometry(4.4, 0.52, 8, 24), matTravSculpt, fx + sx * 1.25, 21.6, 0, 0, Math.PI * 0.5, 0);
    addCyl(exteriorGroup, 4.2, 4.2, 0.45, 24, matWindowExt, fx + sx * 1.05, 21.6, 0, 0, 0, Math.PI * 0.5, false, false);
    // 3 baies sous la rosace + porche latéral sculpté
    [-6.2, 0, 6.2].forEach((bz) => {
      addRomanesquePairedWindow(exteriorGroup, fx + sx * 1.25, 10.6, bz, sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 3.8, 7.6);
    });
    // Tourelles d'angle du transept
    addCornerTurret(exteriorGroup, fx + sx * 0.4, 18.0, -12.4, 1.75, 11.2, 4.8);
    addCornerTurret(exteriorGroup, fx + sx * 0.4, 18.0, 12.4, 1.75, 11.2, 4.8);
    // Toit du bras de transept
    addBox(exteriorGroup, 12.0, 2.0, 23.0, matRoofStone, sx * 19.6, 28.4, 0);
  });

  // Chœur & Chevet Nord semi-circulaire (lz = -39..-12) avec 7 absidioles rayonnantes en cul-de-four !
  [-15.8, 15.8].forEach((wx) => {
    const sign = Math.sign(wx);
    addBox(exteriorGroup, 2.4, 25.0, 14.0, matTravertine, wx, 14.9, -18.5);
    addBox(exteriorGroup, 3.1, 1.1, 14.6, matTravSculpt, wx + sign * 0.25, 27.4, -18.5);
    addRomanesquePairedWindow(exteriorGroup, wx + sign * 1.15, 16.0, -18.5, sign > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 4.2, 8.2);
  });

  // Mur courbe du chevet (demi-cylindre Nord UNIQUEMENT, thetaStart = PI/2, pour garder le chœur intérieur ouvert !)
  addMesh(exteriorGroup, new THREE.CylinderGeometry(15.6, 15.9, 25.2, 24, 1, true, Math.PI * 0.5, Math.PI), matTravertine, 0, 15.0, -25.0);
  addMesh(exteriorGroup, new THREE.CylinderGeometry(16.4, 16.2, 1.25, 24, 1, false, Math.PI * 0.5, Math.PI), matTravSculpt, 0, 27.6, -25.0);
  // Toit conique doux du chevet (demi-cône Nord)
  addMesh(exteriorGroup, new THREE.ConeGeometry(15.6, 6.2, 24, 1, false, Math.PI * 0.5, Math.PI), matRoofStone, 0, 31.1, -25.0);
  // Fermeture plane du toit du chœur au-dessus de la voûte intérieure (ly = 28 m)
  addBox(exteriorGroup, 31.0, 2.0, 16.0, matRoofStone, 0, 28.2, -18.5);

  // 7 Absidioles semi-circulaires rayonnantes couronnées de culs-de-four en pierre (côté Nord)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + ((i + 0.5) / 7) * Math.PI; // -X -> -Z -> +X
    const ax = Math.cos(a) * 15.4;
    const az = -25.0 + Math.sin(a) * 15.4;
    addCyl(exteriorGroup, 3.85, 4.0, 13.8, 14, matTravertine, ax, 9.3, az);
    addCyl(exteriorGroup, 4.15, 4.1, 0.72, 14, matTravSculpt, ax, 16.4, az);
    addMesh(exteriorGroup, createOvoidDomeGeometry(3.9, 4.4, 0.15, 14), matRoofStone, ax, 16.7, az);
    // Baie haute du chevet au-dessus de chaque absidiole
    const wx = Math.cos(a) * 15.7;
    const wz = -25.0 + Math.sin(a) * 15.7;
    addBox(exteriorGroup, 0.36, 6.2, 2.2, matWindowExt, wx, 22.0, wz, 0, -a, 0, false, false);
  }

  // --- D. LE GRAND DÔME OVOÏDE CENTRAL (83 m) + 4 DÔMES SATELLITES (53–55 m) ---
  // Massif carré de croisée ÉVIDÉ AU CENTRE (4 murs périphériques + corniche ajourée pour voir la coupole intérieure 55 m !)
  [-12.2, 12.2].forEach((cz) => {
    addBox(exteriorGroup, 27.6, 6.8, 3.2, matTravertine, 0, 29.8, cz);
    addBox(exteriorGroup, 28.6, 1.2, 3.8, matTravSculpt, 0, 33.4, cz);
  });
  [-12.2, 12.2].forEach((cx) => {
    addBox(exteriorGroup, 3.2, 6.8, 21.4, matTravertine, cx, 29.8, 0);
    addBox(exteriorGroup, 3.8, 1.2, 22.0, matTravSculpt, cx, 33.4, 0);
  });
  [[-13.4, -13.4], [13.4, -13.4], [-13.4, 13.4], [13.4, 13.4]].forEach(([tx, tz]) => {
    addCornerTurret(exteriorGroup, tx, 28.5, tz, 2.05, 8.2, 5.0);
  });

  // GRAND DÔME OVOÏDE CENTRAL (ly = 33 -> 83.2 m ; Belvédère panoramique visitable à ly = 69.2 m !)
  addCompleteOvoidDome(exteriorGroup, {
    x: 0,
    baseY: 32.8,
    z: 0,
    drumR: 11.4,
    drumH: 15.0,
    cupolaH: 19.2,
    lanternBaseR: 4.4,
    lanternH: 8.6,
    numBays: 20,
    doubleCols: true,
    visitableLantern: true,
  });

  // 4 DÔMES SATELLITES OVOÏDES (silhouette iconique à 5 coupoles de Montmartre)
  [
    { x: -13.2, z: 22.4, baseY: 27.4, drumR: 5.4, drumH: 7.4, cupolaH: 11.2, lR: 1.9, lH: 4.8 },
    { x: 13.2,  z: 22.4, baseY: 27.4, drumR: 5.4, drumH: 7.4, cupolaH: 11.2, lR: 1.9, lH: 4.8 },
    { x: -16.4, z: -10.8, baseY: 27.8, drumR: 5.6, drumH: 8.0, cupolaH: 11.8, lR: 2.0, lH: 5.0 },
    { x: 16.4,  z: -10.8, baseY: 27.8, drumR: 5.6, drumH: 8.0, cupolaH: 11.8, lR: 2.0, lH: 5.0 },
  ].forEach((sd) => {
    addCompleteOvoidDome(exteriorGroup, {
      x: sd.x,
      baseY: sd.baseY,
      z: sd.z,
      drumR: sd.drumR,
      drumH: sd.drumH,
      cupolaH: sd.cupolaH,
      lanternBaseR: sd.lR,
      lanternH: sd.lH,
      numBays: 12,
      doubleCols: false,
      visitableLantern: false,
    });
  });

  // --- E. LE GRAND CAMPANILE NORD (84 m) & LA CLOCHE « LA SAVOYARDE » (19 TONNES) ---
  const campZ = -48.5;
  // Galerie-pont reliant le chevet au campanile
  addBox(exteriorGroup, 10.4, 16.5, 11.0, matTravertine, 0, 9.5, -40.8);
  addBox(exteriorGroup, 11.2, 0.9, 11.4, matTravSculpt, 0, 18.0, -40.8);

  // Soubassement & fût carré du campanile (ly = 0 -> 42.5 m)
  addBox(exteriorGroup, 15.6, 18.5, 15.6, matTravSculpt, 0, 8.8, campZ);
  addBox(exteriorGroup, 16.4, 1.1, 16.4, matTravertine, 0, 18.4, campZ);
  addBox(exteriorGroup, 14.2, 24.0, 14.2, matTravertine, 0, 30.8, campZ);
  // Contreforts d'angle du campanile + hautes baies aveugles sur les 4 faces
  [[-6.8, -6.8], [6.8, -6.8], [-6.8, 6.8], [6.8, 6.8]].forEach(([cx, cz]) => {
    addBox(exteriorGroup, 2.2, 43.0, 2.2, matTravSculpt, cx, 21.5, campZ + cz);
  });
  [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5].forEach((rot) => {
    const sx = Math.sin(rot) * 7.15;
    const sz = Math.cos(rot) * 7.15;
    addRomanesquePairedWindow(exteriorGroup, sx, 30.5, campZ + sz, rot, 5.2, 13.5);
  });

  // Corniche & Balustrade de la Chambre des Cloches (ly = 42.8 m)
  addBox(exteriorGroup, 15.6, 1.35, 15.6, matTravSculpt, 0, 43.2, campZ);

  // CHAMBRE OUVERTE DU BEFFROI (ly = 43.8 -> 61.5 m) : 4 grands piliers d'angle + triples arcades ajourées !
  [[-5.9, -5.9], [5.9, -5.9], [-5.9, 5.9], [5.9, 5.9]].forEach(([cx, cz]) => {
    addBox(exteriorGroup, 3.2, 17.8, 3.2, matTravertine, cx, 52.7, campZ + cz);
    addCyl(exteriorGroup, 0.34, 0.38, 15.8, 8, matTravSculpt, cx * 1.18, 52.4, campZ + cz * 1.18, 0, 0, 0, false, true);
  });
  // Colonnes intermédiaires et arcs ajourés sur les 4 faces du beffroi
  [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5].forEach((rot) => {
    const faceGrp = new THREE.Group();
    faceGrp.position.set(0, 43.8, campZ);
    faceGrp.rotation.y = rot;
    addBox(faceGrp, 10.6, 1.2, 0.85, matTravSculpt, 0, 0.6, 6.8); // Balustrade basse
    [-2.4, 2.4].forEach((colX) => {
      addCyl(faceGrp, 0.28, 0.32, 12.2, 8, matTravSculpt, colX, 7.2, 6.7);
    });
    addMesh(faceGrp, createRoundArchWallGeometry(10.8, 4.8, 5.2, 1.2, 1.4), matTravertine, 0, 12.8, 6.5);
    exteriorGroup.add(faceGrp);
  });
  addBox(exteriorGroup, 15.8, 1.45, 15.8, matTravSculpt, 0, 61.8, campZ);

  // LA SAVOYARDE (plus grosse cloche de France : 19 tonnes, 3,03 m de diamètre, bien visible au cœur du beffroi !)
  addBox(exteriorGroup, 11.4, 0.85, 1.1, matOak, 0, 55.2, campZ); // Poutre maîtresse de charpente
  addBox(exteriorGroup, 4.8, 1.5, 1.5, matOak, 0, 54.1, campZ);   // Mouton de chêne massif
  // Profil authentique de cloche en bronze patiné & bandes dorées gravées (LatheGeometry)
  const bellPts = [
    new THREE.Vector2(2.12, 0.0),
    new THREE.Vector2(1.86, 0.55),
    new THREE.Vector2(1.42, 1.65),
    new THREE.Vector2(1.22, 2.85),
    new THREE.Vector2(1.02, 3.52),
    new THREE.Vector2(0.38, 3.85),
  ];
  addMesh(exteriorGroup, new THREE.LatheGeometry(bellPts, 24), matBellBronze, 0, 49.0, campZ);
  addMesh(exteriorGroup, new THREE.TorusGeometry(1.94, 0.09, 6, 24), matGold, 0, 49.42, campZ, Math.PI * 0.5, 0, 0, false, false);
  addMesh(exteriorGroup, new THREE.TorusGeometry(1.25, 0.07, 6, 20), matGold, 0, 51.65, campZ, Math.PI * 0.5, 0, 0, false, false);
  addCyl(exteriorGroup, 0.16, 0.28, 1.4, 8, matGold, 0, 48.5, campZ); // Battant doré de la Savoyarde

  // Couronnement du Campanile : tambour octogonal, coupole ovoïde nervurée & croix à 84,2 m
  addCyl(exteriorGroup, 6.2, 6.6, 5.6, 8, matTravertine, 0, 65.2, campZ);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    addCyl(exteriorGroup, 0.28, 0.32, 5.2, 8, matTravSculpt, Math.cos(a) * 6.55, 65.1, campZ + Math.sin(a) * 6.55);
  }
  addCyl(exteriorGroup, 6.8, 6.5, 1.0, 8, matTravSculpt, 0, 68.3, campZ);
  addMesh(exteriorGroup, createOvoidDomeGeometry(6.1, 12.2, 0.42, 16), matTravertine, 0, 68.8, campZ);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cPts = [];
    for (let s = 0; s <= 8; s++) {
      const t = 0.02 + (s / 8) * 0.96;
      const ang = t * Math.PI * 0.5;
      const r = 0.42 + (6.1 - 0.42) * Math.pow(Math.cos(ang), 0.78) + 0.08;
      const y = 68.8 + 12.2 * Math.pow(Math.sin(ang), 0.94);
      cPts.push(new THREE.Vector3(Math.cos(a) * r, y, campZ + Math.sin(a) * r));
    }
    addMesh(exteriorGroup, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cPts), 10, 0.14, 5, false), matTravSculpt, 0, 0, 0, 0, 0, 0, false, true);
  }
  // 4 clochetons d'angle autour du dôme du campanile
  [[-6.1, -6.1], [6.1, -6.1], [-6.1, 6.1], [6.1, 6.1]].forEach(([cx, cz]) => {
    addCornerTurret(exteriorGroup, cx, 62.2, campZ + cz, 1.2, 3.4, 3.2);
  });
  addMesh(exteriorGroup, new THREE.SphereGeometry(0.45, 8, 6), matGold, 0, 81.3, campZ);
  addBox(exteriorGroup, 0.22, 3.1, 0.22, matGold, 0, 82.9, campZ, 0, 0, 0, false, false);
  addBox(exteriorGroup, 1.55, 0.22, 0.22, matGold, 0, 83.6, campZ, 0, 0, 0, false, false);

  mergeStaticGroupByMaterial(exteriorGroup);

  // ==========================================================================
  // 2. INTÉRIEUR LUMINEUX (LOD 0 UNIQUEMENT) — MOSAÏQUE D'OR 475 m² & ORGUE
  // ==========================================================================

  // Dallage de marbre poli (ly = +2.44 m) & estrade surélevée du Sanctuaire (ly = +3.18 m)
  addBox(interiorGroup, 31.6, 0.16, 63.0, matMarbleFloor, 0, 2.44, -1.0, 0, 0, 0, false, true);
  addBox(interiorGroup, 47.4, 0.16, 22.6, matMarbleFloor, 0, 2.44, 0.0, 0, 0, 0, false, true);
  addCyl(interiorGroup, 13.8, 13.8, 0.78, 24, matMarbleFloor, 0, 2.82, -24.5, 0, 0, 0, false, true);
  // 4 marches d'accès au chœur (lz = -14.2..-16.2)
  for (let s = 0; s < 4; s++) {
    addBox(interiorGroup, 21.0, 0.18 * (s + 1), 0.55, matTravSculpt, 0, 2.45 + 0.09 * (s + 1), -13.6 - s * 0.55, 0, 0, 0, false, true);
  }

  // 4 Grands Piliers de la Croisée & Arcs Triomphaux portant la coupole intérieure (55 m)
  [[-10.2, -10.2], [10.2, -10.2], [-10.2, 10.2], [10.2, 10.2]].forEach(([px, pz]) => {
    addBox(interiorGroup, 3.8, 24.0, 3.8, matTravInt, px, 14.4, pz);
    addBox(interiorGroup, 4.4, 1.2, 4.4, matTravSculpt, px, 26.2, pz);
    // Colonnes engagées corinthiennes aux angles des piliers
    addCyl(interiorGroup, 0.48, 0.54, 21.8, 10, matTravSculpt, px * 0.84, 13.5, pz * 0.84, 0, 0, 0, false, true);
  });

  // 4 Grands Arcs Triomphaux entourant la croisée (ly = 18..31 m)
  const crossingArchGeo = createRoundArchWallGeometry(22.4, 14.0, 16.4, 1.5, 2.2);
  addMesh(interiorGroup, crossingArchGeo, matTravInt, 0, 17.5, -10.2, 0, 0, 0, false, true);
  addMesh(interiorGroup, crossingArchGeo, matTravInt, 0, 17.5, 10.2, 0, 0, 0, false, true);
  addMesh(interiorGroup, crossingArchGeo, matTravInt, -10.2, 17.5, 0, 0, Math.PI * 0.5, 0, false, true);
  addMesh(interiorGroup, crossingArchGeo, matTravInt, 10.2, 17.5, 0, 0, Math.PI * 0.5, 0, false, true);

  // Voûte & Tambour Intérieur lumineux du Grand Dôme (ly = 31 -> 55 m, visible en levant les yeux !)
  const intDrumMat = new THREE.MeshStandardMaterial({
    map: texTravBright,
    color: 0xf6f0e4,
    roughness: 0.72,
    side: THREE.BackSide,
  });
  addMesh(interiorGroup, new THREE.CylinderGeometry(10.1, 10.3, 14.0, 24, 1, true), intDrumMat, 0, 38.2, 0, 0, 0, 0, false, false);
  // Voûte hémisphérique intérieure du dôme avec anneau d'or
  addMesh(interiorGroup, new THREE.SphereGeometry(10.1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), intDrumMat, 0, 45.0, 0, 0, 0, 0, false, false);
  addMesh(interiorGroup, new THREE.TorusGeometry(9.9, 0.36, 8, 28), matGold, 0, 31.8, 0, Math.PI * 0.5, 0, 0, false, false);
  addMesh(interiorGroup, new THREE.TorusGeometry(9.9, 0.32, 8, 28), matGold, 0, 44.8, 0, Math.PI * 0.5, 0, 0, false, false);
  // 16 Vitraux intérieurs lumineux autour du tambour du dôme
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    addBox(interiorGroup, 0.16, 8.2, 1.5, matGlassInt, Math.cos(a) * 9.85, 38.2, Math.sin(a) * 9.85, 0, -a, 0, false, false);
  }

  // Voûtes en berceau intérieures de la Nef (+Z), du Chœur (-Z) et des Transepts (±X)
  addMesh(interiorGroup, new THREE.CylinderGeometry(10.4, 10.4, 21.5, 18, 1, true, -Math.PI * 0.5, Math.PI), intDrumMat, 0, 17.5, 20.5, -Math.PI * 0.5, 0, 0, false, false);
  addMesh(interiorGroup, new THREE.CylinderGeometry(10.4, 10.4, 14.5, 18, 1, true, -Math.PI * 0.5, Math.PI), intDrumMat, 0, 17.5, -17.2, -Math.PI * 0.5, 0, 0, false, false);
  addMesh(interiorGroup, new THREE.CylinderGeometry(9.8, 9.8, 14.5, 16, 1, true, 0, Math.PI), intDrumMat, -17.4, 17.2, 0, 0, 0, Math.PI * 0.5, false, false);
  addMesh(interiorGroup, new THREE.CylinderGeometry(9.8, 9.8, 14.5, 16, 1, true, 0, Math.PI), intDrumMat, 17.4, 17.2, 0, 0, 0, Math.PI * 0.5, false, false);
  // Murs courbes intérieurs du chevet sous la grande mosaïque (ferme hermétiquement l'arrière des vitraux côté Nord -Z)
  addMesh(interiorGroup, new THREE.CylinderGeometry(13.0, 13.0, 14.2, 24, 1, true, Math.PI * 0.5, Math.PI), intDrumMat, 0, 9.8, -24.2, 0, 0, 0, false, false);
  // Plafonds bas des bas-côtés Nord/Sud/Est/Ouest
  [-13.4, 13.4].forEach((bx) => {
    addBox(interiorGroup, 5.4, 0.8, 22.0, matTravInt, bx, 15.2, 21.2, 0, 0, 0, false, true);
  });

  // Colonnades des bas-côtés & vitraux intérieurs lumineux
  [-13.8, 13.8].forEach((cx) => {
    [14.5, 20.5, 26.5, -16.5].forEach((cz) => {
      addCyl(interiorGroup, 0.52, 0.62, 12.6, 10, matTravSculpt, cx, 8.7, cz, 0, 0, 0, false, true);
    });
    [17.5, 25.5].forEach((wz) => {
      addBox(interiorGroup, 0.18, 7.6, 3.6, matGlassInt, Math.sign(cx) * 15.65, 16.0, wz, 0, 0, 0, false, false);
    });
  });
  // Rosaces intérieures lumineuses des transepts Ouest & Est
  [-24.0, 24.0].forEach((rx) => {
    addCyl(interiorGroup, 4.15, 4.15, 0.25, 24, matGlassInt, rx, 21.6, 0, 0, 0, Math.PI * 0.5, false, false);
  });

  // LA GRANDE MOSAÏQUE D'OR DU CHRIST EN MAJESTÉ (475 m², cul-de-four de l'Abside Nord !)
  // Quart de sphère creux (BackSide) face au Sud (+Z), parfaitement lisible depuis toute la nef !
  const apseZ = -24.2;
  const apseMosaicGeo = new THREE.SphereGeometry(11.4, 32, 20, Math.PI, Math.PI, 0, Math.PI * 0.5);
  addMesh(interiorGroup, apseMosaicGeo, matMosaic, 0, 16.6, apseZ, 0, 0, 0, false, false);
  // Arc doré encadrant la mosaïque d'or
  addMesh(interiorGroup, new THREE.TorusGeometry(11.35, 0.42, 8, 28, Math.PI), matGold, 0, 16.6, apseZ + 0.15, 0, 0, 0, false, false);

  // Déambulatoire / Arcades basses du chevet sous la mosaïque
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + ((i + 0.5) / 9) * Math.PI;
    const cx = Math.cos(a) * 11.4;
    const cz = apseZ + Math.sin(a) * 11.4;
    addCyl(interiorGroup, 0.42, 0.48, 12.8, 10, matTravSculpt, cx, 9.6, cz, 0, 0, 0, false, true);
    if (i < 8) {
      const aWin = Math.PI + ((i + 1) / 9) * Math.PI;
      addBox(interiorGroup, 0.16, 5.8, 1.8, matGlassInt, Math.cos(aWin) * 12.6, 11.6, apseZ + Math.sin(aWin) * 12.6, 0, -aWin, 0, false, false);
    }
  }

  // MAÎTRE-AUTEL EN MARBRE, BALDAQUIN DORÉ & OSTENSOIR DE L'ADORATION PERPÉTUELLE
  const altarZ = -22.2;
  addBox(interiorGroup, 4.4, 1.35, 2.2, matTravertine, 0, 3.88, altarZ);
  addBox(interiorGroup, 4.7, 0.2, 2.5, matGold, 0, 4.62, altarZ);
  // Ostensoir rayonnant doré (Adoration perpétuelle depuis 1885)
  addCyl(interiorGroup, 0.12, 0.34, 1.35, 10, matGold, 0, 5.4, altarZ - 0.15, 0, 0, 0, false, false);
  addMesh(interiorGroup, new THREE.OctahedronGeometry(0.68, 1), matGold, 0, 6.45, altarZ - 0.15, 0, 0, 0, false, false);
  // 4 colonnes de marbre & ciborium / baldaquin doré au-dessus de l'autel
  [[-2.5, -1.5], [2.5, -1.5], [-2.5, 1.5], [2.5, 1.5]].forEach(([bx, bz]) => {
    addCyl(interiorGroup, 0.24, 0.28, 6.4, 10, matTravSculpt, bx, 6.4, altarZ + bz);
    addBox(interiorGroup, 0.72, 0.42, 0.72, matGold, bx, 9.75, altarZ + bz);
  });
  addBox(interiorGroup, 5.8, 0.72, 3.8, matGold, 0, 10.2, altarZ);
  addMesh(interiorGroup, createOvoidDomeGeometry(2.4, 3.4, 0.2, 16), matGold, 0, 10.55, altarZ);

  // GRAND ORGUE CAVAILLÉ-COLL SUR LA TRIBUNE SUD (lz = +29.2, ly = 11.2 -> 25.5 m)
  // Fermeture lumineuse intérieure du mur Sud derrière l'orgue + garde-corps sculpté de la tribune
  addBox(interiorGroup, 26.0, 12.5, 0.8, matTravInt, 0, 21.6, 30.8, 0, 0, 0, false, true);
  addBox(interiorGroup, 18.8, 1.15, 5.6, matTravSculpt, 0, 11.4, 28.6);
  addBox(interiorGroup, 18.8, 1.1, 0.42, matTravertine, 0, 12.45, 26.0);
  [-7.2, -3.6, 3.6, 7.2].forEach((ox) => {
    addCyl(interiorGroup, 0.38, 0.44, 8.8, 8, matTravSculpt, ox, 6.8, 26.8, 0, 0, 0, false, true);
  });
  // Buffet d'orgue monumental en chêne sculpté à 5 tourelles + 4 plates-faces + couronnements dorés
  addBox(interiorGroup, 14.2, 9.6, 2.2, matOak, 0, 16.8, 29.8);
  addBox(interiorGroup, 14.6, 0.55, 2.8, matGold, 0, 12.2, 29.0);
  // 4 plates-faces de tuyaux brillants entre les 5 tourelles
  [-4.2, -1.4, 1.4, 4.2].forEach((fx) => {
    for (let p = -2; p <= 2; p++) {
      const ph = 6.2 + (2 - Math.abs(p)) * 0.45;
      addCyl(interiorGroup, 0.11, 0.11, ph, 6, matOrganPipe, fx + p * 0.28, 13.0 + ph * 0.5, 28.55, 0, 0, 0, false, false);
    }
    addBox(interiorGroup, 1.5, 0.35, 0.4, matGold, fx, 20.1, 28.5, 0, 0, 0, false, false);
  });
  // 5 grandes tourelles d'orgue en saillie avec tuyaux d'étain étincelants et clochetons dorés
  [-5.7, -2.85, 0, 2.85, 5.7].forEach((tx, idx) => {
    const hTower = idx === 2 ? 11.6 : idx === 0 || idx === 4 ? 10.6 : 9.0;
    addBox(interiorGroup, 2.15, hTower, 2.5, matOak, tx, 12.0 + hTower * 0.5, 29.0);
    addBox(interiorGroup, 2.35, 0.42, 2.7, matGold, tx, 12.0 + hTower + 0.2, 29.0, 0, 0, 0, false, false);
    addMesh(interiorGroup, new THREE.ConeGeometry(0.82, 1.55, 6), matGold, tx, 12.0 + hTower + 1.15, 28.8, 0, 0, 0, false, false);
    for (let p = -2; p <= 2; p++) {
      const ph = hTower * (0.82 - Math.abs(p) * 0.055);
      addCyl(interiorGroup, 0.14, 0.14, ph, 7, matOrganPipe, tx + p * 0.34, 12.5 + ph * 0.5, 27.72, 0, 0, 0, false, false);
    }
  });

  // Fusion statique de l'architecture intérieure
  mergeStaticGroupByMaterial(interiorGroup);

  // Bancs de chêne de la Nef via InstancedMesh (1 seul Draw Call !)
  const pewCoords = [];
  for (let row = 0; row < 14; row++) {
    const pz = 22.0 - row * 2.25;
    pewCoords.push([-6.2, pz], [6.2, pz]);
  }
  const pewGeo = new THREE.BoxGeometry(7.2, 0.92, 0.72);
  const pewsInst = new THREE.InstancedMesh(pewGeo, matOak, pewCoords.length);
  const dummyObj = new THREE.Object3D();
  pewCoords.forEach(([px, pz], idx) => {
    dummyObj.position.set(px, 2.94, pz);
    dummyObj.rotation.set(0, 0, 0);
    dummyObj.scale.set(1, 1, 1);
    dummyObj.updateMatrix();
    pewsInst.setMatrixAt(idx, dummyObj.matrix);
  });
  pewsInst.instanceMatrix.needsUpdate = true;
  interiorGroup.add(pewsInst);

  // Cierges chauds autour du sanctuaire (1 seul Draw Call InstancedMesh)
  const candleCoords = [
    [-4.8, -17.8], [-5.4, -18.5], [-4.2, -18.8], [4.8, -17.8], [5.4, -18.5], [4.2, -18.8],
    [-8.6, -7.2], [-9.2, -7.8], [8.6, -7.2], [9.2, -7.8],
  ];
  const candlesInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 6), matLampGlow, candleCoords.length);
  candleCoords.forEach(([cx, cz], idx) => {
    dummyObj.position.set(cx, 3.65, cz);
    dummyObj.scale.set(1, 1.5, 1);
    dummyObj.updateMatrix();
    candlesInst.setMatrixAt(idx, dummyObj.matrix);
  });
  candlesInst.instanceMatrix.needsUpdate = true;
  interiorGroup.add(candlesInst);

  // 3 PointLights chauds intérieurs (actifs uniquement en LOD 0 & proximité)
  const interiorLights = [];
  function addIntLight(color, base, night, dist, x, y, z) {
    const l = new THREE.PointLight(color, base, dist, 1.4);
    l.position.set(x, y, z);
    l.castShadow = false;
    interiorGroup.add(l);
    interiorLights.push({ light: l, base, night });
  }
  addIntLight(0xffdfa8, 18, 42, 58, 0, 22, 0);     // Lumière de la grande croisée
  addIntLight(0xffcf6a, 24, 52, 48, 0, 18, -21);   // Éclat doré sur la Mosaïque du Christ
  addIntLight(0xffe0a0, 14, 34, 42, 0, 14, 18);    // Nef & Grand Orgue

  // ==========================================================================
  // 3. ENVIRONNEMENT MONTMARTRE : PARVIS, SQUARE LOUISE-MICHEL, FUNICULAIRE & TERTRE
  // ==========================================================================

  // --- A. GRAND PARVIS DU SACRÉ-CŒUR (lx = -46..+46, lz = +44..+72, ly = 0.05) ---
  addBox(envGroup, 94.0, 5.2, 34.0, matCobble, 0, -2.55, 56.0, 0, 0, 0, false, true);
  // Esplanade pavée entourant la basilique sur les 4 côtés (Plateau sommital ly = 0)
  addBox(envGroup, 108.0, 4.6, 118.0, matCobble, -2.0, -2.35, -4.0, 0, 0, 0, false, true);

  // Mur de soutènement panoramique Sud du Parvis (lz = +72.5) + balustrade pierre + jumelles panoramiques
  addBox(envGroup, 94.0, 10.5, 2.2, matTravSculpt, 0, -4.9, 72.5);
  addBox(envGroup, 94.6, 1.05, 0.85, matTravertine, 0, 0.55, 72.6);
  // Ouvertures latérales pour les grands escaliers courbes vers Square Louise-Michel
  [-24, 24].forEach((bx) => {
    addCyl(envGroup, 0.14, 0.22, 1.35, 8, matBronzePatina, bx, 0.72, 71.2, 0, 0, 0, false, true);
    addBox(envGroup, 0.42, 0.22, 0.62, matBronzePatina, bx, 1.48, 71.3, 0.14, 0, 0, false, true);
  });

  // --- B. SQUARE LOUISE-MICHEL EN GRADINS, FONTAINES & PELOUSES ÉPOUSANT LA BUTTE ---
  // Pelouse continue sculptée suivant localGroundY(lx, lz) + 1.15 m AVEC jupes de soutènement pierre (-18 m, zéro vide !)
  function buildHillsideLawnMesh() {
    const segX = 18;
    const segZ = 24;
    const xMin = -54;
    const xMax = 54;
    const zMin = 73;
    const zMax = 216;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iz = 0; iz <= segZ; iz++) {
      const tz = iz / segZ;
      const lz = THREE.MathUtils.lerp(zMin, zMax, tz);
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        const lx = THREE.MathUtils.lerp(xMin, xMax, tx);
        const y = localGroundY(lx, lz) + 1.15;
        positions.push(lx, y, lz);
        uvs.push(tx * 4, tz * 6);
      }
    }
    const stride = segX + 1;
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iz * stride + ix;
        const b = a + 1;
        const c = (iz + 1) * stride + ix;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, matLawn);
    mesh.receiveShadow = true;
    envGroup.add(mesh);

    // Murs de soutènement périphériques en pierre enfouis à -18 m sous la pelouse (Ouest, Est & Sud -> zéro vide !)
    const skirtPos = [];
    const skirtUv = [];
    const skirtIdx = [];
    let sv = 0;
    const addSkirtStrip = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i];
        const [x1, z1] = pts[i + 1];
        const y0 = localGroundY(x0, z0) + 1.18;
        const y1 = localGroundY(x1, z1) + 1.18;
        skirtPos.push(x0, y0, z0, x1, y1, z1, x0, y0 - 18.0, z0, x1, y1 - 18.0, z1);
        skirtUv.push(0, 1, 1, 1, 0, 0, 1, 0);
        skirtIdx.push(sv, sv + 2, sv + 1, sv + 1, sv + 2, sv + 3);
        skirtIdx.push(sv, sv + 1, sv + 2, sv + 1, sv + 3, sv + 2);
        sv += 4;
      }
    };
    const eastPts = [];
    const westPts = [];
    for (let iz = 0; iz <= segZ; iz++) {
      const lz = THREE.MathUtils.lerp(zMin, zMax, iz / segZ);
      eastPts.push([xMax, lz]);
      westPts.push([xMin, lz]);
    }
    const southPts = [];
    for (let ix = 0; ix <= segX; ix++) {
      southPts.push([THREE.MathUtils.lerp(xMin, xMax, ix / segX), zMax]);
    }
    addSkirtStrip(eastPts);
    addSkirtStrip(westPts);
    addSkirtStrip(southPts);

    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPos, 3));
    skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUv, 2));
    skirtGeo.setIndex(skirtIdx);
    skirtGeo.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirtGeo, matTravSculpt);
    skirtMesh.receiveShadow = true;
    envGroup.add(skirtMesh);
  }
  buildHillsideLawnMesh();

  // 4 Terrasses monumentales en cascade de Square Louise-Michel + Bassins & Fontaines + Escaliers doubles
  const slmTiers = [
    { zCenter: 96,  w: 62, d: 20, yTop: localGroundY(0, 96) + 1.75,  hasFountain: true,  basinR: 7.2 },
    { zCenter: 134, w: 68, d: 22, yTop: localGroundY(0, 134) + 1.85, hasFountain: true,  basinR: 8.6 },
    { zCenter: 174, w: 74, d: 22, yTop: localGroundY(0, 174) + 1.95, hasFountain: true,  basinR: 7.8 },
    { zCenter: 218, w: 122, d: 34, yTop: localGroundY(0, 218) + 1.45, hasFountain: false, basinR: 0 }, // Place Saint-Pierre
  ];

  slmTiers.forEach((tier, idx) => {
    const wallH = 26.0;
    // Dalle pavée sur profond massif de soutènement Château-Landon ancré jusqu'au pied de pente
    addBox(envGroup, tier.w, wallH, tier.d, matTravSculpt, 0, tier.yTop - wallH * 0.5, tier.zCenter);
    addBox(envGroup, tier.w - 0.8, 0.3, tier.d - 0.8, matCobble, 0, tier.yTop + 0.1, tier.zCenter, 0, 0, 0, false, true);
    // Balustrade panoramique en pierre au bord Sud de chaque terrasse
    if (idx < 3) {
      addBox(envGroup, tier.w, 1.05, 0.8, matTravertine, 0, tier.yTop + 0.58, tier.zCenter + tier.d * 0.5 - 0.5);
    }
    // Bassin-fontaine monumental & mur de grotte à cascades
    if (tier.hasFountain) {
      addCyl(envGroup, tier.basinR + 0.85, tier.basinR + 1.0, 1.0, 22, matTravertine, 0, tier.yTop + 0.55, tier.zCenter - 1.5);
      addCyl(envGroup, tier.basinR, tier.basinR, 0.65, 22, matWater, 0, tier.yTop + 0.72, tier.zCenter - 1.5, 0, 0, 0, false, true);
      // Vasque sculptée centrale jaillissante
      addCyl(envGroup, 1.25, 1.65, 2.2, 12, matTravSculpt, 0, tier.yTop + 1.45, tier.zCenter - 1.5);
      addCyl(envGroup, 2.4, 0.85, 0.55, 14, matTravertine, 0, tier.yTop + 2.65, tier.zCenter - 1.5);
      addCyl(envGroup, 0.45, 0.75, 1.6, 8, matWater, 0, tier.yTop + 3.4, tier.zCenter - 1.5, 0, 0, 0, false, false);
    }
  });

  // Grands Escaliers Doubles Symétriques reliant le Parvis jusqu'à la Place Saint-Pierre
  const stairLinks = [
    { z0: 72,  y0: 0.05, z1: 87,  y1: slmTiers[0].yTop + 0.2, xAbs: 22 },
    { z0: 105, y0: slmTiers[0].yTop + 0.2, z1: 124, y1: slmTiers[1].yTop + 0.2, xAbs: 28 },
    { z0: 144, y0: slmTiers[1].yTop + 0.2, z1: 164, y1: slmTiers[2].yTop + 0.2, xAbs: 31 },
    { z0: 184, y0: slmTiers[2].yTop + 0.2, z1: 203, y1: slmTiers[3].yTop + 0.2, xAbs: 26 },
  ];
  stairLinks.forEach((st) => {
    const steps = 14;
    const dz = (st.z1 - st.z0) / steps;
    const dy = (st.y1 - st.y0) / steps;
    [-st.xAbs, st.xAbs].forEach((sx) => {
      for (let i = 0; i < steps; i++) {
        const mz = st.z0 + (i + 0.5) * dz;
        const my = st.y0 + (i + 0.5) * dy;
        addBox(envGroup, 8.2, 14.0, Math.abs(dz) + 0.25, matTravertine, sx, my - 7.0, mz, 0, 0, 0, false, true);
      }
      // Limons / parapets en pierre de chaque volée
      const len = Math.hypot(st.z1 - st.z0, st.y1 - st.y0);
      const pitch = Math.atan2(st.y0 - st.y1, st.z1 - st.z0);
      const midZ = (st.z0 + st.z1) * 0.5;
      const midY = (st.y0 + st.y1) * 0.5 + 0.65;
      addBox(envGroup, 0.72, 1.15, len + 0.6, matTravSculpt, sx - 4.3, midY, midZ, pitch, 0, 0);
      addBox(envGroup, 0.72, 1.15, len + 0.6, matTravSculpt, sx + 4.3, midY, midZ, pitch, 0, 0);
    });
  });

  // --- C. LE CARROUSEL DE MONTMARTRE (Place Saint-Pierre, pied du Square Louise-Michel) ---
  const carX = 24.0;
  const carZ = 216.0;
  const carY = slmTiers[3].yTop + 0.25;
  addCyl(envGroup, 6.2, 6.5, 0.8, 18, matTravSculpt, carX, carY + 0.4, carZ);
  addCyl(envGroup, 1.4, 1.6, 5.2, 14, matGold, carX, carY + 3.4, carZ);
  // Colonnettes périphériques & chapiteau rayé Belle Époque (crème & rouge bordeaux + frise dorée)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addCyl(envGroup, 0.12, 0.14, 4.6, 6, matGold, carX + Math.cos(a) * 5.4, carY + 3.1, carZ + Math.sin(a) * 5.4, 0, 0, 0, false, false);
  }
  addCyl(envGroup, 6.3, 6.3, 0.85, 20, matAwningRed, carX, carY + 5.75, carZ);
  addMesh(envGroup, new THREE.TorusGeometry(6.35, 0.16, 6, 24), matLampGlow, carX, carY + 5.45, carZ, Math.PI * 0.5, 0, 0, false, false);
  addMesh(envGroup, new THREE.ConeGeometry(6.5, 3.8, 16), matAwningCream, carX, carY + 8.05, carZ);
  addMesh(envGroup, new THREE.ConeGeometry(6.54, 3.82, 8), matAwningRed, carX, carY + 8.06, carZ, 0, Math.PI / 8, 0);
  addMesh(envGroup, new THREE.SphereGeometry(0.45, 8, 6), matGold, carX, carY + 10.15, carZ);

  // Plateau tournant des petits chevaux du Carrousel (fusionné -> 2 DC au lieu de 16 !)
  const carouselSpinner = new THREE.Group();
  carouselSpinner.position.set(carX, carY + 0.9, carZ);
  for (let h = 0; h < 8; h++) {
    const a = (h / 8) * Math.PI * 2;
    const hx = Math.cos(a) * 4.1;
    const hz = Math.sin(a) * 4.1;
    const horseMat = h % 2 === 0 ? matAwningCream : matGold;
    addCyl(carouselSpinner, 0.05, 0.05, 4.2, 6, matGold, hx, 2.1, hz, 0, 0, 0, false, false);
    addBox(carouselSpinner, 0.55, 0.65, 1.35, horseMat, hx, 1.45 + (h % 2) * 0.45, hz, 0, -a, 0, false, false);
  }
  mergeStaticGroupByMaterial(carouselSpinner);
  dynamicGroup.add(carouselSpinner);

  // --- D. LE FUNICULAIRE DE MONTMARTRE & L'ESCALIER DE LA RUE FOYATIER (lx = -65..-47) ---
  const funX = -51.5;
  const funZTop = 64.0;
  const funZBot = 214.0;
  function funTrackY(u) {
    const lz = THREE.MathUtils.lerp(funZTop, funZBot, u);
    return localGroundY(funX, lz) + 2.35;
  }

  // Viaduc à double voie épousant la pente de la Butte (poutres acier, rails & piles pierre)
  const funSegs = 20;
  for (let s = 0; s < funSegs; s++) {
    const u0 = s / funSegs;
    const u1 = (s + 1) / funSegs;
    const z0 = THREE.MathUtils.lerp(funZTop, funZBot, u0);
    const z1 = THREE.MathUtils.lerp(funZTop, funZBot, u1);
    const y0 = funTrackY(u0);
    const y1 = funTrackY(u1);
    const zm = (z0 + z1) * 0.5;
    const ym = (y0 + y1) * 0.5;
    const segL = Math.hypot(z1 - z0, y1 - y0) + 0.16;
    const pitch = Math.atan2(y0 - y1, z1 - z0);

    addBox(envGroup, 6.4, 0.55, segL, matSteel, funX, ym - 0.32, zm, pitch, 0, 0);
    // 4 rails brillants (2 voies parallèles)
    [-2.1, -0.9, 0.9, 2.1].forEach((rx) => {
      addBox(envGroup, 0.14, 0.18, segL, matOrganPipe, funX + rx, ym + 0.04, zm, pitch, 0, 0, false, false);
    });
    // Piles porteuses plantées profondément dans la colline
    if (s % 2 === 0) {
      addBox(envGroup, 5.8, 22.0, 1.35, matTravSculpt, funX, ym - 11.2, zm);
    }
  }

  // Station Haute (Rue du Cardinal-Dubois, lz = +61) & Station Basse (Place Saint-Pierre, lz = +218)
  [
    { z: funZTop - 3.5, y: funTrackY(0) },
    { z: funZBot + 4.5, y: funTrackY(1) },
  ].forEach((st) => {
    addBox(envGroup, 11.4, 22.0, 11.5, matTravSculpt, funX, st.y - 11.0, st.z);
    addBox(envGroup, 10.6, 4.8, 10.2, matGlassFunicular, funX, st.y + 2.4, st.z, 0, 0, 0, false, true);
    addBox(envGroup, 11.6, 0.45, 11.2, matSteel, funX, st.y + 5.0, st.z);
    addBox(envGroup, 11.8, 0.55, 0.6, matRatpJade, funX, st.y + 4.85, st.z + 5.4);
  });

  // Escalier célèbre de la Rue Foyatier (222 marches longeant le Funiculaire à lx = -61.5)
  const foyX = -61.5;
  for (let s = 0; s < 36; s++) {
    const u = (s + 0.5) / 36;
    const fz = THREE.MathUtils.lerp(funZTop + 2, funZBot + 2, u);
    const fy = localGroundY(foyX, fz) + 1.35;
    addBox(envGroup, 6.2, 16.0, 4.4, matCobble, foyX, fy - 8.0, fz, 0, 0, 0, false, true);
    if (s % 4 === 0) {
      addCyl(envGroup, 0.08, 0.13, 3.8, 6, matIron, foyX - 2.7, fy + 1.9, fz, 0, 0, 0, false, false);
      addMesh(envGroup, new THREE.SphereGeometry(0.24, 6, 6), matLampGlow, foyX - 2.7, fy + 3.9, fz, 0, 0, 0, false, false);
    }
  }

  // 2 CABINES ANIMÉES DU FUNICULAIRE DE MONTMARTRE (vert jade RATP & verre panoramique)
  function createFunicularCabin(xOffset) {
    const cabin = new THREE.Group();
    cabin.position.set(funX + xOffset, funTrackY(0.5), 140);
    // Châssis incliné bas + caisse horizontale panoramique
    addBox(cabin, 2.35, 0.55, 6.6, matSteel, 0, 0.42, 0);
    addBox(cabin, 2.45, 0.85, 6.8, matRatpJade, 0, 1.15, 0);
    addBox(cabin, 2.38, 1.85, 6.4, matGlassFunicular, 0, 2.45, 0);
    addBox(cabin, 2.52, 0.28, 6.9, matTravertine, 0, 3.45, 0);
    // Phares chauds aux extrémités
    addBox(cabin, 1.4, 0.25, 0.16, matLampGlow, 0, 1.15, 3.42, 0, 0, 0, false, false);
    addBox(cabin, 1.4, 0.25, 0.16, matLampGlow, 0, 1.15, -3.42, 0, 0, 0, false, false);
    mergeStaticGroupByMaterial(cabin);
    dynamicGroup.add(cabin);
    return cabin;
  }
  const funCabinWest = createFunicularCabin(-1.55);
  const funCabinEast = createFunicularCabin(1.55);

  // --- E. ÉGLISE SAINT-PIERRE DE MONTMARTRE & LA PLACE DU TERTRE ANIMÉE (Côté Ouest, lx = -138..-58) ---
  // Plateforme pavée sommitale solidement ancrée englobant Saint-Pierre & Place du Tertre
  addBox(envGroup, 84.0, 14.0, 84.0, matCobble, -98.0, -6.95, 10.0, 0, 0, 0, false, true);

  // Église Saint-Pierre de Montmartre (XIIe siècle — architecture romane sculptée, lx = -72, lz = +22)
  const spX = -72.0;
  const spZ = 22.0;
  addBox(envGroup, 16.5, 12.2, 28.0, matTravSculpt, spX, 6.1, spZ);
  addMesh(envGroup, new THREE.CylinderGeometry(8.8, 8.8, 28.4, 3), matSlate, spX, 16.4, spZ, -Math.PI * 0.5, 0, 0);
  // Abside semi-circulaire romane au Nord + contreforts + baies plein cintre + portail Ouest sculpté vers la Place du Tertre
  addCyl(envGroup, 6.2, 6.4, 10.5, 16, matTravSculpt, spX, 5.25, spZ - 14.2);
  addMesh(envGroup, new THREE.ConeGeometry(6.5, 4.2, 16), matSlate, spX, 12.6, spZ - 14.2);
  [-10, -2, 6, 12].forEach((oz) => {
    addBox(envGroup, 1.35, 11.8, 1.4, matTravertine, spX - 8.4, 5.9, spZ + oz);
    addBox(envGroup, 1.35, 11.8, 1.4, matTravertine, spX + 8.4, 5.9, spZ + oz);
    if (oz < 10) {
      addBox(envGroup, 0.3, 4.4, 2.2, matWindowExt, spX - 8.32, 7.6, spZ + oz + 4.0, 0, 0, 0, false, false);
      addBox(envGroup, 0.3, 4.4, 2.2, matWindowExt, spX + 8.32, 7.6, spZ + oz + 4.0, 0, 0, 0, false, false);
    }
  });
  // Portail roman Sud de Saint-Pierre + rose haute
  addBox(envGroup, 3.6, 5.4, 0.55, matOak, spX, 2.7, spZ + 14.15);
  addMesh(envGroup, new THREE.TorusGeometry(1.9, 0.28, 8, 16, Math.PI), matTravertine, spX, 5.4, spZ + 14.25);
  addMesh(envGroup, new THREE.TorusGeometry(2.1, 0.26, 8, 18), matTravertine, spX, 9.6, spZ + 14.25);
  addCyl(envGroup, 1.9, 1.9, 0.35, 16, matWindowExt, spX, 9.6, spZ + 14.1, Math.PI * 0.5, 0, 0, false, false);
  // Clocher carré roman de Saint-Pierre avec abat-sons & horloge
  addBox(envGroup, 7.2, 21.5, 7.2, matTravSculpt, spX - 5.2, 10.75, spZ - 8.2);
  [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5].forEach((rot) => {
    addBox(envGroup, 2.2, 4.2, 0.35, matOak, spX - 5.2 + Math.sin(rot) * 3.62, 17.6, spZ - 8.2 + Math.cos(rot) * 3.62, 0, rot, 0, false, false);
  });
  addMesh(envGroup, new THREE.ConeGeometry(5.2, 6.8, 4), matSlate, spX - 5.2, 24.9, spZ - 8.2, 0, Math.PI * 0.25, 0);
  // Jardin du Calvaire verdoyant & grille en fer forgé au Nord de Saint-Pierre
  addBox(envGroup, 20.0, 0.4, 18.0, matLawn, spX, 0.18, spZ - 26.0, 0, 0, 0, false, true);
  addBox(envGroup, 20.4, 1.35, 0.25, matIron, spX, 0.85, spZ - 17.0, 0, 0, 0, false, false);
  addBox(envGroup, 0.25, 1.35, 18.4, matIron, spX - 10.1, 0.85, spZ - 26.0, 0, 0, 0, false, false);

  // Maisons & Bistrots colorés de Montmartre : ANCRAGE EXACT SUR LA PENTE localGroundY (ZÉRO BÂTIMENT DANS LE VIDE !)
  function addMontmartreHouse(x, z, w, h, d, rotY = 0, styleIdx = 0, awningSide = 0, signSpec = null) {
    const gy = localGroundY(x, z);
    const yBase = gy - 0.35; // Suit fidèlement le dénivelé réel de la butte jusqu'au pied de la colline !
    const wallMat = styleIdx % 3 === 0 ? matVillageWall : styleIdx % 3 === 1 ? matVillageOchre : matVillageRose;
    const roofMat = styleIdx % 2 === 0 ? matSlate : matTerracotta;

    const grp = new THREE.Group();
    grp.position.set(x, yBase, z);
    grp.rotation.y = rotY;
    // Fondation en pierre enfouie à -18 m dans le versant (garantie 100 % ancrée sur les pentes fortes !)
    addBox(grp, w, 18.0, d, matTravShadow, 0, -9.0, 0, 0, 0, 0, false, true);
    // Corps de maison montmartroise
    addBox(grp, w, h, d, wallMat, 0, h * 0.5, 0);
    // Toit mansardé / pentu + cheminées parisiennes
    addBox(grp, w + 0.5, 2.8, d + 0.5, roofMat, 0, h + 1.4, 0);
    addBox(grp, 1.1, 2.4, 1.1, matTravSculpt, -w * 0.28, h + 3.4, 0, 0, 0, 0, false, false);
    addBox(grp, 1.1, 2.2, 1.1, matTravSculpt, w * 0.25, h + 3.3, 0, 0, 0, 0, false, false);
    // Store banne de bistrot profond + poteaux + jardinières fleuries
    if (awningSide !== 0) {
      const awnMat = styleIdx % 2 === 0 ? matAwningRed : matAwningGreen;
      const az = awningSide * (d * 0.5 + 1.7);
      addBox(grp, w * 0.88, 0.26, 3.4, awnMat, 0, 3.55, az, awningSide * 0.22, 0, 0);
      addBox(grp, w * 0.88, 0.42, 0.16, matAwningCream, 0, 3.02, awningSide * (d * 0.5 + 3.3), 0, 0, 0, false, false);
      [-w * 0.38, 0, w * 0.38].forEach((px) => {
        addCyl(grp, 0.055, 0.065, 3.15, 6, matIron, px, 1.58, awningSide * (d * 0.5 + 3.15), 0, 0, 0, false, false);
      });
      // Jardinière de géraniums rouges le long de la terrasse
      addBox(grp, w * 0.72, 0.52, 0.58, matOak, 0, 0.35, awningSide * (d * 0.5 + 3.55), 0, 0, 0, false, true);
      addBox(grp, w * 0.68, 0.34, 0.46, matLawn, 0, 0.72, awningSide * (d * 0.5 + 3.55), 0, 0, 0, false, false);
      addBox(grp, w * 0.58, 0.22, 0.34, matAwningRed, 0, 0.92, awningSide * (d * 0.5 + 3.55), 0, 0, 0, false, false);
    }
    // Enseigne historique peinte au-dessus du store de bistrot (La Mère Catherine, Au Cadet de Gascogne…)
    if (signSpec && awningSide !== 0) {
      const signMat = new THREE.MeshStandardMaterial({
        map: createBistroSignTexture(signSpec.title, signSpec.sub, signSpec.bg, '#f2cc6e'),
        roughness: 0.45,
      });
      addBox(grp, Math.min(w * 0.78, 8.6), 1.45, 0.22, signMat, 0, 4.65, awningSide * (d * 0.5 + 0.16), 0, awningSide > 0 ? 0 : Math.PI, 0, false, false);
    }
    envGroup.add(grp);
  }

  // Couronne de maisons & bistrots célèbres entourant la Place du Tertre
  addMontmartreHouse(-114, -14, 18, 12.5, 11, 0, 0, 1, { title: 'LA MÈRE CATHERINE', sub: 'RESTAURANT • DEPUIS 1793', bg: '#7b1e23' });
  addMontmartreHouse(-94,  -14, 16, 13.5, 11, 0, 1, 1, { title: 'AU CADET DE GASCOGNE', sub: 'CAFÉ • CABARET MONTMARTRE', bg: '#1e4d37' });
  addMontmartreHouse(-132, -8,  13, 11.8, 13, 0.2, 2, 1);
  addMontmartreHouse(-135, 12,  12, 12.4, 18, Math.PI * 0.5, 1, 1, { title: 'CHEZ EUGÈNE', sub: 'BRASSERIE • PLACE DU TERTRE', bg: '#7a2228' });
  addMontmartreHouse(-133, 32,  13, 11.5, 14, Math.PI * 0.5, 0, 1);
  addMontmartreHouse(-114, 41,  18, 13.0, 11, Math.PI, 2, 1, { title: 'LA BOHÈME DU TERTRE', sub: 'TERRASSE • ART & BISTROT', bg: '#204938' });
  addMontmartreHouse(-94,  41,  15, 12.0, 11, Math.PI, 0, 1);
  // Maisons sur le flanc Nord-Ouest / Rue Norvins & Rue du Chevalier-de-la-Barre
  addMontmartreHouse(-66, -42, 18, 13.2, 12, 0.1, 1, 0);
  addMontmartreHouse(-42, -58, 19, 14.0, 12, 0, 0, 0);
  addMontmartreHouse(42,  -58, 19, 13.6, 12, 0, 2, 0);
  addMontmartreHouse(-96, -42, 20, 13.5, 14, 0, 0, 0);
  addMontmartreHouse(-124, -40, 18, 13.0, 14, 0, 2, 0);
  addMontmartreHouse(16,  -64, 18, 13.8, 12, 0, 1, 0);
  addMontmartreHouse(-16, -64, 18, 13.8, 12, 0, 0, 0);
  addMontmartreHouse(68,  -36, 15, 14.2, 18, Math.PI * 0.5, 0, 0);
  addMontmartreHouse(72,  -12, 15, 13.5, 18, Math.PI * 0.5, 1, 0);
  addMontmartreHouse(72,   12, 15, 13.0, 18, Math.PI * 0.5, 2, 0);
  // Maisons montmartroises continues sur la pente Ouest (Rue Foyatier / Rue Trois-Frères)
  addMontmartreHouse(-84, 72,  18, 13.6, 18, 0, 2, 0);
  addMontmartreHouse(-84, 96,  18, 14.2, 20, 0, 0, 0);
  addMontmartreHouse(-84, 120, 18, 14.5, 20, 0, 1, 0);
  addMontmartreHouse(-84, 144, 18, 15.0, 20, 0, 2, 0);
  addMontmartreHouse(-84, 168, 18, 14.6, 20, 0, 0, 0);
  addMontmartreHouse(-84, 194, 20, 15.4, 22, 0, 1, 1);
  addMontmartreHouse(-84, 224, 20, 15.2, 22, 0, 2, 1);
  addMontmartreHouse(-112, 92,  22, 14.0, 18, 0, 0, 0);
  addMontmartreHouse(-112, 134, 22, 14.6, 20, 0, 2, 0);
  addMontmartreHouse(-112, 178, 22, 15.2, 20, 0, 1, 0);
  addMontmartreHouse(-112, 218, 22, 15.0, 20, 0, 0, 1);
  // Tissu montmartrois continu côté Est (Rue Ronsard & Rue Paul-Albert -> raccorde sans trou au tissu Haussmannien à lx = +134 !)
  [
    [72, 86], [72, 112], [72, 138], [72, 164], [72, 192], [72, 220],
    [106, -42], [106, -12], [106, 20], [106, 52], [106, 86], [106, 118],
    [106, 152], [106, 186], [106, 220],
  ].forEach(([hx, hz], idx) => {
    addMontmartreHouse(hx, hz, 22, 14.2 + (idx % 3) * 0.9, 22, 0, idx % 3, hz >= 190 ? 1 : 0);
  });
  // Façades de la Place Saint-Pierre & Rue Tardieu au pied Sud (lz = +264, ouverture centrale Rue Steinkerque |lx| < 18)
  [-110, -78, -42, 42, 76, 108].forEach((sx, idx) => {
    addMontmartreHouse(sx, 266, 24, 15.6 + (idx % 2) * 1.2, 20, Math.PI, idx % 3, 1);
  });
  // Rue Ronsard (Est) & Rue Tardieu / Place Saint-Pierre (Sud) en asphalte épousant la pente jusqu'aux boulevards
  for (let s = 0; s < 14; s++) {
    const rz = THREE.MathUtils.lerp(-50, 278, (s + 0.5) / 14);
    const ry = localGroundY(89, rz) + 0.18;
    addBox(envGroup, 10.5, 4.0, 26.0, matAsphalt, 89.0, ry - 2.0, rz, 0, 0, 0, false, true);
  }
  for (let s = 0; s < 10; s++) {
    const rx = THREE.MathUtils.lerp(-124, 126, (s + 0.5) / 10);
    const ry = localGroundY(rx, 244) + 0.18;
    addBox(envGroup, 26.0, 4.0, 13.0, matAsphalt, rx, ry - 2.0, 244.0, 0, 0, 0, false, true);
  }

  // Parc Marcel-Bleustein-Blanchet (terrasses fleuries & pergolas ancrées à -16 m sur le flanc Est, lx = +50..+82)
  addBox(envGroup, 32.0, 18.0, 38.0, matTravSculpt, 66.0, localGroundY(66, 52) - 8.8, 52.0, 0, 0, 0, false, true);
  addBox(envGroup, 31.6, 0.5, 37.6, matLawn, 66.0, localGroundY(66, 52) + 0.35, 52.0, 0, 0, 0, false, true);
  addBox(envGroup, 22.0, 0.4, 8.0, matCobble, 64.0, localGroundY(64, 46) + 0.7, 46.0, 0, 0, 0, false, true);
  // Pergola du Parc de la Turlure
  for (let p = 0; p < 5; p++) {
    const px = 56 + p * 4.2;
    const py = localGroundY(px, 46) + 0.75;
    addCyl(envGroup, 0.14, 0.16, 3.4, 6, matTravSculpt, px, py + 1.7, 43.0);
    addCyl(envGroup, 0.14, 0.16, 3.4, 6, matTravSculpt, px, py + 1.7, 49.0);
    addBox(envGroup, 0.24, 0.24, 6.4, matOak, px, py + 3.45, 46.0);
  }

  // --- F. AMÉNAGEMENT VIVANT & FOISONNANT DE LA PLACE DU TERTRE (Terre-plein, Wallace, Morris, Guirlandes) ---
  // Îlot central pavé des artistes bordé de granit (lx = -121..-99, lz = +3..+25)
  addBox(envGroup, 22.5, 0.26, 22.5, matTravSculpt, -110.0, 0.14, 14.0, 0, 0, 0, false, true);
  addBox(envGroup, 21.6, 0.28, 21.6, matCobble, -110.0, 0.16, 14.0, 0, 0, 0, false, true);
  // Bornes parisiennes en fonte noire ceinturant l'îlot central
  for (let bx = -120; bx <= -100; bx += 4) {
    addCyl(envGroup, 0.08, 0.11, 0.85, 6, matIron, bx, 0.55, 2.8, 0, 0, 0, false, true);
    addCyl(envGroup, 0.08, 0.11, 0.85, 6, matIron, bx, 0.55, 25.2, 0, 0, 0, false, true);
  }
  // Fontaine Wallace verte emblématique à l'entrée Est de la Place du Tertre (-94, +27)
  addCyl(envGroup, 0.55, 0.62, 0.9, 8, matAwningGreen, -94.0, 0.48, 27.0);
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    addCyl(envGroup, 0.07, 0.08, 1.35, 6, matAwningGreen, -94.0 + Math.cos(a) * 0.28, 1.55, 27.0 + Math.sin(a) * 0.28, 0, 0, 0, false, false);
  }
  addMesh(envGroup, new THREE.SphereGeometry(0.46, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matAwningGreen, -94.0, 2.2, 27.0);
  addMesh(envGroup, new THREE.ConeGeometry(0.16, 0.45, 6), matAwningGreen, -94.0, 2.8, 27.0);
  // Colonne Morris verte montmartroise près de Saint-Pierre (-87, +30)
  addCyl(envGroup, 0.72, 0.8, 0.55, 10, matAwningGreen, -87.0, 0.3, 30.0);
  addCyl(envGroup, 0.62, 0.62, 2.9, 12, matAwningCream, -87.0, 1.95, 30.0);
  addMesh(envGroup, new THREE.ConeGeometry(0.92, 1.05, 8), matAwningGreen, -87.0, 3.85, 30.0);
  // Guirlandes lumineuses guinguette sur câbles noirs tendus entre les façades & réverbères de la Place du Tertre
  const garlandSpans = [
    [[-126, -4], [-94, 4]],
    [[-126, 8], [-94, -4]],
    [[-126, 18], [-94, 28]],
    [[-126, 30], [-94, 18]],
  ];
  garlandSpans.forEach(([[x0, z0], [x1, z1]]) => {
    const cablePts = [];
    for (let b = 0; b <= 10; b++) {
      const t = b / 10;
      const gx = THREE.MathUtils.lerp(x0, x1, t);
      const gz = THREE.MathUtils.lerp(z0, z1, t);
      const gy = 5.4 - Math.sin(t * Math.PI) * 0.65;
      cablePts.push(new THREE.Vector3(gx, gy, gz));
      if (b >= 1 && b <= 9) {
        addMesh(envGroup, new THREE.SphereGeometry(0.085, 6, 5), matLampGlow, gx, gy - 0.09, gz, 0, 0, 0, false, false);
      }
    }
    const wireGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 14, 0.028, 4, false);
    addMesh(envGroup, wireGeo, matIron, 0, 0, 0, 0, 0, 0, false, false);
  });
  // Artistes peintres assis / debout & modèles en pose sur l'îlot central de la Place du Tertre
  const artistSpecs = [
    [-117.5, 6.2, 0.5, 0], [-112.5, 6.5, 1.1, 1], [-107.2, 6.4, 2.2, 2], [-102.8, 9.2, 3.4, 0],
    [-118.2, 11.4, 0.2, 2], [-113.4, 12.2, 1.8, 0], [-107.8, 12.4, 2.7, 1], [-102.5, 14.8, 3.9, 2],
    [-118.0, 17.5, 0.8, 1], [-113.0, 18.2, 1.5, 2], [-107.4, 18.0, 2.5, 0], [-102.8, 20.6, 3.2, 1],
    [-116.5, 22.8, 4.2, 0], [-110.5, 22.8, 4.8, 1], [-104.8, 22.6, 5.4, 2],
  ];
  artistSpecs.forEach(([ax, az, rot, cIdx]) => {
    const coatMat = cIdx === 0 ? matAwningRed : cIdx === 1 ? matAwningGreen : matSteel;
    // Tabouret bois + silhouette artiste coiffé d'un béret montmartrois
    addCyl(envGroup, 0.22, 0.24, 0.52, 6, matOak, ax, 0.48, az, 0, 0, 0, false, true);
    addCyl(envGroup, 0.19, 0.24, 0.78, 7, coatMat, ax, 1.05, az, 0, rot, 0, false, true);
    addMesh(envGroup, new THREE.SphereGeometry(0.16, 7, 6), matVillageWall, ax, 1.58, az, 0, 0, 0, false, true);
    addCyl(envGroup, 0.21, 0.18, 0.08, 7, matIron, ax, 1.72, az, 0.15, rot, 0, false, false); // Béret noir !
  });

  // Réverbères parisiens (Parvis, Square Louise-Michel, Place du Tertre, Place Saint-Pierre)
  const scLampPos = [
    [-38, 52], [-18, 58], [18, 58], [38, 52],
    [-40, 70], [-14, 70], [14, 70], [40, 70],
    [-26, 96], [26, 96], [-30, 134], [30, 134],
    [-32, 174], [32, 174], [-32, 214], [0, 218], [44, 214],
    [-124, 1], [-110, 1], [-96, 1], [-124, 27], [-110, 27], [-96, 27], [-86, 14],
    [-44, -22], [44, -22], [-34, -50], [34, -50],
  ];
  scLampPos.forEach(([lx, lz]) => {
    let ly = 0.08;
    if (lz >= 84 && lz <= 108 && Math.abs(lx) < 36) ly = slmTiers[0].yTop + 0.2;
    else if (lz >= 122 && lz <= 146 && Math.abs(lx) < 38) ly = slmTiers[1].yTop + 0.2;
    else if (lz >= 162 && lz <= 186 && Math.abs(lx) < 40) ly = slmTiers[2].yTop + 0.2;
    else if (lz >= 200) ly = slmTiers[3].yTop + 0.2;
    else if (lz > 72) ly = localGroundY(lx, lz) + 1.15;
    addCyl(envGroup, 0.09, 0.16, 4.2, 7, matIron, lx, ly + 2.1, lz, 0, 0, 0, false, true);
    addMesh(envGroup, new THREE.SphereGeometry(0.28, 8, 6), matLampGlow, lx, ly + 4.35, lz, 0, 0, 0, false, false);
  });

  // Fusion statique de l'environnement Montmartre
  mergeStaticGroupByMaterial(envGroup);

  // --- PLACE DU TERTRE : 22 CHEVALETS PEINTS, 36 TABLES BISTROT, 72 CHAISES & 16 PARASOLS (InstancedMesh) ---
  const easelPositions = [
    [-118, 5], [-114, 5], [-110, 5], [-106, 5], [-102, 7],
    [-119, 10], [-115, 11], [-110, 11], [-106, 11], [-101, 13],
    [-119, 16], [-115, 17], [-110, 17], [-106, 17], [-101, 19],
    [-118, 22], [-114, 22], [-109, 22], [-104, 22], [-112, 8], [-112, 14], [-104, 15],
  ];
  const matArtwork = new THREE.MeshStandardMaterial({
    map: createMontmartreArtworkTexture(),
    color: 0xffffff,
    roughness: 0.58,
  });
  // Chevalet bois en A (pieds + tablette) & Toile peinte montmartroise visible des deux côtés
  const easelLegGeo = new THREE.BoxGeometry(0.11, 1.65, 0.1);
  const easelLegsInst = new THREE.InstancedMesh(easelLegGeo, matOak, easelPositions.length * 2);
  const canvasInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.88, 0.72, 0.11), matArtwork, easelPositions.length);
  const artTints = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xffe8d2),
    new THREE.Color(0xe6f0ff),
    new THREE.Color(0xfff4d6),
    new THREE.Color(0xf6e2ec),
  ];

  easelPositions.forEach(([ex, ez], idx) => {
    const yaw = (idx % 4) * (Math.PI * 0.42) + 0.35;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    // 2 montants inclinés en A du chevalet
    [-0.24, 0.24].forEach((off, legI) => {
      dummyObj.position.set(ex + off * cosY, 0.96, ez - off * sinY);
      dummyObj.rotation.set(0.14, yaw, legI === 0 ? -0.14 : 0.14);
      dummyObj.scale.set(1, 1, 1);
      dummyObj.updateMatrix();
      easelLegsInst.setMatrixAt(idx * 2 + legI, dummyObj.matrix);
    });
    // Toile peinte colorée posée sur le chevalet
    dummyObj.position.set(ex, 1.32, ez);
    dummyObj.rotation.set(0.14, yaw, 0);
    dummyObj.scale.set(1, 1, 1);
    dummyObj.updateMatrix();
    canvasInst.setMatrixAt(idx, dummyObj.matrix);
    canvasInst.setColorAt(idx, artTints[idx % artTints.length]);
  });
  easelLegsInst.instanceMatrix.needsUpdate = true;
  canvasInst.instanceMatrix.needsUpdate = true;
  if (canvasInst.instanceColor) canvasInst.instanceColor.needsUpdate = true;
  envGroup.add(easelLegsInst);
  envGroup.add(canvasInst);

  // 36 Tables de bistrot à nappes à carreaux rouges/blancs + 72 chaises + 16 parasols de terrasses autour de la place !
  const tablePositions = [
    // Terrasse Nord (La Mère Catherine & Au Cadet de Gascogne, lz = -6..-2)
    [-122, -4.5], [-118, -4.5], [-114, -4.5], [-110, -4.5], [-105, -4.5], [-101, -4.5], [-96, -4.5], [-92, -4.5],
    [-120, -1.5], [-114, -1.5], [-108, -1.5], [-102, -1.5], [-96, -1.5],
    // Terrasse Ouest (Chez Eugène, lx = -126..-123)
    [-125.5, 4], [-125.5, 8], [-125.5, 12], [-125.5, 16], [-125.5, 20], [-125.5, 24], [-125.5, 28],
    [-123.0, 6], [-123.0, 12], [-123.0, 18], [-123.0, 24],
    // Terrasse Sud (La Bohème du Tertre, lz = +30..+33.5)
    [-122, 31.5], [-118, 31.5], [-114, 31.5], [-110, 31.5], [-106, 31.5], [-101, 31.5], [-96, 31.5], [-92, 31.5],
    [-118, 28.8], [-111, 28.8], [-104, 28.8], [-97, 28.8],
  ];
  const matTableCloth = new THREE.MeshStandardMaterial({ map: createTableclothTexture(), roughness: 0.72 });
  const tableTopInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 10), matTableCloth, tablePositions.length);
  const tableLegInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.24, 0.76, 6), matIron, tablePositions.length);
  const chairInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.52, 0.46), matOak, tablePositions.length * 2);

  tablePositions.forEach(([tx, tz], idx) => {
    dummyObj.position.set(tx, 0.82, tz);
    dummyObj.rotation.set(0, idx * 0.7, 0);
    dummyObj.scale.set(1, 1, 1);
    dummyObj.updateMatrix();
    tableTopInst.setMatrixAt(idx, dummyObj.matrix);

    dummyObj.position.set(tx, 0.42, tz);
    dummyObj.rotation.set(0, 0, 0);
    dummyObj.updateMatrix();
    tableLegInst.setMatrixAt(idx, dummyObj.matrix);

    [-0.78, 0.78].forEach((ox, ci) => {
      dummyObj.position.set(tx + ox, 0.46, tz);
      dummyObj.rotation.set(0, ci === 0 ? 0 : Math.PI, 0);
      dummyObj.updateMatrix();
      chairInst.setMatrixAt(idx * 2 + ci, dummyObj.matrix);
    });
  });
  tableTopInst.instanceMatrix.needsUpdate = true;
  tableLegInst.instanceMatrix.needsUpdate = true;
  chairInst.instanceMatrix.needsUpdate = true;
  envGroup.add(tableTopInst);
  envGroup.add(tableLegInst);
  envGroup.add(chairInst);

  // 16 Parasols colorés (crème, rouge bordeaux & vert Montmartre) avec mâts ancrés au sol !
  const parasolPositions = [
    [-120, -2.5], [-113, -2.5], [-106, -2.5], [-99, -2.5],
    [-124.5, 5], [-124.5, 13], [-124.5, 21], [-124.5, 28],
    [-119, 30.2], [-112, 30.2], [-105, 30.2], [-97, 30.2],
    [-116, 8], [-105, 9], [-116, 20], [-104, 20],
  ];
  const matParasolTint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74 });
  const parasolInst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.75, 0.56, 8), matParasolTint, parasolPositions.length);
  const parasolPoleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.06, 2.48, 6), matOak, parasolPositions.length);
  const parasolColors = [
    new THREE.Color(0xf6ecd8),
    new THREE.Color(0xa62c30),
    new THREE.Color(0x285e42),
    new THREE.Color(0xf4e4c4),
  ];

  parasolPositions.forEach(([px, pz], idx) => {
    const pyOff = (px > -121 && px < -99 && pz > 2 && pz < 25) ? 0.22 : 0.08;
    dummyObj.position.set(px, 2.52 + pyOff, pz);
    dummyObj.rotation.set(0, idx * 0.6, 0);
    dummyObj.scale.set(1, 1, 1);
    dummyObj.updateMatrix();
    parasolInst.setMatrixAt(idx, dummyObj.matrix);
    parasolInst.setColorAt(idx, parasolColors[idx % parasolColors.length]);

    dummyObj.position.set(px, 1.24 + pyOff, pz);
    dummyObj.rotation.set(0, 0, 0);
    dummyObj.updateMatrix();
    parasolPoleInst.setMatrixAt(idx, dummyObj.matrix);
  });
  parasolInst.instanceMatrix.needsUpdate = true;
  if (parasolInst.instanceColor) parasolInst.instanceColor.needsUpdate = true;
  parasolPoleInst.instanceMatrix.needsUpdate = true;
  envGroup.add(parasolInst);
  envGroup.add(parasolPoleInst);

  // --- ARBRES MONTMARTROIS (Square Louise-Michel, Place du Tertre, Parc Bleustein-Blanchet) — 2 Draw Calls ---
  const scTreeCoords = [
    // Square Louise-Michel (flancs boisés autour des pelouses et escaliers)
    [-42, 84], [-38, 104], [-42, 124], [-40, 146], [-42, 168], [-40, 192],
    [42, 84],  [38, 104],  [42, 124],  [40, 146],  [42, 168],  [40, 192],
    [-16, 114], [16, 114], [-18, 154], [18, 154], [-18, 192], [18, 192],
    [-48, 224], [-22, 226], [6, 228], [46, 224],
    // Place du Tertre & Jardin du Calvaire (encadrant les chevalets sans boucher la vue centrale)
    [-127, 4], [-96, 4], [-127, 26], [-96, 28], [-126, 16],
    [-76, -4], [-68, -6], [-72, 2], [-80, 32],
    // Parc Marcel-Bleustein-Blanchet & abords Nord
    [54, 38], [66, 36], [76, 44], [58, 60], [74, 62],
    [-46, -26], [-32, -40], [34, -42], [48, -24], [52, 8],
  ];
  const matTreeTrunk = new THREE.MeshStandardMaterial({ color: 0x523f2f, roughness: 0.92 });
  const matTreeLeaf = new THREE.MeshStandardMaterial({ color: 0x4b7b3d, roughness: 0.85 });
  const scTrunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 4.6, 6), matTreeTrunk, scTreeCoords.length);
  const scCrownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.1, 1), matTreeLeaf, scTreeCoords.length);
  scCrownsInst.receiveShadow = true;

  const leafColor = new THREE.Color();
  scTreeCoords.forEach(([tx, tz], i) => {
    const ty = tz > 73 && tz < 216 && Math.abs(tx) <= 52
      ? localGroundY(tx, tz) + 1.15
      : tz >= 202
        ? slmTiers[3].yTop + 0.1
        : Math.max(localGroundY(tx, tz), -0.1);
    const sc = 0.88 + ((i * 19) % 7) * 0.065;
    dummyObj.position.set(tx, ty + 2.2 * sc, tz);
    dummyObj.rotation.set(0, (i * 1.37) % 6.28, 0);
    dummyObj.scale.set(sc, sc, sc);
    dummyObj.updateMatrix();
    scTrunksInst.setMatrixAt(i, dummyObj.matrix);

    dummyObj.position.set(tx, ty + 5.7 * sc, tz);
    dummyObj.scale.set(sc * 1.18, sc * 0.92, sc * 1.12);
    dummyObj.updateMatrix();
    scCrownsInst.setMatrixAt(i, dummyObj.matrix);

    const shade = 0.85 + ((i * 29) % 14) * 0.018;
    leafColor.setRGB(shade * 0.92, shade * 1.06, shade * 0.82);
    scCrownsInst.setColorAt(i, leafColor);
  });
  scTrunksInst.instanceMatrix.needsUpdate = true;
  scCrownsInst.instanceMatrix.needsUpdate = true;
  if (scCrownsInst.instanceColor) scCrownsInst.instanceColor.needsUpdate = true;
  envGroup.add(scTrunksInst);
  envGroup.add(scCrownsInst);

  // ==========================================================================
  // 4. COLLIDERS & SOL VISITABLE MULTI-NIVEAUX (PARVIS, NEF, BELVÉDÈRE 69 m, SQUARE)
  // ==========================================================================
  const colliders = [];
  const circleColliders = [];

  function addBoxCol(minLx, maxLx, minLz, maxLz) {
    colliders.push({
      minX: SACRE_COEUR_WORLD_POS.x + minLx,
      maxX: SACRE_COEUR_WORLD_POS.x + maxLx,
      minZ: SACRE_COEUR_WORLD_POS.z + minLz,
      maxZ: SACRE_COEUR_WORLD_POS.z + maxLz,
    });
  }

  // Murs de la façade Sud laissant le Portail Central OUVERT (|lx| < 2.6 m)
  addBoxCol(-17.8, -3.1, 31.0, 33.2);
  addBoxCol(3.1, 17.8, 31.0, 33.2);
  // Piliers du Triple Portique
  [-15.8, -6.1, 6.1, 15.8].forEach((px) => {
    circleColliders.push({ x: SACRE_COEUR_WORLD_POS.x + px, z: SACRE_COEUR_WORLD_POS.z + 40.2, r: 1.65 });
  });
  // Murs latéraux de la Nef & Transepts
  addBoxCol(-18.6, -15.8, 11.0, 32.5);
  addBoxCol(15.8, 18.6, 11.0, 32.5);
  addBoxCol(-26.8, -24.2, -13.0, 13.0);
  addBoxCol(24.2, 26.8, -13.0, 13.0);
  addBoxCol(-26.0, -15.5, -13.6, -11.4);
  addBoxCol(-26.0, -15.5, 11.4, 13.6);
  addBoxCol(15.5, 26.0, -13.6, -11.4);
  addBoxCol(15.5, 26.0, 11.4, 13.6);
  // 4 Piliers intérieurs de la croisée & Maître-Autel & Campanile
  [[-10.2, -10.2], [10.2, -10.2], [-10.2, 10.2], [10.2, 10.2]].forEach(([px, pz]) => {
    circleColliders.push({ x: SACRE_COEUR_WORLD_POS.x + px, z: SACRE_COEUR_WORLD_POS.z + pz, r: 2.2 });
  });
  circleColliders.push({ x: SACRE_COEUR_WORLD_POS.x, z: SACRE_COEUR_WORLD_POS.z - 22.2, r: 2.6 });
  addBoxCol(-8.0, 8.0, -56.4, -40.6);

  function getFloorHeightAt(wx, wz, currentY = 90) {
    const { lx, lz } = worldToSacreCoeurLocal(wx, wz);

    // 1. Belvédère panoramique du Grand Dôme (ly = 71.3 m -> worldY = 161.3 m)
    if (currentY > 148 && Math.hypot(lx, lz) < 12.0) {
      return SACRE_COEUR_WORLD_POS.y + 71.3;
    }

    // 2. Intérieur de la Basilique (Nef, Transepts, Sanctuaire surélevé)
    const inChurch =
      (Math.abs(lx) <= 16.0 && lz >= -36.0 && lz <= 32.5) ||
      (Math.abs(lx) <= 24.4 && Math.abs(lz) <= 12.0);
    if (inChurch) {
      if (lz <= -15.5) return SACRE_COEUR_WORLD_POS.y + 3.22;
      if (lz <= -13.4) {
        const t = THREE.MathUtils.clamp((-13.4 - lz) / 2.1, 0, 1);
        return SACRE_COEUR_WORLD_POS.y + THREE.MathUtils.lerp(2.52, 3.22, t);
      }
      return SACRE_COEUR_WORLD_POS.y + 2.52;
    }

    // 3. Porche & Grand Perron Sud (lz = +32.5..+48.5)
    if (Math.abs(lx) <= 19.0 && lz > 32.5 && lz <= 41.8) {
      return SACRE_COEUR_WORLD_POS.y + 2.48;
    }
    if (Math.abs(lx) <= 18.5 && lz > 41.8 && lz <= 48.6) {
      const t = THREE.MathUtils.clamp((48.6 - lz) / 6.8, 0, 1);
      return SACRE_COEUR_WORLD_POS.y + t * 2.48;
    }

    // 4. Grand Parvis & Place du Tertre (plateau sommital)
    if (lx >= -138 && lx <= 48 && lz >= -58 && lz <= 72.5) {
      return SACRE_COEUR_WORLD_POS.y + 0.08;
    }

    // 5. Terrasses de Square Louise-Michel & Place Saint-Pierre
    for (let i = 0; i < slmTiers.length; i++) {
      const tr = slmTiers[i];
      if (Math.abs(lx) <= tr.w * 0.5 && Math.abs(lz - tr.zCenter) <= tr.d * 0.5) {
        return SACRE_COEUR_WORLD_POS.y + tr.yTop + 0.25;
      }
    }

    // 6. Versants de Square Louise-Michel / Rue Foyatier / Montmartre
    const gY = getParisElevation(wx, wz);
    if (lz > 72 && lz < 216 && Math.abs(lx) <= 64) {
      return gY + 1.25;
    }
    return gY;
  }

  // ==========================================================================
  // 5. PROLOGUE 360° & 7 POINTS D'INTÉRÊT HISTORIQUES (Voix off Laurent)
  // ==========================================================================
  const introChapter = {
    id: 'sc-intro-360',
    title: 'Histoire du Sacré-Cœur de Montmartre — Tour 360°',
    era: '1875 – 1914 • Paul Abadie • Romano-byzantin',
    location: 'Butte Montmartre (130 m) • 18e arr., Paris',
    history:
      "Érigée au sommet de la butte Montmartre sur les plans de Paul Abadie, la basilique du Sacré-Cœur déploie ses cinq coupoles ovoïdes en travertin blanc de Château-Landon qui blanchit sous la pluie.",
    anecdote:
      "Pour asseoir l'édifice sur la colline creusée de carrières de gypse, quatre-vingt-trois puits de fondation ont été forés à trente-trois mètres de profondeur.",
    voiceover:
      "Bienvenue au sommet de la butte Montmartre, devant la basilique du Sacré-Cœur qui domine tout Paris de sa silhouette blanche. " +
      "Pendant ce tour à 360 degrés, admirons son architecture romano-byzantine : le triple portique surmonté de Jeanne d'Arc et de Saint Louis, les cinq dômes ovoïdes culminant à 83 m et le grand campanile de la Savoyarde. " +
      "Descendons ensuite découvrir son immense mosaïque d'or, le square Louise-Michel, le funiculaire et la place du Tertre.",
  };

  function makePoi(spec) {
    return {
      ...spec,
      markerPos: sacreCoeurLocalToWorld(...spec.localMarker),
      cameraPos: sacreCoeurLocalToWorld(...spec.localCam),
      target: sacreCoeurLocalToWorld(...spec.localTarget),
      fpsPos: sacreCoeurLocalToWorld(...spec.localFps),
    };
  }

  const pois = [
    makePoi({
      id: 'sc-parvis-portique',
      title: 'Le Parvis, le Triple Portique & Jeanne d’Arc et Saint Louis',
      shortTitle: 'Parvis & Portique',
      era: '1875 – 1914 • Travertin de Château-Landon',
      location: 'Façade Sud • Parvis du Sacré-Cœur',
      localMarker: [0, 22.0, 41.2],
      localCam: [24, 21.0, 86],
      localTarget: [0, 22.5, 38],
      localFps: [0, 0.08, 62],
      history:
        "Précédée d'un grand perron, la façade Sud s'ouvre par trois hautes arcades plein cintre surmontées des statues équestres en bronze de Jeanne d'Arc et de Saint Louis, sous le Christ du pignon.",
      anecdote:
        "Le travertin de Château-Landon sécrète de la calcite au contact de l'eau de pluie, rendant la basilique éclatante de blancheur même au cœur de Paris.",
    }),
    makePoi({
      id: 'sc-dome-lanternon',
      title: 'Le Grand Dôme Ovoïde (83 m) & son Belvédère Panoramique',
      shortTitle: 'Grand Dôme (83 m)',
      era: '1899 • 2e plus haut point de Paris après la Tour Eiffel',
      location: 'Lanternon du Dôme • 69 à 83 m',
      localMarker: [0, 72.5, 5.2],
      localCam: [36, 75.5, 46],
      localTarget: [0, 58.0, 0],
      localFps: [0, 71.3, 4.2],
      history:
        "Porté par un tambour colonné de vingt baies géminées, le grand dôme ovoïde s'élève à 83 m au-dessus du parvis et s'entoure de quatre coupoles satellites inspirées de Saint-Front de Périgueux.",
      anecdote:
        "Depuis son lanternon à 200 m d'altitude au-dessus de la mer, le regard embrasse toute la capitale sur près de cinquante kilomètres par temps clair.",
    }),
    makePoi({
      id: 'sc-campanile-savoyarde',
      title: 'Le Campanile (84 m) & la Cloche « La Savoyarde »',
      shortTitle: 'Campanile & Savoyarde',
      era: '1895 – 1912 • Plus grosse cloche de France (19 tonnes)',
      location: 'Chevet Nord • Beffroi ajouré',
      localMarker: [0, 51.0, -48.5],
      localCam: [12, 52.0, -86],
      localTarget: [0, 51.5, -48.5],
      localFps: [30, 0.08, -48],
      history:
        "Élevé derrière les sept absidioles du chevet, le campanile carré de 84 m abrite derrière ses grandes arcades ouvertes la gigantesque cloche de bronze dite La Savoyarde.",
      anecdote:
        "Offerte par les diocèses de Savoie et pesant près de dix-neuf tonnes, elle a nécessité un attelage de vingt-huit chevaux pour gravir la butte Montmartre en 1895.",
    }),
    makePoi({
      id: 'sc-interieur-mosaique',
      title: 'La Grande Mosaïque d’Or du Christ en Majesté (475 m²)',
      shortTitle: 'Mosaïque d’Or (475 m²)',
      era: '1900 – 1922 • Luc-Olivier Merson & Mauméjean',
      location: 'Intérieur • Voûte du Chœur',
      localMarker: [0, 13.8, -22.2],
      localCam: [0, 11.4, 8.5],
      localTarget: [0, 17.8, -24.5],
      localFps: [0, 2.52, 8.0],
      history:
        "Considérée parmi les plus vastes mosaïques du monde avec ses 475 mètres carrés d'or et d'émaux, la voûte du chœur montre le Christ vêtu de blanc ouvrant les bras autour de son Sacré-Cœur.",
      anecdote:
        "Devant l'autel au baldaquin doré, l'adoration eucharistique se relaie jour et nuit sans la moindre interruption depuis le premier août 1885.",
    }),
    makePoi({
      id: 'sc-orgue-sanctuaire',
      title: 'La Coupole Intérieure (55 m) & le Grand Orgue Cavaillé-Coll',
      shortTitle: 'Coupole & Grand Orgue',
      era: '1898 • Aristide Cavaillé-Coll • 4 claviers',
      location: 'Intérieur • Croisée & Tribune Sud',
      localMarker: [0, 17.2, 27.5],
      localCam: [0, 14.8, -3.5],
      localTarget: [0, 18.8, 29.0],
      localFps: [0, 2.52, -2.0],
      history:
        "À l'opposé de la mosaïque du chœur, la tribune Sud porte le monumental grand orgue symphonique d'Aristide Cavaillé-Coll, l'un des plus puissants et expressifs de France.",
      anecdote:
        "Originellement conçu pour le château d'Ilbarritz à Biarritz, l'instrument a été acheté et installé ici en 1919 dans un buffet néo-byzantin sur mesure.",
    }),
    makePoi({
      id: 'sc-square-funiculaire',
      title: 'Square Louise-Michel, Grands Escaliers & Funiculaire',
      shortTitle: 'Square & Funiculaire',
      era: '1900 – 1991 • Terrasses, Fontaines & Funiculaire',
      location: 'Versant Sud • Place Saint-Pierre',
      localMarker: [-22, -4.0, 132.0],
      localCam: [-38, 12.0, 254],
      localTarget: [-12, 16.0, 96],
      localFps: [-26, slmTiers[1].yTop + 0.25, 134],
      history:
        "Descendant en gradins vers la place Saint-Pierre et son carrousel, le square Louise-Michel déploie ses escaliers doubles, ses bassins en cascade et ses pelouses le long du funiculaire de Montmartre.",
      anecdote:
        "Mis en service dès 1900 puis modernisé en 1991, le funiculaire franchit 36 mètres de dénivelé en quatre-vingt-dix secondes, juste à côté des 222 marches de la rue Foyatier.",
    }),
    makePoi({
      id: 'sc-place-tertre',
      title: 'La Place du Tertre, Saint-Pierre & le Village de Montmartre',
      shortTitle: 'Place du Tertre',
      era: 'XIIe – XIXe siècle • Artistes & Bistrots',
      location: 'Sommet Ouest • Village de Montmartre',
      localMarker: [-110, 5.8, 14.0],
      localCam: [-123, 6.2, 29],
      localTarget: [-101, 5.2, 4],
      localFps: [-110, 0.28, 22],
      history:
        "À deux pas de la basilique, l'église Saint-Pierre du XIIe siècle veille sur la place du Tertre, cœur bohème de l'ancien village de Montmartre animé par ses portraitistes, ses chevalets et ses bistrots.",
      anecdote:
        "Au début du XXe siècle, Picasso, Modigliani, Utrillo et Toulouse-Lautrec ont fait de ces ruelles en pente le laboratoire mondial de l'art moderne.",
    }),
  ];

  // ==========================================================================
  // 6. LOD 3 NIVEAUX, ANIMATION FUNICULAIRE / CARROUSEL & ILLUMINATION NOCTURNE
  // ==========================================================================
  let currentLod = 0;
  let currentCamDist = 120;
  let animTime = 0;

  function setLodLevel(level, camDist = 120) {
    currentLod = level;
    currentCamDist = camDist;
    exteriorGroup.visible = true;
    interiorGroup.visible = level === 0;
    envGroup.visible = camDist < 2600;
    dynamicGroup.visible = camDist < 1200;
  }

  function update(dt, nightFactor = 0.1, glassGlow = 0.1, isActiveMonument = false) {
    const cdt = Math.min(dt, 0.05);
    animTime += cdt;

    // 1. Animation fluide du Funiculaire de Montmartre (2 cabines en opposition avec pauses en gare)
    if (dynamicGroup.visible) {
      const cycle = (animTime % 28.0) / 28.0; // Aller-retour complet en 28 s
      let u = 0;
      if (cycle < 0.08) u = 0;
      else if (cycle < 0.50) u = THREE.MathUtils.smoothstep((cycle - 0.08) / 0.42, 0, 1);
      else if (cycle < 0.58) u = 1;
      else u = 1 - THREE.MathUtils.smoothstep((cycle - 0.58) / 0.42, 0, 1);

      const uW = u;
      const uE = 1 - u;
      const zW = THREE.MathUtils.lerp(funZTop + 3.0, funZBot - 3.0, uW);
      const zE = THREE.MathUtils.lerp(funZTop + 3.0, funZBot - 3.0, uE);
      funCabinWest.position.set(funX - 1.55, funTrackY(uW), zW);
      funCabinEast.position.set(funX + 1.55, funTrackY(uE), zE);

      // Rotation douce du Carrousel de Montmartre
      carouselSpinner.rotation.y += cdt * 0.48;
    }

    // 2. Illumination nocturne & dorures de la Basilique et du village Montmartre
    const glow = Math.max(0, (nightFactor - 0.15) / 0.85);
    const gg = Math.max(glow, glassGlow);

    const useInteriorLights = (isActiveMonument || currentLod === 0) && currentCamDist < 185;
    for (let i = 0; i < interiorLights.length; i++) {
      const entry = interiorLights[i];
      entry.light.visible = useInteriorLights;
      if (useInteriorLights) {
        entry.light.intensity = THREE.MathUtils.lerp(entry.base, entry.night, nightFactor);
      }
    }

    matTravertine.emissiveIntensity = glow * 0.28; // Célèbre mise en lumière blanche/dorée du Sacré-Cœur la nuit !
    matTravSculpt.emissiveIntensity = glow * 0.20;
    matGold.emissiveIntensity = 0.22 + glow * 0.44;
    matWindowExt.emissiveIntensity = 0.05 + glow * 0.92;
    matGlassInt.emissiveIntensity = 0.36 + gg * 0.82;
    matMosaic.emissiveIntensity = 0.38 + glow * 0.54;
    matLampGlow.emissiveIntensity = 0.5 + glow * 1.85;
    matVillageWall.emissiveIntensity = 0.04 + glow * 0.96;
    matVillageOchre.emissiveIntensity = 0.04 + glow * 0.96;
    matVillageRose.emissiveIntensity = 0.04 + glow * 0.96;
    matGlassFunicular.emissiveIntensity = 0.12 + glow * 0.72;
  }

  return {
    id: 'sacre-coeur',
    name: 'Basilique du Sacré-Cœur de Montmartre',
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: SACRE_COEUR_WORLD_POS.x - 240,
      maxX: SACRE_COEUR_WORLD_POS.x + 190,
      minZ: SACRE_COEUR_WORLD_POS.z - 160,
      maxZ: SACRE_COEUR_WORLD_POS.z + 290,
    },
    fpsSpawnPos: sacreCoeurLocalToWorld(0, 0.08, 62),
    fpsSpawnTarget: sacreCoeurLocalToWorld(0, 24.0, 32),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
